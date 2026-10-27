import { describe, it, expect } from 'vitest';
import { createCombatState, currentActor, attackPower, actionOrder, applyGuard, resolveRoundEnd, updateUnitHp, canAttack, performAttack, moveUnit, advanceTurn } from './combat';
import { attachTroops, moraleFactor, defensePower, troopTargets, performTroopSkill, TROOP_TYPES } from './troopCombat';
import { checkpointBattle, isBattleSnapshot } from './battleSave';
import { createInitialState } from './state';

function fixture() {
  const combat = createCombatState(null);
  const actor = currentActor(combat)!;
  const unit = attachTroops({ ...actor, morale: 80 }, 'crossbow', 100);
  return { ...combat, terrain: [], units: [unit, { ...combat.units.find(u => u.team !== actor.team)!, x: unit.x + 5, y: unit.y, dodgeRate: 0 }], selectedId: unit.id };
}
describe('troops and independent morale', () => {
  it('uses exactly normal stats at80 and increases attack, defense and initiative with morale', () => {
    expect(moraleFactor(80)).toBe(1);
    const combat = fixture(), unit = combat.units[0];
    expect(attackPower(unit)).toBe(unit.attack);
    expect(defensePower(unit)).toBe(unit.defense);
    expect(attackPower({ ...unit, morale: 120 })).toBeGreaterThan(attackPower(unit));
    expect(defensePower({ ...unit, morale: 5 })).toBeLessThan(defensePower(unit));
    const tied = { ...combat, units: [{ ...unit, speed: 10, morale: 0 }, { ...combat.units[1], speed: 10, morale: 120 }] };
    expect(actionOrder(tied)[0].id).toBe(tied.units[1].id);
  });
  it('loses soldiers gradually below10 and guard can stop the rout', () => {
    const combat = fixture(), unit = { ...combat.units[0], morale: 9 };
    const low = { ...combat, units: [unit, combat.units[1]], actedIds: [combat.units[1].id] };
    const next = resolveRoundEnd(low);
    expect(next.units[0].troop?.count).toBe(90);
    expect(resolveRoundEnd(next).units[0].troop?.count).toBe(81);
    expect(resolveRoundEnd({ ...low, units: [{ ...unit, morale: 10 }, combat.units[1]] }).units[0].troop?.count).toBe(100);
    const guarded = applyGuard(low, unit.id);
    expect(guarded.units[0].morale).toBe(19);
    expect(resolveRoundEnd(guarded).units[0].troop?.count).toBe(100);
  });
  it('turns damage into permanent soldier losses and healing never resurrects them', () => {
    const unit = fixture().units[0];
    const hurt = updateUnitHp(unit, unit.hp - 21);
    expect(hurt.troop!.count).toBeLessThan(100);
    expect(hurt.attack).toBeLessThan(unit.attack);
    expect(updateUnitHp(hurt, hurt.maxHp).troop!.count).toBe(hurt.troop!.count);
  });
  it('strong shot reaches two extra tiles, spends20 morale and consumes the action only on legal use', () => {
    const combat = fixture(), [actor, target] = combat.units;
    expect(canAttack(combat, actor, target)).toBe(false);
    expect(troopTargets(combat, actor.id)).toContainEqual({ x: target.x, y: target.y });
    expect(performTroopSkill(combat, actor.id, 15, 9)).toBe(combat);
    const used = performTroopSkill(combat, actor.id, target.x, target.y);
    expect(used.units[0].morale).toBe(60);
    expect(used.actedIds).toContain(actor.id);
    expect(used.units[1].hp).toBeLessThan(target.hp);
    expect(performTroopSkill(used, actor.id, target.x, target.y)).toBe(used);
    expect(troopTargets({ ...combat, units: [{ ...actor, morale: 19 }, target] }, actor.id)).toEqual([]);
    expect(troopTargets({ ...combat, terrain: [{ x: actor.x + 1, y: actor.y, kind: 'wall' }] }, actor.id)).toEqual([]);
  });
  it('validates troop checkpoint fields and retains legacy snapshots', () => {
    const state = { ...createInitialState(() => 0), phase: 'battle' as const, encounter: 'ambush' as const };
    const combat = createCombatState(null, state.party);
    const snapshot = checkpointBattle(combat, state);
    expect(isBattleSnapshot(snapshot, state)).toBe(true);
    const withTroops = checkpointBattle({ ...combat, units: combat.units.map((u, i) => i ? u : attachTroops(u, 'spear', 100)) }, state);
    expect(isBattleSnapshot(withTroops)).toBe(true);
    for (const morale of [-1, 121, NaN]) expect(isBattleSnapshot({ ...withTroops, units: withTroops.units.map((u,i) => i ? u : { ...u, morale }) })).toBe(false);
    expect(isBattleSnapshot({ ...withTroops, units: withTroops.units.map((u,i) => i ? u : { ...u, troop: { ...u.troop!, count: 1001 } }) })).toBe(false);
  });
  it.each(['infantry','spear','cavalry','bow','crossbow'] as const)('implements %s skill with its cost and consumes exactly one action', kind => {
    let combat=fixture();
    const base={ ...combat.units[0] }; delete base.troop;
    const actor=attachTroops({ ...base, maxHp:20,hp:20,attack:10,defense:0,morale:80 },kind,100);
    const target={ ...combat.units[1],x:actor.x+(kind==='bow'||kind==='crossbow'?3:1),y:actor.y,hp:1000,maxHp:1000 };
    combat={ ...combat,units:[actor,target] };
    const tile=troopTargets(combat,actor.id)[0]; expect(tile).toBeDefined();
    const next=performTroopSkill(combat,actor.id,tile.x,tile.y);
    expect(next.units[0].morale).toBe(80-TROOP_TYPES[kind].cost);
    expect(next.actedIds).toEqual([actor.id]);
    if(kind==='infantry') expect(next.units[0].guarded).toBe(true);
    else expect(next.units[1].hp).toBeLessThan(1000);
  });
  it('makes paid infantry fortification stronger than ordinary guard',()=>{
    const c=fixture(), a=c.units[0];
    const base={ ...a };delete base.troop;
    const defender=attachTroops({...base,attack:10,defense:0,hp:20,maxHp:20},'infantry',100);
    const attacker={...c.units[1],x:defender.x+1,y:defender.y,attack:100,defense:0,dodgeRate:0,speed:1};
    const initial={...c,units:[{...defender,dodgeRate:0},attacker]};
    const guarded=applyGuard(initial,defender.id);
    const fortified=performTroopSkill(initial,defender.id,defender.x,defender.y);
    const normal=performAttack(guarded,attacker.id,defender.id).lastEvent!.damage;
    const strong=performAttack(fortified,attacker.id,defender.id).lastEvent!.damage;
    expect(strong).toBeLessThan(normal);
  });
});


