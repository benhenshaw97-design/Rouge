import Phaser from 'phaser';
import { COLORS } from '../config/display.js';
import { MINIGAMES } from '../config/balance.js';
import { cssSize, uiScale } from '../systems/Viewport.js';
import { Button } from '../ui/Button.js';
import { frame, roundButton, text } from '../ui/kit.js';

/**
 * The one-armed bandit, found in towns. Three reels; pull the lever (or press Space) for £STAKE.
 * Odds are set by SYMBOLS (weights) and PAYS below: about 90% comes back over time, with a
 * win on roughly one pull in five. Check changes with the sum in the comment at PAYS.
 *
 * Launched over the UI by UIScene.openMinigame('Slots', ...); calls onClose() when you leave.
 */
export const STAKE = MINIGAMES.slotStake;

/** Reel symbols: image key and how often it comes up (all three reels the same). */
const SYMBOLS = [
  { id: 'coal', key: 'icon-fuel', weight: 6 },
  { id: 'water', key: 'icon-water', weight: 5 },
  { id: 'pax', key: 'icon-passengers', weight: 4 },
  { id: 'gems', key: 'cargo-red-gems', weight: 3 },
  { id: 'gold', key: 'cargo-gold', weight: 2 },
  { id: 'money', key: 'icon-money', weight: 1 },
];
/**
 * Payouts in stakes. Three of a kind pays THREE[id]; otherwise money bags anywhere pay
 * TWO_MONEY (two of them) or ONE_MONEY (one). Return to player ≈ 0.90.
 */
const PAYS = { THREE: { money: 150, gold: 50, gems: 25, pax: 18, water: 12, coal: 8 }, TWO_MONEY: 5, ONE_MONEY: 2 };

const TOTAL = SYMBOLS.reduce((n, s) => n + s.weight, 0);
function spinSymbol() {
  let r = Math.random() * TOTAL;
  for (const s of SYMBOLS) if ((r -= s.weight) < 0) return s;
  return SYMBOLS[0];
}

export function payout(ids) {
  const [a, b, c] = ids;
  if (a === b && b === c) return PAYS.THREE[a] * STAKE;
  const m = ids.filter((x) => x === 'money').length;
  return (m === 2 ? PAYS.TWO_MONEY : m === 1 ? PAYS.ONE_MONEY : 0) * STAKE;
}

export class SlotScene extends Phaser.Scene {
  constructor() {
    super('Slots');
  }

  init(data) {
    this.state = data.state;
    this.audio = data.audio;
    this.onClose = data.onClose;
    this.spinning = false;
    this.result = null;
    this.message = `£${STAKE} a pull. Three of a kind wins; money bags always pay.`;
  }

  create() {
    this.build();
    const onResize = () => this.build();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.input.keyboard?.on('keydown-SPACE', () => this.pull());
    this.input.keyboard?.on('keydown-ENTER', () => this.pull());
    this.input.keyboard?.on('keydown-ESC', () => this.close());
  }

