/**
 * Hook que devuelve el TDEE calibrado actual.
 *
 * Combina: perfil del usuario (prior) + serie suavizada de peso +
 * food entries → CalibratedTDEE. Memoizado contra los datos crudos.
 */

import { useMemo } from 'react';
import { calibrateTDEE, type CalibratedTDEE } from '@/core/model/calibration';
import { buildObservations } from '@/core/model/observations';
import { priorTDEE } from '@/core/model/priors';
import { ageInYears } from '@/core/model/user';
import { useFoodStore } from '@/stores/food';
import { useUserStore } from '@/stores/user';
import { selectLatestSmoothed, useWeightStore } from '@/stores/weight';

export function useCalibration(): CalibratedTDEE | null {
  const user = useUserStore((s) => s.user);
  const smoothingPoints = useWeightStore((s) => s.smoothing.points);
  const latestSmoothed = useWeightStore(selectLatestSmoothed);
  const entries = useFoodStore((s) => s.entries);

  return useMemo(() => {
    if (!user) return null;
    const weightForPrior = latestSmoothed ?? user.initialWeightKg;
    const prior = priorTDEE({
      sex: user.biologicalSex,
      weightKg: weightForPrior,
      heightCm: user.heightCm,
      ageYears: ageInYears(user.birthDate),
      activityLevel: user.activityLevel,
      bodyFatPct: user.bodyFatPct,
    });
    const observations = buildObservations(smoothingPoints, entries);
    return calibrateTDEE(prior, observations);
  }, [user, latestSmoothed, smoothingPoints, entries]);
}

/**
 * Genera copy explicativo según el estado de la calibración. Lenguaje natural,
 * sin estadística. Justifica brief — Pilar 4.
 */
export function calibrationCopy(c: CalibratedTDEE): {
  headline: string;
  detail: string;
} {
  if (c.method === 'prior_only') {
    return {
      headline: 'Calibrando',
      detail:
        c.daysOfData < 1
          ? 'Estamos partiendo con una fórmula poblacional (Mifflin-St Jeor). Vamos a calibrarla a tu cuerpo real cuando tengamos al menos 14 días con peso e ingesta consistentes.'
          : `Llevamos ${c.daysOfData}/14 días de datos. Cuando crucemos los 14, empezamos a usar tus datos reales.`,
    };
  }
  switch (c.confidence) {
    case 'low':
      return {
        headline: 'Confianza baja',
        detail:
          'Ya estamos usando tus datos, pero todavía con pocas observaciones efectivas. Sigue registrando con consistencia y el rango se va a ir achicando.',
      };
    case 'medium':
      return {
        headline: 'Confianza media',
        detail:
          'Tu TDEE personal está convergiendo con tus datos. Una porción significativa del estimado ya viene de cómo responde tu cuerpo, no de la fórmula.',
      };
    case 'high':
      return {
        headline: 'Confianza alta',
        detail:
          'Calibrado con tus datos. El número refleja cómo tu cuerpo realmente responde a tu ingesta y actividad, no una fórmula promedio.',
      };
    case 'calibrating':
      // Inalcanzable por la lógica de calibrateTDEE, pero TS lo pide.
      return { headline: 'Calibrando', detail: '' };
  }
}
