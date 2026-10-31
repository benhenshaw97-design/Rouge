import { DEBUG } from '../config/debug.js';
import { COLORS } from '../config/display.js';
import { Button } from './Button.js';
import { roundButton, text } from './kit.js';

const SPEEDS = [1, 3, 8];

/**
 * God mode test panel (open the game with #god on the end of the link). A "GOD" button by the
 * sound controls opens a column of test actions. G toggles it on a keyboard.
 */
export class GodPanel {
  constructor(scene, L) {
    this.scene = scene;
    this.main = scene.main;
    this.objects = [];
    this.open = false;
    const step = 46 * L.controls.dir;
    this.x = L.controls.x + step * 2;
    this.y = L.controls.y;
    this.dir = L.controls.dir;
    this.bottomRoom = L.controls.y - 10;

    const btn = roundButton(scene, this.x, this.y, () => {}, () => this.toggle());
    btn.add(text(scene, 0, 0, 'GOD', 11, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5));
  }

  toggle() {
    this.open = !this.open;
    this.build();
  }

  build() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
    if (!this.open) return;
    const g = this.main;
    const w = 190;
    const h = 38;
    const x = this.dir > 0 ? this.x - 20 + w / 2 : this.x + 20 - w / 2;
    const actions = [
      [`Unlimited fuel: ${DEBUG.unlimited ? 'ON' : 'off'}`, () => (DEBUG.unlimited = !DEBUG.unlimited), DEBUG.unlimited ? 'green' : 'brown'],
      ['+£500', () => g.state.earn(500), 'gold'],
      [`Speed: ${DEBUG.timeScale}×`, () => (DEBUG.timeScale = SPEEDS[(SPEEDS.indexOf(DEBUG.timeScale) + 1) % SPEEDS.length] ?? 1), 'gold'],
      ['Next area now', () => g.godNextArea(), 'blue'],
      ['Full repair', () => g.state.repair(100), 'gold'],
    ];
    let y = this.y - 34;
    for (const [label, fn, skin] of actions) {
      this.objects.push(
        new Button(this.scene, x, y, {
          width: w,
          height: h,
          fontSize: 14,
          align: 'center',
          label,
          skin,
          onClick: () => {
            fn();
            this.main.audio.play('click');
            this.build();
          },
        }).setDepth(30),
      );
      y -= h + 6;
    }
  }
}
