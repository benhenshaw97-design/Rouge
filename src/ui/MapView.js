import { POI_TYPES } from '../config/balance.js';
import { AREAS, COLORS } from '../config/display.js';
import { LANES } from '../systems/RouteMap.js';
import { cssSize } from '../systems/Viewport.js';
import { Button } from './Button.js';
import { frame, text } from './kit.js';

/** Tint behind each area's columns on the map. */
const AREA_TINT = {
  meadow: 0x5e8f3e,
  desert: 0xc07a3a,
  badlands: 0x8a5a3a,
  snow: 0x9db8d8,
  jungle: 0x2f7a44,
  marsh: 0x637a52,
  coast: 0x3d7fb0,
  town: 0x9a6248,
};

/**
 * The route map (opened with the MAP button, or Tab): the run's network of stops, coloured by
 * area, with the way you've come, where you are, and the two stops the next junction offers.
 * Tap one of those to set the points. The game pauses while it's open.
 *
 * Draws into the UI scene in CSS px; `sidebar(rect)` fills the space beside the map (objectives).
 */
export class MapView {
  constructor(scene, { onClose, sidebar }) {
    this.scene = scene;
    this.main = scene.main;
    this.onClose = onClose;
    this.sidebar = sidebar;
    this.objects = [];
    this.build();
  }

  destroy() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  add(o) {
    this.objects.push(o);
    return o;
  }

  build() {
    this.destroy();
    const { scene } = this;
    const { w, h } = cssSize(scene);
    const map = this.main.route.map;

    this.add(scene.add.rectangle(0, 0, w, h, 0x0d0a08, 0.78).setOrigin(0).setInteractive()); // swallow taps
    const m = 10;
    const panel = { x: m, y: m, w: w - m * 2, h: h - m * 2 };
    this.add(frame(scene, 'button-brown', panel.x + panel.w / 2, panel.y + panel.h / 2, panel.w, panel.h).setAlpha(0.97));

    // Header
    const pad = 14;
    this.add(text(scene, panel.x + pad, panel.y + pad, 'ROUTE MAP', 20, COLORS.gold, { fontStyle: 'bold' }));
    const where = `${AREAS[this.main.areaIndex].name} · ${(this.main.state.distance / 1000).toFixed(1)} km`;
    this.add(text(scene, panel.x + pad, panel.y + pad + 26, where, 13, COLORS.textDim));
    this.add(
      new Button(scene, panel.x + panel.w - pad - 55, panel.y + pad + 18, {
        width: 110,
        height: 38,
        fontSize: 15,
        align: 'center',
        label: 'Close ✕',
        skin: 'green',
        onClick: () => this.onClose(),
      }).setDepth(2),
    );

    // Map area, with the sidebar beside it (wide screens) or below (narrow ones).
    const top = panel.y + pad + 54;
    const inner = { x: panel.x + pad, y: top, w: panel.w - pad * 2, h: panel.y + panel.h - pad - top };
    const side = inner.w > 640;
    const sideW = side ? Math.min(300, inner.w * 0.34) : inner.w;
    const sideH = side ? inner.h : Math.min(170, inner.h * 0.38);
    const mapRect = side
      ? { x: inner.x, y: inner.y, w: inner.w - sideW - 12, h: inner.h }
      : { x: inner.x, y: inner.y, w: inner.w, h: inner.h - sideH - 10 };
    const sideRect = side
      ? { x: inner.x + inner.w - sideW, y: inner.y, w: sideW, h: inner.h }
      : { x: inner.x, y: inner.y + inner.h - sideH, w: inner.w, h: sideH };

    this.drawMap(map, mapRect);
    this.sidebar?.(this, sideRect);
  }

