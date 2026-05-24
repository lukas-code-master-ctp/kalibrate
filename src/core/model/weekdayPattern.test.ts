import { describe, expect, it } from 'vitest';
import { isWeekend, learnWeekdayPattern, weekendDelta, type DayOfWeek } from './weekdayPattern';
import type { FoodEntry } from './food';

function entry(date: Date, kcal: number): FoodEntry {
  return {
    id: 'fe_' + Math.random(),
    consumedAt: date,
    mealType: 'lunch',
    name: 'meal',
    kcal,
    proteinG: 0,
    source: 'manual',
    confidence: 'medium',
  };
}

describe('learnWeekdayPattern', () => {
  it('devuelve pattern vacío sin entries', () => {
    const p = learnWeekdayPattern([]);
    expect(p.totalDaysWithData).toBe(0);
    expect(p.hasEnoughData).toBe(false);
    p.byDay.forEach((d) => {
      expect(d.avgKcal).toBe(0);
      expect(d.count).toBe(0);
    });
  });

  it('agrupa varias entries del mismo día en uno solo', () => {
    const day = new Date('2026-03-09T08:00'); // lunes
    const entries = [entry(day, 300), entry(day, 500), entry(day, 200)];
    const p = learnWeekdayPattern(entries);
    expect(p.totalDaysWithData).toBe(1);
    expect(p.byDay[1]!.count).toBe(1);
    expect(p.byDay[1]!.avgKcal).toBe(1000);
  });

  it('promedia correctamente días iguales en semanas distintas', () => {
    // Tres lunes con 2000, 2200, 1800
    const entries = [
      entry(new Date('2026-03-02T12:00'), 2000),
      entry(new Date('2026-03-09T12:00'), 2200),
      entry(new Date('2026-03-16T12:00'), 1800),
    ];
    const p = learnWeekdayPattern(entries);
    expect(p.byDay[1]!.count).toBe(3);
    expect(p.byDay[1]!.avgKcal).toBeCloseTo(2000);
  });

  it('hasEnoughData = false con <16 días totales', () => {
    const entries = Array.from({ length: 10 }, (_, i) => entry(new Date(2026, 1, i + 1, 12), 2000));
    const p = learnWeekdayPattern(entries);
    expect(p.hasEnoughData).toBe(false);
  });

  it('hasEnoughData = true con >=16 días totales', () => {
    const entries = Array.from({ length: 20 }, (_, i) => entry(new Date(2026, 1, i + 1, 12), 2000));
    const p = learnWeekdayPattern(entries);
    expect(p.hasEnoughData).toBe(true);
  });

  it('overallAvgKcal coincide con el promedio diario', () => {
    const entries = [
      entry(new Date('2026-03-01T12:00'), 2000),
      entry(new Date('2026-03-02T12:00'), 2200),
      entry(new Date('2026-03-03T12:00'), 1800),
    ];
    const p = learnWeekdayPattern(entries);
    expect(p.overallAvgKcal).toBeCloseTo(2000);
  });
});

describe('isWeekend', () => {
  it('identifica sábado y domingo', () => {
    expect(isWeekend(0)).toBe(true);
    expect(isWeekend(6)).toBe(true);
  });

  it('rechaza lunes a viernes', () => {
    for (let d = 1; d <= 5; d++) {
      expect(isWeekend(d as DayOfWeek)).toBe(false);
    }
  });
});

describe('weekendDelta', () => {
  it('null cuando falta data', () => {
    expect(weekendDelta(learnWeekdayPattern([]))).toBeNull();
  });

  it('positivo cuando weekend > weekday', () => {
    const entries = [
      entry(new Date('2026-03-02T12:00'), 2000), // L
      entry(new Date('2026-03-03T12:00'), 2100), // M
      entry(new Date('2026-03-07T12:00'), 2700), // S
      entry(new Date('2026-03-08T12:00'), 2800), // D
    ];
    const p = learnWeekdayPattern(entries);
    const delta = weekendDelta(p);
    expect(delta).not.toBeNull();
    expect(delta!).toBeGreaterThan(500);
  });

  it('negativo cuando weekday > weekend (patrón atípico)', () => {
    const entries = [
      entry(new Date('2026-03-02T12:00'), 2800), // L
      entry(new Date('2026-03-03T12:00'), 2700), // M
      entry(new Date('2026-03-07T12:00'), 2000), // S
      entry(new Date('2026-03-08T12:00'), 2100), // D
    ];
    const delta = weekendDelta(learnWeekdayPattern(entries));
    expect(delta).not.toBeNull();
    expect(delta!).toBeLessThan(0);
  });
});
