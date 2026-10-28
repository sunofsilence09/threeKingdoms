import { bondLabel } from './social';
import type { GameState } from './state';
import { allRecruitProfiles, recruitProfile } from './recruitmentCatalog';
import { personName } from './heroName';
import { lifeLabel, lifeStatus } from './personLife';
import { personPosting, postingLabel } from './personPosting';
import { leaderForFaction } from './worldConflictData';
import { martialAt } from './martialCatalog';
import { REFERENCE_RELATIONSHIPS, STORY_RELATIONSHIPS } from './relationshipData';

export const RELATIONSHIP_KINDS = { bond: '本局羁绊', family: '亲族', story: '故事关系', service: '任职', company: '同行', affinity: '交往', teaching: '师承' } as const;
export type RelationshipKind = keyof typeof RELATIONSHIP_KINDS;
export type RelationshipFilter = RelationshipKind | 'all';
export interface NetworkPerson { id: string; name: string; role: string; portrait: string; life: string; status: string; posting: string }
export interface NetworkEdge {
  id: string; a: string; b: string; kind: RelationshipKind; labelA: string; labelB: string; source: string; current: boolean;
}
export interface RelationshipNetwork { people: NetworkPerson[]; edges: NetworkEdge[] }
export interface NetworkContact { person: NetworkPerson; relations: { kind: RelationshipKind; label: string; source: string; current: boolean }[] }

/** Unnamed battle bandits share an occupation identity, never a fabricated personal life. */
export function relationshipPersonId(id: string): string | undefined {
  const normalized = id.replace(/^enemy:/, '');
  if (/^bandit-scout-[a-d]$/.test(normalized)) return 'bandit';
  return recruitProfile(normalized) ? normalized : undefined;
}

/** Projection only. No save migrations, RNG draws or generated social scores. */
export function buildRelationshipNetwork(state: GameState): RelationshipNetwork {
  const people = allRecruitProfiles(state).map(p => ({ id: p.id, name: personName(p.id, state), role: p.role,
    portrait: p.portrait, life: lifeLabel(state, p.id).split('；')[0], status: lifeStatus(state, p.id), posting: postingLabel(state, p.id) }));
  const known = new Set(people.map(p => p.id)), edges: NetworkEdge[] = [], seen = new Set<string>();
  const active = (id: string) => ['alive', 'untracked'].includes(lifeStatus(state, id));
  const add = (a: string, b: string, kind: RelationshipKind, labelA: string, labelB: string, source: string, current: boolean) => {
    const id = `${kind}:${[a, b].sort().join('|')}`;
    if (a === b || !known.has(a) || !known.has(b) || seen.has(id)) return;
    seen.add(id); edges.push({ id, a, b, kind, labelA, labelB, source, current });
  };
  for (const r of [...REFERENCE_RELATIONSHIPS, ...STORY_RELATIONSHIPS]) add(r.a, r.b, r.kind, r.labelA, r.labelB, r.source, false);
  const company = Object.keys(state.party).filter(id => known.has(id) && active(id));
  for (let i = 0; i < company.length; i++) for (const b of company.slice(i + 1)) add(company[i], b, 'company', '同行伙伴', '同行伙伴', '本局 · 当前同行队伍', true);
  for (const memorial of Object.values(state.life?.memorials ?? {})) {
    add('traveler', memorial.id, 'company', '曾经同行', '曾经同行', '本局 · 同行纪念档案', false);
    if (memorial.relationship) add('traveler', memorial.id, 'affinity', `亲密 ${memorial.relationship.affinity}/100`, `亲密 ${memorial.relationship.affinity}/100`, '本局 · 离世时保存的交往记录', false);
  }
  for (const memorial of Object.values(state.life?.memorials ?? {})) if (memorial.relationship?.bond) add('traveler',memorial.id,'bond',bondLabel(memorial.relationship.bond),bondLabel(memorial.relationship.bond),'本局 · 已缔结羁绊 · 双方六维永久各+2',false);
  for (const [id, r] of Object.entries(state.relationships)) {
    if(r.bond) add('traveler',id,'bond',bondLabel(r.bond),bondLabel(r.bond),'本局 · 已缔结羁绊 · 双方六维永久各+2',active(id));
    if (lifeStatus(state, id) === 'unborn') continue;
    add('traveler', id, 'affinity', `亲密 ${r.affinity}/100`, `亲密 ${r.affinity}/100`, '本局 · 与主角交往记录', active(id));
  }
  for (const p of people) {
    if (!active(p.id)) continue;
    const posting = personPosting(state, p.id);
    const employer = posting?.employerId ?? (posting?.factionId && ['governing', 'employed', 'campaign'].includes(posting.kind)
      ? leaderForFaction(posting.factionId, state.date, state.life) : undefined);
    if (employer && active(employer) && !state.party[employer]) add(p.id, employer, 'service', '主事 / 上级', '属员', `本局 · ${posting!.office} · ${posting!.title}；${posting!.reason ?? '按当前任职关系显示'}`, true);
  }
  const teachings = new Map<string, string[]>();
  for (const acquisition of Object.values(state.martial.acquisitions)) {
    if (acquisition.outcome !== 'learned' || !state.martial.learned.includes(acquisition.skillId)) continue;
    const skills = teachings.get(acquisition.teacherId) ?? [];
    skills.push(martialAt(acquisition.skillId)?.name ?? acquisition.skillId); teachings.set(acquisition.teacherId, skills);
  }
  for (const [teacher, skills] of teachings) add('traveler', teacher, 'teaching', '授艺老师', '受艺弟子', `本局 · 已学武学：${[...new Set(skills)].join('、')}`, active(teacher));
  return { people, edges };
}

/** The complete contact list is retained separately from bounded graph pages. */
export function relationshipPage(network: RelationshipNetwork, centerId: string, filter: RelationshipFilter = 'all', requestedPage = 0, secondDegree = false) {
  const people = new Map(network.people.map(p => [p.id, p])), contacts = new Map<string, NetworkContact>();
  const matching = network.edges.filter(e => filter === 'all' || e.kind === filter);
  for (const edge of matching) {
    if (edge.a !== centerId && edge.b !== centerId) continue;
    const target = edge.a === centerId ? edge.b : edge.a, person = people.get(target);
    if (!person) continue;
    const contact = contacts.get(target) ?? { person, relations: [] };
    contact.relations.push({ kind: edge.kind, label: edge.a === centerId ? edge.labelA : edge.labelB, source: edge.source, current: edge.current });
    contacts.set(target, contact);
  }
  const allContacts = [...contacts.values()].sort((a, b) => a.person.id.localeCompare(b.person.id, 'en'));
  const total = allContacts.length, pages = Math.max(1, Math.ceil(total / 12));
  const page = Math.min(pages - 1, Math.max(0, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 0));
  const visible = allContacts.slice(page * 12, page * 12 + 12);
  const ids = new Set([centerId, ...visible.map(c => c.person.id)]);
  if (secondDegree) {
    const direct = new Set(visible.map(c => c.person.id));
    for (const e of matching) {
      if (ids.size >= 24) break;
      const target = direct.has(e.a) ? e.b : direct.has(e.b) ? e.a : undefined;
      if (target && people.has(target) && !contacts.has(target)) ids.add(target);
    }
  }
  return { allContacts, contacts: visible, total, pages, page,
    nodes: [...ids].flatMap(id => people.get(id) ?? []),
    edges: matching.filter(e => ids.has(e.a) && ids.has(e.b)),
  };
}
