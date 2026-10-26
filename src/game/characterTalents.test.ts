import { describe, expect, it } from 'vitest';
import * as talents from './characterTalents';
import { ATTRIBUTE_IDS, createAttributes, isAttributes } from './attributes';
import { createPartyProgress, createProgress, migratePartyProgress } from './growth';
import { HISTORICAL_CHARACTERS } from './historicalCharacters';
import { LOCAL_OFFICIALS } from './localOfficials';
import { createCombatState, makePartyUnit, performAttack, updateUnitHp } from './combat';
import { formationStrength } from './garrisonStrength';

const base = (id:string) => talents.baseAttributes(id);
const newIds='dian-wei xu-chu zhang-he xu-huang yue-jin yu-jin guo-jia jia-xu cheng-yu chen-qun ma-chao huang-zhong wei-yan pang-tong fa-zheng lu-su lv-meng gan-ning taishi-ci huang-gai kong-rong tao-qian wang-lang shi-xie liu-yao huang-zu gongsun-du han-fu zhang-yang hua-xin zhao-yu liu-chong'.split(' ');
describe('immutable individual talents over the preserved cultivation ledger', () => {
  it('authors every named person and gives leaders, fighters, scholars and women individual strengths', () => {
    for(const id of [...HISTORICAL_CHARACTERS.map(p=>p.id),...LOCAL_OFFICIALS.map(p=>p.id),...newIds,'sun-jian','sun-ce']) {
      const attrs=base(id);
      expect(ATTRIBUTE_IDS.every(key=>attrs[key]>=10&&attrs[key]<=18)).toBe(true);
      expect(Object.values(attrs).some(n=>n>10),id).toBe(true);
    }
    expect(base('liu-bei').charisma).toBeGreaterThanOrEqual(17);
    expect(base('guan-yu').strength).toBeGreaterThanOrEqual(17);
    expect(base('zhang-fei').strength).toBeGreaterThanOrEqual(17);
    expect(base('zhuge-liang')).toMatchObject({intellect:18,politics:18});
    expect(base('cai-yan').intellect).toBeGreaterThan(base('sun-shangxiang').intellect);
    expect(base('sun-shangxiang').strength).toBeGreaterThan(base('cai-yan').strength);
    expect(base('zhen-ji')).not.toEqual(base('diao-chan'));
  });
  it('keeps all earned points and attributes valid and adds exactly the same cultivation increments', () => {
    const progress=createProgress(10);progress.attributes.charisma=30;progress.points-=20;
    const party={...createPartyProgress(),'liu-bei':progress};const before=JSON.stringify(party);
    const effective=talents.effectiveAttributes('liu-bei',progress.attributes);
    expect(effective.charisma).toBe(base('liu-bei').charisma+20);
    expect(effective.charisma).toBeLessThanOrEqual(38);
    expect(isAttributes(progress.attributes)).toBe(true);
    expect(migratePartyProgress(party)).toEqual(party);
    expect(JSON.stringify(party)).toBe(before);
    expect(talents.effectiveAttributes('liu-bei',progress.attributes,1)).toEqual(progress.attributes);
  });
  it('has pure safe fallbacks, stable civic talents and distinct ordinary roles', () => {
    expect(base('unknown')).toEqual(createAttributes());expect(base('__proto__')).toEqual(createAttributes());
    const id='prefect-zhuo-han-184-1';expect(base(id)).toEqual(base(id));
    expect(Object.values(base(id)).every(n=>n>=10&&n<=14)).toBe(true);
    expect(base('garrison:zhuo:soldier')).not.toEqual(base('garrison:zhuo:captain'));
    expect(base('traveler')).not.toEqual(base('aman'));expect(base('aman')).not.toEqual(base('chen-da'));
    const copy=base('liu-bei');copy.charisma=10;expect(base('liu-bei').charisma).toBeGreaterThanOrEqual(17);
  });
  it('uses the same talents in real spawns and previews while legacy snapshots retain their exact stats', () => {
    const party={...createPartyProgress(),'guan-yu':createProgress()};
    const battle=createCombatState(null,party,'ambush',['traveler','guan-yu']);
    expect(battle.attributeVersion).toBe(2);
    expect(battle.units[1]).toEqual({...makePartyUnit('guan-yu',party['guan-yu'],null,'ambush',3,5)});
    expect(battle.units[1].attack).toBeGreaterThan(makePartyUnit('guan-yu',party['guan-yu'],null,'ambush',3,5,1).attack);
    const legacy={...battle,attributeVersion:undefined,terrain:[],randomSeed:1, units:[
      {...makePartyUnit('guan-yu',party['guan-yu'],null,'ambush',1,1,1),speed:99,hp:7},
      {...battle.units[2],x:2,y:1,defense:0,dodgeRate:0,hp:30,maxHp:30},
    ]};
    const before=JSON.stringify(legacy);const attacked=performAttack(legacy,'guan-yu','bandit-leader');
    expect(attacked.units[0]).toMatchObject({hp:7,maxHp:11,attack:3,defense:0,dodgeRate:0});
    expect(attacked.units[1].hp).toBe(27);expect(attacked.attributeVersion).toBeUndefined();
    expect(attacked.randomSeed).not.toBe(legacy.randomSeed);expect(JSON.stringify(legacy)).toBe(before);
  });
  it('sums the same soldier talents and preserves legacy formation strength on taking damage', () => {
    const group=formationStrength(4);
    for(const key of ATTRIBUTE_IDS)expect(group.attributes[key]).toBe(base('garrison:zhuo:soldier')[key]*4);
    const old=formationStrength(4,40,1);const {attributeVersion:_,...snapshot}=old;
    const unit={...createCombatState(null).units[0],hp:40,maxHp:40,attack:12,defense:4,formation:snapshot};
    expect(updateUnitHp(unit,29).formation?.attributes.command).toBe(30);
    expect(updateUnitHp(unit,29).attack).toBe(9);
  });
});
