import type { GameDate } from './history';
import { WORLD_CITIES } from './world';

export const GARRISON_BASE = 5000;
export const GARRISON_MONTHLY_RECRUITS = 50;
export const GARRISON_CAP = 20000;
/** Authored troop changes, not historical census figures or a city conquest simulation. */
export const GARRISON_EVENTS = [
  { cityId: 'julu', year: 184, month: 11, factor: .7, name: '黄巾战事后的整编' },
  { cityId: 'henan', year: 190, month: 3, factor: .5, name: '兵乱与迁都' },
  { cityId: 'dongjun', year: 194, month: 6, factor: .7, name: '兖州战事' },
  { cityId: 'chenliu', year: 194, month: 6, factor: .75, name: '兖州战事' },
  { cityId: 'xiapi', year: 198, month: 12, factor: .4, name: '下邳战事后的整编' },
  { cityId: 'ye', year: 200, month: 10, factor: .8, name: '官渡战事后的调防' },
  { cityId: 'xiangyang', year: 208, month: 10, factor: .75, name: '荆州易主后的整编' },
  { cityId: 'jiangling', year: 208, month: 12, factor: .65, name: '荆州战事' },
  { cityId: 'shujun', year: 214, month: 6, factor: .8, name: '益州战事后的整编' },
  { cityId: 'nanzheng', year: 215, month: 11, factor: .65, name: '汉中战事后的整编' },
] as const;

const monthNumber = (date: { year: number; month?: number }) => date.year * 12 + (date.month ?? 1);
export function garrisonTroopsAt(cityId: string, date: GameDate) {
  if (!WORLD_CITIES.some(city => city.id === cityId) || !Number.isInteger(date.year) || date.year < 184 || date.year > 9999 || !Number.isInteger(date.month) || date.month < 1 || date.month > 12) throw new Error('Invalid city garrison date');
  let cursor = monthNumber({ year: 184, month: 3 }), troops = GARRISON_BASE;
  const now = Math.max(cursor, monthNumber(date)), changes: { name: string; year: number; month: number; change: number }[] = [];
  for (const event of GARRISON_EVENTS.filter(event => event.cityId === cityId)) {
    const month = monthNumber(event);
    if (month > now) continue;
    troops = Math.min(GARRISON_CAP, troops + (month - cursor) * GARRISON_MONTHLY_RECRUITS);
    const next = Math.max(1000, Math.floor(troops * Math.round(event.factor * 100) / 100));
    changes.push({ name: event.name, year: event.year, month: event.month, change: next - troops });
    troops = next; cursor = month;
  }
  return { troops: Math.min(GARRISON_CAP, troops + (now - cursor) * GARRISON_MONTHLY_RECRUITS), changes };
}
