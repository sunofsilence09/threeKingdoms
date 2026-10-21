import { movementRange, WEAPONS, type CombatState } from './combat';
import { createPartyProgress, experienceToNextLevel, type PartyProgress } from './growth';
import type { RouteId } from './state';

const allegiances = { cao: '曹方同行', sun: '孙方同行', liu: '刘方同行' };

export function createHeroHud(route: RouteId | null, onSelect?: () => void, party: PartyProgress = createPartyProgress()) {
  const root = document.querySelector('#hud-root');
  if (!root) throw new Error('HUD root is missing');
  const panel = document.createElement('section');
  panel.className = `hero-hud${onSelect ? ' is-battle' : ''}`;
  panel.setAttribute('aria-label', '主角状态');
  panel.innerHTML = `
    <div class="hero-portrait"><img src="/assets/traveler.svg" alt="姜垣的像素头像" width="64" height="80"></div>
    <div class="hero-details">
      <div class="hero-heading"><strong>姜垣</strong><span class="hero-level"></span><span class="hero-allegiance"></span></div>
      <div class="hero-health"><span>体力</span><span class="hero-health-value"></span></div>
      <meter class="hero-health-meter" aria-label="主角体力" min="0"></meter>
      <div class="hero-footer"><span class="hero-stats"></span><span class="hero-action"></span></div>
      <div class="hero-growth"><span class="hero-experience"></span><span class="hero-next-level"></span></div>
      <meter class="hero-xp-meter" aria-label="主角经验" min="0"></meter>
    </div>`;
  panel.querySelector('.hero-allegiance')!.textContent = route ? allegiances[route] : '流民';
  if (onSelect) {
    const portrait = panel.querySelector('.hero-portrait')!;
    const button = document.createElement('button');
    button.className = portrait.className;
    button.type = 'button';
    button.title = '选中主角姜垣';
    button.setAttribute('aria-label', '选中主角姜垣');
    button.append(...portrait.childNodes);
    button.addEventListener('click', onSelect);
    portrait.replaceWith(button);
  }
  root.append(panel);
  const value = panel.querySelector('.hero-health-value')!;
  const meter = panel.querySelector<HTMLMeterElement>('.hero-health-meter')!;
  const stats = panel.querySelector('.hero-stats')!;
  const action = panel.querySelector('.hero-action')!;

  function update(combat?: CombatState): void {
    const hero = combat?.units.find(unit => unit.id === 'traveler');
    const progress = hero ?? party.traveler;
    const threshold = experienceToNextLevel(progress.level);
    panel.querySelector('.hero-level')!.textContent = `Lv.${progress.level}`;
    panel.querySelector('.hero-experience')!.textContent = threshold ? `经验 ${progress.xp} / ${threshold}` : '经验已满';
    panel.querySelector('.hero-next-level')!.textContent = threshold ? `距升级 ${threshold - progress.xp}` : '等级上限';
    const xpMeter = panel.querySelector<HTMLMeterElement>('.hero-xp-meter')!;
    xpMeter.max = threshold || 1;
    xpMeter.value = threshold ? progress.xp : 1;
    panel.classList.toggle('is-traveling', !hero);
    panel.classList.toggle('is-selected', combat?.selectedId === 'traveler');
    if (hero && combat) {
      value.textContent = `${hero.hp} / ${hero.maxHp}`;
      meter.max = hero.maxHp;
      meter.value = Math.max(0, hero.hp);
      stats.textContent = `${WEAPONS[hero.weapon].name} · 攻 ${hero.attack} · 移 ${movementRange(combat, hero)}`;
      action.textContent = hero.hp <= 0 ? '无法行动' : hero.guarded ? '守势中' : combat.actedIds.includes(hero.id) ? '已行动' : combat.movedIds.includes(hero.id) ? '已移动' : '待行动';
      panel.classList.toggle('is-unavailable', hero.hp <= 0 || combat.actedIds.includes(hero.id));
      const button = panel.querySelector('button');
      if (button) button.disabled = hero.hp <= 0 || combat.actedIds.includes(hero.id);
    } else {
      stats.textContent = '同行 · 阿满 / 陈达';
      action.textContent = '行旅中';
    }
  }
  update();
  return { update, destroy: () => panel.remove() };
}
