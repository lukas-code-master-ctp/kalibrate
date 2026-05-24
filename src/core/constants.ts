/**
 * Constantes del Model Core de Kalibrate.
 *
 * Cada valor se justifica contra el brief científico del proyecto.
 * Si se modifica alguno, actualizar el comentario con la razón.
 */

/**
 * Energía por kilo de tejido corporal perdido o ganado, en kcal/kg.
 *
 * Justificación: aproximación working para déficit/superávit sostenido con
 * pérdida mixta (grasa + algo de masa magra). Literatura reciente lo discute
 * (algunos sugieren ~9400 para grasa pura), pero el bayesiano de TDEE absorbe
 * gran parte del error igual.
 *
 * Referencia brief: Pilar 1, "ecuación base ΔPeso = (Ingesta - TDEE) × días / k".
 */
export const K_KCAL_PER_KG = 7700;

/**
 * Half-life del suavizado exponencial del peso, en días.
 *
 * Justificación: balance entre responsividad (captar cambios reales) y
 * supresión de ruido (báscula, hidratación, glucógeno).
 *
 * Referencia brief: Pilar 4, "el peso de hoy es ruido, la tendencia es señal".
 */
export const WEIGHT_EMA_HALF_LIFE_DAYS = 10;

/**
 * Alpha del EMA, derivado del half-life.
 *
 * Fórmula: alpha = 1 - 0.5^(1/half_life)
 */
export const WEIGHT_EMA_ALPHA = 1 - Math.pow(0.5, 1 / WEIGHT_EMA_HALF_LIFE_DAYS);

/**
 * Umbral para flaggear una medición como outlier sospechoso (en SDs históricas).
 *
 * Outliers no se descartan; se anotan y su peso en el EMA se reduce.
 */
export const WEIGHT_OUTLIER_THRESHOLD_SD = 3.0;

/**
 * Factor de reducción aplicado al alpha del EMA cuando una medición es outlier.
 *
 * 0.3 = el outlier sigue moviendo la tendencia pero menos.
 */
export const WEIGHT_OUTLIER_ALPHA_FACTOR = 0.3;

/**
 * Ancho default de la banda de no preocupación, en kg, antes de tener
 * suficiente historia para calcular SD histórica.
 */
export const NON_CONCERN_BAND_DEFAULT_KG = 0.5;

/**
 * Mínimo de días con datos antes de mostrar TDEE calibrado.
 *
 * Referencia brief: Pilar 1, "descartar/ponderar bajo los primeros 14 días
 * (glucógeno + agua dominan)".
 */
export const MIN_DAYS_FOR_TDEE_CALIBRATION = 14;

/**
 * Half-life del olvido exponencial sobre observaciones diarias para
 * calibración del TDEE, en días.
 *
 * Justificación: ~3.5 semanas. Suficientemente reciente para capturar
 * adaptación metabólica (Pilar 2 versión reactiva), suficientemente largo
 * para no overfittear ruido semanal.
 */
export const TDEE_FORGET_HALF_LIFE_DAYS = 24;

/**
 * SD del prior de TDEE (Mifflin-St Jeor × factor actividad), en kcal/día.
 *
 * Estimación de incertidumbre típica de la fórmula: ±200-400 kcal/día.
 */
export const TDEE_PRIOR_SD_KCAL = 250;

/**
 * SD del ruido de una observación diaria de TDEE implicada, en kcal/día.
 *
 * Incluye error de tracking de comida, ruido de báscula, fluctuación de
 * glucógeno y agua día-a-día.
 */
export const TDEE_OBS_SD_KCAL = 280;

/**
 * Z-score para intervalo de credibilidad del 80% en distribución normal.
 *
 * 80% es el default del brief: "Estimación puntual + intervalo de credibilidad ~80%".
 */
export const CI_80_Z_SCORE = 1.282;

/**
 * Factores de actividad para Mifflin-St Jeor.
 *
 * Referencia: literatura nutricional estándar.
 */
export const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
  very_high: 1.9,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_FACTORS;
