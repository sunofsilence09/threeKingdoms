import { describe, expect, it } from 'vitest';
import { getCharacterAppearance } from './characters';
import { HISTORICAL_CHARACTERS, getHistoricalCharacter, getRouteLeader } from './historicalCharacters';

describe('historical character collection', () => {
  it('contains the six requested characters with independent silhouettes and full-body artwork', () => {
    expect(HISTORICAL_CHARACTERS.map(c => c.name)).toEqual(['曹操', '刘备', '孙权', '孙尚香', '貂蝉', '蔡琰']);
    expect(new Set(HISTORICAL_CHARACTERS.map(c => getCharacterAppearance(c.id).portrait)).size).toBe(6);
    expect(new Set(HISTORICAL_CHARACTERS.map(c => getCharacterAppearance(c.id).pose)).size).toBe(6);
    for (const c of HISTORICAL_CHARACTERS) {
      expect(getCharacterAppearance(c.id)).toBe(c.appearance);
      expect(c.appearance.portrait).toMatch(/^\/assets\/characters\/.+\.png$/);
      expect(c.specialty.length).toBeGreaterThan(4);
      expect(c).not.toHaveProperty('hp');
      expect(c).not.toHaveProperty('level');
    }
  });
  it('links the three route leaders without conflating faction and party IDs', () => {
    expect(getRouteLeader('cao').name).toBe('曹操');
    expect(getRouteLeader('liu').name).toBe('刘备');
    expect(getRouteLeader('sun').name).toBe('孙权');
    expect(getHistoricalCharacter('traveler')).toBeUndefined();
    expect(getHistoricalCharacter('unknown')).toBeUndefined();
  });
  it('keeps the selected female roles and their equipment distinct', () => {
    const women = HISTORICAL_CHARACTERS.filter(c => c.gender === 'female');
    expect(women.map(c => c.name)).toEqual(['孙尚香', '貂蝉', '蔡琰']);
    expect(women.map(c => c.weapon)).toEqual(['bow', 'fan', 'scroll']);
    expect(women.map(c => c.appearance.outfit)).toEqual(['tunic', 'dress', 'robe']);
  });
});
