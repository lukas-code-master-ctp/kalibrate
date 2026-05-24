/**
 * Hook que devuelve el TDEE calibrado actual + ajuste de fase del ciclo.
 *
 * - `calibration` es el TDEE base (modelo bayesiano puro, sin fase).
 * - `effectiveTDEE` aplica el ajuste de fase para usuarias femeninas con
 *   ciclo aplicable. Es el número que se usa para metas diarias y display.
 * - `cycleAnalysis` (null para no aplica) describe la fase actual.
 */

import { useMemo } from 'react';
import { calibrateTDEE, type CalibratedTDEE } from '@/core/model/calibration';
import {
  detectPhase,
  isCycleApplicable,
  phaseTDEEAdjustment,
  type CycleAnalysis,
} from '@/core/model/cycle';
import { buildObservations } from '@/core/model/observations';
import { priorTDEE } from '@/core/model/priors';
import { ageInYears } from '@/core/model/user';
import { useCycleStore } from '@/stores/cycle';
import { useFoodStore } from '@/stores/food';
import { useUserStore } from '@/stores/user';
import { selectLatestSmoothed, useWeightStore } from '@/stores/weight';

export interface CalibrationResult {
  calibration: CalibratedTDEE;
  cycleAnalysis: CycleAnalysis | null;
  /** Multiplicador menos 1 (ej: 0.04 = +4%). */
  phaseAdjustment: number;
  effectiveTDEE: number;
  effectiveCiLow: number;
  effectiveCiHigh: number;
}

export function useCalibration(): CalibrationResult | null {
  const user = useUserStore((s) => s.user);
  const smoothingPoints = useWeightStore((s) => s.smoothing.points);
  const latestSmoothed = useWeightStore(selectLatestSmoothed);
  const entries = useFoodStore((s) => s.entries);
  const events = useCycleStore((s) => s.events);

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
    const calibration = calibrateTDEE(prior, observations);

    const cycleAnalysis =
      user.biologicalSex === 'female' && isCycleApplicable(user.lifePhase)
        ? detectPhase(events)
        : null;
    const phaseAdjustment = phaseTDEEAdjustment(user.lifePhase, cycleAnalysis);
    const factor = 1 + phaseAdjustment;

    return {
      calibration,
      cycleAnalysis,
      phaseAdjustment,
      effectiveTDEE: calibration.mean * factor,
      effectiveCiLow: calibration.ciLow * factor,
      effectiveCiHigh: calibration.ciHigh * factor,
    };
  }, [user, latestSmoothed, smoothingPoints, entries, events]);
}

/**
 * Mensaje natural sobre el estado de la calibración (sin estadística).
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
          ? 'Partimos con una fórmula poblacional (Mifflin-St Jeor). La calibramos a tu cuerpo real cuando tengamos al menos 14 días con peso e ingesta consistentes.'
          : `Llevamos ${c.daysOfData}/14 días de datos. Cuando crucemos los 14, empezamos a usar tus datos reales.`,
    };
  }
  switch (c.confidence) {
    case 'low':
      return {
        headline: 'Confianza baja',
        detail:
          'Ya usamos tus datos, pero con pocas observaciones efectivas. Sigue registrando y el rango se va a ir achicando.',
      };
    case 'medium':
      return {
        headline: 'Confianza media',
        detail:
          'Tu TDEE personal está convergiendo. Buena parte del estimado ya viene de tu cuerpo, no de la fórmula.',
      };
    case 'high':
      return {
        headline: 'Confianza alta',
        detail:
          'Calibrado con tus datos. El número refleja cómo tu cuerpo responde realmente a tu ingesta y actividad.',
      };
    case 'calibrating':
      return { headline: 'Calibrando', detail: '' };
  }
}

/**
 * Mensaje natural por fase. Educa sobre qué pasa fisiológicamente.
 */
export function phaseCopy(analysis: CycleAnalysis | null): string | null {
  if (!analysis) return null;
  switch (analysis.phase) {
    case 'menstruation':
      return 'Estás en menstruación. La retención debería estar bajando — buen momento para medir tendencia.';
    case 'follicular':
      return 'Fase folicular. Estrógeno subiendo, sensibilidad a insulina mejor. Mejor ventana del ciclo para evaluar progreso.';
    case 'ovulation':
      return 'Ovulación. Es normal una pequeña retención de agua hoy (~0.5 kg). No es grasa.';
    case 'luteal_early':
      return 'Fase lútea temprana. Tu BMR sube ~4% — la meta de kcal ya está ajustada. El apetito puede subir, es fisiológico.';
    case 'luteal_premenstrual':
      return 'Fase premenstrual. Subidas de peso de 1-3 kg son retención normal, no grasa. Espera al próximo ciclo para evaluar progreso real.';
    case 'late_or_uncertain':
      return 'Tu ciclo está más largo que lo habitual. Si te llega el periodo, regístralo para recalibrar la predicción.';
  }
}
