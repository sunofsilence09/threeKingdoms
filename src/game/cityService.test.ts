import { describe, expect, it } from 'vitest';
import { CITY_CAREERS } from './careerData';
import { cityServices, getRecruitmentThreshold, serviceForPerson, serviceLabel } from './cityService';
import { createProgress } from './growth';
import { invitePerson } from './recruitment';
import { canMeetPerson } from './recruitmentCatalog';
import { createInitialState, type GameState } from './state';
import { WORLD_CITIES } from './world';
import { GARRISON_COMMANDERS } from './garrisonData';

const at = (year: number, cityId = 'dongjun', month = 6): GameState => ({
  ...createInitialState(() => 0), life: undefined, worldConflict: undefined, phase: 'overworld', currentCityId: cityId, date: { year, month, day: 1 },
});

describe('derived city appointments', () => {
  it('assigns each new person at most one appointment and the same city as the encounter for every month', () => {
    expect(Object.keys(CITY_CAREERS)).toHaveLength(44);
    for (let year = 184; year <= 226; year++) for (let month = 1; month <= 12; month++) {
      const state = at(year, 'dongjun', month);
      const roster = cityServices(state);
      expect(new Set(roster.map(person => person.personId)).size).toBe(roster.length);
      for (const id of Object.keys(CITY_CAREERS)) {
        const cities = WORLD_CITIES.filter(city => canMeetPerson(id, city.id, state.date)).map(city => city.id);
        const service = serviceForPerson(state, id);
        expect(cities).toEqual(service ? [service.cityId] : []);
        expect(roster.filter(person => person.personId === id)).toEqual(service ? [service] : []);
      }
    }
  });

  it('keeps every city garrison employed by its institution unless its explicit commander joins', () => {
    for (const city of WORLD_CITIES) {
      const guards = cityServices(at(184), city.id).filter(service => service.personId.startsWith('garrison:'));
      expect(guards).toHaveLength(2);
      expect(guards.every(service => service.kind === 'employed')).toBe(true);
      for (const guard of guards) {
        expect(getRecruitmentThreshold(at(184), guard.personId)).toBe(80);
        expect(serviceLabel(guard)).toContain('本城守备');
        expect(serviceLabel(guard)).not.toContain('undefined');
      }
    }
    const state = at(190, 'chenliu');
    expect(serviceForPerson(state, 'garrison:chenliu:captain')).toMatchObject({ employerId: 'zhang-miao' });
    const owned = { ...state, party: { ...state.party, 'zhang-miao': createProgress() } };
    for (const role of ['soldier', 'captain']) {
      expect(serviceForPerson(owned, `garrison:chenliu:${role}`)).toMatchObject({ kind: role === 'captain' ? 'waiting' : 'employed', cityId: 'chenliu' });
      expect(getRecruitmentThreshold(owned, `garrison:chenliu:${role}`)).toBe(role === 'captain' ? 60 : 80);
    }
    expect(invitePerson({ ...owned, relationships: { 'garrison:chenliu:captain': { affinity: 60 } } }, 'garrison:chenliu:captain').party['garrison:chenliu:captain']).toBeDefined();
    expect(serviceForPerson(at(188, 'ji'), 'garrison:ji:captain')).toMatchObject({ employerId: 'liu-yu' });
    expect(serviceForPerson(at(193, 'ji'), 'garrison:ji:captain')).toMatchObject({ employerId: 'gongsun-zan' });
    for (const [year, city] of [[184, 'julu'], [192, 'changan'], [188, 'zhuo']] as const) {
      expect(serviceForPerson(at(year, city), `garrison:${city}:captain`)?.employerId).toBeUndefined();
      expect(getRecruitmentThreshold(at(year, city), `garrison:${city}:captain`)).toBe(80);
    }
  });

  it('keeps late Cao Xiu institution employed and honors Yuan Shao August cutoff', () => {
    const service = serviceForPerson(at(220, 'shouchun'), 'cao-xiu');
    expect(service).toMatchObject({ kind: 'employed', office: '曹魏军府' });
    expect(service?.employerId).toBeUndefined();
    expect(serviceLabel(service!)).not.toContain('undefined');
    expect(getRecruitmentThreshold(at(220), 'cao-xiu')).toBe(80);
    expect(serviceForPerson(at(189, 'henan', 8), 'yuan-shao')).toBeDefined();
    expect(serviceForPerson(at(189, 'henan', 9), 'yuan-shao')).toBeUndefined();
    expect(serviceForPerson(at(184, 'zhuo'), 'gongsun-zan')).toMatchObject({ kind: 'employed' });
    expect(serviceForPerson(at(205, 'ye'), 'zhang-yan')).toMatchObject({ kind: 'employed', employerId: 'cao-cao' });
    expect(serviceForPerson({ ...at(220), party: { ...at(220).party, 'cao-cao': createProgress() } }, 'cao-xiu')?.kind).toBe('employed');
  });

  it('uses only the nine explicit non-overlapping commander stages', () => {
    expect(GARRISON_COMMANDERS.map(binding => [binding.cityId, binding.from.year, binding.to.year, binding.employerId])).toEqual([
      ['chenliu', 190, 194, 'zhang-miao'], ['nanyang', 190, 192, 'yuan-shu'], ['shouchun', 193, 198, 'yuan-shu'],
      ['xiangyang', 190, 207, 'liu-biao'], ['shujun', 194, 213, 'liu-zhang'], ['nanzheng', 194, 214, 'zhang-lu'],
      ['ye', 191, 201, 'yuan-shao'], ['ji', 188, 192, 'liu-yu'], ['ji', 193, 194, 'gongsun-zan'],
    ]);
    for (let year = 184; year <= 227; year++) for (const city of WORLD_CITIES) {
      const bindings = GARRISON_COMMANDERS.filter(binding => binding.cityId === city.id && year >= binding.from.year && year <= binding.to.year);
      expect(bindings.length).toBeLessThanOrEqual(1);
      expect(serviceForPerson(at(year), `garrison:${city.id}:captain`)?.employerId).toBe(bindings[0]?.employerId);
    }
    const state = at(193, 'ji');
    const formerOwned = { ...state, party: { ...state.party, 'liu-yu': createProgress() } };
    expect(serviceForPerson(formerOwned, 'garrison:ji:captain')).toMatchObject({ kind: 'employed', employerId: 'gongsun-zan' });
  });

  it('recruits a captain once without changing other cities or removing the city troops', () => {
    const state = { ...at(190, 'chenliu'), relationships: { 'garrison:chenliu:captain': { affinity: 80 } } };
    const recruited = invitePerson(state, 'garrison:chenliu:captain');
    expect(serviceForPerson(recruited, 'garrison:chenliu:captain')).toBeUndefined();
    expect(serviceForPerson({ ...recruited, date: { year: 200, month: 1 } }, 'garrison:chenliu:captain')).toBeUndefined();
    expect(serviceForPerson(recruited, 'garrison:chenliu:soldier')).toBeDefined();
    expect(serviceForPerson(recruited, 'garrison:ye:captain')).toEqual(serviceForPerson(state, 'garrison:ye:captain'));
    expect(invitePerson(recruited, 'garrison:chenliu:captain')).toBe(recruited);
  });

  it('switches Chen Gong employer and city at the exact year boundaries', () => {
    expect(serviceForPerson(at(193, 'dongjun', 12), 'chen-gong')).toMatchObject({ cityId: 'dongjun', kind: 'employed', employerId: 'cao-cao', employerName: '曹操' });
    expect(serviceForPerson(at(194, 'dongjun', 1), 'chen-gong')).toMatchObject({ cityId: 'dongjun', kind: 'employed', employerId: 'lu-bu', employerName: '吕布' });
    expect(serviceForPerson(at(196, 'xiapi', 1), 'chen-gong')).toMatchObject({ cityId: 'xiapi', employerId: 'lu-bu' });
    expect(cityServices(at(196), 'xiapi').map(person => person.personId)).toEqual(['chen-gong', 'gao-shun', 'garrison:xiapi:soldier', 'garrison:xiapi:captain']);
    expect(cityServices(at(196), 'dongjun').map(person => person.personId)).toEqual(['garrison:dongjun:soldier', 'garrison:dongjun:captain']);
  });

  it('uses ordinary 60 for free people, governing people and all old identities without self-employment', () => {
    expect(serviceForPerson(at(189), 'yuan-shu')).toMatchObject({ kind: 'free', cityId: 'henan' });
    for (const [id, year, city] of [['yuan-shu', 190, 'nanyang'], ['zhang-miao', 190, 'chenliu']] as const) {
      const state = at(year, city);
      expect(serviceForPerson(state, id)).toMatchObject({ kind: 'governing' });
      expect(serviceForPerson(state, id)?.employerId).toBeUndefined();
      expect(getRecruitmentThreshold(state, id)).toBe(60);
      expect(invitePerson({ ...state, relationships: { [id]: { affinity: 60 } } }, id).party[id]).toBeDefined();
    }
    expect(getRecruitmentThreshold(at(189), 'yuan-shu')).toBe(60);
    expect(getRecruitmentThreshold(at(200), 'cao-cao')).toBe(60);
    expect(serviceForPerson(at(200), 'cao-cao')).toBeUndefined();
  });

  it('turns dependents waiting at the same city with no stale employer when their employer is owned', () => {
    const state = at(196, 'xiapi');
    const waiting = { ...state, party: { ...state.party, 'lu-bu': createProgress() }, relationships: { 'chen-gong': { affinity: 60 } } };
    expect(serviceForPerson(waiting, 'chen-gong')).toMatchObject({ kind: 'waiting', cityId: 'xiapi', title: '谋佐' });
    expect(serviceForPerson(waiting, 'chen-gong')?.employerId).toBeUndefined();
    expect(serviceForPerson(waiting, 'chen-gong')?.employerName).toBeUndefined();
    expect(serviceForPerson(waiting, 'chen-gong')?.office).not.toContain('吕布');
    expect(serviceLabel(serviceForPerson(waiting, 'chen-gong')!)).toContain('待聘');
    expect(getRecruitmentThreshold(waiting, 'chen-gong')).toBe(60);
    expect(invitePerson(waiting, 'chen-gong').party['chen-gong']).toBeDefined();
    expect(getRecruitmentThreshold(state, 'chen-gong')).toBe(80);
  });

  it('removes a recruited person immediately and never reassigns them in future career stages', () => {
    const state = at(192);
    const recruited = invitePerson({ ...state, relationships: { 'chen-gong': { affinity: 80 } } }, 'chen-gong');
    expect(serviceForPerson(recruited, 'chen-gong')).toBeUndefined();
    expect(cityServices(recruited).some(person => person.personId === 'chen-gong')).toBe(false);
    expect(serviceForPerson({ ...recruited, date: { year: 196, month: 1 } }, 'chen-gong')).toBeUndefined();
  });

  it('provides role, office and named employer labels and rejects invalid dates or unknown identities', () => {
    const employed = serviceForPerson(at(192), 'chen-gong')!;
    expect(serviceLabel(employed)).toContain('谋佐');
    expect(serviceLabel(employed)).toContain('曹操军府');
    expect(serviceLabel(employed)).toContain('曹操');
    expect(serviceLabel(serviceForPerson(at(190), 'yuan-shu')!)).toContain('主事');
    expect(serviceLabel(serviceForPerson(at(189), 'yuan-shu')!)).toContain('游历');
    for (const id of ['unknown', 'toString', '__proto__']) {
      expect(serviceForPerson(at(192), id)).toBeUndefined();
      expect(getRecruitmentThreshold(at(192), id)).toBe(60);
    }
    for (const month of [0, 13, NaN]) expect(cityServices(at(192, 'dongjun', month))).toEqual([]);
  });

  it('uses the current stage employer when a former employer has already joined', () => {
    const state = at(199, 'wujun');
    const employerOwned = { ...state, party: { ...state.party, 'sun-ce': createProgress() } };
    expect(serviceForPerson(employerOwned, 'zhou-tai')?.kind).toBe('waiting');
    const nextYear = { ...employerOwned, date: { year: 200, month: 1, day: 1 } };
    expect(serviceForPerson(nextYear, 'zhou-tai')).toMatchObject({ kind: 'employed', employerId: 'sun-quan', cityId: 'danyang' });
    expect(getRecruitmentThreshold(nextYear, 'zhou-tai')).toBe(80);
    expect(serviceForPerson(nextYear, 'han-dang')).toMatchObject({ kind: 'employed', employerId: 'sun-quan', cityId: 'wujun' });
  });
});
