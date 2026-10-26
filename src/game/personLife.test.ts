import { describe, expect, it, vi } from 'vitest';
import { createLifeState, isLifeState, lifeBaseline, lifeLabel, lifeStatus, isAliveAt, reconcileLives, repairLifeState } from './personLife';
import { PERSON_LIFE_BASELINES } from './personLifeData';
import { createInitialState } from './state';
import { createProgress } from './growth';

const date = (year: number) => ({ year, month: 1, day: 1 });

describe('persistent person lifespans', () => {
  it('covers exactly the 105 historical/story people and preserves uncertain historical dates', () => {
    expect(PERSON_LIFE_BASELINES).toHaveLength(105);
    expect(new Set(PERSON_LIFE_BASELINES.map(p => p.id)).size).toBe(105);
    expect(lifeBaseline('han-dang')?.deathBaseYear).toBe(226);
    expect(lifeBaseline('sun-jian')?.deathBaseYear).toBe(191);
    expect(lifeBaseline('lu-bu')?.deathBaseYear).toBe(199);
    expect(lifeBaseline('qin-jie')?.deathBaseYear).toBe(186);
    expect(lifeBaseline('zhou-tai')).toMatchObject({ historicalDeathYear: null, deathBaseYear: 225, deathEstimated: true });
    expect(lifeBaseline('diao-chan')).toMatchObject({ historicalBirthYear: null, historicalDeathYear: null, birthEstimated: true, deathEstimated: true });
    expect(lifeBaseline('zhang-xingcai')).toMatchObject({ historicalDeathYear: null, deathEstimated: true });
    expect(lifeBaseline('liu-chen')).toMatchObject({ birthYear: 234, historicalBirthYear: null, birthEstimated: true });
    expect(lifeBaseline('himiko')).toMatchObject({ historicalDeathYear: null, deathBaseYear: 247 });
  });

  it('fixes births and draws all eleven inclusive death offsets once in an independent stream', () => {
    const offsets = new Set<number>();
    for (let seed = 0; seed < 300; seed++) {
      const life = createLifeState(date(184), seed);
      expect(isLifeState(life, date(184))).toBe(true);
      for (const p of PERSON_LIFE_BASELINES) {
        expect(life.people[p.id].birthYear).toBe(p.birthYear);
        const offset = life.people[p.id].deathYear - p.deathBaseYear;
        expect(offset).toBeGreaterThanOrEqual(-5);
        expect(offset).toBeLessThanOrEqual(5);
        offsets.add(offset);
      }
    }
    expect([...offsets].sort((a,b) => a-b)).toEqual([-5,-4,-3,-2,-1,0,1,2,3,4,5]);
    const life = createLifeState(date(184), 123);
    expect(createLifeState(date(184), 123)).toEqual(life);
    expect(JSON.parse(JSON.stringify(life))).toEqual(life);
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('read consumed random'); });
    expect(lifeStatus(life, 'cao-cao', date(190))).toBe('alive');
    expect(lifeLabel(life, 'cao-cao', date(190))).toContain('35岁');
    expect(lifeLabel(life, 'diao-chan', date(190))).toContain('故事');
    expect(lifeLabel(life, 'zhou-tai', date(200))).toContain('区间');
    random.mockRestore();
  });

  it('uses annual birth/adult/death boundaries and exempts original/generic characters', () => {
    const life = createLifeState(date(184), 12);
    expect(lifeStatus(life, 'cao-pi', date(186))).toBe('unborn');
    expect(lifeStatus(life, 'cao-pi', date(187))).toBe('child');
    expect(lifeStatus(life, 'cao-pi', date(202))).toBe('child');
    expect(lifeStatus(life, 'cao-pi', date(203))).toBe('alive');
    expect(isAliveAt(life, 'cao-pi', date(202))).toBe(true);
    expect(isAliveAt(life, 'cao-pi', date(202), true)).toBe(false);
    const death = life.people['cao-cao'].deathYear;
    expect(lifeStatus(life, 'cao-cao', { year: death-1, month: 12, day: 30 })).toBe('alive');
    expect(lifeStatus(life, 'cao-cao', date(death))).toBe('dead');
    for (const id of ['traveler', 'aman', 'chen-da', 'bandit', 'garrison:henan:captain']) {
      expect(lifeStatus(life, id, date(310))).toBe('untracked');
      expect(isAliveAt(life, id, date(310), true)).toBe(true);
    }
    expect(lifeStatus(undefined, 'sima-yan', date(184))).toBe('unborn');
    expect(lifeLabel(life, 'cao-pi', date(186))).not.toMatch(/-\d+岁/);
  });

  it('rejects malformed saved lives, impossible dates, forged memorials and duplicate notices', () => {
    const life = createLifeState(date(184), 9);
    expect(isLifeState({ ...life, seed: -1 })).toBe(false);
    expect(isLifeState({ ...life, lastDay: 999999 }, date(184))).toBe(false);
    expect(isLifeState({ ...life, people: { ...life.people, 'cao-cao': { birthYear: 154, deathYear: 220 } } })).toBe(false);
    expect(isLifeState({ ...life, people: { ...life.people, 'cao-cao': { birthYear: 155, deathYear: 226 } } })).toBe(false);
    expect(isLifeState({ ...life, handledIds: ['cao-cao'] }, date(184))).toBe(false);
    expect(isLifeState({ ...life, memorials: { traveler: {} } })).toBe(false);
    expect(isLifeState({ ...life, notices: [{ id: 'cao-cao', deathYear: 220, migrated: false }, { id: 'cao-cao', deathYear: 220, migrated: false }] })).toBe(false);
  });

  it('repairs only missing/corrupt entries using the saved life seed and preserves valid custom draws', () => {
    const saved = createLifeState(date(250), 43);
    saved.people['cao-cao'].deathYear = saved.people['cao-cao'].deathYear === 215 ? 225 : 215;
    const damaged = JSON.parse(JSON.stringify(saved));
    delete damaged.people['sima-yan'];
    damaged.people['lu-bu'].birthYear = 0;
    damaged.people['diao-chan'].deathYear = 999;
    damaged.people.traveler = { birthYear: 155, deathYear: 220 };
    const recovered = repairLifeState(damaged, date(250));
    expect(recovered?.repaired).toBe(true);
    expect(recovered?.life.seed).toBe(43);
    expect(recovered?.life.people['cao-cao']).toEqual(saved.people['cao-cao']);
    expect(recovered?.life.people['sima-yan']).toEqual(saved.people['sima-yan']);
    expect(recovered?.life.people['lu-bu']).toEqual(saved.people['lu-bu']);
    expect(recovered?.life.people['diao-chan']).toEqual(saved.people['diao-chan']);
    expect(recovered?.life.people.traveler).toBeUndefined();
    expect(isLifeState(recovered?.life, date(250))).toBe(true);
    expect(repairLifeState(saved, date(250))).toEqual({ life: saved, repaired: false });
    const badSeed=repairLifeState({ ...saved, seed: -1 }, date(250));
    expect(badSeed?.repaired).toBe(true);
    expect(badSeed?.life.people).toEqual(saved.people);
    expect(isLifeState(badSeed?.life,date(250))).toBe(true);
    expect(repairLifeState({ ...saved, version: 99 }, date(250))).toBeUndefined();
    expect(repairLifeState({ ...saved, catalogVersion: 99 }, date(250))).toBeUndefined();
  });

  it('repairs lifecycle bookkeeping while retaining valid memorial progress and dismissals', () => {
    const state = createInitialState(() => 0);
    const old = { ...state, date: date(250), life: undefined, party: { ...state.party, 'cao-cao': createProgress(3) },
      relationships: { ...state.relationships, 'cao-cao': { affinity: 87 } } };
    const archived = reconcileLives(old, old.date);
    const life = archived.life!;
    const damaged = { ...life, people: { ...life.people, 'sima-yan': null }, handledIds: ['traveler'],
      notices: [{ id: 'traveler', deathYear: 200, migrated: false }], lastDay: 999999 };
    const recovered = repairLifeState(damaged, old.date);
    expect(recovered?.life.memorials['cao-cao']).toEqual(life.memorials['cao-cao']);
    expect(recovered?.life.notices).toEqual([]);
    expect(recovered?.life.handledIds).toContain('cao-cao');
    expect(isLifeState(recovered?.life, old.date)).toBe(true);
    expect(reconcileLives({ ...archived, life: recovered!.life }, old.date).life?.notices).toEqual([]);
  });

  it('recovers a broken seed and damaged draw without losing legal lives or memorial cultivation', () => {
    const state=createInitialState(()=>0), now=date(248), life=createLifeState(now,43);
    life.people['cao-huan'].deathYear=307;
    const archived=reconcileLives({ ...state,date:now,life,party:{...state.party,'zhou-yu':createProgress(5,13)},
      relationships:{...state.relationships,'zhou-yu':{affinity:97,lastInteraction:5000}} },now);
    const before=structuredClone(archived.life!);
    const damaged=JSON.parse(JSON.stringify(before));
    damaged.seed='broken'; damaged.people['zhou-yu'].deathYear='broken'; damaged.people['cai-yan'].birthYear=999;
    const recovered=repairLifeState(damaged,now)!;
    expect(recovered).toBeDefined();
    expect(recovered.repaired).toBe(true);
    expect(recovered.life.people['cao-huan'].deathYear).toBe(307);
    expect(recovered.life.people['zhou-yu']).toEqual(before.people['zhou-yu']);
    expect(recovered.life.memorials['zhou-yu']).toEqual(before.memorials['zhou-yu']);
    for(const [id,person] of Object.entries(before.people)) if(!['zhou-yu','cai-yan'].includes(id)) expect(recovered.life.people[id],id).toEqual(person);
    expect(isLifeState(recovered.life,now)).toBe(true);
    expect(repairLifeState(damaged,now)).toEqual(recovered);
    expect(repairLifeState(recovered.life,now)).toEqual({life:recovered.life,repaired:false});
  });

  it('trusts a complete memorial over a conflicting legal people draw and prevents resurrection', () => {
    const state=createInitialState(()=>0),now=date(211),life=createLifeState(now,43);
    life.people['zhou-yu'].deathYear=210;
    const archived=reconcileLives({...state,date:now,life,party:{...state.party,'zhou-yu':createProgress(5,13)},
      relationships:{...state.relationships,'zhou-yu':{affinity:97,lastInteraction:5000}}},now);
    const before=structuredClone(archived.life!),damaged=structuredClone(before);
    damaged.people['zhou-yu'].deathYear=214;
    expect(isLifeState(damaged,now)).toBe(false);
    const repaired=repairLifeState(damaged,now)!;
    expect(repaired.life.people['zhou-yu']).toEqual(before.people['zhou-yu']);
    expect(repaired.life.memorials['zhou-yu']).toEqual(before.memorials['zhou-yu']);
    expect(lifeStatus(repaired.life,'zhou-yu',now)).toBe('dead');
    expect(isLifeState(repaired.life,now)).toBe(true);
    expect(repairLifeState(repaired.life,now)).toEqual({life:repaired.life,repaired:false});
    for(const patch of [{age:undefined},{age:999},{relationship:{affinity:101}}]) {
      const forged={...damaged,memorials:{...damaged.memorials,'zhou-yu':{...damaged.memorials['zhou-yu'],...patch}}};
      const recovered=repairLifeState(forged,now)!;
      expect(recovered.life.people['zhou-yu'].deathYear).toBe(214);
      expect(recovered.life.memorials['zhou-yu']).toBeUndefined();
      expect(isLifeState(recovered.life,now)).toBe(true);
    }
  });
});

