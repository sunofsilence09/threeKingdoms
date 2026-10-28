import Phaser from 'phaser';
import { getState, setState, hasSavedGame, resetState } from '../runtime';
import { setStatus, showPanel } from '../ui';
import { requireHeroName } from '../nameEntry';
import { showStartMenu } from '../startMenu';

export class BootScene extends Phaser.Scene {
  private startChoiceMade=false;
  constructor() {
    super('Boot');
  }

  create(): void {
    if(!this.startChoiceMade) {
      showStartMenu(getState(),hasSavedGame(),()=>{this.startChoiceMade=true;this.create();},
        ()=>{resetState();this.startChoiceMade=true;this.create();});
      return;
    }
    if (requireHeroName(() => this.create())) return;
    if(getState().lifeMigration||getState().lifeRecovery){
      const recovery=Boolean(getState().lifeRecovery);
      showPanel({eyebrow:'2.2.0 情义赠礼 · 生命档案',title:recovery?'生命资料已单独恢复':'旧旅程已接入世代更迭',
        body:recovery?'部分生命资料无法读取，原记录已单独备份。已尽量保留可用寿命与纪念资料，并补齐所需条目。人物成长、财货、行旅与已学武学保留；离世情况可在地图和同行纪念中查看。':'已为具名人物保存固定生年与本局寿命。新城与原旅程接续，已经离世的同行者转入纪念档案，成长、交情与已学武学保留。史料卒年仅供参考，本局实际离世时间可能前后浮动。',
        actions:[{label:'查看当前旅程',onClick:()=>{setState({...getState(),lifeMigration:undefined,lifeRecovery:undefined});this.create();}}]});return;
    }
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

    setStatus('乱世行旅 · 2.2.0 情义赠礼');
    this.scene.start(firstScene, firstScene === 'Battle' ? { mode: encounter ?? (route ? 'route' : 'ambush') } : undefined);
  }
}