  drawMap(map, r) {
    const { scene } = this;
    const types = Object.entries(POI_TYPES);
    const perRow = r.w / types.length >= 96 ? types.length : Math.ceil(types.length / 2);
    const legendH = perRow === types.length ? 26 : 46;
    const area = { x: r.x, y: r.y, w: r.w, h: r.h - legendH };
    const colW = Math.max(66, Math.min(110, area.w / 6));
    const cols = Math.max(3, Math.floor(area.w / colW));
    const first = Math.max(0, map.current.col - 1);
    const last = first + cols - 1;
    map.ensure(last + 1);
    const cx = (c) => area.x + (c - first + 0.5) * (area.w / cols);
    const cy = (lane) => area.y + 22 + ((lane + 0.5) * (area.h - 22)) / LANES;
    const nodeY = (n) => (n.col === 0 ? cy(1) : cy(n.lane));

    // Area bands and names
    let bandStart = first;
    for (let c = first; c <= last + 1; c++) {
      const changes = c > last || map.areaOf(c) !== map.areaOf(bandStart);
      if (!changes) continue;
      const a = AREAS[map.areaOf(bandStart)];
      const x0 = area.x + (bandStart - first) * (area.w / cols);
      const x1 = area.x + (c - first) * (area.w / cols);
      this.add(scene.add.rectangle(x0 + 1, area.y, x1 - x0 - 2, area.h, AREA_TINT[a.id] ?? 0x666666, 0.3).setOrigin(0));
      this.add(
        text(scene, (x0 + x1) / 2, area.y + 3, a.name.replace(/^The /, ''), 12, COLORS.text, { fontStyle: 'bold' })
          .setOrigin(0.5, 0)
          .setCrop(0, 0, Math.max(0, x1 - x0 - 6), 20),
      );
      bandStart = c;
    }

    // Links
    const g = this.add(scene.add.graphics());
    const onPath = new Set(map.path.map((n) => n.id));
    const j = this.main.route.junction;
    const choosing = j && !j.resolved ? j : null;
    for (let c = first; c < last; c++) {
      for (const n of map.columns[c] ?? []) {
        for (const lane of n.next) {
          const to = map.columns[c + 1]?.[lane];
          if (!to) continue;
          const taken = onPath.has(n.id) && onPath.has(to.id);
          const offered = choosing && n === map.current;
          g.lineStyle(taken ? 5 : offered ? 4 : 2, taken ? COLORS.brass : offered ? 0xf6ead2 : 0x8a6a48, taken || offered ? 1 : 0.55);
          g.lineBetween(cx(c), nodeY(n), cx(c + 1), nodeY(to));
        }
      }
    }

    // Stops
    const offered = choosing ? choosing.nodes : [];
    const rad = Math.min(20, (area.h - 22) / LANES / 2 - 4);
    for (let c = first; c <= last; c++) {
      for (const n of map.columns[c] ?? []) {
        const x = cx(c);
        const y = nodeY(n);
        const isHere = n === map.current;
        const choice = offered.indexOf(n);
        const def = POI_TYPES[n.type];
        const ring = isHere ? 0xffd77a : choice >= 0 ? (choice === choosing.selected ? 0xa8f0a0 : 0xf6ead2) : onPath.has(n.id) ? COLORS.brass : 0x5c4326;
        const dimmed = !isHere && choice < 0 && !onPath.has(n.id) && c > map.current.col;
        const circle = this.add(scene.add.circle(x, y, rad, 0xe8d6b0, 1).setStrokeStyle(isHere || choice >= 0 ? 3 : 2, ring, 1));
        const icon = this.add(scene.add.image(x, y, def?.icon ?? 'icon-distance').setDisplaySize(rad * 1.25, rad * 1.25));
        if (dimmed) {
          circle.setAlpha(0.6);
          icon.setAlpha(0.55);
        }
        if (isHere) {
          const poi = this.main.route.poi;
          const heading = this.main.phase === 'running' && poi && !poi.visited;
          const label = heading ? 'Heading here' : this.main.phase === 'stopped' ? 'You are here' : 'Just left';
          this.add(text(scene, x, y + rad + 3, label, 11, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5, 0));
          scene.tweens.add({ targets: circle, scale: 1.12, duration: 600, yoyo: true, repeat: -1 });
        }
        if (choice >= 0) {
          // Tap a branch to set the points for it.
          circle.setInteractive({ useHandCursor: true }).on('pointerup', () => {
            this.main.route.select(choice);
            this.scene.setJunctionSelected?.(choice);
            this.main.audio.play('switch');
            this.build();
          });
          if (choice === choosing.selected) {
            this.add(text(scene, x, y + rad + 3, 'Points set', 11, '#a8f0a0', { fontStyle: 'bold' }).setOrigin(0.5, 0));
          }
        }
      }
    }

    // Legend
    const lw = r.w / perRow;
    types.forEach(([, def], i) => {
      const row = Math.floor(i / perRow);
      const x = r.x + (i % perRow) * lw + 4;
      const y = r.y + r.h - legendH + 13 + row * 20;
      this.add(scene.add.image(x + 9, y, def.icon).setDisplaySize(16, 16));
      this.add(text(scene, x + 21, y, def.name, 11, COLORS.textDim).setOrigin(0, 0.5).setCrop(0, 0, lw - 26, 20));
    });
  }
}
