import { advanceDays, isGameDate, type GameDate } from './history';
import { canInteractPerson, canManageParty, gameDayNumber } from './recruitment';
import { martialAt, martialForPerson } from './martialCatalog';
import { recruitProfile } from './recruitmentCatalog';
import type { GameState } from './state';
import { withWorldDate } from './worldTime';
import { isAliveAt } from './personLife';
export interface MartialResult {
  kind: 'teaching' | 'duel'; teacherId: string; skillId: string;
  outcome: 'learned' | 'declined' | 'known' | 'lost'; date: GameDate; encounterId?: string;
}
export interface MartialProgress {
  learned: string[]; equipped: string[]; teachingDates: Record<string, GameDate>; challengeDates: Record<string, GameDate>;
  seed: number; settled: string[]; acquisitions: Record<string, MartialResult>; lastResult?: MartialResult;
}
export interface DuelEncounter { id: string; teacherId: string; started: GameDate; status: 'active' | 'won' | 'lost' }
export function createMartialProgress(): MartialProgress { return { learned: [], equipped: [], teachingDates: {}, challengeDates: {}, seed: 734851, settled: [], acquisitions: {} }; }
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const token = (id: unknown): id is string => typeof id === 'string' && /^duel-[0-9]+-[0-9]+$/.test(id);
const teachable = (id: string) => !!recruitProfile(id) && !recruitProfile(id)!.readOnly && !!martialForPerson(id) && !martialForPerson(id)!.readOnly;
function validDate(value: unknown, now?: GameDate): value is GameDate { return isGameDate(value) && (!now || gameDayNumber(value) <= gameDayNumber(now)); }
export function isDuelEncounter(value: unknown, date?: GameDate): value is DuelEncounter {
  return record(value) && token(value.id) && typeof value.teacherId === 'string' && teachable(value.teacherId) && validDate(value.started,date) &&
    value.id.split('-')[1] === String(gameDayNumber(value.started)) && Number(value.id.split('-')[2]) <= 0xffffffff && ['active','won','lost'].includes(value.status as string);
}
export function isMartialProgress(value: unknown, date?: GameDate): value is MartialProgress {
  if (!record(value)) return false;
  const known = (v: unknown): v is string[] => Array.isArray(v) && new Set(v).size === v.length && v.every(id => typeof id === 'string' && !!martialAt(id) && !martialAt(id)!.readOnly);
  const dates = (v: unknown) => record(v) && Object.entries(v).every(([id,d]) => teachable(id) && validDate(d,date));
  if (!known(value.learned) || !known(value.equipped) || value.equipped.length > 3 || !value.equipped.every(id => (value.learned as string[]).includes(id)) ||
      !dates(value.teachingDates) || !dates(value.challengeDates) || !Number.isSafeInteger(value.seed) || (value.seed as number) < 0 || (value.seed as number) > 0xffffffff ||
      !Array.isArray(value.settled) || new Set(value.settled).size !== value.settled.length || !value.settled.every(token)) return false;
  const result = (r: unknown): r is MartialResult => record(r) && ['teaching','duel'].includes(r.kind as string) && typeof r.teacherId === 'string' && teachable(r.teacherId) &&
    martialForPerson(r.teacherId)?.id === r.skillId && ['learned','declined','known','lost'].includes(r.outcome as string) && validDate(r.date,date) &&
    (r.encounterId === undefined || token(r.encounterId)) && (r.kind !== 'duel' || token(r.encounterId));
  return record(value.acquisitions) && Object.entries(value.acquisitions).every(([id,r]) => (value.learned as string[]).includes(id) && result(r) && r.outcome === 'learned' && r.skillId === id) &&
    (value.lastResult === undefined || result(value.lastResult));
}
function draw(seed: number): { seed: number; roll: number } { const next = (Math.imul(seed,1664525) + 1013904223) >>> 0; return { seed: next, roll: next / 4294967296 }; }
export function teachingChance(state: GameState, id: string): number { return Math.min(50,Math.max(0,(state.relationships[id]?.affinity ?? 0)-50)); }
export function canRequestTeaching(state: GameState, id: string): boolean {
  return teachable(id) && canInteractPerson(state,id) && (state.relationships[id]?.affinity ?? 0) >= 80 &&
    !state.martial.learned.includes(martialForPerson(id)!.id) && gameDayNumber(state.martial.teachingDates[id] ?? { year:184,month:1,day:1 }) !== gameDayNumber(state.date) &&
    gameDayNumber(advanceDays(state.date,1)) > gameDayNumber(state.date);
}
export function requestTeaching(state: GameState, id: string): GameState {
  if (!canRequestTeaching(state,id)) return state;
  const skill = martialForPerson(id)!, date = advanceDays(state.date,1), advanced = withWorldDate(state,date);
  if (!isAliveAt(advanced.life,id,advanced.date,true)) return { ...advanced, travelNotice: `${recruitProfile(id)!.name}已于本局离世；停留1日，未传授武学。` };
  const random = draw(advanced.martial.seed), success = random.roll < teachingChance(advanced,id)/100;
  const lastResult: MartialResult = { kind:'teaching',teacherId:id,skillId:skill.id,outcome:success?'learned':'declined',date };
  const martial: MartialProgress = { ...advanced.martial, seed: random.seed, teachingDates: { ...advanced.martial.teachingDates,[id]: date },
    learned: success ? [...advanced.martial.learned,skill.id] : advanced.martial.learned,
    acquisitions: success ? { ...advanced.martial.acquisitions,[skill.id]:lastResult } : advanced.martial.acquisitions,lastResult };
  return { ...advanced,martial,travelNotice: `${recruitProfile(id)!.name}${success ? `传授了《${skill.name}》` : '此次未传授武学'}；停留1日。` };
}
export function canStartDuel(state: GameState, id: string): boolean {
  return !state.duel && teachable(id) && canInteractPerson(state,id) &&
    gameDayNumber(state.martial.challengeDates[id] ?? { year:184,month:1,day:1 }) !== gameDayNumber(state.date) && gameDayNumber(advanceDays(state.date,1)) > gameDayNumber(state.date);
}
export function startDuel(state: GameState, id: string): GameState {
  if (!canStartDuel(state,id)) return state;
  const date = advanceDays(state.date,1), advanced = withWorldDate(state,date);
  if (!isAliveAt(advanced.life,id,advanced.date,true)) return { ...advanced, travelNotice: `${recruitProfile(id)!.name}已于本局离世；停留1日，切磋取消。` };
  const random = draw(advanced.martial.seed);
  const duel: DuelEncounter = { id:`duel-${gameDayNumber(date)}-${random.seed}`,teacherId:id,started:date,status:'active' };
  return { ...advanced,phase:'battle',encounter:'ambush',battleParty:['traveler'],activeBattle:undefined,duel,
    martial: { ...advanced.martial,seed:random.seed,challengeDates: { ...advanced.martial.challengeDates,[id]:date } },travelNotice:`与${recruitProfile(id)!.name}切磋；停留1日。` };
}
export function settleDuel(state: GameState, win: boolean): GameState {
  const duel = state.duel;
  if (!duel || state.phase !== 'battle' || !isDuelEncounter(duel,state.date) || duel.status !== 'active' || state.martial.settled.includes(duel.id) ||
      !state.martial.challengeDates[duel.teacherId] || gameDayNumber(state.martial.challengeDates[duel.teacherId]) !== gameDayNumber(duel.started)) return state;
  if (!isAliveAt(state.life,duel.teacherId,state.date,true)) return { ...state, phase:'overworld',duel:undefined,activeBattle:undefined,battleParty:undefined,encounter:undefined,
    martial: { ...state.martial, settled:[...state.martial.settled,duel.id] }, travelNotice:`${recruitProfile(duel.teacherId)!.name}已于本局离世；切磋结束，未获传授。` };
  const skill = martialForPerson(duel.teacherId)!, known = state.martial.learned.includes(skill.id);
  const random = win && !known ? draw(state.martial.seed) : { seed:state.martial.seed,roll:1 };
  const outcome = !win ? 'lost' : known ? 'known' : random.roll < .4 ? 'learned' : 'declined';
  const lastResult: MartialResult = { kind:'duel',teacherId:duel.teacherId,skillId:skill.id,outcome,date:state.date,encounterId:duel.id };
  return { ...state,phase:'overworld',duel:undefined,activeBattle:undefined,battleParty:undefined,encounter:undefined,
    martial: { ...state.martial,seed:random.seed,settled:[...state.martial.settled,duel.id],learned:outcome === 'learned' ? [...state.martial.learned,skill.id] : state.martial.learned,
      acquisitions: outcome === 'learned' ? { ...state.martial.acquisitions,[skill.id]:lastResult } : state.martial.acquisitions,lastResult },
    travelNotice: outcome === 'learned' ? `切磋获胜，${recruitProfile(duel.teacherId)!.name}传授了《${skill.name}》。` : outcome === 'known' ? `切磋获胜；已经掌握《${skill.name}》。` : outcome === 'lost' ? '切磋结束，未获传授；伤势已恢复。' : '切磋获胜，但此次未获传授。' };
}
export function equipMartial(state: GameState, ids: string[]): GameState {
  if (!canManageParty(state) || !Array.isArray(ids) || ids.length > 3 || new Set(ids).size !== ids.length || !ids.every(id => state.martial.learned.includes(id) && !!martialAt(id) && !martialAt(id)!.readOnly) || ids.join('|') === state.martial.equipped.join('|')) return state;
  return { ...state,martial: { ...state.martial,equipped:[...ids] } };
}
