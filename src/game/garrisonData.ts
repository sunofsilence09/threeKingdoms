import type { CharacterAppearance } from './characters';
import type { RecruitProfile } from './recruitmentCatalog';
import { WORLD_CITIES } from './world';

export interface GarrisonCommander {
  cityId: string;
  from: { year: number; month?: number };
  to: { year: number; month?: number };
  employerId: string;
}

/** Authored garrison stages; never inferred from other people encountered in a city. */
export const GARRISON_COMMANDERS: readonly GarrisonCommander[] = [
  ['chenliu', 190, 194, 'zhang-miao'], ['nanyang', 190, 192, 'yuan-shu'],
  ['shouchun', 193, 198, 'yuan-shu'], ['xiangyang', 190, 207, 'liu-biao'],
  ['shujun', 194, 213, 'liu-zhang'], ['nanzheng', 194, 214, 'zhang-lu'],
  ['ye', 191, 201, 'yuan-shao'], ['ji', 188, 192, 'liu-yu'], ['ji', 193, 194, 'gongsun-zan'],
].map(([cityId, from, to, employerId]) => ({ cityId: cityId as string,
  from: { year: from as number, month: 1 }, to: { year: to as number, month: 12 }, employerId: employerId as string }));

/** Each city's troops have an inspectable profile; only the captain can join the party. */
export const GARRISON_PROFILES: readonly RecruitProfile[] = WORLD_CITIES.flatMap(city =>
  (['soldier', 'captain'] as const).map(role => {
    const captain = role === 'captain';
    const title = captain ? '士兵长' : '普通士兵';
    const portrait = `/assets/characters/local-${role}-v1.png`;
    const bio = captain
      ? `${city.name}地方守备的士兵长，与郡府共同管理驻军。职业称呼为游戏编排，不代表汉末统一官制；可单独交流与邀请，加入同行后保留原籍。`
      : `${city.name}地方驻军的普通士兵形象。全城军士由士兵长与郡府共同管理，兵力随年月变化；普通军士只供查看，不作为个人招募对象。`;
    const appearance: CharacterAppearance = { identity: `地方驻军 · ${title}`, portrait, bio,
      robe: captain ? 0x68614a : 0xa39578, headband: captain ? null : 0x736b5b,
      skin: captain ? 0xb78d6a : 0xc7a080, sash: captain ? 0x785a40 : 0x6f614d,
      stocky: captain, beard: captain, pack: false, pose: captain ? 'shieldguard' : 'lancer',
      outfit: 'armor', hair: captain ? 'crown' : 'bun', accent: captain ? 0x4d4a42 : 0x504839 };
    return { id: `garrison:${city.id}:${role}`, name: `${city.name}·${title}`, role: title, bio, portrait,
      weapon: captain ? 'swordshield' : 'spear', speed: captain ? 12 : 11, appearance,
      category: 'garrison', ...(captain ? {} : { readOnly: true }),
      windows: [{ from: { year: 184, month: 1 }, cityIds: [city.id] }] };
  }));
