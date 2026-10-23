import { showCharacterPanel } from '../characterPanel';
import { showCharacterDetails } from '../characterDetails';
import { victoryExperience } from '../attributes';
import Phaser from 'phaser';
import {
  actionOrder, advanceTurn, currentActor, activateUltimate, attackPower, ultimateAvailability, ULTIMATES, applyGuard, createCombatState, isBattleOver, movementRange, moveUnit,
  performAttack, resolveEnemyTurn, terrainAt, WEAPONS, type CombatState,
} from '../combat';
import { BattleBoard, BATTLE_VIEW } from '../battleBoard';
import { TERRAIN, type BattleMode } from '../battlefield';
import { ROUTES } from '../content';
import { createHeroHud } from '../heroHud';
import { PARTY_IDS, experienceToNextLevel } from '../growth';
import { rewardVictory } from '../state';
import { addText } from '../text';
import { getState, resetState, setState } from '../runtime';
import { clearOverlay, setStatus, showPanel } from '../ui';
import { isInspecting } from '../inspectionOverlay';

interface BattleData { mode?: BattleMode }

export class BattleScene extends Phaser.Scene {
  private combat!: CombatState;
  private mode: BattleMode = 'route';
  private board!: BattleBoard;
  private roster!: Phaser.GameObjects.Container;
  private message!: Phaser.GameObjects.Text;
  private roundLabel!: Phaser.GameObjects.Text;
  private finished = false;
  private enemyPending = false;
  private ultimateLabel!: Phaser.GameObjects.Text;
  private ultimateButton!: Phaser.GameObjects.Rectangle;
  private heroHud!: ReturnType<typeof createHeroHud>;

