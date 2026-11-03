import { beforeEach, describe, it, expect } from 'vitest';
import { createInitialState, saveState, loadState, STORAGE_KEY } from './state';
import { advanceDays } from './history';
import { withWorldDate } from './worldTime';
import { armyFunding, cityFinanceSummary, campFinanceSummary, settleCityEconomyDay, reconcileCityOwnership, isCityEconomy, developCity } from './cityEconomy';
import { cityServices } from './cityService';
const fixture = () => { const s = createInitialState(() => 0); s.phase = 'overworld'; s.date = { year: 184, month: 3, day: 30 }; s.worldConflict!.lastDay = 89; s.cityEconomy!.lastDay = 89; return s; };
beforeEach(() => { const data = new Map<string, string>(); Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => data.set(k, v) } }); });
describe('monthly supply integration', () => {
    it('only pays unique adult alive named office holders, not anonymous soldiers', () => { const s = fixture(); const summaries = Object.keys(s.worldConflict!.cities).map(id => cityFinanceSummary(s, id)!); const ids = summaries.flatMap(t => t.officialIds); expect(new Set(ids).size).toBe(ids.length); expect(ids.some(id => id.startsWith('garrison:'))).toBe(false); expect(ids.length).toBeGreaterThan(0); for (const p of cityServices(s).filter(p => p.kind === 'free'))
        expect(ids).not.toContain(p.personId); });
    it('city income then payroll, with paid amounts and preserved historical gaps', () => { let s = fixture(); const t = s.cityEconomy!.cities.henan; t.coins = 0; t.grain = 0; t.commerce = 0; t.agriculture = 0; s.worldConflict!.cities.henan.troops = 5000; const n = settleCityEconomyDay({ ...s, date: advanceDays(s.date, 1) }), r = n.cityEconomy!.cities.henan.records[0]; expect(r.due.grain).toBe(5000); expect(r.paid).toEqual({ coins: 0, grain: 0 }); expect(n.cityEconomy!.cities.henan.morale).toBe(72); expect(r.recruited).toBe(0); expect(settleCityEconomyDay(n)).toBe(n); n.cityEconomy!.cities.henan.coins = 100000; n.cityEconomy!.cities.henan.grain = 100000; const later = settleCityEconomyDay({ ...n, date: advanceDays(n.date, 30) }); expect(later.cityEconomy!.cities.henan.records[0]).toEqual(r); expect(later.cityEconomy!.cities.henan.records[1].shortfall).toEqual({ coins: 0, grain: 0 }); });
    it('pays personal soldiers once, preserves arrears flags until full next month', () => { let s = fixture(); s.worldConflict!.playerReserve = 1001; s.worldConflict!.playerAssigned = 999; s.economy.coins = 0; s.supplies = 0; let n = settleCityEconomyDay({ ...s, date: advanceDays(s.date, 1) }); expect(campFinanceSummary(n).soldiers).toBe(2000); expect(n.cityEconomy!.camp.records[0].due).toEqual({ coins: 400 + campFinanceSummary(s).companions * 100, grain: 2 }); expect(n.cityEconomy!.camp.morale).toBe(72); n.economy.coins = 10000; n.supplies = 100; n = settleCityEconomyDay({ ...n, date: advanceDays(n.date, 1) }); expect(n.cityEconomy!.camp.morale).toBe(64); n = settleCityEconomyDay({ ...n, date: advanceDays(n.date, 29) }); expect(n.cityEconomy!.camp.unpaidCoins).toBe(0); expect(n.cityEconomy!.camp.unpaidGrain).toBe(0); });
    it('city funding never also spends personal money or supplies, and captured funding falls back', () => { const s = fixture(); s.worldConflict!.cities.henan.factionId = 'player'; s.cityEconomy!.cities.henan.factionId = 'player'; s.cityEconomy!.camp.fundingCityId = 'henan'; s.worldConflict!.playerReserve = 1000; const n = settleCityEconomyDay({ ...s, date: advanceDays(s.date, 1) }); expect(n.economy.coins).toBe(s.economy.coins); expect(n.supplies).toBe(s.supplies); n.worldConflict!.cities.henan.factionId = 'han'; const lost = reconcileCityOwnership(n); expect(lost.cityEconomy!.camp.fundingCityId).toBeUndefined(); expect(lost.travelNotice).toContain('个人'); expect(lost.cityEconomy!.cities.henan.coins).toBe(n.cityEconomy!.cities.henan.coins); expect(lost.cityEconomy!.cities.henan.morale).toBeLessThanOrEqual(60); });
    it('surviving expedition bill is conserved and a captured contribution moves to stable friendly city', () => { const s = fixture(); const a = { id: 'army-99', factionId: 'han', sourceCityId: 'henan', targetCityId: 'julu', troops: 101, contributions: [{ cityId: 'henan', troops: 3000 }, { cityId: 'yingchuan', troops: 1000 }], phase: 'marching' as const, path: ['henan', 'julu'], legIndex: 0, legDay: 0, phaseDays: 0 }; expect(armyFunding(s, a)).toEqual([{ cityId: 'henan', cost: { coins: 30, grain: 150 } }, { cityId: 'yingchuan', cost: { coins: 10, grain: 50 } }]); s.worldConflict!.cities.henan.factionId = 'player'; expect(armyFunding(s, a)[0].cityId).toBe(Object.keys(s.worldConflict!.cities).sort().find(id => s.worldConflict!.cities[id].factionId === 'han')); for (const c of Object.values(s.worldConflict!.cities))
        c.factionId = 'player'; expect(armyFunding(s, a).every(f => !f.cityId)).toBe(true); });
    it('funded recruitment reserves next monthly costs and accounts for exact recruits', () => { const s = fixture(); for (const t of Object.values(s.cityEconomy!.cities)) {
        t.commerce = 0;
        t.agriculture = 0;
        t.coins = 0;
        t.grain = 0;
    } const id = 'henan', bill = cityFinanceSummary(s, id)!.expenses.total; s.cityEconomy!.cities[id].coins = bill.coins * 2 + 40; s.cityEconomy!.cities[id].grain = bill.grain * 2 + 100; const n = settleCityEconomyDay({ ...s, date: advanceDays(s.date, 1) }), r = n.cityEconomy!.cities[id].records[0]; expect(r.recruited).toBe(10); expect(n.worldConflict!.ledger.recruited - s.worldConflict!.ledger.recruited).toBe(10); });
    it('legacy initializes without arrears and corrupt finance backs up independently', () => { const s = createInitialState(() => 0); delete s.cityEconomy; saveState(s); const n = loadState()!; expect(n.cityEconomy!.cities.henan.records).toEqual([]); expect(loadState()).toEqual(n); const broken = { ...n, cityEconomy: { ...n.cityEconomy, cities: {} } }; saveState(broken as never); const repaired = loadState()!; expect(repaired.cityEconomyRecovery).toBe(true); expect(repaired.worldConflict).toEqual(n.worldConflict); expect(localStorage.getItem(`${STORAGE_KEY}:city-economy-backup`)).toBe(JSON.stringify(broken.cityEconomy)); expect(isCityEconomy(repaired.cityEconomy, repaired)).toBe(true); });
    it('development consumes once and advances all ten days', () => { const s = fixture(); s.worldConflict!.cities.henan.factionId = 'player'; s.cityEconomy!.cities.henan.factionId = 'player'; s.worldConflict!.cities.henan.troops = 20000; const before = s.cityEconomy!.cities.henan.commerce; const result = developCity(s, 'henan', 'commerce'); expect(result.date).toEqual(advanceDays(s.date, 10)); expect(result.cityEconomy!.cities.henan.commerce).toBe(before + 5); });
});
describe('supply deficits remain exact', () => {
    it('allocates remaining city payments to camp and records only its actual gap', () => { const s = fixture(); s.worldConflict!.cities.henan.factionId = 'player'; s.cityEconomy!.cities.henan.factionId = 'player'; s.cityEconomy!.camp.fundingCityId = 'henan'; s.worldConflict!.playerReserve = 1000; const t = s.cityEconomy!.cities.henan; t.commerce = 0; t.agriculture = 0; const total = cityFinanceSummary(s, 'henan')!.expenses.total; t.coins = total.coins - 1; t.grain = total.grain - 1; const n = settleCityEconomyDay({ ...s, date: advanceDays(s.date, 1) }); expect(n.cityEconomy!.camp.unpaidCoins).toBe(1); expect(n.cityEconomy!.camp.unpaidGrain).toBe(1); expect(n.cityEconomy!.camp.records.at(-1)!.shortfall).toEqual({ coins: 1, grain: 1 }); });
    it('a city funding switch does not erase an outstanding personal supply status before payroll', () => { const s = fixture(); s.worldConflict!.cities.henan.factionId = 'player'; s.cityEconomy!.cities.henan.factionId = 'player'; s.cityEconomy!.camp.fundingCityId = 'henan'; s.cityEconomy!.camp.unpaidCoins = 100; s.cityEconomy!.camp.unpaidGrain = 1; s.date.day = 29; s.cityEconomy!.lastDay = 88; const n = settleCityEconomyDay({ ...s, date: advanceDays(s.date, 1) }); expect(n.cityEconomy!.camp.morale).toBe(72); });
});
describe('strategic finance morale', () => {
    it('new expedition inherits actual source morale instead of refreshing to80', () => { const s = fixture(); s.cityEconomy!.cities.henan.morale = 0; s.worldConflict!.armies.push({ id: 'army-999', factionId: s.worldConflict!.cities.henan.factionId, sourceCityId: 'henan', targetCityId: 'julu', troops: 100, contributions: [{ cityId: 'henan', troops: 100 }], phase: 'marching', path: ['henan', 'julu'], legIndex: 0, legDay: 0, phaseDays: 0 }); const n = reconcileCityOwnership(s); expect(n.cityEconomy!.armies['army-999'].morale).toBe(0); });
});
it('strategic siege resolves differently under real army and city morale with identical seed', async () => {
    const { advanceWorldConflict } = await import('./worldConflict');
    const s = fixture();
    const world = s.worldConflict!;
    world.armies = [{ id: 'army-99', factionId: 'yellow-turban', sourceCityId: 'julu', targetCityId: 'henan', troops: 5000, contributions: [], phase: 'sieging', path: ['julu', 'henan'], legIndex: 1, legDay: 0, phaseDays: 1 }];
    world.cities.henan.troops = 5000;
    world.nextDecision = Object.fromEntries(Object.keys(world.nextDecision).map(id => [id, world.lastDay + 30]));
    const d = advanceDays(s.date, 1), strong = advanceWorldConflict({ ...world, armyMorale: { 'army-99': 100 }, cityMorale: { henan: 0 } }, d), weak = advanceWorldConflict({ ...world, armyMorale: { 'army-99': 0 }, cityMorale: { henan: 100 } }, d);
    expect(strong.cities.henan.factionId).toBe('yellow-turban');
    expect(weak.cities.henan.factionId).toBe('han');
});

