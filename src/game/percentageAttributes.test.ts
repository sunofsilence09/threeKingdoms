import {expect,it} from 'vitest';
import {effectiveAttributes} from './characterTalents';
import {createAttributes} from './attributes';
it('defaults to percentage talents capped at100',()=>{ expect(effectiveAttributes('traveler',createAttributes()).strength).toBe(50); expect(effectiveAttributes('traveler',{...createAttributes(),strength:30},undefined,50).strength).toBe(100); });

import {attributeBonuses, victoryExperience} from './attributes';
import {makePartyUnit} from './combat';
import {createProgress} from './growth';
import {attachTroops} from './troopCombat';
it('normalizes every new contribution while keeping explicit legacy versions',()=>{
 const old={...createAttributes(),strength:18,command:17,intellect:16,courage:15,politics:14,charisma:13};
 const scaled=Object.fromEntries(Object.entries(old).map(([k,v])=>[k,v*5])) as typeof old;
 expect(attributeBonuses(scaled,3)).toEqual(attributeBonuses(old,2));
 expect(victoryExperience(45,scaled,3)).toBe(victoryExperience(45,old,2));
 expect(attributeBonuses({...scaled,strength:94},3).attack).toBe(8);
});
it('snapshots percentage commander values separately from troop rules',()=>{
 const unit=makePartyUnit('traveler',createProgress(),null,'ambush');
 const modern=attachTroops(unit,'spear',100,{command:80,strength:90});
 const old=attachTroops(unit,'spear',100,{command:16,strength:18},2);
 expect(modern.attack).toBe(old.attack);expect(modern.defense).toBe(old.defense);
 expect(modern.troop?.attributeVersion).toBe(3);expect(old.troop?.attributeVersion).toBeUndefined();
});

import {createInitialState, spendSkillPoints} from './state';
import {createCombatState} from './combat';
import {checkpointBattle,isBattleSnapshot} from './battleSave';
it('refuses capped spending and preserves historical excess ledgers',()=>{
 const state=createInitialState(()=>0);state.party.traveler={...createProgress(10),bondBonus:48};
 const before=JSON.stringify(state);
 expect(spendSkillPoints(state,'traveler',{strength:3})).toBe(state);
 const next=spendSkillPoints(state,'traveler',{strength:2});
 expect(next.party.traveler.attributes.strength).toBe(12);
 expect(effectiveAttributes('traveler',next.party.traveler.attributes,3,48).strength).toBe(100);
 expect(spendSkillPoints(next,'traveler',{strength:1})).toBe(next);
 expect(JSON.stringify(state)).toBe(before);
});
it('roundtrips new troop snapshots and rejects a new troop-rule marker',()=>{
 const state={...createInitialState(()=>0),phase:'battle' as const,encounter:'ambush' as const};
 const combat=createCombatState(null,state.party);
 combat.units[0]=attachTroops(combat.units[0],'spear',100,{command:80,strength:90});
 const snapshot=checkpointBattle(combat,state);
 expect(isBattleSnapshot(snapshot)).toBe(true);
 expect(isBattleSnapshot({...snapshot,troopRuleVersion:3})).toBe(false);
});
