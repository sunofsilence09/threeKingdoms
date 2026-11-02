import type {GameState} from './state';
import {advanceDays,type GameDate} from './history';
import {isAliveAt} from './personLife';
import {cityNameAt} from './world';
import {withWorldDate} from './worldTime';
import {interactionFlags} from './recruitment';
export interface HistoryEntry {id:string;read:boolean;legacy:boolean;participated?:boolean}
export interface HistoryProgress {version:1;entries:HistoryEntry[]}
const rows: [string,number,string,string,string,string][] = [
['yellow',184,'黄巾起义','01','张角起兵，州郡征讨。','张角 · 颍川'],
['peachNovel',184,'桃园结义（演义）','novel001','小说以桃园结义描写刘关张相聚；此场景不作为史实结盟仪式。','刘备、关羽、张飞 · 涿郡'],
['dong',189,'董卓入京','01','董卓进入洛阳，掌握朝政。','董卓 · 洛阳'],
['antiDong',190,'关东讨董','01','关东州郡起兵，推袁绍为盟主。','袁绍、曹操 · 关东'],
['hulaoNovel',190,'三英战吕布（演义）','novel','小说第五回铺陈虎牢关三英战吕布；不作为史实战绩。','刘备、关羽、张飞 · 虎牢关'],
['changan',190,'迁都长安','01','朝廷西迁，洛阳遭受破坏。','董卓 · 长安'],
['dongDeath',192,'董卓之死','06','王允与吕布谋诛董卓。','王允、吕布 · 长安'],
['xu',193,'徐州战事','01','曹操进攻陶谦，徐州陷入战乱。','曹操、陶谦 · 徐州'],
['yan',194,'兖州争夺','01','吕布进入兖州，与曹操争夺据点。','吕布、曹操 · 兖州'],
['emperor',196,'迎奉献帝','01','曹操迎奉汉帝，朝廷移驻许县。','曹操、献帝 · 许县'],
['yuanshu',197,'袁术称帝','01','袁术在淮南称帝。','袁术 · 寿春'],
['xiapi',198,'下邳之战','01','曹操围攻下邳，吕布败亡。','曹操、吕布 · 下邳'],
['guandu',200,'官渡之战','01','曹操与袁绍相持，袁军粮屯遭袭后败退。','曹操、袁绍 · 官渡'],
['wuhuan',207,'北征乌桓','01','曹操北征，在白狼山击败乌桓。','曹操 · 北地'],
['changban',208,'长坂之战','32','刘备南撤，曹军追及长坂。','刘备 · 当阳'],
['chibi',208,'赤壁之战','32','孙刘联军与曹军交战，曹军北还。','刘备、孙权 · 赤壁'],
['tongguan',211,'潼关之战','01','曹操与关中联军在潼关一带交战。','曹操、马超 · 潼关'],
['shu',214,'刘备入主益州','32','刘璋归降，刘备领益州牧。','刘备、刘璋 · 成都'],
['hefei',215,'合肥之战','47','孙权进攻合肥后撤军。','孙权、张辽 · 合肥'],
['hanzhong',219,'汉中之战','32','刘备占据汉中，进位汉中王。','刘备 · 汉中'],
['fan',219,'樊城之战','36','关羽围樊，随后失去荆州并败亡。','关羽 · 襄樊'],
['wei',220,'汉魏交替','02','曹丕代汉称帝，建立魏。','曹丕 · 洛阳'],
['shuhan',221,'蜀汉建立','32','刘备在成都即皇帝位。','刘备 · 成都'],
['yiling',222,'夷陵之战','47','陆逊击败刘备东征军。','陆逊、刘备 · 夷陵'],
['wu',229,'孙权称帝','47','孙权即皇帝位，后迁都建业。','孙权 · 武昌、建业'],
['wuzhang',234,'五丈原','35','诸葛亮出军渭南，卒于军中。','诸葛亮 · 五丈原'],
['gaoping',249,'高平陵之变','04','司马懿控制京师，曹爽失势。','司马懿、曹爽 · 洛阳'],
['fallshu',263,'魏灭蜀','04','魏军入蜀，刘禅投降。','刘禅、邓艾 · 成都'],
['jin',265,'晋代魏','04','司马炎受禅，晋朝建立。','司马炎 · 洛阳'],
['fallwu',280,'晋灭吴','48','晋军攻吴，孙皓投降。','孙皓 · 建业'],
];
const sourceDates:Record<string,string>={changan:'初平元年二月（农历月）',antiDong:'初平元年春正月（农历月）',shuhan:'章武元年夏四月（农历月）',wu:'黄龙元年夏四月（农历月）',yiling:'章武二年夏六月（农历月；战败节点见先主传）',wuzhang:'建兴十二年春出师、八月卒于军（农历月）'};
/** Year precision only: January is a game scheduling boundary, never a converted historical month. */
export const HISTORY_EVENTS=rows.map(([id,year,title,volume,summary,region])=>({id,year,title,summary,region,source:volume.startsWith('novel')?'演义':'史实',precision:sourceDates[id]?'史料农历月':'年',historicalDate:sourceDates[id]??`${year}年（此目录仅记录年精度）`,date:{year,month:1,day:1},citation:volume==='novel001'?'https://zh.wikisource.org/wiki/三國演義/第001回':id==='yiling'?'https://zh.wikisource.org/wiki/三國志/卷32':volume==='novel'?'https://zh.wikisource.org/wiki/三國演義/第005回':`https://zh.wikisource.org/wiki/三國志/卷${volume}`,placement:'游戏按该年正月入册；非史事发生月份'}));
const day=(d:GameDate)=>d.year*360+(d.month-1)*30+(d.day??1)-1;
export function migrateHistory(raw:unknown,date:GameDate):HistoryProgress {
 const r=raw as HistoryProgress|undefined;
 if(r&&typeof r==='object'&&r.version===1&&Array.isArray(r.entries)&&r.entries.every(e=>e&&HISTORY_EVENTS.some(x=>x.id===e.id)&&HISTORY_EVENTS.some(x=>x.id===e.id&&day(x.date)<=day(date))&&typeof e.read==='boolean'&&typeof e.legacy==='boolean'&&(e.participated===undefined||typeof e.participated==='boolean'))&&new Set(r.entries.map(e=>e.id)).size===r.entries.length)return {version:1,entries:HISTORY_EVENTS.filter(e=>day(e.date)<=day(date)).map(e=>{const saved=r.entries.find(x=>x.id===e.id);return saved?{...saved}:{id:e.id,read:true,legacy:true};})};
 return {version:1,entries:HISTORY_EVENTS.filter(e=>day(e.date)<=day(date)).map(e=>({id:e.id,read:true,legacy:true}))};
}
export function advanceHistory(state:GameState,date:GameDate):HistoryProgress {
 const old=state.history??migrateHistory(undefined,state.date);const known=new Set(old.entries.map(e=>e.id));
 const additions=HISTORY_EVENTS.filter(e=>!known.has(e.id)&&day(e.date)<=day(date)).map(e=>({id:e.id,read:false,legacy:false}));
 return additions.length?{version:1,entries:[...old.entries,...additions]}:old;
}
export const HISTORY_SUPPORT=[
 {id:'antiDong',city:'chenliu',person:'cao-cao',faction:'cao',cost:60,supplies:1,days:3,reward:90,title:'护送关东军需'},
 {id:'guandu',city:'xuxian',person:'cao-cao',faction:'cao',cost:100,supplies:2,days:5,reward:150,title:'筹运官渡粮草'},
 {id:'chibi',city:'jiangling',person:'liu-bei',faction:'liu',cost:80,supplies:2,days:4,reward:130,title:'援助江上舟队'},
 {id:'yiling',city:'yiling',person:'sun-quan',faction:'sun',cost:100,supplies:2,days:5,reward:160,title:'运送夷陵药粮'},
] as const;
export function historySupportReason(state:GameState,id:string):string|undefined {
 const q=HISTORY_SUPPORT.find(q=>q.id===id),event=HISTORY_EVENTS.find(e=>e.id===id),entry=state.history?.entries.find(e=>e.id===id);
 if(!q||!event||!entry||entry.legacy)return '仅供历史回顾';
 if(entry.participated)return '本局已参与，奖励已结算';
 if(state.date.year!==event.year||advanceDays(state.date,q.days).year!==event.year)return '已过截止日期（该年十二月三十日）';
 if(state.phase!=='overworld'||state.journey||state.activeBattle||state.duel)return '请结束当前行动';
 if(state.currentCityId!==q.city)return `需前往${cityNameAt(q.city,state.date)}`;
 if(!state.life?.people[q.person]||!isAliveAt(state.life,q.person,state.date,true))return '相关人物已离世或尚未成年';
 if(state.worldConflict?.cities[q.city]?.factionId!==q.faction)return '城邑当前阵营不符';
 if(state.economy.coins<q.cost||state.supplies<q.supplies)return '铜钱或军需不足';
}
export function participateHistory(state:GameState,id:string):GameState {
 if(historySupportReason(state,id))return state;
 const q=HISTORY_SUPPORT.find(q=>q.id===id)!;
 const relationship=state.relationships[q.person];
 const next={...state,history:{version:1 as const,entries:state.history!.entries.map(e=>e.id===id?{...e,participated:true}:e)},economy:{...state.economy,coins:state.economy.coins-q.cost+q.reward},supplies:state.supplies-q.supplies+1,
   relationships:{...state.relationships,[q.person]:{...relationship,affinity:Math.min(100,(relationship?.affinity??0)+5)}},flags:interactionFlags(state,q.person),travelNotice:`${q.title}已完成，援助奖励已结算。`};
 return withWorldDate(next,advanceDays(state.date,q.days));
}
