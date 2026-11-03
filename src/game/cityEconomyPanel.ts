import type { GameState } from './state';
import { getState, setState } from './runtime';
import { openInspection } from './inspectionOverlay';
import { WORLD_CITIES, cityNameAt } from './world';
import { dateLabel } from './history';
import { conflictDateLabel } from './conflictView';
import { factionAt } from './worldConflictData';
import { personName } from './heroName';
import {
  cityFinanceSummary, campFinanceSummary, donateCityCoins, purchaseCityGrain,
  developCity, setCampFundingCity, acknowledgeFundingNotice,
} from './cityEconomy';
import './cityEconomyPanel.css';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
function button(label: string, action: () => void, disabled = false, quiet = false) {
  const node = el('button', label, `trade-button${quiet ? ' is-quiet' : ''}`); node.type = 'button';
  node.disabled = disabled; node.addEventListener('click', action); return node;
}
const number = (value: number) => value.toLocaleString('zh-CN');
const signed = (value: number) => `${value > 0 ? '+' : ''}${number(value)}`;
function metrics(entries: readonly (readonly [string, string])[]): HTMLElement {
  const list = el('dl', '', 'finance-metrics');
  for (const [name, value] of entries) { const item = el('div'); item.append(el('dt', name), el('dd', value)); list.append(item); }
  return list;
}

export function pendingFundingMessage(state: GameState): string | undefined {
  const notice = state.cityEconomy?.fundingNotice;
  return notice ? `${cityNameAt(notice.cityId,state.date)}供养城已于${conflictDateLabel(notice.day)}失守，随行军费改由个人铜钱和军需承担，请留意下次月结。` : undefined;
}

function fundingNotice(state: GameState, onChange: () => void): HTMLElement | undefined {
  const text = pendingFundingMessage(state); if (!text) return;
  const host = el('section', '', 'finance-warning'); host.setAttribute('aria-label', '供养城失守提醒');
  host.append(el('p', text), button('已知晓付款变更', () => { setState(acknowledgeFundingNotice(getState())); onChange(); }, false, true));
  return host;
}

export function renderCityEconomySummary(state: GameState, cityId: string, onOpen: () => void): HTMLElement {
  const host = el('section', '', 'finance-summary'); host.setAttribute('aria-label', '城市钱粮概况');
  const summary = cityFinanceSummary(state, cityId);
  if (!summary) { host.append(el('p', '城市府库暂不可用，请先恢复天下局势。', 'trade-muted')); return host; }
  host.append(metrics([
    ['府库铜钱', number(summary.coins)], ['府库粮草', number(summary.grain)],
    ['商业 / 农业', `${summary.commerce} / ${summary.agriculture}`], ['城市士气', `${summary.morale} / 100`],
  ]));
  if (!summary.coins || !summary.grain) host.append(el('p', `钱粮告急 · 每日士气${!summary.coins && !summary.grain ? '−8' : !summary.grain ? '−5' : '−3'}`, 'finance-warning'));
  host.append(button(summary.owned ? '府库 / 发展 / 月度收支' : '查看城市府库与收支', onOpen, false, true));
  return host;
}

