/**
 * Evaluación de progreso en ventana semanal móvil.
 *
 * Justifica brief — Pilar 4 ("ventanas de validación"):
 * - Verde: progreso dentro del rango esperado (ratio 0.6–1.4).
 * - Amarillo: algo fuera de rango, listar causas posibles.
 * - Rojo: consistentemente fuera por 3+ semanas → recalibrar (la marca de
 *   "3 semanas consecutivas" se evalúa en el caller, esta función solo
 *   clasifica la ventana actual).
 *
 * Reemplaza el modelo binario "cumpliste/no cumpliste tu meta hoy" por una
 * evaluación contextual sobre 7 días móviles. Defiere la evaluación si la
 * ventana incluye días con retención de agua (premenstrual/ovulación) o si
 * no hay datos suficientes.
 */

import { K_KCAL_PER_KG } from '../constants';
import type { FoodEntry } from './food';
import type { CycleAnalysis } from './cycle';
import { PHASES_WITH_WATER_RETENTION } from './cycle';
import type { SmoothedWeightPoint } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const WINDOW_DAYS = 7;
const MAINTENANCE_THRESHOLD_KG_PER_WEEK = 0.05;
const MAINTENANCE_OK_BAND_KG = 0.3;
const MIN_FOOD_DAYS_IN_WINDOW = 4;
const WEIGHT_LOOKUP_TOLERANCE_DAYS = 2;

export type WeekStatus = 'green' | 'yellow' | 'red' | 'deferred' | 'insufficient_data';

export interface WeeklyEvaluation {
  status: WeekStatus;
  expectedWeeklyChangeKg: number;
  actualWeeklyChangeKg: number;
  /** ratio actual/expected; null cuando expected ≈ 0 (mantención). */
  ratio: number | null;
  avgIntake7dKcal: number | null;
  notes: string[];
  /** Días estimados con retención dentro de la ventana, si los hay. */
  retentionDays: number;
}

