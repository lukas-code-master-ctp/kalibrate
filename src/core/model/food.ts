/**
 * Tipos del dominio de alimentación.
 *
 * Justificación brief — "Input de comida: filosofía":
 * - Cuello de botella es el input, no el modelo.
 * - El bayesiano absorbe sesgo consistente → priorizamos adherencia sobre
 *   precisión absoluta. Por eso aceptamos entradas con confidence baja
 *   (estimación visual, restaurante) mientras se registren.
 * - Proteína trackeada explícitamente (1.6-2.2 g/kg crítico en déficit).
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

/**
 * Origen de la entrada — informa el nivel de confianza del dato.
 */
export type FoodEntrySource =
  | 'off' // Open Food Facts (alta confianza si tiene macros completas)
  | 'manual' // Usuario tipeó nombre + macros
  | 'saved' // Comida guardada que ya usaba antes
  | 'restaurant' // Categoría/rango de comida fuera
  | 'photo_ai'; // Reservado para fase 2 (foto + IA)

export type FoodConfidence = 'high' | 'medium' | 'low';

export interface FoodEntry {
  id: string;
  consumedAt: Date;
  mealType: MealType;
  /** Nombre denormalizado: lo que el usuario vio al guardar. */
  name: string;
  brand?: string;
  /** Cantidad en gramos. Algunas entradas (restaurante, estimación) pueden no tenerla. */
  amountGrams?: number;
  /** Macros calculados. Estos son los números que entran al modelo. */
  kcal: number;
  proteinG: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
  source: FoodEntrySource;
  confidence: FoodConfidence;
  /** Categoría separada: el alcohol no se mezcla con macros normales. */
  containsAlcohol?: boolean;
  note?: string;
}

/**
 * Item del catálogo (resultado de búsqueda, no persistido como tal en MVP).
 * Macros expresados por 100g para multiplicar por gramaje real.
 */
export interface FoodCatalogItem {
  id: string;
  source: 'off' | 'usda' | 'custom';
  externalId?: string;
  name: string;
  brand?: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g?: number;
  fatPer100g?: number;
  fiberPer100g?: number;
  typicalServingG?: number;
}

/**
 * Calcula los macros absolutos a partir del item de catálogo y los gramos
 * consumidos.
 */
export function macrosForServing(
  item: FoodCatalogItem,
  grams: number,
): {
  kcal: number;
  proteinG: number;
  carbsG?: number;
  fatG?: number;
  fiberG?: number;
} {
  const factor = grams / 100;
  return {
    kcal: item.kcalPer100g * factor,
    proteinG: item.proteinPer100g * factor,
    carbsG: item.carbsPer100g != null ? item.carbsPer100g * factor : undefined,
    fatG: item.fatPer100g != null ? item.fatPer100g * factor : undefined,
    fiberG: item.fiberPer100g != null ? item.fiberPer100g * factor : undefined,
  };
}
