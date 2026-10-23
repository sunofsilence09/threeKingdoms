import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { HISTORICAL_CHARACTERS } from './historicalCharacters';
import { LOCAL_OFFICIALS } from './localOfficials';
import { WORLD_CITIES } from './world';
import { RECRUIT_PROFILES, canMeetPerson, recruitProfile } from './recruitmentCatalog';

describe('all-person recruitment catalog', () => {
  it('contains exactly 31 unique identities covering every existing identity', () => {
    const ids = RECRUIT_PROFILES.map(p => p.id);
    expect(ids).toHaveLength(31);
    expect(new Set(ids).size).toBe(31);
    expect(ids).toEqual(expect.arrayContaining([
      'traveler', 'aman', 'chen-da', 'bandit', 'bandit-leader', 'sun-jian', 'sun-ce',
      ...HISTORICAL_CHARACTERS.map(p => p.id), ...LOCAL_OFFICIALS.map(p => p.id),
    ]));
  });

  it('reuses all existing historical appearances and official portraits', () => {
    for (const person of HISTORICAL_CHARACTERS) {
      const profile = recruitProfile(person.id);
      expect(profile?.appearance).toEqual(person.appearance);
      expect(profile?.portrait).toBe(person.appearance.portrait);
      expect(profile?.weapon).toBe(person.weapon);
    }
    for (const official of LOCAL_OFFICIALS) expect(recruitProfile(official.id)?.portrait).toBe(official.portrait);
  });

  it('gives every profile a usable appearance, existing portrait and reachable city window', () => {
    expect(RECRUIT_PROFILES.length).toBeGreaterThan(0);
    const cities = new Set(WORLD_CITIES.map(city => city.id));
    for (const profile of RECRUIT_PROFILES) {
      expect(profile.name.length).toBeGreaterThan(0);
      expect(profile.bio.length).toBeGreaterThan(0);
      expect(profile.speed).toBeGreaterThan(0);
      expect(profile.appearance.portrait).toBe(profile.portrait);
      expect(existsSync(`public${profile.portrait}`)).toBe(true);
      expect(profile.windows.length).toBeGreaterThan(0);
      expect(JSON.stringify(profile)).not.toMatch(/清代|清朝|旗装|马蹄袖|辫子/);
      for (const window of profile.windows) {
        expect(window.cityIds.length).toBeGreaterThan(0);
        for (const city of window.cityIds) {
          expect(cities.has(city)).toBe(true);
          expect(canMeetPerson(profile.id, city, { year: window.from.year, month: window.from.month ?? 1 })).toBe(true);
        }
      }
    }
  });

  it('uses labelled neutral portraits of Sun Jian and Sun Ce, without borrowing Sun Quan', () => {
    for (const [id, name] of [['sun-jian', '孙坚'], ['sun-ce', '孙策']]) {
      const portrait = recruitProfile(id)?.portrait ?? '';
      expect(portrait).toContain(`neutral-${id}.svg`);
      expect(readFileSync(`public${portrait}`, 'utf8')).toContain(name);
      expect(portrait).not.toContain('sun-quan');
    }
  });

  it.each([
    ['sun-quan', 'wujun', 200], ['zhen-ji', 'ye', 199],
    ['sun-shangxiang', 'wujun', 208], ['cai-yan', 'chenliu', 195],
    ['zhang-xingcai', 'shujun', 220], ['sun-ce', 'danyang', 195],
    ['zhang-liao', 'taiyuan', 187], ['zhao-yun', 'julu', 191],
    ['lu-bu', 'henan', 189], ['hua-xiong', 'henan', 190],
  ])('gates adult or active period of %s', (id, city, start) => {
    expect(canMeetPerson(id, city, { year: 184, month: 3 })).toBe(false);
    for (const location of WORLD_CITIES) expect(canMeetPerson(id, location.id, { year: start - 1, month: 12 })).toBe(false);
    expect(canMeetPerson(id, city, { year: start, month: 1 })).toBe(true);
  });

  it.each([
    ['sun-jian', 191], ['sun-ce', 200], ['cao-cao', 220], ['liu-bei', 223],
    ['sun-quan', 252], ['dong-zhuo', 192], ['lu-bu', 198], ['hua-xiong', 191],
    ['zhen-ji', 221], ['zhang-liao', 222], ['guan-yu', 220], ['zhang-fei', 221],
    ['zhao-yun', 229], ['wang-yun', 192],
  ])('does not generate new encounters with %s after the death year', (id, lastYear) => {
    for (const city of WORLD_CITIES) expect(canMeetPerson(id, city.id, { year: lastYear + 1, month: 1 })).toBe(false);
  });

  it('provides conservative dated official encounters without inventing full terms', () => {
    expect(canMeetPerson('wang-yun', 'yingchuan', { year: 184, month: 3 })).toBe(true);
    expect(canMeetPerson('guo-xun', 'zhuo', { year: 184, month: 3 })).toBe(true);
    expect(canMeetPerson('guo-xun', 'zhuo', { year: 184, month: 4 })).toBe(false);
    expect(canMeetPerson('chu-gong', 'nanyang', { year: 184, month: 3 })).toBe(true);
    expect(canMeetPerson('chu-gong', 'nanyang', { year: 184, month: 4 })).toBe(false);
    expect(canMeetPerson('jia-cong', 'nanhai', { year: 184, month: 3 })).toBe(false);
    expect(canMeetPerson('jia-cong', 'nanhai', { year: 184, month: 6 })).toBe(true);
    expect(canMeetPerson('jia-cong', 'guangxin', { year: 184, month: 6 })).toBe(true);
    expect(canMeetPerson('guo-dian', 'julu', { year: 184, month: 10 })).toBe(false);
    expect(canMeetPerson('guo-dian', 'julu', { year: 184, month: 11 })).toBe(true);
    expect(canMeetPerson('qin-jie', 'nanyang', { year: 184, month: 3 })).toBe(false);
  });

  it('rejects unknown identities, wrong cities and invalid month values', () => {
    expect(recruitProfile('unknown')).toBeUndefined();
    expect(canMeetPerson('unknown', 'yingchuan', { year: 184, month: 3 })).toBe(false);
    expect(canMeetPerson('wang-yun', 'unknown', { year: 184, month: 3 })).toBe(false);
    expect(canMeetPerson('wang-yun', 'wujun', { year: 184, month: 3 })).toBe(false);
    for (const month of [0, 13, NaN]) expect(canMeetPerson('wang-yun', 'yingchuan', { year: 184, month })).toBe(false);
  });

  it('treats both month boundaries as inclusive without leaking into neighboring months', () => {
    expect(canMeetPerson('xu-qiu', 'nanyang', { year: 184, month: 5, day: 30 })).toBe(false);
    expect(canMeetPerson('xu-qiu', 'nanyang', { year: 184, month: 6, day: 1 })).toBe(true);
    expect(canMeetPerson('xu-qiu', 'nanyang', { year: 184, month: 8, day: 30 })).toBe(true);
    expect(canMeetPerson('xu-qiu', 'nanyang', { year: 184, month: 9, day: 1 })).toBe(false);
    expect(canMeetPerson('xu-qiu', 'nanyang', { year: 185, month: 6 })).toBe(false);
  });
});
