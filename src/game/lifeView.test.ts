import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { createLifeState } from './personLife';
import * as view from './lifeView';
import { filterRecruitProfiles } from './recruitmentView';
import { RECRUIT_PROFILES } from './recruitmentCatalog';
import { personName } from './heroName';

describe('life presentation and person filtering', () => {
  const makeState = () => {
    const state=createInitialState(()=>0);state.life=createLifeState(state.date,42);
    state.life.people['cao-cao'].deathYear=225;
    return state;
  };
  it('explains unborn, child and dead access without revealing a living campaign death', () => {
    const state=makeState();
    expect(view.lifeAccessNote(state,'cao-pi')).toContain('尚未出生');
    state.date={year:190,month:1,day:1};
    expect(view.lifeAccessNote(state,'cao-pi')).toContain('未满16岁');
    expect(view.lifeReferenceText(state,'cao-cao')).toContain('约35岁');
    expect(view.lifeReferenceText(state,'cao-cao')).toContain('史料');
    expect(view.lifeReferenceText(state,'cao-cao')).not.toContain('225');
    state.date.year=225;
    expect(view.lifeAccessNote(state,'cao-cao')).toContain('已经离世');
    expect(view.lifeReferenceText(state,'cao-cao')).toContain('本局于225年离世');
    expect(view.lifeReferenceText(state,'liu-chen')).toContain('固定游戏估生年234');
  });
  it('filters the whole register by life status and searches era city aliases', () => {
    const state=makeState();state.worldConflict=undefined;
    const unborn=filterRecruitProfiles(RECRUIT_PROFILES,state,{all:true,query:'曹丕',category:'all',life:'unborn'});
    expect(unborn.map(person=>person.id)).toEqual(['cao-pi']);
    expect(filterRecruitProfiles(RECRUIT_PROFILES,state,{all:true,query:'曹丕',category:'all',life:'alive'})).toEqual([]);
    const alias=filterRecruitProfiles(RECRUIT_PROFILES,state,{all:true,query:'南京',category:'garrison'});
    expect(alias.map(person=>person.id)).toEqual(['garrison:moling:soldier','garrison:moling:captain']);
    expect(personName('garrison:moling:captain',{...state,date:{year:212,month:1,day:1}})).toBe('建业·士兵长');
  });
  it('acknowledges notices once while retaining memorial growth and relationship records', () => {
    const state=makeState();
    state.life!.notices=[{id:'cao-cao',deathYear:225,migrated:false}];
    state.life!.memorials['cao-cao']={id:'cao-cao',deathYear:225,age:70,progress:state.party.aman,relationship:{affinity:91,lastInteraction:1}};
    const after=view.acknowledgeLifeNotices(state);
    expect(after.life?.notices).toEqual([]);
    expect(after.life?.memorials).toBe(state.life!.memorials);
    expect(view.acknowledgeLifeNotices(after)).toBe(after);
  });
});
