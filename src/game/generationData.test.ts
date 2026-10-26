import { describe, expect, it } from 'vitest';
import { HISTORICAL_CHARACTERS, getHistoricalCharacter } from './historicalCharacters';
import { CITY_CAREERS } from './careerData';
import { MARTIAL_CATALOG, martialForPerson } from './martialCatalog';
import { RECRUIT_PROFILES, recruitProfile } from './recruitmentCatalog';
import { WORLD_CITIES } from './world';
import { GENERATION_CHARACTERS, GENERATION_CAREERS, GENERATION_LIFE_BASELINES } from './generationData';

const expectedArts = [
  ['cao-pi', '飞景', 'pierce'], ['liu-shan', '托政', 'rally'], ['sima-yi', '持重', 'fortify'],
  ['sima-zhao', '总戎', 'inspire'], ['sima-yan', '混一', 'rally'], ['deng-ai', '阴平', 'dash'],
  ['jiang-wei', '陇锋', 'pierce'], ['zhong-yao', '定关', 'rally'], ['zhong-hui', '筹变', 'intimidate'],
  ['xun-yu', '守中', 'protect'], ['xun-you', '奇策', 'intimidate'], ['sun-xiu', '雉猎', 'shoot'],
  ['sun-liang', '整卫', 'rally'], ['liu-chen', '守志', 'inspire'], ['cao-rui', '明断', 'inspire'],
  ['cao-fang', '承统', 'protect'], ['cao-mao', '奋剑', 'break'], ['cao-huan', '揖让', 'rally'],
  ['sima-shi', '肃阵', 'fortify'], ['sun-hao', '厉令', 'intimidate'], ['lu-xun', '连营焰', 'firegod'],
  ['lu-kang', '江防', 'fortify'], ['zhuge-ke', '东兴势', 'inspire'], ['du-yu', '破竹', 'inspire'],
  ['yang-hu', '怀远', 'soothe'], ['wang-jun', '楼船', 'dash'],
] as const;

describe('approved generation roster', () => {
  it('adds all twenty-six stable identities, models, and recruit profiles', () => {
    expect(HISTORICAL_CHARACTERS).toHaveLength(95);
    expect(RECRUIT_PROFILES).toHaveLength(110 + WORLD_CITIES.length * 2);
    const added = expectedArts.map(([id]) => getHistoricalCharacter(id)!);
    expect(added.every(Boolean)).toBe(true);
    expect(new Set(added.map(person => person.appearance.robe)).size).toBe(26);
    expect(new Set(added.map(person => `${person.weapon}:${person.appearance.pose}:${person.appearance.robe}`)).size).toBe(26);
    for (const person of added) {
      expect(person.appearance.portrait).toBe(`/assets/characters/${person.id}-v1.png`);
      expect(person.role).not.toMatch(/皇帝|晋武帝|魏文帝/);
      expect(person.appearance.bio).toContain('游戏');
      expect(recruitProfile(person.id)?.appearance).toBe(person.appearance);
      expect(CITY_CAREERS[person.id]?.length).toBeGreaterThan(0);
    }
  });
  it.each(expectedArts)('gives %s the approved %s effect', (id, name, template) => {
    expect(martialForPerson(id)).toMatchObject({ personId: id, name, template, readOnly: false, story: false });
  });
  it('keeps 105 unique named arts and Himiko read-only', () => {
    expect(MARTIAL_CATALOG.filter(s => s.personId !== 'original-prefect')).toHaveLength(105);
    expect(new Set(MARTIAL_CATALOG.filter(s => s.personId !== 'original-prefect').map(skill => skill.name)).size).toBe(105);
    expect(martialForPerson('himiko')?.readOnly).toBe(true);
    expect(recruitProfile('himiko')).toMatchObject({ readOnly: true, windows: [] });
  });
  it('uses regional career stages and keeps retirement separate from office', () => {
    expect(CITY_CAREERS['jiang-wei']?.[0]).toMatchObject({ cityId: 'jixian', title: '天水郡吏' });
    expect(CITY_CAREERS['liu-chen']?.[0]).toMatchObject({ cityId: 'shujun', from: { year: 259 } });
    expect(CITY_CAREERS['sun-xiu']?.some(stage => stage.cityId === 'moling' && stage.from.year === 258)).toBe(true);
    expect(CITY_CAREERS['cao-fang']?.find(stage => stage.from.year === 254)?.kind).toBe('free');
    expect(CITY_CAREERS['cao-huan']?.find(stage => stage.from.year === 266)?.cityId).toBe('ye');
    expect(CITY_CAREERS['liu-shan']?.find(stage => stage.from.year === 264)).toMatchObject({ cityId: 'henan', kind: 'free' });
    for (const [id] of expectedArts) {
      const stages = CITY_CAREERS[id]!;
      expect(stages.at(-1)?.kind).toBe('free');
      for (let index = 1; index < stages.length; index++) expect(stages[index].from.year).toBeGreaterThan(stages[index - 1].to.year);
    }
  });
  it('uses the approved fixed birth and death years, with honest uncertainty labels', () => {
    const years = [
      [187, 226], [207, 271], [179, 251], [211, 265], [236, 290], [197, 264], [202, 264],
      [151, 230], [225, 264], [163, 212], [157, 214], [235, 264], [243, 260], [234, 263],
      [205, 239], [232, 274], [241, 260], [246, 302], [208, 255], [242, 284], [183, 245],
      [226, 274], [203, 253], [222, 285], [221, 278], [206, 286],
    ];
    expect(GENERATION_CHARACTERS.map(person => person.id)).toEqual(expectedArts.map(([id]) => id));
    expect(GENERATION_LIFE_BASELINES.map(person => person.id)).toEqual(expectedArts.map(([id]) => id));
    expect(GENERATION_LIFE_BASELINES.map(person => [person.birthYear, person.deathBaseYear])).toEqual(years);
    for (const person of GENERATION_LIFE_BASELINES) {
      expect(person.source.length).toBeGreaterThan(8);
      expect(person.basis.length).toBeGreaterThan(15);
      expect(person.deathEstimated).toBe(false);
      expect(GENERATION_CAREERS[person.id].at(-1)!.to.year).toBeGreaterThanOrEqual(person.deathBaseYear + 5);
    }
    expect(GENERATION_LIFE_BASELINES.find(person => person.id === 'liu-chen')).toMatchObject({ historicalBirthYear: null, birthEstimated: true });
    for (const id of ['deng-ai', 'zhong-yao', 'cao-rui', 'cao-mao', 'cao-huan', 'sun-hao']) expect(GENERATION_LIFE_BASELINES.find(person => person.id === id)?.birthEstimated).toBe(true);
    expect(GENERATION_LIFE_BASELINES.find(person => person.id === 'cao-rui')?.basis).toContain('204');
    expect(GENERATION_LIFE_BASELINES.find(person => person.id === 'cao-mao')?.basis).toContain('242');
    expect(GENERATION_LIFE_BASELINES.find(person => person.id === 'cao-huan')?.basis).toContain('245');
  });
});
