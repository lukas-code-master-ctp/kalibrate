import { describe, expect, it } from 'vitest';
import { normalizeOffProduct } from './foodSearch';

describe('normalizeOffProduct', () => {
  it('devuelve null cuando falta el nombre', () => {
    expect(
      normalizeOffProduct({
        code: '1',
        nutriments: { 'energy-kcal_100g': 100, proteins_100g: 5 },
      }),
    ).toBeNull();
  });

  it('devuelve null cuando falta kcal', () => {
    expect(
      normalizeOffProduct({
        code: '1',
        product_name: 'Arroz',
        nutriments: { proteins_100g: 7 },
      }),
    ).toBeNull();
  });

  it('devuelve null cuando falta proteína', () => {
    expect(
      normalizeOffProduct({
        code: '1',
        product_name: 'Arroz',
        nutriments: { 'energy-kcal_100g': 130 },
      }),
    ).toBeNull();
  });

  it('mapea producto completo', () => {
    const item = normalizeOffProduct({
      code: '7591001234567',
      product_name: 'Yogurt natural',
      brands: 'Soprole, Chile',
      serving_quantity: 125,
      nutriments: {
        'energy-kcal_100g': 60,
        proteins_100g: 3.5,
        carbohydrates_100g: 7.2,
        fat_100g: 2.5,
        fiber_100g: 0,
      },
    });
    expect(item).not.toBeNull();
    expect(item!.id).toBe('off:7591001234567');
    expect(item!.name).toBe('Yogurt natural');
    expect(item!.brand).toBe('Soprole');
    expect(item!.kcalPer100g).toBe(60);
    expect(item!.proteinPer100g).toBe(3.5);
    expect(item!.carbsPer100g).toBe(7.2);
    expect(item!.fatPer100g).toBe(2.5);
    expect(item!.typicalServingG).toBe(125);
  });

  it('prefiere el nombre en español si está', () => {
    const item = normalizeOffProduct({
      code: '1',
      product_name: 'Whole milk',
      product_name_es: 'Leche entera',
      nutriments: { 'energy-kcal_100g': 60, proteins_100g: 3 },
    });
    expect(item?.name).toBe('Leche entera');
  });

  it('acepta numéricos como strings (OFF a veces los devuelve así)', () => {
    const item = normalizeOffProduct({
      code: '1',
      product_name: 'Pan',
      nutriments: {
        'energy-kcal_100g': '265' as unknown as number,
        proteins_100g: '9' as unknown as number,
      },
    });
    expect(item?.kcalPer100g).toBe(265);
    expect(item?.proteinPer100g).toBe(9);
  });

  it('descarta brand vacío', () => {
    const item = normalizeOffProduct({
      code: '1',
      product_name: 'Genérico',
      brands: '',
      nutriments: { 'energy-kcal_100g': 100, proteins_100g: 5 },
    });
    expect(item?.brand).toBeUndefined();
  });
});
