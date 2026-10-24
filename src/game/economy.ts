import type { GameState } from './state';
import { isGameDate, type GameDate } from './history';
import { EXPANSION_CITY_IDS, WORLD_CITIES } from './world';

export type GoodId = 'grain' | 'cloth' | 'salt' | 'iron' | 'pottery' | 'tea' | 'herbs' | 'silk' | 'wine' | 'leather';
export interface MarketNews { id: string; cityId: string; goodId: GoodId; change: number; fromDay: number; untilDay: number; reason: string }
export interface TradeRecord { cityId: string; date: GameDate; goodId: GoodId; quantity: number; side: 'buy' | 'sell'; unitPrice: number; amount: number; profit: number }
export interface Economy {
  coins: number; capacity: number;
  cargo: Partial<Record<GoodId, { quantity: number; cost: number }>>;
  markets: Record<string, { period: number; stock: Record<GoodId, number> }>;
  news: MarketNews[]; ledger: TradeRecord[]; profit: number;
}
export const GOODS: readonly { id: GoodId; name: string; basePrice: number; image: string }[] = [
  { id: 'grain', name: '粟米', basePrice: 12, image: '/assets/goods/grain-v1.png' }, { id: 'cloth', name: '粗布', basePrice: 24, image: '/assets/goods/cloth-v1.png' },
  { id: 'salt', name: '盐', basePrice: 20, image: '/assets/goods/salt-v1.png' }, { id: 'iron', name: '铁器', basePrice: 60, image: '/assets/goods/iron-v1.png' },
  { id: 'pottery', name: '陶器', basePrice: 28, image: '/assets/goods/pottery-v1.png' }, { id: 'tea', name: '茶叶', basePrice: 36, image: '/assets/goods/tea-v1.png' },
  { id: 'herbs', name: '药材', basePrice: 32, image: '/assets/goods/herbs-v1.png' }, { id: 'silk', name: '丝绸', basePrice: 90, image: '/assets/goods/silk-v1.png' },
  { id: 'wine', name: '米酒', basePrice: 44, image: '/assets/goods/wine-v1.png' }, { id: 'leather', name: '皮革', basePrice: 48, image: '/assets/goods/leather-v1.png' },
];

