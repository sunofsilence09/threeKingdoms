import { createPartyProgress, grantExperience, isPartyProgress, PARTY_IDS, type PartyProgress } from './growth';

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

    return { ...parsed, party: parsed.party ?? createPartyProgress() };
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
    (candidate.party === undefined || isPartyProgress(candidate.party))
  );
}

export function rewardVictory(state: GameState, encounter: 'ambush' | 'route'): GameState {
  const key = `xp:${encounter}`;
  if (state.flags[key]) return state;
  const party = { ...state.party };
  for (const id of PARTY_IDS) party[id] = grantExperience(party[id], encounter === 'ambush' ? 30 : 45);
  return { ...state, party, flags: { ...state.flags, [key]: true } };
}
