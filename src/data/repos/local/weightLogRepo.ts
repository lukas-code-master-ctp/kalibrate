/**
 * WeightLogRepo implementado contra AsyncStorage.
 *
 * Guarda un array completo bajo una sola key. Para escalas pequeñas (1 medición
 * diaria por años) el costo es despreciable; en S6 migramos a Postgres con
 * índices por user_id + logged_at.
 */

import type { CreateWeightLogInput, StoredWeightLog, WeightLogRepo } from '../types';
import { readJson, writeJson } from './storage';

const STORAGE_KEY = 'kalibrate:weight_logs';

function generateId(): string {
  return 'wl_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function readAll(): Promise<StoredWeightLog[]> {
  return (await readJson<StoredWeightLog[]>(STORAGE_KEY)) ?? [];
}

async function writeAll(logs: StoredWeightLog[]): Promise<void> {
  await writeJson(STORAGE_KEY, logs);
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const localWeightLogRepo: WeightLogRepo = {
  async listAll() {
    const all = await readAll();
    return [...all].sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
  },

  async getLatest() {
    const all = await readAll();
    if (all.length === 0) return null;
    return all.reduce((latest, log) =>
      log.loggedAt.getTime() > latest.loggedAt.getTime() ? log : latest,
    );
  },

  async listForDay(date) {
    const all = await readAll();
    return all
      .filter((log) => sameLocalDay(log.loggedAt, date))
      .sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
  },

  async add(input) {
    const all = await readAll();
    const log: StoredWeightLog = {
      ...input,
      id: generateId(),
      isOutlier: false,
    };
    await writeAll([...all, log]);
    return log;
  },

  async delete(id) {
    const all = await readAll();
    await writeAll(all.filter((log) => log.id !== id));
  },
};
