import { getState, setState } from './runtime';
import { openInspection } from './inspectionOverlay';
import { WORLD_CITIES, cityNameAt } from './world';
import { dateLabel } from './history';
import { armyRemainingDays, createWorldConflict } from './worldConflict';
import { CONFLICT_FACTIONS, factionAt } from './worldConflictData';
import type { ConflictArmy } from './worldConflictTypes';
import { armyPhaseLabel, conflictDateLabel, filterConflictReports, troopLabel } from './conflictView';
import { recruitProfile } from './recruitmentCatalog';
import './conflictPanel.css';

function node<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag); element.className = className; element.textContent = text; return element;
}
function button(text: string, run: () => void): HTMLButtonElement {
  const element = node('button', text, 'trade-button is-quiet'); element.type = 'button'; element.addEventListener('click', run); return element;
}
export function createConflictRecovery(onRebuild: () => void): HTMLElement {
  const box = node('section', '', 'conflict-recovery'); box.setAttribute('aria-label', '天下局势需要恢复');
  box.append(node('h2', '天下局势暂已暂停'), node('p', '战局存档无法读取。人物、财货与行旅进度仍保留；重建将以当前年月接入新的天下局势，重置城池归属、驻军和主角预备兵。'));
  const rebuild = button('重建天下局势（保留人物与行旅）', () => {
    const current = getState();
    setState({ ...current, worldConflict: createWorldConflict(current.date, Object.keys(current.party), undefined, current.life), conflictRecovery: undefined, conflictMigration: undefined });
    onRebuild();
  }); rebuild.dataset.conflictRebuild = ''; box.append(rebuild); return box;
}
export function armySummary(army: ConflictArmy): string {
  const eta = armyRemainingDays(army);
  const timing = army.phase === 'camped' ? '等待友方据点接纳' : army.phase === 'sieging' ? `预计${eta}日后结算` : `预计${eta}日后${army.phase === 'assembling' ? '完成集结与行程' : '抵达'}`;
  return `${factionAt(army.factionId).name} · ${troopLabel(army.troops)} · ${armyPhaseLabel(army.phase)} · ${timing}`;
}
function armyCard(army: ConflictArmy, inspect = false): HTMLElement {
  const state=getState();
  const card = node('article', '', 'conflict-card'); card.dataset.conflictArmy = army.id;
  card.dataset.armyPhase = army.phase; card.dataset.armyEta = String(armyRemainingDays(army));
  card.append(node('h3', `${cityNameAt(army.sourceCityId,state.date)} → ${cityNameAt(army.targetCityId,state.date)}`), node('p', armySummary(army)),
    node('p', `统军：${army.commanderId ? recruitProfile(army.commanderId)?.name ?? '军府统军' : '军府统军'} · 军队 ${army.id}`),
    node('p', `行军道路：${army.path.map(id => cityNameAt(id,state.date)).join(' → ') || '等待行程'}`),
    node('p', `出兵来源：${army.contributions.map(source => `${cityNameAt(source.cityId,state.date)} ${troopLabel(source.troops)}`).join('、') || '起兵军队'}`));
  if (inspect) card.append(button('查看军队详情', () => showConflictArmy(army.id)));
  return card;
}
export function showConflictArmy(armyId: string): void {
  const army = getState().worldConflict?.armies.find(item => item.id === armyId); if (!army) return;
  const panel = node('section', '', 'overlay-panel conflict-panel conflict-army-detail'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '在外军队详情');
  const header = node('header', '', 'conflict-header'); header.append(node('h2', '在外军队'));
  const exit = button('返回', () => close()); header.append(exit); panel.append(header, armyCard(army));
  const close = openInspection(panel); exit.focus({ preventScroll: true });
}
export function showConflictPanel(onClose?: () => void): void {
  if (document.querySelector('.conflict-panel')) return;
  const panel = node('section', '', 'overlay-panel conflict-panel'); panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '天下局势与战报');
  const header = node('header', '', 'conflict-header'), heading = node('div');
  heading.append(node('h1', '天下局势'), node('p', `${dateLabel(getState().date)} · 城池与军队随游戏日期推进`));
  const exit = button('返回地图', () => close()); header.append(heading, exit);
  const body = node('div', '', 'conflict-body'); panel.append(header, body);
  const close = openInspection(panel, onClose);
  let tab: 'cities' | 'armies' | 'reports' = 'cities', factionId = '', cityId = '';
  function render(): void {
    const state = getState(), world = state.worldConflict; body.replaceChildren();
    if (state.conflictRecovery) { body.append(createConflictRecovery(render)); return; }
    if (!world) { body.append(node('p', '天下局势尚未接入，城中人物与行旅仍可查看。')); return; }
    if(world.playerReserve!==undefined)body.append(node('p',`主角军府 · 随行预备兵 ${world.playerReserve} 人 · 已有 ${WORLD_CITIES.filter(c=>world.cities[c.id].factionId==='player').length} 城`,'trade-muted'));
    const tabs = node('nav', '', 'conflict-tabs'); tabs.setAttribute('aria-label', '天下局势分类');
    for (const [id, text] of [['cities', '城池势力'], ['armies', '在外军队'], ['reports', '天下战报']] as const) {
      const control = button(text, () => { tab = id; render(); body.querySelector<HTMLButtonElement>(`[data-conflict-tab="${id}"]`)?.focus(); });
      control.dataset.conflictTab = id; control.setAttribute('aria-pressed', String(tab === id)); tabs.append(control);
    } body.append(tabs);
    const filters = node('div', '', 'conflict-filters'), label = node('label', '筛选势力'), select = node('select');
    select.id = 'conflict-faction-filter'; label.htmlFor = select.id;
    for (const faction of [{ id: '', name: '全部势力' }, ...CONFLICT_FACTIONS]) { const option = node('option', faction.name); option.value = faction.id; select.append(option); }
    select.value = factionId; select.addEventListener('change', () => { factionId = select.value; render(); body.querySelector<HTMLSelectElement>('#conflict-faction-filter')?.focus(); }); filters.append(label, select);
    if (tab === 'reports') {
      const cityLabel = node('label', '筛选城池'), cities = node('select'); cities.id = 'conflict-city-filter'; cityLabel.htmlFor = cities.id;
      for (const city of [{ id: '', name: '全部城池' }, ...WORLD_CITIES]) { const option = node('option', city.id?cityNameAt(city.id,state.date):city.name); option.value = city.id; cities.append(option); }
      cities.value = cityId; cities.addEventListener('change', () => { cityId = cities.value; render(); body.querySelector<HTMLSelectElement>('#conflict-city-filter')?.focus(); }); filters.append(cityLabel, cities);
    } body.append(filters);
    const list = node('div', '', 'conflict-list'); body.append(list);
    if (tab === 'cities') {
      const cities = WORLD_CITIES.filter(city => !factionId || world.cities[city.id].factionId === factionId);
      body.insertBefore(node('p', `当前共${cities.length}座城池。兵力为实际城内存量，已扣除在外军队。`, 'trade-muted'), list);
      for (const city of cities) {
        const stock = world.cities[city.id], faction = factionAt(stock.factionId), card = node('article', '', 'conflict-card'); card.dataset.conflictCity = city.id;
        const owner = node('span', faction.name, 'conflict-flag'); owner.style.borderColor = faction.color;
        card.append(node('h3', `${cityNameAt(city.id,state.date)} · ${city.prefecture}${state.currentCityId === city.id && !state.journey ? ' · 所在' : ''}`), owner, node('p', `城内守军 ${troopLabel(stock.troops)}`));
        const siege = world.armies.find(army => army.targetCityId === city.id && army.phase === 'sieging');
        if (siege) card.append(button(`${factionAt(siege.factionId).name}围城中 · 查看军队`, () => showConflictArmy(siege.id)));
        list.append(card);
      }
    } else if (tab === 'armies') {
      for (const army of world.armies.filter(army => !factionId || army.factionId === factionId)) list.append(armyCard(army, true));
    } else {
      list.classList.add('is-reports');
      for (const report of filterConflictReports(world.reports, { cityId, factionId })) {
        const card = node('article', '', 'conflict-card'); card.dataset.conflictReport = String(report.id);
        card.append(node('h3', `${conflictDateLabel(report.day)} · ${cityNameAt(report.cityId,state.date)}`), node('p', `${factionAt(report.factionId).name}${report.opponentFactionId ? ` / ${factionAt(report.opponentFactionId).name}` : ''}`), node('p', report.text));
        if (report.troops !== undefined || report.losses !== undefined) card.append(node('p', `${report.troops !== undefined ? `兵力 ${troopLabel(report.troops)}` : ''}${report.losses !== undefined ? ` · 损失 ${troopLabel(report.losses)}` : ''}`, 'trade-muted'));
        list.append(card);
      }
    }
    if (!list.children.length) list.append(node('p', tab === 'armies' ? '此时没有符合筛选的在外军队。' : '暂无符合筛选的战报。', 'conflict-empty'));
    body.append(node('p', '本作以历史背景编排开局，此后的争夺为动态架空局势。查看面板不消耗日期；玩家仍以个人队伍行旅。', 'trade-muted'));
  }
  render(); exit.focus({ preventScroll: true });
}
