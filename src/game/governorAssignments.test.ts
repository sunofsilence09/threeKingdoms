import {describe,it,expect} from 'vitest';
import {createLifeState} from './personLife';
import {createWorldConflict,advanceWorldConflict,conflictDay,isWorldConflict} from './worldConflict';
import {prefectIdentity} from './prefectIdentity';
const date={year:184,month:3,day:1};
describe('individual city prefects',()=>{
 it('fills all sixty cities with unique adult identities without changing troops',()=>{
  const life=createLifeState(date,17),world=createWorldConflict(date,[],17,life);
  const ids=Object.values(world.cities).map(c=>c.governorId);
  expect(ids.every(Boolean)).toBe(true);expect(new Set(ids).size).toBe(60);
  expect(ids.every(id=>!!prefectIdentity(id))).toBe(true);
  expect(new Set(ids.map(id=>prefectIdentity(id)!.name)).size).toBe(60);
  expect(isWorldConflict(world,date,[],life)).toBe(true);
 });
 it('replaces a recruited prefect on the same day once, without RNG or troop changes',()=>{
  const life=createLifeState(date,17),world=createWorldConflict(date,[],17,life),id=world.cities.moling.governorId!;
  const next=advanceWorldConflict(world,date,[id],life);
  expect(next.cities.moling.governorId).not.toBe(id);expect(world.cities.moling.governorId).toBe(id);
  expect(next.seed).toBe(world.seed);expect(next.ledger).toEqual(world.ledger);
  expect(next.lastDay).toBe(conflictDay(date));expect(advanceWorldConflict(next,date,[id],life)).toBe(next);
 });
 it('appoints a fresh named official after death or conquest without reusing a dead identity',()=>{
  const life=createLifeState(date,17),world=createWorldConflict(date,[],17,life),id=world.cities.moling.governorId!;
  const p=prefectIdentity(id)!;life.people[id]={birthYear:p.birthYear,deathYear:184};
  const next=advanceWorldConflict(world,date,[],life);expect(next.cities.moling.governorId).not.toBe(id);
  next.cities.moling.factionId='sun';
  expect(prefectIdentity(advanceWorldConflict(next,date,[],life).cities.moling.governorId)!.factionId).toBe('sun');
 });
});
