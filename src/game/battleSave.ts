import { currentActor, isBattleOver, WEAPONS, type CombatState } from './combat';
import { createTerrain, TERRAIN } from './battlefield';
import { formationStrength } from './garrisonStrength';
import { martialAt, martialForPerson } from './martialCatalog';
import type { GameState } from './state';
export interface BattleSnapshot extends CombatState { checkpointVersion: 1; encounterKey: string }
export function battleEncounterKey(state: GameState): string {
  return JSON.stringify([state.duel ?? null, state.encounter ?? 'ambush', state.journey?.serial ?? null,
    state.journey?.event?.kind ?? null, state.battleParty ?? state.deployed]);
}
export function checkpointBattle(combat: CombatState, state: GameState): BattleSnapshot {
  return { ...combat, units: combat.units.map(u => ({ ...u,
    martialIds: u.martialIds ?? (u.id === 'traveler' ? [...state.martial.equipped] : (() => {
      const native = martialForPerson(u.id.replace(/^enemy:/, '')); return native && !native.readOnly ? [native.id] : [];
    })()), martialReady: u.martialReady ?? {}, effects: u.effects ?? [] })),
    checkpointVersion: 1, encounterKey: battleEncounterKey(state) };
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number => Number.isSafeInteger(v) && (v as number) >= min && (v as number) <= max;
const unique = (v: unknown[]): boolean => new Set(v).size === v.length;

/** New checkpoint errors are recoverable without throwing away the RPG save. */
export function isBattleSnapshot(value: unknown, state?: GameState): value is BattleSnapshot {
  if (!object(value) || value.checkpointVersion !== 1 || typeof value.encounterKey !== 'string' ||
      value.width !== 16 || value.height !== 10 || !integer(value.round, 1, 100000) ||
      !integer(value.randomSeed, 0, 0xffffffff) || !['party', 'enemy'].includes(value.turn as string) ||
      ![null, 'cao', 'sun', 'liu'].includes(value.route as null) || !Array.isArray(value.units) || value.units.length < 2 || value.units.length > 32 ||
      !Array.isArray(value.terrain) || value.terrain.length > 160) return false;
  const tile = (v: unknown): v is Record<string, unknown> & { x: number; y: number } => object(v) && integer(v.x, 0, 15) && integer(v.y, 0, 9);
  const terrain = value.terrain;
  if (!terrain.every(t => tile(t) && object(t) && typeof t.kind === 'string' && Object.hasOwn(TERRAIN, t.kind)) ||
      !unique(terrain.map(t => `${t.x},${t.y}`))) return false;
  if (!object(value.environment) || !Array.isArray(value.fires) || !Array.isArray(value.scorched)) return false;
  const units = value.units;
  if (!units.every(u => object(u) && tile(u) && typeof u.id === 'string' && /^[a-z][a-z0-9:-]*$/.test(u.id) &&
      typeof u.name === 'string' && [...u.name].length <= 40 && ['party', 'enemy'].includes(u.team as string) &&
      integer(u.maxHp, 1, 10000000) && integer(u.hp, 0, u.maxHp) && integer(u.attack, 0, 3000000) &&
      integer(u.speed, 1, 10000) && integer(u.defense, 0, 1000000) && integer(u.level, 1, 10) && integer(u.xp, 0, 1000) &&
      typeof u.dodgeRate === 'number' && Number.isFinite(u.dodgeRate) && u.dodgeRate >= 0 && u.dodgeRate <= .4 &&
      typeof u.guarded === 'boolean' && typeof u.empowered === 'boolean' && typeof u.ultimateUsed === 'boolean' &&
      ['survival', 'desperation'].includes(u.ultimate as string) && typeof u.weapon === 'string' && Object.hasOwn(WEAPONS, u.weapon))) return false;
  if (!unique(units.map(u => u.id)) || !unique(units.filter(u => u.hp > 0).map(u => `${u.x},${u.y}`)) ||
      !units.some(u => u.team === 'party') || !units.some(u => u.team === 'enemy')) return false;
  const ids = new Set(units.map(u => u.id));
  if (!(value.selectedId === null || typeof value.selectedId === 'string' && units.some(u => u.id === value.selectedId && u.team === 'party' && u.hp > 0))) return false;
  for (const list of [value.movedIds, value.actedIds]) if (!Array.isArray(list) || !unique(list) || !list.every(id => ids.has(id))) return false;
  const combat = value as unknown as CombatState;
  if (isBattleOver(combat) === 'ongoing' && !currentActor(combat)) return false;
  for (const u of units) {
    if (!Array.isArray(u.martialIds) || !object(u.martialReady) || !Array.isArray(u.effects)) return false;
    const kind = terrain.find(t => t.x === u.x && t.y === u.y)?.kind ?? 'road';
    if (!Number.isFinite(TERRAIN[kind as keyof typeof TERRAIN].cost)) return false;
    if (u.formation !== undefined) {
      if (!object(u.formation) || !integer(u.formation.initialTroops, 1, 1000000)) return false;
      const expected = formationStrength(u.formation.initialTroops, u.hp);
      if (JSON.stringify(u.formation) !== JSON.stringify(expected) || u.maxHp !== expected.maxHp || u.attack !== expected.attack || u.defense !== expected.defense) return false;
    }
    if (u.martialIds !== undefined && (!Array.isArray(u.martialIds) || !unique(u.martialIds) || u.martialIds.length > 3 || !u.martialIds.every((id: unknown) => typeof id === 'string' && !!martialAt(id) && !martialAt(id)!.readOnly))) return false;
    if (u.id !== 'traveler' && Array.isArray(u.martialIds) && u.martialIds.some((id: string) => martialForPerson(u.id.replace(/^enemy:/, ''))?.id !== id)) return false;
    if (u.martialReady !== undefined && (!object(u.martialReady) || !Object.entries(u.martialReady).every(([id, round]) => Array.isArray(u.martialIds) && u.martialIds.includes(id) && integer(round, 1, (value.round as number) + 3)))) return false;
    if (u.effects !== undefined && (!Array.isArray(u.effects) || u.effects.length > 20 || !u.effects.every((e: unknown) => object(e) &&
        ['attack-up', 'attack-down', 'move-down', 'reduction'].includes(e.kind as string) && typeof e.value === 'number' &&
        Number.isFinite(e.value) && e.value >= 0 && e.value <= (e.kind === 'move-down' ? 1 : .5) && ids.has(e.sourceId) &&
        integer(e.expiresRound, value.round as number, (value.round as number) + 3) && (e.untilActor === undefined || ids.has(e.untilActor))))) return false;
  }
  if (value.environment !== undefined) {
    const e = value.environment;
    if (!object(e) || !integer(e.month, 1, 12) || !['sunny', 'cloudy', 'fog', 'rain', 'storm', 'snow'].includes(e.weather as string) ||
        !['calm', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'].includes(e.windDirection as string) || !integer(e.windStrength, 0, 2) ||
        (e.windDirection === 'calm') !== (e.windStrength === 0)) return false;
  }
  if (value.fires !== undefined && (!Array.isArray(value.fires) || value.fires.length > 160 || !unique(value.fires.map(f => object(f) ? `${f.x},${f.y}` : f)) ||
      !value.fires.every(f => object(f) && tile(f) && integer(f.level, 1, 3) && integer(f.remainingRounds, 1, 4) && ids.has(f.sourceId) &&
        !['water', 'rock', 'wall'].includes(terrain.find(t => t.x === f.x && t.y === f.y)?.kind ?? 'road')))) return false;
  if (value.scorched !== undefined && (!Array.isArray(value.scorched) || value.scorched.length > 160 || !value.scorched.every(tile) ||
      !unique(value.scorched.map(t => `${t.x},${t.y}`)))) return false;
  if (value.battleLog !== undefined && (!Array.isArray(value.battleLog) || value.battleLog.length > 50 || !value.battleLog.every(line => typeof line === 'string' && line.length < 400))) return false;
  if (state && (state.phase !== 'battle' || value.encounterKey !== battleEncounterKey(state) || value.route !== state.route ||
      units.filter(u => u.team === 'party').map(u => u.id).join('|') !== (state.battleParty ?? state.deployed).join('|'))) return false;
  if (state?.duel && (units.length !== 2 || units.find(u => u.team === 'enemy')?.id !== `enemy:${state.duel.teacherId}`)) return false;
  const hero = units.find(u => u.id === 'traveler');
  if (state && Array.isArray(hero?.martialIds) && hero.martialIds.join('|') !== state.martial.equipped.join('|')) return false;
  if (state) {
    if (JSON.stringify(terrain) !== JSON.stringify(createTerrain(state.encounter ?? 'ambush'))) return false;
    const fighters = state.battleParty ?? state.deployed;
    const enemyIds = state.duel ? [`enemy:${state.duel.teacherId}`]
      : state.journey?.event?.kind === 'wolves' ? Array.from({ length: Math.max(3, fighters.length) }, (_, i) => `wolf:${i}`)
      : ['bandit-leader', 'bandit-scout-a', 'bandit-scout-b', ...(fighters.length > 3 ? ['bandit-scout-c'] : []), ...(fighters.length > 4 ? ['bandit-scout-d'] : [])]
        .map(id => fighters.includes(id) ? `enemy:${id}` : id);
    if (units.filter(u => u.team === 'enemy').map(u => u.id).join('|') !== enemyIds.join('|')) return false;
    for (const u of units) {
      const native = martialForPerson(u.id.replace(/^enemy:/, ''));
      const expected = u.id === 'traveler' ? state.martial.equipped : native && !native.readOnly ? [native.id] : [];
      if (u.martialIds.join('|') !== expected.join('|')) return false;
    }
    if (value.environment.month !== state.date.month) return false;
  }
  return true;
}
