/**
 * Store del usuario actual.
 *
 * Carga lazy desde el repo. La UI llama `loadUser()` en el root layout para
 * decidir si redirigir a onboarding.
 */

import { create } from 'zustand';
import type { User } from '@/core/model/user';
import { userRepo } from '@/data/repos';

interface UserState {
  user: User | null;
  isLoading: boolean;
  isLoaded: boolean;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
  clearUser: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  isLoaded: false,

  async loadUser() {
    set({ isLoading: true });
    const user = await userRepo.getCurrent();
    set({ user, isLoading: false, isLoaded: true });
  },

  setUser(user) {
    set({ user, isLoaded: true });
  },

  async clearUser() {
    await userRepo.clear();
    set({ user: null });
  },
}));