export function renderCampFinance(state: GameState, onChange: () => void): HTMLElement {
  const summary = campFinanceSummary(state), host = el('section', '', 'world-card camp-finance');
  host.setAttribute('aria-label', '随行军费'); host.append(el('h2', '随行军费'));
  const pending = fundingNotice(state,onChange); if (pending) host.append(pending);
  const source = summary.fundingCityId ? `${cityNameAt(summary.fundingCityId, state.date)}府库` : '个人财货';
  host.append(metrics([
    ['随行士兵', `${number(summary.soldiers)}人`], ['军队士气', `${summary.morale} / 100`],
    ['每月铜钱', number(summary.dueCoins)], [summary.fundingCityId ? '每月粮草' : '每月军需', number(summary.fundingCityId ? summary.dueGrain : summary.dueSupplies)],
  ]));
  host.append(el('p', `供养${summary.companions}位同行角色，主角不领俸禄。预备兵与已配属士兵合并计费。`, 'trade-muted'));
  const label = el('label', '付款来源', 'finance-field');
  const select = el('select', '', 'world-destination-select'); select.setAttribute('aria-label', '随行军费付款来源');
  const personal = el('option', '个人铜钱 / 军需'); personal.value = ''; select.append(personal);
  for (const city of WORLD_CITIES.filter(city => state.worldConflict?.cities[city.id]?.factionId === 'player')) {
    const option = el('option', `${cityNameAt(city.id, state.date)}府库`); option.value = city.id; select.append(option);
  }
  select.value = summary.fundingCityId ?? ''; select.disabled = state.phase !== 'overworld' || !!state.journey || !!state.activeBattle;
  select.addEventListener('change', () => {
    const before = getState(), next = setCampFundingCity(before, select.value || undefined);
    if (next !== before) { setState(next); onChange(); }
  });
  label.append(select); host.append(label, el('p', `目前由${source}支付，每月1日结算。城市供养时不再扣个人军需。`, 'trade-muted'));
  const latestPayment = summary.records.at(-1);
  const shortageUnit = latestPayment ? latestPayment.recruitmentReason.startsWith('个人') ? '军需' : '粮草' : '供给单位（按欠供当期记录）';
  if (summary.unpaidCoins || summary.unpaidGrain) host.append(el('p', `本月欠饷${number(summary.unpaidCoins)}钱 / 缺供${number(summary.unpaidGrain)}${shortageUnit}；下次月结足额支付后解除欠供状态。`, 'finance-warning'));
  if (summary.records.length) {
    const records = el('details', '', 'finance-records'); records.append(el('summary', `随行军费月结 · 最近${summary.records.length}期`));
    for (const record of [...summary.records].reverse()) {
      const item = el('article', '', 'finance-record');
      const unit = record.recruitmentReason.startsWith('个人') ? '军需' : '粮草';
      item.append(el('h3', conflictDateLabel(record.day)), el('p', `${record.recruitmentReason}：实付${number(record.paid.coins)}钱、${number(record.paid.grain)}${unit}；缺口${number(record.shortfall.coins)}钱、${number(record.shortfall.grain)}${unit}。`)); records.append(item);
    }
    host.append(records);
  }
  return host;
}