describe('morale continuity within an action and legacy checkpoints',()=>{
 it.each([undefined,1,2] as const)('uses default80 morale for legal legacy actions without rebasing version%s',(attributeVersion)=>{
  const state={...createInitialState(()=>0),phase:'battle' as const,encounter:'ambush' as const};
  const cp=checkpointBattle(createCombatState(null,state.party),state);
  const legacy={...cp,attributeVersion,units:cp.units.map(u=>{const old={...u};delete old.morale;return old;})};
  expect(isBattleSnapshot(legacy,state)).toBe(true);
  const actor=currentActor(legacy)!;
  const guarded=applyGuard(legacy,actor.id).units.find(u=>u.id===actor.id)!;
  expect(guarded.morale).toBe(90);expect(guarded.attack).toBe(actor.attack);expect(guarded.defense).toBe(actor.defense);
  expect(updateUnitHp(actor,actor.hp-1).morale).toBeLessThan(80);
  const target={...legacy.units.find(u=>u.team!==actor.team)!,x:actor.x+1,y:actor.y,hp:100,maxHp:100,defense:0,dodgeRate:0};
  const attack=performAttack({...legacy,terrain:[],units:[actor,target]},actor.id,target.id);
  expect(attack.units[0].morale).toBe(83);expect(attack.units[1].morale).toBeLessThan(80);
  expect(attack.attributeVersion).toBe(attributeVersion);
 });
 it.each(['party','enemy'] as const)('keeps the %s actor until its move and attack are complete after fire damage',(team)=>{
  const base=createCombatState(null),a=base.units.find(u=>u.team===team)!,b=base.units.find(u=>u.team!==team)!;
  const actor={...a,x:1,y:1,speed:14,morale:65,hp:20,maxHp:20,weapon:'cleaver' as const};
  const target={...b,x:3,y:1,speed:13,morale:80,hp:100,maxHp:100,dodgeRate:0};
  const combat={...base,terrain:[],units:[actor,target],movedIds:[],actedIds:[],selectedId:team==='party'?actor.id:null,turn:team,
   fires:[{x:2,y:1,level:3 as const,remainingRounds:3,sourceId:target.id}]};
  expect(currentActor(combat)?.id).toBe(actor.id);
  const moved=moveUnit(combat,actor.id,2,1);expect(moved.units[0].morale).toBeLessThan(65);
  expect(currentActor(moved)?.id).toBe(actor.id);
  const restored=JSON.parse(JSON.stringify(moved));expect(currentActor(restored)?.id).toBe(actor.id);
  const attacked=performAttack(restored,actor.id,target.id);expect(attacked.actedIds).toContain(actor.id);
  expect(currentActor(advanceTurn(attacked))?.id).toBe(target.id);
  const dead={...moved,units:[{...moved.units[0],hp:0},target]};
  expect(currentActor(dead)?.id).toBeUndefined();
 });
});
