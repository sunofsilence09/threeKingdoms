import Phaser from 'phaser';
import { currentActor, canAttack, reachableTiles, terrainAt, type CombatState, type CombatUnit } from './combat';
import { type TerrainKind } from './battlefield';
import { getState } from './runtime';
import { themeFor, hex } from './theme';
import { addText } from './text';
import { drawUnitModel } from './unitModel';

export const BATTLE_VIEW = { x: 24, y: 118, width: 630, height: 360 };
const BASE_CELL = 48;

/** Clipped battlefield, independent of the fixed HUD and action controls. */
export class BattleBoard {
  readonly layer: Phaser.GameObjects.Container;
  cellSize = 36;
  offset = { x: 27, y: 0 };
  private state!: CombatState;
  private drag: { id: number; x: number; y: number; ox: number; oy: number; moved: boolean } | null = null;
  private maskGraphic: Phaser.GameObjects.Graphics;
  private previousUnits = new Map<string, { x: number; y: number; hp: number }>();
  private previousEvent: CombatState['lastEvent'];

  constructor(private scene: Phaser.Scene, onTile: (x: number, y: number) => void) {
    this.layer = scene.add.container().setDepth(10);
    this.maskGraphic = scene.make.graphics({}, false).fillStyle(0xffffff).fillRect(BATTLE_VIEW.x, BATTLE_VIEW.y, BATTLE_VIEW.width, BATTLE_VIEW.height);
    this.layer.setMask(this.maskGraphic.createGeometryMask());
    const down = (p: Phaser.Input.Pointer) => {
      if (this.inside(p.x, p.y) && !this.drag) this.drag = { id: p.id, x: p.x, y: p.y, ox: this.offset.x, oy: this.offset.y, moved: false };
    };
    const move = (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || d.id !== p.id || !p.isDown) return;
      if (Math.hypot(p.x - d.x, p.y - d.y) > 8) d.moved = true;
      if (d.moved) {
        this.offset = { x: d.ox + p.x - d.x, y: d.oy + p.y - d.y };
        this.applyTransform();
      }
    };
    const up = (p: Phaser.Input.Pointer) => {
      const d = this.drag;
      if (!d || d.id !== p.id) return;
      this.drag = null;
      if (d.moved || !this.inside(p.x, p.y)) return;
      const x = Math.floor((p.x - BATTLE_VIEW.x - this.offset.x) / this.cellSize);
      const y = Math.floor((p.y - BATTLE_VIEW.y - this.offset.y) / this.cellSize);
      if (this.state && x >= 0 && y >= 0 && x < this.state.width && y < this.state.height) onTile(x, y);
    };
    const wheel = (p: Phaser.Input.Pointer, _objects: unknown[], _dx: number, dy: number) => {
      if (this.inside(p.x, p.y)) this.zoom(dy < 0, this.state.units.find(u => u.id === this.state.selectedId));
    };
    scene.input.on('pointerdown', down);
    scene.input.on('pointermove', move);
    scene.input.on('pointerup', up);
    scene.input.on('pointerupoutside', up);
    scene.input.on('wheel', wheel);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.input.off('pointerdown', down).off('pointermove', move).off('pointerup', up).off('pointerupoutside', up).off('wheel', wheel);
      this.layer.clearMask(true);
      this.maskGraphic.destroy();
    });
  }

  private inside(x: number, y: number): boolean {
    return x >= BATTLE_VIEW.x && y >= BATTLE_VIEW.y && x < BATTLE_VIEW.x + BATTLE_VIEW.width && y < BATTLE_VIEW.y + BATTLE_VIEW.height;
  }
  tileScreenPoint(tile: { x: number; y: number }): { x: number; y: number } {
    return { x: BATTLE_VIEW.x + this.offset.x + (tile.x + 0.5) * this.cellSize,
      y: BATTLE_VIEW.y + this.offset.y + (tile.y + 0.5) * this.cellSize };
  }
  private applyTransform(): void {
    if (!this.state) return;
    const clamp = (value: number, content: number, view: number) => content <= view ? (view - content) / 2 : Phaser.Math.Clamp(value, view - content, 0);
    this.offset.x = clamp(this.offset.x, this.state.width * this.cellSize, BATTLE_VIEW.width);
    this.offset.y = clamp(this.offset.y, this.state.height * this.cellSize, BATTLE_VIEW.height);
    this.layer.setPosition(BATTLE_VIEW.x + this.offset.x, BATTLE_VIEW.y + this.offset.y).setScale(this.cellSize / BASE_CELL);
  }
  zoom(near: boolean, focus?: { x: number; y: number }): void {
    const center = focus ?? { x: (BATTLE_VIEW.width / 2 - this.offset.x) / this.cellSize - 0.5,
      y: (BATTLE_VIEW.height / 2 - this.offset.y) / this.cellSize - 0.5 };
    this.cellSize = near ? 56 : 36;
    this.offset = { x: BATTLE_VIEW.width / 2 - (center.x + 0.5) * this.cellSize, y: BATTLE_VIEW.height / 2 - (center.y + 0.5) * this.cellSize };
    this.applyTransform();
  }
  focus(tile: { x: number; y: number }): void {
    const p = this.tileScreenPoint(tile);
    if (p.x < BATTLE_VIEW.x + 24 || p.x > BATTLE_VIEW.x + BATTLE_VIEW.width - 24 || p.y < BATTLE_VIEW.y + 24 || p.y > BATTLE_VIEW.y + BATTLE_VIEW.height - 24) {
      this.offset = { x: BATTLE_VIEW.width / 2 - (tile.x + 0.5) * this.cellSize, y: BATTLE_VIEW.height / 2 - (tile.y + 0.5) * this.cellSize };
      this.applyTransform();
    }
  }
  render(state: CombatState, targeting?: { tiles: { x: number; y: number }[]; mode: 'fire' | 'martial' }): void {
    const theme = themeFor(getState().date);
    this.state = state;
    for (const child of this.layer.list) this.scene.tweens.killTweensOf(child);
    this.layer.removeAll(true);
    const selected = state.units.find(u => u.id === state.selectedId);
    const reachable = new Set((selected && !targeting ? reachableTiles(state, selected.id) : []).map(t => `${t.x},${t.y}`));
    const targets = new Set(targeting?.tiles.map(t => `${t.x},${t.y}`));
    const g = this.scene.add.graphics();
    this.layer.add(g);
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const kind = terrainAt(state, x, y);
        const lit = reachable.has(`${x},${y}`);
        const px = x * BASE_CELL, py = y * BASE_CELL;
        g.fillStyle(theme.terrain[kind]).fillRect(px + 1, py + 1, 46, 46);
        if (kind === 'road' && (x + y) % 2 === 0) g.fillStyle(0xffffff, 0.12).fillRect(px + 1, py + 1, 46, 46);
        this.drawTerrain(g, kind, px + 24, py + 24);
        if (lit) g.fillStyle(theme.move, 0.15).fillRect(px + 2, py + 2, 44, 44);
        g.lineStyle(1, lit ? theme.move : theme.grid, lit ? 0.85 : 0.28).strokeRect(px + 1, py + 1, 46, 46);
        if (lit) g.fillStyle(theme.move, 0.8).fillCircle(px + 24, py + 24, 3);
        if (state.scorched?.some(t => t.x === x && t.y === y)) {
          g.fillStyle(0x3c302a, .65).fillEllipse(px + 24, py + 30, 36, 16);
        }
        const fire = state.fires?.find(t => t.x === x && t.y === y);
        if (fire) {
          g.fillStyle(0xd96d32, .2).fillRect(px + 2, py + 2, 44, 44);
          g.lineStyle(2, 0xd76a2c, .9).strokeRect(px + 2, py + 2, 44, 44);
          for (let flame = 0; flame < fire.level; flame++) {
            const fx = px + 8 + flame * 12;
            g.fillStyle(0xe86c27).fillTriangle(fx - 5, py + 39, fx, py + 20, fx + 7, py + 39);
            g.fillStyle(0xffdc7e).fillTriangle(fx - 2, py + 39, fx + 1, py + 29, fx + 4, py + 39);
          }
        }
        if (targets.has(`${x},${y}`)) {
          const color = targeting?.mode === 'fire' ? 0xe99740 : 0x9b87cf;
          g.fillStyle(color, .18).fillRect(px + 2, py + 2, 44, 44);
          g.lineStyle(3, color).strokeRect(px + 3, py + 3, 42, 42);
        }
      }
    }
    for (const unit of state.units.filter(u => u.hp > 0)) {
      const x = (unit.x + 0.5) * BASE_CELL, y = (unit.y + 0.5) * BASE_CELL;
      const acted = state.actedIds.includes(unit.id);
      const attackable = selected && currentActor(state)?.id === selected.id && canAttack(state, selected, unit) && !state.actedIds.includes(selected.id);
      const color = unit.team === 'party' ? 0x8fae95 : 0xba7770;
      const shape = this.scene.add.ellipse(x, y + 12, 39, 15, color, acted ? 0.15 : 0.35);
      shape.setStrokeStyle(unit.id === currentActor(state)?.id || attackable ? 3 : 1, attackable ? theme.enemy : unit.id === currentActor(state)?.id ? theme.accent : color);
      this.layer.add(shape);
      const model = drawUnitModel(this.scene, unit, x, y - 1, acted);
      this.layer.add(model);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const previous = this.previousUnits.get(unit.id);
        const event = state.lastEvent !== this.previousEvent ? state.lastEvent : undefined;
        if (previous && (previous.x !== unit.x || previous.y !== unit.y)) {
          model.setPosition(x + (previous.x - unit.x) * BASE_CELL, y - 1 + (previous.y - unit.y) * BASE_CELL);
          this.scene.tweens.add({ targets: model, x, y: y - 1, duration: unit.id === 'aman' ? 130 : 210, ease: 'Sine.easeOut' });
        } else if (event?.actorId === unit.id && (event.kind === 'attack' || event.kind === 'dodge')) {
          const target = state.units.find(u => u.id === event.targetId);
          const dx = target ? Math.sign(target.x - unit.x) * 7 : 0;
          const dy = target ? Math.sign(target.y - unit.y) * 5 : -4;
          this.scene.tweens.add({ targets: model, x: x + dx, y: y - 1 + dy, duration: unit.weapon === 'bow' ? 130 : 90, yoyo: true });
        } else if (event?.targetId === unit.id && event.kind === 'dodge') {
          this.scene.tweens.add({ targets: model, x: x + 6, duration: 80, yoyo: true, repeat: 1 });
        } else if (event?.actorId === unit.id && event.kind === 'ultimate') {
          this.scene.tweens.add({ targets: model, scaleX: 1.16, scaleY: 1.16, duration: 160, yoyo: true });
        }
      }
      const name = unit.id.startsWith('wolf:') ? '狼' : unit.name.slice(-2);
      this.layer.add(addText(this.scene, x, y + 27, `${name} ${unit.hp}/${unit.maxHp}`, { color: hex(theme.ink), fontSize: '11px', backgroundColor: hex(theme.paper) }).setOrigin(0.5));
      this.layer.add(this.scene.add.rectangle(x, y + 20, 38, 3, 0x142423));
      this.layer.add(this.scene.add.rectangle(x - 19, y + 20, 38 * unit.hp / unit.maxHp, 3, 0x9dc5a2).setOrigin(0, 0.5));
      if (unit.empowered) this.layer.add(this.scene.add.triangle(x - 16, y - 17, 0, 8, 4, 0, 8, 8, 0xffd487));
      if (unit.guarded) this.layer.add(this.scene.add.circle(x + 16, y - 17, 4, 0xd5e7dd));
    }
    this.previousUnits = new Map(state.units.map(u => [u.id, { x: u.x, y: u.y, hp: u.hp }]));
    this.previousEvent = state.lastEvent;
    this.applyTransform();
  }
  private drawTerrain(g: Phaser.GameObjects.Graphics, kind: TerrainKind, x: number, y: number): void {
    if (kind === 'woods') {
      g.fillStyle(0x66886a).fillTriangle(x - 13, y + 10, x - 3, y - 14, x + 7, y + 10);
      g.fillStyle(0x477157).fillTriangle(x - 2, y + 14, x + 8, y - 10, x + 18, y + 14);
    } else if (kind === 'rock') {
      g.fillStyle(0x858c87).fillPoints([{ x: x - 17, y: y + 12 }, { x: x - 12, y: y - 10 }, { x: x + 4, y: y - 17 }, { x: x + 17, y: y }, { x: x + 12, y: y + 14 }], true);
      g.lineStyle(2, 0xb4b5a3).lineBetween(x - 9, y - 8, x + 3, y - 12);
    } else if (kind === 'cart') {
      g.fillStyle(0xa88754).fillRect(x - 17, y - 10, 34, 20);
      g.lineStyle(3, 0x3a2d20).lineBetween(x - 13, y - 8, x + 13, y + 8).lineBetween(x + 13, y - 8, x - 13, y + 8);
      g.strokeCircle(x - 11, y + 14, 5).strokeCircle(x + 11, y - 14, 5);
    } else if (kind === 'wall') {
      g.fillStyle(0xaca18a).fillRect(x - 18, y - 12, 36, 24);
      g.lineStyle(2, 0x645f53).lineBetween(x - 18, y, x + 18, y).lineBetween(x, y - 12, x, y).lineBetween(x - 9, y, x - 9, y + 12).lineBetween(x + 9, y, x + 9, y + 12);
    } else if (kind === 'water') {
      g.lineStyle(2, 0x62949d, 0.7);
      for (let i = -10; i <= 10; i += 10) g.lineBetween(x - 13, y + i, x + 13, y + i - 3);
    } else if (kind === 'bridge') {
      g.lineStyle(3, 0xb9a077);
      for (let i = -15; i <= 15; i += 10) g.lineBetween(x - 18, y + i, x + 18, y + i);
    }
  }
}
