import { describe, expect, it } from 'vitest';
import { getCharacterAppearance, getUnitAppearance, getUnitModel } from './characters';
import { recruitProfile } from './recruitmentCatalog';

describe('calendar character appearance', () => {
  it('shows Xiahou Dun before and after the authored injury year without mutating the shared profile', () => {
    const before = getCharacterAppearance('xiahou-dun', { year: 193, month: 12 });
    const after = getCharacterAppearance('xiahou-dun', { year: 194, month: 1 });
    expect(before.portrait).toBe('/assets/characters/xiahou-dun-uninjured-v1.png');
    expect(before.leftEyeCovered).toBe(false);
    expect(after.portrait).toBe('/assets/characters/xiahou-dun-v1.png');
    expect(after.leftEyeCovered).toBe(true);
    expect(before.robe).toBe(after.robe);
    expect(recruitProfile('xiahou-dun')?.appearance.portrait).toBe('/assets/characters/xiahou-dun-v1.png');
  });
  it('passes the same calendar appearance to both models and portraits including an enemy namespace', () => {
    const unit = { id: 'xiahou-dun', weapon: 'glaive' as const, level: 4 };
    const date = { year: 193, month: 3 };
    expect(getUnitModel(unit, date).appearance).toEqual(getUnitAppearance(unit, date));
    expect(getUnitAppearance({ ...unit, id: 'enemy:xiahou-dun' }, date).portrait).toContain('uninjured');
    expect(getUnitAppearance(unit, { year: 194, month: 1 }).leftEyeCovered).toBe(true);
  });
  it('keeps other identities and hero equipment appearance independent of the calendar', () => {
    expect(getCharacterAppearance('cao-cao', { year: 193, month: 3 })).toBe(getCharacterAppearance('cao-cao'));
    expect(getUnitAppearance({ id: 'traveler', weapon: 'bow', level: 6 }, { year: 194, month: 1 }).portrait).toContain('commander-bow');
    expect(getCharacterAppearance('bandit-scout-a', { year: 193, month: 3 })).toBe(getCharacterAppearance('bandit-scout-b'));
  });
});
