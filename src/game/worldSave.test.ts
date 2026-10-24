import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState, STORAGE_KEY } from './state';
import { createWorldConflict, conflictDay } from './worldConflict';
import { garrisonTroopsAt } from './garrisonSchedule';
import { startTravel } from './travel';

beforeEach(() => {
  const records = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => records.get(key) ?? null, setItem: (key: string, value: string) => records.set(key, value) } });
});

describe('strategic world persistence and legacy migration', () => {
  it('saves a new world once and reloads the same ownership, troops, armies and random state', () => {
    const state = createInitialState(() => 0);
    expect(state.worldConflict).toBeDefined();
    saveState(state); expect(loadState()).toEqual(state);
    saveState(loadState()!); expect(loadState()).toEqual(state);
  });
  it('takes a current-date legacy snapshot without replaying earlier wars or resetting RPG fields', () => {
    const initial = createInitialState(() => 0);
    let old = { ...initial, worldConflict: undefined, phase: 'overworld' as const, date: { year: 200, month: 9, day: 1 }, currentCityId: 'yingchuan', relationships: { ...initial.relationships, 'garrison:yingchuan:captain': { affinity: 79 } } };
    old.economy = { ...old.economy, coins: 4321, cargo: { ...old.economy.cargo, salt: { quantity: 2, cost: 40 } } };
    const traveling = startTravel(old, 'xuxian', 44);
    saveState(traveling); const restored = loadState()!;
    expect(restored.worldConflict?.lastDay).toBe(conflictDay(old.date));
    expect(restored.worldConflict?.cities.runan.troops).toBe(garrisonTroopsAt('runan', old.date).troops);
    expect(restored.party).toEqual(old.party); expect(restored.economy).toEqual(old.economy);
    expect(restored.relationships).toEqual(old.relationships); expect(restored.journey).toEqual(traveling.journey);
    expect(restored.currentCityId).toBe(old.currentCityId);
    expect(restored.conflictMigration).toBe(true);
  });
  it('backs up a broken new world and preserves the RPG save until the explicit rebuild', () => {
    const state = createInitialState(() => 0), broken = { ...state, worldConflict: { broken: true } };
    const raw = JSON.stringify(broken); localStorage.setItem(STORAGE_KEY, raw);
    const recovered = loadState()!;
    expect(recovered).not.toBeNull(); expect(recovered.conflictRecovery).toBe(true); expect(recovered.worldConflict).toBeUndefined();
    expect(recovered.party).toEqual(state.party); expect(recovered.economy).toEqual(state.economy);
    expect(localStorage.getItem(`${STORAGE_KEY}:conflict-backup`)).toBe(raw);
    saveState(recovered); expect(loadState()?.conflictRecovery).toBe(true);
    const rebuilt = { ...recovered, conflictRecovery: undefined, worldConflict: createWorldConflict(recovered.date, Object.keys(recovered.party)) };
    saveState(rebuilt); expect(loadState()).toEqual(rebuilt);
  });
});
