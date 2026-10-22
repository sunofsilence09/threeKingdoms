import { ATTRIBUTE_IDS, ATTRIBUTE_LABELS } from './attributes';
import { getCharacterAppearance } from './characters';
import { attackPower, createCombatState, movementRange, ULTIMATES, WEAPONS, type CombatState } from './combat';
import { experienceToNextLevel, PARTY_IDS, type PartyId } from './growth';
import { getState } from './runtime';
import { HISTORICAL_CHARACTERS, getHistoricalCharacter } from './historicalCharacters';
import { createUnitPreview } from './unitPreview';

/** Read-only inspection. Retaining the DOM also retains growth drafts and route choices. */
export function showCharacterDetails(id: string = 'traveler', combat?: CombatState): void {
  const root = document.querySelector<HTMLElement>('#overlay-root');
  if (!root || root.querySelector('.character-details')) return;
  const previous = [...root.childNodes];
  const focus = document.activeElement as HTMLElement | null;
  const state = getState();
  const encounter = combat ?? createCombatState(state.route, state.party);
  const units = encounter.units.filter(u => combat || u.team === 'party');
  let selected = units.find(u => u.id === id) ?? units[0];
  let historical = getHistoricalCharacter(id);
  let category: 'party' | 'people' | 'enemy' = historical ? 'people' : selected?.team === 'enemy' ? 'enemy' : 'party';
  if (!selected) return;
  const panel = document.createElement('section');
  panel.className = 'overlay-panel character-details';
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', '人物详情');
  panel.innerHTML = `<header class="character-header"><span>乱世行旅 <span class="character-header-divider">/</span> 人物志</span><button type="button" class="character-close" aria-label="关闭人物详情">关闭 <span aria-hidden="true">×</span></button></header>
    <nav class="character-categories" aria-label="人物分类"></nav><nav class="character-tabs" aria-label="选择查看人物"></nav>
    <div class="character-layout"><figure class="character-art"><img alt=""><figcaption>流民行旅 · 全身立绘</figcaption><div class="character-model-slot"></div></figure>
    <div class="character-info"><p class="character-identity"></p><div class="character-name"><h1></h1><span class="character-level"></span></div>
    <p class="character-bio"></p><p class="character-battle-status"></p>
    <dl class="character-stats"></dl><div class="character-attributes" aria-label="六维属性"></div>
    <section class="character-ultimate"><h2></h2><p></p></section><p class="character-equipment-note"></p></div></div>`;
  const inertTargets = [...document.querySelectorAll<HTMLElement>('#hud-root, #game-container')];
  const previousInert = inertTargets.map(target => target.inert);
  inertTargets.forEach(target => { target.inert = true; });
  const scroll = root.scrollTop;
  root.replaceChildren(panel);
  const close = () => {
    root.replaceChildren(...previous);
    inertTargets.forEach((target, index) => { target.inert = previousInert[index]; });
    root.scrollTop = scroll;
    if (focus?.isConnected) focus.focus({ preventScroll: true });
  };
  const closeButton = panel.querySelector<HTMLButtonElement>('.character-close')!;
  closeButton.addEventListener('click', close);
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key !== 'Tab') return;
    const controls = [...panel.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  const tabs = panel.querySelector('.character-tabs')!;
  const categories = panel.querySelector('.character-categories')!;
  const groups = [['party', '同行'], ['people', '乱世人物'], ...(combat ? [['enemy', '本场敌人']] : [])] as const;
  for (const [key, label] of groups) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.dataset.group = key;
    button.addEventListener('click', () => {
      category = key as typeof category;
      if (category === 'people') historical = HISTORICAL_CHARACTERS[0];
      else { historical = undefined; selected = units.find(u => u.team === category)!; }
      renderTabs(); render();
    });
    categories.append(button);
  }
  function renderTabs(): void {
    tabs.replaceChildren();
    const entries = category === 'people' ? HISTORICAL_CHARACTERS : units.filter(u => u.team === category);
    for (const entry of entries) {
      const tab = document.createElement('button');
      tab.type = 'button'; tab.textContent = entry.name; tab.dataset.character = entry.id;
      tab.classList.toggle('is-enemy', category === 'enemy');
      tab.addEventListener('click', () => {
        historical = getHistoricalCharacter(entry.id);
        if (!historical) selected = units.find(u => u.id === entry.id)!;
        render();
      });
      tabs.append(tab);
    }
  }
  const portrait = panel.querySelector<HTMLImageElement>('.character-art img')!;
  portrait.addEventListener('error', () => {
    panel.querySelector('figcaption')!.textContent = '立绘暂未加载，请重新打开详情。';
  });
  function render(): void {
    const characterId = historical?.id ?? selected.id;
    const name = historical?.name ?? selected.name;
    const appearance = getCharacterAppearance(characterId);
    panel.dataset.character = characterId;
    panel.classList.toggle('is-npc', Boolean(historical));
    panel.querySelector('.character-identity')!.textContent = appearance.identity;
    panel.querySelector('h1')!.textContent = name;
    panel.querySelector('.character-bio')!.textContent = appearance.bio;
    portrait.src = appearance.portrait;
    portrait.alt = `${name}全身立绘`;
    panel.querySelector('figcaption')!.textContent = `${appearance.identity} · 全身立绘`;
    const preview = createUnitPreview(characterId, historical?.weapon ?? selected.weapon, name);
    panel.querySelector('.character-model-slot')!.replaceChildren(preview);
    for (const tab of tabs.querySelectorAll<HTMLButtonElement>('button')) tab.setAttribute('aria-pressed', String(tab.dataset.character === characterId));
    for (const group of categories.querySelectorAll<HTMLButtonElement>('button')) group.setAttribute('aria-pressed', String(group.dataset.group === category));
    const attributes = panel.querySelector<HTMLElement>('.character-attributes')!;
    attributes.hidden = Boolean(historical);
    panel.querySelector<HTMLElement>('.character-ultimate')!.hidden = Boolean(historical);
    if (historical) {
      panel.querySelector('.character-level')!.textContent = '尚未同行';
      panel.querySelector('.character-battle-status')!.textContent = '人物志 · 尚未加入同行队伍';
      renderStats([['身份', historical.role], ['擅长', historical.specialty], ['随身', historical.equipment]]);
      attributes.replaceChildren();
      panel.querySelector('.character-equipment-note')!.textContent = '小人预览与棋盘共用外观。相遇与同行进度会在后续行旅中展开。';
      return;
    }
    panel.querySelector('.character-level')!.textContent = `Lv.${selected.level}`;
    panel.querySelector('.character-battle-status')!.textContent = !combat ? '行旅中' :
      `${selected.hp <= 0 ? '倒地' : combat.actedIds.includes(selected.id) ? '已行动' : combat.movedIds.includes(selected.id) ? '已移动' : '待行动'} · ${selected.ultimateUsed ? '本场绝招已用' : '本场绝招未用'}${selected.empowered ? ' · 下一击强化中' : ''}${selected.guarded ? ' · 守势中' : ''}`;
    const threshold = experienceToNextLevel(selected.level);
    const weapon = WEAPONS[selected.weapon];
    const stats: Array<[string, string]> = [
      ['体力', `${selected.hp} / ${selected.maxHp}`], ['武器', weapon.name], ['攻击', `${attackPower(selected)}`],
      ['防御', `${selected.defense}`], ['闪避', `${Math.round(selected.dodgeRate * 100)}%`],
      ['移动', `${movementRange(encounter, selected)} 格`], ['射程', `${weapon.min}–${weapon.max} 格`],
      ['经验', selected.team === 'enemy' ? '—' : threshold ? `${selected.xp} / ${threshold}` : '等级已满'],
    ];
    renderStats(stats);
    const attrs = panel.querySelector('.character-attributes')!;
    attrs.replaceChildren();
    if (PARTY_IDS.includes(selected.id as PartyId)) {
      for (const attr of ATTRIBUTE_IDS) {
        const item = document.createElement('span');
        item.textContent = `${ATTRIBUTE_LABELS[attr]} ${state.party[selected.id as PartyId].attributes[attr]}`;
        attrs.append(item);
      }
    } else attrs.textContent = '敌方能力以本场战斗数值为准';
    panel.querySelector('.character-ultimate h2')!.textContent = `绝招 · ${ULTIMATES[selected.ultimate].name}`;
    panel.querySelector('.character-ultimate p')!.textContent = `${ULTIMATES[selected.ultimate].description} 强化在下次攻击或本回合结束后消失。`;
    panel.querySelector('.character-equipment-note')!.textContent = `当前装备：${weapon.name}。立绘展示人物的行旅装束，棋盘兵器随当前装备变化。`;
  }
  function renderStats(stats: Array<[string, string]>): void {
    const statRoot = panel.querySelector('.character-stats')!;
    statRoot.replaceChildren();
    for (const [label, value] of stats) {
      const item = document.createElement('div'); item.dataset.detailStat = label;
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); const strong = document.createElement('strong'); strong.textContent = value;
      dd.append(strong); item.append(dt, dd); statRoot.append(item);
    }
  }
  renderTabs();
  render();
  closeButton.focus({ preventScroll: true });
}
