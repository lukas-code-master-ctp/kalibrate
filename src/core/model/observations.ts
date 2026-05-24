/**
 * Construye observaciones para la calibración bayesiana a partir de los
 * datos crudos persistidos (pesos suavizados + food entries).
 *
 * Cada observación es una "lectura puntual" del TDEE implícito:
 *   TDEE = ingesta_promedio_7d - ΔPeso_por_día × k_kcal_por_kg
 *
 * Reglas:
 * - Para cada punto suavizado de peso, buscamos un punto previo ~7 días atrás
 *   (lookback 5-10 días para tolerar mediciones no-diarias) y derivamos el
 *   cambio de peso por día normalizando por días reales entre medidas.
 * - Para la ingesta promedio: tomamos los 7 días anteriores al punto;
 *   requerimos al menos MIN_FOOD_DAYS_IN_WINDOW para considerar la observación
 *   confiable.
 * - Días sin food entry pero con peso: la observación se descarta si no hay
 *   ingesta suficiente. No tratamos de imputar.
 */

import type { FoodEntry } from './food';
import type { CalibrationObservation } from './calibration';
import type { SmoothedWeightPoint } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const WEIGHT_LOOKBACK_MIN_DAYS = 5;
const WEIGHT_LOOKBACK_MAX_DAYS = 10;
const FOOD_WINDOW_DAYS = 7;
const MIN_FOOD_DAYS_IN_WINDOW = 4;

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / MS_PER_DAY;
}

/**
 * Agrupa entradas por día local y suma sus kcal.
 */
export function aggregateKcalByDay(entries: readonly FoodEntry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) {
    const key = localDayKey(e.consumedAt);
    m.set(key, (m.get(key) ?? 0) + e.kcal);
  }
  return m;
}

interface FoodWindow {
  avgKcal: number;
  daysWithData: number;
}

function averageKcalInWindow(
  kcalByDay: Map<string, number>,
  endDate: Date,
  windowDays: number,
): FoodWindow {
  let sum = 0;
  let daysWithData = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(endDate.getTime() - i * MS_PER_DAY);
    const kcal = kcalByDay.get(localDayKey(d));
    if (kcal !== undefined && kcal > 0) {
      sum += kcal;
      daysWithData += 1;
    }
  }
  return {
    avgKcal: daysWithData > 0 ? sum / daysWithData : 0,
    daysWithData,
  };
}

/**
 * Para cada punto suavizado, intenta construir una observación válida.
 * Skip cuando falta lookback de peso o cuando el food window tiene <4 días.
 */
export function buildObservations(
  smoothed: readonly SmoothedWeightPoint[],
  entries: readonly FoodEntry[],
): CalibrationObservation[] {
  if (smoothed.length < 2) return [];

  const kcalByDay = aggregateKcalByDay(entries);
  const result: CalibrationObservation[] = [];

  for (let i = 1; i < smoothed.length; i++) {
    const current = smoothed[i]!;
    // Buscar un punto previo en la ventana [-WEIGHT_LOOKBACK_MAX, -WEIGHT_LOOKBACK_MIN]
    let prevIdx = -1;
    for (let j = i - 1; j >= 0; j--) {
      const gap = daysBetween(current.date, smoothed[j]!.date);
      if (gap >= WEIGHT_LOOKBACK_MIN_DAYS && gap <= WEIGHT_LOOKBACK_MAX_DAYS) {
        prevIdx = j;
        break;
      }
      if (gap > WEIGHT_LOOKBACK_MAX_DAYS) break;
    }
    if (prevIdx === -1) continue;
    const prev = smoothed[prevIdx]!;
    const gapDays = daysBetween(current.date, prev.date);
    if (gapDays <= 0) continue;
    const weightChangePerDay = (current.smoothedKg - prev.smoothedKg) / gapDays;

    const window = averageKcalInWindow(kcalByDay, current.date, FOOD_WINDOW_DAYS);
    if (window.daysWithData < MIN_FOOD_DAYS_IN_WINDOW) continue;

    result.push({
      date: current.date,
      avgIntake7d: window.avgKcal,
      weightChangePerDay,
    });
  }

  return result;
}
