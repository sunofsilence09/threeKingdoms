import type { GameState } from './state';
import type { GameDate } from './history';
import { advanceWorldConflict, conflictDay, createWorldConflict } from './worldConflict';
import { createLifeState, reconcileLives,ensureLifePeople } from './personLife';

/** The only bridge between RPG time and the strategic clock; rendering never calls it. */
export function withWorldDate(state: GameState, date: GameDate): GameState {
  const targetDay = conflictDay(date);
  if (targetDay < conflictDay(state.date)) return state;
  let next = state.life ? state : { ...state, life: createLifeState(state.date) };
  const boundaries: GameDate[] = [];
  for(let year=state.date.year+1;year<=date.year;year++) boundaries.push({year,month:1,day:1});
  if(!boundaries.length || conflictDay(boundaries[boundaries.length-1])!==targetDay) boundaries.push(date);
  for(const at of boundaries) {
    const partyIds=Object.keys(next.party);
    const living=reconcileLives(next,at);
    const world=next.conflictRecovery ? undefined : next.worldConflict ?? createWorldConflict(next.date,partyIds,undefined,next.life);
    const worldConflict=world ? advanceWorldConflict(world,at,partyIds,living.life) : undefined;
    const life=ensureLifePeople(living.life!,worldConflict?.prefectIds??[]);
    if(living!==next || life!==living.life || worldConflict!==next.worldConflict || conflictDay(next.date)!==conflictDay(at)) next={...living,life,date:at,worldConflict};
  }
  return next;
}
