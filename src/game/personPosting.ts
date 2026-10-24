import type { GameState } from './state';
import type { GameDate } from './history';
import { CITY_CAREERS } from './careerData';
import { GARRISON_COMMANDERS } from './garrisonData';
import { recruitProfile, type RecruitWindow } from './recruitmentCatalog';
import { CONFLICT_FOUNDATIONS, factionAt, factionForPerson, leaderForFaction } from './worldConflictData';
import { cityAt, planRoute, WORLD_CITIES } from './world';

export interface PersonPosting {
  cityId?: string;
  factionId?: string;
  kind: 'governing' | 'employed' | 'free' | 'waiting' | 'dispersed' | 'campaign';
  office: string;
  title: string;
  employerId?: string;
  reason?: string;
}
const monthAt = (date: { year: number; month?: number }, end = false) => date.year * 12 + (date.month ?? (end ? 12 : 1));
const inWindow = (date: GameDate, window: RecruitWindow) => monthAt(date) >= monthAt(window.from) && (!window.to || monthAt(date) <= monthAt(window.to, true));
const activeProfile = (id: string, date: GameDate) => recruitProfile(id)?.windows.some(window => inWindow(date, window)) ?? false;
export function historicalCommander(cityId: string, date: GameDate) {
  return GARRISON_COMMANDERS.find(binding => binding.cityId === cityId && monthAt(date) >= monthAt(binding.from) && monthAt(date) <= monthAt(binding.to, true));
}

/** Only an active, unowned person of the owning faction can hold a current city office. */
export function currentGovernorId(state: GameState, cityId: string): string | undefined {
  const world = state.conflictRecovery ? undefined : state.worldConflict;
  if (!world) return undefined;
  const city = world.cities[cityId], id = city?.governorId;
  if (!id || !activeProfile(id, state.date) || Object.hasOwn(state.party, id) || factionForPerson(id, state.date) !== city.factionId ||
      world.armies.some(army => army.commanderId === id)) return undefined;
  // Invalid duplicate assignments never put the same person in two offices in the UI.
  return WORLD_CITIES.find(candidate => world.cities[candidate.id]?.governorId === id)?.id === cityId ? id : undefined;
}

