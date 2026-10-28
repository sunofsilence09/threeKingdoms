import { socialControls } from './socialView';
import { canHelpPerson } from './social';
import { ATTRIBUTE_IDS, ATTRIBUTE_LABELS } from './attributes';
import { combatAttributeVersion, effectiveAttributes, LEGACY_ATTRIBUTE_NOTE } from './characterTalents';
import { displayText, heroName, personName } from './heroName';
import { personPosting, postingLabel } from './personPosting';
import './partyPanel.css';
import { openInspection } from './inspectionOverlay';
import { getState, setState } from './runtime';
import { dateLabel } from './history';
import { cityNameAt } from './world';
import { allRecruitProfiles, recruitProfile, canMeetPerson, type RecruitProfile } from './recruitmentCatalog';
import { AFFINITY_REQUIRED, canInteractPerson, canManageParty, gameDayNumber, interactPerson, invitePerson, setDeployment } from './recruitment';
import { attackPower, makePartyUnit, WEAPONS, type CombatState } from './combat';
import { showCharacterDetails } from './characterDetails';
import { showCharacterPanel } from './characterPanel';
import type { GameState } from './state';
import { getRecruitmentThreshold, serviceForPerson, serviceLabel } from './cityService';
import { getCharacterAppearance } from './characters';
import { filterRecruitProfiles, type LifeFilter, type PersonFilter } from './recruitmentView';
import { lifeAccessNote, lifeReferenceText } from './lifeView';
import { showMartialPanel } from './martialPanel';
import { createTroopControls } from './troopControls';
import { showPlayerMilitary } from './playerMilitaryPanel';
import { attachTroops, defensePower } from './troopCombat';

