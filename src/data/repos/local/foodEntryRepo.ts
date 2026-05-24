/**
 * FoodEntryRepo implementado contra AsyncStorage.
 *
 * Único array bajo una key, sorted al leer. Para los volúmenes esperados
 * (~5-10 entries/día durante meses) el costo es despreciable.
 */

import type { FoodEntry } from '@/core/model/food';
import type { CreateFoodEntryInput, FoodEntryRepo } from '../types';
import { readJson, writeJson } from './storage';

const STORAGE_KEY = 'kalibrate:food_entries';

function generateId(): string {
  return 'fe_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function readAll(): Promise<FoodEntry[]> {
  return (await readJson<FoodEntry[]>(STORAGE_KEY)) ?? [];
}

async function writeAll(entries: FoodEntry[]): Promise<void> {
  await writeJson(STORAGE_KEY, entries);
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export const localFoodEntryRepo: FoodEntryRepo = {
  async listAll() {
    const all = await readAll();
    return [...all].sort((a, b) => a.consumedAt.getTime() - b.consumedAt.getTime());
  },

  async listForDay(date) {
    const all = await readAll();
    return all
      .filter((e) => sameLocalDay(e.consumedAt, date))
      .sort((a, b) => a.consumedAt.getTime() - b.consumedAt.getTime());
  },

  async listForRange(startDate, endDate) {
    const all = await readAll();
    const from = startOfLocalDay(startDate).getTime();
    const to = endOfLocalDay(endDate).getTime();
    return all
      .filter((e) => {
        const t = e.consumedAt.getTime();
        return t >= from && t <= to;
      })
      .sort((a, b) => a.consumedAt.getTime() - b.consumedAt.getTime());
  },

  async add(input) {
    const all = await readAll();
    const entry: FoodEntry = { ...input, id: generateId() };
    await writeAll([...all, entry]);
    return entry;
  },

  async delete(id) {
    const all = await readAll();
    await writeAll(all.filter((e) => e.id !== id));
  },
};
