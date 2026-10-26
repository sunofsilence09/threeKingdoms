import {beforeEach,describe,expect,it} from 'vitest';
import {createInitialState,loadState,STORAGE_KEY,saveState,type GameState} from './state';
import {withWorldDate} from './worldTime';
import {invitePerson} from './recruitment';
import {prefectIdentity} from './prefectIdentity';
import {isWorldConflict,createWorldConflict} from './worldConflict';
import {isLifeState,createLifeState,ensureLifePeople} from './personLife';
import {personPosting} from './personPosting';
import {requestTeaching,isMartialProgress,isDuelEncounter} from './martial';
import {martialForPerson} from './martialCatalog';
import oldBattle from './fixtures/v10-active-battle.json';
import oldSaves from './fixtures/v10-saves.json';
let records:Map<string,string>;
beforeEach(()=>{records=new Map();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>records.get(key)??null,setItem:(key:string,value:string)=>records.set(key,value)}});});
describe('1.1 integrated continuity',()=>{
 it('rejects the shared martial catalog owner as a fictional duel participant',()=>{
  expect(isDuelEncounter({id:'duel-61-123',teacherId:'original-prefect',started:{year:184,month:3,day:2},status:'active'},{year:184,month:3,day:2})).toBe(false);
 });
 it('backs up a genuine 1.0 active battle and retains every recorded action and lifespan',()=>{
  const raw=JSON.stringify(oldBattle);records.set(STORAGE_KEY,raw);const state=loadState()!;
  expect(state).toBeTruthy();expect(state.activeBattle).toEqual(oldBattle.activeBattle);
  expect(state.party).toEqual(oldBattle.party);expect(state.economy).toEqual(oldBattle.economy);
  expect(state.worldConflict!.seed).toBe(oldBattle.worldConflict.seed);expect(state.worldConflict!.ledger).toEqual(oldBattle.worldConflict.ledger);
  expect(records.get(`${STORAGE_KEY}:pre-1.1-fullbackup`)).toBe(raw);
  for(const [id,life] of Object.entries(oldBattle.life.people))expect(state.life!.people[id]).toEqual(life);
  expect(state.battleRecovery).not.toBe(true);expect(state.worldConflict!.version).toBe(3);
  expect(loadState()).toEqual(state);
 });
 it.each(Object.entries(oldSaves))('keeps 1.0 %s RPG and strategic stocks',(_key,old)=>{
  records.set(STORAGE_KEY,JSON.stringify(old));const state=loadState()!;expect(state).toBeTruthy();
  expect(state.party).toEqual(old.party);expect(state.economy).toEqual(old.economy);expect(state.martial).toEqual(old.martial);
  expect(state.worldConflict!.seed).toBe(old.worldConflict.seed);expect(state.worldConflict!.armies).toEqual(old.worldConflict.armies);
  for(const [id,c] of Object.entries(old.worldConflict.cities))expect(state.worldConflict!.cities[id]).toMatchObject({factionId:c.factionId,troops:c.troops,occupationDay:c.occupationDay});
  for(const [id,p] of Object.entries(old.life.people))expect(state.life!.people[id]).toEqual(p);
  expect(isLifeState(state.life,state.date)).toBe(true);expect(isWorldConflict(state.worldConflict,state.date,Object.keys(state.party),state.life)).toBe(true);
  expect(loadState()).toEqual(state);
 });
 it('retains every intermediate appointment equally for bulk and daily time advances',()=>{
  const state=createInitialState(()=>0),end={year:185,month:1,day:1};
  const bulk=withWorldDate(state,end);let daily=state;
  for(let day=61;day<=360;day++)daily=withWorldDate(daily,{year:184+Math.floor(day/360),month:Math.floor(day%360/30)+1,day:day%30+1});
  expect(bulk.life!.people).toEqual(daily.life!.people);expect(bulk.worldConflict).toEqual(daily.worldConflict);
 });
 it('replaces a recruited prefect immediately and keeps the new prefect as captain employer',()=>{
  const state={...createInitialState(()=>0),phase:'overworld' as const,currentCityId:'moling'};
  const id=state.worldConflict!.cities.moling.governorId!,before=structuredClone(state);
  const next=invitePerson({...state,relationships:{[id]:{affinity:100}}},id);
  expect(next.party[id]).toBeDefined();expect(next.date).toEqual(state.date);expect(next.worldConflict!.seed).toBe(state.worldConflict!.seed);
  expect(next.worldConflict!.ledger).toEqual(state.worldConflict!.ledger);expect(state).toEqual(before);
  const successor=next.worldConflict!.cities.moling.governorId!;
  expect(successor).not.toBe(id);expect(next.life!.people[successor]).toBeDefined();
  expect(personPosting(next,'garrison:moling:captain')).toMatchObject({kind:'employed',employerId:successor});
  saveState(next);expect(loadState()).toEqual(next);
 });
 it('teaches a shared original civic art and preserves its actual teacher on reload',()=>{
  const state={...createInitialState(()=>0),phase:'overworld' as const,currentCityId:'moling'};
  const id=state.worldConflict!.cities.moling.governorId!,skill=martialForPerson(id)!;
  const next=requestTeaching({...state,martial:{...state.martial,seed:1},relationships:{[id]:{affinity:100}}},id);
  expect(skill.name).toBe('安郡');expect(next.martial.learned).toContain(skill.id);
  expect(next.martial.acquisitions[skill.id].teacherId).toBe(id);expect(isMartialProgress(next.martial,next.date)).toBe(true);
  saveState(next);expect(loadState()).toEqual(next);
 });
 it('archives an invited original official once and maintains sixty living successors',()=>{
  const state={...createInitialState(()=>0),phase:'overworld' as const,currentCityId:'moling'};
  const id=state.worldConflict!.cities.moling.governorId!,identity=prefectIdentity(id)!;
  let next=invitePerson({...state,relationships:{[id]:{affinity:100}}},id);
  next.life!.people[id].deathYear=identity.deathBaseYear;
  next=withWorldDate(next,{year:identity.deathBaseYear,month:1,day:1}) as typeof next;
  expect(next.party[id]).toBeUndefined();expect(next.life!.memorials[id]).toBeDefined();
  const ids=Object.values(next.worldConflict!.cities).map(c=>c.governorId);
  expect(new Set(ids).size).toBe(60);expect(ids).not.toContain(id);
  expect(isLifeState(next.life,next.date)).toBe(true);expect(isWorldConflict(next.worldConflict,next.date,Object.keys(next.party),next.life)).toBe(true);
  saveState(next);expect(loadState()).toEqual(next);
 },20000);
});


