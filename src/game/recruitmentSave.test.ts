import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState, rewardVictory, saveState, STORAGE_KEY, type GameState } from './state';
import { createProgress } from './growth';
import { advanceDays } from './history';
import { initialRelationships, interactPerson, invitePerson, setDeployment } from './recruitment';
import { RECRUIT_PROFILES } from './recruitmentCatalog';
import { acknowledgeTravelCg, finishTravelBattle, resolveTravelEvent, startTravel } from './travel';

beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
});
const stateInZhuo = () => ({ ...createInitialState(), phase: 'overworld' as const, currentCityId: 'zhuo' });
describe('persistent recruited roster and combat rewards', () => {
  it('migrates 0.2 saves to their original three fighters and retains all prior progress', () => {
    const state = createInitialState();
    const { deployed: _deployed, relationships: _relations, ...old } = { ...state, party: { ...state.party, traveler: createProgress(3, 20) } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(old));
    expect(loadState()).toEqual({ ...old, deployed: ['traveler', 'aman', 'chen-da'], relationships: initialRelationships() });
  });
  it('supports recruitment of every catalog identity beyond initial companions', () => {
    for (const profile of RECRUIT_PROFILES.filter(p => p.category !== 'initial')) {
      const first = profile.windows[0];
      const state = { ...stateInZhuo(), currentCityId: first.cityIds[0], date: { year: first.from.year, month: first.from.month ?? 1, day: 1 }, relationships: { [profile.id]: { affinity: 60 } } };
      const recruited = invitePerson(state, profile.id);
      expect(recruited.party[profile.id], profile.id).toBeDefined();
      saveState(recruited);
      expect(loadState(), profile.id).toEqual(recruited);
    }
  });
  it('preserves affinity, daily cooldown and reserve growth through a reload', () => {
    const talked = interactPerson(stateInZhuo(), 'guan-yu', 'talk');
    saveState(talked); const restored = loadState()!;
    expect(interactPerson(restored, 'guan-yu', 'talk')).toBe(restored);
    expect(interactPerson({ ...restored, date: advanceDays(restored.date, 1) }, 'guan-yu', 'talk').relationships['guan-yu'].affinity).toBe(16);
    const recruited = invitePerson({ ...restored, relationships: { 'guan-yu': { affinity: 60 } } }, 'guan-yu');
    saveState(recruited);
    expect(loadState()?.party['guan-yu']).toEqual(createProgress());
  });
  it('rejects unknown, duplicate, missing hero, unowned and over-capacity lineups or forged relationships', () => {
    const base = stateInZhuo();
    for (const patch of [
      { deployed: [] }, { deployed: ['aman'] }, { deployed: ['traveler', 'traveler'] }, { deployed: ['traveler', 'guan-yu'] },
      { party: { ...base.party, unknown: createProgress() } },
      { relationships: { unknown: { affinity: 60 } } }, { relationships: { 'guan-yu': { affinity: 101 } } },
      { relationships: { 'guan-yu': { affinity: 60, lastInteraction: 9999999 } } },
      { battleParty: ['traveler'] },
    ] as Partial<GameState>[]) {
      saveState({ ...base, ...patch }); expect(loadState()).toBeNull();
    }
    const battle = { ...base, phase: 'battle' as const, battleParty: [...base.deployed] };
    saveState(battle); expect(loadState()).toEqual(battle);
    saveState({ ...battle, battleParty: ['traveler'] }); expect(loadState()).toBeNull();
  });
  it('awards only deployed fighters and excludes a trained reserve from politics supplies', () => {
    const base = stateInZhuo();
    const reserve = createProgress(2); reserve.attributes.politics = 13; reserve.points = 0;
    const state = setDeployment({ ...base, party: { ...base.party, aman: reserve, 'guan-yu': createProgress() } }, ['traveler', 'guan-yu']);
    const rewarded = rewardVictory(state, 'ambush');
    expect(rewarded.party['guan-yu'].level).toBe(2);
    expect(rewarded.party.aman).toBe(reserve);
    expect(rewarded.party['chen-da']).toBe(base.party['chen-da']);
    expect(rewarded.supplies).toBe(state.supplies);
    expect(rewardVictory(rewarded, 'ambush')).toBe(rewarded);
  });
  it('freezes a travel battle lineup, locks its pending event and releases the snapshot after settlement', () => {
    const started = startTravel(stateInZhuo(), 'nanhai', 8);
    const trip = { ...started, journey: { ...started.journey!, event: { id: 0, kind: 'bandits' as const } } };
    expect(setDeployment(trip, ['traveler'])).toBe(trip);
    expect(interactPerson(trip, 'guan-yu', 'talk')).toBe(trip);
    const battle = { ...resolveTravelEvent(acknowledgeTravelCg(trip), 'fight'), battleParty: [...trip.deployed] };
    saveState(battle); expect(loadState()).toEqual(battle);
    const settled = finishTravelBattle(battle, true);
    expect(settled.battleParty).toBeUndefined();
    saveState(settled); expect(loadState()).toEqual(settled);
  });
});
