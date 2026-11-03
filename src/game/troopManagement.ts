import { createAttributes } from './attributes';
import type { GameState } from './state';
import type { CombatState } from './combat';
import { combatAttributeVersion, effectiveAttributes } from './characterTalents';
import { playerMilitaryStatus } from './playerMilitary';
import { attachTroops, isTroopKind, type TroopAssignment, type TroopKind } from './troopCombat';
import { armyMoraleForParty, cityMoraleFor } from './cityEconomy';

/** Current percentage-scale leadership; never mutates existing over-cap assignments. */
export function commandTroopLimit(state: GameState, id: string): number {
  if (!Object.hasOwn(state.party,id)) return 0;
  const progress = state.party[id];
  if (!progress) return 0;
  return Math.max(0, Math.min(10000, Math.floor(effectiveAttributes(id, progress.attributes, 3, progress.bondBonus).command) * 100));
}

export function assignedCount(state: GameState): number { return Object.values(state.troopAssignments ?? {}).reduce((n,t)=>n+t.count,0); }
export function validAssignments(value: unknown, state: GameState): value is Record<string, TroopAssignment> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([id,t]) =>
    Object.hasOwn(state.party,id) && !!t && typeof t === 'object' && Object.keys(t).length === 2 && isTroopKind(t.kind) && Number.isSafeInteger(t.count) && t.count >= 0 && t.count <= 10000) &&
    Object.values(value as Record<string,TroopAssignment>).reduce((total,t)=>total+t.count,0) + (state.worldConflict?.playerReserve ?? 0) <= 20000;
}
export function assignTroops(state: GameState, id: string, kind: TroopKind, count: number): GameState {
  if (!Object.hasOwn(state.party,id) || !isTroopKind(kind) || !Number.isSafeInteger(count) || count < 0 || count > 10000 || !playerMilitaryStatus(state).canOperate) return state;
  const old = state.troopAssignments?.[id]?.count ?? 0, reserve = state.worldConflict!.playerReserve ?? 0, delta = count - old;
  if ((delta > 0 && count > commandTroopLimit(state,id)) || delta > reserve || reserve - delta < 0 || reserve + assignedCount(state) > 20000) return state;
  return { ...state, troopAssignments: { ...state.troopAssignments, [id]: {kind,count} }, worldConflict: { ...state.worldConflict!,
    nextDecision: { ...state.worldConflict!.nextDecision, ...(state.worldConflict!.playerReserve === undefined ? {player:state.worldConflict!.lastDay+1} : {}) },
    playerReserve: reserve - delta, playerAssigned: (state.worldConflict!.playerAssigned ?? 0) + delta } };
}
export function initializeTroopCombat(combat: CombatState, state: GameState): CombatState {
  if (state.duel) return combat;
  const total = combat.units.filter(u=>u.team==='party').reduce((n,u)=>n+(state.troopAssignments?.[u.id]?.count??0),0);
  const enemyCount = Math.min(10000,Math.ceil(total / Math.max(1,combat.units.filter(u=>u.team==='party').length)));
  return { ...combat, troopRuleVersion: 3, units: combat.units.map(original=>{
    const cityId = /^enemy:garrison:([a-z-]+):/.exec(original.id)?.[1];
    const u = { ...original, moraleRuleVersion: 2 as const, morale: original.team === 'party' ? armyMoraleForParty(state) : cityId ? cityMoraleFor(state,cityId) : original.morale ?? 80 };
    const assignment = state.troopAssignments?.[u.id];
    const progress = state.party[u.id];
    if (u.team === 'party') return assignment && progress ? attachTroops(u,assignment.kind,assignment.count,
      effectiveAttributes(u.id, progress.attributes, combatAttributeVersion(combat), progress.bondBonus), combatAttributeVersion(combat)) : u;
    return u.weapon !== 'claws' && enemyCount ? attachTroops(u,u.weapon==='bow'?'crossbow':'spear',enemyCount,effectiveAttributes(u.id,createAttributes(),combatAttributeVersion(combat)),combatAttributeVersion(combat)) : u;
  }) };
}
/** Counts only decrease, making repeated settlement safe across results and retreats. */
export function settleTroops(state: GameState, combat: CombatState): GameState {
  if (state.duel || !state.worldConflict || !state.troopAssignments) return state;
  const assignments = { ...state.troopAssignments }; let losses = 0;
  for (const unit of combat.units) {
    const old = assignments[unit.id];
    if (unit.team !== 'party' || !old || !unit.troop) continue;
    const count = Math.min(old.count,unit.troop.count);
    losses += old.count - count; assignments[unit.id] = { ...old,count };
  }
  if (!losses) return state;
  return { ...state,troopAssignments:assignments,worldConflict:{ ...state.worldConflict,
    playerAssigned: Math.max(0,(state.worldConflict.playerAssigned??0)-losses), ledger:{ ...state.worldConflict.ledger, losses:state.worldConflict.ledger.losses+losses } } };
}
/** Troops of departed companions return to reserves instead of disappearing. */
export function reconcileTroops(state: GameState): GameState {
  if (!state.troopAssignments || !state.worldConflict) return state;
  const assignments = { ...state.troopAssignments }; let returned = 0;
  for (const [id,t] of Object.entries(assignments)) if (!Object.hasOwn(state.party,id)) { returned += t.count; delete assignments[id]; }
  if (!returned && Object.keys(assignments).length === Object.keys(state.troopAssignments).length) return state;
  return { ...state,troopAssignments:assignments,worldConflict:{ ...state.worldConflict, playerReserve:(state.worldConflict.playerReserve??0)+returned,
    playerAssigned:Math.max(0,(state.worldConflict.playerAssigned??0)-returned) } };
}
