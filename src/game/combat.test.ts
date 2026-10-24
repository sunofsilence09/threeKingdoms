import { describe, expect, it } from 'vitest';
import {
  advanceTurn, applyGuard, canAttack, createCombatState, isBattleOver, moveUnit,
  reachableTiles, resolveEnemyTurn, performAttack, movementRange, terrainAt, WEAPONS, makePartyUnit, actionOrder, type CombatState,
} from './combat';
import { createPartyProgress, createProgress } from './growth';
import { getCharacterAppearance, getUnitAppearance, getUnitModel } from './characters';
import { RECRUIT_PROFILES } from './recruitmentCatalog';

describe('deployed recruitment combat', () => {
  const deployed = ['traveler', 'aman', 'chen-da', 'lu-bu', 'cai-yan'];
  const roster = () => ({ ...createPartyProgress(), 'lu-bu': createProgress(2), 'cai-yan': createProgress(), 'guan-yu': createProgress(4), 'bandit-leader': createProgress() });

  it('creates the actual five deployed members and leaves the reserve out', () => {
    const state = createCombatState(null, roster(), 'ambush', deployed);
    expect(state.units.filter(u => u.team === 'party').map(u => u.id)).toEqual(deployed);
    expect(state.units.some(u => u.id === 'guan-yu')).toBe(false);
    expect(state.units.find(u => u.id === 'lu-bu')).toMatchObject({ name: '吕布', speed: 20, weapon: 'halberd', level: 2 });
    expect(state.units.find(u => u.id === 'cai-yan')).toMatchObject({ name: '蔡琰', speed: 10, weapon: 'scroll' });
  });

  it.each(['ambush', 'route'] as const)('scales %s enemies and preserves legal unique reachable spawns for one through five allies', mode => {
    for (let count = 1; count <= 5; count++) {
      const state = createCombatState('sun', roster(), mode, deployed.slice(0, count));
      expect(state.units.filter(u => u.team === 'party')).toHaveLength(count);
      expect(state.units.filter(u => u.team === 'enemy')).toHaveLength(Math.max(3, count));
      expect(new Set(state.units.map(u => u.id)).size).toBe(state.units.length);
      expect(new Set(state.units.map(u => `${u.x},${u.y}`)).size).toBe(state.units.length);
      for (const u of state.units) {
        expect(u.x >= 0 && u.x < state.width && u.y >= 0 && u.y < state.height).toBe(true);
        expect(['water', 'rock', 'cart', 'wall']).not.toContain(terrainAt(state, u.x, u.y));
      }
      const reached = new Set([`${state.units[0].x},${state.units[0].y}`]);
      const queue = [{ x: state.units[0].x, y: state.units[0].y }];
      for (let i = 0; i < queue.length; i++) {
        for (const [x, y] of [[queue[i].x + 1, queue[i].y], [queue[i].x - 1, queue[i].y], [queue[i].x, queue[i].y + 1], [queue[i].x, queue[i].y - 1]]) {
          if (x < 0 || x >= state.width || y < 0 || y >= state.height || reached.has(`${x},${y}`) || ['water', 'rock', 'cart', 'wall'].includes(terrainAt(state, x, y))) continue;
          reached.add(`${x},${y}`);
          queue.push({ x, y });
        }
      }
      for (const u of state.units) expect(reached.has(`${u.x},${u.y}`)).toBe(true);
      const win = { ...state, units: state.units.map(u => ({ ...u, hp: u.team === 'enemy' ? 0 : u.hp })) };
      const loss = { ...state, units: state.units.map(u => ({ ...u, hp: u.team === 'party' ? 0 : u.hp })) };
      expect(isBattleOver(win)).toBe('win');
      expect(isBattleOver(loss)).toBe('loss');
    }
  });

  it('gives the enemy an instance ID when its recruited identity is deployed', () => {
    const state = createCombatState(null, roster(), 'ambush', ['traveler', 'bandit-leader']);
    expect(state.units.find(u => u.id === 'bandit-leader')?.team).toBe('party');
    expect(state.units.find(u => u.id === 'enemy:bandit-leader')?.team).toBe('enemy');
    expect(new Set(state.units.map(u => u.id)).size).toBe(state.units.length);
    expect(getUnitAppearance(state.units.find(u => u.id === 'enemy:bandit-leader')!)).toEqual(getCharacterAppearance('bandit-leader'));
  });

  it('supports long weapons and literary abilities with their own combat ranges', () => {
    expect(WEAPONS).toMatchObject({ halberd: { min: 1, max: 2 }, scroll: { min: 1, max: 3 }, fan: { min: 1, max: 2 } });
    const state = createCombatState(null, roster(), 'ambush', ['traveler', 'cai-yan']);
    const scholar = state.units.find(u => u.id === 'cai-yan')!;
    const enemy = state.units.find(u => u.team === 'enemy')!;
    expect(canAttack({ ...state, terrain: [] }, { ...scholar, x: 1, y: 1 }, { ...enemy, x: 4, y: 1 })).toBe(true);
  });

  it('previews every catalog member with the same earned stats used in battle', () => {
    expect(RECRUIT_PROFILES.length).toBe(198);
    for (const profile of RECRUIT_PROFILES.filter(profile => !profile.readOnly)) {
      const progress = createProgress(3, 5);
      const preview = makePartyUnit(profile.id, progress, 'liu', 'route');
      const party = { ...createPartyProgress(), [profile.id]: progress };
      const deployed = profile.id === 'traveler' ? ['traveler'] : ['traveler', profile.id];
      const actual = createCombatState('liu', party, 'route', deployed).units.find(u => u.id === profile.id)!;
      expect({ ...actual, x: 0, y: 0 }).toEqual(preview);
      expect(getUnitModel(actual).weapon).toBe(actual.weapon);
      expect(getUnitAppearance(actual).portrait).toBeTruthy();
      expect(WEAPONS[actual.weapon]).toBeDefined();
      expect(preview.attack).toBeLessThanOrEqual(5);
      expect(preview.speed).toBe(profile.speed);
    }
    const state = createCombatState(null, roster(), 'ambush', deployed);
    expect(actionOrder(state)[0].id).toBe('lu-bu');
  });

  it('rejects unknown, duplicate, unowned, empty and excessive deployments', () => {
    for (const ids of [[], ['traveler', 'traveler'], ['traveler', 'unknown'], ['traveler', 'sun-ce'], [...deployed, 'guan-yu']]) {
      expect(() => createCombatState(null, roster(), 'ambush', ids)).toThrow();
    }
    expect(() => makePartyUnit('unknown', createProgress(), null, 'ambush')).toThrow();
  });
});

