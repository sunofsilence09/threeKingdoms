import { openInspection } from './inspectionOverlay';
import { ATTRIBUTE_IDS, ATTRIBUTE_LABELS } from './attributes';
import { getUnitAppearance } from './characters';
import { attackPower, createCombatState, movementRange, ULTIMATES, WEAPONS, type CombatState } from './combat';
import { experienceToNextLevel, PARTY_IDS, type PartyId } from './growth';
import { getState } from './runtime';
import { HISTORICAL_CHARACTERS, getHistoricalCharacter } from './historicalCharacters';
import { HERO_STAGES, HERO_WEAPONS, getHeroStage } from './heroVisuals';
import type { WeaponId } from './combat';
import { createUnitPreview } from './unitPreview';

/** Read-only inspection. Retaining the DOM also retains growth drafts and route choices. */
export function showCharacterDetails(id: string = 'traveler', combat?: CombatState): void {
  const root = document.querySelector<HTMLElement>('#overlay-root');
  if (!root || root.querySelector('.character-details')) return;
  const state = getState();
  const encounter = combat ?? createCombatState(state.route, state.party);
  const units = encounter.units.filter(u => combat || u.team === 'party');
  let selected = units.find(u => u.id === id) ?? units[0];
  let visualPreview: { level: number; weapon: WeaponId } | undefined;
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
    <p class="character-bio"></p><section class="hero-gallery" aria-label="姜垣外观图鉴" hidden></section><p class="character-battle-status"></p>
    <dl class="character-stats"></dl><div class="character-attributes" aria-label="六维属性"></div>
    <section class="character-ultimate"><h2></h2><p></p></section><p class="character-equipment-note"></p></div></div>`;
  const close = openInspection(panel);
  const closeButton = panel.querySelector<HTMLButtonElement>('.character-close')!;
  closeButton.addEventListener('click', close);
  const tabs = panel.querySelector('.character-tabs')!;
  const categories = panel.querySelector('.character-categories')!;
  const groups = [['party', '同行'], ['people', '乱世人物'], ...(combat ? [['enemy', '本场敌人']] : [])] as const;
  for (const [key, label] of groups) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.dataset.group = key;
    button.addEventListener('click', () => {
      visualPreview = undefined;
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
        visualPreview = undefined;
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
    const display = historical ? { id: characterId, weapon: historical.weapon, level: 1 } : { ...selected, ...(characterId === 'traveler' ? visualPreview : undefined) };
    const appearance = getUnitAppearance(display);
    panel.dataset.character = characterId;
    panel.classList.toggle('is-npc', Boolean(historical));
    panel.querySelector('.character-identity')!.textContent = appearance.identity;
    panel.querySelector('h1')!.textContent = name;
    panel.querySelector('.character-bio')!.textContent = appearance.bio;
    portrait.src = appearance.portrait;
    portrait.alt = `${name}全身立绘`;
    panel.querySelector('figcaption')!.textContent = `${appearance.identity} · 全身立绘`;
    const preview = createUnitPreview(characterId, display.weapon, name, display.level);
    panel.querySelector('.character-model-slot')!.replaceChildren(preview);
    renderGallery(characterId);
    for (const tab of tabs.querySelectorAll<HTMLButtonElement>('button')) tab.setAttribute('aria-pressed', String(tab.dataset.character === characterId));
    for (const group of categories.querySelectorAll<HTMLButtonElement>('button')) group.setAttribute('aria-pressed', String(group.dataset.group === category));
    const attributes = panel.querySelector<HTMLElement>('.character-attributes')!;
    attributes.hidden = Boolean(historical);
    panel.querySelector<HTMLElement>('.character-ultimate')!.hidden = Boolean(historical);
    if (historical) {
      panel.querySelector('.character-level')!.textContent = '尚未同行';
      panel.querySelector('.character-battle-status')!.textContent = '人物志 · 尚未加入同行队伍';
      renderStats([['身份', historical.role], ['擅长', historical.specialty], ['随身', historical.equipment], ['速度', `${historical.speed}`]]);
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
      ['速度', `${selected.speed}`], ['防御', `${selected.defense}`], ['闪避', `${Math.round(selected.dodgeRate * 100)}%`],
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
    panel.querySelector('.character-equipment-note')!.textContent = `当前装备：${weapon.name}。立绘与棋盘随等级和当前装备变化。外观图鉴仅供查看。`;
  }
  function renderGallery(characterId: string): void {
    const gallery = panel.querySelector<HTMLElement>('.hero-gallery')!;
    gallery.hidden = characterId !== 'traveler';
    gallery.replaceChildren();
    if (gallery.hidden) return;
    const level = visualPreview?.level ?? selected.level;
    const weapon = visualPreview?.weapon ?? selected.weapon;
    const stage = getHeroStage(level);
    const current = getHeroStage(selected.level).id === stage.id && selected.weapon === weapon;
    const stageLabel = document.createElement('label'); stageLabel.textContent = '成长阶段 ';
    const stages = document.createElement('select'); stages.setAttribute('aria-label', '预览成长阶段');
    for (const item of HERO_STAGES) {
      const option = document.createElement('option'); option.value = item.id;
      option.textContent = `${item.label} · Lv.${item.minLevel}–${item.maxLevel}`; option.selected = item.id === stage.id; stages.append(option);
    }
    const weaponLabel = document.createElement('label'); weaponLabel.textContent = '展示武器 ';
    const weapons = document.createElement('select'); weapons.setAttribute('aria-label', '预览武器');
    for (const item of HERO_WEAPONS) {
      const option = document.createElement('option'); option.value = item; option.textContent = WEAPONS[item].name; option.selected = item === weapon; weapons.append(option);
    }
    stages.addEventListener('change', () => { visualPreview = { level: HERO_STAGES.find(s => s.id === stages.value)!.minLevel, weapon }; render(); panel.querySelector<HTMLSelectElement>('[aria-label="预览成长阶段"]')!.focus(); });
    weapons.addEventListener('change', () => { visualPreview = { level, weapon: weapons.value as WeaponId }; render(); panel.querySelector<HTMLSelectElement>('[aria-label="预览武器"]')!.focus(); });
    stageLabel.append(stages); weaponLabel.append(weapons);
    const hint = document.createElement('p'); hint.className = 'hero-gallery-hint';
    hint.textContent = current ? '当前外观' : `外观预览${selected.level < stage.minLevel ? ` · 未达到 Lv.${stage.minLevel}` : ''}${selected.weapon !== weapon ? ' · 展示武器，当前未装备' : ''} · 不影响属性与存档`;
    const restore = document.createElement('button'); restore.type = 'button'; restore.textContent = '返回当前外观'; restore.disabled = !visualPreview;
    restore.addEventListener('click', () => {
      visualPreview = undefined; render();
      panel.querySelector<HTMLSelectElement>('[aria-label="预览成长阶段"]')!.focus();
    });
    gallery.append(stageLabel, weaponLabel, hint, restore);
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
