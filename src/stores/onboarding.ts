/**
 * Store del onboarding in-progress.
 *
 * Mantiene el draft mientras el usuario navega entre pantallas. Al finalizar,
 * `commit()` lo persiste via repo y actualiza el userStore.
 */

import { create } from 'zustand';
import type { ActivityLevel } from '@/core/constants';
import type { BiologicalSex, LifePhase } from '@/core/model/types';
import type { GoalType, HormonalMethod } from '@/core/model/user';
import { goalRepo, userRepo } from '@/data/repos';
import { useUserStore } from './user';

export interface OnboardingDraft {
  biologicalSex?: BiologicalSex;
  birthDate?: Date;
  heightCm?: number;
  initialWeightKg?: number;
  activityLevel?: ActivityLevel;
  bodyFatPct?: number;
  lifePhase?: LifePhase;
  hormonalMethod?: HormonalMethod;
  goalType?: GoalType;
  targetRateKgPerWeek?: number;
}

interface OnboardingState {
  draft: OnboardingDraft;
  setDraft: (patch: Partial<OnboardingDraft>) => void;
  reset: () => void;
  commit: () => Promise<void>;
}

const DEFAULT_TIMEZONE = 'America/Santiago';

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  draft: {},

  setDraft(patch) {
    set((s) => ({ draft: { ...s.draft, ...patch } }));
  },

  reset() {
    set({ draft: {} });
  },

  async commit() {
    const d = get().draft;
    if (
      !d.biologicalSex ||
      !d.birthDate ||
      d.heightCm === undefined ||
      d.initialWeightKg === undefined ||
      !d.activityLevel ||
      !d.goalType ||
      d.targetRateKgPerWeek === undefined
    ) {
      throw new Error('Onboarding incompleto. Faltan campos requeridos.');
    }

    const user = await userRepo.create({
      biologicalSex: d.biologicalSex,
      birthDate: d.birthDate,
      heightCm: d.heightCm,
      initialWeightKg: d.initialWeightKg,
      activityLevel: d.activityLevel,
      bodyFatPct: d.bodyFatPct,
      lifePhase: d.biologicalSex === 'female' ? d.lifePhase : undefined,
      hormonalMethod: d.biologicalSex === 'female' ? d.hormonalMethod : undefined,
      timezone: DEFAULT_TIMEZONE,
    });

    await goalRepo.setActive({
      userId: user.id,
      goalType: d.goalType,
      targetRateKgPerWeek: d.targetRateKgPerWeek,
      startedOn: new Date(),
    });

    useUserStore.getState().setUser(user);
    set({ draft: {} });
  },
}));
