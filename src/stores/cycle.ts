/**
 * Store de eventos menstruales con análisis de fase derivado.
 */

import { create } from 'zustand';
import type { MenstrualEvent } from '@/core/model/cycle';
import { menstrualEventRepo, type CreateMenstrualEventInput } from '@/data/repos';

interface CycleState {
  events: readonly MenstrualEvent[];
  isLoading: boolean;
  isLoaded: boolean;

  loadEvents: () => Promise<void>;
  addEvent: (input: CreateMenstrualEventInput) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
}

export const useCycleStore = create<CycleState>((set) => ({
  events: [],
  isLoading: false,
  isLoaded: false,

  async loadEvents() {
    set({ isLoading: true });
    const events = await menstrualEventRepo.listAll();
    set({ events, isLoading: false, isLoaded: true });
  },

  async addEvent(input) {
    await menstrualEventRepo.add(input);
    const events = await menstrualEventRepo.listAll();
    set({ events });
  },

  async deleteEvent(id) {
    await menstrualEventRepo.delete(id);
    const events = await menstrualEventRepo.listAll();
    set({ events });
  },
}));
