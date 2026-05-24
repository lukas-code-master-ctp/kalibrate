/**
 * Sugerencia de diet break.
 *
 * Justifica brief — Pilar 2:
 * "Implementar/sugerir diet breaks programados (1-2 semanas en mantenimiento
 *  cada 4-8 semanas en déficit). Evidencia: estudio MATADOR (2017)."
 *
 * Dispara una sugerencia cuando:
 * - Lleva ≥6 semanas en déficit continuo (umbral conservador), O
 * - Hay adaptación detectada (sesgo negativo en residuales).
 *
 * No bloquea ni cambia metas automáticamente — solo sugiere.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const SUGGEST_AFTER_WEEKS = 6;
const URGENT_AFTER_WEEKS = 10;

export type DietBreakUrgency = 'none' | 'suggested' | 'urgent';

export interface DietBreakInput {
  goalType: 'lose' | 'maintain' | 'gain';
  targetRateKgPerWeek: number;
  goalStartedOn: Date | null;
  /** Si la detección de adaptación marca sesgo negativo. */
  adaptationOverestimated: boolean;
  now?: Date;
}

export interface DietBreakSuggestion {
  urgency: DietBreakUrgency;
  weeksInDeficit: number;
  reason: string | null;
  recommendation: string | null;
}

function weeksBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / MS_PER_DAY / 7;
}

export function suggestDietBreak(input: DietBreakInput): DietBreakSuggestion {
  const now = input.now ?? new Date();

  // Solo aplica si está en déficit (perdiendo).
  if (input.goalType !== 'lose' || input.targetRateKgPerWeek >= -0.05) {
    return { urgency: 'none', weeksInDeficit: 0, reason: null, recommendation: null };
  }

  const weeksInDeficit = input.goalStartedOn
    ? Math.max(0, weeksBetween(now, input.goalStartedOn))
    : 0;

  // Adaptación detectada → urgente independiente de tiempo.
  if (input.adaptationOverestimated) {
    return {
      urgency: 'urgent',
      weeksInDeficit,
      reason:
        'Tu cuerpo muestra señales de adaptación metabólica: gasta menos energía que el modelo esperaba.',
      recommendation:
        'Sugerencia: 1-2 semanas en mantención (ingesta = TDEE efectivo). Estudios como MATADOR muestran que diet breaks mejoran resultados a largo plazo.',
    };
  }

  if (weeksInDeficit > URGENT_AFTER_WEEKS) {
    return {
      urgency: 'urgent',
      weeksInDeficit,
      reason: `Llevas ${Math.round(weeksInDeficit)} semanas en déficit continuo.`,
      recommendation:
        'Tomar 1-2 semanas en mantención mejora la respuesta al déficit posterior y previene adaptación metabólica.',
    };
  }

  if (weeksInDeficit > SUGGEST_AFTER_WEEKS) {
    return {
      urgency: 'suggested',
      weeksInDeficit,
      reason: `Llevas ${Math.round(weeksInDeficit)} semanas en déficit continuo.`,
      recommendation:
        'A partir de las 6-8 semanas en déficit, un break de 1-2 semanas en mantención ayuda a sostener el progreso a largo plazo.',
    };
  }

  return { urgency: 'none', weeksInDeficit, reason: null, recommendation: null };
}
