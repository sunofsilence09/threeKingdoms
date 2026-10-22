import { attributeBonuses } from './attributes';
import type { RouteId } from './state';
import { createPartyProgress, type PartyId, type PartyProgress } from './growth';
import { createTerrain, TERRAIN, type BattleMode, type TerrainKind, type TerrainTile } from './battlefield';

export type CombatTeam = 'party' | 'enemy';
export type UltimateId = 'survival' | 'desperation';
export const ULTIMATES: Record<UltimateId, { name: string; description: string }> = {
  survival: { name: '绝处逢生', description: '半血及以下可用，回复最大体力30%，下次攻击+50%。每场一次。' },
  desperation: { name: '拼命', description: '消耗最大体力20%（不致倒地），下次攻击+50%。每场一次。' },
};
export interface CombatEvent { kind: 'attack' | 'dodge' | 'ultimate'; actorId: string; targetId?: string; damage: number }

export type WeaponId = 'fists' | 'cleaver' | 'knife' | 'spear' | 'bow';
export const WEAPONS: Record<WeaponId, { name: string; mark: string; hp: number; attack: number; move: number; min: number; max: number }> = {
  fists: { name: '拳脚', mark: '拳', hp: 9, attack: 2, move: 3, min: 1, max: 1 },
  cleaver: { name: '菜刀', mark: '刀', hp: 10, attack: 3, move: 3, min: 1, max: 1 },
  knife: { name: '短刀', mark: '刃', hp: 11, attack: 4, move: 3, min: 1, max: 1 },
  spear: { name: '木枪', mark: '枪', hp: 10, attack: 3, move: 3, min: 1, max: 2 },
  bow: { name: '猎弓', mark: '弓', hp: 9, attack: 3, move: 3, min: 2, max: 3 },
};
export interface CombatUnit {
  id: string; name: string; team: CombatTeam; x: number; y: number;
  hp: number; maxHp: number; attack: number; guarded: boolean;
  weapon: WeaponId; level: number; xp: number; defense: number; dodgeRate: number;
  ultimate: UltimateId; ultimateUsed: boolean; empowered: boolean;
}
export interface CombatState {
  width: number; height: number; terrain: TerrainTile[]; units: CombatUnit[];
  selectedId: string | null; turn: CombatTeam; route: RouteId | null;
  round: number; movedIds: string[]; actedIds: string[]; randomSeed: number; lastEvent?: CombatEvent; turnEvents?: CombatEvent[];
}
export type BattleResult = 'ongoing' | 'win' | 'loss';
interface Tile { x: number; y: number }
interface PathTile extends Tile { cost: number; path: Tile[] }

export function createCombatState(route: RouteId | null, party: PartyProgress = createPartyProgress(), mode: BattleMode = route ? 'route' : 'ambush'): CombatState {
  const makeAlly = (id: PartyId, name: string, x: number, y: number, weapon: WeaponId): CombatUnit => {
    const { level, xp, attributes } = party[id];
    const bonus = attributeBonuses(attributes);
    const maxHp = WEAPONS[weapon].hp + (level - 1) * 2 + bonus.hp + (route === 'liu' ? 1 : 0);
    return { id, name, team: 'party', x, y, hp: maxHp, maxHp, weapon, level, xp,
      attack: WEAPONS[weapon].attack + Math.floor((level - 1) / 2) + bonus.attack + (route === 'cao' && id === 'traveler' ? 1 : 0), guarded: false, defense: bonus.defense, dodgeRate: bonus.dodge,
      ultimate: id === 'traveler' ? 'survival' : 'desperation', ultimateUsed: false, empowered: false };
  };
  const makeEnemy = (id: string, name: string, x: number, y: number, weapon: WeaponId, hp: number, attack: number): CombatUnit =>
    ({ id, name, team: 'enemy', x, y, hp, maxHp: hp, attack, weapon, level: mode === 'route' ? 2 : 1, xp: 0, guarded: false, defense: 0, dodgeRate: 0, ultimate: 'desperation', ultimateUsed: false, empowered: false });
  const advanced = mode === 'route';
  return {
    width: 16, height: 10, terrain: createTerrain(mode), selectedId: null, turn: 'party', route, round: 1, movedIds: [], actedIds: [], randomSeed: (0x6d2b79f5 ^ (mode === 'ambush' ? 17 : 53) ^ (route?.charCodeAt(0) ?? 0)) >>> 0,
    units: [
      makeAlly('traveler', '姜垣', advanced ? 4 : 3, 4, advanced ? 'knife' : 'cleaver'),
      makeAlly('aman', '阿满', 3, 5, advanced ? 'spear' : 'fists'),
      makeAlly('chen-da', '陈达', advanced ? 4 : 2, 6, advanced ? 'bow' : 'fists'),
      makeEnemy('bandit-leader', '山贼头目', 7, 4, advanced ? 'spear' : 'cleaver', advanced ? 9 : 7, 3),
      makeEnemy('bandit-scout-a', '拦路山贼', advanced ? 8 : 7, 6, 'cleaver', advanced ? 7 : 4, 2),
      makeEnemy('bandit-scout-b', advanced ? '山贼弓手' : '山贼喽啰', advanced ? 11 : 9, advanced ? 4 : 5, advanced ? 'bow' : 'fists', advanced ? 6 : 4, 2),
    ],
  };
}

