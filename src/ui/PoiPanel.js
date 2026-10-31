import { DEPTH, FONT } from '../config/display.js';
import { buildOptions } from '../poi/poiActions.js';
import { Button } from './Button.js';

const PANEL_X = 770;
const PANEL_Y = 20;
const PANEL_W = 494;
const INNER_W = PANEL_W - 32;
const CX = PANEL_X + PANEL_W / 2;

/**
 * The panel that opens when the train halts at a POI. Lists that POI's options (from
 * poiActions.js) and a Depart button. The whole panel is rebuilt after each action so it
 * always reflects the current state.
 */
export class PoiPanel {
  constructor(scene, { audio, onDepart, onAbandon }) {
    this.scene = scene;
    this.audio = audio;
    this.onDepart = onDepart;
    this.onAbandon = onAbandon;
    this.objects = [];
    this.isOpen = false;
  }

  open(state, visit) {
    this.state = state;
    this.visit = visit;
    this.message = visit.def.description;
    this.isOpen = true;
    this.build();
  }

  close() {
    this.isOpen = false;
    this.destroyObjects();
  }

  destroyObjects() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  build() {
    this.destroyObjects();
    const { scene, state, visit } = this;
    const add = (o) => {
      o.setDepth(DEPTH.panel);
      this.objects.push(o);
      return o;
    };

    const options = buildOptions(state, visit);
    let y = PANEL_Y + 18;

    const bg = add(scene.add.graphics());

    add(scene.add.image(PANEL_X + 34, y + 18, visit.def.icon).setDisplaySize(36, 36));
    add(
      scene.add.text(PANEL_X + 62, y, visit.def.name.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffd98a',
      }),
    );
    add(scene.add.text(PANEL_X + 62, y + 28, visit.poi.name, { fontFamily: FONT, fontSize: '15px', color: '#c9b48e' }));
    y += 62;

    const msg = add(
      scene.add.text(PANEL_X + 16, y, this.message, {
        fontFamily: FONT,
        fontSize: '15px',
        color: '#f5e9d0',
        wordWrap: { width: INNER_W },
        lineSpacing: 3,
      }),
    );
    y += Math.max(40, msg.height + 14);

    for (const opt of options) {
      const enabled = !opt.disabledReason;
      let right;
      let rightColor;
      if (opt.cost != null && opt.cost > 0) {
        right = `-£${Math.round(opt.cost)}`;
        rightColor = '#ffb3a8';
      } else if (opt.gain != null && opt.gain > 0) {
        right = `+£${Math.round(opt.gain)}`;
        rightColor = '#a8f0a0';
      }
      const btn = add(
        new Button(scene, CX, y + 26, {
          width: INNER_W,
          height: 50,
          fontSize: 16,
          label: opt.label,
          sublabel: opt.disabledReason ?? undefined,
          rightLabel: right,
          rightColor,
          onClick: () => this.choose(opt),
        }),
      );
      btn.setEnabled(enabled);
      y += 58;
    }

    y += 6;
    const outOfFuel = state.isOutOfFuel;
    const depart = add(
      new Button(scene, CX, y + 28, {
        width: INNER_W,
        height: 54,
        fontSize: 20,
        align: 'center',
        label: outOfFuel ? 'No fuel: can’t depart' : 'Depart  ▶   (Space)',
        fill: 0x2f5a2a,
        hoverFill: 0x3f7a38,
        stroke: 0x9be08f,
        onClick: () => this.onDepart(),
      }),
    );
    depart.setEnabled(!outOfFuel);
    y += 62;

    if (outOfFuel) {
      add(
        new Button(scene, CX, y + 22, {
          width: INNER_W,
          height: 42,
          fontSize: 16,
          align: 'center',
          label: 'Abandon run',
          fill: 0x5a2a2a,
          hoverFill: 0x7a3838,
          stroke: 0xe08f8f,
          onClick: () => this.onAbandon(),
        }),
      );
      y += 50;
    }

    const h = y - PANEL_Y + 10;
    bg.fillStyle(0x1d1814, 0.94).fillRoundedRect(PANEL_X, PANEL_Y, PANEL_W, h, 14);
    bg.lineStyle(3, 0xd6a84a, 0.8).strokeRoundedRect(PANEL_X, PANEL_Y, PANEL_W, h, 14);
  }

  choose(opt) {
    if (!this.isOpen) return;
    this.message = opt.run();
    this.audio.play(opt.sound ?? 'click');
    this.build();
  }
}
