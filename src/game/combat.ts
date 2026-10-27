import { attributeBonuses } from './attributes';
import { moraleFactor, moraleOf, defensePower, speedPower, fortificationFactor, troopStats, troopRange, TROOP_TYPES, resolveTroopAI, type TroopContingent } from './troopCombat';
import { baseAttributes, effectiveAttributes, type AttributeVersion } from './characterTalents';
import type { RouteId } from './state';
import { createPartyProgress, PARTY_IDS, type Progress, type PartyProgress } from './growth';
import { recruitProfile } from './recruitmentCatalog';
import { createTerrain, TERRAIN, type BattleMode, type TerrainKind, type TerrainTile } from './battlefield';
import { formationStrength, type FormationStrength } from './garrisonStrength';
import { createEnvironment, DEFAULT_ENVIRONMENT, EXTINGUISH_CHANCE, nextRandom, OPPOSITE_WIND, randomWind, seasonalWeather, WEATHER_MULTIPLIER, WEATHER_NAMES, WIND_NAMES, WIND_VECTORS, type BattleEnvironment, type FireTile } from './battleEnvironment';
export type { BattleEnvironment, FireTile } from './battleEnvironment';

export type CombatTeam = 'party' | 'enemy';
export type UltimateId = 'survival' | 'desperation';
export const ULTIMATES: Record<UltimateId, { name: string; description: string }> = {
  survival: { name: '绝处逢生', description: '半血及以下可用，回复最大体力30%，下次攻击+50%。每场一次。' },
  desperation: { name: '拼命', description: '消耗最大体力20%（不致倒地），下次攻击+50%。每场一次。' },
};
export interface CombatEvent { kind: 'attack' | 'dodge' | 'ultimate' | 'fire' | 'burn' | 'martial' | 'troop' | 'rout' | 'extinguish' | 'spread' | 'burnout'; actorId: string; targetId?: string; damage: number; x?: number; y?: number; success?: boolean; skillId?: string }
export interface CombatEffect { kind: 'attack-up' | 'attack-down' | 'move-down' | 'reduction'; value: number; sourceId: string; expiresRound: number; untilActor?: string }

export type WeaponId = 'fists' | 'cleaver' | 'knife' | 'spear' | 'bow' | 'sword' | 'fan' | 'scroll' | 'halberd' | 'glaive' | 'jade' | 'serpentspear' | 'handkerchief' | 'swordshield' | 'claws';
export const WEAPONS: Record<WeaponId, { name: string; mark: string; hp: number; attack: number; move: number; min: number; max: number }> = {
  fists: { name: '拳脚', mark: '拳', hp: 9, attack: 2, move: 3, min: 1, max: 1 },
  cleaver: { name: '菜刀', mark: '刀', hp: 10, attack: 3, move: 3, min: 1, max: 1 },
  knife: { name: '短刀', mark: '刃', hp: 11, attack: 4, move: 3, min: 1, max: 1 },
  spear: { name: '木枪', mark: '枪', hp: 10, attack: 3, move: 3, min: 1, max: 2 },
  bow: { name: '猎弓', mark: '弓', hp: 9, attack: 3, move: 3, min: 2, max: 3 },
  sword: { name: '佩剑', mark: '剑', hp: 10, attack: 3, move: 3, min: 1, max: 1 },
  fan: { name: '扇令', mark: '扇', hp: 9, attack: 2, move: 3, min: 1, max: 2 },
  scroll: { name: '书卷号令', mark: '令', hp: 9, attack: 2, move: 3, min: 1, max: 3 },
  halberd: { name: '画戟', mark: '戟', hp: 11, attack: 4, move: 3, min: 1, max: 2 },
  glaive: { name: '长柄战刀', mark: '刀', hp: 11, attack: 3, move: 3, min: 1, max: 2 },
  jade: { name: '玉佩援护', mark: '玉', hp: 9, attack: 2, move: 3, min: 1, max: 2 },
  serpentspear: { name: '丈八蛇矛', mark: '矛', hp: 11, attack: 3, move: 3, min: 1, max: 2 },
  handkerchief: { name: '丝帕援护', mark: '帕', hp: 9, attack: 2, move: 3, min: 1, max: 2 },
  swordshield: { name: '剑盾', mark: '盾', hp: 12, attack: 3, move: 3, min: 1, max: 1 },
  claws: { name: '爪牙', mark: '爪', hp: 5, attack: 2, move: 3, min: 1, max: 1 },
};
export interface CombatUnit {
  id: string; name: string; team: CombatTeam; x: number; y: number;
  hp: number; maxHp: number; attack: number; speed: number; guarded: boolean;
  weapon: WeaponId; level: number; xp: number; defense: number; dodgeRate: number;
  ultimate: UltimateId; ultimateUsed: boolean; empowered: boolean;
  formation?: FormationStrength;
  morale?: number; troop?: TroopContingent;
  martialIds?: string[]; martialReady?: Record<string, number>; effects?: CombatEffect[];
}
export interface CombatState {
  attributeVersion?: AttributeVersion;
  width: number; height: number; terrain: TerrainTile[]; units: CombatUnit[];
  selectedId: string | null; turn: CombatTeam; route: RouteId | null;
  round: number; movedIds: string[]; actedIds: string[]; randomSeed: number; lastEvent?: CombatEvent; turnEvents?: CombatEvent[];
  environment?: BattleEnvironment; fires?: FireTile[]; scorched?: Tile[];
  battleLog?: string[];
}
export type BattleResult = 'ongoing' | 'win' | 'loss';
interface Tile { x: number; y: number }
interface PathTile extends Tile { cost: number; path: Tile[] }

