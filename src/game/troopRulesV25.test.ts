import { describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState } from './state';
import { assignTroops, commandTroopLimit, initializeTroopCombat, settleTroops, validAssignments } from './troopManagement';
import { recruitPlayerTroops } from './playerMilitary';
import { attackPower, createCombatState, applyGuard, updateUnitHp, resolveRoundEnd, performAttack, activateUltimate } from './combat';
import { checkpointBattle, isBattleSnapshot } from './battleSave';
import { attachTroops, defensePower, performTroopSkill, troopTargets } from './troopCombat';
import { makeGarrisonUnit } from './garrisonCombat';
import { initializeCityEconomy } from './cityEconomy';

function fixture(bondBonus = 50) {
  const state = createInitialState(() => 0);
  state.party.traveler.bondBonus = bondBonus;
  return recruitPlayerTroops({ ...state, phase: 'overworld', economy: { ...state.economy, coins: 100000 } }, 20000);
}
describe('2.5 command capacity and real large armies', () => {
  it.each([[0,5000],[30,8000],[50,10000]])('maps effective command to capacity (bond %s)', (bond,cap) => {
    expect(commandTroopLimit(fixture(bond), 'traveler')).toBe(cap);
  });
  it('allocates and unloads ten thousand existing soldiers and allows reducing over-cap legacy armies', () => {
    const state = fixture(), assigned = assignTroops(state,'traveler','spear',10000);
    expect(assigned.troopAssignments?.traveler.count).toBe(10000);
    expect(assigned.worldConflict?.playerReserve).toBe(10000);
    const lowered = { ...assigned, party: { ...assigned.party, traveler: { ...assigned.party.traveler, bondBonus: 0 } } };
    expect(validAssignments(lowered.troopAssignments,lowered)).toBe(true);
    expect(assignTroops(lowered,'traveler','spear',9000).troopAssignments?.traveler.count).toBe(9000);
    expect(assignTroops(lowered,'traveler','spear',10000).troopAssignments?.traveler.count).toBe(10000);
    expect(assignTroops(lowered,'traveler','spear',10001)).toBe(lowered);
    const unloaded=assignTroops(lowered,'traveler','spear',0);
    expect(unloaded.worldConflict?.playerReserve).toBe(20000);
    expect(unloaded.worldConflict?.playerAssigned).toBe(0);
    expect(assignTroops(fixture(0),'traveler','spear',5001).troopAssignments).toBeUndefined();
    expect(validAssignments({traveler:{kind:'spear',count:10001}},state)).toBe(false);
    expect(validAssignments({traveler:{kind:'spear',count:10000},aman:{kind:'bow',count:10000}},state)).toBe(false);
    expect(commandTroopLimit(state,'toString')).toBe(0);
  });
  it('creates balanced large opponents and round trips damage, healing and casualties', () => {
    const assigned=assignTroops(fixture(),'traveler','crossbow',10000);
    const state={...assigned,phase:'battle' as const,encounter:'ambush' as const,battleParty:[...assigned.deployed]};
    const combat=initializeTroopCombat(createCombatState(null,state.party),state);
    const hero=combat.units.find(u=>u.id==='traveler')!;
    expect(hero.troop?.count).toBe(10000);
    expect(combat.units.find(u=>u.team==='enemy')?.troop?.count).toBeGreaterThan(1000);
    expect(attackPower(hero)).toBeCloseTo(hero.attack*.9);
    expect(defensePower(hero)).toBeCloseTo(hero.defense*.9);
    const hurt=updateUnitHp(hero,hero.hp-2001),healed=updateUnitHp(hurt,hero.maxHp);
    expect(hurt.troop?.count).toBe(9000); expect(healed.troop?.count).toBe(9000);
    const damaged={...combat,units:combat.units.map(u=>u.id===hero.id?healed:u)};
    const snapshot=checkpointBattle(damaged,state);
    expect(isBattleSnapshot(snapshot,state)).toBe(true);
    const data=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
    saveState({...state,activeBattle:snapshot}); const loaded=loadState()!;
    expect(loaded.activeBattle).toEqual(snapshot); expect(loaded.troopAssignments).toEqual(state.troopAssignments);
    const settled=settleTroops(loaded,loaded.activeBattle!);
    expect(settled.troopAssignments?.traveler.count).toBe(9000);
    expect(settled.worldConflict!.ledger.losses-state.worldConflict!.ledger.losses).toBe(1000);
    expect(settleTroops(settled,loaded.activeBattle!)).toEqual(settled);
  });
  it('inherits actual camp and city morale on new encounters, while restoring old snapshots verbatim', () => {
    const state=initializeCityEconomy(fixture()); state.cityEconomy!.camp.morale=7; state.cityEconomy!.cities.zhuo.morale=23;
    const combat=initializeTroopCombat(createCombatState(null,state.party),state);
    expect(combat.units.filter(u=>u.team==='party').every(u=>u.morale===7)).toBe(true);
    expect(makeGarrisonUnit('zhuo',10000,7,4,state).morale).toBe(23);
    for(const attributeVersion of [undefined,1,2,3] as const) {
      const base=createCombatState(null,state.party),unit=attachTroops(base.units[0],'spear',1000,{command:30,strength:20},2);
      const old=checkpointBattle({...base,attributeVersion,randomSeed:98765,units:[{...unit,hp:unit.hp-1},...base.units.slice(1)]},state);
      const text=JSON.stringify(old); expect(isBattleSnapshot(old)).toBe(true); expect(JSON.stringify(old)).toBe(text);
      expect(attackPower(unit)).toBe(unit.attack);
    }
  });
  it('routes exactly ten percent of new-scale formations without reviving their losses', () => {
    const state=fixture(),base=initializeTroopCombat(createCombatState(null,state.party),state);
    const guard={...makeGarrisonUnit('zhuo',10000,7,4),morale:9,moraleRuleVersion:2 as const};
    const result=resolveRoundEnd({...base,units:[base.units[0],guard],fires:[]});
    expect(result.units[1].formation?.troops).toBe(9000);
    expect(updateUnitHp(result.units[1],20000).formation?.troops).toBe(9000);
  });
  it.each([undefined,1,2,3] as const)('loads an actual old rule2 saved battle and settles identical casualties (attributes %s)',attributeVersion=>{
    const assigned=assignTroops(fixture(),'traveler','spear',1000);
    const state={...assigned,phase:'battle' as const,encounter:'ambush' as const,battleParty:[...assigned.deployed]};
    const base=createCombatState(null,state.party);
    const unit=attachTroops(base.units[0],'spear',1000,{command:30,strength:20},attributeVersion??1);
    const hurt=updateUnitHp(unit,unit.hp-213);
    const snapshot=checkpointBattle({...base,attributeVersion,randomSeed:123456,units:[hurt,...base.units.slice(1)]},state);
    expect(isBattleSnapshot(snapshot,state)).toBe(true);
    const data=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)}});
    saveState({...state,activeBattle:snapshot});const loaded=loadState()!;
    expect(loaded.activeBattle).toEqual(snapshot);
    expect(settleTroops(loaded,loaded.activeBattle!).troopAssignments?.traveler.count).toBe(hurt.troop?.count);
  });
  it.each(['infantry','spear','cavalry','bow','crossbow'] as const)('uses %s skills with full ten-thousand-soldier stats and durable casualties',kind=>{
    const state=assignTroops(fixture(),'traveler',kind,10000),base=initializeTroopCombat(createCombatState(null,state.party),state);
    const hero={...base.units[0],x:1,y:1,speed:100,morale:100};
    const enemy=attachTroops({...base.units.find(u=>u.team==='enemy')!,troop:undefined,maxHp:20,hp:20,attack:10,defense:0,x:kind==='bow'||kind==='crossbow'?4:2,y:1,dodgeRate:0},'spear',10000);
    const combat={...base,terrain:[],units:[hero,enemy],selectedId:hero.id};
    const target=troopTargets(combat,hero.id)[0];expect(target).toBeDefined();
    const result=performTroopSkill(combat,hero.id,target.x,target.y);
    expect(result.actedIds).toContain(hero.id);
    expect(result.units[0].morale).toBeLessThan(100);
    if(kind==='infantry')expect(result.units[0].guarded).toBe(true);
    else {expect(result.units[1].troop!.count).toBeLessThan(10000);expect(updateUnitHp(result.units[1],result.units[1].maxHp).troop?.count).toBe(result.units[1].troop!.count);}
  });
  it('clamps new morale gains, scales fire damage and keeps survival healing from resurrecting soldiers',()=>{
    const state=assignTroops(fixture(),'traveler','spear',10000),base=initializeTroopCombat(createCombatState(null,state.party),state);
    const hero={...base.units[0],x:1,y:1,speed:100,morale:99},enemy={...base.units.find(u=>u.team==='enemy')!,x:2,y:1,dodgeRate:0};
    const combat={...base,terrain:[],units:[hero,enemy],selectedId:hero.id};
    expect(applyGuard(combat,hero.id).units[0].morale).toBe(100);
    expect(performAttack(combat,hero.id,enemy.id).units[0].morale).toBe(100);
    const fire={...combat,fires:[{x:1,y:1,level:3 as const,remainingRounds:3,sourceId:enemy.id}],environment:{month:3,weather:'sunny' as const,windDirection:'calm' as const,windStrength:0 as const}};
    const burnt=resolveRoundEnd(fire).units[0];expect(burnt.troop!.count).toBeLessThan(9000);
    const wounded=updateUnitHp(hero,Math.floor(hero.hp*.4));
    const healed=activateUltimate({...combat,units:[wounded,enemy]},hero.id).units[0];
    expect(healed.troop?.count).toBe(wounded.troop?.count);expect(healed.morale).toBe(wounded.morale);
    const settled=settleTroops(state,{...combat,units:[burnt,enemy]});
    expect(settled.worldConflict!.playerAssigned!+settled.worldConflict!.playerReserve!+settled.worldConflict!.ledger.losses-state.worldConflict!.ledger.losses).toBe(20000);
  });
});
