import Phaser from 'phaser';
import { ROUTES } from '../content';
import { getState, resetState } from '../runtime';
import { clearOverlay, setStatus, showPanel } from '../ui';

export class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create(): void {
    clearOverlay();
    const route = getState().route ?? 'liu';
    const definition = ROUTES[route];
    setStatus('这一段路暂时走到了这里');
    this.drawBackdrop(definition.color);

    showPanel({
      eyebrow: `${definition.title} · Demo 结尾`,
      title: '你们暂时找到了容身之处。',
      body: `${definition.ending}\n\n路线目标：${definition.objective}`,
      actions: [
        {
          label: '从头再走一遍',
          onClick: () => {
            resetState();
            this.scene.start('Prologue');
          },
        },
      ],
    });
  }

  private drawBackdrop(color: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x11161b, 1);
    graphics.fillRect(0, 0, 960, 540);
    graphics.fillStyle(color, 0.24);
    graphics.fillCircle(740, 170, 180);
    graphics.fillStyle(0x6b9c9a, 0.15);
    graphics.fillRect(0, 400, 960, 140);
    graphics.lineStyle(1, 0xf2e9d8, 0.12);
    graphics.lineBetween(54, 402, 906, 402);
  }
}
