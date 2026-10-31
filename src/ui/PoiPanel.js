import { COLORS } from '../config/display.js';
import { buildOptions } from '../poi/poiActions.js';
import { isTouch } from '../systems/Viewport.js';
import { Button } from './Button.js';
import { frame, text } from './kit.js';

/**
 * The menu that opens when the train halts at a POI: that stop's options (from poiActions.js)
 * and a Depart button. It rebuilds itself after every action so it always shows current state,
 * and squeezes into whatever rectangle the layout gives it (CSS px).
 */
export class PoiPanel {
  constructor(scene, rect, { state, visit, message, audio, onDepart, onAbandon, onMessage }) {
    this.scene = scene;
    this.rect = rect;
    this.state = state;
    this.visit = visit;
    this.message = message ?? visit.def.description;
    this.audio = audio;
    this.onDepart = onDepart;
    this.onAbandon = onAbandon;
    this.onMessage = onMessage;
    this.objects = [];
    this.build();
  }

  destroy() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  build() {
    this.destroy();
    const options = buildOptions(this.state, this.visit);
    const outOfFuel = this.state.isOutOfFuel;
    // Try roomy sizes first, then tighter ones until everything fits.
    for (const size of [
      { btn: 50, gap: 8, font: 16, msg: 14, head: 56 },
      { btn: 44, gap: 6, font: 15, msg: 13, head: 50 },
      { btn: 38, gap: 5, font: 14, msg: 12, head: 44 },
    ]) {
      const h = this.layout(options, outOfFuel, size, true);
      if (h <= this.rect.h) return void this.layout(options, outOfFuel, size, false);
    }
    this.layout(options, outOfFuel, { btn: 36, gap: 4, font: 13, msg: 12, head: 42 }, false);
  }

  /** Lays the panel out; with `measureOnly` it just returns the height it would need. */
  layout(options, outOfFuel, size, measureOnly) {
    const { scene, rect, visit } = this;
    const pad = 12;
    const innerW = rect.w - pad * 2;
    const cx = rect.x + rect.w / 2;
    const add = (o) => (measureOnly ? o : (this.objects.push(o), o));
    let y = rect.y + pad;

    // Message text (measure it for real so wrapping is accounted for).
    const msg = text(scene, rect.x + pad, 0, this.message, size.msg, COLORS.text, { wordWrap: { width: innerW }, lineSpacing: 2 });
    const msgH = msg.height;
    if (measureOnly) msg.destroy();

    const total =
      pad +
      size.head +
      msgH +
      10 +
      options.length * (size.btn + size.gap) +
      6 +
      (size.btn + 6) +
      (outOfFuel ? size.btn + size.gap : 0) +
      pad;
    if (measureOnly) return total;

    const bg = add(frame(scene, 'button-brown', cx, rect.y + total / 2, rect.w, total));
    // The message text was created before the frame, so push the frame behind it.
    bg.setAlpha(0.96).setDepth(-1);

    const iconSize = size.head - 16;
    add(scene.add.image(rect.x + pad + iconSize / 2, y + iconSize / 2, visit.def.icon).setDisplaySize(iconSize, iconSize));
    add(text(scene, rect.x + pad + iconSize + 10, y + 1, visit.def.name.toUpperCase(), size.font + 4, COLORS.gold, { fontStyle: 'bold' }));
    add(text(scene, rect.x + pad + iconSize + 10, y + size.font + 8, visit.poi.name, size.msg, COLORS.textDim));
    y += size.head;

    msg.setPosition(rect.x + pad, y);
    add(msg);
    y += msgH + 10;

    for (const opt of options) {
      const enabled = !opt.disabledReason;
      let right;
      let rightColor;
      if (opt.cost > 0) {
        right = `-£${Math.round(opt.cost)}`;
        rightColor = '#7a1d12';
      } else if (opt.gain > 0) {
        right = `+£${Math.round(opt.gain)}`;
        rightColor = '#1f5a17';
      }
      add(
        new Button(scene, cx, y + size.btn / 2, {
          width: innerW,
          height: size.btn,
          fontSize: size.font,
          label: opt.label,
          sublabel: opt.disabledReason ?? undefined,
          rightLabel: right,
          rightColor,
          skin: 'gold',
          enabled,
          onClick: () => this.choose(opt),
        }),
      );
      y += size.btn + size.gap;
    }

    y += 6;
    const keyHint = isTouch(scene) ? '' : '   (Space)';
    add(
      new Button(scene, cx, y + (size.btn + 6) / 2, {
        width: innerW,
        height: size.btn + 6,
        fontSize: size.font + 3,
        align: 'center',
        label: outOfFuel ? 'No fuel: can’t depart' : `Depart  ▶${keyHint}`,
        skin: 'green',
        enabled: !outOfFuel,
        onClick: () => this.onDepart(),
      }),
    );
    y += size.btn + 6;

    if (outOfFuel) {
      y += size.gap;
      add(
        new Button(scene, cx, y + size.btn / 2, {
          width: innerW,
          height: size.btn,
          fontSize: size.font,
          align: 'center',
          label: 'Abandon run',
          skin: 'red',
          onClick: () => this.onAbandon(),
        }),
      );
    }
    return total;
  }

  choose(opt) {
    this.message = opt.run();
    this.onMessage?.(this.message);
    this.audio.play(opt.sound ?? 'click');
    this.build();
  }
}
