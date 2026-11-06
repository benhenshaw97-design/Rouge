import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { UIScene } from './scenes/UIScene.js';
import { SlotScene } from './minigames/SlotScene.js';
import { TicketScene } from './minigames/TicketScene.js';
import { installResponsiveScale, measure } from './systems/Viewport.js';

const parent = document.getElementById('game');
const size = measure(parent);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  backgroundColor: '#15110d',
  // The canvas is sized by installResponsiveScale (device-pixel sharp, any aspect ratio).
  scale: {
    mode: Phaser.Scale.NONE,
    width: size.width,
    height: size.height,
    zoom: size.cssW / size.width,
  },
  input: { activePointers: 2 },
  // Scene order is draw order: the UI scene draws on top of the game.
  scene: [BootScene, GameScene, UIScene, TicketScene, SlotScene, GameOverScene],
});

installResponsiveScale(game, parent);

// Handy for poking at the game from the browser console while developing.
if (import.meta.env.DEV) {
  window.game = game;
  import('./systems/MusicPlayer.js').then((m) => (window.music = m.music));
}
