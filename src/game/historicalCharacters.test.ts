import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getCharacterAppearance } from './characters';
import { HISTORICAL_CHARACTERS, getHistoricalCharacter, getRouteLeader } from './historicalCharacters';

describe('historical character collection', () => {
  it('adds thirteen distinct adult profiles with the approved weapons and speeds', () => {
    expect(HISTORICAL_CHARACTERS).toHaveLength(63);
    const ids = ['xiahou-dun', 'xiahou-yuan', 'cao-ren', 'cao-xiu', 'liu-biao', 'liu-zhang', 'zhang-lu', 'ma-teng', 'himiko', 'gongsun-zan', 'yuan-shao', 'liu-yu', 'zhang-yan'];
    const added = ids.map(getHistoricalCharacter);
    expect(added.map(p => p?.weapon)).toEqual(['glaive', 'bow', 'swordshield', 'spear', 'scroll', 'scroll', 'scroll', 'spear', 'jade', 'spear', 'sword', 'scroll', 'sword']);
    expect(added.map(p => p?.speed)).toEqual([14, 16, 12, 15, 10, 10, 11, 14, 11, 16, 12, 10, 17]);
    expect(new Set(added.map(p => p?.appearance.robe)).size).toBe(13);
    for (const p of added) expect(p?.appearance.portrait).toBe(`/assets/characters/${p?.id}-v1.png`);
    expect(getHistoricalCharacter('himiko')?.appearance.bio).toContain('3世纪');
  });
  it('contains sixty-three historical characters while preserving the original twenty-four identities', () => {
    expect(HISTORICAL_CHARACTERS.slice(0, 24).map(c => c.name)).toEqual(['曹操', '刘备', '孙权', '孙尚香', '貂蝉', '蔡琰', '董卓', '吕布', '华雄', '甄姬', '张辽', '关羽', '张飞', '赵云', '糜夫人', '张星彩', '诸葛亮', '周瑜', '袁术', '陈宫', '张邈', '高顺', '周泰', '韩当']);
    expect(new Set(HISTORICAL_CHARACTERS.map(c => c.id)).size).toBe(63);
    expect(new Set(HISTORICAL_CHARACTERS.map(c => getCharacterAppearance(c.id).portrait)).size).toBe(63);
    expect(new Set(HISTORICAL_CHARACTERS.slice(0, 16).map(c => getCharacterAppearance(c.id).pose)).size).toBe(16);
    for (const c of HISTORICAL_CHARACTERS) {
      expect(getCharacterAppearance(c.id)).toBe(c.appearance);
      expect(c.appearance.portrait).toMatch(/^\/assets\/characters\/.+\.png$/);
      expect(c.specialty.length).toBeGreaterThan(4);
      expect(c).not.toHaveProperty('hp');
      expect(c).not.toHaveProperty('level');
    }
  });
  it('gives the six city figures their own equipment, models and historical context', () => {
    const added = ['yuan-shu', 'chen-gong', 'zhang-miao', 'gao-shun', 'zhou-tai', 'han-dang'].map(getHistoricalCharacter);
    expect(added.map(c => c?.weapon)).toEqual(['sword', 'scroll', 'sword', 'swordshield', 'glaive', 'bow']);
    expect(added.map(c => c?.appearance.pose)).toEqual(['tyrant', 'strategist', 'greeting', 'sentinel', 'bruiser', 'archer']);
    expect(added.map(c => c?.speed)).toEqual([14, 11, 11, 12, 15, 14]);
    for (const character of added) {
      expect(character?.appearance.portrait).toBe(`/assets/characters/${character?.id}-v1.png`);
      expect(character?.appearance.bio).toContain('游戏');
      expect(character?.equipment.length).toBeGreaterThan(1);
    }
    expect(new Set(added.map(c => c?.appearance.robe)).size).toBe(6);
    expect(added[0]?.appearance.outfit).toBe('robe');
    expect(added[3]?.appearance.outfit).toBe('armor');
    expect(added[5]?.appearance.beard).toBe(true);
  });
  it('ships six independent transparent PNG portrait files', () => {
    const ids = ['yuan-shu', 'chen-gong', 'zhang-miao', 'gao-shun', 'zhou-tai', 'han-dang'];
    const files = ids.map(id => readFileSync(resolve('public', getHistoricalCharacter(id)!.appearance.portrait.slice(1))));
    expect(new Set(files.map(file => file.toString('base64'))).size).toBe(6);
    for (const file of files) {
      expect(file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(file.readUInt32BE(16)).toBeGreaterThanOrEqual(1024);
      expect(file.readUInt32BE(20)).toBeGreaterThanOrEqual(1024);
      expect(file[25]).toBe(6); // PNG RGBA color type keeps the generated alpha channel.
    }
  });
  it('provides complete scholar and commander models for the added identities', () => {
    const zhuge = getHistoricalCharacter('zhuge-liang');
    const zhou = getHistoricalCharacter('zhou-yu');
    expect(zhuge).toMatchObject({ name: '诸葛亮', weapon: 'fan', equipment: '羽扇', appearance: { pose: 'scholar', outfit: 'robe' } });
    expect(zhou).toMatchObject({ name: '周瑜', weapon: 'sword', equipment: '佩剑', appearance: { pose: 'commander', outfit: 'armor' } });
    expect(zhuge?.appearance.robe).not.toBe(zhou?.appearance.robe);
    expect(getHistoricalCharacter('sun-jian')).toBeUndefined();
    expect(getHistoricalCharacter('sun-ce')).toBeUndefined();
  });
  it('keeps six added identities and matching props distinct', () => {
    const added = ['zhang-liao', 'guan-yu', 'zhang-fei', 'zhao-yun', 'mi-fu-ren', 'zhang-xingcai'].map(getHistoricalCharacter);
    expect(added.map(c => c?.weapon)).toEqual(['glaive', 'glaive', 'serpentspear', 'spear', 'handkerchief', 'swordshield']);
    expect(added.map(c => c?.appearance.pose)).toEqual(['sentinel', 'longbeard', 'serpent', 'lancer', 'protective', 'shieldguard']);
    expect(added[1]?.appearance.skin).toBe(0xb36d56);
    expect(added[2]?.appearance.stocky).toBe(true);
    expect(added[3]?.appearance.plume).toBe(true);
    expect(added[3]?.appearance.beard).toBe(false);
  });
  it('links the three route leaders without conflating faction and party IDs', () => {
    expect(getRouteLeader('cao').name).toBe('曹操');
    expect(getRouteLeader('liu').name).toBe('刘备');
    expect(getRouteLeader('sun').name).toBe('孙权');
    expect(getHistoricalCharacter('traveler')).toBeUndefined();
    expect(getHistoricalCharacter('unknown')).toBeUndefined();
  });
  it('keeps the selected female roles and their equipment distinct', () => {
    const women = HISTORICAL_CHARACTERS.filter(c => c.gender === 'female');
    expect(women.map(c => c.name)).toEqual(['孙尚香', '貂蝉', '蔡琰', '甄姬', '糜夫人', '张星彩', '卑弥呼']);
    expect(women.map(c => c.weapon)).toEqual(['bow', 'fan', 'scroll', 'jade', 'handkerchief', 'swordshield', 'jade']);
    expect(women.map(c => c.appearance.outfit)).toEqual(['tunic', 'dress', 'robe', 'dress', 'dress', 'armor', 'dress']);
  });
  it('distinguishes the new warlords and heavy polearms from refugee equipment', () => {
    expect(getHistoricalCharacter('dong-zhuo')?.appearance.stocky).toBe(true);
    expect(getHistoricalCharacter('lu-bu')?.weapon).toBe('halberd');
    expect(getHistoricalCharacter('lu-bu')?.appearance.plume).toBe(true);
    expect(getHistoricalCharacter('hua-xiong')?.weapon).toBe('glaive');
    expect(getHistoricalCharacter('hua-xiong')?.appearance.outfit).toBe('armor');
    expect(getHistoricalCharacter('zhen-ji')?.weapon).toBe('jade');
  });
});
