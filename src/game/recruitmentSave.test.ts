import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState, rewardVictory, saveState, STORAGE_KEY, type GameState } from './state';
import { createProgress } from './growth';
import { advanceDays } from './history';
import { initialRelationships, interactPerson, invitePerson, setDeployment } from './recruitment';
import { RECRUIT_PROFILES } from './recruitmentCatalog';
import { cityServices, getRecruitmentThreshold, serviceForPerson } from './cityService';
import { personPosting } from './personPosting';
import { createWorldConflict, isWorldConflict } from './worldConflict';
import { acknowledgeTravelCg, finishTravelBattle, resolveTravelEvent, startTravel } from './travel';
import { createLifeState, lifeBaseline } from './personLife';
import { PERSON_LIFE_BASELINES } from './personLifeData';

beforeEach(() => {
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
});
const stateInZhuo = (): GameState => ({ ...createInitialState(), phase: 'overworld' as const, currentCityId: 'zhuo' });
const datedWorld = (state: GameState): GameState => {
  const life = createLifeState(state.date,23);
  // Exercise every invitation while all otherwise eligible people get the latest legal lifespan.
  for (const person of PERSON_LIFE_BASELINES) life.people[person.id].deathYear = person.deathBaseYear + 5;
  life.handledIds = PERSON_LIFE_BASELINES.filter(person => state.date.year >= life.people[person.id].deathYear).map(person => person.id);
  const worldConflict = createWorldConflict(state.date, Object.keys(state.party),undefined,life);
  // This roster fixture uses institution-led armies, leaving named people available in town.
  worldConflict.armies = worldConflict.armies.map(army => { const { commanderId: _commander, ...institution } = army; return institution; });
  return { ...state, life, worldConflict };
};
const atXiapi = (patch: Partial<GameState> = {}): GameState => {
  const state = datedWorld({ ...stateInZhuo(), currentCityId: 'xiapi', date: { year: 196, month: 6, day: 1 }, ...patch });
  state.worldConflict!.cities.xiapi.factionId = 'lu-bu';
  return state;
};
describe('persistent recruited roster and combat rewards', () => {
  it('roundtrips independent city captains and rejects read-only or invalid garrison party IDs', () => {
    const base = stateInZhuo();
    const state = { ...base, party: { ...base.party, 'garrison:zhuo:captain': createProgress(2, 7), 'garrison:ye:captain': createProgress(3, 9) },
      relationships: { ...base.relationships, 'garrison:zhuo:captain': { affinity: 81, lastInteraction: 60 }, 'garrison:ye:captain': { affinity: 23 } }, deployed: ['traveler', 'garrison:zhuo:captain'] };
    saveState(state);
    expect(loadState()).toEqual(state);
    for (const id of ['himiko', 'garrison:zhuo:soldier', 'garrison:unknown:captain', 'garrison:ye:general', 'garrison:ye:captain:extra', 'constructor']) {
      saveState({ ...base, party: { ...base.party, [id]: createProgress() } });
      expect(loadState(), id).toBeNull();
    }
  });
  it('migrates 0.2 saves to their original three fighters and retains all prior progress', () => {
    const state = createInitialState();
    const { deployed: _deployed, relationships: _relations, ...old } = { ...state, party: { ...state.party, traveler: createProgress(3, 20) } };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(old));
    expect(loadState()).toEqual({ ...old, deployed: ['traveler', 'aman', 'chen-da'], relationships: initialRelationships() });
  });
  it('supports recruitment of every catalog identity beyond initial companions', () => {
    for (const profile of RECRUIT_PROFILES.filter(p => p.category !== 'initial' && !p.readOnly)) {
      const baseline = lifeBaseline(profile.id);
      const first = profile.windows.find(window => Math.max(window.from.year,(baseline?.birthYear ?? 0)+16) <= (window.to?.year ?? 310) && Math.max(window.from.year,(baseline?.birthYear ?? 0)+16) < (baseline ? baseline.deathBaseYear+5 : Infinity))!;
      expect(first,profile.id).toBeDefined();
      const year = Math.max(first.from.year,(baseline?.birthYear ?? 0)+16);
      const base = datedWorld({ ...stateInZhuo(), currentCityId: first.cityIds[0], date: { year, month: year===first.from.year ? first.from.month ?? 1 : 1, day: 1 } });
      base.currentCityId = personPosting(base, profile.id)?.cityId ?? base.currentCityId;
      expect(isWorldConflict(base.worldConflict, base.date, Object.keys(base.party),base.life), profile.id).toBe(true);
      const state = { ...base, relationships: { [profile.id]: { affinity: getRecruitmentThreshold(base, profile.id) } } };
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
  it('rebuilds appointments on reload without persistent jobs or overwriting old and recruited growth', () => {
    const base = atXiapi({ relationships: { 'chen-gong': { affinity: 79 }, 'gao-shun': { affinity: 80 } } });
    const state = { ...base, party: { ...base.party, traveler: createProgress(3, 20) } };
    saveState(state);
    const restored = loadState()!;
    expect(restored).toEqual(state);
    expect(getRecruitmentThreshold(restored, 'chen-gong')).toBe(80);
    expect(invitePerson(restored, 'chen-gong')).toBe(restored);
    const recruited = invitePerson(restored, 'gao-shun');
    const trained = { ...recruited, party: { ...recruited.party, 'gao-shun': createProgress(2, 7) } };
    saveState(trained);
    const reloaded = loadState()!;
    expect(reloaded).toEqual(trained);
    expect(reloaded.party.traveler).toEqual(createProgress(3, 20));
    expect(reloaded.party['gao-shun']).toEqual(createProgress(2, 7));
    expect(serviceForPerson(reloaded, 'gao-shun')).toBeUndefined();
    expect(cityServices({ ...reloaded, worldConflict: undefined, date: { year: 198, month: 12, day: 30 } }, 'xiapi').map(person => person.personId)).toEqual(['chen-gong', 'garrison:xiapi:soldier', 'garrison:xiapi:captain']);
    expect(Object.keys(reloaded)).not.toContain('cityServices');
  });
  it('preserves affinity and waiting status when a recruited employer is loaded from saved party', () => {
    const state = atXiapi({ party: { ...stateInZhuo().party, 'lu-bu': createProgress(2, 5) },
      relationships: { 'chen-gong': { affinity: 60 }, 'lu-bu': { affinity: 60 } } });
    saveState(state);
    const restored = loadState()!;
    expect(restored).toEqual(state);
    expect(serviceForPerson(restored, 'chen-gong')).toMatchObject({ kind: 'waiting', cityId: 'xiapi' });
    expect(getRecruitmentThreshold(restored, 'chen-gong')).toBe(60);
    expect(invitePerson(restored, 'chen-gong').party['chen-gong']).toBeDefined();
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
