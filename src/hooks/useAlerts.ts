/**
 * Hook que combina las tres alertas de S7: RED-S, adaptación, diet break.
 *
 * Devuelve null para alertas no aplicables. La UI decide cuáles mostrar y en
 * qué orden de prioridad.
 */

import { useEffect, useMemo, useState } from 'react';
import { detectAdaptation, type AdaptationAssessment } from '@/core/model/adaptationDetection';
import { buildObservations } from '@/core/model/observations';
import { assessRedSRisk, type RedSRiskAssessment } from '@/core/model/redSRisk';
import { suggestDietBreak, type DietBreakSuggestion } from '@/core/model/dietBreak';
import { goalRepo } from '@/data/repos';
import { useFoodStore } from '@/stores/food';
import { useUserStore } from '@/stores/user';
import { useWeightStore } from '@/stores/weight';
import { useCalibration } from './useCalibration';

export interface AlertsState {
  redS: RedSRiskAssessment | null;
  adaptation: AdaptationAssessment | null;
  dietBreak: DietBreakSuggestion | null;
}

interface GoalSummary {
  startedOn: Date | null;
  targetRateKgPerWeek: number;
  goalType: 'lose' | 'maintain' | 'gain' | null;
}

export function useAlerts(): AlertsState {
  const user = useUserStore((s) => s.user);
  const entries = useFoodStore((s) => s.entries);
  const smoothingPoints = useWeightStore((s) => s.smoothing.points);
  const result = useCalibration();
  const [goal, setGoal] = useState<GoalSummary>({
    startedOn: null,
    targetRateKgPerWeek: 0,
    goalType: null,
  });

  useEffect(() => {
    if (!user) return;
    void goalRepo.getActive(user.id).then((g) => {
      setGoal({
        startedOn: g?.startedOn ?? null,
        targetRateKgPerWeek: g?.targetRateKgPerWeek ?? 0,
        goalType: g?.goalType ?? null,
      });
    });
  }, [user]);

  return useMemo(() => {
    if (!user || !result || !goal.goalType) {
      return { redS: null, adaptation: null, dietBreak: null };
    }

    const heightM = user.heightCm / 100;
    const weight = result.calibration.prior.bmr; // fallback, no usado
    const latestWeight =
      smoothingPoints[smoothingPoints.length - 1]?.smoothedKg ?? user.initialWeightKg;
    const bmi = latestWeight / (heightM * heightM);

    const redS = assessRedSRisk({
      sex: user.biologicalSex,
      lifePhase: user.lifePhase,
      effectiveTDEE: result.effectiveTDEE,
      targetRateKgPerWeek: goal.targetRateKgPerWeek,
      goalStartedOn: goal.startedOn,
      bodyFatPct: user.bodyFatPct,
      bmi,
    });

    const observations = buildObservations(smoothingPoints, entries);
    const adaptation = detectAdaptation(observations, result.calibration.mean);

    const dietBreak = suggestDietBreak({
      goalType: goal.goalType,
      targetRateKgPerWeek: goal.targetRateKgPerWeek,
      goalStartedOn: goal.startedOn,
      adaptationOverestimated: adaptation.detected && adaptation.direction === 'tdee_overestimated',
    });

    return { redS, adaptation, dietBreak };
  }, [user, result, goal, smoothingPoints, entries]);
}
