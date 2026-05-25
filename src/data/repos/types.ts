/**
 * Interfaces de repositorios.
 *
 * Las implementaciones concretas (LocalRepo con AsyncStorage en S1-S5,
 * SupabaseRepo con Postgres en S6+) viven en `./local/` y `./supabase/`.
 *
 * Patrón Repository: el resto del código solo conoce estas interfaces,
 * permitiendo swap mecánico entre implementaciones.
 */

import type { FoodEntry } from '@/core/model/food';
import type { WeightLog } from '@/core/model/types';
import type { Goal, User } from '@/core/model/user';

/** Datos de creación del usuario (sin id, timestamps autogenerados). */
export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>;

export interface UserRepo {
  /** Devuelve el usuario actual (el único, en modo local single-user). */
  getCurrent(): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  update(input: UpdateUserInput): Promise<User>;
  clear(): Promise<void>;
}

export type CreateGoalInput = Omit<Goal, 'id' | 'createdAt' | 'isActive'>;

export interface GoalRepo {
  /** Devuelve el objetivo activo, si existe. */
  getActive(userId: string): Promise<Goal | null>;
  /** Crea un nuevo goal activo, archivando el anterior. */
  setActive(input: CreateGoalInput): Promise<Goal>;
  /** Histórico (más reciente primero). */
  listAll(userId: string): Promise<readonly Goal[]>;
}

/** Una medición de peso con metadata persistible. */
export interface StoredWeightLog extends WeightLog {
  id: string;
}

export type CreateWeightLogInput = Omit<StoredWeightLog, 'id' | 'isOutlier'>;

export interface WeightLogRepo {
  /** Lista cronológica ascendente. */
  listAll(): Promise<readonly StoredWeightLog[]>;
  /** Última medición, si existe. */
  getLatest(): Promise<StoredWeightLog | null>;
  /** Mediciones de un día específico (00:00 a 23:59 en local). */
  listForDay(date: Date): Promise<readonly StoredWeightLog[]>;
  add(input: CreateWeightLogInput): Promise<StoredWeightLog>;
  update(id: string, patch: Partial<CreateWeightLogInput>): Promise<StoredWeightLog | null>;
  delete(id: string): Promise<void>;
}

export type CreateFoodEntryInput = Omit<FoodEntry, 'id'>;

export interface FoodEntryRepo {
  listAll(): Promise<readonly FoodEntry[]>;
  listForDay(date: Date): Promise<readonly FoodEntry[]>;
  /** Rango por fecha local (ambas inclusive). */
  listForRange(startDate: Date, endDate: Date): Promise<readonly FoodEntry[]>;
  add(input: CreateFoodEntryInput): Promise<FoodEntry>;
  delete(id: string): Promise<void>;
}
