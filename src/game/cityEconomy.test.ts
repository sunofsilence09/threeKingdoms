import { describe, it, expect } from 'vitest';
import { createInitialState } from './state';
import { withWorldDate } from './worldTime';
import { advanceDays } from './history';
import { payroll, dailyMorale, initializeCityEconomy, cityFinanceSummary, donateCityCoins, purchaseCityGrain, developCity, setCampFundingCity } from './cityEconomy';
describe('city finance', () => {
    it('prices monthly income and unique salaried staff without hundred-person rounding loss', () => {
        expect(payroll(5000, ['a', 'b', 'c', 'd', 'e', 'a'])).toEqual({ coins: 1500, grain: 5000 });
        expect(payroll(1, [])).toEqual({ coins: 20, grain: 100 });
        expect(payroll(0, [])).toEqual({ coins: 0, grain: 0 });
    });
    it('keeps independent bounded morale and preserves above-80 morale', () => {
        expect([dailyMorale(80, true, false), dailyMorale(80, false, true), dailyMorale(80, true, true), dailyMorale(90, false, false), dailyMorale(1, true, true)]).toEqual([77, 75, 72, 90, 0]);
    });
    it('initializes once without charging historic payroll', () => { const s = initializeCityEconomy(createInitialState(() => 0)); expect(initializeCityEconomy(s)).toBe(s); expect(s.cityEconomy!.camp.morale).toBe(80); expect(s.cityEconomy!.cities.henan.records).toEqual([]); });
    it('long clock equals daily clock across a year', () => { const s = initializeCityEconomy(createInitialState(() => 0)); let daily = s; for (let i = 0; i < 360; i++)
        daily = withWorldDate(daily, advanceDays(daily.date, 1)); expect(withWorldDate(s, advanceDays(s.date, 360))).toEqual(daily); });
    it('only owns affordable treasury operations and spending is conserved', () => { let s = initializeCityEconomy(createInitialState(() => 0)); s.phase = 'overworld'; s.worldConflict!.cities.henan.factionId = 'player'; s.economy.coins = 5000; const before = cityFinanceSummary(s, 'henan')!; s = donateCityCoins(s, 'henan', 100); expect(s.economy.coins).toBe(4900); s = purchaseCityGrain(s, 'henan', 100); expect(cityFinanceSummary(s, 'henan')!.coins).toBe(before.coins); expect(cityFinanceSummary(s, 'henan')!.grain).toBe(before.grain + 500); expect(donateCityCoins(s, 'henan', NaN)).toBe(s); expect(developCity({ ...s, journey: {} as never }, 'henan', 'commerce').date).toEqual(s.date); expect(setCampFundingCity(s, 'henan').cityEconomy!.camp.fundingCityId).toBe('henan'); });
});
