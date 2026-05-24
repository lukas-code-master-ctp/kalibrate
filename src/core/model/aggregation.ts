/**
 * Agregaciones de FoodEntry para resumen diario y semanal.
 */

import type { FoodEntry } from './food';

export interface DailyTotals {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  alcoholKcal: number;
  entryCount: number;
}

const EMPTY_TOTALS: DailyTotals = {
  kcal: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  fiberG: 0,
  alcoholKcal: 0,
  entryCount: 0,
};

export function aggregateTotals(entries: readonly FoodEntry[]): DailyTotals {
  return entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + e.kcal,
      proteinG: acc.proteinG + e.proteinG,
      carbsG: acc.carbsG + (e.carbsG ?? 0),
      fatG: acc.fatG + (e.fatG ?? 0),
      fiberG: acc.fiberG + (e.fiberG ?? 0),
      alcoholKcal: acc.alcoholKcal + (e.containsAlcohol ? e.kcal : 0),
      entryCount: acc.entryCount + 1,
    }),
    EMPTY_TOTALS,
  );
}

/**
 * Calcula la ingesta sugerida en kcal/día dado el TDEE y un ritmo objetivo
 * en kg/semana. Brief: ΔPeso = (Ingesta - TDEE) × días / 7700.
 * Por día: Ingesta = TDEE + (ritmo × 7700 / 7) = TDEE + ritmo × 1100.
 */
export function suggestedDailyIntake(tdeeKcal: number, targetRateKgPerWeek: number): number {
  return tdeeKcal + targetRateKgPerWeek * 1100;
}

/**
 * Calcula el target diario de proteína según masa corporal y objetivo.
 * Brief: 1.6-2.2 g/kg en déficit. Default 1.8 g/kg.
 *
 * - En déficit (perdiendo): 2.0 g/kg (más prioridad a preservar masa magra)
 * - En mantenimiento o ganancia: 1.8 g/kg
 */
export function suggestedDailyProteinG(weightKg: number, targetRateKgPerWeek: number): number {
  const gramsPerKg = targetRateKgPerWeek < -0.05 ? 2.0 : 1.8;
  return Math.round(weightKg * gramsPerKg);
}
