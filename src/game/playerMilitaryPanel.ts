import './tradeUi.css';
import './playerMilitaryPanel.css';
import { openInspection } from './inspectionOverlay';
import { getState, setState } from './runtime';
import type { GameState } from './state';
import { advanceDays, dateLabel } from './history';
import { gameDayNumber } from './recruitment';
import { cityNameAt } from './world';
import { factionAt } from './worldConflictData';
import {
  COST_PER_SOLDIER, PLAYER_MAX_RESERVE, RECRUIT_UNIT,
  playerMilitaryStatus, playerSiegePreview, recruitPlayerTroops,
  reinforcePlayerCity, startPlayerSiege, withdrawPlayerTroops,
} from './playerMilitary';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
function button(text: string, action: () => void, quiet = false): HTMLButtonElement {
  const node = element('button', text, `trade-button${quiet ? ' is-quiet' : ''}`);
  node.type = 'button'; node.addEventListener('click', action); return node;
}
function quantity(id: string, label: string, value: number, step: number): { row: HTMLElement; input: HTMLInputElement } {
  const row = element('div', '', 'trade-quantity'), input = element('input', '', 'trade-input');
  input.type = 'number'; input.inputMode = 'numeric'; input.min = String(step); input.step = String(step);
  input.max = String(PLAYER_MAX_RESERVE); input.value = String(value); input.id = id;
  const title = element('label', label); title.htmlFor = id; row.append(title, input, element('span', '人'));
  return { row, input };
}

