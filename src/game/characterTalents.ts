import { ATTRIBUTE_IDS, ATTRIBUTE_LABELS, createAttributes, type AttributeId, type Attributes } from './attributes';
import { CAPTAIN_TALENTS, SOLDIER_TALENTS, TALENT_SCORES, type TalentScores } from './talentData';
export type AttributeVersion = 1 | 2;
const fromScores = (scores:TalentScores):Attributes => Object.fromEntries(ATTRIBUTE_IDS.map((key,index)=>[key,scores[index]])) as Attributes;
/** Identity-only derivation: never reads the world, life ledger or any random stream. */
export function baseAttributes(id:string):Attributes {
  const personId=id.replace(/^enemy:/,'');
  if(Object.hasOwn(TALENT_SCORES,personId))return fromScores(TALENT_SCORES[personId]);
  if(/^garrison:[a-z][a-z0-9-]*:soldier$/.test(personId))return fromScores(SOLDIER_TALENTS);
  if(/^garrison:[a-z][a-z0-9-]*:captain$/.test(personId))return fromScores(CAPTAIN_TALENTS);
  if(/^bandit-scout-[a-z]$/.test(personId))return fromScores(TALENT_SCORES.bandit);
  if(personId.startsWith('prefect-')) {
    let hash=2166136261;
    for(const char of `civic-talents-v1:${personId}`)hash=Math.imul(hash^char.charCodeAt(0),16777619)>>>0;
    return {command:10+hash%3,strength:10,intellect:11+(hash>>>4)%4,politics:12+(hash>>>8)%3,charisma:11+(hash>>>12)%4,courage:10+(hash>>>16)%3};
  }
  return createAttributes();
}
/** The stored 10…30 fields remain an earned-cultivation ledger; talents never spend points. */
export function effectiveAttributes(id:string,cultivation:Attributes,version:AttributeVersion=2):Attributes {
  if(version===1)return {...cultivation};
  const base=baseAttributes(id);
  return Object.fromEntries(ATTRIBUTE_IDS.map(key=>[key,base[key]+cultivation[key]-10])) as Attributes;
}
/** An absent marker belongs to a 1.0 encounter and must retain its recorded combat values. */
export function combatAttributeVersion(combat:{attributeVersion?:AttributeVersion}):AttributeVersion {return combat.attributeVersion??1;}
export const LEGACY_ATTRIBUTE_NOTE='本场沿用1.0属性与奖励，结束后下一场启用人物天赋。';

/** Shared text also serves memorial records: deriving this never modifies their saved growth. */
export function attributeDescription(id:string,cultivation:Attributes,key:AttributeId,version:AttributeVersion=2):string {
  const base=baseAttributes(id)[key],trained=cultivation[key]-10,current=effectiveAttributes(id,cultivation,version)[key];
  return `${ATTRIBUTE_LABELS[key]} ${current}（${version===1?'本场旧制；':''}天赋${base} + 培养${trained}/20；${version===1?`下场${base+trained}，`:''}上限${base+20}）`;
}
