import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from './state';
import { WORLD_CITIES } from './world';
import { personPosting } from './personPosting';
import { canMeetPerson, RECRUIT_PROFILES } from './recruitmentCatalog';
import { cityGarrison } from './garrisonArmy';
import { cityServices, getRecruitmentThreshold, serviceForPerson } from './cityService';
import { canInteractPerson, invitePerson } from './recruitment';
import { createProgress } from './growth';
import type { WorldConflict } from './worldConflictTypes';
import { isWorldConflict, createWorldConflict } from './worldConflict';

const fixture = (): GameState => {
  const date = { year: 196, month: 6, day: 1 };
  const snapshot=createWorldConflict(date);
  const world: WorldConflict = { version: 3, nextPrefectId: 1, prefectIds: [], lastDay: 4470, seed: 42, nextArmyId: 2, nextReportId: 1,
    cities: Object.fromEntries(WORLD_CITIES.map(city => [city.id, { factionId: 'han', troops: 5000, occupationDay: -1 }])),
    armies: [], founded: snapshot.founded, nextDecision: snapshot.nextDecision, reports: [], ledger: { initial: 180000, recruited: 0, raised: 0, losses: 0 } };
  world.cities.xiapi = { factionId: 'lu-bu', troops: 1234, occupationDay: -1, governorId: 'lu-bu' };
  world.cities.donghai = { factionId: 'lu-bu', troops: 4321, occupationDay: -1 };
  world.ledger.initial = Object.values(world.cities).reduce((total, city) => total + city.troops, 0);
  return { ...createInitialState(() => 0), life: undefined, phase: 'overworld', currentCityId: 'xiapi', date, worldConflict: world };
};

