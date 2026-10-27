import type { GameState } from './state';
import type { CombatState } from './combat';
import { playerMilitaryStatus } from './playerMilitary';
import { attachTroops, isTroopKind, type TroopAssignment, type TroopKind } from './troopCombat';

export function assignedCount(state: GameState): number { return Object.values(state.troopAssignments ?? {}).reduce((n,t)=>n+t.count,0); }
export function validAssignments(value: unknown, state: GameState): value is Record<string, TroopAssignment> {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.entries(value).every(([id,t]) =>
    Object.hasOwn(state.party,id) && !!t && typeof t === 'object' && Object.keys(t).length === 2 && isTroopKind(t.kind) && Number.isSafeInteger(t.count) && t.count >= 0 && t.count <= 1000);
}
export function assignTroops(state: GameState, id: string, kind: TroopKind, count: number): GameState {
  if (!Object.hasOwn(state.party,id) || !isTroopKind(kind) || !Number.isSafeInteger(count) || count < 0 || count > 1000 || !playerMilitaryStatus(state).canOperate) return state;
  const old = state.troopAssignments?.[id]?.count ?? 0, reserve = state.worldConflict!.playerReserve ?? 0, delta = count - old;
  if (delta > reserve || reserve - delta > 20000) return state;
  return { ...state, troopAssignments: { ...state.troopAssignments, [id]: {kind,count} }, worldConflict: { ...state.worldConflict!,
    nextDecision: { ...state.worldConflict!.nextDecision, ...(state.worldConflict!.playerReserve === undefined ? {player:state.worldConflict!.lastDay+1} : {}) },
    playerReserve: reserve - delta, playerAssigned: (state.worldConflict!.playerAssigned ?? 0) + delta } };
}
export function initializeTroopCombat(combat: CombatState, state: GameState): CombatState {
  if (state.duel) return combat;
  const total = combat.units.filter(u=>u.team==='party').reduce((n,u)=>n+(state.troopAssignments?.[u.id]?.count??0),0);
  const enemyCount = Math.min(1000,Math.ceil(total / Math.max(1,combat.units.filter(u=>u.team==='party').length)));
  return { ...combat, units: combat.units.map(u=>{
    const assignment = state.troopAssignments?.[u.id];
    if (u.team === 'party') return assignment ? attachTroops(u,assignment.kind,assignment.count) : u;
    return u.weapon !== 'claws' && enemyCount ? attachTroops(u,u.weapon==='bow'?'crossbow':'spear',enemyCount) : u;
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
