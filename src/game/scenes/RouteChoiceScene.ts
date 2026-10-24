import Phaser from 'phaser';
import { ROUTES } from '../content';
import { getState, setState } from '../runtime';
import { availableRoutes, selectRoute } from '../state';
import { dateLabel } from '../history';
import { themeFor } from '../theme';
import { clearOverlay, setStatus, showRouteChoice } from '../ui';

export class RouteChoiceScene extends Phaser.Scene {
  constructor() {
    super('RouteChoice');
  }

  create(): void {
    clearOverlay();
    const state = getState();
    const available = availableRoutes(state);
    if (state.route || !available.length) { this.scene.start('Overworld'); return; }
    setState({ ...getState(), phase: 'route-choice' });
    setStatus(dateLabel(state.date));
    this.drawBackdrop();

    showRouteChoice(Object.values(ROUTES), (route) => {
      setState(selectRoute(getState(), route.id));
      this.scene.start('Overworld');
    }, { available, year: state.date.year, state, onLeave: () => this.scene.start('Overworld') });
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(themeFor(getState().date).background, 1);
    graphics.fillRect(0, 0, 960, 540);
    graphics.fillStyle(0xa55b5a, 0.16);
    graphics.fillRect(0, 0, 960, 140);
    graphics.lineStyle(1, 0xd5dfdf, 0.08);
    graphics.lineBetween(54, 148, 906, 148);
    graphics.lineBetween(54, 454, 906, 454);
  }
}
