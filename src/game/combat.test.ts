import { describe, expect, it } from 'vitest';
import {
  applyGuard,
  createCombatState,
  isBattleOver,
  performAttack,
  type CombatState,
} from './combat';

describe('compact tactical combat', () => {
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
    const after = performAttack(guarded, 'bandit-scout-a', 'traveler');

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
