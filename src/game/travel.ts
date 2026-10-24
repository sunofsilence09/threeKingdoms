import { attributeBonuses, victoryExperience } from './attributes';
import { grantExperience } from './growth';
import { advanceDays, type GameDate } from './history';
import { applyMarketNews, GOODS, isMarketNews, type MarketNews } from './economy';
import { gameDayNumber } from './recruitment';
import type { GameState, RouteId } from './state';
import { withWorldDate } from './worldTime';
import { cityAt, directRoadLeg, planRoute, WORLD_CITIES } from './world';
import { canMeetPerson } from './recruitmentCatalog';
import { cityNameAt } from './cityNames';
import { leaderForFaction } from './worldConflictData';
import { isAliveAt } from './personLife';

export type TravelEventKind = 'rain' | 'merchant' | 'refugees' | 'ferry' | 'bandits' | 'contact' | 'market-news' | 'wolves';
export interface TravelEvent { id: number; kind: TravelEventKind; contact?: RouteId; inBattle?: boolean; cgSeen?: boolean; news?: MarketNews }
export interface Journey { path: string[]; legIndex: number; legDay: number; elapsed: number; seed: number; serial: number; event?: TravelEvent }
export const ROAD_NAMES = { road: '陆路', water: '水路', mountain: '山道' };
export function journeyLeg(journey: Journey) {
  return directRoadLeg(journey.path[journey.legIndex], journey.path[journey.legIndex + 1])!;
}
export function remainingDays(journey: Journey): number {
  return journey.path.slice(journey.legIndex, -1).reduce((days, from, offset) => days + directRoadLeg(from, journey.path[journey.legIndex + offset + 1])!.days, 0) - journey.legDay;
}
/** Encounters are fictional meetings within historically plausible campaign regions. */
export function cityContact(id: string, date: GameDate, state?: GameState): RouteId | undefined {
  if(state&&(state.life||state.worldConflict&&!state.conflictRecovery)) {
    const leaders=(['cao','liu','sun'] as RouteId[]).map(route=>[route,leaderForFaction(route,date,state.life)] as const);
    return leaders.find(([,personId])=>!!personId&&!Object.hasOwn(state.party,personId)&&canMeetPerson(personId,id,date,state))?.[0];
  }
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
function createTravelNews(journey: Journey, date: GameDate): MarketNews {
  // Derive every detail from the saved event seed, without consuming another travel day.
  const citySeed = nextSeed(journey.seed), goodSeed = nextSeed(citySeed), changeSeed = nextSeed(goodSeed);
  const cityId = citySeed / 0x100000000 < .75 ? journey.path.at(-1)! : WORLD_CITIES[(citySeed >>> 16) % WORLD_CITIES.length].id;
  // High bits avoid correlating news details with the event pool's modulo selection.
  const good = GOODS[(goodSeed >>> 16) % GOODS.length];
  const change = changeSeed / 0x100000000 < .5 ? .2 : -.2;
  const fromDay = gameDayNumber(date);
  return { id: `travel:${journey.serial}:${journey.elapsed}:${journey.seed}`, cityId, goodId: good.id, change,
    fromDay, untilDay: fromDay + 30,
    reason: `${cityNameAt(cityId,date)}${change > 0 ? `商户急需${good.name}，收购价随之上涨。` : `新货抵市，${good.name}供应充足，价格回落。`}` };
}
export function advanceTravel(state: GameState, days = 3): GameState {
  if (!Number.isInteger(days) || days < 1 || days > 30 || !state.journey || state.journey.event || state.phase === 'battle') return state;
  let journey: Journey = { ...state.journey };
  let date = state.date;
  let economy = state.economy, actualDays = 0;
  let simulation=state;
  for (let day = 0; day < days; day++) {
    const leg = journeyLeg(journey);
    const nextDate = advanceDays(date, 1);
    if (gameDayNumber(nextDate) === gameDayNumber(date)) break;
    date = nextDate;
    simulation=withWorldDate(simulation,date);
    actualDays++;
    journey = { ...journey, legDay: journey.legDay + 1, elapsed: journey.elapsed + 1, seed: nextSeed(journey.seed) };
    if (journey.legDay >= leg.days) {
      if (journey.legIndex === journey.path.length - 2) {
        const destination = journey.path.at(-1)!;
        return withWorldDate({ ...simulation, economy, travelDays: days, journey: undefined, currentCityId: destination, travelNotice: `本次赶路${actualDays}日；抵达${cityNameAt(destination,date)}，此行赶路${journey.elapsed}日。沿途耽搁已计入日期。` }, date);
      }
      journey = { ...journey, legIndex: journey.legIndex + 1, legDay: 0 };
    }
    if (journey.seed / 0x100000000 < .20) {
      journey.seed = nextSeed(journey.seed);
      const currentLeg = journeyLeg(journey);
      const contact = cityContact(currentLeg.to, date, simulation) ?? cityContact(currentLeg.from, date, simulation);
      const pool: TravelEventKind[] = ['merchant', 'refugees', 'bandits', leg.kind === 'water' ? 'ferry' : 'rain', 'market-news'];
      if (leg.kind !== 'water') pool.push('wolves');
      if (contact && !state.flags[`met:${contact}`]) pool.push('contact');
      const kind = pool[journey.seed % pool.length];
      const news = kind === 'market-news' ? createTravelNews(journey, date) : undefined;
      journey.event = { id: journey.elapsed, kind, cgSeen: false, ...(kind === 'contact' ? { contact } : {}), ...(news ? { news } : {}) };
      if (news) economy = applyMarketNews(economy, news);
      break;
    }
  }
  return withWorldDate({ ...simulation, economy, journey, travelDays: days,
    travelNotice: `本次赶路${actualDays}日。${journey.event ? '途中遇到见闻，处理后可继续行程。' : actualDays < days ? '已达游戏日期上限，行程暂停。' : '可继续赶路。'}` }, date);
}

export function acknowledgeTravelCg(state: GameState): GameState {
  const journey = state.journey, event = journey?.event;
  if (!journey || !event || event.cgSeen === true || event.inBattle || state.phase === 'battle') return state;
  return { ...state, journey: { ...journey, event: { ...event, cgSeen: true } } };
}

export function resolveTravelEvent(state: GameState, choice: 'safe' | 'pay' | 'fight' | 'meet' | 'skip'): GameState {
  const journey = state.journey, event = journey?.event;
  if (!journey || !event || event.inBattle || event.cgSeen !== true) return state;
  if (choice === 'fight') {
    if (event.kind !== 'bandits' && event.kind !== 'wolves') return state;
    return { ...state, phase: 'battle', encounter: 'ambush', journey: { ...journey, event: { ...event, inBattle: true } } };
  }
  let days = 0, supplies = state.supplies, morale = state.morale, flags = state.flags;
  if (choice === 'skip') {
    if (!['merchant', 'refugees', 'contact', 'market-news'].includes(event.kind)) return state;
  } else if (choice === 'meet') {
    if (event.kind !== 'contact' || !event.contact) return state;
    if(state.life||state.worldConflict&&!state.conflictRecovery) {
      const leg=journeyLeg(journey);
      const advanced=withWorldDate({...state,journey:{...journey,event:undefined}},advanceDays(state.date,1));
      if(![cityContact(leg.from,advanced.date,advanced),cityContact(leg.to,advanced.date,advanced)].includes(event.contact)) {
        return {...advanced,travelNotice:'对方行踪已有变化，未能亲自相遇；打听1日后继续原行程。'};
      }
      return {...advanced,flags:{...advanced.flags,[`met:${event.contact}`]:true},travelNotice:'拜访了当地军府；停留1日，继续原路。'};
    }
    flags = { ...flags, [`met:${event.contact}`]: true };
    days = 1;
  } else if (choice === 'pay') {
    if (!['rain', 'refugees', 'ferry'].includes(event.kind) || supplies < 1) return state;
    supplies--;
    if (event.kind === 'refugees') morale += 2;
  } else if (choice === 'safe') {
    if (event.kind === 'rain' || event.kind === 'ferry') days = 2;
    if (event.kind === 'bandits' || event.kind === 'wolves') { days = 3; morale = Math.max(0, morale - 1); }
    if (event.kind === 'refugees') { days = 3; morale++; }
    if (event.kind === 'merchant') { days = 1; supplies++; }
  } else return state;
  return withWorldDate({ ...state, supplies, morale, flags, journey: { ...journey, event: undefined }, travelNotice: days ? `处理途中见闻，停留${days}日，继续原路。` : '途中见闻已处理，继续原路。' }, advanceDays(state.date, days));
}

export function finishTravelBattle(state: GameState, won: boolean): GameState {
  if (!state.journey?.event?.inBattle) return state;
  const wolves = state.journey.event.kind === 'wolves';
  const party = { ...state.party };
  const fighters = (state.battleParty ?? state.deployed).filter(id=>Object.hasOwn(party,id)&&isAliveAt(state.life,id,state.date,true));
  if (won) for (const id of fighters) party[id] = grantExperience(party[id], victoryExperience(30, party[id].attributes));
  const bonus = won ? fighters.reduce((sum, id) => sum + attributeBonuses(party[id].attributes).supplies, 0) : 0;
  return withWorldDate({ ...state, phase: 'overworld', encounter: undefined, battleParty: undefined, party,
    economy: won && wolves ? { ...state.economy, coins: Math.min(Number.MAX_SAFE_INTEGER, state.economy.coins + 20) } : state.economy,
    supplies: state.supplies + bonus, morale: Math.max(0, state.morale + (won ? 1 : -1)),
    journey: { ...state.journey, event: undefined }, travelNotice: wolves
      ? won ? '狼群已退，出战者获得经验与20铜钱；整备1日后继续原行程。' : '绕开狼群，耽搁3日，士气降低1；队伍仍在原路段，可继续行旅。'
      : won ? '匪患已退，队伍获得经验；整备1日后继续原行程。' : '绕开匪患，耽搁3日；队伍仍在原路段，可继续行旅。' }, advanceDays(state.date, won ? 1 : 3));
}

export function restInCity(state: GameState, days: number): GameState {
  if (state.journey || state.phase === 'battle' || ![1, 30, 360].includes(days)) return state;
  const date = advanceDays(state.date, days);
  if (gameDayNumber(date) === gameDayNumber(state.date)) return state;
  return withWorldDate({ ...state, economy: days === 1 ? { ...state.economy, coins: Math.min(Number.MAX_SAFE_INTEGER, state.economy.coins + 20) } : state.economy,
    supplies: state.supplies + (days === 1 ? 1 : 3), travelNotice: `在${cityNameAt(state.currentCityId,date)}${days === 1 ? '帮工休整1日，获得20铜钱' : `安居${days === 30 ? '一月' : '一年'}`}，军需有所补充。` }, date);
}

export function isJourney(value: unknown, currentCityId: string, phase: string): value is Journey {
  if (!value || typeof value !== 'object') return false;
  const j = value as Journey;
  const integer = (n: number) => Number.isSafeInteger(n) && n >= 0;
  if (!Array.isArray(j.path) || j.path.length < 2 || j.path.length > WORLD_CITIES.length || j.path[0] !== currentCityId || new Set(j.path).size !== j.path.length || !j.path.every(id => WORLD_CITIES.some(c => c.id === id)) || !integer(j.legIndex) || j.legIndex >= j.path.length - 1 || !integer(j.legDay) || !integer(j.elapsed) || !integer(j.seed) || j.seed > 0xffffffff || !integer(j.serial) || j.serial < 1) return false;
  let elapsed = j.legDay;
  for (let i = 0; i < j.path.length - 1; i++) {
    const leg = directRoadLeg(j.path[i], j.path[i + 1]);
    if (!leg || i === j.legIndex && j.legDay >= leg.days) return false;
    if (i < j.legIndex) elapsed += leg.days;
  }
  if (elapsed !== j.elapsed) return false;
  if (j.event !== undefined) {
    const e = j.event;
    if (!e || !integer(e.id) || e.id !== j.elapsed || !['rain', 'merchant', 'refugees', 'ferry', 'bandits', 'contact', 'market-news', 'wolves'].includes(e.kind) || e.inBattle !== undefined && typeof e.inBattle !== 'boolean' || e.cgSeen !== undefined && typeof e.cgSeen !== 'boolean' || e.contact !== undefined && !['cao', 'sun', 'liu'].includes(e.contact)) return false;
    if (e.kind === 'contact' && !e.contact || e.inBattle && (!['bandits', 'wolves'].includes(e.kind) || phase !== 'battle')) return false;
    if (e.kind === 'market-news' && !isMarketNews(e.news) || e.news !== undefined && (e.kind !== 'market-news' || !isMarketNews(e.news))) return false;
    if (e.kind === 'wolves') {
      // At a leg boundary, this day's encounter belongs to the leg just completed.
      const eventLegIndex = j.legDay === 0 && j.legIndex > 0 ? j.legIndex - 1 : j.legIndex;
      if (directRoadLeg(j.path[eventLegIndex], j.path[eventLegIndex + 1])!.kind === 'water') return false;
    }
  }
  return phase !== 'battle' || j.event?.inBattle === true;
}
