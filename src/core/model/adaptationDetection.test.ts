import { describe, expect, it } from 'vitest';
import { detectAdaptation } from './adaptationDetection';
import type { CalibrationObservation } from './calibration';

const DAY = 1000 * 60 * 60 * 24;
const NOW = new Date('2026-03-15');

function makeObservations(
  count: number,
  endDate: Date,
  avgIntake: number,
  weightChangePerDay: number,
): CalibrationObservation[] {
  // Newest first reversed → returns ASC by date
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(endDate.getTime() - (count - 1 - i) * DAY),
    avgIntake7d: avgIntake,
    weightChangePerDay,
  }));
}

describe('detectAdaptation', () => {
  it('no detecta con menos de MIN_OBS observaciones recientes', () => {
    const obs = makeObservations(5, NOW, 2000, 0);
    const r = detectAdaptation(obs, 2000, NOW);
    expect(r.detected).toBe(false);
    expect(r.obsUsed).toBe(5);
  });

  it('no detecta cuando residuales son ~0', () => {
    // implied TDEE = 2000 (intake 2000, no change). Modelo dice 2000. residual ≈ 0.
    const obs = makeObservations(14, NOW, 2000, 0);
    const r = detectAdaptation(obs, 2000, NOW);
    expect(r.detected).toBe(false);
    expect(Math.abs(r.meanResidualKcal)).toBeLessThan(50);
  });

  it('detecta sesgo negativo (TDEE sobreestimado) — adaptación o subreporte', () => {
    // Modelo dice TDEE = 2400, pero ingesta 2000 con peso estable implica TDEE=2000.
    // Residual = 2000 - 2400 = -400 por día durante 14 días.
    const obs = makeObservations(14, NOW, 2000, 0);
    const r = detectAdaptation(obs, 2400, NOW);
    expect(r.detected).toBe(true);
    expect(r.direction).toBe('tdee_overestimated');
    expect(r.message).toContain('diet break');
  });

  it('detecta sesgo positivo (TDEE subestimado)', () => {
    // Modelo dice 2000, observaciones implican 2400.
    const obs = makeObservations(14, NOW, 2400, 0);
    const r = detectAdaptation(obs, 2000, NOW);
    expect(r.detected).toBe(true);
    expect(r.direction).toBe('tdee_underestimated');
  });

  it('descarta observaciones fuera de la ventana de 14 días', () => {
    // 8 obs viejas (>14 días) que sesgarían + 7 obs recientes neutras
    const old = makeObservations(8, new Date(NOW.getTime() - 30 * DAY), 1500, 0);
    const recent = makeObservations(7, NOW, 2000, 0);
    const r = detectAdaptation([...old, ...recent], 2000, NOW);
    expect(r.obsUsed).toBe(7);
    expect(r.detected).toBe(false);
  });

  it('mean residual coincide con (implied - calibrated)', () => {
    const obs = makeObservations(14, NOW, 2300, 0);
    const r = detectAdaptation(obs, 2000, NOW);
    expect(r.meanResidualKcal).toBeCloseTo(300, 0);
  });

  it('mensaje sugiere diet break cuando hay sobreestimación', () => {
    const obs = makeObservations(14, NOW, 1800, 0);
    const r = detectAdaptation(obs, 2300, NOW);
    expect(r.message).toContain('mantención');
  });
});
