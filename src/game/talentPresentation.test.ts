import { describe, expect, it } from 'vitest';
import * as talents from './characterTalents';
import { createAttributes } from './attributes';

describe('six attribute presentation for party, archives and old encounters',()=>{
  it('shows authored base, exact earned cultivation, effective current value and personal cap',()=>{
    const attrs=createAttributes();attrs.charisma=30;
    expect(talents.attributeDescription('liu-bei',attrs,'charisma')).toBe('魅力 38（天赋18 + 培养20/20；上限38）');
    expect(attrs.charisma).toBe(30);
  });
  it('explains a legacy encounter without presenting next battle stats as current',()=>{
    expect(talents.attributeDescription('liu-bei',createAttributes(),'charisma',1)).toBe('魅力 10（本场旧制；天赋18 + 培养0/20；下场18，上限38）');
    expect(talents.combatAttributeVersion({})).toBe(1);
    expect(talents.LEGACY_ATTRIBUTE_NOTE).toContain('奖励');
  });
  it('retains memorial cultivation identically while deriving the deceased person own talents',()=>{
    const progress={level:8,xp:23,points:1,attributes:{...createAttributes(),intellect:30}};
    const memorial={id:'cai-yan',deathYear:220,progress};const before=JSON.stringify(memorial);
    expect(talents.attributeDescription(memorial.id,memorial.progress.attributes,'intellect')).toContain('智力 37（天赋17 + 培养20/20；上限37）');
    expect(JSON.stringify(memorial)).toBe(before);
  });
});
