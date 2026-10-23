import Phaser from 'phaser';
import { createHeroHud } from '../heroHud';
import { getState, setState } from '../runtime';
import { availableRoutes, canPlayFactionMission, completeJourneyTask, type RouteId } from '../state';
import { advanceDays, chapterAt, dateLabel, originAt, PROVINCES, routeLeaderName } from '../history';
import { themeFor } from '../theme';
import { clearOverlay, setStatus, showPanel } from '../ui';
import { showLocalOfficials } from '../localOfficialPanel';
import { createWorldMap } from '../worldMapView';
import { cityAt, planRoute, WORLD_CITIES } from '../world';
import { advanceTravel, cityContact, journeyLeg, remainingDays, resolveTravelEvent, restInCity, ROAD_NAMES, startTravel } from '../travel';
import '../worldScreen.css';
import { showPartyPanel, showRecruitmentPanel } from '../partyPanel';

type NodeId = 'ambush' | 'recovery' | 'hub';
type EventChoice = Parameters<typeof resolveTravelEvent>[1];

export class OverworldScene extends Phaser.Scene {
  private root?: HTMLElement;
  private map?: ReturnType<typeof createWorldMap>;
  private hud?: ReturnType<typeof createHeroHud>;
  private selectedId?: string;
  constructor() { super('Overworld'); }
  create(): void {
    clearOverlay();
    setState({ ...getState(), phase: 'overworld', battleParty: undefined });
    const shell = document.querySelector<HTMLElement>('.game-shell')!;
    shell.classList.add('is-world');
    this.root = document.createElement('section'); this.root.id = 'world-root';
    this.root.setAttribute('aria-label', '州郡与行旅'); shell.append(this.root);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.map?.destroy(); this.hud?.destroy(); this.root?.remove();
      this.map = undefined; this.hud = undefined; this.root = undefined;
      shell.classList.remove('is-world'); clearOverlay();
      // The DOM map changes the shell height and can scroll the document. Refresh
      // Phaser's cached canvas bounds before the next scene accepts pointer input.
      this.scale.refresh();
    });
    this.render();
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
    el('span', 'world-eyebrow', `${themeFor(state.date).season} · 乱世行旅`, heading);
    el('h1', '', journey ? `${cityAt(leg!.from).name} → ${cityAt(leg!.to).name}` : `${city.name} · ${city.prefecture}`, heading);
    el('p', 'world-date', dateLabel(state.date), heading);
    const stats = el('div', 'world-header-stats', undefined, header);
    el('p', '', `军需 ${state.supplies}　士气 ${state.morale}`, stats);
    el('p', '', state.route ? `归属 · ${routeLeaderName(state.route,state.date.year)}` : '无所属 · 独自行旅', stats);
    el('small', '', `出生地：${originAt(state.originId).name}`, stats);
    const layout = el('div', 'world-layout');
    const mapColumn = el('div', 'world-map-column', undefined, layout);
    this.map = createWorldMap({ currentId:city.id, selectedId:this.selectedId, path: journey?.path ?? planned?.path,
      ...(journey && leg ? {progress:{from:leg.from,to:leg.to,fraction:journey.legDay/leg.days}} : {}),
      year:state.date.year, onSelect:id=>{ if (getState().journey) return; this.selectedId=id; this.render(); } });
    this.map.element.dataset.season = ({春:'spring',夏:'summer',秋:'autumn',冬:'winter'} as Record<string,string>)[themeFor(state.date).season];
    mapColumn.append(this.map.element);
    el('p', 'world-context', chapterAt(state.date.year).context, mapColumn);
    const side = el('aside','world-sidebar',undefined,layout);
    if (state.travelNotice) { const n=el('p','world-notice',state.travelNotice,side); n.setAttribute('role','status'); }
    const travelCard = el('section','world-card world-travel-card',undefined,side);
    el('h2','',journey ? '在路上' : '下一站',travelCard);
    if (journey && leg) {
      el('p','world-destination',`前往 ${cityAt(journey.path.at(-1)!).name}`,travelCard);
      el('p','',`此段：${cityAt(leg.from).name} → ${cityAt(leg.to).name} · ${ROAD_NAMES[leg.kind]}`,travelCard);
      el('p','world-travel-numbers',`已赶路 ${journey.elapsed} 日 · 还需 ${remainingDays(journey)} 日`,travelCard);
      const progress = el('progress','world-progress',undefined,travelCard);
      progress.max=journey.elapsed+remainingDays(journey); progress.value=journey.elapsed; progress.setAttribute('aria-label','行程进度');
      el('p','world-muted','途中停留另计入日期；行程中的城名为当前路段。',travelCard);
      if (journey.event) this.renderEvent(travelCard);
      else button('继续赶路 · 最多3日',()=>{setState(advanceTravel(getState()));this.render('continue-travel');},travelCard,false,false,'continue-travel');
      const details=el('details','world-route-details',undefined,travelCard); el('summary','','查看完整行程',details);
      el('p','',journey.path.map(id=>cityAt(id).name).join(' → '),details);
    } else {
      const label=el('label','world-destination-label','选择目的地',travelCard); label.htmlFor='world-destination';
      const select=el('select','world-destination-select',undefined,travelCard); select.id='world-destination';
      const placeholder=document.createElement('option'); placeholder.value=''; placeholder.textContent='从地图或列表选择城邑'; select.append(placeholder);
      PROVINCES.forEach(province=>{
        const group=document.createElement('optgroup'); group.label=province.id==='jiao' && state.date.year>=203 ? '交州' : province.name;
        WORLD_CITIES.filter(c=>c.provinceId===province.id).forEach(c=>{
          const option=document.createElement('option'); option.value=c.id; option.textContent=`${c.name} · ${c.prefecture}${c.id===city.id ? '（所在）' : ''}`;
          option.disabled=c.id===city.id; group.append(option);
        }); select.append(group);
      });
      select.value=this.selectedId ?? '';
      select.addEventListener('change',()=>{this.selectedId=select.value||undefined;this.render('world-destination');});
      if (this.selectedId && planned?.legs.length) {
        el('p','world-destination',`${cityAt(this.selectedId).name} · 预计 ${planned.days} 日`,travelCard);
        el('p','world-route-path',planned.path.map(id=>cityAt(id).name).join(' → '),travelCard);
        const details=el('details','world-route-details',undefined,travelCard); el('summary','','途经路段与天数',details);
        const list=el('ul','',undefined,details);
        planned.legs.forEach(l=>el('li','',`${cityAt(l.from).name} → ${cityAt(l.to).name} · ${ROAD_NAMES[l.kind]} ${l.days}日`,list));
        button('启程',()=>{ if(this.selectedId) {setState(startTravel(getState(),this.selectedId));this.render('continue-travel');}},travelCard,false,false,'start-travel');
      } else el('p','world-muted','选一座城，查看路线和预计行期。途中遇事可处理后继续赶路。',travelCard);
    }
    const local=el('section','world-card',undefined,side); el('h2','',`城中事务${journey ? ' · 抵达后开放' : ''}`,local);
    const localActions=el('div','world-action-grid',undefined,local);
    button('地方官员',showLocalOfficials,localActions,true,!!journey);
    button('寻访人物',()=>showRecruitmentPanel(()=>this.render('world-recruitment')),localActions,true,!!journey,'world-recruitment');
    button(state.flags.escortWon ? canPlayFactionMission(state) ? '阵营护送任务' : '当地故事 · 已完成' : '当地故事',()=>this.localStory(),localActions,true,!!journey);
    const contact=cityContact(city.id,state.date);
    if(contact && !state.route) button(`${state.flags[`met:${contact}`]?'再访':'拜访'}${routeLeaderName(contact,state.date.year)}`,()=>this.meet(contact),localActions,true,!!journey);
    const rest=el('div','world-action-grid',undefined,local);
    button('帮工1日 · 军需+1',()=>{setState(restInCity(getState(),1));this.render();},rest,true,!!journey);
    button('安居一月 · 30日',()=>{setState(restInCity(getState(),30));this.render();},rest,true,!!journey);
    button('长期停留 · 一年',()=>this.confirmLongRest(),rest,true,!!journey);
    el('p','world-muted','历法简化为每月30日。休整与行旅推进日期，军需不按日扣除。',local);
    if (!state.route && availableRoutes(state).length) button('查看可投奔的阵营',()=>this.scene.start('RouteChoice'),side,true);
    button(`队伍 · 出战 ${state.deployed.length}/5`,()=>showPartyPanel(()=>this.render('world-party')),side,true,false,'world-party');
    this.hud=createHeroHud(state.route,undefined,state.party);
    const hudNode=document.querySelector<HTMLElement>('#hud-root .hero-hud'); if(hudNode) side.append(hudNode);
    if(focusId) this.root.querySelector<HTMLElement>(`#${focusId}`)?.focus({preventScroll:true});
  }
  private renderEvent(parent: HTMLElement): void {
    const state=getState(), event=state.journey!.event!, leg=journeyLeg(state.journey!);
    const box=document.createElement('section'); box.className='world-travel-event'; box.setAttribute('aria-label','途中见闻'); parent.append(box);
    const content: Record<string,[string,string]>={
      rain:['雨阻道路',leg.kind==='mountain'?'连日雨水让山道泥泞，山口又有落石。可雇向导探路，或在山麓等雨停。':'连日雨水让驿道积水难行。可雇向导寻找可走的路，或在路旁客舍等候。'],
      ferry:['渡口候船','渡口的船只尚未开行。可出军需安排船位，或随商旅等下一班船。'],
      refugees:['路遇流民',`${leg.kind==='water'?'一队避乱乡民正在渡口候船':leg.kind==='mountain'?'一队避乱乡民在山口停歇':'一队避乱乡民在路旁停歇'}。他们需要粮水，也需要有人陪着走过险路。`],
      merchant:['商旅歇脚',`${leg.kind==='water'?'船队正在码头装卸货物':leg.kind==='mountain'?'驮队正在山麓整理行装':'商队正在驿站整理货物'}，愿用一份军需换你们帮忙照看一天行装。`],
      bandits:leg.kind==='water'?['水盗截船','水面上有盗船逼近，索取财货。可以与同行者迎战，也可以改道换渡口避开。']:['匪患拦路',leg.kind==='mountain'?'山口有人据险索取财货。可以与同行者迎战，也可以绕过山口。':'前路有人持械索取财货。可以与同行者迎战，也可以绕路避开。'],
      contact:['故道相逢',`沿途听到了${event.contact?routeLeaderName(event.contact,state.date.year):'一位故人'}的消息。可停留一日，前往拜访。`],
    };
    const [title,body]=content[event.kind];
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
    if(event.kind==='contact'){action('拜访1日 · 结识此方','meet');action('暂不拜访，继续赶路','skip');}
  }
  private meet(route: RouteId): void {
    if(getState().journey)return;
    const state=getState(),name=routeLeaderName(route,state.date.year);
    showPanel({eyebrow:`${cityAt(state.currentCityId).name} · 地方见闻`,title:`拜访${name}`,body:'循着消息，你们拜访了对方的队伍。相遇后可以保留交情，继续独自行旅，也可以另选时机决定归属。此次拜访停留1日。',actions:[
      {label:'停留1日，记下交情',onClick:()=>{const s=getState();if(s.journey)return;setState({...s,date:advanceDays(s.date,1),flags:{...s.flags,[`met:${route}`]:true},travelNotice:`已结识${name}，可在阵营入口选择去向。`});clearOverlay();this.render();}},
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
      showPanel({ eyebrow: `${cityAt(s.currentCityId).name} · ${routeLeaderName(s.route!, s.date.year)}一方`, title: '再为同行的人护送一程。',
        body: '先前中立护送的功劳仍在。如今你选择了归属，可以完成一场独立的阵营护送；胜利获得基础经验45，并消耗3日。', actions: [
          { label: '开始阵营护送', onClick: () => this.scene.start('Battle', { mode: 'route' }) },
          { label: '回到地图', variant: 'quiet', onClick: clearOverlay },
        ] });
      return;
    }
    if(s.flags.escortWon){showPanel({eyebrow:cityAt(s.currentCityId).name,title:'这段同行的故事已经完成。',body:'乡道已通，粮车也已平安过桥。带上沿途留下的交情，继续去别处看看。',actions:[{label:'回到地图',onClick:clearOverlay}]});return;}
    this.selectNode(!s.flags.ambushWon?'ambush':!s.flags.recovered?'recovery':'hub');
  }
  private selectNode(id: NodeId): void {
    if(getState().journey)return;
    const state=getState(),city=cityAt(state.currentCityId);
    if(id==='ambush'){
      showPanel({eyebrow:`${city.name} · 当地故事`,title:'山贼占住了乡道路口。',body:'先让同行的人安全穿过去。这一战为求生，也为路上需要帮助的人。',actions:[
        {label:'进入战斗',onClick:()=>this.scene.start('Battle',{mode:'ambush'})},{label:'调整出战阵容',variant:'quiet',onClick:()=>showPartyPanel()},{label:'稍后再来',variant:'quiet',onClick:clearOverlay},
      ]});return;
    }
    if(id==='recovery'){
      showPanel({eyebrow:`${city.name} · 村落`,title:'乡道畅通了，村民正在修整家园。',body:'帮忙修好村口的道路，村民愿用粮水答谢。此事花费1日，获得1军需；之后可护送乡民。',actions:[
        {label:'帮忙修路 · 1日 / 军需+1',onClick:()=>{const s=getState();if(!s.flags.recovered&&!s.journey)setState(completeJourneyTask({...s,supplies:s.supplies+1},'recovered'));clearOverlay();this.render();}},
        {label:'稍后再来',variant:'quiet',onClick:clearOverlay},
      ]});return;
    }
    showPanel({eyebrow:`${city.name} · 营地`,title:'为同行的人开路。',body:'乡民凑出短刀、木枪与猎弓，请你们护送粮车过桥。你们答应了，这一次为身边的人而战。',actions:[
      {label:'开始护送',onClick:()=>this.scene.start('Battle',{mode:'route'})},{label:'调整出战阵容',variant:'quiet',onClick:()=>showPartyPanel()},{label:'暂留营地',variant:'quiet',onClick:clearOverlay},
    ]});
  }
}
