export const PARTY_IDS = ['traveler', 'aman', 'chen-da'] as const;
export type PartyId = typeof PARTY_IDS[number];
export interface Progress { level: number; xp: number }
export type PartyProgress = Record<PartyId, Progress>;
export const MAX_LEVEL = 10;

export function createPartyProgress(): PartyProgress {
  return { traveler: { level: 1, xp: 0 }, aman: { level: 1, xp: 0 }, 'chen-da': { level: 1, xp: 0 } };
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
  return { level, xp: level === MAX_LEVEL ? 0 : xp };
}

export function isPartyProgress(value: unknown): value is PartyProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return PARTY_IDS.every(id => {
    const entry = (value as PartyProgress)[id];
    return !!entry && Number.isSafeInteger(entry.level) && entry.level >= 1 && entry.level <= MAX_LEVEL &&
      Number.isSafeInteger(entry.xp) && entry.xp >= 0 &&
      (entry.level === MAX_LEVEL ? entry.xp === 0 : entry.xp < experienceToNextLevel(entry.level));
  });
}
