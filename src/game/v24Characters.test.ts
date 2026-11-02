import { WORLD_CITIES } from './world';
import { describe,it,expect } from 'vitest';
import { V24_CAREERS,V24_LIFE_BASELINES } from './v24Characters';
import { martialForPerson } from './martialCatalog';
import { createLifeState,repairLifeState } from './personLife';
describe('2.4 roster boundaries',()=>{
 it('uses real world cities in every encounter',()=>{for(const stages of Object.values(V24_CAREERS)) for(const stage of stages) expect(WORLD_CITIES.some(city=>city.id===stage.cityId)).toBe(true);});
 it('keeps child martial information read-only',()=>expect(martialForPerson('cao-chong')?.readOnly).toBe(true));
 it('allows surviving adults to remain available through the death variation',()=>{for(const p of V24_LIFE_BASELINES.filter(p=>p.id!=='cao-chong')) expect(V24_CAREERS[p.id][0].to!.year).toBeGreaterThanOrEqual(p.deathBaseYear+5);});
 it('silently extends old lives without redrawing',()=>{const date={year:200,month:1,day:1};const life=createLifeState(date,42);for(const p of V24_LIFE_BASELINES) delete life.people[p.id];life.handledIds=life.handledIds.filter(id=>id in life.people);const old=structuredClone(life.people);const result=repairLifeState(life,date)!;expect(result.repaired).toBe(false);expect(result.life.people).toMatchObject(old);expect(Object.keys(result.life.people).length).toBe(Object.keys(old).length+37);});
});
