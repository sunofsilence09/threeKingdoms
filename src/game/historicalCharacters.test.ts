import { describe, expect, it } from 'vitest';
import { getCharacterAppearance } from './characters';
import { HISTORICAL_CHARACTERS, getHistoricalCharacter, getRouteLeader } from './historicalCharacters';

describe('historical character collection', () => {
  it('contains all sixteen requested characters with independent silhouettes and full-body artwork', () => {
    expect(HISTORICAL_CHARACTERS.map(c => c.name)).toEqual(['曹操', '刘备', '孙权', '孙尚香', '貂蝉', '蔡琰', '董卓', '吕布', '华雄', '甄姬', '张辽', '关羽', '张飞', '赵云', '糜夫人', '张星彩']);
    expect(new Set(HISTORICAL_CHARACTERS.map(c => getCharacterAppearance(c.id).portrait)).size).toBe(16);
    expect(new Set(HISTORICAL_CHARACTERS.map(c => getCharacterAppearance(c.id).pose)).size).toBe(16);
    for (const c of HISTORICAL_CHARACTERS) {
      expect(getCharacterAppearance(c.id)).toBe(c.appearance);
      expect(c.appearance.portrait).toMatch(/^\/assets\/characters\/.+\.png$/);
      expect(c.specialty.length).toBeGreaterThan(4);
      expect(c).not.toHaveProperty('hp');
      expect(c).not.toHaveProperty('level');
    }
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
    expect(women.map(c => c.name)).toEqual(['孙尚香', '貂蝉', '蔡琰', '甄姬', '糜夫人', '张星彩']);
    expect(women.map(c => c.weapon)).toEqual(['bow', 'fan', 'scroll', 'jade', 'handkerchief', 'swordshield']);
    expect(women.map(c => c.appearance.outfit)).toEqual(['tunic', 'dress', 'robe', 'dress', 'dress', 'armor']);
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
