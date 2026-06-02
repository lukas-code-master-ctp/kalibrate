/**
 * Detección de riesgo de RED-S (Relative Energy Deficiency in Sport).
 *
 * Justifica brief — sección "Disponibilidad energética baja (RED-S)":
 * - Para mujeres activas con energía disponible < 30 kcal/kg de masa magra,
 *   hay riesgo de disrupción menstrual, pérdida ósea, caída de tiroides.
 * - La app debe detectar y advertir.
 *
 * Sin tracking de entrenamiento (fase 2), usamos un proxy basado en:
 * - Sexo biológico femenino + life_phase fértil
 * - Déficit propuesto (kcal o % del TDEE)
 * - Duración acumulada del objetivo de pérdida
 * - %grasa corporal estimado, si disponible
 *
 * Esto cubre el caso típico de pareja del proyecto sin requerir wearables.
 */

import type { BiologicalSex, LifePhase } from './types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type RedSRisk = 'low' | 'medium' | 'high' | 'not_applicable';

export interface RedSRiskInput {
  sex: BiologicalSex;
  lifePhase: LifePhase | undefined;
  /** TDEE efectivo en kcal/día. */
  effectiveTDEE: number;
  /** Ritmo objetivo (negativo si está perdiendo). */
  targetRateKgPerWeek: number;
  /** Fecha de inicio del objetivo actual. */
  goalStartedOn: Date | null;
  /** %grasa corporal si está disponible. */
  bodyFatPct?: number;
  /** BMI calculado. */
  bmi?: number;
  /** Total minutos de entrenamiento en los últimos 7 días, si se trackea. */
  weeklyTrainingMin?: number;
  /** True si hubo al menos una sesión de alta intensidad esta semana. */
  hasHighIntensityTraining?: boolean;
  now?: Date;
}

export interface RedSRiskAssessment {
  risk: RedSRisk;
  reasons: string[];
  advice: string | null;
  /** Métricas resumidas para mostrar al usuario. */
  metrics: {
    deficitPct: number | null;
    weeksInDeficit: number | null;
  };
}

function weeksBetween(later: Date, earlier: Date): number {
  return (later.getTime() - earlier.getTime()) / MS_PER_DAY / 7;
}

const FERTILE_PHASES: ReadonlySet<LifePhase> = new Set(['fertile_regular', 'fertile_irregular']);

export function assessRedSRisk(input: RedSRiskInput): RedSRiskAssessment {
  const now = input.now ?? new Date();

  // Solo aplica para mujeres en edad fértil.
  if (input.sex !== 'female' || !input.lifePhase || !FERTILE_PHASES.has(input.lifePhase)) {
    return notApplicable();
  }

  // Sin déficit no hay riesgo de RED-S.
  if (input.targetRateKgPerWeek >= -0.05) {
    return notApplicable();
  }

  const proposedDeficitKcal = Math.abs(input.targetRateKgPerWeek) * 1100;
  const deficitPct = proposedDeficitKcal / input.effectiveTDEE;
  const weeksInDeficit = input.goalStartedOn
    ? Math.max(0, weeksBetween(now, input.goalStartedOn))
    : 0;

  const reasons: string[] = [];
  let score = 0;

  if (deficitPct > 0.3) {
    score += 2;
    reasons.push(`Déficit del ${Math.round(deficitPct * 100)}% del TDEE (>30% es agresivo).`);
  } else if (deficitPct > 0.25) {
    score += 1;
    reasons.push(`Déficit del ${Math.round(deficitPct * 100)}% del TDEE.`);
  }

  if (weeksInDeficit > 12) {
    score += 2;
    reasons.push(`Llevas más de 12 semanas en déficit (${Math.round(weeksInDeficit)} semanas).`);
  } else if (weeksInDeficit > 6) {
    score += 1;
    reasons.push(`Llevas ${Math.round(weeksInDeficit)} semanas en déficit.`);
  }

  if (input.bodyFatPct !== undefined) {
    if (input.bodyFatPct < 16) {
      score += 4;
      reasons.push(`%grasa corporal en zona esencial (${input.bodyFatPct.toFixed(1)}%).`);
    } else if (input.bodyFatPct < 19) {
      score += 2;
      reasons.push(`%grasa corporal en zona atlética baja (${input.bodyFatPct.toFixed(1)}%).`);
    }
  }

  if (input.bmi !== undefined && input.bmi < 18.5) {
    score += 2;
    reasons.push(`BMI bajo (${input.bmi.toFixed(1)}).`);
  }

  // Entrenamiento real (brief: >300 min/sem OR alta intensidad suman score).
  if (input.weeklyTrainingMin !== undefined && input.weeklyTrainingMin > 300) {
    score += 1;
    reasons.push(
      `${input.weeklyTrainingMin} min de entrenamiento esta semana (>300 aumenta la demanda energética).`,
    );
  }
  if (input.hasHighIntensityTraining) {
    score += 1;
    reasons.push('Entrenamiento de alta intensidad esta semana.');
  }

  const risk: RedSRisk = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
  const advice =
    risk === 'high'
      ? 'Consulta con un profesional de salud. Considera reducir el déficit o pausar (diet break) por 2 semanas en mantención.'
      : risk === 'medium'
        ? 'Considera bajar el déficit o tomar una pausa en mantención. Prioriza proteína (≥1.8 g/kg) y carbohidratos suficientes alrededor del entrenamiento.'
        : null;

  return {
    risk,
    reasons,
    advice,
    metrics: { deficitPct, weeksInDeficit },
  };
}

function notApplicable(): RedSRiskAssessment {
  return {
    risk: 'not_applicable',
    reasons: [],
    advice: null,
    metrics: { deficitPct: null, weeksInDeficit: null },
  };
}
