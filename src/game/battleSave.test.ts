import { describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState, STORAGE_KEY } from './state';
import { createCombatState } from './combat';
import { checkpointBattle, isBattleSnapshot, battleEncounterKey } from './battleSave';
import { startDuel } from './martial';
import { createDuelCombat } from './martialCombat';
import { createProgress } from './growth';

describe('persistent battle snapshots', () => {
  function fixture() {
    const state = { ...createInitialState(() => 0), phase: 'battle' as const, encounter: 'ambush' as const, battleParty: ['traveler', 'aman', 'chen-da'] };
    return { state, combat: createCombatState(null, state.party, 'ambush', state.battleParty) };
  }
  it('round trips a complete checkpoint with its encounter identity', () => {
    const { state, combat } = fixture();
    const snapshot = checkpointBattle(combat, state);
    expect(isBattleSnapshot(JSON.parse(JSON.stringify(snapshot)), state)).toBe(true);
    expect(snapshot.encounterKey).toBe(battleEncounterKey(state));
  });
  it('recovers an ongoing checkpoint with no remaining actor while retaining terminal snapshots', () => {
    const { state, combat } = fixture();
    const snapshot = checkpointBattle(combat, state);
    const exhausted = { ...snapshot, selectedId: null, actedIds: snapshot.units.map(unit => unit.id) };
    expect(isBattleSnapshot(exhausted, state)).toBe(false);
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    } });
    saveState({ ...state, activeBattle: exhausted });
    const restored = loadState()!;
    expect(restored.activeBattle).toBeUndefined();
    expect(restored.battleRecovery).toBe(true);
    expect(restored.party).toEqual(state.party);
    expect(restored.economy).toEqual(state.economy);
    expect(data.has(`${STORAGE_KEY}:active-battle-backup`)).toBe(true);
    const terminal = { ...exhausted, units: exhausted.units.map(unit => unit.team === 'enemy' ? { ...unit, hp: 0 } : unit) };
    expect(isBattleSnapshot(terminal, state)).toBe(true);
  });
  it('rejects forged coordinates, duplicate units, health, rounds and foreign deployment', () => {
    const { state, combat } = fixture();
    const snapshot = checkpointBattle(combat, state);
    for (const changed of [
      { ...snapshot, units: snapshot.units.map((u, i) => i ? u : { ...u, x: -1 }) },
      { ...snapshot, units: [...snapshot.units, snapshot.units[0]] },
      { ...snapshot, units: snapshot.units.map((u, i) => i ? u : { ...u, hp: u.maxHp + 1 }) },
      { ...snapshot, round: 0 },
      { ...snapshot, fires: [{ x: 99, y: 0, level: 99, remaining: -1, sourceId: 'fake' }] },
      { ...snapshot, units: snapshot.units.map((u, i) => i ? u : { ...u, martialIds: ['unknown-secret'] }) },
    ]) expect(isBattleSnapshot(changed, state)).toBe(false);
    expect(isBattleSnapshot(snapshot, { ...state, battleParty: ['traveler'] })).toBe(false);
  });
  it('rejects fire on water and a substituted duel opponent', () => {
    const { state, combat } = fixture();
    const snapshot = checkpointBattle({ ...combat, terrain: [{ x: 1, y: 1, kind: 'water' }],
      fires: [{ x: 1, y: 1, level: 1, remainingRounds: 2, sourceId: 'traveler' }] }, state);
    expect(isBattleSnapshot(snapshot, state)).toBe(false);
  });
  it('does not reuse a checkpoint for a different encounter or nonbattle phase', () => {
    const { state, combat } = fixture();
    const snapshot = checkpointBattle(combat, state);
    expect(isBattleSnapshot(snapshot, { ...state, encounter: 'route' })).toBe(false);
    expect(isBattleSnapshot(snapshot, { ...state, phase: 'overworld' })).toBe(false);
  });
  it('requires the original terrain, real opponents and complete native ability fields', () => {
    const { state, combat } = fixture();
    const snapshot = checkpointBattle(combat, state);
    const noEnvironment = { ...snapshot }; delete noEnvironment.environment;
    const noAbilities = { ...snapshot, units: snapshot.units.map(u => { const copy = { ...u }; delete copy.martialIds; return copy; }) };
    const longCooldown = { ...snapshot, units: snapshot.units.map((u, i) => i ? u : { ...u, martialIds: ['martial-zhou-yu'], martialReady: { 'martial-zhou-yu': 100003 } }) };
    const withEquipped = { ...state, martial: { ...state.martial, learned: ['martial-zhou-yu'], equipped: ['martial-zhou-yu'] } };
    for (const changed of [
      { ...snapshot, terrain: [] }, noEnvironment, noAbilities,
      { ...snapshot, units: snapshot.units.map((u, i) => i ? u : { ...u, x: 5, y: 4 }) },
      { ...snapshot, units: snapshot.units.map(u => u.team === 'enemy' ? { ...u, id: `unknown-${u.id}` } : u) },
    ]) expect(isBattleSnapshot(changed, state)).toBe(false);
    expect(isBattleSnapshot(longCooldown, withEquipped)).toBe(false);
    const duelState = startDuel({ ...state, phase: 'overworld', battleParty: undefined, party: { ...state.party, 'guan-yu': createProgress() } }, 'guan-yu');
    const duel = checkpointBattle(createDuelCombat(combat, duelState), duelState);
    expect(isBattleSnapshot(duel, duelState)).toBe(true);
    expect(isBattleSnapshot({ ...duel, units: duel.units.map(u => u.team === 'enemy' ? { ...u, martialIds: [] } : u) }, duelState)).toBe(false);
    expect(isBattleSnapshot({ ...duel, units: duel.units.map(u => u.team === 'enemy' ? { ...u, id: 'enemy:zhou-yu' } : u) }, duelState)).toBe(false);
  });
});
