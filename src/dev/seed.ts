/**
 * Generador de datos sintéticos para validar el modelo sin esperar semanas.
 *
 * No es parte del MVP de producción. Se invoca desde Profile en modo dev.
 *
 * Simula:
 * - 60 días de mediciones de peso con tendencia bajando ~0.5 kg/sem + ruido.
 * - 60 días de food entries con ingesta consistente (deficit moderado).
 * - Para mujeres en edad fértil: 2 inicios de periodo a 28 días de distancia.
 *
 * Diseñado para que después de aplicarlo, la calibración bayesiana muestre
 * confianza media/alta y todas las funciones derivadas (weekly status,
 * weekday pattern, alertas) tengan data real.
 */

import type { User } from '@/core/model/user';
import { foodEntryRepo, menstrualEventRepo, weightLogRepo } from '@/data/repos';

const DAY = 1000 * 60 * 60 * 24;

interface SeedConfig {
  days?: number;
  startKg?: number;
  endKg?: number;
  avgDailyKcal?: number;
  /** Bias del fin de semana sobre L-V (kcal/día extra S-D). */
  weekendBiasKcal?: number;
  /** Si es female fértil, agregamos 2 inicios de periodo. */
  addCycle?: boolean;
}

function pseudoRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export interface SeedSummary {
  weightLogsCreated: number;
  foodEntriesCreated: number;
  cycleEventsCreated: number;
}

/**
 * Borra los datos existentes y siembra una serie sintética.
 * Ojo: destruye logs previos. La UI debe pedir confirmación.
 */
export async function applySeed(user: User, config: SeedConfig = {}): Promise<SeedSummary> {
  const {
    days = 60,
    startKg = user.initialWeightKg,
    endKg = user.initialWeightKg - 4,
    avgDailyKcal = 2200,
    weekendBiasKcal = 400,
    addCycle = user.biologicalSex === 'female' &&
      (user.lifePhase === 'fertile_regular' || user.lifePhase === 'fertile_irregular'),
  } = config;

  const now = new Date();
  const start = new Date(now.getTime() - days * DAY);
  const rand = pseudoRandom(42);

  // Limpiar datos previos.
  for (const log of await weightLogRepo.listAll()) {
    await weightLogRepo.delete(log.id);
  }
  for (const entry of await foodEntryRepo.listAll()) {
    await foodEntryRepo.delete(entry.id);
  }
  for (const event of await menstrualEventRepo.listAll()) {
    await menstrualEventRepo.delete(event.id);
  }

  let weightLogsCreated = 0;
  let foodEntriesCreated = 0;
  let cycleEventsCreated = 0;

  for (let i = 0; i <= days; i++) {
    const date = new Date(start.getTime() + i * DAY);
    const fraction = i / days;
    const trendKg = startKg + (endKg - startKg) * fraction;
    // Ruido ±0.4 kg diario para simular fluctuación normal.
    const noise = (rand() - 0.5) * 0.8;
    const weightKg = Math.round((trendKg + noise) * 10) / 10;
    // Pesarse en la mañana, ~7:30.
    const measuredAt = new Date(date);
    measuredAt.setHours(7, 30, 0, 0);
    await weightLogRepo.add({ loggedAt: measuredAt, weightKg });
    weightLogsCreated += 1;

    // Food entries: comida principal + snack.
    const dow = date.getDay();
    const isWeekend = dow === 0 || dow === 6;
    const dailyKcal = avgDailyKcal + (isWeekend ? weekendBiasKcal : 0);
    const noisyKcal = Math.round(dailyKcal + (rand() - 0.5) * 200);

    const lunch = new Date(date);
    lunch.setHours(13, 0, 0, 0);
    await foodEntryRepo.add({
      consumedAt: lunch,
      mealType: 'lunch',
      name: 'Almuerzo (seed)',
      kcal: Math.round(noisyKcal * 0.55),
      proteinG: Math.round(((noisyKcal * 0.55 * 0.2) / 4) * 10) / 10,
      source: 'manual',
      confidence: 'medium',
    });
    foodEntriesCreated += 1;

    const dinner = new Date(date);
    dinner.setHours(20, 0, 0, 0);
    await foodEntryRepo.add({
      consumedAt: dinner,
      mealType: 'dinner',
      name: 'Cena (seed)',
      kcal: Math.round(noisyKcal * 0.45),
      proteinG: Math.round(((noisyKcal * 0.45 * 0.2) / 4) * 10) / 10,
      source: 'manual',
      confidence: 'medium',
    });
    foodEntriesCreated += 1;
  }

  if (addCycle) {
    // Dos inicios de periodo: -7 días y -35 días (asumiendo ciclo 28).
    const cycleDates = [-35, -7].map((d) => new Date(now.getTime() + d * DAY));
    for (const date of cycleDates) {
      const eventDate = new Date(date);
      eventDate.setHours(0, 0, 0, 0);
      await menstrualEventRepo.add({
        eventType: 'period_start',
        occurredOn: eventDate,
      });
      cycleEventsCreated += 1;
    }
  }

  return { weightLogsCreated, foodEntriesCreated, cycleEventsCreated };
}
