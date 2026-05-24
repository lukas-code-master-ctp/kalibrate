/**
 * MenstrualEventRepo implementado contra AsyncStorage.
 */

import type { MenstrualEvent } from '@/core/model/cycle';
import { readJson, writeJson } from './storage';

const STORAGE_KEY = 'kalibrate:menstrual_events';

function generateId(): string {
  return 'me_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function readAll(): Promise<MenstrualEvent[]> {
  return (await readJson<MenstrualEvent[]>(STORAGE_KEY)) ?? [];
}

async function writeAll(events: MenstrualEvent[]): Promise<void> {
  await writeJson(STORAGE_KEY, events);
}

export type CreateMenstrualEventInput = Omit<MenstrualEvent, 'id'>;

export interface MenstrualEventRepo {
  listAll(): Promise<readonly MenstrualEvent[]>;
  add(input: CreateMenstrualEventInput): Promise<MenstrualEvent>;
  delete(id: string): Promise<void>;
}

export const localMenstrualEventRepo: MenstrualEventRepo = {
  async listAll() {
    const all = await readAll();
    return [...all].sort((a, b) => b.occurredOn.getTime() - a.occurredOn.getTime());
  },

  async add(input) {
    const all = await readAll();
    const event: MenstrualEvent = { ...input, id: generateId() };
    await writeAll([...all, event]);
    return event;
  },

  async delete(id) {
    const all = await readAll();
    await writeAll(all.filter((e) => e.id !== id));
  },
};
