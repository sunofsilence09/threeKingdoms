import { describe, expect, it } from 'vitest';
import { conflictDateLabel, filterConflictReports, troopLabel, armyPhaseLabel } from './conflictView';

describe('conflict view projections', () => {
  it('formats the saved day in the same thirty-day calendar, including year edges', () => {
    expect(conflictDateLabel(0)).toBe('184年1月1日');
    expect(conflictDateLabel(29)).toBe('184年1月30日');
    expect(conflictDateLabel(30)).toBe('184年2月1日');
    expect(conflictDateLabel(359)).toBe('184年12月30日');
    expect(conflictDateLabel(360)).toBe('185年1月1日');
    expect(conflictDateLabel((9999 - 184) * 360 + 359)).toBe('9999年12月30日');
  });
  it('filters reports without sorting or mutating the saved chronology and shows latest fifty', () => {
    const reports = Array.from({ length: 60 }, (_, id) => ({ id, day: id, kind: 'victory', factionId: id % 2 ? 'cao' : 'han', cityId: id % 2 ? 'henan' : 'runan', text: `战报${id}` }));
    const before = JSON.stringify(reports);
    expect(filterConflictReports(reports).map(report => report.id)).toEqual(Array.from({ length: 50 }, (_, i) => 59 - i));
    expect(filterConflictReports(reports, { cityId: 'henan', factionId: 'cao' })).toHaveLength(25);
    expect(filterConflictReports(reports, { cityId: 'runan', factionId: 'cao' })).toEqual([]);
    expect(filterConflictReports([{ ...reports[0], opponentFactionId: 'cao' }], { factionId: 'cao' })).toHaveLength(1);
    expect(JSON.stringify(reports)).toBe(before);
  });
  it('keeps troop labels exact and all army phases readable', () => {
    expect(troopLabel(12345)).toBe('12,345人');
    expect(['assembling', 'marching', 'sieging', 'retreating', 'camped'].map(phase => armyPhaseLabel(phase as 'marching'))).toEqual(['集结中', '行军中', '围城中', '撤退中', '驻留中']);
  });
});
