import { describe, expect, it } from 'vitest';
import { GOODS, marketQuote } from './economy';
import { advanceDays } from './history';
import { createPartyProgress, PARTY_IDS } from './growth';
import { gameDayNumber, initialRelationships } from './recruitment';
import type { GameState } from './state';
import { acknowledgeTravelCg, advanceTravel, finishTravelBattle, isJourney, journeyLeg, resolveTravelEvent, restInCity, startTravel, type TravelEventKind } from './travel';
import { WORLD_CITIES } from './world';

const cityState = (): GameState => ({
  date: { year: 184, month: 3, day: 1 }, phase: 'overworld', originId: 'yingchuan', currentCityId: 'yingchuan',
  travelCount: 0, travelDays: 3, route: null, supplies: 3, morale: 2, flags: {},
  party: createPartyProgress(), deployed: [...PARTY_IDS], relationships: initialRelationships(),
  economy: { coins: 600, capacity: 40, cargo: {}, markets: {}, news: [], ledger: [], profit: 0 },
});
const nextSeed = (seed: number) => (Math.imul(seed, 1664525) + 1013904223) >>> 0;
const seedForRoll = (roll: number) => Number(((BigInt(roll) - 1013904223n) * 4276115653n & 0xffffffffn));
const uninterruptedSeed = (days: number) => {
  for (let seed = 0; ; seed++) {
    let current = seed;
    let uninterrupted = true;
    for (let i = 0; i < days; i++) { current = nextSeed(current); if (current / 0x100000000 < .2) { uninterrupted = false; break; } }
    if (uninterrupted) return seed;
  }
};
const eventState = (kind: TravelEventKind) => {
  const started = startTravel(cityState(), 'nanhai', 9);
  return { ...started, journey: { ...started.journey!, event: { id: 0, kind } } };
};
const generatedEvent = (kind: TravelEventKind, from = 'yingchuan', to = 'nanhai') => {
  for (let roll = 0; roll < 64; roll++) {
    const result = advanceTravel(startTravel({ ...cityState(), currentCityId: from }, to, seedForRoll(roll)), 1);
    if (result.journey?.event?.kind === kind) return result;
  }
  throw new Error(`No ${kind} generated on ${from} → ${to}`);
};

describe('custom travel days and actual daily progress', () => {
  it.each([1, 7, 30])('advances exactly %i requested days without an event', days => {
    const started = startTravel({ ...cityState(), currentCityId: 'wuwei' }, 'nanhai', uninterruptedSeed(days));
    const result = advanceTravel(started, days);
    expect(result.journey?.elapsed).toBe(days);
    expect(result.date).toEqual(advanceDays(started.date, days));
    expect(result.travelDays).toBe(days);
    expect(result.travelNotice).toContain(`本次赶路${days}日`);
  });
  it.each([0, -1, 31, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER, '7', null, ''])('rejects invalid day count %s without mutating any state', days => {
    const started = startTravel(cityState(), 'nanhai', 9);
    expect(advanceTravel(started, days as number)).toBe(started);
  });
  it('uses a single twenty percent roll for each actual eligible day', () => {
    const below = advanceTravel(startTravel(cityState(), 'nanhai', seedForRoll(Math.floor(.2 * 0x100000000))), 1);
    const above = advanceTravel(startTravel(cityState(), 'nanhai', seedForRoll(Math.ceil(.2 * 0x100000000))), 1);
    expect(below.journey?.event).toBeDefined();
    expect(above.journey?.event).toBeUndefined();
    expect(above.journey?.seed).toBe(Math.ceil(.2 * 0x100000000));
  });
  it('stops at the first encounter and remembers the requested count', () => {
    const started = startTravel(cityState(), 'nanhai', seedForRoll(0));
    const result = advanceTravel(started, 30);
    expect(result.journey?.elapsed).toBe(1);
    expect(result.journey?.event).toMatchObject({ cgSeen: false });
    expect(result.travelDays).toBe(30);
    expect(result.travelNotice).toContain('本次赶路1日');
    expect(advanceTravel(result, 30)).toBe(result);
  });
  it('arrives before rolling an encounter and reports the actual final day', () => {
    const started = startTravel(cityState(), 'xuxian', seedForRoll(0));
    const leg = journeyLeg(started.journey!);
    const state = { ...started, journey: { ...started.journey!, legDay: leg.days - 1, elapsed: leg.days - 1 } };
    const result = advanceTravel(state, 30);
    expect(result.journey).toBeUndefined();
    expect(result.currentCityId).toBe('xuxian');
    expect(result.date).toEqual(advanceDays(state.date, 1));
    expect(result.travelNotice).toContain('本次赶路1日');
  });
  it('never advances journey progress or randomness beyond the calendar cap', () => {
    const started = startTravel({ ...cityState(), date: { year: 280, month: 12, day: 29 } }, 'nanhai', uninterruptedSeed(30));
    const result = advanceTravel(started, 30);
    expect(result.date).toEqual({ year: 280, month: 12, day: 30 });
    expect(result.journey?.elapsed).toBe(1);
    expect(result.journey?.seed).toBe(nextSeed(started.journey!.seed));
    expect(result.travelNotice).toContain('本次赶路1日');
    const capped = advanceTravel(result, 30);
    expect(capped.journey).toEqual(result.journey);
    expect(capped.date).toEqual(result.date);
    expect(capped.travelNotice).toContain('本次赶路0日');
  });
});

