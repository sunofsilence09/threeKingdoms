import type { GameState } from './state';
import type { GameDate } from './history';
import { advanceWorldConflict, conflictDay, createWorldConflict } from './worldConflict';

/** The only bridge between RPG time and the strategic clock; rendering never calls it. */
export function withWorldDate(state: GameState, date: GameDate): GameState {
  const targetDay = conflictDay(date);
  if (targetDay < conflictDay(state.date)) return state;
  if (state.conflictRecovery) return targetDay === conflictDay(state.date) ? state : { ...state, date };
  if (state.worldConflict?.lastDay === targetDay && targetDay === conflictDay(state.date)) return state;
  const world = state.worldConflict ?? createWorldConflict(state.date, Object.keys(state.party));
  const next = advanceWorldConflict(world, date, Object.keys(state.party));
  if (state.worldConflict === next && targetDay === conflictDay(state.date)) return state;
  return { ...state, date, worldConflict: next };
}
