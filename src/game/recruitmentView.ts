import { personName } from './heroName';
import { personPosting } from './personPosting';
import { canMeetPerson, type RecruitProfile } from './recruitmentCatalog';
import { WORLD_CITIES, cityMatches, cityNameAt } from './world';
import { lifeStatus } from './personLife';
import type { GameState } from './state';

export type PersonFilter = 'all' | 'historical' | 'official' | 'garrison' | 'other';
export type LifeFilter = 'all' | 'alive' | 'unborn' | 'child' | 'dead';
export function filterRecruitProfiles(profiles: readonly RecruitProfile[], state: GameState, options: { all: boolean; query: string; category: PersonFilter; life?: LifeFilter }): RecruitProfile[] {
  const query = options.query.trim().toLocaleLowerCase();
  return profiles.filter(profile => {
    const status=lifeStatus(state,profile.id);
    if(options.life&&options.life!=='all'&&(options.life==='alive'?status!=='alive'&&status!=='untracked':status!==options.life))return false;
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
    const locations = WORLD_CITIES.filter(city => cityIds.includes(city.id)).map(city => `${cityNameAt(city.id,state.date)} ${city.prefecture}`).join(' ');
    return `${personName(profile.id, state)} ${profile.role} ${locations}`.toLocaleLowerCase().includes(query)||cityIds.some(id=>cityMatches(id,query,state.date));
  });
}
