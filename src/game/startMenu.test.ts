import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createInitialState, STORAGE_KEY } from './state';
vi.mock('./theme',()=>({applyCalendarTheme:vi.fn()}));

const records=new Map<string,string>();
beforeEach(()=>{vi.resetModules();records.clear();vi.stubGlobal('localStorage',{getItem:(key:string)=>records.get(key)??null,setItem:(key:string,value:string)=>records.set(key,value)});});
describe('startup game choice',()=>{
  it('does not manufacture a continue slot before a new player chooses to begin',async()=>{
    const runtime=await import('./runtime');
    expect(runtime.hasSavedGame()).toBe(false);
    expect(records.has(STORAGE_KEY)).toBe(false);
    runtime.resetState();
    expect(runtime.hasSavedGame()).toBe(true);
    expect(JSON.parse(records.get(STORAGE_KEY)!).phase).toBe('prologue');
  });
  it('retains a valid saved campaign until an explicit restart and starts naming afresh',async()=>{
    const state=createInitialState(()=>0);state.heroName='江行舟';state.phase='overworld';state.economy.coins=987;
    records.set(STORAGE_KEY,JSON.stringify(state));
    const runtime=await import('./runtime');
    expect(runtime.hasSavedGame()).toBe(true);expect(runtime.getState()).toEqual(state);
    const reset=runtime.resetState();
    expect(reset.heroName).toBeUndefined();expect(reset.phase).toBe('prologue');expect(reset.economy.coins).toBe(600);
    expect(reset.life!.seed).not.toBeUndefined();
  });
});
