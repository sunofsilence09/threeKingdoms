import { currentActor, advanceTurn, attackPower, canAttack, clearSight, distance, endAction, fireChance,
  igniteAt, makePartyUnit, moveUnit, reachableTiles, terrainAt, updateUnitHp, WEAPONS,
  type CombatEffect, type CombatEvent, type CombatState, type CombatUnit } from './combat';
import type { GameState } from './state';
import { martialForPerson, martialAt, type MartialSkill } from './martialCatalog';
import { nextRandom, WIND_VECTORS } from './battleEnvironment';
import { createProgress } from './growth';
import { heroName } from './heroName';

interface Tile { x: number; y: number }
export function initializeMartialCombat(combat: CombatState, state: GameState): CombatState {
  return { ...combat, units: combat.units.map(u => {
    const native = martialForPerson(u.id.replace(/^enemy:/, ''));
    return { ...u, ...(u.id === 'traveler' ? { name: heroName(state) } : {}),
      martialIds: u.id === 'traveler' ? [...state.martial.equipped] : native && !native.readOnly ? [native.id] : [],
      martialReady: {}, effects: [] };
  }) };
}
export function availableMartials(combat: CombatState, actorId: string): MartialSkill[] {
  return (combat.units.find(u => u.id === actorId)?.martialIds ?? []).map(martialAt).filter((s): s is MartialSkill => !!s && !s.readOnly);
}
/** Player command feedback uses the same target legality as execution. */
export function martialAvailability(combat: CombatState, actorId: string, skillId: string): { selectable: boolean; reason: string; targets: Tile[] } {
  const unit = combat.units.find(u => u.id === actorId);
  const blocked = (reason: string) => ({ selectable: false, reason, targets: [] });
  if (!unit || unit.hp <= 0) return blocked('已退场');
  if (!availableMartials(combat, actorId).some(skill => skill.id === skillId)) return blocked('未装配');
  if (unit.weapon === 'claws') return blocked('当前武器无法施展');
  const remaining = Math.max(0, (unit.martialReady?.[skillId] ?? 0) - combat.round);
  const actor = currentActor(combat);
  const waiting = combat.actedIds.includes(actorId) ? '本轮已行动'
    : actor?.team === 'enemy' ? '敌方行动中'
    : actor?.id !== actorId ? actorId === 'traveler' ? '等待主角行动' : '等待行动' : '';
  if (remaining || waiting) return blocked([remaining ? `冷却${remaining}轮` : '', waiting].filter(Boolean).join(' · '));
  if (unit.team !== 'party') return blocked('敌方行动中');
  const targets = martialTargets(combat, actorId, skillId);
  return { selectable: true, reason: targets.length ? '可施展' : '无合法目标', targets };
}
function readyActor(combat: CombatState, actorId: string, skillId: string): CombatUnit | undefined {
  const actor = currentActor(combat);
  return actor?.id === actorId && actor.hp > 0 && actor.weapon !== 'claws' &&
    availableMartials(combat, actorId).some(s => s.id === skillId) &&
    (actor.martialReady?.[skillId] ?? 0) <= combat.round ? actor : undefined;
}
export function martialTargets(combat: CombatState, actorId: string, skillId: string): Tile[] {
  const actor = readyActor(combat, actorId, skillId), skill = martialAt(skillId);
  if (!actor || !skill) return [];
  if (skill.template === 'dash') return reachableTiles(combat, actorId, 2, true);
  if (['fortify', 'inspire', 'soothe'].includes(skill.template)) return [{ x: actor.x, y: actor.y }];
  if (['protect', 'rally'].includes(skill.template)) return combat.units.filter(u => u.hp > 0 && u.team === actor.team && distance(actor, u) <= 2 && clearSight(combat, actor, u)).map(({ x, y }) => ({ x, y }));
  if (skill.template === 'firegod') {
    const result: Tile[] = [];
    for (let y = 0; y < combat.height; y++) for (let x = 0; x < combat.width; x++) {
      const t = { x, y }, gap = distance(actor, t);
      if (gap >= 1 && gap <= 3 && fireChance(combat, x, y, 20) > 0 && clearSight(combat, actor, t)) result.push(t);
    }
    return result;
  }
  return combat.units.filter(u => {
    if (u.hp <= 0 || u.team === actor.team || !clearSight(combat, actor, u)) return false;
    const gap = distance(actor, u);
    if (skill.template === 'break') return canAttack(combat, actor, u);
    if (skill.template === 'pierce') return gap >= 1 && gap <= 2 && (actor.x === u.x || actor.y === u.y);
    if (skill.template === 'shoot') return gap >= 2 && gap <= 4;
    return gap >= 1 && gap <= 2;
  }).map(({ x, y }) => ({ x, y }));
}
function addEffect(unit: CombatUnit, effect: CombatEffect): CombatUnit {
  const effects = (unit.effects ?? []).filter(e => !(e.kind === effect.kind && e.sourceId === effect.sourceId));
  return { ...unit, effects: [...effects, effect] };
}

