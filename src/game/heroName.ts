import type { GameState } from './state';
import { recruitProfile } from './recruitmentCatalog';
import { cityAt, cityNameAt } from './world';

export function validHeroName(value: unknown): string | null {
  if (typeof value !== 'string' || /\p{C}/u.test(value)) return null;
  const name = value.trim();
  const length = [...name].length;
  return length >= 2 && length <= 8 && /^[\p{L}\p{N}·・]+$/u.test(name) && /[\p{L}\p{N}]/u.test(name) ? name : null;
}

export function heroName(state: Pick<GameState, 'heroName'>): string {
  return validHeroName(state.heroName) ?? '旅人';
}

export function personName(id: string, state: Pick<GameState, 'heroName'> & Partial<Pick<GameState,'date'>>): string {
  const personId = id.replace(/^enemy:/, '');
  if(personId.startsWith('garrison:')) {
    const [,cityId,role]=personId.split(':');
    if(recruitProfile(personId))return `${cityNameAt(cityId,state.date)}·${role==='captain'?'士兵长':'普通士兵'}`;
  }
  return personId === 'traveler' ? heroName(state) : recruitProfile(personId)?.name ?? id;
}

/** Apply only at text rendering boundaries; catalog identity and artwork stay stable. */
export function displayText(text: string, state: Pick<GameState, 'heroName'> & Partial<Pick<GameState,'date'>>, personId?:string): string {
  const display=text.replaceAll('姜垣', heroName(state));
  if(personId?.startsWith('garrison:')&&recruitProfile(personId)){
    const cityId=personId.split(':')[1];return display.replaceAll(cityAt(cityId).name,cityNameAt(cityId,state.date));
  }
  return display;
}
