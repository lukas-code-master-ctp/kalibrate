import { describe, expect, it } from 'vitest';
import {
  detectPhase,
  isCycleApplicable,
  phaseTDEEAdjustment,
  PHASE_TDEE_ADJUSTMENT,
  type MenstrualEvent,
} from './cycle';

const DAY = 1000 * 60 * 60 * 24;

function periodStart(date: Date): MenstrualEvent {
  return {
    id: Math.random().toString(),
    eventType: 'period_start',
    occurredOn: date,
  };
}

describe('detectPhase', () => {
  const today = new Date('2026-03-15');

  it('devuelve null si no hay period_start registrados', () => {
    expect(detectPhase([], today)).toBeNull();
  });

  it('día 1 del ciclo → menstruación', () => {
    const events = [periodStart(today)];
    const r = detectPhase(events, today);
    expect(r?.phase).toBe('menstruation');
    expect(r?.daysIntoCycle).toBe(1);
  });

  it('día 5 → todavía menstruación', () => {
    const events = [periodStart(new Date(today.getTime() - 4 * DAY))];
    const r = detectPhase(events, today);
    expect(r?.phase).toBe('menstruation');
    expect(r?.daysIntoCycle).toBe(5);
  });

  it('día 7 → folicular', () => {
    const events = [periodStart(new Date(today.getTime() - 6 * DAY))];
    const r = detectPhase(events, today);
    expect(r?.phase).toBe('follicular');
  });

  it('día 14 con ciclo 28 → ovulación', () => {
    const events = [periodStart(new Date(today.getTime() - 13 * DAY))];
    const r = detectPhase(events, today);
    expect(r?.phase).toBe('ovulation');
    expect(r?.hasWaterRetention).toBe(true);
  });

  it('día 18 con ciclo 28 → lútea temprana', () => {
    const events = [periodStart(new Date(today.getTime() - 17 * DAY))];
    const r = detectPhase(events, today);
    expect(r?.phase).toBe('luteal_early');
    expect(r?.hasWaterRetention).toBe(false);
  });

  it('día 27 con ciclo 28 → lútea premenstrual', () => {
    const events = [periodStart(new Date(today.getTime() - 26 * DAY))];
    const r = detectPhase(events, today);
    expect(r?.phase).toBe('luteal_premenstrual');
    expect(r?.hasWaterRetention).toBe(true);
  });

  it('día 35 con ciclo 28 → late_or_uncertain (ciclo atrasado)', () => {
    const events = [periodStart(new Date(today.getTime() - 34 * DAY))];
    const r = detectPhase(events, today);
    expect(r?.phase).toBe('late_or_uncertain');
  });

  it('aprende largo del ciclo con 3+ eventos', () => {
    // Ciclos de 30 días: el más antiguo al final
    const events: MenstrualEvent[] = [
      periodStart(new Date('2026-03-10')),
      periodStart(new Date('2026-02-08')),
      periodStart(new Date('2026-01-09')),
      periodStart(new Date('2025-12-10')),
    ];
    const r = detectPhase(events, new Date('2026-03-15'));
    expect(r?.cycleLengthDays).toBeCloseTo(30, 0);
    expect(r?.confidence).toBe('high');
  });

  it('confianza baja si los ciclos varían mucho', () => {
    // Ciclos muy variables: 25, 32, 28, 35
    const events: MenstrualEvent[] = [
      periodStart(new Date('2026-03-01')),
      periodStart(new Date('2026-02-04')),
      periodStart(new Date('2026-01-03')),
      periodStart(new Date('2025-11-29')),
    ];
    const r = detectPhase(events, new Date('2026-03-05'));
    expect(r?.confidence).toBe('low');
  });

  it('proyecta próximo periodo basado en último start + largo del ciclo', () => {
    const lastStart = new Date('2026-03-01');
    const events = [periodStart(lastStart)];
    const r = detectPhase(events, new Date('2026-03-10'));
    // Default 28 días
    const expected = new Date(lastStart.getTime() + 28 * DAY);
    expect(r?.nextPeriodOn.getTime()).toBe(expected.getTime());
  });

  it('confianza media con exactamente 2 starts', () => {
    const events: MenstrualEvent[] = [
      periodStart(new Date('2026-03-01')),
      periodStart(new Date('2026-02-02')),
    ];
    const r = detectPhase(events, new Date('2026-03-10'));
    expect(r?.confidence).toBe('medium');
    expect(r?.cycleLengthDays).toBe(27);
  });

  it('confianza baja con 1 solo start', () => {
    const events = [periodStart(new Date('2026-03-10'))];
    const r = detectPhase(events, new Date('2026-03-12'));
    expect(r?.confidence).toBe('low');
  });

  it('ignora eventos que no son period_start', () => {
    const events: MenstrualEvent[] = [
      {
        id: '1',
        eventType: 'spotting',
        occurredOn: new Date('2026-03-12'),
      },
      {
        id: '2',
        eventType: 'ovulation_observed',
        occurredOn: new Date('2026-03-01'),
      },
    ];
    expect(detectPhase(events, new Date('2026-03-15'))).toBeNull();
  });
});

describe('isCycleApplicable', () => {
  it('aplica solo a fértil regular o irregular', () => {
    expect(isCycleApplicable('fertile_regular')).toBe(true);
    expect(isCycleApplicable('fertile_irregular')).toBe(true);
    expect(isCycleApplicable('hormonal_contraception')).toBe(false);
    expect(isCycleApplicable('perimenopause')).toBe(false);
    expect(isCycleApplicable('menopause')).toBe(false);
    expect(isCycleApplicable(undefined)).toBe(false);
  });
});

describe('phaseTDEEAdjustment', () => {
  const events = [
    {
      id: '1',
      eventType: 'period_start' as const,
      occurredOn: new Date('2026-03-01'),
    },
  ];
  const dayInLutealEarly = new Date('2026-03-18'); // día 18
  const analysis = detectPhase(events, dayInLutealEarly);

  it('devuelve 0 si la life_phase no aplica', () => {
    expect(phaseTDEEAdjustment('hormonal_contraception', analysis)).toBe(0);
    expect(phaseTDEEAdjustment('menopause', analysis)).toBe(0);
    expect(phaseTDEEAdjustment(undefined, analysis)).toBe(0);
  });

  it('devuelve 0 si no hay análisis (sin eventos)', () => {
    expect(phaseTDEEAdjustment('fertile_regular', null)).toBe(0);
  });

  it('aplica +4% en lútea temprana', () => {
    expect(phaseTDEEAdjustment('fertile_regular', analysis)).toBeCloseTo(0.04);
  });

  it('aplica +6% en lútea premenstrual', () => {
    const lutealPrem = detectPhase(events, new Date('2026-03-26'));
    expect(phaseTDEEAdjustment('fertile_regular', lutealPrem)).toBeCloseTo(0.06);
  });

  it('aplica 0 en folicular', () => {
    const follicular = detectPhase(events, new Date('2026-03-08'));
    expect(phaseTDEEAdjustment('fertile_regular', follicular)).toBe(0);
  });

  it('los valores poblacionales coinciden con la tabla del brief', () => {
    expect(PHASE_TDEE_ADJUSTMENT.luteal_early).toBe(0.04);
    expect(PHASE_TDEE_ADJUSTMENT.luteal_premenstrual).toBe(0.06);
    expect(PHASE_TDEE_ADJUSTMENT.follicular).toBe(0);
  });
});
