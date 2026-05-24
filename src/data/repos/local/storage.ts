/**
 * Wrapper sobre AsyncStorage con serialización JSON automática y revivido
 * de fechas. Las fechas se serializan como ISO strings y se reconstruyen
 * al leer.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    return new Date(value);
  }
  return value;
}

export async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;
  return JSON.parse(raw, reviveDates) as T;
}

export async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export async function removeKey(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

/** Keys reservadas. Centralizar acá previene typos. */
export const StorageKeys = {
  USER: 'kalibrate:user',
  GOALS: 'kalibrate:goals',
} as const;
