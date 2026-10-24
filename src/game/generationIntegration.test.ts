import { describe, expect, it } from 'vitest';
import { createInitialState, completeLocalEscort } from './state';
import { createLifeState, isLifeState } from './personLife';
import { createProgress } from './growth';
import { withWorldDate } from './worldTime';
import { createWorldConflict, dispatchConflictArmy, isWorldConflict } from './worldConflict';

function campaign(year: number, month = 12, day = 30) {
  const date = { year, month, day };
  const initial = createInitialState(() => 0);
  const life = createLifeState(date, 42);
  life.people['zhou-yu'].deathYear = 210;
  return { ...initial, date, life, phase: 'overworld' as const,
    party: { ...initial.party, 'zhou-yu': createProgress() }, deployed: ['traveler', 'zhou-yu'],
    relationships: { ...initial.relationships, 'zhou-yu': { affinity: 90 } },
    worldConflict: createWorldConflict(date, ['traveler', 'zhou-yu'], 99, life) };
}
describe('lifespans across the shared game clock', () => {
  it('archives at Jan1 once, retains learned arts and produces identical bulk and daily results', () => {
    const state = campaign(209);
    state.martial.learned = ['martial-zhou-yu'];
    const next = withWorldDate(state, { year: 210, month: 1, day: 1 });
    expect(next.party['zhou-yu']).toBeUndefined();
    expect(next.deployed).toEqual(['traveler']);
    expect(next.life?.memorials['zhou-yu'].progress).toEqual(state.party['zhou-yu']);
    expect(next.martial).toBe(state.martial);
    expect(next.life?.notices.filter(n => n.id === 'zhou-yu')).toHaveLength(1);
    expect(isLifeState(next.life, next.date)).toBe(true);
    expect(withWorldDate(next, next.date)).toBe(next);
    const bulk = withWorldDate(state, { year: 210, month: 1, day: 3 });
    const daily = withWorldDate(withWorldDate(next, { year: 210, month: 1, day: 2 }), { year: 210, month: 1, day: 3 });
    expect(bulk).toEqual(daily);
  });
  it('processes deaths even while a damaged strategic world is paused', () => {
    const state = { ...campaign(209), worldConflict: undefined, conflictRecovery: true };
    const next = withWorldDate(state, { year: 210, month: 1, day: 1 });
    expect(next.party['zhou-yu']).toBeUndefined(); expect(next.conflictRecovery).toBe(true);
    expect(next.worldConflict).toBeUndefined();
  });
  it('grants battle growth before a companion is archived during postbattle time',()=>{
    const state={...campaign(209),battleParty:['traveler','zhou-yu']};
    const next=completeLocalEscort(state);
    expect(next.party['zhou-yu']).toBeUndefined();
    expect(next.life!.memorials['zhou-yu'].progress.level).toBe(2);
    expect(next.life!.memorials['zhou-yu'].progress.xp).toBe(25);
    expect(next.flags['xp:escort']).toBe(true);
    expect(completeLocalEscort(next)).toBe(next);
  });
  it('removes dead commanders at the boundary without deleting or adding troops', () => {
    const state = campaign(209); const life = state.life;
    const world = createWorldConflict(state.date, [], 123, life);
    for (const c of Object.values(world.cities)) { delete c.governorId; c.factionId = 'han'; }
    world.cities.wujun.factionId = 'sun';
    const army = dispatchConflictArmy(world, 'wujun', 'danyang', [], life);
    expect(army.armies.some(a => a.commanderId === 'zhou-yu')).toBe(true);
    const next = withWorldDate({ ...state, party: createInitialState().party, worldConflict: army }, { year: 210, month: 1, day: 1 });
    expect(next.worldConflict!.armies.some(a => a.commanderId === 'zhou-yu')).toBe(false);
    expect(next.worldConflict!.ledger.initial).toBe(army.ledger.initial);
    expect(next.worldConflict!.ledger.raised).toBe(army.ledger.raised);
    expect(next.worldConflict!.ledger.losses).toBe(army.ledger.losses);
    // Jan1 also legitimately supplies the ordinary monthly levy.
    expect(next.worldConflict!.ledger.recruited-army.ledger.recruited).toBeGreaterThanOrEqual(0);
    expect(next.worldConflict!.armies.map(a => a.troops)).toEqual(army.armies.map(a => a.troops));
    expect(isWorldConflict(next.worldConflict, next.date, Object.keys(next.party), life)).toBe(true);
  });
});
