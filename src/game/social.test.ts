import { createCombatState } from './combat';
import { createDuelCombat } from './martialCombat';
import { startDuel } from './martial';
import { makePartyUnit } from './combat';
import { createPrefectId, prefectIdentity } from './prefectIdentity';
import { vi } from 'vitest';
import { describe, it, expect } from 'vitest';
import { createInitialState, isGameState, loadState, saveState, STORAGE_KEY } from './state';
import type { GameState } from './state';
import { createProgress } from './growth';
import { effectiveAttributes } from './characterTalents';
import { interactPerson, invitePerson } from './recruitment';
import { buyGift, giveGift, formBond, bondReason } from './social';
const at = (): GameState => ({ ...createInitialState(() => 0), phase: 'overworld' as const, worldConflict: undefined, life: undefined, date: {year:200,month:5,day:1}, party: {...createInitialState(()=>0).party, 'cai-yan':createProgress(), 'guan-yu':createProgress()}, relationships: {'cai-yan':{affinity:100}, 'guan-yu':{affinity:100}} });
describe('social bonds and gifts',()=>{
 it('allows opposite-sex marriage, rejects same sex and a second spouse',()=>{
  const s=at();expect(formBond(s,'guan-yu','marriage')).toBe(s);
  const married=formBond(s,'cai-yan','marriage');expect(married.relationships['cai-yan'].bond).toBe('marriage');
  expect(married.party.traveler.bondBonus).toBe(2);expect(married.party['cai-yan'].bondBonus).toBe(2);
  expect(formBond(married,'cai-yan','marriage')).toBe(married);
  expect(bondReason({...married,party:{...married.party,'diao-chan':createProgress()},relationships:{...married.relationships,'diao-chan':{affinity:100}}},'diao-chan','marriage')).not.toBe('');
 });
 it('allows both sexes to swear bonds and applies both bonuses once in actual combat attributes',()=>{
  let s=formBond(at(),'guan-yu','sworn');s=formBond(s,'cai-yan','sworn');
  expect(s.party.traveler.bondBonus).toBe(4);expect(s.party['guan-yu'].bondBonus).toBe(2);
  expect(effectiveAttributes('traveler',s.party.traveler.attributes,2,s.party.traveler.bondBonus).strength).toBe(14);
  expect(formBond(s,'guan-yu','sworn')).toBe(s);expect(formBond(s,'cai-yan','marriage')).toBe(s);
 });
 it('rejects low affinity, unavailable and child people',()=>{
  const s=at();expect(formBond({...s,relationships:{}},'cai-yan','marriage').relationships).toEqual({});
  expect(formBond({...s,phase:'battle'},'guan-yu','sworn').phase).toBe('battle');
  expect(bondReason({...s,date:{year:184,month:3,day:1}},'sun-quan','sworn')).not.toBe('');
 });
 it('buys and consumes gifts, caps affinity and never charges rejected actions',()=>{
  let s=at();s={...s,relationships:{'cai-yan':{affinity:95}}};
  const bought=buyGift(s,'jade');expect(bought.economy.coins).toBe(s.economy.coins-600);
  const given=giveGift(bought,'cai-yan','jade');expect(given.relationships['cai-yan'].affinity).toBe(100);expect(given.gifts?.jade).toBe(0);
  expect(giveGift(given,'cai-yan','jade')).toBe(given);expect(buyGift({...s,economy:{...s.economy,coins:0}},'tea').gifts).toBeUndefined();
 });
 it('limits help per calendar month, preserving that record across talk and year boundaries',()=>{
  const s={...at(),relationships:{'guan-yu':{affinity:0}},date:{year:200,month:12,day:28}};
  const helped=interactPerson(s,'guan-yu','help');const later={...helped,date:{year:200,month:12,day:30}};
  expect(interactPerson(later,'guan-yu','help')).toBe(later);
  const talked=interactPerson({...helped,date:{year:200,month:12,day:30}},'guan-yu','talk');
  expect(talked.relationships['guan-yu'].lastHelpMonth).toBe(helped.relationships['guan-yu'].lastHelpMonth);
  expect(interactPerson({...talked,date:{year:201,month:1,day:2}},'guan-yu','help').relationships['guan-yu'].affinity).toBe(28);
 });
 it('keeps bonuses across recruitment, real combat stats and persisted reloads',()=>{
  const s={...at(),date:{year:184,month:3,day:1},currentCityId:'zhuo'};delete s.party['guan-yu'];
  const bonded=formBond(s,'guan-yu','sworn');expect(bonded.party['guan-yu']).toBeUndefined();
  const joined=invitePerson(bonded,'guan-yu');expect(joined.party['guan-yu'].bondBonus).toBe(2);
  const baseline=makePartyUnit('guan-yu',createProgress(),null,'ambush'), boosted=makePartyUnit('guan-yu',joined.party['guan-yu'],null,'ambush');
  expect(boosted.attack).toBeGreaterThan(baseline.attack);expect(boosted.maxHp).toBeGreaterThan(baseline.maxHp);
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
  saveState(joined);const loaded=loadState()!;expect(loaded.party['guan-yu'].bondBonus).toBe(2);expect(loaded.relationships['guan-yu'].bond).toBe('sworn');
  expect(formBond(loaded,'guan-yu','sworn')).toBe(loaded);vi.unstubAllGlobals();
 });
 it('uses the recorded gender of original prefects',()=>{
  const id=Array.from({length:100},(_,i)=>createPrefectId('moling','sun',200,i+1)).find(id=>prefectIdentity(id)?.gender==='female')!;
  const s=at();s.party[id]=createProgress();s.relationships[id]={affinity:100};expect(bondReason(s,id,'marriage')).toBe('');
 });
 it('does not erase monthly help during gifting and rejects travel, daily repeats and full affinity',()=>{
  let s=at();s.relationships['cai-yan']={affinity:0};s=interactPerson(s,'cai-yan','help');
  const bought=buyGift(s,'tea');expect(giveGift(bought,'cai-yan','tea')).toBe(bought);
  const later={...bought,date:{...bought.date,day:3}};const given=giveGift(later,'cai-yan','tea');
  expect(given.relationships['cai-yan'].lastHelpMonth).toBe(s.relationships['cai-yan'].lastHelpMonth);
  expect(interactPerson({...given,date:{...given.date,day:5}},'cai-yan','help').relationships['cai-yan'].affinity).toBe(15);
  expect(giveGift({...later,phase:'battle'},'cai-yan','tea').gifts?.tea).toBe(1);
 });
 it('counts a first gift to a ruler as meeting that ruler',()=>{
  let s:GameState={...at(),date:{year:190,month:3,day:1},currentCityId:'chenliu'};
  s.party['cao-cao']=createProgress();s.relationships['cao-cao']={affinity:0};
  s=buyGift(s,'tea');expect(giveGift(s,'cao-cao','tea').flags['met:cao']).toBe(true);
 });
 it('preserves teacher bond bonuses in duels before and after recruitment',()=>{
  for(const recruited of [false,true]){
   let s:GameState={...at(),date:{year:184,month:3,day:1},currentCityId:'zhuo'};
   delete s.party['guan-yu'];s=formBond(s,'guan-yu','sworn');
   if(recruited)s=invitePerson(s,'guan-yu');
   const started=startDuel(s,'guan-yu');expect(started.duel).toBeDefined();
   const duel=createDuelCombat(createCombatState(null,started.party,'ambush',['traveler']),started);
   const teacher=duel.units.find(u=>u.id==='guan-yu'||u.id==='enemy:guan-yu')!;
   const expected=makePartyUnit('guan-yu',{...createProgress(3),bondBonus:2},null,'route',7,4);
   expect(teacher.maxHp).toBe(expected.maxHp);expect(teacher.attack).toBe(expected.attack);
  }
 });
 it('keeps new fields valid through JSON and rejects invalid gift quantities',()=>{
  const s=buyGift(formBond(at(),'guan-yu','sworn'),'tea');expect(isGameState(JSON.parse(JSON.stringify(s)))).toBe(true);
  expect(isGameState({...s,gifts:{tea:-1}})).toBe(false);
 });
});
