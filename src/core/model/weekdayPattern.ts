/**
 * Patrón individual de ingesta por día de la semana.
 *
 * Justifica brief — "Patrón semanal: días laborales vs. fin de semana":
 * - El peso oscila 0.5-1.5 kg en patrón semanal regular incluso en mantención.
 * - Causas: ingesta real 20-40% mayor S-D, alcohol concentrado en sábado,
 *   sodio elevado, más carbs (glucógeno+agua), NEAT variable, sueño alterado.
 *
 * Esta función calcula el promedio observado por día de la semana. Se usa
 * para mostrar el patrón al usuario y, eventualmente, para distribuir el
 * target diario de forma no-uniforme.
 */

import type { FoodEntry } from './food';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
/** Mínimo de semanas con datos antes de mostrar el patrón individual. */
const MIN_WEEKS_FOR_INDIVIDUAL_PATTERN = 4;

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

export const DAY_LABELS: Record<DayOfWeek, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const DAY_SHORT: Record<DayOfWeek, string> = {
  0: 'Dom',
  1: 'Lun',
  2: 'Mar',
  3: 'Mié',
  4: 'Jue',
  5: 'Vie',
  6: 'Sáb',
};

export interface DayStats {
  day: DayOfWeek;
  avgKcal: number;
  count: number;
}

export interface WeekdayPattern {
  byDay: DayStats[];
  totalDaysWithData: number;
  hasEnoughData: boolean;
  /** kcal promedio del total (para comparar día vs promedio). */
  overallAvgKcal: number;
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Aprende el patrón semanal del usuario a partir de food entries.
 * Se considera "suficiente data" después de ~4 semanas con tracking.
 */
export function learnWeekdayPattern(entries: readonly FoodEntry[]): WeekdayPattern {
  // 1. Agrupar entries por día local → total kcal por día.
  const kcalByDay = new Map<string, { kcal: number; date: Date }>();
  for (const e of entries) {
    const key = localDayKey(e.consumedAt);
    const existing = kcalByDay.get(key);
    if (existing) {
      existing.kcal += e.kcal;
    } else {
      const date = new Date(e.consumedAt);
      date.setHours(0, 0, 0, 0);
      kcalByDay.set(key, { kcal: e.kcal, date });
    }
  }

  // 2. Acumular por día de la semana.
  const sums: Record<DayOfWeek, { sum: number; count: number }> = {
    0: { sum: 0, count: 0 },
    1: { sum: 0, count: 0 },
    2: { sum: 0, count: 0 },
    3: { sum: 0, count: 0 },
    4: { sum: 0, count: 0 },
    5: { sum: 0, count: 0 },
    6: { sum: 0, count: 0 },
  };
  let totalKcal = 0;
  let totalDays = 0;
  for (const { kcal, date } of kcalByDay.values()) {
    const dow = date.getDay() as DayOfWeek;
    sums[dow].sum += kcal;
    sums[dow].count += 1;
    totalKcal += kcal;
    totalDays += 1;
  }

  const byDay: DayStats[] = ([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((d) => ({
    day: d,
    avgKcal: sums[d].count > 0 ? sums[d].sum / sums[d].count : 0,
    count: sums[d].count,
  }));

  return {
    byDay,
    totalDaysWithData: totalDays,
    hasEnoughData: totalDays >= MIN_WEEKS_FOR_INDIVIDUAL_PATTERN * 4,
    overallAvgKcal: totalDays > 0 ? totalKcal / totalDays : 0,
  };
}

/**
 * Días "fin de semana" del patrón estándar — para comparación.
 * Convención del brief: S-D más permisivo.
 */
export const WEEKEND_DAYS: ReadonlyArray<DayOfWeek> = [0, 6];

export function isWeekend(day: DayOfWeek): boolean {
  return WEEKEND_DAYS.includes(day);
}

/**
 * Calcula el delta promedio S-D vs L-V observado.
 * Útil para saber si el usuario tiene el patrón clásico o uno propio.
 */
export function weekendDelta(pattern: WeekdayPattern): number | null {
  const weekday = pattern.byDay.filter((d) => !isWeekend(d.day));
  const weekend = pattern.byDay.filter((d) => isWeekend(d.day));
  const weekdayWithData = weekday.filter((d) => d.count > 0);
  const weekendWithData = weekend.filter((d) => d.count > 0);
  if (weekdayWithData.length === 0 || weekendWithData.length === 0) return null;
  const avgWeekday = weekdayWithData.reduce((s, d) => s + d.avgKcal, 0) / weekdayWithData.length;
  const avgWeekend = weekendWithData.reduce((s, d) => s + d.avgKcal, 0) / weekendWithData.length;
  return avgWeekend - avgWeekday;
}