export function terrainAt(state: CombatState, x: number, y: number): TerrainKind {
  return state.terrain.find(tile => tile.x === x && tile.y === y)?.kind ?? 'road';
}
export function movementRange(state: CombatState, unit: CombatUnit): number {
  return (unit.team === 'enemy' ? 2 : WEAPONS[unit.weapon].move) + (unit.team === 'party' && state.route === 'sun' ? 1 : 0);
}
export function distance(a: Tile, b: Tile): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
export function isBattleOver(state: CombatState): BattleResult {
  if (!state.units.some(u => u.team === 'party' && u.hp > 0)) return 'loss';
  if (!state.units.some(u => u.team === 'enemy' && u.hp > 0)) return 'win';
  return 'ongoing';
}
function canAct(state: CombatState, unit: CombatUnit): boolean {
  return unit.hp > 0 && unit.team === state.turn && !state.actedIds.includes(unit.id) && isBattleOver(state) === 'ongoing';
}
function updateUnit(state: CombatState, id: string, updater: (u: CombatUnit) => CombatUnit): CombatState {
  return { ...state, units: state.units.map(u => u.id === id ? updater(u) : u) };
}
function markActed(state: CombatState, id: string): CombatState {
  return { ...state, selectedId: null, actedIds: [...state.actedIds, id] };
}
export function applyGuard(state: CombatState, unitId: string): CombatState {
  const unit = state.units.find(u => u.id === unitId);
  if (!unit || !canAct(state, unit)) return state;
  return markActed(updateUnit(state, unitId, u => ({ ...u, guarded: true })), unitId);
}
function neighbors(tile: Tile): Tile[] {
  return [{ x: tile.x + 1, y: tile.y }, { x: tile.x - 1, y: tile.y }, { x: tile.x, y: tile.y + 1 }, { x: tile.x, y: tile.y - 1 }];
}
function isOpenTile(state: CombatState, x: number, y: number): boolean {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < state.width && y < state.height &&
    Number.isFinite(TERRAIN[terrainAt(state, x, y)].cost) && !state.units.some(u => u.hp > 0 && u.x === x && u.y === y);
}
// Dijkstra preserves the cheapest route when woods cost more than roads.
function pathsFrom(state: CombatState, unit: CombatUnit, limit = Infinity): PathTile[] {
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
      const cost = current.cost + TERRAIN[terrainAt(state, tile.x, tile.y)].cost;
      const key = `${tile.x},${tile.y}`;
      if (cost > limit || cost >= (costs.get(key) ?? Infinity)) continue;
      costs.set(key, cost);
      queue.push({ ...tile, cost, path: [...current.path, tile] });
    }
  }
  return result;
}
export function reachableTiles(state: CombatState, unitId: string): Tile[] {
  const unit = state.units.find(u => u.id === unitId);
  if (!unit || !canAct(state, unit) || state.movedIds.includes(unitId)) return [];
  return pathsFrom(state, unit, movementRange(state, unit)).filter(t => t.cost > 0).map(({ x, y }) => ({ x, y }));
}
export function moveUnit(state: CombatState, unitId: string, x: number, y: number): CombatState {
  if (!reachableTiles(state, unitId).some(t => t.x === x && t.y === y)) return state;
  const next = updateUnit(state, unitId, u => ({ ...u, x, y, guarded: false }));
  return { ...next, movedIds: [...next.movedIds, unitId] };
}
// Supercover ray: at an exact grid corner, both adjoining cells must be clear.
function clearSight(state: CombatState, from: Tile, to: Tile): boolean {
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
  const range = WEAPONS[attacker.weapon];
  const gap = distance(attacker, target);
  return attacker.hp > 0 && target.hp > 0 && attacker.team !== target.team && gap >= range.min && gap <= range.max && clearSight(state, attacker, target);
}
export function attackPower(unit: CombatUnit): number { return unit.attack * (unit.empowered ? 1.5 : 1); }
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
  return { ...updateUnit(state, id, u => ({ ...u, hp, empowered: true, ultimateUsed: true })), lastEvent: { kind: 'ultimate', actorId: id, damage: 0 } };
}
function nextRandom(seed: number): { seed: number; roll: number } {
  let next = seed || 1;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  next >>>= 0;
  return { seed: next, roll: next / 0x100000000 };
}
export function performAttack(state: CombatState, attackerId: string, targetId: string): CombatState {
  const attacker = state.units.find(u => u.id === attackerId);
  const target = state.units.find(u => u.id === targetId);
  if (!attacker || !target || !canAct(state, attacker) || !canAttack(state, attacker, target)) return state;
  const random = nextRandom(state.randomSeed);
  const dodged = random.roll < Math.max(0, Math.min(0.4, target.dodgeRate));
  const power = Math.max(1, attackPower(attacker) - target.defense);
  const guarded = state.route === 'liu' && target.team === 'party' ? Math.floor(power / 2) : Math.ceil(power / 2);
  const cover = attacker.weapon === 'bow' && terrainAt(state, target.x, target.y) === 'woods' ? 1 : 0;
  const damage = dodged ? 0 : Math.max(1, Math.ceil((target.guarded ? guarded : power) - cover));
  const next = dodged ? state : updateUnit(state, targetId, u => ({ ...u, hp: Math.max(0, u.hp - damage), guarded: false }));
  const acted = markActed(updateUnit(next, attackerId, u => ({ ...u, guarded: false, empowered: false })), attackerId);
  return { ...acted, randomSeed: random.seed, lastEvent: { kind: dodged ? 'dodge' : 'attack', actorId: attackerId, targetId, damage } };
}
export function resolveEnemyTurn(state: CombatState): CombatState {
  if (state.turn !== 'party' || isBattleOver(state) !== 'ongoing') return state;
  const events: CombatEvent[] = [];
  let next: CombatState = { ...state, turn: 'enemy', selectedId: null, units: state.units.map(u => ({ ...u, empowered: false })) };
  for (const id of state.units.filter(u => u.team === 'enemy' && u.hp > 0).map(u => u.id)) {
    if (isBattleOver(next) !== 'ongoing') break;
    let enemy = next.units.find(u => u.id === id)!;
    const targets = next.units.filter(u => u.team === 'party' && u.hp > 0);
    let target = targets.filter(u => canAttack(next, enemy, u)).sort((a, b) => a.hp - b.hp)[0];
    if (!target) {
      const paths = pathsFrom(next, enemy);
      const goals = paths.flatMap(tile => targets.filter(u => canAttack(next, { ...enemy, x: tile.x, y: tile.y }, u)).map(u => ({ tile, target: u })));
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
        if (destination) next = moveUnit(next, id, destination.x, destination.y);
        enemy = next.units.find(u => u.id === id)!;
        target = targets.filter(u => canAttack(next, enemy, u)).sort((a, b) => a.hp - b.hp)[0];
      }
    }
    if (target) {
      enemy = next.units.find(u => u.id === id)!;
      if (enemy.hp <= enemy.maxHp / 2) {
        const activated = activateUltimate(next, id);
        if (activated !== next) events.push(activated.lastEvent!);
        next = activated;
      }
      next = performAttack(next, id, target.id);
      events.push(next.lastEvent!);
    }
  }
  return { ...next, turn: 'party', round: state.round + 1, actedIds: [], movedIds: [], turnEvents: events, units: next.units.map(u => ({ ...u, empowered: false })) };
}
