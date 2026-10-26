import {
  createInitialState,
  loadState,
  saveState,
  type GameState,
} from './state';
import { applyCalendarTheme } from './theme';
import { springMusic } from './seasonalMusic';

const restoredState=loadState();
let currentState = restoredState ?? createInitialState();
let savedGameAvailable=restoredState!==null;
applyCalendarTheme(currentState.date);
springMusic.update(currentState);

/** Reading the title screen does not create a fake continue slot. */
export function hasSavedGame(): boolean { return savedGameAvailable; }

export function getState(): GameState {
  return currentState;
}

export function setState(next: GameState): GameState {
  currentState = next;
  savedGameAvailable=true;
  applyCalendarTheme(next.date);
  springMusic.update(next);
  saveState(currentState);
  return currentState;
}

export function resetState(): GameState {
  return setState(createInitialState());
}
