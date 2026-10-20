import Phaser from 'phaser';
import {
  applyGuard,
  createCombatState,
  isBattleOver,
  moveUnit,
  performAttack,
  reachableTiles,
  resolveEnemyTurn,
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
  private roundLabel!: Phaser.GameObjects.Text;
  private finished = false;

  constructor() {
    super('Battle');
  }

  init(data: BattleData): void {
    this.mode = data.mode ?? 'route';
  }

  create(): void {
    this.finished = false;
    clearOverlay();
    setState({ ...getState(), phase: 'battle' });
    this.combat = createCombatState(getState().route);
    this.boardLayer = this.add.container(0, 0).setDepth(10).setVisible(true);
    setStatus(this.mode === 'ambush' ? '旧驿道 · 伏击' : '路线任务 · 关卡前');
    this.drawBackground();
    this.roundLabel = this.add.text(610, 130, '', { color: '#e7d7b9', fontSize: '18px' });
    this.message = this.add.text(610, 182, '旅人、阿满、陈达已就位。', {
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
    this.add.text(56, 68, this.mode === 'ambush' ? '击退山贼，清出前往临水镇的路。' : ROUTES[route ?? 'cao'].objective, {
      color: '#aab7bd',
      fontSize: '13px',
    });
    const state = getState();
    this.add.text(710, 36, `粮 ${state.supplies}  ·  士气 ${state.morale}`, { color: '#e7d7b9', fontSize: '14px' });
  }

  private renderBoard(): void {
    this.boardLayer.removeAll(true);
    const selected = this.combat.units.find((unit) => unit.id === this.combat.selectedId);
    const reachable = selected ? reachableTiles(this.combat, selected.id) : [];
    const remaining = this.combat.units.filter((unit) => unit.team === 'party' && unit.hp > 0 && !this.combat.actedIds.includes(unit.id)).length;
    this.roundLabel.setText(`第 ${this.combat.round} 回合 · 待行动 ${remaining}`);
    for (let y = 0; y < this.combat.height; y += 1) {
      for (let x = 0; x < this.combat.width; x += 1) {
        const isReachable = reachable.some((tile) => tile.x === x && tile.y === y);
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
    if (this.combat.actedIds.includes(unit.id)) unitShape.setAlpha(0.45);
    unitShape.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-10, -10, CELL_SIZE - 6, CELL_SIZE - 6),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
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
    this.boardLayer.add(this.add.text(x, y + 11, `${unit.hp}/${unit.maxHp}`, {
      color: '#171e24', fontSize: '12px', fontStyle: 'bold',
    }).setOrigin(0.5));

    const barWidth = 42;
    const ratio = Math.max(0, unit.hp / unit.maxHp);
    const bar = this.add.rectangle(x, y + 29, barWidth, 5, 0x171e24, 1);
    const health = this.add.rectangle(x - barWidth / 2, y + 29, barWidth * ratio, 5, 0x6b9c9a, 1);
    health.setOrigin(0, 0.5);
    this.boardLayer.add(bar);
    this.boardLayer.add(health);
  }

  private drawControls(): void {
    const guard = this.add.rectangle(740, 398, 136, 68, 0x344b4d, 1);
    guard.setStrokeStyle(1, 0x6b9c9a, 1);
    guard.setInteractive({ useHandCursor: true });
    guard.on('pointerdown', () => this.guardSelected());
    this.add.text(740, 398, '守势', { color: '#d5dfdf', fontSize: '20px', fontStyle: 'bold' }).setOrigin(0.5);

    const endTurn = this.add.rectangle(740, 476, 136, 68, 0xc78d4d, 1);
    endTurn.setInteractive({ useHandCursor: true });
    endTurn.on('pointerdown', () => this.endPlayerTurn());
    this.add.text(740, 476, '结束回合', { color: '#171e24', fontSize: '20px', fontStyle: 'bold' }).setOrigin(0.5);

    const route = getState().route;
    this.add.text(610, 298, '队伍状态', { color: '#c78d4d', fontSize: '14px', fontStyle: 'bold' });
    this.add.text(610, 320, route ? ROUTES[route].advantage : '粮水紧缺，三人同行。', {
      color: '#aab7bd',
      fontSize: '12px',
      lineSpacing: 6,
      wordWrap: { width: 280 },
    });
  }

  private selectUnit(unitId: string): void {
    if (this.finished) return;
    const unit = this.combat.units.find((candidate) => candidate.id === unitId);
    if (!unit || unit.hp <= 0 || unit.team !== 'party') return;
    if (this.combat.actedIds.includes(unitId)) {
      this.message.setText(`${unit.name} 本回合已行动。`);
      return;
    }
    this.combat = { ...this.combat, selectedId: unitId };
    this.message.setText(`${unit.name} · 体力 ${unit.hp}/${unit.maxHp}\n攻击 ${unit.attack} · ${this.combat.movedIds.includes(unitId) ? '已移动，仍可攻击或守势' : '尚未移动'}`);
    this.renderBoard();
  }

  private selectTile(x: number, y: number): void {
    if (this.finished) return;
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
    this.combat = { ...next, selectedId: selected.id };
    this.message.setText(`${selected.name} 已移动，仍可攻击或守势。`);
    this.renderBoard();
  }

  private guardSelected(): void {
    if (this.finished) return;
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
    if (this.finished) return;
    for (const unit of this.combat.units) {
      if (unit.team === 'party' && unit.hp > 0 && !this.combat.actedIds.includes(unit.id)) {
        this.combat = applyGuard(this.combat, unit.id);
      }
    }
    this.enemyTurn();
  }

  private finishPlayerAction(): void {
    const result = isBattleOver(this.combat);
    if (result !== 'ongoing') {
      this.finishBattle(result);
      return;
    }
    const remaining = this.combat.units.some((unit) => unit.team === 'party' && unit.hp > 0 && !this.combat.actedIds.includes(unit.id));
    if (remaining) this.renderBoard();
    else this.enemyTurn();
  }

  private enemyTurn(): void {
    this.combat = resolveEnemyTurn(this.combat);
    this.message.setText(`敌军行动完毕。第 ${this.combat.round} 回合，队伍重新就位。`);
    this.renderBoard();
    const result = isBattleOver(this.combat);
    if (result !== 'ongoing') this.finishBattle(result);
  }

  private finishBattle(result: 'win' | 'loss'): void {
    this.finished = true;
    const state = getState();
    if (result === 'loss') {
      showPanel({
        eyebrow: '队伍溃散',
        title: '路还在，但你们走不动了。',
        body: '重整队伍，再试着清出这段路。',
        actions: [
          { label: '重试这场战斗', onClick: () => this.scene.restart({ mode: this.mode }) },
          { label: '从序章重新开始', variant: 'quiet', onClick: () => { resetState(); this.scene.start('Prologue'); } },
        ],
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