export function showCityEconomy(initialCityId: string, onClose?: () => void): void {
  const panel = el('section', '', 'overlay-panel city-panel city-finance-panel'); panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '城市府库');
  const header = el('header', '', 'city-header'), heading = el('div'), title = el('h1'), subtitle = el('p');
  heading.append(title, subtitle); header.append(heading, button('返回', () => close(), false, true));
  const body = el('div', '', 'city-body'); panel.append(header, body); const close = openInspection(panel, onClose);
  let cityId = initialCityId, tab: 'overview' | 'treasury' | 'development' = 'overview', feedback = '';

  function render(focusLabel?: string): void {
    const state = getState(), summary = cityFinanceSummary(state, cityId), city = state.worldConflict?.cities[cityId];
    title.textContent = `${cityNameAt(cityId, state.date)} · ${city ? factionAt(city.factionId).name : '府库'}`;
    subtitle.textContent = `${dateLabel(state.date)} · 个人铜钱 ${number(state.economy.coins)} · 府库独立核算`;
    const scroll = panel.scrollTop; body.replaceChildren();
    const choose = el('label', '查看城池', 'finance-city-choice'), select = el('select', '', 'world-destination-select'); select.setAttribute('aria-label', '查看城市府库');
    for (const c of WORLD_CITIES) {
      const option = el('option', `${cityNameAt(c.id, state.date)}${state.worldConflict?.cities[c.id]?.factionId === 'player' ? ' · 我方' : ''}`); option.value = c.id; select.append(option);
    }
    select.value = cityId; select.addEventListener('change', () => { cityId = select.value; feedback = ''; render('查看城市府库'); }); choose.append(select); body.append(choose);
    const pending = fundingNotice(state,() => render('查看城市府库')); if (pending) body.append(pending);
    if (!summary) { body.append(el('p', '城市府库暂不可用，请先恢复天下局势。', 'trade-muted')); return; }
    const tabs = el('nav', '', 'trade-tabs'); tabs.setAttribute('aria-label', '府库事务');
    for (const [key, name] of [['overview', '城市总览'], ['treasury', '府库与月结'], ['development', '商业与农业']] as const) {
      const b = button(name, () => { tab = key; feedback = ''; render(name); }, false, true); b.setAttribute('aria-pressed', String(tab === key)); tabs.append(b);
    }
    body.append(tabs);
    const notice = el('p', feedback, 'trade-feedback'); notice.setAttribute('role', 'status'); body.append(notice);
    const locked = !summary.owned || state.phase !== 'overworld' || !!state.journey || !!state.activeBattle || !!state.conflictRecovery;
    const transact = (action: (current: GameState) => GameState, failure: string, focus?: string) => {
      const before = getState(), next = action(before);
      if (next === before) { feedback = failure; render(focus); return; }
      setState(next); feedback = next.travelNotice ?? '已完成。'; render(focus);
    };
    if (tab === 'overview') {
      body.append(metrics([
        ['府库铜钱', number(summary.coins)], ['府库粮草', number(summary.grain)], ['城市士气', `${summary.morale} / 100`],
        ['城内守军', `${number(city?.troops ?? 0)}人`], ['商业', `${summary.commerce} / 100`], ['农业', `${summary.agriculture} / 100`],
        ['月入钱 / 粮', `${number(summary.income.coins)} / ${number(summary.income.grain)}`],
        ['月净钱 / 粮', `${signed(summary.net.coins)} / ${signed(summary.net.grain)}`],
      ]));
      body.append(el('p', '每月1日先收入，后支付军饷和俸禄。铜钱为0每日士气−3，粮草为0每日−5，两者同时为0每日−8。供给正常每日恢复1，恢复至80。', 'finance-rule'));
      body.append(el('p', summary.owned ? '本城由主角军府管理，可捐资补库、采购粮草和投资发展。' : '本城由其他势力管理，可查看收支；攻占后可管理府库与发展。', 'trade-muted'));
    }
    if (tab === 'treasury') {
      body.append(metrics([['现存铜钱', number(summary.coins)], ['现存粮草', number(summary.grain)]]));
      const table = el('table', '', 'finance-table'), thead = el('thead'), tr = el('tr');
      tr.append(el('th', '月度项目'), el('th', '铜钱'), el('th', '粮草')); thead.append(tr); table.append(thead);
      const tbody = el('tbody');
      for (const [name, amount, income] of [
        ['商业 / 农业产出', summary.income, true], ['城内守军', summary.expenses.garrison, false], ['在外军队', summary.expenses.expedition, false],
        ['官员俸禄', summary.expenses.officials, false], ['随行军队', summary.expenses.camp, false],
      ] as const) {
        const row = el('tr'); row.append(el('th', name), el('td', `${income ? '+' : '−'}${number(amount.coins)}`), el('td', `${income ? '+' : '−'}${number(amount.grain)}`)); tbody.append(row);
      }
      const total = el('tr'); total.append(el('th', '预计月净额'), el('td', signed(summary.net.coins)), el('td', signed(summary.net.grain))); tbody.append(total); table.append(tbody); body.append(table);
      body.append(el('p', summary.monthsRemaining === null ? '按当前收支，钱粮可持续供给。' : `按当前收支，预计还能维持约${summary.monthsRemaining.toFixed(1)}个月。`, 'finance-rule'));
      const names = summary.officialIds.map(id => personName(id, state)).join('、');
      body.append(el('p', `计薪官员${summary.officialIds.length}人：${names || '暂无'}。同人多职只领一份俸禄。`, 'trade-muted'));
      const actions = el('div', '', 'finance-management');
      const donation = el('label', '个人捐资（铜钱）', 'finance-field'), amount = el('input', '', 'trade-input'); amount.type = 'number'; amount.min = '1'; amount.max = String(state.economy.coins); amount.step = '1'; amount.value = String(Math.min(1000, state.economy.coins)); amount.setAttribute('aria-label', '捐资铜钱'); donation.append(amount);
      actions.append(donation, button('捐入府库', () => transact(s => donateCityCoins(s, cityId, Number(amount.value)), '捐资未完成：请输入不超过个人铜钱的正整数，并确认本城仍属我方。', '捐资铜钱'), locked || state.economy.coins < 1));
      const procurement = el('label', '采购预算（府库铜钱）', 'finance-field'), budget = el('input', '', 'trade-input'); budget.type = 'number'; budget.min = '1'; budget.max = String(summary.coins); budget.step = '1'; budget.value = String(Math.min(1000, summary.coins)); budget.setAttribute('aria-label', '购粮预算'); procurement.append(budget);
      actions.append(procurement, button('采购粮草 · 1钱换5粮', () => transact(s => purchaseCityGrain(s, cityId, Number(budget.value)), '采购未完成：请输入府库可负担的正整数预算，并确认本城仍属我方。', '购粮预算'), locked || summary.coins < 1));
      body.append(actions);
      const records = el('details', '', 'finance-records'); records.open = true; records.append(el('summary', `月结记录 · 最近${summary.records.length}期`));
      if (!summary.records.length) records.append(el('p', '接入后尚未到下一次月初，不追扣此前费用。', 'trade-muted'));
      for (const record of [...summary.records].reverse()) {
        const entry = el('article', '', 'finance-record');
        entry.append(el('h3', conflictDateLabel(record.day)), el('p', `收入${number(record.income.coins)}钱 / ${number(record.income.grain)}粮；应付${number(record.due.coins)}钱 / ${number(record.due.grain)}粮；实付${number(record.paid.coins)}钱 / ${number(record.paid.grain)}粮。`));
        if (record.shortfall.coins || record.shortfall.grain) entry.append(el('p', `未付${number(record.shortfall.coins)}钱 / ${number(record.shortfall.grain)}粮；记录当期缺口，不自动追债。`, 'finance-warning'));
        entry.append(el('p', `自动募兵${record.recruited}人，花费${record.recruitmentCost}钱。${record.recruitmentReason}`, 'trade-muted')); records.append(entry);
      }
      body.append(records);
    }
    if (tab === 'development') {
      const grid = el('div', '', 'trade-grid');
      for (const [key, name, production, unit] of [['commerce', '商业', summary.commerce * 40, '铜钱'], ['agriculture', '农业', summary.agriculture * 200, '粮草']] as const) {
        const card = el('article', '', 'trade-card'); card.append(el('h2', name), metrics([[`${name}等级`, `${summary[key]} / 100`], ['当前月产出', `${number(production)}${unit}`]]));
        card.append(el('p', `投资1000府库铜钱，耗时10日，${name}+${Math.min(5, 100 - summary[key])}；期间照常结算战争、军饷和钱粮。`));
        card.append(button(`发展${name} · 1000钱 / 10日`, () => transact(s => developCity(s, cityId, key), '发展未完成：需要我方城池、1000府库铜钱、属性未满且历法尚余10日。', `发展${name} · 1000钱 / 10日`), locked || summary.coins < 1000 || summary[key] >= 100)); grid.append(card);
      }
      body.append(grid, el('p', '商业每点每月产40铜钱，农业每点每月产200粮草。发展期间城池失守则项目不生效，已投入费用不返还。', 'finance-rule'));
    }
    if (locked) body.append(el('p', !summary.owned ? '仅可管理主角军府所属城池。' : '请先结束行程或战斗，再办理府库事务。', 'trade-muted'));
    panel.scrollTop = scroll;
    if (focusLabel) [...panel.querySelectorAll<HTMLElement>('button, select, input')].find(node => node.getAttribute('aria-label') === focusLabel || node.textContent === focusLabel)?.focus({ preventScroll: true });
  }
  render(); header.querySelector('button')?.focus();
}
