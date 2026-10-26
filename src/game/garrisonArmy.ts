import { currentGovernorId } from './personPosting';
import { factionAt } from './worldConflictData';
import type { GameState } from './state';
import { cityAt } from './world';
import { GARRISON_COMMANDERS } from './garrisonData';
import { recruitProfile } from './recruitmentCatalog';
import { formationStrength } from './garrisonStrength';
import { isAliveAt } from './personLife';
import { cityNameAt } from './cityNames';
import { prefectIdentity } from './prefectIdentity';
import { V11_GOVERNOR_EVIDENCE } from './v11Data';

export { GARRISON_BASE, GARRISON_MONTHLY_RECRUITS, GARRISON_CAP, GARRISON_EVENTS, garrisonTroopsAt } from './garrisonSchedule';
import { GARRISON_BASE, garrisonTroopsAt } from './garrisonSchedule';

const monthNumber = (date: { year: number; month?: number }) => date.year * 12 + (date.month ?? 1);
export function cityGarrison(state: GameState, cityId = state.currentCityId) {
  const city = cityAt(cityId), world = !state.conflictRecovery ? state.worldConflict : undefined;
  const actual = world?.cities[cityId];
  const { troops, changes } = actual ? { troops: actual.troops, changes: [] } : garrisonTroopsAt(cityId, state.date);
  const month = monthNumber(state.date);
  const commander = GARRISON_COMMANDERS.find(item => item.cityId === cityId && isAliveAt(state.life,item.employerId,state.date,true) && month >= monthNumber(item.from) && month <= item.to.year * 12 + (item.to.month ?? 12));
  const captainId = `garrison:${cityId}:captain`, captainPresent = !Object.hasOwn(state.party, captainId);
  const governorId = actual ? currentGovernorId(state, cityId) : undefined;
  const historicalTitle=V11_GOVERNOR_EVIDENCE.find(t=>t.personId===governorId&&t.cityId===cityId)?.title??'郡国长官';
  const prefectLabel = actual ? governorId ? `${recruitProfile(governorId)!.name} · ${prefectIdentity(governorId)?'太守（游戏人物 · 本局任命）':historicalTitle+'（史载任职候选）'}` : `${factionAt(actual.factionId).name} · 军府代管${commander && Object.hasOwn(state.party, commander.employerId) && actual.occupationDay < 0 ? '（原主事已同行 · 职位暂缺）' : ''}` : commander ? `${recruitProfile(commander.employerId)?.name ?? '当地长官'}${Object.hasOwn(state.party, commander.employerId) ? '已同行 · 地方长官暂缺' : ' · 驻城主事'}` : '当地太守/郡国长官（姓名未详）';
  return { cityId, cityName: cityNameAt(cityId,state.date), troops, baseTroops: GARRISON_BASE, changes,
    prefectLabel,governorId, captainId, captainPresent, captainLabel: captainPresent ? `${cityNameAt(cityId,state.date)}·士兵长` : '士兵长缺任（已同行）',
    strength: formationStrength(troops), dynamic: Boolean(actual),
    factionId: actual?.factionId, factionName: actual ? factionAt(actual.factionId).name : undefined,
    outgoingArmies: world?.armies.filter(army => army.sourceCityId === cityId) ?? [],
    besiegingArmies: world?.armies.filter(army => army.targetCityId === cityId && army.phase === 'sieging') ?? [] };
}
