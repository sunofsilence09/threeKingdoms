import type { GameState } from './state';
import type { ConflictArmy } from './worldConflictTypes';
import { CITY_ECONOMY_BASES } from './cityEconomyData';
import { serviceForPerson } from './cityService';
import { RECRUIT_PROFILES } from './recruitmentCatalog';
import { isAliveAt } from './personLife';
import { advanceDays } from './history';
import { withWorldDate } from './worldTime';
export interface Resources {
    coins: number;
    grain: number;
}
export interface MonthSettlement {
    day: number;
    due: Resources;
    paid: Resources;
    shortfall: Resources;
    income: Resources;
    recruited: number;
    recruitmentCost: number;
    recruitmentReason: string;
}
export interface SupplyStatus {
    morale: number;
    unpaidCoins: number;
    unpaidGrain: number;
}
export interface CityTreasury {
    coins: number;
    grain: number;
    commerce: number;
    agriculture: number;
    morale: number;
    factionId: string;
    records: MonthSettlement[];
}
export interface FundingNotice {
    cityId: string;
    day: number;
}
export interface CityEconomy {
    /** Persistent loss warning; action feedback may replace travelNotice independently. */
    fundingNotice?: FundingNotice;
    version: 1;
    lastDay: number;
    cities: Record<string, CityTreasury>;
    camp: SupplyStatus & {
        fundingCityId?: string;
        records: MonthSettlement[];
    };
    armies: Record<string, SupplyStatus>;
}
export interface CityFinanceSummary extends Omit<CityTreasury, 'factionId'> {
    cityId: string;
    owned: boolean;
    income: Resources;
    expenses: {
        garrison: Resources;
        expedition: Resources;
        officials: Resources;
        camp: Resources;
        total: Resources;
    };
    officialIds: string[];
    net: Resources;
    monthsRemaining: number | null;
}
export interface CampFinanceSummary {
    soldiers: number;
    companions: number;
    dueCoins: number;
    dueGrain: number;
    dueSupplies: number;
    fundingCityId?: string;
    morale: number;
    unpaidCoins: number;
    unpaidGrain: number;
    records: MonthSettlement[];
}
const dayOf = (s: GameState) => (s.date.year - 184) * 360 + (s.date.month - 1) * 30 + (s.date.day ?? 1) - 1;
const zero = (): Resources => ({ coins: 0, grain: 0 });
const add = (a: Resources, b: Resources): Resources => ({ coins: a.coins + b.coins, grain: a.grain + b.grain });
const validAmount = (v: number) => Number.isSafeInteger(v) && v > 0;
export function payroll(soldiers: number, officialIds: readonly string[]): Resources { return { coins: Math.ceil(soldiers / 100) * 20 + new Set(officialIds).size * 100, grain: Math.ceil(soldiers / 100) * 100 }; }
export function dailyMorale(morale: number, noCoins: boolean, noGrain: boolean): number { return Math.max(0, Math.min(100, noCoins || noGrain ? morale - (noCoins ? 3 : 0) - (noGrain ? 5 : 0) : morale < 80 ? morale + 1 : morale)); }
export function armyMoraleForParty(s: GameState): number { return s.cityEconomy?.camp.morale ?? 80; }
export function cityMoraleFor(s: GameState, id: string): number { const t = s.cityEconomy?.cities[id]; return t ? Math.min(t.morale, t.factionId !== s.worldConflict?.cities[id]?.factionId ? 60 : 100) : 80; }
export function campFinanceSummary(s: GameState): CampFinanceSummary {
    const soldiers = (s.worldConflict?.playerReserve ?? 0) + (s.worldConflict?.playerAssigned ?? 0) + (s.worldConflict?.armies.filter(a => a.factionId === 'player').reduce((n, a) => n + a.troops, 0) ?? 0);
    const companions = Object.keys(s.party).filter(id => id !== 'traveler' && isAliveAt(s.life, id, s.date)).length;
    const due = payroll(soldiers, []), camp = s.cityEconomy?.camp;
    const fundingCityId = camp?.fundingCityId && s.worldConflict?.cities[camp.fundingCityId]?.factionId === 'player' ? camp.fundingCityId : undefined;
    return { soldiers, companions, dueCoins: due.coins + companions * 100, dueGrain: due.grain, dueSupplies: Math.ceil(soldiers / 1000), fundingCityId, morale: camp?.morale ?? 80, unpaidCoins: camp?.unpaidCoins ?? 0, unpaidGrain: camp?.unpaidGrain ?? 0, records: camp?.records ?? [] };
}
/** Allocate the actual surviving force's rounded bill, never the original pre-casualty force. */
export function armyFunding(s: GameState, army: ConflictArmy): {
    cityId?: string;
    cost: Resources;
}[] {
    const world = s.worldConflict!, fallback = Object.keys(world.cities).sort().find(id => world.cities[id].factionId === army.factionId);
    const origins = army.contributions.length ? army.contributions : [{ cityId: army.sourceCityId, troops: army.troops }];
    const total = origins.reduce((n, c) => n + c.troops, 0), bill = payroll(army.troops, []);
    let used = zero();
    return origins.map((c, i) => { const cost = i === origins.length - 1 ? { coins: bill.coins - used.coins, grain: bill.grain - used.grain } : { coins: Math.floor(bill.coins * c.troops / Math.max(1, total)), grain: Math.floor(bill.grain * c.troops / Math.max(1, total)) }; used = add(used, cost); return { cityId: world.cities[c.cityId]?.factionId === army.factionId ? c.cityId : fallback, cost }; });
}
function officials(s: GameState): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    // Retired generated prefects cannot hold a salaried office. Avoid enumerating the
    // entire lifetime archive every month in a century-long campaign.
    const ids = new Set([...RECRUIT_PROFILES.filter(p => !p.id.startsWith('garrison:')).map(p => p.id),
        ...Object.values(s.worldConflict?.cities ?? {}).flatMap(c => c.governorId ? [c.governorId] : [])]);
    for (const id of ids) {
        const p = serviceForPerson(s, id);
        if (p && (p.kind === 'employed' || p.kind === 'governing') && isAliveAt(s.life, id, s.date, true)) (result[p.cityId] ??= []).push(id);
    }
    return result;
}
function summary(s: GameState, id: string, roster: Record<string, string[]>): CityFinanceSummary | undefined {
    const city = s.worldConflict?.cities[id];
    if (!city)
        return;
    const bases = CITY_ECONOMY_BASES[id];
    if (!bases)
        return;
    const officialIds = roster[id] ?? [], garrison = payroll(city.troops, []), officers = payroll(0, officialIds);
    const expedition = (s.worldConflict?.armies ?? []).filter(a => a.factionId !== 'player').flatMap(a => armyFunding(s, a)).filter(f => f.cityId === id).reduce((n, f) => add(n, f.cost), zero());
    const funding = campFinanceSummary(s), camp = funding.fundingCityId === id ? { coins: funding.dueCoins, grain: funding.dueGrain } : zero(), total = [garrison, officers, expedition, camp].reduce(add, zero());
    const treasury = s.cityEconomy?.cities[id] ?? { coins: Math.max(total.coins, bases[0] * 40) * 3, grain: Math.max(total.grain, bases[1] * 200) * 3, commerce: bases[0], agriculture: bases[1], morale: 80, records: [] };
    const income = { coins: treasury.commerce * 40, grain: treasury.agriculture * 200 };
    // Fixed current roster projection; optional future recruitment/development is excluded.
    const coinBurn = Math.max(0, total.coins - income.coins), grainBurn = Math.max(0, total.grain - income.grain);
    const months = treasury.coins === 0 || treasury.grain === 0 ? 0 : Math.min(coinBurn ? treasury.coins / coinBurn : Infinity, grainBurn ? treasury.grain / grainBurn : Infinity);
    return { ...treasury, morale: cityMoraleFor(s, id), cityId: id, owned: city.factionId === 'player', officialIds, income, expenses: { garrison, expedition, officials: officers, camp, total }, net: { coins: income.coins - total.coins, grain: income.grain - total.grain }, monthsRemaining: Number.isFinite(months) ? months : null };
}
export function cityFinanceSummary(s: GameState, id: string): CityFinanceSummary | undefined { return summary(s, id, officials(s)); }
export function initializeCityEconomy(s: GameState): GameState {
    if (s.cityEconomy || !s.worldConflict)
        return s;
    const roster = officials(s), cities: Record<string, CityTreasury> = {};
    for (const id of Object.keys(s.worldConflict.cities)) {
        const t = summary(s, id, roster)!;
        cities[id] = { coins: t.coins, grain: t.grain, commerce: t.commerce, agriculture: t.agriculture, morale: 80, factionId: s.worldConflict.cities[id].factionId, records: [] };
    }
    return { ...s, cityEconomy: { version: 1, lastDay: dayOf(s), cities, camp: { morale: 80, unpaidCoins: 0, unpaidGrain: 0, records: [] }, armies: Object.fromEntries(s.worldConflict.armies.map(a => [a.id, { morale: 80, unpaidCoins: 0, unpaidGrain: 0 }])) } };
}
function settlement(day: number, due: Resources, income: Resources, stock: Resources): MonthSettlement { const paid = { coins: Math.min(stock.coins, due.coins), grain: Math.min(stock.grain, due.grain) }; return { day, due, paid, income, shortfall: { coins: due.coins - paid.coins, grain: due.grain - paid.grain }, recruited: 0, recruitmentCost: 0, recruitmentReason: '预算不足，须保留一个月军饷口粮' }; }
export function reconcileCityOwnership(s: GameState): GameState {
    if (!s.cityEconomy || !s.worldConflict)
        return s;
    let next = s;
    const edit = () => { if (next === s)
        next = { ...s, cityEconomy: structuredClone(s.cityEconomy) }; return next.cityEconomy!; };
    for (const [id, c] of Object.entries(s.worldConflict.cities)) {
        const t = s.cityEconomy.cities[id];
        if (t && t.factionId !== c.factionId) {
            const n = edit().cities[id];
            n.factionId = c.factionId;
            n.morale = Math.min(60, n.morale);
        }
    }
    for (const army of s.worldConflict.armies)
        if (!s.cityEconomy.armies[army.id]) {
            const origins = army.contributions.length ? army.contributions : [{ cityId: army.sourceCityId, troops: army.troops }];
            const total = origins.reduce((sum, c) => sum + c.troops, 0);
            const morale = army.factionId === 'player' ? s.cityEconomy.camp.morale : Math.floor(origins.reduce((sum, c) => sum + cityMoraleFor(next, c.cityId) * c.troops, 0) / Math.max(1, total));
            edit().armies[army.id] = { morale, unpaidCoins: 0, unpaidGrain: 0 };
        }
    const funding = s.cityEconomy.camp.fundingCityId;
    if (funding && s.worldConflict.cities[funding]?.factionId !== 'player') {
        edit().fundingNotice = { cityId: funding, day: dayOf(s) };
        delete edit().camp.fundingCityId;
        next = { ...next, travelNotice: '供养城已失，随行军费改由个人铜钱与军需支付。' };
    }
    return next;
}
/** Called exactly once for a new date, before strategic combat. */
export function settleCityEconomyDay(input: GameState): GameState {
    let s = reconcileCityOwnership(initializeCityEconomy(input));
    if (!s.cityEconomy || s.cityEconomy.lastDay >= dayOf(s))
        return s;
    if (!s.worldConflict || s.conflictRecovery) return { ...s, cityEconomy: { ...s.cityEconomy, lastDay: dayOf(s) } };
    // Daily morale only changes scalar balances/statuses. Historic records are immutable and
    // shared until the next month appends a bounded replacement array.
    s = { ...s, cityEconomy: { ...s.cityEconomy,
        cities: Object.fromEntries(Object.entries(s.cityEconomy.cities).map(([id, t]) => [id, { ...t }])),
        camp: { ...s.cityEconomy.camp },
        armies: Object.fromEntries(Object.entries(s.cityEconomy.armies).map(([id, t]) => [id, { ...t }]))
    }, worldConflict: dayOf(s) % 30 === 0 ? structuredClone(s.worldConflict) : s.worldConflict };
    const e = s.cityEconomy!, day = dayOf(s);
    e.lastDay = day;
    for (const a of s.worldConflict!.armies)
        e.armies[a.id] ??= { morale: 80, unpaidCoins: 0, unpaidGrain: 0 };
    if (day % 30 === 0) {
        const roster = officials(s), bills = Object.keys(e.cities).map(id => summary(s, id, roster)!);
        const camp = campFinanceSummary(s);
        for (const b of bills) {
            const t = e.cities[b.cityId];
            t.coins = Math.min(Number.MAX_SAFE_INTEGER, t.coins + b.income.coins);
            t.grain = Math.min(Number.MAX_SAFE_INTEGER, t.grain + b.income.grain);
            const rec = settlement(day, b.expenses.total, b.income, t);
            t.coins -= rec.paid.coins;
            t.grain -= rec.paid.grain;
            t.records = [...t.records, rec].slice(-24);
        }
        // Deterministic payment priority: local garrison and officials, expedition ID order, then camp.
        const available: Record<string, Resources> = {};
        for (const b of bills) {
            const paid = e.cities[b.cityId].records.at(-1)!.paid;
            available[b.cityId] = { coins: Math.max(0, paid.coins - b.expenses.garrison.coins - b.expenses.officials.coins), grain: Math.max(0, paid.grain - b.expenses.garrison.grain) };
        }
        const allocate = (id: string | undefined, due: Resources): MonthSettlement => {
            const stock = id ? available[id] : zero(), r = settlement(day, due, zero(), stock);
            stock.coins -= r.paid.coins;
            stock.grain -= r.paid.grain;
            return r;
        };
        for (const a of [...s.worldConflict!.armies].filter(a => a.factionId !== 'player').sort((a, b) => a.id.localeCompare(b.id))) {
            const status = e.armies[a.id];
            status.unpaidCoins = 0;
            status.unpaidGrain = 0;
            for (const f of armyFunding(s, a)) {
                const r = allocate(f.cityId, f.cost);
                status.unpaidCoins += r.shortfall.coins;
                status.unpaidGrain += r.shortfall.grain;
            }
        }
        if (camp.fundingCityId) {
            const r = allocate(camp.fundingCityId, { coins: camp.dueCoins, grain: camp.dueGrain });
            e.camp.unpaidCoins = r.shortfall.coins;
            e.camp.unpaidGrain = r.shortfall.grain;
            r.recruitmentReason = '城市供养';
            e.camp.records = [...e.camp.records, r].slice(-24);
        }
        else {
            const r = settlement(day, { coins: camp.dueCoins, grain: camp.dueSupplies }, zero(), { coins: s.economy.coins, grain: s.supplies });
            if (r.paid.coins) s.economy = { ...s.economy, coins: s.economy.coins - r.paid.coins };
            s.supplies -= r.paid.grain;
            e.camp.unpaidCoins = r.shortfall.coins;
            e.camp.unpaidGrain = r.shortfall.grain;
            r.recruitmentReason = '个人供养（粮项为军需单位）';
            e.camp.records = [...e.camp.records, r].slice(-24);
        }
        for (const b of bills) {
            const t = e.cities[b.cityId], c = s.worldConflict!.cities[b.cityId], r = t.records.at(-1)!;
            let count = Math.min(50, 20000 - c.troops);
            while (count > 0) {
                const extra = payroll(c.troops + count, []), due = { coins: b.expenses.total.coins - b.expenses.garrison.coins + extra.coins, grain: b.expenses.total.grain - b.expenses.garrison.grain + extra.grain };
                if (t.coins - count * 2 >= due.coins && t.grain >= due.grain)
                    break;
                count--;
            }
            c.troops += count;
            s.worldConflict!.ledger.recruited += count;
            t.coins -= count * 2;
            r.recruited = count;
            r.recruitmentCost = count * 2;
            if (count)
                r.recruitmentReason = `预算募兵${count}人`;
            else if (c.troops >= 20000)
                r.recruitmentReason = '守军已满';
        }
    }
    for (const t of Object.values(e.cities))
        t.morale = dailyMorale(t.morale, t.coins === 0, t.grain === 0);
    const fc = e.camp.fundingCityId ? e.cities[e.camp.fundingCityId] : undefined;
    e.camp.morale = dailyMorale(e.camp.morale, e.camp.unpaidCoins > 0 || !!fc && fc.coins === 0, e.camp.unpaidGrain > 0 || !!fc && fc.grain === 0);
    for (const a of s.worldConflict!.armies) {
        const status = e.armies[a.id];
        if (a.factionId === 'player') {
            status.morale = e.camp.morale;
            continue;
        }
        const funding = armyFunding(s, a);
        status.morale = dailyMorale(status.morale, status.unpaidCoins > 0 || funding.some(f => !f.cityId || e.cities[f.cityId].coins === 0), status.unpaidGrain > 0 || funding.some(f => !f.cityId || e.cities[f.cityId].grain === 0));
    }
    for (const id of Object.keys(e.armies))
        if (!s.worldConflict!.armies.some(a => a.id === id))
            delete e.armies[id];
    return s;
}
function manageable(s: GameState, id: string): boolean { return s.phase === 'overworld' && !s.journey && !s.activeBattle && !s.encounter && !s.conflictRecovery && s.worldConflict?.cities[id]?.factionId === 'player'; }
export function donateCityCoins(s: GameState, id: string, amount: number): GameState { if (!manageable(s, id) || !validAmount(amount) || amount > s.economy.coins)
    return s; const n = initializeCityEconomy(s), e = structuredClone(n.cityEconomy!); if (!Number.isSafeInteger(e.cities[id].coins + amount))
    return s; e.cities[id].coins += amount; return { ...n, cityEconomy: e, economy: { ...s.economy, coins: s.economy.coins - amount }, travelNotice: `已向府库捐资${amount}铜钱。` }; }
