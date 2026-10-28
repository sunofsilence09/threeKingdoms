import { openInspection } from './inspectionOverlay';
import { getState } from './runtime';
import { buildRelationshipNetwork, relationshipPage, RELATIONSHIP_KINDS, type RelationshipFilter } from './relationshipNetwork';
import './relationshipView.css';

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') => {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
};
function button(text: string, action: () => void, className = '') {
  const node = element('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node;
}
const svgNode = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value)); return node;
};

export function showRelationshipNetwork(initialId = 'traveler'): void {
  const root = document.querySelector('#overlay-root');
  if (!root || root.querySelector('.relationship-panel')) return;
  const network = buildRelationshipNetwork(getState());
  initialId = initialId.replace(/^enemy:/, '');
  if (!network.people.some(p => p.id === initialId)) return;
  let centerId = initialId, page = 0, filter: RelationshipFilter = 'all', second = false;
  const history: string[] = [];
  const panel = element('section', '', 'overlay-panel relationship-panel');
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '人物关系网');
  const header = element('header', '', 'relationship-header');
  header.append(element('span', '人物志 / 关系网'));
  const closeButton = button('关闭关系网', () => close()); header.append(closeButton);
  const intro = element('p', '循一人之交，见乱世之脉。点击人物查看其关系网。', 'relationship-intro');
  const toolbar = element('div', '', 'relationship-tools');
  const back = button('返回上一人物', () => { const id = history.pop(); if (id) select(id, false); });
  const home = button('回到最初人物', () => select(initialId));
  const label = element('label', '关系类别 '), category = element('select'); category.setAttribute('aria-label', '关系类别');
  for (const [id, text] of [['all', '全部关系'], ...Object.entries(RELATIONSHIP_KINDS)]) {
    const option = element('option', text); option.value = id; category.append(option);
  }
  category.addEventListener('change', () => { filter = category.value as RelationshipFilter; page = 0; render(); }); label.append(category);
  const expand = button('展开二度联系', () => { second = !second; render(); }); expand.setAttribute('aria-pressed', 'false');
  toolbar.append(back, home, label, expand);
  const searchForm = element('form', '', 'relationship-search');
  const searchLabel = element('label', '查找人物 '), search = element('input'); search.type = 'search'; search.placeholder = '输入姓名'; search.setAttribute('aria-label', '搜索关系网人物'); searchLabel.append(search);
  const personSelect = element('select'); personSelect.setAttribute('aria-label', '选择关系网人物');
  const searchCount = element('span', '', 'relationship-search-count'); searchCount.setAttribute('role', 'status');
  const updateOptions = () => {
    const query = search.value.trim().toLocaleLowerCase(); personSelect.replaceChildren();
    const matches = network.people.filter(p => p.name.toLocaleLowerCase().includes(query) || p.id.includes(query));
    for (const p of matches) { const option = element('option', `${p.name} · ${p.role}`); option.value = p.id; personSelect.append(option); }
    if (matches.some(p => p.id === centerId)) personSelect.value = centerId;
    searchCount.textContent = `找到 ${matches.length} 人`; go.disabled = !matches.length;
  };
  const go = button('查看关系', () => { if (personSelect.value) select(personSelect.value); });
  search.addEventListener('input', updateOptions);
  searchForm.addEventListener('submit', event => { event.preventDefault(); if (personSelect.value) select(personSelect.value); });
  searchForm.append(searchLabel, personSelect, go, searchCount);
  const heading = element('div', '', 'relationship-heading'), content = element('div', '', 'relationship-content');
  const notice = element('p', '', 'relationship-summary'); notice.setAttribute('role', 'status');
  const pager = element('nav', '', 'relationship-pager'); pager.setAttribute('aria-label', '关系分页');
  panel.append(header, intro, toolbar, searchForm, heading, notice, pager, content);
  const close = openInspection(panel);

  function select(id: string, remember = true) {
    if (id === centerId && remember) return;
    if (remember) history.push(centerId);
    centerId = id; page = 0; render();
    heading.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
  }
  function render() {
    const view = relationshipPage(network, centerId, filter, page, second), center = network.people.find(p => p.id === centerId)!;
    page = view.page; panel.dataset.center = centerId;
    back.disabled = !history.length; home.disabled = centerId === initialId;
    expand.textContent = second ? '收起二度联系' : '展开二度联系'; expand.setAttribute('aria-pressed', String(second));
    heading.replaceChildren();
    const title = element('h1', `${center.name}的关系网`); title.tabIndex = -1;
    heading.append(title, element('p', `${center.role} · ${center.life}`), element('p', center.posting));
    notice.textContent = `${view.total} 位直接联系人 · 本页 ${view.contacts.length} 人 · 尚有 ${view.total - view.contacts.length} 人在其他页${second ? ` · 图中 ${view.nodes.length} 人（含中心与二度联系，最多24人）` : ''}。联系图可左右滑动，完整关系见下方明细。资料关系不表示本年已发生；同属机构不代表私交。`;
    pager.replaceChildren();
    const previous = button('上一页', () => { page--; render(); }); previous.disabled = page === 0;
    const next = button('下一页', () => { page++; render(); }); next.disabled = page === view.pages - 1;
    pager.append(previous, element('span', `${page + 1} / ${view.pages}`), next);
    content.replaceChildren();
    const scroll = element('div', '', 'relationship-graph-scroll'); scroll.tabIndex = 0; scroll.setAttribute('aria-label', '联系图，可横向滚动；完整关系见下方明细');
    const graph = element('div', '', 'relationship-graph');
    const hasSecond = view.nodes.length > view.contacts.length + 1;
    graph.style.height = hasSecond ? '850px' : '620px';
    const svg = svgNode('svg', { viewBox: `0 0 780 ${hasSecond ? 850 : 620}`, 'aria-hidden': 'true' });
    const positions = new Map<string, { x: number; y: number }>([[centerId, { x: 390, y: 310 }]]);
    view.contacts.forEach((c, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / Math.max(view.contacts.length, 1);
      positions.set(c.person.id, { x: 390 + 285 * Math.cos(angle), y: 310 + 245 * Math.sin(angle) });
    });
    view.nodes.filter(p => !positions.has(p.id)).forEach((p, i) => positions.set(p.id, { x: 70 + (i % 6) * 128, y: 700 + Math.floor(i / 6) * 90 }));
    const groups = new Map<string, typeof view.edges>();
    for (const edge of view.edges) {
      const key = [edge.a, edge.b].sort().join('|'), edges = groups.get(key) ?? []; edges.push(edge); groups.set(key, edges);
    }
    for (const edges of groups.values()) {
      const edge = edges[0], a = positions.get(edge.a)!, b = positions.get(edge.b)!;
      const line = svgNode('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: `relationship-line kind-${edge.kind}${edges.some(e => e.current) ? '' : ' is-reference'}` });
      const tooltip = svgNode('title'); tooltip.textContent = edges.map(e => `${e.labelA} / ${e.labelB} · ${e.source}`).join('\n'); line.append(tooltip); svg.append(line);
      if (edge.a === centerId || edge.b === centerId) {
        const target = edge.a === centerId ? b : a;
        const text = svgNode('text', { x: 390 + (target.x - 390) * .62, y: 310 + (target.y - 310) * .62 - 7, class: 'relationship-edge-label', 'text-anchor': 'middle' });
        text.textContent = [...new Set(edges.map(e => RELATIONSHIP_KINDS[e.kind]))].join(' / '); svg.append(text);
      }
    }
    graph.append(svg);
    for (const p of view.nodes) {
      const pos = positions.get(p.id)!, isCenter = p.id === centerId, contact = view.contacts.find(c => c.person.id === p.id);
      const node = button('', () => select(p.id), `relationship-node${isCenter ? ' is-center' : ''}${!isCenter && !contact ? ' is-second' : ''}`);
      node.dataset.person = p.id; node.style.left = `${pos.x}px`; node.style.top = `${pos.y}px`;
      node.setAttribute('aria-label', `${p.name}${isCenter ? '，当前中心人物' : '，查看关系网'}`);
      node.append(element('strong', p.name), element('span', isCenter ? '中心人物' : contact?.relations.map(r => r.label).join(' · ') ?? '二度联系'), element('small', p.life));
      if (isCenter) node.disabled = true;
      graph.append(node);
    }
    scroll.append(graph); content.append(scroll);
    const list = element('section', '', 'relationship-list'); list.setAttribute('aria-label', '关系明细');
    list.append(element('h2', '关系明细'));
    if (!view.contacts.length) list.append(element('p', filter === 'all' ? '暂无已记录的人际联系。可搜索其他人物查看；当前任职与驻地见上方。' : '此类别暂无已记录关系，可切换“全部关系”。'));
    for (const contact of view.contacts) {
      const card = element('article', '', 'relationship-contact'); card.dataset.contact = contact.person.id;
      card.append(button(contact.person.name, () => select(contact.person.id)), element('p', `${contact.person.role} · ${contact.person.life}`));
      for (const relation of contact.relations) {
        card.append(element('p', `${RELATIONSHIP_KINDS[relation.kind]} · ${relation.label} · ${relation.current ? '本局当前' : relation.kind === 'family' || relation.kind === 'story' ? '人物资料' : '本局留存'}`, 'relationship-relation'), element('p', relation.source, 'relationship-source'));
      }
      list.append(card);
    }
    content.append(list);
    scroll.scrollLeft = Math.max(0, (780 - scroll.clientWidth) / 2);
  }
  updateOptions(); render(); closeButton.focus({ preventScroll: true });
}
