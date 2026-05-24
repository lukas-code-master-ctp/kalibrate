/**
 * Calibración bayesiana del TDEE.
 *
 * Justificación brief — Pilar 1:
 * - Prior: Mifflin-St Jeor × factor actividad (en priors.ts).
 * - Likelihood: dada la ingesta promedio y el cambio de peso, despejar TDEE.
 *   Ecuación: ΔPeso = (Ingesta - TDEE) × días / k, donde k = 7700 kcal/kg.
 *   Por día: TDEE = Ingesta_promedio - ΔPeso_diario × k.
 * - Posterior: conjugate normal con olvido exponencial (half-life ~3-4 semanas).
 *
 * Esto captura adaptación metabólica automáticamente: si el TDEE cae con
 * tiempo en déficit, las observaciones recientes muestran TDEE menor que las
 * antiguas. El olvido exponencial pondera las recientes más fuerte → el
 * estimado se ajusta sin necesidad de un coeficiente α explícito.
 */

import {
  CI_80_Z_SCORE,
  K_KCAL_PER_KG,
  MIN_DAYS_FOR_TDEE_CALIBRATION,
  TDEE_FORGET_HALF_LIFE_DAYS,
  TDEE_OBS_SD_KCAL,
} from '../constants';
import type { PriorTDEE } from './priors';
import type { ConfidenceLabel } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Una observación diaria del TDEE implícito.
 *
 * El caller arma esto a partir de pesos suavizados y agregados de ingesta;
 * la calibración solo consume el dato ya procesado.
 */
export interface CalibrationObservation {
  date: Date;
  /** Ingesta promedio últimos 7 días (kcal/día). */
  avgIntake7d: number;
  /** Cambio diario de peso suavizado (kg/día). Negativo si está bajando. */
  weightChangePerDay: number;
}

export interface CalibratedTDEE {
  /** Estimación puntual posterior, kcal/día. */
  mean: number;
  /** Intervalo de credibilidad 80%. */
  ciLow: number;
  ciHigh: number;
  /** Confianza cualitativa basada en effective N y ancho del CI. */
  confidence: ConfidenceLabel;
  /** Días con datos crudos disponibles (no observaciones, sino span temporal). */
  daysOfData: number;
  /** Suma de pesos de observaciones (n efectivo después del olvido). */
  effectiveN: number;
  /** prior_only si todavía no se cumple el mínimo de días o no hay obs. */
  method: 'prior_only' | 'bayesian';
  prior: PriorTDEE;
}

/**
 * Convierte una observación a su TDEE implícito (kcal/día).
 *
 * Identidad de balance energético:
 *   intake - TDEE = (kg ganado/perdido por día) × k_kcal_por_kg
 *   ⇒ TDEE = intake - ΔPeso × k
 */
export function impliedTDEE(obs: CalibrationObservation): number {
  return obs.avgIntake7d - obs.weightChangePerDay * K_KCAL_PER_KG;
}

function daysBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / MS_PER_DAY;
}

function recencyWeight(daysAgo: number): number {
  return Math.pow(0.5, daysAgo / TDEE_FORGET_HALF_LIFE_DAYS);
}

function labelConfidence(effectiveN: number, ciWidth: number): ConfidenceLabel {
  if (effectiveN < 7) return 'low';
  if (effectiveN < 20 || ciWidth > 400) return 'medium';
  return 'high';
}

/**
 * Calibra el TDEE usando un posterior normal conjugado.
 *
 * - Si no hay datos suficientes (< MIN_DAYS_FOR_TDEE_CALIBRATION días entre
 *   primera y última obs, o sin obs), devuelve el prior con etiqueta
 *   'calibrating' y método 'prior_only'.
 * - Si hay datos suficientes, devuelve el posterior bayesiano:
 *
 *   precision_post = 1/σ_prior² + Σ w_t / σ_obs²
 *   mean_post = (μ_prior/σ_prior² + Σ(w_t × y_t)/σ_obs²) / precision_post
 *   var_post = 1 / precision_post
 *
 *   donde y_t = TDEE implícito de cada observación,
 *   w_t = peso de recencia (decae exponencialmente desde now).
 */
export function calibrateTDEE(
  prior: PriorTDEE,
  observations: readonly CalibrationObservation[],
  now: Date = new Date(),
): CalibratedTDEE {
  if (observations.length === 0) {
    return priorOnly(prior, 0);
  }

  const sortedAsc = [...observations].sort((a, b) => a.date.getTime() - b.date.getTime());
  const first = sortedAsc[0]!;
  const last = sortedAsc[sortedAsc.length - 1]!;
  const spanDays = daysBetween(last.date, first.date) + 1;

  if (spanDays < MIN_DAYS_FOR_TDEE_CALIBRATION) {
    return priorOnly(prior, spanDays);
  }

  const precisionPrior = 1 / (prior.sd * prior.sd);
  const obsVar = TDEE_OBS_SD_KCAL * TDEE_OBS_SD_KCAL;
  let weightedSumOverObsVar = 0;
  let effectiveN = 0;

  for (const obs of sortedAsc) {
    const daysAgo = Math.max(0, daysBetween(now, obs.date));
    const w = recencyWeight(daysAgo);
    const y = impliedTDEE(obs);
    weightedSumOverObsVar += (w * y) / obsVar;
    effectiveN += w;
  }

  const precisionLikelihood = effectiveN / obsVar;
  const precisionPost = precisionPrior + precisionLikelihood;
  const meanPost = (prior.mean * precisionPrior + weightedSumOverObsVar) / precisionPost;
  const varPost = 1 / precisionPost;
  const sdPost = Math.sqrt(varPost);
  const ciLow = meanPost - CI_80_Z_SCORE * sdPost;
  const ciHigh = meanPost + CI_80_Z_SCORE * sdPost;

  return {
    mean: meanPost,
    ciLow,
    ciHigh,
    confidence: labelConfidence(effectiveN, ciHigh - ciLow),
    daysOfData: Math.round(spanDays),
    effectiveN,
    method: 'bayesian',
    prior,
  };
}

function priorOnly(prior: PriorTDEE, daysOfData: number): CalibratedTDEE {
  const ciLow = prior.mean - CI_80_Z_SCORE * prior.sd;
  const ciHigh = prior.mean + CI_80_Z_SCORE * prior.sd;
  return {
    mean: prior.mean,
    ciLow,
    ciHigh,
    confidence: 'calibrating',
    daysOfData,
    effectiveN: 0,
    method: 'prior_only',
    prior,
  };
}
