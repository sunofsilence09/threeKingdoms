import type { GameState } from './state';
import { cityServices, getRecruitmentThreshold, serviceLabel } from './cityService';
import { recruitProfile } from './recruitmentCatalog';
import { showCharacterDetails } from './characterDetails';
import { getCharacterAppearance } from './characters';
import { renderGarrisonSummary } from './garrisonView';
import { personName } from './heroName';
import { lifeReferenceText } from './lifeView';

function node<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className=''):HTMLElementTagNameMap[K]{const element=document.createElement(tag);element.textContent=text;element.className=className;return element;}
/** The roster and recruitment share one career projection; this view never appoints people. */
export function renderCityOffice(state:GameState,onTalk:(personId:string)=>void):HTMLElement {
  const root=node('section','','city-office-roster');
  root.append(node('h2','府署名册'),node('p','士兵长与其他受雇人物需要亲密80才会接受邀请；普通士兵不能邀请。其他普通、主事与待聘人物仍为60。加入同行后解除原任职。','trade-muted'),renderGarrisonSummary(state));
  const services=cityServices(state,state.currentCityId);
  if(!services.length){root.append(node('p','此时此地暂无本批人物驻留府署。可在“寻访人物”查看各人的年份与城市。','trade-feedback'));return root;}
  const groups=[['garrison','地方驻军'],['governing','主事人物'],['employed','受雇人物'],['waiting','待聘人物'],['free','其他在城人物']] as const;
  for(const [kind,label] of groups){
    const people=services.filter(service=>kind==='garrison'?recruitProfile(service.personId)?.category==='garrison':service.kind===kind&&recruitProfile(service.personId)?.category!=='garrison');if(!people.length)continue;
    root.append(node('h3',label));const grid=node('div','','trade-grid');
    for(const service of people){
      const profile=recruitProfile(service.personId);if(!profile)continue;
      const card=node('article','','trade-card office-person-card');card.dataset.staff=profile.id;card.dataset.serviceKind=service.kind;
      const heading=node('div','','office-person-heading'),image=node('img','','office-person-image');image.src=getCharacterAppearance(profile.id,state.date).portrait;image.alt=`${personName(profile.id,state)}立绘`;image.loading='lazy';image.addEventListener('error',()=>image.hidden=true);
      const info=node('div');info.append(node('h3',personName(profile.id,state)),node('p',service.title),node('p',lifeReferenceText(state,profile.id),'trade-muted'),node('p',profile.readOnly?'城市守军整体 · 不能邀请':`亲密 ${state.relationships[profile.id]?.affinity??0}/100 · 邀请门槛 ${getRecruitmentThreshold(state,profile.id)}`));heading.append(image,info);
      card.append(heading,node('p',serviceLabel(service),'office-service-label'));
      const actions=node('div','','trade-actions');
      for(const [action,text,run] of [['details','人物详情',()=>showCharacterDetails(profile.id)],['talk','交谈与邀请',()=>onTalk(profile.id)]] as const){
        if(profile.readOnly&&action==='talk')continue;
        const button=node('button',text,'trade-button is-quiet');button.type='button';button.id=`office-${action}-${profile.id}`;button.addEventListener('click',run);actions.append(button);
      }
      card.append(actions);grid.append(card);
    }
    root.append(grid);
  }
  root.append(node('p',state.worldConflict&&!state.conflictRecovery?'府署现任与在城人员随当前天下局势变化；历史官员记录可从“地方官员”独立查阅，动态任职不是史实记载。姓名缺考时由军府机构代管。':'府署岗位与驻城为沿历史背景编排的游戏阶段，不是完整任期或逐日行踪；未详官员姓名不编造。','trade-muted'));
  return root;
}
