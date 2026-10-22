import { showCharacterPanel } from './characterPanel';
import { showCharacterDetails } from './characterDetails';
import { getRouteLeader } from './historicalCharacters';
import type { RouteId } from './state';
export interface OverlayAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'quiet';
}

export function clearOverlay(): void {
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
      actions.append(createButton(action.label, action.onClick, action.variant));
    }
    panel.append(actions);
  }

  root.append(panel);
  return panel;
}

export function showRouteChoice<T extends { id: RouteId; symbol: string; title: string; tone: string; offer: string; advantage: string; colorHex: string }>(
  routes: T[],
  onConfirm: (route: T) => void,
): void {
  const root = document.querySelector('#overlay-root');
  if (!root) throw new Error('Overlay root is missing');

  clearOverlay();
  const panel = document.createElement('section');
  panel.className = 'overlay-panel route-panel';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'panel-eyebrow';
  eyebrow.textContent = '临水镇 · 三方来使';
  panel.append(eyebrow);

  const title = document.createElement('h1');
  title.textContent = '你准备把脚步交给谁？';
  panel.append(title);

  const body = document.createElement('p');
  body.className = 'panel-body';
  body.textContent = '三面旗帜都能提供庇护，但每一面旗帜都要求你承担不同的代价。';
  panel.append(body);

  const grid = document.createElement('div');
  grid.className = 'route-grid';
  let selected: T | null = null;
  const cards = new Map<string, HTMLButtonElement>();

  for (const route of routes) {
    const leader = getRouteLeader(route.id);
    const item = document.createElement('div'); item.className = 'route-choice-item';
    const card = document.createElement('button');
    card.className = 'route-card';
    card.type = 'button';
    card.style.setProperty('--route-color', route.colorHex);
    card.innerHTML = `<span class="route-leader"><span class="route-leader-portrait"><img src="${leader.appearance.portrait}" alt="${leader.name}头像"></span><span><span class="route-symbol">${route.symbol}</span><span class="route-leader-name">${leader.name}</span></span></span><span class="route-title">${route.title}</span><span class="route-tone">${route.tone}</span><span class="route-offer">${route.offer}</span><span class="route-advantage">${route.advantage}</span>`;
    card.addEventListener('click', () => {
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
    item.append(card, detail); grid.append(item);
  }
  panel.append(grid);

  const actions = document.createElement('div');
  actions.className = 'panel-actions';
  const confirm = createButton('先看看条件', () => {
    if (selected) onConfirm(selected);
  }, 'primary');
  confirm.disabled = true;
  actions.append(confirm);
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
