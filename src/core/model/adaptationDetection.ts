/**
 * Detección de adaptación metabólica o subreporte sistemático.
 *
 * Justifica brief — Pilar 2:
 * "Detectar cambios de régimen: si los residuales se sesgan sistemáticamente
 *  por 2+ semanas, alertar y re-ponderar."
 *
 * Compara TDEE_implícito (de cada observación) contra TDEE_calibrado actual.
 * Si los residuales recientes están sesgados (z-test > umbral), algo cambió:
 * - Sesgo positivo (TDEE implícito > calibrado): cuerpo "gasta más" que el
 *   modelo. Causas: actividad NEAT subiendo, error de overtracking calorías.
 * - Sesgo negativo (TDEE implícito < calibrado): cuerpo "gasta menos".
 *   Causas: adaptación metabólica (más probable en déficit prolongado),
 *   subreporte sistemático de calorías, NEAT bajando.
 */

import { TDEE_OBS_SD_KCAL } from '../constants';
import type { CalibrationObservation } from './calibration';
import { impliedTDEE } from './calibration';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** Ventana de detección. */
const LOOKBACK_DAYS = 14;
/** Z-score umbral para considerar el sesgo significativo (95% CI bilateral). */
const Z_THRESHOLD = 2.0;
/** Mínimo de observaciones recientes para evaluar. */
const MIN_OBS = 7;

export type AdaptationDirection = 'tdee_underestimated' | 'tdee_overestimated' | null;

export interface AdaptationAssessment {
  detected: boolean;
  direction: AdaptationDirection;
  /** Sesgo medio de los residuales (kcal/día). */
  meanResidualKcal: number;
  zStat: number;
  obsUsed: number;
  /** Interpretación humana del hallazgo. */
  message: string | null;
}

export function detectAdaptation(
  observations: readonly CalibrationObservation[],
  currentCalibratedTDEE: number,
  now: Date = new Date(),
): AdaptationAssessment {
  const cutoff = now.getTime() - LOOKBACK_DAYS * MS_PER_DAY;
  const recent = observations.filter((o) => o.date.getTime() >= cutoff);

  if (recent.length < MIN_OBS) {
    return notDetected(0, 0, recent.length);
  }

  const residuals = recent.map((o) => impliedTDEE(o) - currentCalibratedTDEE);
  const meanResidual = residuals.reduce((s, r) => s + r, 0) / residuals.length;
  const stderr = TDEE_OBS_SD_KCAL / Math.sqrt(residuals.length);
  const zStat = meanResidual / stderr;

  if (Math.abs(zStat) < Z_THRESHOLD) {
    return notDetected(meanResidual, zStat, recent.length);
  }

  const direction: AdaptationDirection =
    meanResidual > 0 ? 'tdee_underestimated' : 'tdee_overestimated';

  const message =
    direction === 'tdee_overestimated'
      ? 'Tu cuerpo parece gastar menos que el modelo. Causa más probable: adaptación metabólica si llevas tiempo en déficit, o subreporte sistemático de calorías. Sugerencia: considera un diet break en mantención por 1-2 semanas.'
      : 'Tu cuerpo parece gastar más que el modelo. Causa más probable: subiste NEAT (más movimiento espontáneo) o estás sobretrackeando calorías. Sugerencia: verifica tu tracking y considera subir la ingesta.';

  return {
    detected: true,
    direction,
    meanResidualKcal: meanResidual,
    zStat,
    obsUsed: recent.length,
    message,
  };
}

function notDetected(meanResidual: number, zStat: number, obsUsed: number): AdaptationAssessment {
  return {
    detected: false,
    direction: null,
    meanResidualKcal: meanResidual,
    zStat,
    obsUsed,
    message: null,
  };
}
