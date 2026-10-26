import { personPosting } from './personPosting';
import { allRecruitProfiles } from './recruitmentCatalog';
import { CITY_CAREERS } from './careerData';
import { recruitProfile } from './recruitmentCatalog';
import type { GameState } from './state';
import { GARRISON_COMMANDERS, GARRISON_PROFILES } from './garrisonData';
import { WORLD_CITIES } from './world';
import { isAliveAt } from './personLife';

export interface CityService {
  personId: string;
  cityId: string;
  kind: 'employed' | 'governing' | 'free' | 'waiting';
  title: string;
  office: string;
  employerId?: string;
  employerName?: string;
}

/** Appointments are rebuilt from the calendar and saved party, never saved separately. */
export function serviceForPerson(state: GameState, id: string): CityService | undefined {
  if (!isAliveAt(state.life,id,state.date,true) || Object.hasOwn(state.party, id) || !Number.isInteger(state.date.year) ||
      !Number.isInteger(state.date.month) || state.date.month < 1 || state.date.month > 12) return undefined;
  if (state.life || state.worldConflict && !state.conflictRecovery) {
    const posting = personPosting(state, id);
    if (!posting?.cityId || posting.kind === 'dispersed' || posting.kind === 'campaign') return undefined;
    const { cityId, kind, title, office, employerId } = posting;
    return { personId: id, cityId, kind, title, office,
      ...(employerId ? { employerId, employerName: recruitProfile(employerId)?.name } : {}) };
  }
  const month = state.date.year * 12 + state.date.month;
  const garrison = GARRISON_PROFILES.find(profile => profile.id === id);
  if (garrison) {
    if (state.date.year < 184) return undefined;
    const cityId = garrison.windows[0].cityIds[0];
    const city = WORLD_CITIES.find(city => city.id === cityId)!;
    const commander = GARRISON_COMMANDERS.find(binding => binding.cityId === cityId && isAliveAt(state.life,binding.employerId,state.date,true) &&
      month >= binding.from.year * 12 + (binding.from.month ?? 1) && month <= binding.to.year * 12 + (binding.to.month ?? 12));
    if (commander && Object.hasOwn(state.party, commander.employerId)) {
      if(garrison.readOnly)return { personId:id,cityId,kind:'employed',title:garrison.role,office:'本城守备 · 地方长官缺任',employerName:'本城守备' };
      return { personId: id, cityId, kind: 'waiting', title: garrison.role, office: '待聘' };
    }
    return { personId: id, cityId, kind: 'employed', title: garrison.role, office: `${city.prefecture}府署`,
      ...(commander ? { employerId: commander.employerId, employerName: recruitProfile(commander.employerId)!.name } : { employerName: '本城守备' }) };
  }
  if (!Object.hasOwn(CITY_CAREERS, id)) return undefined;
  const stage = CITY_CAREERS[id]?.find(stage => month >= stage.from.year * 12 + (stage.from.month ?? 1) &&
    month <= stage.to.year * 12 + (stage.to.month ?? 12));
  if (!stage) return undefined;
  const { cityId, kind, title, office, employerId } = stage;
  if (employerId && (!isAliveAt(state.life,employerId,state.date,true) || Object.hasOwn(state.party, employerId))) {
    return { personId: id, cityId, kind: 'waiting', title, office: '待聘' };
  }
  return { personId: id, cityId, kind, title, office,
    ...(employerId ? { employerId, employerName: recruitProfile(employerId)?.name } : {}) };
}

/** Omitting cityId returns the complete current roster across all cities. */
export function cityServices(state: GameState, cityId?: string): CityService[] {
  const ids = state.life || state.worldConflict && !state.conflictRecovery ? allRecruitProfiles(state).map(profile => profile.id) : [...Object.keys(CITY_CAREERS), ...GARRISON_PROFILES.map(profile => profile.id)];
  return ids.flatMap(id => {
    const service = serviceForPerson(state, id);
    return service && (cityId === undefined || service.cityId === cityId) ? [service] : [];
  });
}

export function getRecruitmentThreshold(state: GameState, id: string): number {
  return serviceForPerson(state, id)?.kind === 'employed' ? 80 : 60;
}

export function serviceLabel(service: CityService): string {
  if (service.kind === 'waiting') return `待聘 · ${service.title}`;
  const role = `${service.office} · ${service.title}`;
  return service.kind === 'employed' ? `${role} · 归属：${service.employerName ?? service.employerId ?? service.office}` : role;
}
