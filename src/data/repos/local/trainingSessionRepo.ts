/**
 * TrainingSessionRepo implementado contra AsyncStorage.
 */

import type { TrainingSession } from '@/core/model/training';
import { readJson, writeJson } from './storage';

const STORAGE_KEY = 'kalibrate:training_sessions';

function generateId(): string {
  return 'ts_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function readAll(): Promise<TrainingSession[]> {
  return (await readJson<TrainingSession[]>(STORAGE_KEY)) ?? [];
}

async function writeAll(sessions: TrainingSession[]): Promise<void> {
  await writeJson(STORAGE_KEY, sessions);
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type CreateTrainingSessionInput = Omit<TrainingSession, 'id'>;

export interface TrainingSessionRepo {
  listAll(): Promise<readonly TrainingSession[]>;
  listForDay(date: Date): Promise<readonly TrainingSession[]>;
  add(input: CreateTrainingSessionInput): Promise<TrainingSession>;
  update(id: string, patch: Partial<CreateTrainingSessionInput>): Promise<TrainingSession | null>;
  delete(id: string): Promise<void>;
}

export const localTrainingSessionRepo: TrainingSessionRepo = {
  async listAll() {
    const all = await readAll();
    return [...all].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  },

  async listForDay(date) {
    const all = await readAll();
    return all
      .filter((s) => sameLocalDay(s.occurredAt, date))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  },

  async add(input) {
    const all = await readAll();
    const session: TrainingSession = { ...input, id: generateId() };
    await writeAll([...all, session]);
    return session;
  },

  async update(id, patch) {
    const all = await readAll();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    const updated: TrainingSession = { ...all[idx]!, ...patch };
    all[idx] = updated;
    await writeAll(all);
    return updated;
  },

  async delete(id) {
    const all = await readAll();
    await writeAll(all.filter((s) => s.id !== id));
  },
};
