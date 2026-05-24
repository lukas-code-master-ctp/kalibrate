/**
 * Detección de fase del ciclo menstrual + ajustes derivados.
 *
 * Justifica brief — sección "Diferenciación crítica mujeres vs. hombres":
 * - Fase folicular (días ~1-13): mejor para evaluar progreso, déficit
 *   "normal".
 * - Ovulación (día ~14): pequeña retención transitoria (no es grasa).
 * - Lútea (días ~15-28): BMR sube 2.5-11% (típico +5-7%), apetito sube,
 *   retención progresiva. La calibración bayesiana ya absorbe parte de
 *   esto vía observaciones, pero aplicamos un ajuste explícito al TDEE
 *   *mostrado al usuario* para que el target diario refleje la realidad
 *   fisiológica de cada fase.
 *
 * Solo aplica para usuarias femeninas en edad fértil con ciclo regular.
 * Para irregular/anticoncepción/perimeno/meno → la app no aplica ajuste.
 */

import type { LifePhase } from './types';

export type CyclePhase =
  | 'menstruation'
  | 'follicular'
  | 'ovulation'
  | 'luteal_early'
  | 'luteal_premenstrual'
  | 'late_or_uncertain';

export type MenstrualEventType = 'period_start' | 'period_end' | 'ovulation_observed' | 'spotting';

export interface MenstrualEvent {
  id: string;
  eventType: MenstrualEventType;
  occurredOn: Date;
  flowIntensity?: 'light' | 'medium' | 'heavy';
  note?: string;
}

const DEFAULT_CYCLE_LENGTH_DAYS = 28;
const LUTEAL_PHASE_LENGTH_DAYS = 14;
const MENSTRUATION_DAYS = 5;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Multiplicador del TDEE por fase del ciclo.
 *
 * Valores poblacionales del brief. En fase 2 se podrían calibrar
 * individualmente con regularización fuerte hacia estos defaults.
 */
export const PHASE_TDEE_ADJUSTMENT: Record<CyclePhase, number> = {
  menstruation: 0.0,
  follicular: 0.0,
  ovulation: 0.0,
  luteal_early: 0.04,
  luteal_premenstrual: 0.06,
  late_or_uncertain: 0.0,
};

/**
 * Fases con retención de agua esperada — el peso suavizado no debería
 * tomarse al pie de la letra durante estas ventanas.
 */
export const PHASES_WITH_WATER_RETENTION: ReadonlySet<CyclePhase> = new Set([
  'ovulation',
  'luteal_premenstrual',
]);

/** Solo estas fases de vida activan el modelo de ciclo. */
const CYCLE_APPLICABLE_LIFE_PHASES: ReadonlySet<LifePhase> = new Set([
  'fertile_regular',
  'fertile_irregular',
]);

export function isCycleApplicable(lifePhase: LifePhase | undefined): boolean {
  return lifePhase !== undefined && CYCLE_APPLICABLE_LIFE_PHASES.has(lifePhase);
}

export interface CycleAnalysis {
  phase: CyclePhase;
  /** Día del ciclo actual (1 = inicio de menstruación). */
  daysIntoCycle: number;
  /** Largo del ciclo aprendido del usuario (o 28 default). */
  cycleLengthDays: number;
  /** Fecha proyectada del próximo periodo. */
  nextPeriodOn: Date;
  /** Confianza en la detección. Baja si pocos ciclos previos o ciclo muy atrasado. */
  confidence: 'low' | 'medium' | 'high';
  /** True si la fase actual típicamente acarrea retención de agua. */
  hasWaterRetention: boolean;
}

function daysBetween(later: Date, earlier: Date): number {
  return Math.floor((later.getTime() - earlier.getTime()) / MS_PER_DAY);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * MS_PER_DAY);
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function mapDayToPhase(daysIntoCycle: number, cycleLengthDays: number): CyclePhase {
  const ovulationDay = cycleLengthDays - LUTEAL_PHASE_LENGTH_DAYS;
  if (daysIntoCycle <= MENSTRUATION_DAYS) return 'menstruation';
  if (daysIntoCycle < ovulationDay) return 'follicular';
  if (daysIntoCycle === ovulationDay) return 'ovulation';
  if (daysIntoCycle < cycleLengthDays - 3) return 'luteal_early';
  if (daysIntoCycle <= cycleLengthDays + 2) return 'luteal_premenstrual';
  return 'late_or_uncertain';
}

/**
 * Devuelve null si no hay datos suficientes (ningún period_start registrado).
 * El caller decide qué mostrar al usuario en ese caso.
 */
export function detectPhase(
  events: readonly MenstrualEvent[],
  now: Date = new Date(),
): CycleAnalysis | null {
  const starts = events
    .filter((e) => e.eventType === 'period_start')
    .map((e) => e.occurredOn)
    .sort((a, b) => b.getTime() - a.getTime());

  if (starts.length === 0) return null;

  const lastStart = starts[0]!;
  const daysIntoCycle = daysBetween(now, lastStart) + 1;

  let cycleLengthDays = DEFAULT_CYCLE_LENGTH_DAYS;
  let confidence: CycleAnalysis['confidence'] = 'low';

  if (starts.length >= 3) {
    const lengths: number[] = [];
    for (let i = 0; i < starts.length - 1; i++) {
      lengths.push(daysBetween(starts[i]!, starts[i + 1]!));
    }
    cycleLengthDays = Math.round(median(lengths));
    const spread = Math.max(...lengths) - Math.min(...lengths);
    confidence = spread <= 4 ? 'high' : spread <= 7 ? 'medium' : 'low';
  } else if (starts.length === 2) {
    cycleLengthDays = daysBetween(starts[0]!, starts[1]!);
    confidence = 'medium';
  }

  const phase = mapDayToPhase(daysIntoCycle, cycleLengthDays);
  const nextPeriodOn = addDays(lastStart, cycleLengthDays);

  return {
    phase,
    daysIntoCycle,
    cycleLengthDays,
    nextPeriodOn,
    confidence,
    hasWaterRetention: PHASES_WITH_WATER_RETENTION.has(phase),
  };
}

/**
 * Ajuste multiplicativo al TDEE según fase. Devuelve 0 (sin ajuste) si la
 * fase de vida no aplica o si no hay análisis de fase disponible.
 */
export function phaseTDEEAdjustment(
  lifePhase: LifePhase | undefined,
  analysis: CycleAnalysis | null,
): number {
  if (!isCycleApplicable(lifePhase)) return 0;
  if (!analysis) return 0;
  return PHASE_TDEE_ADJUSTMENT[analysis.phase];
}
