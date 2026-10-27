import { describe, expect, it } from 'vitest';
import { createInitialState, saveState, loadState } from './state';
import { recruitPlayerTroops } from './playerMilitary';
import { isWorldConflict } from './worldConflict';
import { assignTroops, initializeTroopCombat, settleTroops, reconcileTroops } from './troopManagement';
import { checkpointBattle, isBattleSnapshot } from './battleSave';
import { createCombatState, updateUnitHp } from './combat';

function fixture() {
  const state = createInitialState(() => 0);
  return recruitPlayerTroops({ ...state, phase: 'overworld', economy: { ...state.economy, coins: 2000 } }, 200);
}
describe('campaign troops', () => {
  it('allocates and returns existing soldiers without violating the strategic ledger', () => {
    const state = fixture(), next = assignTroops(state, 'aman', 'crossbow', 100);
    expect(next.worldConflict!.playerReserve).toBe(100);
    expect(next.troopAssignments!.aman).toEqual({ kind: 'crossbow', count: 100 });
    expect(isWorldConflict(next.worldConflict, next.date, Object.keys(next.party), next.life)).toBe(true);
    const returned = assignTroops(next, 'aman', 'spear', 0);
    expect(returned.worldConflict!.playerReserve).toBe(200);
    expect(state.worldConflict!.playerReserve).toBe(200);
  });
  it('rejects overspending, invalid soldiers, foreign characters and changes in battle', () => {
    const state = fixture();
    for (const count of [-1, 201, 1001, 1.5, NaN]) expect(assignTroops(state, 'aman', 'spear', count)).toBe(state);
    expect(assignTroops(state, 'unknown', 'spear', 100)).toBe(state);
    const battle = { ...state, phase: 'battle' as const };
    expect(assignTroops(battle, 'aman', 'spear', 100)).toBe(battle);
  });
  it('settles actual survivors once and preserves the world troop ledger', () => {
    const assigned = assignTroops(fixture(), 'aman', 'crossbow', 100);
    const state = { ...assigned, phase: 'battle' as const, encounter: 'ambush' as const };
    const combat = initializeTroopCombat(createCombatState(null, state.party), state);
    const hurt = { ...combat, units: combat.units.map(u => u.id === 'aman' ? updateUnitHp(u, u.hp - 20) : u) };
    const next = settleTroops(state, hurt);
    expect(next.troopAssignments!.aman.count).toBe(90);
    expect(next.worldConflict!.ledger.losses - state.worldConflict!.ledger.losses).toBe(10);
    expect(isWorldConflict(next.worldConflict, next.date, Object.keys(next.party), next.life)).toBe(true);
    expect(settleTroops(next, hurt)).toEqual(next);
  });
  it('round trips assigned troops and active morale without recovering the valid world', () => {
    const data = new Map<string,string>();
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
    const state = assignTroops(fixture(), 'aman', 'bow', 100);
    saveState(state);
    const restored = loadState()!;
    expect(restored.troopAssignments).toEqual(state.troopAssignments);
    expect(restored.conflictRecovery).not.toBe(true);
  });
  it('keeps a zero allocation valid before the first recruitment',()=>{
    const state={ ...createInitialState(()=>0),phase:'overworld' as const };
    const next=assignTroops(state,'aman','spear',0);
    expect(isWorldConflict(next.worldConflict,next.date,Object.keys(next.party),next.life)).toBe(true);
  });
  it('returns the soldiers of a departed companion and keeps the ledger balanced',()=>{
    const state=assignTroops(fixture(),'aman','spear',100), party={ ...state.party }; delete party.aman;
    const next=reconcileTroops({ ...state,party });
    expect(next.worldConflict!.playerReserve).toBe(200);
    expect(next.worldConflict!.playerAssigned).toBe(0);
    expect(next.troopAssignments!.aman).toBeUndefined();
    expect(isWorldConflict(next.worldConflict,next.date,Object.keys(next.party),next.life)).toBe(true);
  });
});


describe('atomic assignment and battle recovery',()=>{
 it.each([true,false])('preserves validated casualties when assignment metadata is damaged (recoverable:%s)',recoverable=>{
  const data=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
  const state={...assignTroops(fixture(),'aman','crossbow',100),phase:'battle' as const,encounter:'ambush' as const,battleParty:[...fixture().deployed]};
  const combat=initializeTroopCombat(createCombatState(null,state.party),state);
  const hurt={...combat,units:combat.units.map(u=>u.id==='aman'?updateUnitHp(u,u.hp-20):u)};
  const snapshot=checkpointBattle(hurt,state);expect(isBattleSnapshot(snapshot,state)).toBe(true);
  const damaged=JSON.parse(JSON.stringify({...state,activeBattle:snapshot}));
  damaged.troopAssignments.aman.extra='unrecognized';
  if(!recoverable)damaged.troopAssignments['chen-da']={kind:'unknown',count:0};
  saveState(damaged);const loaded=loadState()!;expect(loaded.conflictRecovery).not.toBe(true);
  if(recoverable){
   expect(loaded.troopAssignments).toEqual(state.troopAssignments);expect(loaded.activeBattle).toEqual(snapshot);
   expect(loaded.worldConflict!.playerReserve).toBe(100);expect(loaded.battleRecovery).not.toBe(true);
   const settled=settleTroops(loaded,loaded.activeBattle!);
   expect(settled.troopAssignments!.aman.count).toBe(90);expect(settled.worldConflict!.ledger.losses-state.worldConflict!.ledger.losses).toBe(10);
  }else{
   expect(loaded.activeBattle).toBeUndefined();expect(loaded.battleRecovery).toBe(true);
   expect(loaded.worldConflict!.playerReserve).toBe(190);expect(loaded.worldConflict!.playerAssigned).toBe(0);
   expect(loaded.worldConflict!.ledger.losses-state.worldConflict!.ledger.losses).toBe(10);
  }
  expect(isWorldConflict(loaded.worldConflict,loaded.date,Object.keys(loaded.party),loaded.life)).toBe(true);
  expect(data.has('three-kingdoms-demo-state:troops-backup')).toBe(true);
 });
});
