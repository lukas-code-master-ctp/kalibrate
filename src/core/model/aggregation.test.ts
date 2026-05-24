import { describe, expect, it } from 'vitest';
import { aggregateTotals, suggestedDailyIntake, suggestedDailyProteinG } from './aggregation';
import type { FoodEntry } from './food';

function entry(partial: Partial<FoodEntry>): FoodEntry {
  return {
    id: 'x',
    consumedAt: new Date('2026-01-01T12:00:00'),
    mealType: 'lunch',
    name: 'test',
    kcal: 0,
    proteinG: 0,
    source: 'manual',
    confidence: 'medium',
    ...partial,
  };
}

describe('aggregateTotals', () => {
  it('devuelve ceros con lista vacía', () => {
    const totals = aggregateTotals([]);
    expect(totals.kcal).toBe(0);
    expect(totals.proteinG).toBe(0);
    expect(totals.entryCount).toBe(0);
  });

  it('suma kcal y proteína de múltiples entradas', () => {
    const totals = aggregateTotals([
      entry({ kcal: 400, proteinG: 30 }),
      entry({ kcal: 250, proteinG: 15 }),
    ]);
    expect(totals.kcal).toBe(650);
    expect(totals.proteinG).toBe(45);
    expect(totals.entryCount).toBe(2);
  });

  it('separa alcohol como categoría', () => {
    const totals = aggregateTotals([
      entry({ kcal: 400, proteinG: 30 }),
      entry({ kcal: 150, proteinG: 0, containsAlcohol: true }),
    ]);
    expect(totals.kcal).toBe(550);
    expect(totals.alcoholKcal).toBe(150);
  });

  it('trata macros opcionales como 0 cuando faltan', () => {
    const totals = aggregateTotals([entry({ kcal: 200, proteinG: 10 })]);
    expect(totals.carbsG).toBe(0);
    expect(totals.fatG).toBe(0);
    expect(totals.fiberG).toBe(0);
  });
});

describe('suggestedDailyIntake', () => {
  it('mantención = TDEE', () => {
    expect(suggestedDailyIntake(2500, 0)).toBe(2500);
  });

  it('-0.5 kg/semana = TDEE - 550', () => {
    expect(suggestedDailyIntake(2500, -0.5)).toBe(2500 - 550);
  });

  it('+0.5 kg/semana = TDEE + 550', () => {
    expect(suggestedDailyIntake(2500, 0.5)).toBe(2500 + 550);
  });
});

describe('suggestedDailyProteinG', () => {
  it('mantención usa 1.8 g/kg', () => {
    expect(suggestedDailyProteinG(80, 0)).toBe(144);
  });

  it('déficit moderado usa 2.0 g/kg', () => {
    expect(suggestedDailyProteinG(80, -0.5)).toBe(160);
  });

  it('ganancia usa 1.8 g/kg', () => {
    expect(suggestedDailyProteinG(80, 0.25)).toBe(144);
  });
});
