import Phaser from 'phaser';
import { MAP_NODES } from '../content';
import { createHeroHud } from '../heroHud';
import { addText } from '../text';
import { getState, setState } from '../runtime';
import { clearOverlay, setStatus, showPanel } from '../ui';

export class OverworldScene extends Phaser.Scene {
  constructor() {
    super('Overworld');
  }

  create(): void {
    clearOverlay();
    setState({ ...getState(), phase: 'overworld' });
    setStatus('点击地点，继续寻找能容身的地方');
    this.drawMap();
    this.drawNodes();
    const heroHud = createHeroHud(getState().route, undefined, getState().party);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => heroHud.destroy());
  }

  private drawMap(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x172127, 1);
    graphics.fillRect(0, 0, 960, 540);

    for (let x = 0; x <= 960; x += 40) {
      graphics.lineStyle(1, 0xaab7bd, 0.04);
      graphics.lineBetween(x, 0, x, 540);
    }
    for (let y = 0; y <= 540; y += 40) {
      graphics.lineStyle(1, 0xaab7bd, 0.04);
      graphics.lineBetween(0, y, 960, y);
    }

    graphics.fillStyle(0x396c73, 0.45);
    graphics.beginPath();
    graphics.moveTo(720, 0);
    graphics.lineTo(790, 0);
    graphics.lineTo(660, 540);
    graphics.lineTo(570, 540);
    graphics.closePath();
    graphics.fillPath();

    graphics.lineStyle(5, 0xc78d4d, 0.42);
    graphics.beginPath();
    graphics.moveTo(210, 315);
    graphics.lineTo(480, 215);
    graphics.lineTo(770, 320);
    graphics.strokePath();

    addText(this, 42, 32, '临水以北 · 第三日', {
      color: '#f2e9d8',
      fontFamily: 'STKaiti, KaiTi, serif',
      fontSize: '28px',
    });
    addText(this, 44, 70, '选择一个地点。路会记得你经过的地方。', {
      color: '#aab7bd',
      fontSize: '14px',
    });

    const state = getState();
    addText(this, 730, 32, `粮 ${state.supplies}  ·  士气 ${state.morale}`, {
      color: '#e7d7b9',
      fontSize: '14px',
      fontStyle: 'bold',
    });
    addText(this, 730, 58, '队伍：姜垣 / 阿满 / 陈达', {
      color: '#aab7bd',
      fontSize: '12px',
    });

    const marker = this.add.rectangle(112, 396, 18, 18, 0xc78d4d);
    marker.setStrokeStyle(2, 0xf2e9d8, 1);
    addText(this, 78, 365, '你们', { color: '#e7d7b9', fontSize: '12px' });
  }

  private drawNodes(): void {
    const state = getState();
    for (const node of MAP_NODES) {
      const completed =
        (node.id === 'ambush' && state.flags.ambushWon) ||
        (node.id === 'recovery' && state.flags.recovered);
      const color = completed ? 0x6b9c9a : node.id === 'hub' ? 0xa55b5a : 0xc78d4d;
      const card = this.add.rectangle(node.x, node.y, 178, 74, 0x1d262d, 0.96);
      card.setStrokeStyle(2, color, 0.95);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerover', () => card.setFillStyle(0x26323a, 1));
      card.on('pointerout', () => card.setFillStyle(0x1d262d, 0.96));
      card.on('pointerdown', () => this.selectNode(node.id));

      addText(this, node.x - 70, node.y - 24, node.title, {
        color: '#f2e9d8',
        fontFamily: 'STKaiti, KaiTi, serif',
        fontSize: '23px',
      });
      addText(this, node.x - 70, node.y + 10, completed ? '已走过 · 再看一眼' : node.subtitle, {
        color: '#aab7bd',
        fontSize: '12px',
      });
    }
  }

  private selectNode(id: 'ambush' | 'recovery' | 'hub'): void {
    const state = getState();

    if (id === 'ambush') {
      if (state.flags.ambushWon) {
        showPanel({
          eyebrow: '旧驿道',
          title: '风里只剩箭头。',
          body: '山贼已经退去，路边的车辙还指向临水镇。',
          actions: [{ label: '继续前行', onClick: clearOverlay }],
        });
        return;
      }

      showPanel({
        eyebrow: '旧驿道 · 遭遇',
        title: '伏击从芦苇里扑出来。',
        body: '对方人数不多，但已经占住了路口。先让队伍活着穿过去。',
        actions: [
          {
            label: '进入战斗',
            onClick: () => {
              clearOverlay();
              this.scene.start('Battle', { mode: 'ambush' });
            },
          },
          { label: '先听一听', variant: 'quiet', onClick: clearOverlay },
        ],
      });
      return;
    }

    if (id === 'recovery') {
      if (!state.flags.ambushWon) {
        showPanel({
          eyebrow: '枯井村',
          title: '井边的人不敢抬头。',
          body: '旧驿道还没清出来，现在经过这里只会把危险带来。',
          actions: [{ label: '返回驿道', onClick: clearOverlay }],
        });
        return;
      }

      if (!state.flags.recovered) {
        setState({
          ...state,
          supplies: state.supplies + 1,
          flags: { ...state.flags, recovered: true },
        });
      }
      showPanel({
        eyebrow: '枯井村 · 短暂休整',
        title: '有人把最后一碗水递了过来。',
        body: '你们补回一点粮水，也听说临水镇里已经来了三方使者。若能找到庇护，或许就不必再赤手赶路。',
        actions: [{ label: '前往临水镇', onClick: () => this.scene.start('RouteChoice') }],
      });
      return;
    }

    if (!state.flags.ambushWon) {
      showPanel({
        eyebrow: '临水镇 · 还未到达',
        title: '镇门还在更远处。',
        body: '先清掉旧驿道的伏击，再谈谁愿意接纳你们。',
        actions: [{ label: '回到地图', onClick: clearOverlay }],
      });
      return;
    }

    clearOverlay();
    this.scene.start('RouteChoice');
  }
}
