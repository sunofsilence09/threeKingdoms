import './historyPanel.css';
import { HISTORY_EVENTS, HISTORY_SUPPORT, historySupportReason, participateHistory } from './historicalEvents';
import { getState, setState } from './runtime';
import { openInspection } from './inspectionOverlay';
import { cityNameAt } from './world';
import { dateLabel } from './history';
import { personName } from './heroName';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}

/** Reading the journal acknowledges its queue; support rewards require an explicit choice. */
export function showHistoryPanel(refresh: () => void): void {
  if (document.querySelector('#overlay-root .history-panel')) return;
  const state = getState();
  if (state.history?.entries.some(e => !e.read)) {
    setState({ ...state, history: { version: 1, entries: state.history.entries.map(e => ({ ...e, read: true })) } });
  }
  const panel = element('section', '', 'overlay-panel history-panel');
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '历史大事');
  const header = element('header', '', 'history-header');
  const heading = element('div'); heading.append(element('p', '行旅见闻 · 史事与演义', 'history-eyebrow'), element('h1', '历史大事'));
  const back = element('button', '返回地图', 'history-button'); back.type = 'button';
  header.append(heading, back); panel.append(header);
  const body = element('div', '', 'history-body'); panel.append(body);
  const calendar = element('p', '', 'history-calendar'); body.append(calendar);
  body.append(element('p', '史事仅作背景，本局城邑与人物依实际进程。事件按年初入册；史料农历月份另列。军需支线为自选的游戏情节。', 'history-note'));
  const filters = element('div', '', 'history-filters'); body.append(filters);
  const era = element('select'); era.setAttribute('aria-label', '按年代筛选');
  for (const [value, label] of [['all', '全部年代'], ['early', '184—219'], ['middle', '220—249'], ['late', '250—280']]) {
    const option = element('option', label); option.value = value; era.append(option);
  }
  const source = element('select'); source.setAttribute('aria-label', '按来源筛选');
  for (const label of ['全部来源', '史实', '演义']) source.append(element('option', label));
  filters.append(era, source);
  const feedback = element('p', '', 'history-feedback'); feedback.setAttribute('role', 'status'); body.append(feedback);
  const list = element('div', '', 'history-list'); body.append(list);
  const close = openInspection(panel, refresh); back.addEventListener('click', close);

  function render(): void {
    list.replaceChildren();
    const current = getState();
    calendar.textContent = `${dateLabel(current.date)} · 已入册 ${current.history?.entries.length ?? 0} / ${HISTORY_EVENTS.length} 项`;
    for (const event of HISTORY_EVENTS) {
      const entry = current.history?.entries.find(e => e.id === event.id);
      if (!entry || source.value !== '全部来源' && source.value !== event.source ||
          era.value === 'early' && event.year > 219 || era.value === 'middle' && (event.year < 220 || event.year > 249) ||
          era.value === 'late' && event.year < 250) continue;
      const article = element('article', '', 'history-entry'); article.dataset.historyEvent = event.id;
      article.append(element('p', `${event.year}年 · ${event.source}`, 'history-eyebrow'), element('h2', event.title),
        element('p', event.summary), element('p', `${event.region}。史料日期：${event.historicalDate}。${event.placement}。`, 'history-note'),
        element('p', `本局：${entry.participated ? '已参与援助，奖励已结算' : entry.legacy ? '旧档历史回顾' : '未参与'}`, 'history-result'));
      const link = element('a', '查阅原典'); link.href = event.citation; link.target = '_blank'; link.rel = 'noopener noreferrer'; article.append(link);
      const quest = HISTORY_SUPPORT.find(q => q.id === event.id);
      if (quest) {
        const reason = historySupportReason(current, event.id);
        const support = element('section', '', 'history-support');
        support.append(element('h3', quest.title),
          element('p', `地点：${cityNameAt(quest.city, current.date)} · 截止${event.year}年十二月三十日（须在期限内完成）`),
          element('p', `支出 ${quest.cost} 铜钱、${quest.supplies} 军需，耗时 ${quest.days} 日；一次奖励 ${quest.reward} 铜钱、1 军需，${personName(quest.person,current)}好感 +5（上限100）。`),
          element('p', reason ?? '可选择参与，也可继续行旅。', 'history-note'));
        const action = element('button', entry.participated ? '已领取奖励' : '选择参与', 'history-button');
        action.type = 'button'; action.disabled = Boolean(reason);
        action.addEventListener('click', () => {
          const before = getState(), next = participateHistory(before, event.id);
          if (next !== before) { setState(next); feedback.textContent = `${quest.title}已完成，奖励已结算。`; }
          render();
          const replacement = list.querySelector<HTMLButtonElement>(`[data-history-event="${event.id}"] button`);
          if (replacement?.disabled) { feedback.tabIndex = -1; feedback.focus({ preventScroll: true }); }
          else replacement?.focus({ preventScroll: true });
        });
        support.append(action); article.append(support);
      }
      list.append(article);
    }
    if (!list.childElementCount) list.append(element('p', '当前筛选下暂无已入册事件。', 'history-empty'));
  }
  era.addEventListener('change', render); source.addEventListener('change', render);
  render(); back.focus({ preventScroll: true });
}
