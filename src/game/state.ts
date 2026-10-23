import { ATTRIBUTE_IDS, attributeBonuses, victoryExperience, type AttributeId } from './attributes';
import { createPartyProgress, grantExperience, migratePartyProgress, PARTY_IDS, type PartyId, type PartyProgress } from './growth';
import { ORIGINS, advanceDays, isGameDate, randomOrigin, type GameDate, type OriginId } from './history';
import type { BattleMode } from './battlefield';
import { WORLD_CITIES, originCity } from './world';
import { isJourney, type Journey } from './travel';
import { initialRelationships, isDeployment, isRelationships, type Relationship } from './recruitment';
import { recruitProfile } from './recruitmentCatalog';

export type RouteId = 'cao' | 'sun' | 'liu';

export type DemoPhase = 'prologue' | 'overworld' | 'route-choice' | 'battle' | 'ending';

export interface GameState {
  date: GameDate;
  originId: OriginId;
  currentCityId: string;
  travelCount: number;
  journey?: Journey;
  travelNotice?: string;
  encounter?: BattleMode;
  phase: DemoPhase;
  route: RouteId | null;
  supplies: number;
  morale: number;
  flags: Record<string, boolean>;
  party: PartyProgress;
  deployed: string[];
  relationships: Record<string, Relationship>;
  battleParty?: string[];
}

export const STORAGE_KEY = 'three-kingdoms-demo-state';

const routeAdvantages: Record<RouteId, Pick<GameState, 'supplies' | 'morale'>> = {
  cao: { supplies: 1, morale: 0 },
  sun: { supplies: 0, morale: 1 },
  liu: { supplies: 0, morale: 2 },
};

export function createInitialState(random: () => number = Math.random): GameState {
  const origin = randomOrigin(random);
  return {
    date: { year: 184, month: 3, day: 1 },
    originId: origin.id,
    currentCityId: originCity(origin.id).id,
    travelCount: 0,
    phase: 'prologue',
    route: null,
    supplies: 3,
    morale: 2,
    flags: {},
    party: createPartyProgress(),
    deployed: [...PARTY_IDS],
    relationships: initialRelationships(),
  };
}

export function selectRoute(state: GameState, route: RouteId): GameState {
  if (state.route || !availableRoutes(state).includes(route)) return state;
  return {
    ...state,
    phase: 'route-choice',
    route,
    supplies: state.supplies + routeAdvantages[route].supplies,
    morale: state.morale + routeAdvantages[route].morale,
  };
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be disabled in an embedded browser; retain the in-memory game.
  }
}

export function loadState(): GameState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isGameState(parsed)) {
      return null;
    }

    return { ...parsed,
      date: { ...(parsed.date ?? { year: parsed.route ? 200 : 184, month: parsed.route ? 9 : 3 }), day: parsed.date?.day ?? 1 },
      originId: parsed.originId ?? 'yingchuan',
      currentCityId: parsed.currentCityId ?? originCity(parsed.originId ?? 'yingchuan').id,
      travelCount: parsed.travelCount ?? 0,
      flags: parsed.currentCityId === undefined && (parsed.flags['xp:route'] || parsed.flags['xp:escort']) ? { ...parsed.flags, escortWon: true } : parsed.flags,
      deployed: parsed.deployed ?? [...PARTY_IDS],
      relationships: parsed.relationships ?? initialRelationships(),
      party: parsed.party === undefined ? createPartyProgress() : migratePartyProgress(parsed.party)! };
  } catch {
    return null;
  }
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<GameState>;
  const phases: DemoPhase[] = ['prologue', 'overworld', 'route-choice', 'battle', 'ending'];
  const routes: Array<RouteId | null> = [null, 'cao', 'sun', 'liu'];
  const party = candidate.party ?? createPartyProgress();
  const date = candidate.date ?? { year: candidate.route ? 200 : 184, month: candidate.route ? 9 : 3 };

  return (
    typeof candidate.phase === 'string' &&
    phases.includes(candidate.phase as DemoPhase) &&
    routes.includes(candidate.route as RouteId | null) &&
    Number.isSafeInteger(candidate.supplies) && candidate.supplies! >= 0 &&
    Number.isSafeInteger(candidate.morale) && candidate.morale! >= 0 &&
    !!candidate.flags &&
    typeof candidate.flags === 'object' &&
    !Array.isArray(candidate.flags) &&
    Object.values(candidate.flags).every((flag) => typeof flag === 'boolean') &&
    (candidate.date === undefined || isGameDate(candidate.date)) &&
    (candidate.originId === undefined || ORIGINS.some(o => o.id === candidate.originId)) &&
    (candidate.currentCityId === undefined || WORLD_CITIES.some(c => c.id === candidate.currentCityId)) &&
    (candidate.travelCount === undefined || Number.isSafeInteger(candidate.travelCount) && candidate.travelCount >= 0) &&
    (candidate.travelNotice === undefined || typeof candidate.travelNotice === 'string' && candidate.travelNotice.length < 1000) &&
    (candidate.journey === undefined || !!candidate.currentCityId && isJourney(candidate.journey, candidate.currentCityId, candidate.phase!) && candidate.journey.serial === candidate.travelCount) &&
    (candidate.journey === undefined || candidate.phase !== 'battle' || candidate.encounter === 'ambush') &&
    (candidate.encounter === undefined || ['ambush', 'route'].includes(candidate.encounter)) &&
    (candidate.date === undefined || candidate.date.year >= 200 || !candidate.route || candidate.flags?.[`met:${candidate.route}`] === true) &&
    (candidate.party === undefined || migratePartyProgress(candidate.party) !== null && Object.keys(candidate.party).every(id => !!recruitProfile(id))) &&
    (candidate.deployed === undefined || isDeployment(candidate.deployed, party)) &&
    (candidate.relationships === undefined || isRelationships(candidate.relationships, date)) &&
    (candidate.battleParty === undefined || candidate.phase === 'battle' && isDeployment(candidate.battleParty, party) && candidate.battleParty.join('|') === (candidate.deployed ?? PARTY_IDS).join('|'))
  );
}

