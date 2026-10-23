import { describe, expect, it } from 'vitest';
import { themeFor } from './theme';

describe('calendar themes', () => {
  it('changes terrain by season and by historical stage', () => {
    const spring = themeFor({ year: 184, month: 3 });
    expect(themeFor({ year: 184, month: 10 }).terrain.road).not.toBe(spring.terrain.road);
    expect(themeFor({ year: 200, month: 3 }).background).not.toBe(spring.background);
    expect(new Set(Object.values(spring.terrain)).size).toBe(7);
  });
  it('keeps every season bright with high contrast ink', () => {
    for (const year of [184, 190, 194, 200]) for (let month = 1; month <= 12; month++) {
      const t = themeFor({ year, month });
      const luminance = (color: number) => {
        const c = [color >> 16, (color >> 8) & 255, color & 255].map(v => {
          const s = v / 255; return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
        });
        return .2126 * c[0] + .7152 * c[1] + .0722 * c[2];
      };
      expect((luminance(t.background) + .05) / (luminance(t.ink) + .05)).toBeGreaterThan(7);
      expect(luminance(t.terrain.road)).toBeGreaterThan(.4);
    }
  });
});