export function purchaseCityGrain(s: GameState, id: string, coins: number): GameState { if (!manageable(s, id) || !validAmount(coins))
    return s; const n = initializeCityEconomy(s), e = structuredClone(n.cityEconomy!), t = e.cities[id]; if (t.coins < coins || !Number.isSafeInteger(t.grain + coins * 5))
    return s; t.coins -= coins; t.grain += coins * 5; return { ...n, cityEconomy: e, travelNotice: `府库花费${coins}铜钱购入${coins * 5}粮草。` }; }
export function setCampFundingCity(s: GameState, id: string | undefined): GameState { if (s.phase !== 'overworld' || s.journey || s.activeBattle || s.encounter || id !== undefined && !manageable(s, id))
    return s; const n = initializeCityEconomy(s); if (!n.cityEconomy)
    return s; const e = structuredClone(n.cityEconomy); e.camp.fundingCityId = id; delete e.fundingNotice; return { ...n, cityEconomy: e, travelNotice: id ? '随行军队已改由城市供养，下月按新来源结算。' : '随行军队已改由个人供养，下月按新来源结算。' }; }
export function developCity(s: GameState, id: string, kind: 'commerce' | 'agriculture'): GameState { if (!manageable(s, id) || !['commerce', 'agriculture'].includes(kind))
    return s; const n = initializeCityEconomy(s), e = structuredClone(n.cityEconomy!), t = e.cities[id], date = advanceDays(s.date, 10); if (t.coins < 1000 || t[kind] >= 100 || dayOf({ ...s, date }) - dayOf(s) !== 10)
    return s; t.coins -= 1000; let next = withWorldDate({ ...n, cityEconomy: e }, date); if (next.worldConflict?.cities[id]?.factionId !== 'player' || next.worldConflict.cities[id].occupationDay > dayOf(s))
    return { ...next, travelNotice: '发展期间城池失守，工程未能完成，已付资金不退还。' }; const result = structuredClone(next.cityEconomy!); result.cities[id][kind] = Math.min(100, result.cities[id][kind] + 5); return { ...next, cityEconomy: result, travelNotice: `耗时10日，${kind === 'commerce' ? '商业' : '农业'}提升5。` }; }
