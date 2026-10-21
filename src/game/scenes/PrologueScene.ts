import Phaser from 'phaser';
import { PROLOGUE_LINES } from '../content';
import { addText } from '../text';
import { getState, setState } from '../runtime';
import { clearOverlay, setStatus, showPanel } from '../ui';

export class PrologueScene extends Phaser.Scene {
  constructor() {
    super('Prologue');
  }

  create(): void {
    clearOverlay();
    setStatus('乱世行旅 · H5 Demo');
    this.drawBackdrop();

    showPanel({
      eyebrow: '东汉末年 · 流民序章',
      title: '先把活着这件事，交给今天。',
      body: PROLOGUE_LINES.map((line) => `${line.speaker}：${line.text}`).join('\n\n'),
      actions: [
        {
          label: '踏上逃难路',
          onClick: () => {
            setState({ ...getState(), phase: 'overworld' });
            this.scene.start('Overworld');
          },
        },
      ],
    });
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x11161b, 0x11161b, 0x243139, 0x243139, 1);
    graphics.fillRect(0, 0, 960, 540);

    graphics.fillStyle(0xc78d4d, 0.14);
    graphics.fillCircle(768, 116, 76);
    graphics.fillStyle(0x6b9c9a, 0.18);
    graphics.fillRect(0, 418, 960, 122);

    for (let x = 0; x <= 960; x += 32) {
      graphics.lineStyle(1, 0xd5dfdf, 0.04);
      graphics.lineBetween(x, 0, x, 540);
    }
    for (let y = 0; y <= 540; y += 32) {
      graphics.lineStyle(1, 0xd5dfdf, 0.04);
      graphics.lineBetween(0, y, 960, y);
    }

    addText(this, 54, 54, '乱世行旅', {
      color: '#f2e9d8',
      fontFamily: 'STKaiti, KaiTi, serif',
      fontSize: '34px',
    });
    addText(this, 57, 96, 'A SMALL LIFE IN A LARGE WAR', {
      color: '#aab7bd',
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
      letterSpacing: 0,
    });
  }
}
