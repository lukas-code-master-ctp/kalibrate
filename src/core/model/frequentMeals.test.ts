import { describe, expect, it } from 'vitest';
import { frequentMeals } from './frequentMeals';
import type { FoodEntry } from './food';

const DAY = 1000 * 60 * 60 * 24;
const NOW = new Date('2026-03-15T12:00');

function entry(date: Date, name: string, kcal: number, proteinG: number): FoodEntry {
  return {
    id: Math.random().toString(),
    consumedAt: date,
    mealType: 'lunch',
    name,
    kcal,
    proteinG,
    source: 'manual',
    confidence: 'medium',
  };
}

describe('frequentMeals', () => {
  it('vacío sin entries', () => {
    expect(frequentMeals([], 5, NOW)).toEqual([]);
  });

  it('filtra entries usadas solo una vez', () => {
    const entries = [
      entry(new Date(NOW.getTime() - DAY), 'arroz con pollo', 600, 40),
      entry(new Date(NOW.getTime() - 2 * DAY), 'tostada palta', 300, 8),
    ];
    expect(frequentMeals(entries, 5, NOW)).toEqual([]);
  });

  it('rankea por count primero, luego por recencia', () => {
    const entries = [
      // arroz con pollo × 3
      entry(new Date(NOW.getTime() - 10 * DAY), 'arroz con pollo', 600, 40),
      entry(new Date(NOW.getTime() - 5 * DAY), 'arroz con pollo', 600, 40),
      entry(new Date(NOW.getTime() - 2 * DAY), 'arroz con pollo', 600, 40),
      // tostada × 2
      entry(new Date(NOW.getTime() - 4 * DAY), 'tostada palta', 300, 8),
      entry(new Date(NOW.getTime() - 1 * DAY), 'tostada palta', 300, 8),
    ];
    const ranked = frequentMeals(entries, 5, NOW);
    expect(ranked.length).toBe(2);
    expect(ranked[0]?.name).toBe('arroz con pollo');
    expect(ranked[0]?.useCount).toBe(3);
    expect(ranked[1]?.name).toBe('tostada palta');
    expect(ranked[1]?.useCount).toBe(2);
  });

  it('agrupa por nombre + kcal + proteína', () => {
    const entries = [
      entry(new Date(NOW.getTime() - 2 * DAY), 'tortilla', 300, 15),
      entry(new Date(NOW.getTime() - 1 * DAY), 'tortilla', 300, 15),
      entry(new Date(NOW.getTime() - 3 * DAY), 'tortilla', 450, 22), // distinta receta
    ];
    const ranked = frequentMeals(entries, 5, NOW);
    expect(ranked.length).toBe(1);
    expect(ranked[0]?.kcal).toBe(300);
  });

  it('descarta entries fuera de la ventana de 60 días', () => {
    const entries = [
      entry(new Date(NOW.getTime() - 90 * DAY), 'arroz pollo', 600, 40),
      entry(new Date(NOW.getTime() - 80 * DAY), 'arroz pollo', 600, 40),
      entry(new Date(NOW.getTime() - 70 * DAY), 'arroz pollo', 600, 40),
    ];
    expect(frequentMeals(entries, 5, NOW)).toEqual([]);
  });

  it('limita al tope solicitado', () => {
    const entries: FoodEntry[] = [];
    for (let i = 0; i < 10; i++) {
      const name = `meal_${i}`;
      entries.push(entry(new Date(NOW.getTime() - 5 * DAY), name, 500, 20));
      entries.push(entry(new Date(NOW.getTime() - 4 * DAY), name, 500, 20));
    }
    expect(frequentMeals(entries, 3, NOW).length).toBe(3);
  });

  it('lastUsedAt refleja la fecha más reciente del grupo', () => {
    const recent = new Date(NOW.getTime() - 1 * DAY);
    const entries = [
      entry(new Date(NOW.getTime() - 10 * DAY), 'pollo', 400, 30),
      entry(recent, 'pollo', 400, 30),
    ];
    const ranked = frequentMeals(entries, 5, NOW);
    expect(ranked[0]?.lastUsedAt.getTime()).toBe(recent.getTime());
  });
});
