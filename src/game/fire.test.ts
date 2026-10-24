import { describe, expect, it } from 'vitest';
import { advanceTurn, attackPower, createCombatState, currentActor, endAction, environmentLabel, fireChance, fireTargets, moveUnit, movementRange, performAttack, resolveEnemyTurn, resolveRoundEnd, setFire, spreadChance, terrainAt, type CombatState } from './combat';
import { createEnvironment, EXTINGUISH_CHANCE, nextRandom } from './battleEnvironment';
import { makeGarrisonUnit } from './garrisonCombat';

function arena(): CombatState {
  const base = createCombatState(null);
  return { ...base, width: 7, height: 5, terrain: [], randomSeed: 12345, round: 1, actedIds: [], movedIds: [], fires: [], scorched: [],
    environment: { month: 6, weather: 'sunny', windDirection: 'e', windStrength: 2 },
    units: [{ ...base.units[0], x: 1, y: 2, hp: 100, maxHp: 100, speed: 20 }, { ...base.units[3], x: 4, y: 2, hp: 100, maxHp: 100, speed: 10 }] };
}
function seedFor(roll: (n: number) => boolean): number { for (let n = 1; n < 100000; n++) if (roll(nextRandom(n).roll)) return n; throw Error('seed'); }
function finish(state: CombatState): CombatState { return advanceTurn({ ...state, actedIds: state.units.map(u => u.id) }); }

describe('battle environment and ignition', () => {
  it('creates deterministic seasonal environments and an unambiguous wind label', () => {
    expect(createCombatState(null).environment).toBeDefined();
    expect(createCombatState(null).fires).toEqual([]);
    for (let seed = 1; seed < 100; seed++) {
      const summer = createEnvironment(6, seed);
      expect(summer).toEqual(createEnvironment(6, seed));
      expect(summer.weather).not.toBe('snow');
      if (summer.windDirection === 'calm') expect(summer.windStrength).toBe(0);
    }
    expect(Array.from({ length: 200 }, (_, n) => createEnvironment(12, n * 4567 + 1).weather)).toContain('snow');
    expect(environmentLabel(arena())).toContain('吹向东');
    expect(environmentLabel(arena())).toContain('下轮');
    expect(new Set(Object.values(EXTINGUISH_CHANCE)).size).toBe(6);
  });
  it('uses terrain, weather and strong wind and never ignites nonfuel or scorched tiles', () => {
    const state = arena(); state.terrain = [{ x: 2, y: 2, kind: 'woods' }, { x: 1, y: 1, kind: 'water' }];
    expect(fireChance(state, 2, 2)).toBe(85);
    expect(fireChance(state, 2, 1)).toBe(45);
    expect(fireChance({ ...state, environment: { ...state.environment!, weather: 'rain' } }, 2, 2)).toBe(48);
    expect(fireChance(state, 1, 1, 100)).toBe(0);
    expect(fireChance({ ...state, scorched: [{ x: 2, y: 2 }] }, 2, 2)).toBe(0);
    expect(fireChance(state, -1, 0)).toBe(0);
    expect(fireTargets(state, state.units[0].id)).toContainEqual({ x: 1, y: 2 });
  });
  it('uses a battle seed and month without changing the legacy attack RNG', () => {
    const a = createCombatState(null, undefined, 'ambush', undefined, { month: 12, seed: 123456 });
    const b = createCombatState(null, undefined, 'ambush', undefined, { month: 12, seed: 123456 });
    expect(a).toEqual(b); expect(a.randomSeed).toBe(123456); expect(a.environment?.month).toBe(12);
    expect(createCombatState(null, undefined, 'ambush', undefined, { seed: 789012 }).environment).not.toEqual(a.environment);
  });
  it('rejects illegal actions without spending a turn but failed legal ignition spends it', () => {
    const state = arena(), id = state.units[0].id;
    expect(setFire(state, id, 6, 4)).toBe(state);
    expect(setFire(state, state.units[1].id, 4, 2)).toBe(state);
    expect(fireTargets({ ...state, units: state.units.map(u => ({ ...u, weapon: 'claws' })) }, id)).toEqual([]);
    const failure = setFire({ ...state, randomSeed: seedFor(n => n > .95) }, id, 1, 2);
    expect(failure.actedIds).toContain(id); expect(failure.fires).toEqual([]); expect(failure.lastEvent?.success).toBe(false);
    const success = setFire({ ...state, randomSeed: seedFor(n => n < .01) }, id, 1, 2);
    expect(success.fires).toEqual([{ x: 1, y: 2, level: 1, remainingRounds: 2, sourceId: id }]);
    const repeat = { ...success, actedIds: [] };
    expect(setFire(repeat, id, 1, 2)).toBe(repeat);
    expect(success.movedIds).toEqual([]);
  });
  it('uses blow-to direction for spread and scales by weather and fuel', () => {
    const state = arena(); state.terrain = [{ x: 3, y: 2, kind: 'woods' }, { x: 1, y: 2, kind: 'woods' }, { x: 2, y: 1, kind: 'woods' }];
    expect(spreadChance(state, { x: 2, y: 2 }, { x: 3, y: 2 })).toBe(65);
    expect(spreadChance(state, { x: 2, y: 2 }, { x: 1, y: 2 })).toBe(5);
    expect(spreadChance(state, { x: 2, y: 2 }, { x: 2, y: 1 })).toBe(15);
  });
});

