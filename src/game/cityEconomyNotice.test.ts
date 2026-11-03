import {beforeEach,describe,it,expect} from 'vitest';
import {createInitialState,loadState,saveState} from './state';
import {startTravel,advanceTravel} from './travel';
import {withWorldDate} from './worldTime';
import {conflictDay} from './worldConflict';
import {acknowledgeFundingNotice,campFinanceSummary,isCityEconomy,repairCityEconomy,setCampFundingCity} from './cityEconomy';

beforeEach(()=>{const data=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});});
function capturedDuringTravel(){
 let s=createInitialState(()=>0);s.phase='overworld';s.currentCityId='yingchuan';s.economy.coins=10000;s.supplies=10;
 const world=s.worldConflict!;world.cities.henan.factionId='player';world.cities.henan.troops=1;world.playerReserve=1000;world.nextDecision.player=world.lastDay+1;
 world.armies=[{id:'army-1',factionId:'yellow-turban',sourceCityId:'julu',targetCityId:'henan',troops:20000,contributions:[],phase:'sieging',path:['julu','henan'],legIndex:1,legDay:0,phaseDays:1}];
 world.ledger.initial=Object.values(world.cities).reduce((n,c)=>n+c.troops,0)+21000-world.ledger.recruited-world.ledger.raised+world.ledger.losses;
 s=withWorldDate(s,s.date);s=setCampFundingCity(s,'henan');return advanceTravel(startTravel(s,'xuxian',123),1);
}
describe('persistent funding loss notice',()=>{
 it('survives actual capture and overwritten travel feedback, with personal payroll fallback',()=>{
  const s=capturedDuringTravel();expect(s.worldConflict!.cities.henan.factionId).toBe('yellow-turban');expect(s.travelNotice).toContain('本次赶路');expect(s.cityEconomy!.camp.fundingCityId).toBeUndefined();
  expect(s.cityEconomy!.fundingNotice).toEqual({cityId:'henan',day:conflictDay(s.date)});
  const due=campFinanceSummary(s),paid=withWorldDate(s,{year:184,month:4,day:1});expect(paid.economy.coins).toBe(s.economy.coins-due.dueCoins);expect(paid.supplies).toBe(s.supplies-due.dueSupplies);expect(paid.cityEconomy!.fundingNotice).toEqual(s.cityEconomy!.fundingNotice);
 });
 it('roundtrips through JSON load and acknowledgment clears only the pending notice',()=>{
  const s=capturedDuringTravel();saveState(s);const restored=loadState()!;expect(restored).toEqual(s);expect(restored.cityEconomy!.fundingNotice).toBeDefined();
  const acknowledged=acknowledgeFundingNotice(restored),expected=structuredClone(restored);delete expected.cityEconomy!.fundingNotice;
  expect(acknowledged).toEqual(expected);expect(acknowledged.date).toBe(restored.date);expect(acknowledged.worldConflict).toBe(restored.worldConflict);expect(acknowledgeFundingNotice(acknowledged)).toBe(acknowledged);
 });
 it('preserves valid notices during field repair and drops malformed typed identifiers or dates',()=>{
  const s=capturedDuringTravel(),notice=s.cityEconomy!.fundingNotice;
  expect(repairCityEconomy({...s.cityEconomy,cities:{}},s).fundingNotice).toEqual(notice);
  for(const bad of [{cityId:{toString:null,valueOf:null},day:0},{cityId:'unknown',day:0},{cityId:'henan',day:-1},{cityId:'henan',day:conflictDay(s.date)+1},{cityId:'henan',day:1.2},[]]){
   const broken={...s.cityEconomy,fundingNotice:bad};expect(isCityEconomy(broken,s)).toBe(false);expect(repairCityEconomy(broken,s).fundingNotice).toBeUndefined();
  }
 });
 it('explicitly choosing personal funding acknowledges the previous loss',()=>{
  const s=capturedDuringTravel(),idle={...s,journey:undefined};const next=setCampFundingCity(idle,undefined);expect(next.cityEconomy!.fundingNotice).toBeUndefined();expect(next.date).toEqual(idle.date);expect(next.economy).toBe(idle.economy);
 });
});
