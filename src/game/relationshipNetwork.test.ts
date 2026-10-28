import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { createProgress } from './growth';
import { allRecruitProfiles } from './recruitmentCatalog';
import { REFERENCE_RELATIONSHIPS, STORY_RELATIONSHIPS } from './relationshipData';
import { createPrefectId } from './prefectIdentity';
import { ensureLifePeople } from './personLife';
import { buildRelationshipNetwork, relationshipPage, relationshipPersonId } from './relationshipNetwork';

const initial = () => createInitialState(() => 0);
describe('人物关系网', () => {
  it('maps battle bandits to their explicit occupation profile and rejects nonpeople', () => {
    expect(relationshipPersonId('bandit-scout-b')).toBe('bandit');
    expect(relationshipPersonId('enemy:cao-cao')).toBe('cao-cao');
    expect(relationshipPersonId('wolf:0')).toBeUndefined();
  });
  it('has no dangling authored identities or duplicate reference pairs', () => {
    const ids = new Set(allRecruitProfiles(initial()).map(p => p.id));
    const references = [...REFERENCE_RELATIONSHIPS, ...STORY_RELATIONSHIPS];
    expect(references.every(r => ids.has(r.a) && ids.has(r.b) && r.a !== r.b && r.source.length > 10)).toBe(true);
    expect(new Set(references.map(r => `${r.kind}:${[r.a,r.b].sort().join('|')}`)).size).toBe(references.length);
  });
  it('covers every catalog identity and preserves input byte for byte', () => {
    const state = initial(), before = JSON.stringify(state);
    const network = buildRelationshipNetwork(state);
    expect(allRecruitProfiles(state).every(p => network.people.some(n => n.id === p.id))).toBe(true);
    expect(network.edges.every(e => e.a !== e.b && network.people.some(p => p.id === e.a) && network.people.some(p => p.id === e.b))).toBe(true);
    expect(new Set(network.edges.map(e => e.id)).size).toBe(network.edges.length);
    expect(JSON.stringify(state)).toBe(before);
    expect(buildRelationshipNetwork(JSON.parse(before))).toEqual(network);
  });
  it('provides inverse kinship labels and keeps unborn relatives as reference only', () => {
    const network = buildRelationshipNetwork(initial());
    expect(relationshipPage(network, 'cao-cao').allContacts.find(c => c.person.id === 'cao-pi')?.relations).toContainEqual(expect.objectContaining({ label: '儿子', source: expect.any(String), current: false }));
    expect(relationshipPage(network, 'cao-pi').allContacts.find(c => c.person.id === 'cao-cao')?.relations).toContainEqual(expect.objectContaining({ label: '父亲' }));
    expect(network.edges.filter(e => e.a === 'cao-pi' || e.b === 'cao-pi').every(e => !e.current)).toBe(true);
  });
  it('shows affinity only for player interactions, with multiple relations for companions', () => {
    const state = initial(); state.heroName = '行旅客';
    const network = buildRelationshipNetwork(state), aman = relationshipPage(network, 'aman');
    expect(aman.allContacts.find(c => c.person.id === 'traveler')?.relations.map(r => r.kind)).toEqual(expect.arrayContaining(['company', 'affinity']));
    expect(network.people.find(p => p.id === 'traveler')?.name).toBe('行旅客');
    expect(network.edges.filter(e => e.kind === 'affinity').every(e => e.a === 'traveler')).toBe(true);
  });
  it('removes current employment on recruitment and records teachers from successful acquisitions only', () => {
    const state = initial();
    const before = buildRelationshipNetwork(state);
    const employed = before.edges.find(e => e.kind === 'service');
    expect(employed).toBeDefined();
    state.party[employed!.a] = createProgress();
    const after = buildRelationshipNetwork(state);
    expect(after.edges.some(e => e.id === employed!.id)).toBe(false);
    state.martial.acquisitions['test-skill'] = { teacherId: 'guan-yu', skillId: 'test-skill', kind: 'teaching', outcome: 'learned', date: state.date };
    state.martial.learned.push('test-skill');
    expect(relationshipPage(buildRelationshipNetwork(state), 'traveler', 'teaching').allContacts.map(c => c.person.id)).toEqual(['guan-yu']);
  });
  it('retains memorial affinity and past company without current employment', () => {
    const state = initial();
    state.life!.people['guan-yu'].deathYear = 200;
    state.date = { year: 201, month: 1, day: 1 };
    state.life!.memorials['guan-yu'] = { id: 'guan-yu', deathYear: 200, age: 41, progress: createProgress(), relationship: { affinity: 93 } };
    const network = buildRelationshipNetwork(state);
    const contacts = relationshipPage(network, 'guan-yu').allContacts;
    expect(contacts.find(c => c.person.id === 'traveler')?.relations).toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'affinity', label: '亲密 93/100', current: false }), expect.objectContaining({ kind: 'company', current: false })]));
    expect(network.edges.some(e => e.current && (e.a === 'guan-yu' || e.b === 'guan-yu'))).toBe(false);
  });
  it('paginates deterministically without hiding contacts and bounds second-degree graphs', () => {
    const state = initial();
    for (const p of allRecruitProfiles(state).slice(0, 40)) state.relationships[p.id] = { affinity: 10 };
    const network = buildRelationshipNetwork(state), first = relationshipPage(network, 'traveler');
    expect(first.contacts).toHaveLength(12);
    const ids = new Set<string>();
    for (let page = 0; page < first.pages; page++) relationshipPage(network, 'traveler', 'all', page).contacts.forEach(c => ids.add(c.person.id));
    expect(ids.size).toBe(first.total);
    expect(relationshipPage(network, 'traveler', 'all', 0, true).nodes.length).toBeLessThanOrEqual(24);
    expect(relationshipPage(network, 'missing').total).toBe(0);
    expect(relationshipPage(network, 'traveler', 'all', 999).page).toBe(first.pages - 1);
  });
  it('updates garrison superiors on succession while retaining retired original identities', () => {
    const state = initial();
    const [cityId, city] = Object.entries(state.worldConflict!.cities).find(([, city]) => city.governorId?.startsWith('prefect-'))!;
    const former = city.governorId!, successor = createPrefectId(cityId, city.factionId, state.date.year, 999999);
    state.life = ensureLifePeople(state.life!, [successor]);
    city.governorId = successor;
    const network = buildRelationshipNetwork(state), captain = `garrison:${cityId}:captain`;
    expect(network.people.some(p => p.id === former)).toBe(true);
    expect(network.people.some(p => p.id === successor)).toBe(true);
    expect(relationshipPage(network, captain, 'service').allContacts.some(c => c.person.id === successor)).toBe(true);
    expect(relationshipPage(network, captain, 'service').allContacts.some(c => c.person.id === former)).toBe(false);
    expect(relationshipPage(network, former, 'service').total).toBe(0);
  });
});
