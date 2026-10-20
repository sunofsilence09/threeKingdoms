import Phaser from 'phaser';
import { getState } from '../runtime';
import { setStatus } from '../ui';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    const { phase, route } = getState();
    const firstScene = phase === 'route-choice'
      ? 'RouteChoice'
      : phase === 'ending'
        ? 'Ending'
        : phase === 'overworld'
          ? 'Overworld'
          : phase === 'battle'
            ? 'Battle'
          : 'Prologue';

    setStatus('乱世行旅 · H5 Demo');
    this.scene.start(firstScene, firstScene === 'Battle' ? { mode: route ? 'route' : 'ambush' } : undefined);
  }
}
