import {
  createInitialState,
  loadState,
  saveState,
  type GameState,
} from './state';
import { applyCalendarTheme } from './theme';

let currentState = loadState() ?? createInitialState();
applyCalendarTheme(currentState.date);
saveState(currentState);

export function getState(): GameState {
  return currentState;
}

export function setState(next: GameState): GameState {
  currentState = next;
  applyCalendarTheme(next.date);
  saveState(currentState);
  return currentState;
}

export function resetState(): GameState {
  return setState(createInitialState());
}
