import { beforeEach, describe, expect, it } from 'vitest';
import { displayText, heroName, personName, validHeroName } from './heroName';
import { createInitialState, loadState, saveState, STORAGE_KEY } from './state';
import { acknowledgeTravelCg, resolveTravelEvent, startTravel } from './travel';

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
});

describe('hero names', () => {
  it.each(['陈平', '  陈平  ', '阿·满', 'Alex42', '𠮷野', '12345678'])('accepts allowed Unicode names: %s', value => {
    expect(validHeroName(value)).toBe(value.trim());
  });
  it.each([null, 42, '', '  ', '陈', '123456789', '··', '<script>', '陈\n平', '陈 平', '陈😀', '陈\u0000平', '陈\u200d平'])('rejects unsafe or invalid input: %s', value => {
    expect(validHeroName(value)).toBeNull();
  });
  it('uses a temporary traveler label without mutating the catalog or stable IDs', () => {
    const state = createInitialState();
    expect(heroName(state)).toBe('旅人');
    expect(personName('traveler', { ...state, heroName: '陈平' })).toBe('陈平');
    expect(personName('aman', state)).toBe('阿满');
    expect(displayText('姜垣和阿满，与姜垣同行。', { ...state, heroName: '陈平' })).toBe('陈平和阿满，与陈平同行。');
    expect(Object.keys(state.party)).toContain('traveler');
  });
  it('keeps legacy progress pending naming and round-trips a confirmed name', () => {
    const state = { ...createInitialState(), phase: 'overworld' as const, supplies: 91, travelCount: 8 };
    const { martial: _martial, ...legacy } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    expect(loadState()).toMatchObject({ phase: 'overworld', supplies: 91, travelCount: 8 });
    expect(loadState()?.heroName).toBeUndefined();
    saveState({ ...state, heroName: '陈平' });
    expect(loadState()?.heroName).toBe('陈平');
  });
  it('isolates a corrupt duel roster and returns safely without resetting resources', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...createInitialState(), phase: 'battle', supplies: 91, duel: { teacherId: 'fake' }, battleParty: ['forged'] }));
    const restored = loadState();
    expect(restored).toMatchObject({ phase: 'overworld', supplies: 91, martialRecovery: true });
    expect(restored?.duel).toBeUndefined();
    expect(restored?.battleParty).toBeUndefined();
  });
  it('keeps an existing journey battle when an unrelated duel record is corrupt', () => {
    const state = startTravel({ ...createInitialState(() => 0), phase: 'overworld', currentCityId: 'yingchuan' }, 'nanhai', 9);
    const battle = resolveTravelEvent(acknowledgeTravelCg({ ...state, journey: { ...state.journey!, event: { id: 0, kind: 'bandits' } } }), 'fight');
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...battle, duel: { teacherId: 'fake' } }));
    const restored = loadState();
    expect(restored).toMatchObject({ phase: 'battle', encounter: 'ambush', journey: battle.journey });
    saveState(restored!);
    expect(loadState()).not.toBeNull();
  });
  it('isolates corrupt new modules without discarding valid RPG progress', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...createInitialState(), supplies: 91, heroName: '<b>x</b>', martial: { learned: ['forged'] }, activeBattle: { bad: true } }));
    const restored = loadState()!;
    expect(restored.supplies).toBe(91);
    expect(restored.heroName).toBeUndefined();
    expect(restored.martial.learned).toEqual([]);
    expect(restored.activeBattle).toBeUndefined();
    expect(localStorage.getItem(`${STORAGE_KEY}:name-backup`)).toBeTruthy();
    expect(localStorage.getItem(`${STORAGE_KEY}:martial-backup`)).toBeTruthy();
    expect(localStorage.getItem(`${STORAGE_KEY}:active-battle-backup`)).toBeTruthy();
  });
});
