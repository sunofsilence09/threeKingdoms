import type { ConflictArmy, ConflictReport } from './worldConflictTypes';

/** Saved conflict days use the game's twelve thirty-day months. */
export function conflictDateLabel(day: number): string {
  const year = 184 + Math.floor(day / 360), withinYear = day % 360;
  return `${year}年${Math.floor(withinYear / 30) + 1}月${withinYear % 30 + 1}日`;
}
export function troopLabel(troops: number): string { return `${troops.toLocaleString('zh-CN')}人`; }
export function armyPhaseLabel(phase: ConflictArmy['phase']): string {
  return { assembling: '集结中', marching: '行军中', sieging: '围城中', retreating: '撤退中', camped: '驻留中' }[phase];
}
export function filterConflictReports(reports: readonly ConflictReport[], filter: { cityId?: string; factionId?: string } = {}): ConflictReport[] {
  return reports.slice(-50).reverse().filter(report => (!filter.cityId || report.cityId === filter.cityId) &&
    (!filter.factionId || report.factionId === filter.factionId || report.opponentFactionId === filter.factionId));
}
