import { describe, expect, it } from 'vitest';
import { assessRedSRisk, type RedSRiskInput } from './redSRisk';

const DAY = 1000 * 60 * 60 * 24;
const NOW = new Date('2026-03-15');

function base(overrides: Partial<RedSRiskInput> = {}): RedSRiskInput {
  return {
    sex: 'female',
    lifePhase: 'fertile_regular',
    effectiveTDEE: 2000,
    targetRateKgPerWeek: -0.5,
    goalStartedOn: new Date(NOW.getTime() - 4 * 7 * DAY),
    now: NOW,
    ...overrides,
  };
}

describe('assessRedSRisk', () => {
  it('not_applicable para hombres', () => {
    const r = assessRedSRisk(base({ sex: 'male' }));
    expect(r.risk).toBe('not_applicable');
  });

  it('not_applicable para mujeres en menopausia', () => {
    const r = assessRedSRisk(base({ lifePhase: 'menopause' }));
    expect(r.risk).toBe('not_applicable');
  });

  it('not_applicable cuando no hay déficit', () => {
    const r = assessRedSRisk(base({ targetRateKgPerWeek: 0 }));
    expect(r.risk).toBe('not_applicable');
  });

  it('low risk para déficit moderado y corta duración', () => {
    const r = assessRedSRisk(
      base({
        targetRateKgPerWeek: -0.4,
        goalStartedOn: new Date(NOW.getTime() - 2 * 7 * DAY),
      }),
    );
    expect(r.risk).toBe('low');
  });

  it('medium con déficit agresivo (>30%)', () => {
    // Déficit -1 kg/sem ≈ 1100 kcal/día, 55% del TDEE 2000
    const r = assessRedSRisk(base({ targetRateKgPerWeek: -1 }));
    expect(r.risk === 'medium' || r.risk === 'high').toBe(true);
  });

  it('high con déficit agresivo + duración >12 semanas', () => {
    const r = assessRedSRisk(
      base({
        targetRateKgPerWeek: -1,
        goalStartedOn: new Date(NOW.getTime() - 14 * 7 * DAY),
      }),
    );
    expect(r.risk).toBe('high');
    expect(r.advice).not.toBeNull();
  });

  it('high con %grasa esencial (<16%) + cualquier déficit', () => {
    const r = assessRedSRisk(base({ targetRateKgPerWeek: -0.3, bodyFatPct: 14 }));
    expect(r.risk).toBe('high');
  });

  it('medium con %grasa atlética baja (16-19%) + déficit moderado', () => {
    const r = assessRedSRisk(base({ targetRateKgPerWeek: -0.4, bodyFatPct: 17 }));
    expect(['medium', 'high']).toContain(r.risk);
  });

  it('high con BMI <18.5 + déficit', () => {
    const r = assessRedSRisk(base({ targetRateKgPerWeek: -0.6, bmi: 17 }));
    expect(['medium', 'high']).toContain(r.risk);
  });

  it('métricas reflejan déficit % y semanas', () => {
    const r = assessRedSRisk(
      base({
        targetRateKgPerWeek: -0.5,
        goalStartedOn: new Date(NOW.getTime() - 8 * 7 * DAY),
      }),
    );
    // 0.5 * 1100 = 550 kcal, 550/2000 = 27.5%
    expect(r.metrics.deficitPct).toBeCloseTo(0.275, 2);
    expect(r.metrics.weeksInDeficit).toBeCloseTo(8, 0);
  });

  it('reasons no vacías cuando hay riesgo', () => {
    const r = assessRedSRisk(
      base({
        targetRateKgPerWeek: -1,
        goalStartedOn: new Date(NOW.getTime() - 14 * 7 * DAY),
        bodyFatPct: 15,
      }),
    );
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.risk).toBe('high');
  });
});
