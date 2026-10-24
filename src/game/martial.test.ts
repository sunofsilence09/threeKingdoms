import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { createProgress } from './growth';
import { advanceDays } from './history';
import { withWorldDate } from './worldTime';
import { MARTIAL_CATALOG, martialAt, martialForPerson } from './martialCatalog';
import { canRequestTeaching, createMartialProgress, equipMartial, isDuelEncounter, isMartialProgress, requestTeaching, settleDuel, startDuel, teachingChance } from './martial';

const ready = (affinity = 80, seed = 12345) => ({ ...createInitialState(() => 0), worldConflict: undefined, phase: 'overworld' as const, currentCityId: 'zhuo', relationships: { 'guan-yu': { affinity } }, martial: { ...createMartialProgress(), seed } });
describe('historically inspired martial catalog', () => {
  it('gives all 47 named people distinct designs across eleven executable templates', () => {
    expect(MARTIAL_CATALOG).toHaveLength(47);
    expect(new Set(MARTIAL_CATALOG.map(s => s.id)).size).toBe(47);
    expect(new Set(MARTIAL_CATALOG.map(s => s.name)).size).toBe(47);
    expect(new Set(MARTIAL_CATALOG.map(s => s.personId)).size).toBe(47);
    expect(new Set(MARTIAL_CATALOG.map(s => s.template)).size).toBe(11);
    expect(MARTIAL_CATALOG.every(s => s.source && s.basis && s.description && s.cooldown === 3)).toBe(true);
    expect(martialForPerson('himiko')?.readOnly).toBe(true);
    expect(martialForPerson('diao-chan')?.story).toBe(true);
    expect(martialForPerson('aman')).toBeUndefined();
  });
});
describe('persistent martial learning', () => {
  it('requires affinity80, real contact and preserves an isolated probability curve', () => {
    expect(canRequestTeaching(ready(79), 'guan-yu')).toBe(false);
    expect(teachingChance(ready(80), 'guan-yu')).toBe(30);
    expect(teachingChance(ready(100), 'guan-yu')).toBe(50);
    expect(canRequestTeaching(ready(), 'guan-yu')).toBe(true);
    expect(canRequestTeaching({ ...ready(), currentCityId: 'nanhai' }, 'guan-yu')).toBe(false);
    expect(canRequestTeaching({ ...ready(), currentCityId: 'nanhai', party: { ...ready().party, 'guan-yu': createProgress() } }, 'guan-yu')).toBe(true);
    expect(canRequestTeaching(ready(100), 'himiko')).toBe(false);
  });
  it('persists a failed roll and day cost, blocks refresh/repeat and does not charge a known skill', () => {
    const state = ready(80, 100000);
    const next = requestTeaching(state, 'guan-yu');
    expect(next.date).toEqual({ year: 184, month: 3, day: 2 });
    expect(next.martial.lastResult?.outcome).toBe('declined');
    expect(next.relationships).toEqual(state.relationships);
    expect(next.martial.seed).not.toBe(state.martial.seed);
    expect(requestTeaching(JSON.parse(JSON.stringify(next)), 'guan-yu')).toEqual(next);
    const known = { ...state, martial: { ...state.martial, learned: [martialForPerson('guan-yu')!.id] } };
    expect(requestTeaching(known, 'guan-yu')).toBe(known);
  });
  it('applies30% and50% teaching thresholds to the same saved roll, and40% at duel settlement', () => {
    expect(requestTeaching(ready(80,423),'guan-yu').martial.lastResult?.outcome).toBe('declined');
    expect(requestTeaching(ready(100,423),'guan-yu').martial.lastResult?.outcome).toBe('learned');
    expect(settleDuel(startDuel(ready(0,34829),'guan-yu'),true).martial.lastResult?.outcome).toBe('declined');
    expect(settleDuel(startDuel(ready(0,4279),'guan-yu'),true).martial.lastResult?.outcome).toBe('learned');
  });
  it('only equips three distinct learned skills outside battle', () => {
    const ids = MARTIAL_CATALOG.slice(0,4).map(s => s.id);
    const state = { ...ready(), martial: { ...createMartialProgress(), learned: ids } };
    expect(equipMartial(state, ids)).toBe(state);
    expect(equipMartial(state, [ids[0], ids[0]])).toBe(state);
    expect(equipMartial(state, ['unknown'])).toBe(state);
    expect(equipMartial({ ...state, phase: 'battle' }, [ids[0]]).martial.equipped).toEqual([]);
    expect(equipMartial(state, ids.slice(0,3)).martial.equipped).toEqual(ids.slice(0,3));
  });
  it('retains each learned skill acquisition after later attempts overwrite the notice', () => {
    const first = requestTeaching(ready(100,12345),'guan-yu');
    const skill = martialForPerson('guan-yu')!.id;
    expect(first.martial.acquisitions[skill]).toMatchObject({ kind:'teaching',teacherId:'guan-yu',date:first.date });
    const second = requestTeaching({ ...first,party:{...first.party,'zhang-fei':createProgress()},relationships:{...first.relationships,'zhang-fei':{affinity:100}} },'zhang-fei');
    expect(second.martial.acquisitions[skill]).toEqual(first.martial.acquisitions[skill]);
  });
  it('saves a paid hero-only duel, awards no XP and settles its roll exactly once', () => {
    const state = ready(0, 12345);
    const duel = startDuel(state, 'guan-yu');
    expect(duel.duel?.teacherId).toBe('guan-yu');
    expect(duel.phase).toBe('battle');
    expect(duel.battleParty).toEqual(['traveler']);
    expect(duel.date.day).toBe(2);
    expect(isDuelEncounter(duel.duel, duel.date)).toBe(true);
    expect(startDuel(duel, 'guan-yu')).toBe(duel);
    const won = settleDuel(duel, true);
    expect(won.martial.learned).toContain(martialForPerson('guan-yu')!.id);
    expect(won.party).toEqual(state.party);
    expect(won.supplies).toBe(state.supplies);
    expect(won.flags).toEqual(state.flags);
    expect(won.phase).toBe('overworld');
    expect(won.duel).toBeUndefined();
    expect(won.martial.settled).toContain(duel.duel!.id);
    expect(settleDuel(won, true)).toBe(won);
    expect(settleDuel({ ...won, duel: duel.duel }, true)).toBeDefined();
    expect(settleDuel({ ...won, duel: duel.duel }, true).martial.seed).toBe(won.martial.seed);
    expect(settleDuel(startDuel(ready(0), 'guan-yu'), false).martial.learned).toEqual([]);
  });
  it('uses40% duel transmission, rejects unknown data, future dates and duplicate equipment', () => {
    const state = startDuel(ready(0, 100000), 'guan-yu');
    expect(settleDuel(state, true).martial.lastResult?.outcome).toBe('declined');
    const progress = createMartialProgress();
    expect(isMartialProgress(progress, ready().date)).toBe(true);
    expect(isMartialProgress({ ...progress, learned: ['bad'] })).toBe(false);
    const id = martialForPerson('guan-yu')!.id;
    expect(martialAt(id)?.personId).toBe('guan-yu');
    expect(isMartialProgress({ ...progress, learned: [id], equipped: [id,id] })).toBe(false);
    expect(isMartialProgress({ ...progress, teachingDates: { 'guan-yu': { year:184,month:3,day:3 } } }, ready().date)).toBe(false);
  });
  it('rejects interrupted contact, malformed clocks and forged settlements without consuming anything', () => {
    const state = ready(100);
    expect(requestTeaching({ ...state,phase:'battle' },'guan-yu').date).toEqual(state.date);
    const journey = { ...state,journey: { event:{kind:'ambush'} } } as unknown as typeof state;
    expect(requestTeaching(journey,'guan-yu')).toBe(journey);
    for (const seed of [-1,1.5,4294967296,NaN]) expect(isMartialProgress({...state.martial,seed})).toBe(false);
    for (const invalid of [{year:184,month:13,day:1},{year:184,month:3,day:0}]) expect(isMartialProgress({...state.martial,challengeDates:{'guan-yu':invalid}})).toBe(false);
    expect(isMartialProgress({...state.martial,settled:['duel-1-2','duel-1-2']})).toBe(false);
    const paid = startDuel(state,'guan-yu');
    const forged = {...paid,duel:{...paid.duel!,teacherId:'zhang-fei'}};
    expect(settleDuel(forged,true)).toBe(forged);
    const mismatched = {...paid.duel!,id:'duel-999-3'};
    expect(isDuelEncounter(mismatched,paid.date)).toBe(false);
  });
  it('does not let learning draw from the strategic stream, or allow a native read-only skill as equipment', () => {
    const state = { ...ready(),worldConflict:createInitialState(() => 0).worldConflict };
    const advanced = withWorldDate(state,advanceDays(state.date,1));
    expect(requestTeaching(state,'guan-yu').worldConflict).toEqual(advanced.worldConflict);
    const himiko = martialForPerson('himiko')!.id;
    const forged = {...state,martial:{...state.martial,learned:[himiko]}};
    expect(equipMartial(forged,[himiko])).toBe(forged);
  });
});
