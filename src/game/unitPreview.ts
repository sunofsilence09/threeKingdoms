import { getUnitAppearance, type ModelWeapon } from './characters';
import { paintUnitFigure, type FigurePainter } from './unitFigure';
import type { GameDate } from './history';

class CanvasFigurePainter implements FigurePainter {
  constructor(private ctx: CanvasRenderingContext2D) {}
  fillStyle(color: number, alpha = 1) { this.ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`; this.ctx.globalAlpha = alpha; return this; }
  lineStyle(width: number, color: number, alpha = 1) { this.ctx.lineWidth = width; this.ctx.strokeStyle = `#${color.toString(16).padStart(6, '0')}`; this.ctx.globalAlpha = alpha; return this; }
  fillRect(x: number, y: number, w: number, h: number) { this.ctx.fillRect(x, y, w, h); return this; }
  fillRoundedRect(x: number, y: number, w: number, h: number, r: number) { this.ctx.beginPath(); this.ctx.roundRect(x, y, w, h, r); this.ctx.fill(); return this; }
  strokeRoundedRect(x: number, y: number, w: number, h: number, r: number) { this.ctx.beginPath(); this.ctx.roundRect(x, y, w, h, r); this.ctx.stroke(); return this; }
  fillCircle(x: number, y: number, r: number) { this.ctx.beginPath(); this.ctx.arc(x, y, r, 0, Math.PI * 2); this.ctx.fill(); return this; }
  strokeCircle(x: number, y: number, r: number) { this.ctx.beginPath(); this.ctx.arc(x, y, r, 0, Math.PI * 2); this.ctx.stroke(); return this; }
  fillEllipse(x: number, y: number, w: number, h: number) { this.ctx.beginPath(); this.ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); this.ctx.fill(); return this; }
  fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) { return this.fillPoints([{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }], true); }
  fillPoints(points: { x: number; y: number }[], close: boolean) { this.ctx.beginPath(); points.forEach((p, i) => i ? this.ctx.lineTo(p.x, p.y) : this.ctx.moveTo(p.x, p.y)); if (close) this.ctx.closePath(); this.ctx.fill(); return this; }
  lineBetween(x1: number, y1: number, x2: number, y2: number) { this.ctx.beginPath(); this.ctx.moveTo(x1, y1); this.ctx.lineTo(x2, y2); this.ctx.stroke(); return this; }
  beginPath() { this.ctx.beginPath(); return this; }
  arc(x: number, y: number, r: number, start: number, end: number) { this.ctx.arc(x, y, r, start, end); return this; }
  strokePath() { this.ctx.stroke(); return this; }
  rotateCanvas(angle: number) { this.ctx.rotate(angle); return this; }
}

export function createUnitPreview(id: string, weapon: ModelWeapon, name: string, level = 1, date?: GameDate): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 192; canvas.height = 160; canvas.className = 'character-model-preview';
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', `${name}棋盘小人预览`);
  canvas.dataset.portrait = getUnitAppearance({ id, weapon, level }, date).portrait; canvas.dataset.level = String(level); canvas.dataset.character = id; canvas.dataset.weapon = weapon;
  const ctx = canvas.getContext('2d');
  if (ctx) { ctx.translate(96, 88); ctx.scale(3, 3); paintUnitFigure(new CanvasFigurePainter(ctx), { id, weapon, level }, date); }
  return canvas;
}
