import Phaser from 'phaser';
import {
  applyGuard,
  createCombatState,
  distance,
  isBattleOver,
  moveUnit,
  performAttack,
  type CombatState,
  type CombatUnit,
} from '../combat';
import { ROUTES } from '../content';
import { getState, resetState, setState } from '../runtime';
import { clearOverlay, setStatus, showPanel } from '../ui';

interface BattleData {
  mode?: 'ambush' | 'route';
}

const CELL_SIZE = 68;
const GRID_LEFT = 88;
const GRID_TOP = 136;

export class BattleScene extends Phaser.Scene {
  private combat!: CombatState;
  private mode: 'ambush' | 'route' = 'route';
  private boardLayer!: Phaser.GameObjects.Container;
  private message!: Phaser.GameObjects.Text;

  constructor() {
    super('Battle');
  }

  init(data: BattleData): void {
    this.mode = data.mode ?? 'route';
  }

  create(): void {
    clearOverlay();
    setState({ ...getState(), phase: 'battle' });
    this.combat = createCombatState(getState().route);
    this.boardLayer = this.add.container(0, 0).setDepth(10).setVisible(true);
    setStatus(this.mode === 'ambush' ? '旧驿道 · 伏击' : '路线任务 · 关卡前');
    this.drawBackground();
    this.message = this.add.text(610, 176, '先选中一名队员，再点击格子或敌人。', {
      color: '#b9c4c7',
      fontSize: '14px',
      lineSpacing: 8,
      wordWrap: { width: 280 },
    });
    this.drawControls();
    this.renderBoard();
  }

  private drawBackground(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x11161b, 1);
    graphics.fillRect(0, 0, 960, 540);
    graphics.fillStyle(0x2c3f43, 0.35);
    graphics.fillRect(0, 0, 960, 98);
    graphics.lineStyle(1, 0xd5dfdf, 0.12);
    graphics.lineBetween(54, 98, 906, 98);

