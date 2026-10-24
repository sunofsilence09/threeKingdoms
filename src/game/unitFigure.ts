import { getUnitModel, type ModelWeapon } from './characters';
import type { GameDate } from './history';

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
export function paintUnitFigure(g: FigurePainter, unit: { id: string; weapon: ModelWeapon; level?: number }, date?: GameDate): void {
  if (unit.id.startsWith('wolf:')) {
    g.fillStyle(0x26352e, .35).fillEllipse(0, 16, 38, 9);
    g.lineStyle(4, 0x555f59).lineBetween(-12, 4, -16, 15).lineBetween(-5, 5, -7, 16).lineBetween(9, 4, 12, 16).lineBetween(15, 2, 17, 12);
    g.fillStyle(0x7e8880).fillEllipse(0, 0, 34, 19);
    g.fillStyle(0x66746c).fillTriangle(13, -6, 18, -18, 23, -4).fillTriangle(5, -7, 9, -18, 15, -7);
    g.fillStyle(0x8e978c).fillEllipse(15, -4, 17, 16).fillTriangle(18, -6, 29, 0, 19, 5);
    g.fillStyle(0x333e38).fillTriangle(-14, -3, -28, -11, -20, 7).fillCircle(28, 0, 2);
    g.fillStyle(0xe3bd63).fillCircle(19, -6, 2);
    g.fillStyle(0xf4efdf).fillTriangle(22, 3, 23, 7, 25, 3);
    return;
  }
  const { appearance: a, weapon } = getUnitModel(unit, date);
  const half = a.pose === 'tyrant' ? 11 : a.stocky ? 9 : a.pose === 'lancer' ? 8 : unit.id === 'aman' ? 6 : 7;
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
    tyrant: { angle: -0.05, step: 2, left: { x: -15, y: -2 }, right: { x: 10, y: 3 } },
    halberd: { angle: -0.04, step: 3, left: { x: -10, y: 3 }, right: { x: 11, y: -4 } },
    bruiser: { angle: 0.08, step: 5, left: { x: -13, y: 0 }, right: { x: 10, y: 1 } },
    jade: { angle: 0.09, step: 1, left: { x: -3, y: 2 }, right: { x: 7, y: -4 } },
    sentinel: { angle: -0.02, step: 2, left: { x: -10, y: 3 }, right: { x: 12, y: -3 } },
    longbeard: { angle: 0.02, step: 2, left: { x: -4, y: -2 }, right: { x: 12, y: 1 } },
    serpent: { angle: 0.1, step: 4, left: { x: -11, y: 0 }, right: { x: 11, y: -5 } },
    lancer: { angle: -0.04, step: 6, left: { x: -12, y: 4 }, right: { x: 12, y: -2 } },
    protective: { angle: 0.07, step: 0, left: { x: -13, y: -3 }, right: { x: 3, y: 0 } },
    shieldguard: { angle: -0.07, step: 3, left: { x: -11, y: -2 }, right: { x: 11, y: 0 } },
  }[a.pose];
  g.rotateCanvas(pose.angle);
  const prop = ['sword', 'fan', 'scroll', 'halberd', 'glaive', 'jade', 'serpentspear', 'handkerchief', 'swordshield'].includes(weapon);
  const right = weapon === 'fists' || prop || a.pose === 'archer' || a.pose === 'lancer' ? pose.right : { x: half + 2, y: 5 };
  g.fillStyle(0x0e1718, 0.55).fillEllipse(0, 16, 31, 9);
  // Boots, legs and travel pack; the distinct shoulders survive the far zoom.
  g.fillStyle(0x343934).fillRect(-half + 1 - pose.step, 6, half - 1, 8).fillRect(2 + pose.step, 6, half - 1, 8);
  g.fillStyle(0x272d2c).fillRoundedRect(-half - 1 - pose.step, 12, half + 1, 5, 2).fillRoundedRect(1 + pose.step, 12, half + 1, 5, 2);
  if (a.pose === 'lancer') g.fillStyle(0x91b7ce).fillPoints([{ x: -8, y: -11 }, { x: 7, y: -9 }, { x: -13, y: 14 }, { x: -19, y: 10 }], true);
  if (a.pose === 'longbeard') g.fillStyle(a.robe).fillTriangle(-10, -9, 10, -9, -12, 14);
  if (a.pack) g.fillStyle(0x79644b).fillRoundedRect(-half - 5, -7, 11, 17, 3);
  g.fillStyle(a.robe).fillRoundedRect(-half, -10, half * 2, 21, 3);
  if (a.pose === 'tyrant') g.fillStyle(a.robe).fillEllipse(0, 1, 27, 23);
  if (a.outfit === 'robe' || a.outfit === 'dress') {
    const hem = a.outfit === 'dress' ? half + 5 : half + 2;
    g.fillStyle(a.robe).fillPoints([{ x: -half, y: -2 }, { x: half, y: -2 }, { x: hem, y: 14 }, { x: -hem, y: 14 }], true);
    g.lineStyle(1, a.accent ?? a.sash).lineBetween(0, 0, -3, 13);
  }
  if (unit.id === 'traveler' && (unit.level ?? 1) >= 6) g.fillStyle(0x344f4c).fillTriangle(-half - 4, -11, half + 4, -11, -half - 7, 13);
  g.lineStyle(1, 0x252e2a).strokeRoundedRect(-half, -10, half * 2, 21, 3);
  g.lineStyle(6, a.robe).lineBetween(-half, -7, pose.left.x, pose.left.y).lineBetween(half, -7, right.x, right.y);
  if (a.pose === 'protective') g.fillStyle(a.accent!).fillTriangle(-5, -8, 4, -5, 9, 13);
  if (a.outfit === 'armor') {
    g.fillStyle(a.accent ?? 0x434b4b).fillRoundedRect(-half, -9, half * 2, 16, 2);
    g.fillRoundedRect(-half - 3, -11, 7, 6, 1).fillRoundedRect(half - 4, -11, 7, 6, 1);
    g.lineStyle(1, a.sash);
    for (let row = -6; row <= 6; row += 4) g.lineBetween(-half + 2, row, half - 2, row);
    g.lineBetween(-3, -8, -3, 8).lineBetween(3, -8, 3, 8);
  }
  if (unit.id === 'traveler' && (unit.level ?? 1) >= 3 && a.outfit !== 'armor') {
    g.fillStyle(a.accent ?? a.sash).fillRoundedRect(-half - 3, -11, 8, 6, 2);
    g.lineStyle(4, a.sash).lineBetween(pose.left.x - 1, pose.left.y - 2, pose.left.x, pose.left.y).lineBetween(right.x - 1, right.y - 2, right.x, right.y);
  }
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
  if (a.plume && a.pose === 'lancer') {
    g.fillStyle(0xefeee3).fillPoints([{ x: -2, y: -23 }, { x: 4, y: -27 }, { x: 9, y: -26 }, { x: 3, y: -22 }], true);
  } else if (a.plume) {
    g.lineStyle(2, a.robe).beginPath().arc(-7, -20, 7, Math.PI, Math.PI * 1.9).strokePath();
    g.beginPath().arc(7, -21, 6, Math.PI * 1.1, Math.PI * 2).strokePath();
  }
  if (a.headband !== null) {
    g.fillStyle(a.headband).fillRect(-8, -17, 16, 4).fillTriangle(-7, -15, -12, -9, -9, -17);
  }
  g.fillStyle(0x29251f).fillRect(-4, -12, 2, 1).fillRect(3, -12, 2, 1);
  if (a.leftEyeCovered) g.lineStyle(1, 0x383b36).lineBetween(-7, -14, 6, -11).fillStyle(0x30342f).fillRoundedRect(1, -14, 6, 4, 1);
  if (a.pose === 'longbeard') {
    g.fillStyle(0x302e27).fillPoints([{ x: -5, y: -8 }, { x: 5, y: -8 }, { x: 4, y: 1 }, { x: 0, y: 7 }, { x: -3, y: 0 }], true);
  } else if (a.pose === 'serpent') {
    g.fillStyle(0x292a26).fillPoints([{ x: -7, y: -9 }, { x: -4, y: -6 }, { x: -3, y: -9 }, { x: 0, y: -4 }, { x: 3, y: -8 }, { x: 5, y: -5 }, { x: 7, y: -9 }, { x: 4, y: 1 }, { x: -4, y: 0 }], true);
    g.lineStyle(2, 0x292a26).lineBetween(-5, -14, -1, -13).lineBetween(2, -13, 6, -14);
  } else if (a.beard) g.fillStyle(0x3d332a).fillTriangle(-5, -8, 5, -8, 0, -3);
  // Weapons are separate from the base figure, so fists never display future gear.
  const handX = right.x;
  if (weapon === 'cleaver') {
    g.lineStyle(3, 0x674f39).lineBetween(handX, 2, handX + 2, 8);
    g.fillStyle(0xbfc7bf).fillPoints([{ x: handX, y: 8 }, { x: handX + 6, y: 6 }, { x: handX + 9, y: 15 }, { x: handX + 3, y: 17 }], true);
    g.lineStyle(1, 0xe8e5d1).lineBetween(handX + 3, 17, handX + 9, 15);
  } else if (weapon === 'knife') {
    g.lineStyle(3, 0x674f39).lineBetween(handX, 2, handX + 2, 7);
    g.fillStyle(0xd8dbcb).fillTriangle(handX, 7, handX + 4, 6, handX + 7, 18);
  } else if (weapon === 'spear' && a.pose === 'lancer') {
    g.lineStyle(2, 0x806547).lineBetween(-25, 7.25, 24, -5);
    g.fillStyle(0xd7d9ca).fillTriangle(23, -7, 25, -3, 30, -8);
    g.lineStyle(2, 0xefeee3).lineBetween(22, -4, 23, 0);
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
  } else if (weapon === 'halberd') {
    g.lineStyle(2, 0x8e7151).lineBetween(handX, 17, handX, -21);
    g.fillStyle(0xc6ccca).fillTriangle(handX - 2, -20, handX + 2, -20, handX, -28);
    g.fillStyle(0xb9c1ba).fillPoints([{ x: handX - 2, y: -23 }, { x: handX - 7, y: -26 }, { x: handX - 5, y: -21 }, { x: handX - 7, y: -17 }, { x: handX - 2, y: -19 }], true);
    g.fillPoints([{ x: handX + 2, y: -23 }, { x: handX + 7, y: -26 }, { x: handX + 5, y: -21 }, { x: handX + 7, y: -17 }, { x: handX + 2, y: -19 }], true);
    g.lineStyle(2, 0x9c443c).lineBetween(handX - 2, -15, handX + 3, -15);
  } else if (weapon === 'glaive' && (a.pose === 'sentinel' || a.pose === 'longbeard')) {
    const shaftX = a.pose === 'sentinel' ? 13 : 15;
    g.lineStyle(2, 0x8c7049).lineBetween(shaftX - 3, 18, shaftX, -17);
    g.fillStyle(a.pose === 'sentinel' ? 0xb59a61 : 0xbdc7b6).fillPoints([
      { x: shaftX - 1, y: -15 }, { x: shaftX - 1, y: -24 }, { x: shaftX + 5, y: -26 },
      { x: shaftX + 8, y: -23 }, { x: shaftX + 5, y: -17 }, { x: shaftX + 2, y: -13 },
    ], true);
    g.lineStyle(1, 0xe1d7ad).lineBetween(shaftX + 5, -17, shaftX + 8, -23);
    g.lineStyle(2, a.sash).lineBetween(shaftX, -13, shaftX + 4, -10);
  } else if (weapon === 'serpentspear') {
    g.lineStyle(2, 0x8e7151).lineBetween(-15, 16, 16, -16);
    g.lineStyle(3, 0xc0c9c2).lineBetween(16, -16, 20, -17).lineBetween(20, -17, 18, -21).lineBetween(18, -21, 22, -22);
    g.fillStyle(0xd5ddd3).fillTriangle(20, -22, 23, -20, 25, -26);
    g.lineStyle(2, a.sash).lineBetween(13, -13, 18, -10);
  } else if (weapon === 'handkerchief') {
    g.fillStyle(0xf0e5ce).fillPoints([{ x: right.x, y: right.y - 1 }, { x: right.x + 7, y: right.y + 1 }, { x: right.x + 6, y: right.y + 9 }, { x: right.x + 2, y: right.y + 6 }], true);
    g.lineStyle(1, a.sash).lineBetween(right.x + 3, right.y + 4, right.x + 5, right.y + 7);
  } else if (weapon === 'swordshield') {
    g.fillStyle(0x5b6f68).fillCircle(pose.left.x, pose.left.y + 1, 8);
    g.lineStyle(2, 0xb29466).strokeCircle(pose.left.x, pose.left.y + 1, 8);
    g.fillStyle(0xb29466).fillCircle(pose.left.x, pose.left.y + 1, 2);
    g.lineStyle(3, 0x765740).lineBetween(handX, right.y, handX + 2, -4);
    g.lineStyle(2, a.sash).lineBetween(handX - 1, -4, handX + 5, -2);
    g.fillStyle(0xcfd6ce).fillTriangle(handX + 1, -5, handX + 4, -3, handX + 8, -18);
  } else if (weapon === 'glaive') {
    g.lineStyle(3, 0x8e7151).lineBetween(-17, 4, 11, -1);
    g.fillStyle(0xb9c3bd).fillPoints([{ x: 10, y: -2 }, { x: 23, y: -7 }, { x: 21, y: -1 }, { x: 12, y: 3 }], true);
    g.lineStyle(1, 0xe0ddc9).lineBetween(12, 3, 21, -1);
  } else if (weapon === 'jade') {
    if(unit.id.replace(/^enemy:/,'')==='himiko') {
      g.fillStyle(0x927949).fillCircle(right.x+2,right.y+3,6);g.lineStyle(1,0xcab47d).strokeCircle(right.x+2,right.y+3,6);g.fillStyle(0xb2b5a0).fillCircle(right.x+2,right.y+3,4);
    } else {
      g.lineStyle(1, 0xc8b78c).lineBetween(right.x, right.y - 1, right.x + 1, right.y + 4);
      g.fillStyle(0x93b7a5).fillEllipse(right.x + 1, right.y + 5, 5, 7);
      g.fillStyle(0xd8e4cf).fillCircle(right.x + 1, right.y + 4, 1);
    }
  } else {
    g.lineStyle(1, 0xead0ad).strokeCircle(pose.left.x, pose.left.y, 3).strokeCircle(right.x, right.y, 3);
  }
}
