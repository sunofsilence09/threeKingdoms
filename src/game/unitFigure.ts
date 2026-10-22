import { getUnitModel, type ModelWeapon } from './characters';

/** Geometry shared by Phaser battlefield figures and the character-book canvas. */
export interface FigurePainter {
  fillStyle(color: number, alpha?: number): FigurePainter;
  lineStyle(width: number, color: number, alpha?: number): FigurePainter;
  fillRect(x: number, y: number, width: number, height: number): FigurePainter;
  fillRoundedRect(x: number, y: number, width: number, height: number, radius: number): FigurePainter;
  strokeRoundedRect(x: number, y: number, width: number, height: number, radius: number): FigurePainter;
  fillCircle(x: number, y: number, radius: number): FigurePainter;
  strokeCircle(x: number, y: number, radius: number): FigurePainter;
  fillEllipse(x: number, y: number, width: number, height: number): FigurePainter;
  fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): FigurePainter;
  fillPoints(points: { x: number; y: number }[], close: boolean): FigurePainter;
  lineBetween(x1: number, y1: number, x2: number, y2: number): FigurePainter;
  beginPath(): FigurePainter;
  arc(x: number, y: number, radius: number, start: number, end: number): FigurePainter;
  strokePath(): FigurePainter;
  rotateCanvas(angle: number): FigurePainter;
}

