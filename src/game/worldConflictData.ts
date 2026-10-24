import type { GameDate } from './history';
import { CITY_CAREERS } from './careerData';
import type { ConflictFaction } from './worldConflictTypes';
import type { LifeState } from './lifeTypes';
import { isAliveAt } from './personLife';

/** Authored campaign parameters, not reconstructed historical borders or census counts. */
export const CONFLICT_FACTIONS: readonly ConflictFaction[] = [
  ['han','汉廷地方官军','#997646'], ['yellow-turban','黄巾部众','#bc9b24'],
  ['cao','曹氏军府','#526e9b'], ['liu','刘备军府','#488068'], ['sun','孙氏军府','#b85a48'],
  ['yuan-shao','袁绍军府','#a575a5'], ['yuan-shu','袁术军府','#b58b49'], ['liu-biao','刘表军府','#578c9d'],
  ['yi','益州军府','#6b9366'], ['zhang-lu','张鲁军府','#738c92'], ['ma-teng','马腾军府','#93775d'],
  ['gongsun-zan','公孙瓒军府','#8493af'], ['liu-yu','刘虞军府','#819b81'], ['zhang-yan','黑山部众','#776c85'],
  ['dong-zhuo','董卓军府','#8e675d'], ['lu-bu','吕布军府','#ae6b86'],
].map(([id,name,color])=>({id,name,color}));
export function factionAt(id: string): ConflictFaction {
  const faction=CONFLICT_FACTIONS.find(f=>f.id===id);
  if(!faction) throw new Error(`Unknown conflict faction: ${id}`);
  return faction;
}
export interface ConflictFoundation {
  id: string; year: number; month: number; factionId: string; cities: readonly string[]; raised: number; note: string;
}
/** Candidate nodes are a compact game layout. Contact windows alone never grant a city. */
export const CONFLICT_FOUNDATIONS: readonly ConflictFoundation[] = [
  {id:'yellow-184',year:184,month:3,factionId:'yellow-turban',cities:['julu'],raised:7600,note:'黄巾起事：城外有限部众，不把巨鹿郡府改写成黄巾占领'},
  {id:'sun-187',year:187,month:1,factionId:'sun',cities:['changsha'],raised:2000,note:'长沙军府情景'},
  {id:'yi-188',year:188,month:1,factionId:'yi',cities:['shujun','jiangzhou'],raised:0,note:'益州机构管理；194年前不使用刘璋'},
  {id:'ma-188',year:188,month:1,factionId:'ma-teng',cities:['didao'],raised:2400,note:'凉州起兵区域；长安联络处不代表占城'},
  {id:'gongsun-188',year:188,month:1,factionId:'gongsun-zan',cities:['zhuo'],raised:1800,note:'北方军府情景'},
  {id:'liuyu-188',year:188,month:1,factionId:'liu-yu',cities:['ji'],raised:0,note:'幽州军府情景'},
  {id:'dong-189',year:189,month:9,factionId:'dong-zhuo',cities:['henan'],raised:3000,note:'入洛阳的情景节点；其后不按历史强制易主'},
  {id:'cao-190',year:190,month:1,factionId:'cao',cities:['chenliu'],raised:2200,note:'起兵区域压缩为陈留节点'},
  {id:'yuanshu-190',year:190,month:1,factionId:'yuan-shu',cities:['nanyang'],raised:1800,note:'南阳军府情景'},
  {id:'liubiao-190',year:190,month:1,factionId:'liu-biao',cities:['xiangyang','jiangling'],raised:0,note:'荆州军府情景'},
  {id:'yuanshao-191',year:191,month:1,factionId:'yuan-shao',cities:['ye'],raised:2000,note:'冀州军府情景'},
  {id:'liu-191',year:191,month:1,factionId:'liu',cities:['beihai'],raised:2200,note:'北方活动区域游戏落脚点，并非宣称刘备当年占领北海'},
  {id:'lu-193',year:193,month:1,factionId:'lu-bu',cities:['dongjun'],raised:2600,note:'东行活动区域游戏落脚点'},
  {id:'zhanglu-194',year:194,month:1,factionId:'zhang-lu',cities:['nanzheng'],raised:1800,note:'汉中军府情景'},
  {id:'sun-195',year:195,month:1,factionId:'sun',cities:['wujun'],raised:2200,note:'成年孙策江东阶段；不覆盖战后归属'},
  {id:'black-mountain-185',year:185,month:1,factionId:'zhang-yan',cities:['taiyuan'],raised:4000,note:'黑山区域有限野战部众；不因巨鹿联络处赠城'},
];
const monthAt=(date:GameDate)=>date.year*12+date.month;
export function leaderForFaction(factionId:string,date:GameDate,life?:LifeState):string|undefined {
  const y=date.year;
  const available=(id:string|undefined)=>id&&(!life||isAliveAt(life,id,date))?id:undefined;
  const stages:Record<string,[string,number,number][]>= {
    cao:[['cao-cao',184,219],['cao-pi',220,225],['cao-rui',226,238],['cao-fang',239,253],['cao-mao',254,259],['cao-huan',260,264],['sima-yan',265,290]],
    liu:[['liu-bei',184,222],['liu-shan',223,263]],
    sun:[['sun-jian',184,190],['sun-ce',195,199],['sun-quan',200,251],['sun-liang',252,257],['sun-xiu',258,263],['sun-hao',264,279]],
  };
  if(stages[factionId]) return available(stages[factionId].find(([,from,to])=>y>=from&&y<=to)?.[0]);
  const leaders:Record<string,[string,number,number]>={cao:['cao-cao',184,219],liu:['liu-bei',184,222],
    'yuan-shao':['yuan-shao',191,201],'yuan-shu':['yuan-shu',190,198],'liu-biao':['liu-biao',190,207],yi:['liu-zhang',194,213],
    'zhang-lu':['zhang-lu',194,214],'ma-teng':['ma-teng',188,207],'gongsun-zan':['gongsun-zan',188,194],
    'liu-yu':['liu-yu',188,192],'zhang-yan':['zhang-yan',185,204],'dong-zhuo':['dong-zhuo',184,191],'lu-bu':['lu-bu',189,198]};
  const l=leaders[factionId]; return available(l&&y>=l[1]&&y<=l[2]?l[0]:undefined);
}
const personalFaction:Record<string,string>={
  'cao-cao':'cao','liu-bei':'liu','sun-jian':'sun','sun-ce':'sun','sun-quan':'sun','sun-shangxiang':'sun',
  'yuan-shao':'yuan-shao','yuan-shu':'yuan-shu','liu-biao':'liu-biao','liu-zhang':'yi','zhang-lu':'zhang-lu',
  'ma-teng':'ma-teng','gongsun-zan':'gongsun-zan','liu-yu':'liu-yu','zhang-yan':'zhang-yan','dong-zhuo':'dong-zhuo','lu-bu':'lu-bu',
  'guan-yu':'liu','zhang-fei':'liu','mi-fu-ren':'liu','zhang-xingcai':'liu','zhou-yu':'sun','hua-xiong':'dong-zhuo',
  'wang-yun':'han','xu-qiu':'han','guo-xun':'han','jia-cong':'han','guo-dian':'han','zhao-qian':'han','chu-gong':'han','qin-jie':'han',
};
export function factionForPerson(id:string,date:GameDate):string|undefined {
  if(id==='zhao-yun') return date.year<191?undefined:date.year<=199?'gongsun-zan':'liu';
  if(id==='zhuge-liang') return date.year>=207?'liu':undefined;
  if(id==='zhang-liao') return date.year<187?undefined:date.year<=192?'dong-zhuo':date.year<=198?'lu-bu':'cao';
  const m=monthAt(date),career=CITY_CAREERS[id]?.find(c=>m>=c.from.year*12+(c.from.month??1)&&m<=c.to.year*12+(c.to.month??12));
  if(id==='jiang-wei' && career && date.year<228) return 'cao';
  if(career?.employerId) return factionForPerson(career.employerId,date);
  if(career?.kind==='free') return undefined;
  if(generationFaction[id]) return career ? generationFaction[id] : undefined;
  if(id==='gongsun-zan'&&date.year<188) return 'han';
  return personalFaction[id]??(career?.office.includes('曹魏')?'cao':undefined);
}
/** Stable military institutions survive individual succession; this is not a scripted conquest. */
const generationFaction:Record<string,string>={
  'cao-pi':'cao','cao-rui':'cao','cao-fang':'cao','cao-mao':'cao','cao-huan':'cao',
  'sima-yi':'cao','sima-shi':'cao','sima-zhao':'cao','sima-yan':'cao','deng-ai':'cao','zhong-yao':'cao','zhong-hui':'cao','xun-yu':'cao','xun-you':'cao','du-yu':'cao','yang-hu':'cao','wang-jun':'cao',
  'liu-shan':'liu','liu-chen':'liu','jiang-wei':'liu',
  'sun-xiu':'sun','sun-liang':'sun','sun-hao':'sun','lu-xun':'sun','lu-kang':'sun','zhuge-ke':'sun',
};
/** Ordinary troop model: 10 HP, 3 attack, 1 defense, six attributes of 10; bounded command +0…6%. */
export const CONFLICT_RULES={reserve:2000,contribution:.6,cityCap:20000,monthlyRecruits:50,defendingBonus:1.15,randomMin:.9,randomMax:1.1,commandBonus:.06} as const;
