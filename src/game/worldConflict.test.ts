import { describe, expect, it } from 'vitest';
import { advanceWorldConflict, armyRemainingDays, conflictDay, conflictRoadDays, createWorldConflict, dispatchConflictArmy, isWorldConflict } from './worldConflict';
import { CONFLICT_FACTIONS, factionAt, leaderForFaction } from './worldConflictData';
import { WORLD_CITIES } from './world';
import { garrisonTroopsAt } from './garrisonSchedule';
import type { WorldConflict } from './worldConflictTypes';

const date = (day: number) => ({ year: 184 + Math.floor(day / 360), month: Math.floor(day % 360 / 30) + 1, day: day % 30 + 1 });
const total = (w: WorldConflict) => Object.values(w.cities).reduce((n,c) => n+c.troops,0)+w.armies.reduce((n,a)=>n+a.troops,0);
const conserved = (w: WorldConflict) => expect(total(w)).toBe(w.ledger.initial+w.ledger.recruited+w.ledger.raised-w.ledger.losses);
function campaign(targetTroops=1000) {
  const w=createWorldConflict(date(16*360),[],1729);
  w.armies=[];w.reports=[];
  for(const c of Object.values(w.cities)) {c.factionId='han';c.troops=5000;delete c.governorId;}
  w.cities.chenliu.factionId='cao';w.cities.chenliu.troops=10000;
  w.cities.xuxian.factionId='cao';w.cities.xuxian.troops=10000;
  w.cities.dongjun.factionId='liu';w.cities.dongjun.troops=targetTroops;
  for(const f of Object.keys(w.nextDecision)) w.nextDecision[f]=w.lastDay+30;
  w.ledger={initial:total(w),recruited:0,raised:0,losses:0};
  return w;
}
function until(w:WorldConflict,predicate:(w:WorldConflict)=>boolean,max=100) {
  for(let n=0;n<max&&!predicate(w);n++) {w=advanceWorldConflict(w,date(w.lastDay+1));conserved(w);}
  return w;
}