describe('round fire snapshots and burn movement', () => {
  it('burns friends and enemies through armor and guard once and advances exactly one round', () => {
    const state = arena(); state.randomSeed = seedFor(n => n > .1);
    state.fires = state.units.map(u => ({ x: u.x, y: u.y, level: 2, remainingRounds: 1, sourceId: state.units[0].id }));
    state.units = state.units.map(u => ({ ...u, guarded: true, defense: 999 }));
    const next = finish(state);
    expect(next.units.map(u => u.hp)).toEqual([90, 90]); expect(next.round).toBe(2);
    expect(next.scorched).toHaveLength(2); expect(state.units[0].hp).toBe(100);
  });
  it('extinguishes before damage without scorching and new spread cannot chain or damage this round', () => {
    const state = arena(); state.environment!.windStrength = 0; state.environment!.windDirection = 'calm';
    state.fires = [{ x: 1, y: 2, level: 1, remainingRounds: 2, sourceId: 'traveler' }];
    const rain = resolveRoundEnd({ ...state, randomSeed: seedFor(n => n < .9), environment: { ...state.environment!, weather: 'storm' } });
    expect(rain.fires).toEqual([]); expect(rain.scorched).toEqual([]); expect(rain.units[0].hp).toBe(100);
    // Search deterministic seeds for a real spread, then inspect its snapshot behavior.
    const spreading = Array.from({ length: 100 }, (_, n) => resolveRoundEnd({ ...state, randomSeed: n * 99991 + 12345 })).find(s => s.fires!.length > 1)!;
    expect(spreading).toBeDefined(); expect(spreading.fires!.length).toBeLessThanOrEqual(3);
    expect(spreading.fires!.filter(f => f.x !== 1 || f.y !== 2).every(f => f.remainingRounds === 2 && f.level === 1)).toBe(true);
    expect(spreading.units[0].hp).toBe(92);
  });
  it('burnt forests become cost-one exposed ground while bridges and carts retain topology', () => {
    const state = arena(); state.randomSeed = seedFor(n => n > .1);
    state.terrain = [{ x: 2, y: 2, kind: 'woods' }, { x: 3, y: 2, kind: 'bridge' }, { x: 4, y: 2, kind: 'cart' }];
    state.fires = state.terrain.map(t => ({ ...t, level: 1, remainingRounds: 1, sourceId: 'traveler' }));
    // A late burn-out can be forced independent of intervening RNG by picking a successful seed.
    const next = Array.from({ length: 100 }, (_, n) => resolveRoundEnd({ ...state, randomSeed: n + 10000 })).find(s => s.scorched?.length === 3)!;
    expect(terrainAt(next, 2, 2)).toBe('road'); expect(terrainAt(next, 3, 2)).toBe('bridge'); expect(terrainAt(next, 4, 2)).toBe('cart');
    expect(fireChance(next, 2, 2, 99)).toBe(0);
  });
  it('applies one highest-level path burn and stops a lethal mover on the first fire', () => {
    const state = arena(); state.width = 7; state.height = 1; state.units = state.units.map((u, i) => ({ ...u, x: i ? 6 : 0, y: 0 }));
    state.fires = [{ x: 1, y: 0, level: 1, remainingRounds: 2, sourceId: 'enemy' }, { x: 2, y: 0, level: 3, remainingRounds: 2, sourceId: 'enemy' }];
    const moved = moveUnit(state, 'traveler', 3, 0); expect(moved.units[0]).toMatchObject({ x: 3, hp: 88 });
    const dead = moveUnit({ ...state, units: state.units.map((u, i) => i ? u : ({ ...u, hp: 5 })) }, 'traveler', 3, 0);
    expect(dead.units[0]).toMatchObject({ x: 1, hp: 0 }); expect(dead.actedIds).toContain('traveler'); expect(currentActor(dead)).toBeUndefined();
  });
  it('updates pooled troop strength and favors loss on simultaneous elimination without advancing', () => {
    const state = arena(); state.units[1] = { ...makeGarrisonUnit('zhuo', 10, 4, 2), speed: 10 };
    state.fires = [{ x: 4, y: 2, level: 3, remainingRounds: 2, sourceId: 'traveler' }];
    const next = resolveRoundEnd({ ...state, randomSeed: seedFor(n => n > .1) });
    expect(next.units[1]).toMatchObject({ hp: 88, attack: 27, defense: 9, formation: { troops: 9 } });
    const lethal = { ...arena(), units: arena().units.map(u => ({ ...u, hp: 1 })), randomSeed: 10000 };
    lethal.fires = lethal.units.map(u => ({ x: u.x, y: u.y, level: 3, remainingRounds: 1, sourceId: 'traveler' }));
    const ended = finish(lethal); expect(ended.units.every(u => !u.hp)).toBe(true); expect(ended.round).toBe(1);
    expect(advanceTurn(ended).randomSeed).toBe(ended.randomSeed);
  });
  it('keeps weather fixed during actions and only changes it at three-round boundaries', () => {
    const state = arena(); const acted = setFire(state, 'traveler', 2, 2);
    expect(acted.environment).toEqual(state.environment);
    expect(finish(state).environment?.weather).toBe('sunny');
    const outcomes = Array.from({ length: 100 }, (_, n) => finish({ ...state, round: 3, randomSeed: n * 99991 + 1 }).environment?.weather);
    expect(outcomes.some(w => w !== 'sunny')).toBe(true);
  });
  it('lets surviving fire reignite a rained-out adjacent tile in the same snapshot', () => {
    const state = arena(); state.units[0].x = 0; state.units[1].x = 6;
    state.terrain = [{ x: 2, y: 2, kind: 'woods' }, { x: 3, y: 2, kind: 'woods' }];
    state.fires = [{ x: 2, y: 2, level: 3, remainingRounds: 3, sourceId: 'traveler' }, { x: 3, y: 2, level: 1, remainingRounds: 2, sourceId: 'enemy' }];
    const outcome = Array.from({ length: 1000 }, (_, n) => {
      const seed = n * 99991 + 1;
      if (nextRandom(seed).roll < .1 || nextRandom(nextRandom(seed).seed).roll >= .1) return null;
      return resolveRoundEnd({ ...state, randomSeed: seed });
    }).find(s => s?.fires?.some(f => f.x === 3 && f.y === 2 && f.sourceId === 'traveler'));
    expect(outcome).toBeDefined();
  });
  it('rolls each weather extinction probability and grows old forest fire at most one level', () => {
    for (const weather of Object.keys(EXTINGUISH_CHANCE) as (keyof typeof EXTINGUISH_CHANCE)[]) {
      const base = arena(); base.fires = [{ x: 1, y: 2, level: 1, remainingRounds: 3, sourceId: 'traveler' }];
      base.environment = { ...base.environment!, weather, windStrength: 0, windDirection: 'calm' };
      expect(resolveRoundEnd({ ...base, randomSeed: seedFor(n => n < EXTINGUISH_CHANCE[weather]) }).units[0].hp).toBe(100);
      expect(resolveRoundEnd({ ...base, randomSeed: seedFor(n => n > EXTINGUISH_CHANCE[weather]) }).units[0].hp).toBe(92);
    }
    const forest = arena(); forest.terrain = [{ x: 1, y: 2, kind: 'woods' }]; forest.fires = [{ x: 1, y: 2, level: 1, remainingRounds: 4, sourceId: 'traveler' }];
    const growth = Array.from({ length: 100 }, (_, n) => resolveRoundEnd({ ...forest, randomSeed: n * 99991 + 1 })).find(s => s.fires?.some(f => f.x === 1 && f.y === 2 && f.level === 2));
    expect(growth?.units[0].hp).toBe(90); expect(growth?.fires?.find(f => f.x === 1 && f.y === 2)?.remainingRounds).toBe(3);
  });
});

