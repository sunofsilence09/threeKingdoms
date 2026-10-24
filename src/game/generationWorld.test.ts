import { describe, expect, it } from 'vitest';
import oldSaves from './fixtures/v08-saves.json';
import { createInitialState } from './state';
import { createWorldConflict, isWorldConflict, migrateWorldConflict, advanceWorldConflict } from './worldConflict';
import { LEGACY_CITY_IDS, WORLD_CITIES } from './world';

describe('sixty-city strategic save migration', () => {
  it('recognizes a genuine36city world, preserves its stocks and RNG and adds an audited120000troops once', () => {
    const old = oldSaves.city200;
    const migrated = migrateWorldConflict(old.worldConflict, old.date, Object.keys(old.party));
    expect(migrated).not.toBeNull();
    expect(migrated!.version).toBe(2);
    expect(Object.keys(migrated!.cities)).toHaveLength(60);
    for (const id of LEGACY_CITY_IDS) expect(migrated!.cities[id]).toEqual(old.worldConflict.cities[id as keyof typeof old.worldConflict.cities]);
    expect(migrated!.seed).toBe(old.worldConflict.seed);
    expect(migrated!.armies).toEqual(old.worldConflict.armies);
    expect(migrated!.lastDay).toBe(old.worldConflict.lastDay);
    expect(migrated!.ledger).toEqual({ ...old.worldConflict.ledger, expansion: 120000 });
    expect(isWorldConflict(migrated, old.date, Object.keys(old.party))).toBe(true);
    expect(migrateWorldConflict(migrated, old.date, Object.keys(old.party))).toEqual(migrated);
  });
  it('rejects truncated old worlds and forged troop accounts rather than filling arbitrary holes', () => {
    const old = oldSaves.city200;
    const missing = structuredClone(old.worldConflict);
    delete (missing.cities as Record<string, unknown>).ye;
    expect(migrateWorldConflict(missing, old.date, Object.keys(old.party))).toBeNull();
    expect(migrateWorldConflict({ ...old.worldConflict, ledger: { ...old.worldConflict.ledger, initial: 0 } }, old.date, Object.keys(old.party))).toBeNull();
  });
  it('initializes only added cities from the migration era without forcing a later conquest',()=>{
    const old=oldSaves.city248;
    const next=migrateWorldConflict(old.worldConflict,old.date,Object.keys(old.party))!;
    expect(next.cities.moling).toMatchObject({factionId:'sun',troops:5000});
    expect(next.cities.echeng.factionId).toBe('sun');
    expect(next.cities.jixian.factionId).toBe('cao');
    expect(next.cities.zitong.factionId).toBe('liu');
    const unchanged=advanceWorldConflict(next,{year:280,month:1,day:1},Object.keys(old.party));
    // Institutions may win or lose in the simulation; the scene initializer is never replayed.
    expect(unchanged.ledger.expansion).toBe(120000);
    expect(unchanged.ledger.initial).toBe(old.worldConflict.ledger.initial);
  },20000);
  it('creates and advances a complete version2world through310', () => {
    const state = createInitialState(() => 0);
    const world = createWorldConflict({ year: 309, month: 12, day: 29 }, Object.keys(state.party));
    expect(WORLD_CITIES).toHaveLength(60);
    expect(world.version).toBe(2);
    const next = advanceWorldConflict(world, { year: 310, month: 1, day: 1 }, Object.keys(state.party));
    expect(isWorldConflict(next, { year: 310, month: 1, day: 1 }, Object.keys(state.party))).toBe(true);
  });
});
