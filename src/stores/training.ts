/**
 * Store de sesiones de entrenamiento.
 */

import { create } from 'zustand';
import type { TrainingSession } from '@/core/model/training';
import { trainingSessionRepo, type CreateTrainingSessionInput } from '@/data/repos';

interface TrainingState {
  sessions: readonly TrainingSession[];
  isLoading: boolean;
  isLoaded: boolean;

  loadSessions: () => Promise<void>;
  addSession: (input: CreateTrainingSessionInput) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
}

export const useTrainingStore = create<TrainingState>((set) => ({
  sessions: [],
  isLoading: false,
  isLoaded: false,

  async loadSessions() {
    set({ isLoading: true });
    const sessions = await trainingSessionRepo.listAll();
    set({ sessions, isLoading: false, isLoaded: true });
  },

  async addSession(input) {
    await trainingSessionRepo.add(input);
    const sessions = await trainingSessionRepo.listAll();
    set({ sessions });
  },

  async deleteSession(id) {
    await trainingSessionRepo.delete(id);
    const sessions = await trainingSessionRepo.listAll();
    set({ sessions });
  },
}));
