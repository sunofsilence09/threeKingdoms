import type {GameState} from './state';
import type {WorldConflict,ConflictReport} from './worldConflictTypes';
import {WORLD_CITIES,cityNameAt} from './world';
import {advanceDays} from './history';
import {conflictDay} from './worldConflict';
import {withWorldDate} from './worldTime';
import {heroName} from './heroName';

export const PLAYER_MAX_RESERVE=20000,RECRUIT_UNIT=100,COST_PER_SOLDIER=2;
const cityCap=20000,cityReserve=2000;
const positive=(n:number)=>Number.isSafeInteger(n)&&n>0;
function playerWorld(world:WorldConflict):WorldConflict {
 const next=structuredClone(world);
 if(next.playerReserve===undefined){next.playerReserve=0;next.nextDecision.player=next.lastDay+1;}
 return next;
}
function militaryReport(world:WorldConflict,kind:string,cityId:string,text:string,extra:Partial<ConflictReport>={}):void {
 world.reports.push({id:world.nextReportId++,day:world.lastDay,kind,factionId:'player',cityId,text,...extra});world.reports=world.reports.slice(-50);
}
export function playerMilitaryStatus(state:GameState){
 const world=state.conflictRecovery?undefined:state.worldConflict,city=world?.cities[state.currentCityId];
 const reason=state.phase!=='overworld'||state.activeBattle||state.duel||state.encounter?'请先结束当前战斗并返回城内行旅界面。':state.journey?'途中不能募兵或攻城。':!world||!city?'天下局势需要先恢复。'
  :world.armies.some(a=>a.factionId==='player')?'所部正在外作战，请等待战报。'
  :world.armies.some(a=>a.targetCityId===state.currentCityId&&['assembling','marching','sieging'].includes(a.phase))?'本城已有军队进攻，待当前战事结束后再操作。':'';
 return {reserve:world?.playerReserve??0,ownedCityIds:WORLD_CITIES.filter(c=>world?.cities[c.id].factionId==='player').map(c=>c.id),
  currentOwned:city?.factionId==='player',currentTroops:city?.troops??0,canOperate:!reason,reason,
  availableWithdraw:city?.factionId==='player'?Math.max(0,city.troops-cityReserve):0};
}
export function recruitPlayerTroops(state:GameState,count:number):GameState {
 const status=playerMilitaryStatus(state),date=advanceDays(state.date,1);
 if(!status.canOperate||!positive(count)||count%RECRUIT_UNIT||count+status.reserve>PLAYER_MAX_RESERVE||
  state.economy.coins<count*COST_PER_SOLDIER||conflictDay(date)-conflictDay(state.date)!==1||
  !Number.isSafeInteger(state.worldConflict!.ledger.recruited+count))return state;
 const world=playerWorld(state.worldConflict!);world.playerReserve!+=count;world.ledger.recruited+=count;
 militaryReport(world,'recruit',state.currentCityId,`${heroName(state)}招募${count}名随行预备兵，支付${count*COST_PER_SOLDIER}铜钱。`,{troops:count});
 return withWorldDate({...state,worldConflict:world,economy:{...state.economy,coins:state.economy.coins-count*COST_PER_SOLDIER},
  travelNotice:`招募${count}名预备兵，支付${count*COST_PER_SOLDIER}铜钱、整编1日；预备兵随主角行旅，不从当地守军中凭空抽取。`},date);
}
export function withdrawPlayerTroops(state:GameState,count:number):GameState {
 const status=playerMilitaryStatus(state);
 if(!status.canOperate||!status.currentOwned||!positive(count)||count>status.availableWithdraw||count+status.reserve>PLAYER_MAX_RESERVE)return state;
 const world=playerWorld(state.worldConflict!);world.cities[state.currentCityId].troops-=count;world.playerReserve!+=count;
 militaryReport(world,'transfer',state.currentCityId,`从${cityNameAt(state.currentCityId,state.date)}抽调${count}名驻军加入随行预备队。`,{troops:count});
 return {...state,worldConflict:world,travelNotice:`抽调${count}人，城内至少保留${cityReserve}人；现有预备兵${world.playerReserve}人。`};
}
export function reinforcePlayerCity(state:GameState,count:number):GameState {
 const status=playerMilitaryStatus(state);
 if(!status.canOperate||!status.currentOwned||!positive(count)||count>status.reserve||status.currentTroops+count>cityCap)return state;
 const world=playerWorld(state.worldConflict!);world.cities[state.currentCityId].troops+=count;world.playerReserve!-=count;
 militaryReport(world,'transfer',state.currentCityId,`向${cityNameAt(state.currentCityId,state.date)}补入${count}名驻军。`,{troops:count});
 return {...state,worldConflict:world,travelNotice:`补入${count}名驻军；守城部队留在本城，随行预备兵剩${world.playerReserve}人。`};
}
export function playerSiegePreview(state:GameState,count:number){
 const status=playerMilitaryStatus(state),city=state.worldConflict?.cities[state.currentCityId];
 const attackers=positive(count)?count:0,defenders=city?.troops??0;
 const days=Math.max(3,Math.min(10,3+Math.ceil(defenders/Math.max(1,attackers)*5))),foodCost=Math.max(1,Math.ceil(attackers/1000));
 const date=advanceDays(state.date,days);
 const reason=status.reason|| (status.currentOwned?'本城已属主角军府，可补兵或抽调驻军。':!positive(count)||count<100||count>status.reserve?'出兵须为至少100人的整数，且不超过随行预备兵。'
  :state.worldConflict!.armies.length>=12?'当前在外军队已达上限，暂不能发起新的围攻。'
  :state.supplies<foodCost?`军需不足，本次需要${foodCost}。`:conflictDay(date)-conflictDay(state.date)!==days?'剩余历法天数不足以完成本次围攻。':'');
 return {allowed:!reason,reason,cityId:state.currentCityId,cityName:cityNameAt(state.currentCityId,state.date),defenderFactionId:city?.factionId??'han',defenders,attackers,days,foodCost};
}
/** One explicit, atomic campaign: advance existing world warfare through the siege deadline. */
export function startPlayerSiege(state:GameState,count:number):GameState {
 const preview=playerSiegePreview(state,count);if(!preview.allowed)return state;
 const world=playerWorld(state.worldConflict!),id=`army-${world.nextArmyId++}`,baseReserve=world.playerReserve!-count;
 world.playerReserve=baseReserve;
 world.armies.push({id,factionId:'player',sourceCityId:preview.cityId,targetCityId:preview.cityId,troops:count,contributions:[],
  phase:'sieging',path:[preview.cityId],legIndex:0,legDay:0,phaseDays:preview.days});
 militaryReport(world,'siege',preview.cityId,`${heroName(state)}率${count}人围攻${preview.cityName}，军需${preview.foodCost}，预计${preview.days}日后决胜。`,{armyId:id,troops:count,opponentFactionId:preview.defenderFactionId});
 const next=withWorldDate({...state,worldConflict:world,supplies:state.supplies-preview.foodCost},advanceDays(state.date,preview.days));
 const owner=next.worldConflict!.cities[preview.cityId],won=owner.factionId==='player';
 const survivors=won?owner.troops:Math.max(0,(next.worldConflict!.playerReserve??0)-baseReserve);
 return {...next,travelNotice:won?`攻下${preview.cityName}！城池归主角军府，${survivors}名余兵留城防守，本部损失${Math.max(0,count-survivors)}人；耗时${preview.days}日。`
  :`未攻下${preview.cityName}。本部损失${Math.max(0,count-survivors)}人，${survivors}名余兵撤回随行预备队；耗时${preview.days}日，军需已消耗。`};
}