/** Candidate previews and battle spawns share the same earned attributes and equipment. */
export function makePartyUnit(id: string, progress: Progress, route: RouteId | null, mode: BattleMode, x = 0, y = 0, attributeVersion: AttributeVersion = 2): CombatUnit {
  const profile = recruitProfile(id);
  if (!profile) throw new Error(`Unknown party member: ${id}`);
  const initialEquipment: Record<string, WeaponId> = mode === 'route'
    ? { traveler: 'knife', aman: 'spear', 'chen-da': 'bow' }
    : { traveler: 'cleaver', aman: 'fists', 'chen-da': 'fists' };
  const weapon = initialEquipment[id] ?? profile.weapon;
  const { level, xp, attributes } = progress;
  const bonus = attributeBonuses(effectiveAttributes(id, attributes, attributeVersion));
  const maxHp = WEAPONS[weapon].hp + (level - 1) * 2 + bonus.hp + (route === 'liu' ? 1 : 0);
  return { id, name: profile.name, team: 'party', x, y, hp: maxHp, maxHp, weapon, level, xp, speed: profile.speed, morale: 80,
    attack: WEAPONS[weapon].attack + Math.floor((level - 1) / 2) + bonus.attack + (route === 'cao' && id === 'traveler' ? 1 : 0), guarded: false, defense: bonus.defense, dodgeRate: bonus.dodge,
    ultimate: id === 'traveler' ? 'survival' : 'desperation', ultimateUsed: false, empowered: false };
}

export function createCombatState(route: RouteId | null, party: PartyProgress = createPartyProgress(), mode: BattleMode = route ? 'route' : 'ambush', deployed: readonly string[] = PARTY_IDS, options: { enemyKind?: 'bandits' | 'wolves'; month?: number; seed?: number } = {}): CombatState {
  if (deployed.length < 1 || deployed.length > 5 || new Set(deployed).size !== deployed.length ||
      deployed.some(id => !recruitProfile(id) || recruitProfile(id)!.readOnly || !Object.hasOwn(party, id))) throw new Error('Invalid battle deployment');
  const makeEnemy = (id: string, name: string, x: number, y: number, weapon: WeaponId, hp: number, attack: number): CombatUnit => {
    const bonus = attributeBonuses(baseAttributes(id));
    return { id: deployed.includes(id) ? `enemy:${id}` : id, name, team: 'enemy', x, y, hp: hp + bonus.hp, maxHp: hp + bonus.hp,
      attack: attack + bonus.attack, speed: id === 'bandit-leader' ? 11 : id === 'bandit-scout-a' ? 13 : 9,
      weapon, level: mode === 'route' ? 2 : 1, xp: 0, guarded: false, defense: bonus.defense, dodgeRate: bonus.dodge, morale: 80,
      ultimate: 'desperation', ultimateUsed: false, empowered: false };
  };
  const advanced = mode === 'route';
  const allyPositions = [[advanced ? 4 : 3, 4], [3, 5], [advanced ? 4 : 2, 6], [2, 3], [3, 7]];
  const enemyPositions = [[7, 4], [7, 6], [9, 5], [8, 8], [11, 7]];
  const wolves = enemyPositions.slice(0, Math.max(3, deployed.length)).map(([x, y], index) => ({
    ...makeEnemy(`wolf:${index}`, index === 0 ? '头狼' : '山狼', x, y, 'claws', index === 0 ? 6 : 4, 2), speed: index === 0 ? 13 : 11,
  }));
  const seed = (options.seed ?? (0x6d2b79f5 ^ (mode === 'ambush' ? 17 : 53) ^ (route?.charCodeAt(0) ?? 0))) >>> 0;
  return advanceTurn({
    attributeVersion: 2, width: 16, height: 10, terrain: createTerrain(mode), selectedId: null, turn: 'party', route, round: 1, movedIds: [], actedIds: [], randomSeed: seed,
    environment: createEnvironment(options.month ?? 3, seed), fires: [], scorched: [],
    units: [
      ...deployed.map((id, index) => makePartyUnit(id, party[id], route, mode, allyPositions[index][0], allyPositions[index][1])),
      ...(options.enemyKind === 'wolves' ? wolves : [makeEnemy('bandit-leader', '山贼头目', 7, 4, advanced ? 'spear' : 'cleaver', advanced ? 9 : 7, 3),
      makeEnemy('bandit-scout-a', '拦路山贼', advanced ? 8 : 7, 6, 'cleaver', advanced ? 7 : 4, 2),
      makeEnemy('bandit-scout-b', advanced ? '山贼弓手' : '山贼喽啰', advanced ? 11 : 9, advanced ? 4 : 5, advanced ? 'bow' : 'fists', advanced ? 6 : 4, 2),
      ...(deployed.length > 3 ? [makeEnemy('bandit-scout-c', '山贼喽啰', 8, 8, 'cleaver', advanced ? 7 : 4, 2)] : []),
      ...(deployed.length > 4 ? [makeEnemy('bandit-scout-d', '山贼弓手', 11, 7, 'bow', advanced ? 6 : 4, 2)] : [])]),
    ],
  });
}