export function availableRoutes(state: GameState): RouteId[] {
  return (['cao', 'sun', 'liu'] as RouteId[]).filter(route => state.flags[`met:${route}`] || state.date.year >= 200);
}

export function completeJourneyTask(state: GameState, task: 'ambushWon' | 'recovered' | 'escortWon'): GameState {
  if (state.flags[task] || state.journey) return state;
  return { ...state, date: advanceDays(state.date, task === 'escortWon' ? 3 : 1), flags: { ...state.flags, [task]: true } };
}

export function continueJourney(state: GameState): GameState {
  if (!state.flags.escortWon || state.phase === 'overworld') return state;
  return { ...state, phase: 'overworld', encounter: undefined };
}

export function rewardVictory(state: GameState, encounter: 'ambush' | 'route' | 'escort'): GameState {
  const key = `xp:${encounter}`;
  if (state.flags[key]) return state;
  const party = { ...state.party };
  const fighters = state.battleParty ?? state.deployed;
  for (const id of fighters) {
    const base = encounter === 'ambush' ? 30 : 45;
    party[id] = grantExperience(party[id], victoryExperience(base, party[id].attributes));
  }
  const supplies = state.supplies + fighters.reduce((sum, id) => sum + attributeBonuses(party[id].attributes).supplies, 0);
  return { ...state, party, supplies, flags: { ...state.flags, [key]: true } };
}

export function canPlayFactionMission(state: GameState): boolean {
  return !state.journey && !!state.route && !state.flags['xp:route'];
}

export function completeLocalEscort(state: GameState): GameState {
  if (state.journey) return state;
  const rewarded = rewardVictory(state, state.route ? 'route' : 'escort');
  if (rewarded === state) return state;
  return { ...rewarded, date: advanceDays(state.date, 3), flags: { ...rewarded.flags, escortWon: true } };
}


export function spendSkillPoints(state: GameState, id: PartyId, allocation: Partial<Record<AttributeId, number>>): GameState {
  if (state.phase === 'battle' || state.journey?.event || !Object.hasOwn(state.party, id) || !allocation || typeof allocation !== 'object') return state;
  const current = state.party[id];
  const attrs = { ...current.attributes };
  let cost = 0;
  for (const [key, value] of Object.entries(allocation)) {
    if (!ATTRIBUTE_IDS.includes(key as AttributeId) || !Number.isSafeInteger(value) || value! < 0 || attrs[key as AttributeId] + value! > 30) return state;
    cost += value!;
    attrs[key as AttributeId] += value!;
  }
  if (!Number.isSafeInteger(cost) || cost <= 0 || cost > current.points) return state;
  return { ...state, party: { ...state.party, [id]: { ...current, points: current.points - cost, attributes: attrs } } };
}
