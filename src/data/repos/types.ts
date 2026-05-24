/**
 * Interfaces de repositorios.
 *
 * Las implementaciones concretas (LocalRepo con AsyncStorage en S1-S5,
 * SupabaseRepo con Postgres en S6+) viven en `./local/` y `./supabase/`.
 *
 * Patrón Repository: el resto del código solo conoce estas interfaces,
 * permitiendo swap mecánico entre implementaciones.
 */

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