export function terrainAt(state: CombatState, x: number, y: number): TerrainKind {
  const kind = state.terrain.find(tile => tile.x === x && tile.y === y)?.kind ?? 'road';
  return kind === 'woods' && state.scorched?.some(t => t.x === x && t.y === y) ? 'road' : kind;
}
export function movementRange(state: CombatState, unit: CombatUnit): number {
  return Math.max(0, (unit.troop?.count ? TROOP_TYPES[unit.troop.kind].move : unit.formation?.move ?? (unit.team === 'enemy' ? unit.weapon === 'claws' ? 3 : 2 : WEAPONS[unit.weapon].move)) + (unit.team === 'party' && state.route === 'sun' ? 1 : 0) - effectValue(unit, 'move-down', 1));
}
export function distance(a: Tile, b: Tile): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
export function isBattleOver(state: CombatState): BattleResult {
  if (!state.units.some(u => u.team === 'party' && u.hp > 0)) return 'loss';
  if (!state.units.some(u => u.team === 'enemy' && u.hp > 0)) return 'win';
  return 'ongoing';
}
/** Stable ties follow encounter placement; both teams share one initiative queue. */
export function actionOrder(state: CombatState): CombatUnit[] {
  return state.units.filter(u => u.hp > 0).sort((a, b) => speedPower(b) - speedPower(a));
}
export function currentActor(state: CombatState): CombatUnit | undefined {
  if (isBattleOver(state) !== 'ongoing') return undefined;
  // Movement starts a complete action. Fire may change initiative during that
  // move, but the surviving actor still gets its attack/guard before reordering.
  const moving = state.movedIds.map(id => state.units.find(u => u.id === id))
    .find(u => u && u.hp > 0 && !state.actedIds.includes(u.id));
  if (moving) return moving;
  return actionOrder(state).find(u => !state.actedIds.includes(u.id));
}
export function advanceTurn(state: CombatState): CombatState {
  if (isBattleOver(state) !== 'ongoing') return { ...state, selectedId: null };
  let next = state;
  if (!currentActor(state)) {
    next = resolveRoundEnd(state);
    if (isBattleOver(next) !== 'ongoing') return { ...next, selectedId: null };
    next = { ...next, round: state.round + 1, actedIds: [], movedIds: [] };
  }
  const actor = currentActor(next)!;
  return { ...next, units: next.units.map(u => u.effects ? { ...u, effects: u.effects.filter(e => e.expiresRound > next.round && e.untilActor !== actor.id) } : u), turn: actor.team, selectedId: actor.team === 'party' ? actor.id : null };
}
function canAct(state: CombatState, unit: CombatUnit): boolean {
  return currentActor(state)?.id === unit.id;
}
function updateUnit(state: CombatState, id: string, updater: (u: CombatUnit) => CombatUnit): CombatState {
  return { ...state, units: state.units.map(u => u.id === id ? updater(u) : u) };
}
/** Formation HP is the sole source of its surviving soldiers and effective combat strength. */
export function updateUnitHp(unit: CombatUnit, hp: number): CombatUnit {
  const morale = { morale: Math.max(0, moraleOf(unit) - (hp < unit.hp ? Math.min(20, Math.max(1, Math.ceil((unit.hp - hp) / unit.maxHp * 40))) : 0)) };
  if (unit.troop) {
    const count = Math.min(unit.troop.count, Math.ceil(Math.max(0, hp - unit.troop.baseMaxHp) / 2));
    const troop = { ...unit.troop, count };
    return { ...unit, ...morale, hp: Math.max(0, Math.min(hp, troop.baseMaxHp + count * 2)), troop, ...troopStats(troop) };
  }
  if (!unit.formation) return { ...unit, hp, ...morale };
  const formation = formationStrength(unit.formation.initialTroops, hp, unit.formation.attributeVersion ?? 1);
  return { ...unit, ...morale, hp: formation.hp, attack: formation.attack, defense: formation.defense, formation };
}
export function endAction(state: CombatState, id: string): CombatState {
  return { ...updateUnit(state, id, u => ({ ...u, empowered: false, ...(u.effects ? { effects: u.effects.filter(e => e.kind !== 'attack-down' && e.kind !== 'move-down') } : {}) })), selectedId: null, actedIds: [...new Set([...state.actedIds, id])] };
}
export function applyGuard(state: CombatState, unitId: string): CombatState {
  const unit = state.units.find(u => u.id === unitId);
  if (!unit || !canAct(state, unit)) return state;
  return endAction(updateUnit(state, unitId, u => ({ ...u, guarded: true, morale: Math.min(120, moraleOf(u) + 10) })), unitId);
}
function neighbors(tile: Tile): Tile[] {
  return [{ x: tile.x + 1, y: tile.y }, { x: tile.x - 1, y: tile.y }, { x: tile.x, y: tile.y + 1 }, { x: tile.x, y: tile.y - 1 }];
}
function isOpenTile(state: CombatState, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < state.width && y < state.height &&
    Number.isFinite(TERRAIN[terrainAt(state, x, y)].cost) && !state.units.some(u => u.hp > 0 && u.x === x && u.y === y);
}
// Dijkstra preserves the cheapest route when woods cost more than roads.
function pathsFrom(state: CombatState, unit: CombatUnit, limit = Infinity, avoidFire = false): PathTile[] {
  const queue: PathTile[] = [{ x: unit.x, y: unit.y, cost: 0, path: [] }];
  const costs = new Map([[`${unit.x},${unit.y}`, 0]]);
  const result: PathTile[] = [];
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const current = queue.shift()!;
    if (current.cost !== costs.get(`${current.x},${current.y}`)) continue;
    result.push(current);
    for (const tile of neighbors(current)) {
      if (!isOpenTile(state, tile.x, tile.y)) continue;
      if (avoidFire && fireAt(state, tile)) continue;
      const cost = current.cost + TERRAIN[terrainAt(state, tile.x, tile.y)].cost;
      const key = `${tile.x},${tile.y}`;
      if (cost > limit || cost >= (costs.get(key) ?? Infinity)) continue;
      costs.set(key, cost);
      queue.push({ ...tile, cost, path: [...current.path, tile] });
    }
  }
  return result;
}
export function reachableTiles(state: CombatState, unitId: string, extraRange = 0, allowMoved = false): Tile[] {
  const unit = state.units.find(u => u.id === unitId);
  if (!unit || !canAct(state, unit) || (!allowMoved && state.movedIds.includes(unitId))) return [];
  return pathsFrom(state, unit, movementRange(state, unit) + Math.min(2, Math.max(0, extraRange))).filter(t => t.cost > 0).map(({ x, y }) => ({ x, y }));
}
export function moveUnit(state: CombatState, unitId: string, x: number, y: number, extraRange = 0, allowMoved = false): CombatState {
  const unit = state.units.find(u => u.id === unitId);
  if (!unit || !canAct(state, unit) || (!allowMoved && state.movedIds.includes(unitId))) return state;
  const range = movementRange(state, unit) + Math.min(2, Math.max(0, extraRange));
  const route = pathsFrom(state, unit, range, true).find(t => t.x === x && t.y === y && t.cost > 0)
    ?? pathsFrom(state, unit, range).find(t => t.x === x && t.y === y && t.cost > 0);
  if (!route) return state;
  let highest: FireTile | undefined, destination: Tile = { x, y };
  for (const tile of route.path) {
    const fire = fireAt(state, tile);
    if (!fire) continue;
    if (!highest || fire.level > highest.level) highest = fire;
    if (burnDamage(unit, highest.level) >= unit.hp) { destination = tile; break; }
  }
  const damage = highest ? burnDamage(unit, highest.level) : 0;
  let next = updateUnit(state, unitId, u => ({ ...updateUnitHp(u, Math.max(0, u.hp - damage)), ...destination, guarded: false }));
  next = { ...next, movedIds: [...new Set([...next.movedIds, unitId])], ...(highest ? { lastEvent: { kind: 'burn' as const, actorId: highest.sourceId, targetId: unitId, damage } } : {}) };
  return damage >= unit.hp ? endAction(next, unitId) : next;
}
// Supercover ray: at an exact grid corner, both adjoining cells must be clear.
export function clearSight(state: CombatState, from: Tile, to: Tile): boolean {
  let { x, y } = from;
  const dx = Math.abs(to.x - x), dy = Math.abs(to.y - y);
  const sx = Math.sign(to.x - x), sy = Math.sign(to.y - y);
  let ix = 0, iy = 0;
  const blocked = (tx: number, ty: number) => TERRAIN[terrainAt(state, tx, ty)].blocksSight;
  while (ix < dx || iy < dy) {
    const crossX = (1 + 2 * ix) * dy;
    const crossY = (1 + 2 * iy) * dx;
    if (crossX === crossY) {
      if (blocked(x + sx, y) || blocked(x, y + sy)) return false;
      x += sx; y += sy; ix++; iy++;
    } else if (crossX < crossY) { x += sx; ix++; }
    else { y += sy; iy++; }
    if (blocked(x, y)) return false;
  }
  return true;
}
export function canAttack(state: CombatState, attacker: CombatUnit, target: CombatUnit): boolean {
  const range = troopRange(attacker);
  const gap = distance(attacker, target);
  return attacker.hp > 0 && target.hp > 0 && attacker.team !== target.team && gap >= range.min && gap <= range.max && clearSight(state, attacker, target);
}
function effectValue(unit: CombatUnit, kind: CombatEffect['kind'], cap: number): number { return Math.min(cap, Math.max(0, ...((unit.effects ?? []).filter(e => e.kind === kind).map(e => e.value)))); }
export function attackPower(unit: CombatUnit): number { return unit.attack * moraleFactor(unit.morale) * Math.max(unit.empowered ? 1.5 : 1, 1 + effectValue(unit, 'attack-up', .5)) * (1 - effectValue(unit, 'attack-down', .2)); }
export function ultimateAvailability(state: CombatState, unit: CombatUnit): { available: boolean; reason: string } {
  if (unit.ultimateUsed) return { available: false, reason: '本场已用' };
  if (!canAct(state, unit)) return { available: false, reason: unit.hp <= 0 ? '无法行动' : '本回合已行动' };
  if (unit.ultimate === 'survival' && unit.hp > unit.maxHp / 2) return { available: false, reason: '半血及以下可用' };
  if (unit.ultimate === 'desperation' && unit.hp <= Math.max(1, Math.ceil(unit.maxHp * 0.2))) return { available: false, reason: '体力不足' };
  return { available: true, reason: unit.ultimate === 'survival' ? `回复 ${Math.ceil(unit.maxHp * 0.3)} 体力` : `消耗 ${Math.ceil(unit.maxHp * 0.2)} 体力` };
}
export function activateUltimate(state: CombatState, id: string): CombatState {
  const unit = state.units.find(u => u.id === id);
  if (!unit || !ultimateAvailability(state, unit).available) return state;
  const hp = unit.ultimate === 'survival' ? Math.min(unit.maxHp, unit.hp + Math.ceil(unit.maxHp * 0.3)) : unit.hp - Math.max(1, Math.ceil(unit.maxHp * 0.2));
  return { ...updateUnit(state, id, u => ({ ...updateUnitHp(u, hp), morale: moraleOf(u), empowered: true, ultimateUsed: true })), lastEvent: { kind: 'ultimate', actorId: id, damage: 0 } };
}
export function performAttack(state: CombatState, attackerId: string, targetId: string): CombatState {
  const attacker = state.units.find(u => u.id === attackerId);
  const target = state.units.find(u => u.id === targetId);
  if (!attacker || !target || !canAct(state, attacker) || !canAttack(state, attacker, target)) return state;
  const random = nextRandom(state.randomSeed);
  const dodged = random.roll < Math.max(0, Math.min(0.4, target.dodgeRate));
  const damage = dodged ? 0 : attackDamage(state, attacker, target);
  const next = dodged ? state : updateUnit(state, targetId, u => ({ ...updateUnitHp(u, Math.max(0, u.hp - damage)), guarded: false }));
  const acted = endAction(updateUnit(next, attackerId, u => ({ ...u, guarded: false, empowered: false, morale: Math.min(120, moraleOf(u) + (dodged ? 0 : 3)), ...(u.effects ? { effects: u.effects.filter(e => e.kind !== 'attack-up') } : {}) })), attackerId);
  return { ...acted, randomSeed: random.seed, lastEvent: { kind: dodged ? 'dodge' : 'attack', actorId: attackerId, targetId, damage } };
}
function attackDamage(state: CombatState, attacker: CombatUnit, target: CombatUnit): number {
  const power = Math.max(1, attackPower(attacker) - defensePower(target));
  const guarded = state.route === 'liu' && target.team === 'party' ? Math.floor(power / 2) : Math.ceil(power / 2);
  const cover = (attacker.weapon === 'bow' || attacker.troop?.kind === 'bow' || attacker.troop?.kind === 'crossbow') && terrainAt(state, target.x, target.y) === 'woods' ? 1 : 0;
  const reduced = Math.min(target.guarded ? guarded : power, power * (1 - effectValue(target, 'reduction', .5)));
  return Math.max(1, Math.ceil(reduced * fortificationFactor(target) - cover));
}
const FUEL: Record<TerrainKind, { chance: number; rounds: number }> = {
  road: { chance: 35, rounds: 2 }, woods: { chance: 75, rounds: 4 }, bridge: { chance: 60, rounds: 3 }, cart: { chance: 65, rounds: 3 },
  water: { chance: 0, rounds: 0 }, wall: { chance: 0, rounds: 0 }, rock: { chance: 0, rounds: 0 },
};
function inBounds(state: CombatState, tile: Tile): boolean { return Number.isInteger(tile.x) && Number.isInteger(tile.y) && tile.x >= 0 && tile.y >= 0 && tile.x < state.width && tile.y < state.height; }
function sameTile(a: Tile, b: Tile): boolean { return a.x === b.x && a.y === b.y; }
function fireAt(state: CombatState, tile: Tile): FireTile | undefined { return state.fires?.find(f => sameTile(f, tile)); }
function hasFuel(state: CombatState, tile: Tile): boolean { return inBounds(state, tile) && FUEL[terrainAt(state, tile.x, tile.y)].chance > 0 && !state.scorched?.some(t => sameTile(t, tile)) && !fireAt(state, tile); }
function surrounding(tile: Tile): Tile[] {
  return [-1, 0, 1].flatMap(dy => [-1, 0, 1].filter(dx => dx || dy).map(dx => ({ x: tile.x + dx, y: tile.y + dy })));
}
export function fireChance(state: CombatState, x: number, y: number, bonus = 0): number {
  if (!hasFuel(state, { x, y })) return 0;
  const env = state.environment ?? DEFAULT_ENVIRONMENT;
  return Math.max(0, Math.min(95, Math.round(FUEL[terrainAt(state, x, y)].chance * WEATHER_MULTIPLIER[env.weather] + (env.windStrength === 2 ? 10 : 0) + bonus)));
}
export function fireTargets(state: CombatState, id: string): Tile[] {
  const unit = state.units.find(u => u.id === id);
  if (!unit || !canAct(state, unit) || unit.weapon === 'claws') return [];
  return [{ x: unit.x, y: unit.y }, ...surrounding(unit)].filter(t => hasFuel(state, t));
}
/** Caller owns ability range/action checks. This helper only rolls a legal fuel tile. */
export function igniteAt(state: CombatState, sourceId: string, x: number, y: number, bonus = 0, level: 1 | 2 | 3 = 1): CombatState {
  if (!hasFuel(state, { x, y })) return state;
  const random = nextRandom(state.randomSeed), success = random.roll * 100 < fireChance(state, x, y, bonus);
  return { ...state, randomSeed: random.seed, fires: success ? [...(state.fires ?? []), { x, y, level, remainingRounds: FUEL[terrainAt(state, x, y)].rounds, sourceId }] : (state.fires ?? []),
    lastEvent: { kind: 'fire', actorId: sourceId, x, y, damage: 0, success } };
}
export function setFire(state: CombatState, id: string, x: number, y: number, bonus = 0, level: 1 | 2 | 3 = 1): CombatState {
  if (!fireTargets(state, id).some(t => t.x === x && t.y === y)) return state;
  return endAction(igniteAt(state, id, x, y, bonus, level), id);
}
export function spreadChance(state: CombatState, from: Tile, to: Tile): number {
  if (!hasFuel(state, to) || Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y)) !== 1) return 0;
  const env = state.environment ?? DEFAULT_ENVIRONMENT, wind = WIND_VECTORS[env.windDirection];
  const alignment = (to.x - from.x) * wind.x + (to.y - from.y) * wind.y;
  const base = !env.windStrength || env.windDirection === 'calm' ? 15 : alignment > 0 ? 45 + (env.windStrength === 2 ? 20 : 0) : alignment < 0 ? 5 : 15;
  return Math.max(0, Math.min(95, base * FUEL[terrainAt(state, to.x, to.y)].chance / 75 * WEATHER_MULTIPLIER[env.weather]));
}
function burnDamage(unit: CombatUnit, level: number): number { return Math.max(2, Math.ceil(unit.maxHp * (.06 + .02 * level))); }
export function environmentLabel(state: CombatState): string {
  const env = state.environment ?? DEFAULT_ENVIRONMENT;
  const wind = !env.windStrength || env.windDirection === 'calm' ? '静风（无风）' : `${WIND_NAMES[OPPOSITE_WIND[env.windDirection]]}风，吹向${WIND_NAMES[env.windDirection]}（${env.windStrength === 2 ? '强风' : '微风'}）`;
  return `${WEATHER_NAMES[env.weather]} · ${wind} · 本轮末风象可能变化（下轮生效）；第${Math.ceil(state.round / 3) * 3}轮末天气可能变化`;
}
/** Resolve only original fire tiles: rain → damage → spread → burnout → next weather. */
export function resolveRoundEnd(state: CombatState): CombatState {
  if (isBattleOver(state) !== 'ongoing') return state;
  const env = state.environment ?? DEFAULT_ENVIRONMENT;
  let seed = state.randomSeed;
  const roll = () => { const random = nextRandom(seed); seed = random.seed; return random.roll; };
  const events: CombatEvent[] = [];
  const original = (state.fires ?? []).filter((f, index, all) => all.findIndex(t => sameTile(t, f)) === index);
  const surviving = original.filter(f => {
    if (roll() >= EXTINGUISH_CHANCE[env.weather]) return true;
    events.push({ kind: 'extinguish', actorId: f.sourceId, damage: 0, x: f.x, y: f.y }); return false;
  }).map(f => ({ ...f }));
  // Fire strength grows once per round; newly spread fire never participates here.
  for (const fire of surviving) if (terrainAt(state, fire.x, fire.y) === 'woods' && env.windStrength === 2 && fire.level < 3 && roll() < .35) fire.level = (fire.level + 1) as 2 | 3;
  const units = state.units.map(unit => {
    const fire = surviving.find(f => sameTile(f, unit));
    if (!fire || unit.hp <= 0) return unit;
    const damage = burnDamage(unit, fire.level);
    events.push({ kind: 'burn', actorId: fire.sourceId, targetId: unit.id, damage });
    return updateUnitHp(unit, Math.max(0, unit.hp - damage));
  });
  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    if (unit.hp <= 0 || moraleOf(unit) >= 10) continue;
    const count = unit.troop?.count ?? unit.formation?.troops ?? 0;
    if (!count) continue;
    const lost = Math.ceil(count * .1), damage = lost * (unit.troop ? 2 : 10);
    // Rout removes soldiers, never the commander's remaining personal HP.
    const hurt = updateUnitHp(unit, Math.max(unit.troop?.baseMaxHp ?? 0, unit.hp - damage));
    units[i] = { ...hurt, morale: unit.morale };
    events.push({ kind: 'rout', actorId: unit.id, targetId: unit.id, damage: lost });
  }
  const newFires: FireTile[] = [];
  let next: CombatState = { ...state, units, fires: surviving, scorched: [...(state.scorched ?? [])] };
  for (const fire of surviving) {
    let spread = 0;
    const candidates = surrounding(fire).sort((a, b) => spreadChance(state, fire, b) - spreadChance(state, fire, a));
    for (const tile of candidates) {
      if (spread === 2) break;
      const chance = spreadChance(next, fire, tile);
      if (!chance || roll() * 100 >= chance) continue;
      newFires.push({ ...tile, level: 1, remainingRounds: FUEL[terrainAt(state, tile.x, tile.y)].rounds, sourceId: fire.sourceId });
      events.push({ kind: 'spread', actorId: fire.sourceId, damage: 0, x: tile.x, y: tile.y });
      next = { ...next, fires: [...surviving, ...newFires] };
      spread++;
    }
  }
  const remaining = surviving.filter(fire => {
    fire.remainingRounds--;
    if (fire.remainingRounds > 0) return true;
    events.push({ kind: 'burnout', actorId: fire.sourceId, damage: 0, x: fire.x, y: fire.y });
    if (!next.scorched!.some(t => sameTile(t, fire))) next.scorched!.push({ x: fire.x, y: fire.y });
    return false;
  });
  next = { ...next, fires: [...remaining, ...newFires], randomSeed: seed, turnEvents: [...(state.turnEvents ?? []), ...events], ...(events.length ? { lastEvent: events[events.length - 1] } : {}) };
  if (isBattleOver(next) !== 'ongoing') return next;
  let environment = env;
  if (roll() < .3) environment = { ...environment, ...randomWind(roll(), roll()) };
  if (state.round % 3 === 0 && roll() < .25) environment = { ...environment, weather: seasonalWeather(env.month, roll()) };
  return { ...next, environment, randomSeed: seed };
}

