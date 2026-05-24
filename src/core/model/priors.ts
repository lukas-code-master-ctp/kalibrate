/**
 * Cálculo del prior de TDEE.
 *
 * Justificación brief: Pilar 1, "Prior inicial: Mifflin-St Jeor × factor de
 * actividad. Si el usuario tiene % de grasa corporal estimado, preferir
 * Katch-McArdle."
 *
 * Este prior se usa hasta que la calibración bayesiana tenga ≥14 días de datos.
 * Antes de eso, la app muestra este valor con etiqueta "calibrando".
 */

import { ACTIVITY_FACTORS, type ActivityLevel, TDEE_PRIOR_SD_KCAL } from '../constants';
import type { BiologicalSex } from './types';

/**
 * BMR según Mifflin-St Jeor (1990).
 *
 * Fórmula:
 *   base = 10 × peso(kg) + 6.25 × altura(cm) - 5 × edad(años)
 *   male: base + 5
 *   female: base - 161
 *
 * Error típico individual: ±200-400 kcal/día.
 */
export function bmrMifflin(
  sex: BiologicalSex,
  weightKg: number,
  heightCm: number,
  ageYears: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

/**
 * BMR según Katch-McArdle (basado en masa magra).
 *
 * Fórmula: BMR = 370 + 21.6 × masa_magra(kg)
 *   donde masa_magra = peso × (1 - %grasa/100)
 *
 * Más preciso que Mifflin si el %BF es conocido (especialmente en personas
 * lejos de composición "típica": atletas, sobrepeso, baja masa magra).
 */
export function bmrKatchMcArdle(weightKg: number, bodyFatPct: number): number {
  if (bodyFatPct <= 0 || bodyFatPct >= 100) {
    throw new Error('bodyFatPct debe estar entre 0 y 100 exclusivo');
  }
  const leanMassKg = weightKg * (1 - bodyFatPct / 100);
  return 370 + 21.6 * leanMassKg;
}

export interface PriorTDEEInput {
  sex: BiologicalSex;
  weightKg: number;
  heightCm: number;
  ageYears: number;
  activityLevel: ActivityLevel;
  /** Opcional. Si presente, se usa Katch-McArdle en vez de Mifflin-St Jeor. */
  bodyFatPct?: number;
}

export interface PriorTDEE {
  /** Estimación puntual del TDEE en kcal/día. */
  mean: number;
  /** Desviación estándar del prior, en kcal/día. */
  sd: number;
  /** Método usado para el cálculo del BMR. */
  method: 'mifflin' | 'katch-mcardle';
  /** BMR puro, antes de aplicar factor de actividad. */
  bmr: number;
}

/**
 * Prior de TDEE = BMR × factor de actividad.
 *
 * Si bodyFatPct está presente, usa Katch-McArdle; si no, Mifflin-St Jeor.
 */
export function priorTDEE(input: PriorTDEEInput): PriorTDEE {
  const factor = ACTIVITY_FACTORS[input.activityLevel];

  const useKatchMcArdle = input.bodyFatPct !== undefined;
  const bmr = useKatchMcArdle
    ? bmrKatchMcArdle(input.weightKg, input.bodyFatPct!)
    : bmrMifflin(input.sex, input.weightKg, input.heightCm, input.ageYears);

  return {
    mean: bmr * factor,
    sd: TDEE_PRIOR_SD_KCAL,
    method: useKatchMcArdle ? 'katch-mcardle' : 'mifflin',
    bmr,
  };
}

/**
 * Calcula el intervalo de credibilidad del 80% para un prior normal.
 *
 * Útil para mostrar el TDEE como rango incluso antes de la calibración.
 */
export function priorCredibleInterval(prior: PriorTDEE): { low: number; high: number } {
  const z = 1.282;
  return {
    low: prior.mean - z * prior.sd,
    high: prior.mean + z * prior.sd,
  };
}
