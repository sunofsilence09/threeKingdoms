import {describe,it,expect} from 'vitest';
import {createInitialState,rewardVictory} from './state';
import {effectiveAttributes} from './characterTalents';
import {victoryExperience} from './attributes';
import {grantExperience} from './growth';
describe('reward attribute versions',()=>{
 it('uses hero charisma in a new encounter and keeps legacy checkpoint rewards unchanged',()=>{
  const state=createInitialState(()=>0);
  expect(rewardVictory(state,'ambush').party.traveler).toEqual(grantExperience(state.party.traveler,victoryExperience(30,effectiveAttributes('traveler',state.party.traveler.attributes))));
  const legacy={...state,activeBattle:{attributeVersion:undefined} as typeof state.activeBattle};
  expect(rewardVictory(legacy,'ambush').party.traveler).toEqual(grantExperience(state.party.traveler,30));
 });
});
