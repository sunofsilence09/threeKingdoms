import Phaser from 'phaser';
import { ROUTES } from '../content';
import { getState, setState } from '../runtime';
import { selectRoute } from '../state';
import { clearOverlay, setStatus, showRouteChoice } from '../ui';

export class RouteChoiceScene extends Phaser.Scene {
  constructor() {
    super('RouteChoice');
  }

  create(): void {
    clearOverlay();
    setState({ ...getState(), phase: 'route-choice' });
    setStatus('三方来使已经抵达临水镇');
    this.drawBackdrop();

    showRouteChoice(Object.values(ROUTES), (route) => {
      setState(selectRoute(getState(), route.id));
      this.scene.start('Battle', { mode: 'route' });
    });
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x1b2328, 1);
    graphics.fillRect(0, 0, 960, 540);
    graphics.fillStyle(0xa55b5a, 0.16);
    graphics.fillRect(0, 0, 960, 140);
    graphics.lineStyle(1, 0xd5dfdf, 0.08);
    graphics.lineBetween(54, 148, 906, 148);
    graphics.lineBetween(54, 454, 906, 454);
  }
}
