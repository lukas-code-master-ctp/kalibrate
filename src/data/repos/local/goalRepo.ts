/**
 * GoalRepo implementado contra AsyncStorage.
 *
 * Mantiene un array de goals; el activo es el último con `isActive: true`.
 * Al crear un nuevo goal activo, archiva el anterior (isActive = false,
 * endedOn = today).
 */

import type { Goal } from '@/core/model/user';
import type { CreateGoalInput, GoalRepo } from '../types';
import { readJson, StorageKeys, writeJson } from './storage';

function generateId(): string {
  return 'goal_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function readAll(): Promise<Goal[]> {
  return (await readJson<Goal[]>(StorageKeys.GOALS)) ?? [];
}

async function writeAll(goals: Goal[]): Promise<void> {
  await writeJson(StorageKeys.GOALS, goals);
}

export const localGoalRepo: GoalRepo = {
  async getActive(userId) {
    const all = await readAll();
    return all.find((g) => g.userId === userId && g.isActive) ?? null;
  },

  async setActive(input) {
    const all = await readAll();
    const today = new Date();

    const archived = all.map((g) =>
      g.userId === input.userId && g.isActive ? { ...g, isActive: false, endedOn: today } : g,
    );

    const newGoal: Goal = {
      ...input,
      id: generateId(),
      isActive: true,
      createdAt: today,
    };

    await writeAll([...archived, newGoal]);
    return newGoal;
  },

  async listAll(userId) {
    const all = await readAll();
    return all
      .filter((g) => g.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },
};
