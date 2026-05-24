/**
 * Store de food entries con agregaciones derivadas para hoy.
 */

import { create } from 'zustand';
import { aggregateTotals, type DailyTotals } from '@/core/model/aggregation';
import type { FoodEntry } from '@/core/model/food';
import { foodEntryRepo, type CreateFoodEntryInput } from '@/data/repos';

interface FoodState {
  entries: readonly FoodEntry[];
  isLoading: boolean;
  isLoaded: boolean;

  loadEntries: () => Promise<void>;
  addEntry: (input: CreateFoodEntryInput) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
}

export const useFoodStore = create<FoodState>((set) => ({
  entries: [],
  isLoading: false,
  isLoaded: false,

  async loadEntries() {
    set({ isLoading: true });
    const entries = await foodEntryRepo.listAll();
    set({ entries, isLoading: false, isLoaded: true });
  },

  async addEntry(input) {
    await foodEntryRepo.add(input);
    const entries = await foodEntryRepo.listAll();
    set({ entries });
  },

  async deleteEntry(id) {
    await foodEntryRepo.delete(id);
    const entries = await foodEntryRepo.listAll();
    set({ entries });
  },
}));

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function selectTodayEntries(s: FoodState): readonly FoodEntry[] {
  const today = new Date();
  return s.entries.filter((e) => sameLocalDay(e.consumedAt, today));
}

export function selectTodayTotals(s: FoodState): DailyTotals {
  return aggregateTotals(selectTodayEntries(s));
}
