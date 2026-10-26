import type { ConflictFaction } from './worldConflictTypes';

/** Stable institutional IDs. Scene names do not force historical conquest outcomes. */
export const CONFLICT_FACTIONS: readonly ConflictFaction[] = [
  ['han','汉廷地方官军','#997646'], ['yellow-turban','黄巾部众','#bc9b24'],
  ['cao','曹氏军府','#526e9b'], ['liu','刘备军府','#488068'], ['sun','孙氏军府','#b85a48'],
  ['yuan-shao','袁绍军府','#a575a5'], ['yuan-shu','袁术军府','#b58b49'], ['liu-biao','刘表军府','#578c9d'],
  ['yi','益州军府','#6b9366'], ['zhang-lu','张鲁军府','#738c92'], ['ma-teng','马腾军府','#93775d'],
  ['gongsun-zan','公孙瓒军府','#8493af'], ['liu-yu','刘虞军府','#819b81'], ['zhang-yan','黑山部众','#776c85'],
  ['dong-zhuo','董卓军府','#8e675d'], ['lu-bu','吕布军府','#ae6b86'],
  ['player','主角军府','#377f78'],
].map(([id,name,color])=>({id,name,color}));
export function factionAt(id:string):ConflictFaction {
  const faction=CONFLICT_FACTIONS.find(f=>f.id===id);
  if(!faction)throw new Error(`Unknown conflict faction: ${id}`);
  return faction;
}