/** Small, readable figures share clothing and silhouette with the full-body artwork. */
export function paintUnitFigure(g: FigurePainter, unit: { id: string; weapon: ModelWeapon }): void {
  const { appearance: a, weapon } = getUnitModel(unit);
  const half = a.stocky ? 9 : unit.id === 'aman' ? 6 : 7;
  const pose = {
    calm: { angle: 0, step: 0, left: { x: -9, y: 5 }, right: { x: 9, y: 5 } },
    scout: { angle: -0.12, step: 3, left: { x: -13, y: -6 }, right: { x: 8, y: -11 } },
    guard: { angle: 0.05, step: 4, left: { x: 0, y: -4 }, right: { x: 12, y: 3 } },
    leader: { angle: 0, step: 3, left: { x: 6, y: -5 }, right: { x: -6, y: -2 } },
    skulker: { angle: 0.15, step: 2, left: { x: -12, y: -2 }, right: { x: 10, y: -6 } },
    strategist: { angle: -0.03, step: 1, left: { x: -5, y: 2 }, right: { x: 10, y: 2 } },
    greeting: { angle: 0.04, step: 1, left: { x: 1, y: -4 }, right: { x: -1, y: -4 } },
    commander: { angle: -0.08, step: 3, left: { x: -14, y: -7 }, right: { x: 8, y: 3 } },
    archer: { angle: -0.1, step: 4, left: { x: -6, y: -8 }, right: { x: 13, y: -5 } },
    fan: { angle: 0.12, step: 1, left: { x: -4, y: 2 }, right: { x: 10, y: -7 } },
    scholar: { angle: 0, step: 0, left: { x: -3, y: -1 }, right: { x: 3, y: -1 } },
  }[a.pose];
  g.rotateCanvas(pose.angle);
  const prop = ['sword', 'fan', 'scroll'].includes(weapon);
  const right = weapon === 'fists' || prop || a.pose === 'archer' ? pose.right : { x: half + 2, y: 5 };
  g.fillStyle(0x0e1718, 0.55).fillEllipse(0, 16, 31, 9);
  // Boots, legs and travel pack; the distinct shoulders survive the far zoom.
  g.fillStyle(0x343934).fillRect(-half + 1 - pose.step, 6, half - 1, 8).fillRect(2 + pose.step, 6, half - 1, 8);
  g.fillStyle(0x272d2c).fillRoundedRect(-half - 1 - pose.step, 12, half + 1, 5, 2).fillRoundedRect(1 + pose.step, 12, half + 1, 5, 2);
  if (a.pack) g.fillStyle(0x79644b).fillRoundedRect(-half - 5, -7, 11, 17, 3);
  g.fillStyle(a.robe).fillRoundedRect(-half, -10, half * 2, 21, 3);
  if (a.outfit === 'robe' || a.outfit === 'dress') {
    const hem = a.outfit === 'dress' ? half + 5 : half + 2;
    g.fillStyle(a.robe).fillPoints([{ x: -half, y: -2 }, { x: half, y: -2 }, { x: hem, y: 14 }, { x: -hem, y: 14 }], true);
    g.lineStyle(1, a.accent ?? a.sash).lineBetween(0, 0, -3, 13);
  }
  g.lineStyle(1, 0x252e2a).strokeRoundedRect(-half, -10, half * 2, 21, 3);
  g.lineStyle(6, a.robe).lineBetween(-half, -7, pose.left.x, pose.left.y).lineBetween(half, -7, right.x, right.y);
  if (unit.id === 'bandit-leader') {
    g.fillStyle(0x4b3930).fillRect(-half, -9, 4, 15).fillRect(half - 4, -9, 4, 15);
  }
  g.lineStyle(2, 0xc0b39a).lineBetween(-4, -10, 1, -3).lineBetween(4, -10, -2, -1);
  g.fillStyle(a.sash).fillRect(-half, 3, half * 2, 3);
  if (a.pack) g.lineStyle(2, a.sash).lineBetween(-half + 1, -9, half - 1, 3);
  g.fillStyle(a.skin).fillCircle(pose.left.x, pose.left.y, 3).fillCircle(right.x, right.y, 3);
  // Hair bun, head and wrapped band or visible hairline.
  g.fillStyle(0x282723).fillCircle(0, -20, 4).fillEllipse(0, -14, 17, 18);
  g.fillStyle(a.skin).fillEllipse(0, -12, 13, 14);
  g.fillStyle(0x2d2924).fillEllipse(0, -18, 15, 7);
  if (a.hair === 'long') {
    g.fillStyle(0x2d2924).fillRoundedRect(-10, -16, 4, 18, 2);
    g.fillStyle(a.accent ?? a.sash).fillCircle(4, -21, 2);
  } else if (a.hair === 'crown') {
    g.fillStyle(0x303431).fillRoundedRect(-5, -25, 10, 7, 2);
    g.fillStyle(a.sash).fillRect(-5, -21, 10, 2);
  }
  if (a.headband !== null) {
    g.fillStyle(a.headband).fillRect(-8, -17, 16, 4).fillTriangle(-7, -15, -12, -9, -9, -17);
  }
  g.fillStyle(0x29251f).fillRect(-4, -12, 2, 1).fillRect(3, -12, 2, 1);
  if (a.beard) g.fillStyle(0x3d332a).fillTriangle(-5, -8, 5, -8, 0, -3);
  // Weapons are separate from the base figure, so fists never display future gear.
  const handX = right.x;
  if (weapon === 'cleaver') {
    g.lineStyle(3, 0x674f39).lineBetween(handX, 2, handX + 2, 8);
    g.fillStyle(0xbfc7bf).fillPoints([{ x: handX, y: 8 }, { x: handX + 6, y: 6 }, { x: handX + 9, y: 15 }, { x: handX + 3, y: 17 }], true);
    g.lineStyle(1, 0xe8e5d1).lineBetween(handX + 3, 17, handX + 9, 15);
  } else if (weapon === 'knife') {
    g.lineStyle(3, 0x674f39).lineBetween(handX, 2, handX + 2, 7);
    g.fillStyle(0xd8dbcb).fillTriangle(handX, 7, handX + 4, 6, handX + 7, 18);
  } else if (weapon === 'spear') {
    g.lineStyle(2, 0xc19b60).lineBetween(handX + 1, 17, handX + 5, -18);
    g.fillStyle(0xd7d9ca).fillTriangle(handX + 2, -17, handX + 8, -17, handX + 6, -25);
  } else if (weapon === 'bow') {
    g.lineStyle(2, 0xc69b60).beginPath().arc(handX - 1, 1, 13, -Math.PI / 2, Math.PI / 2).strokePath();
    g.lineStyle(1, 0xe2d4aa).lineBetween(handX - 1, -12, handX - 1, 14);
    if (a.pose === 'archer') g.lineStyle(1, 0xe2d4aa).lineBetween(pose.left.x, -8, handX + 12, -8);
  } else if (weapon === 'sword') {
    g.lineStyle(4, 0x3e4039).lineBetween(half + 1, 3, half + 5, 17);
    g.lineStyle(2, a.sash).lineBetween(half, -2, half + 1, 3).lineBetween(half - 2, 2, half + 4, 1);
  } else if (weapon === 'fan') {
    g.fillStyle(0xe0d1b6).fillCircle(right.x + 1, right.y - 6, 6);
    g.lineStyle(1, a.sash).strokeCircle(right.x + 1, right.y - 6, 6).lineBetween(right.x, right.y, right.x + 1, right.y - 5);
  } else if (weapon === 'scroll') {
    g.fillStyle(0xe0d6b9).fillRoundedRect(-6, -3, 12, 6, 1);
    g.lineStyle(2, 0x8d704b).lineBetween(-6, -4, -6, 4).lineBetween(6, -4, 6, 4);
  } else {
    g.lineStyle(1, 0xead0ad).strokeCircle(pose.left.x, pose.left.y, 3).strokeCircle(right.x, right.y, 3);
  }
}
