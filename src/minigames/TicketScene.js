import Phaser from 'phaser';
import { COLORS } from '../config/display.js';
import { cssSize, uiScale } from '../systems/Viewport.js';
import { Button } from '../ui/Button.js';
import { frame, text } from '../ui/kit.js';

/**
 * Punching tickets: the new passengers' tickets slide past the conductor's punch; tap (or press
 * Space) when a ticket's printed circle is under it. Each ticket is a little faster.
 * A clean punch earns a tip of TIPS.perfect, a fair one TIPS.good; a miss earns nothing.
 *
 * Launched over the UI by UIScene.openMinigame('Tickets', ...) with { count, destinations }.
 */
const TIPS = { perfect: 3, good: 1 };
const WINDOW = { perfect: 7, good: 20 }; // how close (css px) counts as perfect / good

export class TicketScene extends Phaser.Scene {
  constructor() {
    super('Tickets');
  }

  init(data) {
    this.state = data.state;
    this.audio = data.audio;
    this.onClose = data.onClose;
    this.count = Math.max(1, Math.min(10, data.count ?? 3));
    this.destinations = data.destinations ?? ['Any town'];
    this.done = 0;
    this.tips = 0;
    this.results = [];
    this.ticket = null;
    this.finished = false;
  }

  create() {
    this.build();
    const onResize = () => this.build();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.input.keyboard?.on('keydown-SPACE', () => this.punch());
    this.input.keyboard?.on('keydown-ENTER', () => (this.finished ? this.close() : this.punch()));
    this.input.keyboard?.on('keydown-ESC', () => this.close());
  }

