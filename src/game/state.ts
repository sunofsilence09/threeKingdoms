export type RouteId = 'cao' | 'sun' | 'liu';

export type DemoPhase = 'prologue' | 'overworld' | 'route-choice' | 'battle' | 'ending';

export interface GameState {
  phase: DemoPhase;
  route: RouteId | null;
  supplies: number;
  morale: number;
  flags: Record<string, boolean>;
}

export const STORAGE_KEY = 'three-kingdoms-demo-state';

const routeAdvantages: Record<RouteId, Pick<GameState, 'supplies' | 'morale'>> = {
  cao: { supplies: 4, morale: 2 },
  sun: { supplies: 3, morale: 3 },
  liu: { supplies: 3, morale: 4 },
};

export function createInitialState(): GameState {
  return {
    phase: 'prologue',
    route: null,
    supplies: 3,
    morale: 2,
    flags: {},
  };
}

export function selectRoute(state: GameState, route: RouteId): GameState {
  return {
    ...state,
    phase: 'route-choice',
    route,
    ...routeAdvantages[route],
  };
}

export function saveState(state: GameState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

    return parsed;
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
    routes.includes(candidate.route ?? null) &&
    typeof candidate.supplies === 'number' &&
    typeof candidate.morale === 'number' &&
    !!candidate.flags &&
    typeof candidate.flags === 'object' &&
    Object.values(candidate.flags).every((flag) => typeof flag === 'boolean')
  );
}
