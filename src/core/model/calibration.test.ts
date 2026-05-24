import { describe, expect, it } from 'vitest';
import { calibrateTDEE, impliedTDEE, type CalibrationObservation } from './calibration';
import type { PriorTDEE } from './priors';

const DAY = 1000 * 60 * 60 * 24;

function makePrior(mean: number, sd = 250): PriorTDEE {
  return { mean, sd, method: 'mifflin', bmr: mean / 1.55 };
}

function makeObservations(
  count: number,
  startDate: Date,
  avgIntake: number,
  weightChangePerDay: number,
): CalibrationObservation[] {
  return Array.from({ length: count }, (_, i) => ({
    date: new Date(startDate.getTime() + i * DAY),
    avgIntake7d: avgIntake,
    weightChangePerDay,
  }));
}

describe('impliedTDEE', () => {
  it('mantención (sin cambio de peso) → TDEE = ingesta', () => {
    expect(
      impliedTDEE({
        date: new Date(),
        avgIntake7d: 2500,
        weightChangePerDay: 0,
      }),
    ).toBe(2500);
  });

  it('déficit (peso bajando) → TDEE > ingesta', () => {
    // bajando 0.5 kg/sem = -0.0714 kg/día → +0.0714 * 7700 ≈ +550 kcal
    const tdee = impliedTDEE({
      date: new Date(),
      avgIntake7d: 2200,
      weightChangePerDay: -0.5 / 7,
    });
    expect(tdee).toBeCloseTo(2200 + (0.5 / 7) * 7700, 0);
    expect(tdee).toBeGreaterThan(2200);
  });

  it('superávit (peso subiendo) → TDEE < ingesta', () => {
    const tdee = impliedTDEE({
      date: new Date(),
      avgIntake7d: 2800,
      weightChangePerDay: 0.25 / 7,
    });
    expect(tdee).toBeLessThan(2800);
  });
});

describe('calibrateTDEE', () => {
  const now = new Date('2026-03-01');

  it('sin observaciones devuelve prior con etiqueta calibrando', () => {
    const prior = makePrior(2500);
    const r = calibrateTDEE(prior, [], now);
    expect(r.method).toBe('prior_only');
    expect(r.confidence).toBe('calibrating');
    expect(r.mean).toBe(2500);
    expect(r.effectiveN).toBe(0);
    expect(r.ciLow).toBeLessThan(r.mean);
    expect(r.ciHigh).toBeGreaterThan(r.mean);
  });

  it('span < 14 días sigue siendo prior_only', () => {
    const prior = makePrior(2500);
    const start = new Date('2026-02-20');
    const obs = makeObservations(10, start, 2500, 0);
    const r = calibrateTDEE(prior, obs, now);
    expect(r.method).toBe('prior_only');
    expect(r.confidence).toBe('calibrating');
  });

  it('span >= 14 días activa el modo bayesiano', () => {
    const prior = makePrior(2500);
    const start = new Date('2026-02-10');
    const obs = makeObservations(20, start, 2500, 0);
    const r = calibrateTDEE(prior, obs, now);
    expect(r.method).toBe('bayesian');
    expect(r.daysOfData).toBeGreaterThanOrEqual(14);
  });

  it('observaciones consistentes con prior dejan el mean cerca del prior', () => {
    const prior = makePrior(2500);
    const start = new Date('2026-02-01');
    // Obs en mantención: ingesta = 2500, cambio peso = 0 → TDEE implícito = 2500
    const obs = makeObservations(28, start, 2500, 0);
    const r = calibrateTDEE(prior, obs, now);
    expect(Math.abs(r.mean - 2500)).toBeLessThan(5);
  });

  it('observaciones consistentes con TDEE > prior empujan la media hacia arriba', () => {
    const prior = makePrior(2500);
    const start = new Date('2026-02-01');
    // ingesta=2700, peso=0 → TDEE implícito = 2700
    const obs = makeObservations(28, start, 2700, 0);
    const r = calibrateTDEE(prior, obs, now);
    expect(r.mean).toBeGreaterThan(2500);
    expect(r.mean).toBeLessThan(2700);
  });

  it('observaciones consistentes con TDEE < prior empujan la media hacia abajo', () => {
    const prior = makePrior(2500);
    const start = new Date('2026-02-01');
    const obs = makeObservations(28, start, 2300, 0);
    const r = calibrateTDEE(prior, obs, now);
    expect(r.mean).toBeLessThan(2500);
    expect(r.mean).toBeGreaterThan(2300);
  });

  it('detecta déficit real: ingesta 2200, peso bajando 0.5 kg/sem → TDEE ≈ 2750', () => {
    const prior = makePrior(2500);
    const start = new Date('2025-12-01'); // 3 meses atrás
    const obs = makeObservations(90, start, 2200, -0.5 / 7);
    const r = calibrateTDEE(prior, obs, now);
    // TDEE implícito = 2200 + (0.5/7)*7700 ≈ 2750
    expect(r.mean).toBeGreaterThan(2650);
    expect(r.mean).toBeLessThan(2800);
  });

  it('CI se angosta con más datos', () => {
    const prior = makePrior(2500);
    const start = new Date('2026-01-15');
    const obs15 = makeObservations(15, start, 2600, 0);
    const obsLong = makeObservations(45, new Date('2025-12-15'), 2600, 0);
    const r15 = calibrateTDEE(prior, obs15, now);
    const rLong = calibrateTDEE(prior, obsLong, now);
    const width15 = r15.ciHigh - r15.ciLow;
    const widthLong = rLong.ciHigh - rLong.ciLow;
    expect(widthLong).toBeLessThan(width15);
  });

  it('observaciones más recientes pesan más que antiguas', () => {
    const prior = makePrior(2500);
    // Datos antiguos sugieren TDEE = 2200
    const oldObs = makeObservations(20, new Date('2025-09-01'), 2200, 0);
    // Datos recientes sugieren TDEE = 2800
    const recentObs = makeObservations(20, new Date('2026-02-10'), 2800, 0);
    const obs = [...oldObs, ...recentObs];
    const r = calibrateTDEE(prior, obs, now);
    // El resultado debería estar más cerca de 2800 que de 2200
    const distToRecent = Math.abs(r.mean - 2800);
    const distToOld = Math.abs(r.mean - 2200);
    expect(distToRecent).toBeLessThan(distToOld);
  });

  it('confianza low con poca data efectiva', () => {
    const prior = makePrior(2500);
    const obs = makeObservations(15, new Date('2026-02-10'), 2500, 0);
    const r = calibrateTDEE(prior, obs, now);
    expect(['low', 'medium']).toContain(r.confidence);
  });

  it('confianza high requiere muchos días recientes + CI estrecho', () => {
    const prior = makePrior(2500);
    const obs = makeObservations(60, new Date('2026-01-01'), 2500, 0);
    const r = calibrateTDEE(prior, obs, now);
    expect(['medium', 'high']).toContain(r.confidence);
    expect(r.ciHigh - r.ciLow).toBeLessThan(400);
  });

  it('CI siempre rodea la media', () => {
    const prior = makePrior(2500);
    const obs = makeObservations(30, new Date('2026-01-30'), 2600, -0.05);
    const r = calibrateTDEE(prior, obs, now);
    expect(r.ciLow).toBeLessThan(r.mean);
    expect(r.ciHigh).toBeGreaterThan(r.mean);
  });
});
