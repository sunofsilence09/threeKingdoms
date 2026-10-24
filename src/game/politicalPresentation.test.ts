import { describe,expect,it } from 'vitest';
import { createInitialState } from './state';
import { createProgress } from './growth';
import { createLifeState } from './personLife';
import { cityContact } from './travel';
import { eventPresentation } from './eventContent';
import * as presentation from './politicalPresentation';

describe('current political names at presentation boundaries',()=>{
  const laterState=()=>{
    const state=createInitialState(()=>0);state.date={year:221,month:3,day:1};state.currentCityId='henan';state.phase='overworld';state.conflictRecovery=true;
    state.life=createLifeState(state.date,42);state.life.people['cao-cao'].deathYear=215;state.life.people['cao-pi'].deathYear=231;
    return state;
  };
  it('uses the living Cao Pi for the same contact route that the game exposes in 221',()=>{
    const state=laterState();
    expect(cityContact('henan',state.date,state)).toBe('cao');
    expect(presentation.routePrincipalName('cao',state)).toBe('曹丕');
    expect(presentation.routePrincipalName('cao',state)).not.toContain('曹操');
  });
  it('uses the institution and offers no principal visit when its ruler is already同行',()=>{
    const state=laterState();state.party['cao-pi']=createProgress();
    expect(cityContact('henan',state.date,state)).toBeUndefined();
    expect(presentation.routePrincipalId('cao',state)).toBeUndefined();
    expect(presentation.routePrincipalName('cao',state)).toBe('曹氏军府');
  });
  it('falls back to the military institution when the current political principal has died',()=>{
    const state=laterState();state.life!.people['cao-pi'].deathYear=221;
    expect(presentation.routePrincipalName('cao',state)).toBe('曹氏军府');
    expect(presentation.routeInstitutionName('liu')).toBe('刘氏军府');
  });
  it('renders saved contact events with the same living principal and no dead predecessor',()=>{
    const state=laterState();
    state.journey={path:['hongnong','henan'],legIndex:0,legDay:1,elapsed:1,seed:42,serial:1,event:{id:1,kind:'contact',contact:'cao',cgSeen:true}};
    expect(eventPresentation(state).body).toContain('曹丕');
    expect(eventPresentation(state).body).not.toContain('曹操');
    state.life!.people['cao-pi'].deathYear=221;
    expect(eventPresentation(state).body).toContain('曹氏军府');
  });
});
