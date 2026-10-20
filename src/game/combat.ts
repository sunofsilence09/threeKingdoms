import type { RouteId } from './state';

export type CombatTeam = 'party' | 'enemy';

export interface CombatUnit {
  id: string;
  name: string;
  team: CombatTeam;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  guarded: boolean;
}

export interface CombatState {
  width: number;
  height: number;
  units: CombatUnit[];
  selectedId: string | null;
  turn: CombatTeam;
  route: RouteId | null;
  round: number;
  movedIds: string[];
  actedIds: string[];
}

export type BattleResult = 'ongoing' | 'win' | 'loss';

export function createCombatState(route: RouteId | null): CombatState {
  const routeAttackBonus = route === 'cao' ? 1 : 0;
  const routeMoraleBonus = route === 'liu' ? 1 : 0;

  return {
    width: 6,
    height: 4,
    selectedId: null,
    turn: 'party',
    route,
    round: 1,
    movedIds: [],
    actedIds: [],
    units: [
      {
        id: 'traveler',
        name: '旅人',
        team: 'party',
        x: 0,
        y: 2,
        hp: 10 + routeMoraleBonus,
        maxHp: 10 + routeMoraleBonus,
        attack: 3 + routeAttackBonus,
        guarded: false,
      },
      {
        id: 'aman',
        name: '阿满',
        team: 'party',
        x: 1,
        y: 2,
        hp: 8 + routeMoraleBonus,
        maxHp: 8 + routeMoraleBonus,
        attack: 2,
        guarded: false,
      },
      {
        id: 'chen-da',
        name: '陈达',
        team: 'party',
        x: 0,
        y: 3,
        hp: 7 + routeMoraleBonus,
        maxHp: 7 + routeMoraleBonus,
        attack: 2,
        guarded: false,
      },
      {
        id: 'bandit-leader',
        name: '山贼头目',
        team: 'enemy',
        x: 5,
        y: 1,
        hp: 8,
        maxHp: 8,
        attack: 3,
        guarded: false,
      },
      {
        id: 'bandit-scout-a',
        name: '山贼斥候',
        team: 'enemy',
        x: 4,
        y: 2,
        hp: 5,
        maxHp: 5,
        attack: 3,
        guarded: false,
      },
      {
        id: 'bandit-scout-b',
        name: '山贼斥候',
        team: 'enemy',
        x: 4,
        y: 3,
        hp: 5,
        maxHp: 5,
        attack: 3,
        guarded: false,
      },
    ],
  };
}

export function applyGuard(state: CombatState, unitId: string): CombatState {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (!unit || !canAct(state, unit)) return state;
  return markActed(updateUnit(state, unitId, (current) => ({ ...current, guarded: true })), unit);
}

export function moveUnit(state: CombatState, unitId: string, x: number, y: number): CombatState {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (!unit || !reachableTiles(state, unitId).some((tile) => tile.x === x && tile.y === y)) {
    return state;
  }

  const next = updateUnit(state, unitId, (current) => ({ ...current, x, y, guarded: false }));
  return { ...next, movedIds: [...next.movedIds, unitId] };
}

export function performAttack(state: CombatState, attackerId: string, targetId: string): CombatState {
  const attacker = state.units.find((unit) => unit.id === attackerId);
  const target = state.units.find((unit) => unit.id === targetId);

  if (!attacker || !target || !canAct(state, attacker) || target.hp <= 0) {
    return state;
  }

  if (attacker.team === target.team || distance(attacker, target) > 1) {
    return state;
  }

  const guardedDamage = state.route === 'liu' && target.team === 'party'
    ? Math.floor(attacker.attack / 2) : Math.ceil(attacker.attack / 2);
  const damage = target.guarded ? Math.max(1, guardedDamage) : attacker.attack;
  const next = updateUnit(state, targetId, (current) => ({
    ...current,
    hp: Math.max(0, current.hp - damage),
    guarded: false,
  }));
  return markActed(updateUnit(next, attackerId, (current) => ({ ...current, guarded: false })), attacker);
}

