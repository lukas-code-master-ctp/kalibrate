import { describe, expect, it } from 'vitest';
import { evaluateWeek, type EvaluateWeekInput } from './weeklyStatus';
import type { FoodEntry } from './food';
import type { SmoothedWeightPoint } from './types';
import type { CycleAnalysis } from './cycle';

const DAY = 1000 * 60 * 60 * 24;
const NOW = new Date('2026-03-15T12:00:00');

function makeSmoothedPoints(
  endDate: Date,
  startKg: number,
  endKg: number,
  days = 7,
): SmoothedWeightPoint[] {
  const points: SmoothedWeightPoint[] = [];
  for (let i = 0; i <= days; i++) {
    const fraction = i / days;
    const kg = startKg + (endKg - startKg) * fraction;
    points.push({
      date: new Date(endDate.getTime() - (days - i) * DAY),
      rawKg: kg,
      smoothedKg: kg,
      isOutlier: false,
    });
  }
  return points;
}

function makeFoodEntries(endDate: Date, kcalPerDay: number, days = 7): FoodEntry[] {
  const entries: FoodEntry[] = [];
  for (let i = 0; i < days; i++) {
    entries.push({
      id: 'fe_' + i,
      consumedAt: new Date(endDate.getTime() - i * DAY + 12 * 3600 * 1000),
      mealType: 'lunch',
      name: 'meal',
      kcal: kcalPerDay,
      proteinG: 50,
      source: 'manual',
      confidence: 'medium',
    });
  }
  return entries;
}

function baseInput(overrides: Partial<EvaluateWeekInput> = {}): EvaluateWeekInput {
  return {
    effectiveTDEE: 2500,
    targetRateKgPerWeek: -0.5,
    smoothedPoints: makeSmoothedPoints(NOW, 80, 79.5),
    foodEntries: makeFoodEntries(NOW, 1950),
    now: NOW,
    ...overrides,
  };
}

describe('evaluateWeek', () => {
  it('insufficient_data si faltan mediciones de peso', () => {
    const r = evaluateWeek(baseInput({ smoothedPoints: [] }));
    expect(r.status).toBe('insufficient_data');
  });

  it('insufficient_data si <4 días con food', () => {
    const r = evaluateWeek(baseInput({ foodEntries: makeFoodEntries(NOW, 1950, 3) }));
    expect(r.status).toBe('insufficient_data');
  });

  it('green cuando el peso baja lo esperado', () => {
    // Deficit 550 kcal/día, expected = -550*7/7700 = -0.5 kg
    // Actual = -0.5 kg → ratio = 1.0 → green
    const r = evaluateWeek(baseInput());
    expect(r.status).toBe('green');
    expect(r.ratio).toBeCloseTo(1, 1);
  });

  it('yellow cuando la pérdida es menor a lo esperado (ratio bajo)', () => {
    // Expected -0.5 kg, actual -0.2 kg → ratio 0.4 → yellow
    const r = evaluateWeek(baseInput({ smoothedPoints: makeSmoothedPoints(NOW, 80, 79.8) }));
    expect(r.status).toBe('yellow');
    expect(r.notes.length).toBeGreaterThan(0);
  });

  it('red cuando el peso se mueve casi nada (ratio < 0.3)', () => {
    // Expected -0.5 kg, actual -0.05 kg → ratio 0.1 → red
    const r = evaluateWeek(baseInput({ smoothedPoints: makeSmoothedPoints(NOW, 80, 79.95) }));
    expect(r.status).toBe('red');
  });

  it('red cuando el peso sube en lugar de bajar (ratio negativo)', () => {
    const r = evaluateWeek(baseInput({ smoothedPoints: makeSmoothedPoints(NOW, 80, 80.4) }));
    expect(r.status).toBe('red');
    expect(r.actualWeeklyChangeKg).toBeGreaterThan(0);
  });

  it('green en mantención cuando la oscilación es <0.3 kg', () => {
    const r = evaluateWeek(
      baseInput({
        targetRateKgPerWeek: 0,
        effectiveTDEE: 1950,
        smoothedPoints: makeSmoothedPoints(NOW, 80, 80.15),
      }),
    );
    expect(r.status).toBe('green');
    expect(r.ratio).toBeNull();
  });

  it('yellow en mantención cuando hay oscilación >0.3 kg', () => {
    const r = evaluateWeek(
      baseInput({
        targetRateKgPerWeek: 0,
        effectiveTDEE: 1950,
        smoothedPoints: makeSmoothedPoints(NOW, 80, 80.6),
      }),
    );
    expect(r.status).toBe('yellow');
  });

  it('deferred si la fase del ciclo es de retención', () => {
    const cycle: CycleAnalysis = {
      phase: 'luteal_premenstrual',
      daysIntoCycle: 27,
      cycleLengthDays: 28,
      nextPeriodOn: new Date(),
      confidence: 'high',
      hasWaterRetention: true,
    };
    const r = evaluateWeek(baseInput({ cycleAnalysis: cycle }));
    expect(r.status).toBe('deferred');
    expect(r.retentionDays).toBeGreaterThan(0);
  });

  it('deferred si la fase es ovulación', () => {
    const cycle: CycleAnalysis = {
      phase: 'ovulation',
      daysIntoCycle: 14,
      cycleLengthDays: 28,
      nextPeriodOn: new Date(),
      confidence: 'medium',
      hasWaterRetention: true,
    };
    const r = evaluateWeek(baseInput({ cycleAnalysis: cycle }));
    expect(r.status).toBe('deferred');
  });

  it('green si la fase es folicular (no retención)', () => {
    const cycle: CycleAnalysis = {
      phase: 'follicular',
      daysIntoCycle: 8,
      cycleLengthDays: 28,
      nextPeriodOn: new Date(),
      confidence: 'high',
      hasWaterRetention: false,
    };
    const r = evaluateWeek(baseInput({ cycleAnalysis: cycle }));
    expect(r.status).toBe('green');
  });

  it('expected kg sigue el balance energético correcto', () => {
    // intake 1950, TDEE 2500 → balance -550 → -550*7/7700 ≈ -0.5
    const r = evaluateWeek(baseInput());
    expect(r.expectedWeeklyChangeKg).toBeCloseTo(-0.5, 1);
  });

  it('insufficient_data cuando intake ≈ TDEE pero la meta no es mantención', () => {
    const r = evaluateWeek(
      baseInput({
        foodEntries: makeFoodEntries(NOW, 2500),
        targetRateKgPerWeek: -0.5,
      }),
    );
    expect(r.status).toBe('insufficient_data');
  });

  it('notes vacías cuando status es green', () => {
    const r = evaluateWeek(baseInput());
    expect(r.notes).toEqual([]);
  });
});
