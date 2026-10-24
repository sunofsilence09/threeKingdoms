import { showCharacterPanel } from './characterPanel';
import { showCharacterDetails } from './characterDetails';
import { getRouteLeader } from './historicalCharacters';
import type { GameState, RouteId } from './state';
import { clearInspections } from './inspectionOverlay';
import { routeInstitutionName, routePrincipalName } from './politicalPresentation';
export interface OverlayAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'quiet';
  disabled?: boolean;
}

export function clearOverlay(): void {
  clearInspections();
  document.querySelector('#overlay-root')?.replaceChildren();
}

export function showPanel(options: {
  eyebrow?: string;
  title: string;
  body: string;
  actions?: OverlayAction[];
  className?: string;
}): HTMLElement {
  const root = document.querySelector('#overlay-root');
  if (!root) throw new Error('Overlay root is missing');

  clearOverlay();
  const panel = document.createElement('section');
  panel.className = `overlay-panel ${options.className ?? ''}`.trim();

  if (options.eyebrow) {
    const eyebrow = document.createElement('p');
    eyebrow.className = 'panel-eyebrow';
    eyebrow.textContent = options.eyebrow;
    panel.append(eyebrow);
  }

  const title = document.createElement('h1');
  title.textContent = options.title;
  panel.append(title);

  const body = document.createElement('p');
  body.className = 'panel-body';
  body.textContent = options.body;
  panel.append(body);

  if (options.actions?.length) {
    const actions = document.createElement('div');
    actions.className = 'panel-actions';
    for (const action of options.actions) {
      const button=createButton(action.label, action.onClick, action.variant);
      button.disabled=Boolean(action.disabled);actions.append(button);
    }
    panel.append(actions);
  }

  root.append(panel);
  return panel;
}

export function showRouteChoice<T extends { id: RouteId; symbol: string; title: string; tone: string; offer: string; advantage: string; colorHex: string }>(
  routes: T[],
  onConfirm: (route: T) => void,
  options?: { available: RouteId[]; year: number; state?: GameState; onLeave: () => void },
): void {
  const root = document.querySelector('#overlay-root');
  if (!root) throw new Error('Overlay root is missing');

  clearOverlay();
  const panel = document.createElement('section');
  panel.className = 'overlay-panel route-panel';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'panel-eyebrow';
  eyebrow.textContent = options ? `公元 ${options.year} 年 · 行旅去向` : '行旅去向';
  panel.append(eyebrow);

  const title = document.createElement('h1');
  title.textContent = '你准备把脚步交给谁？';
  panel.append(title);

  const body = document.createElement('p');
  body.className = 'panel-body';
  body.textContent = options && options.year < 200 ? '相遇留下了选择。此刻可以投奔已结识的一方，也可以继续独自行旅；尚未相遇的阵营暂不开放。' : '乱世已走过多年，三方都递来了消息。选择归属，或先继续自己的路。';
  panel.append(body);

  const grid = document.createElement('div');
  grid.className = 'route-grid';
  let selected: T | null = null;
  const cards = new Map<string, HTMLButtonElement>();

  for (const route of routes) {
    const leader = getRouteLeader(route.id);
    const leaderName = options?.state ? routePrincipalName(route.id,options.state) : routeInstitutionName(route.id);
    const locked = options ? !options.available.includes(route.id) : false;
    const hasPortrait = leaderName === leader.name;
    const item = document.createElement('div'); item.className = 'route-choice-item';
    const card = document.createElement('button');
    card.className = 'route-card';
    card.type = 'button';
    card.disabled = locked;
    card.setAttribute('aria-label', `${leaderName} · ${locked ? '尚未相遇' : '可投奔'}`);
    card.style.setProperty('--route-color', route.colorHex);
    card.innerHTML = `<span class="route-leader">${hasPortrait ? `<span class="route-leader-portrait"><img src="${leader.appearance.portrait}" alt="${leaderName}头像"></span>` : ''}<span><span class="route-symbol">${route.symbol}</span><span class="route-leader-name">${leaderName}</span></span></span><span class="route-title">${route.title}</span><span class="route-tone">${locked ? '尚未相遇 · 200年起开放' : route.tone}</span><span class="route-offer">${route.offer}</span><span class="route-advantage">${route.advantage}</span>`;
    card.addEventListener('click', () => {
      if (locked) return;
      selected = route;
      for (const item of cards.values()) item.classList.remove('is-selected');
      card.classList.add('is-selected');
      confirm.disabled = false;
      confirm.textContent = `走 ${route.symbol} 方的路`;
    });
    cards.set(route.id, card);
    const detail = document.createElement('button');
    detail.type = 'button'; detail.className = 'route-leader-details'; detail.textContent = `查看${leader.name}详情`;
    detail.addEventListener('click', () => showCharacterDetails(leader.id));
    item.append(card);
    if (hasPortrait && !locked) item.append(detail);
    grid.append(item);
  }
  panel.append(grid);

  const actions = document.createElement('div');
  actions.className = 'panel-actions';
  const confirm = createButton('先看看条件', () => {
    if (selected) onConfirm(selected);
  }, 'primary');
  confirm.disabled = true;
  actions.append(confirm);
  if (options) actions.append(createButton('继续独自行旅', options.onLeave, 'quiet'));
  const growth = document.createElement('button');
  growth.type = 'button'; growth.className = 'growth-entry'; growth.textContent = '角色成长';
  growth.addEventListener('click', () => showCharacterPanel());
  actions.append(growth);
  const details = document.createElement('button');
  details.type = 'button'; details.className = 'character-detail-open'; details.textContent = '人物详情';
  details.addEventListener('click', () => showCharacterDetails());
  actions.append(details);
  panel.append(actions);
  root.append(panel);
}

export function setStatus(text: string): void {
  const label = document.querySelector('#loading-label');
  if (label) label.textContent = text;
}

function createButton(
  label: string,
  onClick: () => void,
  variant: OverlayAction['variant'] = 'primary',
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `panel-button ${variant === 'quiet' ? 'is-quiet' : ''}`.trim();
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}
