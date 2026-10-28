import Phaser from 'phaser';
import { createHeroHud } from '../heroHud';
import { getState, setState } from '../runtime';
import { availableRoutes, canPlayFactionMission, completeJourneyTask, type RouteId } from '../state';
import { advanceDays, chapterAt, dateLabel, originAt, PROVINCES } from '../history';
import { themeFor } from '../theme';
import { clearOverlay, setStatus, showPanel } from '../ui';
import { showLocalOfficials } from '../localOfficialPanel';
import { createWorldMap } from '../worldMapView';
import { cityAt, cityNameAt, planRoute, WORLD_CITIES } from '../world';
import { advanceTravel, cityContact, journeyLeg, remainingDays, resolveTravelEvent, restInCity, ROAD_NAMES, startTravel, workInCity } from '../travel';
import { createCityWorkControls } from '../cityWorkControls';
import '../worldScreen.css';
import { showPartyPanel, showRecruitmentPanel } from '../partyPanel';
import { showCityPanel } from '../cityPanel';
import { showEventCg } from '../eventCg';
import { eventPresentation } from '../eventContent';
import { cargoUsed } from '../economy';
import { createConflictRecovery, showConflictPanel } from '../conflictPanel';
import { factionAt } from '../worldConflictData';
import { conflictDateLabel } from '../conflictView';
import { withWorldDate } from '../worldTime';
import { isInspecting } from '../inspectionOverlay';
import { acknowledgeLifeNotices } from '../lifeView';
import { personName } from '../heroName';
import { routePrincipalId, routePrincipalName } from '../politicalPresentation';
import {createMusicControls} from '../musicControls';
import {showPlayerMilitary} from '../playerMilitaryPanel';

type NodeId = 'ambush' | 'recovery' | 'hub';
type EventChoice = Parameters<typeof resolveTravelEvent>[1];