describe('persistent world conflict', () => {
  it('starts 36 real stocks and a finite authored 184 rebellion without anachronistic rulers', () => {
    const w = createWorldConflict(date(60));
    expect(Object.keys(w.cities)).toHaveLength(36);
    expect(Object.values(w.cities).every(c=>c.troops===5000)).toBe(true);
    expect(new Set(CONFLICT_FACTIONS.map(f=>f.id)).size).toBe(CONFLICT_FACTIONS.length);
    expect(w.cities.julu.factionId).toBe('han');
    expect(w.cities.changan.factionId).toBe('han');
    expect(leaderForFaction('sun',date(60))).toBe('sun-jian');
    expect(leaderForFaction('yi',date(60))).toBeUndefined();
    expect(w.armies.some(a=>a.factionId==='yellow-turban')).toBe(true);
    expect(w.armies.some(a=>a.commanderId==='sun-ce'||a.commanderId==='liu-zhang')).toBe(false);
    expect(factionAt('han').name).toBeTruthy();
    expect(isWorldConflict(w,date(60))).toBe(true);
    conserved(w);
  });
  it('snapshots the migration date with the unchanged legacy count schedule', () => {
    const d={year:200,month:11,day:12}, w=createWorldConflict(d);
    WORLD_CITIES.forEach(c=>expect(w.cities[c.id].troops).toBe(garrisonTroopsAt(c.id,d).troops));
    expect(w.lastDay).toBe(conflictDay(d)); conserved(w);
  });
  it('advances deterministically by saved days and never mutates the input', () => {
    const w=createWorldConflict(date(60),[],123), before=JSON.stringify(w);
    let step=w;
    for(let day=61;day<=800;day++) step=advanceWorldConflict(step,date(day));
    expect(advanceWorldConflict(w,date(800))).toEqual(step);
    expect(advanceWorldConflict(JSON.parse(JSON.stringify(advanceWorldConflict(w,date(400)))),date(800))).toEqual(step);
    expect(JSON.stringify(w)).toBe(before); conserved(step);
    expect(advanceWorldConflict(step,date(800))).toEqual(step);
  });
  it('rejects corruption instead of silently reconstructing a new world', () => {
    const w=createWorldConflict(date(60));
    for(const mutate of [
      (x:any)=>delete x.cities.ye, (x:any)=>x.cities.ye.troops=-1,
      (x:any)=>x.cities.ye.factionId='invented', (x:any)=>x.seed=NaN,
      (x:any)=>x.lastDay=61, (x:any)=>x.nextArmyId=0,
      (x:any)=>x.founded.push('unknown'), (x:any)=>x.ledger.losses++,
      (x:any)=>{x.cities.ye.governorId='sun-ce';},
      (x:any)=>{x.cities.ye.governorId='liu-zhang';},
      (x:any)=>{x.cities.ye=Object.assign(Object.create(null),x.cities.ye);},
    ]) { const x=structuredClone(w); mutate(x); expect(isWorldConflict(x,date(60))).toBe(false); }
    expect(isWorldConflict(null,date(60))).toBe(false);
    expect(isWorldConflict([],date(60))).toBe(false);
  });
  it('actually besieges and captures during 184 and stays bounded through 200', () => {
    let w=createWorldConflict(date(60),['cao-cao','sun-jian'],42), captures=0, sieges=0;
    for(let day=61;day<=16*360;day++) {
      const next=advanceWorldConflict(w,date(day),['cao-cao','sun-jian']);
      captures+=next.reports.filter(r=>r.id>=w.nextReportId&&r.kind==='capture').length;
      sieges+=next.reports.filter(r=>r.id>=w.nextReportId&&r.kind==='siege').length;
      if(day===359) expect(captures).toBeGreaterThan(0);
      expect(next.armies.length).toBeLessThanOrEqual(12);
      expect(next.reports.length).toBeLessThanOrEqual(50);
      expect(next.armies.every(a=>armyRemainingDays(a)>=0&&!['cao-cao','sun-jian'].includes(a.commanderId??''))).toBe(true);
      expect(isWorldConflict(next,date(day),['cao-cao','sun-jian'])).toBe(true);
      conserved(next); w=next;
    }
    expect(captures).toBeGreaterThan(0); expect(sieges).toBeGreaterThan(0);
  },30000);
  it('deducts two real nearby sources and spends actual support and road days before a siege',()=>{
    const initial=campaign(),w=dispatchConflictArmy(initial,'chenliu','dongjun',['cao-cao']);
    expect(initial.armies).toHaveLength(0);
    expect(w.armies).toHaveLength(1); const a=w.armies[0];
    expect(a.commanderId).not.toBe('cao-cao');
    expect(a.contributions).toEqual([{cityId:'chenliu',troops:6000},{cityId:'xuxian',troops:6000}]);
    expect(w.cities.chenliu.troops).toBe(4000);expect(w.cities.xuxian.troops).toBe(4000);
    expect(a.phase).toBe('assembling');expect(a.phaseDays).toBe(conflictRoadDays('xuxian','chenliu'));
    expect(armyRemainingDays(a)).toBe(a.phaseDays+conflictRoadDays('chenliu','dongjun'));
    const before=advanceWorldConflict(w,date(w.lastDay+a.phaseDays+conflictRoadDays('chenliu','dongjun')-1));
    expect(before.armies[0].phase).toBe('marching');
    const at=advanceWorldConflict(before,date(before.lastDay+1));
    expect(at.armies[0].phase).toBe('sieging');expect(at.armies[0].phaseDays).toBeGreaterThanOrEqual(3);expect(at.armies[0].phaseDays).toBeLessThanOrEqual(10);
    const won=until(at,x=>x.cities.dongjun.factionId==='cao');
    expect(won.cities.dongjun.factionId).toBe('cao');expect(won.cities.dongjun.occupationDay).toBe(won.lastDay);
    expect(won.reports.some(r=>r.kind==='capture')).toBe(true);expect(won.armies).toHaveLength(0);conserved(won);
  });
  it('cannot assemble through an enemy corridor and cannot dispatch without the reserve',()=>{
    const w=campaign();w.cities.xuxian.factionId='liu';
    w.cities.henan.factionId='cao';w.cities.henan.troops=10000;
    w.cities.chenliu.troops=2000;
    expect(dispatchConflictArmy(w,'chenliu','dongjun')).toEqual(w);
    w.cities.chenliu.troops=5000;w.cities.henan.factionId='liu';
    w.cities.yingchuan.factionId='cao';
    const sent=dispatchConflictArmy(w,'chenliu','dongjun');
    expect(sent.armies[0].contributions).toHaveLength(1);expect(sent.cities.chenliu.troops).toBe(2000);
  });
  it('uses arrival ownership instead of attacking a friendly city from an obsolete order',()=>{
    const w=dispatchConflictArmy(campaign(),'chenliu','dongjun');w.cities.dongjun.factionId='cao';
    const next=until(w,x=>!x.armies.length);
    expect(next.reports.some(r=>r.kind==='siege')).toBe(false);expect(next.reports.some(r=>r.kind==='return')).toBe(true);conserved(next);
  });
  it('losing armies return only after the actual road journey',()=>{
    const w=dispatchConflictArmy(campaign(18000),'chenliu','dongjun');
    const lost=until(w,x=>x.reports.some(r=>r.kind==='defeat'));
    expect(lost.cities.dongjun.factionId).toBe('liu');expect(lost.armies[0].phase).toBe('retreating');
    expect(lost.cities.chenliu.troops).toBeLessThan(5000);
    const road=armyRemainingDays(lost.armies[0]);expect(road).toBeGreaterThan(0);
    const before=advanceWorldConflict(lost,date(lost.lastDay+road-1));expect(before.armies).toHaveLength(1);
    const home=advanceWorldConflict(before,date(before.lastDay+1));expect(home.armies).toHaveLength(0);
    expect(home.cities.chenliu.troops).toBeGreaterThan(lost.cities.chenliu.troops);conserved(home);
  });
  it('redirects an assembly whose source was captured and disbands an army with no reachable base',()=>{
    const w=dispatchConflictArmy(campaign(),'chenliu','dongjun');w.cities.chenliu.factionId='liu';
    const redirected=advanceWorldConflict(w,date(w.lastDay+1));
    expect(redirected.armies[0].phase).toBe('retreating');expect(redirected.armies[0].targetCityId).toBe('xuxian');
    expect(redirected.cities.xuxian.troops).toBe(4000);conserved(redirected);
    redirected.cities.xuxian.factionId='liu';
    const none=advanceWorldConflict(redirected,date(redirected.lastDay+1));
    expect(none.armies).toHaveLength(0);expect(none.reports.at(-1)?.kind).toBe('disband');conserved(none);
  });
  it('retains full-city overflow as a camped army without losing or copying it',()=>{
    const w=campaign();for(const c of Object.values(w.cities))c.troops=20000;
    w.armies=[{id:'army-999',factionId:'cao',sourceCityId:'chenliu',targetCityId:'chenliu',troops:7000,contributions:[],phase:'retreating',path:['chenliu'],legIndex:0,legDay:0,phaseDays:0}];w.nextArmyId=1000;
    w.ledger={initial:total(w),recruited:0,raised:0,losses:0};
    const next=advanceWorldConflict(w,date(w.lastDay+1));
    expect(next.armies[0].phase).toBe('camped');expect(next.armies[0].troops).toBe(7000);conserved(next);
    const quiet=advanceWorldConflict(next,date(next.lastDay+10));
    expect(quiet.reports.filter(r=>r.kind==='camp')).toHaveLength(1);conserved(quiet);
  });
  it('validates commander uniqueness, lawful paths, exact IDs and siege location',()=>{
    const w=dispatchConflictArmy(campaign(),'chenliu','dongjun');
    expect(isWorldConflict(w,date(w.lastDay))).toBe(true);
    for(const mutate of [
      (x:WorldConflict)=>x.armies[0].path=['chenliu','wujun'],
      (x:WorldConflict)=>x.armies[0].commanderId='garrison:chenliu:captain',
      (x:WorldConflict)=>x.armies[0].commanderId='sun-ce',
      (x:WorldConflict)=>{x.armies[0].phase='sieging';x.armies[0].phaseDays=1;},
      (x:WorldConflict)=>{x.cities.ye.governorId=x.armies[0].commanderId;},
      (x:WorldConflict)=>{x.nextArmyId=Number.MAX_SAFE_INTEGER+1;},
    ]){const bad=structuredClone(w);mutate(bad);expect(isWorldConflict(bad,date(bad.lastDay))).toBe(false);}
    expect(isWorldConflict(w,date(w.lastDay),[w.armies[0].commanderId!])).toBe(false);
  });
  it('binds a dated historical prefect only when active, at home and serving the current faction',()=>{
    const w=createWorldConflict({year:190,month:1,day:1},['liu-biao']);
    expect(w.cities.xiangyang.governorId).toBeUndefined();
    expect(w.cities.nanyang.governorId).not.toBe('yuan-shu'); // Actual founder army has its commander abroad.
    expect(createWorldConflict({year:190,month:1,day:1}).cities.xiangyang.governorId).toBe('liu-biao');
    expect(isWorldConflict(w,{year:190,month:1,day:1},['liu-biao'])).toBe(true);
  });
  it('never overwrites a previously captured city with a later historical foundation',()=>{
    const w=createWorldConflict({year:187,month:12,day:30});
    w.cities.shujun.factionId='cao';w.cities.shujun.occupationDay=w.lastDay;
    const next=advanceWorldConflict(w,{year:188,month:1,day:1});
    expect(next.founded).toContain('yi-188');expect(next.cities.shujun.factionId).toBe('cao');
    expect(next.cities.jiangzhou.factionId).toBe('yi');conserved(next);
  });
  it('admits only one siege when hostile waves arrive simultaneously and uses the latest third-party owner',()=>{
    const w=campaign();
    const make=(id:string,factionId:string)=>({id,factionId,sourceCityId:'chenliu',targetCityId:'dongjun',troops:8000,contributions:[],phase:'marching' as const,path:['chenliu','dongjun'],legIndex:0,legDay:conflictRoadDays('chenliu','dongjun')-1,phaseDays:0});
    w.armies=[make('army-999','cao'),make('army-1000','han')];w.nextArmyId=1001;
    w.ledger.initial=total(w);
    const at=advanceWorldConflict(w,date(w.lastDay+1));
    expect(at.armies.filter(a=>a.phase==='sieging')).toHaveLength(1);
    expect(at.armies.find(a=>a.id==='army-1000')?.phase).toBe('retreating');
    at.cities.dongjun.factionId='sun';
    const next=until(at,x=>x.reports.some(r=>r.kind==='capture'));
    expect(next.reports.find(r=>r.kind==='capture')?.opponentFactionId).toBe('sun');conserved(next);
  });
  it('enforces two active armies per faction and twelve globally',()=>{
    const w=campaign();w.cities.henan.factionId='cao';w.cities.yingchuan.factionId='cao';
    const twice=dispatchConflictArmy(dispatchConflictArmy(w,'chenliu','dongjun'),'henan','taiyuan');
    expect(twice.armies).toHaveLength(2);
    expect(dispatchConflictArmy(twice,'yingchuan','nanyang').armies).toHaveLength(2);conserved(twice);
    const ids=CONFLICT_FACTIONS.slice(0,12).map(f=>f.id);
    const full=campaign();full.armies=ids.map((f,i)=>({id:`army-${100+i}`,factionId:f,sourceCityId:'henan',targetCityId:'henan',troops:100,contributions:[],phase:'camped',path:['henan'],legIndex:0,legDay:0,phaseDays:0}));full.nextArmyId=200;full.ledger.initial=total(full);
    expect(dispatchConflictArmy(full,'chenliu','dongjun').armies).toHaveLength(12);conserved(full);
  });
  it('applies monthly +50 once and never applies future legacy historical deductions',()=>{
    const w=createWorldConflict({year:184,month:10,day:30});
    w.ledger.losses+=w.armies.reduce((n,a)=>n+a.troops,0);w.armies=[];
    for(const f of Object.keys(w.nextDecision))w.nextDecision[f]=w.lastDay+100;
    w.cities.ye.troops=20000;w.ledger.initial+=20000-5350;
    const next=advanceWorldConflict(w,{year:184,month:11,day:1});
    expect(next.cities.julu.troops).toBe(w.cities.julu.troops+50);
    expect(next.cities.ye.troops).toBe(20000);
    expect(next.ledger.recruited-w.ledger.recruited).toBe(35*50);
    expect(advanceWorldConflict(next,{year:184,month:11,day:1})).toBe(next);conserved(next);
  });
  it('does not resurrect an eliminated faction when its later historical leader becomes available',()=>{
    const w=createWorldConflict({year:194,month:12,day:30});
    w.ledger.losses+=w.armies.reduce((n,a)=>n+a.troops,0);w.armies=[];
    for(const c of Object.values(w.cities))if(c.factionId==='sun'){c.factionId='han';c.occupationDay=w.lastDay;}
    for(const f of Object.keys(w.nextDecision))w.nextDecision[f]=w.lastDay+100;
    const raised=w.ledger.raised,next=advanceWorldConflict(w,{year:195,month:1,day:1});
    expect(next.founded).toContain('sun-195');expect(next.ledger.raised).toBe(raised);
    expect(Object.values(next.cities).some(c=>c.factionId==='sun')).toBe(false);
    expect(next.armies.some(a=>a.factionId==='sun')).toBe(false);conserved(next);
  });
  it('rejects impossible army stocks even when a tampered ledger balances',()=>{
    const w=dispatchConflictArmy(campaign(),'chenliu','dongjun');
    const oversized=structuredClone(w);oversized.ledger.initial+=24001-oversized.armies[0].troops;oversized.armies[0].troops=24001;
    expect(isWorldConflict(oversized,date(w.lastDay))).toBe(false);
    const copied=structuredClone(w);copied.armies[0].contributions[0].troops=1;
    expect(isWorldConflict(copied,date(w.lastDay))).toBe(false);
  });
  it('rejects missing due stages rather than allowing a validated save to raise troops twice',()=>{
    const w=createWorldConflict(date(60));w.founded=[];
    expect(isWorldConflict(w,date(60))).toBe(false);
    const late=createWorldConflict({year:200,month:1,day:1});late.founded.pop();
    expect(isWorldConflict(late,{year:200,month:1,day:1})).toBe(false);
  });
  it('rejects an actual future ruler even when the tampered city has their matching faction',()=>{
    const w=createWorldConflict(date(60));w.cities.ye.factionId='yi';w.cities.ye.governorId='liu-zhang';
    expect(isWorldConflict(w,date(60))).toBe(false);
    w.cities.ye.factionId='sun';w.cities.ye.governorId='sun-ce';
    expect(isWorldConflict(w,date(60))).toBe(false);
  });
  it('rejects a forward army path whose origin was replaced with another known city',()=>{
    const w=createWorldConflict(date(60));w.armies[0].path=['ye'];w.armies[0].targetCityId='ye';
    expect(isWorldConflict(w,date(60))).toBe(false);
    const a=dispatchConflictArmy(campaign(),'chenliu','dongjun');
    a.armies[0].path=['ye','dongjun'];
    expect(isWorldConflict(a,date(a.lastDay))).toBe(false);
  });
  it('rejects a city or army belonging to a faction whose foundation is still in the future',()=>{
    const w=createWorldConflict(date(60));w.cities.ye.factionId='yi';
    expect(isWorldConflict(w,date(60))).toBe(false);
    w.cities.ye.factionId='han';w.armies[0].factionId='yi';
    expect(isWorldConflict(w,date(60))).toBe(false);
  });
  it('requires all active decision clocks and rejects future or suspended clocks',()=>{
    for(const mutate of [
      (w:WorldConflict)=>{w.nextDecision={};},
      (w:WorldConflict)=>{delete w.nextDecision['yellow-turban'];},
      (w:WorldConflict)=>{w.nextDecision.yi=w.lastDay+1;},
      (w:WorldConflict)=>{w.nextDecision.han=w.lastDay+31;},
      (w:WorldConflict)=>{w.nextDecision.han=w.lastDay-1;},
    ]) {const w=createWorldConflict(date(60));mutate(w);expect(isWorldConflict(w,date(60))).toBe(false);}
  });
  it('finishes an already started road leg before rerouting when the retreat destination falls',()=>{
    const setup=(elapsed:number,reachable=false)=>{
      const w=campaign();w.lastDay+=9;
      for(const c of Object.values(w.cities)){c.factionId='han';c.troops=5000;}
      w.cities.ye.factionId='cao';w.cities.dongjun.factionId='liu';w.cities.chenliu.factionId='liu';
      if(reachable)w.cities.henan.factionId='cao';
      w.armies=[{id:'army-999',factionId:'cao',sourceCityId:'ye',targetCityId:'chenliu',troops:1000,contributions:[],phase:'retreating',path:['dongjun','chenliu'],legIndex:0,legDay:elapsed,phaseDays:0}];w.nextArmyId=1000;
      w.ledger={initial:total(w),recruited:0,raised:0,losses:0};return w;
    };
    const early=setup(1);expect(isWorldConflict(early,date(early.lastDay))).toBe(true);
    const walking=advanceWorldConflict(early,date(early.lastDay+1));
    expect(walking.armies[0].path).toEqual(['dongjun','chenliu']);expect(walking.armies[0].legDay).toBe(2);conserved(walking);
    const last=setup(conflictRoadDays('dongjun','chenliu')-1),arrived=advanceWorldConflict(last,date(last.lastDay+1));
    expect(arrived.armies).toHaveLength(0);expect(arrived.reports.at(-1)?.kind).toBe('disband');conserved(arrived);
    const possible=setup(conflictRoadDays('dongjun','chenliu')-1,true),rerouted=advanceWorldConflict(possible,date(possible.lastDay+1));
    expect(rerouted.armies[0].path).toEqual(['chenliu','henan']);expect(rerouted.armies[0].legDay).toBe(0);conserved(rerouted);
    expect(isWorldConflict(rerouted,date(rerouted.lastDay))).toBe(true);
  });
});
