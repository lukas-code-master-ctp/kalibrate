/**
 * UserRepo implementado contra AsyncStorage.
 *
 * Modo single-user: una sola fila a la vez. En S6 se swap por SupabaseRepo
 * que sí soporta múltiples usuarios identificados por auth.uid().
 */

import type { User } from '@/core/model/user';
import type { CreateUserInput, UpdateUserInput, UserRepo } from '../types';
import { readJson, removeKey, StorageKeys, writeJson } from './storage';

function generateId(): string {
  return 'usr_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export const localUserRepo: UserRepo = {
  async getCurrent() {
    return readJson<User>(StorageKeys.USER);
  },

  async create(input: CreateUserInput) {
    const now = new Date();
    const user: User = {
      ...input,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await writeJson(StorageKeys.USER, user);
    return user;
  },

  async update(input: UpdateUserInput) {
    const current = await readJson<User>(StorageKeys.USER);
    if (!current) {
      throw new Error('No hay usuario para actualizar. Crear primero con create().');
    }
    const updated: User = {
      ...current,
      ...input,
      updatedAt: new Date(),
    };
    await writeJson(StorageKeys.USER, updated);
    return updated;
  },

  async clear() {
    await removeKey(StorageKeys.USER);
  },
};
