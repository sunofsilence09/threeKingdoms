import type Phaser from 'phaser';
import { getUnitAppearance, type ModelWeapon } from './characters';
import { paintUnitFigure } from './unitFigure';

export function drawUnitModel(scene: Phaser.Scene, unit: { id: string; weapon: ModelWeapon; level?: number }, x: number, y: number, acted: boolean): Phaser.GameObjects.Graphics {
  const appearance = getUnitAppearance(unit);
  const g = scene.add.graphics({ x, y }).setAlpha(acted ? 0.48 : 1);
  g.setName(`model:${unit.id}:${unit.weapon}`);
  g.setData('character', unit.id).setData('weapon', unit.weapon).setData('portrait', appearance.portrait).setData('pose', appearance.pose);
  paintUnitFigure(g, unit);
  return g;
}
