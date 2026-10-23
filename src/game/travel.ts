import { attributeBonuses, victoryExperience } from './attributes';
import { grantExperience } from './growth';
import { advanceDays, type GameDate } from './history';
import type { GameState, RouteId } from './state';
import { cityAt, planRoute, WORLD_CITIES } from './world';

export type TravelEventKind = 'rain' | 'merchant' | 'refugees' | 'ferry' | 'bandits' | 'contact';
export interface TravelEvent { id: number; kind: TravelEventKind; contact?: RouteId; inBattle?: boolean }
export interface Journey { path: string[]; legIndex: number; legDay: number; elapsed: number; seed: number; serial: number; event?: TravelEvent }
export const ROAD_NAMES = { road: '陆路', water: '水路', mountain: '山道' };
export function journeyLeg(journey: Journey) {
  return planRoute(journey.path[journey.legIndex], journey.path[journey.legIndex + 1])!.legs[0];
}
export function remainingDays(journey: Journey): number {
  return journey.path.slice(journey.legIndex, -1).reduce((days, from, offset) => days + planRoute(from, journey.path[journey.legIndex + offset + 1])!.days, 0) - journey.legDay;
}
/** Encounters are fictional meetings within historically plausible campaign regions. */
export function cityContact(id: string, date: GameDate): RouteId | undefined {
  const y = date.year, m = date.month;
  if (y === 184) {
    if (id === 'zhuo') return 'liu';
    if (id === 'yingchuan' && m >= 5) return 'cao';
    if (id === 'nanyang' && m >= 6) return 'sun';
  }
  if (y >= 190 && y < 200) {
    if (id === 'chenliu' || y >= 191 && id === 'dongjun' || y >= 196 && id === 'xuxian') return 'cao';
    if (y >= 195 && (id === 'wujun' || id === 'danyang')) return 'sun';
    if (y >= 194 && y <= 196 && id === 'donghai') return 'liu';
  }
  if (y >= 187 && y < 190 && id === 'changsha') return 'sun';
  return undefined;
}

export function startTravel(state: GameState, destination: string, seed = Math.floor(Math.random() * 0x100000000)): GameState {
  if (state.journey || state.phase === 'battle' || destination === state.currentCityId) return state;
  const route = planRoute(state.currentCityId, destination);
  if (!route?.legs.length) return state;
  const serial = (state.travelCount ?? 0) + 1;
  return { ...state, phase: 'overworld', encounter: undefined, travelCount: serial, travelNotice: undefined,
    journey: { path: route.path, legIndex: 0, legDay: 0, elapsed: 0, seed: seed >>> 0, serial } };
}

function nextSeed(seed: number): number { return (Math.imul(seed, 1664525) + 1013904223) >>> 0; }
export function advanceTravel(state: GameState): GameState {
  if (!state.journey || state.journey.event || state.phase === 'battle') return state;
  let journey: Journey = { ...state.journey };
  let date = state.date;
  for (let day = 0; day < 3; day++) {
    const leg = journeyLeg(journey);
    date = advanceDays(date, 1);
    journey = { ...journey, legDay: journey.legDay + 1, elapsed: journey.elapsed + 1, seed: nextSeed(journey.seed) };
    if (journey.legDay >= leg.days) {
      if (journey.legIndex === journey.path.length - 2) {
        const destination = journey.path.at(-1)!;
        return { ...state, date, journey: undefined, currentCityId: destination, travelNotice: `抵达${cityAt(destination).name}，此行赶路${journey.elapsed}日。沿途耽搁已计入日期。` };
      }
      journey = { ...journey, legIndex: journey.legIndex + 1, legDay: 0 };
    }
    if (journey.seed / 0x100000000 < .16) {
      journey.seed = nextSeed(journey.seed);
      const currentLeg = journeyLeg(journey);
      const contact = cityContact(currentLeg.to, date) ?? cityContact(currentLeg.from, date);
      const pool: TravelEventKind[] = ['merchant', 'refugees', 'bandits', currentLeg.kind === 'water' ? 'ferry' : 'rain'];
      if (contact && !state.flags[`met:${contact}`]) pool.push('contact');
      const kind = pool[journey.seed % pool.length];
      journey.event = { id: journey.elapsed, kind, ...(kind === 'contact' ? { contact } : {}) };
      break;
    }
  }
  return { ...state, date, journey, travelNotice: undefined };
}