export function resolveEnemyTurn(state: CombatState, chooseAbility?: (state: CombatState, actor: CombatUnit) => CombatState): CombatState {
  const actor = currentActor(state);
  if (!actor || actor.team !== 'enemy') return state;
  const events: CombatEvent[] = [];
  let next: CombatState = { ...state, turn: 'enemy', selectedId: null };
  const id = actor.id;
  let enemy = next.units.find(u => u.id === id)!;
  const targets = next.units.filter(u => u.team === 'party' && u.hp > 0);
  let target = targets.filter(u => canAttack(next, enemy, u)).sort((a, b) => a.hp - b.hp)[0];
  const lethal = targets.filter(u => canAttack(next, enemy, u)).find(u => u.hp <= attackDamage(next, enemy, u));
  if (lethal) {
    next = performAttack(next, id, lethal.id);
    return advanceTurn({ ...next, turnEvents: [next.lastEvent!] });
  }
  if (fireAt(next, enemy) && !next.movedIds.includes(id)) {
    const escape = pathsFrom(next, enemy, movementRange(next, enemy), true).filter(t => t.cost > 0)
      .sort((a, b) => Number(!targets.some(t => canAttack(next, { ...enemy, ...a }, t))) - Number(!targets.some(t => canAttack(next, { ...enemy, ...b }, t))) || a.cost - b.cost)[0];
    if (escape) {
      next = moveUnit(next, id, escape.x, escape.y);
      enemy = next.units.find(u => u.id === id)!;
      target = targets.filter(u => canAttack(next, enemy, u)).sort((a, b) => a.hp - b.hp)[0];
    }
  }
  const tryAbility = () => {
    const troopAction = resolveTroopAI(next, enemy);
    if (troopAction !== next) { next = troopAction; if (next.lastEvent) events.push(next.lastEvent); return true; }
    if (!chooseAbility) return false;
    const chosen = chooseAbility(next, enemy);
    if (chosen === next) return false;
    next = chosen;
    events.push(...(next.turnEvents ?? (next.lastEvent ? [next.lastEvent] : [])));
    return next.actedIds.includes(id) || isBattleOver(next) !== 'ongoing';
  };
  const tryFire = () => {
    const choices = fireTargets(next, id).map(tile => {
      const occupant = next.units.find(u => u.hp > 0 && sameTile(u, tile));
      const friendlyRisk = next.units.filter(u => u.hp > 0 && u.team === 'enemy' && Math.max(Math.abs(u.x - tile.x), Math.abs(u.y - tile.y)) <= 1).length;
      // Occupied enemy fuel offers immediate pressure; don't burn oneself or clustered allies.
      const benefit = occupant?.team === 'party' ? burnDamage(occupant, 1) * fireChance(next, tile.x, tile.y) / 100 - (friendlyRisk > 1 ? friendlyRisk * 4 : 0) : 0;
      return { tile, benefit };
    }).filter(c => c.benefit > (target ? Math.max(1, attackPower(enemy) - target.defense) : 1)).sort((a, b) => b.benefit - a.benefit);
    if (!choices.length) return false;
    next = setFire(next, id, choices[0].tile.x, choices[0].tile.y);
    if (next.lastEvent) events.push(next.lastEvent);
    return true;
  };
  if (tryAbility() || tryFire()) return advanceTurn({ ...next, turnEvents: events });
  if (!target) {
    let paths = pathsFrom(next, enemy, Infinity, true);
    let goals = paths.flatMap(tile => targets.filter(u => canAttack(next, { ...enemy, x: tile.x, y: tile.y }, u)).map(u => ({ tile, target: u })));
    if (!goals.length) {
      paths = pathsFrom(next, enemy);
      goals = paths.flatMap(tile => targets.filter(u => canAttack(next, { ...enemy, x: tile.x, y: tile.y }, u)).map(u => ({ tile, target: u })));
    }
    goals.sort((a, b) => a.tile.cost - b.tile.cost || a.target.hp - b.target.hp);
    const goal = goals[0];
    if (goal) {
      let spent = 0;
      let destination: Tile | undefined;
      for (const tile of goal.tile.path) {
        spent += TERRAIN[terrainAt(next, tile.x, tile.y)].cost;
        if (spent > movementRange(next, enemy)) break;
        destination = tile;
      }
      if (destination) {
        const moved = moveUnit(next, id, destination.x, destination.y);
        if (moved.lastEvent !== next.lastEvent && moved.lastEvent?.kind === 'burn') events.push(moved.lastEvent);
        next = moved;
      }
      enemy = next.units.find(u => u.id === id)!;
      if (enemy.hp <= 0) return advanceTurn({ ...next, turnEvents: events });
      target = targets.filter(u => canAttack(next, enemy, u)).sort((a, b) => a.hp - b.hp)[0];
    }
  }
  if (tryAbility() || tryFire()) return advanceTurn({ ...next, turnEvents: events });
  if (target) {
    enemy = next.units.find(u => u.id === id)!;
    if (enemy.hp <= enemy.maxHp / 2) {
      const activated = activateUltimate(next, id);
      if (activated !== next) events.push(activated.lastEvent!);
      next = activated;
    }
    next = performAttack(next, id, target.id);
    events.push(next.lastEvent!);
  } else next = applyGuard(next, id);
  return advanceTurn({ ...next, turnEvents: events });
}
