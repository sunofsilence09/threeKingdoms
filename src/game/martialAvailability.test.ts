import { describe, expect, it } from 'vitest';
import { createCombatState, type CombatState } from './combat';
import { createInitialState } from './state';
import { initializeMartialCombat, martialAvailability } from './martialCombat';
import { checkpointBattle, isBattleSnapshot } from './battleSave';

function battle(): CombatState {
  const state = createInitialState(() => 0);
  state.martial.learned = ['martial-guan-yu', 'martial-cao-ren'];
  state.martial.equipped = [...state.martial.learned];
  return initializeMartialCombat(createCombatState(null, state.party, 'ambush', ['traveler', 'aman']), state);
}
describe('equipped martial command availability', () => {
  it('explains that equipped hero skills wait for the hero action during a faster ally turn', () => {
    expect(martialAvailability(battle(), 'traveler', 'martial-cao-ren')).toMatchObject({ selectable: false, reason: '等待主角行动', targets: [] });
  });
  it('allows selecting an out of range art to inspect its targeting instructions without spending the action', () => {
    const combat = { ...battle(), actedIds: ['aman', 'bandit-scout-a'] };
    expect(martialAvailability(combat, 'traveler', 'martial-guan-yu')).toMatchObject({ selectable: true, reason: '无合法目标', targets: [] });
    expect(martialAvailability(combat, 'traveler', 'martial-cao-ren')).toMatchObject({ selectable: true, reason: '可施展', targets: [{ x: 3, y: 4 }] });
  });
  it('keeps cooldown and already acted reasons distinct', () => {
    const combat = { ...battle(), actedIds: ['aman', 'bandit-scout-a'], units: battle().units.map(u => u.id === 'traveler' ? { ...u, martialReady: { 'martial-cao-ren': 4 } } : u) };
    expect(martialAvailability(combat, 'traveler', 'martial-cao-ren')).toMatchObject({ selectable: false, reason: '冷却3轮' });
    expect(martialAvailability({ ...combat, actedIds: [...combat.actedIds, 'traveler'] }, 'traveler', 'martial-cao-ren')).toMatchObject({ selectable: false, reason: '冷却3轮 · 本轮已行动' });
  });
  it('blocks a noncurrent enemy action and unavailable animal weapons', () => {
    const combat = { ...battle(), units: battle().units.map(u => u.id === 'traveler' ? { ...u, speed: 100, team: 'enemy' as const } : u) };
    expect(martialAvailability(combat, 'traveler', 'martial-cao-ren')).toMatchObject({ selectable: false, reason: '敌方行动中' });
    const claws = { ...combat, units: combat.units.map(u => u.id === 'traveler' ? { ...u, team: 'party' as const, weapon: 'claws' as const } : u) };
    expect(martialAvailability(claws, 'traveler', 'martial-cao-ren')).toMatchObject({ selectable: false, reason: '当前武器无法施展' });
  });
  it('restores legacy omitted ability lists from equipment and rejects a stale mismatched list', () => {
    const initial = createInitialState(() => 0);
    const state = { ...initial, phase: 'battle' as const, encounter: 'ambush' as const, battleParty: ['traveler', 'aman'],
      martial: { ...initial.martial, learned: ['martial-cao-ren'], equipped: ['martial-cao-ren'] } };
    const legacy = createCombatState(null, state.party, 'ambush', state.battleParty);
    const snapshot = checkpointBattle(legacy, state);
    expect(snapshot.units[0].martialIds).toEqual(state.martial.equipped);
    expect(isBattleSnapshot(snapshot, state)).toBe(true);
    expect(isBattleSnapshot({ ...snapshot, units: snapshot.units.map(unit => unit.id === 'traveler' ? { ...unit, martialIds: [] } : unit) }, state)).toBe(false);
    expect(state.martial.equipped).toEqual(['martial-cao-ren']);
    expect(legacy.units[0].martialIds).toBeUndefined();
  });
});
