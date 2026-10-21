import { describe, expect, it } from 'vitest';
import { createPartyProgress, experienceToNextLevel, grantExperience } from './growth';

describe('persistent character growth', () => {
  it('starts each companion independently at level one', () => {
    const party = createPartyProgress();
    expect(Object.keys(party)).toEqual(['traveler', 'aman', 'chen-da']);
    expect(party.traveler).toEqual({ level: 1, xp: 0 });
    expect(party.traveler).not.toBe(party.aman);
  });

  it('crosses the exact threshold and carries excess experience without mutating input', () => {
    const before = { level: 1, xp: 15 };
    expect(grantExperience(before, 5)).toEqual({ level: 2, xp: 0 });
    expect(grantExperience(before, 60)).toEqual({ level: 3, xp: 25 });
    expect(before).toEqual({ level: 1, xp: 15 });
    expect(experienceToNextLevel(3)).toBe(40);
  });

  it('caps at level ten and ignores invalid experience', () => {
    expect(grantExperience({ level: 1, xp: 0 }, 9999)).toEqual({ level: 10, xp: 0 });
    expect(experienceToNextLevel(10)).toBe(0);
    for (const amount of [-1, NaN, Infinity, 1.5]) {
      expect(grantExperience({ level: 2, xp: 4 }, amount)).toEqual({ level: 2, xp: 4 });
    }
  });
});
