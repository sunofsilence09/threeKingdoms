import { describe, expect, it } from 'vitest';
import { advanceDays, chapterAt, isGameDate } from './history';

describe('1.0 late-generation calendar', () => {
  it('continues after280 and stops exactly at the end of310', () => {
    expect(advanceDays({ year: 280, month: 12, day: 30 }, 1)).toEqual({ year: 281, month: 1, day: 1 });
    expect(advanceDays({ year: 310, month: 12, day: 29 }, 2)).toEqual({ year: 310, month: 12, day: 30 });
    expect(isGameDate({ year: 310, month: 12, day: 30 })).toBe(true);
    expect(isGameDate({ year: 311, month: 1, day: 1 })).toBe(false);
  });
  it('has late-period historical background without claiming a forced conquest', () => {
    expect(chapterAt(265).year).toBeGreaterThanOrEqual(265);
    expect(chapterAt(280).context).toContain('本局');
  });
});