  constructor() { super('Battle'); }
  init(data: BattleData): void { this.mode = data.mode ?? 'route'; }
  create(): void {
    this.finished = false;
    this.enemyPending = false;
    clearOverlay();
    const state = setState({ ...getState(), phase: 'battle' });
    this.combat = createCombatState(state.route, state.party, this.mode);
    this.drawBackground();
    this.board = new BattleBoard(this, (x, y) => this.selectTile(x, y));
    this.roster = this.add.container().setDepth(20);
    this.heroHud = createHeroHud(state.route, () => this.selectUnit('traveler'), state.party);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.heroHud.destroy());
    setStatus(this.mode === 'ambush' ? '旧驿道 · 流民求生' : '路线任务 · 第一次持械同行');
    this.roundLabel = addText(this, 684, 224, '', { color: '#ead9b9', fontSize: '18px' });
    this.message = addText(this, 26, 487, this.mode === 'ambush'
      ? '姜垣握着菜刀，阿满和陈达赤手同行。\n按速度依次行动，亮格移动或攻击敌人。'
      : '姜垣获短刀，阿满持木枪，陈达用猎弓。\n弓箭需隔 2–3 格，留意墙后与桥头。', {
      color: '#bdc7bf', fontSize: '12px', lineSpacing: 0, wordWrap: { width: 630 },
    });
    this.drawControls();
    this.continueTurns();
  }
  private drawBackground(): void {
    const g = this.add.graphics();
    g.fillStyle(0x11191c).fillRect(0, 0, 960, 540);
    g.fillStyle(0x283a37, 0.55).fillRect(0, 0, 960, 82);
    g.lineStyle(1, 0xadbb9e, 0.22).lineBetween(24, 82, 936, 82);
    g.fillStyle(0x1b2828).fillRect(BATTLE_VIEW.x, BATTLE_VIEW.y, BATTLE_VIEW.width, BATTLE_VIEW.height);
    g.fillStyle(0x1b2426).fillRect(672, 112, 264, 400);
    g.lineStyle(1, 0x6d8174, 0.55).strokeRect(BATTLE_VIEW.x - 1, BATTLE_VIEW.y - 1, BATTLE_VIEW.width + 2, BATTLE_VIEW.height + 2);
    const route = getState().route;
    addText(this, 24, 20, route ? ROUTES[route].title : '旧驿道 · 姜垣一行', { color: '#f2e9d8', fontFamily: 'STKaiti, KaiTi, serif', fontSize: '27px' });
    addText(this, 26, 60, this.mode === 'ambush' ? '绕过倒车与巨石，击退拦路山贼。胜利后每人获得 30 经验。' : `${ROUTES[route ?? 'cao'].objective}  胜利后每人 +45 经验。`, { color: '#b3c1b6', fontSize: '14px' });
    const state = getState();
    addText(this, 710, 30, `粮 ${state.supplies} · 士气 ${state.morale}`, { color: '#e7d7b9', fontSize: '14px' });
    addText(this, 26, 91, '16×10 · 拖动查看战场', { color: '#c8bea3', fontSize: '13px' });
  }
  private button(x: number, y: number, width: number, height: number, label: string, callback: () => void, primary = false): void {
    const shape = this.add.rectangle(x, y, width, height, primary ? 0xc99c5a : 0x334c43).setDepth(25);
    shape.setStrokeStyle(1, primary ? 0xe7c48c : 0x7a9b83).setInteractive({ useHandCursor: true });
    shape.on('pointerdown', callback);
    addText(this, x, y, label, { color: primary ? '#17201e' : '#e0e6d4', fontSize: height < 40 ? '14px' : '20px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(26);
  }
  private drawControls(): void {
    this.button(468, 98, 58, 28, '全图', () => this.board.zoom(false));
    this.button(536, 98, 58, 28, '放大', () => this.board.zoom(true, this.combat.units.find(u => u.id === this.combat.selectedId)));
    this.button(606, 98, 58, 28, '归位', () => {
      const unit = this.combat.units.find(u => u.id === this.combat.selectedId) ?? this.combat.units.find(u => u.team === 'party' && u.hp > 0);
      if (unit) { this.board.zoom(true, unit); this.board.focus(unit); }
    });
    this.button(804, 98, 240, 28, '敌方详情', () => showCharacterDetails('bandit-leader', this.combat));
    this.ultimateButton = this.add.rectangle(804, 444, 240, 20, 0x6b4937).setDepth(25).setStrokeStyle(1, 0xc59a65).setInteractive({ useHandCursor: true });
    this.ultimateButton.on('pointerdown', () => this.useUltimate());
    this.ultimateLabel = addText(this, 804, 444, '绝招 · 先选择队员', { color: '#f0d6a7', fontSize: '12px' }).setOrigin(0.5).setDepth(26);
    this.button(741, 480, 112, 48, '守势', () => this.guardSelected());
    this.button(870, 480, 112, 48, '结束行动', () => this.endPlayerTurn(), true);
    addText(this, 684, 250, '行动次序 · 速度高者先行', { color: '#c99c5a', fontSize: '14px' });
  }
  private renderBoard(): void {
    this.heroHud.update(this.combat);
    this.board.render(this.combat);
    const selected = this.combat.units.find(u => u.id === this.combat.selectedId);
    const availability = selected ? ultimateAvailability(this.combat, selected) : null;
    this.ultimateLabel.setText(selected ? `${ULTIMATES[selected.ultimate].name} · ${availability!.reason}` : '绝招 · 先选择队员');
    this.ultimateButton.setAlpha(availability?.available ? 1 : 0.45);
    this.roster.removeAll(true);
    const actor = currentActor(this.combat);
    this.roundLabel.setText(`第 ${this.combat.round} 回合 · ${actor?.name ?? '战斗结束'}`);
    actionOrder(this.combat).forEach((unit, index) => {
      const y = 285 + index * 25;
      const active = actor?.id === unit.id;
      const acted = this.combat.actedIds.includes(unit.id);
      const shape = this.add.rectangle(784, y, 200, 23, active ? 0x4c5039 : 0x253432);
      shape.setStrokeStyle(1, active ? 0xe4bd78 : 0x40554a).setInteractive({ useHandCursor: true });
      shape.on('pointerdown', () => unit.team === 'party' ? this.selectUnit(unit.id) : showCharacterDetails(unit.id, this.combat));
      this.roster.add(shape);
      const color = acted ? '#829087' : unit.team === 'party' ? '#c4dec3' : '#ecb3a4';
      this.roster.add(addText(this, 688, y, `${active ? '▶' : index + 1} ${unit.name} · 速 ${unit.speed}`, { color, fontSize: '12px' }).setOrigin(0, 0.5));
      this.roster.add(addText(this, 880, y, acted ? '已行动' : active ? '当前' : '等待', { color, fontSize: '11px' }).setOrigin(1, 0.5));
      const detail = this.add.rectangle(908, y, 36, 23, 0x3c493e).setStrokeStyle(1, 0x8c9a7d).setInteractive({ useHandCursor: true });
      detail.setName(`detail:${unit.id}`);
      detail.on('pointerdown', () => showCharacterDetails(unit.id, this.combat));
      this.roster.add(detail);
      this.roster.add(addText(this, 908, y, '详情', { color: '#e5d4ae', fontSize: '12px' }).setOrigin(0.5));
    });
  }

  private selectUnit(id: string): void {
    if (this.finished || this.enemyPending) return;
    const unit = this.combat.units.find(u => u.id === id && u.team === 'party' && u.hp > 0);
    if (!unit) return;
    if (currentActor(this.combat)?.id !== id) { this.message.setText(`${unit.name} 尚未轮到行动，请按右侧次序操作。`); return; }
    this.combat = { ...this.combat, selectedId: id };
    const weapon = WEAPONS[unit.weapon];
    const availability = ultimateAvailability(this.combat, unit);
    this.message.setText(`${unit.name} Lv.${unit.level} · ${weapon.name}\n攻 ${attackPower(unit)} · 速 ${unit.speed} · 防 ${unit.defense} · 闪 ${Math.round(unit.dodgeRate * 100)}% · 移 ${movementRange(this.combat, unit)}\n体力 ${unit.hp}/${unit.maxHp} · 射程 ${weapon.min}–${weapon.max} · ${availability.available ? '绝招可用' : availability.reason}`);
    this.board.focus(unit);
    this.renderBoard();
  }
  private selectTile(x: number, y: number): void {
    if (this.finished || this.enemyPending) return;
    const target = this.combat.units.find(u => u.hp > 0 && u.x === x && u.y === y);
    if (target?.team === 'party') { this.selectUnit(target.id); return; }
    const selected = this.combat.units.find(u => u.id === this.combat.selectedId);
    const terrain = TERRAIN[terrainAt(this.combat, x, y)];
    if (!selected) {
      this.message.setText(target ? `${target.name} · ${WEAPONS[target.weapon].name}\n体力 ${target.hp}/${target.maxHp} · 攻击 ${target.attack} · 速度 ${target.speed}\n先选择一名同行队员。` : `${terrain.name} · ${x + 1},${y + 1}\n${terrain.description}\n先选择一名同行队员。`);
      return;
    }
    if (target?.team === 'enemy') {
      const next = performAttack(this.combat, selected.id, target.id);
      if (next === this.combat) { this.message.setText('目标不在有效射程或被障碍挡住。\n猎弓不能贴身射击，试着换个位置。'); return; }
      this.combat = next;
      this.message.setText(next.lastEvent?.kind === 'dodge' ? `${target.name} 闪避了${selected.name}的攻击！\n本次攻击机会已消耗。` : `${selected.name} 攻击${target.name}，造成 ${next.lastEvent?.damage ?? 0} 点伤害。`);
      this.finishPlayerAction();
      return;
    }
    const next = moveUnit(this.combat, selected.id, x, y);
    if (next === this.combat) { this.message.setText(`${terrain.name}：${terrain.description}\n这一步走不过去，试试带绿点的格子。`); return; }
    this.combat = { ...next, selectedId: selected.id };
    this.message.setText(`${selected.name} 已移动到${terrain.name}。\n仍可攻击或守势。${terrainAt(next, x, y) === 'woods' ? '\n林下掩护：受到远程伤害减少 1。' : ''}`);
    this.renderBoard();
  }
  private useUltimate(): void {
    if (this.finished || this.enemyPending) return;
    const selected = this.combat.units.find(u => u.id === this.combat.selectedId);
    if (!selected) { this.message.setText('先选择一名队员，再发动绝招。'); return; }
    const next = activateUltimate(this.combat, selected.id);
    if (next === this.combat) { this.message.setText(`${ULTIMATES[selected.ultimate].name}：${ultimateAvailability(this.combat, selected).reason}。\n${ULTIMATES[selected.ultimate].description}`); return; }
    const hp = next.units.find(u => u.id === selected.id)!.hp;
    this.combat = next;
    this.message.setText(`${selected.name}发动${ULTIMATES[selected.ultimate].name}，体力 ${hp - selected.hp >= 0 ? '+' : ''}${hp - selected.hp}。\n下一击攻击 +50%，仍可行动。\n每场一次，本回合结束失效。`);
    this.renderBoard();
  }
  private guardSelected(): void {
    if (this.finished || this.enemyPending) return;
    const selected = this.combat.units.find(u => u.id === this.combat.selectedId);
    if (!selected) { this.message.setText('先选择一名队员，再进入守势。'); return; }
    this.combat = applyGuard(this.combat, selected.id);
    this.message.setText(`${selected.name} 稳住了阵脚。`);
    this.finishPlayerAction();
  }
  private endPlayerTurn(): void {
    if (this.finished || this.enemyPending) return;
    const actor = currentActor(this.combat);
    if (!actor || actor.team !== 'party') return;
    this.combat = applyGuard(this.combat, actor.id);
    this.message.setText(`${actor.name}结束行动，进入守势。`);
    this.finishPlayerAction();
  }
  private finishPlayerAction(): void {
    this.combat = advanceTurn(this.combat);
    this.continueTurns();
  }
  private continueTurns(): void {
    const result = isBattleOver(this.combat);
    if (result !== 'ongoing') { this.finishBattle(result); return; }
    const actor = currentActor(this.combat)!;
    this.combat = { ...this.combat, selectedId: actor.team === 'party' ? actor.id : null };
    this.enemyPending = actor.team === 'enemy';
    this.renderBoard();
    if (actor.team === 'party') { this.board.focus(actor); return; }
    this.message.setText(`${actor.name} · 速度 ${actor.speed}\n敌方正在行动…`);
    const act = () => {
      if (isInspecting()) { this.time.delayedCall(100, act); return; }
      this.combat = resolveEnemyTurn(this.combat);
      this.enemyPending = false;
      const events = this.combat.turnEvents ?? [];
      const hit = events.find(e => e.kind !== 'ultimate');
      this.message.setText(`${actor.name}${events.some(e => e.kind === 'ultimate') ? '发动拼命，' : ''}${hit ? hit.kind === 'dodge' ? '的攻击被闪避。' : `造成 ${hit.damage} 点伤害。` : '进入守势。'}`);
      this.continueTurns();
    };
    this.time.delayedCall(650, act);
  }
  private finishBattle(result: 'win' | 'loss'): void {
    this.finished = true;
    this.renderBoard();
    const state = getState();
    if (result === 'loss') {
      showPanel({ eyebrow: '队伍溃散', title: '路还在，但你们走不动了。', body: '这次未获得经验。等级与装备进度保留，重整队伍再试。', actions: [
        { label: '重试这场战斗', onClick: () => this.scene.restart({ mode: this.mode }) },
        { label: '从序章重新开始', variant: 'quiet', onClick: () => { resetState(); this.scene.start('Prologue'); } },
      ] });
      return;
    }
    const rewarded = rewardVictory(state, this.mode);
    const names = { traveler: '姜垣', aman: '阿满', 'chen-da': '陈达' };
    const summary = PARTY_IDS.map(id => {
      const before = state.party[id], after = rewarded.party[id];
      const attackGain = Math.floor((after.level - 1) / 2) - Math.floor((before.level - 1) / 2);
      const earned = rewarded === state ? 0 : victoryExperience(this.mode === 'ambush' ? 30 : 45, before.attributes);
      return `${names[id]}：Lv.${before.level}${after.level > before.level ? ` → Lv.${after.level}（升级！体力 +${(after.level - before.level) * 2}${attackGain ? `，攻击 +${attackGain}` : ''}）` : ''}\n经验 +${earned} · 技能点 +${after.points - before.points}（剩余 ${after.points}）`;
    }).join('\n');
    if (this.mode === 'ambush') {
      setState({ ...rewarded, phase: 'overworld', supplies: Math.max(0, rewarded.supplies - 1), flags: { ...rewarded.flags, ambushWon: true } });
      showPanel({ eyebrow: '旧驿道 · 战斗胜利', title: '路口让开了，你们也更坚韧了。', body: `基础经验 30，魅力可提供额外经验。\n${summary}${rewarded.supplies > state.supplies ? `\n政略带回额外补给 +${rewarded.supplies - state.supplies}` : ''}\n\n菜刀和拳脚撑过了这段路。去临水镇寻找庇护与趁手的兵器。`, actions: [{ label: '分配技能点', onClick: () => showCharacterPanel() }, { label: '继续前往临水镇', onClick: () => { clearOverlay(); this.scene.start('Overworld'); } }] });
      return;
    }
    setState({ ...rewarded, phase: 'ending' });
    this.scene.start('Ending', { rewardSummary: summary + (rewarded.supplies > state.supplies ? `\n政略带回额外补给 +${rewarded.supplies - state.supplies}` : '') });
  }
}
