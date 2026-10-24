import type { GameState } from './state';
import { clearOverlay, showPanel } from './ui';
import { cityNameAt } from './cityNames';
import { personName } from './heroName';
import './startMenu.css';

export function showStartMenu(state:GameState,canContinue:boolean,onContinue:()=>void,onRestart:()=>void):void {
  const panel=showPanel({eyebrow:'1.0.0 世代更迭',title:'三国行旅',className:'start-menu',
    body:canContinue
      ? `${personName('traveler',state)} · 公元${state.date.year}年${state.date.month}月${state.date.day??1}日 · ${cityNameAt(state.currentCityId,state.date)}\n${state.phase==='battle'?'战斗进行中，继续将恢复当前战局。':'继续上次的旅程。'}\n重新开始会创建新的旅程，并重新输入主角姓名。`
      : '尚无可继续的存档。开始一段新旅程，为你的主角取名。',
    actions:[{label:'继续游戏',disabled:!canContinue,onClick:()=>{if(canContinue){clearOverlay();onContinue();}}},
      {label:'重新开始',variant:canContinue?'quiet':'primary',onClick:()=>{clearOverlay();onRestart();}}]});
  panel.setAttribute('role','dialog');panel.setAttribute('aria-label','选择开始或继续游戏');
  panel.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({preventScroll:true});
}