/** Acknowledgment never advances time or changes payment/resource state. */
export function acknowledgeFundingNotice(s: GameState): GameState {
    if (!s.cityEconomy?.fundingNotice) return s;
    const cityEconomy = { ...s.cityEconomy };
    delete cityEconomy.fundingNotice;
    return { ...s, cityEconomy };
}
function isFundingNotice(value: unknown, s: GameState): value is FundingNotice {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const notice = value as Partial<FundingNotice>;
    return typeof notice.cityId === 'string' && Object.hasOwn(CITY_ECONOMY_BASES, notice.cityId)
        && Number.isSafeInteger(notice.day) && notice.day! >= 0 && notice.day! <= dayOf(s);
}
/** Finance corruption is isolated by loadState; full campaign data remains recoverable. */
export function isCityEconomy(value: unknown, s: GameState): value is CityEconomy {
    const obj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
    const amount = (x: unknown) => Number.isSafeInteger(x) && (x as number) >= 0;
    const bounded = (x: unknown) => amount(x) && (x as number) <= 100;
    const resources = (x: unknown) => obj(x) && amount(x.coins) && amount(x.grain);
    const records = settlementValidator(s);
    const supply = (x: unknown) => obj(x) && bounded(x.morale) && amount(x.unpaidCoins) && amount(x.unpaidGrain);
    if (!obj(value) || value.version !== 1 || value.fundingNotice !== undefined && !isFundingNotice(value.fundingNotice, s) || value.lastDay !== dayOf(s) || !obj(value.cities) || !obj(value.armies) || !supply(value.camp) || !records(value.camp.records) || value.camp.fundingCityId !== undefined && (typeof value.camp.fundingCityId !== 'string' || !Object.hasOwn(CITY_ECONOMY_BASES, value.camp.fundingCityId)))
        return false;
    return Object.keys(value.cities).length === Object.keys(CITY_ECONOMY_BASES).length && Object.keys(CITY_ECONOMY_BASES).every(id => { const t = value.cities[id]; return obj(t) && resources(t) && bounded(t.commerce) && bounded(t.agriculture) && bounded(t.morale) && typeof t.factionId === 'string' && records(t.records); }) && Object.entries(value.armies).every(([id, t]) => /^army-[1-9]\d*$/.test(id) && supply(t));
}

