import type { HistoricalCharacter } from './historicalCharacters';
import type { CareerStage } from './careerData';
import type { LifeBaseline } from './lifeTypes';
import type { MartialTemplate } from './martialCatalog';
// Encounter years, unknown lifespans and visual interpretations are authored game settings.
const concepts: [string,string,'male'|'female',string,HistoricalCharacter['weapon'],number,number,number,number,string,string,MartialTemplate][] = [
 ['cai-mao','蔡瑁','male','荆州水军人物','sword',0x263a55,0xa78a45,165,235,'xiangyang','水阵','fortify'],
 ['cai-fu-ren','蔡夫人','female','荆州世家人物','fan',0x5e365c,0xc6a35f,170,240,'xiangyang','帷策','intimidate'],
 ['zhang-yun','张允','male','荆州水军人物','spear',0x32676d,0x9ba6aa,170,240,'jiangling','江锋','pierce'],
 ['bian-fu-ren','卞夫人','female','曹氏家族人物','handkerchief',0x78373f,0xc7a26a,160,230,'chenliu','慈仪','soothe'],
 ['bu-lian-shi','步练师','female','江东世家人物','jade',0x5a9b81,0xd9d0ac,185,238,'wujun','惠静','protect'],
 ['sun-lu-ban','孙鲁班','female','江东宗室人物','fan',0x963c3e,0xc7a25a,209,279,'moling','衡势','intimidate'],
 ['sun-lu-yu','孙鲁育','female','江东宗室人物','handkerchief',0xa798ba,0xe0d9cd,216,255,'moling','和仪','rally'],
];
export const SOCIAL_CHARACTERS: readonly HistoricalCharacter[] = concepts.map(([id,name,gender,role,weapon,robe,accent])=>({
 id,name,gender,role,weapon,speed:gender==='male'?13:12,specialty:gender==='male'?'水军、守备、调度':'交涉、察人、援护',equipment:weapon==='spear'?'长枪':weapon==='sword'?'佩剑':weapon==='fan'?'绢扇':weapon==='jade'?'玉佩':'丝帕',
 appearance:{identity:`乱世人物 · ${role}`,portrait:`/assets/characters/${id}-v1.png`,bio:`${name}以${role}身份加入人物志。此处服饰、战斗能力、寿命估年与逐年相遇地点均为游戏编排；长期同行和主角羁绊是架空支线。`,robe,accent,sash:accent,skin:0xc9a182,headband:null,stocky:false,beard:id==='cai-mao',pack:false,pose:gender==='male'?'commander':'calm',outfit:gender==='male'?'armor':'robe',hair:gender==='male'?'crown':'bun'}
}));
export const SOCIAL_CAREERS: Record<string,CareerStage[]> = Object.fromEntries(concepts.map(([id,,,,,,,birth,death,city])=>{
 const from=Math.max(184,birth+18),to=death-1;
 const cities=id==='bian-fu-ren'?[[184,195,'chenliu'],[196,to,'ye']]:[[from,to,city]];
 return [id,cities.map(([start,end,cityId])=>({from:{year:Number(start),month:1},to:{year:Number(end),month:12},cityId:String(cityId),kind:'free',office:'人物联络处（游戏编排）',title:'可寻访人物'}))];
}));
export const SOCIAL_LIFE_BASELINES: readonly LifeBaseline[] = concepts.map(([id,,,,,,,birth,death])=>({id,birthYear:birth,historicalBirthYear:null,deathBaseYear:death,historicalDeathYear:null,birthEstimated:true,deathEstimated:true,source:'本作2.2人物设定',basis:'本版生卒采用游戏参考估年，非考证结论；卒年按既有规则每局浮动。'}));
export const SOCIAL_MARTIAL_ENTRIES: [string,string,MartialTemplate,string,string][] = concepts.map(([id,,,,,,,,,,name,template])=>[id,name,template,'本作2.2人物能力设定','为人物身份创作的游戏招式，非史载秘籍。']);
