/**
 * Servicio de búsqueda en Open Food Facts (OFF).
 *
 * OFF es público, sin auth, con buena cobertura de productos empaquetados.
 * Cobertura en Chile/LATAM variable — por eso siempre ofrecemos entrada manual.
 *
 * Estrategia:
 * - Búsqueda por texto contra el endpoint cgi/search.pl.
 * - Filtramos productos sin kcal o proteína (no son útiles para el modelo).
 * - Caché en memoria de queries para evitar pegarle al API en cada keystroke.
 * - Timeout de 7s para no congelar la UI con conexiones lentas.
 */

import type { FoodCatalogItem } from '@/core/model/food';

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';
const REQUEST_TIMEOUT_MS = 7000;
const PAGE_SIZE = 20;

const memoryCache = new Map<string, FoodCatalogItem[]>();

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  generic_name?: string;
  generic_name_es?: string;
  brands?: string;
  serving_quantity?: number | string;
  nutriments?: {
    'energy-kcal_100g'?: number | string;
    'energy-kcal'?: number | string;
    proteins_100g?: number | string;
    carbohydrates_100g?: number | string;
    fat_100g?: number | string;
    fiber_100g?: number | string;
  };
}

interface OffSearchResponse {
  count?: number;
  products?: OffProduct[];
}

function toNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Convierte un producto OFF a nuestro `FoodCatalogItem`.
 * Devuelve null si faltan datos esenciales (nombre, kcal, proteína).
 */
export function normalizeOffProduct(p: OffProduct): FoodCatalogItem | null {
  const name = p.product_name_es || p.product_name || p.generic_name_es || p.generic_name;
  if (!name || name.trim() === '') return null;

  const kcal = toNumber(p.nutriments?.['energy-kcal_100g']);
  const protein = toNumber(p.nutriments?.proteins_100g);
  if (kcal === undefined || protein === undefined) return null;

  return {
    id: p.code ? `off:${p.code}` : `off:${name}`,
    source: 'off',
    externalId: p.code,
    name: name.trim(),
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    kcalPer100g: kcal,
    proteinPer100g: protein,
    carbsPer100g: toNumber(p.nutriments?.carbohydrates_100g),
    fatPer100g: toNumber(p.nutriments?.fat_100g),
    fiberPer100g: toNumber(p.nutriments?.fiber_100g),
    typicalServingG: toNumber(p.serving_quantity),
  };
}

/**
 * Busca alimentos en OFF. Devuelve hasta `pageSize` resultados filtrados.
 *
 * @throws Si el request falla por red. Los callers deben mostrar fallback UI.
 */
export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodCatalogItem[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cacheKey = trimmed.toLowerCase();
  const cached = memoryCache.get(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    search_terms: trimmed,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: PAGE_SIZE.toString(),
    fields:
      'code,product_name,product_name_es,generic_name,generic_name_es,brands,serving_quantity,nutriments',
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(`${OFF_SEARCH_URL}?${params.toString()}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Kalibrate/0.1 (https://github.com/lukas-code-master-ctp/kalibrate)',
      },
    });
    if (!res.ok) {
      throw new Error(`OFF search failed: HTTP ${res.status}`);
    }
    const data = (await res.json()) as OffSearchResponse;
    const items = (data.products ?? [])
      .map(normalizeOffProduct)
      .filter((item): item is FoodCatalogItem => item !== null);
    memoryCache.set(cacheKey, items);
    return items;
  } finally {
    clearTimeout(timeout);
  }
}

/** Solo para tests — limpia el caché entre runs. */
export function _clearSearchCache(): void {
  memoryCache.clear();
}
