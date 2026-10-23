import { describe, expect, it } from 'vitest';
import { ORIGINS, PROVINCES } from './history';
import { createInitialState } from './state';

describe('complete Eastern Han starting regions', () => {
  it('covers all thirteen province-level regions including Sili and Jiaozhi', () => {
    expect(PROVINCES.map(p => p.id).sort()).toEqual(['sili', 'yu', 'yan', 'xu', 'qing', 'ji', 'you', 'bing', 'liang', 'yi', 'jing', 'yang', 'jiao'].sort());
    expect(new Set(ORIGINS.map(o => o.provinceId)).size).toBe(13);
    expect(new Set(ORIGINS.map(o => o.id)).size).toBe(ORIGINS.length);
  });
  it('gives every province an equal random interval regardless of its location count', () => {
    for (let i = 0; i < PROVINCES.length; i++) {
      const province = PROVINCES[i];
      const locations = ORIGINS.filter(o => o.provinceId === province.id);
      expect(locations.length).toBeGreaterThan(0);
      for (let j = 0; j < locations.length; j++) {
        const draws = [(i + .5) / PROVINCES.length, (j + .5) / locations.length];
        const state = createInitialState(() => draws.shift()!);
        expect(state.originId).toBe(locations[j].id);
        expect(state.route).toBeNull();
        expect(state.date).toEqual({ year: 184, month: 3, day: 1 });
      }
    }
  });
  it('keeps all four legacy origin ids valid', () => {
    for (const id of ['yingchuan', 'runan', 'nanyang', 'zhuo']) expect(ORIGINS.some(o => o.id === id)).toBe(true);
  });
  it('places origin markers above the fixed character HUD', () => {
    for (const origin of ORIGINS) {
      expect(origin.start.y + 9).toBeLessThan(540 * .71);
      expect(origin.start.y - 28).toBeGreaterThan(130);
    }
  });
});