export interface EvaluateWeekInput {
  effectiveTDEE: number;
  targetRateKgPerWeek: number;
  cycleAnalysis?: CycleAnalysis | null;
  smoothedPoints: readonly SmoothedWeightPoint[];
  foodEntries: readonly FoodEntry[];
  now?: Date;
}

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / MS_PER_DAY;
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function avgIntakeInWindow(
  entries: readonly FoodEntry[],
  endDate: Date,
  windowDays: number,
): { avgKcal: number; daysWithData: number } {
  const kcalByDay = new Map<string, number>();
  for (const e of entries) {
    const key = localDayKey(e.consumedAt);
    kcalByDay.set(key, (kcalByDay.get(key) ?? 0) + e.kcal);
  }
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

function findSmoothedNear(
  points: readonly SmoothedWeightPoint[],
  targetDate: Date,
  maxGapDays: number,
): SmoothedWeightPoint | null {
  let best: SmoothedWeightPoint | null = null;
  let bestDiff = Infinity;
  for (const p of points) {
    const diff = Math.abs(daysBetween(targetDate, p.date));
    if (diff <= maxGapDays && diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best;
}

export function evaluateWeek(input: EvaluateWeekInput): WeeklyEvaluation {
  const now = input.now ?? new Date();
  const windowStart = new Date(now.getTime() - WINDOW_DAYS * MS_PER_DAY);

  const recentPoint = findSmoothedNear(input.smoothedPoints, now, WEIGHT_LOOKUP_TOLERANCE_DAYS);
  const earlyPoint = findSmoothedNear(
    input.smoothedPoints,
    windowStart,
    WEIGHT_LOOKUP_TOLERANCE_DAYS,
  );
  const { avgKcal, daysWithData } = avgIntakeInWindow(input.foodEntries, now, WINDOW_DAYS);

  if (!recentPoint || !earlyPoint) {
    return insufficient('Faltan mediciones de peso en la ventana.', avgKcal, daysWithData);
  }
  if (daysWithData < MIN_FOOD_DAYS_IN_WINDOW) {
    return insufficient(
      `Solo ${daysWithData}/${WINDOW_DAYS} días con comida registrada.`,
      avgKcal,
      daysWithData,
    );
  }

  const actualWeeklyChangeKg = recentPoint.smoothedKg - earlyPoint.smoothedKg;
  const expectedDailyBalance = avgKcal - input.effectiveTDEE;
  const expectedWeeklyChangeKg = (expectedDailyBalance * WINDOW_DAYS) / K_KCAL_PER_KG;

  const inRetention =
    input.cycleAnalysis !== null &&
    input.cycleAnalysis !== undefined &&
    PHASES_WITH_WATER_RETENTION.has(input.cycleAnalysis.phase);

  if (inRetention) {
    return {
      status: 'deferred',
      expectedWeeklyChangeKg,
      actualWeeklyChangeKg,
      ratio: null,
      avgIntake7dKcal: avgKcal,
      retentionDays: 5,
      notes: [
        'La ventana incluye días con retención esperada (ovulación o premenstrual). Esperamos al próximo ciclo para evaluar.',
      ],
    };
  }

  const isMaintenance = Math.abs(input.targetRateKgPerWeek) < MAINTENANCE_THRESHOLD_KG_PER_WEEK;

  if (isMaintenance) {
    const status: WeekStatus =
      Math.abs(actualWeeklyChangeKg) <= MAINTENANCE_OK_BAND_KG ? 'green' : 'yellow';
    return {
      status,
      expectedWeeklyChangeKg,
      actualWeeklyChangeKg,
      ratio: null,
      avgIntake7dKcal: avgKcal,
      retentionDays: 0,
      notes:
        status === 'green'
          ? []
          : ['Tu peso se movió más allá de la banda esperada para mantención.'],
    };
  }

  if (Math.abs(expectedWeeklyChangeKg) < 0.01) {
    return insufficient(
      'Tu ingesta promedio coincide con tu TDEE — sin déficit/superávit medible esta ventana.',
      avgKcal,
      daysWithData,
    );
  }

  const ratio = actualWeeklyChangeKg / expectedWeeklyChangeKg;
  const { status, notes } = classifyByRatio(ratio, expectedWeeklyChangeKg);

  return {
    status,
    expectedWeeklyChangeKg,
    actualWeeklyChangeKg,
    ratio,
    avgIntake7dKcal: avgKcal,
    retentionDays: 0,
    notes,
  };
}

function insufficient(reason: string, avgKcal: number, daysWithData: number): WeeklyEvaluation {
  return {
    status: 'insufficient_data',
    expectedWeeklyChangeKg: 0,
    actualWeeklyChangeKg: 0,
    ratio: null,
    avgIntake7dKcal: daysWithData > 0 ? avgKcal : null,
    retentionDays: 0,
    notes: [reason],
  };
}

function classifyByRatio(
  ratio: number,
  expectedChangeKg: number,
): { status: WeekStatus; notes: string[] } {
  if (ratio >= 0.6 && ratio <= 1.4) {
    return { status: 'green', notes: [] };
  }
  if (ratio >= 0.3 && ratio <= 1.7) {
    return {
      status: 'yellow',
      notes: causesForRatio(ratio, expectedChangeKg),
    };
  }
  return {
    status: 'red',
    notes: causesForRatio(ratio, expectedChangeKg),
  };
}

function causesForRatio(ratio: number, expectedChangeKg: number): string[] {
  const goingDown = expectedChangeKg < 0;
  const movingLessThanExpected = ratio < 0.6;
  const movingMoreThanExpected = ratio > 1.4;

  if (movingLessThanExpected) {
    return goingDown
      ? [
          'Pérdida menor a la esperada. Causas comunes: subreporte de comida, retención de agua (sodio o estrés), adaptación metabólica si llevas semanas en déficit.',
        ]
      : [
          'Ganancia menor a la esperada. Si tu meta es ganar, puede que comas menos de lo que creas o tu TDEE sea más alto que el calibrado.',
        ];
  }
  if (movingMoreThanExpected) {
    return goingDown
      ? [
          'Pérdida mayor a la esperada. Causas comunes: pérdida de agua y glucógeno (sobre todo si bajaste carbs), error puntual de báscula, infrarreporte reciente.',
        ]
      : [
          'Ganancia mayor a la esperada. Causas comunes: retención de agua o sodio reciente, comida con más kcal de las trackeadas, o sí estás comiendo más de la meta.',
        ];
  }
  return [];
}
