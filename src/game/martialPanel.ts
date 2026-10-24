import './martialPanel.css';
import { clearInspections, openInspection } from './inspectionOverlay';
import { canInteractPerson, canManageParty, gameDayNumber } from './recruitment';
import { personName } from './heroName';
import { martialAt, martialForPerson, type MartialSkill } from './martialCatalog';
import { canRequestTeaching, canStartDuel, equipMartial, requestTeaching, startDuel, teachingChance } from './martial';
import { getState, setState } from './runtime';
import type { GameState } from './state';
import { dateLabel } from './history';

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
function button(text: string, action: () => void, disabled = false): HTMLButtonElement {
  const node = element('button', text, 'party-action'); node.type = 'button'; node.disabled = disabled; node.addEventListener('click',action); return node;
}
function skillDescription(skill: MartialSkill, state: GameState): HTMLElement {
  const body = element('div', '', 'martial-description');
  body.append(element('h3', `《${skill.name}》 · ${personName(skill.personId,state)}`), element('p',skill.description),
    element('p','主动招式 · 消耗本次行动 · 冷却3个完整轮次 · 每场重置','company-note'));
  const source = element('details'); source.append(element('summary', skill.story ? '故事取材 · 本作设计' : '经历取材 · 本作设计'),
    element('p',skill.basis),element('p',`依据：${skill.source}。本作名称与效果不代表真实武学秘籍。`)); body.append(source); return body;
}
function unavailable(state: GameState, id: string): string {
  const skill = martialForPerson(id);
  if (!skill) return '此人物仅有基础行动与原有绝招。';
  if (skill.readOnly) return '仅供资料查看，不开放相遇、切磋或传授。';
  if (state.phase === 'battle') return '战斗中仅供查看；战后可请教或调整装配。';
  if (!canInteractPerson(state,id)) return '须在当前城市真实相遇或已经同行；途中和出征时不能隔城请教。';
  if (state.martial.learned.includes(skill.id)) return `已掌握《${skill.name}》，可在主角武学中装配；再次切磋不重复授予。`;
  if (state.martial.teachingDates[id] && gameDayNumber(state.martial.teachingDates[id]) === gameDayNumber(state.date)) return '今日已请教；下一个游戏日可以再次尝试。';
  if ((state.relationships[id]?.affinity ?? 0) < 80) return '亲密80后可请教；也可切磋，战胜后有40%概率获传。';
  return '请教消耗1日；失败保留亲密。切磋独立消耗1日，胜后40%概率获传。';
}

/** A reachable card shared by character details, growth and the martial library. */
export function createMartialCard(id: string, readOnly = false): HTMLElement {
  id = id.replace(/^enemy:/,'');
  const card = element('section','','character-martial'); card.dataset.martialPerson = id;
  function render(): void {
    const state = getState(), skill = martialForPerson(id); card.replaceChildren();
    card.append(element('h2',id === 'traveler' ? `主角武学 · 已学${state.martial.learned.length}种 · 装配${state.martial.equipped.length}/3` : '专属武学'));
    if (id === 'traveler') {
      const equipped = state.martial.equipped.map(key => martialAt(key)?.name).filter(Boolean);
      card.append(element('p',equipped.length ? `已装配：${equipped.map(name => `《${name}》`).join('、')}` : '尚未装配武学。向具名人物请教，或在一对一切磋中获胜后取得秘籍。'));
      card.append(button(readOnly || !canManageParty(state) ? '查看已学武学' : '查看与装配武学',() => showMartialPanel(render,readOnly))); return;
    }
    if (!skill) { card.append(element('p',unavailable(state,id))); return; }
    card.append(skillDescription(skill,state));
    const known = state.martial.learned.includes(skill.id), affinity = state.relationships[id]?.affinity ?? 0;
    card.append(element('p',`${known ? '已掌握' : '尚未学会'} · 亲密${affinity}/100 · 请教传授率${affinity >= 80 ? `${teachingChance(state,id)}%` : '需亲密80'} · 切磋胜后40%`));
    card.append(element('p',unavailable(state,id),'company-note'));
    if (!skill.readOnly) {
      const actions = element('div','','party-actions');
      actions.append(button('请教武学 · 1日',() => {
        const current = getState(), next = requestTeaching(current,id);
        if (next !== current) {
          setState(next);
          window.dispatchEvent(new CustomEvent('world-state-changed'));
        }
        render();
      },readOnly || !canRequestTeaching(state,id)),button('切磋 · 1对1 · 1日',() => {
        const current = getState(), next = startDuel(current,id); if (next === current) { render(); return; }
        setState(next); clearInspections(); window.dispatchEvent(new CustomEvent('start-duel'));
      },readOnly || !canStartDuel(state,id)));
      card.append(actions);
    }
    const last = state.martial.lastResult;
    if (last?.teacherId === id) {
      const result = element('p',last.outcome === 'learned' ? `获得传授：已学会《${skill.name}》，可在主角武学中装配。` : last.outcome === 'declined' ? '此次未获传授，判定已保存。' : last.outcome === 'known' ? `已经掌握《${skill.name}》。` : '切磋结束，未获传授。','martial-feedback');
      result.setAttribute('aria-live','polite'); card.append(result);
    }
  }
  render(); return card;
}

export function showMartialPanel(onClose?: () => void, readOnly = false): void {
  const root = document.querySelector('#overlay-root'); if (!root || root.querySelector('.martial-panel')) return;
  const panel = element('section','','overlay-panel company-panel martial-panel');
  panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-label','主角武学');
  const header = element('header','','company-header'), closeButton = button('返回',() => close());
  header.append(element('h1','主角武学'),closeButton); panel.append(header);
  const body = element('div','','company-body'); panel.append(body);
  const close = openInspection(panel,onClose);
  function render(): void {
    const state = getState(); body.replaceChildren();
    body.append(element('p',`永久已学${state.martial.learned.length}种 · 当前装配${state.martial.equipped.length}/3。战外可更换，下一场战斗生效。`,'company-summary'));
    if (readOnly || !canManageParty(state)) body.append(element('p','当前仅可查看，战后可更换装配。','company-notice'));
    if (!state.martial.learned.length) body.append(element('p','尚未学会武学。人物详情中可请教或发起切磋；亲密不足80时也能通过切磋获传。'));
    for (const id of state.martial.learned) {
      const skill = martialAt(id); if (!skill) continue;
      const card = element('article','','character-martial'); card.dataset.skill = id;
      card.append(skillDescription(skill,state));
      const equipped = state.martial.equipped.includes(id);
      card.append(element('p',`${equipped ? '已装配' : '未装配'} · 师承${personName(skill.personId,state)}`));
      const acquisition = state.martial.acquisitions[id];
      if (acquisition) card.append(element('p',`取得：${dateLabel(acquisition.date)} · ${acquisition.kind === 'teaching' ? '关系请教' : '切磋战胜传授'}`,'company-note'));
      const toggle = button(equipped ? `卸下《${skill.name}》` : `装配《${skill.name}》`,() => {
        const current = getState(), ids = current.martial.equipped;
        setState(equipMartial(current,ids.includes(id) ? ids.filter(key => key !== id) : [...ids,id])); render();
        body.querySelector<HTMLButtonElement>(`[data-skill="${id}"] button`)?.focus({preventScroll:true});
      },readOnly || !canManageParty(state) || !equipped && state.martial.equipped.length >= 3);
      card.append(toggle); body.append(card);
    }
  }
  render(); closeButton.focus({preventScroll:true});
}
