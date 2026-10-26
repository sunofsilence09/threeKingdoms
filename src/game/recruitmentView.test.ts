import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { RECRUIT_PROFILES } from './recruitmentCatalog';
import { filterRecruitProfiles } from './recruitmentView';
import { WORLD_CITIES } from './world';
import type { WorldConflict } from './worldConflictTypes';

describe('person search and category filtering', () => {
  it('searches by name and authored city while keeping catalog order', () => {
    const state = { ...createInitialState(() => 0), worldConflict: undefined };
    expect(filterRecruitProfiles(RECRUIT_PROFILES, state, { all: true, query: '  陈宫  ', category: 'all' }).map(person => person.id)).toEqual(['chen-gong']);
    const found = filterRecruitProfiles(RECRUIT_PROFILES, state, { all: true, query: '下邳', category: 'historical' });
    expect(found.map(person => person.id)).toContain('gao-shun');
    expect(found.every(person => person.category === 'historical' || person.category === 'leader')).toBe(true);
  });
  it('keeps future or absent people out of the local view without changing saved state', () => {
    const state = createInitialState(() => 0), original = JSON.stringify(state);
    state.currentCityId = 'runan';
    const before = JSON.stringify(state);
    expect(filterRecruitProfiles(RECRUIT_PROFILES, state, { all: false, query: '高顺', category: 'all' })).toEqual([]);
    expect(filterRecruitProfiles(RECRUIT_PROFILES, state, { all: false, query: '阿满', category: 'other' }).map(person => person.id)).toEqual(['aman']);
    expect(JSON.stringify(state)).toBe(before); expect(original).toBeTruthy();
  });
});

describe('current posting search', () => {
  it('searches the actual retreat city and no longer advertises the captured historical city', () => {
    const state = createInitialState(() => 0); state.phase = 'overworld'; state.currentCityId = 'donghai'; state.date = { year: 196, month: 6, day: 1 };
    // This test isolates current geography while Chen Gong remains alive in this campaign.
    state.life!.people['chen-gong'].deathYear=204;
    state.worldConflict = { version: 3, nextPrefectId: 1, prefectIds: [], lastDay: 4490, seed: 42, nextArmyId: 1, nextReportId: 1,
      cities: Object.fromEntries(WORLD_CITIES.map(city => [city.id, { factionId: 'han', troops: 5000, occupationDay: -1 }])),
      armies: [], founded: [], nextDecision: {}, reports: [], ledger: { initial: WORLD_CITIES.length*5000, recruited: 0, raised: 0, losses: 0 } } satisfies WorldConflict;
    state.worldConflict.cities.donghai.factionId = 'lu-bu';
    state.worldConflict.cities.xiapi.factionId = 'cao';
    const profiles = RECRUIT_PROFILES.filter(person => person.id === 'chen-gong');
    expect(filterRecruitProfiles(profiles, state, { all: true, query: '东海', category: 'all' }).map(person => person.id)).toEqual(['chen-gong']);
    expect(filterRecruitProfiles(profiles, state, { all: true, query: '下邳', category: 'all' })).toEqual([]);
    expect(filterRecruitProfiles(profiles, state, { all: false, query: '', category: 'all' }).map(person => person.id)).toEqual(['chen-gong']);
    state.currentCityId = 'xiapi';
    expect(filterRecruitProfiles(profiles, state, { all: false, query: '', category: 'all' })).toEqual([]);
  });
});
