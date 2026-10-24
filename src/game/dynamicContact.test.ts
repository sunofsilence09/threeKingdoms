import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { createWorldConflict } from './worldConflict';
import { cityContact, resolveTravelEvent, startTravel } from './travel';
import { personPosting } from './personPosting';

describe('personal faction encounters follow actual postings', () => {
  it('does not meet a campaigning ruler at their old historical city', () => {
    const state={...createInitialState(()=>0),date:{year:190,month:1,day:1},currentCityId:'chenliu',phase:'overworld' as const};
    state.worldConflict=createWorldConflict(state.date,Object.keys(state.party));
    expect(personPosting(state,'cao-cao')?.kind).toBe('campaign');
    expect(cityContact('chenliu',state.date,state)).toBeUndefined();
    expect(cityContact('chenliu',state.date)).toBe('cao');
  });
  it('offers a ruler at the actual appointed city instead of a stale regional shortcut', () => {
    const state={...createInitialState(()=>0),date:{year:190,month:1,day:1},currentCityId:'ye',phase:'overworld' as const};
    state.worldConflict=createWorldConflict(state.date,Object.keys(state.party));
    state.worldConflict.armies.forEach(army=>{if(army.commanderId==='cao-cao')delete army.commanderId;});
    state.worldConflict.cities.ye={factionId:'cao',troops:5000,occupationDay:state.worldConflict.lastDay,governorId:'cao-cao'};
    expect(personPosting(state,'cao-cao')?.cityId).toBe('ye');
    expect(cityContact('ye',state.date,state)).toBe('cao');
    expect(cityContact('chenliu',state.date,state)).toBeUndefined();
  });
  it('resolves a migrated stale contact without falsely recording a personal meeting', () => {
    const state={...createInitialState(()=>0),date:{year:190,month:1,day:1},currentCityId:'chenliu',phase:'overworld' as const};
    state.worldConflict=createWorldConflict(state.date,Object.keys(state.party));
    const traveling=startTravel(state,'henan',23);
    const stale={...traveling,journey:{...traveling.journey!,event:{id:0,kind:'contact' as const,contact:'cao' as const,cgSeen:true}}};
    const result=resolveTravelEvent(stale,'meet');
    expect(result.flags['met:cao']).not.toBe(true);expect(result.journey?.event).toBeUndefined();
    expect(result.travelNotice).toContain('未能');
  });
});