it('bounds retained monthly records to24 periods for reliable local saves',()=>{
 let s=fixture();for(let month=0;month<30;month++)s=settleCityEconomyDay({...s,date:advanceDays(s.date,month?30:1)});
 expect(s.cityEconomy!.cities.henan.records).toHaveLength(24);expect(s.cityEconomy!.camp.records).toHaveLength(24);
 expect(isCityEconomy(s.cityEconomy,s)).toBe(true);
});

it('projects treasury runway from recurring net deficit rather than gross payroll',()=>{
 const s=fixture(),t=s.cityEconomy!.cities.henan;t.coins=1000;t.grain=10000;t.commerce=100;t.agriculture=100;
 expect(cityFinanceSummary(s,'henan')!.monthsRemaining).toBeNull();
 t.commerce=0;t.agriculture=0;const cost=cityFinanceSummary(s,'henan')!.expenses.total;t.coins=cost.coins*2;t.grain=cost.grain*3;
 expect(cityFinanceSummary(s,'henan')!.monthsRemaining).toBe(2);t.coins=0;expect(cityFinanceSummary(s,'henan')!.monthsRemaining).toBe(0);
});

it('isolates malformed funding IDs without throwing or discarding the RPG save',()=>{
 for(const fundingCityId of [{toString:null,valueOf:null},['henan'],123]){
  const s=createInitialState(()=>0),bad={...s,cityEconomy:{...s.cityEconomy,camp:{...s.cityEconomy!.camp,fundingCityId}}};
  saveState(bad as never);const recovered=loadState();expect(recovered).not.toBeNull();expect(recovered!.cityEconomyRecovery).toBe(true);expect(recovered!.party).toEqual(s.party);
  expect(localStorage.getItem(`${STORAGE_KEY}:city-economy-backup`)).not.toBeNull();
 }
});

it('repairs corrupt fields without granting a fresh treasury or resetting valid cities',()=>{
 const s=createInitialState(()=>0);s.cityEconomy!.cities.henan.coins=123;s.cityEconomy!.cities.henan.grain=456;s.cityEconomy!.cities.henan.commerce=100;
 const expected=structuredClone(s.cityEconomy!.cities);(s.cityEconomy!.cities.yingchuan as unknown as {coins:unknown}).coins='broken';s.cityEconomy!.camp.fundingCityId={toString:null,valueOf:null} as never;
 saveState(s);const n=loadState()!;expect(n).not.toBeNull();expect(n.cityEconomyRecovery).toBe(true);expect(n.cityEconomy!.cities.henan).toEqual(expected.henan);expect(n.cityEconomy!.cities.yingchuan.coins).toBe(0);expect(n.cityEconomy!.cities.yingchuan.grain).toBe(expected.yingchuan.grain);expect(n.cityEconomy!.camp.fundingCityId).toBeUndefined();expect(n.cityEconomy!.camp.records).toEqual([]);expect(loadState()).toEqual(n);
});
