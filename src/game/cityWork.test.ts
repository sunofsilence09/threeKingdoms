import { describe, expect, it } from 'vitest';
import { advanceDays } from './history';
import { createInitialState, loadState, saveState } from './state';
import { cityWorkQuote, maxCityWorkBlocks, restInCity, startTravel, workInCity } from './travel';
import { gameDayNumber } from './recruitment';

const cityState = () => ({ ...createInitialState(() => 0), phase: 'overworld' as const, currentCityId: 'yingchuan' });

describe('city work in complete five-day blocks', () => {
  it('closes the old one-day work bypass while preserving independent rest rewards', () => {
    const state = cityState();
    expect(restInCity(state, 1)).toBe(state);
    for (const days of [30, 360]) {
      expect(restInCity(state, days).economy).toEqual(state.economy);
      expect(restInCity(state, days).supplies).toBe(state.supplies + 3);
    }
  });
  it.each([1, 3, 72])('works %i full blocks at the existing daily rate', blocks => {
    const state = cityState(), days = blocks * 5;
    expect(cityWorkQuote(state, blocks)).toEqual({ blocks, days, supplies: days, coins: days * 20 });
    const next = workInCity(state, blocks);
    expect(gameDayNumber(next.date) - gameDayNumber(state.date)).toBe(days);
    expect(next.date).toEqual(advanceDays(state.date, days));
    expect(next.supplies).toBe(state.supplies + days);
    expect(next.economy.coins).toBe(state.economy.coins + days * 20);
    expect(next.currentCityId).toBe(state.currentCityId);
    expect(next.worldConflict?.lastDay).toBe(gameDayNumber(next.date));
    expect(next.travelNotice).toContain(`帮工${days}日`);
  });
  it.each([0, -1, 1.5, NaN, Infinity, 73, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER + 1, '3', null])('rejects invalid block input %s without touching state', blocks => {
    const state = cityState();
    expect(workInCity(state, blocks as number)).toBe(state);
    expect(cityWorkQuote(state, blocks as number)).toBeUndefined();
  });
  it('requires the overworld, a real current city and no journey or battle', () => {
    const state = cityState();
    for (const locked of [startTravel(state, 'nanhai', 9), { ...state, phase: 'battle' as const },
      { ...state, phase: 'prologue' as const }, { ...state, currentCityId: 'unknown' }]) {
      expect(workInCity(locked, 1)).toBe(locked);
      expect(maxCityWorkBlocks(locked)).toBe(0);
    }
  });
  it('rejects an overlong request rather than granting phantom calendar days', () => {
    const state = { ...cityState(), worldConflict: undefined, date: { year: 310, month: 12, day: 23 } };
    expect(maxCityWorkBlocks(state)).toBe(1);
    expect(workInCity(state, 2)).toBe(state);
    const worked = workInCity(state, 1);
    expect(worked.date).toEqual({ year: 310, month: 12, day: 28 });
    expect(worked.economy.coins - state.economy.coins).toBe(100);
    expect(maxCityWorkBlocks(worked)).toBe(0);
    expect(workInCity(worked, 1)).toBe(worked);
    const exact = { ...cityState(), worldConflict: undefined, date: { year: 310, month: 12, day: 25 } };
    expect(workInCity(exact, 1).date).toEqual({ year: 310, month: 12, day: 30 });
    expect(maxCityWorkBlocks(cityState())).toBe(72);
  });
  it('saturates safe resource totals and previews the actual capped rewards', () => {
    const state = cityState();
    const rich = { ...state, supplies: Number.MAX_SAFE_INTEGER - 2, economy: { ...state.economy, coins: Number.MAX_SAFE_INTEGER - 3 } };
    expect(cityWorkQuote(rich, 3)).toEqual({ blocks: 3, days: 15, supplies: 2, coins: 3 });
    const next = workInCity(rich, 3);
    expect(next.supplies).toBe(Number.MAX_SAFE_INTEGER);
    expect(next.economy.coins).toBe(Number.MAX_SAFE_INTEGER);
    for (const bad of [NaN, -1, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      const corrupt = { ...state, supplies: bad };
      expect(workInCity(corrupt, 1)).toBe(corrupt);
      const badCoins = { ...state, economy: { ...state.economy, coins: bad } };
      expect(workInCity(badCoins, 1)).toBe(badCoins);
    }
  });
  it('persists the paid days without replaying work after loading', () => {
    const data = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    } });
    const worked = workInCity(cityState(), 3);
    saveState(worked);
    expect(loadState()).toEqual(worked);
    expect(loadState()!.economy.coins).toBe(worked.economy.coins);
  });
});
