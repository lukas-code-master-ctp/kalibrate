import { describe, expect, it } from 'vitest';
import { smoothWeight } from './smoothing';
import type { WeightLog } from './types';

const DAY = 1000 * 60 * 60 * 24;

function makeLogs(weights: readonly number[], startDate = new Date('2026-01-01')): WeightLog[] {
  return weights.map((w, i) => ({
    loggedAt: new Date(startDate.getTime() + i * DAY),
    weightKg: w,
  }));
}

describe('smoothWeight', () => {
  it('devuelve serie vacía y SD default cuando no hay logs', () => {
    const result = smoothWeight([]);
    expect(result.points).toHaveLength(0);
    expect(result.historicalSdKg).toBe(0.5);
  });

  it('primer punto suavizado es igual al raw', () => {
    const result = smoothWeight(makeLogs([80]));
    expect(result.points[0]?.smoothedKg).toBe(80);
    expect(result.points[0]?.isOutlier).toBe(false);
  });

  it('serie constante converge a la constante', () => {
    const result = smoothWeight(makeLogs(Array.from({ length: 30 }, () => 80)));
    const last = result.points[result.points.length - 1]!;
    expect(last.smoothedKg).toBeCloseTo(80, 5);
  });

  it('suaviza ruido diario alrededor de la media', () => {
    const noisy = Array.from({ length: 60 }, (_, i) => 80 + Math.sin(i) * 0.5);
    const result = smoothWeight(makeLogs(noisy));
    const last = result.points[result.points.length - 1]!;
    expect(Math.abs(last.smoothedKg - 80)).toBeLessThan(0.3);
  });

  it('tendencia lineal de bajada es seguida con lag esperado', () => {
    const trend = Array.from({ length: 60 }, (_, i) => 80 - i * 0.05);
    const result = smoothWeight(makeLogs(trend));
    const last = result.points[result.points.length - 1]!;
    expect(last.smoothedKg).toBeGreaterThan(last.rawKg);
    expect(last.smoothedKg).toBeLessThan(80);
  });

  it('gaps grandes entre mediciones aumentan el alpha efectivo', () => {
    const fewLogs: WeightLog[] = [
      { loggedAt: new Date('2026-01-01'), weightKg: 80 },
      { loggedAt: new Date('2026-01-31'), weightKg: 78 },
    ];
    const result = smoothWeight(fewLogs);
    const last = result.points[1]!;
    expect(last.smoothedKg).toBeLessThan(80);
    expect(last.smoothedKg).toBeGreaterThan(78);
  });

  it('ordena logs por fecha aunque vengan desordenados', () => {
    const unordered: WeightLog[] = [
      { loggedAt: new Date('2026-01-03'), weightKg: 79.5 },
      { loggedAt: new Date('2026-01-01'), weightKg: 80 },
      { loggedAt: new Date('2026-01-02'), weightKg: 79.8 },
    ];
    const result = smoothWeight(unordered);
    expect(result.points[0]?.date).toEqual(new Date('2026-01-01'));
    expect(result.points[2]?.date).toEqual(new Date('2026-01-03'));
  });

  it('flagea outliers extremos pero los mantiene en la serie', () => {
    const stable = Array.from({ length: 40 }, () => 80);
    const logs = makeLogs(stable);
    logs.push({
      loggedAt: new Date(logs[logs.length - 1]!.loggedAt.getTime() + DAY),
      weightKg: 95,
    });
    const result = smoothWeight(logs);
    const lastPoint = result.points[result.points.length - 1]!;
    expect(lastPoint.isOutlier).toBe(true);
    expect(lastPoint.rawKg).toBe(95);
  });

  it('calcula SD histórica solo con suficientes datos', () => {
    const noisy = Array.from({ length: 40 }, () => 80 + (Math.random() - 0.5) * 0.6);
    const result = smoothWeight(makeLogs(noisy));
    expect(result.historicalSdKg).toBeGreaterThanOrEqual(0.3);
  });
});
