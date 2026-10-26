import { WORLD_CITIES } from './world';
import { START_YEAR } from './history';
import { GARRISON_COMMANDERS } from './garrisonData';
import { V11_GOVERNORS } from './v11Data';
import { CITY_CAREERS } from './careerData';
import { factionForPerson,leaderForFaction } from './worldConflictData';
import { isAliveAt } from './personLife';
import { createPrefectId,prefectIdentity } from './prefectIdentity';
import type { WorldConflict } from './worldConflictTypes';
import type { LifeState } from './lifeTypes';

/** Mutates only an owned world clone. Appointment identities use no strategic random draws. */
export function assignGovernors(world:WorldConflict,partyIds:readonly string[],life?:LifeState):void {
 const date={year:START_YEAR+Math.floor(world.lastDay/360),month:Math.floor(world.lastDay%360/30)+1};
 const month=date.year*12+date.month,used=new Set([...partyIds,...world.armies.flatMap(a=>a.commanderId?[a.commanderId]:[])]);
 const names=new Map(Object.entries(world.cities).flatMap(([cityId,c])=>{const p=prefectIdentity(c.governorId);return p?[[p.name,cityId] as const]:[];}));
 const terms=[...GARRISON_COMMANDERS,...V11_GOVERNORS,
  ...Object.entries(CITY_CAREERS).flatMap(([id,stages])=>stages.filter(s=>s.kind==='governing'&&/太守|北海相/.test(s.title)&&!V11_GOVERNORS.some(g=>g.employerId===id)).map(s=>({cityId:s.cityId,from:s.from,to:s.to,employerId:id})))];
 let counter=world.nextPrefectId;
 for(const id of [...Object.keys(life?.people??{}),...partyIds,...Object.values(world.cities).flatMap(c=>c.governorId?[c.governorId]:[])])counter=Math.max(counter,(prefectIdentity(id)?.serial??0)+1);
 world.nextPrefectId=counter;
 for(const city of WORLD_CITIES){
  const current=world.cities[city.id];
  const eligible=(id:string)=>!used.has(id)&&isAliveAt(life,id,date,true)&&factionForPerson(id,date)===current.factionId;
  const term=terms.find(t=>t.cityId===city.id&&month>=t.from.year*12+(t.from.month??1)&&month<=t.to.year*12+(t.to.month??12)&&eligible(t.employerId)&&leaderForFaction(current.factionId,date,life)!==t.employerId);
  const old=current.governorId,original=old?prefectIdentity(old):undefined;
  const retained=old&&original?.cityId===city.id&&eligible(old)?old:undefined;
  let id=term?.employerId??retained;
  if(!id)do{id=createPrefectId(city.id,current.factionId,date.year,world.nextPrefectId++);}while(names.has(prefectIdentity(id)!.name)&&names.get(prefectIdentity(id)!.name)!==city.id);
  if(id!==old)current.governorSince=world.lastDay;
  current.governorId=id;current.governorKind=prefectIdentity(id)?'original':'historical';
  const identity=prefectIdentity(id);
  if(identity){names.set(identity.name,city.id);if(!world.prefectIds.includes(id))world.prefectIds.push(id);}
  current.governorSince??=world.lastDay;used.add(id);
 }
}
