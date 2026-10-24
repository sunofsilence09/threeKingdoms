import { postingLabel } from './personPosting';
import { openInspection } from './inspectionOverlay';
import { ATTRIBUTE_IDS, ATTRIBUTE_LABELS } from './attributes';
import { getUnitAppearance } from './characters';
import { attackPower, createCombatState, makePartyUnit, movementRange, ULTIMATES, WEAPONS, type CombatState } from './combat';
import { experienceToNextLevel } from './growth';
import { RECRUIT_PROFILES, recruitProfile, type RecruitProfile } from './recruitmentCatalog';
import { getState } from './runtime';
import { getHistoricalCharacter } from './historicalCharacters';
import { WORLD_CITIES } from './world';
import { HERO_STAGES, HERO_WEAPONS, getHeroStage } from './heroVisuals';
import type { WeaponId } from './combat';
import { createUnitPreview } from './unitPreview';
import { getRecruitmentThreshold, serviceForPerson, serviceLabel } from './cityService';
import { renderGarrisonSummary } from './garrisonView';

function detailPerson(id: string) {
  const profile = recruitProfile(id);
  if (!profile) return undefined;
  const historic = getHistoricalCharacter(id);
  return { ...profile, specialty: historic?.specialty ?? profile.role, equipment: historic?.equipment ?? WEAPONS[profile.weapon].name };
}
type DetailGroup = 'party' | 'people' | 'officials' | 'garrison' | 'other' | 'enemy';
function personGroup(profile: RecruitProfile): DetailGroup {
  return profile.category === 'garrison' ? 'garrison' : profile.category === 'official' ? 'officials' : profile.category === 'historical' || profile.category === 'leader' ? 'people' : 'other';
}

