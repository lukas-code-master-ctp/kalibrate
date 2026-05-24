/**
 * Factory de repositorios.
 *
 * Hasta S5: implementación local con AsyncStorage.
 * Desde S6: swap a `supabase/*` cambiando estos exports.
 */

import { localGoalRepo } from './local/goalRepo';
import { localUserRepo } from './local/userRepo';
import { localWeightLogRepo } from './local/weightLogRepo';

export const userRepo = localUserRepo;
export const goalRepo = localGoalRepo;
export const weightLogRepo = localWeightLogRepo;

export type {
  CreateGoalInput,
  CreateUserInput,
  CreateWeightLogInput,
  GoalRepo,
  StoredWeightLog,
  UpdateUserInput,
  UserRepo,
  WeightLogRepo,
} from './types';
