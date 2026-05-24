/**
 * Factory de repositorios.
 *
 * Hasta S5: implementación local con AsyncStorage.
 * Desde S6: swap a `supabase/*` cambiando estos exports.
 */

import { localFoodEntryRepo } from './local/foodEntryRepo';
import { localGoalRepo } from './local/goalRepo';
import { localMenstrualEventRepo } from './local/menstrualEventRepo';
import { localUserRepo } from './local/userRepo';
import { localWeightLogRepo } from './local/weightLogRepo';

export const userRepo = localUserRepo;
export const goalRepo = localGoalRepo;
export const weightLogRepo = localWeightLogRepo;
export const foodEntryRepo = localFoodEntryRepo;
export const menstrualEventRepo = localMenstrualEventRepo;

export type { CreateMenstrualEventInput, MenstrualEventRepo } from './local/menstrualEventRepo';
export type {
  CreateFoodEntryInput,
  CreateGoalInput,
  CreateUserInput,
  CreateWeightLogInput,
  FoodEntryRepo,
  GoalRepo,
  StoredWeightLog,
  UpdateUserInput,
  UserRepo,
  WeightLogRepo,
} from './types';
