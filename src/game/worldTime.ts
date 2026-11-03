import { advanceHistory } from './historicalEvents';
import type { GameState } from './state';
import type { GameDate } from './history';
import { advanceWorldConflict, conflictDay, createWorldConflict } from './worldConflict';
import { createLifeState, reconcileLives, ensureLifePeople } from './personLife';
import { initializeCityEconomy, settleCityEconomyDay, reconcileCityOwnership } from './cityEconomy';
/** Every elapsed day uses the same payroll → morale → war ordering. */
export function withWorldDate(state: GameState, date: GameDate): GameState {
    const target = conflictDay(date);
    if (target < conflictDay(state.date))
        return state;
    let next = state.life ? state : { ...state, life: createLifeState(state.date) };
    if (!next.worldConflict && !next.conflictRecovery)
        next = { ...next, worldConflict: createWorldConflict(next.date, Object.keys(next.party), undefined, next.life) };
    next = initializeCityEconomy(next);
    if (target === conflictDay(state.date)) {
        next = reconcileLives(next, date);
        if (next.worldConflict) {
            const worldConflict = advanceWorldConflict(next.worldConflict, date, Object.keys(next.party), next.life);
            const life = ensureLifePeople(next.life!, worldConflict.prefectIds);
            if (worldConflict !== next.worldConflict || life !== next.life) next = { ...next, worldConflict, life };
        }
        next = reconcileCityOwnership(next);
        const history = advanceHistory(next, date);
        return history === next.history ? next : { ...next, history };
    }
    // This private world clone belongs to the entire operation; daily ticks must not
    // repeatedly copy its ever-growing prefect catalog or serialize it for equality.
    next = reconcileLives(next, next.date);
    if (next.worldConflict) next = { ...next, worldConflict: structuredClone(next.worldConflict) };
    const step = (at: GameDate) => {
        if (at.year !== next.date.year) next = reconcileLives(next, at);
        else next = { ...next, life: { ...next.life!, lastDay: conflictDay(at) } };
        next = { ...next, date: at };
        next = settleCityEconomyDay(next);
        if (next.worldConflict) {
            const e = next.cityEconomy, world = next.worldConflict, prefectCount = world.prefectIds.length;
            if (e) { world.cityMorale = Object.fromEntries(Object.entries(e.cities).map(([id, t]) => [id, t.morale])); world.armyMorale = Object.fromEntries(Object.entries(e.armies).map(([id, t]) => [id, t.morale])); }
            const advanced = advanceWorldConflict(world, at, Object.keys(next.party), next.life, true);
            delete advanced.cityMorale;
            delete advanced.armyMorale;
            next = { ...next, worldConflict: advanced, life: advanced.prefectIds.length === prefectCount ? next.life : ensureLifePeople(next.life!, advanced.prefectIds) };
            next = reconcileCityOwnership(next);
        }
        next = { ...next, history: advanceHistory(next, at) };
    };
    for (let day = conflictDay(state.date) + 1; day <= target; day++)
            step({ year: 184 + Math.floor(day / 360), month: Math.floor(day % 360 / 30) + 1, day: day % 30 + 1 });
    return next;
}
