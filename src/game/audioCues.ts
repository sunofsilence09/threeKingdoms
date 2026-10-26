import type { CombatEvent, CombatUnit, WeaponId } from './combat';

export const SOUND_IDS = ['slash', 'polearm', 'heavy', 'bow', 'fists', 'claws', 'hit', 'shield', 'miss', 'fire', 'burn', 'martial', 'ultimate'] as const;
export type SoundId = typeof SOUND_IDS[number];
export interface AudioCue { sound: SoundId; delayMs: number; level: number }
function weaponSound(weapon?: WeaponId): SoundId {
  if (weapon === 'bow') return 'bow';
  if (weapon === 'claws' || weapon === 'fists') return weapon;
  if (weapon === 'spear' || weapon === 'serpentspear') return 'polearm';
  if (weapon === 'glaive' || weapon === 'halberd') return 'heavy';
  if (weapon === 'fan' || weapon === 'scroll' || weapon === 'jade' || weapon === 'handkerchief') return 'martial';
  return 'slash';
}

/** Presentation only: no combat mutation, catalog lookup, or gameplay random stream. */
export function audioCuesFor(events: readonly CombatEvent[], units: readonly CombatUnit[]): AudioCue[] {
  const cues: AudioCue[] = [];
  let fireHeard = false, burnHeard = false, action = 0;
  for (const event of events) {
    const at = Math.min(action * 130, 390);
    const add = (sound: SoundId, delayMs = at, level = 1) => cues.push({ sound, delayMs, level });
    if (event.kind === 'burn') { if (!burnHeard) add('burn', at, .7); burnHeard = true; continue; }
    if (event.kind === 'fire') {
      if (!fireHeard) add(event.success ? 'fire' : 'miss', at, .8);
      fireHeard = true; continue;
    }
    if (event.kind === 'ultimate') { add('ultimate'); action++; continue; }
    // Firegod emits its actual ignition first, then a summary. Never double it.
    if (event.kind === 'martial' && event.success !== undefined) {
      if (!fireHeard) add(event.success ? 'fire' : 'miss', at, .8);
      fireHeard = true; continue;
    }
    if (!['attack', 'dodge', 'martial'].includes(event.kind)) continue;
    const actor = units.find(u => u.id === event.actorId), target = units.find(u => u.id === event.targetId);
    if (event.skillId || event.kind === 'martial') add('martial', at, .7);
    if (event.kind !== 'martial' || event.damage > 0) {
      add(weaponSound(actor?.weapon), at + (event.skillId ? 45 : 0), .85);
      add(event.kind === 'dodge' ? 'miss' : target?.guarded || target?.weapon === 'swordshield' ? 'shield' : 'hit', at + 85, .75);
    }
    action++;
  }
  return cues;
}