    const route = getState().route;
    const routeLabel = route ? ROUTES[route].title : '共同序章 · 旧驿道';
    this.add.text(54, 28, routeLabel, {
      color: '#f2e9d8',
      fontFamily: 'STKaiti, KaiTi, serif',
      fontSize: '27px',
    });
    this.add.text(56, 68, this.mode === 'ambush' ? '先让队伍穿过路口' : ROUTES[route ?? 'cao'].objective, {
      color: '#aab7bd',
      fontSize: '13px',
    });
  }

  private renderBoard(): void {
    this.boardLayer.removeAll(true);
    for (let y = 0; y < this.combat.height; y += 1) {
      for (let x = 0; x < this.combat.width; x += 1) {
        const selected = this.combat.selectedId
          ? this.combat.units.find((unit) => unit.id === this.combat.selectedId)
          : null;
        const isReachable = selected ? distance(selected, { x, y }) <= 2 : false;
        const tile = this.add.rectangle(
          GRID_LEFT + x * CELL_SIZE,
          GRID_TOP + y * CELL_SIZE,
          CELL_SIZE - 6,
          CELL_SIZE - 6,
          isReachable ? 0x344b4d : 0x202b31,
          0.96,
        );
        tile.setStrokeStyle(1, isReachable ? 0x6b9c9a : 0x3a474e, 1);
        tile.setInteractive({ useHandCursor: true });
        tile.on('pointerdown', () => this.selectTile(x, y));
        this.boardLayer.add(tile);
      }
    }

    for (const unit of this.combat.units) {
      if (unit.hp <= 0) continue;
      this.drawUnit(unit);
    }
  }

  private drawUnit(unit: CombatUnit): void {
    const x = GRID_LEFT + unit.x * CELL_SIZE;
    const y = GRID_TOP + unit.y * CELL_SIZE;
    const selected = this.combat.selectedId === unit.id;
    const color = unit.team === 'party' ? 0xc78d4d : 0xa55b5a;
    const unitShape = this.add.rectangle(x, y, 42, 42, color, 1);
    unitShape.setStrokeStyle(selected ? 4 : 2, selected ? 0xf2e9d8 : 0x171e24, 1);
    unitShape.setInteractive({ useHandCursor: true });
    unitShape.on('pointerdown', () => {
      if (unit.team === 'party') {
        this.selectUnit(unit.id);
      } else {
        this.selectTile(unit.x, unit.y);
      }
    });
    this.boardLayer.add(unitShape);

    const label = this.add.text(x, y - 7, shortUnitLabel(unit), {
      color: '#171e24',
      fontSize: '16px',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5, 0.5);
    this.boardLayer.add(label);

    const barWidth = 42;
    const ratio = Math.max(0, unit.hp / unit.maxHp);
    const bar = this.add.rectangle(x, y + 29, barWidth, 5, 0x171e24, 1);
    const health = this.add.rectangle(x - (barWidth * (1 - ratio)) / 2, y + 29, barWidth * ratio, 5, 0x6b9c9a, 1);
    health.setOrigin(0, 0.5);
    this.boardLayer.add(bar);
    this.boardLayer.add(health);
  }

  private drawControls(): void {
    const guard = this.add.rectangle(740, 410, 136, 48, 0x344b4d, 1);
    guard.setStrokeStyle(1, 0x6b9c9a, 1);
    guard.setInteractive({ useHandCursor: true });
    guard.on('pointerdown', () => this.guardSelected());
    this.add.text(740, 410, '守势', { color: '#d5dfdf', fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5);

    const endTurn = this.add.rectangle(740, 472, 136, 48, 0xc78d4d, 1);
    endTurn.setInteractive({ useHandCursor: true });
    endTurn.on('pointerdown', () => this.endPlayerTurn());
    this.add.text(740, 472, '结束行动', { color: '#171e24', fontSize: '16px', fontStyle: 'bold' }).setOrigin(0.5);

    this.add.text(610, 322, '操作', { color: '#c78d4d', fontSize: '12px', fontStyle: 'bold' });
    this.add.text(610, 340, '点击队员选择，再点击相邻敌人攻击；\n点击空格移动。', {
      color: '#aab7bd',
      fontSize: '12px',
      lineSpacing: 6,
    });
  }

  private selectUnit(unitId: string): void {
    const unit = this.combat.units.find((candidate) => candidate.id === unitId);
    if (!unit || unit.hp <= 0 || unit.team !== 'party') return;
    this.combat = { ...this.combat, selectedId: unitId };
    this.message.setText(`${unit.name} 已就位。选择一个相邻目标，或者走向亮起的格子。`);
    this.renderBoard();
  }

  private selectTile(x: number, y: number): void {
    const selected = this.combat.units.find((unit) => unit.id === this.combat.selectedId);
    if (!selected || selected.team !== 'party' || selected.hp <= 0) {
      this.message.setText('先选中一名队员。');
      return;
    }

    const target = this.combat.units.find((unit) => unit.hp > 0 && unit.x === x && unit.y === y);
    if (target?.team === 'enemy') {
      const next = performAttack(this.combat, selected.id, target.id);
      if (next === this.combat) {
        this.message.setText('目标还不在攻击范围内。先走近一些。');
        return;
      }
      this.combat = { ...next, selectedId: null };
      this.message.setText(`${selected.name} 发起了攻击。`);
      this.finishPlayerAction();
      return;
    }

    const next = moveUnit(this.combat, selected.id, x, y);
    if (next === this.combat) {
      this.message.setText('这一步走不过去，试试亮起的格子。');
      return;
    }
    this.combat = { ...next, selectedId: null };
    this.message.setText(`${selected.name} 移动了。`);
    this.finishPlayerAction();
  }

  private guardSelected(): void {
    const selected = this.combat.units.find((unit) => unit.id === this.combat.selectedId);
    if (!selected || selected.team !== 'party') {
      this.message.setText('先选中一名队员，再让他进入守势。');
      return;
    }
    this.combat = { ...applyGuard(this.combat, selected.id), selectedId: null };
    this.message.setText(`${selected.name} 稳住了阵脚。`);
    this.finishPlayerAction();
  }

  private endPlayerTurn(): void {
    if (!this.combat.selectedId) {
      this.enemyTurn();
      return;
    }
    this.message.setText('先完成当前队员的行动，或者点守势。');
  }

  private finishPlayerAction(): void {
    const result = isBattleOver(this.combat);
    if (result !== 'ongoing') {
      this.finishBattle(result);
      return;
    }
    this.enemyTurn();
  }

  private enemyTurn(): void {
    let next = this.combat;
    const enemies = next.units.filter((unit) => unit.team === 'enemy' && unit.hp > 0);
    for (const enemy of enemies) {
      const current = next.units.find((unit) => unit.id === enemy.id);
      if (!current || current.hp <= 0) continue;
      const target = nearestLivingParty(next, current);
      if (!target) continue;
      if (distance(current, target) <= 1) {
        next = performAttack(next, current.id, target.id);
      } else {
        const step = chooseStep(current, target, next);
        if (step) next = moveUnit(next, current.id, step.x, step.y);
      }
    }
    this.combat = { ...next, selectedId: null };
    this.renderBoard();
    const result = isBattleOver(this.combat);
    if (result !== 'ongoing') this.finishBattle(result);
  }

  private finishBattle(result: 'win' | 'loss'): void {
    const state = getState();
    if (result === 'loss') {
      showPanel({
        eyebrow: '队伍溃散',
        title: '路还在，但你们走不动了。',
        body: '先把这次交锋记下来，再从序章重新出发。',
        actions: [{ label: '重新开始', onClick: () => { resetState(); this.scene.start('Prologue'); } }],
      });
      return;
    }

    if (this.mode === 'ambush') {
      setState({
        ...state,
        phase: 'overworld',
        supplies: Math.max(0, state.supplies - 1),
        flags: { ...state.flags, ambushWon: true },
      });
      showPanel({
        eyebrow: '旧驿道 · 战斗结束',
        title: '路口让开了。',
        body: '你们从山贼手里夺回一小段路，也付出了一点粮食和力气。',
        actions: [{ label: '继续前往临水镇', onClick: () => { clearOverlay(); this.scene.start('Overworld'); } }],
      });
      return;
    }

    setState({ ...state, phase: 'ending' });
    this.scene.start('Ending');
  }
}

function shortUnitLabel(unit: CombatUnit): string {
  if (unit.team === 'enemy') return unit.id === 'bandit-leader' ? '首' : '匪';
  if (unit.id === 'traveler') return '旅';
  if (unit.id === 'aman') return '满';
  return '达';
}

function nearestLivingParty(state: CombatState, from: CombatUnit): CombatUnit | null {
  return state.units
    .filter((unit) => unit.team === 'party' && unit.hp > 0)
    .sort((a, b) => distance(from, a) - distance(from, b))[0] ?? null;
}

function chooseStep(from: CombatUnit, target: CombatUnit, state: CombatState): { x: number; y: number } | null {
  const candidates = [
    { x: from.x + Math.sign(target.x - from.x), y: from.y },
    { x: from.x, y: from.y + Math.sign(target.y - from.y) },
  ].filter((candidate) => candidate.x !== from.x || candidate.y !== from.y);

  return candidates.find((candidate) =>
    candidate.x >= 0 &&
    candidate.x < state.width &&
    candidate.y >= 0 &&
    candidate.y < state.height &&
    !state.units.some((unit) => unit.hp > 0 && unit.x === candidate.x && unit.y === candidate.y),
  ) ?? null;
}
