import { describe, expect, it } from 'vitest';
import { bmrKatchMcArdle, bmrMifflin, priorCredibleInterval, priorTDEE } from './priors';

describe('bmrMifflin', () => {
  it('hombre de 80 kg, 180 cm, 30 años', () => {
    // base = 10*80 + 6.25*180 - 5*30 = 800 + 1125 - 150 = 1775
    // male: + 5 = 1780
    expect(bmrMifflin('male', 80, 180, 30)).toBe(1780);
  });

  it('mujer de 60 kg, 165 cm, 30 años', () => {
    // base = 600 + 1031.25 - 150 = 1481.25
    // female: -161 = 1320.25
    expect(bmrMifflin('female', 60, 165, 30)).toBe(1320.25);
  });

  it('aumenta con peso', () => {
    const lighter = bmrMifflin('male', 70, 175, 35);
    const heavier = bmrMifflin('male', 90, 175, 35);
    expect(heavier).toBeGreaterThan(lighter);
  });

  it('disminuye con edad', () => {
    const young = bmrMifflin('male', 80, 180, 25);
    const old = bmrMifflin('male', 80, 180, 60);
    expect(young).toBeGreaterThan(old);
  });

  it('hombre > mujer a igual peso/altura/edad', () => {
    const male = bmrMifflin('male', 75, 170, 30);
    const female = bmrMifflin('female', 75, 170, 30);
    expect(male - female).toBe(166);
  });
});

describe('bmrKatchMcArdle', () => {
  it('80 kg con 15% grasa', () => {
    // lean = 80 * 0.85 = 68 kg
    // bmr = 370 + 21.6 * 68 = 370 + 1468.8 = 1838.8
    expect(bmrKatchMcArdle(80, 15)).toBeCloseTo(1838.8, 2);
  });

  it('rechaza %grasa fuera de rango', () => {
    expect(() => bmrKatchMcArdle(80, 0)).toThrow();
    expect(() => bmrKatchMcArdle(80, 100)).toThrow();
    expect(() => bmrKatchMcArdle(80, -5)).toThrow();
  });

  it('aumenta cuando baja el %grasa a igual peso', () => {
    const fatter = bmrKatchMcArdle(80, 25);
    const leaner = bmrKatchMcArdle(80, 12);
    expect(leaner).toBeGreaterThan(fatter);
  });
});

describe('priorTDEE', () => {
  it('usa Mifflin-St Jeor cuando no hay %grasa', () => {
    const result = priorTDEE({
      sex: 'male',
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      activityLevel: 'moderate',
    });
    // BMR mifflin = 1780, factor moderate = 1.55 → 1780 * 1.55 = 2759
    expect(result.method).toBe('mifflin');
    expect(result.mean).toBeCloseTo(2759, 0);
    expect(result.bmr).toBe(1780);
  });

  it('usa Katch-McArdle cuando hay %grasa', () => {
    const result = priorTDEE({
      sex: 'male',
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      activityLevel: 'moderate',
      bodyFatPct: 15,
    });
    expect(result.method).toBe('katch-mcardle');
    // BMR k-m = 1838.8, factor 1.55 → 2850.14
    expect(result.mean).toBeCloseTo(2850.14, 0);
  });

  it('aplica el factor de actividad correctamente', () => {
    const inputs = {
      sex: 'male' as const,
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
    };
    const sedentary = priorTDEE({ ...inputs, activityLevel: 'sedentary' });
    const veryHigh = priorTDEE({ ...inputs, activityLevel: 'very_high' });
    expect(veryHigh.mean).toBeGreaterThan(sedentary.mean);
    expect(veryHigh.mean / sedentary.mean).toBeCloseTo(1.9 / 1.2, 2);
  });

  it('sd del prior es la constante poblacional', () => {
    const result = priorTDEE({
      sex: 'female',
      weightKg: 60,
      heightCm: 165,
      ageYears: 28,
      activityLevel: 'light',
    });
    expect(result.sd).toBe(250);
  });
});

describe('priorCredibleInterval', () => {
  it('80% CI cubre ~±1.282 sd', () => {
    const prior = priorTDEE({
      sex: 'male',
      weightKg: 80,
      heightCm: 180,
      ageYears: 30,
      activityLevel: 'moderate',
    });
    const ci = priorCredibleInterval(prior);
    const halfWidth = (ci.high - ci.low) / 2;
    expect(halfWidth).toBeCloseTo(1.282 * 250, 1);
    expect(ci.low).toBeLessThan(prior.mean);
    expect(ci.high).toBeGreaterThan(prior.mean);
  });
});
