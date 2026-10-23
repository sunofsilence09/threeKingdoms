import { ATTRIBUTE_IDS, createAttributes, isAttributes, type Attributes } from './attributes';

export const PARTY_IDS = ['traveler', 'aman', 'chen-da'] as const;
/** The tuple is only the legacy starting party; recruited members use their catalog IDs. */
export type PartyId = string;
export interface Progress { level: number; xp: number; points: number; attributes: Attributes }
export type PartyProgress = Record<PartyId, Progress>;
export const MAX_LEVEL = 10;
export const POINTS_PER_LEVEL = 3;

export function createProgress(level = 1, xp = 0): Progress {
  return { level, xp, points: (level - 1) * POINTS_PER_LEVEL, attributes: createAttributes() };
}
export function createPartyProgress(): PartyProgress {
  return { traveler: createProgress(), aman: createProgress(), 'chen-da': createProgress() };
}
export function experienceToNextLevel(level: number): number {
  return level >= MAX_LEVEL ? 0 : 20 + (level - 1) * 10;
}
export function grantExperience(progress: Progress, amount: number): Progress {
  if (!Number.isSafeInteger(amount) || amount < 0) return progress;
  let { level, xp } = progress;
  xp += amount;
  while (level < MAX_LEVEL && xp >= experienceToNextLevel(level)) {
    xp -= experienceToNextLevel(level);
    level += 1;
  }
  return { ...progress, level, xp: level === MAX_LEVEL ? 0 : xp, points: progress.points + (level - progress.level) * POINTS_PER_LEVEL };
}
export function migratePartyProgress(value: unknown): PartyProgress | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const party = {} as PartyProgress;
  if (!PARTY_IDS.every(id => Object.hasOwn(value, id))) return null;
  for (const id of Object.keys(value)) {
    if (!/^[a-z][a-z0-9-]*$/.test(id)) return null;
    const entry = (value as PartyProgress)[id];
    if (!entry || !Number.isSafeInteger(entry.level) || entry.level < 1 || entry.level > MAX_LEVEL ||
      !Number.isSafeInteger(entry.xp) || entry.xp < 0 ||
      (entry.level === MAX_LEVEL ? entry.xp !== 0 : entry.xp >= experienceToNextLevel(entry.level))) return null;
    if (entry.points === undefined && entry.attributes === undefined) party[id] = createProgress(entry.level, entry.xp);
    else {
      if (!isAttributes(entry.attributes) || !Number.isSafeInteger(entry.points) || entry.points < 0 ||
        ATTRIBUTE_IDS.reduce((sum, key) => sum + entry.attributes[key] - 10, entry.points) !== (entry.level - 1) * POINTS_PER_LEVEL) return null;
      party[id] = { ...entry, attributes: { ...entry.attributes } };
    }
  }
  return party;
}
export function isPartyProgress(value: unknown): value is PartyProgress {
  return !!migratePartyProgress(value) && Object.keys(value as PartyProgress).every(id => (value as PartyProgress)[id].attributes !== undefined && (value as PartyProgress)[id].points !== undefined);
}
