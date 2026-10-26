import { ATTRIBUTE_IDS, isAttributes } from './attributes';
import { experienceToNextLevel, MAX_LEVEL, POINTS_PER_LEVEL } from './growth';
import { START_YEAR, END_YEAR, type GameDate } from './history';
import type { GameState } from './state';
import type { LifeBaseline, LifeMemorial, LifeNotice, LifeState, LifeStatus, PersonLife } from './lifeTypes';
import { PERSON_LIFE_BASELINES } from './personLifeData';
import { prefectIdentity } from './prefectIdentity';

export type { LifeBaseline, LifeMemorial, LifeNotice, LifeState, LifeStatus, PersonLife } from './lifeTypes';
const baselines = new Map(PERSON_LIFE_BASELINES.map(p => [p.id, p]));
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const dayNumber = (date: GameDate) => (date.year - START_YEAR) * 360 + (date.month - 1) * 30 + (date.day ?? 1) - 1;
const deathDay = (year: number) => (year - START_YEAR) * 360;
const uint32 = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 0xffffffff;
const validPersonLife = (p: LifeBaseline, life: unknown): life is PersonLife => record(life) && life.birthYear === p.birthYear && Number.isSafeInteger(life.deathYear) &&
  (life.deathYear as number) > p.birthYear && (life.deathYear as number) >= p.deathBaseYear - 5 && (life.deathYear as number) <= p.deathBaseYear + 5;
const validProgress = (p: unknown): p is LifeMemorial['progress'] => record(p) && Number.isSafeInteger(p.level) && (p.level as number) >= 1 && (p.level as number) <= MAX_LEVEL &&
  Number.isSafeInteger(p.xp) && (p.xp as number) >= 0 && ((p.level as number) === MAX_LEVEL ? p.xp === 0 : (p.xp as number) < experienceToNextLevel(p.level as number)) &&
  Number.isSafeInteger(p.points) && (p.points as number) >= 0 && isAttributes(p.attributes) &&
  ATTRIBUTE_IDS.reduce((sum, id) => sum + (p.attributes as Record<string, number>)[id] - 10, p.points as number) === ((p.level as number) - 1) * POINTS_PER_LEVEL;
const validRelationship = (r: unknown, lastDay: number): r is NonNullable<LifeMemorial['relationship']> => record(r) && Number.isSafeInteger(r.affinity) &&
  (r.affinity as number) >= 0 && (r.affinity as number) <= 100 && (r.lastInteraction === undefined || Number.isSafeInteger(r.lastInteraction) && (r.lastInteraction as number) >= 0 && (r.lastInteraction as number) <= lastDay);

export function lifeBaseline(id: string): LifeBaseline | undefined { return baselines.get(id) ?? prefectIdentity(id)?.baseline; }

/** Static catalog entries stay mandatory; only fully parsed original IDs may extend it. */
function knownBaselines(ids: readonly string[]): LifeBaseline[] {
  const known = new Map(baselines);
  for (const id of ids) {
    const p = lifeBaseline(id);
    if (p) known.set(id, p);
  }
  return [...known.values()];
}

/** A separate stream per stable ID allows later catalogs to append without shifting old lives.
 * Rejection above the largest multiple of 11 avoids modulo bias among the eleven offsets.
 */