export function performMartial(combat: CombatState, actorId: string, skillId: string, x: number, y: number): CombatState {
  const actor = readyActor(combat, actorId, skillId), skill = martialAt(skillId);
  if (!actor || !skill || !martialTargets(combat, actorId, skillId).some(t => t.x === x && t.y === y)) return combat;
  const target = combat.units.find(u => u.hp > 0 && u.x === x && u.y === y);
  let next = combat, damage = 0, dodged = false, targetId = target?.id;
  const events: CombatEvent[] = [];
  const captureAction = (result: CombatState) => {
    if (result.lastEvent && result.lastEvent !== next.lastEvent) events.push(result.lastEvent);
    next = result;
  };
  const effect = (kind: CombatEffect['kind'], value: number, untilActor?: string): CombatEffect =>
    ({ kind, value, sourceId: actorId, expiresRound: combat.round + 2, ...(untilActor ? { untilActor } : {}) });
  if (skill.template === 'firegod') {
    captureAction(igniteAt(next, actorId, x, y, 20, 2));
    if (next.lastEvent?.success && combat.environment?.windDirection !== 'calm') {
      const vector = WIND_VECTORS[combat.environment?.windDirection ?? 'calm'];
      if (vector.x || vector.y) captureAction(igniteAt(next, actorId, x + vector.x, y + vector.y));
    }
  } else if (skill.template === 'dash') {
    captureAction(moveUnit(next, actorId, x, y, 2, true));
  } else if (['break', 'pierce', 'shoot', 'intimidate'].includes(skill.template) && target) {
    const random = nextRandom(next.randomSeed);
    dodged = random.roll < target.dodgeRate;
    const multiplier = skill.template === 'break' ? 1.5 : skill.template === 'intimidate' ? 1 : 1.3;
    const debuff = Math.min(.2, Math.max(0, ...(actor.effects ?? []).filter(e => e.kind === 'attack-down').map(e => e.value)));
    const power = Math.max(1, Math.max(attackPower(actor), actor.attack * multiplier * (1 - debuff)) - target.defense);
    const guarded = combat.route === 'liu' && target.team === 'party' ? Math.floor(power / 2) : Math.ceil(power / 2);
    const reduction = Math.min(.5, Math.max(0, ...(target.effects ?? []).filter(e => e.kind === 'reduction').map(e => e.value)));
    const cover = (skill.template === 'shoot' || actor.weapon === 'bow') && terrainAt(combat, x, y) === 'woods' ? 1 : 0;
    damage = dodged ? 0 : Math.max(1, Math.ceil(Math.min(target.guarded ? guarded : power, power * (1 - reduction)) - cover));
    next = { ...next, randomSeed: random.seed, units: next.units.map(u => {
      if (u.id === actorId) return { ...u, guarded: false, effects: u.effects?.filter(e => e.kind !== 'attack-up') };
      if (u.id !== target.id || dodged) return u;
      let hurt = { ...updateUnitHp(u, Math.max(0, u.hp - damage)), guarded: false };
      if (skill.template === 'intimidate' && hurt.hp > 0) {
        hurt = addEffect(addEffect(hurt, effect('attack-down', .2)), effect('move-down', 1));
      }
      return hurt;
    }) };
  } else {
    next = { ...next, units: next.units.map(u => {
      if (u.hp <= 0 || u.team !== actor.team || !clearSight(combat, actor, u)) return u;
      const gap = distance(actor, u);
      if (skill.template === 'fortify' && gap <= 1) return addEffect(u, effect('reduction', .3, actorId));
      if (skill.template === 'inspire' && gap <= 2) return addEffect(u, effect('attack-up', .25));
      if (skill.template === 'soothe' && gap <= 2) return updateUnitHp(u, Math.min(u.maxHp, u.hp + Math.ceil(u.maxHp * .1)));
      if (u.id !== target?.id) return u;
      if (skill.template === 'protect') return addEffect(updateUnitHp(u, Math.min(u.maxHp, u.hp + Math.ceil(u.maxHp * .2))), effect('reduction', .2, actorId));
      if (skill.template === 'rally') return addEffect({ ...u, effects: u.effects?.filter(e => e.kind !== 'attack-down' && e.kind !== 'move-down') }, effect('reduction', .2, actorId));
      return u;
    }) };
  }
  // turnEvents belongs to this action; lastEvent remains the common skill summary.
  const fireSuccess = skill.template === 'firegod' ? next.fires?.some(f => f.x === x && f.y === y) : undefined;
  next = { ...next, units: next.units.map(u => u.id === actorId ? { ...u, martialReady: { ...u.martialReady, [skillId]: combat.round + 3 } } : u) };
  const summary: CombatEvent = { kind: dodged ? 'dodge' : 'martial', actorId, targetId, damage,
    skillId, ...(fireSuccess !== undefined ? { success: fireSuccess, x, y } : {}) };
  return { ...endAction(next, actorId), lastEvent: summary, turnEvents: [...events, summary] };
}

