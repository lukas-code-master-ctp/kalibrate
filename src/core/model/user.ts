/**
 * Tipos del dominio: User y Goal.
 *
 * Estos tipos representan el modelo conceptual y son independientes de la
 * implementación de persistencia (AsyncStorage local en S1-S5, Supabase en S6+).
 */

import type { ActivityLevel } from '../constants';
import type { BiologicalSex, LifePhase } from './types';

export type HormonalMethod =
  | 'combined_pill'
  | 'progestin_only'
  | 'iud_hormonal'
  | 'iud_copper'
  | 'implant'
  | 'injection'
  | 'patch'
  | 'none';

export type GoalType = 'lose' | 'maintain' | 'gain';

export interface User {
  id: string;
  biologicalSex: BiologicalSex;
  birthDate: Date;
  heightCm: number;
  /** Peso inicial registrado durante onboarding. */
  initialWeightKg: number;
  activityLevel: ActivityLevel;
  /** Opcional. Si presente, prior usa Katch-McArdle. */
  bodyFatPct?: number;
  /** Solo para biologicalSex = 'female'. */
  lifePhase?: LifePhase;
  /** Solo para biologicalSex = 'female'. */
  hormonalMethod?: HormonalMethod;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  userId: string;
  goalType: GoalType;
  /** Negativo para perder, positivo para ganar, ~0 para mantener. Cap ±1.5 kg/sem. */
  targetRateKgPerWeek: number;
  startedOn: Date;
  endedOn?: Date;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Calcula la edad en años a partir de la fecha de nacimiento.
 */
export function ageInYears(birthDate: Date, now: Date = new Date()): number {
  const ms = now.getTime() - birthDate.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}
