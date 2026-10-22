export const ATTRIBUTE_IDS = ['command', 'strength', 'intellect', 'politics', 'charisma', 'courage'] as const;
export type AttributeId = typeof ATTRIBUTE_IDS[number];
export type Attributes = Record<AttributeId, number>;
export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  command: '统率', strength: '武力', intellect: '智力', politics: '政略', charisma: '魅力', courage: '魄力',
};
export const ATTRIBUTE_EFFECTS: Record<AttributeId, string> = {
  command: '每点防御 +1', strength: '每点攻击 +1', intellect: '每点闪避 +2%',
  politics: '每点胜利补给 +1', charisma: '每点胜利经验 +5%', courage: '每点最大体力 +2',
};
export function createAttributes(): Attributes {
  return { command: 10, strength: 10, intellect: 10, politics: 10, charisma: 10, courage: 10 };
}
export function isAttributes(value: unknown): value is Attributes {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== ATTRIBUTE_IDS.length) return false;
  return ATTRIBUTE_IDS.every(id => Number.isSafeInteger((value as Attributes)[id]) && (value as Attributes)[id] >= 10 && (value as Attributes)[id] <= 30);
}
export function attributeBonuses(attrs: Attributes) {
  return { attack: attrs.strength - 10, defense: attrs.command - 10, dodge: Math.min(0.4, (attrs.intellect - 10) * 0.02),
    hp: (attrs.courage - 10) * 2, supplies: attrs.politics - 10, experience: (attrs.charisma - 10) * 0.05 };
}

export function victoryExperience(base: number, attrs: Attributes): number {
  return Math.floor(base * (100 + (attrs.charisma - 10) * 5) / 100);
}
