/**
 * Tipos del dominio de entrenamiento.
 *
 * Justifica brief — sección "Factores no calóricos":
 * - "Entrenamiento (nuevo): primeras semanas de fuerza → +1-2 kg de agua y
 *   glucógeno muscular. No es ganancia de grasa, es bueno."
 * - "Para mujeres activas con energía disponible < 30 kcal/kg LBM → riesgo
 *   de RED-S. La app debe detectar y advertir."
 *
 * Inicialmente sin estimación de kcal gastadas (la literatura coincide en que
 * los modelos genéricos son poco precisos sin datos individuales). La duración
 * + intensidad alimentan la alerta RED-S y el contexto educativo.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type TrainingType =
  | 'strength' // fuerza, pesas, calistenia
  | 'cardio_low' // caminar fuerte, trote suave, bici suave
  | 'cardio_high' // running, HIIT, intervalos
  | 'mixed' // crossfit, circuit, deporte mixto
  | 'sport'; // padel, fútbol, tenis, etc.

export interface TrainingSession {
  id: string;
  occurredAt: Date;
  type: TrainingType;
  /** Descripción libre, opcional. Ej "Press banca 5x5", "Pádel con Tomás". */
  description?: string;
  durationMin: number;
  /** Rate of Perceived Exertion, 1-10. Opcional. */
  rpe?: number;
  /** Marca como "primeras semanas de un programa nuevo" para mensaje educativo. */
  isNewProgram?: boolean;
  note?: string;
}

export interface WeeklyTrainingSummary {
  totalMinutes: number;
  countByType: Record<TrainingType, number>;
  minutesByType: Record<TrainingType, number>;
  /** True si hubo al menos una sesión de alta intensidad (RPE >= 7) o cardio_high. */
  hasHighIntensity: boolean;
  /** Última sesión, si existe. */
  latestSession: TrainingSession | null;
}

function emptyByType(): Record<TrainingType, number> {
  return {
    strength: 0,
    cardio_low: 0,
    cardio_high: 0,
    mixed: 0,
    sport: 0,
  };
}

/**
 * Agrega sesiones de la última semana móvil (7 días desde `now`).
 * Usado por la alerta RED-S y por el resumen de "Tu semana de entrenamiento".
 */
export function summarizeWeek(
  sessions: readonly TrainingSession[],
  now: Date = new Date(),
): WeeklyTrainingSummary {
  const cutoff = now.getTime() - 7 * MS_PER_DAY;
  const recent = sessions.filter((s) => s.occurredAt.getTime() >= cutoff);

  let totalMinutes = 0;
  let hasHighIntensity = false;
  const countByType = emptyByType();
  const minutesByType = emptyByType();

  for (const s of recent) {
    totalMinutes += s.durationMin;
    countByType[s.type] += 1;
    minutesByType[s.type] += s.durationMin;
    if (s.type === 'cardio_high') hasHighIntensity = true;
    if (s.rpe !== undefined && s.rpe >= 7) hasHighIntensity = true;
  }

  const sorted = [...recent].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());

  return {
    totalMinutes,
    countByType,
    minutesByType,
    hasHighIntensity,
    latestSession: sorted[0] ?? null,
  };
}

export const TYPE_LABELS: Record<TrainingType, string> = {
  strength: 'Fuerza',
  cardio_low: 'Cardio suave',
  cardio_high: 'Cardio intenso',
  mixed: 'Mixto',
  sport: 'Deporte',
};
