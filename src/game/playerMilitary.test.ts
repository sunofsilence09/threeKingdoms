import {beforeEach,describe,expect,it} from 'vitest';
import {createInitialState,saveState,loadState,type GameState} from './state';
import {withWorldDate} from './worldTime';
import {isWorldConflict} from './worldConflict';
import {prefectIdentity} from './prefectIdentity';
import {playerMilitaryStatus,playerSiegePreview,recruitPlayerTroops,startPlayerSiege,withdrawPlayerTroops,reinforcePlayerCity} from './playerMilitary';
const fixture=()=>({...createInitialState(()=>0),phase:'overworld' as const,currentCityId:'moling',supplies:100,
 economy:{...createInitialState(()=>0).economy,coins:50000}});
const total=(s:GameState)=>Object.values(s.worldConflict!.cities).reduce((n,c)=>n+c.troops,0)+s.worldConflict!.armies.reduce((n,a)=>n+a.troops,0)+(s.worldConflict!.playerReserve??0);
const conserved=(s:GameState)=>{const w=s.worldConflict!;expect(total(s)).toBe(w.ledger.initial+(w.ledger.expansion??0)+w.ledger.recruited+w.ledger.raised-w.ledger.losses);expect(isWorldConflict(w,s.date,Object.keys(s.party),s.life)).toBe(true);};
beforeEach(()=>{const data=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});});
describe('player recruitment, real siege and ownership',()=>{
 it.each(['ambush','route'] as const)('recovers idle overworld saves with a completed %s marker without locking military',(encounter)=>{
  const state={...fixture(),encounter,flags:{ambushWon:true,'xp:ambush':true}};
  saveState(state);const next=loadState()!;
  expect(next.encounter).toBeUndefined();expect(playerMilitaryStatus(next).canOperate).toBe(true);
  expect(next.economy).toEqual(state.economy);expect(next.party).toEqual(state.party);expect(next.date).toEqual(state.date);
  expect(recruitPlayerTroops(next,100)).not.toBe(next);
 });
 it('raises paid reserves with an audited source, one day and no mutation or random reroll',()=>{
  const state=fixture(),before=structuredClone(state),next=recruitPlayerTroops(state,5000);
  expect(next.worldConflict!.playerReserve).toBe(5000);expect(next.economy.coins).toBe(40000);
  expect(next.date).toEqual({year:184,month:3,day:2});expect(state).toEqual(before);
  expect(next.party).toBe(state.party);conserved(next);saveState(next);expect(loadState()).toEqual(next);
 });
 it('rejects invalid, unaffordable, over-capacity, battle/road/recovery and terminal recruitment',()=>{
  const state=fixture();for(const n of [0,-100,1,100.5,NaN,Infinity,20100])expect(recruitPlayerTroops(state,n)).toBe(state);
  const poor={...state,economy:{...state.economy,coins:199}};expect(recruitPlayerTroops(poor,100)).toBe(poor);
  for(const blocked of [{...state,phase:'battle' as const},{...state,activeBattle:{} as GameState['activeBattle']},{...state,duel:{} as GameState['duel']},{...state,encounter:'ambush' as const},{...state,conflictRecovery:true},{...state,journey:{} as GameState['journey']},{...state,date:{year:310,month:12,day:30}}])expect(recruitPlayerTroops(blocked,100)).toBe(blocked);
 });
 it('takes a city, appoints a new prefect and garrisons surviving attackers exactly once',()=>{
  let state=recruitPlayerTroops(fixture(),5000);const world=state.worldConflict!;
  world.ledger.losses+=world.cities.moling.troops-100;world.cities.moling.troops=100;
  const oldGovernor=world.cities.moling.governorId,initial=total(state),preview=playerSiegePreview(state,5000);
  expect(preview.allowed).toBe(true);expect(preview.defenders).toBe(100);expect(preview.foodCost).toBe(5);
  const next=startPlayerSiege(state,5000);expect(next.worldConflict!.cities.moling.factionId).toBe('player');
  expect(next.worldConflict!.cities.moling.troops).toBeGreaterThan(4900);expect(next.worldConflict!.playerReserve).toBe(0);
  expect(next.worldConflict!.cities.moling.governorId).not.toBe(oldGovernor);
  expect(prefectIdentity(next.worldConflict!.cities.moling.governorId)!.factionId).toBe('player');
  expect(next.supplies).toBe(state.supplies-5);expect(next.worldConflict!.armies.some(a=>a.factionId==='player')).toBe(false);
  expect(total(next)).toBeLessThan(initial);expect(startPlayerSiege(next,100)).toBe(next);conserved(next);
  saveState(next);expect(loadState()).toEqual(next);
 });
 it('retreats survivors to reserves on a failed first siege, without free losses or free troops',()=>{
  const state=recruitPlayerTroops(fixture(),100),next=startPlayerSiege(state,100);
  expect(next.worldConflict!.cities.moling.factionId).toBe('han');
  expect(next.worldConflict!.playerReserve).toBeGreaterThan(0);expect(next.worldConflict!.playerReserve).toBeLessThan(100);
  expect(next.worldConflict!.cities.moling.troops).toBeLessThan(state.worldConflict!.cities.moling.troops);
  expect(next.travelNotice).toContain('未攻下');conserved(next);
 });
 it('transfers city troops and reserves without changing their total or the ledger',()=>{
  let state=recruitPlayerTroops(fixture(),5000);state.worldConflict!.ledger.losses+=state.worldConflict!.cities.moling.troops-100;state.worldConflict!.cities.moling.troops=100;
  state=startPlayerSiege(state,5000);const n=total(state),ledger=structuredClone(state.worldConflict!.ledger);
  const pulled=withdrawPlayerTroops(state,1000);expect(pulled.worldConflict!.playerReserve).toBe(1000);expect(total(pulled)).toBe(n);
  const reinforced=reinforcePlayerCity(pulled,500);expect(reinforced.worldConflict!.playerReserve).toBe(500);expect(total(reinforced)).toBe(n);
  expect(reinforced.worldConflict!.ledger).toEqual(ledger);conserved(reinforced);
  expect(withdrawPlayerTroops(reinforced,20000)).toBe(reinforced);expect(reinforcePlayerCity(reinforced,501)).toBe(reinforced);
 });
 it('does not dispatch player garrisons autonomously and validates corrupted reserve totals',()=>{
  let state=recruitPlayerTroops(fixture(),5000);state.worldConflict!.ledger.losses+=state.worldConflict!.cities.moling.troops-100;state.worldConflict!.cities.moling.troops=100;
  state=startPlayerSiege(state,5000);const next=withWorldDate(state,{year:184,month:4,day:1});
  expect(next.worldConflict!.reports.filter(r=>r.factionId==='player'&&r.kind==='dispatch')).toEqual([]);
  conserved(next);const bad=structuredClone(next.worldConflict!);bad.playerReserve=20001;expect(isWorldConflict(bad,next.date,Object.keys(next.party),next.life)).toBe(false);
 });
 it('previews only a local target and rejects calendar overflow, duplicate sieges or insufficient food',()=>{
  const state=recruitPlayerTroops(fixture(),1000),before=JSON.stringify(state);
  expect(playerMilitaryStatus(state).reserve).toBe(1000);expect(playerSiegePreview(state,1000).cityId).toBe('moling');expect(JSON.stringify(state)).toBe(before);
  for(const n of [0,1,99,1001,NaN])expect(startPlayerSiege(state,n)).toBe(state);
  const hungry={...state,supplies:0};expect(startPlayerSiege(hungry,1000)).toBe(hungry);
  const end={...state,date:{year:310,month:12,day:29}};expect(startPlayerSiege(end,1000)).toBe(end);
 });
 it('allows NPCs to counterattack and recapture a weak player city with audited losses',()=>{
  let state=recruitPlayerTroops(fixture(),5000);state.worldConflict!.ledger.losses+=state.worldConflict!.cities.moling.troops-100;state.worldConflict!.cities.moling.troops=100;
  state=startPlayerSiege(state,5000);
  const former=state.worldConflict!.cities.moling.governorId;
  state.worldConflict!.ledger.losses+=state.worldConflict!.cities.moling.troops-100;state.worldConflict!.cities.moling.troops=100;
  const next=withWorldDate(state,{year:184,month:5,day:1});
  expect(next.worldConflict!.cities.moling.factionId).not.toBe('player');
  expect(next.worldConflict!.cities.moling.governorId).not.toBe(former);
  expect(next.worldConflict!.ledger.losses).toBeGreaterThan(state.worldConflict!.ledger.losses);
  conserved(next);saveState(next);expect(loadState()).toEqual(next);
 });
});
