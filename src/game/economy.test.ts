import { describe, expect, it } from 'vitest';
import { applyMarketNews, cargoUsed, createEconomy, GOODS, isEconomy, marketQuote, tradeGoods, type GoodId, type MarketNews } from './economy';
import { advanceDays, type GameDate } from './history';
import { createInitialState, type GameState } from './state';
import { WORLD_CITIES, planRoute } from './world';

const date: GameDate = { year: 184, month: 3, day: 1 };
function stateAt(city = 'beihai'): GameState { return { ...createInitialState(() => 0), phase: 'overworld', currentCityId: city, date }; }
function news(patch: Partial<MarketNews> = {}): MarketNews {
  return { id: 'news-1', cityId: 'beihai', goodId: 'salt', change: .2, fromDay: 60, untilDay: 90, reason: '商旅急需盐货', ...patch };
}

describe('city economy', () => {
  it('starts with ten priced goods,600coins and an empty40slot hold', () => {
    const economy = createEconomy();
    expect(GOODS.map(g => g.basePrice)).toEqual([12, 24, 20, 60, 28, 36, 32, 90, 44, 48]);
    expect(new Set(GOODS.map(g => g.id)).size).toBe(10);
    expect(economy).toMatchObject({ coins: 600, capacity: 40, cargo: {}, ledger: [], news: [], profit: 0 });
    expect(cargoUsed(economy)).toBe(0);
    expect(isEconomy(economy)).toBe(true);
  });
  it('buys immutably, stores the actual price as cost, and charges no game time', () => {
    const before = stateAt();
    const quote = marketQuote(before.economy, before.currentCityId, before.date, 'salt');
    const after = tradeGoods(before, 'salt', 5, 'buy');
    expect(after.economy.coins).toBe(600 - 5 * quote.buy);
    expect(after.economy.cargo.salt).toEqual({ quantity: 5, cost: 5 * quote.buy });
    expect(marketQuote(after.economy, 'beihai', date, 'salt').stock).toBe(quote.stock - 5);
    expect(after.economy.ledger).toEqual([{ cityId: 'beihai', date, goodId: 'salt', quantity: 5, side: 'buy', unitPrice: quote.buy, amount: quote.buy * 5, profit: 0 }]);
    expect(before.economy).toEqual(createEconomy());
    expect(after.date).toEqual(before.date);
    expect(after.supplies).toBe(before.supplies);
  });
  it('realizes exact allocated cost and restores stock; selling all clears remaining basis', () => {
    let state = stateAt();
    state = tradeGoods(state, 'salt', 3, 'buy');
    state = { ...state, economy: applyMarketNews(state.economy, news()) };
    state = tradeGoods(state, 'salt', 2, 'buy');
    const basis = state.economy.cargo.salt!.cost;
    const quote = marketQuote(state.economy, 'beihai', date, 'salt');
    const after = tradeGoods(state, 'salt', 2, 'sell');
    const releasedBasis = Math.floor(basis * 2 / 5);
    expect(after.economy.cargo.salt).toEqual({ quantity: 3, cost: basis - releasedBasis });
    expect(after.economy.profit).toBe(quote.sell * 2 - releasedBasis);
    expect(after.economy.coins).toBe(state.economy.coins + quote.sell * 2);
    expect(marketQuote(after.economy, 'beihai', date, 'salt').stock).toBe(quote.stock + 2);
    const finished = tradeGoods(after, 'salt', 3, 'sell');
    expect(finished.economy.cargo.salt).toBeUndefined();
    expect(finished.economy.profit).toBe(quote.sell * 5 - basis);
    expect(isEconomy(finished.economy)).toBe(true);
  });
  it('has a 90percent spread, preventing an immediate same-city profit', () => {
    for (const good of GOODS) {
      const before = stateAt();
      const quote = marketQuote(before.economy, 'beihai', date, good.id);
      expect(quote.sell).toBe(Math.max(1, Math.floor(quote.buy * .9)));
      expect(tradeGoods(tradeGoods(before, good.id, 1, 'buy'), good.id, 1, 'sell').economy.coins).toBeLessThan(600);
    }
  });
  it('refuses invalid quantities, sides, goods, unaffordable trades and excess cargo', () => {
    const state = stateAt();
    for (const quantity of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) expect(tradeGoods(state, 'salt', quantity, 'buy')).toBe(state);
    expect(tradeGoods(state, 'salt', 1, 'sell')).toBe(state);
    expect(tradeGoods(state, 'salt', 41, 'buy')).toBe(state);
    expect(tradeGoods(state, 'silk', 30, 'buy')).toBe(state);
    expect(tradeGoods(state, 'invalid' as GoodId, 1, 'buy')).toBe(state);
    expect(tradeGoods(state, 'salt', 1, 'invalid' as 'buy')).toBe(state);
    const poor = { ...state, economy: { ...state.economy, coins: 0 } };
    expect(tradeGoods(poor, 'salt', 1, 'buy')).toBe(poor);
    const full = { ...state, economy: { ...state.economy, cargo: { grain: { quantity: 40, cost: 40 } } } };
    expect(tradeGoods(full, 'salt', 1, 'buy')).toBe(full);
  });
  it('refuses transactions whose money, stock, basis or realized profit would overflow', () => {
    const base = stateAt();
    for (const economy of [
      { ...base.economy, coins: Number.MAX_SAFE_INTEGER, cargo: { salt: { quantity: 1, cost: 1 } } },
      { ...base.economy, profit: Number.MAX_SAFE_INTEGER, cargo: { salt: { quantity: 1, cost: 0 } } },
      { ...base.economy, coins: Number.MAX_SAFE_INTEGER, cargo: { salt: { quantity: 1, cost: Number.MAX_SAFE_INTEGER } } },
    ]) {
      const state = { ...base, economy };
      expect(tradeGoods(state, 'salt', 1, economy.cargo.salt.cost === Number.MAX_SAFE_INTEGER ? 'buy' : 'sell')).toBe(state);
    }
    const bought = tradeGoods(base, 'salt', 1, 'buy');
    bought.economy.markets.beihai.stock.salt = Number.MAX_SAFE_INTEGER;
    expect(tradeGoods(bought, 'salt', 1, 'sell')).toBe(bought);
  });
  it('locks all trade while travelling, viewing an event, in battle or outside the world', () => {
    const base = stateAt();
    const journey = { path: ['beihai', 'linzi'], legIndex: 0, legDay: 0, elapsed: 0, seed: 1, serial: 1 };
    for (const state of [{ ...base, journey }, { ...base, journey: { ...journey, event: { id: 1, kind: 'merchant' as const } } }, { ...base, phase: 'battle' as const }, { ...base, phase: 'prologue' as const }]) {
      expect(tradeGoods(state, 'salt', 1, 'buy')).toBe(state);
    }
  });
  it('keeps only the latest20trade records in chronological order', () => {
    let state = stateAt();
    for (let i = 0; i < 12; i++) { state = tradeGoods(state, 'salt', 1, 'buy'); state = tradeGoods(state, 'salt', 1, 'sell'); }
    expect(state.economy.ledger).toHaveLength(20);
    expect(state.economy.ledger.at(-1)?.side).toBe('sell');
    expect(state.economy.ledger.reduce((sum, record) => sum + record.profit, 0)).toBeLessThan(0);
  });
});

