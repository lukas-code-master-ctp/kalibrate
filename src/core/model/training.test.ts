import { describe, expect, it } from 'vitest';
import { summarizeWeek, type TrainingSession, type TrainingType } from './training';

const DAY = 1000 * 60 * 60 * 24;
const NOW = new Date('2026-03-15T18:00');

function session(
  date: Date,
  type: TrainingType,
  durationMin: number,
  rpe?: number,
): TrainingSession {
  return {
    id: Math.random().toString(),
    occurredAt: date,
    type,
    durationMin,
    rpe,
  };
}

describe('summarizeWeek', () => {
  it('devuelve resumen vacío sin sesiones', () => {
    const s = summarizeWeek([], NOW);
    expect(s.totalMinutes).toBe(0);
    expect(s.hasHighIntensity).toBe(false);
    expect(s.latestSession).toBeNull();
  });

  it('suma duración solo de los últimos 7 días', () => {
    const sessions = [
      session(new Date(NOW.getTime() - 1 * DAY), 'strength', 60),
      session(new Date(NOW.getTime() - 3 * DAY), 'cardio_low', 45),
      session(new Date(NOW.getTime() - 10 * DAY), 'strength', 90), // fuera de ventana
    ];
    const s = summarizeWeek(sessions, NOW);
    expect(s.totalMinutes).toBe(105);
    expect(s.countByType.strength).toBe(1);
    expect(s.minutesByType.strength).toBe(60);
  });

  it('flagea alta intensidad cuando hay cardio_high', () => {
    const sessions = [session(new Date(NOW.getTime() - 1 * DAY), 'cardio_high', 30)];
    expect(summarizeWeek(sessions, NOW).hasHighIntensity).toBe(true);
  });

  it('flagea alta intensidad cuando RPE >= 7', () => {
    const sessions = [session(new Date(NOW.getTime() - 1 * DAY), 'strength', 60, 8)];
    expect(summarizeWeek(sessions, NOW).hasHighIntensity).toBe(true);
  });

  it('NO flagea alta intensidad con cardio_low + RPE bajo', () => {
    const sessions = [session(new Date(NOW.getTime() - 1 * DAY), 'cardio_low', 60, 4)];
    expect(summarizeWeek(sessions, NOW).hasHighIntensity).toBe(false);
  });

  it('latestSession es la más reciente', () => {
    const recent = session(new Date(NOW.getTime() - 1 * DAY), 'strength', 60);
    const older = session(new Date(NOW.getTime() - 3 * DAY), 'cardio_low', 45);
    const s = summarizeWeek([older, recent], NOW);
    expect(s.latestSession?.id).toBe(recent.id);
  });

  it('agrupa minutos por tipo correctamente', () => {
    const sessions = [
      session(new Date(NOW.getTime() - 1 * DAY), 'strength', 60),
      session(new Date(NOW.getTime() - 2 * DAY), 'strength', 75),
      session(new Date(NOW.getTime() - 3 * DAY), 'sport', 90),
    ];
    const s = summarizeWeek(sessions, NOW);
    expect(s.minutesByType.strength).toBe(135);
    expect(s.minutesByType.sport).toBe(90);
    expect(s.minutesByType.cardio_high).toBe(0);
    expect(s.countByType.strength).toBe(2);
    expect(s.countByType.sport).toBe(1);
  });
});
