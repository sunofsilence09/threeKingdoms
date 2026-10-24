import { ATTRIBUTE_IDS, type Attributes } from './attributes';

export interface FormationStrength {
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

/** One ordinary soldier contributes 10 HP, 3 attack, 1 defense and 10 of each attribute. */
export function formationStrength(troops: number, hp = troops * 10): FormationStrength {
  if (!Number.isInteger(troops) || troops < 0 || troops > 1_000_000) throw new Error('Invalid troop count');
  if (!Number.isFinite(hp)) throw new Error('Invalid formation HP');
  const maxHp = troops * 10;
  const remainingHp = Math.max(0, Math.min(maxHp, Math.floor(hp)));
  const survivors = Math.ceil(remainingHp / 10);
  const attributes = Object.fromEntries(ATTRIBUTE_IDS.map(id => [id, survivors * 10])) as Attributes;
  return { initialTroops: troops, troops: survivors, maxHp, hp: remainingHp,
    attack: survivors * 3, defense: survivors, attributes, speed: 11, move: 3, minRange: 1, maxRange: 2 };
}

/** A partially wounded final soldier still counts until their remaining HP is exhausted. */
export function applyFormationDamage(group: FormationStrength, damage: number): FormationStrength {
  if (!Number.isSafeInteger(damage) || damage <= 0) return group;
  return formationStrength(group.initialTroops, Math.max(0, group.hp - damage));
}
