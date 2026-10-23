import { describe, expect, it } from 'vitest';
import { advanceTurn, activateUltimate, applyGuard, attackPower, createCombatState, performAttack, resolveEnemyTurn, ultimateAvailability, type CombatState } from './combat';
import { createPartyProgress } from './growth';

function duel(ordinary = false): CombatState {
  const base = createCombatState(null);
  return { ...base, terrain: [], width: 8, height: 6, randomSeed: 1, units: [
    { ...base.units[ordinary ? 1 : 0], x: 1, y: 1, hp: 10, maxHp: 10, attack: 4 },
    { ...base.units[3], x: 2, y: 1, hp: 20, maxHp: 20, attack: 4 },
  ] };
}

describe('character ultimates and real dodge', () => {
  it('assigns a personal ultimate to Jiang Yuan and desperation to ordinary characters', () => {
    const state = createCombatState(null);
    expect(state.units[0].ultimate).toBe('survival');
    expect(state.units.slice(1).every(u => u.ultimate === 'desperation')).toBe(true);
  });

  it('pays desperation HP once, empowers the next attack by 50%, and preserves normal actions', () => {
    const initial = duel(true);
    const next = activateUltimate(initial, 'aman');
    expect(next.units[0]).toMatchObject({ hp: 8, empowered: true, ultimateUsed: true });
    expect(attackPower(next.units[0])).toBe(6);
    expect(next.actedIds).toEqual([]);
    expect(next.movedIds).toEqual([]);
    expect(activateUltimate(next, 'aman')).toBe(next);
    const attacked = performAttack(next, 'aman', 'bandit-leader');
    expect(attacked.units[1].hp).toBe(14);
    expect(attacked.units[0].empowered).toBe(false);
    expect(initial.units[0].hp).toBe(10);
  });

  it('prevents paying desperation with insufficient HP or after acting', () => {
    const initial = duel(true);
    initial.units[0].hp = 2;
    expect(activateUltimate(initial, 'aman')).toBe(initial);
    initial.units[0].hp = 10;
    const guarded = applyGuard(initial, 'aman');
    expect(activateUltimate(guarded, 'aman')).toBe(guarded);
    expect(ultimateAvailability(initial, initial.units[0]).available).toBe(true);
  });

  it('allows survival only at half health or below and heals 30% of max HP', () => {
    const state = duel();
    state.units[0].hp = 6;
    expect(activateUltimate(state, 'traveler')).toBe(state);
    state.units[0].hp = 5;
    const next = activateUltimate(state, 'traveler');
    expect(next.units[0]).toMatchObject({ hp: 8, empowered: true, ultimateUsed: true });
    expect(activateUltimate(next, 'traveler')).toBe(next);
    state.units[0].hp = 0;
    expect(activateUltimate(state, 'traveler')).toBe(state);
  });

  it('expires unused empowerment when the actor ends its action', () => {
    const state = duel(true);
    const activated = activateUltimate(state, 'aman');
    const next = applyGuard(activated, 'aman');
    expect(next.units[0].empowered).toBe(false);
    expect(next.units[0].ultimateUsed).toBe(true);
  });

  it('applies trained strength, command, intellect and courage to combat attributes', () => {
    const party = createPartyProgress();
    Object.assign(party.traveler.attributes, { command: 11, strength: 11, intellect: 12, courage: 11 });
    const initial = createCombatState(null);
    const trained = createCombatState(null, party);
    expect(trained.units[0].attack).toBe(initial.units[0].attack + 1);
    expect(trained.units[0].maxHp).toBe(initial.units[0].maxHp + 2);
    expect(trained.units[0].defense).toBe(1);
    expect(trained.units[0].dodgeRate).toBeCloseTo(0.04);
    const state = duel();
    state.units[1].defense = 2;
    expect(performAttack(state, 'traveler', 'bandit-leader').units[1].hp).toBe(18);
  });

  it('dodges with a reproducible seeded roll, consumes the attack but retains the defender guard', () => {
    const state = duel(true);
    state.units[1].dodgeRate = 0.4;
    state.units[1].guarded = true;
    const activated = activateUltimate(state, 'aman');
    const next = performAttack(activated, 'aman', 'bandit-leader');
    expect(next.units[1]).toMatchObject({ hp: 20, guarded: true });
    expect(next.actedIds).toContain('aman');
    expect(next.units[0]).toMatchObject({ hp: 8, empowered: false, ultimateUsed: true });
    expect(next.lastEvent).toMatchObject({ kind: 'dodge', targetId: 'bandit-leader', damage: 0 });
    expect(next.randomSeed).not.toBe(state.randomSeed);
    expect(performAttack(activated, 'aman', 'bandit-leader')).toEqual(next);
    expect(performAttack(next, 'aman', 'bandit-leader')).toBe(next);
  });

  it('never rolls for illegal attacks and still deals minimum one damage on a hit', () => {
    const state = duel();
    state.units[1].x = 7;
    expect(performAttack(state, 'traveler', 'bandit-leader')).toBe(state);
    state.units[1].x = 2;
    state.units[1].defense = 99;
    expect(performAttack(state, 'traveler', 'bandit-leader').units[1].hp).toBe(19);
  });

  it('lets a wounded ordinary enemy use desperation before a legal attack', () => {
    const state = duel();
    state.units[0].hp = state.units[0].maxHp = 20;
    state.units[1].hp = 4;
    state.units[1].maxHp = 10;
    state.units[1].speed = 30;
    const next = resolveEnemyTurn(advanceTurn(state));
    expect(next.units[1]).toMatchObject({ hp: 2, ultimateUsed: true, empowered: false });
    expect(next.units[0].hp).toBe(14);
  });
});
