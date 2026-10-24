import { describe, expect, it } from 'vitest';
import { createCombatState, currentActor, applyGuard, advanceTurn, resolveEnemyTurn, performAttack, moveUnit, attackPower, movementRange, updateUnitHp, type CombatState } from './combat';
import { createInitialState } from './state';
import { createProgress } from './growth';
import { martialForPerson } from './martialCatalog';
import { initializeMartialCombat, availableMartials, performMartial, martialTargets, createDuelCombat, resolveMartialAI } from './martialCombat';
import { startDuel } from './martial';
import { makeGarrisonUnit } from './garrisonCombat';

function fixture(personId: string) {
  const state = createInitialState(() => 0);
  const combat = createCombatState(null, { ...state.party, [personId]: createProgress(3) }, 'ambush', ['traveler', personId]);
  const actor = combat.units.find(u => u.id === personId)!;
  const enemy = combat.units.find(u => u.team === 'enemy')!;
  return { state, combat: initializeMartialCombat({ ...combat, terrain: [], selectedId: personId,
    units: [{ ...actor, x: 2, y: 2, speed: 99 }, { ...enemy, x: 4, y: 2, speed: 1 }], actedIds: [], movedIds: [] }, state), id: personId, enemyId: enemy.id };
}

function supportFixture(personId: string) {
  const base = fixture(personId);
  const caster = { ...base.combat.units[0], hp: 50, maxHp: 100, attack: 8 };
  const friend = { ...caster, id: 'aman', name: '阿满', x: 3, hp: 41, speed: 20, martialIds: [], effects: [] };
  const enemy = { ...base.combat.units[1], hp: 100, maxHp: 100, attack: 10 };
  return { ...base, combat: { ...base.combat, units: [caster, friend, enemy] } };
}

