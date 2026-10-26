import { currentActor, environmentLabel, fireChance, fireTargets, terrainAt, type CombatState } from './combat';
import { TERRAIN } from './battlefield';
import { availableMartials, martialAvailability, martialTargets } from './martialCombat';
import { martialAt } from './martialCatalog';
import { createAudioControls } from './audioSettings';
import { battleAudio } from './battleAudio';
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
  panel.append(createAudioControls(() => battleAudio.unlock()));
  const content = document.createElement('div'); panel.append(content);
  function update(combat: CombatState, mode: TargetMode, message: string, finished: boolean): void {
    content.replaceChildren();
    const add = (tag: string, text: string, parent: HTMLElement = content) => {
      const el = document.createElement(tag); el.textContent = text; parent.append(el); return el;
    };
    const actor = currentActor(combat);
    const enabled = !finished && actor?.team === 'party';
    const environment = add('p', environmentLabel(combat)); environment.className = 'battle-environment';
    add('p', finished ? '战斗已结束。' : `当前行动：${actor?.name ?? '等待'}${actor?.team === 'enemy' ? ' · 敌方行动中' : ' · 仅此人可施展武学'}`).className = 'battle-current-actor';
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
    const skillOwners = actor ? [actor] : [];
    const hero = combat.units.find(u => u.id === 'traveler');
    if (hero && hero.id !== actor?.id && availableMartials(combat, hero.id).length) skillOwners.push(hero);
    for (const owner of skillOwners) {
      const skills = availableMartials(combat, owner.id);
      const group = add('div', ''); group.className = 'battle-command-skills'; group.setAttribute('aria-label', `${owner.name}武学`);
      add('strong', owner.id === 'traveler' ? `${owner.name} · 主角已装配武学` : `${owner.name} · 武学`, group);
      if (!skills.length) add('small', `${owner.name}尚无已装配武学。`, group);
      for (const skill of skills) {
        const availability = martialAvailability(combat, owner.id, skill.id);
        const b = button(`${skill.name} · ${availability.reason}`, () => callbacks.mode({ skillId: skill.id }), group, finished || !availability.selectable);
        b.title = `${availability.reason}。${skill.description}`; b.dataset.battleSkill = skill.id;
        b.setAttribute('aria-pressed', String(owner.id === actor?.id && typeof mode === 'object' && mode?.skillId === skill.id));
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
      if (!targets.length) add('small', '当前没有合法目标：请按招式距离、直线和视线要求接近目标；取消选取后可先移动，移动后仍可施展。', picker);
    }
    const details = document.createElement('details');
    add('summary', '火势规则', details);
    add('p', '森林基础75%、道路35%、木桥60%、木车65%；天气与风力修正后最高95%。每轮末熄灭、烧伤并蔓延，火伤不分敌我。经过火格也会受伤。点火消耗本次行动。', details);
    content.append(details);
    if (combat.fires?.length) {
      const fires = document.createElement('details');
      add('summary', `当前火格 · ${combat.fires.length}处`, fires);
      const list = document.createElement('ul');
      for (const fire of combat.fires) {
        const source = combat.units.find(u => u.id === fire.sourceId)?.name ?? '余火';
        add('li', `${fire.x + 1},${fire.y + 1} · ${TERRAIN[terrainAt(combat, fire.x, fire.y)].name} · 火势${fire.level}级 · 剩余${fire.remainingRounds}轮 · 来源${source}`, list);
      }
      fires.append(list); content.append(fires);
    }
    if (combat.battleLog?.length) {
      const history = document.createElement('details');
      add('summary', '最近战斗记录', history);
      const list = document.createElement('ol');
      for (const line of combat.battleLog.slice(-12)) add('li', line, list);
      history.append(list); content.append(history);
    }
  }
  return { update, destroy: () => { panel.remove(); shell.classList.remove('has-battle-commands'); } };
}