function arena(): CombatState {
  const state = createCombatState(null);
  return {
    ...state, width: 8, height: 6, terrain: [],
    units: [
      { ...state.units[0], x: 1, y: 2, speed: 20, attack: 3, hp: 10, maxHp: 10, weapon: 'cleaver' },
      { ...state.units[1], x: 1, y: 3, speed: 15, attack: 2, hp: 9, maxHp: 9, weapon: 'fists' },
      { ...state.units[3], x: 4, y: 2, speed: 10, attack: 3, hp: 7, maxHp: 7, weapon: 'knife' },
    ],
  };
}

const find = (state: CombatState, id: string) => state.units.find(u => u.id === id)!;

describe('refugee tactical combat', () => {
  it('starts a three-person refugee party with improvised weapons on a larger battlefield', () => {
    const combat = createCombatState(null);
    expect([combat.width, combat.height]).toEqual([16, 10]);
    expect(combat.units.filter(u => u.team === 'party').map(u => u.weapon)).toEqual(['cleaver', 'fists', 'fists']);
    expect(combat.units[0]).toMatchObject({ name: '姜垣', level: 1, xp: 0 });
    expect(combat.terrain.length).toBeGreaterThan(10);
  });

  it('equips route companions later and applies earned level bonuses to actual attributes', () => {
    const party = createPartyProgress();
    party.traveler = { ...party.traveler, level: 3, xp: 25, points: 6 };
    const initial = createCombatState(null);
    const cao = createCombatState('cao', party, 'route');
    expect(cao.units.slice(0, 3).map(u => u.weapon)).toEqual(['knife', 'spear', 'bow']);
    const unlevelled = createCombatState('cao', createPartyProgress(), 'route');
    expect(cao.units[0].attack).toBe(unlevelled.units[0].attack + 1);
    expect(cao.units[0].maxHp).toBe(unlevelled.units[0].maxHp + 4);
    expect(initial.units[0].weapon).toBe('cleaver');
    const ambush = createCombatState('cao', party, 'ambush');
    expect(ambush.units[0].weapon).toBe('cleaver');
  });

  it('allows movement then one attack and prevents subsequent movement or attack', () => {
    const initial = arena();
    const moved = moveUnit(initial, 'traveler', 3, 2);
    expect(find(moved, 'traveler').x).toBe(3);
    const attacked = performAttack(moved, 'traveler', 'bandit-leader');
    expect(find(attacked, 'bandit-leader').hp).toBe(4);
    expect(performAttack(attacked, 'traveler', 'bandit-leader')).toBe(attacked);
    expect(moveUnit(attacked, 'traveler', 2, 2)).toBe(attacked);
    expect(find(initial, 'traveler').x).toBe(1);
  });

  it('does not let dead units act or accept fractional/out of bounds destinations', () => {
    const state = arena();
    state.units[0].hp = 0;
    expect(moveUnit(state, 'traveler', 2, 2)).toBe(state);
    expect(applyGuard(state, 'traveler')).toBe(state);
    expect(moveUnit(state, 'aman', 1.5, 2)).toBe(state);
    expect(moveUnit(state, 'aman', -1, 3)).toBe(state);
  });

  it('cannot enter obstacles, water or occupied corridors', () => {
    const state = arena();
    state.terrain = [{ x: 2, y: 2, kind: 'rock' }, { x: 1, y: 1, kind: 'water' }];
    expect(moveUnit(state, 'traveler', 2, 2)).toBe(state);
    expect(moveUnit(state, 'traveler', 1, 1)).toBe(state);
    state.width = 8;
    state.height = 1;
    state.terrain = [];
    state.units = state.units.map((u, x) => ({ ...u, x, y: 0 }));
    expect(reachableTiles(state, 'traveler')).toEqual([]);
  });

  it('finds paths around obstacles and charges extra movement for entering woods', () => {
    const state = arena();
    state.units = state.units.filter(u => u.id !== 'aman');
    state.terrain = [{ x: 2, y: 2, kind: 'wall' }];
    expect(reachableTiles(state, 'traveler')).not.toContainEqual({ x: 3, y: 2 });
    expect(reachableTiles(state, 'traveler')).toContainEqual({ x: 2, y: 1 });
    state.terrain = [{ x: 2, y: 2, kind: 'woods' }, { x: 3, y: 2, kind: 'woods' }];
    expect(reachableTiles(state, 'traveler')).toContainEqual({ x: 2, y: 2 });
    expect(reachableTiles(state, 'traveler')).not.toContainEqual({ x: 3, y: 2 });
    state.terrain = [{ x: 2, y: 2, kind: 'bridge' }];
    expect(reachableTiles(state, 'traveler')).toContainEqual({ x: 3, y: 2 });
  });

  it('preserves Sun movement and Liu guard bonuses', () => {
    const state = arena();
    expect(movementRange({ ...state, route: 'sun' }, state.units[0])).toBe(movementRange(state, state.units[0]) + 1);
    state.route = 'liu';
    state.units[2] = { ...state.units[2], x: 2, y: 2 };
    const guarded = applyGuard(state, 'traveler');
    const after = performAttack(advanceTurn(applyGuard(guarded, 'aman')), 'bandit-leader', 'traveler');
    expect(find(after, 'traveler').hp).toBe(9);
  });

  it('respects minimum/maximum range and solid line-of-sight, including corner blocks', () => {
    const state = arena();
    state.units[0].weapon = 'bow';
    expect(canAttack(state, state.units[0], state.units[2])).toBe(true);
    state.terrain = [{ x: 2, y: 2, kind: 'cart' }];
    expect(performAttack(state, 'traveler', 'bandit-leader')).toBe(state);
    state.terrain = [{ x: 2, y: 2, kind: 'water' }];
    expect(canAttack(state, state.units[0], state.units[2])).toBe(true);
    state.units[2].x = 2;
    expect(canAttack(state, state.units[0], state.units[2])).toBe(false);
    state.units[2] = { ...state.units[2], x: 5 };
    expect(canAttack(state, state.units[0], state.units[2])).toBe(false);
    state.units[2] = { ...state.units[2], x: 2, y: 3 };
    state.terrain = [{ x: 2, y: 2, kind: 'rock' }];
    expect(canAttack(state, state.units[0], state.units[2])).toBe(false);
  });

  it('reduces ranged damage in woods without reducing melee damage', () => {
    const state = arena();
    state.units[0].weapon = 'bow';
    state.terrain = [{ x: 4, y: 2, kind: 'woods' }];
    expect(find(performAttack(state, 'traveler', 'bandit-leader'), 'bandit-leader').hp).toBe(5);
    state.units[0] = { ...state.units[0], x: 3, weapon: 'cleaver' };
    expect(find(performAttack(state, 'traveler', 'bandit-leader'), 'bandit-leader').hp).toBe(4);
  });

  it('lets enemies use full movement and attack, then resets actions for the next round', () => {
    const state = arena();
    const next = resolveEnemyTurn(advanceTurn(applyGuard(applyGuard(state, 'traveler'), 'aman')));
    expect(find(next, 'bandit-leader').x).toBe(2);
    expect(find(next, 'traveler').hp).toBe(8);
    expect(next.round).toBe(2);
    expect(next.turn).toBe('party');
    expect(next.actedIds).toEqual([]);
    expect(next.movedIds).toEqual([]);
    expect(find(state, 'bandit-leader').x).toBe(4);
  });

  it('does not deadlock when the closest target is inaccessible', () => {
    const state = arena();
    state.units[0] = { ...state.units[0], x: 6, y: 0 };
    state.units[1] = { ...state.units[1], x: 1, y: 3 };
    state.units[2] = { ...state.units[2], x: 4, y: 0 };
    state.terrain = [{ x: 5, y: 0, kind: 'rock' }, { x: 6, y: 1, kind: 'rock' }, { x: 7, y: 0, kind: 'rock' }];
    state.units[2].speed = 30;
    const next = resolveEnemyTurn(advanceTurn(state));
    const moved = find(next, 'bandit-leader');
    expect(Math.abs(moved.x - 1) + Math.abs(moved.y - 3)).toBeLessThan(6);
  });

  it.each(['ambush', 'route'] as const)('keeps %s spawns legal and connected around terrain', mode => {
    const state = createCombatState(mode === 'route' ? 'sun' : null, createPartyProgress(), mode);
    const walkable = (x: number, y: number) => !['rock', 'cart', 'wall', 'water'].includes(terrainAt(state, x, y));
    const positions = state.units.map(u => `${u.x},${u.y}`);
    expect(new Set(positions).size).toBe(positions.length);
    for (const u of state.units) {
      expect(u.x >= 0 && u.x < 16 && u.y >= 0 && u.y < 10 && walkable(u.x, u.y)).toBe(true);
    }
    const seen = new Set([positions[0]]);
    const queue = [state.units[0]];
    for (let i = 0; i < queue.length; i++) {
      for (const [x, y] of [[queue[i].x + 1, queue[i].y], [queue[i].x - 1, queue[i].y], [queue[i].x, queue[i].y + 1], [queue[i].x, queue[i].y - 1]]) {
        if (x < 0 || x >= 16 || y < 0 || y >= 10 || !walkable(x, y) || seen.has(`${x},${y}`)) continue;
        seen.add(`${x},${y}`);
        queue.push({ ...state.units[0], x, y });
      }
    }
    for (const key of positions) expect(seen.has(key)).toBe(true);
  });

  it('recognizes wins and losses and disallows actions after the battle', () => {
    const state = arena();
    state.units[2].hp = 0;
    expect(isBattleOver(state)).toBe('win');
    expect(moveUnit(state, 'traveler', 2, 2)).toBe(state);
    state.units[2].hp = 7;
    state.units[0].hp = state.units[1].hp = 0;
    expect(isBattleOver(state)).toBe('loss');
  });
});