function settlementValidator(s: GameState) {
    const obj = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x);
    const amount = (x: unknown) => Number.isSafeInteger(x) && (x as number) >= 0;
    const resources = (x: unknown) => obj(x) && amount(x.coins) && amount(x.grain);
    return (x: unknown) => Array.isArray(x) && x.length <= 24 && x.every((r, i) => obj(r) && amount(r.day) && r.day <= dayOf(s) && r.day % 30 === 0 && (!i || x[i - 1].day < r.day) && resources(r.due) && resources(r.paid) && resources(r.shortfall) && resources(r.income) && r.due.coins === r.paid.coins + r.shortfall.coins && r.due.grain === r.paid.grain + r.shortfall.grain && amount(r.recruited) && r.recruited <= 50 && r.recruitmentCost === r.recruited * 2 && typeof r.recruitmentReason === 'string');
}

/** Missing legacy modules get the authored opening reserve; damaged modules never do.
 * Keep independently valid fields, zero invalid resources/development/morale, and retain
 * valid dated records. The untouched original is backed up by loadState before repair.
 */
export function repairCityEconomy(raw: unknown, s: GameState): CityEconomy {
    const obj = (x: unknown): Record<string, any> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, any> : {};
    const amount = (x: unknown): number => Number.isSafeInteger(x) && (x as number) >= 0 ? x as number : 0;
    const bounded = (x: unknown): number => amount(x) <= 100 ? amount(x) : 0;
    const validRecords = settlementValidator(s);
    const records = (x: unknown): MonthSettlement[] => {
        if (!Array.isArray(x)) return [];
        let previous = -1;
        return x.filter(r => { if (!validRecords([r]) || r.day <= previous) return false; previous = r.day; return true; }).slice(-24);
    };
    const source = obj(raw), sourceCities = obj(source.cities), sourceCamp = obj(source.camp), cities: Record<string, CityTreasury> = {};
    for (const id of Object.keys(CITY_ECONOMY_BASES)) {
        const t = obj(sourceCities[id]);
        cities[id] = { coins: amount(t.coins), grain: amount(t.grain), commerce: bounded(t.commerce), agriculture: bounded(t.agriculture), morale: bounded(t.morale),
            factionId: typeof t.factionId === 'string' ? t.factionId : s.worldConflict?.cities[id]?.factionId ?? 'han', records: records(t.records) };
    }
    const status = (t: Record<string, any>): SupplyStatus => ({ morale: bounded(t.morale), unpaidCoins: amount(t.unpaidCoins), unpaidGrain: amount(t.unpaidGrain) });
    const funding = sourceCamp.fundingCityId;
    const camp: CityEconomy['camp'] = { ...status(sourceCamp), records: records(sourceCamp.records),
        ...(typeof funding === 'string' && Object.hasOwn(CITY_ECONOMY_BASES, funding) ? { fundingCityId: funding } : {}) };
    const armies = Object.fromEntries(Object.entries(obj(source.armies)).filter(([id]) => /^army-[1-9]\d*$/.test(id)).map(([id, t]) => [id, status(obj(t))]));
    return { version: 1, lastDay: dayOf(s), cities, camp, armies,
        ...(isFundingNotice(source.fundingNotice, s) ? { fundingNotice: { ...source.fundingNotice } } : {}) };
}
