import { DEBUG, setGod } from '../config/debug.js';
import { COLORS } from '../config/display.js';
import { DebugPanel } from '../debug/DebugPanel.js';
import { roundButton, text } from './kit.js';

/**
 * The GOD button by the sound controls (dim while god mode is off). Tapping it switches god
 * mode on and opens the debug panel (src/debug/DebugPanel.js); G or ` toggle the panel on a
 * keyboard. God mode is remembered per device (see debug.js).
 */
export class GodPanel {
  constructor(scene, L, slot = 2) {
    this.scene = scene;
    const step = 46 * L.controls.dir;
    this.btn = roundButton(scene, L.controls.x + step * slot, L.controls.y, () => {}, () => this.toggle());
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
    this.refresh();
    DebugPanel.get(this.scene.game).toggle();
  }
}
