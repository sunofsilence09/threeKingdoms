import { beforeEach, describe, expect, it } from 'vitest';
import { LEGACY_CITY_IDS, WORLD_CITIES, WORLD_ROADS, cityAt, directRoadLeg, planRoute } from './world';
import { ORIGINS } from './history';
import { localCityOfficeRecords } from './localOfficials';
import { createInitialState, loadState, saveState } from './state';
import { marketQuote } from './economy';
import { startTravel } from './travel';

beforeEach(()=>{
  const data=new Map<string,string>();
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}});
});
describe('office cities and legacy geography',()=>{
  it('adds Shouchun and Xiapi without altering the sixteen birthplaces',()=>{
    expect(WORLD_CITIES).toHaveLength(60);expect(WORLD_ROADS.filter(road=>LEGACY_CITY_IDS.includes(road.from)&&LEGACY_CITY_IDS.includes(road.to))).toHaveLength(47);
    expect(ORIGINS).toHaveLength(16);
    expect(cityAt('shouchun')).toMatchObject({name:'寿春',provinceId:'yang',prefecture:'九江郡'});
    expect(cityAt('xiapi')).toMatchObject({name:'下邳',provinceId:'xu',prefecture:'下邳国'});
    for(const id of ['shouchun','xiapi']){
      expect(planRoute('henan',id)!.days).toBeGreaterThan(0);
      expect(planRoute(id,'henan')!.days).toBe(planRoute('henan',id)!.days);
    }
  });
  it('uses correct prefecture/country/metro office titles with unverified people left blank',()=>{
    const date={year:184,month:3,day:1};
    const shouchun=localCityOfficeRecords(cityAt('shouchun'),date)[1];
    const xiapi=localCityOfficeRecords(cityAt('xiapi'),date)[1];
    expect(shouchun.title).toBe('九江太守');expect(shouchun.records).toEqual([]);
    expect(xiapi.title).toBe('下邳相');expect(xiapi.records).toEqual([]);
    expect(localCityOfficeRecords(cityAt('changan'),date)[1].title).toBe('京兆尹');
  });
  it('loads a 34-city economy and active journey unchanged, quoting new city stock lazily',()=>{
    const initial={...createInitialState(()=>0),phase:'overworld' as const,currentCityId:'beihai',originId:'beihai' as const};
    const state=startTravel(initial,'taiyuan',9);
    delete state.economy.markets.shouchun;delete state.economy.markets.xiapi;
    state.economy.coins=321;
    saveState(state);const restored=loadState()!;
    expect(restored).toEqual(state);expect(restored.journey).toEqual(state.journey);
    for(const id of ['shouchun','xiapi'])expect(marketQuote(restored.economy,id,restored.date,'grain').stock).toBeGreaterThan(0);
  });
  it('keeps every original corridor a valid direct saved-journey leg',()=>{
    const added=new Set(['shouchun','xiapi']);
    const previous=WORLD_ROADS.filter(road=>LEGACY_CITY_IDS.includes(road.from)&&LEGACY_CITY_IDS.includes(road.to)&&!added.has(road.from)&&!added.has(road.to));
    expect(previous).toHaveLength(42);
    for(const road of previous)expect(directRoadLeg(road.from,road.to),`${road.from}→${road.to}`).toMatchObject({from:road.from,to:road.to,kind:road.kind});
  });
});
