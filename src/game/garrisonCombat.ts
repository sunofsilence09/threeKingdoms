import type { CombatUnit } from './combat';
import { formationStrength } from './garrisonStrength';
import { recruitProfile } from './recruitmentCatalog';

/** Explicit army preview/combat adapter; constructing a formation never starts a city battle. */
export function makeGarrisonUnit(cityId: string, troops: number, x = 0, y = 0): CombatUnit {
  const profile = recruitProfile(`garrison:${cityId}:soldier`);
  if (!profile) throw new Error(`Unknown garrison city: ${cityId}`);
  const formation = formationStrength(troops);
  return { id: `enemy:${profile.id}`, name: profile.name, team: 'enemy', x, y,
    hp: formation.hp, maxHp: formation.maxHp, attack: formation.attack, defense: formation.defense,
    speed: formation.speed, weapon: 'spear', level: 1, xp: 0, guarded: false, dodgeRate: 0,
    ultimate: 'desperation', ultimateUsed: false, empowered: false, formation };
}
