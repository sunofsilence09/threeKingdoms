import { describe, expect, it } from 'vitest';
import fixture from './fixtures/v08-world.json';
import * as world from './world';
import { createEconomy, GOODS, marketQuote, migrateEconomy } from './economy';
import { isJourney, journeyLeg, remainingDays, type Journey } from './travel';

const added = ['moling','chaisang','echeng','hefei','shu','nanpi','pingyuan','xiangping','zhending','lu','anyi','hongnong','suiyang','pei','jixian','linjing','xiabian','shangyong','zitong','fuxian','yufu','dianchi','linyuan','yiling'];
const date = (year: number) => ({ year, month: 1, day: 1 });
describe('generation city expansion', () => {
  it('adds the approved 24 distinct reachable cities while retaining every legacy city', () => {
    expect(world.WORLD_CITIES).toHaveLength(60);
    expect(world.LEGACY_CITY_IDS).toEqual(fixture.cities.map(city => city.id));
    expect(world.EXPANSION_CITY_IDS).toEqual(added);
    for (const city of fixture.cities) expect(world.cityAt(city.id)).toEqual(city);
    for (const id of added) expect(world.planRoute('henan', id)?.path.at(-1)).toBe(id);
    expect(world.cityAt('xiangping').lon).toBe(123.18);
    expect(world.cityAt('pingyuan').provinceId).toBe('qing');
    expect(world.cityAt('pei').provinceId).toBe('yu');
  });
  it('keeps all 47 old road geometries and their direct day costs', () => {
    expect(typeof world.directRoadLeg).toBe('function');
    expect(fixture.roads).toHaveLength(47);
    const rad = Math.PI / 180;
    for (const road of fixture.roads) {
      expect(world.WORLD_ROADS.find(candidate => candidate.from === road.from && candidate.to === road.to)).toEqual(road);
      const start = fixture.cities.find(c => c.id === road.from)!, end = fixture.cities.find(c => c.id === road.to)!;
      const points = [[start.lon,start.lat],...('via' in road ? road.via : [])!,[end.lon,end.lat]];
      const km = points.slice(1).reduce((sum,b,i) => { const a=points[i]; return sum + 12742*Math.asin(Math.sqrt(Math.min(1,Math.sin((b[1]-a[1])*rad/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin((b[0]-a[0])*rad/2)**2))); },0);
      const days = Math.max(1,Math.ceil(km / ({road:30,water:50,mountain:20}[road.kind as world.WorldRoad['kind']])));
      expect(world.directRoadLeg(road.from,road.to)).toEqual({from:road.from,to:road.to,kind:road.kind,days});
      expect(world.directRoadLeg(road.to,road.from)?.days).toBe(days);
    }
    expect(world.directRoadLeg('henan','nanhai')).toBeUndefined();
    expect(world.directRoadLeg('missing','henan')).toBeUndefined();
  });
  it('resolves era names and aliases to the same stable city', () => {
    expect(typeof world.cityNameAt).toBe('function');
    expect([180,211,212,279,280,281,282].map(year => world.cityNameAt('moling',date(year)))).toEqual(['秣陵','秣陵','建业','建业','秣陵','秣陵','建邺']);
    expect(world.cityNameAt('echeng',date(220))).toBe('鄂');
    expect(world.cityNameAt('echeng',date(221))).toBe('武昌');
    expect([221,222,280].map(year => world.cityNameAt('yufu',date(year)))).toEqual(['鱼复','永安','鱼复']);
    for (const query of ['建邺','南京','建业','秣陵']) expect(world.WORLD_CITIES.filter(city => world.cityMatches(city.id,query,date(184))).map(city => city.id)).toEqual(['moling']);
    expect(world.cityMatches('jixian','天水')).toBe(true);
    expect(world.cityMatches('zhending','常山')).toBe(true);
    expect(world.cityMatches('yiling','西陵')).toBe(true);
    expect(world.cityMatches('shu',' 庐江 ')).toBe(true);
    expect(world.cityMatches('ji','天水')).toBe(false);
  });
  it('reads saved direct journeys even when new roads offer a shorter route', () => {
    const old: Journey = {path:['nanzheng','shujun'],legIndex:0,legDay:1,elapsed:1,seed:42,serial:1};
    // The old mountain leg survives alongside the faster segmented Shu corridor.
    const direct = world.directRoadLeg('nanzheng','shujun')!;
    expect(world.planRoute('nanzheng','shujun')!.days).toBeLessThan(direct.days);
    expect(isJourney(old,'nanzheng','overworld')).toBe(true);
    expect(journeyLeg(old)).toEqual(direct);
    expect(remainingDays(old)).toBe(direct.days-1);
  });
  it('provides ten-good markets and local supply profiles for every new city', () => {
    const economy = createEconomy();
    for (const id of added) {
      expect(Object.keys(economy.markets[id].stock)).toHaveLength(10);
      expect(GOODS.some(good => marketQuote(economy,id,date(184),good.id).specialty)).toBe(true);
    }
    const legacy = {...economy,markets:Object.fromEntries(fixture.cities.map(city => [city.id,economy.markets[city.id]]))};
    legacy.markets.henan.stock.grain=7;
    const migrated=migrateEconomy(legacy)!;
    expect(Object.keys(migrated.markets)).toHaveLength(60);
    expect(migrated.markets.henan.stock.grain).toBe(7);
    expect(migrateEconomy(migrated)).toBe(migrated);
  });
});