describe('travel CG confirmation and complete market news', () => {
  it('requires saved CG confirmation for every event, including an old event without cgSeen', () => {
    for (const kind of ['rain', 'merchant', 'refugees', 'ferry', 'bandits', 'contact', 'market-news', 'wolves'] as const) {
      const state = eventState(kind);
      expect(resolveTravelEvent(state, 'safe')).toBe(state);
      expect(resolveTravelEvent(state, 'fight')).toBe(state);
      const confirmed = acknowledgeTravelCg(state);
      expect(confirmed.journey?.event?.cgSeen).toBe(true);
      expect(acknowledgeTravelCg(confirmed)).toBe(confirmed);
      expect(resolveTravelEvent(JSON.parse(JSON.stringify(confirmed)), 'safe').journey?.event).toBeUndefined();
    }
  });
  it('does not acknowledge an active battle or an absent event', () => {
    const initial = cityState();
    expect(acknowledgeTravelCg(initial)).toBe(initial);
    const battle = resolveTravelEvent(acknowledgeTravelCg(eventState('wolves')), 'fight');
    expect(acknowledgeTravelCg(battle)).toBe(battle);
  });
  it('generates valid deterministic thirty-day news once and applies prices before the CG', () => {
    const state = generatedEvent('market-news');
    const news = state.journey!.event!.news!;
    expect(news).toBeDefined();
    expect(WORLD_CITIES.some(city => city.id === news.cityId)).toBe(true);
    expect(GOODS.some(good => good.id === news.goodId)).toBe(true);
    expect([-.2, .2]).toContain(news.change);
    expect(news.fromDay).toBe(gameDayNumber(state.date));
    expect(news.untilDay - news.fromDay).toBe(30);
    expect(news.reason.length).toBeGreaterThan(0);
    expect(state.economy.news).toContainEqual(news);
    const withoutNews = { ...state.economy, news: [] };
    const originalQuote = marketQuote(withoutNews, news.cityId, state.date, news.goodId);
    expect(marketQuote(state.economy, news.cityId, state.date, news.goodId).buy).not.toBe(originalQuote.buy);
    const confirmed = acknowledgeTravelCg(JSON.parse(JSON.stringify(state)));
    const settled = resolveTravelEvent(confirmed, 'skip');
    expect(settled.economy).toEqual(state.economy);
    expect(settled.date).toEqual(state.date);
    expect(settled.supplies).toBe(state.supplies);
    expect(resolveTravelEvent(settled, 'skip')).toBe(settled);
    expect(generatedEvent('market-news')).toEqual(state);
    expect(isJourney(state.journey, state.currentCityId, state.phase)).toBe(true);
  });
  it('varies news goods, price direction and destination from the saved seed', () => {
    const changes = new Set<number>(), goods = new Set<string>(), cities = new Set<string>();
    let destinations = 0, messages = 0;
    for (let roll = 0; roll < 512; roll++) {
      const state = advanceTravel(startTravel(cityState(), 'nanhai', seedForRoll(roll)), 1);
      const news = state.journey?.event?.news;
      if (!news) continue;
      changes.add(news.change); goods.add(news.goodId); cities.add(news.cityId);
      messages++;
      if (news.cityId === 'nanhai') destinations++;
    }
    expect([...changes].sort()).toEqual([-.2, .2]);
    expect(goods.size).toBe(8);
    expect(cities.size).toBeGreaterThan(1);
    expect(destinations).toBeGreaterThan(messages / 2);
  });
  it('rejects corrupt CG and news save fields while accepting legacy pending events', () => {
    const state = generatedEvent('market-news');
    const j = state.journey!, event = j.event!;
    for (const patch of [{ cgSeen: 'yes' }, { kind: 'merchant' }, { news: undefined }, { news: { ...event.news, cityId: 'nowhere' } }, { news: { ...event.news, change: .9 } }, { news: { ...event.news, untilDay: -1 } }]) {
      expect(isJourney({ ...j, event: { ...event, ...patch } }, state.currentCityId, state.phase)).toBe(false);
    }
    const legacy = eventState('rain');
    expect(isJourney(legacy.journey, legacy.currentCityId, legacy.phase)).toBe(true);
  });
});

