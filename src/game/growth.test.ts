import { describe, expect, it } from 'vitest';
import { createPartyProgress, createProgress, experienceToNextLevel, grantExperience } from './growth';

describe('persistent character growth', () => {
  it('starts each companion independently at level one', () => {
    const party = createPartyProgress();
    expect(Object.keys(party)).toEqual(['traveler', 'aman', 'chen-da']);
    expect(party.traveler).toEqual(createProgress());
    expect(party.traveler).not.toBe(party.aman);
  });

  it('crosses the exact threshold and carries excess experience without mutating input', () => {
    const before = createProgress(1, 15);
    expect(grantExperience(before, 5)).toMatchObject({ level: 2, xp: 0 });
    expect(grantExperience(before, 60)).toMatchObject({ level: 3, xp: 25 });
    expect(before).toEqual(createProgress(1, 15));
    expect(experienceToNextLevel(3)).toBe(40);
  });

  it('caps at level ten and ignores invalid experience', () => {
    expect(grantExperience(createProgress(), 9999)).toMatchObject({ level: 10, xp: 0 });
    expect(experienceToNextLevel(10)).toBe(0);
    for (const amount of [-1, NaN, Infinity, 1.5]) {
      expect(grantExperience(createProgress(2, 4), amount)).toMatchObject({ level: 2, xp: 4 });
    }
  });
});
