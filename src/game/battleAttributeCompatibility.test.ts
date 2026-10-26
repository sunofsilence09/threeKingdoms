import { describe, expect, it } from 'vitest';
import { checkpointBattle, isBattleSnapshot } from './battleSave';
import { createCombatState, makePartyUnit, updateUnitHp, type CombatState } from './combat';
import { createInitialState } from './state';
import { makeGarrisonUnit } from './garrisonCombat';
import { formationStrength } from './garrisonStrength';

function fixture() {
  const state={...createInitialState(()=>0),phase:'battle' as const,encounter:'ambush' as const};
  return {state, snapshot:checkpointBattle(createCombatState(null,state.party),state)};
}
function formationSnapshot(version:1|2=2) {
  const {state,snapshot}=fixture();const guard=makeGarrisonUnit('zhuo',4,7,4);
  const formation=formationStrength(4,29,version);
  Object.assign(guard,{formation,hp:29,maxHp:40,attack:formation.attack,defense:formation.defense});
  return checkpointBattle({...snapshot,attributeVersion:version,selectedId:snapshot.units[0].id,units:[snapshot.units[0],guard]},state);
}
const reordered=(value:unknown):unknown=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reordered(v)])):value;

describe('versioned talent checkpoint compatibility',()=>{
  it('rejects unrecognized combat markers while accepting both explicit versions and missing 1.0 markers',()=>{
    const {state,snapshot}=fixture();
    for(const marker of [0,3,-1,1.5,'2',null,{},false])expect(isBattleSnapshot({...snapshot,attributeVersion:marker},state),String(marker)).toBe(false);
    for(const marker of [undefined,1,2])expect(isBattleSnapshot({...snapshot,attributeVersion:marker},state)).toBe(true);
  });
  it('accepts original version1 saved battles without touching recorded health, stats, RNG or cultivation',()=>{
    const {state,snapshot}=fixture();delete snapshot.attributeVersion;
    snapshot.units=snapshot.units.map(u=>u.team==='party'?{...u,...makePartyUnit(u.id,state.party[u.id],state.route,'ambush',u.x,u.y,1),martialIds:u.martialIds,martialReady:u.martialReady,effects:u.effects}:u);
    const before=JSON.stringify(snapshot);
    expect(isBattleSnapshot(snapshot,state)).toBe(true);
    expect(JSON.stringify(snapshot)).toBe(before);
    expect('attributeVersion' in snapshot).toBe(false);
  });
  it('accepts nested field reordering for new formations and still rejects altered numbers or extra fields',()=>{
    const snapshot=formationSnapshot();const unit=snapshot.units[1];
    expect(isBattleSnapshot({...snapshot,units:[snapshot.units[0],{...unit,formation:reordered(unit.formation)}]})).toBe(true);
    for(const change of [{attack:1},{attributes:{...unit.formation!.attributes,command:30}},{unknown:1}]) {
      expect(isBattleSnapshot({...snapshot,units:[snapshot.units[0],{...unit,formation:{...unit.formation,...change}}]})).toBe(false);
    }
  });
  it('interprets a missing formation marker as legacy and keeps that basis after casualties',()=>{
    const snapshot=formationSnapshot(1);delete snapshot.attributeVersion;
    delete snapshot.units[1].formation!.attributeVersion;
    const before=JSON.stringify(snapshot);
    expect(isBattleSnapshot(snapshot)).toBe(true);expect(JSON.stringify(snapshot)).toBe(before);
    const wounded=updateUnitHp(snapshot.units[1],19);
    expect(wounded.formation?.attributes.command).toBe(20);
    expect(isBattleSnapshot({...snapshot,units:[snapshot.units[0],wounded]})).toBe(true);
    const forged={...snapshot.units[1],formation:{...snapshot.units[1].formation,attributes:formationStrength(4,29,2).attributes}};
    expect(isBattleSnapshot({...snapshot,units:[snapshot.units[0],forged]})).toBe(false);
  });
  it('rejects malformed formation versions even when its numerical stats otherwise match',()=>{
    const snapshot=formationSnapshot();const unit=snapshot.units[1];
    for(const marker of [0,3,-1,1.5,'2',null,{},false])expect(isBattleSnapshot({...snapshot,units:[snapshot.units[0],{...unit,formation:{...unit.formation,attributeVersion:marker}}]}),String(marker)).toBe(false);
  });
  it('does not rebase arbitrary valid recorded player stats during validation or checkpointing',()=>{
    const {state,snapshot}=fixture();const unit=makePartyUnit('traveler',state.party.traveler,null,'ambush',3,4,1);
    const combat:CombatState={...snapshot,attributeVersion:undefined,randomSeed:123456,units:[{...unit,hp:3,attack:8,defense:5},...snapshot.units.slice(1)]};
    const saved=checkpointBattle(combat,state),before=JSON.stringify(saved);
    expect(isBattleSnapshot(saved,state)).toBe(true);expect(JSON.stringify(saved)).toBe(before);
    expect(saved.units[0]).toMatchObject({hp:3,attack:8,defense:5});expect(saved.randomSeed).toBe(123456);
  });
});
