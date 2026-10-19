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
  return updateUnit(state, unitId, (unit) => ({ ...unit, guarded: true }));
}

export function moveUnit(state: CombatState, unitId: string, x: number, y: number): CombatState {
  const unit = state.units.find((candidate) => candidate.id === unitId);
  if (!unit || !isOpenTile(state, x, y) || !canReach(unit, x, y)) {
    return state;
  }

  return updateUnit(state, unitId, (current) => ({ ...current, x, y, guarded: false }));
}

export function performAttack(state: CombatState, attackerId: string, targetId: string): CombatState {
  const attacker = state.units.find((unit) => unit.id === attackerId);
  const target = state.units.find((unit) => unit.id === targetId);

  if (!attacker || !target || attacker.hp <= 0 || target.hp <= 0) {
    return state;
  }

  if (attacker.team === target.team || distance(attacker, target) > 1) {
    return state;
  }

  const damage = target.guarded ? Math.max(1, Math.ceil(attacker.attack / 2)) : attacker.attack;
  return updateUnit(state, targetId, (current) => ({
    ...current,
    hp: Math.max(0, current.hp - damage),
    guarded: false,
  }));
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

function canReach(unit: CombatUnit, x: number, y: number): boolean {
  return distance(unit, { x, y }) <= 2;
}

function isOpenTile(state: CombatState, x: number, y: number): boolean {
  return (
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