const nameOf = (id: string) => personName(id, getState());
const cityName = (id: string) => cityNameAt(id,getState().date);
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = ''): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = className; return node;
}
function button(label: string, action: () => void, disabled = false): HTMLButtonElement {
  const node = element('button', label, 'party-action'); node.type = 'button'; node.disabled = disabled;
  node.addEventListener('click', action); return node;
}
function portrait(profile: RecruitProfile | undefined, name: string): HTMLImageElement {
  const image = element('img', '', 'party-portrait'); image.src = profile ? getCharacterAppearance(profile.id, getState().date).portrait : '/assets/characters/neutral-official.svg'; image.alt = `${name}立绘`; image.loading = 'lazy'; image.addEventListener('error', () => image.hidden = true); return image;
}
function retainFocus(body: HTMLElement): () => void {
  const focused = document.activeElement as HTMLElement | null;
  if (!focused || !body.contains(focused)) return () => {};
  if (focused.id === 'person-search' || focused.id === 'person-category' || focused.id === 'person-life') {
    const position = focused instanceof HTMLInputElement ? focused.selectionStart : null;
    return () => { const next = body.querySelector<HTMLInputElement | HTMLSelectElement>(`#${focused.id}`); next?.focus({ preventScroll: true }); if (next instanceof HTMLInputElement && position !== null) next.setSelectionRange(position, position); };
  }
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
    body.append(element('p', `出战 ${state.deployed.length}/5 · 同行 ${Object.keys(state.party).length} 人 · ${heroName(state)}固定上阵`, 'company-summary'));
    body.append(element('p', '候补保留成长与装备，仅本场出战成员获得战斗经验。', 'company-note'));
    body.append(element('p', `预备兵 ${state.worldConflict?.playerReserve??0} · 已配兵 ${state.worldConflict?.playerAssigned??0}。先在军务募兵，再为角色分配；士气80为标准，低于10每轮流失10%士兵。`, 'company-note'));
    if (combat && combatAttributeVersion(combat) === 1) body.append(element('p', LEGACY_ATTRIBUTE_NOTE, 'company-notice'));
    if (lockedNote(state)) body.append(element('p', lockedNote(state), 'company-notice'));
    const tools = element('div', '', 'party-actions');
    tools.append(button('角色成长', () => showCharacterPanel(render, combat)), button('寻访人物', () => showRecruitmentPanel(render, combat)), button('主角武学',() => showMartialPanel(render,Boolean(combat))));
    body.append(tools);
    if (!combat) tools.append(button('军务 · 募兵', () => showPlayerMilitary(render)));
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
        const baseUnit = makePartyUnit(id, progress, state.route, state.route ? 'route' : 'ambush');
        const assigned = state.troopAssignments?.[id];
        const unit = combat?.units.find(u => u.team === 'party' && u.id === id) ?? (assigned ? attachTroops(baseUnit,assigned.kind,assigned.count) : baseUnit);
        const card = element('article', '', 'company-card'); card.dataset.member = id;
        const info = element('div', '', 'company-card-info');
        info.append(element('h3', `${nameOf(id)} · Lv.${progress.level}`), element('p', `${profile?.role ?? '同行伙伴'} · ${WEAPONS[unit.weapon].name}`), element('p', `亲密 ${state.relationships[id]?.affinity ?? 0}/100 · 技能点 ${progress.points}`));
        info.append(element('p', `攻 ${Number(attackPower(unit).toFixed(1))} · 防 ${Number(defensePower(unit).toFixed(1))} · 体力 ${unit.hp}/${unit.maxHp}`, 'company-note'));
        info.append(createTroopControls(id,unit,Boolean(combat),render));
        const version = combat && combat.units.some(u => u.id === id) ? combatAttributeVersion(combat) : 2;
        info.append(element('p', ATTRIBUTE_IDS.map(key => `${ATTRIBUTE_LABELS[key]} ${effectiveAttributes(id, progress.attributes, version,progress.bondBonus)[key]}`).join(' · '), 'company-note'));
        info.append(element('p',lifeReferenceText(state,id),'company-life'));
        const actions = element('div', '', 'party-actions');
        actions.append(button('详情', () => showCharacterDetails(id, combat?.units.some(u => u.team === 'party' && u.id === id) ? combat : undefined,render)), button('成长', () => showCharacterPanel(render, combat, id)));
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
    const memorials=Object.values(state.life?.memorials??{}).sort((a,b)=>b.deathYear-a.deathYear);
    const memorial=element('section','','company-section company-memorials');memorial.setAttribute('aria-label','同行纪念');
    memorial.append(element('h2',`同行纪念 · ${memorials.length} 人`),element('p','保存曾经同行者的成长与亲密记录；主角已学武学继续保留。','company-note'));
    const archive=element('div','','company-grid');
    for(const record of memorials) {
      const card=element('article','','company-card memorial-card');card.dataset.memorial=record.id;
      const info=element('div','','company-card-info');
      info.append(element('h3',`${nameOf(record.id)} · Lv.${record.progress.level}`),element('p',`本局于${record.deathYear}年离世 · 享年约${record.age}岁（按年计）`),element('p',`经验 ${record.progress.xp} · 技能点 ${record.progress.points} · 亲密 ${record.relationship?.affinity??0}/100`,'company-note'),button('查看纪念详情',()=>showCharacterDetails(record.id,undefined,render)));
      info.append(element('p', ATTRIBUTE_IDS.map(key => `${ATTRIBUTE_LABELS[key]} ${effectiveAttributes(record.id, record.progress.attributes,2,record.progress.bondBonus)[key]}`).join(' · '), 'company-note'));
      card.append(portrait(recruitProfile(record.id),nameOf(record.id)),info);archive.append(card);
    }
    if(!memorials.length)archive.append(element('p','尚无已故同行者。','company-note'));
    memorial.append(archive);body.append(memorial);
    restoreFocus();
  }
  render();
}

