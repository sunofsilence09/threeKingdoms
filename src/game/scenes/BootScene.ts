import Phaser from 'phaser';
import { getState, setState } from '../runtime';
import { setStatus, showPanel } from '../ui';
import { requireHeroName } from '../nameEntry';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    if (requireHeroName(() => this.create())) return;
    if (getState().martialRecovery) {
      showPanel({ eyebrow: '存档恢复', title: '武学资料已安全恢复',
        body: '部分武学或切磋记录无法读取，已单独备份并恢复为可用状态。原有日期、旅程、人物成长、队伍、关系与资源已保留。',
        actions: [{ label: '继续旅程', onClick: () => { setState({ ...getState(), martialRecovery: undefined }); this.create(); } }] });
      return;
    }
    const { phase, route, encounter } = getState();
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
    this.scene.start(firstScene, firstScene === 'Battle' ? { mode: encounter ?? (route ? 'route' : 'ambush') } : undefined);
  }
}
