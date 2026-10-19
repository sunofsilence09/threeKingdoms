import {
  createInitialState,
  loadState,
  saveState,
  type GameState,
} from './state';

let currentState = loadState() ?? createInitialState();

export function getState(): GameState {
  return currentState;
}

export function setState(next: GameState): GameState {
  currentState = next;
  saveState(currentState);
  return currentState;
}

export function resetState(): GameState {
  return setState(createInitialState());
}