function windowLabel(profile: RecruitProfile): string {
  if (profile.readOnly) return profile.category === 'garrison' ? '本城普通士兵属于守军，不能邀请入队。' : '本版仅供人物志查看，暂未开放相遇。';
  return profile.windows.map(window => {
    const from = `${window.from.year}年${window.from.month ? `${window.from.month}月` : ''}`;
    const to = window.to ? `${window.to.year}年${window.to.month ? `${window.to.month}月` : ''}` : '此后';
    return `${from}—${to}：${window.cityIds.map(cityName).join('、')}`;
  }).join('；');
}
function unavailableReason(profile: RecruitProfile, state: GameState): string {
  const life=lifeAccessNote(state,profile.id);if(life)return life;
  if (profile.readOnly) return windowLabel(profile);
  if (state.journey) return '途中不可交流，请先抵达城池。';
  if (!canManageParty(state)) return lockedNote(state);
  if (state.party[profile.id]) return profile.id === 'traveler' ? `${heroName(state)}是你自己。` : '已同行，可在城内继续交流。';
  if (canMeetPerson(profile.id, state.currentCityId, state.date, state)) return '当前可相遇。';
  const posting = personPosting(state, profile.id);
  if (posting?.kind === 'campaign' || posting?.kind === 'dispersed') return posting.reason ?? posting.office;
  const now = state.date.year * 12 + state.date.month;
  const active = profile.windows.some(window => now >= window.from.year * 12 + (window.from.month ?? 1) && (!window.to || now <= window.to.year * 12 + (window.to.month ?? 12)));
  return active ? '当前不在此城，请按行踪前往相应地点。' : '当前年代未开放相遇，请查看年份与地点窗口。';
}
export function showRecruitmentPanel(onChange?: () => void, combat?: CombatState, options: {initialPersonId?:string} = {}): void {
  const view = shell('recruitment-panel', '寻访人物', onChange); if (!view) return;
  const { panel } = view;
  const body = element('div', '', 'company-body'); panel.append(body);
  let all = false; let feedback = ''; let query = ''; let category: PersonFilter = 'all';let life:LifeFilter='all';
  function mutate(action: (state: GameState) => GameState) {
    const before = getState(); const after = action(before); setState(after);
    feedback = after === before ? '当前条件不符，请查看人物状态。' : after.travelNotice ?? '已更新。'; render();
  }
  function render(): void {
    const restoreFocus = retainFocus(body);
    const state = getState(); body.replaceChildren();
    body.append(element('p', `${dateLabel(state.date)} · ${state.journey ? '行进途中' : cityName(state.currentCityId)} · 军需 ${state.supplies}`, 'company-summary'));
    body.append(element('p', `普通人物亲密度达到 ${AFFINITY_REQUIRED} 可免费邀请至候补，士兵长及其他受雇人物需达到80。普通士兵属于城市守军，不能邀请。邀请长期同行为架空支线；主君同行不自动选择阵营。`, 'company-note'));
    body.append(element('p', '每人每日一次；交谈、分享粮食、帮忙、赠礼均耗时1日；帮忙每人每自然月限一次。同人再次交流须先休整、帮工或赶路至次日。', 'company-note'));
    body.append(element('p', '当前行踪随天下局势变化；历史参考窗口单独保留，依据历史活动区域编排，不代表当前任职。', 'company-note'));
    body.append(element('p','生年固定；年龄按年计。尚未出生、未满16岁与已故人物仅供资料查看。史料卒年是参考，本局寿命另有浮动；未到离世时不公开本局卒年。','company-note'));
    if (lockedNote(state)) body.append(element('p', lockedNote(state), 'company-notice'));
    const tabs = element('nav', '', 'company-tabs'); tabs.setAttribute('aria-label', '寻访视图');
    for (const [value, label] of [[false, '本地人物'], [true, '所有人物行踪']] as const) {
      const tab = button(label, () => { all = value; render(); }); tab.setAttribute('aria-pressed', String(all === value)); tabs.append(tab);
    }
    body.append(tabs);
    const filters = element('div', '', 'person-filters');
    const searchLabel = element('label', '姓名或城市 '), search = element('input'); search.type = 'search'; search.id = 'person-search'; search.value = query; search.placeholder = '例如：曹仁、襄阳';
    search.addEventListener('input', () => { query = search.value; render(); }); searchLabel.append(search);
    const categoryLabel = element('label', '人物类别 '), categories = element('select'); categories.id = 'person-category';
    for (const [value, text] of [['all', '全部类别'], ['historical', '历史人物'], ['official', '地方官员'], ['garrison', '地方军士'], ['other', '其他人物']] as const) { const option = element('option', text); option.value = value; option.selected = value === category; categories.append(option); }
    categories.addEventListener('change', () => { category = categories.value as PersonFilter; render(); }); categoryLabel.append(categories); filters.append(searchLabel, categoryLabel); body.append(filters);
    const lifeLabel=element('label','生命状态 '),lives=element('select');lives.id='person-life';
    for(const [value,text] of [['all','全部状态'],['alive','已成年 / 职业代表'],['unborn','尚未出生'],['child','未满16岁'],['dead','已经离世']] as const){const option=element('option',text);option.value=value;option.selected=life===value;lives.append(option);}
    lives.addEventListener('change',()=>{life=lives.value as LifeFilter;all=true;render();});lifeLabel.append(lives);filters.append(lifeLabel);
    const notice = element('p', feedback, 'company-feedback'); notice.setAttribute('aria-live', 'polite'); body.append(notice);
    const profiles = filterRecruitProfiles(allRecruitProfiles(state), state, { all, query, category,life });
    body.append(element('p', `共 ${profiles.length} 位人物`, 'company-note'));
    const grid = element('div', '', 'company-grid recruitment-grid');
    for (const profile of profiles) {
      const joined = Boolean(state.party[profile.id]); const relationship = state.relationships[profile.id];
      const threshold=getRecruitmentThreshold(state,profile.id),service=serviceForPerson(state,profile.id);
      const affinity = relationship?.affinity ?? 0; const today = relationship?.lastInteraction === gameDayNumber(state.date);
      const available = canInteractPerson(state, profile.id);
      const card = element('article', '', 'company-card recruitment-card'); card.dataset.person = profile.id;
      const info = element('div', '', 'company-card-info');
      info.append(element('h3', personName(profile.id, state)), element('p', profile.role), element('p', displayText(profile.bio, state,profile.id), 'company-note'), element('p', profile.readOnly ? windowLabel(profile) : joined ? `已同行 · ${state.deployed.includes(profile.id) ? '出战' : '候补'}` : `邀请门槛 ${threshold} · 尚未同行`, 'party-member-status'));
      info.append(element('p', postingLabel(state, profile.id), 'company-current-posting'));
      info.append(element('p',lifeReferenceText(state,profile.id),'company-life'));
      if(service)info.append(element('p',serviceLabel(service),'company-office'));
      const meter = element('progress'); meter.max = 100; meter.value = affinity; meter.setAttribute('aria-label', `${personName(profile.id, state)}亲密度 ${affinity}/100`);
      if(!profile.readOnly) info.append(element('p', `亲密 ${affinity}/100${today ? ' · 当天已互动' : ''}`), meter);
      info.append(element('p', unavailableReason(profile, state), 'company-note'));
      const windows = element('details', '', 'person-windows'); windows.append(element('summary', '历史参考：年份与地点窗口'), element('p', windowLabel(profile))); info.append(windows);
      const actions = element('div', '', 'party-actions');
      if (!profile.readOnly) {
        actions.append(button('交谈 +8 · 免费 · 1日', () => mutate(state => interactPerson(state, profile.id, 'talk')), !available || today || affinity >= 100));
        actions.append(button('分享粮食 +12 · 军需−1 · 1日', () => mutate(state => interactPerson(state, profile.id, 'meal')), !available || today || affinity >= 100 || state.supplies < 1));
        actions.append(button(canHelpPerson(state,profile.id) ? '帮忙 +10 · 每月一次 · 1日' : '帮忙 · 本月已帮忙', () => mutate(state => interactPerson(state, profile.id, 'help')), !available || today || affinity >= 100 || !canHelpPerson(state,profile.id)));
      }
      if (!profile.readOnly && !joined) actions.append(button('邀请同行', () => mutate(state => invitePerson(state, profile.id)), !available || affinity < threshold));
      actions.append(button('查看详情', () => showCharacterDetails(profile.id, combat?.units.some(unit => unit.team === 'party' && unit.id === profile.id) ? combat : undefined,render)));
      if (!profile.readOnly) info.append(socialControls(state,profile.id,mutate));
      info.append(actions); card.append(portrait(profile, personName(profile.id, state)), info); grid.append(card);
    }
    if (!profiles.length) grid.append(element('p', '此时此地暂无可寻访人物，可查看所有人物行踪。', 'company-note'));
    body.append(grid);
    restoreFocus();
  }
  render();
  if(options.initialPersonId) {
    const target=body.querySelector<HTMLElement>(`[data-person="${CSS.escape(options.initialPersonId)}"]`);
    target?.scrollIntoView({block:'nearest'});target?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true});
  }
}