/** Gameplay specialties and demand, rather than reconstructed historical city prices. */
const CITY_GOODS: Record<string, Partial<Record<GoodId, number>>> = {
  yingchuan: { grain: .7, cloth: .8, herbs: 1.25 }, runan: { grain: .65, iron: 1.3 },
  nanyang: { pottery: .7, grain: .8, silk: 1.25 }, zhuo: { grain: .8, salt: 1.4, tea: 1.4, leather: .7, wine: 1.35 },
  henan: { pottery: .8, silk: 1.3, tea: 1.3 }, dongjun: { grain: .75, cloth: .8 },
  donghai: { salt: .7, tea: 1.25 }, beihai: { salt: .65, cloth: .8, herbs: 1.25 },
  julu: { cloth: .7, grain: .8, tea: 1.3 }, taiyuan: { iron: .65, salt: 1.5, tea: 1.4, leather: .75, wine: 1.25 },
  wuwei: { iron: .8, silk: 1.5, tea: 1.45, grain: 1.3, leather: .65, wine: 1.4 }, shujun: { silk: .65, tea: .75, salt: 1.25, wine: .75 },
  changsha: { tea: .7, herbs: .8, iron: 1.25, wine: .7 }, wujun: { silk: .7, salt: .8, iron: 1.2, wine: .75, leather: 1.35 },
  danyang: { silk: .75, tea: .8, iron: 1.25 }, nanhai: { salt: .65, herbs: .8, silk: 1.2, leather: 1.4 },
  changan: { pottery: .75, silk: 1.4, herbs: 1.25 }, chenliu: { grain: .75, cloth: .8, tea: 1.2 },
  xuxian: { grain: .7, pottery: .8, silk: 1.25 }, ye: { cloth: .7, grain: .8, tea: 1.3 },
  ji: { grain: .8, salt: 1.4, tea: 1.45, leather: .75 }, linzi: { salt: .7, cloth: .8, herbs: 1.2 },
  xiangyang: { pottery: .75, cloth: .8, salt: 1.2, wine: .8 }, jiangling: { grain: .75, tea: .8, iron: 1.25, wine: .75, leather: 1.25 },
  nanzheng: { herbs: .65, iron: 1.3, salt: 1.3 }, jiangzhou: { herbs: .7, tea: .75, cloth: 1.25 },
  guangling: { salt: .75, pottery: .8, herbs: 1.25 }, nanchang: { tea: .65, silk: .8, iron: 1.25 },
  shanyin: { salt: .7, silk: .75, herbs: 1.2 }, quanling: { herbs: .65, tea: .8, cloth: 1.3 },
  chen: { herbs: .7, iron: .8, silk: 1.25 }, guangxin: { herbs: .7, salt: .8, cloth: 1.3 },
  jincheng: { iron: .75, silk: 1.4, salt: 1.35 }, didao: { herbs: .7, iron: .8, silk: 1.4 },
  shouchun: { grain: .7, wine: .8, silk: 1.25 }, xiapi: { cloth: .75, pottery: .8, iron: 1.25 },
  moling:{ silk:.75, pottery:.8, iron:1.25 }, chaisang:{ tea:.7, grain:.8, silk:1.2 }, echeng:{ grain:.75, pottery:.8, iron:1.2 },
  hefei:{ grain:.7, cloth:.8, silk:1.25 }, shu:{ tea:.75, herbs:.8, iron:1.25 }, nanpi:{ cloth:.7, salt:.8, tea:1.3 },
  pingyuan:{ grain:.7, cloth:.8, silk:1.25 }, xiangping:{ leather:.65, iron:.8, tea:1.45 }, zhending:{ iron:.75, grain:.8, tea:1.3 },
  lu:{ iron:.65, herbs:.8, salt:1.35 }, anyi:{ salt:.65, grain:.8, silk:1.25 }, hongnong:{ pottery:.75, herbs:.8, silk:1.3 },
  suiyang:{ grain:.7, wine:.8, iron:1.2 }, pei:{ cloth:.75, grain:.8, tea:1.25 }, jixian:{ herbs:.7, leather:.8, silk:1.35 },
  linjing:{ leather:.75, grain:.8, tea:1.4 }, xiabian:{ herbs:.65, iron:.8, salt:1.3 }, shangyong:{ herbs:.7, grain:.8, cloth:1.25 },
  zitong:{ herbs:.75, pottery:.8, salt:1.25 }, fuxian:{ silk:.7, wine:.8, iron:1.2 }, yufu:{ salt:.75, tea:.8, cloth:1.25 },
  dianchi:{ leather:.7, herbs:.75, iron:1.35 }, linyuan:{ herbs:.7, grain:.8, silk:1.25 }, yiling:{ tea:.7, herbs:.8, iron:1.25 },
};
const CITY_IDS = new Set(WORLD_CITIES.map(city => city.id));
const GOOD_IDS = new Set<string>(GOODS.map(good => good.id));
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const nonnegative = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const positive = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) > 0;
const dayNumber = (date: GameDate): number => ((date.year - 184) * 12 + date.month - 1) * 30 + (date.day ?? 1) - 1;

function specialty(cityId: string, goodId: GoodId): boolean { return (CITY_GOODS[cityId]?.[goodId] ?? 1) <= .8; }
function initialMarket(cityId: string, period: number): Economy['markets'][string] {
  return { period, stock: Object.fromEntries(GOODS.map(good => [good.id, specialty(cityId, good.id) ? 80 : 30])) as Record<GoodId, number> };
}
/** Hash IDs, never array positions: changing UI order cannot change a city's quotes. */
function hash(text: string): number {
  let value = 2166136261;
  for (const character of text) value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0;
  return value;
}

export function createEconomy(): Economy {
  return { coins: 600, capacity: 40, cargo: {}, markets: Object.fromEntries(WORLD_CITIES.map(city => [city.id, initialMarket(city.id, 0)])), news: [], ledger: [], profit: 0 };
}