/** A projection only: viewing a person never changes time, ownership, or the saved roster. */
export function personPosting(state: GameState, id: string): PersonPosting | undefined {
  if (!Number.isInteger(state.date.year) || !Number.isInteger(state.date.month) || state.date.month < 1 || state.date.month > 12) return undefined;
  const profile = recruitProfile(id);
  if (!profile || !activeProfile(id, state.date) || Object.hasOwn(state.party, id) || id === 'himiko') return undefined;
  const windows = profile.windows.filter(window => inWindow(state.date, window));
  const preferred = windows.flatMap(window => window.cityIds);
  const stage = Object.hasOwn(CITY_CAREERS, id) ? CITY_CAREERS[id].find(stage => monthAt(state.date) >= monthAt(stage.from) && monthAt(state.date) <= monthAt(stage.to, true)) : undefined;
  const world = state.conflictRecovery ? undefined : state.worldConflict;
  if (profile.category === 'garrison') {
    const cityId = preferred[0], city = cityAt(cityId), binding = historicalCommander(cityId, state.date);
    const owner = world?.cities[cityId], governorId = owner ? currentGovernorId(state, cityId) : binding?.employerId;
    const waiting = !profile.readOnly && binding && Object.hasOwn(state.party, binding.employerId) && (!owner || owner.occupationDay < 0);
    if (waiting) return { cityId, factionId: owner?.factionId, kind: 'waiting', title: profile.role, office: '待聘', reason: '原驻城主事已同行，地方职位暂缺。' };
    const employerId = governorId && !Object.hasOwn(state.party, governorId) ? governorId : undefined;
    return { cityId, factionId: owner?.factionId, kind: 'employed', title: profile.role,
      office: owner ? `${factionAt(owner.factionId).name} · ${city.prefecture}守备` : binding && Object.hasOwn(state.party, binding.employerId) ? '本城守备 · 地方长官缺任' : `${city.prefecture}府署`,
      ...(employerId ? { employerId } : {}),
      ...(owner && owner.occupationDay >= 0 ? { reason: '本城守备随当前管理机构留任。' } : {}) };
  }
  if (!world) {
    if (stage?.employerId && Object.hasOwn(state.party, stage.employerId)) return { cityId: stage.cityId, kind: 'waiting', title: stage.title, office: '待聘' };
    return stage ? { cityId: stage.cityId, kind: stage.kind, office: stage.office, title: stage.title, ...(stage.employerId ? { employerId: stage.employerId } : {}) } : { cityId: preferred[0], kind: 'free', office: '游历', title: profile.role };
  }
  const factionId = stage?.kind === 'free' ? undefined : factionForPerson(id, state.date);
  const army = world.armies.find(army => army.commanderId === id);
  if (army) return { factionId: army.factionId, kind: 'campaign', office: `${factionAt(army.factionId).name} · 在外军队`, title: stage?.title ?? profile.role,
    reason: `随军在外：${cityAt(army.sourceCityId).name} → ${cityAt(army.targetCityId).name}，暂不可在城内相遇。` };
  if (!factionId) return { cityId: preferred[0], kind: 'free', office: stage?.office ?? '游历', title: stage?.title ?? profile.role, reason: '沿原有游历相遇窗口活动。' };
  const governing = WORLD_CITIES.find(city => currentGovernorId(state, city.id) === id);
  if (governing) return { cityId: governing.id, factionId, kind: 'governing', office: `${factionAt(factionId).name} · ${governing.prefecture}府署`, title: '驻城主事', reason: '当前天下局势中的驻城任职；并非历史任期记录。' };
  const bases = WORLD_CITIES.filter(city => world.cities[city.id]?.factionId === factionId);
  if (!bases.length) {
    const founded = factionId === 'han' || CONFLICT_FOUNDATIONS.some(stage => stage.factionId === factionId && world.founded.includes(stage.id));
    if (!founded) {
      const waiting = stage?.employerId && Object.hasOwn(state.party, stage.employerId);
      return { cityId: preferred[0], factionId, kind: waiting ? 'waiting' : stage?.kind === 'employed' ? 'employed' : 'free',
        office: waiting ? '待聘' : stage?.office ?? '游历', title: stage?.title ?? profile.role,
        ...(stage?.employerId && !waiting ? { employerId: stage.employerId } : {}),
        reason: '军府尚未起兵，在原活动区域暂留；不代表该势力占有本城。' };
    }
    if (world.armies.some(army => army.factionId === factionId)) return { factionId, kind: 'campaign', office: factionAt(factionId).name,
      title: stage?.title ?? profile.role, reason: '所属军府暂时无城，部众仍在外活动，城内不可相遇。' };
    return { factionId, kind: 'dispersed', office: factionAt(factionId).name, title: stage?.title ?? profile.role, reason: '所属势力已无可驻据点，暂时流散。' };
  }
  const preferredBase = preferred.find(cityId => bases.some(city => city.id === cityId));
  const cityId = preferredBase ?? [...bases].sort((a, b) => (planRoute(preferred[0], a.id)?.days ?? Infinity) - (planRoute(preferred[0], b.id)?.days ?? Infinity))[0].id;
  const leaderId = stage?.employerId ?? leaderForFaction(factionId, state.date);
  const waiting = stage?.employerId && Object.hasOwn(state.party, stage.employerId);
  const employerId = !waiting && leaderId !== id && leaderId && activeProfile(leaderId, state.date) && !Object.hasOwn(state.party, leaderId) ? leaderId : undefined;
  return { cityId, factionId, kind: waiting ? 'waiting' : stage?.kind === 'employed' ? 'employed' : 'free',
    office: waiting ? '待聘' : `${factionAt(factionId).name} · ${cityAt(cityId).prefecture}驻地`, title: stage?.title ?? profile.role,
    ...(employerId ? { employerId } : {}),
    reason: preferredBase ? '当前驻于所属势力据点。' : '原偏好驻地不属本势力，已转往最近的己方据点。' };
}

export function postingLabel(state: GameState, id: string): string {
  if (Object.hasOwn(state.party, id)) return '当前行踪：已同行，随玩家行动。';
  const posting = personPosting(state, id);
  if (!posting) return id === 'himiko' ? '当前行踪：仅人物志查看。' : '当前行踪：此年代未开放活动。';
  return `当前行踪：${posting.cityId ? cityAt(posting.cityId).name : posting.kind === 'campaign' ? '随军在外' : '流散'} · ${posting.office}${posting.reason ? `；${posting.reason}` : ''}`;
}