describe('current personnel projection', () => {
  it.each([
    ['han-dang', 'sun-jian', 'nanyang', 184],
    ['xiahou-dun', 'cao-cao', 'chenliu', 189],
  ] as const)('releases %s to waiting 60 when its employer joins before founding', (id, employerId, cityId, year) => {
    const date = { year, month: 3, day: 1 };
    const initial = createInitialState(() => 0);
    const state: GameState = { ...initial, phase: 'overworld', currentCityId: cityId, date,
      worldConflict: createWorldConflict(date), relationships: { [id]: { affinity: 60 } } };
    expect(getRecruitmentThreshold(state, id)).toBe(80);
    expect(invitePerson(state, id)).toBe(state);
    const owned = { ...state, party: { ...state.party, [employerId]: createProgress() } };
    expect(personPosting(owned, id)).toMatchObject({ cityId, kind: 'waiting', office: '待聘' });
    expect(serviceForPerson(owned, id)?.employerId).toBeUndefined();
    expect(getRecruitmentThreshold(owned, id)).toBe(60);
    expect(invitePerson(owned, id).party[id]).toBeDefined();
  });

  it('keeps pre-foundation Liu and Sun people available without granting them cities', () => {
    const state = createInitialState(() => 0); state.phase = 'overworld'; state.currentCityId = 'zhuo';
    expect(personPosting(state, 'guan-yu')).toMatchObject({ cityId: 'zhuo', kind: 'free' });
    expect(canMeetPerson('guan-yu', 'zhuo', state.date, state)).toBe(true);
    expect(canMeetPerson('guan-yu', 'donghai', state.date, state)).toBe(false);
    expect(canInteractPerson(state, 'guan-yu')).toBe(true);
    expect(personPosting(state, 'sun-jian')?.kind).toBe('free');
    expect(Object.values(state.worldConflict!.cities).every(city => city.factionId === 'han')).toBe(true);
  });

  it('replaces an invited governor on the same day without changing stocks',()=>{
    const state={...createInitialState(()=>0),phase:'overworld' as const,currentCityId:'moling'};
    const id=state.worldConflict!.cities.moling.governorId!;
    expect(isWorldConflict(state.worldConflict,state.date,Object.keys(state.party),state.life)).toBe(true);
    const before=JSON.stringify(state.worldConflict);
    const invited=invitePerson({...state,relationships:{[id]:{affinity:80}}},id);
    expect(invited.party[id]).toBeDefined();
    expect(invited.worldConflict!.cities.moling.governorId).not.toBe(id);
    expect(invited.worldConflict!.cities.moling.troops).toBe(state.worldConflict!.cities.moling.troops);
    expect(invited.worldConflict!.seed).toBe(state.worldConflict!.seed);
    expect(invited.date).toEqual(state.date);expect(JSON.stringify(state.worldConflict)).toBe(before);
    expect(isWorldConflict(invited.worldConflict,invited.date,Object.keys(invited.party),invited.life)).toBe(true);
    expect(cityGarrison(invited).prefectLabel).toContain('游戏人物');
  });
  it('reads conquered stocks and institutions without keeping the former governor', () => {
    const state = fixture();
    state.worldConflict!.cities.xiapi = { factionId: 'cao', troops: 777, occupationDay: 4490, governorId: 'lu-bu' };
    expect(cityGarrison(state)).toMatchObject({ troops: 777, factionId: 'cao', captainPresent: true });
    expect(cityGarrison(state).prefectLabel).toContain('曹');
    expect(cityGarrison(state).prefectLabel).not.toContain('吕布');
    expect(personPosting(state, 'chen-gong')).toMatchObject({ cityId: 'donghai', factionId: 'lu-bu', kind: 'employed' });
    expect(canMeetPerson('chen-gong', 'xiapi', state.date, state)).toBe(false);
    expect(canMeetPerson('chen-gong', 'donghai', state.date, state)).toBe(true);
    expect(canInteractPerson(state, 'chen-gong')).toBe(false);
    expect(invitePerson({ ...state, relationships: { 'chen-gong': { affinity: 100 } } }, 'chen-gong').party['chen-gong']).toBeUndefined();
    expect(serviceForPerson(state, 'garrison:xiapi:captain')?.office).toContain('曹');
    expect(cityServices(state).filter(person => person.personId === 'chen-gong')).toHaveLength(1);
  });

  it('uses preferred friendly cities then nearest owned base and disperses when all are lost', () => {
    const state = fixture();
    expect(personPosting(state, 'chen-gong')?.cityId).toBe('xiapi');
    state.worldConflict!.cities.xiapi.factionId = 'yuan-shu';
    expect(personPosting(state, 'chen-gong')?.cityId).toBe('donghai');
    state.worldConflict!.cities.donghai.factionId = 'cao';
    expect(personPosting(state, 'chen-gong')).toMatchObject({ kind: 'dispersed', factionId: 'lu-bu' });
    expect(personPosting(state, 'chen-gong')?.cityId).toBeUndefined();
    expect(canMeetPerson('chen-gong', 'xiapi', state.date, state)).toBe(false);
    expect(canMeetPerson('chen-gong', 'xiapi', state.date)).toBe(true);
    expect(serviceForPerson(state, 'chen-gong')).toBeUndefined();
  });

  it('keeps army commanders out of city invitations and owned people out of all postings', () => {
    const state = fixture();
    state.worldConflict!.armies.push({ id: 'army:1', factionId: 'lu-bu', commanderId: 'chen-gong', sourceCityId: 'xiapi', targetCityId: 'guangling', troops: 3000, contributions: [{ cityId: 'xiapi', troops: 3000 }], phase: 'marching', path: ['xiapi', 'guangling'], legIndex: 0, legDay: 1, phaseDays: 0 });
    expect(personPosting(state, 'chen-gong')).toMatchObject({ kind: 'campaign', factionId: 'lu-bu' });
    expect(canMeetPerson('chen-gong', 'xiapi', state.date, state)).toBe(false);
    expect(serviceForPerson(state, 'chen-gong')).toBeUndefined();
    state.party['chen-gong'] = createProgress();
    expect(personPosting(state, 'chen-gong')).toBeUndefined();
    expect(cityServices(state).some(person => person.personId === 'chen-gong')).toBe(false);
    expect(canInteractPerson(state, 'chen-gong')).toBe(true);
  });

  it('retains captain waiting 60 until new occupation restores institution 80, without replacements', () => {
    const state = fixture(); state.date = { year: 190, month: 6, day: 1 }; state.currentCityId = 'xiangyang';
    state.worldConflict!.cities.xiangyang = { factionId: 'liu-biao', troops: 2222, occupationDay: -1, governorId: 'liu-biao' };
    state.party['liu-biao'] = createProgress();
    const id = 'garrison:xiangyang:captain';
    expect(getRecruitmentThreshold(state, id)).toBe(60);
    state.worldConflict!.cities.xiangyang = { factionId: 'cao', troops: 1111, occupationDay: 2000 };
    expect(getRecruitmentThreshold(state, id)).toBe(80);
    expect(invitePerson({ ...state, relationships: { [id]: { affinity: 79 } } }, id)).toMatchObject({ party: state.party });
    const invited = invitePerson({ ...state, relationships: { [id]: { affinity: 80 } } }, id);
    expect(invited.party[id]).toBeDefined();
    expect(cityGarrison(invited).captainPresent).toBe(false);
    expect(cityGarrison(invited).troops).toBe(1111);
    expect(serviceForPerson(JSON.parse(JSON.stringify(invited)), id)).toBeUndefined();
    expect(canInteractPerson(state, 'garrison:xiangyang:soldier')).toBe(false);
    expect(canInteractPerson(state, 'himiko')).toBe(false);
  });

  it('preserves unaffiliated windows, activity boundaries and the unchanged registry', () => {
    const state = fixture(); state.date = { year: 207, month: 6, day: 1 };
    expect(canMeetPerson('cai-yan', 'chenliu', state.date, state)).toBe(true);
    expect(canMeetPerson('cai-yan', 'xuxian', state.date, state)).toBe(true);
    expect(personPosting({ ...state, date: { year: 184, month: 6 } }, 'sun-ce')).toBeUndefined();
    expect(RECRUIT_PROFILES).toHaveLength(237);
    expect(new Set(RECRUIT_PROFILES.map(person => person.id)).size).toBe(237);
  });
});
