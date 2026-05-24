/**
 * Store de mediciones de peso.
 *
 * Mantiene la lista en memoria + caché de la versión suavizada. Recalcula el
 * suavizado solo cuando cambian los datos.
 */

import { create } from 'zustand';
import { smoothWeight } from '@/core/model/smoothing';
import type { SmoothingResult } from '@/core/model/types';
import type { StoredWeightLog } from '@/data/repos';
import { weightLogRepo } from '@/data/repos';

interface WeightState {
  logs: readonly StoredWeightLog[];
  smoothing: SmoothingResult;
  isLoading: boolean;
  isLoaded: boolean;

  loadLogs: () => Promise<void>;
  addLog: (loggedAt: Date, weightKg: number, note?: string) => Promise<void>;
  deleteLog: (id: string) => Promise<void>;
}

function computeSmoothing(logs: readonly StoredWeightLog[]): SmoothingResult {
  return smoothWeight(logs);
}

export const useWeightStore = create<WeightState>((set, get) => ({
  logs: [],
  smoothing: { points: [], historicalSdKg: 0.5 },
  isLoading: false,
  isLoaded: false,

  async loadLogs() {
    set({ isLoading: true });
    const logs = await weightLogRepo.listAll();
    set({
      logs,
      smoothing: computeSmoothing(logs),
      isLoading: false,
      isLoaded: true,
    });
  },

  async addLog(loggedAt, weightKg, note) {
    await weightLogRepo.add({ loggedAt, weightKg, note });
    const logs = await weightLogRepo.listAll();
    set({ logs, smoothing: computeSmoothing(logs) });
  },

  async deleteLog(id) {
    await weightLogRepo.delete(id);
    const logs = await weightLogRepo.listAll();
    set({ logs, smoothing: computeSmoothing(logs) });
  },
}));

/**
 * Selectors derivados — útiles para evitar recomputes en componentes.
 */
export function selectLatestSmoothed(s: WeightState): number | null {
  const last = s.smoothing.points[s.smoothing.points.length - 1];
  return last?.smoothedKg ?? null;
}

export function selectLatestRaw(s: WeightState): StoredWeightLog | null {
  if (s.logs.length === 0) return null;
  return s.logs[s.logs.length - 1] ?? null;
}