/** City troop management and strategic siege; viewing never advances the world. */
export function showPlayerMilitary(onChange?: () => void): void {
  const root = document.querySelector('#overlay-root');
  if (!root || root.querySelector('.player-military-panel')) return;
  const initial = playerMilitaryStatus(getState());
  let recruitValue = String(RECRUIT_UNIT);
  let deployValue = String(initial.reserve >= 100 ? Math.min(initial.reserve, PLAYER_MAX_RESERVE) : 100);
  let feedback = '';
  let reviewed: { state: GameState; count: number } | undefined;
  const panel = element('section', '', 'overlay-panel player-military-panel');
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', '募兵与攻城');
  const header = element('header', '', 'city-header'), heading = element('div');
  heading.append(element('p', '军府 · 城池争夺', 'trade-eyebrow'), element('h1', '募兵与攻城'));
  const exit = button('返回', () => close(), true); header.append(heading, exit);
  const body = element('div', '', 'city-body'); panel.append(header, body);
  const close = openInspection(panel, onChange);

  function transact(change: (state: GameState, count: number) => GameState, count: number, focusId: string): void {
    const before = getState(), next = change(before, count);
    reviewed = undefined;
    if (next === before) {
      feedback = playerMilitaryStatus(before).reason || '未能执行，请检查人数、铜钱、粮草与本城兵力。';
    } else {
      setState(next);
      feedback = next.travelNotice || '军务已完成。';
      window.dispatchEvent(new Event('world-state-changed'));
    }
    render();
    panel.querySelector<HTMLElement>(`#${focusId}`)?.focus({ preventScroll: true });
  }

  function render(): void {
    const state = getState(), status = playerMilitaryStatus(state);
    const currentCity = cityNameAt(state.currentCityId, state.date);
    body.replaceChildren();
    body.append(element('p', `${dateLabel(state.date)} · ${currentCity}`, 'military-calendar'));
    const summary = element('section', '', 'garrison-summary'); summary.setAttribute('aria-label', '我的军队概况');
    summary.append(element('h2', '我的军队'));
    const totals = element('dl', '', 'garrison-totals');
    const stock = state.worldConflict?.cities[state.currentCityId];
    for (const [title, value] of [
      ['随行预备兵', `${status.reserve} / ${PLAYER_MAX_RESERVE} 人`],
      ['角色所部', `${state.worldConflict?.playerAssigned??0} 人（已从预备兵调出）`],
      ['本城归属', status.currentOwned ? '我方' : stock ? factionAt(stock.factionId).name : '天下局势暂停'],
      ['本城守军', `${status.currentTroops} 人`],
      ['铜钱 / 粮草', `${state.economy.coins} / ${state.supplies}`],
    ]) {
      const item = element('div'); item.append(element('dt', title), element('dd', value)); totals.append(item);
    }
    summary.append(totals, element('p', '预备兵随主角行旅；城内驻军独立守城。攻城与天下战争会产生实际兵力损失。', 'trade-muted'));
    body.append(summary);
    const notice = element('p', feedback, 'trade-feedback'); notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite'); body.append(notice);
    if (!status.canOperate) body.append(element('p', status.reason, 'military-lock'));

    const grid = element('div', '', 'trade-grid'); body.append(grid);
    const recruitCard = element('section', '', 'trade-card'); recruitCard.append(element('h2', '招募预备兵'));
    recruitCard.append(element('p', `每 ${RECRUIT_UNIT} 人为一批，每人 ${COST_PER_SOLDIER} 铜钱；招募消耗 1 日，期间天下战争推进。`));
    const recruit = quantity('military-recruit-count', '招募人数', RECRUIT_UNIT, RECRUIT_UNIT);
    recruit.input.value = recruitValue; recruitCard.append(recruit.row);
    const recruitNote = element('p', '', 'trade-muted'); recruitNote.id = 'military-recruit-note'; recruit.input.setAttribute('aria-describedby', recruitNote.id);
    const recruitButton = button('确认募兵', () => transact(recruitPlayerTroops, Number(recruit.input.value), recruit.input.id));
    recruitCard.append(recruitNote, recruitButton); grid.append(recruitCard);

    const deployCard = element('section', '', 'trade-card'); deployCard.append(element('h2', status.currentOwned ? '调拨本城驻军' : '攻打当前城池'));
    const deploy = quantity('military-deploy-count', status.currentOwned ? '调拨人数' : '出征人数', 100, 1);
    deploy.input.value = deployValue; deploy.input.min = status.currentOwned ? '1' : '100'; deployCard.append(deploy.row);
    const deployNote = element('p', '', 'trade-muted'); deployNote.id = 'military-deploy-note'; deploy.input.setAttribute('aria-describedby', deployNote.id);
    const deployActions = element('div', '', 'trade-actions'), confirmation = element('section', '', 'military-confirmation');
    confirmation.setAttribute('aria-label', '确认攻城军令');
    deployCard.append(deployNote, deployActions, confirmation); grid.append(deployCard);

    function updateRecruit(): void {
      recruitValue = recruit.input.value;
      const count = Number(recruitValue);
      let reason = !status.canOperate ? status.reason : '';
      if (!reason && (!recruit.input.checkValidity() || !Number.isSafeInteger(count) || count < RECRUIT_UNIT || count % RECRUIT_UNIT !== 0)) reason = `请输入 ${RECRUIT_UNIT} 的正整数倍。`;
      if (!reason && count > PLAYER_MAX_RESERVE - status.reserve - (state.worldConflict?.playerAssigned??0)) reason = `随行兵力（含角色所部）最多 ${PLAYER_MAX_RESERVE} 人，还可招募 ${Math.max(0, PLAYER_MAX_RESERVE - status.reserve - (state.worldConflict?.playerAssigned??0))} 人。`;
      if (!reason && count * COST_PER_SOLDIER > state.economy.coins) reason = '铜钱不足。';
      if (!reason && gameDayNumber(advanceDays(state.date, 1)) - gameDayNumber(state.date) !== 1) reason = '剩余历法天数不足以完成招募。';
      recruitNote.textContent = reason || `招募 ${count} 人，支出 ${count * COST_PER_SOLDIER} 铜钱，消耗 1 日。`;
      recruitButton.disabled = Boolean(reason);
    }
    function updateDeploy(): void {
      deployValue = deploy.input.value;
      const count = Number(deployValue);
      const valid = deploy.input.checkValidity() && Number.isSafeInteger(count) && count > 0;
      deployActions.replaceChildren(); confirmation.replaceChildren(); confirmation.hidden = true;
      if (status.currentOwned) {
        const availableWithdraw = Math.min(status.availableWithdraw, PLAYER_MAX_RESERVE - status.reserve - (state.worldConflict?.playerAssigned??0));
        deployNote.textContent = `从预备兵补入本城，或从本城提出预备兵。提兵后至少留守 2000 人；当前最多可提 ${availableWithdraw} 人。调拨不消耗日期。`;
        if (!valid) deployNote.textContent = '请输入大于 0 的整数人数。';
        const reinforce = button('补入本城', () => transact(reinforcePlayerCity, count, deploy.input.id));
        reinforce.disabled = !status.canOperate || !valid || count > status.reserve || count > PLAYER_MAX_RESERVE - status.currentTroops;
        const withdraw = button('提出预备兵', () => transact(withdrawPlayerTroops, count, deploy.input.id), true);
        withdraw.disabled = !status.canOperate || !valid || count > availableWithdraw;
        deployActions.append(reinforce, withdraw);
        return;
      }
      const preview = playerSiegePreview(state, count);
      deployNote.textContent = valid && count >= 100
        ? `${preview.cityName} · ${factionAt(preview.defenderFactionId).name}守军 ${preview.defenders} 人；我方 ${preview.attackers} 人。消耗粮草 ${preview.foodCost}，历时 ${preview.days} 日。${preview.allowed ? '' : ` ${preview.reason}`}`
        : '请输入至少 100 人的整数兵力。';
      const inspect = button('检视攻城军令', () => {
        if (getState() !== state) { reviewed = undefined; feedback = '局势已经变化，请重新检视攻城军令。'; render(); return; }
        reviewed = { state, count }; updateDeploy(); confirmation.querySelector<HTMLButtonElement>('[data-confirm-siege]')?.focus({ preventScroll: true });
      });
      inspect.disabled = !status.canOperate || !valid || !preview.allowed; deployActions.append(inspect);
      if (!reviewed || reviewed.state !== state || reviewed.count !== count || !preview.allowed) return;
      confirmation.hidden = false;
      confirmation.append(element('h3', `攻城：${preview.cityName}`), element('p', `敌方：${factionAt(preview.defenderFactionId).name} · 当前守军 ${preview.defenders} 人`),
        element('p', `出征 ${preview.attackers} 人 · 粮草 ${preview.foodCost} · 历时 ${preview.days} 日`),
        element('p', '按天下兵力规则自动结算，期间战争推进。双方均会损失士兵；败退兵力返回预备兵，获胜余部驻守城池。'));
      const confirm = button('确认攻城', () => {
        const before = getState();
        if (!reviewed || reviewed.state !== before || reviewed.count !== Number(deploy.input.value)) {
          reviewed = undefined; feedback = '局势已经变化，请重新检视攻城军令。'; render(); return;
        }
        transact(startPlayerSiege, reviewed.count, deploy.input.id);
      }); confirm.dataset.confirmSiege = '';
      const cancel = button('取消军令', () => { reviewed = undefined; updateDeploy(); deployActions.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }); }, true);
      const actions = element('div', '', 'trade-actions'); actions.append(confirm, cancel); confirmation.append(actions);
    }
    recruit.input.addEventListener('input', updateRecruit);
    deploy.input.addEventListener('input', () => { reviewed = undefined; updateDeploy(); });
    updateRecruit(); updateDeploy();
    const owned = element('section', '', 'military-owned'); owned.append(element('h2', `我方城池 · ${status.ownedCityIds.length} 座`));
    if (!status.ownedCityIds.length) owned.append(element('p', '尚无城池。招募预备兵，前往目标城池后可检视攻城军令。', 'trade-muted'));
    else {
      const list = element('ul');
      for (const id of status.ownedCityIds) list.append(element('li', `${cityNameAt(id, state.date)}${id === state.currentCityId ? ' · 所在' : ''} · 守军 ${state.worldConflict?.cities[id]?.troops ?? 0} 人`));
      owned.append(list, element('p', '抵达我方城池后，可在此补充驻军或提出预备兵。', 'trade-muted'));
    }
    body.append(owned);
  }
  render(); exit.focus({ preventScroll: true });
}