/** Read-only inspection. Retaining the DOM also retains growth drafts and route choices. */
export function showCharacterDetails(id: string = 'traveler', combat?: CombatState): void {
  const root = document.querySelector<HTMLElement>('#overlay-root');
  if (!root || root.querySelector('.character-details')) return;
  const state = getState();
  const encounter = combat ?? createCombatState(state.route, state.party, state.route ? 'route' : 'ambush', state.deployed);
  const units = combat ? encounter.units : Object.entries(state.party).map(([key, progress]) => makePartyUnit(key, progress, state.route, state.route ? 'route' : 'ambush'));
  let selected = units.find(u => u.id === id) ?? units[0];
  let visualPreview: { level: number; weapon: WeaponId } | undefined;
  let historical = state.party[id] || units.some(unit => unit.id === id) ? undefined : detailPerson(id);
  let category: DetailGroup = historical ? personGroup(historical) : selected?.team === 'enemy' ? 'enemy' : 'party';
  let garrisonCity = historical?.category === 'garrison' ? historical.id.split(':')[1] : state.currentCityId;
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
    <dl class="character-stats"></dl><section class="character-army" hidden></section><div class="character-attributes" aria-label="六维属性"></div>
    <section class="character-ultimate"><h2></h2><p></p></section><p class="character-equipment-note"></p></div></div>`;
  const close = openInspection(panel);
  const closeButton = panel.querySelector<HTMLButtonElement>('.character-close')!;
  closeButton.addEventListener('click', close);
  const tabs = panel.querySelector('.character-tabs')!;
  const categories = panel.querySelector('.character-categories')!;
  const groups: [DetailGroup, string][] = [['party', '同行'], ['people', '乱世人物'], ['officials', '地方官员'], ['garrison', '地方军士'], ['other', '其他人物'], ...(combat ? [['enemy', '本场敌人'] as [DetailGroup,string]] : [])];
  for (const [key, label] of groups) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
    button.dataset.group = key;
    button.disabled = key === 'party' || key === 'enemy' ? !units.some(unit => unit.team === key) : !RECRUIT_PROFILES.some(profile => personGroup(profile) === key && !state.party[profile.id]);
    button.addEventListener('click', () => {
      visualPreview = undefined;
      category = key as typeof category;
      if (category !== 'party' && category !== 'enemy') {
        const profile = RECRUIT_PROFILES.find(person => !state.party[person.id] && personGroup(person) === category && (category !== 'garrison' || person.id.split(':')[1] === garrisonCity));
        historical = profile ? detailPerson(profile.id) : undefined;
      } else { historical = undefined; selected = units.find(u => u.team === category)!; }
      renderTabs(); render();
    });
    categories.append(button);
  }
  function renderTabs(): void {
    tabs.replaceChildren();
    if (category === 'garrison') {
      const citySelect = document.createElement('select'); citySelect.setAttribute('aria-label', '查看驻军城市');
      for (const city of WORLD_CITIES) { const option = document.createElement('option'); option.value = city.id; option.textContent = city.name; option.selected = city.id === garrisonCity; citySelect.append(option); }
      citySelect.addEventListener('change', () => {
        garrisonCity = citySelect.value;
        const profile = RECRUIT_PROFILES.find(person => person.category === 'garrison' && person.id.split(':')[1] === garrisonCity && !state.party[person.id]);
        historical = profile ? detailPerson(profile.id) : undefined; renderTabs(); render(); tabs.querySelector('select')?.focus();
      }); tabs.append(citySelect);
    }
    const entries = category === 'party' || category === 'enemy' ? units.filter(u => u.team === category) : RECRUIT_PROFILES.filter(person => !state.party[person.id] && personGroup(person) === category && (category !== 'garrison' || person.id.split(':')[1] === garrisonCity));
    for (const entry of entries) {
      const tab = document.createElement('button');
      tab.type = 'button'; tab.textContent = entry.name; tab.dataset.character = entry.id;
      tab.classList.toggle('is-enemy', category === 'enemy');
      tab.addEventListener('click', () => {
        visualPreview = undefined;
        historical = category !== 'party' && category !== 'enemy' ? detailPerson(entry.id) : undefined;
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
    const appearance = getUnitAppearance(display, state.date);
    const identity = selected.id === characterId && selected.team === 'party' && characterId !== 'traveler' ? `同行 · ${recruitProfile(characterId)?.role ?? appearance.identity}` : appearance.identity;
    panel.dataset.character = characterId;
    panel.classList.toggle('is-npc', Boolean(historical));
    panel.querySelector('.character-identity')!.textContent = identity;
    panel.querySelector('h1')!.textContent = name;
    panel.querySelector('.character-bio')!.textContent = appearance.bio;
    const service=serviceForPerson(state,characterId);
    let serviceNode=panel.querySelector<HTMLParagraphElement>('.character-service');
    if(!serviceNode){serviceNode=document.createElement('p');serviceNode.className='character-service';panel.querySelector('.character-bio')!.after(serviceNode);}
    serviceNode.textContent=service?`${serviceLabel(service)} · ${historical?.readOnly?'不能邀请':`邀请门槛 ${getRecruitmentThreshold(state,characterId)}`}`:'';serviceNode.hidden=!service;
    let postingNode=panel.querySelector<HTMLParagraphElement>('.character-posting');
    if(!postingNode){postingNode=document.createElement('p');postingNode.className='character-posting';serviceNode.after(postingNode);}
    postingNode.textContent=recruitProfile(characterId)?postingLabel(state,characterId):'';postingNode.hidden=!postingNode.textContent;
    portrait.src = appearance.portrait;
    portrait.alt = `${name}${characterId.startsWith('wolf:')?'遭遇插画':'全身立绘'}`;
    panel.querySelector('figcaption')!.textContent = `${identity} · ${characterId.startsWith('wolf:')?'遭遇插画':'全身立绘'}`;
    const preview = createUnitPreview(characterId, display.weapon, name, display.level, state.date);
    panel.querySelector('.character-model-slot')!.replaceChildren(preview);
    renderGallery(characterId);
    const armyPanel=panel.querySelector<HTMLElement>('.character-army')!;
    armyPanel.hidden=!(historical?.category==='garrison'&&historical.id.endsWith(':soldier'));
    armyPanel.replaceChildren();if(!armyPanel.hidden)armyPanel.append(renderGarrisonSummary(state,characterId.split(':')[1],true));
    for (const tab of tabs.querySelectorAll<HTMLButtonElement>('button')) tab.setAttribute('aria-pressed', String(tab.dataset.character === characterId));
    for (const group of categories.querySelectorAll<HTMLButtonElement>('button')) group.setAttribute('aria-pressed', String(group.dataset.group === category));
    const attributes = panel.querySelector<HTMLElement>('.character-attributes')!;
    attributes.hidden = Boolean(historical);
    panel.querySelector<HTMLElement>('.character-ultimate')!.hidden = Boolean(historical);
    if (historical) {
      panel.querySelector('.character-level')!.textContent = historical.readOnly ? '资料查看' : '尚未同行';
      panel.querySelector('.character-battle-status')!.textContent = '人物志 · 尚未加入同行队伍';
      renderStats([['身份', historical.role], ['擅长', historical.specialty], ['随身', historical.equipment], ['速度', `${historical.speed}`]]);
      attributes.replaceChildren();
      panel.querySelector('.character-equipment-note')!.textContent = historical.readOnly ? historical.category === 'garrison' ? '普通士兵属于城市守军，不能邀请入队；可与士兵长交流。' : '本版仅供人物志查看，暂未开放相遇。' : `可在城内寻访培养亲密度，达到${getRecruitmentThreshold(state,characterId)}后邀请。须符合当前行踪与活动年代；历史窗口仅供参考，长期同行为架空支线。`;
      return;
    }
    panel.querySelector('.character-level')!.textContent = `Lv.${selected.level}`;
    panel.querySelector('.character-battle-status')!.textContent = !combat ? `${state.deployed.includes(selected.id) ? '出战' : '候补'} · 已同行 · 亲密 ${state.relationships[selected.id]?.affinity ?? 0}/100` :
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
    if (selected.team === 'party' && state.party[selected.id]) {
      for (const attr of ATTRIBUTE_IDS) {
        const item = document.createElement('span');
        item.textContent = `${ATTRIBUTE_LABELS[attr]} ${state.party[selected.id].attributes[attr]}`;
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
