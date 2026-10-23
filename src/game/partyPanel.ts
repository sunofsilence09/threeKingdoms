import './partyPanel.css';
import { openInspection } from './inspectionOverlay';
import { getState, setState } from './runtime';
import { dateLabel } from './history';
import { WORLD_CITIES } from './world';
import { RECRUIT_PROFILES, recruitProfile, canMeetPerson, type RecruitProfile } from './recruitmentCatalog';
import { AFFINITY_REQUIRED, canInteractPerson, canManageParty, gameDayNumber, interactPerson, invitePerson, setDeployment } from './recruitment';
import { makePartyUnit, WEAPONS, type CombatState } from './combat';
import { showCharacterDetails } from './characterDetails';
import { showCharacterPanel } from './characterPanel';
import type { GameState } from './state';

const nameOf = (id: string) => recruitProfile(id)?.name ?? id;
const cityName = (id: string) => WORLD_CITIES.find(city => city.id === id)?.name ?? id;
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
function button(label: string, action: () => void, disabled = false): HTMLButtonElement {
  const node = element('button', label, 'party-action'); node.type = 'button'; node.disabled = disabled;
  node.addEventListener('click', action); return node;
}
function portrait(profile: RecruitProfile | undefined, name: string): HTMLImageElement {
  const image = element('img', '', 'party-portrait'); image.src = profile?.portrait ?? '/assets/characters/neutral-official.svg'; image.alt = `${name}立绘`; image.loading = 'lazy'; return image;
}
function retainFocus(body: HTMLElement): () => void {
  const focused = document.activeElement as HTMLElement | null;
  if (!focused || !body.contains(focused)) return () => {};
  const card = focused.closest<HTMLElement>('[data-member], [data-person]');
  const member = card?.dataset.member, person = card?.dataset.person, label = focused.textContent;
  return () => {
    const scope = [...body.querySelectorAll<HTMLElement>('[data-member], [data-person]')].find(node => member ? node.dataset.member === member : person ? node.dataset.person === person : false) ?? body;
    const buttons = [...scope.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    (buttons.find(node => node.textContent === label) ?? buttons[0] ?? body.parentElement?.querySelector<HTMLButtonElement>('.company-header button'))?.focus({ preventScroll: true });
  };
}
function shell(kind: string, title: string, onClose?: () => void) {
  const root = document.querySelector('#overlay-root');
  if (!root || root.querySelector(`.${kind}`)) return;
  const panel = element('section', '', `overlay-panel company-panel ${kind}`);
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', title);
  const heading = element('header', '', 'company-header');
  const headingText = element('h1', title); const closeButton = button('关闭', () => close());
  heading.append(headingText, closeButton); panel.append(heading);
  // Inspection owns the prior DOM. Notify the scene only after that DOM has been restored.
  const close = openInspection(panel, onClose);
  closeButton.focus({ preventScroll: true });
  return { panel, closeButton };
}
function lockedNote(state: GameState): string {
  return state.phase === 'battle' ? '本场阵容已锁定，战斗结束后可调整。' : state.journey?.event ? '请先处理途中事件，当前仅可查看。' : state.journey ? '正在赶路；可调整下一场阵容，到城后才能交流。' : '';
}

export function showPartyPanel(onChange?: () => void, combat?: CombatState): void {
  const view = shell('party-panel', '同行队伍', onChange); if (!view) return;
  const { panel } = view;
  const body = element('div', '', 'company-body'); panel.append(body);
  let replacement: string | undefined;
  function update(ids: string[]) { const state = getState(); setState(setDeployment(state, ids)); replacement = undefined; render(); }
  function render(): void {
    const restoreFocus = retainFocus(body);
    const state = getState(); const locked = !canManageParty(state); body.replaceChildren();
    body.append(element('p', `出战 ${state.deployed.length}/5 · 同行 ${Object.keys(state.party).length} 人 · 姜垣固定上阵`, 'company-summary'));
    body.append(element('p', '候补保留成长与装备，仅本场出战成员获得战斗经验。', 'company-note'));
    if (lockedNote(state)) body.append(element('p', lockedNote(state), 'company-notice'));
    const tools = element('div', '', 'party-actions');
    tools.append(button('角色成长', () => showCharacterPanel(render, combat)), button('寻访人物', () => showRecruitmentPanel(render, combat)));
    body.append(tools);
    if (replacement) {
      const chooser = element('section', '', 'replacement-picker');
      chooser.setAttribute('aria-label', '选择替换对象');
      chooser.append(element('h2', `让${nameOf(replacement)}替换谁？`), element('p', '被替换者转入候补，保留全部成长。'));
      for (const id of state.deployed.filter(id => id !== 'traveler')) chooser.append(button(`替换${nameOf(id)}`, () => update(state.deployed.map(key => key === id ? replacement! : key)), locked));
      chooser.append(button('取消替换', () => { replacement = undefined; render(); })); body.append(chooser);
    }
    for (const deployed of [true, false]) {
      const section = element('section', '', 'company-section'); section.append(element('h2', deployed ? `出战 · ${state.deployed.length}/5` : '候补'));
      const grid = element('div', '', 'company-grid');
      const ids = deployed ? state.deployed : Object.keys(state.party).filter(id => !state.deployed.includes(id));
      for (const id of ids) {
        const profile = recruitProfile(id), progress = state.party[id];
        const unit = combat?.units.find(u => u.team === 'party' && u.id === id) ?? makePartyUnit(id, progress, state.route, state.route ? 'route' : 'ambush');
        const card = element('article', '', 'company-card'); card.dataset.member = id;
        const info = element('div', '', 'company-card-info');
        info.append(element('h3', `${nameOf(id)} · Lv.${progress.level}`), element('p', `${profile?.role ?? '同行伙伴'} · ${WEAPONS[unit.weapon].name}`), element('p', `亲密 ${state.relationships[id]?.affinity ?? 0}/100 · 技能点 ${progress.points}`));
        const actions = element('div', '', 'party-actions');
        actions.append(button('详情', () => showCharacterDetails(id, combat?.units.some(u => u.team === 'party' && u.id === id) ? combat : undefined)), button('成长', () => showCharacterPanel(render, combat, id)));
        if (id === 'traveler') actions.append(element('span', '主角 · 固定上阵', 'party-fixed'));
        else if (deployed) actions.append(button('下阵', () => update(getState().deployed.filter(key => key !== id)), locked));
        else actions.append(button(state.deployed.length < 5 ? '上阵' : '替换上阵', () => {
          const current = getState();
          if (current.deployed.length < 5) update([...current.deployed, id]);
          else { replacement = id; render(); body.querySelector<HTMLButtonElement>('.replacement-picker button')?.focus(); }
        }, locked));
        info.append(actions); card.append(portrait(profile, nameOf(id)), info); grid.append(card);
      }
      if (!ids.length) grid.append(element('p', '暂无候补。可在城内寻访人物，培养亲密度后邀请。', 'company-note'));
      if (deployed && ids.length < 5) grid.append(element('p', `空位 ${5 - ids.length} · 从候补选择上阵`, 'party-empty'));
      section.append(grid); body.append(section);
    }
    restoreFocus();
  }
  render();
}

function windowLabel(profile: RecruitProfile): string {
  return profile.windows.map(window => {
    const from = `${window.from.year}年${window.from.month ? `${window.from.month}月` : ''}`;
    const to = window.to ? `${window.to.year}年${window.to.month ? `${window.to.month}月` : ''}` : '此后';
    return `${from}—${to}：${window.cityIds.map(cityName).join('、')}`;
  }).join('；');
}
function unavailableReason(profile: RecruitProfile, state: GameState): string {
  if (state.journey) return '途中不可交流，请先抵达城池。';
  if (!canManageParty(state)) return lockedNote(state);
  if (state.party[profile.id]) return profile.id === 'traveler' ? '姜垣是你自己。' : '已同行，可在城内继续交流。';
  if (canMeetPerson(profile.id, state.currentCityId, state.date)) return '当前可相遇。';
  const now = state.date.year * 12 + state.date.month;
  const active = profile.windows.some(window => now >= window.from.year * 12 + (window.from.month ?? 1) && (!window.to || now <= window.to.year * 12 + (window.to.month ?? 12)));
  return active ? '当前不在此城，请按行踪前往相应地点。' : '当前年代不在活动窗口（尚未成年、未开始活动或已故）。';
}
export function showRecruitmentPanel(onChange?: () => void, combat?: CombatState): void {
  const view = shell('recruitment-panel', '寻访人物', onChange); if (!view) return;
  const { panel } = view;
  const body = element('div', '', 'company-body'); panel.append(body);
  let all = false; let feedback = '';
  function mutate(action: (state: GameState) => GameState) {
    const before = getState(); const after = action(before); setState(after);
    feedback = after === before ? '当前条件不符，请查看人物状态。' : after.travelNotice ?? '已更新。'; render();
  }
  function render(): void {
    const restoreFocus = retainFocus(body);
    const state = getState(); body.replaceChildren();
    body.append(element('p', `${dateLabel(state.date)} · ${state.journey ? '行进途中' : cityName(state.currentCityId)} · 军需 ${state.supplies}`, 'company-summary'));
    body.append(element('p', `亲密度达到 ${AFFINITY_REQUIRED} 可免费邀请至候补。邀请长期同行为架空支线；主君同行不自动选择阵营。`, 'company-note'));
    body.append(element('p', '每人每日一次；交谈、分享粮食、帮忙均耗时1日。同人再次交流须先休整、帮工或赶路至次日。', 'company-note'));
    body.append(element('p', '以下地点与年份是游戏相遇窗口，依据历史活动区域编排，不代表连续精确驻地。', 'company-note'));
    if (lockedNote(state)) body.append(element('p', lockedNote(state), 'company-notice'));
    const tabs = element('nav', '', 'company-tabs'); tabs.setAttribute('aria-label', '寻访视图');
    for (const [value, label] of [[false, '本地人物'], [true, '所有人物行踪']] as const) {
      const tab = button(label, () => { all = value; render(); }); tab.setAttribute('aria-pressed', String(all === value)); tabs.append(tab);
    }
    body.append(tabs);
    const notice = element('p', feedback, 'company-feedback'); notice.setAttribute('aria-live', 'polite'); body.append(notice);
    const profiles = RECRUIT_PROFILES.filter(profile => all || state.party[profile.id] || !state.journey && canMeetPerson(profile.id, state.currentCityId, state.date));
    const grid = element('div', '', 'company-grid recruitment-grid');
    for (const profile of profiles) {
      const joined = Boolean(state.party[profile.id]); const relationship = state.relationships[profile.id];
      const affinity = relationship?.affinity ?? 0; const today = relationship?.lastInteraction === gameDayNumber(state.date);
      const available = canInteractPerson(state, profile.id);
      const card = element('article', '', 'company-card recruitment-card'); card.dataset.person = profile.id;
      const info = element('div', '', 'company-card-info');
      info.append(element('h3', profile.name), element('p', profile.role), element('p', profile.bio, 'company-note'), element('p', joined ? `已同行 · ${state.deployed.includes(profile.id) ? '出战' : '候补'}` : `邀请门槛 ${AFFINITY_REQUIRED} · 尚未同行`, 'party-member-status'));
      const meter = element('progress'); meter.max = 100; meter.value = affinity; meter.setAttribute('aria-label', `${profile.name}亲密度 ${affinity}/100`);
      info.append(element('p', `亲密 ${affinity}/100${today ? ' · 当天已互动' : ''}`), meter, element('p', unavailableReason(profile, state), 'company-note'));
      const windows = element('details', '', 'person-windows'); windows.append(element('summary', '年份与地点窗口'), element('p', windowLabel(profile))); info.append(windows);
      const actions = element('div', '', 'party-actions');
      actions.append(button('交谈 +8 · 免费 · 1日', () => mutate(state => interactPerson(state, profile.id, 'talk')), !available || today || affinity >= 100));
      actions.append(button('分享粮食 +12 · 军需−1 · 1日', () => mutate(state => interactPerson(state, profile.id, 'meal')), !available || today || affinity >= 100 || state.supplies < 1));
      actions.append(button('帮忙 +10 · 免费 · 1日', () => mutate(state => interactPerson(state, profile.id, 'help')), !available || today || affinity >= 100));
      if (!joined) actions.append(button('邀请同行', () => mutate(state => invitePerson(state, profile.id)), !available || affinity < AFFINITY_REQUIRED));
      else actions.append(button('查看详情', () => showCharacterDetails(profile.id, combat?.units.some(unit => unit.team === 'party' && unit.id === profile.id) ? combat : undefined)));
      info.append(actions); card.append(portrait(profile, profile.name), info); grid.append(card);
    }
    if (!profiles.length) grid.append(element('p', '此时此地暂无可寻访人物，可查看所有人物行踪。', 'company-note'));
    body.append(grid);
    restoreFocus();
  }
  render();
}
