import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInitialState,
  loadState,
  saveState,
  selectRoute,
  type GameState,
} from './state';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('game state', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: new MemoryStorage(),
    });
  });

  it('starts in the refugee prologue with a small shared resource pool', () => {
    expect(createInitialState()).toEqual({
      phase: 'prologue',
      route: null,
      supplies: 3,
      morale: 2,
      flags: {},
    });
  });

  it.each([
    ['cao', 4, 2],
    ['sun', 3, 3],
    ['liu', 3, 4],
  ] as const)('applies the %s route advantage', (route, supplies, morale) => {
    const selected = selectRoute(createInitialState(), route);

    expect(selected).toMatchObject({
      phase: 'route-choice',
      route,
      supplies,
      morale,
    });
  });

  it('round-trips a saved state and ignores malformed data', () => {
    const state: GameState = {
      phase: 'battle',
      route: 'sun',
      supplies: 5,
      morale: 3,
      flags: { foundMap: true },
    };

    saveState(state);
    expect(loadState()).toEqual(state);

    localStorage.setItem('three-kingdoms-demo-state', '{bad json');
    expect(loadState()).toBeNull();
  });
});
