import { ATTRIBUTE_IDS, attributeBonuses, victoryExperience, type AttributeId } from './attributes';
import { createPartyProgress, grantExperience, migratePartyProgress, PARTY_IDS, type PartyId, type PartyProgress } from './growth';

export type RouteId = 'cao' | 'sun' | 'liu';

export type DemoPhase = 'prologue' | 'overworld' | 'route-choice' | 'battle' | 'ending';

export interface GameState {
  phase: DemoPhase;
  route: RouteId | null;
  supplies: number;
  morale: number;
  flags: Record<string, boolean>;
  party: PartyProgress;
}

export const STORAGE_KEY = 'three-kingdoms-demo-state';

const routeAdvantages: Record<RouteId, Pick<GameState, 'supplies' | 'morale'>> = {
  cao: { supplies: 1, morale: 0 },
  sun: { supplies: 0, morale: 1 },
  liu: { supplies: 0, morale: 2 },
};

export function createInitialState(): GameState {
  return {
    phase: 'prologue',
    route: null,
    supplies: 3,
    morale: 2,
    flags: {},
    party: createPartyProgress(),
  };
}

export function selectRoute(state: GameState, route: RouteId): GameState {
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

    return { ...parsed, party: parsed.party === undefined ? createPartyProgress() : migratePartyProgress(parsed.party)! };
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
    (candidate.party === undefined || migratePartyProgress(candidate.party) !== null)
  );
}

export function rewardVictory(state: GameState, encounter: 'ambush' | 'route'): GameState {
  const key = `xp:${encounter}`;
  if (state.flags[key]) return state;
  const party = { ...state.party };
  for (const id of PARTY_IDS) {
    const base = encounter === 'ambush' ? 30 : 45;
    party[id] = grantExperience(party[id], victoryExperience(base, party[id].attributes));
  }
  const supplies = state.supplies + PARTY_IDS.reduce((sum, id) => sum + attributeBonuses(party[id].attributes).supplies, 0);
  return { ...state, party, supplies, flags: { ...state.flags, [key]: true } };
}


export function spendSkillPoints(state: GameState, id: PartyId, allocation: Partial<Record<AttributeId, number>>): GameState {
  if (state.phase === 'battle' || !PARTY_IDS.includes(id) || !allocation || typeof allocation !== 'object') return state;
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