  build() {
    this.tweens.killAll();
    this.children.removeAll(true);
    const u = uiScale(this);
    this.cameras.main.setOrigin(0, 0).setZoom(u).setScroll(0, 0);
    const { w, h } = cssSize(this);
    this.add.rectangle(0, 0, w, h, 0x0d0a08, 0.7).setOrigin(0).setInteractive();

    const pw = Math.min(440, w - 20);
    const ph = Math.min(480, h - 20);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    frame(this, 'button-brown', w / 2, h / 2, pw, ph).setAlpha(0.98);
    text(this, w / 2, py + 14, 'THE ONE-ARMED BANDIT', Math.min(20, pw / 20), COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    (roundButton(this, px + pw - 26, py + 24, (g) => g.clear().lineStyle(3, 0xf6ead2, 1).lineBetween(-6, -6, 6, 6).lineBetween(-6, 6, 6, -6), () => this.close()));

    // Reels: three windows, each showing the middle symbol of a scrolling strip.
    const reelH = Math.min(110, ph * 0.26);
    const reelW = Math.min(100, (pw - 90) / 3);
    const gap = 10;
    const top = py + 54;
    const left = w / 2 - (reelW * 3 + gap * 2) / 2 - 18;
    this.reels = [];
    for (let i = 0; i < 3; i++) {
      const x = left + i * (reelW + gap);
      this.add.rectangle(x, top, reelW, reelH, 0xf3e6c8, 1).setOrigin(0).setStrokeStyle(3, COLORS.brass, 1);
      const icon = this.add.image(x + reelW / 2, top + reelH / 2, (this.result?.[i] ?? SYMBOLS[i]).key);
      const size = reelH * 0.62;
      icon.setDisplaySize(size, size);
      this.reels.push({ x, top, reelW, reelH, icon, size });
    }
    // Pay line
    this.add.rectangle(left - 4, top + reelH / 2, reelW * 3 + gap * 2 + 8, 2, 0xc0392b, 0.7).setOrigin(0, 0.5);

    // Lever
    const lx = left + reelW * 3 + gap * 2 + 22;
    this.add.rectangle(lx, top + 10, 8, reelH - 10, 0x6b5a45).setOrigin(0.5, 0);
    this.knob = this.add.circle(lx, top + 8, 11, 0xc0392b).setStrokeStyle(2, 0x3a1712).setInteractive({ useHandCursor: true });
    this.knob.on('pointerup', () => this.pull());

    // Pull button, money, message
    let y = top + reelH + 18;
    this.pullBtn = new Button(this, w / 2, y + 22, {
      width: Math.min(260, pw - 40),
      height: 46,
      fontSize: 19,
      align: 'center',
      label: `Pull  (£${STAKE})`,
      skin: 'green',
      enabled: this.state.canAfford(STAKE) && !this.spinning,
      onClick: () => this.pull(),
    });
    y += 54;
    this.moneyText = text(this, w / 2, y, '', 15, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.msgText = text(this, w / 2, y + 22, '', 13, COLORS.text, { align: 'center', wordWrap: { width: pw - 30 } }).setOrigin(0.5, 0);
    this.refreshText();

    // Paytable
    y += 64;
    const rows = [['money', 'gold', 'gems'], ['pax', 'water', 'coal']];
    const cellW = (pw - 30) / 3;
    rows.forEach((row, ri) => {
      row.forEach((id, ci) => {
        const s = SYMBOLS.find((x) => x.id === id);
        const cx = px + 15 + ci * cellW;
        const cy = y + ri * 28;
        for (let k = 0; k < 3; k++) this.add.image(cx + 10 + k * 17, cy + 10, s.key).setDisplaySize(16, 16);
        text(this, cx + 64, cy + 10, `£${PAYS.THREE[id] * STAKE}`, 13, COLORS.text).setOrigin(0, 0.5);
      });
    });
    const s = SYMBOLS.find((x) => x.id === 'money');
    const ny = y + 60;
    this.add.image(px + 25, ny + 10, s.key).setDisplaySize(16, 16);
    text(this, px + 38, ny + 10, `anywhere £${PAYS.ONE_MONEY * STAKE}   ·   two: £${PAYS.TWO_MONEY * STAKE}`, 12, COLORS.textDim).setOrigin(0, 0.5);
  }

  refreshText() {
    this.moneyText?.setText(`Purse: £${Math.floor(this.state.money)}`);
    this.msgText?.setText(this.message);
  }

  pull() {
    if (this.spinning) return;
    if (!this.state.canAfford(STAKE)) {
      this.message = 'Not enough money for another go.';
      this.refreshText();
      return;
    }
    this.state.spend(STAKE);
    this.spinning = true;
    this.pullBtn.setAlpha(0.5);
    this.audio?.play('switch');
    this.tweens.add({ targets: this.knob, y: this.knob.y + 60, duration: 160, yoyo: true, ease: 'Quad.easeOut' });
    const result = [spinSymbol(), spinSymbol(), spinSymbol()];
    this.message = 'Round and round they go…';
    this.refreshText();
    // Each reel flicks through symbols, then stops on its result, left to right.
    this.reels.forEach((reel, i) => {
      let ticks = 10 + i * 7;
      const step = () => {
        if (!reel.icon.active) return;
        if (ticks-- > 0) {
          reel.icon.setTexture(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].key).setDisplaySize(reel.size, reel.size);
          reel.icon.y = reel.top + reel.reelH * 0.2;
          this.tweens.add({ targets: reel.icon, y: reel.top + reel.reelH / 2, duration: 55 });
          this.time.delayedCall(60, step);
        } else {
          reel.icon.setTexture(result[i].key).setDisplaySize(reel.size, reel.size);
          reel.icon.y = reel.top + reel.reelH / 2;
          this.audio?.play('click');
          if (i === 2) this.finish(result);
        }
      };
      step();
    });
  }

  finish(result) {
    this.result = result;
    const won = payout(result.map((s) => s.id));
    if (won > 0) {
      this.state.earn(won);
      this.audio?.play('coins');
      this.message = won >= 100 * STAKE ? `JACKPOT! £${won}!` : `You win £${won}!`;
      for (const r of this.reels) this.tweens.add({ targets: r.icon, scale: r.icon.scale * 1.15, duration: 140, yoyo: true, repeat: 1 });
    } else {
      this.message = 'No luck. Again?';
    }
    this.spinning = false;
    this.build();
  }

  close() {
    if (this.spinning) return;
    this.onClose?.();
    this.scene.stop();
  }
}
