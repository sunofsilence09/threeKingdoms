import type { CombatUnit, WeaponId } from './combat';
import { getHistoricalCharacter } from './historicalCharacters';

export type ModelWeapon = WeaponId | 'sword' | 'fan' | 'scroll';

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
  pose: 'calm' | 'scout' | 'guard' | 'leader' | 'skulker' | 'strategist' | 'greeting' | 'commander' | 'archer' | 'fan' | 'scholar';
  outfit?: 'tunic' | 'robe' | 'dress';
  hair?: 'bun' | 'long' | 'crown';
  accent?: number;
}

const CHARACTERS: Record<string, CharacterAppearance> = {
  traveler: {
    identity: '流民 · 同行之首', portrait: '/assets/characters/jiang-yuan-refugee-v1.png',
    bio: '乱世中离乡的年轻人，带着行囊与一把菜刀上路。姜垣眼下只想让同行的人活着走到临水镇。',
    robe: 0x667067, headband: 0x536d68, skin: 0xcba27e, sash: 0x77604a, stocky: false, beard: false, pack: true, pose: 'calm',
  },
  aman: {
    identity: '流民 · 同行伙伴', portrait: '/assets/characters/aman-refugee-v2.png',
    bio: '与姜垣同行的年轻伙伴，身形轻巧，眼神机警。走过几日荒路后，他仍惦记着临水镇里能找到的粮食。',
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

export function getCharacterAppearance(id: string): CharacterAppearance {
  return CHARACTERS[id] ?? getHistoricalCharacter(id)?.appearance ?? CHARACTERS.bandit;
}

/** Equipment is live battle data; the portrait supplies identity and clothing. */
export function getUnitModel(unit: Pick<CombatUnit, 'id'> & { weapon: ModelWeapon }): { appearance: CharacterAppearance; weapon: ModelWeapon } {
  return { appearance: getCharacterAppearance(unit.id), weapon: unit.weapon };
}