it('isolates repaired life eligibility from a structurally valid v3 campaign',()=>{
 const date={year:193,month:1,day:1};let life=createLifeState(date,43);
 const world=createWorldConflict(date,[],123,life);life=ensureLifePeople(life,world.prefectIds);
 expect(world.cities.guangling.governorId).toBe('zhao-yu');
 const state={...createInitialState(()=>0),phase:'overworld' as const,date,life,worldConflict:world};
 const damaged=structuredClone(state);damaged.life.seed=1;damaged.life.people['zhao-yu'].birthYear=0;
 saveState(damaged);const next=loadState()!;
 expect(next.lifeRecovery).toBe(true);expect(next.conflictRecovery).not.toBe(true);expect(next.worldConflict).toBeDefined();
 const restored=next.worldConflict!;
 expect(restored.cities.guangling.governorId).not.toBe('zhao-yu');
 expect(restored.seed).toBe(world.seed);expect(restored.ledger).toEqual(world.ledger);
 expect(restored.armies).toEqual(world.armies);expect(restored.reports).toEqual(world.reports);
 for(const [id,city] of Object.entries(world.cities))expect(restored.cities[id]).toMatchObject({troops:city.troops,factionId:city.factionId,occupationDay:city.occupationDay});
 expect(new Set(Object.values(restored.cities).map(c=>c.governorId)).size).toBe(60);
 expect(isWorldConflict(restored,date,Object.keys(next.party),next.life)).toBe(true);
 expect(next.party).toEqual(state.party);expect(next.economy).toEqual(state.economy);expect(loadState()).toEqual(next);
 const forged=structuredClone(damaged);forged.worldConflict.ledger.initial++;
 saveState(forged);expect(loadState()!.conflictRecovery).toBe(true);
});
