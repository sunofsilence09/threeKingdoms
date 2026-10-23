import { describe, expect, it } from 'vitest';
import * as combat from './combat';
import { HISTORICAL_CHARACTERS } from './historicalCharacters';

function arena() {
  const state = combat.createCombatState(null);
  return { ...state, terrain: [], units: state.units.slice(0, 4).map((u, i) => ({ ...u, speed: [12, 16, 8, 14][i], x: i * 2, y: 1 })) };
}

describe('speed initiative', () => {
  it('gives every ally, mob and historical NPC a positive speed', () => {
    expect(combat.createCombatState(null).units.every(u => u.speed > 0)).toBe(true);
    expect(HISTORICAL_CHARACTERS.every(u => u.speed > 0)).toBe(true);
  });
  it('mixes both teams by descending speed with stable ties', () => {
    const state = arena();
    state.units[0].speed = 14;
    expect(combat.actionOrder(state).map(u => u.id)).toEqual(['aman', 'traveler', 'bandit-leader', 'chen-da']);
  });
  it('only lets the current actor move, attack, guard or use an ultimate', () => {
    const state = arena();
    expect(combat.currentActor(state)?.id).toBe('aman');
    expect(combat.moveUnit(state, 'traveler', 0, 2)).toBe(state);
    expect(combat.applyGuard(state, 'traveler')).toBe(state);
    state.units[0].hp = 1;
    expect(combat.activateUltimate(state, 'traveler')).toBe(state);
    state.units[0].x = state.units[3].x - 1;
    expect(combat.canAttack(state, state.units[0], state.units[3])).toBe(true);
    expect(combat.performAttack(state, 'traveler', 'bandit-leader')).toBe(state);
    const next = combat.advanceTurn(combat.applyGuard(state, 'aman'));
    expect(combat.currentActor(next)?.id).toBe('bandit-leader');
    expect(next.turn).toBe('enemy');
    expect(combat.resolveEnemyTurn(state)).toBe(state);
  });
  it('resolves one enemy then yields to the next ally without resetting the round', () => {
    const state = arena();
    const enemy = combat.advanceTurn(combat.applyGuard(state, 'aman'));
    const next = combat.resolveEnemyTurn(enemy);
    expect(combat.currentActor(next)?.id).toBe('traveler');
    expect(next.round).toBe(1);
    expect(next.actedIds).toEqual(['aman', 'bandit-leader']);
  });
  it('skips defeated actors and resets movement and actions only after all survivors finish', () => {
    const state = arena();
    state.units[3].hp = 0;
    // Keep a living enemy so the battle remains ongoing.
    state.units.push({ ...state.units[3], id: 'other', hp: 5, speed: 4 });
    let next = combat.advanceTurn(combat.applyGuard(state, 'aman'));
    expect(combat.currentActor(next)?.id).toBe('traveler');
    next = combat.advanceTurn(combat.applyGuard(next, 'traveler'));
    next = combat.advanceTurn(combat.applyGuard(next, 'chen-da'));
    next = combat.resolveEnemyTurn(next);
    expect(next.round).toBe(2);
    expect(next.actedIds).toEqual([]);
    expect(next.movedIds).toEqual([]);
    expect(combat.currentActor(next)?.id).toBe('aman');
    expect(combat.actionOrder(next).some(u => u.id === 'bandit-leader')).toBe(false);
  });
  it('does not start another round after the winning attack', () => {
    const state = arena();
    state.units = [ { ...state.units[1], x: 1, attack: 99 }, { ...state.units[3], x: 2 } ];
    const next = combat.advanceTurn(combat.performAttack(state, 'aman', 'bandit-leader'));
    expect(combat.isBattleOver(next)).toBe('win');
    expect(next.round).toBe(1);
    expect(combat.currentActor(next)).toBeUndefined();
  });
});