export function resolveTravelEvent(state: GameState, choice: 'safe' | 'pay' | 'fight' | 'meet' | 'skip'): GameState {
  const journey = state.journey, event = journey?.event;
  if (!journey || !event || event.inBattle) return state;
  if (choice === 'fight') {
    if (event.kind !== 'bandits') return state;
    return { ...state, phase: 'battle', encounter: 'ambush', journey: { ...journey, event: { ...event, inBattle: true } } };
  }
  let days = 0, supplies = state.supplies, morale = state.morale, flags = state.flags;
  if (choice === 'skip') {
    if (!['merchant', 'refugees', 'contact'].includes(event.kind)) return state;
  } else if (choice === 'meet') {
    if (event.kind !== 'contact' || !event.contact) return state;
    flags = { ...flags, [`met:${event.contact}`]: true };
    days = 1;
  } else if (choice === 'pay') {
    if (!['rain', 'refugees', 'ferry'].includes(event.kind) || supplies < 1) return state;
    supplies--;
    if (event.kind === 'refugees') morale += 2;
  } else if (choice === 'safe') {
    if (event.kind === 'rain' || event.kind === 'ferry') days = 2;
    if (event.kind === 'bandits') { days = 3; morale = Math.max(0, morale - 1); }
    if (event.kind === 'refugees') { days = 3; morale++; }
    if (event.kind === 'merchant') { days = 1; supplies++; }
  } else return state;
  return { ...state, date: advanceDays(state.date, days), supplies, morale, flags, journey: { ...journey, event: undefined }, travelNotice: days ? `处理途中见闻，停留${days}日，继续原路。` : '途中见闻已处理，继续原路。' };
}

export function finishTravelBattle(state: GameState, won: boolean): GameState {
  if (!state.journey?.event?.inBattle) return state;
  const party = { ...state.party };
  const fighters = state.battleParty ?? state.deployed;
  if (won) for (const id of fighters) party[id] = grantExperience(party[id], victoryExperience(30, party[id].attributes));
  const bonus = won ? fighters.reduce((sum, id) => sum + attributeBonuses(party[id].attributes).supplies, 0) : 0;
  return { ...state, phase: 'overworld', encounter: undefined, battleParty: undefined, party,
    date: advanceDays(state.date, won ? 1 : 3), supplies: state.supplies + bonus, morale: Math.max(0, state.morale + (won ? 1 : -1)),
    journey: { ...state.journey, event: undefined }, travelNotice: won ? '匪患已退，队伍获得经验；整备1日后继续原行程。' : '绕开匪患，耽搁3日；队伍仍在原路段，可继续行旅。' };
}

export function restInCity(state: GameState, days: number): GameState {
  if (state.journey || state.phase === 'battle' || ![1, 30, 360].includes(days)) return state;
  return { ...state, date: advanceDays(state.date, days), supplies: state.supplies + (days === 1 ? 1 : 3), travelNotice: `在${cityAt(state.currentCityId).name}${days === 1 ? '帮工休整1日' : `安居${days === 30 ? '一月' : '一年'}`}，军需有所补充。` };
}

export function isJourney(value: unknown, currentCityId: string, phase: string): value is Journey {
  if (!value || typeof value !== 'object') return false;
  const j = value as Journey;
  const integer = (n: number) => Number.isSafeInteger(n) && n >= 0;
  if (!Array.isArray(j.path) || j.path.length < 2 || j.path.length > WORLD_CITIES.length || j.path[0] !== currentCityId || new Set(j.path).size !== j.path.length || !j.path.every(id => WORLD_CITIES.some(c => c.id === id)) || !integer(j.legIndex) || j.legIndex >= j.path.length - 1 || !integer(j.legDay) || !integer(j.elapsed) || !integer(j.seed) || j.seed > 0xffffffff || !integer(j.serial) || j.serial < 1) return false;
  let elapsed = j.legDay;
  for (let i = 0; i < j.path.length - 1; i++) {
    const leg = planRoute(j.path[i], j.path[i + 1]);
    if (!leg || leg.path.length !== 2 || i === j.legIndex && j.legDay >= leg.days) return false;
    if (i < j.legIndex) elapsed += leg.days;
  }
  if (elapsed !== j.elapsed) return false;
  if (j.event !== undefined) {
    const e = j.event;
    if (!e || !integer(e.id) || e.id !== j.elapsed || !['rain', 'merchant', 'refugees', 'ferry', 'bandits', 'contact'].includes(e.kind) || e.inBattle !== undefined && typeof e.inBattle !== 'boolean' || e.contact !== undefined && !['cao', 'sun', 'liu'].includes(e.contact)) return false;
    if (e.kind === 'contact' && !e.contact || e.inBattle && (e.kind !== 'bandits' || phase !== 'battle')) return false;
  }
  return phase !== 'battle' || j.event?.inBattle === true;
}