describe('wolves and city work income', () => {
  it('generates wolves only on land and mountain routes', () => {
    expect(generatedEvent('wolves', 'yingchuan', 'nanhai').journey?.event?.kind).toBe('wolves');
    expect(generatedEvent('wolves', 'wuwei', 'jincheng').journey?.event?.kind).toBe('wolves');
    for (let roll = 0; roll < 64; roll++) {
      const water = advanceTravel(startTravel({ ...cityState(), currentCityId: 'jiangzhou' }, 'jiangling', seedForRoll(roll)), 1);
      expect(water.journey?.event?.kind).not.toBe('wolves');
    }
  });
  it('rejects wolves saved on a water day but preserves a land encounter at a water-leg boundary', () => {
    const water = startTravel({ ...cityState(), currentCityId: 'jiangzhou' }, 'jiangling', 9);
    expect(isJourney({ ...water.journey, event: { id: 0, kind: 'wolves' } }, water.currentCityId, water.phase)).toBe(false);
    let boundary;
    for (let roll = 0; roll < 64; roll++) {
      const started = startTravel({ ...cityState(), currentCityId: 'xiangyang' }, 'changsha', seedForRoll(roll));
      const days = journeyLeg(started.journey!).days;
      const state = { ...started, journey: { ...started.journey!, legDay: days - 1, elapsed: days - 1 } };
      const result = advanceTravel(state, 1);
      if (result.journey?.event?.kind === 'wolves') { boundary = result; break; }
    }
    expect(boundary).toBeDefined();
    expect(boundary!.journey!.legDay).toBe(0);
    expect(journeyLeg(boundary!.journey!).kind).toBe('water');
    expect(isJourney(boundary!.journey, boundary!.currentCityId, boundary!.phase)).toBe(true);
  });
  it('returns safely from wolves after three days with one morale lost and cargo retained', () => {
    const state = acknowledgeTravelCg(eventState('wolves'));
    const result = resolveTravelEvent(state, 'safe');
    expect(result.date).toEqual(advanceDays(state.date, 3));
    expect(result.morale).toBe(state.morale - 1);
    expect(result.economy).toBe(state.economy);
    expect(result.journey?.event).toBeUndefined();
  });
  it('starts persistent wolf ambush and pays only actual fighters once after victory', () => {
    const state = acknowledgeTravelCg(eventState('wolves'));
    const battle = resolveTravelEvent(state, 'fight');
    expect(battle.phase).toBe('battle');
    expect(battle.encounter).toBe('ambush');
    expect(battle.journey?.event).toMatchObject({ kind: 'wolves', cgSeen: true, inBattle: true });
    expect(isJourney(battle.journey, battle.currentCityId, battle.phase)).toBe(true);
    const recorded = { ...battle, battleParty: ['traveler'], deployed: ['traveler', 'aman'] };
    const won = finishTravelBattle(recorded, true);
    expect(won.economy.coins).toBe(recorded.economy.coins + 20);
    expect(won.party.traveler).not.toEqual(recorded.party.traveler);
    expect(won.party.aman).toEqual(recorded.party.aman);
    expect(won.party['chen-da']).toEqual(recorded.party['chen-da']);
    expect(won.date).toEqual(advanceDays(battle.date, 1));
    expect(won.journey?.path).toEqual(battle.journey?.path);
    expect(won.travelNotice).toContain('狼');
    expect(finishTravelBattle(won, true)).toBe(won);
    const lost = finishTravelBattle(recorded, false);
    expect(lost.economy).toBe(recorded.economy);
    expect(lost.party).toEqual(recorded.party);
    expect(lost.date).toEqual(advanceDays(recorded.date, 3));
    expect(lost.morale).toBe(recorded.morale - 1);
  });
  it('adds twenty coins only to one-day city work, preserving longer rest rewards', () => {
    const state = cityState();
    expect(restInCity(state, 1).economy.coins).toBe(state.economy.coins + 20);
    expect(restInCity(state, 1).supplies).toBe(state.supplies + 1);
    for (const days of [30, 360]) {
      expect(restInCity(state, days).economy).toEqual(state.economy);
      expect(restInCity(state, days).supplies).toBe(state.supplies + 3);
    }
  });
  it('cannot farm work rewards when the calendar cannot advance', () => {
    const state = { ...cityState(), date: { year: 280, month: 12, day: 30 } };
    expect(restInCity(state, 1)).toBe(state);
  });
  it('keeps coins within safe integers for work and wolf rewards', () => {
    const state = cityState();
    const rich = { ...state, economy: { ...state.economy, coins: Number.MAX_SAFE_INTEGER - 1 } };
    expect(restInCity(rich, 1).economy.coins).toBe(Number.MAX_SAFE_INTEGER);
    const wolves = acknowledgeTravelCg(eventState('wolves'));
    const battle = resolveTravelEvent({ ...wolves, economy: rich.economy }, 'fight');
    expect(finishTravelBattle(battle, true).economy.coins).toBe(Number.MAX_SAFE_INTEGER);
  });
});