describe('market periods and city differences', () => {
  it('covers all sixty cities with every good, specialty stock 80 and other stock 30', () => {
    const economy = createEconomy();
    expect(WORLD_CITIES).toHaveLength(60);
    expect(Object.keys(economy.markets).sort()).toEqual(WORLD_CITIES.map(c => c.id).sort());
    for (const city of WORLD_CITIES) for (const good of GOODS) {
      const quote = marketQuote(economy, city.id, date, good.id);
      expect(Number.isSafeInteger(quote.buy) && quote.buy > 0).toBe(true);
      expect(quote.stock).toBe(quote.specialty ? 80 : 30);
      expect(quote.sell).toBe(Math.floor(quote.buy * .9));
    }
  });
  it('depletes stock within a period, survives reload, and refreshes exactly on day7', () => {
    const base = { ...stateAt(), date: { year: 184, month: 1, day: 1 } };
    const bought = tradeGoods(base, 'salt', 5, 'buy');
    expect(marketQuote(bought.economy, 'beihai', advanceDays(base.date, 6), 'salt').stock).toBe(75);
    expect(marketQuote(bought.economy, 'beihai', advanceDays(base.date, 7), 'salt').stock).toBe(80);
    const reloaded = JSON.parse(JSON.stringify(bought)) as GameState;
    expect(isEconomy(reloaded.economy)).toBe(true);
    expect(marketQuote(reloaded.economy, 'beihai', base.date, 'salt')).toEqual(marketQuote(bought.economy, 'beihai', base.date, 'salt'));
    expect(marketQuote(reloaded.economy, 'beihai', advanceDays(base.date, 7), 'salt')).toEqual(marketQuote(createEconomy(), 'beihai', advanceDays(base.date, 7), 'salt'));
    const next = tradeGoods({ ...reloaded, date: advanceDays(base.date, 7) }, 'salt', 1, 'buy');
    expect(marketQuote(next.economy, 'beihai', next.date, 'salt').stock).toBe(79);
    expect(marketQuote(next.economy, 'linzi', next.date, 'salt').stock).toBe(80);
  });
  it.each([['beihai', 'taiyuan', 'salt'], ['shujun', 'wuwei', 'silk']] as const)('earns money carrying%s goods to%s after the actual route duration', (from, to, good) => {
    const before = stateAt(from);
    const bought = tradeGoods(before, good, 5, 'buy');
    const days = planRoute(from, to)!.days;
    const arrived = { ...bought, currentCityId: to, date: advanceDays(before.date, days) };
    const sold = tradeGoods(arrived, good, 5, 'sell');
    expect(sold.economy.coins).toBeGreaterThan(600);
    expect(sold.economy.profit).toBe(sold.economy.coins - 600);
    expect(sold.economy.cargo[good]).toBeUndefined();
  });
});