  build() {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.ticket = null;
    const u = uiScale(this);
    this.cameras.main.setOrigin(0, 0).setZoom(u).setScroll(0, 0);
    const { w, h } = cssSize(this);
    const dim = this.add.rectangle(0, 0, w, h, 0x0d0a08, 0.72).setOrigin(0).setInteractive();
    dim.on('pointerdown', () => this.punch());

    const pw = Math.min(520, w - 20);
    const ph = Math.min(360, h - 20);
    const px = (w - pw) / 2;
    const py = (h - ph) / 2;
    this.box = { px, py, pw, ph };
    frame(this, 'button-brown', w / 2, h / 2, pw, ph).setAlpha(0.98);
    text(this, w / 2, py + 14, 'PUNCH THE TICKETS', Math.min(20, pw / 20), COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.hint = text(this, w / 2, py + 40, 'Tap when the circle is under the punch', 13, COLORS.textDim).setOrigin(0.5, 0);

    // The punch, fixed in the middle; tickets slide under it.
    this.punchX = w / 2;
    this.beltY = py + ph * 0.52;
    this.add.rectangle(px + 14, this.beltY + 40, pw - 28, 6, 0x3a2a1e).setOrigin(0, 0.5);
    this.punchHead = this.add.container(this.punchX, this.beltY - 70);
    this.punchHead.add([
      this.add.rectangle(0, -26, 16, 40, 0x8a6a3a).setStrokeStyle(2, 0x3a2a1e),
      this.add.rectangle(0, 0, 38, 14, COLORS.brass).setStrokeStyle(2, 0x3a2a1e),
      this.add.rectangle(0, 12, 8, 12, 0x2b1d12),
    ]);
    this.punchHead.setDepth(5);
    // Guide: where a ticket's circle must be.
    this.add.rectangle(this.punchX, this.beltY, 2, 60, 0xc0392b, 0.35);

    this.scoreText = text(this, w / 2, py + ph - 70, '', 15, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    this.resultText = text(this, w / 2, py + ph - 46, '', 13, COLORS.text).setOrigin(0.5, 0);
    this.refresh();
    if (this.finished) this.showDone();
    else this.nextTicket();
  }

  refresh() {
    this.scoreText?.setText(`Ticket ${Math.min(this.done + 1, this.count)} of ${this.count}   ·   Tips £${this.tips}`);
  }

  /** A ticket slides in from the right, its punch circle somewhere along it. */
  nextTicket() {
    const { px, pw } = this.box;
    const tw = 170;
    const th = 74;
    const dest = this.destinations[this.done % this.destinations.length];
    const c = this.add.container(px + pw + tw / 2, this.beltY);
    const card = this.add.rectangle(0, 0, tw, th, 0xf3e6c8).setStrokeStyle(3, 0x8a2a1e);
    const title = text(this, -tw / 2 + 10, -th / 2 + 7, 'ROUGE RAILWAY', 12, '#8a2a1e', { fontStyle: 'bold' });
    const to = text(this, -tw / 2 + 10, -th / 2 + 26, `To: ${dest}`, 12, COLORS.textDark);
    const no = text(this, -tw / 2 + 10, -th / 2 + 46, `No. ${1000 + Math.floor(Math.random() * 9000)}`, 11, '#6b5a45');
    const holeX = Phaser.Math.Between(20, tw / 2 - 18);
    const ring = this.add.circle(holeX, 0, 13).setStrokeStyle(2, 0x8a2a1e);
    const dot = this.add.circle(holeX, 0, 4, 0x8a2a1e, 0.5);
    c.add([card, title, to, no, ring, dot]);
    c.setSize(tw, th);
    const speed = 150 + this.done * 28; // css px per second
    const travel = px + pw + tw / 2 - (px - tw / 2);
    this.ticket = { c, holeX, punched: false };
    this.ticketTween = this.tweens.add({
      targets: c,
      x: px - tw / 2,
      duration: (travel / speed) * 1000,
      onComplete: () => {
        if (!this.ticket?.punched) this.score('missed', c);
      },
    });
  }

  punch() {
    if (this.finished || !this.ticket || this.ticket.punched) return;
    this.tweens.add({ targets: this.punchHead, y: this.beltY - 20, duration: 70, yoyo: true, ease: 'Quad.easeIn' });
    this.audio?.play('click');
    const t = this.ticket;
    const off = Math.abs(t.c.x + t.holeX - this.punchX);
    // Only counts if some of the ticket is under the punch.
    if (Math.abs(t.c.x - this.punchX) > 90) return;
    t.punched = true;
    const grade = off <= WINDOW.perfect ? 'perfect' : off <= WINDOW.good ? 'good' : 'off';
    // A hole where it was punched.
    t.c.add(this.add.circle(this.punchX - t.c.x, 0, 5, 0x2b1d12));
    this.score(grade, t.c);
  }

  score(grade, card) {
    const tip = TIPS[grade] ?? 0;
    this.tips += tip;
    this.results.push(grade);
    this.done++;
    const label = { perfect: `Perfect! +£${tip}`, good: `Good +£${tip}`, off: 'Off the mark', missed: 'Missed!' }[grade];
    this.resultText?.setText(label).setColor(tip ? COLORS.good : COLORS.bad);
    if (tip) this.audio?.play(grade === 'perfect' ? 'coins' : 'click');
    // Punched tickets drop away.
    this.ticketTween?.stop();
    this.tweens.add({ targets: card, y: card.y + 90, alpha: 0, duration: 380, delay: 120, onComplete: () => card.destroy() });
    this.ticket = null;
    this.refresh();
    if (this.done >= this.count) this.time.delayedCall(500, () => this.showDone());
    else this.time.delayedCall(420, () => this.nextTicket());
  }

  showDone() {
    if (!this.finished) {
      this.finished = true;
      this.state.earn(this.tips);
    }
    const { w } = cssSize(this);
    const { py, ph } = this.box;
    const perfect = this.results.filter((r) => r === 'perfect').length;
    this.hint.setText(`${perfect} perfect of ${this.count}`);
    this.resultText.setText(this.tips ? `The passengers tip £${this.tips}.` : 'Not a tip in sight.').setColor(COLORS.text);
    new Button(this, w / 2, py + ph - 8 - 22, { width: 180, height: 40, fontSize: 16, align: 'center', label: 'Done', skin: 'green', onClick: () => this.close() });
  }

  close() {
    if (!this.finished) {
      // Leaving early: tips so far still count.
      this.finished = true;
      this.state.earn(this.tips);
    }
    this.onClose?.(this.tips);
    this.scene.stop();
  }
}
