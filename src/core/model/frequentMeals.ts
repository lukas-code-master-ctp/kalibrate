/**
 * Comidas frecuentes derivadas de food entries.
 *
 * Justifica brief — "Input de comida: filosofía":
 * "80% de lo que comemos es repetitivo, optimizar para esto."
 *
 * En lugar de mantener una tabla separada de "comidas guardadas", derivamos
 * las más usadas a partir de los entries existentes. Mantiene el modelo
 * simple y siempre consistente con la realidad del usuario.
 */

import type { FoodEntry } from './food';

const RECENT_DAYS_FOR_RANKING = 60;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export interface FrequentMeal {
  /** Key estable: name + kcal redondeado + protein redondeado. */
  key: string;
  name: string;
  brand?: string;
  amountGrams?: number;
  kcal: number;
  proteinG: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  source: FoodEntry['source'];
  containsAlcohol?: boolean;
  useCount: number;
  lastUsedAt: Date;
}

function makeKey(entry: FoodEntry): string {
  const kcal = Math.round(entry.kcal);
  const prot = Math.round(entry.proteinG * 10) / 10;
  return `${entry.name.toLowerCase().trim()}|${kcal}|${prot}`;
}

/**
 * Agrupa entries por nombre+macros, los rankea por uso reciente.
 * Devuelve los top N para mostrar en quick-add.
 */
export function frequentMeals(
  entries: readonly FoodEntry[],
  limit = 5,
  now: Date = new Date(),
): FrequentMeal[] {
  const cutoff = now.getTime() - RECENT_DAYS_FOR_RANKING * MS_PER_DAY;
  const recent = entries.filter((e) => e.consumedAt.getTime() >= cutoff);

  const grouped = new Map<string, { entry: FoodEntry; count: number; lastUsedAt: Date }>();
  for (const e of recent) {
    const key = makeKey(e);
    const existing = grouped.get(key);
    if (existing) {
      existing.count += 1;
      if (e.consumedAt.getTime() > existing.lastUsedAt.getTime()) {
        existing.lastUsedAt = e.consumedAt;
        existing.entry = e;
      }
    } else {
      grouped.set(key, { entry: e, count: 1, lastUsedAt: e.consumedAt });
    }
  }

  const ranked = [...grouped.entries()]
    .map(([key, { entry, count, lastUsedAt }]) => ({
      key,
      name: entry.name,
      brand: entry.brand,
      amountGrams: entry.amountGrams,
      kcal: entry.kcal,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      fiberG: entry.fiberG,
      source: entry.source,
      containsAlcohol: entry.containsAlcohol,
      useCount: count,
      lastUsedAt,
    }))
    // Ranking: usado ≥2 veces va primero; dentro de cada grupo, más reciente primero.
    .filter((m) => m.useCount >= 2)
    .sort((a, b) => {
      if (b.useCount !== a.useCount) return b.useCount - a.useCount;
      return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
    });

  return ranked.slice(0, limit);
}
