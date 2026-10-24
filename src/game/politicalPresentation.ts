import type { GameDate } from './history';
import type { GameState, RouteId } from './state';
import { leaderForFaction } from './worldConflictData';
import { personName } from './heroName';

type PoliticalContext=Pick<GameState,'date'|'life'|'heroName'|'party'>;
export const routeInstitutionName=(route:RouteId):string=>({cao:'曹氏军府',liu:'刘氏军府',sun:'孙氏军府'}[route]);
export function routePrincipalId(route:RouteId,state:PoliticalContext,date:GameDate=state.date):string|undefined {
  const id=leaderForFaction(route,date,state.life);
  return id&&!Object.hasOwn(state.party,id)?id:undefined;
}
/** Political succession is distinct from an army commander or a historical background name. */
export function routePrincipalName(route:RouteId,state:PoliticalContext,date:GameDate=state.date):string {
  const id=routePrincipalId(route,state,date);return id?personName(id,state):routeInstitutionName(route);
}