export function isMarketNews(value: unknown): value is MarketNews {
  if (!isObject(value)) return false;
  return typeof value.id === 'string' && value.id.length > 0 && value.id.length < 200 &&
    typeof value.cityId === 'string' && CITY_IDS.has(value.cityId) && typeof value.goodId === 'string' && GOOD_IDS.has(value.goodId) &&
    (value.change === .2 || value.change === -.2) && nonnegative(value.fromDay) && nonnegative(value.untilDay) && value.untilDay - value.fromDay === 30 &&
    typeof value.reason === 'string' && value.reason.trim().length > 0 && value.reason.length < 1000;
}

function isTradeRecord(value: unknown): value is TradeRecord {
  if (!isObject(value)) return false;
  return typeof value.cityId === 'string' && CITY_IDS.has(value.cityId) && isGameDate(value.date) &&
    typeof value.goodId === 'string' && GOOD_IDS.has(value.goodId) && positive(value.quantity) &&
    (value.side === 'buy' || value.side === 'sell') && positive(value.unitPrice) && positive(value.amount) &&
    BigInt(value.unitPrice) * BigInt(value.quantity) === BigInt(value.amount) && Number.isSafeInteger(value.profit) &&
    (value.side !== 'buy' || value.profit === 0);
}

export function isEconomy(value: unknown): value is Economy {
  if (!isObject(value) || !nonnegative(value.coins) || !positive(value.capacity) || !Number.isSafeInteger(value.profit) || !isObject(value.cargo) || !isObject(value.markets)) return false;
  let used = 0;
  for (const [id, cargo] of Object.entries(value.cargo)) {
    if (!GOOD_IDS.has(id) || !isObject(cargo) || !nonnegative(cargo.quantity) || !nonnegative(cargo.cost) || cargo.quantity === 0 && cargo.cost !== 0) return false;
    used += cargo.quantity;
    if (!Number.isSafeInteger(used) || used > value.capacity) return false;
  }
  for (const [id, market] of Object.entries(value.markets)) {
    if (!CITY_IDS.has(id) || !isObject(market) || !nonnegative(market.period) || !isObject(market.stock) || Object.keys(market.stock).length !== GOODS.length) return false;
    if (!GOODS.every(good => nonnegative((market.stock as Record<string, unknown>)[good.id]))) return false;
  }
  if (!Array.isArray(value.news) || !value.news.every(isMarketNews) || !Array.isArray(value.ledger) || value.ledger.length > 20 || !value.ledger.every(isTradeRecord)) return false;
  const news = value.news as MarketNews[];
  return new Set(news.map(message => message.id)).size === news.length && new Set(news.map(message => `${message.cityId}:${message.goodId}`)).size === news.length;
}

/** Only the complete 0.4.0 eight-good stock shape may gain the two new keys. */
export function migrateEconomy(value: unknown): Economy | null {
  if (isEconomy(value)) {
    const missing = EXPANSION_CITY_IDS.filter(id => !Object.hasOwn(value.markets,id));
    return missing.length ? { ...value, markets: { ...value.markets, ...Object.fromEntries(missing.map(id => [id,initialMarket(id,0)])) } } : value;
  }
  if (!isObject(value) || !isObject(value.markets)) return null;
  const legacyIds = ['grain', 'cloth', 'salt', 'iron', 'pottery', 'tea', 'herbs', 'silk'];
  const markets: Record<string, unknown> = {};
  for (const [cityId, market] of Object.entries(value.markets)) {
    if (!isObject(market) || !isObject(market.stock) || !nonnegative(market.period)) return null;
    const keys = Object.keys(market.stock);
    if (keys.length === GOODS.length) markets[cityId] = market;
    else if (keys.length === legacyIds.length && legacyIds.every(id => Object.hasOwn(market.stock!, id))) {
      markets[cityId] = { ...market, stock: { ...initialMarket(cityId, market.period).stock, ...market.stock } };
    } else return null;
  }
  const migrated = { ...value, markets };
  return isEconomy(migrated) ? migrateEconomy(migrated) : null;
}

