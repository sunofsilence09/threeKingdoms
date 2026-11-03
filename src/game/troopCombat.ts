import { attackPower, clearSight, currentActor, distance, endAction, terrainAt, updateUnitHp, WEAPONS, type CombatState, type CombatUnit } from './combat';
import { attributeContribution } from './attributes';
import { nextRandom } from './battleEnvironment';

export const TROOP_TYPES = {
  infantry: { name: '步兵', skill: '坚阵', cost: 15, min: 1, max: 1, move: 3, description: '本次行动进入守势，额外减伤50%，持续到下次行动。' },
  spear: { name: '枪兵', skill: '突刺', cost: 20, min: 1, max: 2, move: 3, description: '攻击1—2格内目标，造成140%攻击伤害。' },
  cavalry: { name: '骑兵', skill: '冲锋', cost: 25, min: 1, max: 1, move: 5, description: '冲击1—2格内目标，造成160%攻击伤害。' },
  bow: { name: '弓兵', skill: '齐射', cost: 20, min: 2, max: 3, move: 3, description: '对2—4格内一个目标齐射，造成125%攻击伤害。' },
  crossbow: { name: '弩兵', skill: '强射', cost: 20, min: 2, max: 3, move: 2, description: '本次攻击射程增加2格，可攻击2—5格内目标。' },
} as const;
export type TroopKind = keyof typeof TROOP_TYPES;
export interface TroopAssignment { kind: TroopKind; count: number }
export interface TroopContingent extends TroopAssignment {
  initial: number; baseMaxHp: number; baseAttack: number; baseDefense: number;
  attributeVersion?: 3; ruleVersion?: 2; command?: number; strength?: number;
}
export const isTroopKind = (value: unknown): value is TroopKind => typeof value === 'string' && Object.hasOwn(TROOP_TYPES, value);
export const moraleFactor = (morale = 80): number => .5 + Math.max(0, Math.min(120, morale)) / 160;
export const moraleOf = (unit: CombatUnit): number => unit.morale ?? 80;
export const moraleLimit = (unit: CombatUnit): number => unit.moraleRuleVersion === 2 ? 100 : 120;
export const unitMoraleFactor = (unit: CombatUnit): number => unit.moraleRuleVersion === 2 ? .5 + Math.max(0, Math.min(100, moraleOf(unit))) / 200 : moraleFactor(unit.morale);
export const defensePower = (unit: CombatUnit): number => unit.defense * unitMoraleFactor(unit);
export const speedPower = (unit: CombatUnit): number => Math.max(1, Math.round(unit.speed * unitMoraleFactor(unit)));
export const fortificationFactor = (unit: CombatUnit): number => unit.guarded && unit.troop?.kind === 'infantry' && unit.effects?.some(e=>e.kind==='reduction'&&e.value===.5&&e.sourceId===unit.id) ? .5 : 1;
export function troopStats(troop: TroopContingent) {
  const command = troop.ruleVersion === 2 ? Math.max(0, attributeContribution(troop.command!, troop.attributeVersion ?? 2)) : 0;
  const strength = troop.ruleVersion === 2 ? Math.max(0, attributeContribution(troop.strength!, troop.attributeVersion ?? 2)) : 0;
  return { attack: troop.baseAttack + Math.ceil(troop.count / 10) * (1 + .02 * command + .01 * strength),
    defense: troop.baseDefense + Math.ceil(troop.count / 40) * (1 + .02 * command) };
}
/** Snapshot commander talents so casualties never rebase a running battle from mutable RPG progress. */
export function attachTroops(unit: CombatUnit, kind: TroopKind, count: number, commander: { command: number; strength: number } = { command: 50, strength: 50 }, attributeVersion: 1 | 2 | 3 = 3): CombatUnit {
  if (!isTroopKind(kind) || !Number.isSafeInteger(count) || count < 1 || count > 10000 || unit.troop || unit.formation) return unit;
  const troop: TroopContingent = { kind, count, initial: count, baseMaxHp: unit.maxHp, baseAttack: unit.attack, baseDefense: unit.defense,
    ruleVersion: 2, ...(attributeVersion === 3 ? { attributeVersion: 3 as const } : {}), command: commander.command, strength: commander.strength };
  return { ...unit, troop, morale: unit.morale ?? 80, ...troopStats(troop), maxHp: unit.maxHp + count * 2, hp: unit.hp + count * 2 };
}
/** Shared ordinary attack, martial, troop skill and AI defense calculation. Pure duels retain subtraction. */
export function damageAfterDefense(combat: CombatState, attacker: CombatUnit, target: CombatUnit, power = attackPower(attacker)): number {
  const defense = defensePower(target);
  return Math.max(1, (combat.troopRuleVersion === 2 || combat.troopRuleVersion === 3) && (attacker.troop || attacker.formation || target.troop || target.formation)
    ? power * 100 / (100 + defense) : power - defense);
}
export function troopContribution(unit: CombatUnit): string {
  if (!unit.troop) return '未携兵；可在城内从预备兵配属，个人上限为有效统率×100，最多10000兵。';
  const t = unit.troop;
  return `人物本体攻 ${t.baseAttack} / 防 ${t.baseDefense} · 存活${t.count}兵贡献攻 ${Number((unit.attack - t.baseAttack).toFixed(2))} / 防 ${Number((unit.defense - t.baseDefense).toFixed(2))}${t.ruleVersion === 2 ? ` · 统率${t.command} / 武力${t.strength}` : ' · 本场沿用2.2旧领兵规则'}；再按士气修正。`;
}
export function troopRange(unit: CombatUnit): { min: number; max: number } {
  return unit.troop?.count ? TROOP_TYPES[unit.troop.kind] : unit.formation ? { min: unit.formation.minRange, max: unit.formation.maxRange } : WEAPONS[unit.weapon];
}
export function troopStatus(unit: CombatUnit): string {
  return `${unit.troop ? `${TROOP_TYPES[unit.troop.kind].name} ${unit.troop.count}兵 · ` : ''}士气 ${moraleOf(unit)}/${moraleLimit(unit)}${moraleOf(unit) < 10 ? ' · 溃散中' : ''} · 属性${Math.round(unitMoraleFactor(unit) * 100)}%`;
}
export function troopAvailability(combat: CombatState, id: string): { available: boolean; reason: string } {
  const actor = combat.units.find(u => u.id === id);
  if (!actor?.troop?.count) return { available: false, reason: '未带兵' };
  if (currentActor(combat)?.id !== id) return { available: false, reason: '等待行动' };
  if (moraleOf(actor) < TROOP_TYPES[actor.troop.kind].cost) return { available: false, reason: '士气不足' };
  return { available: true, reason: '可施展' };
}
export function troopTargets(combat: CombatState, id: string): { x: number; y: number }[] {
  if (!troopAvailability(combat, id).available) return [];
  const actor = combat.units.find(u => u.id === id)!, kind = actor.troop!.kind;
  if (kind === 'infantry') return [{ x: actor.x, y: actor.y }];
  const max = kind === 'crossbow' ? 5 : kind === 'bow' ? 4 : 2;
  return combat.units.filter(u => u.hp > 0 && u.team !== actor.team && distance(actor,u) >= TROOP_TYPES[kind].min && distance(actor,u) <= max && clearSight(combat,actor,u)).map(({x,y})=>({x,y}));
}
export function performTroopSkill(combat: CombatState, id: string, x: number, y: number): CombatState {
  if (!troopTargets(combat, id).some(t => t.x === x && t.y === y)) return combat;
  const unit = combat.units.find(u => u.id === id)!, kind = unit.troop!.kind, skill = TROOP_TYPES[kind];
  const actor = { ...unit, morale: moraleOf(unit) - skill.cost };
  if (kind === 'infantry') return { ...endAction({ ...combat, units: combat.units.map(u => u.id === id ? { ...actor, guarded: true,
    effects: [...(u.effects ?? []).filter(e => e.sourceId !== id || e.kind !== 'reduction'), { kind: 'reduction', value: .5, sourceId: id, expiresRound: combat.round + 2, untilActor: id }] } : u) }, id),
    lastEvent: { kind: 'troop', actorId: id, damage: 0, skillId: kind } };
  const target = combat.units.find(u => u.hp > 0 && u.x === x && u.y === y)!;
  const random = nextRandom(combat.randomSeed), dodged = random.roll < target.dodgeRate;
  const multiplier = kind === 'spear' ? 1.4 : kind === 'cavalry' ? 1.6 : kind === 'bow' ? 1.25 : 1;
  const power = damageAfterDefense(combat, actor, target, attackPower(actor) * multiplier);
  const reduction = Math.max(target.guarded ? .5 : 0, ...(target.effects ?? []).filter(e => e.kind === 'reduction').map(e=>e.value));
  const cover = (kind === 'bow' || kind === 'crossbow') && terrainAt(combat,x,y) === 'woods' ? 1 : 0;
  const damage = dodged ? 0 : Math.max(1, Math.ceil(power * (1 - reduction) * fortificationFactor(target) - cover));
  const next = { ...combat, randomSeed: random.seed, units: combat.units.map(u => u.id === id ? { ...actor, guarded: false, effects: u.effects?.filter(e=>e.kind !== 'attack-up') }
    : u.id === target.id && !dodged ? { ...updateUnitHp(u,Math.max(0,u.hp-damage)), guarded: false } : u) };
  return { ...endAction(next,id), lastEvent: { kind: dodged ? 'dodge' : 'troop', actorId: id, targetId: target.id, damage, skillId: kind } };
}

export function resolveTroopAI(combat: CombatState, actor: CombatUnit): CombatState {
  if (actor.team !== 'enemy') return combat;
  const targets = troopTargets(combat,actor.id);
  if (!targets.length || (actor.troop?.kind === 'infantry' && actor.hp > actor.maxHp * .6)) return combat;
  return performTroopSkill(combat,actor.id,targets[0].x,targets[0].y);
}
