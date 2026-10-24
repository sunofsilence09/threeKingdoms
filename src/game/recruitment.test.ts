import { describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState } from './state';
import { advanceDays } from './history';
import { canManageParty, canInteractPerson, interactPerson, invitePerson, setDeployment } from './recruitment';
import { createProgress, migratePartyProgress } from './growth';

const inZhuo = () => ({ ...createInitialState(() => 0), worldConflict: undefined, phase: 'overworld' as const, currentCityId: 'zhuo' });
describe('affinity recruitment and five-person deployment', () => {
  it('refuses ordinary troops and Himiko even with forged party membership and full affinity', () => {
    for (const id of ['himiko', 'garrison:zhuo:soldier']) {
      const unowned = { ...inZhuo(), relationships: { [id]: { affinity: 100 } } };
      expect(canInteractPerson(unowned, id)).toBe(false);
      expect(interactPerson(unowned, id, 'talk')).toBe(unowned);
      expect(invitePerson(unowned, id)).toBe(unowned);
      const state = { ...inZhuo(), party: { ...inZhuo().party, [id]: createProgress() }, relationships: { [id]: { affinity: 100 } } };
      expect(canInteractPerson(state, id)).toBe(false);
      expect(interactPerson(state, id, 'talk')).toBe(state);
      expect(invitePerson(state, id)).toBe(state);
      expect(setDeployment(state, ['traveler', id])).toBe(state);
    }
  });
  it.each(['garrison:zhuo:captain', 'xiahou-dun', 'xiahou-yuan', 'cao-ren', 'cao-xiu'])('requires employed affinity 80 for %s', id => {
    const state = { ...inZhuo(), currentCityId: id.startsWith('garrison:') ? 'zhuo' : id === 'cao-xiu' ? 'xuxian' : 'chenliu', date: { year: id === 'cao-xiu' ? 200 : 190, month: 6, day: 1 } };
    for (const affinity of [60, 79]) {
      const ready = { ...state, relationships: { [id]: { affinity } } };
      expect(invitePerson(ready, id)).toBe(ready);
    }
    expect(invitePerson({ ...state, relationships: { [id]: { affinity: 80 } } }, id).party[id]).toEqual(createProgress());
  });
  it('requires meeting the right person in the right time and place', () => {
    const state = inZhuo();
    expect(interactPerson({ ...state, currentCityId: 'nanhai' }, 'guan-yu', 'talk').relationships['guan-yu']).toBeUndefined();
    expect(interactPerson(state, 'unknown', 'talk')).toBe(state);
    expect(invitePerson(state, 'guan-yu')).toBe(state);
    const future = interactPerson(state, 'sun-quan', 'talk');
    expect(future).toBe(state);
  });
  it('raises affinity at a visible time cost, enforces daily cooldown and preserves a free option', () => {
    const state = { ...inZhuo(), supplies: 0 };
    expect(interactPerson(state, 'guan-yu', 'meal')).toBe(state);
    const talked = interactPerson(state, 'guan-yu', 'talk');
    expect(talked.relationships['guan-yu'].affinity).toBe(8);
    expect(talked.date).toEqual({ year: 184, month: 3, day: 2 });
    expect(interactPerson(talked, 'guan-yu', 'help')).toBe(talked);
    const next = interactPerson({ ...talked, date: advanceDays(talked.date, 1) }, 'guan-yu', 'help');
    expect(next.relationships['guan-yu'].affinity).toBe(18);
  });
  it('recruits at 60 into reserves once without changing allegiance or resetting growth', () => {
    const state = inZhuo();
    const close = { ...state, relationships: { ...state.relationships, 'guan-yu': { affinity: 60 } } };
    const recruited = invitePerson(close, 'guan-yu');
    expect(recruited.party['guan-yu']).toEqual(createProgress());
    expect(recruited.deployed).toEqual(state.deployed);
    expect(recruited.route).toBeNull();
    expect(invitePerson(recruited, 'guan-yu')).toBe(recruited);
    expect(recruited.supplies).toBe(close.supplies);
  });
  it('requires 80 for employed people and refuses direct invitation at 60 and 79', () => {
    const state = { ...inZhuo(), currentCityId: 'dongjun', date: { year: 192, month: 6, day: 1 } };
    for (const affinity of [60, 79]) {
      const close = { ...state, relationships: { 'chen-gong': { affinity } } };
      expect(invitePerson(close, 'chen-gong')).toBe(close);
    }
    const close = { ...state, relationships: { 'chen-gong': { affinity: 80 } } };
    const hired = invitePerson(close, 'chen-gong');
    expect(hired.party['chen-gong']).toEqual(createProgress());
    expect(hired.deployed).toEqual(state.deployed);
    expect(hired.relationships['chen-gong'].affinity).toBe(80);
  });
  it.each([
    ['gao-shun', 'xiapi', 196], ['zhou-tai', 'wujun', 196], ['han-dang', 'nanyang', 184],
  ] as const)('requires 80 for %s and rejects invitations in the wrong city or outside their dated window', (id, city, year) => {
    const state = { ...inZhuo(), currentCityId: city, date: { year, month: 6, day: 1 } };
    for (const affinity of [60, 79]) {
      const close = { ...state, relationships: { [id]: { affinity } } };
      expect(invitePerson(close, id)).toBe(close);
    }
    const ready = { ...state, relationships: { [id]: { affinity: 80 } } };
    expect(invitePerson(ready, id).party[id]).toEqual(createProgress());
    const wrongCity = { ...ready, currentCityId: 'nanhai' };
    expect(invitePerson(wrongCity, id)).toBe(wrongCity);
    const outsideWindow = { ...ready, date: { year: 226, month: 1, day: 1 } };
    expect(invitePerson(outsideWindow, id)).toBe(outsideWindow);
  });
  it('allows all known categories including leaders and officials instead of a four-character allowlist', () => {
    for (const [id, city, date] of [
      ['cao-cao', 'yingchuan', {year:184,month:5,day:1}],
      ['wang-yun', 'yingchuan', {year:184,month:3,day:1}],
      ['bandit-leader', 'yingchuan', {year:184,month:3,day:1}],
    ] as const) {
      const state = { ...inZhuo(), currentCityId: city, date, relationships: { [id]: { affinity: 60 } } };
      expect(invitePerson(state, id).party[id]).toBeDefined();
    }
  });
  it('supports five deployed members, benching original companions and keeping their progress', () => {
    const state = inZhuo();
    const members = { ...state, party: { ...state.party, 'guan-yu': createProgress(), 'zhang-fei': createProgress(), 'zhao-yun': createProgress() } };
    const five = setDeployment(members, ['traveler', 'aman', 'chen-da', 'guan-yu', 'zhang-fei']);
    expect(five.deployed).toHaveLength(5);
    expect(setDeployment(five, [...five.deployed, 'zhao-yun'])).toBe(five);
    expect(setDeployment(five, ['aman'])).toBe(five);
    expect(setDeployment(five, ['traveler', 'traveler'])).toBe(five);
    expect(setDeployment(five, ['traveler', 'unknown'])).toBe(five);
    const changed = setDeployment(five, ['traveler', 'guan-yu', 'zhang-fei', 'zhao-yun']);
    expect(changed.deployed).not.toContain('aman');
    expect(changed.party.aman).toBe(state.party.aman);
    expect(setDeployment(changed, ['traveler']).deployed).toEqual(['traveler']);
  });
  it('locks roster and affinity actions in battles and pending travel events', () => {
    const state = inZhuo();
    const fighting = { ...state, phase: 'battle' as const };
    expect(canManageParty(fighting)).toBe(false);
    expect(setDeployment(fighting, ['traveler'])).toBe(fighting);
    expect(interactPerson(fighting, 'guan-yu', 'talk')).toBe(fighting);
    expect(migratePartyProgress({ ...state.party, 'guan-yu': createProgress() })?.['guan-yu']).toBeDefined();
  });
});
