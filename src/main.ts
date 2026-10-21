import Phaser from 'phaser';
import './style.css';
import { BattleScene } from './game/scenes/BattleScene';
import { BootScene } from './game/scenes/BootScene';
import { EndingScene } from './game/scenes/EndingScene';
import { OverworldScene } from './game/scenes/OverworldScene';
import { PrologueScene } from './game/scenes/PrologueScene';
import { RouteChoiceScene } from './game/scenes/RouteChoiceScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 540,
  backgroundColor: '#11161b',
  antialias: true,
  roundPixels: true,
  input: { windowEvents: false },
  scene: [BootScene, PrologueScene, OverworldScene, RouteChoiceScene, BattleScene, EndingScene],
  callbacks: {
    postBoot: () => {
      document.querySelector('#loading-label')?.remove();
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

export const game = new Phaser.Game(config);
