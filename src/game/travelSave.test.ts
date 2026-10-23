import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState, STORAGE_KEY } from './state';
import { advanceTravel, resolveTravelEvent, startTravel, cityContact, restInCity } from './travel';

beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
});
const begin = () => startTravel({ ...createInitialState(() => 0), currentCityId: 'yingchuan', phase: 'overworld' }, 'nanhai', 9);

describe('travel saves and historical choices', () => {
  it('migrates a 0.1 save from its birthplace without losing resources or growth', () => {
    const { currentCityId: _city, travelCount: _count, ...old } = createInitialState(() => .9999);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, date: { year: 184, month: 4 } }));
    expect(loadState()).toMatchObject({ currentCityId: 'nanhai', travelCount: 0, date: { year: 184, month: 4, day: 1 }, party: old.party, originId: old.originId });
  });
  it('recognizes original 0.1 route victory saves without issuing the reward again', () => {
    const { currentCityId: _city, travelCount: _count, ...old } = createInitialState();
    const date = { year: 200, month: 9 };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, date, route: 'cao', phase: 'ending', flags: { 'xp:route': true } }));
    const restored = loadState()!;
    expect(restored.flags.escortWon).toBe(true);
    expect(restored.party).toEqual(old.party);
    expect(restored.date).toEqual({ ...date, day: 1 });
    expect(restored.supplies).toBe(old.supplies);
  });
  it('round trips route progress and pending events with their random state', () => {
    let state = begin();
    for (let i = 0; i < 100 && !state.journey?.event; i++) state = advanceTravel(state);
    expect(state.journey?.event).toBeDefined();
    saveState(state);
    expect(loadState()).toEqual(state);
    expect(resolveTravelEvent(loadState()!, 'safe')).toEqual(resolveTravelEvent(state, 'safe'));
  });
  it('rejects nonadjacent paths, inconsistent progress, corrupt events and mismatched battle context', () => {
    const initial = begin(), j = initial.journey!;
    for (const patch of [
      { path: ['yingchuan', 'nanhai'] }, { legIndex: -1 }, { legDay: 9999 }, { seed: -1 },
      { elapsed: 5 }, { event: { id: 0, kind: 'unknown' } }, { event: { id: 0, kind: 'contact' } },
      { event: { id: 0, kind: 'bandits', inBattle: true } },
    ]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initial, journey: { ...j, ...patch } }));
      expect(loadState()).toBeNull();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initial, date: { year: 184, month: 3, day: 31 } }));
    expect(loadState()).toBeNull();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...initial, phase: 'battle', encounter: 'route', journey: { ...j, event: { id: 0, kind: 'bandits', inBattle: true } } }));
    expect(loadState()).toBeNull();
  });
  it('restores a travel battle without turning it into the old escort mission', () => {
    const state = begin(), trip = state.journey!;
    const battle = resolveTravelEvent({ ...state, journey: { ...trip, event: { id: 0, kind: 'bandits' } } }, 'fight');
    saveState(battle);
    expect(loadState()).toEqual(battle);
    expect(loadState()?.encounter).toBe('ambush');
  });
  it('gates regional encounters and reaches 200 only by explicit passage of time', () => {
    expect(cityContact('yingchuan', { year: 184, month: 3 })).toBeUndefined();
    expect(cityContact('yingchuan', { year: 184, month: 5 })).toBe('cao');
    expect(cityContact('nanyang', { year: 184, month: 3 })).toBeUndefined();
    expect(cityContact('nanyang', { year: 184, month: 6 })).toBe('sun');
    expect(cityContact('zhuo', { year: 184, month: 3 })).toBe('liu');
    expect(cityContact('wujun', { year: 194, month: 12 })).toBeUndefined();
    expect(cityContact('wujun', { year: 195, month: 12 })).toBe('sun');
    const state = restInCity({ ...createInitialState(), phase: 'overworld', date: { year: 199, month: 12, day: 30 } }, 1);
    expect(state.date).toEqual({ year: 200, month: 1, day: 1 });
  });
});
