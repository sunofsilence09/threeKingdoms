import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { createLifeState, isLifeState } from './personLife';
import { withWorldDate } from './worldTime';
import { createWorldConflict, isWorldConflict, dispatchConflictArmy, conflictDay } from './worldConflict';
import { leaderForFaction, factionForPerson } from './worldConflictData';
import { personPosting } from './personPosting';

describe('late institutions and lifetime bounds',()=>{
  it('distinguishes dated rulers, regents, retired people and early deaths',()=>{
    const date={year:249,month:1,day:1}; const life=createLifeState(date,42);
    expect(leaderForFaction('cao',date,life)).toBe('cao-fang');
    expect(leaderForFaction('cao',{year:265,month:1,day:1},life)).toBe('sima-yan');
    expect(leaderForFaction('sun',{year:258,month:1,day:1},life)).toBe('sun-xiu');
    life.people['cao-fang'].deathYear=269;
    expect(leaderForFaction('cao',{year:254,month:1,day:1},life)).toBe('cao-mao');
    life.people['cao-mao'].deathYear=255;
    expect(leaderForFaction('cao',{year:256,month:1,day:1},life)).toBeUndefined();
    expect(()=>conflictDay({year:311,month:1,day:1})).toThrow();
  });
  it('uses living late commanders without drafting owned people or changing city flags',()=>{
    const date={year:253,month:1,day:1};const life=createLifeState(date,42);
    life.people['sima-yi'].deathYear=246;life.people['sima-shi'].deathYear=260;
    const world=createWorldConflict(date,['cao-fang'],42,life);
    world.armies=[];for(const city of Object.values(world.cities)){city.factionId='han';delete city.governorId;}
    world.cities.chenliu.factionId='cao';
    const next=dispatchConflictArmy(world,'chenliu','dongjun',['cao-fang'],life);
    expect(next.armies[0]?.commanderId).toBe('sima-shi');
    expect(next.cities.dongjun.factionId).toBe('han');
  });
  it('keeps an entire184–310campaign valid through every annual boundary',()=>{
    let state=createInitialState(()=>0);
    for(let year=185;year<=310;year++) {
      state=withWorldDate(state,{year,month:1,day:1});
      expect(isLifeState(state.life,state.date),`life${year}`).toBe(true);
      expect(isWorldConflict(state.worldConflict,state.date,Object.keys(state.party),state.life),`world${year}`).toBe(true);
      expect(Object.keys(state.worldConflict!.cities)).toHaveLength(60);
    }
  },60000);
});


describe('Jiang Wei changes institutions with his dated career',()=>{
  it.each([[218,'cao','jixian'],[227,'cao','jixian'],[228,'liu','nanzheng'],[234,'liu','nanzheng']] as const)('keeps the correct faction and posting in%s',(year,factionId,cityId)=>{
    const date={year,month:3,day:1},base=createInitialState(()=>0),life=createLifeState(date,42);
    life.people['zhuge-liang'].deathYear=239;life.handledIds=life.handledIds.filter(id=>id!=='zhuge-liang');
    const world=createWorldConflict(date,[],42,life);
    world.armies=[];
    for(const city of Object.values(world.cities)){city.factionId='han';delete city.governorId;}
    world.cities.jixian.factionId='cao';world.cities.nanzheng.factionId='liu';
    const state={...base,date,life,worldConflict:world};
    expect(factionForPerson('jiang-wei',date)).toBe(factionId);
    expect(personPosting(state,'jiang-wei')).toMatchObject({cityId,factionId,kind:'employed'});
  });
});
