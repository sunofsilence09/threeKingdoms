import { personName } from './heroName';
import { openInspection } from './inspectionOverlay';
import { ATTRIBUTE_EFFECTS, ATTRIBUTE_IDS, ATTRIBUTE_LABELS, type AttributeId } from './attributes';
import { makePartyUnit, ULTIMATES } from './combat';
import { experienceToNextLevel, type PartyId } from './growth';
import { canManageParty } from './recruitment';
import { getState, setState } from './runtime';
import { spendSkillPoints } from './state';
import { showCharacterDetails } from './characterDetails';
import type { CombatState } from './combat';
import { createMartialCard } from './martialPanel';

const nameOf = (id: string) => personName(id, getState());

/** Preserve the previous screen's actual DOM, including route selection and callbacks. */
export function showCharacterPanel(onClose?: () => void, combat?: CombatState, initialId = 'traveler'): void {
  const root = document.querySelector('#overlay-root');
  if (!root || root.querySelector('.training-panel')) return;
  const original = getState();
  const readOnly = !canManageParty(original);
  const memberIds = Object.keys(original.party);
  const drafts: Record<PartyId, Partial<Record<AttributeId, number>>> = Object.fromEntries(memberIds.map(id => [id, {}]));
  let selected: PartyId = original.party[initialId] ? initialId : 'traveler';
  const panel = document.createElement('section');
  panel.className = 'overlay-panel training-panel';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '角色成长');
  panel.innerHTML = `<div class="training-header"><div><h1>角色成长</h1><p class="training-note"></p></div><strong class="training-points"></strong></div>
    <nav class="training-tabs" aria-label="选择角色"></nav><button type="button" class="training-detail-open character-detail-open"></button>
    <div class="training-grid"></div>
    <p class="training-ultimate"></p>
    <div class="ability-preview" aria-label="能力预览"></div>
    <p class="training-feedback" aria-live="polite"></p>
    <div class="panel-actions"><button type="button" class="panel-button training-confirm">确认分配</button><button type="button" class="panel-button is-quiet training-cancel">取消</button></div>`;
  const close = openInspection(panel, onClose);
  panel.querySelector('.training-cancel')!.addEventListener('click', close);
  panel.querySelector('.training-detail-open')!.addEventListener('click', () => showCharacterDetails(selected, combat?.units.some(unit => unit.team === 'party' && unit.id === selected) ? combat : undefined));
  const tabs = panel.querySelector('.training-tabs')!;
  for (const id of memberIds) {
    const button = document.createElement('button');
    button.type = 'button'; button.textContent = nameOf(id); button.dataset.character = id;
    button.addEventListener('click', () => { selected = id; render(); });
    tabs.append(button);
  }
  const cost = (id: PartyId) => Object.values(drafts[id]).reduce((sum, n) => sum + (n ?? 0), 0);
  const rows = new Map<AttributeId, { score: HTMLElement; minus: HTMLButtonElement; plus: HTMLButtonElement }>();
  for (const id of ATTRIBUTE_IDS) {
    const row = document.createElement('div');
    row.className = 'training-row'; row.dataset.attribute = id;
    row.innerHTML = `<div><strong>${ATTRIBUTE_LABELS[id]}</strong><small>${ATTRIBUTE_EFFECTS[id]}</small></div><button type="button" class="training-minus" aria-label="减少${ATTRIBUTE_LABELS[id]}">−</button><output class="attribute-value"></output><button type="button" class="training-plus" aria-label="增加${ATTRIBUTE_LABELS[id]}">+</button>`;
    const minus = row.querySelector<HTMLButtonElement>('.training-minus')!;
    const plus = row.querySelector<HTMLButtonElement>('.training-plus')!;
    minus.addEventListener('click', () => {
      const value = drafts[selected][id] ?? 0;
      if (!readOnly && value > 0) { drafts[selected][id] = value - 1; render(); }
    });
    plus.addEventListener('click', () => {
      const progress = original.party[selected];
      const value = drafts[selected][id] ?? 0;
      if (!readOnly && cost(selected) < progress.points && progress.attributes[id] + value < 30) { drafts[selected][id] = value + 1; render(); }
    });
    rows.set(id, { score: row.querySelector('.attribute-value')!, minus, plus });
    panel.querySelector('.training-grid')!.append(row);
  }
  function render(): void {
    const progress = original.party[selected];
    panel.querySelector('.character-martial')?.remove();
    panel.querySelector('.training-ultimate')!.after(createMartialCard(selected,readOnly));
    panel.querySelector('.training-detail-open')!.textContent = `查看${nameOf(selected)}详情`;
    const attrs = { ...progress.attributes };
    for (const id of ATTRIBUTE_IDS) attrs[id] += drafts[selected][id] ?? 0;
    panel.querySelector('.training-note')!.textContent = `${nameOf(selected)} Lv.${progress.level} · 经验 ${progress.xp}/${experienceToNextLevel(progress.level) || '满'} · ${readOnly ? '战斗或途中事件期间仅可查看' : '每级获得3点技能点'}`;
    panel.querySelector('.training-points')!.textContent = `剩余技能点 ${progress.points - cost(selected)}`;
    for (const [id, row] of rows) {
      row.score.textContent = `${progress.attributes[id]}${attrs[id] !== progress.attributes[id] ? ` → ${attrs[id]}` : ''}`;
      row.minus.disabled = readOnly || !(drafts[selected][id] ?? 0);
      row.plus.disabled = readOnly || cost(selected) >= progress.points || attrs[id] >= 30;
    }
    for (const tab of tabs.querySelectorAll<HTMLButtonElement>('button')) tab.setAttribute('aria-pressed', String(tab.dataset.character === selected));
    const mode = original.route ? 'route' : 'ambush';
    const active = combat?.units.find(unit => unit.team === 'party' && unit.id === selected);
    const before = active ?? makePartyUnit(selected, progress, original.route, mode);
    const after = readOnly ? before : makePartyUnit(selected, { ...progress, attributes: attrs }, original.route, mode);
    const values: Array<[string, number, number, string]> = [
      ['攻击', before.attack, after.attack, ''], ['防御', before.defense, after.defense, ''],
      ['闪避', Math.round(before.dodgeRate * 100), Math.round(after.dodgeRate * 100), '%'],
      ['最大体力', before.maxHp, after.maxHp, ''], ['战后补给', progress.attributes.politics - 10, attrs.politics - 10, ''],
      ['胜利经验', 100 + (progress.attributes.charisma - 10) * 5, 100 + (attrs.charisma - 10) * 5, '%'],
    ];
    const preview = panel.querySelector('.ability-preview')!;
    preview.replaceChildren();
    for (const [label, oldValue, newValue, suffix] of values) {
      const item = document.createElement('div');
      item.dataset.ability = label;
      const title = document.createElement('small'); title.textContent = label;
      const output = document.createElement('strong'); output.textContent = `${oldValue}${suffix}${oldValue !== newValue ? ` → ${newValue}${suffix}` : ''}`;
      item.append(title, output); preview.append(item);
    }
    panel.querySelector('.training-ultimate')!.textContent = `绝招 · ${ULTIMATES[before.ultimate].name}：${ULTIMATES[before.ultimate].description}`;
    panel.querySelector<HTMLButtonElement>('.training-confirm')!.disabled = readOnly || memberIds.every(id => cost(id) === 0);
    panel.querySelector('.training-cancel')!.textContent = readOnly ? '返回' : '取消';
  }
  panel.querySelector('.training-confirm')!.addEventListener('click', () => {
    let next = getState();
    if (readOnly || !canManageParty(next)) return;
    // Validate every character before saving once, so a failed edit cannot partially spend points.
    for (const id of memberIds) {
      if (cost(id) === 0) continue;
      const updated = spendSkillPoints(next, id, drafts[id]);
      if (updated === next) { panel.querySelector('.training-feedback')!.textContent = '点数或角色状态发生变化，请取消后重新分配。'; return; }
      next = updated;
    }
    setState(next);
    close();
  });
  render();
  panel.querySelector<HTMLButtonElement>('.training-cancel')!.focus();
}
