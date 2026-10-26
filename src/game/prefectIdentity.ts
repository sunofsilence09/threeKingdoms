import { END_YEAR, START_YEAR } from './history';
import { WORLD_CITIES } from './world';
import { CONFLICT_FACTIONS } from './conflictFactions';
import type { LifeBaseline } from './lifeTypes';

export interface PrefectIdentity {
  id:string;cityId:string;factionId:string;appointedYear:number;serial:number;name:string;
  birthYear:number;deathBaseYear:number;gender:'male'|'female';portrait:string;portraitIndex:number;baseline:LifeBaseline;
}
const cityIds=new Set(WORLD_CITIES.map(c=>c.id));
const factionIds=new Set(CONFLICT_FACTIONS.map(f=>f.id));
const surnames='沈顾陆许程陶邵韩周林杜方宋章钟潘董邓范韦秦彭薛蒋冯朱施郑';
const maleGiven=['怀宁','承文','景谦','季衡','文岳','思恭','伯远','仲和','敬修','元礼','明恕','子诚','守正','景安','延清','宗俭'];
const femaleGiven=['若宁','静仪','怀瑾','素清','令仪','景兰','文姝','思婉','云舒','惠柔','安素','清禾','知微','韶华','映秋','雅容'];
export function prefectHash(id:string):number {
  let hash=2166136261;
  for(const char of id)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
  return hash;
}
export function prefectIdentity(value:unknown):PrefectIdentity|undefined {
  if(typeof value!=='string')return undefined;
  const match=/^prefect-([a-z]+)-([a-z-]+)-(\d{3})-([1-9]\d{0,6})$/.exec(value);
  if(!match)return undefined;
  const [,cityId,factionId,yearText,serialText]=match;
  const appointedYear=Number(yearText),serial=Number(serialText);
  if(!cityIds.has(cityId)||!factionIds.has(factionId)||appointedYear<START_YEAR||appointedYear>END_YEAR||serial>1_000_000)return undefined;
  const hash=prefectHash(value),portraitIndex=hash%8+1;
  const gender=portraitIndex<=6?'male':'female';
  const name=surnames[(hash>>>8)%surnames.length]+(gender==='male'?maleGiven:femaleGiven)[(hash>>>16)%16];
  const birthYear=appointedYear-(28+(hash>>>5)%18),deathBaseYear=birthYear+70;
  const baseline:LifeBaseline={id:value,birthYear,deathBaseYear,historicalBirthYear:null,historicalDeathYear:null,
    birthEstimated:true,deathEstimated:true,source:'本局原创地方官身份设定；非史载人物',
    basis:'游戏人物。生年为固定身份设定，寿限基准为70岁，本局卒年独立浮动±5年；不属于史料生卒。'};
  return {id:value,cityId,factionId,appointedYear,serial,name,birthYear,deathBaseYear,gender,portraitIndex,
    portrait:`/assets/characters/local-prefect-${portraitIndex}-v1.png`,baseline};
}
export function createPrefectId(cityId:string,factionId:string,appointedYear:number,serial:number):string {
  const id=`prefect-${cityId}-${factionId}-${appointedYear}-${serial}`;
  if(!prefectIdentity(id))throw new Error('Invalid original prefect identity');
  return id;
}