export class OverworldScene extends Phaser.Scene {
  private root?: HTMLElement;
  private map?: ReturnType<typeof createWorldMap>;
  private hud?: ReturnType<typeof createHeroHud>;
  private selectedId?: string;
  private refreshAfterInspection = false;
  constructor() { super('Overworld'); }
  create(): void {
    clearOverlay();
    setState({ ...getState(), phase: 'overworld', battleParty: undefined });
    const shell = document.querySelector<HTMLElement>('.game-shell')!;
    shell.classList.add('is-world');
    this.root = document.createElement('section'); this.root.id = 'world-root';
    this.root.setAttribute('aria-label', '州郡与行旅'); shell.append(this.root);
    const changed = () => { this.refreshAfterInspection = true; };
    window.addEventListener('world-state-changed', changed);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.map?.destroy(); this.hud?.destroy(); this.root?.remove();
      window.removeEventListener('world-state-changed', changed);
      this.map = undefined; this.hud = undefined; this.root = undefined;
      shell.classList.remove('is-world'); clearOverlay();
      // The DOM map changes the shell height and can scroll the document. Refresh
      // Phaser's cached canvas bounds before the next scene accepts pointer input.
      this.scale.refresh();
    });
    this.render();
  }
  update(): void {
    if (this.refreshAfterInspection && !isInspecting()) {
      this.refreshAfterInspection = false;
      this.render();
    }
  }
  private render(focusId?: string): void {
    if (!this.root) return;
    this.map?.destroy(); this.hud?.destroy(); this.root.replaceChildren();
    const state = getState(), city = cityAt(state.currentCityId), journey = state.journey;
    const leg = journey ? journeyLeg(journey) : undefined;
    if (journey) this.selectedId = journey.path.at(-1);
    else if (this.selectedId === city.id) this.selectedId = undefined;
    const planned = this.selectedId ? planRoute(city.id, this.selectedId) : undefined;
    setStatus(dateLabel(state.date));
    const el = <T extends keyof HTMLElementTagNameMap>(tag: T, className: string, text?: string, parent: HTMLElement = this.root!) => {
      const node = document.createElement(tag); node.className = className;
      if (text) node.textContent = text; parent.append(node); return node;
    };
    const button = (text: string, action: () => void, parent: HTMLElement, quiet = false, disabled = false, id?: string) => {
      const b = el('button', `world-button${quiet ? ' is-quiet' : ''}`, text, parent);
      b.type = 'button'; b.disabled = disabled; if (id) b.id = id; b.addEventListener('click',action); return b;
    };
    const header = el('header', 'world-header');
    const heading = el('div', 'world-header-title', undefined, header);
    el('span', 'world-eyebrow', `${themeFor(state.date).season} · 2.1.0 人物关系网`, heading);
    el('h1', '', journey ? `${cityNameAt(leg!.from,state.date)} → ${cityNameAt(leg!.to,state.date)}` : `${cityNameAt(city.id,state.date)} · ${city.prefecture}`, heading);
    el('p', 'world-date', dateLabel(state.date), heading);
    const world = state.conflictRecovery ? undefined : state.worldConflict;
    const owner = world?.cities[city.id];
    if (owner) el('p', 'world-date', `${journey ? '出发城' : '当前城'}归属 · ${factionAt(owner.factionId).name}`, heading);
    const stats = el('div', 'world-header-stats', undefined, header);
    el('p', '', `军需 ${state.supplies}　士气 ${state.morale}`, stats);
    el('p', '', `铜钱 ${state.economy.coins}　货舱 ${cargoUsed(state.economy)}/${state.economy.capacity}`, stats);
    if(world?.playerReserve!==undefined)el('p','','随行预备兵 '+world.playerReserve,stats);
    el('p', '', state.route ? `归属 · ${routePrincipalName(state.route,state)}` : '无所属 · 独自行旅', stats);
    el('small', '', `出生地：${originAt(state.originId).name}`, stats);
    this.root.append(createMusicControls());
    const layout = el('div', 'world-layout');
    const mapColumn = el('div', 'world-map-column', undefined, layout);
    this.map = createWorldMap({ currentId:city.id, selectedId:this.selectedId, path: journey?.path ?? planned?.path,
      ...(journey && leg ? {progress:{from:leg.from,to:leg.to,fraction:journey.legDay/leg.days}} : {}),
      year:state.date.year, date:state.date, worldConflict:world, onSelect:id=>{ if (getState().journey) return; this.selectedId=id; this.render(); } });
    this.map.element.dataset.season = ({春:'spring',夏:'summer',秋:'autumn',冬:'winter'} as Record<string,string>)[themeFor(state.date).season];
    mapColumn.append(this.map.element);
    el('p', 'world-context', chapterAt(state.date.year).context, mapColumn);
    const side = el('aside','world-sidebar',undefined,layout);
    if(state.life?.notices.length){
      const notices=el('section','world-notice life-notices',undefined,side);notices.dataset.lifeNotices='';notices.setAttribute('role','status');
      el('h2','',`离世消息 · ${state.life.notices.length} 人`,notices);
      const list=el('ul','',undefined,notices);
      for(const notice of state.life.notices)el('li','',`${personName(notice.id,state)} · 本局于${notice.deathYear}年离世${notice.migrated?'（旧档接入时核定）':''}`,list);
      el('p','','已故同行者的成长与交情存入“队伍 → 同行纪念”；主角已学武学保留。',notices);
      button('已阅离世消息',()=>{setState(acknowledgeLifeNotices(getState()));this.render('world-party');},notices,true,false,'life-notices-dismiss');
    }
    if (state.conflictRecovery) side.append(createConflictRecovery(()=>this.render('world-conflict')));
    if (state.conflictMigration && !state.conflictRecovery) {
      const migration=el('section','world-notice',undefined,side);migration.dataset.conflictMigration='';
      el('p','','旧档已从当前年月接入天下局势；此前战争未追溯演算，人物、财货和行程保留。',migration);
      button('知道了',()=>{setState({...getState(),conflictMigration:undefined});this.render('world-conflict');},migration,true,false,'conflict-migration-dismiss');
    }
    button('天下局势 · 城池 / 军队 / 战报',()=>showConflictPanel(()=>this.render('world-conflict')),side,true,!!state.conflictRecovery,'world-conflict');
    if (world) {
      const destinationId = journey?.path.at(-1) ?? this.selectedId;
      if (destinationId) el('p','world-notice',`目的地 ${cityNameAt(destinationId,state.date)} · ${factionAt(world.cities[destinationId].factionId).name}`,side);
      const relevant = [!journey ? city.id : undefined,destinationId].filter((id):id is string=>!!id);
      for (const id of [...new Set(relevant)]) {
        const stock = world.cities[id];
        if (stock.occupationDay >= 0) {
          const n=el('p','world-notice',`${id===city.id&&!journey?'所在城':'目的地'} ${cityNameAt(id,state.date)} 已于${conflictDateLabel(stock.occupationDay)}易主，现由${factionAt(stock.factionId).name}管理。${journey?'原行程继续，到达后可寻访在城人物。':'仍可照常行旅与进入城池。'}`,side);
          n.dataset.conflictOccupation=id;
        }
      }
      const latest=world.reports.at(-1);
      if (latest) { const n=el('p','world-notice',`天下近报 · ${conflictDateLabel(latest.day)} · ${latest.text}`,side);n.dataset.conflictLatestReport=String(latest.id); }
    }
    if (state.travelNotice) { const n=el('p','world-notice',state.travelNotice,side); n.setAttribute('role','status'); }
    const travelCard = el('section','world-card world-travel-card',undefined,side);
    el('h2','',journey ? '在路上' : '下一站',travelCard);
    if (journey && leg) {
      el('p','world-destination',`前往 ${cityNameAt(journey.path.at(-1)!,state.date)}`,travelCard);
      el('p','',`此段：${cityNameAt(leg.from,state.date)} → ${cityNameAt(leg.to,state.date)} · ${ROAD_NAMES[leg.kind]}`,travelCard);
      el('p','world-travel-numbers',`已赶路 ${journey.elapsed} 日 · 还需 ${remainingDays(journey)} 日`,travelCard);
      const progress = el('progress','world-progress',undefined,travelCard);
      progress.max=journey.elapsed+remainingDays(journey); progress.value=journey.elapsed; progress.setAttribute('aria-label','行程进度');
      el('p','world-muted','途中停留另计入日期；行程中的城名为当前路段。',travelCard);
      if (journey.event) this.renderEvent(travelCard);
      else this.renderSchedule(travelCard);
      const details=el('details','world-route-details',undefined,travelCard); el('summary','','查看完整行程',details);
      el('p','',journey.path.map(id=>cityNameAt(id,state.date)).join(' → '),details);
    } else {
      const label=el('label','world-destination-label','选择目的地',travelCard); label.htmlFor='world-destination';
      const select=el('select','world-destination-select',undefined,travelCard); select.id='world-destination';
      const placeholder=document.createElement('option'); placeholder.value=''; placeholder.textContent='从地图或列表选择城邑'; select.append(placeholder);
      PROVINCES.forEach(province=>{
        const group=document.createElement('optgroup'); group.label=province.id==='jiao' && state.date.year>=203 ? '交州' : province.name;
        WORLD_CITIES.filter(c=>c.provinceId===province.id).forEach(c=>{
          const option=document.createElement('option'); option.value=c.id; option.textContent=`${cityNameAt(c.id,state.date)} · ${c.prefecture}${c.id===city.id ? '（所在）' : ''}`;
          option.disabled=c.id===city.id; group.append(option);
        }); select.append(group);
      });
      select.value=this.selectedId ?? '';
      select.addEventListener('change',()=>{this.selectedId=select.value||undefined;this.render('world-destination');});
      if (this.selectedId && planned?.legs.length) {
        el('p','world-destination',`${cityNameAt(this.selectedId,state.date)} · 预计 ${planned.days} 日`,travelCard);
        el('p','world-route-path',planned.path.map(id=>cityNameAt(id,state.date)).join(' → '),travelCard);
        const details=el('details','world-route-details',undefined,travelCard); el('summary','','途经路段与天数',details);
        const list=el('ul','',undefined,details);
        planned.legs.forEach(l=>el('li','',`${cityNameAt(l.from,state.date)} → ${cityNameAt(l.to,state.date)} · ${ROAD_NAMES[l.kind]} ${l.days}日`,list));
        button('启程',()=>{ if(this.selectedId) {setState(startTravel(getState(),this.selectedId));this.render('continue-travel');}},travelCard,false,false,'start-travel');
      } else el('p','world-muted','选一座城，查看路线和预计行期。途中遇事可处理后继续赶路。',travelCard);
    }
    const local=el('section','world-card',undefined,side); el('h2','',`城中事务${journey ? ' · 抵达后开放' : ''}`,local);
    const localActions=el('div','world-action-grid',undefined,local);
    button('进入城池',()=>showCityPanel(()=>this.render('enter-city')),localActions,false,!!journey,'enter-city');
    button('军务 · 募兵 / 攻城',()=>showPlayerMilitary(()=>this.render('world-military')),localActions,true,!!journey||!!state.conflictRecovery,'world-military');
    button('地方官员',showLocalOfficials,localActions,true,!!journey);
    button('寻访人物',()=>showRecruitmentPanel(()=>this.render('world-recruitment')),localActions,true,!!journey,'world-recruitment');
    button(state.flags.escortWon ? canPlayFactionMission(state) ? '阵营护送任务' : '当地故事 · 已完成' : '当地故事',()=>this.localStory(),localActions,true,!!journey);
    const contact=cityContact(city.id,state.date,state);
    if(contact && !state.route) button(`${state.flags[`met:${contact}`]?'再访':'拜访'}${routePrincipalName(contact,state)}`,()=>this.meet(contact),localActions,true,!!journey);
    local.append(createCityWorkControls(state,blocks=>{setState(workInCity(getState(),blocks));this.render('city-work-blocks');}));
    const rest=el('div','world-action-grid',undefined,local);
    button('安居一月 · 30日',()=>{setState(restInCity(getState(),30));this.render();},rest,true,!!journey);
    button('长期停留 · 一年',()=>this.confirmLongRest(),rest,true,!!journey);
    el('p','world-muted','历法简化为每月30日，可行旅至310年。休整与行旅推进日期，也会结算人物寿命。',local);
    if (!state.route && availableRoutes(state).length) button('查看可投奔的阵营',()=>this.scene.start('RouteChoice'),side,true);
    button(`队伍 · 出战 ${state.deployed.length}/5`,()=>showPartyPanel(()=>this.render('world-party')),side,true,false,'world-party');
    this.hud=createHeroHud(state.route,undefined,state.party);
    const hudNode=document.querySelector<HTMLElement>('#hud-root .hero-hud'); if(hudNode) side.append(hudNode);
    if(focusId) (this.root.querySelector<HTMLElement>(`#${focusId}`) ?? this.root.querySelector<HTMLElement>('.world-travel-event button'))?.focus({preventScroll:true});
    if(journey?.event && !journey.event.cgSeen)showEventCg(()=>this.render('continue-travel'));
  }
  private renderSchedule(parent:HTMLElement):void {
    const form=document.createElement('form');form.className='travel-schedule';form.noValidate=true;
    const label=document.createElement('label');label.textContent='本次赶路天数（1—30日）';label.htmlFor='travel-days';
    const input=document.createElement('input');input.id='travel-days';input.className='trade-input';input.type='number';input.min='1';input.max='30';input.step='1';input.inputMode='numeric';input.value=String(getState().travelDays);
    const shortcuts=document.createElement('div');shortcuts.className='travel-shortcuts';
    const feedback=document.createElement('p');feedback.className='travel-validation';feedback.setAttribute('role','status');
    for(const days of [1,3,7,15]){const quick=document.createElement('button');quick.type='button';quick.className='world-button is-quiet';quick.textContent=`${days}日`;quick.addEventListener('click',()=>{input.value=String(days);feedback.textContent='';});shortcuts.append(quick);}
    const submit=document.createElement('button');submit.type='submit';submit.id='continue-travel';submit.className='world-button';submit.textContent='继续赶路 · 按日程';
    form.addEventListener('submit',event=>{event.preventDefault();const days=Number(input.value);
      if(!input.checkValidity()||!Number.isSafeInteger(days)||days<1||days>30){feedback.textContent='请输入1—30之间的整数天数。';input.focus();return;}
      setState(advanceTravel({...getState(),travelDays:days},days));this.render('continue-travel');
    });
    form.append(label,input,shortcuts,feedback,submit);parent.append(form);
  }
  private renderEvent(parent: HTMLElement): void {
    const state=getState(), event=state.journey!.event!, leg=journeyLeg(state.journey!);
    const box=document.createElement('section'); box.className='world-travel-event'; box.setAttribute('aria-label','途中见闻'); parent.append(box);
    if(!event.cgSeen){box.textContent='见闻展开中，请先查看画面。';return;}
    const {title,body}=eventPresentation(state);
    const h=document.createElement('h3');h.textContent=title;box.append(h);
    const p=document.createElement('p');p.textContent=body;box.append(p);
    const hint=document.createElement('small');hint.textContent='途中故事为游戏演绎。先处理见闻，再继续原行程。';box.append(hint);
    const action=(label:string,choice:EventChoice,disabled=false)=>{
      const b=document.createElement('button');b.type='button';b.className='world-button is-quiet';b.textContent=label;b.disabled=disabled;
      b.addEventListener('click',()=>{const next=resolveTravelEvent(getState(),choice);setState(next);
        if(choice==='fight'&&next.journey?.event?.inBattle)this.scene.start('Battle',{mode:'ambush'}); else this.render('continue-travel');
      });box.append(b);
    };
    if(event.kind==='rain'||event.kind==='ferry'){action('出军需1 · 即刻通行','pay',state.supplies<1);action('等候2日 · 无需军需','safe');}
    if(event.kind==='refugees'){action('赠粮 · 军需−1 / 士气+2','pay',state.supplies<1);action('陪伴3日 · 士气+1','safe');action('留下祝愿，继续赶路','skip');}
    if(event.kind==='merchant'){action('帮工1日 · 军需+1','safe');action('辞别商旅，继续赶路','skip');}
    if(event.kind==='bandits'){action(leg.kind==='water'?'迎战水盗':'迎战匪徒','fight');action('绕路3日 · 士气−1','safe');}
    if(event.kind==='contact'){action(`拜访${routePrincipalName(event.contact!,state)} · 1日`,'meet');action('暂不拜访，继续赶路','skip');}
    if(event.kind==='market-news')action('记下行情，继续行程','skip');
    if(event.kind==='wolves'){action('迎战狼群','fight');action('避开狼群 · 绕行3日 / 士气−1','safe');}
  }
  private meet(route: RouteId): void {
    if(getState().journey)return;
    const state=getState(),name=routePrincipalName(route,state),principalId=routePrincipalId(route,state);
    if(cityContact(state.currentCityId,state.date,state)!==route)return;
    showPanel({eyebrow:`${cityNameAt(state.currentCityId,state.date)} · 地方见闻`,title:`拜访${name}`,body:'循着消息，你们拜访了对方的队伍。相遇后可以保留交情，继续独自行旅，也可以另选时机决定归属。此次拜访停留1日。',actions:[
      {label:'停留1日，记下交情',onClick:()=>{const s=getState();if(s.journey||cityContact(s.currentCityId,s.date,s)!==route||routePrincipalId(route,s)!==principalId)return;
        const next=withWorldDate(s,advanceDays(s.date,1));
        const met=routePrincipalId(route,next)===principalId&&cityContact(next.currentCityId,next.date,next)===route;
        setState({...next,...(met?{flags:{...next.flags,[`met:${route}`]:true}}:{}),travelNotice:met?`已结识${routePrincipalName(route,next)}，可在阵营入口选择去向。`:'对方行踪已有变化；停留1日，未能亲自会面。'});clearOverlay();this.render();}},
      {label:'暂不拜访',variant:'quiet',onClick:clearOverlay},
    ]});
  }
  private confirmLongRest(): void {
    if(getState().journey)return;
    showPanel({eyebrow:'长期停留 · 明确推进时间',title:'在此安居一年？',body:'将在当前城邑停留360个游戏日，日期、季节和历史章节随之推进，并补充3军需。不会自动迁往别处。',actions:[
      {label:'确认安居一年 · 推进360日',onClick:()=>{setState(restInCity(getState(),360));clearOverlay();this.render();}},
      {label:'继续眼前的行旅',variant:'quiet',onClick:clearOverlay},
    ]});
  }
  private localStory(): void {
    if(getState().journey)return;
    const s=getState();
    if (s.flags.escortWon && canPlayFactionMission(s)) {
      showPanel({ eyebrow: `${cityNameAt(s.currentCityId,s.date)} · ${routePrincipalName(s.route!,s)}一方`, title: '再为同行的人护送一程。',
        body: '先前中立护送的功劳仍在。如今你选择了归属，可以完成一场独立的阵营护送；胜利获得基础经验45，并消耗3日。', actions: [
          { label: '开始阵营护送', onClick: () => this.scene.start('Battle', { mode: 'route' }) },
          { label: '回到地图', variant: 'quiet', onClick: clearOverlay },
        ] });
      return;
    }
    if(s.flags.escortWon){showPanel({eyebrow:cityNameAt(s.currentCityId,s.date),title:'这段同行的故事已经完成。',body:'乡道已通，粮车也已平安过桥。带上沿途留下的交情，继续去别处看看。',actions:[{label:'回到地图',onClick:clearOverlay}]});return;}
    this.selectNode(!s.flags.ambushWon?'ambush':!s.flags.recovered?'recovery':'hub');
  }
  private selectNode(id: NodeId): void {
    if(getState().journey)return;
    const state=getState(),city=cityAt(state.currentCityId);
    if(id==='ambush'){
      showPanel({eyebrow:`${cityNameAt(city.id,state.date)} · 当地故事`,title:'山贼占住了乡道路口。',body:'先让同行的人安全穿过去。这一战为求生，也为路上需要帮助的人。',actions:[
        {label:'进入战斗',onClick:()=>this.scene.start('Battle',{mode:'ambush'})},{label:'调整出战阵容',variant:'quiet',onClick:()=>showPartyPanel()},{label:'稍后再来',variant:'quiet',onClick:clearOverlay},
      ]});return;
    }
    if(id==='recovery'){
      showPanel({eyebrow:`${cityNameAt(city.id,state.date)} · 村落`,title:'乡道畅通了，村民正在修整家园。',body:'帮忙修好村口的道路，村民愿用粮水答谢。此事花费1日，获得1军需；之后可护送乡民。',actions:[
        {label:'帮忙修路 · 1日 / 军需+1',onClick:()=>{const s=getState();if(!s.flags.recovered&&!s.journey)setState(completeJourneyTask({...s,supplies:s.supplies+1},'recovered'));clearOverlay();this.render();}},
        {label:'稍后再来',variant:'quiet',onClick:clearOverlay},
      ]});return;
    }
    showPanel({eyebrow:`${cityNameAt(city.id,state.date)} · 营地`,title:'为同行的人开路。',body:'乡民凑出短刀、木枪与猎弓，请你们护送粮车过桥。你们答应了，这一次为身边的人而战。',actions:[
      {label:'开始护送',onClick:()=>this.scene.start('Battle',{mode:'route'})},{label:'调整出战阵容',variant:'quiet',onClick:()=>showPartyPanel()},{label:'暂留营地',variant:'quiet',onClick:clearOverlay},
    ]});
  }
}
