/**
 * Hook que evalúa la ventana semanal actual.
 *
 * Combina TDEE efectivo + target rate + ciclo + datos de peso/comida.
 */

import { useEffect, useMemo, useState } from 'react';
import { evaluateWeek, type WeeklyEvaluation } from '@/core/model/weeklyStatus';
import { goalRepo } from '@/data/repos';
import { useFoodStore } from '@/stores/food';
import { useUserStore } from '@/stores/user';
import { useWeightStore } from '@/stores/weight';
import { useCalibration } from './useCalibration';

export function useWeeklyStatus(): WeeklyEvaluation | null {
  const user = useUserStore((s) => s.user);
  const entries = useFoodStore((s) => s.entries);
  const smoothingPoints = useWeightStore((s) => s.smoothing.points);
  const result = useCalibration();
  const [targetRate, setTargetRate] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    void goalRepo.getActive(user.id).then((g) => {
      setTargetRate(g?.targetRateKgPerWeek ?? 0);
    });
  }, [user]);

  return useMemo(() => {
    if (!result || targetRate === null) return null;
    return evaluateWeek({
      effectiveTDEE: result.effectiveTDEE,
      targetRateKgPerWeek: targetRate,
      cycleAnalysis: result.cycleAnalysis,
      smoothedPoints: smoothingPoints,
      foodEntries: entries,
    });
  }, [result, targetRate, smoothingPoints, entries]);
}
