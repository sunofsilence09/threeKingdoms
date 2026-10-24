import { currentActor, environmentLabel, fireChance, fireTargets, terrainAt, type CombatState } from './combat';
import { TERRAIN } from './battlefield';
import { availableMartials, martialTargets } from './martialCombat';
import { martialAt } from './martialCatalog';
import './battleCommands.css';

export type TargetMode = null | 'fire' | { skillId: string };
export function createBattleCommands(callbacks: {
  mode: (mode: TargetMode) => void;
  target: (x: number, y: number) => void;
  guard: () => void;
  retreat: () => void;
}) {
  const shell = document.querySelector<HTMLElement>('.game-shell')!;
  const panel = document.createElement('section');
  panel.id = 'battle-commands'; panel.setAttribute('aria-label', '战场指令');
  shell.classList.add('has-battle-commands');
  shell.insertBefore(panel, document.querySelector('#overlay-root'));
  function update(combat: CombatState, mode: TargetMode, message: string, finished: boolean): void {
    panel.replaceChildren();
    const add = (tag: string, text: string, parent: HTMLElement = panel) => {
      const el = document.createElement(tag); el.textContent = text; parent.append(el); return el;
    };
    const actor = currentActor(combat);
    const enabled = !finished && actor?.team === 'party';
    const environment = add('p', environmentLabel(combat)); environment.className = 'battle-environment';
    const status = add('p', message); status.className = 'battle-command-status'; status.setAttribute('role', 'status');
    const controls = add('div', ''); controls.className = 'battle-command-buttons';
    const button = (text: string, action: () => void, parent: HTMLElement = controls, disabled = !enabled) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.disabled = disabled;
      b.addEventListener('click', action); parent.append(b); return b;
    };
    button('移动 / 攻击', () => callbacks.mode(null)).setAttribute('aria-pressed', String(mode === null));
    button('放火', () => callbacks.mode('fire'), controls, !enabled || actor?.weapon === 'claws').setAttribute('aria-pressed', String(mode === 'fire'));
    button('守势 / 结束行动', callbacks.guard);
    button('撤退', callbacks.retreat, controls, finished);
    if (actor) {
      const skills = availableMartials(combat, actor.id);
      const group = add('div', ''); group.className = 'battle-command-skills'; group.setAttribute('aria-label', '武学');
      if (!skills.length) add('small', `${actor.name}尚无已装配武学。`, group);
      for (const skill of skills) {
        const remaining = Math.max(0, (actor.martialReady?.[skill.id] ?? 0) - combat.round);
        const b = button(`${skill.name}${remaining ? ` · 冷却${remaining}轮` : ' · 可用'}`, () => callbacks.mode({ skillId: skill.id }), group, !enabled || remaining > 0);
        b.title = skill.description; b.dataset.battleSkill = skill.id;
        b.setAttribute('aria-pressed', String(typeof mode === 'object' && mode?.skillId === skill.id));
      }
    }
    if (mode && actor && enabled) {
      const skill = typeof mode === 'object' ? martialAt(mode.skillId) : undefined;
      const targets = mode === 'fire' ? fireTargets(combat, actor.id) : martialTargets(combat, actor.id, mode.skillId);
      const hint = mode === 'fire' ? '选择自身或相邻燃料格。点火失败也消耗行动；火焰会伤及敌我。'
        : `${skill?.name}：${skill?.description} 施展后结束行动。`;
      add('p', hint).className = 'battle-command-hint';
      const picker = add('div', ''); picker.className = 'battle-target-picker';
      const select = document.createElement('select'); select.setAttribute('aria-label', '目标格');
      for (const t of targets) {
        const option = document.createElement('option'); option.value = `${t.x},${t.y}`;
        const unit = combat.units.find(u => u.hp > 0 && u.x === t.x && u.y === t.y);
        const chance = mode === 'fire' ? ` · 点燃${fireChance(combat, t.x, t.y)}%` : skill?.template === 'firegod' ? ` · 点燃${fireChance(combat, t.x, t.y, 20)}%` : '';
        option.textContent = `${t.x + 1},${t.y + 1} ${TERRAIN[terrainAt(combat, t.x, t.y)].name}${unit ? ` · ${unit.name}` : ''}${chance}`;
        select.append(option);
      }
      picker.append(select);
      button('对选中格施展', () => { const [x, y] = select.value.split(',').map(Number); callbacks.target(x, y); }, picker, !targets.length);
      button('取消选取', () => callbacks.mode(null), picker, false);
      if (!targets.length) add('small', '当前没有合法目标，请取消或先移动。', picker);
    }
    const details = document.createElement('details');
    add('summary', '火势规则', details);
    add('p', '森林基础75%、道路35%、木桥60%、木车65%；天气与风力修正后最高95%。每轮末熄灭、烧伤并蔓延，火伤不分敌我。经过火格也会受伤。点火消耗本次行动。', details);
    panel.append(details);
    if (combat.fires?.length) {
      const fires = document.createElement('details');
      add('summary', `当前火格 · ${combat.fires.length}处`, fires);
      const list = document.createElement('ul');
      for (const fire of combat.fires) {
        const source = combat.units.find(u => u.id === fire.sourceId)?.name ?? '余火';
        add('li', `${fire.x + 1},${fire.y + 1} · ${TERRAIN[terrainAt(combat, fire.x, fire.y)].name} · 火势${fire.level}级 · 剩余${fire.remainingRounds}轮 · 来源${source}`, list);
      }
      fires.append(list); panel.append(fires);
    }
    if (combat.battleLog?.length) {
      const history = document.createElement('details');
      add('summary', '最近战斗记录', history);
      const list = document.createElement('ol');
      for (const line of combat.battleLog.slice(-12)) add('li', line, list);
      history.append(list); panel.append(history);
    }
  }
  return { update, destroy: () => { panel.remove(); shell.classList.remove('has-battle-commands'); } };
}
