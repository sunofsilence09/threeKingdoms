import type { CombatUnit, WeaponId } from './combat';
import { getHeroVisual, HERO_WEAPONS } from './heroVisuals';
import { getHistoricalCharacter } from './historicalCharacters';
import { recruitProfile } from './recruitmentCatalog';
import type { GameDate } from './history';

export type ModelWeapon = WeaponId;

export interface CharacterAppearance {
  identity: string;
  portrait: string;
  bio: string;
  robe: number;
  headband: number | null;
  skin: number;
  sash: number;
  stocky: boolean;
  beard: boolean;
  pack: boolean;
  pose: 'calm' | 'scout' | 'guard' | 'leader' | 'skulker' | 'strategist' | 'greeting' | 'commander' | 'archer' | 'fan' | 'scholar' | 'tyrant' | 'halberd' | 'bruiser' | 'jade' | 'sentinel' | 'longbeard' | 'serpent' | 'lancer' | 'protective' | 'shieldguard';
  outfit?: 'tunic' | 'robe' | 'dress' | 'armor';
  hair?: 'bun' | 'long' | 'crown';
  accent?: number;
  plume?: boolean;
  leftEyeCovered?: boolean;
}

const CHARACTERS: Record<string, CharacterAppearance> = {
  traveler: {
    identity: '流民 · 同行之首', portrait: '/assets/characters/jiang-yuan-refugee-v1.png',
    bio: '乱世中离乡的年轻人，带着行囊与一把菜刀上路。姜垣眼下只想让同行的人活着找到落脚处。',
    robe: 0x667067, headband: 0x536d68, skin: 0xcba27e, sash: 0x77604a, stocky: false, beard: false, pack: true, pose: 'calm',
  },
  aman: {
    identity: '流民 · 同行伙伴', portrait: '/assets/characters/aman-refugee-v2.png',
    bio: '与姜垣同行的年轻伙伴，身形轻巧，眼神机警。走过几日荒路后，他仍惦记着前方村落里能找到的粮食。',
    robe: 0xa38a5c, headband: 0x975749, skin: 0xc89e75, sash: 0x67523e, stocky: false, beard: false, pack: true, pose: 'scout',
  },
  'chen-da': {
    identity: '流民 · 同行伙伴', portrait: '/assets/characters/chen-da-refugee-v2.png',
    bio: '沉默而结实的同行人，风霜落在胡须与旧衣上。遇到拦路的人时，陈达会站到伙伴身前。',
    robe: 0x465c74, headband: null, skin: 0xb88e6b, sash: 0xab8650, stocky: true, beard: true, pack: false, pose: 'guard',
  },
  'bandit-leader': {
    identity: '敌方 · 山贼头目', portrait: '/assets/characters/bandit-leader-v2.png',
    bio: '占住旧驿道的头目，暗红旧衣外套着皮坎肩。他靠拦路夺粮维持手下，出手也比喽啰狠些。',
    robe: 0x834f46, headband: 0x513a30, skin: 0xb98b69, sash: 0x4a382b, stocky: true, beard: true, pack: false, pose: 'leader',
  },
  bandit: {
    identity: '敌方 · 拦路山贼', portrait: '/assets/characters/bandit-v2.png',
    bio: '穿黄褐旧衣的拦路喽啰，手中的家伙随遭遇而变。饥饿与乱世把他推到了道路的另一边。',
    robe: 0x8b7150, headband: 0xb69a61, skin: 0xbe9674, sash: 0x594a35, stocky: false, beard: false, pack: false, pose: 'skulker',
  },
};

export function getCharacterAppearance(id: string, date?: GameDate): CharacterAppearance {
  if (id.startsWith('wolf:')) return { identity: '山野 · 狼群', portrait: '/assets/events/event-wolves-v1.png', bio: '山林间结群出没的野兽。四足奔袭，以爪牙攻击靠近的行旅人。', robe: 0x737c75, headband: null, skin: 0x8a938a, sash: 0x444e49, stocky: false, beard: false, pack: false, pose: 'skulker' };
  const base = CHARACTERS[id] ?? getHistoricalCharacter(id)?.appearance ?? recruitProfile(id)?.appearance ?? CHARACTERS.bandit;
  if (id === 'xiahou-dun' && date) return { ...base,
    portrait: date.year < 194 ? '/assets/characters/xiahou-dun-uninjured-v1.png' : '/assets/characters/xiahou-dun-v1.png',
    leftEyeCovered: date.year >= 194 };
  return base;
}

/** Equipment is live battle data; the portrait supplies identity and clothing. */
export function getUnitModel(unit: Pick<CombatUnit, 'id'> & { weapon: ModelWeapon; level?: number }, date?: GameDate): { appearance: CharacterAppearance; weapon: ModelWeapon } {
  return { appearance: getUnitAppearance(unit, date), weapon: unit.weapon };
}

/** Pure display derivation; NPC identity records remain shared and unchanged. */
export function getUnitAppearance(unit: { id: string; weapon: ModelWeapon; level?: number }, date?: GameDate): CharacterAppearance {
  const id = unit.id.replace(/^enemy:/, '');
  const base = getCharacterAppearance(id, date);
  if (id !== 'traveler') return base;
  const weapon = HERO_WEAPONS.find(weapon => weapon === unit.weapon) ?? 'cleaver';
  const visual = getHeroVisual(unit.level, weapon);
  return { ...base, ...visual.stage, portrait: visual.portrait,
    identity: `${visual.stage.label} · 同行之首`, pose: weapon === 'bow' ? 'archer' : 'calm' };
}