describe('market news and persistence validation', () => {
  it('applies only during its30day window to the specified city and good', () => {
    const economy = createEconomy();
    const updated = applyMarketNews(economy, news());
    const base = marketQuote(economy, 'beihai', date, 'salt');
    expect(marketQuote(updated, 'beihai', date, 'salt').buy).toBeGreaterThan(base.buy);
    expect(marketQuote(updated, 'beihai', advanceDays(date, 29), 'salt').buy).toBeGreaterThan(marketQuote(economy, 'beihai', advanceDays(date, 29), 'salt').buy);
    expect(marketQuote(updated, 'beihai', advanceDays(date, 30), 'salt')).toEqual(marketQuote(economy, 'beihai', advanceDays(date, 30), 'salt'));
    expect(marketQuote(updated, 'beihai', { year: 184, month: 2, day: 30 }, 'salt')).toEqual(marketQuote(economy, 'beihai', { year: 184, month: 2, day: 30 }, 'salt'));
    expect(marketQuote(updated, 'beihai', date, 'cloth')).toEqual(marketQuote(economy, 'beihai', date, 'cloth'));
    expect(marketQuote(updated, 'linzi', date, 'salt')).toEqual(marketQuote(economy, 'linzi', date, 'salt'));
    expect(updated.news).toHaveLength(1);
    expect(economy.news).toHaveLength(0);
  });
  it('replaces matching news and never stacks or reapplies an identical message', () => {
    const first = applyMarketNews(createEconomy(), news());
    expect(applyMarketNews(first, news())).toBe(first);
    const second = applyMarketNews(first, news({ id: 'news-2', change: -.2, reason: '新货到港' }));
    expect(second.news).toEqual([news({ id: 'news-2', change: -.2, reason: '新货到港' })]);
    expect(marketQuote(second, 'beihai', date, 'salt').buy).toBeLessThan(marketQuote(createEconomy(), 'beihai', date, 'salt').buy);
    expect(isEconomy(second)).toBe(true);
  });
  it('rejects malformed news, unknown IDs, unsafe numbers, excess cargo and malformed logs', () => {
    const economy = createEconomy();
    for (const malformed of [news({ cityId: 'fake' }), news({ goodId: 'fake' as GoodId }), news({ change: Infinity }), news({ change: 2 }), news({ untilDay: 60 }), news({ untilDay: 91 }), news({ fromDay: -1 }), news({ reason: '' })]) {
      expect(applyMarketNews(economy, malformed)).toBe(economy);
      expect(isEconomy({ ...economy, news: [malformed] })).toBe(false);
    }
    for (const patch of [{ coins: -1 }, { coins: Number.MAX_SAFE_INTEGER + 1 }, { capacity: 0 }, { cargo: { fake: { quantity: 1, cost: 1 } } }, { cargo: { salt: { quantity: 41, cost: 1 } } }, { cargo: { salt: { quantity: 0, cost: 1 } } }, { cargo: { salt: { quantity: 1, cost: .5 } } }, { markets: { fake: { period: 0, stock: {} } } }, { ledger: [{}] }, { profit: Infinity }]) expect(isEconomy({ ...economy, ...patch })).toBe(false);
  });
});
