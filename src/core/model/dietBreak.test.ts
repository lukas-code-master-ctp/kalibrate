import { describe, expect, it } from 'vitest';
import { suggestDietBreak } from './dietBreak';

const DAY = 1000 * 60 * 60 * 24;
const NOW = new Date('2026-03-15');

describe('suggestDietBreak', () => {
  it('none cuando el objetivo es mantención', () => {
    const r = suggestDietBreak({
      goalType: 'maintain',
      targetRateKgPerWeek: 0,
      goalStartedOn: new Date(NOW.getTime() - 10 * 7 * DAY),
      adaptationOverestimated: false,
      now: NOW,
    });
    expect(r.urgency).toBe('none');
  });

  it('none cuando el objetivo es ganar peso', () => {
    const r = suggestDietBreak({
      goalType: 'gain',
      targetRateKgPerWeek: 0.25,
      goalStartedOn: new Date(NOW.getTime() - 10 * 7 * DAY),
      adaptationOverestimated: false,
      now: NOW,
    });
    expect(r.urgency).toBe('none');
  });

  it('none con menos de 6 semanas en déficit y sin adaptación', () => {
    const r = suggestDietBreak({
      goalType: 'lose',
      targetRateKgPerWeek: -0.5,
      goalStartedOn: new Date(NOW.getTime() - 4 * 7 * DAY),
      adaptationOverestimated: false,
      now: NOW,
    });
    expect(r.urgency).toBe('none');
  });

  it('suggested entre 6 y 10 semanas en déficit', () => {
    const r = suggestDietBreak({
      goalType: 'lose',
      targetRateKgPerWeek: -0.5,
      goalStartedOn: new Date(NOW.getTime() - 8 * 7 * DAY),
      adaptationOverestimated: false,
      now: NOW,
    });
    expect(r.urgency).toBe('suggested');
    expect(r.recommendation).not.toBeNull();
  });

  it('urgent con más de 10 semanas en déficit', () => {
    const r = suggestDietBreak({
      goalType: 'lose',
      targetRateKgPerWeek: -0.5,
      goalStartedOn: new Date(NOW.getTime() - 12 * 7 * DAY),
      adaptationOverestimated: false,
      now: NOW,
    });
    expect(r.urgency).toBe('urgent');
  });

  it('urgent siempre que haya adaptación sobreestimada, independiente del tiempo', () => {
    const r = suggestDietBreak({
      goalType: 'lose',
      targetRateKgPerWeek: -0.5,
      goalStartedOn: new Date(NOW.getTime() - 2 * 7 * DAY),
      adaptationOverestimated: true,
      now: NOW,
    });
    expect(r.urgency).toBe('urgent');
    expect(r.reason).toContain('adaptación');
  });

  it('weeksInDeficit refleja el tiempo desde goalStartedOn', () => {
    const r = suggestDietBreak({
      goalType: 'lose',
      targetRateKgPerWeek: -0.5,
      goalStartedOn: new Date(NOW.getTime() - 7 * 7 * DAY),
      adaptationOverestimated: false,
      now: NOW,
    });
    expect(r.weeksInDeficit).toBeCloseTo(7, 0);
  });

  it('weeksInDeficit = 0 cuando goalStartedOn es null', () => {
    const r = suggestDietBreak({
      goalType: 'lose',
      targetRateKgPerWeek: -0.5,
      goalStartedOn: null,
      adaptationOverestimated: false,
      now: NOW,
    });
    expect(r.weeksInDeficit).toBe(0);
    expect(r.urgency).toBe('none');
  });
});
