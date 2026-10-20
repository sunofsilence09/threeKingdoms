import { describe, expect, it } from 'vitest';
import {
  applyGuard,
  createCombatState,
  isBattleOver,
  moveUnit,
  reachableTiles,
  resolveEnemyTurn,
  performAttack,
  type CombatState,
} from './combat';

describe('compact tactical combat', () => {
  it('allows movement then an attack, but prevents a second attack in the round', () => {
    const initial = createCombatState(null);
    const moved = moveUnit(initial, 'aman', 3, 2);
    const attacked = performAttack(moved, 'aman', 'bandit-scout-a');
    expect(attacked.units.find((u) => u.id === 'bandit-scout-a')?.hp).toBe(3);
    expect(performAttack(attacked, 'aman', 'bandit-scout-a')).toBe(attacked);
    expect(moveUnit(attacked, 'aman', 3, 1)).toBe(attacked);
    expect(initial.units.find((u) => u.id === 'aman')?.x).toBe(1);
  });

  it('does not let dead units move or guard', () => {
    const initial = createCombatState(null);
    const dead = { ...initial, units: initial.units.map((u) => u.id === 'aman' ? { ...u, hp: 0 } : u) };
    expect(moveUnit(dead, 'aman', 2, 2)).toBe(dead);
    expect(applyGuard(dead, 'aman')).toBe(dead);
  });

  it('does not move through an occupied corridor or accept fractional coordinates', () => {
    const initial = createCombatState(null);
    const blocked = { ...initial, width: 4, height: 1, units: initial.units.slice(0, 4).map((u, x) => ({ ...u, x, y: 0 })) };
    blocked.units[2].hp = 0;
    expect(moveUnit(blocked, 'traveler', 2, 0)).toBe(blocked);
    expect(reachableTiles(blocked, 'traveler')).toEqual([]);
    expect(moveUnit(initial, 'aman', 1.5, 1)).toBe(initial);
  });

  it('gives Sun a longer movement range and Liu stronger guard', () => {
    expect(moveUnit(createCombatState(null), 'aman', 3, 1).units[1].x).toBe(1);
    expect(moveUnit(createCombatState('sun'), 'aman', 3, 1).units[1].x).toBe(3);
    const liu = createCombatState('liu');
    liu.units[3] = { ...liu.units[3], x: 1, y: 1 };
    const guarded = applyGuard(liu, 'aman');
    const enemy = { ...guarded, turn: 'enemy' as const };
    expect(performAttack(enemy, 'bandit-leader', 'aman').units[1].hp).toBe(8);
  });

  it('resolves enemies once per round and restores party actions', () => {
    const initial = createCombatState(null);
    const guarded = applyGuard(initial, 'aman');
    const next = resolveEnemyTurn(guarded);
    expect(next.round).toBe(2);
    expect(next.turn).toBe('party');
    expect(next.actedIds).toEqual([]);
    expect(next.movedIds).toEqual([]);
    expect(applyGuard(next, 'aman')).not.toBe(next);
    expect(initial.units[3].x).toBe(5);
  });
  it('creates a three-person party and three enemies on the grid', () => {
    const combat = createCombatState(null);

    expect(combat.units.filter((unit) => unit.team === 'party')).toHaveLength(3);
    expect(combat.units.filter((unit) => unit.team === 'enemy')).toHaveLength(3);
    expect(combat.width).toBe(6);
    expect(combat.height).toBe(4);
  });

  it('deals attack damage only to an adjacent living target', () => {
    const combat = createCombatState(null);
    const adjacent = {
      ...combat,
      units: combat.units.map((unit) => {
        if (unit.id === 'traveler') return { ...unit, x: 3, y: 2 };
        if (unit.id === 'bandit-scout-a') return { ...unit, x: 4, y: 2 };
        return unit;
      }),
    };
    const target = adjacent.units.find((unit) => unit.id === 'bandit-scout-a');
    if (!target) throw new Error('expected a bandit scout');

    const next = performAttack(adjacent, 'traveler', target.id);

    expect(next.units.find((unit) => unit.id === target.id)?.hp).toBe(2);
    expect(performAttack(adjacent, 'traveler', 'bandit-leader')).toEqual(adjacent);
  });

  it('reduces incoming damage while a unit is guarding', () => {
    const combat = createCombatState(null);
    const adjacent = {
      ...combat,
      units: combat.units.map((unit) => {
        if (unit.id === 'traveler') return { ...unit, x: 3, y: 2 };
        if (unit.id === 'bandit-scout-a') return { ...unit, x: 4, y: 2 };
        return unit;
      }),
    };
    const guarded = applyGuard(adjacent, 'traveler');
    const after = performAttack({ ...guarded, turn: 'enemy' }, 'bandit-scout-a', 'traveler');

    expect(after.units.find((unit) => unit.id === 'traveler')?.hp).toBe(8);
  });

  it('recognizes a win after all enemy units are defeated', () => {
    const combat = createCombatState(null);
    const won: CombatState = {
      ...combat,
      units: combat.units.map((unit) =>
        unit.team === 'enemy' ? { ...unit, hp: 0 } : unit,
      ),
    };

    expect(isBattleOver(won)).toBe('win');
  });
});
