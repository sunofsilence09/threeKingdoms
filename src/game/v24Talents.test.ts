import { it, expect } from 'vitest';
import { baseAttributes } from './characterTalents';
import { getHistoricalCharacter } from './historicalCharacters';
it('gives named scholars appropriate equipment and fighters individual talents',()=>{
  expect(getHistoricalCharacter('cao-zhi')?.weapon).toBe('scroll');
  expect(getHistoricalCharacter('ma-liang')?.weapon).toBe('scroll');
  expect(baseAttributes('cao-zhang').strength).toBeGreaterThan(baseAttributes('cao-zhen').strength);
  expect(baseAttributes('man-chong').politics).toBeGreaterThan(baseAttributes('cao-shuang').politics);
});
