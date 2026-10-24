import { START_YEAR, END_YEAR, type GameDate } from './history';
import { WORLD_CITIES, WORLD_ROADS, cityAt, LEGACY_CITY_IDS } from './world';
import { garrisonTroopsAt } from './garrisonSchedule';
import { HISTORICAL_CHARACTERS } from './historicalCharacters';
import { LOCAL_OFFICIALS } from './localOfficials';
import { GARRISON_COMMANDERS } from './garrisonData';
import { recruitProfile } from './recruitmentCatalog';
import { CONFLICT_FACTIONS, CONFLICT_FOUNDATIONS, CONFLICT_RULES, factionAt, factionForPerson, leaderForFaction } from './worldConflictData';
import type { ConflictArmy, ConflictReport, WorldConflict } from './worldConflictTypes';
import type { LifeState } from './lifeTypes';
import { isAliveAt } from './personLife';
import { CITY_CAREERS } from './careerData';
import { cityNameAt } from './cityNames';
import { expansionFactionAt } from './generationWorldData';
export type { ConflictArmy, ConflictCity, ConflictFaction, ConflictReport, WorldConflict } from './worldConflictTypes';

const MAX_DAY=(END_YEAR-START_YEAR+1)*360-1;
export function conflictDay(date:GameDate):number {
  if(!Number.isInteger(date.year)||date.year<START_YEAR||date.year>END_YEAR||!Number.isInteger(date.month)||date.month<1||date.month>12||!Number.isInteger(date.day??1)||(date.day??1)<1||(date.day??1)>30) throw new Error('Invalid conflict date');
  return (date.year-184)*360+(date.month-1)*30+(date.day??1)-1;
}
function dateAt(day:number):GameDate { return {year:184+Math.floor(day/360),month:Math.floor(day%360/30)+1,day:day%30+1}; }
const neighbors=(id:string)=>WORLD_ROADS.flatMap(r=>r.from===id?[r.to]:r.to===id?[r.from]:[]);
const knownCity=(id:unknown):id is string=>typeof id==='string'&&WORLD_CITIES.some(c=>c.id===id);
const knownFaction=(id:unknown):id is string=>typeof id==='string'&&CONFLICT_FACTIONS.some(f=>f.id===id);
const people=new Set([...HISTORICAL_CHARACTERS.map(p=>p.id),...LOCAL_OFFICIALS.map(p=>p.id),'sun-jian','sun-ce']);
function km(a:[number,number],b:[number,number]):number {
  const r=Math.PI/180; return 12742*Math.asin(Math.sqrt(Math.min(1,Math.sin((b[1]-a[1])*r/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin((b[0]-a[0])*r/2)**2)));
}
const roadDays=new Map(WORLD_ROADS.map(r=>{
  const a=cityAt(r.from),b=cityAt(r.to),points:[number,number][]=[[a.lon,a.lat],...(r.via??[]),[b.lon,b.lat]];
  const days=Math.max(1,Math.ceil(points.slice(1).reduce((n,p,i)=>n+km(points[i],p),0)/({road:30,water:50,mountain:20}[r.kind])));
  return [[r.from,r.to].sort().join('|'),days] as const;
}));
export function conflictRoadDays(from:string,to:string):number { return roadDays.get([from,to].sort().join('|'))??0; }

/** All intermediate nodes must be friendly; only the final node may be hostile. */
function route(world:WorldConflict,from:string,to:string,faction:string,allowHostileEnd=false):{path:string[];days:number}|undefined {
  const routes=new Map([[from,{path:[from],days:0}]]),pending=new Set(WORLD_CITIES.map(c=>c.id));
  while(pending.size) {
    let current:string|undefined;
    for(const id of pending) if(routes.has(id)&&(current===undefined||routes.get(id)!.days<routes.get(current)!.days)) current=id;
    if(current===undefined) return;
    const found=routes.get(current)!; if(current===to) return found; pending.delete(current);
    for(const next of neighbors(current)) {
      if(!pending.has(next)||(world.cities[next].factionId!==faction&&!(allowHostileEnd&&next===to))) continue;
      const days=found.days+conflictRoadDays(current,next);
      if(!routes.has(next)||days<routes.get(next)!.days) routes.set(next,{path:[...found.path,next],days});
    }
  }
}
function random(world:WorldConflict):number { world.seed=(Math.imul(world.seed,1664525)+1013904223)>>>0; return world.seed/4294967296; }
function report(world:WorldConflict,fields:Omit<ConflictReport,'id'|'day'>):void {
  world.reports.push({id:world.nextReportId++,day:world.lastDay,...fields});
  if(world.reports.length>50) world.reports.splice(0,world.reports.length-50);
}
const reportArmy=(world:WorldConflict,army:ConflictArmy,kind:string,text:string,extra:Partial<ConflictReport>={})=>report(world,{kind,factionId:army.factionId,cityId:army.targetCityId,armyId:army.id,troops:army.troops,text,...extra});
function commander(world:WorldConflict,factionId:string,partyIds:readonly string[],life?:LifeState):string|undefined {
  const date=dateAt(world.lastDay),leader=leaderForFaction(factionId,date,life);
  const used=new Set([...partyIds,...world.armies.flatMap(a=>a.commanderId?[a.commanderId]:[])]);
  // Institutions may dispatch without a named person. Captains remain city personnel.
  const candidates=[leader,...['guan-yu','zhang-fei','zhou-yu','xiahou-dun','xiahou-yuan','cao-ren','gao-shun','han-dang',...GENERATION_COMMANDERS].filter(id=>factionForPerson(id,date)===factionId)];
  return candidates.find((id):id is string=>!!id&&!used.has(id)&&eligibleCommander(id,factionId,date,life));
}
const GENERATION_COMMANDERS=['sima-yi','sima-shi','sima-zhao','deng-ai','jiang-wei','zhong-hui','lu-xun','lu-kang','zhuge-ke','du-yu','yang-hu','wang-jun'];
function eligibleCommander(id:string,factionId:string,date:GameDate,life?:LifeState):boolean {
  if(!people.has(id)||!activePerson(id,date,life)||factionForPerson(id,date)!==factionId)return false;
  if(leaderForFaction(factionId,date,life)===id||GENERATION_COMMANDERS.includes(id))return true;
  const active:Record<string,[number,number]>={'guan-yu':[184,219],'zhang-fei':[184,220],'zhou-yu':[195,209],
    'xiahou-dun':[189,219],'xiahou-yuan':[189,218],'cao-ren':[190,219],'gao-shun':[196,198],'han-dang':[184,225]};
  const years=active[id];return !!years&&date.year>=years[0]&&date.year<=years[1];
}
/** Read the authoritative dated profile lazily; no mutable roster or runtime state is imported. */
function activePerson(id:string,date:GameDate,life?:LifeState):boolean {
  if(life&&!isAliveAt(life,id,date,true)) return false;
  const month=date.year*12+date.month;
  return recruitProfile(id)?.windows.some(window=>month>=window.from.year*12+(window.from.month??1)&&
    (!window.to||month<=window.to.year*12+(window.to.month??12)))??false;
}
function capacity(world:WorldConflict,faction:string):boolean { return world.armies.length<12&&world.armies.filter(a=>a.factionId===faction).length<2; }
function makeArmy(world:WorldConflict,faction:string,source:string,target:string,troops:number,path:string[],partyIds:readonly string[],contributions:ConflictArmy['contributions']=[],assembly=0,life?:LifeState):ConflictArmy {
  const commanderId=commander(world,faction,partyIds,life);
  if(commanderId) for(const city of Object.values(world.cities)) if(city.governorId===commanderId) delete city.governorId;
  const army:ConflictArmy={id:`army-${world.nextArmyId++}`,factionId:faction,...(commanderId?{commanderId}:{}),sourceCityId:source,targetCityId:target,troops,contributions,phase:assembly>0?'assembling':'marching',path,legIndex:0,legDay:0,phaseDays:assembly};
  world.armies.push(army); return army;
}
function foundations(world:WorldConflict,partyIds:readonly string[],snapshot=false,life?:LifeState):void {
  for(const stage of CONFLICT_FOUNDATIONS) {
    const start=conflictDay({year:stage.year,month:stage.month});
    if(start>world.lastDay||world.founded.includes(stage.id)) continue;
    const previouslyFounded=world.founded.some(id=>CONFLICT_FOUNDATIONS.some(s=>s.id===id&&s.factionId===stage.factionId));
    world.founded.push(stage.id);
    if(previouslyFounded&&!Object.values(world.cities).some(c=>c.factionId===stage.factionId)&&!world.armies.some(a=>a.factionId===stage.factionId))continue;
    // A fresh migration is a dated scenario snapshot; actual campaigns never rewind ownership.
    if(stage.factionId!=='yellow-turban'&&stage.factionId!=='zhang-yan') for(const id of stage.cities) {
      if(world.cities[id].factionId==='han'&&world.cities[id].occupationDay===-1) world.cities[id].factionId=stage.factionId;
    }
    world.nextDecision[stage.factionId]=world.lastDay+(snapshot?1:0);
    if(!stage.raised||!capacity(world,stage.factionId)) continue;
    // Old saves after the uprising snapshot no longer receive the 184 field army.
    if(snapshot&&stage.factionId==='yellow-turban'&&world.lastDay>=360) continue;
    const source=stage.cities.find(id=>world.cities[id].factionId===stage.factionId)??stage.cities[0];
    const target=world.cities[source].factionId!==stage.factionId?source:neighbors(source).find(id=>world.cities[id].factionId!==stage.factionId)??source;
    const army=makeArmy(world,stage.factionId,source,target,stage.raised,source===target?[source]:[source,target],partyIds,[],0,life);
    world.ledger.raised+=stage.raised;
    reportArmy(world,army,'foundation',`${factionAt(stage.factionId).name}起兵${stage.raised}人。${stage.note}`);
  }
}
function assignGovernors(world:WorldConflict,partyIds:readonly string[],life?:LifeState):void {
  const date=dateAt(world.lastDay),month=date.year*12+date.month;
  const unavailable=new Set([...partyIds,...world.armies.flatMap(a=>a.commanderId?[a.commanderId]:[])]);
  // Date-specific appointments supply candidates, never ownership. Conquerors may use an institution.
  for(const c of Object.values(world.cities))delete c.governorId;
  for(const term of GARRISON_COMMANDERS) {
    if(month<term.from.year*12+(term.from.month??1)||month>term.to.year*12+(term.to.month??12)||unavailable.has(term.employerId)||!activePerson(term.employerId,date,life)||factionForPerson(term.employerId,date)!==world.cities[term.cityId].factionId)continue;
    world.cities[term.cityId].governorId=term.employerId;unavailable.add(term.employerId);
  }
  // Dated offices supply people only when their institution actually owns the city.
  for(const [id,stages] of Object.entries(CITY_CAREERS).sort(([a],[b])=>Number(leaderForFaction(factionForPerson(b,date)??'',date,life)===b)-Number(leaderForFaction(factionForPerson(a,date)??'',date,life)===a))) {
    const term=stages.find(s=>s.kind==='governing'&&month>=s.from.year*12+(s.from.month??1)&&month<=s.to.year*12+(s.to.month??12));
    if(!term||unavailable.has(id)||!activePerson(id,date,life)||world.cities[term.cityId].governorId||factionForPerson(id,date)!==world.cities[term.cityId].factionId)continue;
    world.cities[term.cityId].governorId=id;unavailable.add(id);
  }
}
export function createWorldConflict(date:GameDate,partyIds:readonly string[]=[],seed=0x71c0ffee,life?:LifeState):WorldConflict {
  const day=conflictDay(date);
  const cities=Object.fromEntries(WORLD_CITIES.map(c=>[c.id,{factionId:LEGACY_CITY_IDS.includes(c.id)?'han':expansionFactionAt(c.id,date),troops:garrisonTroopsAt(c.id,date).troops,occupationDay:-1}]));
  const world:WorldConflict={version:2,lastDay:day,seed:seed>>>0,nextArmyId:1,nextReportId:1,cities,armies:[],founded:[],nextDecision:{han:day+1},reports:[],ledger:{initial:Object.values(cities).reduce((n,c)=>n+c.troops,0),recruited:0,raised:0,losses:0}};
  foundations(world,partyIds,true,life);assignGovernors(world,partyIds,life);return world;
}
export function armyRemainingDays(army:ConflictArmy):number {
  if(army.phase==='camped') return 0;
  const march=army.path.slice(army.legIndex+1).reduce((days,id,index)=>days+conflictRoadDays(army.path[army.legIndex+index],id),0)-army.legDay;
  return Math.max(0,army.phase==='sieging'?army.phaseDays:army.phase==='assembling'?army.phaseDays+march:march);
}
const contribution=(troops:number)=>Math.max(0,Math.min(Math.floor(troops*.6),troops-2000));
/** Pure explicit dispatch for deterministic scenario/QA fixtures. Normal play uses the same checks. */
export function dispatchConflictArmy(world:WorldConflict,sourceCityId:string,targetCityId:string,partyIds:readonly string[]=[],life?:LifeState):WorldConflict {
  const next=structuredClone(world); dispatch(next,sourceCityId,targetCityId,partyIds,life); return next;
}
function dispatch(world:WorldConflict,source:string,target:string,partyIds:readonly string[],life?:LifeState):boolean {
  if(!knownCity(source)||!knownCity(target)||!neighbors(source).includes(target)) return false;
  const faction=world.cities[source].factionId;
  if(!capacity(world,faction)||world.cities[target].factionId===faction||world.armies.some(a=>a.targetCityId===target&&['assembling','marching','sieging'].includes(a.phase))) return false;
  const primary=contribution(world.cities[source].troops); if(primary<500) return false;
  const support=WORLD_CITIES.filter(c=>c.id!==source&&world.cities[c.id].factionId===faction&&contribution(world.cities[c.id].troops)>=500)
    .map(c=>({id:c.id,route:route(world,c.id,source,faction)})).filter((c):c is {id:string;route:{path:string[];days:number}}=>!!c.route&&c.route.days<=30)
    .sort((a,b)=>a.route.days-b.route.days||a.id.localeCompare(b.id))[0];
  const contributions=[{cityId:source,troops:primary},...(support?[{cityId:support.id,troops:contribution(world.cities[support.id].troops)}]:[])];
  for(const c of contributions) world.cities[c.cityId].troops-=c.troops;
  const army=makeArmy(world,faction,source,target,contributions.reduce((n,c)=>n+c.troops,0),[source,target],partyIds,contributions,support?.route.days??0,life);
  reportArmy(world,army,'dispatch',`${factionAt(faction).name}由${cityNameAt(source,dateAt(world.lastDay))}出征，进向${cityNameAt(target,dateAt(world.lastDay))}，共${army.troops}人。`);
  return true;
}
function decisions(world:WorldConflict,partyIds:readonly string[],life?:LifeState):void {
  for(const faction of CONFLICT_FACTIONS) {
    if(!Object.hasOwn(world.nextDecision,faction.id)||world.nextDecision[faction.id]>world.lastDay) continue;
    world.nextDecision[faction.id]=world.lastDay+30;
    if(!capacity(world,faction.id)) continue;
    const candidates=WORLD_CITIES.filter(c=>world.cities[c.id].factionId===faction.id&&contribution(world.cities[c.id].troops)>=500).flatMap(c=>neighbors(c.id)
      .filter(target=>world.cities[target].factionId!==faction.id&&
        (faction.id!=='han'||['yellow-turban','zhang-yan'].includes(world.cities[target].factionId))&&
        !world.armies.some(a=>a.targetCityId===target&&['assembling','marching','sieging'].includes(a.phase)))
      .map(target=>({source:c.id,target,score:contribution(world.cities[c.id].troops)/(world.cities[target].troops*1.15+1)-conflictRoadDays(c.id,target)*.003})));
    candidates.sort((a,b)=>b.score-a.score||a.source.localeCompare(b.source)||a.target.localeCompare(b.target));
    const choice=candidates[0]; if(!choice) continue;
    if(choice.score<.45&&random(world)>.15) continue;
    dispatch(world,choice.source,choice.target,partyIds,life);
  }
}
const location=(a:ConflictArmy)=>a.path[Math.min(a.legIndex,a.path.length-1)];
function removeArmy(world:WorldConflict,army:ConflictArmy):void { world.armies=world.armies.filter(a=>a.id!==army.id); }
function disband(world:WorldConflict,army:ConflictArmy):void {
  world.ledger.losses+=army.troops; reportArmy(world,army,'disband',`${factionAt(army.factionId).name}已无可达据点，${army.troops}人溃散。`,{losses:army.troops}); removeArmy(world,army);
}
function retreat(world:WorldConflict,army:ConflictArmy,from=location(army)):void {
  const bases=WORLD_CITIES.filter(c=>world.cities[c.id].factionId===army.factionId).map(c=>({id:c.id,route:route(world,from,c.id,army.factionId)}))
    .filter((c):c is {id:string;route:{path:string[];days:number}}=>!!c.route);
  if(!bases.length) { disband(world,army); return; }
  const available=bases.filter(b=>world.cities[b.id].troops<20000).sort((a,b)=>a.route.days-b.route.days||a.id.localeCompare(b.id));
  if(!available.length) {
    const wasCamped=army.phase==='camped';
    army.phase='camped';army.path=[from];army.legIndex=0;army.legDay=0;army.phaseDays=0;
    if(!wasCamped)reportArmy(world,army,'camp',`${factionAt(army.factionId).name}各处守军已满，余部${army.troops}人驻营待整编。`); return;
  }
  const base=available.find(b=>b.id===army.sourceCityId)??available[0];
  army.phase='retreating';army.targetCityId=base.id;army.path=base.route.path;army.legIndex=0;army.legDay=0;army.phaseDays=0;
  reportArmy(world,army,'retreat',`${factionAt(army.factionId).name}余部${army.troops}人沿道路撤向${cityNameAt(base.id,dateAt(world.lastDay))}。`);
}
function merge(world:WorldConflict,army:ConflictArmy):void {
  const city=world.cities[army.targetCityId];
  if(city.factionId!==army.factionId) { retreat(world,army); return; }
  const entered=Math.min(20000-city.troops,army.troops); city.troops+=entered;army.troops-=entered;
  if(!army.troops) {reportArmy(world,army,'return',`${factionAt(army.factionId).name}${entered}人进入${cityNameAt(army.targetCityId,dateAt(world.lastDay))}整编。`,{troops:entered});removeArmy(world,army);}
  else retreat(world,army,army.targetCityId);
}
function startSiege(world:WorldConflict,army:ConflictArmy):void {
  if(world.cities[army.targetCityId].factionId===army.factionId) {merge(world,army);return;}
  if(world.armies.some(a=>a.id!==army.id&&a.phase==='sieging'&&a.targetCityId===army.targetCityId)) {retreat(world,army);return;}
  army.phase='sieging';army.phaseDays=Math.max(3,Math.min(10,3+Math.ceil(world.cities[army.targetCityId].troops/Math.max(1,army.troops)*5)));
  reportArmy(world,army,'siege',`${factionAt(army.factionId).name}围攻${cityNameAt(army.targetCityId,dateAt(world.lastDay))}，预计${army.phaseDays}日。`,{opponentFactionId:world.cities[army.targetCityId].factionId});
}
/** Equivalent ordinary formations scale together; HP, attack, defense and six attributes all contribute. */
function power(troops:number):number {return troops*(10+3+1+6*10);}
function battle(world:WorldConflict,army:ConflictArmy,captured:Set<string>):void {
  const city=world.cities[army.targetCityId];
  if(city.factionId===army.factionId) {merge(world,army);return;}
  if(captured.has(army.targetCityId)) {retreat(world,army);return;}
  const enemy=city.factionId, attack=power(army.troops)*(army.commanderId?1.06:1)*(.9+random(world)*.2),defense=power(city.troops)*1.15*(.9+random(world)*.2);
  if(attack>defense) {
    const lost=Math.min(army.troops-1,Math.ceil(city.troops*(.25+random(world)*.2))),defenders=city.troops;
    army.troops-=lost;world.ledger.losses+=lost+defenders;
    city.factionId=army.factionId;city.troops=0;city.occupationDay=world.lastDay;delete city.governorId;captured.add(army.targetCityId);
    reportArmy(world,army,'capture',`${factionAt(army.factionId).name}攻下${cityNameAt(army.targetCityId,dateAt(world.lastDay))}；攻方损失${lost}，原守军${defenders}人伤亡或溃散。`,{opponentFactionId:enemy,losses:lost+defenders});
    merge(world,army);
  } else {
    const lost=Math.min(army.troops,Math.ceil(army.troops*(.38+random(world)*.24))),defenderLost=Math.min(city.troops,Math.floor(army.troops*(.14+random(world)*.14)));
    army.troops-=lost;city.troops-=defenderLost;world.ledger.losses+=lost+defenderLost;
    reportArmy(world,army,'defeat',`${factionAt(army.factionId).name}攻城受挫，损失${lost}人；${factionAt(enemy).name}守军损失${defenderLost}人。`,{opponentFactionId:enemy,losses:lost+defenderLost});
    if(!army.troops) removeArmy(world,army);else retreat(world,army,army.targetCityId);
  }
}
function moveArmies(world:WorldConflict):void {
  const captured=new Set<string>();
  for(const army of [...world.armies].sort((a,b)=>Number(a.id.slice(5))-Number(b.id.slice(5)))) {
    if(!world.armies.some(a=>a.id===army.id)) continue;
    if(army.phase==='camped') {retreat(world,army);continue;}
    if(army.phase==='assembling') {
      army.phaseDays--;
      if(world.cities[army.sourceCityId].factionId!==army.factionId) {retreat(world,army,army.sourceCityId);continue;}
      if(army.phaseDays<=0) {army.phase='marching';army.phaseDays=0;} continue;
    }
    if(army.phase==='sieging') {
      if(world.cities[army.targetCityId].factionId===army.factionId) merge(world,army);
      else if(--army.phaseDays<=0) battle(world,army,captured);
      continue;
    }
    const next=army.path[army.legIndex+1];
    if(next) {
      const blocked=(army.phase==='retreating'||army.legIndex+1<army.path.length-1)&&world.cities[next].factionId!==army.factionId;
      // Once on a corridor the army must finish its remaining distance. Replanning from
      // the old city while legDay>0 would silently erase days already walked.
      if(blocked&&army.legDay===0) {retreat(world,army);continue;}
      army.legDay++;
      if(army.legDay<conflictRoadDays(location(army),next)) continue;
      army.legIndex++;army.legDay=0;
      if(blocked) {retreat(world,army,next);continue;}
    }
    if(army.legIndex===army.path.length-1) {
      if(army.phase==='retreating') merge(world,army); else startSiege(world,army);
    }
  }
}
export function advanceWorldConflict(world:WorldConflict,date:GameDate,partyIds:readonly string[]=[],life?:LifeState):WorldConflict {
  const target=conflictDay(date);if(target<world.lastDay)return world;
  const clean=reconcileWorldPeople(world,dateAt(world.lastDay),partyIds,life);
  if(target===world.lastDay)return clean;
  const next=structuredClone(clean);
  // Adding a campaign commander to the party relinquishes their NPC commission immediately.
  for(const army of next.armies) if(army.commanderId&&partyIds.includes(army.commanderId)) delete army.commanderId;
  for(let day=next.lastDay+1;day<=target;day++) {
    next.lastDay=day;
    for(const army of next.armies) if(army.commanderId&&!eligibleCommander(army.commanderId,army.factionId,dateAt(day),life))delete army.commanderId;
    if(day%30===0) for(const city of Object.values(next.cities)) {const raised=Math.min(50,20000-city.troops);city.troops+=raised;next.ledger.recruited+=raised;}
    foundations(next,partyIds,false,life);moveArmies(next);assignGovernors(next,partyIds,life);decisions(next,partyIds,life);
  }
  return next;
}

/** Strip invalid personal commissions without changing armies, resources or the war random stream. */
export function reconcileWorldPeople(world:WorldConflict,date:GameDate,partyIds:readonly string[]=[],life?:LifeState):WorldConflict {
  let next=world;
  const writable=()=>{if(next===world)next=structuredClone(world);return next;};
  for(const [cityId,city] of Object.entries(world.cities)) if(city.governorId&&
    (partyIds.includes(city.governorId)||!activePerson(city.governorId,date,life))) delete writable().cities[cityId].governorId;
  for(const [index,army] of world.armies.entries()) if(army.commanderId&&
    (partyIds.includes(army.commanderId)||!eligibleCommander(army.commanderId,army.factionId,date,life))) delete writable().armies[index].commanderId;
  return next;
}

const integer=(n:unknown,min=0,max=Number.MAX_SAFE_INTEGER):n is number=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=min&&n<=max;
const record=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const onlyKeys=(x:object,allowed:readonly string[])=>Object.keys(x).every(k=>allowed.includes(k));
/** Strict persisted-world validation. A rejected world must be recovered explicitly by the save bridge. */
export function isWorldConflict(value:unknown,date:GameDate,partyIds:readonly string[]=[],life?:LifeState):value is WorldConflict {
  let now:number;try{now=conflictDay(date);}catch{return false;}
  if(!record(value)||!onlyKeys(value,['version','lastDay','seed','nextArmyId','nextReportId','cities','armies','founded','nextDecision','reports','ledger'])||value.version!==2||!integer(value.lastDay,0,Math.min(now,MAX_DAY))||!integer(value.seed,0,0xffffffff)||!integer(value.nextArmyId,1)||!integer(value.nextReportId,1)||!record(value.cities)||Object.keys(value.cities).length!==WORLD_CITIES.length||!Array.isArray(value.armies)||value.armies.length>12||!Array.isArray(value.founded)||!Array.isArray(value.reports)||value.reports.length>50||!record(value.nextDecision)||!record(value.ledger))return false;
  // Top-level collections have been checked; every element and scalar is checked below.
  const w=value as unknown as WorldConflict, assigned=new Set<string>(partyIds), armyIds=new Set<string>(),factionCount=new Map<string,number>();let stock=0;
  const dueStages=CONFLICT_FOUNDATIONS.filter(stage=>conflictDay({year:stage.year,month:stage.month})<=w.lastDay);
  const activeFactions=new Set(['han',...dueStages.map(stage=>stage.factionId)]);
  if(w.founded.length!==dueStages.length||new Set(w.founded).size!==w.founded.length||dueStages.some(stage=>!w.founded.includes(stage.id)))return false;
  if(Object.keys(w.nextDecision).length!==activeFactions.size||Object.entries(w.nextDecision).some(([id,day])=>!activeFactions.has(id)||!integer(day,w.lastDay+1,w.lastDay+30)))return false;
  for(const id of Object.keys(w.cities)) if(!knownCity(id))return false;
  for(const city of WORLD_CITIES) {
    const c=w.cities[city.id];
    if(!record(c)||!onlyKeys(c,['factionId','troops','occupationDay','governorId'])||!knownFaction(c.factionId)||!activeFactions.has(c.factionId)||!integer(c.troops,0,20000)||!integer(c.occupationDay,-1,w.lastDay as number))return false;
    if(c.governorId!==undefined) {if(typeof c.governorId!=='string'||!people.has(c.governorId)||!activePerson(c.governorId,dateAt(w.lastDay),life)||factionForPerson(c.governorId,dateAt(w.lastDay))!==c.factionId||assigned.has(c.governorId))return false;assigned.add(c.governorId);}
    stock+=c.troops;
  }
  for(const a of w.armies) {
    if(!record(a)||!activeFactions.has(a.factionId as string))return false;
    if(!record(a)||!onlyKeys(a,['id','factionId','commanderId','sourceCityId','targetCityId','troops','contributions','phase','path','legIndex','legDay','phaseDays'])||typeof a.id!=='string'||!/^army-[1-9]\d*$/.test(a.id)||!integer(Number(a.id.slice(5)),1,(w.nextArmyId as number)-1)||armyIds.has(a.id)||!knownFaction(a.factionId)||!knownCity(a.sourceCityId)||!knownCity(a.targetCityId)||!integer(a.troops,1,24000)||!Array.isArray(a.path)||!a.path.length||a.path.length>WORLD_CITIES.length||!a.path.every(knownCity)||new Set(a.path).size!==a.path.length||!integer(a.legIndex,0,a.path.length-1)||!integer(a.legDay,0,1000)||!integer(a.phaseDays,0,1000)||!['assembling','marching','sieging','retreating','camped'].includes(a.phase as string)||!Array.isArray(a.contributions)||a.contributions.length>2)return false;
    const path=a.path as string[],index=a.legIndex as number;
    if(['assembling','marching','sieging'].includes(a.phase)&&(path[0]!==a.sourceCityId||path[path.length-1]!==a.targetCityId))return false;
    if((a.phase==='assembling'&&a.legDay!==0)||(['marching','retreating'].includes(a.phase)&&a.phaseDays!==0))return false;
    if(path.some((p,i)=>i>0&&!conflictRoadDays(path[i-1],p))||((a.phase==='marching'||a.phase==='retreating')&&path[path.length-1]!==a.targetCityId)||((a.phase==='sieging')&&(path[path.length-1]!==a.targetCityId||index!==path.length-1||!integer(a.phaseDays,1,10)))||((a.phase==='assembling')&&(!integer(a.phaseDays,1,1000)||index!==0))||((a.phase==='camped')&&(path.length!==1||a.legDay!==0||a.phaseDays!==0))||(path[index+1]?a.legDay>=conflictRoadDays(path[index],path[index+1]):a.legDay!==0))return false;
    if(a.commanderId!==undefined) {if(typeof a.commanderId!=='string'||!eligibleCommander(a.commanderId,a.factionId,dateAt(w.lastDay),life)||assigned.has(a.commanderId))return false;assigned.add(a.commanderId);}
    const contributionIds=new Set<string>();for(const c of a.contributions) {if(!record(c)||!onlyKeys(c,['cityId','troops'])||!knownCity(c.cityId)||!integer(c.troops,1,12000)||contributionIds.has(c.cityId))return false;contributionIds.add(c.cityId);}
    if(a.contributions.length&&a.troops>a.contributions.reduce((n,c)=>n+c.troops,0))return false;
    factionCount.set(a.factionId,(factionCount.get(a.factionId)??0)+1);if(factionCount.get(a.factionId)!>2)return false;
    armyIds.add(a.id);stock+=a.troops;
  }
  let previous=0;
  for(const r of w.reports) {
    if(!record(r)||!onlyKeys(r,['id','day','kind','factionId','cityId','opponentFactionId','armyId','troops','losses','text'])||!integer(r.id,previous+1,(w.nextReportId as number)-1)||!integer(r.day,0,w.lastDay as number)||!['foundation','dispatch','siege','capture','defeat','retreat','return','camp','disband'].includes(r.kind as string)||!knownFaction(r.factionId)||!knownCity(r.cityId)||typeof r.text!=='string'||!r.text.length||r.text.length>2000||(r.opponentFactionId!==undefined&&!knownFaction(r.opponentFactionId))||(r.armyId!==undefined&&(typeof r.armyId!=='string'||!/^army-[1-9]\d*$/.test(r.armyId)||!integer(Number(r.armyId.slice(5)),1,(w.nextArmyId as number)-1)))||(r.troops!==undefined&&!integer(r.troops,0,1000000))||(r.losses!==undefined&&!integer(r.losses,0,2000000)))return false;
    previous=r.id;
  }
  if(!onlyKeys(w.ledger,['initial','recruited','raised','losses','expansion'])||!(['initial','recruited','raised','losses'] as const).every(k=>integer(w.ledger[k]))||w.ledger.expansion!==undefined&&w.ledger.expansion!==120000)return false;
  return stock===(w.ledger.initial as number)+(w.ledger.expansion??0)+(w.ledger.recruited as number)+(w.ledger.raised as number)-(w.ledger.losses as number);
}

/** Upgrade exactly the former36city schema; arbitrary holes are corruption, not expansion. */
export function migrateWorldConflict(value: unknown, date: GameDate, partyIds: readonly string[] = []): WorldConflict | null {
  if (isWorldConflict(value, date, partyIds)) return value;
  if (!record(value) || value.version !== 1 || !record(value.cities) || !record(value.ledger) ||
      Object.keys(value.cities).length !== LEGACY_CITY_IDS.length ||
      !LEGACY_CITY_IDS.every(id => Object.hasOwn(value.cities as object, id)) || !integer(value.ledger.initial) ||
      !onlyKeys(value.ledger,['initial','recruited','raised','losses'])) return null;
  const cities = { ...value.cities };
  let additional = 0;
  for (const city of WORLD_CITIES) if (!Object.hasOwn(cities, city.id)) {
    cities[city.id] = { factionId: expansionFactionAt(city.id,date), troops: 5000, occupationDay: -1 };
    additional += 5000;
  }
  const candidate = { ...value, version: 2, cities, ledger: { ...value.ledger, expansion: additional } };
  return isWorldConflict(candidate, date, partyIds) ? candidate : null;
}
