import { describe, expect, it } from 'vitest';
import { aggregateKcalByDay, buildObservations } from './observations';
import type { FoodEntry } from './food';
import type { SmoothedWeightPoint } from './types';

const DAY = 1000 * 60 * 60 * 24;

function entry(date: Date, kcal: number, name = 'x'): FoodEntry {
  return {
    id: Math.random().toString(),
    consumedAt: date,
    mealType: 'lunch',
    name,
    kcal,
    proteinG: 0,
    source: 'manual',
    confidence: 'medium',
  };
}

function smoothed(startDate: Date, weights: readonly number[]): SmoothedWeightPoint[] {
  return weights.map((w, i) => ({
    date: new Date(startDate.getTime() + i * DAY),
    rawKg: w,
    smoothedKg: w,
    isOutlier: false,
  }));
}

describe('aggregateKcalByDay', () => {
  it('suma kcal por día local', () => {
    const m = aggregateKcalByDay([
      entry(new Date('2026-01-01T08:00'), 300),
      entry(new Date('2026-01-01T13:00'), 600),
      entry(new Date('2026-01-02T09:00'), 400),
    ]);
    expect(m.get('2026-01-01')).toBe(900);
    expect(m.get('2026-01-02')).toBe(400);
  });

  it('devuelve mapa vacío sin entradas', () => {
    expect(aggregateKcalByDay([]).size).toBe(0);
  });
});

describe('buildObservations', () => {
  it('devuelve vacío con menos de 2 puntos de peso', () => {
    expect(buildObservations([], [])).toEqual([]);
    expect(buildObservations(smoothed(new Date('2026-01-01'), [80]), [])).toEqual([]);
  });

  it('descarta observaciones sin lookback de peso suficiente', () => {
    // Solo 2 puntos a 1 día de distancia → no hay 7d lookback
    const pts = smoothed(new Date('2026-01-01'), [80, 79.9]);
    const ents: FoodEntry[] = [];
    expect(buildObservations(pts, ents)).toEqual([]);
  });

  it('descarta observaciones con menos de 4 días de food en ventana', () => {
    const start = new Date('2026-01-01');
    const pts = smoothed(
      start,
      Array.from({ length: 14 }, () => 80),
    );
    // Solo 2 días con food en la ventana del día 14
    const ents: FoodEntry[] = [
      entry(new Date('2026-01-13'), 2000),
      entry(new Date('2026-01-14'), 2100),
    ];
    expect(buildObservations(pts, ents)).toEqual([]);
  });

  it('construye una observación válida con datos completos', () => {
    const start = new Date('2026-01-01');
    const pts = smoothed(
      start,
      Array.from({ length: 14 }, () => 80),
    );
    // Food entries diarios para los 7 días previos al último punto
    const ents: FoodEntry[] = [];
    for (let i = 7; i < 14; i++) {
      ents.push(entry(new Date(start.getTime() + i * DAY + 12 * 3600 * 1000), 2500));
    }
    const obs = buildObservations(pts, ents);
    expect(obs.length).toBeGreaterThan(0);
    const last = obs[obs.length - 1]!;
    expect(last.avgIntake7d).toBeCloseTo(2500, 0);
    expect(last.weightChangePerDay).toBeCloseTo(0, 3);
  });

  it('calcula cambio de peso correctamente con tendencia a la baja', () => {
    const start = new Date('2026-01-01');
    // 80 kg bajando 0.1 kg/día por 14 días
    const weights = Array.from({ length: 14 }, (_, i) => 80 - i * 0.1);
    const pts = smoothed(start, weights);
    const ents: FoodEntry[] = [];
    for (let i = 0; i < 14; i++) {
      ents.push(entry(new Date(start.getTime() + i * DAY + 12 * 3600 * 1000), 2200));
    }
    const obs = buildObservations(pts, ents);
    expect(obs.length).toBeGreaterThan(0);
    const last = obs[obs.length - 1]!;
    expect(last.weightChangePerDay).toBeCloseTo(-0.1, 2);
    expect(last.avgIntake7d).toBeCloseTo(2200, 0);
  });

  it('tolera mediciones de peso espaciadas (no diarias)', () => {
    // Mediciones cada 7 días por 21 días: días 0, 7, 14, 21
    const start = new Date('2026-01-01');
    const pts: SmoothedWeightPoint[] = [0, 7, 14, 21].map((d, i) => ({
      date: new Date(start.getTime() + d * DAY),
      rawKg: 80 - i * 0.5,
      smoothedKg: 80 - i * 0.5,
      isOutlier: false,
    }));
    // Food diaria
    const ents: FoodEntry[] = [];
    for (let i = 0; i < 22; i++) {
      ents.push(entry(new Date(start.getTime() + i * DAY + 12 * 3600 * 1000), 2300));
    }
    const obs = buildObservations(pts, ents);
    expect(obs.length).toBeGreaterThanOrEqual(2);
    // Cada gap es 7 días, peso baja 0.5 kg → -0.5/7 ≈ -0.0714 kg/día
    obs.forEach((o) => {
      expect(o.weightChangePerDay).toBeCloseTo(-0.5 / 7, 3);
    });
  });
});