describe('AI fire and martial engine hooks', () => {
  it('does not replay an old burn event when an enemy moves on safe ground', () => {
    const state = arena();
    state.width = 7; state.height = 1;
    state.units = state.units.map((u, i) => ({ ...u, x: i ? 6 : 0, y: 0, speed: i ? 30 : 1 }));
    state.lastEvent = { kind: 'burn', actorId: 'traveler', targetId: 'traveler', damage: 8 };
    const next = resolveEnemyTurn(advanceTurn(state));
    expect(next.units[1].x).toBe(4);
    expect(next.units.map(u => u.hp)).toEqual([100, 100]);
    expect(next.turnEvents).toEqual([]);
  });
  it('prioritizes a lethal direct attack and never makes wolves ignite', () => {
    const state = arena(); state.units = state.units.map((u, i) => ({ ...u, speed: i ? 30 : 10, x: i ? 2 : 1, hp: i ? 100 : 1 }));
    const next = resolveEnemyTurn(advanceTurn(state)); expect(next.lastEvent?.kind).toBe('attack'); expect(next.fires).toEqual([]);
    const wolf = resolveEnemyTurn(advanceTurn({ ...state, units: state.units.map((u, i) => i ? ({ ...u, weapon: 'claws' }) : ({ ...u, hp: 100 })) }));
    expect(wolf.fires).toEqual([]);
  });
  it('recognizes lethal damage with overlapping guard and protection before trying abilities', () => {
    const state = arena(); state.units = state.units.map((u, i) => ({ ...u, speed: i ? 30 : 10, x: i ? 2 : 1, hp: i ? 100 : 2, attack: 4 }));
    state.units[0].guarded = true; state.units[0].effects = [{ kind: 'reduction', value: .5, sourceId: 'ally', expiresRound: 4 }];
    let abilityCalled = false;
    const next = resolveEnemyTurn(advanceTurn(state), s => { abilityCalled = true; return s; });
    expect(abilityCalled).toBe(false); expect(next.units[0].hp).toBe(0);
  });
  it('steps out of existing fire before attacking when a safe attack position exists', () => {
    const state = arena(); state.units[1] = { ...state.units[1], x: 2, speed: 30, weapon: 'spear' };
    state.fires = [{ x: 2, y: 2, level: 3, remainingRounds: 3, sourceId: 'traveler' }];
    const next = resolveEnemyTurn(advanceTurn(state));
    expect(next.units[1].x === 2 && next.units[1].y === 2).toBe(false);
    expect(next.units[1].hp).toBe(100);
  });
  it('lets AI use a beneficial ignition and avoid a fire route', () => {
    const state = arena(); state.units = state.units.map((u, i) => ({ ...u, speed: i ? 30 : 10, x: i ? 3 : 1, weapon: i ? 'bow' : u.weapon }));
    state.units[0].x = 2; state.terrain = [{ x: 2, y: 2, kind: 'woods' }]; state.randomSeed = seedFor(n => n < .01);
    const next = resolveEnemyTurn(advanceTurn(state)); expect(next.lastEvent?.kind).toBe('fire'); expect(next.fires!.some(f => f.x === 2 && f.y === 2)).toBe(true);
    const route = arena(); route.units[1].speed = 30; route.fires = [{ x: 3, y: 2, level: 3, remainingRounds: 3, sourceId: 'traveler' }];
    const avoided = resolveEnemyTurn(advanceTurn(route)); expect(avoided.units[1].hp).toBe(100); expect(avoided.units[1].x === 3 && avoided.units[1].y === 2).toBe(false);
  });
  it('caps bonuses, consumes attack statuses, and expires protection at the caster next action', () => {
    const state = arena(); state.units[0].effects = [{ kind: 'attack-up', value: .5, sourceId: 'a', expiresRound: 3 }, { kind: 'attack-down', value: .2, sourceId: 'b', expiresRound: 3 }, { kind: 'move-down', value: 1, sourceId: 'b', expiresRound: 3 }];
    state.units[0].empowered = true; expect(attackPower(state.units[0])).toBeCloseTo(state.units[0].attack * 1.5 * .8); expect(movementRange(state, state.units[0])).toBe(2);
    state.units[1].x = 2; state.units[1].effects = [{ kind: 'reduction', value: .5, sourceId: 'traveler', expiresRound: 3, untilActor: 'traveler' }]; state.units[1].guarded = true;
    const attacked = performAttack(state, 'traveler', state.units[1].id); expect(attacked.lastEvent?.damage).toBe(2); expect(attacked.units[0].effects).toEqual([]);
    expect(finish(attacked).units[1].effects).toEqual([]);
    expect(endAction(state, 'traveler').units[0].effects?.map(e => e.kind)).toEqual(['attack-up']);
  });
});
