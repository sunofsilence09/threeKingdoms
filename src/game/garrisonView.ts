import { cityGarrison, GARRISON_CAP, GARRISON_MONTHLY_RECRUITS } from './garrisonArmy';
import { ATTRIBUTE_IDS, ATTRIBUTE_LABELS } from './attributes';
import type { GameState } from './state';
import { armySummary, showConflictArmy, showConflictPanel } from './conflictPanel';
import { WORLD_CITIES } from './world';

/** The city roster and troop portrait show the same dated formation totals. */
export function renderGarrisonSummary(state: GameState, cityId = state.currentCityId, attributes = false): HTMLElement {
  const army = cityGarrison(state, cityId), section = document.createElement('section');
  section.className = 'garrison-summary'; section.dataset.garrisonCity = cityId; section.dataset.troops = String(army.troops);
  const heading = document.createElement('h3'); heading.textContent = `${army.cityName}守军 · ${army.troops.toLocaleString('zh-CN')} 人${army.factionName ? ` · ${army.factionName}` : ''}`;
  const management = document.createElement('p'); management.textContent = `共同管理：${army.prefectLabel} · ${army.captainLabel}`;
  const stats = document.createElement('dl'); stats.className = 'garrison-totals';
  const values: [string, string][] = [['部队总生命', String(army.strength.hp)], ['合计攻击', String(army.strength.attack)], ['合计防御', String(army.strength.defense)]];
  if (attributes) for (const id of ATTRIBUTE_IDS) values.push([`合计${ATTRIBUTE_LABELS[id]}`, String(army.strength.attributes[id])]);
  for (const [label, value] of values) { const cell = document.createElement('div'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; cell.append(dt, dd); stats.append(cell); }
  const note = document.createElement('p'); note.className = 'trade-muted';
  note.textContent = `单兵生命10、攻击3、防御1；部队生命与属性按有效兵数相加，伤亡后降低。速度11、移动3格、射程1—2格保持兵种水平。基础${army.baseTroops}人，每月补员${GARRISON_MONTHLY_RECRUITS}人，上限${GARRISON_CAP}人；${army.dynamic?'当前人数为已扣除出征与战争伤亡的城内实际存量，不含在外军队。':'尚未接入动态战局，人数按当前年月的历史情景推算。'}普通士兵不能邀请，士兵长同行不会带走整支守军。`;
  section.append(heading, management, stats, note);
  if (army.dynamic) {
    const activity = document.createElement('p'); activity.className = 'trade-feedback'; activity.dataset.garrisonConflictStatus = '';
    activity.textContent = `在外军队 ${army.outgoingArmies.length} 支 · ${army.besiegingArmies.length ? '城下正被围攻' : '当前未被围城'}`; section.append(activity);
    for (const fieldArmy of [...new Map([...army.outgoingArmies,...army.besiegingArmies].map(item=>[item.id,item])).values()]) {
      const detail = document.createElement('button'); detail.type='button';detail.className='trade-button is-quiet';detail.dataset.garrisonArmy=fieldArmy.id;
      detail.textContent=armySummary(fieldArmy);detail.addEventListener('click',()=>showConflictArmy(fieldArmy.id));section.append(detail);
    }
    const world=state.worldConflict!, cities=WORLD_CITIES.filter(city=>world.cities[city.id].factionId===army.factionId);
    const owned=document.createElement('p');owned.className='trade-muted';owned.textContent=`本势力城池（${cities.length}）：${cities.map(city=>city.name).join('、')}`;section.append(owned);
    const all=document.createElement('button');all.type='button';all.className='trade-button is-quiet';all.textContent='查看天下城池与战报';all.addEventListener('click',()=>showConflictPanel());section.append(all);
  }
  if (army.changes.length) { const latest = army.changes.at(-1)!, event = document.createElement('p'); event.className = 'trade-muted'; event.textContent = `最近整编：${latest.year}年${latest.month}月 · ${latest.name} · ${latest.change}人（游戏调整）`; section.append(event); }
  return section;
}
