import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config/display.js';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#15110d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, GameScene, GameOverScene],
});

// Handy for poking at the game from the browser console while developing.
if (import.meta.env.DEV) window.game = game;
