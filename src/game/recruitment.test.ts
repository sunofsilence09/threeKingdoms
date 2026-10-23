import { describe, expect, it } from 'vitest';
import { createInitialState, loadState, saveState } from './state';
import { advanceDays } from './history';
import { canManageParty, interactPerson, invitePerson, setDeployment } from './recruitment';
import { createProgress, migratePartyProgress } from './growth';

const inZhuo = () => ({ ...createInitialState(() => 0), phase: 'overworld' as const, currentCityId: 'zhuo' });
describe('affinity recruitment and five-person deployment', () => {
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
