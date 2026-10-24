import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState, STORAGE_KEY } from './state';
import { createProgress } from './growth';

beforeEach(() => {
  const data = new Map<string,string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key:string) => data.get(key) ?? null,
    setItem: (key:string,value:string) => data.set(key,value),
  }});
});
describe('0.4 economy persistence', () => {
  it('adds old-save initial capital exactly once without replacing existing progress', () => {
    const source=createInitialState();
    source.party['sun-ce']=createProgress(3,20);
    const { economy: _economy, travelDays: _days, ...legacy } = source;
    localStorage.setItem(STORAGE_KEY,JSON.stringify(legacy));
    const loaded = loadState()!;
    expect(loaded.economy.coins).toBe(600);
    expect(loaded.travelDays).toBe(3);
    expect(loaded.party).toEqual(legacy.party);
    loaded.economy.coins=17;loaded.travelDays=7;
    saveState(loaded);expect(loadState()).toEqual(loaded);
  });
  it('refuses invalid capital, goods, capacity and stored travel preferences', () => {
    const state=createInitialState();
    for (const patch of [{coins:-1},{coins:1.5},{capacity:0},{cargo:{unknown:{quantity:1,cost:1}}}]) {
      localStorage.setItem(STORAGE_KEY,JSON.stringify({...state,economy:{...state.economy,...patch}}));
      expect(loadState()).toBeNull();
    }
    for (const days of [0,31,1.5]) {saveState({...state,travelDays:days});expect(loadState()).toBeNull();}
  });
});
