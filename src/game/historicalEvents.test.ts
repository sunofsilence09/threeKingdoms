import {describe,it,expect} from 'vitest';
import {createInitialState} from './state';
import {withWorldDate} from './worldTime';
import {HISTORY_EVENTS, migrateHistory, participateHistory} from './historicalEvents';
describe('historical events',()=>{
 it('records every crossed node once without blocking time',()=>{const s={...createInitialState(()=>0),conflictRecovery:true,worldConflict:undefined};const n=withWorldDate(s,{year:280,month:12,day:30});expect(n.history?.entries.length).toBe(HISTORY_EVENTS.length);expect(withWorldDate(n,n.date).history).toEqual(n.history);expect(n.history?.entries.filter(e=>!e.read).length).toBeGreaterThan(25);});
 it('backfills old saves as read and prevents retroactive support',()=>{const h=migrateHistory(undefined,{year:208,month:12,day:1});expect(h.entries.every(e=>e.read&&e.legacy)).toBe(true);const s={...createInitialState(()=>0),date:{year:208,month:12,day:1},history:h,currentCityId:'jiangling'};expect(participateHistory(s,'chibi')).toBe(s);});
});
import {historySupportReason,advanceHistory} from './historicalEvents';
function supportState(){const base=createInitialState(()=>0);const date={year:200,month:5,day:1};return {...base,date,phase:'overworld' as const,currentCityId:'xuxian',supplies:10,economy:{...base.economy,coins:500},history:{version:1 as const,entries:[{id:'guandu',read:false,legacy:false}]},worldConflict:{...base.worldConflict!,cities:{...base.worldConflict!.cities,xuxian:{factionId:'cao',troops:100,occupationDay:0}}}};}
describe('historical support safeguards',()=>{
 it('grants the named ally affinity once without resetting monthly help',()=>{
  const s=supportState();s.relationships['cao-cao']={affinity:98,lastHelpMonth:196};
  const n=participateHistory(s,'guandu');
  expect(n.relationships['cao-cao']).toMatchObject({affinity:100,lastHelpMonth:196});
  expect(participateHistory(n,'guandu')).toBe(n);
 });
 it('applies explicit cost time and reward exactly once across JSON reload',()=>{const s=supportState();expect(historySupportReason(s,'guandu')).toBeUndefined();const n=participateHistory(s,'guandu');expect(n.economy.coins).toBe(550);expect(n.supplies).toBe(9);expect(n.date.day).toBe(6);const restored=JSON.parse(JSON.stringify(n));expect(participateHistory(restored,'guandu')).toBe(restored);});
 it('rejects wrong city, faction, poverty, and insufficient completion time',()=>{const s=supportState();for(const bad of [{...s,currentCityId:'ye'},{...s,economy:{...s.economy,coins:0}},{...s,supplies:0},{...s,date:{year:200,month:12,day:29}},{...s,worldConflict:{...s.worldConflict,cities:{...s.worldConflict.cities,xuxian:{factionId:'yuan',troops:1,occupationDay:0}}}}])expect(participateHistory(bad,'guandu')).toBe(bad);});
 it('does not revive an absent or dead required person',()=>{const s=supportState();expect(participateHistory({...s,life:undefined},'guandu').history).toEqual(s.history);const life={...s.life!,people:{...s.life!.people,'cao-cao':{...s.life!.people['cao-cao'],deathYear:199}}};expect(historySupportReason({...s,life},'guandu')).toBeTruthy();});
 it('repairs corrupt progress silently and excludes unknown IDs',()=>{const h=migrateHistory({version:1,entries:[{id:'evil',read:false,legacy:false,participated:true}]},{year:200,month:1});expect(h.entries.every(e=>e.legacy&&e.read)).toBe(true);expect(h.entries.some(e=>e.id==='evil')).toBe(false);});
 it('does not record a future node before boundary or duplicate on reentry',()=>{const s=supportState();const before={...s,date:{year:207,month:12,day:30},history:migrateHistory(undefined,{year:207,month:12,day:30})};const at=advanceHistory(before,{year:208,month:1,day:1});expect(at.entries.filter(e=>e.id==='chibi')).toHaveLength(1);expect(advanceHistory({...before,history:at},{year:208,month:1,day:1})).toBe(at);});
});
