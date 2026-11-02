import type { HistoricalCharacter } from './historicalCharacters';
import type { CareerStage } from './careerData';
import type { LifeBaseline } from './lifeTypes';
import type { MartialTemplate } from './martialCatalog';
// Encounter years, unknown lifespans and visual interpretations are authored game settings.
const concepts: [string,string,'male'|'female',string,HistoricalCharacter['weapon'],number,number,number,number,string,string,MartialTemplate][] = [
 ['dong-bai','董白','female','渭阳君（成年架空支线）','jade',0x57334e,0xd5ae61,178,220,'changan','渭阳','intimidate'],
 ['lu-zhi','卢植','male','汉末儒将','scroll',0x545b68,0xc6ad74,139,192,'henan','经略','rally'],
 ['huangfu-song','皇甫嵩','male','汉末名将','sword',0x71383a,0xc5a15d,138,195,'henan','平乱','fortify'],
];
export const V23_CHARACTERS: readonly HistoricalCharacter[] = concepts.map(([id,name,gender,role,weapon,robe,accent])=>({
 id,name,gender,role,weapon,speed:gender==='male'?13:12,specialty:id==='lu-zhi'?'经学、统军、筹谋':id==='huangfu-song'?'统军、平乱、守备':'交涉、察人、援护',equipment:weapon==='spear'?'长枪':weapon==='sword'?'佩剑':weapon==='scroll'?'经卷':weapon==='jade'?'玉佩':'佩剑',
 appearance:{identity:`乱世人物 · ${role}`,portrait:`/assets/characters/${id}-v1.png`,bio:`${id==='dong-bai'?'《三国志·董卓传》裴注引《英雄记》记董卓孙女白受封渭阳君，时尚未笄；生卒不详，本作178—220为估年，196年起仅以成年架空形象登场。':id==='lu-zhi'?'《后汉书·卢植传》载其任北中郎将讨黄巾，初平三年卒；生年139为游戏估年。':'《后汉书·皇甫嵩朱儁列传》载其平黄巾，李傕作乱时病卒，未明记卒年；138—195为游戏参考估年。'}${name}以${role}身份加入人物志。此处服饰、战斗能力、寿命估年与逐年相遇地点均为游戏编排；长期同行和主角羁绊是架空支线。`,robe,accent,sash:accent,skin:0xc9a182,headband:null,stocky:false,beard:gender==='male',pack:false,pose:gender==='male'?'commander':'calm',outfit:gender==='male'?(id==='lu-zhi'?'robe':'armor'):'dress',hair:gender==='male'?'crown':'bun'}
}));
export const V23_CAREERS: Record<string,CareerStage[]> = Object.fromEntries(concepts.map(([id,,,,,,,birth,death,city])=>{
 const from=Math.max(184,birth+18),to=death-1;
 const cities=[[from,to,city]];
 return [id,cities.map(([start,end,cityId])=>({from:{year:Number(start),month:1},to:{year:Number(end),month:12},cityId:String(cityId),kind:'free',office:'人物联络处（游戏编排）',title:'可寻访人物'}))];
}));
export const V23_LIFE_BASELINES: readonly LifeBaseline[] = concepts.map(([id,,,,,,,birth,death])=>({id,birthYear:birth,historicalBirthYear:null,deathBaseYear:death,historicalDeathYear:id==='lu-zhi'?death:null,birthEstimated:true,deathEstimated:id!=='lu-zhi',source:id==='dong-bai'?'《三国志·董卓传》裴注引《英雄记》':'《后汉书》本传',basis:id==='dong-bai'?'生卒不详；178—220均为游戏估年。成年相遇窗口为架空支线。':id==='lu-zhi'?'生年为游戏估年；卒年采用本传初平三年，游戏内按既有规则浮动。':'本传未明记卒年；138—195均为游戏参考估年。'}));
export const V23_MARTIAL_ENTRIES: [string,string,MartialTemplate,string,string][] = concepts.map(([id,,,,,,,,,,name,template])=>[id,name,template,'本作2.3人物能力设定','为人物身份创作的游戏招式，非史载秘籍。']);
