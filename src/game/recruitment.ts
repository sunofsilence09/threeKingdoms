import { createProgress } from './growth';
import { advanceDays } from './history';
import { canMeetPerson, recruitProfile } from './recruitmentCatalog';
import { getRecruitmentThreshold } from './cityService';
import type { GameState, RouteId } from './state';
import { withWorldDate } from './worldTime';
import { isAliveAt } from './personLife';

export const AFFINITY_REQUIRED = 60;
export const MAX_DEPLOYED = 5;
export interface Relationship { affinity: number; lastInteraction?: number }
export function gameDayNumber(date: GameState['date']): number {
  return ((date.year - 184) * 12 + date.month - 1) * 30 + (date.day ?? 1) - 1;
}
export function initialRelationships(): Record<string, Relationship> {
  return { traveler: { affinity: 100 }, aman: { affinity: 60 }, 'chen-da': { affinity: 60 } };
}
export function canManageParty(state: GameState): boolean {
  return state.phase !== 'battle' && !state.journey?.event;
}
export function canInteractPerson(state: GameState, id: string): boolean {
  const profile = recruitProfile(id);
  return isAliveAt(state.life, id, state.date, true) && canManageParty(state) && !state.journey && id !== 'traveler' && !!profile && !profile.readOnly &&
    (Object.hasOwn(state.party, id) || canMeetPerson(id, state.currentCityId, state.date, state));
}
export function interactPerson(state: GameState, id: string, kind: 'talk' | 'meal' | 'help'): GameState {
  if (!canInteractPerson(state, id) || !['talk', 'meal', 'help'].includes(kind) || state.relationships[id]?.lastInteraction === gameDayNumber(state.date) || kind === 'meal' && state.supplies < 1) return state;
  const date = advanceDays(state.date, 1);
  if (gameDayNumber(date) === gameDayNumber(state.date)) return state;
  const affinity = Math.min(100, (state.relationships[id]?.affinity ?? 0) + { talk: 8, meal: 12, help: 10 }[kind]);
  const route = ({ 'cao-cao': 'cao', 'liu-bei': 'liu', 'sun-jian': 'sun', 'sun-ce': 'sun', 'sun-quan': 'sun' } as Record<string, RouteId>)[id];
  return withWorldDate({ ...state, supplies: state.supplies - (kind === 'meal' ? 1 : 0),
    relationships: { ...state.relationships, [id]: { affinity, lastInteraction: gameDayNumber(date) } },
    flags: route ? { ...state.flags, [`met:${route}`]: true } : state.flags,
    travelNotice: `与${recruitProfile(id)!.name}${kind === 'talk' ? '交谈' : kind === 'meal' ? '分享粮食' : '帮忙共事'}，亲密度 ${affinity}/100；停留1日。` }, date);
}
export function invitePerson(state: GameState, id: string): GameState {
  if (!canInteractPerson(state, id) || Object.hasOwn(state.party, id) || (state.relationships[id]?.affinity ?? 0) < getRecruitmentThreshold(state, id)) return state;
  const name = recruitProfile(id)!.name;
  const world = state.worldConflict;
  const worldConflict = world && Object.values(world.cities).some(city => city.governorId === id)
    ? { ...world, cities: Object.fromEntries(Object.entries(world.cities).map(([cityId, city]) => {
      if (city.governorId !== id) return [cityId, city];
      const { governorId: _formerGovernor, ...vacant } = city;
      return [cityId, vacant];
    })) } : world;
  const recruited={ ...state, ...(worldConflict ? { worldConflict } : {}), party: { ...state.party, [id]: createProgress() }, travelNotice: `${name}接受邀请，加入同行候补。可在队伍中安排上阵。` };
  return worldConflict?withWorldDate(recruited,state.date):recruited;
}
export function isDeployment(value: unknown, party: GameState['party']): value is string[] {
  return Array.isArray(value) && value.length >= 1 && value.length <= MAX_DEPLOYED && value[0] === 'traveler' &&
    new Set(value).size === value.length && value.every(id => typeof id === 'string' && Object.hasOwn(party, id) && !!recruitProfile(id) && !recruitProfile(id)!.readOnly);
}
export function setDeployment(state: GameState, ids: string[]): GameState {
  if (!canManageParty(state) || !isDeployment(ids, state.party) || !ids.every(id => isAliveAt(state.life,id,state.date,true)) || ids.join('|') === state.deployed.join('|')) return state;
  return { ...state, deployed: [...ids], travelNotice: `出战阵容已调整为 ${ids.length}/5 人。候补保留原有成长与装备。` };
}
export function isRelationships(value: unknown, date: GameState['date']): value is Record<string, Relationship> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.entries(value).every(([id, entry]) => {
    if (!recruitProfile(id) || !entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const r = entry as Relationship;
    return Number.isSafeInteger(r.affinity) && r.affinity >= 0 && r.affinity <= 100 &&
      (r.lastInteraction === undefined || Number.isSafeInteger(r.lastInteraction) && r.lastInteraction >= 0 && r.lastInteraction <= gameDayNumber(date));
  });
}
