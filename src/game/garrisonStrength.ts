import { ATTRIBUTE_IDS, createAttributes, type Attributes } from './attributes';
import { effectiveAttributes, type AttributeVersion } from './characterTalents';

export interface FormationStrength {
  attributeVersion?: AttributeVersion;
  troopRuleVersion?: 2;
  initialTroops: number;
  troops: number;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  attributes: Attributes;
  speed: number;
  move: number;
  minRange: number;
  maxRange: number;
}

/** New tactical soldiers match accompanying troops. Version1 remains exact for old checkpoints. */
export function formationStrength(troops: number, hp?: number, attributeVersion: AttributeVersion = 3, troopRuleVersion: 1 | 2 = 2): FormationStrength {
  if (!Number.isInteger(troops) || troops < 0 || troops > 1_000_000) throw new Error('Invalid troop count');
  const perHp = troopRuleVersion === 2 ? 2 : 10;
  if (hp !== undefined && !Number.isFinite(hp)) throw new Error('Invalid formation HP');
  const maxHp = troops * perHp;
  const remainingHp = Math.max(0, Math.min(maxHp, Math.floor(hp ?? maxHp)));
  const survivors = Math.ceil(remainingHp / perHp);
  const base = attributeVersion === 1 ? createAttributes() : effectiveAttributes('garrison:ordinary:soldier', createAttributes(), attributeVersion);
  const attributes = Object.fromEntries(ATTRIBUTE_IDS.map(id => [id, survivors * base[id]])) as Attributes;
  return { attributeVersion, ...(troopRuleVersion === 2 ? { troopRuleVersion: 2 as const } : {}), initialTroops: troops, troops: survivors, maxHp, hp: remainingHp,
    attack: troopRuleVersion === 2 ? Math.ceil(survivors / 10) : survivors * 3,
    defense: troopRuleVersion === 2 ? Math.ceil(survivors / 40) : survivors,
    attributes, speed: 11, move: 3, minRange: 1, maxRange: 2 };
}

/** A partially wounded final soldier still counts until their remaining HP is exhausted. */
export function applyFormationDamage(group: FormationStrength, damage: number): FormationStrength {
  if (!Number.isSafeInteger(damage) || damage <= 0) return group;
  return formationStrength(group.initialTroops, Math.max(0, group.hp - damage), group.attributeVersion ?? 1, group.troopRuleVersion ?? 1);
}
