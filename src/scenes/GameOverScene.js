import Phaser from 'phaser';
import { DEPTH, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config/display.js';
import { Button } from '../ui/Button.js';

const BEST_KEY = 'rouge.bestDistance';

/** Shows how far the run got, and a restart button. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.result = { distance: 0, reason: 'Out of fuel', stats: { earned: 0, stops: 0, passengersDelivered: 0 }, ...data };
  }

  create() {
    const { distance, reason, stats } = this.result;
    const cx = GAME_WIDTH / 2;
    const best = Math.max(readBest(), distance);
    const isRecord = distance >= best && distance > 0;
    writeBest(best);

    if (this.textures.exists('sky')) this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x15110d, 0.7).setOrigin(0);

    this.add.text(cx, 150, 'END OF THE LINE', { fontFamily: FONT, fontSize: '64px', fontStyle: 'bold', color: '#ffd98a' }).setOrigin(0.5);
    this.add.text(cx, 210, reason, { fontFamily: FONT, fontSize: '22px', color: '#c9b48e' }).setOrigin(0.5);

    this.add.text(cx, 270, 'DISTANCE TRAVELLED', { fontFamily: FONT, fontSize: '18px', color: '#c9b48e' }).setOrigin(0.5);
    this.add
      .text(cx, 320, `${(distance / 1000).toFixed(2)} km`, { fontFamily: FONT, fontSize: '72px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    this.add
      .text(cx, 380, isRecord ? 'New best!' : `Best: ${(best / 1000).toFixed(2)} km`, {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: isRecord ? '#a8f0a0' : '#c9b48e',
      })
      .setOrigin(0.5);

    const line = `Stops made: ${stats.stops}     Passengers delivered: ${stats.passengersDelivered}     Money earned: £${Math.round(stats.earned)}`;
    this.add.text(cx, 430, line, { fontFamily: FONT, fontSize: '18px', color: '#f5e9d0' }).setOrigin(0.5);

    const restart = () => this.scene.start('Game');
    new Button(this, cx, 520, {
      width: 260,
      height: 60,
      fontSize: 24,
      align: 'center',
      label: 'Restart  ↻',
      fill: 0x2f5a2a,
      hoverFill: 0x3f7a38,
      stroke: 0x9be08f,
      onClick: restart,
    }).setDepth(DEPTH.panel);
    this.add.text(cx, 572, 'or press Space / Enter', { fontFamily: FONT, fontSize: '15px', color: '#c9b48e' }).setOrigin(0.5);

    this.input.keyboard?.once('keydown-SPACE', restart);
    this.input.keyboard?.once('keydown-ENTER', restart);
    this.cameras.main.fadeIn(400, 21, 17, 13);
  }
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function writeBest(v) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* storage unavailable */
  }
}