/** Ability selection is injected into the core AI to avoid an engine/catalog cycle. */
export function resolveMartialAI(combat: CombatState, actor: CombatUnit = currentActor(combat)!): CombatState {
  if (!actor || actor.team !== 'enemy') return combat;
  const enemies = combat.units.filter(u => u.hp > 0 && u.team !== actor.team);
  const killingAttack = enemies.some(u => canAttack(combat, actor, u) && u.hp <= Math.max(1, attackPower(actor) - u.defense));
  if (killingAttack) return combat;
  for (const skill of availableMartials(combat, actor.id)) {
    const targets = martialTargets(combat, actor.id, skill.id);
    if (!targets.length) continue;
    let chosen: Tile | undefined;
    if (['break', 'pierce', 'shoot', 'intimidate'].includes(skill.template)) {
      chosen = targets.sort((a, b) => combat.units.find(u => u.x === a.x && u.y === a.y)!.hp - combat.units.find(u => u.x === b.x && u.y === b.y)!.hp)[0];
    } else if (skill.template === 'protect' || skill.template === 'rally') {
      chosen = targets.find(t => combat.units.some(u => u.x === t.x && u.y === t.y && (u.hp < u.maxHp * .7 || u.effects?.some(e => e.kind === 'attack-down'))));
    } else if (skill.template === 'firegod') {
      const wind = WIND_VECTORS[combat.environment?.windDirection ?? 'calm'];
      const friends = combat.units.filter(u => u.hp > 0 && u.team === actor.team);
      chosen = targets.find(t => {
        const downwind = { x: t.x + wind.x, y: t.y + wind.y };
        const fireTiles = [t, ...((wind.x || wind.y) && fireChance(combat, downwind.x, downwind.y) > 0 ? [downwind] : [])];
        return enemies.some(u => fireTiles.some(f => distance(f, u) <= 1)) &&
          friends.every(u => fireTiles.every(f => Math.max(Math.abs(f.x - u.x), Math.abs(f.y - u.y)) > 1));
      });
    } else if (skill.template === 'dash') {
      const nearest = (t: Tile) => Math.min(...enemies.map(u => distance(t, u)));
      chosen = targets.filter(t => !combat.fires?.some(f => f.x === t.x && f.y === t.y)).sort((a, b) => nearest(a) - nearest(b))[0];
      if (chosen && nearest(chosen) >= nearest(actor)) chosen = undefined;
    } else if (skill.template === 'soothe') {
      if (combat.units.some(u => u.hp > 0 && u.team === actor.team && distance(actor, u) <= 2 && u.hp < u.maxHp * .7)) chosen = targets[0];
    } else if (enemies.some(u => distance(actor, u) <= 4)) chosen = targets[0];
    if (chosen) return performMartial(combat, actor.id, skill.id, chosen.x, chosen.y);
  }
  return combat;
}

export function createDuelCombat(base: CombatState, state: GameState): CombatState {
  const duel = state.duel;
  if (!duel || duel.status !== 'active') throw new Error('No active duel');
  const teacherProgress = createProgress(Math.min(10, Math.max(3, state.party.traveler.level + 2, state.party[duel.teacherId]?.level ?? 1)));
  teacherProgress.attributes = {...(state.party[duel.teacherId]?.attributes ?? teacherProgress.attributes)};
  const teacher = makePartyUnit(duel.teacherId, teacherProgress, null, 'route', 7, 4);
  const hero = makePartyUnit('traveler', state.party.traveler, state.route, state.route ? 'route' : 'ambush', 3, 4);
  return advanceTurn(initializeMartialCombat({ ...base, attributeVersion: 2, units: [hero, { ...teacher, id: `enemy:${teacher.id}`, team: 'enemy' }],
    selectedId: null, actedIds: [], movedIds: [], turn: 'party' }, state));
}
