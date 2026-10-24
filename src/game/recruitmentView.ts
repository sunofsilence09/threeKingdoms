import { personPosting } from './personPosting';
import { canMeetPerson, type RecruitProfile } from './recruitmentCatalog';
import { WORLD_CITIES } from './world';
import type { GameState } from './state';

export type PersonFilter = 'all' | 'historical' | 'official' | 'garrison' | 'other';
export function filterRecruitProfiles(profiles: readonly RecruitProfile[], state: GameState, options: { all: boolean; query: string; category: PersonFilter }): RecruitProfile[] {
  const query = options.query.trim().toLocaleLowerCase();
  return profiles.filter(profile => {
    if (!options.all && !Object.hasOwn(state.party, profile.id) && (state.journey || !canMeetPerson(profile.id, state.currentCityId, state.date, state))) return false;
    const category = profile.category === 'leader' ? 'historical' : ['historical', 'official', 'garrison'].includes(profile.category) ? profile.category : 'other';
    if (options.category !== 'all' && category !== options.category) return false;
    if (!query) return true;
    const posting = personPosting(state, profile.id);
    const month = state.date.year * 12 + state.date.month;
    const cityIds = state.worldConflict && !state.conflictRecovery
      ? Object.hasOwn(state.party, profile.id) ? state.journey ? [] : [state.currentCityId]
        : !posting ? [] : posting.kind === 'free' && !posting.factionId
          ? profile.windows.filter(window => month >= window.from.year * 12 + (window.from.month ?? 1) && (!window.to || month <= window.to.year * 12 + (window.to.month ?? 12))).flatMap(window => window.cityIds)
          : posting.cityId ? [posting.cityId] : []
      : [...profile.windows.flatMap(window => window.cityIds), ...(profile.category === 'garrison' ? [profile.id.split(':')[1]] : [])];
    const locations = WORLD_CITIES.filter(city => cityIds.includes(city.id)).map(city => `${city.name} ${city.prefecture}`).join(' ');
    return `${profile.name} ${profile.role} ${locations}`.toLocaleLowerCase().includes(query);
  });
}
