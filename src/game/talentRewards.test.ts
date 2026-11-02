import {describe,it,expect} from 'vitest';
import {createInitialState,rewardVictory} from './state';
import {effectiveAttributes} from './characterTalents';
import {victoryExperience} from './attributes';
import {createProgress,grantExperience} from './growth';
import {createCombatState} from './combat';
describe('reward attribute versions',()=>{
 it('settles a version2 battle with its original trained charisma and politics, then uses percentage rewards in the next battle',()=>{
  const state=createInitialState(()=>0);
  state.party.traveler=createProgress(4);
  state.party.traveler.attributes.charisma=18;state.party.traveler.attributes.politics=11;state.party.traveler.points=0;
  const legacy={...state,activeBattle:{...createCombatState(null,state.party),attributeVersion:2 as const}};
  const oldReward=rewardVictory(legacy,'ambush'),modernReward=rewardVictory(state,'ambush');
  expect(oldReward.party.traveler.xp).toBe(43);expect(modernReward.party.traveler.xp).toBe(33);
  expect(oldReward.supplies).toBe(state.supplies+1);expect(modernReward.supplies).toBe(state.supplies);
  expect(rewardVictory(oldReward,'ambush')).toBe(oldReward);
  expect(createCombatState(null,oldReward.party).attributeVersion).toBe(3);
 });
 it('uses hero charisma in a new encounter and keeps legacy checkpoint rewards unchanged',()=>{
  const state=createInitialState(()=>0);
  expect(rewardVictory(state,'ambush').party.traveler).toEqual(grantExperience(state.party.traveler,victoryExperience(30,effectiveAttributes('traveler',state.party.traveler.attributes))));
  const legacy={...state,activeBattle:{attributeVersion:undefined} as typeof state.activeBattle};
  expect(rewardVictory(legacy,'ambush').party.traveler).toEqual(grantExperience(state.party.traveler,30));
 });
});
