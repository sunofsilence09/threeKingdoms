import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState } from './state';
import { createProgress } from './growth';
import { createLifeState } from './personLife';
import { canMeetPerson } from './recruitmentCatalog';
import { canInteractPerson, invitePerson, setDeployment } from './recruitment';
import { currentGovernorId, personPosting, postingLabel } from './personPosting';
import { canRequestTeaching, canStartDuel, requestTeaching, settleDuel, startDuel } from './martial';

const fixture = (year = 184): GameState => {
  const state = createInitialState(() => 0), date = { year, month: 3, day: 1 };
  return { ...state, date, life: createLifeState(date, 23), worldConflict: undefined, phase: 'overworld', currentCityId: 'zhuo' };
};

describe('life gates before owned-party and career shortcuts', () => {
  it('blocks owned children, unborn and dead people from interactions, recruitment, training and deployment', () => {
    for (const [id, year] of [['sun-quan', 184], ['sima-yan', 184], ['cao-cao', 250]] as const) {
      const state = fixture(year);
      state.party[id] = createProgress(); state.relationships[id] = { affinity: 100 };
      expect(canInteractPerson(state, id)).toBe(false);
      expect(canMeetPerson(id, state.currentCityId, state.date, state)).toBe(false);
      expect(canRequestTeaching(state, id)).toBe(false);
      expect(canStartDuel(state, id)).toBe(false);
      expect(setDeployment(state, ['traveler', id])).toBe(state);
      expect(invitePerson({ ...state, party: { traveler: state.party.traveler, aman: state.party.aman, 'chen-da': state.party['chen-da'] } }, id).party[id]).toBeUndefined();
      expect(postingLabel(state, id)).not.toContain('已同行');
    }
  });

  it('offers a late-surviving former official as free at the last recorded location', () => {
    const state = fixture(196); state.currentCityId = 'chenliu'; state.life!.people['zhang-miao'].deathYear = 200;
    expect(personPosting(state, 'zhang-miao')).toMatchObject({ cityId: 'chenliu', kind: 'free', office: '游历' });
    expect(canMeetPerson('zhang-miao', 'chenliu', state.date, state)).toBe(true);
    expect(personPosting({ ...state, life: undefined }, 'zhang-miao')).toBeUndefined();
    expect(canMeetPerson('zhang-miao', 'chenliu', state.date)).toBe(false);
    state.life!.people['zhang-miao'].deathYear = 195;
    expect(personPosting(state, 'zhang-miao')).toBeUndefined();
  });

  it('drops dead governors and employers while leaving living institutional employees', () => {
    const state = fixture(216); state.life!.people['cao-cao'].deathYear = 215;
    state.life!.people['xiahou-dun'].deathYear = 225;
    const posting = personPosting(state, 'xiahou-dun');
    expect(posting?.employerId).toBeUndefined();
    expect(posting?.kind).toBe('waiting');
    const world = createInitialState(() => 0).worldConflict!;
    state.worldConflict = { ...world, cities: { ...world.cities, xuxian: { ...world.cities.xuxian, factionId: 'cao', governorId: 'cao-cao' } } };
    expect(currentGovernorId(state, 'xuxian')).toBeUndefined();
  });

  it('labels current postings and army corridors using the city names of the current year', () => {
    const state = fixture(264);
    expect(postingLabel(state,'sun-hao')).toContain('当前行踪：建业');
    const world = createInitialState(() => 0).worldConflict!;
    state.worldConflict = { ...world, armies: [{ id:'army-1',factionId:'sun',commanderId:'sun-hao',sourceCityId:'moling',targetCityId:'echeng',
      troops:2000,contributions:[],phase:'marching',path:['moling','echeng'],legIndex:0,legDay:0,phaseDays:0 }] };
    expect(personPosting(state,'sun-hao')?.reason).toContain('建业 → 武昌');
  });
});

describe('teaching and duels at a death boundary', () => {
  const lastDay = () => {
    const state = fixture(218); state.date = { year: 218, month: 12, day: 30 };
    state.life!.people['guan-yu'].deathYear = 219;
    state.party['guan-yu'] = createProgress(); state.relationships['guan-yu'] = { affinity: 100 };
    return state;
  };
  it('pays one day but does not draw teaching RNG or learn from a teacher who dies during it', () => {
    const state = lastDay(), next = requestTeaching(state, 'guan-yu');
    expect(next.date).toEqual({ year: 219, month: 1, day: 1 });
    expect(next.martial).toEqual(state.martial);
    expect(next.travelNotice).toContain('离世');
  });
  it('pays one day but creates no duel and consumes no RNG after a teacher dies', () => {
    const state = lastDay(), next = startDuel(state, 'guan-yu');
    expect(next.date).toEqual({ year: 219, month: 1, day: 1 });
    expect(next.phase).toBe('overworld');
    expect(next.duel).toBeUndefined();
    expect(next.martial).toEqual(state.martial);
    expect(next.travelNotice).toContain('离世');
  });
  it('closes a stale duel with a dead teacher without a transmission or additional random draw', () => {
    const state = fixture(218); state.party['guan-yu'] = createProgress();
    const paid = startDuel(state, 'guan-yu');
    const stale = { ...paid, date: { year: 250, month: 1, day: 1 } };
    const settled = settleDuel(stale, true);
    expect(settled.phase).toBe('overworld');
    expect(settled.duel).toBeUndefined();
    expect(settled.martial.learned).toEqual([]);
    expect(settled.martial.seed).toBe(paid.martial.seed);
  });
});