function generatedLife(baseline: LifeBaseline, seed: number): PersonLife {
  let hash = (seed ^ 2166136261) >>> 0;
  for (const char of baseline.id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  let draw = hash;
  do { draw = (Math.imul(draw, 1664525) + 1013904223) >>> 0; } while (draw >= 4294967292);
  return { birthYear: baseline.birthYear, deathYear: baseline.deathBaseYear + draw % 11 - 5 };
}

/** Append missing identities without consuming a stream or redrawing existing saved lives.
 * Newly discovered deaths before the module's recorded day are silent until an owned
 * party entry needs archival. The bridge calls this before saving new appointments.
 */
export function ensureLifePeople(life: LifeState, ids: readonly string[]): LifeState {
  const missing = knownBaselines(ids).filter(p => !Object.hasOwn(life.people, p.id));
  if (!missing.length) return life;
  const people = { ...life.people }, handled = new Set(life.handledIds);
  for (const p of missing) {
    const person = generatedLife(p, life.seed);
    people[p.id] = person;
    if (deathDay(person.deathYear) <= life.lastDay) handled.add(p.id);
  }
  return { ...life, people, handledIds: [...handled] };
}

export function createLifeState(date: GameDate, seed = Date.now() >>> 0): LifeState {
  const campaignSeed = uint32(seed) ? seed : 0;
  const people = Object.fromEntries(PERSON_LIFE_BASELINES.map(p => [p.id, generatedLife(p, campaignSeed)]));
  return { version: 1, catalogVersion: 1, seed: campaignSeed, people, memorials: {}, notices: [],
    handledIds: PERSON_LIFE_BASELINES.filter(p => date.year >= people[p.id].deathYear).map(p => p.id), lastDay: dayNumber(date) };
}

/** Strict persisted-module validation. A corrupt life module never validates as RPG data. */
export function isLifeState(value: unknown, date?: GameDate): value is LifeState {
  if (!record(value) || value.version !== 1 || value.catalogVersion !== 1 || !uint32(value.seed) ||
    !record(value.people) || Object.keys(value.people).length < baselines.size || !record(value.memorials) ||
    !Array.isArray(value.handledIds) || new Set(value.handledIds).size !== value.handledIds.length ||
    !Array.isArray(value.notices) || value.notices.length > 50 ||
    !Number.isSafeInteger(value.lastDay) || (value.lastDay as number) < 0 || (value.lastDay as number) >= (END_YEAR - START_YEAR + 1) * 360 ||
    date && (value.lastDay as number) > dayNumber(date)) return false;
  const people = value.people;
  if (!PERSON_LIFE_BASELINES.every(p => validPersonLife(p, people[p.id])) ||
    !Object.entries(people).every(([id, person]) => {
      const p = lifeBaseline(id);
      return !!p && validPersonLife(p, person);
    })) return false;
  const handled = value.handledIds;
  const lastDay = value.lastDay as number;
  if (!handled.every(id => typeof id === 'string' && !!lifeBaseline(id) && Object.hasOwn(people,id) && deathDay((people[id] as unknown as PersonLife).deathYear) <= lastDay) ||
    !Object.entries(people).every(([id, person]) => deathDay((person as unknown as PersonLife).deathYear) > lastDay || handled.includes(id))) return false;
  if (!Object.entries(value.memorials).every(([id, m]) => {
    const life = people[id] as unknown as PersonLife | undefined;
    return !!life && handled.includes(id) && record(m) && m.id === id && m.deathYear === life.deathYear && m.age === life.deathYear - life.birthYear &&
      validProgress(m.progress) && (m.relationship === undefined || validRelationship(m.relationship, lastDay));
  })) return false;
  const noticeIds = new Set<string>();
  return value.notices.every(n => {
    if (!record(n) || typeof n.id !== 'string' || !handled.includes(n.id) || noticeIds.has(n.id) ||
      typeof n.migrated !== 'boolean' || n.deathYear !== (people[n.id] as unknown as PersonLife)?.deathYear) return false;
    noticeIds.add(n.id);
    return true;
  });
}

/** Repair the isolated life module without re-drawing any valid saved lifespan.
 * A damaged seed is recoverable metadata: valid people and memorials remain authoritative.
 * Unrecognized schema versions require the caller's backed-up fresh-module recovery.
 */
export function repairLifeState(value: unknown, date: GameDate): { life: LifeState; repaired: boolean } | undefined {
  if (isLifeState(value, date)) return { life: value, repaired: false };
  if (!record(value) || value.version !== 1 || value.catalogVersion !== 1) return undefined;
  const savedPeople = record(value.people) ? value.people : {}, savedMemorials = record(value.memorials) ? value.memorials : {};
  const catalog = knownBaselines([...Object.keys(savedPeople), ...Object.keys(savedMemorials)]);
  const recoverable = new Map<string,PersonLife>();
  let archiveDay=0;
  for (const p of catalog) {
    // A complete archive is stronger evidence than a conflicting live record: it also carries
    // the age and cultivated progress. Partial/forged memorials must not override valid people.
    const memorial=savedMemorials[p.id];
    const person={birthYear:p.birthYear,deathYear:record(memorial)?memorial.deathYear:undefined};
    if (record(memorial) && memorial.id===p.id && validPersonLife(p,person) && person.deathYear<=date.year &&
      memorial.age===person.deathYear-person.birthYear && validProgress(memorial.progress) &&
      (memorial.relationship===undefined || validRelationship(memorial.relationship,dayNumber(date)))) {
      recoverable.set(p.id,person);
      archiveDay=Math.max(archiveDay,deathDay(person.deathYear),record(memorial.relationship)?Number(memorial.relationship.lastInteraction??0):0);
    } else if (validPersonLife(p,savedPeople[p.id])) recoverable.set(p.id,savedPeople[p.id] as PersonLife);
  }
  let recoverySeed=2166136261;
  if (!uint32(value.seed)) for (const [id,person] of recoverable) {
    for (const char of `${id}:${person.birthYear}:${person.deathYear};`) recoverySeed=Math.imul(recoverySeed^char.charCodeAt(0),16777619)>>>0;
  }
  const seed=uint32(value.seed)?value.seed:recoverySeed;
  const people = Object.fromEntries(catalog.map(p => [p.id,
    recoverable.get(p.id) ?? generatedLife(p, seed)]));
  const savedLastDay = Number.isSafeInteger(value.lastDay) && (value.lastDay as number) >= 0 && (value.lastDay as number) <= dayNumber(date)
    ? value.lastDay as number : dayNumber(date);
  const lastDay=Math.max(savedLastDay,archiveDay);
  const handledIds = catalog.filter(p => deathDay(people[p.id].deathYear) <= lastDay).map(p => p.id);
  const memorials: Record<string, LifeMemorial> = {};
  if (record(value.memorials)) for (const [id, entry] of Object.entries(value.memorials)) {
    if (!handledIds.includes(id) || !record(entry) || entry.id !== id || !validProgress(entry.progress)) continue;
    const person = people[id];
    memorials[id] = { id, deathYear: person.deathYear, age: person.deathYear - person.birthYear, progress: entry.progress,
      ...(validRelationship(entry.relationship, lastDay) ? { relationship: entry.relationship } : {}) };
  }
  const notices: LifeNotice[] = [], noticeIds = new Set<string>();
  if (Array.isArray(value.notices)) for (const entry of value.notices) {
    if (!record(entry) || typeof entry.id !== 'string' || !handledIds.includes(entry.id) || noticeIds.has(entry.id) || typeof entry.migrated !== 'boolean') continue;
    notices.push({ id: entry.id, deathYear: people[entry.id].deathYear, migrated: entry.migrated });
    noticeIds.add(entry.id);
  }
  return { life: { version: 1, catalogVersion: 1, seed, people, memorials, notices: notices.slice(-50), handledIds, lastDay }, repaired: true };
}

type LifeContext = GameState | LifeState | undefined;
function contextLife(context: LifeContext): LifeState | undefined {
  return context && 'people' in context ? context : context?.life;
}
function contextDate(context: LifeContext, date?: GameDate): GameDate {
  if (date) return date;
  if (context && 'date' in context) return context.date;
  const day = context?.lastDay ?? 60;
  return { year: START_YEAR + Math.floor(day / 360), month: Math.floor(day % 360 / 30) + 1, day: day % 30 + 1 };
}

/** Missing static legacy lives use reference years. Original identities use their
 * existing campaign seed even before the bridge persists their generated record.
 */
function resolvedPerson(life: LifeState | undefined, baseline: LifeBaseline): PersonLife | undefined {
  return life?.people[baseline.id] ?? (life && !baselines.has(baseline.id) ? generatedLife(baseline, life.seed) : undefined);
}
export function lifeStatus(context: LifeContext, id: string, date?: GameDate): LifeStatus {
  const baseline = lifeBaseline(id);
  if (!baseline) return 'untracked';
  const life = resolvedPerson(contextLife(context), baseline);
  const birth = life?.birthYear ?? baseline.birthYear, death = life?.deathYear ?? baseline.deathBaseYear;
  const year = contextDate(context, date).year;
  return year < birth ? 'unborn' : year >= death ? 'dead' : year - birth < 16 ? 'child' : 'alive';
}

export function isAliveAt(life: LifeState | undefined, id: string, date: GameDate, adult = false): boolean {
  const status = lifeStatus(life, id, date);
  return status === 'untracked' || status === 'alive' || !adult && status === 'child';
}

/** Age uses year differences. Future campaign death years are intentionally not disclosed. */
export function lifeLabel(context: LifeContext, id: string, date?: GameDate): string {
  const baseline = lifeBaseline(id);
  if (!baseline) return '原创或职业代表；未设史实生卒';
  const life = resolvedPerson(contextLife(context), baseline), now = contextDate(context, date), status = lifeStatus(context, id, now);
  const birth = life?.birthYear ?? baseline.birthYear, death = life?.deathYear ?? baseline.deathBaseYear;
  const age = status === 'unborn' ? '尚未出生' : status === 'dead' ? `本局于${death}年离世，享年约${death - birth}岁（按年计）` : `约${now.year - birth}岁（按年计）${status === 'child' ? '；未满16岁' : ''}`;
  return `${age}；${baseline.basis} 依据：${baseline.source}`;
}

/** Pure party archival; institutional troop/office handling belongs to worldTime. */
export function reconcileLives(state: GameState, date: GameDate): GameState {
  const previous = state.life;
  let life = previous ?? createLifeState(date);
  const governorIds = Object.values(state.worldConflict?.cities ?? {}).flatMap(city => city.governorId ? [city.governorId] : []);
  life = ensureLifePeople(life, [...Object.keys(state.party), ...governorIds, ...Object.keys(life.people)]);
  const handled = new Set(life.handledIds), memorials = { ...life.memorials }, notices = [...life.notices];
  const dead = Object.keys(life.people).filter(id => lifeBaseline(id) && date.year >= life.people[id].deathYear);
  let party = state.party, relationships = state.relationships, changed = life !== previous;
  for (const id of dead) {
    const person = life.people[id], owned = Object.hasOwn(party, id);
    const newlyDead = !handled.has(id), firstArchive = owned && !Object.hasOwn(memorials, id);
    if (owned) {
      party = { ...party }; relationships = { ...relationships };
      const progress = party[id], relationship = relationships[id];
      memorials[id] ??= { id, deathYear: person.deathYear, age: person.deathYear - person.birthYear,
        progress: { ...progress, attributes: { ...progress.attributes } }, ...(relationship ? { relationship: { ...relationship } } : {}) };
      delete party[id]; delete relationships[id]; changed = true;
    }
    if (newlyDead || firstArchive) {
      // Dozens of unrelated original officials can expire during a large time jump.
      // Keep their lifecycle bookkeeping, but reserve notices for the authored roster
      // and original people whose owned progress or memorial matters to the player.
      if ((baselines.has(id) || owned || Object.hasOwn(memorials,id)) && !notices.some(n => n.id === id))
        notices.push({ id, deathYear: person.deathYear, migrated: !previous || !newlyDead });
      handled.add(id); changed = true;
    }
  }
  const combatEligible = (id: string) => isAliveAt(life,id,date,true);
  const deployed = state.deployed.filter(combatEligible), battleParty = state.battleParty?.filter(combatEligible);
  if (deployed.length !== state.deployed.length || battleParty?.length !== state.battleParty?.length) changed = true;
  const lastDay = Math.max(life.lastDay, dayNumber(date));
  if (lastDay !== life.lastDay) changed = true;
  if (!changed) return state;
  life = { ...life, memorials, notices: notices.slice(-50), handledIds: [...handled], lastDay };
  return { ...state, life, party, relationships, deployed: deployed.length === state.deployed.length ? state.deployed : deployed,
    ...(state.battleParty ? { battleParty: battleParty!.length === state.battleParty.length ? state.battleParty : battleParty } : {}) };
}