export function marketQuote(economy: Economy, cityId: string, date: GameDate, goodId: GoodId): { buy: number; sell: number; stock: number; specialty: boolean } {
  const good = GOODS.find(candidate => candidate.id === goodId);
  if (!CITY_IDS.has(cityId) || !good || !isGameDate(date)) throw new Error('无效的城市、商品或日期。');
  const day = dayNumber(date), period = Math.floor(day / 7);
  const cityOffset = 1 + (hash(`${cityId}:${goodId}:city`) % 17 - 8) / 100;
  const periodOffset = 1 + (hash(`${cityId}:${goodId}:${period}`) % 21 - 10) / 100;
  const message = economy.news.find(message => message.cityId === cityId && message.goodId === goodId && message.fromDay <= day && day < message.untilDay);
  const buy = Math.max(1, Math.round(good.basePrice * (CITY_GOODS[cityId]?.[goodId] ?? 1) * cityOffset * periodOffset * (1 + (message?.change ?? 0))));
  const market = economy.markets[cityId];
  return { buy, sell: Math.max(1, Math.floor(buy * .9)), stock: market?.period === period ? market.stock[goodId] : specialty(cityId, goodId) ? 80 : 30, specialty: specialty(cityId, goodId) };
}

export function cargoUsed(economy: Economy): number { return Object.values(economy.cargo).reduce((sum, cargo) => sum + cargo.quantity, 0); }

export function applyMarketNews(economy: Economy, news: MarketNews): Economy {
  if (!isMarketNews(news) || economy.news.some(message => message.id === news.id)) return economy;
  return { ...economy, news: [...economy.news.filter(message => message.cityId !== news.cityId || message.goodId !== news.goodId), { ...news }] };
}

/** Every refusal returns the identical state, without refreshing stock or consuming time. */
export function tradeGoods(state: GameState, goodId: GoodId, quantity: number, side: 'buy' | 'sell'): GameState {
  if (state.phase !== 'overworld' || state.journey || !GOOD_IDS.has(goodId) || !positive(quantity) || !['buy', 'sell'].includes(side) || !CITY_IDS.has(state.currentCityId) || !isGameDate(state.date) || !isEconomy(state.economy)) return state;
  const economy = state.economy;
  const quote = marketQuote(economy, state.currentCityId, state.date, goodId);
  const unitPrice = side === 'buy' ? quote.buy : quote.sell;
  const amount = unitPrice * quantity;
  if (!positive(amount)) return state;
  const held = economy.cargo[goodId] ?? { quantity: 0, cost: 0 };
  if (side === 'buy' && (amount > economy.coins || quantity > quote.stock || cargoUsed(economy) + quantity > economy.capacity)) return state;
  if (side === 'sell' && quantity > held.quantity) return state;
  // Integer basis allocation keeps partial sales conservative and the last sale exact.
  const basis = side === 'sell' ? Number(BigInt(held.cost) * BigInt(quantity) / BigInt(held.quantity)) : 0;
  const profit = side === 'sell' ? amount - basis : 0;
  const coins = economy.coins + (side === 'buy' ? -amount : amount);
  const cost = side === 'buy' ? held.cost + amount : held.cost - basis;
  const nextQuantity = held.quantity + (side === 'buy' ? quantity : -quantity);
  const stock = quote.stock + (side === 'buy' ? -quantity : quantity);
  const totalProfit = economy.profit + profit;
  if (![coins, cost, nextQuantity, stock].every(nonnegative) || !Number.isSafeInteger(totalProfit)) return state;
  const cargo = { ...economy.cargo };
  if (nextQuantity) cargo[goodId] = { quantity: nextQuantity, cost };
  else delete cargo[goodId];
  const period = Math.floor(dayNumber(state.date) / 7);
  const previousMarket = economy.markets[state.currentCityId];
  const market = previousMarket?.period === period ? previousMarket : initialMarket(state.currentCityId, period);
  const record: TradeRecord = { cityId: state.currentCityId, date: { ...state.date }, goodId, quantity, side, unitPrice, amount, profit };
  return { ...state, economy: { ...economy, coins, cargo, profit: totalProfit,
    markets: { ...economy.markets, [state.currentCityId]: { period, stock: { ...market.stock, [goodId]: stock } } },
    ledger: [...economy.ledger, record].slice(-20) } };
}
