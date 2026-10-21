import Phaser from 'phaser';
import { ROUTES } from '../content';
import { getState, resetState } from '../runtime';
import { clearOverlay, setStatus, showPanel } from '../ui';
import { PARTY_IDS, experienceToNextLevel } from '../growth';

export class EndingScene extends Phaser.Scene {
  private rewardSummary = '';
  constructor() {
    super('Ending');
  }

  init(data: { rewardSummary?: string } = {}): void {
    this.rewardSummary = data.rewardSummary ?? '';
  }

  create(): void {
    clearOverlay();
    const route = getState().route ?? 'liu';
    const definition = ROUTES[route];
    setStatus('这一段路暂时走到了这里');
    this.drawBackdrop(definition.color);

    const names = { traveler: '姜垣', aman: '阿满', 'chen-da': '陈达' };
    const growth = PARTY_IDS.map(id => {
      const progress = getState().party[id];
      return `${names[id]} Lv.${progress.level} · 经验 ${progress.xp}/${experienceToNextLevel(progress.level) || '满'}`;
    }).join('\n');
    showPanel({
      eyebrow: `${definition.title} · Demo 结尾`,
      title: '你们暂时找到了容身之处。',
      body: `${definition.ending}\n\n战斗胜利 · 三人各获 45 经验\n${this.rewardSummary || growth}\n\n从拳脚菜刀，到短刀、木枪与猎弓，下一段路有了些底气。\n升级：每级体力 +2，每两级攻击 +1。`,
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