describe('martial combat actions', () => {
  it.each(['cao-cao', 'liu-bei'])('blocks %s area support behind a solid wall', personId => {
    const { combat, id } = supportFixture(personId);
    const blocked: CombatState = { ...combat, terrain: [{ x: 3, y: 2, kind: 'wall' }],
      units: combat.units.map((unit, index) => index === 1 ? { ...unit, x: 4 } : index === 2 ? { ...unit, x: 6 } : unit) };
    const next = performMartial(blocked, id, martialForPerson(id)!.id, 2, 2);
    expect(next.actedIds).toContain(id);
    expect(next.units[0]).not.toEqual(blocked.units[0]);
    expect(next.units[1]).toEqual(blocked.units[1]);
  });

  it('preserves Liu guard protection against an equal-power intimidation attack', () => {
    const { combat, id, enemyId } = fixture('zhang-fei');
    const guarded: CombatState = { ...combat, route: 'liu', units: combat.units.map((unit, index) => index === 0
      ? { ...unit, team: 'enemy', attack: 5 }
      : { ...unit, team: 'party', x: 3, hp: 100, maxHp: 100, defense: 0, dodgeRate: 0, guarded: true }) };
    expect(performAttack(guarded, id, enemyId).lastEvent?.damage).toBe(2);
    expect(performMartial(guarded, id, martialForPerson(id)!.id, 3, 2).lastEvent?.damage).toBe(2);
  });

  it('records the actual path burn before the dash event, including a lethal dash', () => {
    const { combat, id } = fixture('sun-shangxiang');
    const corridor: CombatState = { ...combat, width: 7, height: 1,
      fires: [{ x: 1, y: 0, level: 1, remainingRounds: 2, sourceId: combat.units[1].id }],
      units: combat.units.map((u, i) => ({ ...u, x: i ? 6 : 0, y: 0, hp: 100, maxHp: 100 })) };
    const skillId = martialForPerson(id)!.id;
    for (const hp of [100, 5]) {
      const next = performMartial({ ...corridor, units: corridor.units.map((u, i) => i ? u : { ...u, hp }) }, id, skillId, 3, 0);
      expect(next.units[0]).toMatchObject({ hp: Math.max(0, hp - 8), x: hp === 5 ? 1 : 3 });
      expect(next.turnEvents?.map(e => e.kind)).toEqual(['burn', 'martial']);
      expect(next.turnEvents?.[0]).toMatchObject({ targetId: id, damage: 8 });
      expect(next.lastEvent).toBe(next.turnEvents?.[1]);
      expect(next.actedIds).toContain(id);
    }
  });

  it('records each fire god ignition exactly once before its common skill event', () => {
    const { combat, id } = fixture('zhou-yu');
    const windy: CombatState = { ...combat, randomSeed: 1,
      environment: { month: 3, weather: 'sunny', windDirection: 'e', windStrength: 2 },
      lastEvent: { kind: 'burn', actorId: id, targetId: id, damage: 2 },
      turnEvents: [{ kind: 'burn', actorId: id, targetId: id, damage: 2 }] };
    const next = performMartial(windy, id, martialForPerson(id)!.id, 4, 2);
    expect(next.fires?.map(f => [f.x, f.y, f.level])).toEqual([[4, 2, 2], [5, 2, 1]]);
    expect(next.turnEvents?.map(e => e.kind)).toEqual(['fire', 'fire', 'martial']);
    expect(next.turnEvents?.slice(0, 2).map(e => [e.x, e.y, e.success])).toEqual([[4, 2, true], [5, 2, true]]);
    expect(next.lastEvent).toBe(next.turnEvents?.[2]);
    const blocked: CombatState = { ...windy, terrain: [{ x: 5, y: 2, kind: 'water' }] };
    expect(performMartial(blocked, id, martialForPerson(id)!.id, 4, 2).turnEvents?.map(e => e.kind)).toEqual(['fire', 'martial']);
  });

  it('keeps internal ignition events when the enemy AI uses fire god', () => {
    const { combat, id } = fixture('zhou-yu');
    const enemy: CombatState = { ...combat, randomSeed: 1,
      environment: { month: 3, weather: 'sunny', windDirection: 'e', windStrength: 2 },
      units: combat.units.map((u, i) => ({ ...u, team: i ? 'party' : 'enemy', x: i ? 5 : 2, hp: 100, maxHp: 100 })) };
    const next = resolveEnemyTurn(advanceTurn(enemy), resolveMartialAI);
    expect(next.actedIds).toContain(id);
    expect(next.turnEvents?.map(e => e.kind)).toEqual(['fire', 'fire', 'martial']);
  });

  it('makes fire god AI avoid a downwind ally while preserving deliberate player friendly fire', () => {
    const { combat, id } = fixture('zhou-yu');
    const open = new Set(['0,0', '1,0', '1,1', '2,1', '3,1']);
    const terrain: CombatState['terrain'] = [];
    for (let y = 0; y < combat.height; y++) for (let x = 0; x < combat.width; x++) {
      if (!open.has(`${x},${y}`)) terrain.push({ x, y, kind: 'wall' });
    }
    const enemy: CombatState = { ...combat, terrain, randomSeed: 1,
      environment: { month: 3, weather: 'sunny', windDirection: 'nw', windStrength: 2 },
      units: [{ ...combat.units[0], team: 'enemy', x: 0, y: 0 },
        { ...combat.units[1], team: 'party', x: 3, y: 1, hp: 100, maxHp: 100 },
        { ...combat.units[1], id: 'friendly', team: 'enemy', x: 1, y: 0 }] };
    expect(resolveMartialAI(enemy)).toBe(enemy);
    const deliberate = performMartial(enemy, id, martialForPerson(id)!.id, 2, 1);
    expect(deliberate.fires).toContainEqual(expect.objectContaining({ x: 1, y: 0, sourceId: id }));
  });
  it('gives named characters their native skill while an untrained hero has none', () => {
    const { combat, id } = fixture('zhou-yu');
    expect(availableMartials(combat, id).map(s => s.id)).toContain(martialForPerson(id)!.id);
    expect(availableMartials(combat, 'traveler')).toEqual([]);
  });

  it('fire god creates level two fire, consumes the action and has three rounds cooldown', () => {
    const { combat, id } = fixture('zhou-yu');
    const skill = martialForPerson(id)!;
    const guaranteed = { ...combat, terrain: [{ x: 4, y: 2, kind: 'woods' as const }], randomSeed: 1,
      environment: { month: 3, weather: 'sunny' as const, windDirection: 'calm' as const, windStrength: 0 as const } };
    const next = performMartial(guaranteed as typeof combat, id, skill.id, 4, 2);
    expect(next).not.toBe(guaranteed);
    expect(next.actedIds).toContain(id);
    expect(next.fires?.some(f => f.x === 4 && f.y === 2 && f.level === 2)).toBe(true);
    expect(next.units.find(u => u.id === id)?.martialReady?.[skill.id]).toBe(next.round + 3);
    expect(performMartial(next, id, skill.id, 4, 2)).toBe(next);
  });

  it('rejects out of range and obstructed skill targets without consuming the action', () => {
    const { combat, id } = fixture('lu-bu');
    const skill = martialForPerson(id)!;
    expect(performMartial(combat, id, skill.id, 15, 9)).toBe(combat);
    const blocked = { ...combat, terrain: [{ x: 3, y: 2, kind: 'wall' as const }] };
    expect(performMartial(blocked, id, skill.id, 4, 2)).toBe(blocked);
  });

  it('protect heals only living allies and cannot target an enemy', () => {
    const { combat, id } = fixture('zhao-yun');
    const skill = martialForPerson(id)!;
    const wounded = { ...combat, units: combat.units.map(u => u.id === id ? { ...u, hp: 1 } : u) };
    const healed = performMartial(wounded, id, skill.id, 2, 2);
    expect(healed.units.find(u => u.id === id)!.hp).toBeGreaterThan(1);
    expect(performMartial(combat, id, skill.id, 4, 2)).toBe(combat);
    expect(martialTargets(combat, id, skill.id)).not.toContainEqual({ x: 4, y: 2 });
  });

  it('allows a native ability again when its saved ready round is reached', () => {
    const { combat, id } = fixture('cao-ren');
    const skill = martialForPerson(id)!;
    const next = performMartial(combat, id, skill.id, 2, 2);
    expect(next.actedIds).toContain(id);
    let turn = advanceTurn(next);
    for (let i = 0; i < 8 && turn.round < next.round + 3; i++) {
      const actor = currentActor(turn)!;
      turn = advanceTurn(applyGuard(turn, actor.id));
    }
    expect(martialTargets(turn, id, skill.id)).not.toEqual([]);
  });
  it('preserves the route hero equipment when assembling a duel', () => {
    const initial = createInitialState(() => 0);
    const state = startDuel({ ...initial, phase: 'overworld', route: 'sun', party: { ...initial.party, 'zhou-yu': createProgress() } }, 'zhou-yu');
    const duel = createDuelCombat(createCombatState('sun', state.party, 'ambush', ['traveler']), state);
    expect(duel.units.find(u => u.id === 'traveler')?.weapon).toBe('knife');
  });

  it('break uses the current weapon range and caps combined attack bonuses', () => {
    const { combat, id } = fixture('guan-yu');
    combat.units = combat.units.map((u, i) => ({ ...u, hp: 100, maxHp: 100, attack: 10, defense: i ? 2 : 0 }));
    combat.units[0].empowered = true;
    combat.units[0].effects = [{ kind: 'attack-up', value: .25, sourceId: id, expiresRound: 3 }];
    combat.units[1].guarded = true;
    const skillId = martialForPerson(id)!.id;
    const next = performMartial(combat, id, skillId, 4, 2);
    expect(next.units[1].hp).toBe(93); // (10 × 1.5 − 2) × .5, rounded up.
    expect(next.units[0].effects).toEqual([]);
    expect(next.units[0].empowered).toBe(false);
    expect(performAttack(next, id, combat.units[1].id)).toBe(next);
    const shortWeapon: CombatState = { ...combat, units: combat.units.map((u, i) => i ? u : { ...u, weapon: 'fists' }) };
    expect(performMartial(shortWeapon, id, skillId, 4, 2)).toBe(shortWeapon);
  });

  it('pierce reaches a straight target two tiles away but cannot cut through a wall or turn a corner', () => {
    const { combat, id } = fixture('zhang-liao');
    combat.units = combat.units.map((u, i) => ({ ...u, hp: 100, maxHp: 100, attack: 10, defense: i ? 2 : 0 }));
    const skillId = martialForPerson(id)!.id;
    expect(performMartial(combat, id, skillId, 4, 2).units[1].hp).toBe(89);
    const blocked: CombatState = { ...combat, terrain: [{ x: 3, y: 2, kind: 'wall' }] };
    expect(performMartial(blocked, id, skillId, 4, 2)).toBe(blocked);
    const diagonal = { ...combat, units: combat.units.map((u, i) => i ? { ...u, x: 3, y: 3 } : u) };
    expect(performMartial(diagonal, id, skillId, 3, 3)).toBe(diagonal);
  });

  it('shoot needs no bow, respects its minimum range, cover, guard and dodge', () => {
    const { combat, id } = fixture('lu-bu');
    combat.units = combat.units.map((u, i) => ({ ...u, hp: 100, maxHp: 100, attack: 10, defense: i ? 2 : 0 }));
    combat.units[0].weapon = 'fists';
    combat.terrain = [{ x: 4, y: 2, kind: 'woods' }];
    const skillId = martialForPerson(id)!.id;
    expect(performMartial(combat, id, skillId, 4, 2).units[1].hp).toBe(90);
    const guarded = { ...combat, units: combat.units.map((u, i) => i ? { ...u, guarded: true } : u) };
    expect(performMartial(guarded, id, skillId, 4, 2).units[1].hp).toBe(95);
    const dodging = { ...combat, randomSeed: 1, units: combat.units.map((u, i) => i ? { ...u, dodgeRate: .4 } : u) };
    const missed = performMartial(dodging, id, skillId, 4, 2);
    expect(missed.units[1].hp).toBe(100);
    expect(missed.lastEvent?.kind).toBe('dodge');
    expect(missed.actedIds).toContain(id);
    const adjacent = { ...combat, units: combat.units.map((u, i) => i ? { ...u, x: 3 } : u) };
    expect(performMartial(adjacent, id, skillId, 3, 2)).toBe(adjacent);
    const distant = { ...combat, units: combat.units.map((u, i) => i ? { ...u, x: 7 } : u) };
    expect(performMartial(distant, id, skillId, 7, 2)).toBe(distant);
  });

  it('intimidate weakens movement and damage for precisely the victim next action', () => {
    const { combat, id } = fixture('zhang-fei');
    combat.units = combat.units.map(u => ({ ...u, hp: 100, maxHp: 100, attack: 10, defense: 0 }));
    const next = advanceTurn(performMartial(combat, id, martialForPerson(id)!.id, 4, 2));
    const victim = next.units[1];
    expect(victim.hp).toBe(90);
    expect(movementRange(next, victim)).toBe(1);
    expect(attackPower(victim)).toBe(8);
    const attacked = performAttack(moveUnit(next, victim.id, 3, 2), victim.id, id);
    expect(attacked.units[0].hp).toBe(92);
    expect(attacked.units[1].effects).toEqual([]);
    expect(attackPower(attacked.units[1])).toBe(10);
  });

  it('dash charges forest cost, cannot cross occupied tiles, and can follow a normal move', () => {
    const { combat, id } = fixture('sun-shangxiang');
    const corridor: CombatState = { ...combat, width: 9, height: 1,
      terrain: [{ x: 1, y: 0, kind: 'woods' }, { x: 2, y: 0, kind: 'woods' }],
      units: combat.units.map((u, i) => ({ ...u, x: i ? 8 : 0, y: 0 })), movedIds: [id] };
    const skillId = martialForPerson(id)!.id;
    expect(martialTargets(corridor, id, skillId)).toContainEqual({ x: 3, y: 0 });
    expect(performMartial(corridor, id, skillId, 4, 0)).toBe(corridor);
    const next = performMartial(corridor, id, skillId, 3, 0);
    expect(next.units[0].x).toBe(3);
    expect(next.actedIds).toContain(id);
    const occupied = { ...corridor, units: [...corridor.units, { ...corridor.units[0], id: 'aman', x: 2, speed: 1 }] };
    expect(martialTargets(occupied, id, skillId)).not.toContainEqual({ x: 3, y: 0 });
  });

  it('fortify reduces nearby friendly damage until the caster next action begins', () => {
    const { combat, id } = supportFixture('cao-ren');
    const skillId = martialForPerson(id)!.id;
    let next = advanceTurn(performMartial(combat, id, skillId, 2, 2));
    expect(next.units[0].effects).toContainEqual(expect.objectContaining({ kind: 'reduction', value: .3 }));
    expect(next.units[1].effects).toContainEqual(expect.objectContaining({ kind: 'reduction', value: .3 }));
    expect(next.units[2].effects).toEqual([]);
    next = advanceTurn({ ...next, actedIds: [id, 'aman'] });
    next = performAttack(next, next.units[2].id, 'aman');
    expect(next.units[1].hp).toBe(34);
    next = advanceTurn(next);
    expect(currentActor(next)?.id).toBe(id);
    expect(next.units[0].effects).toEqual([]);
    expect(next.units[1].effects).toEqual([]);
  });

  it('protect heals a wounded formation without exceeding its original troop capacity', () => {
    const { combat, id } = supportFixture('zhao-yun');
    const formation = { ...updateUnitHp(makeGarrisonUnit('zhuo', 10, 3, 2), 88), team: 'party' as const };
    combat.units[1] = formation;
    const next = performMartial(combat, id, martialForPerson(id)!.id, 3, 2);
    expect(next.units[1]).toMatchObject({ hp: 100, attack: 30, defense: 10, formation: { hp: 100, troops: 10, initialTroops: 10 } });
    expect(next.units[1].effects).toContainEqual(expect.objectContaining({ kind: 'reduction', value: .2 }));
    const dead = { ...combat, units: combat.units.map((u, i) => i === 1 ? updateUnitHp(u, 0) : u) };
    expect(performMartial(dead, id, martialForPerson(id)!.id, 3, 2)).toBe(dead);
  });

  it('inspire boosts one friendly attack, takes the stronger ultimate bonus, and expires after two rounds', () => {
    const { combat, id } = supportFixture('cao-cao');
    const inspired = advanceTurn(performMartial(combat, id, martialForPerson(id)!.id, 2, 2));
    expect(inspired.units[2].effects).toEqual([]);
    const hit = performAttack(inspired, 'aman', inspired.units[2].id);
    expect(hit.units[2].hp).toBe(90);
    expect(hit.units[1].effects).toEqual([]);
    const empowered = { ...inspired, units: inspired.units.map(u => u.id === 'aman' ? { ...u, empowered: true } : u) };
    expect(performAttack(empowered, 'aman', empowered.units[2].id).units[2].hp).toBe(88);
    let expired = inspired;
    while (expired.round < 3) expired = advanceTurn(applyGuard(expired, currentActor(expired)!.id));
    expect(expired.units.every(u => !u.effects?.some(e => e.kind === 'attack-up'))).toBe(true);
  });

  it('soothe heals all nearby living allies and synchronizes recovered formation strength', () => {
    const { combat, id } = supportFixture('liu-bei');
    combat.units[1] = { ...updateUnitHp(makeGarrisonUnit('zhuo', 10, 3, 2), 68), team: 'party' };
    const outside = { ...combat.units[0], id: 'outside', x: 2, y: 5, speed: 1 };
    const dead = { ...combat.units[0], id: 'fallen', x: 1, hp: 0 };
    combat.units.push(outside, dead);
    const next = performMartial(combat, id, martialForPerson(id)!.id, 2, 2);
    expect(next.units[0].hp).toBe(60);
    expect(next.units[1]).toMatchObject({ hp: 78, attack: 24, defense: 8, formation: { hp: 78, troops: 8 } });
    expect(next.units[2].hp).toBe(100);
    expect(next.units[3].hp).toBe(50);
    expect(next.units[4].hp).toBe(0);
  });

  it('rally removes movement and attack penalties but keeps existing positive effects', () => {
    const { combat, id } = supportFixture('sun-quan');
    combat.units[1].effects = [
      { kind: 'attack-down', value: .2, sourceId: combat.units[2].id, expiresRound: 3 },
      { kind: 'move-down', value: 1, sourceId: combat.units[2].id, expiresRound: 3 },
      { kind: 'attack-up', value: .25, sourceId: id, expiresRound: 3 },
    ];
    const next = performMartial(combat, id, martialForPerson(id)!.id, 3, 2);
    expect(next.units[1].hp).toBe(41);
    expect(next.units[1].effects?.map(e => e.kind)).toEqual(['attack-up', 'reduction']);
    expect(movementRange(next, next.units[1])).toBe(3);
    expect(attackPower(next.units[1])).toBe(10);
  });

  it('assembles only the real hero and teacher, preserves equipped arts and leaves party growth unchanged', () => {
    const initial = createInitialState(() => 0);
    const hero = createProgress(6);
    hero.attributes.strength = 14; hero.attributes.courage = 12; hero.points -= 6;
    const skills = ['cao-cao', 'zhou-yu', 'lu-bu'].map(person => martialForPerson(person)!.id);
    const state = startDuel({ ...initial, heroName: '阿朔', phase: 'overworld', route: 'sun',
      party: { ...initial.party, traveler: hero, 'zhou-yu': createProgress(9) },
      martial: { ...initial.martial, learned: skills, equipped: skills } }, 'zhou-yu');
    expect(state.duel?.teacherId).toBe('zhou-yu');
    const before = structuredClone(state.party);
    const base = createCombatState('sun', state.party, 'ambush', ['traveler']);
    const duel = createDuelCombat(base, state);
    expect(duel.units.map(u => [u.id, u.team])).toEqual([['traveler', 'party'], ['enemy:zhou-yu', 'enemy']]);
    expect(duel.units[0]).toMatchObject({ name: '阿朔', level: 6, martialIds: skills });
    expect(duel.units[0]).toMatchObject({ weapon: 'knife', attack: 10, hp: 25, maxHp: 25 });
    expect(duel.units[1]).toMatchObject({ level: 9, weapon: 'sword', martialIds: ['martial-zhou-yu'] });
    expect(duel.environment).toEqual(base.environment);
    expect(state.party).toEqual(before);
    expect(duel.units[1].martialReady).toEqual({});
  });
});
