import {describe,expect,it} from 'vitest';
import {createInitialState} from './state';
import {createPrefectId,prefectIdentity} from './prefectIdentity';
import {recruitProfile,RECRUIT_PROFILES,allRecruitProfiles} from './recruitmentCatalog';
describe('encountered original prefect profiles',()=>{
  it('resolves a stable civic appearance and explicit original source from the ID',()=>{
    const id=createPrefectId('moling','sun',221,7),person=prefectIdentity(id)!;
    const profile=recruitProfile(id)!;
    expect(profile).toBeDefined();expect(profile.name).toBe(person.name);expect(profile.portrait).toBe(person.portrait);
    expect(profile.category).toBe('official');expect(profile.readOnly).not.toBe(true);
    expect(profile.bio).toContain('游戏人物');expect(profile.bio).toContain('原创');
    expect(profile.windows[0].cityIds).toEqual(['moling']);expect(recruitProfile('prefect-missing-sun-221-7')).toBeUndefined();
  });
  it('lists only actual known generated identities, once, alongside the historical catalog',()=>{
    const state=createInitialState(()=>0),id=createPrefectId('moling','sun',221,7);
    const keys=new Set(allRecruitProfiles(state).map(p=>p.id));
    expect(RECRUIT_PROFILES.every(p=>keys.has(p.id))).toBe(true);expect(keys.has(id)).toBe(false);
    state.life!.people[id]={birthYear:prefectIdentity(id)!.birthYear,deathYear:prefectIdentity(id)!.deathBaseYear};
    state.party[id]=state.party.aman;state.worldConflict!.cities.moling.governorId=id;
    const profiles=allRecruitProfiles(state);
    expect(profiles.filter(p=>p.id===id)).toHaveLength(1);expect(new Set(profiles.map(p=>p.id)).size).toBe(profiles.length);
  });
});
