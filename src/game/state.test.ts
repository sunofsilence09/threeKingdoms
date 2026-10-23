import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInitialState,
  loadState,
  saveState,
  selectRoute,
  rewardVictory,
  completeJourneyTask,
  continueJourney,
  completeLocalEscort,
  canPlayFactionMission,
  type GameState,
} from './state';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('game state', () => {
  const eligible = () => ({ ...createInitialState(), date: { year: 200, month: 9, day: 1 }, flags: { ambushWon: true, recovered: true } });
  it('starts in 184 with a random origin that survives saves', () => {
    const first = createInitialState(() => 0);
    const last = createInitialState(() => 0.99999);
    expect(first.date).toEqual({ year: 184, month: 3, day: 1 });
    expect(last.originId).not.toBe(first.originId);
    saveState(last);
    expect(loadState()).toEqual(last);
  });
  it('unlocks only encountered factions early and all factions from 200', () => {
    const initial = createInitialState();
    expect(selectRoute(initial, 'cao')).toBe(initial);
    const early = { ...eligible(), date: { year: 199, month: 12 } };
    expect(selectRoute(early, 'liu')).toBe(early);
    const unfinished = { ...eligible(), flags: {} };
    expect(selectRoute(unfinished, 'sun').route).toBe('sun');
    const metCao = { ...initial, flags: { 'met:cao': true } };
    expect(selectRoute(metCao, 'cao').route).toBe('cao');
    expect(selectRoute(metCao, 'sun')).toBe(metCao);
    expect(selectRoute(eligible(), 'sun').route).toBe('sun');
    const selected = selectRoute(eligible(), 'cao');
    expect(selectRoute(selected, 'cao')).toBe(selected);
  });
  it('advances days once and returns from the ending without silently jumping years', () => {
    const initial = { ...createInitialState(), date: { year: 184, month: 12, day: 30 } };
    const next = completeJourneyTask(initial, 'ambushWon');
    expect(next.date).toEqual({ year: 185, month: 1, day: 1 });
    expect(completeJourneyTask(next, 'ambushWon')).toBe(next);
    expect(continueJourney(next)).toBe(next);
    const ended = { ...completeJourneyTask(next, 'escortWon'), phase: 'ending' as const };
    expect(continueJourney(ended)).toMatchObject({ date: { year: 185, month: 1, day: 4 }, route: null, phase: 'overworld', flags: { ambushWon: true, escortWon: true } });
  });
  it('keeps encounters, allegiance and local reward receipts when returning to the map', () => {
    const initial = createInitialState();
    const ended = { ...initial, phase: 'ending' as const, route: 'sun' as const, flags: { escortWon: true, 'met:sun': true, 'xp:escort': true } };
    const next = continueJourney(ended);
    expect(next.route).toBe('sun');
    expect(next.originId).toBe(initial.originId);
    expect(next.party).toBe(initial.party);
    expect(next.flags).toEqual(ended.flags);
    expect(continueJourney(next)).toBe(next);
  });
  it('rewards neutral escort and subsequent faction mission separately, once each', () => {
    const initial = createInitialState();
    const escorted = rewardVictory(initial, 'escort');
    expect(rewardVictory(escorted, 'escort')).toBe(escorted);
    const joined = { ...escorted, route: 'cao' as const, date: { year: 200, month: 9 } };
    const rewarded = rewardVictory(joined, 'route');
    expect(rewarded.party.traveler.level).toBeGreaterThan(joined.party.traveler.level);
    expect(rewardVictory(rewarded, 'route')).toBe(rewarded);
  });
  it('keeps a later faction mission available after neutral escort and spends its own three days once', () => {
    const state = { ...createInitialState(), phase: 'overworld' as const };
    const escorted = completeLocalEscort(state);
    expect(escorted.flags.escortWon).toBe(true);
    const joined = { ...escorted, route: 'liu' as const };
    expect(canPlayFactionMission(joined)).toBe(true);
    const completed = completeLocalEscort(joined);
    expect(completed.flags['xp:route']).toBe(true);
    expect(completed.date).toEqual({ year: 184, month: 3, day: 7 });
    expect(canPlayFactionMission(completed)).toBe(false);
    expect(completeLocalEscort(completed)).toBe(completed);
  });
  it('rejects invalid new calendar/origin saves and migrates legacy route saves to 200', () => {
    for (const patch of [{ date: { year: 184, month: 13 } }, { date: null }, { originId: 'unknown' }]) {
      saveState({ ...createInitialState(), ...patch } as GameState);
      expect(loadState()).toBeNull();
    }
    const { date: _date, originId: _origin, ...legacy } = { ...createInitialState(), route: 'liu' as const };
    localStorage.setItem('three-kingdoms-demo-state', JSON.stringify(legacy));
    expect(loadState()).toMatchObject({ date: { year: 200, month: 9 }, originId: 'yingchuan', route: 'liu' });
  });
  it('adds route rewards to earned supplies instead of replacing them', () => {
    const initial = { ...eligible(), supplies: 7, morale: 5 };
    expect(selectRoute(initial, 'cao')).toMatchObject({ supplies: 8, morale: 5 });
    expect(selectRoute(initial, 'sun')).toMatchObject({ supplies: 7, morale: 6 });
  });

  it('keeps the game playable when browser storage is unavailable', () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('storage disabled'); },
    });
    expect(() => saveState(createInitialState())).not.toThrow();
    expect(loadState()).toBeNull();
  });

  it('rejects structurally invalid saves', () => {
    for (const patch of [{ route: undefined }, { flags: [] }, { supplies: -1 }, { morale: 1.5 }]) {
      localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({ ...createInitialState(), ...patch }));
      expect(loadState()).toBeNull();
    }
  });
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  it('starts in the refugee prologue with a small shared resource pool', () => {
    expect(createInitialState()).toMatchObject({
      phase: 'prologue',
      route: null,
      supplies: 3,
      morale: 2,
      flags: {},
      party: {
        traveler: { level: 1, xp: 0 },
        aman: { level: 1, xp: 0 },
        'chen-da': { level: 1, xp: 0 },
      },
    });
  });

  it.each([
    ['cao', 4, 2],
    ['sun', 3, 3],
    ['liu', 3, 4],
  ] as const)('applies the %s route advantage', (route, supplies, morale) => {
    const selected = selectRoute(eligible(), route);

    expect(selected).toMatchObject({
      phase: 'route-choice',
      route,
      supplies,
      morale,
    });
  });

  it('round-trips a saved state and ignores malformed data', () => {
    const state: GameState = {
      ...eligible(),
      phase: 'battle',
      route: 'sun',
      supplies: 5,
      morale: 3,
      flags: { foundMap: true },
      party: createInitialState().party,
    };

    saveState(state);
    expect(loadState()).toEqual({ ...state, date: { ...state.date, day: state.date.day ?? 1 } });

    localStorage.setItem('three-kingdoms-demo-state', '{bad json');
    expect(loadState()).toBeNull();
  });

  it('migrates old saves to level one without losing their route or resources', () => {
    const { party: _party, ...oldSave } = selectRoute(eligible(), 'sun');
    localStorage.setItem('three-kingdoms-demo-state', JSON.stringify(oldSave));
    expect(loadState()).toEqual({ ...oldSave, party: createInitialState().party });
  });

  it('rejects corrupt growth data instead of accepting impossible levels', () => {
    for (const traveler of [{ level: 0, xp: 0 }, { level: 11, xp: 0 }, { level: 2, xp: -1 }, { level: 1, xp: 20 }]) {
      const state = createInitialState();
      localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({ ...state, party: { ...state.party, traveler } }));
      expect(loadState()).toBeNull();
    }
  });

  it('rewards everyone once per victory and keeps progress through save and route choice', () => {
    const initial = createInitialState();
    const rewarded = rewardVictory(initial, 'ambush');
    expect(rewarded.party.traveler).toMatchObject({ level: 2, xp: 10 });
    expect(rewarded.party.aman).toMatchObject({ level: 2, xp: 10 });
    expect(rewardVictory(rewarded, 'ambush')).toBe(rewarded);
    expect(initial.party.traveler.level).toBe(1);
    const route = rewardVictory(selectRoute({ ...rewarded, date: { year: 200, month: 9 }, flags: { ...rewarded.flags, ambushWon: true, recovered: true } }, 'liu'), 'route');
    expect(route.party.traveler).toMatchObject({ level: 3, xp: 25 });
    saveState(route);
    expect(loadState()).toEqual({ ...route, date: { ...route.date, day: 1 } });
  });
  it('backfills earned points for old level-only saves exactly once', () => {
    const state = createInitialState();
    const party = { traveler: { level: 3, xp: 25 }, aman: { level: 2, xp: 10 }, 'chen-da': { level: 1, xp: 0 } };
    localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({ ...state, party }));
    const migrated = loadState()!;
    expect(migrated.party.traveler).toMatchObject({ level: 3, xp: 25, points: 6 });
    expect(migrated.party.aman.points).toBe(3);
    expect(migrated.party['chen-da'].points).toBe(0);
    saveState(migrated);
    expect(loadState()).toEqual(migrated);
  });

  it('rejects forged or partially present training data', () => {
    const state = createInitialState();
    for (const patch of [{ points: 99 }, { attributes: undefined }, { points: -1 }]) {
      const party = { ...state.party, traveler: { ...state.party.traveler, ...patch } };
      localStorage.setItem('three-kingdoms-demo-state', JSON.stringify({ ...state, party }));
      expect(loadState()).toBeNull();
    }
  });

});
