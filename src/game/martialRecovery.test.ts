import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState, STORAGE_KEY, type GameState } from './state';
import { settleDuel, startDuel } from './martial';

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
});

function paidDuel(): GameState {
  return startDuel({ ...createInitialState(() => 0), phase: 'overworld', currentCityId: 'zhuo',
    worldConflict: undefined, supplies: 91, morale: 12, travelCount: 8 }, 'guan-yu');
}

function expectDuelRecovered(saved: GameState): void {
  saveState(saved);
  const restored = loadState()!;
  expect(restored).toMatchObject({ phase: 'overworld', supplies: saved.supplies, morale: saved.morale,
    date: saved.date, travelCount: saved.travelCount, party: saved.party, relationships: saved.relationships,
    martialRecovery: true });
  expect(restored.duel).toBeUndefined();
  expect(restored.activeBattle).toBeUndefined();
  expect(restored.battleParty).toBeUndefined();
  expect(restored.encounter).toBeUndefined();
  expect(JSON.parse(localStorage.getItem(`${STORAGE_KEY}:duel-backup`)!)).toEqual(saved.duel);
  saveState(restored);
  expect(loadState()?.duel).toBeUndefined();
}

describe('duel save recovery', () => {
  it.each(['won', 'lost'] as const)('discards an already finished %s duel', status => {
    const state = paidDuel();
    expectDuelRecovered({ ...state, duel: { ...state.duel!, status } });
  });

  it('discards an active duel without its paid challenge date', () => {
    const state = paidDuel();
    expectDuelRecovered({ ...state, martial: { ...state.martial, challengeDates: {} } });
  });

  it('discards an active duel whose paid challenge date differs from its start', () => {
    const state = paidDuel();
    expectDuelRecovered({ ...state, martial: { ...state.martial,
      challengeDates: { 'guan-yu': { year: 184, month: 3, day: 1 } } } });
  });

  it('discards a restored duel that was already settled', () => {
    const state = paidDuel();
    expectDuelRecovered({ ...state, martial: { ...state.martial, settled: [state.duel!.id] } });
  });

  it('discards the stranded duel after recovering corrupt martial data and backs up both modules', () => {
    const state = paidDuel(), damaged = { ...state, martial: { ...state.martial, seed: -1 } };
    expectDuelRecovered(damaged);
    expect(JSON.parse(localStorage.getItem(`${STORAGE_KEY}:martial-backup`)!)).toEqual(damaged.martial);
    expect(loadState()?.martial.challengeDates).toEqual({});
  });

  it('keeps a valid paid active duel across reloads and permits settlement', () => {
    const state = paidDuel();
    expect(state.duel?.status).toBe('active');
    saveState(state);
    const restored = loadState()!;
    expect(restored.duel).toEqual(state.duel);
    expect(restored.martial).toEqual(state.martial);
    expect(restored.battleParty).toEqual(['traveler']);
    expect(restored.martialRecovery).toBeUndefined();
    expect(settleDuel(restored, false)).toMatchObject({ phase: 'overworld', duel: undefined,
      supplies: state.supplies, martial: { settled: [state.duel!.id] } });
    expect(localStorage.getItem(`${STORAGE_KEY}:duel-backup`)).toBeNull();
  });
});
