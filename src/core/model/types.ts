/**
 * Tipos del dominio del modelo. Reflejan las entidades del brief y se mantienen
 * independientes de la implementación de Supabase.
 */

export type BiologicalSex = 'male' | 'female';

export type LifePhase =
  | 'fertile_regular'
  | 'fertile_irregular'
  | 'hormonal_contraception'
  | 'perimenopause'
  | 'menopause';

export type CyclePhase =
  | 'menstruation'
  | 'follicular'
  | 'ovulation'
  | 'luteal_early'
  | 'luteal_premenstrual'
  | 'late_or_uncertain';

export type ConfidenceLabel = 'calibrating' | 'low' | 'medium' | 'high';

/** Una medición cruda de peso. */
export interface WeightLog {
  loggedAt: Date;
  weightKg: number;
  isOutlier?: boolean;
}

/** Una medición suavizada con su contraparte cruda. */
export interface SmoothedWeightPoint {
  date: Date;
  rawKg: number;
  smoothedKg: number;
  isOutlier: boolean;
}

/** Resultado del suavizado de una serie completa. */
export interface SmoothingResult {
  points: SmoothedWeightPoint[];
  /** SD histórica de residuales (raw - smoothed) sobre los últimos 60 días. */
  historicalSdKg: number;
}
