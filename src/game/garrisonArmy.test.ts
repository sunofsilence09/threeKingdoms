import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { WORLD_CITIES } from './world';
import { cityGarrison, garrisonTroopsAt, GARRISON_CAP } from './garrisonArmy';
import { serviceForPerson } from './cityService';
import { createLifeState } from './personLife';
import { createWorldConflict } from './worldConflict';

describe('independent city garrisons', () => {
  it('starts every city with five thousand troops and its own captain', () => {
    const state = { ...createInitialState(() => 0), worldConflict: undefined };
    const armies = WORLD_CITIES.map(city => cityGarrison(state, city.id));
    expect(armies).toHaveLength(60); expect(new Set(armies.map(army => army.captainId)).size).toBe(60);
    for (const army of armies) { expect(army.troops).toBe(5000); expect(army.strength.hp).toBe(50000); expect(army.captainPresent).toBe(true); }
  });
  it('shows joint management and a vacant captain position after he joins without taking the army away', () => {
    const state = { ...createInitialState(() => 0), worldConflict: undefined }; state.currentCityId = 'xiangyang'; state.date = { year: 190, month: 1 };
    expect(cityGarrison(state).prefectLabel).toContain('刘表');
    const troops = cityGarrison(state).troops;
    state.party['garrison:xiangyang:captain'] = { ...state.party.aman };
    expect(cityGarrison(state).captainPresent).toBe(false); expect(cityGarrison(state).troops).toBe(troops);
    state.party['liu-biao'] = { ...state.party.aman };
    expect(cityGarrison(state).prefectLabel).toContain('已同行');
    expect(serviceForPerson(state, 'garrison:xiangyang:soldier')?.kind).toBe('employed');
    expect(serviceForPerson(state, 'garrison:xiangyang:soldier')?.office).toContain('守备');
    expect(cityGarrison(state, 'jiangling').captainPresent).toBe(true);
  });
  it('does not assign an unrelated city contact as the prefect', () => {
    const state = { ...createInitialState(() => 0), worldConflict: undefined }; state.date = { year: 195, month: 1 };
    expect(cityGarrison(state, 'julu').prefectLabel).not.toContain('张燕');
    expect(cityGarrison(state, 'changan').prefectLabel).not.toContain('马腾');
    expect(() => cityGarrison(state, '__proto__')).toThrow();
  });
  it('shows an institution after the historical prefect dies even during world recovery', () => {
    const date = { year:207,month:1,day:1 }, life=createLifeState(date,23);
    life.people['liu-biao'].deathYear=203;
    const state={ ...createInitialState(()=>0),date,life,currentCityId:'xiangyang',worldConflict:undefined,conflictRecovery:true };
    expect(cityGarrison(state).prefectLabel).not.toContain('刘表');
    expect(cityGarrison(state).troops).toBe(garrisonTroopsAt('xiangyang',date).troops);
    expect(cityGarrison(state).captainPresent).toBe(true);
  });
  it('keeps a child political ruler out of field-army command', () => {
    const date={year:239,month:6,day:1},life=createLifeState(date,23);
    expect(date.year-life.people['cao-fang'].birthYear).toBe(7);
    const world=createWorldConflict(date,[],7,life);
    expect(world.armies.some(army=>army.commanderId==='cao-fang')).toBe(false);
  });
  it('advances monthly and applies each local war adjustment once, with stable reload results and a cap', () => {
    expect(garrisonTroopsAt('runan', { year: 184, month: 4 }).troops).toBe(5050);
    expect(garrisonTroopsAt('runan', { year: 185, month: 3 }).troops).toBe(5600);
    expect(garrisonTroopsAt('julu', { year: 184, month: 10 }).troops).toBe(5350);
    expect(garrisonTroopsAt('julu', { year: 184, month: 11 }).troops).toBe(3780);
    const state = { ...createInitialState(() => 0), worldConflict: undefined }; state.currentCityId = 'julu'; state.date = { year: 184, month: 11 };
    expect(cityGarrison(JSON.parse(JSON.stringify(state)))).toEqual(cityGarrison(state));
    expect(garrisonTroopsAt('runan', { year: 9999, month: 12 }).troops).toBe(GARRISON_CAP);
  });
});
