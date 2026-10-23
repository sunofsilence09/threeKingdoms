import type { WeaponId } from './combat';

export const HERO_WEAPONS = ['fists', 'cleaver', 'knife', 'spear', 'bow'] as const satisfies readonly WeaponId[];
export type HeroWeapon = typeof HERO_WEAPONS[number];
export const HERO_STAGES = [
  { id: 'refugee', label: '流民', minLevel: 1, maxLevel: 2, outfit: 'tunic', robe: 0x667067, sash: 0x77604a, accent: 0x79644b, pack: true },
  { id: 'veteran', label: '历练', minLevel: 3, maxLevel: 5, outfit: 'tunic', robe: 0x53695e, sash: 0x68503a, accent: 0x70543c, pack: false },
  { id: 'commander', label: '统领', minLevel: 6, maxLevel: 10, outfit: 'armor', robe: 0x344f4c, sash: 0xb29458, accent: 0x64776e, pack: false },
] as const;
export function getHeroStage(level = 1) {
  const safe = Number.isNaN(level) ? 1 : level;
  return safe >= 6 ? HERO_STAGES[2] : safe >= 3 ? HERO_STAGES[1] : HERO_STAGES[0];
}
export function getHeroVisual(level: number = 1, weapon: HeroWeapon = 'cleaver') {
  const stage = getHeroStage(level);
  return { stage, weapon, outfit: stage.outfit, portrait: stage.id === 'refugee' && weapon === 'cleaver'
    ? '/assets/characters/jiang-yuan-refugee-v1.png'
    : `/assets/characters/hero/jiang-yuan-${stage.id}-${weapon}-v1.png` };
}
