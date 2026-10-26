import { describe, expect, it } from 'vitest';
import { audioCuesFor } from './audioCues';
import { createCombatState, type CombatEvent, type WeaponId } from './combat';

describe('combat sound presentation', () => {
  const units = createCombatState(null).units;
  const attack: CombatEvent = { kind: 'attack', actorId: units[0].id, targetId: units[1].id, damage: 3 };
  it('distinguishes the six weapon families without changing combat state', () => {
    const families = ['sword', 'spear', 'glaive', 'bow', 'fists', 'claws'] as WeaponId[];
    const before = JSON.stringify(units);
    expect(families.map(weapon => audioCuesFor([attack], [{ ...units[0], weapon }, units[1]])[0].sound))
      .toEqual(['slash', 'polearm', 'heavy', 'bow', 'fists', 'claws']);
    expect(JSON.stringify(units)).toBe(before);
  });
  it('plays a swing and a miss without a false hit; guarded targets have a shield impact', () => {
    expect(audioCuesFor([{ ...attack, kind: 'dodge', damage: 0 }], units).map(c => c.sound)).toEqual(['slash', 'miss']);
    expect(audioCuesFor([attack], [units[0], { ...units[1], guarded: true }]).map(c => c.sound)).toEqual(['slash', 'shield']);
    expect(audioCuesFor([attack], units).map(c => c.sound)).toEqual(['slash', 'hit']);
  });
  it('coalesces fire spread and round burns while preserving distinct ignition, burn and martial timbres', () => {
    const events: CombatEvent[] = [{ ...attack, kind: 'fire', success: true }, { ...attack, kind: 'spread' },
      { ...attack, kind: 'burn' }, { ...attack, kind: 'burn' }, { ...attack, kind: 'martial', success: true, skillId: 'fire' }];
    expect(audioCuesFor(events, units).map(c => c.sound)).toEqual(['fire', 'burn']);
    expect(audioCuesFor([{ ...attack, kind: 'martial', skillId: 'native-art' }], units).map(c => c.sound)).toEqual(['martial', 'slash', 'hit']);
    expect(audioCuesFor([{ ...attack, kind: 'fire', success: false }], units).map(c => c.sound)).toEqual(['miss']);
    expect(audioCuesFor([], units)).toEqual([]);
  });
});
