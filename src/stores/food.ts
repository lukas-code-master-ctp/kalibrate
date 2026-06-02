/**
 * Store de food entries.
 *
 * Las agregaciones derivadas (today, totals, etc.) se hacen en componentes
 * con useMemo, no en selectors de Zustand. Razón: con React 19 +
 * useSyncExternalStore, un selector que retorna nuevos arrays/objetos en
 * cada llamada (ej: `s.entries.filter(...)`) provoca loops de re-render.
 */

import { create } from 'zustand';
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
