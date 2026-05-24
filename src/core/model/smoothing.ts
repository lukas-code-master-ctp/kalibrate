/**
 * Suavizado exponencial (EMA) del peso corporal.
 *
 * Justificación brief: Pilar 4, "el peso de hoy es ruido, la tendencia es señal".
 * Y preprocesamiento crítico del Pilar 1: "nunca usar peso crudo".
 *
 * Características:
 * - Alpha ajustado por gaps entre mediciones (días sin pesarse).
 * - Outliers detectados por SD histórica; no se descartan, se ponderan menos.
 * - SD histórica calculada sobre residuales de los últimos 60 días.
 */

import {
  NON_CONCERN_BAND_DEFAULT_KG,
  WEIGHT_EMA_ALPHA,
  WEIGHT_OUTLIER_ALPHA_FACTOR,
  WEIGHT_OUTLIER_THRESHOLD_SD,
} from '../constants';
import type { SmoothedWeightPoint, SmoothingResult, WeightLog } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const HISTORICAL_WINDOW_DAYS = 60;
const MIN_DAYS_FOR_HISTORICAL_SD = 30;

function daysBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / MS_PER_DAY;
}

function effectiveAlpha(daysSinceLast: number): number {
  const safeDays = Math.max(0, daysSinceLast);
  return 1 - Math.pow(1 - WEIGHT_EMA_ALPHA, safeDays);
}

function standardDeviation(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
}

/**
 * Suaviza una serie de mediciones de peso usando EMA con ajustes por gaps y outliers.
 *
 * Reglas:
 * - Primera medición: smoothed = raw.
 * - Mediciones siguientes: alpha efectivo = 1 - (1 - alpha)^days_since_last.
 *   Captura el caso de pesarse cada N días sin sub o sobre-ponderar.
 * - Si |raw - prev_smoothed| > threshold * sdHistorical → marcar outlier
 *   y reducir alpha por WEIGHT_OUTLIER_ALPHA_FACTOR.
 */
export function smoothWeight(logs: readonly WeightLog[]): SmoothingResult {
  if (logs.length === 0) {
    return { points: [], historicalSdKg: NON_CONCERN_BAND_DEFAULT_KG };
  }

  const ordered = [...logs].sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
  const points: SmoothedWeightPoint[] = [];
  let ema = ordered[0]!.weightKg;
  let prevDate = ordered[0]!.loggedAt;
  let historicalSdKg = NON_CONCERN_BAND_DEFAULT_KG;

  points.push({
    date: ordered[0]!.loggedAt,
    rawKg: ordered[0]!.weightKg,
    smoothedKg: ema,
    isOutlier: false,
  });

  for (let i = 1; i < ordered.length; i++) {
    const log = ordered[i]!;
    const days = daysBetween(log.loggedAt, prevDate);
    let alphaEff = effectiveAlpha(days);
    const residual = log.weightKg - ema;
    const isOutlier = Math.abs(residual) > WEIGHT_OUTLIER_THRESHOLD_SD * historicalSdKg;
    if (isOutlier) {
      alphaEff *= WEIGHT_OUTLIER_ALPHA_FACTOR;
    }
    ema = alphaEff * log.weightKg + (1 - alphaEff) * ema;
    points.push({
      date: log.loggedAt,
      rawKg: log.weightKg,
      smoothedKg: ema,
      isOutlier,
    });
    prevDate = log.loggedAt;
  }

  if (points.length >= MIN_DAYS_FOR_HISTORICAL_SD) {
    const last = points[points.length - 1]!;
    const cutoff = last.date.getTime() - HISTORICAL_WINDOW_DAYS * MS_PER_DAY;
    const recentResiduals = points
      .filter((p) => p.date.getTime() >= cutoff && !p.isOutlier)
      .map((p) => p.rawKg - p.smoothedKg);
    if (recentResiduals.length >= MIN_DAYS_FOR_HISTORICAL_SD) {
      historicalSdKg = Math.max(0.3, standardDeviation(recentResiduals));
    }
  }

  return { points, historicalSdKg };
}
