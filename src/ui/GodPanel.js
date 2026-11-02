import { DEBUG, setGod } from '../config/debug.js';
import { COLORS } from '../config/display.js';
import { Button } from './Button.js';
import { roundButton, text } from './kit.js';

const SPEEDS = [1, 3, 8];

/**
 * God mode test panel. A "GOD" button by the sound controls (dim while god mode is off) switches
 * god mode on and opens a column of test actions; G toggles the panel on a keyboard.
 * God mode is remembered per device (see debug.js).
 */
export class GodPanel {
  constructor(scene, L, slot = 2) {
    this.scene = scene;
    this.main = scene.main;
    this.objects = [];
    this.open = false;
    const step = 46 * L.controls.dir;
    this.x = L.controls.x + step * slot;
    this.y = L.controls.y;
    this.dir = L.controls.dir;
    this.bottomRoom = L.controls.y - 10;

    this.btn = roundButton(scene, this.x, this.y, () => {}, () => this.toggle());
    this.label = text(scene, 0, 0, 'GOD', 11, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5);
    this.btn.add(this.label);
    this.refresh();
  }

  refresh() {
    this.btn.setAlpha(DEBUG.god ? 1 : 0.55);
    this.label.setColor(DEBUG.god ? COLORS.gold : COLORS.textDim);
  }

  toggle() {
    if (!DEBUG.god) setGod(true);
    this.open = !this.open;
    this.refresh();
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
      [
        'God mode off',
        () => {
          setGod(false);
          this.open = false;
          this.refresh();
        },
        'red',
      ],
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
