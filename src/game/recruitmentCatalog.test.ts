import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { HISTORICAL_CHARACTERS } from './historicalCharacters';
import { LOCAL_OFFICIALS } from './localOfficials';
import { WORLD_CITIES } from './world';
import { RECRUIT_PROFILES, canMeetPerson, recruitProfile } from './recruitmentCatalog';

describe('all-person recruitment catalog', () => {
  it('contains exactly 124 unique identities covering every existing identity', () => {
    const ids = RECRUIT_PROFILES.map(p => p.id);
    expect(ids).toHaveLength(124);
    expect(new Set(ids).size).toBe(124);
    expect(ids).toEqual(expect.arrayContaining([
      'traveler', 'aman', 'chen-da', 'bandit', 'bandit-leader', 'sun-jian', 'sun-ce',
      ...HISTORICAL_CHARACTERS.map(p => p.id), ...LOCAL_OFFICIALS.map(p => p.id),
    ]));
  });

  it('provides two stable garrison identities per city and keeps ordinary troops unapproachable', () => {
    expect(RECRUIT_PROFILES.filter(p => p.category === 'garrison')).toHaveLength(72);
    for (const city of WORLD_CITIES) {
      const soldier = recruitProfile(`garrison:${city.id}:soldier`);
      const captain = recruitProfile(`garrison:${city.id}:captain`);
      expect(soldier).toMatchObject({ category: 'garrison', weapon: 'spear', speed: 11, readOnly: true });
      expect(captain).toMatchObject({ category: 'garrison', weapon: 'swordshield', speed: 12 });
      expect(canMeetPerson(soldier!.id, city.id, { year: 184, month: 3 })).toBe(false);
      expect(canMeetPerson(captain!.id, city.id, { year: 184, month: 3 })).toBe(true);
      expect(canMeetPerson(captain!.id, WORLD_CITIES.find(c => c.id !== city.id)!.id, { year: 184, month: 3 })).toBe(false);
    }
    expect(recruitProfile('himiko')).toMatchObject({ readOnly: true, windows: [] });
    for (const id of ['garrison:unknown:captain', 'garrison:ye:general', '__proto__', 'toString']) expect(recruitProfile(id)).toBeUndefined();
  });

  it.each([
    ['xiahou-dun', [[189, 191, 'chenliu'], [192, 194, 'dongjun'], [195, 219, 'henan']]],
    ['xiahou-yuan', [[189, 195, 'chenliu'], [196, 210, 'xuxian'], [211, 214, 'changan'], [215, 218, 'nanzheng']]],
    ['cao-ren', [[190, 195, 'chenliu'], [196, 207, 'xuxian'], [208, 209, 'jiangling'], [210, 219, 'xiangyang']]],
    ['cao-xiu', [[200, 217, 'xuxian'], [218, 219, 'changan'], [220, 227, 'shouchun']]],
    ['liu-biao', [[190, 207, 'xiangyang']]], ['liu-zhang', [[194, 213, 'shujun']]],
    ['zhang-lu', [[194, 214, 'nanzheng']]],
    ['ma-teng', [[188, 191, 'didao'], [192, 207, 'changan'], [208, 211, 'xuxian']]],
    ['gongsun-zan', [[184, 187, 'zhuo'], [188, 192, 'zhuo'], [193, 194, 'ji']]],
    ['yuan-shao', [[188, 189, 'henan', 8], [191, 201, 'ye']]],
    ['liu-yu', [[188, 192, 'ji']]], ['zhang-yan', [[184, 204, 'julu'], [205, 210, 'ye']]],
  ] as const)('keeps the complete authored monthly encounter schedule for %s', (id, stages) => {
    const profile = recruitProfile(id)!;
    expect(profile.windows).toHaveLength(stages.length);
    for (let year = 183; year <= 228; year++) for (let month = 1; month <= 12; month++) {
      const expected = stages.find(stage => year >= stage[0] && (year < stage[1] || year === stage[1] && month <= (stage[3] ?? 12)));
      const actual = WORLD_CITIES.filter(city => canMeetPerson(id, city.id, { year, month })).map(city => city.id);
      expect(actual, `${id}:${year}-${month}`).toEqual(expected ? [expected[2]] : []);
    }
  });

  it.each([
    ['yuan-shu', 189, 189, 'henan'], ['yuan-shu', 190, 192, 'nanyang'], ['yuan-shu', 193, 198, 'shouchun'],
    ['chen-gong', 192, 193, 'dongjun'], ['chen-gong', 194, 195, 'dongjun'], ['chen-gong', 196, 198, 'xiapi'],
    ['zhang-miao', 190, 194, 'chenliu'], ['gao-shun', 196, 198, 'xiapi'],
    ['zhou-tai', 196, 199, 'wujun'], ['zhou-tai', 200, 207, 'danyang'],
    ['zhou-tai', 208, 219, 'jiangling'], ['zhou-tai', 220, 221, 'danyang'],
    ['han-dang', 184, 186, 'nanyang'], ['han-dang', 187, 190, 'changsha'],
    ['han-dang', 195, 199, 'wujun'], ['han-dang', 200, 225, 'wujun'],
  ] as const)('keeps %s in exactly %s through %s at %s', (id, from, to, expectedCity) => {
    for (const year of [from, to]) for (const month of [1, 12]) {
      expect(WORLD_CITIES.filter(city => canMeetPerson(id, city.id, { year, month })).map(city => city.id)).toEqual([expectedCity]);
    }
  });

  it('does not fill career gaps or generate encounters beyond the six new windows', () => {
    for (const [id, year] of [
      ['yuan-shu', 188], ['yuan-shu', 199], ['chen-gong', 191], ['chen-gong', 199],
      ['zhang-miao', 189], ['zhang-miao', 195], ['gao-shun', 195], ['gao-shun', 199],
      ['zhou-tai', 195], ['zhou-tai', 222], ['han-dang', 191], ['han-dang', 194], ['han-dang', 226],
    ] as const) for (const city of WORLD_CITIES) expect(canMeetPerson(id, city.id, { year, month: 6 })).toBe(false);
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
      expect(existsSync(`public${profile.portrait}`), profile.id).toBe(true);
      if (profile.id === 'himiko') expect(profile.windows).toEqual([]);
      else expect(profile.windows.length).toBeGreaterThan(0);
      expect(JSON.stringify(profile)).not.toMatch(/清代|清朝|旗装|马蹄袖|辫子/);
      for (const window of profile.windows) {
        expect(window.cityIds.length).toBeGreaterThan(0);
        for (const city of window.cityIds) {
          expect(cities.has(city)).toBe(true);
          expect(canMeetPerson(profile.id, city, { year: window.from.year, month: window.from.month ?? 1 })).toBe(!profile.readOnly);
        }
      }
    }
  });

  it('uses four independent actual PNG portraits and retains the original Sun identity records', () => {
    for (const id of ['sun-jian', 'sun-ce', 'zhuge-liang', 'zhou-yu']) {
      const portrait = recruitProfile(id)?.portrait ?? '';
      expect(portrait).toBe(`/assets/characters/${id}-v1.png`);
      expect(readFileSync(`public${portrait}`).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(portrait).not.toContain('sun-quan');
    }
    expect(recruitProfile('sun-jian')).toMatchObject({ category: 'leader', weapon: 'sword', speed: 16 });
    expect(recruitProfile('sun-ce')).toMatchObject({ category: 'leader', weapon: 'sword', speed: 19 });
    expect(existsSync('public/assets/characters/neutral-sun-jian.svg')).toBe(true);
    expect(existsSync('public/assets/characters/neutral-sun-ce.svg')).toBe(true);
  });

  it.each([
    ['zhuge-liang', 207, 208, ['xiangyang', 'jiangling']],
    ['zhuge-liang', 209, 213, ['jiangling']],
    ['zhuge-liang', 214, 226, ['shujun']],
    ['zhuge-liang', 227, 233, ['nanzheng']],
    ['zhou-yu', 195, 197, ['danyang']],
    ['zhou-yu', 198, 207, ['wujun', 'danyang', 'nanchang']],
    ['zhou-yu', 208, 209, ['jiangling', 'nanchang']],
  ])('restricts %s encounters in %i through %i to the authored cities', (id, from, to, cities) => {
    for (const year of [from, to]) for (const city of WORLD_CITIES) {
      for (const month of [1, 12]) expect(canMeetPerson(id, city.id, { year, month })).toBe(cities.includes(city.id));
    }
  });

  it('does not introduce the added adults early or extend invitations after their final window', () => {
    for (const city of WORLD_CITIES) {
      for (const [id, first, last] of [['zhuge-liang', 207, 233], ['zhou-yu', 195, 209]] as const) {
        expect(canMeetPerson(id, city.id, { year: 184, month: 3 })).toBe(false);
        expect(canMeetPerson(id, city.id, { year: first - 1, month: 12 })).toBe(false);
        expect(canMeetPerson(id, city.id, { year: last + 1, month: 1 })).toBe(false);
      }
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
