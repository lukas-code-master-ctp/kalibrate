/**
 * Factory de repositorios.
 *
 * Hasta S5: implementación local con AsyncStorage.
 * Desde S6: swap a `supabase/*` cambiando estos exports.
 */

import { localGoalRepo } from './local/goalRepo';
import { localUserRepo } from './local/userRepo';

export const userRepo = localUserRepo;
export const goalRepo = localGoalRepo;

export type {
  CreateGoalInput,
  CreateUserInput,
  GoalRepo,
  UpdateUserInput,
  UserRepo,
} from './types';
