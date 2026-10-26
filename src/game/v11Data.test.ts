import { describe, expect, it } from 'vitest';
import { HISTORICAL_CHARACTERS } from './historicalCharacters';
import { PERSON_LIFE_BASELINES } from './personLifeData';
import { CITY_CAREERS } from './careerData';
import { MARTIAL_CATALOG } from './martialCatalog';
import { WORLD_CITIES } from './world';
import { V11_GOVERNORS, V11_GOVERNOR_EVIDENCE } from './v11Data';

const ids = 'dian-wei xu-chu zhang-he xu-huang yue-jin yu-jin guo-jia jia-xu cheng-yu chen-qun ma-chao huang-zhong wei-yan pang-tong fa-zheng lu-su lv-meng gan-ning taishi-ci huang-gai kong-rong tao-qian wang-lang shi-xie liu-yao huang-zu gongsun-du han-fu zhang-yang hua-xin zhao-yu liu-chong'.split(' ');
describe('1.1 researched roster', () => {
  it('adds exactly 32 independently authored historical identities and life records', () => {
    expect(HISTORICAL_CHARACTERS).toHaveLength(95);
    expect(PERSON_LIFE_BASELINES).toHaveLength(105);
    for (const id of ids) {
      const person = HISTORICAL_CHARACTERS.find(p => p.id === id)!;
      expect(person.appearance.portrait).toBe(`/assets/characters/${id}-v1.png`);
      expect(person.appearance.bio).toContain('游戏');
      const life = PERSON_LIFE_BASELINES.find(p => p.id === id)!;
      expect(life.birthEstimated).toBe(life.historicalBirthYear === null);
      expect(life.deathEstimated).toBe(life.historicalDeathYear === null);
      expect(life.source).toMatch(/三国志|后汉书/);
      expect(life.basis.length).toBeGreaterThan(20);
      expect(life.deathBaseYear - 5).toBeGreaterThan(life.birthYear + 16);
    }
    expect(new Set(ids.map(id => HISTORICAL_CHARACTERS.find(p => p.id === id)!.appearance.robe)).size).toBe(32);
    for (const id of ['xu-chu','gan-ning','huang-gai','han-fu','zhao-yu','liu-yao','liu-chong']) {
      expect(PERSON_LIFE_BASELINES.find(p => p.id === id)).toMatchObject({historicalDeathYear:null,deathEstimated:true});
    }
    expect(PERSON_LIFE_BASELINES.find(p => p.id === 'shi-xie')).toMatchObject({birthYear:137,deathBaseYear:226,historicalBirthYear:137});
    expect(PERSON_LIFE_BASELINES.find(p => p.id === 'wang-lang')).toMatchObject({historicalBirthYear:null,birthEstimated:true,deathBaseYear:228});
  });
  it('offers only sourced narrow local-office candidates and preserves their true office titles', () => {
    expect(V11_GOVERNORS.map(g => [g.cityId,g.employerId])).toEqual([
      ['beihai','kong-rong'],['shanyin','wang-lang'],['nanchang','hua-xin'],['guangling','zhao-yu'],
    ]);
    expect(V11_GOVERNOR_EVIDENCE.find(e=>e.personId==='kong-rong')?.title).toBe('北海相');
    expect(V11_GOVERNORS.some(g=>g.employerId==='shi-xie')).toBe(false);
    for (const g of V11_GOVERNORS) {
      expect(g.to.year-g.from.year).toBeLessThanOrEqual(5);
      expect(V11_GOVERNOR_EVIDENCE.find(e=>e.personId===g.employerId)?.source).toMatch(/三国志|后汉书/);
    }
  });
  it('uses explicit faction stages and real map nodes without confusing early affiliations', () => {
    const factions = ['han','cao','liu','sun','yuan-shao','yuan-shu','liu-biao','yi','zhang-lu','ma-teng','gongsun-zan','liu-yu','zhang-yan','dong-zhuo','lu-bu','yellow-turban'];
    for (const id of ids) for (const stage of CITY_CAREERS[id]) {
      expect(WORLD_CITIES.some(city => city.id === stage.cityId)).toBe(true);
      if (stage.kind !== 'free') expect(factions).toContain(stage.factionId);
      expect(stage.office).toContain('游戏');
    }
    expect(CITY_CAREERS['zhang-he'][0].factionId).toBe('han');
    expect(CITY_CAREERS['zhang-he'].some(s => s.factionId === 'yuan-shao')).toBe(true);
    expect(CITY_CAREERS['zhang-he'].some(s => s.factionId === 'cao')).toBe(true);
    expect(CITY_CAREERS['taishi-ci'][0].kind).toBe('free');
    expect(CITY_CAREERS['shi-xie'].some(s => s.title.includes('苍梧太守'))).toBe(false);
  });
  it('adds a sourced individual native art for every new identity using executable templates', () => {
    const arts = ids.map(id => MARTIAL_CATALOG.find(s => s.personId === id)!);
    expect(arts.every(Boolean)).toBe(true);
    expect(new Set(MARTIAL_CATALOG.filter(s => s.personId !== 'original-prefect').map(s => s.personId)).size).toBe(105);
    expect(new Set(MARTIAL_CATALOG.map(s => s.name)).size).toBe(MARTIAL_CATALOG.length);
    expect(new Set(MARTIAL_CATALOG.map(s => s.template)).size).toBe(11);
    for (const art of arts) { expect(art.source).toBeTruthy(); expect(art.basis).toContain('游戏'); }
  });
});
