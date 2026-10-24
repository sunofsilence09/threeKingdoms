import { describe, expect, it } from 'vitest';
import { ORIGINS, PROVINCES } from './history';
import { WORLD_CITIES, WORLD_ROADS, cityAt, originCity, planRoute } from './world';

describe('historical world geography', () => {
  it('preserves every origin at an actual city and covers thirteen provinces', () => {
    expect(WORLD_CITIES).toHaveLength(60);
    expect(new Set(WORLD_CITIES.map(c => c.id)).size).toBe(WORLD_CITIES.length);
    expect(new Set(WORLD_CITIES.map(c => c.provinceId))).toEqual(new Set(PROVINCES.map(p => p.id)));
    for (const origin of ORIGINS) {
      const city = originCity(origin.id);
      expect(city.id).toBe(origin.id);
      expect(city.provinceId).toBe(origin.provinceId);
      expect(city.originId).toBe(origin.id);
      expect(cityAt(city.id)).toBe(city);
    }
    expect(originCity('henan').name).toBe('洛阳');
    expect(originCity('beihai').name).toBe('剧');
    expect(originCity('julu').name).toBe('廮陶');
    expect(originCity('dongjun').name).toBe('濮阳');
  });
  it('connects every city to Luoyang using valid bidirectional links', () => {
    for (const road of WORLD_ROADS) {
      expect(cityAt(road.from)).toBeDefined();
      expect(cityAt(road.to)).toBeDefined();
      expect(road.from).not.toBe(road.to);
      expect(['road', 'water', 'mountain']).toContain(road.kind);
    }
    for (const city of WORLD_CITIES) {
      const route = planRoute('henan', city.id)!;
      expect(route).not.toBeNull();
      expect(route.path[0]).toBe('henan');
      expect(route.path.at(-1)).toBe(city.id);
      expect(route.days).toBe(route.legs.reduce((days, leg) => days + leg.days, 0));
      expect(planRoute(city.id, 'henan')?.days).toBe(route.days);
    }
  });
  it('keeps actual geographic directions and plausible coordinate bounds', () => {
    for (const city of WORLD_CITIES) {
      expect(city.lon).toBeGreaterThan(100);
      expect(city.lon).toBeLessThan(124); // Liaodong's Xiangping lies east of 123°.
      expect(city.lat).toBeGreaterThan(22);
      expect(city.lat).toBeLessThan(42);
    }
    expect(cityAt('wuwei').lon).toBeLessThan(cityAt('changan').lon);
    expect(cityAt('changan').lon).toBeLessThan(cityAt('henan').lon);
    expect(cityAt('zhuo').lat).toBeGreaterThan(cityAt('henan').lat);
    expect(cityAt('shujun').lat).toBeLessThan(cityAt('nanzheng').lat);
    expect(cityAt('nanhai').lat).toBeLessThan(cityAt('changsha').lat);
    expect(cityAt('wujun').lon).toBeGreaterThan(cityAt('jiangling').lon);
  });
  it('routes through Qinling, Shu roads and Lingnan passes instead of direct cross-country links', () => {
    const shu = planRoute('changan', 'shujun')!;
    expect(shu.path).toContain('nanzheng');
    expect(shu.path).toContain('zitong');
    expect(shu.path).toContain('fuxian');
    expect(shu.legs.find(leg => leg.to === 'nanzheng')?.kind).toBe('mountain');
    expect(shu.legs.find(leg => leg.to === 'zitong')?.kind).toBe('mountain');
    expect(shu.legs.find(leg => leg.to === 'shujun')?.kind).toBe('road');
    expect(WORLD_ROADS.find(r => r.from === 'changan' && r.to === 'nanyang')?.kind).toBe('mountain');
    expect(planRoute('changsha', 'nanhai')?.path).toContain('chen');
    expect(planRoute('wuwei', 'changan')!.path.length).toBeGreaterThanOrEqual(4);
    for (const road of WORLD_ROADS.filter(r => r.kind === 'water')) expect(road.via?.length).toBeGreaterThan(0);
  });
  it('estimates daily travel by distance and mode with deterministic shortest routes', () => {
    expect(planRoute('henan', 'henan')).toEqual({ path: ['henan'], legs: [], days: 0 });
    expect(planRoute('missing', 'henan')).toBeNull();
    expect(planRoute('henan', 'missing')).toBeNull();
    expect(() => cityAt('missing')).toThrow();
    const local = planRoute('yingchuan', 'xuxian')!;
    expect(local.days).toBeGreaterThanOrEqual(2);
    expect(local.days).toBeLessThanOrEqual(4);
    // About 200–300 km along the West River, and about 250–350 km via Bao-Xie.
    const river = planRoute('guangxin', 'nanhai')!;
    expect(river.legs).toHaveLength(1);
    expect(river.legs[0].kind).toBe('water');
    expect(river.days).toBeGreaterThanOrEqual(4);
    expect(river.days).toBeLessThanOrEqual(7);
    const pass = planRoute('changan', 'nanzheng')!;
    expect(pass.days).toBeGreaterThanOrEqual(12);
    expect(pass.days).toBeLessThanOrEqual(18);
    expect(planRoute('wuwei', 'nanhai')!.days).toBeGreaterThan(local.days * 10);
    for (const city of WORLD_CITIES) {
      const route = planRoute('henan', city.id)!;
      expect(route).toEqual(planRoute('henan', city.id));
      expect(route.legs.every(leg => Number.isInteger(leg.days) && leg.days > 0)).toBe(true);
    }
  });
  it('returns consecutive graph legs for every pair and obeys shortest-path bounds', () => {
    for (const from of WORLD_CITIES) for (const to of WORLD_CITIES) {
      const route = planRoute(from.id, to.id)!;
      expect(route.path).toHaveLength(route.legs.length + 1);
      expect(route.days).toBe(planRoute(to.id, from.id)!.days);
      for (const [index, leg] of route.legs.entries()) {
        expect([leg.from, leg.to]).toEqual(route.path.slice(index, index + 2));
        expect(WORLD_ROADS.some(road => road.kind === leg.kind &&
          ((road.from === leg.from && road.to === leg.to) || (road.from === leg.to && road.to === leg.from)))).toBe(true);
      }
      // Any intermediate destination gives an upper bound on the optimal days.
      expect(route.days).toBeLessThanOrEqual(planRoute(from.id, 'henan')!.days + planRoute('henan', to.id)!.days);
    }
  });
});
