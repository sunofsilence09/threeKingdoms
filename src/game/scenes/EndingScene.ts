import { showCharacterPanel } from '../characterPanel';
import Phaser from 'phaser';
import { ROUTES } from '../content';
import { getState, resetState, setState } from '../runtime';
import { availableRoutes, continueJourney } from '../state';
import { dateLabel } from '../history';
import { cityAt } from '../world';
import { themeFor } from '../theme';
import { clearOverlay, setStatus, showPanel } from '../ui';
import { experienceToNextLevel } from '../growth';
import { recruitProfile } from '../recruitmentCatalog';

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
    const state = getState();
    const route = state.route;
    if (!route) { this.showJourneyEnding(); return; }
    const definition = ROUTES[route];
    setStatus('这一段路暂时走到了这里');
    this.drawBackdrop(definition.color);

    const growth = state.deployed.map(id => {
      const progress = getState().party[id];
      return `${recruitProfile(id)!.name} Lv.${progress.level} · 剩余技能点 ${progress.points} · 经验 ${progress.xp}/${experienceToNextLevel(progress.level) || '满'}`;
    }).join('\n');
    showPanel({
      eyebrow: `${dateLabel(state.date)} · ${definition.title}`,
      title: '你们暂时找到了容身之处。',
      body: `${definition.ending}\n\n战斗胜利 · 基础经验45，魅力加成按个人计算\n${this.rewardSummary || growth}\n\n从拳脚菜刀，到短刀、木枪与猎弓，下一段路有了些底气。\n升级：每级体力 +2，每两级攻击 +1，每级另获3点技能点。`,
      actions: [
        { label: '返回地图 · 自选下一站', onClick: () => { setState(continueJourney(getState())); this.scene.start('Overworld'); } },
        { label: '分配技能点', onClick: () => showCharacterPanel() },
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

  private showJourneyEnding(): void {
    const state = getState();
    this.drawBackdrop(themeFor(state.date).accent);
    showPanel({ eyebrow: `${dateLabel(state.date)} · ${cityAt(state.currentCityId).name}`,
      title: '这一程，护住了同行的人。',
      body: `乡民与粮车平安抵达。你仍然没有归属哪一方，但这段路已留下你们的足迹。\n\n${this.rewardSummary || '队伍的等级、经验与技能点已保存在旅程中。'}\n\n接下来由你选择目的地。旅行和停留会推进日期；没有自动跳过数年的剧情。`,
      actions: [
        ...(availableRoutes(state).length ? [{ label: '查看可投奔的阵营', onClick: () => this.scene.start('RouteChoice') }] : []),
        { label: '分配技能点', onClick: () => showCharacterPanel() },
        { label: '返回地图 · 自选下一站', variant: 'quiet', onClick: () => { setState(continueJourney(getState())); this.scene.start('Overworld'); } },
        { label: '从头再走一遍', variant: 'quiet', onClick: () => { resetState(); this.scene.start('Prologue'); } },
      ] });
  }

  private drawBackdrop(color: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(themeFor(getState().date).background, 1);
    graphics.fillRect(0, 0, 960, 540);
    graphics.fillStyle(color, 0.24);
    graphics.fillCircle(740, 170, 180);
    graphics.fillStyle(0x6b9c9a, 0.15);
    graphics.fillRect(0, 400, 960, 140);
    graphics.lineStyle(1, 0xf2e9d8, 0.12);
    graphics.lineBetween(54, 402, 906, 402);
  }
}
