import { describe, expect, it } from 'vitest';
import { attributeBonuses, createAttributes } from './attributes';
import { createProgress, grantExperience } from './growth';
import { createInitialState, rewardVictory, spendSkillPoints } from './state';

describe('six attributes and earned skill points', () => {
  it('grants three points per real level-up, carries multiple levels and stops at the cap', () => {
    const initial = createProgress();
    expect(initial.points).toBe(0);
    expect(grantExperience(initial, 75)).toMatchObject({ level: 3, xp: 25, points: 6 });
    expect(grantExperience(initial, 9999)).toMatchObject({ level: 10, xp: 0, points: 27 });
    expect(initial).toEqual(createProgress());
  });

  it('derives a real ability change from each of the six attributes', () => {
    const attrs = createAttributes();
    expect(attributeBonuses(attrs)).toEqual({ attack: 0, defense: 0, dodge: 0, hp: 0, supplies: 0, experience: 0 });
    expect(attributeBonuses({ ...attrs, command: 11 }).defense).toBe(1);
    expect(attributeBonuses({ ...attrs, strength: 11 }).attack).toBe(1);
    expect(attributeBonuses({ ...attrs, intellect: 11 }).dodge).toBeCloseTo(0.02);
    expect(attributeBonuses({ ...attrs, politics: 11 }).supplies).toBe(1);
    expect(attributeBonuses({ ...attrs, charisma: 11 }).experience).toBeCloseTo(0.05);
    expect(attributeBonuses({ ...attrs, courage: 11 }).hp).toBe(2);
    expect(attributeBonuses({ ...attrs, intellect: 30 }).dodge).toBe(0.4);
  });

  it('spends only earned points for one character without mutating the original state', () => {
    const state = rewardVictory(createInitialState(), 'ambush');
    const next = spendSkillPoints(state, 'traveler', { strength: 1, intellect: 2 });
    expect(next.party.traveler).toMatchObject({ points: 0, attributes: { strength: 11, intellect: 12 } });
    expect(state.party.traveler).toMatchObject({ points: 3, attributes: { strength: 10, intellect: 10 } });
    expect(next.party.aman).toBe(state.party.aman);
  });

  it('rejects overspending, negative, fractional, unknown and battle-time allocations', () => {
    const state = rewardVictory(createInitialState(), 'ambush');
    for (const delta of [{ strength: 4 }, { strength: -1 }, { intellect: 0.5 }, { strength: Infinity }, { unknown: 1 }, {}]) {
      expect(spendSkillPoints(state, 'traveler', delta)).toBe(state);
    }
    const battle = { ...state, phase: 'battle' as const };
    expect(spendSkillPoints(battle, 'traveler', { strength: 1 })).toBe(battle);
    const capped = { ...state, party: { ...state.party, traveler: createProgress(10) } };
    capped.party.traveler.attributes.strength = 30;
    capped.party.traveler.points = 7;
    expect(spendSkillPoints(capped, 'traveler', { strength: 1 })).toBe(capped);
  });

  it('applies charisma XP and party politics supplies only on the first victory', () => {
    const state = rewardVictory(createInitialState(), 'ambush');
    const trained = spendSkillPoints(state, 'traveler', { charisma: 2, politics: 1 });
    const next = rewardVictory(trained, 'route');
    expect(next.party.traveler).toMatchObject({ level: 3, xp: 29, points: 3 });
    expect(next.party.aman).toMatchObject({ level: 3, xp: 25, points: 6 });
    expect(next.supplies).toBe(trained.supplies + 1);
    expect(rewardVictory(next, 'route')).toBe(next);
  });
  it('computes charisma experience using exact integer percentages', () => {
    const initial = createInitialState();
    initial.party.traveler = createProgress(4);
    const trained = spendSkillPoints(initial, 'traveler', { charisma: 8 });
    const rewarded = rewardVictory(trained, 'route');
    expect(rewarded.party.traveler).toMatchObject({ level: 5, xp: 13, points: 4 });
  });

});
