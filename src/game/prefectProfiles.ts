import type { RecruitProfile } from './recruitmentCatalog';
import { prefectIdentity } from './prefectIdentity';
import { END_YEAR } from './history';

/** The identity is encoded in the saved ID; no mutable global NPC registry is needed. */
export function originalPrefectProfile(id:string):RecruitProfile|undefined {
  const p=prefectIdentity(id);if(!p)return undefined;
  const robes=[0x355b59,0x806443,0x536844,0x675262,0x394e70,0x77736a,0x397b79,0xb28b4d];
  const weapon=(['scroll','scroll','sword','fan','sword','scroll','jade','scroll'] as const)[p.portraitIndex-1];
  const bio=`${p.name}，本局原创地方官（游戏人物）。其姓名、身世与任命均为游戏编排，不属于史载人物；可结交、同行与传授安郡之术。`;
  return {id,name:p.name,role:'本局任命 · 地方太守',bio,portrait:p.portrait,weapon,speed:11,category:'official',
    appearance:{identity:'游戏人物 · 原创地方官',portrait:p.portrait,bio,robe:robes[p.portraitIndex-1],headband:null,
      skin:0xc5a180,sash:0x77604a,stocky:p.portraitIndex===2,beard:p.gender==='male'&&p.portraitIndex!==3,
      pack:false,pose:'scholar',outfit:'robe',hair:'crown'},
    windows:[{from:{year:p.appointedYear},to:{year:Math.min(END_YEAR,p.deathBaseYear+5)},cityIds:[p.cityId]}]};
}
