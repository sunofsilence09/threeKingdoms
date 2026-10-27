import { getState, setState } from './runtime';
import { assignTroops } from './troopManagement';
import { TROOP_TYPES, troopStatus, type TroopKind } from './troopCombat';
import { playerMilitaryStatus } from './playerMilitary';
import type { CombatUnit } from './combat';

export function createTroopControls(id: string, unit: CombatUnit, inBattle: boolean, render: () => void): HTMLElement {
  const state = getState(), current = state.troopAssignments?.[id];
  const field = document.createElement('fieldset'); field.className = 'troop-assignment';
  const legend = document.createElement('legend'); legend.textContent = inBattle ? '本场部队' : '角色领兵'; field.append(legend);
  if (inBattle) { const p = document.createElement('p'); p.textContent = troopStatus(unit); field.append(p); return field; }
  const status = playerMilitaryStatus(state), disabled = !status.canOperate;
  const kindLabel = document.createElement('label'); kindLabel.textContent = '兵种 ';
  const select = document.createElement('select'); select.setAttribute('aria-label', `${unit.name}兵种`);
  for (const [key,type] of Object.entries(TROOP_TYPES)) {
    const option = document.createElement('option'); option.value = key; option.textContent = `${type.name} · ${type.skill}`; select.append(option);
  }
  select.value = current?.kind ?? 'infantry'; select.disabled = disabled; kindLabel.append(select);
  const countLabel = document.createElement('label'); countLabel.textContent = '士兵 ';
  const count = document.createElement('input'); count.type = 'number'; count.min = '0'; count.max = String(Math.min(1000,status.reserve+(current?.count??0))); count.step = '1';
  count.inputMode = 'numeric'; count.value = String(current?.count??0); count.setAttribute('aria-label',`${unit.name}配兵人数`); count.disabled = disabled; countLabel.append(count);
  const note = document.createElement('small'); note.textContent = disabled ? status.reason : `已带${current?.count??0}兵 · 可用预备兵${status.reserve} · 每人上限1000`;
  const skill = document.createElement('small');
  const updateSkill = () => { const type = TROOP_TYPES[select.value as TroopKind]; skill.textContent = `${type.skill} · 消耗${type.cost}士气：${type.description}`; };
  select.addEventListener('change',updateSkill); updateSkill();
  const save = document.createElement('button'); save.type = 'button'; save.className = 'party-action'; save.textContent = '确认配兵'; save.disabled = disabled;
  save.addEventListener('click',()=>{
    const before = getState(), n = count.value.trim() ? Number(count.value) : NaN;
    const next = assignTroops(before,id,select.value as TroopKind,n);
    if (next === before) { note.textContent = '配兵失败：人数须为0—1000整数，且不能超过可用预备兵；途中或战斗期间不可调整。'; return; }
    setState(next); render();
  });
  const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'party-action'; clear.textContent = '卸下士兵'; clear.disabled = disabled || !current?.count;
  clear.addEventListener('click',()=>{ const before=getState(), next=assignTroops(before,id,select.value as TroopKind,0); if(next!==before){setState(next);render();} });
  field.append(kindLabel,countLabel,save,clear,note,skill); return field;
}