export function isBattleOver(state: CombatState): BattleResult {
  const partyAlive = state.units.some((unit) => unit.team === 'party' && unit.hp > 0);
  const enemyAlive = state.units.some((unit) => unit.team === 'enemy' && unit.hp > 0);

  if (!partyAlive) return 'loss';
  if (!enemyAlive) return 'win';
  return 'ongoing';
}

export function distance(a: Pick<CombatUnit, 'x' | 'y'>, b: Pick<CombatUnit, 'x' | 'y'>): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function canAct(state: CombatState, unit: CombatUnit): boolean {
  return unit.hp > 0 && unit.team === state.turn &&
    !state.actedIds.includes(unit.id) && isBattleOver(state) === 'ongoing';
}

function markActed(state: CombatState, unit: CombatUnit): CombatState {
  return { ...state, selectedId: null, actedIds: [...state.actedIds, unit.id] };
}

export function reachableTiles(state: CombatState, unitId: string): Array<{ x: number; y: number }> {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (!unit || !canAct(state, unit) || state.movedIds.includes(unitId)) return [];
  const range = unit.team === 'party' && state.route === 'sun' ? 3 : 2;
  const visited = new Set([`${unit.x},${unit.y}`]);
  const queue = [{ x: unit.x, y: unit.y, steps: 0 }];
  const tiles: Array<{ x: number; y: number }> = [];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (current.steps >= range) continue;
    for (const tile of neighbors(current)) {
      const key = `${tile.x},${tile.y}`;
      if (visited.has(key) || !isOpenTile(state, tile.x, tile.y)) continue;
      visited.add(key);
      tiles.push(tile);
      queue.push({ ...tile, steps: current.steps + 1 });
    }
  }
  return tiles;
}

export function resolveEnemyTurn(state: CombatState): CombatState {
  if (state.turn !== 'party' || isBattleOver(state) !== 'ongoing') return state;
  let next: CombatState = { ...state, turn: 'enemy', selectedId: null };
  for (const enemy of state.units.filter((unit) => unit.team === 'enemy' && unit.hp > 0)) {
    if (isBattleOver(next) !== 'ongoing') break;
    const target = next.units.filter((unit) => unit.team === 'party' && unit.hp > 0)
      .sort((a, b) => distance(enemy, a) - distance(enemy, b))[0];
    if (distance(enemy, target) <= 1) {
      next = performAttack(next, enemy.id, target.id);
    } else {
      const step = enemyStep(next, enemy, target);
      if (step) next = moveUnit(next, enemy.id, step.x, step.y);
    }
  }
  return { ...next, turn: 'party', round: state.round + 1, actedIds: [], movedIds: [] };
}

function neighbors(tile: { x: number; y: number }): Array<{ x: number; y: number }> {
  return [
    { x: tile.x + 1, y: tile.y }, { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 }, { x: tile.x, y: tile.y - 1 },
  ];
}

function enemyStep(state: CombatState, enemy: CombatUnit, target: CombatUnit): { x: number; y: number } | null {
  const queue = [{ x: enemy.x, y: enemy.y, first: null as { x: number; y: number } | null }];
  const visited = new Set([`${enemy.x},${enemy.y}`]);
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    if (distance(current, target) === 1) return current.first;
    for (const tile of neighbors(current)) {
      const key = `${tile.x},${tile.y}`;
      if (visited.has(key) || !isOpenTile(state, tile.x, tile.y)) continue;
      visited.add(key);
      queue.push({ ...tile, first: current.first ?? tile });
    }
  }
  return null;
}

function isOpenTile(state: CombatState, x: number, y: number): boolean {
  return (
    Number.isInteger(x) && Number.isInteger(y) &&
    x >= 0 &&
    x < state.width &&
    y >= 0 &&
    y < state.height &&
    !state.units.some((unit) => unit.hp > 0 && unit.x === x && unit.y === y)
  );
}

function updateUnit(
  state: CombatState,
  unitId: string,
  updater: (unit: CombatUnit) => CombatUnit,
): CombatState {
  return {
    ...state,
    units: state.units.map((unit) => (unit.id === unitId ? updater(unit) : unit)),
  };
}
