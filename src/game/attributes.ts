export const ATTRIBUTE_IDS = ['command', 'strength', 'intellect', 'politics', 'charisma', 'courage'] as const;
export type AttributeId = typeof ATTRIBUTE_IDS[number];
export type Attributes = Record<AttributeId, number>;
export const ATTRIBUTE_LABELS: Record<AttributeId, string> = {
  command: '统率', strength: '武力', intellect: '智力', politics: '政略', charisma: '魅力', courage: '魄力',
};
export const ATTRIBUTE_EFFECTS: Record<AttributeId, string> = {
  command: '每5分防御 +1', strength: '每5分攻击 +1', intellect: '每5分闪避 +2%',
  politics: '每5分胜利补给 +1', charisma: '每5分胜利经验 +5%', courage: '每5分最大体力 +2',
};
export function createAttributes(): Attributes {
  return { command: 10, strength: 10, intellect: 10, politics: 10, charisma: 10, courage: 10 };
}
export function isAttributes(value: unknown): value is Attributes {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== ATTRIBUTE_IDS.length) return false;
  return ATTRIBUTE_IDS.every(id => Number.isSafeInteger((value as Attributes)[id]) && (value as Attributes)[id] >= 10 && (value as Attributes)[id] <= 30);
}
export function attributeContribution(value: number, version: 1 | 2 | 3 = 3): number { return version === 3 ? Math.floor((value - 50) / 5) : value - 10; }
export function attributeBonuses(attrs: Attributes, version: 1 | 2 | 3 = 3) {
  return { attack: attributeContribution(attrs.strength, version), defense: attributeContribution(attrs.command, version), dodge: Math.min(0.4, (attributeContribution(attrs.intellect, version)) * 0.02),
    hp: (attributeContribution(attrs.courage, version)) * 2, supplies: attributeContribution(attrs.politics, version), experience: (attributeContribution(attrs.charisma, version)) * 0.05 };
}

export function victoryExperience(base: number, attrs: Attributes, version: 1 | 2 | 3 = 3): number {
  return Math.floor(base * (100 + (attributeContribution(attrs.charisma, version)) * 5) / 100);
}
