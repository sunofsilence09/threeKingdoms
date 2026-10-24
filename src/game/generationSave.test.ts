import { beforeEach, describe, expect, it, vi } from 'vitest';
import oldSaves from './fixtures/v08-saves.json';
import { createInitialState, loadState, saveState, STORAGE_KEY, type GameState } from './state';
import { isLifeState } from './personLife';
import { createProgress } from './growth';
import { isWorldConflict } from './worldConflict';
import { createCombatState } from './combat';
import { checkpointBattle } from './battleSave';
import { createDuelCombat } from './martialCombat';
import { gameDayNumber } from './recruitment';
import { acknowledgeTravelCg, resolveTravelEvent, startTravel } from './travel';

const storage=new Map<string,string>();
beforeEach(()=>{ storage.clear(); vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)}); });
describe('1.0 complete-save upgrade',()=>{
  it('backs up and upgrades a genuine old36city journey without altering resources or route progress',()=>{
    const old=oldSaves.journey; const raw=JSON.stringify(old); storage.set(STORAGE_KEY,raw);
    const next=loadState()!;
    expect(next).not.toBeNull(); expect(next.conflictRecovery).not.toBe(true);
    expect(storage.get(`${STORAGE_KEY}:pre-1.0-backup`)).toBe(raw);
    expect(next.journey).toEqual(old.journey); expect(next.economy.coins).toBe(old.economy.coins);
    expect(next.worldConflict?.seed).toBe(old.worldConflict.seed);
    expect(Object.keys(next.worldConflict!.cities)).toHaveLength(60);
    expect(isLifeState(next.life,next.date)).toBe(true);
    saveState(next); const reloaded=loadState()!;
    expect(reloaded.life).toEqual(next.life); expect(reloaded.worldConflict).toEqual(next.worldConflict);
  });
  it('archives expired old companions once while retaining learned arts and all grown progress',()=>{
    storage.set(STORAGE_KEY,JSON.stringify(oldSaves.city248));
    const next=loadState()!;
    expect(next.lifeMigration).toBe(true);
    expect(next.party['zhou-yu']).toBeUndefined(); expect(next.party['guan-yu']).toBeUndefined();
    expect(next.life!.memorials['zhou-yu'].progress).toEqual(oldSaves.city248.party['zhou-yu']);
    expect(next.martial).toEqual(oldSaves.city248.martial);
    expect(isWorldConflict(next.worldConflict,next.date,Object.keys(next.party),next.life)).toBe(true);
    saveState(next); expect(loadState()!.life).toEqual(next.life);
  });
  it('repairs a damaged life entry without redrawing valid lives or destroying RPG progress',()=>{
    const state=createInitialState(()=>0); state.heroName='新档旅人';
    const valid=structuredClone(state.life!); const damaged=JSON.parse(JSON.stringify(state));
    damaged.life.people['cao-pi'].deathYear='bad'; storage.set(STORAGE_KEY,JSON.stringify(damaged));
    const next=loadState()!;
    expect(next.lifeRecovery).toBe(true); expect(next.party).toEqual(state.party);
    expect(next.life!.people['sima-yi']).toEqual(valid.people['sima-yi']);
    expect(isLifeState(next.life,next.date)).toBe(true); expect(storage.has(`${STORAGE_KEY}:life-backup`)).toBe(true);
  });
  it('backs up a legacy travel battle and rebuilds only its expired roster while retaining the trip',()=>{
    const old=structuredClone(oldSaves.city248) as unknown as GameState;
    const started=startTravel(old,old.currentCityId==='nanhai'?'yingchuan':'nanhai',99);
    const pending={...started,journey:{...started.journey!,event:{id:0,kind:'bandits' as const}}};
    const battle=resolveTravelEvent(acknowledgeTravelCg(pending),'fight');
    battle.battleParty=[...battle.deployed];
    battle.activeBattle=checkpointBattle(createCombatState(battle.route,battle.party,'ambush',battle.battleParty),battle);
    storage.set(STORAGE_KEY,JSON.stringify(battle));
    const next=loadState()!;
    expect(next.phase).toBe('battle');expect(next.journey).toEqual(battle.journey);
    expect(next.economy).toMatchObject({coins:battle.economy.coins,cargo:battle.economy.cargo});
    expect(next.battleParty).not.toContain('guan-yu');expect(next.activeBattle).toBeUndefined();expect(next.battleRecovery).toBe(true);
    expect(storage.has(`${STORAGE_KEY}:active-battle-life-backup`)).toBe(true);
    saveState(next);expect(loadState()).not.toBeNull();
  });
  it('exits a legacy dead-teacher duel without a reward or a hanging challenge',()=>{
    const old=structuredClone(oldSaves.city248) as unknown as GameState;
    old.phase='battle';old.encounter='ambush';old.battleParty=['traveler'];
    old.duel={id:`duel-${gameDayNumber(old.date)}-1`,teacherId:'zhou-yu',started:old.date,status:'active'};
    old.martial.challengeDates['zhou-yu']=old.date;
    old.activeBattle=checkpointBattle(createDuelCombat(createCombatState(old.route,old.party,'ambush',['traveler']),old),old);
    storage.set(STORAGE_KEY,JSON.stringify(old));
    const next=loadState()!;
    expect(next.phase).toBe('overworld');expect(next.duel).toBeUndefined();expect(next.activeBattle).toBeUndefined();
    expect(next.martial.learned).toEqual(old.martial.learned);expect(next.martial.seed).toBe(old.martial.seed);
    expect(next.martial.settled).toContain(old.duel.id);expect(next.economy.coins).toBe(old.economy.coins);
    expect(next.flags).toEqual(old.flags);
  });
  it('keeps an owned child in reserve but repairs an old battle lineup before combat can resume',()=>{
    const state=createInitialState(()=>0);
    state.party['sun-quan']=createProgress(3,7);state.deployed=['traveler','sun-quan'];
    state.phase='battle';state.encounter='ambush';state.battleParty=[...state.deployed];
    state.activeBattle=checkpointBattle(createCombatState(null,state.party,'ambush',state.battleParty),state);
    storage.set(STORAGE_KEY,JSON.stringify(state));
    const next=loadState()!;
    expect(next.party['sun-quan']).toEqual(state.party['sun-quan']);
    expect(next.deployed).toEqual(['traveler']);expect(next.battleParty).toEqual(['traveler']);
    expect(next.activeBattle).toBeUndefined();expect(next.life!.memorials['sun-quan']).toBeUndefined();
    expect(next.battleRecovery).toBe(true);
  });
});
