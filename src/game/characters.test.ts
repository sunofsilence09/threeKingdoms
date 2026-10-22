import { describe, expect, it } from 'vitest';
import { createCombatState } from './combat';
import { getCharacterAppearance, getUnitModel } from './characters';

describe('character identity and battlefield appearance', () => {
  it('resolves every encounter unit to full-body art and the same model identity', () => {
    for (const state of [createCombatState(null), createCombatState('cao')]) {
      for (const unit of state.units) {
        const appearance = getCharacterAppearance(unit.id);
        expect(appearance.portrait).toMatch(/^\/assets\/characters\/.+\.png$/);
        expect(appearance.bio.length).toBeGreaterThan(10);
        const model = getUnitModel(unit);
        expect(model.appearance).toBe(appearance);
        expect(model.weapon).toBe(unit.weapon);
      }
    }
  });
  it('keeps refugee identity while equipment progresses independently', () => {
    const before = createCombatState(null).units;
    const after = createCombatState('sun').units;
    expect(before.slice(0, 3).map(u => getUnitModel(u).weapon)).toEqual(['cleaver', 'fists', 'fists']);
    expect(after.slice(0, 3).map(u => getUnitModel(u).weapon)).toEqual(['knife', 'spear', 'bow']);
    before.forEach((u, i) => expect(getUnitModel(u).appearance).toBe(getUnitModel(after[i]).appearance));
    expect(new Set(before.slice(0, 3).map(u => getCharacterAppearance(u.id).robe)).size).toBe(3);
    expect(getCharacterAppearance('traveler').pack).toBe(true);
    expect(getCharacterAppearance('chen-da').beard).toBe(true);
    expect(new Set(before.map(u => getCharacterAppearance(u.id).pose)).size).toBe(5);
    expect(getCharacterAppearance('aman').pose).toBe('scout');
    expect(getCharacterAppearance('chen-da').pose).toBe('guard');
  });
  it('uses shared role art for ordinary bandits and a safe unknown fallback', () => {
    expect(getCharacterAppearance('bandit-scout-a')).toBe(getCharacterAppearance('bandit-scout-b'));
    expect(getCharacterAppearance('bandit-leader')).not.toBe(getCharacterAppearance('bandit-scout-a'));
    expect(getCharacterAppearance('unknown').portrait).toBe(getCharacterAppearance('bandit-scout-a').portrait);
  });
});