describe('mortality reconciliation', () => {
  it('archives owned progress and relationships, preserves learned arts/resources and never fills deployments', () => {
    const state = createInitialState(() => 0);
    const life = createLifeState(date(184), 3), death = life.people['cao-cao'].deathYear;
    const progress = createProgress(3, 7), relationship = { affinity: 93, lastInteraction: 90 };
    const before = { ...state, date: date(death-1), life, phase: 'overworld' as const,
      party: { ...state.party, 'cao-cao': progress }, relationships: { ...state.relationships, 'cao-cao': relationship },
      deployed: ['traveler', 'cao-cao', 'aman'], battleParty: ['traveler', 'cao-cao'],
      martial: { ...state.martial, learned: ['jian-xiong'], equipped: ['jian-xiong'] } };
    const next = reconcileLives(before, date(death));
    expect(next.party['cao-cao']).toBeUndefined();
    expect(next.relationships['cao-cao']).toBeUndefined();
    expect(next.deployed).toEqual(['traveler', 'aman']);
    expect(next.battleParty).toEqual(['traveler']);
    expect(next.life?.memorials['cao-cao']).toMatchObject({ progress, relationship, deathYear: death, age: death-155 });
    expect(next.martial).toBe(before.martial);
    expect(next.economy).toBe(before.economy);
    expect(next.worldConflict).toBe(before.worldConflict);
    expect(next.supplies).toBe(before.supplies);
    expect(next.life?.notices.filter(n => n.id === 'cao-cao')).toHaveLength(1);
    expect(reconcileLives(next, date(death))).toBe(next);
    expect(isLifeState(next.life, date(death))).toBe(true);
    expect(before.party['cao-cao']).toEqual(progress);
  });

  it('silently marks pre-start deaths but archives and notifies legacy owned dead once', () => {
    const state = createInitialState(() => 0);
    const life = createLifeState(date(250), 3);
    expect(life.notices).toEqual([]);
    expect(life.handledIds).toContain('cao-cao');
    const old = { ...state, date: date(250), life: undefined, party: { ...state.party, 'cao-cao': createProgress(2) }, deployed: ['traveler', 'cao-cao'] };
    const migrated = reconcileLives(old, old.date);
    expect(migrated.life?.memorials['cao-cao']).toBeDefined();
    expect(migrated.life?.notices).toEqual([{ id: 'cao-cao', deathYear: migrated.life?.people['cao-cao'].deathYear, migrated: true }]);
    expect(reconcileLives(migrated, old.date)).toBe(migrated);
  });

  it('does not repeat a dismissed death notice when repairing a stale archived party entry', () => {
    const state = createInitialState(() => 0);
    const old = { ...state, date: date(250), life: undefined, party: { ...state.party, 'cao-cao': createProgress() } };
    const archived = reconcileLives(old, old.date);
    const stale = { ...archived, party: { ...archived.party, 'cao-cao': createProgress(2) }, life: { ...archived.life!, notices: [] } };
    const repaired = reconcileLives(stale, stale.date);
    expect(repaired.party['cao-cao']).toBeUndefined();
    expect(repaired.life?.notices).toEqual([]);
    expect(repaired.life?.memorials['cao-cao']).toEqual(archived.life?.memorials['cao-cao']);
  });
});
