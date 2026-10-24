import { describe, expect, it } from 'vitest';
import { createInitialState, completeJourneyTask, completeLocalEscort } from './state';
import { advanceDays } from './history';
import { restInCity, startTravel, advanceTravel } from './travel';
import { interactPerson } from './recruitment';
import { createWorldConflict, conflictDay } from './worldConflict';
import { withWorldDate } from './worldTime';

describe('one game clock for journeys and the strategic world', () => {
  it('initializes a legacy world at its current date and advances days deterministically', () => {
    const original = createInitialState(() => 0);
    const legacy = { ...original, date: { year: 200, month: 9, day: 1 }, worldConflict: undefined };
    const now = withWorldDate(legacy, legacy.date);
    expect(now.worldConflict?.lastDay).toBe(conflictDay(legacy.date));
    expect(withWorldDate(now, now.date)).toBe(now);
    const direct = withWorldDate(now, advanceDays(now.date, 30));
    let daily = now;
    for (let index = 0; index < 30; index++) daily = withWorldDate(daily, advanceDays(daily.date, 1));
    expect(direct.worldConflict).toEqual(daily.worldConflict);
    expect(direct.economy).toBe(original.economy); expect(direct.party).toBe(original.party);
  });
  it('uses the actual days spent resting, interacting, doing work and escorting', () => {
    const initial = { ...createInitialState(() => 0), phase: 'overworld' as const, currentCityId: 'yingchuan' };
    for (const next of [restInCity(initial, 30), interactPerson(initial, 'aman', 'talk'), completeJourneyTask(initial, 'ambushWon'), completeLocalEscort(initial)]) {
      expect(next.worldConflict?.lastDay).toBe(conflictDay(next.date));
      expect(next.worldConflict?.lastDay).toBeGreaterThan(conflictDay(initial.date));
    }
  });
  it('advances only the days actually traveled before an event or arrival and retains the journey RNG', () => {
    const initial = { ...createInitialState(() => 0), phase: 'overworld' as const, currentCityId: 'yingchuan' };
    const underway = startTravel(initial, 'xuxian', 123);
    const result = advanceTravel(underway, 30);
    expect(result.worldConflict?.lastDay).toBe(conflictDay(result.date));
    expect(result.worldConflict?.lastDay).toBeLessThanOrEqual(conflictDay(initial.date) + 30);
    const again = advanceTravel(JSON.parse(JSON.stringify(underway)), 30);
    expect(result.journey).toEqual(again.journey); expect(result.worldConflict).toEqual(again.worldConflict);
  });
  it('keeps a damaged-world recovery paused while preserving all RPG progress', () => {
    const state = { ...createInitialState(() => 0), worldConflict: undefined, conflictRecovery: true };
    const next = withWorldDate(state, advanceDays(state.date, 1));
    expect(next.worldConflict).toBeUndefined(); expect(next.conflictRecovery).toBe(true);
    expect(next.party).toBe(state.party); expect(next.economy).toBe(state.economy);
    expect(createWorldConflict(state.date).lastDay).toBe(conflictDay(state.date));
  });
});
