import Phaser from 'phaser';
import { chapterAt, dateLabel, originAt } from '../history';
import { hex, themeFor } from '../theme';
import { addText } from '../text';
import { getState, setState } from '../runtime';
import { clearOverlay, setStatus, showPanel } from '../ui';
import { cityNameAt } from '../world';
import { requireHeroName } from '../nameEntry';

export class PrologueScene extends Phaser.Scene {
  constructor() {
    super('Prologue');
  }

  create(): void {
    if (requireHeroName(() => this.create())) return;
    clearOverlay();
    setStatus('乱世行旅 · 2.0.0 城邑与兵战');
    this.drawBackdrop();

    showPanel({
      eyebrow: `${dateLabel(getState().date)} · ${originAt(getState().originId).name}`,
      title: '先把活着这件事，交给今天。',
      body: `${originAt(getState().originId).detail}\n\n${chapterAt(getState().date.year).context}\n\n你们从${cityNameAt(getState().currentCityId,getState().date)}开始行旅。选择城邑可以预览路线与耗时，途中可能遇到商旅、流民、雨阻和匪患。也可以先处理当地事务，帮同行的人站稳脚跟。\n\n阿满：先找些粮食，再想去哪里。`,
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
    const theme = themeFor(getState().date);
    graphics.fillGradientStyle(theme.background, theme.background, theme.terrain.woods, theme.background, 1);
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
      color: hex(theme.ink),
      fontFamily: 'STKaiti, KaiTi, serif',
      fontSize: '34px',
    });
    addText(this, 57, 96, 'A SMALL LIFE IN A LARGE WAR', {
      color: hex(theme.muted),
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '11px',
      letterSpacing: 0,
    });
  }
}
