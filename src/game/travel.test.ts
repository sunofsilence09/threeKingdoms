import { describe, expect, it } from 'vitest';
import { advanceDays } from './history';
import { createInitialState } from './state';
import { advanceTravel, finishTravelBattle, resolveTravelEvent, restInCity, startTravel } from './travel';
import { planRoute } from './world';

const cityState = () => ({ ...createInitialState(() => 0), phase: 'overworld' as const, originId: 'yingchuan' as const, currentCityId: 'yingchuan' });
describe('day calendar and persistent journeys', () => {
  it('crosses months and years without silently jumping chapters', () => {
    expect(advanceDays({ year: 184, month: 12, day: 30 }, 2)).toEqual({ year: 185, month: 1, day: 2 });
    expect(advanceDays({ year: 199, month: 12 }, 30)).toEqual({ year: 200, month: 1, day: 1 });
    expect(advanceDays({ year: 184, month: 3 }, -2)).toEqual({ year: 184, month: 3, day: 1 });
  });
  it('previews a journey and refuses duplicate departure and invalid destinations', () => {
    const state = cityState();
    expect(startTravel(state, 'unknown', 1)).toBe(state);
    expect(startTravel(state, state.currentCityId, 1)).toBe(state);
    const journey = startTravel(state, 'nanhai', 42);
    expect(journey.journey?.path).toEqual(planRoute('yingchuan', 'nanhai')!.path);
    expect(journey.currentCityId).toBe('yingchuan');
    expect(startTravel(journey, 'zhuo', 3)).toBe(journey);
  });
  it('advances a bounded number of days, pauses for events, and eventually arrives with no supplies', () => {
    let state = startTravel({ ...cityState(), supplies: 0 }, 'nanhai', 42);
    for (let i = 0; i < 500 && state.journey; i++) {
      if (state.journey.event) {
        const paused = advanceTravel(state);
        expect(paused).toBe(state);
        state = resolveTravelEvent(state, 'safe');
      } else state = advanceTravel(state);
    }
    expect(state.journey).toBeUndefined();
    expect(state.currentCityId).toBe('nanhai');
    expect(state.originId).toBe('yingchuan');
    expect(state.supplies).toBeGreaterThanOrEqual(0);
  });
  it('replays identical persisted random state and settles an event once', () => {
    let state = startTravel(cityState(), 'nanhai', 9);
    for (let i = 0; i < 100 && !state.journey?.event; i++) state = advanceTravel(state);
    expect(state.journey?.event).toBeDefined();
    const restored = JSON.parse(JSON.stringify(state));
    expect(advanceTravel(restored)).toEqual(state);
    const settled = resolveTravelEvent(state, 'safe');
    expect(resolveTravelEvent(settled, 'safe')).toBe(settled);
    expect(advanceTravel(settled)).toEqual(advanceTravel(JSON.parse(JSON.stringify(settled))));
  });
  it('hands bandit battles back to the same journey and grants experience only once', () => {
    const started = startTravel(cityState(), 'nanhai', 8);
    const state = { ...started, journey: { ...started.journey!, event: { id: 1, kind: 'bandits' as const } } };
    const battle = resolveTravelEvent(state, 'fight');
    expect(battle.phase).toBe('battle');
    expect(battle.journey?.event?.inBattle).toBe(true);
    const won = finishTravelBattle(battle, true);
    expect(won.phase).toBe('overworld');
    expect(won.journey?.path).toEqual(started.journey?.path);
    expect(won.party.traveler.xp + won.party.traveler.level).toBeGreaterThan(battle.party.traveler.xp + battle.party.traveler.level);
    expect(finishTravelBattle(won, true)).toBe(won);
    const lost = finishTravelBattle(battle, false);
    expect(lost.party).toEqual(battle.party);
    expect(lost.journey?.event).toBeUndefined();
  });
  it('prevents resting or using paid options while on a road without resources', () => {
    const started = startTravel({ ...cityState(), supplies: 0 }, 'nanhai', 8);
    expect(restInCity(started, 30)).toBe(started);
    const rain = { ...started, journey: { ...started.journey!, event: { id: 1, kind: 'rain' as const } } };
    expect(resolveTravelEvent(rain, 'pay')).toBe(rain);
    expect(resolveTravelEvent(rain, 'safe').journey?.event).toBeUndefined();
  });
  it('allows optional meetings and merchant help to be declined without a cost', () => {
    const started = startTravel(cityState(), 'nanhai', 8);
    for (const kind of ['merchant', 'refugees', 'contact'] as const) {
      const state = { ...started, journey: { ...started.journey!, event: { id: 1, kind, ...(kind === 'contact' ? { contact: 'cao' as const } : {}) } } };
      const skipped = resolveTravelEvent(state, 'skip');
      expect(skipped.date).toEqual(state.date);
      expect(skipped.supplies).toBe(state.supplies);
      expect(skipped.flags).toEqual(state.flags);
      expect(skipped.journey?.event).toBeUndefined();
    }
  });
});
