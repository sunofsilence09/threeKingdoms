import { attributeContribution } from './attributes';
import { describe, expect, it } from 'vitest';
import { createCombatState, makePartyUnit, performAttack, updateUnitHp, type CombatState } from './combat';
import { attachTroops, damageAfterDefense, troopStats } from './troopCombat';
import { createInitialState } from './state';
import { effectiveAttributes } from './characterTalents';
import { initializeTroopCombat } from './troopManagement';
import { checkpointBattle, isBattleSnapshot } from './battleSave';
import { formationStrength, applyFormationDamage } from './garrisonStrength';
import { makeGarrisonUnit } from './garrisonCombat';

describe('2.3 commander and troop rules', () => {
  it.each([0, 1, 100, 1000])('attaches %s soldiers to the protagonist using earned command and strength', count => {
    const state = createInitialState(() => 0);
    state.party.traveler.bondBonus = 2;
    state.troopAssignments = { traveler: { kind: 'spear', count } };
    const combat = initializeTroopCombat(createCombatState(null, state.party), state);
    const hero = combat.units.find(u => u.id === 'traveler')!;
    const base = makePartyUnit('traveler', state.party.traveler, null, 'ambush');
    const attrs = effectiveAttributes('traveler', state.party.traveler.attributes, 3, 2);
    expect(hero.attack).toBeCloseTo(base.attack + Math.ceil(count / 10) * (1 + .02 * Math.max(attributeContribution(attrs.command,3), 0) + .01 * Math.max(attributeContribution(attrs.strength,3), 0)));
    expect(hero.defense).toBeCloseTo(base.defense + Math.ceil(count / 40) * (1 + .02 * Math.max(attributeContribution(attrs.command,3), 0)));
    expect(hero.hp).toBe(base.hp + count * 2);
    expect(combat.troopRuleVersion).toBe(2);
  });
  it('recalculates commander bonuses from survivors, without healing resurrecting soldiers', () => {
    const unit = attachTroops(createCombatState(null).units[0], 'spear', 1000, { command: 30, strength: 20 }, 2);
    const hurt = updateUnitHp(unit, unit.hp - 1000);
    expect(hurt.troop?.count).toBe(500);
    expect(hurt.attack).toBeCloseTo(unit.troop!.baseAttack + 50 * 1.5);
    expect(updateUnitHp(hurt, hurt.maxHp).troop?.count).toBe(500);
    expect(unit.troop?.count).toBe(1000);
  });
  it('uses the same proportional defense for either team, preserves pure duels and old rules', () => {
    const base = createCombatState(null);
    const actor = attachTroops({ ...base.units[0], attack: 100, defense: 0 }, 'spear', 1000);
    const target = { ...actor, id: 'enemy:test', team: 'enemy' as const, defense: 200 };
    expect(damageAfterDefense(base, actor, target)).toBeCloseTo(200 / 3);
    expect(damageAfterDefense(base, target, actor)).toBe(160);
    expect(damageAfterDefense({ ...base, troopRuleVersion: undefined }, actor, target)).toBe(1);
    const unarmed = { ...actor, troop: undefined };
    expect(damageAfterDefense(base, unarmed, { ...target, troop: undefined })).toBe(1);
  });
  it('uses new mitigation in actual ordinary attacks, before guard and casualty updates', () => {
    const base = createCombatState(null);
    const actor = attachTroops({ ...base.units[0], speed: 100, x: 1, y: 1, attack: 100, defense: 0 }, 'spear', 1000);
    const target = attachTroops({ ...base.units.find(u => u.team === 'enemy')!, x: 2, y: 1, defense: 200, dodgeRate: 0 }, 'spear', 1000);
    const combat: CombatState = { ...base, terrain: [], units: [actor, target], selectedId: actor.id };
    const result = performAttack(combat, actor.id, target.id);
    expect(result.lastEvent?.damage).toBe(Math.ceil(actor.attack * 100 / (100 + target.defense)));
    expect(result.lastEvent?.damage).toBeGreaterThan(1);
    const legacy = performAttack({ ...combat, troopRuleVersion: undefined }, actor.id, target.id);
    expect(legacy.lastEvent?.damage).toBe(1);
  });
  it('validates new fractional commander snapshots and rejects tampered/downgraded versions', () => {
    const state = { ...createInitialState(() => 0), phase: 'battle' as const, encounter: 'ambush' as const };
    state.troopAssignments = { traveler: { kind: 'spear', count: 101 } };
    const combat = initializeTroopCombat(createCombatState(null, state.party), state);
    const cp = checkpointBattle(combat, state);
    expect(isBattleSnapshot(cp, state)).toBe(true);
    expect(isBattleSnapshot({ ...cp, troopRuleVersion: undefined }, state)).toBe(false);
    const hero = cp.units.find(u => u.id === 'traveler')!;
    const bad = { ...cp, units: cp.units.map(u => u.id === hero.id ? { ...u, troop: { ...u.troop!, command: NaN } } : u) };
    expect(isBattleSnapshot(bad, state)).toBe(false);
    const legacyTroop = { kind: 'spear' as const, count: 101, initial: 101, baseMaxHp: hero.troop!.baseMaxHp, baseAttack: hero.troop!.baseAttack, baseDefense: hero.troop!.baseDefense };
    const legacy = checkpointBattle({ ...createCombatState(null, state.party), troopRuleVersion: undefined,
      units: createCombatState(null, state.party).units.map(u => u.id === 'traveler' ? { ...u, troop: legacyTroop, ...troopStats(legacyTroop), hp: u.hp + 202, maxHp: u.maxHp + 202 } : u) }, state);
    expect(isBattleSnapshot(legacy, state)).toBe(true);
  });
  it('puts new garrisons on the same soldier scale and preserves legacy wounded formations', () => {
    const group = formationStrength(1000);
    expect(group.maxHp).toBe(2000);
    expect(group.attack).toBe(100);
    expect(group.defense).toBe(25);
    const hurt = applyFormationDamage(group, 1000);
    expect(hurt.troops).toBe(500); expect(hurt.attack).toBe(50);
    const unit = makeGarrisonUnit('zhuo',1000);
    const wounded = updateUnitHp(unit,999);
    const healed = updateUnitHp(wounded,2000);
    expect(healed.hp).toBe(1000); expect(healed.formation?.troops).toBe(500);
    const base = createCombatState(null), state = createInitialState(() => 0);
    expect(isBattleSnapshot(checkpointBattle({ ...base, terrain: [], selectedId: null, units:[{ ...base.units[0],x:1,y:1 },{...unit,x:2,y:1}] },state))).toBe(true);
    const legacy = formationStrength(1000, undefined, 2, 1);
    expect(legacy.hp).toBe(10000);
    expect(applyFormationDamage(legacy, 21).attack).toBe(998 * 3);
  });
});
