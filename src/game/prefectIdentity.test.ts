import {describe,expect,it} from 'vitest';
import * as identity from './prefectIdentity';
describe('stable original civic identities',()=>{
  it('creates deterministic identities with fixed births, explicit fiction and gender-matching portraits',()=>{
    const id=identity.createPrefectId('moling','sun',221,7);
    expect(id).toBe('prefect-moling-sun-221-7');
    const person=identity.prefectIdentity(id)!;
    expect(identity.prefectIdentity(id)).toEqual(person);
    expect(person.cityId).toBe('moling');expect(person.factionId).toBe('sun');
    expect(221-person.birthYear).toBeGreaterThanOrEqual(28);expect(221-person.birthYear).toBeLessThanOrEqual(45);
    expect(person.deathBaseYear-person.birthYear).toBe(70);
    expect(person.baseline.historicalBirthYear).toBeNull();expect(person.baseline.historicalDeathYear).toBeNull();
    expect(person.baseline.basis).toContain('游戏人物');expect(person.name).toMatch(/^[\u4e00-\u9fff]{3}$/);
    expect(person.portrait).toMatch(/^\/assets\/characters\/local-prefect-[1-8]-v1\.png$/);
    expect(person.gender).toBe(person.portrait.includes('-7-')||person.portrait.includes('-8-')?'female':'male');
  });
  it('rejects invented city/faction/date/serial, extra suffixes, coercion and noncanonical IDs',()=>{
    for(const id of ['prefect-missing-han-184-1','prefect-moling-unknown-221-1','prefect-moling-han-183-1','prefect-moling-han-311-1',
      'prefect-moling-han-184-0','prefect-moling-han-184-01','prefect-moling-han-184-1000001','prefect-moling-han-184-1-extra','__proto__','cao-cao','prefect-moling-han-184-NaN'])expect(identity.prefectIdentity(id),id).toBeUndefined();
    expect(()=>identity.createPrefectId('moling','han',184,0)).toThrow();
  });
  it('supports hyphenated factions, unique serials and many independently derived faces',()=>{
    const people=Array.from({length:128},(_,n)=>identity.prefectIdentity(identity.createPrefectId('nanpi','yuan-shao',200,n+1))!);
    expect(new Set(people.map(p=>p.id)).size).toBe(128);expect(new Set(people.map(p=>p.portrait)).size).toBe(8);
    expect(people.every(p=>p.factionId==='yuan-shao')).toBe(true);expect(people.some(p=>p.gender==='female')).toBe(true);
  });
});
