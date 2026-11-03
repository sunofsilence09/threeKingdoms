import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from './state';
import * as travel from './travel';
import { directRoadLeg, planRoute } from './world';
import { advanceDays } from './history';
import { withWorldDate } from './worldTime';

const initial = (): GameState => ({ ...createInitialState(() => 0), phase: 'overworld', currentCityId: 'yingchuan' });
const started = () => travel.startTravel(initial(), 'nanhai', 42);
// A genuine legacy structure: no new navigation fields, already two days into its road.
const legacy = (): GameState => {
  const s = started();
  return { ...s, date: advanceDays(s.date, 2), journey: { ...s.journey!, legDay: 2, elapsed: 2 } };
};
const walk = (state: GameState, days: number) => {
  let s = state, walked = 0;
  while (walked < days && s.journey) {
    if (s.journey.event) {
      const kind = s.journey.event.kind;
      s = travel.resolveTravelEvent(travel.acknowledgeTravelCg(s), ['contact', 'market-news'].includes(kind) ? 'skip' : 'safe');
    } else { s = travel.advanceTravel(s, 1); walked++; }
  }
  return s;
};

describe('physical journey navigation', () => {
  it('preserves monthly personal payroll while walking a return road', () => {
    const s = withWorldDate(initial(), { year: 184, month: 3, day: 30 });
    const start = travel.startTravel(s, 'nanhai', 42);
    const returning = travel.turnBackTravel({ ...start, journey: { ...start.journey!, legDay: 2, elapsed: 2 } });
    const expected = withWorldDate(returning, { year: 184, month: 4, day: 1 });
    const result = travel.advanceTravel(returning, 1);
    expect(result.economy.coins).toBe(expected.economy.coins);
    expect(result.cityEconomy).toEqual(expected.cityEconomy);
    expect(result.supplies).toBe(expected.supplies);
  });
  it('turns back a legacy journey for precisely the distance already walked', () => {
    const s = legacy();
    const back = travel.turnBackTravel?.(s);
    expect(back?.journey && travel.remainingDays(back.journey)).toBe(2);
    expect(back?.journey?.elapsed).toBe(2);
    expect(back?.journey?.seed).toBe(s.journey!.seed);
    expect(back?.date).toEqual(s.date);
    expect(back?.currentCityId).toBe(s.currentCityId);
    const arrived = walk(back!, 2);
    expect(arrived.journey).toBeUndefined();
    expect(arrived.currentCityId).toBe('yingchuan');
  });
  it('stops at the next city after only the remaining current road', () => {
    const s = legacy(), leg = travel.journeyLeg(s.journey!);
    const stop = travel.stopAtNextCity?.(s);
    expect(stop?.journey && travel.remainingDays(stop.journey)).toBe(leg.days - 2);
    expect(walk(stop!, leg.days - 2).currentCityId).toBe(leg.to);
  });
  it('redirects via the current endpoint and permits a return through a visited city', () => {
    const s = legacy(), leg = travel.journeyLeg(s.journey!);
    const rerouted = travel.redirectTravel?.(s, leg.from);
    expect(rerouted?.journey?.path).toEqual([leg.from, ...planRoute(leg.to, leg.from)!.path]);
    expect(rerouted?.journey && travel.remainingDays(rerouted.journey)).toBe(leg.days - 2 + planRoute(leg.to, leg.from)!.days);
    expect(travel.isJourney(rerouted?.journey, s.currentCityId, s.phase)).toBe(true);
  });
  it('stops immediately at the actual segment start without advancing time or RNG', () => {
    for (const command of [travel.turnBackTravel, travel.stopAtNextCity]) {
      const s = started(), stop = command?.(s);
      expect(stop?.journey).toBeUndefined();
      expect(stop?.date).toEqual(s.date);
      expect(stop?.travelCount).toBe(s.travelCount);
      expect(stop?.currentCityId).toBe('yingchuan');
    }
  });
  it('reverses twice without erasing distance or rerolling the random stream', () => {
    const s = legacy();
    const once = travel.turnBackTravel?.(s);
    const twice = once && travel.turnBackTravel?.(once);
    expect(twice?.journey && travel.journeyLeg(twice.journey)).toEqual(travel.journeyLeg(s.journey!));
    expect(twice?.journey?.legDay).toBe(2);
    expect(twice?.journey?.elapsed).toBe(2);
    expect(twice?.journey?.seed).toBe(s.journey!.seed);
    expect(twice?.journey?.serial).toBe(s.journey!.serial);
    expect(travel.isJourney(twice?.journey, s.currentCityId, s.phase)).toBe(true);
    expect(walk(twice!, 1).journey?.seed).toBe(walk(s, 1).journey?.seed);
  });
  it('reverses again after actual walking using the remaining physical distance', () => {
    const s = legacy(), leg = travel.journeyLeg(s.journey!);
    const back = walk(travel.turnBackTravel(s), 1);
    const onward = travel.turnBackTravel(back);
    expect(onward.journey!.legDay).toBe(1);
    expect(onward.journey!.elapsed).toBe(3);
    expect(travel.remainingDays(onward.journey!)).toBe(leg.days - 1);
    expect(onward.date).toEqual(advanceDays(s.date, 1));
    expect(onward.journey!.seed).toBe(back.journey!.seed);
    expect(travel.isJourney(onward.journey, onward.currentCityId, onward.phase)).toBe(true);
  });
  it('keeps return progress and RNG at the calendar cap and walks across a year boundary', () => {
    // A legacy RPG-only snapshot keeps the date-boundary test independent of decades of war.
    const s = { ...legacy(), worldConflict: undefined, cityEconomy: undefined, conflictRecovery: true };
    const capped = travel.turnBackTravel({ ...s, date: { year: 310, month: 12, day: 30 } });
    const result = travel.advanceTravel(capped, 30);
    expect(result.journey).toEqual(capped.journey);
    expect(result.date).toEqual(capped.date);
    const yearEnd = travel.turnBackTravel({ ...s, date: { year: 184, month: 12, day: 30 } });
    const next = travel.advanceTravel(yearEnd, 1);
    expect(next.date).toEqual({ year: 185, month: 1, day: 1 });
    expect(next.journey!.elapsed).toBe(3);
    expect(travel.isJourney(next.journey, next.currentCityId, next.phase)).toBe(true);
  });
  it('blocks all commands during pending events or battles and explains the boundary', () => {
    const s = legacy();
    for (const blocked of [
      { ...s, journey: { ...s.journey!, event: { id: 2, kind: 'rain' as const } } },
      { ...s, phase: 'battle' as const },
    ]) {
      expect(travel.redirectTravel?.(blocked, 'zhuo')).toBe(blocked);
      expect(travel.turnBackTravel?.(blocked)).toBe(blocked);
      expect(travel.stopAtNextCity?.(blocked)).toBe(blocked);
      const quote = travel.previewTravelChange(blocked, 'turn-back');
      expect(quote.allowed).toBe(false);
      expect(!quote.allowed && quote.reason).toBeTruthy();
    }
  });
  it('previews without mutation and rejects unknown destinations', () => {
    const s = legacy(), snapshot = JSON.stringify(s), leg = travel.journeyLeg(s.journey!);
    expect(travel.previewTravelChange?.(s, 'redirect', 'zhuo')).toMatchObject({ allowed: true, destination: 'zhuo', effectiveCity: leg.to,
      remainingDays: leg.days - 2 + planRoute(leg.to, 'zhuo')!.days });
    expect(JSON.stringify(s)).toBe(snapshot);
    expect(travel.redirectTravel?.(s, 'unknown')).toBe(s);
  });
  it('preserves the real city when stopping at a later road boundary', () => {
    const s = started(), first = travel.journeyLeg(s.journey!);
    const boundary = { ...s, journey: { ...s.journey!, legIndex: 1, elapsed: first.days } };
    expect(directRoadLeg(boundary.journey.path[1], boundary.journey.path[2])).toBeDefined();
    const stop = travel.turnBackTravel?.(boundary);
    expect(stop?.currentCityId).toBe(first.to);
    expect(stop?.date).toEqual(boundary.date);
    expect(stop?.journey).toBeUndefined();
  });
});
