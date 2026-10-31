import Phaser from 'phaser';
import { COLORS } from '../config/display.js';
import { computeLayout, cssSize, uiScale } from '../systems/Viewport.js';
import { currentWarning, Hud } from '../ui/Hud.js';
import { JunctionPicker } from '../ui/JunctionPicker.js';
import { roundButton, text } from '../ui/kit.js';
import { PoiPanel } from '../ui/PoiPanel.js';
import { StatusCard } from '../ui/StatusCard.js';
import { GodPanel } from '../ui/GodPanel.js';
import { DEBUG } from '../config/debug.js';
import { BALANCE, POI_TYPES, START_STATION } from '../config/balance.js';

/**
 * Everything drawn on top of the line: HUD, warnings, junction signposts, stop menus and
 * messages. Runs alongside GameScene, which calls the methods in the "API" section.
 *
 * The camera is zoomed by the device pixel ratio, so everything here is laid out in CSS
 * pixels. On resize or rotation the whole UI is rebuilt for the new layout.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI');
  }

  init(data) {
    this.main = data.main;
  }

  create() {
    this.junction = null;
    this.picker = null;
    this.panelArgs = null;
    this.panel = null;
    this.toasts = [];
    this.build(false);
    const onResize = () => (this.needsLayout = true);
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
  }

  build(animate) {
    this.tweens.killAll();
    this.children.removeAll(true);
    this.picker = null;
    this.panel = null;
    this.status = null;
    this.statusKey = null;
    this.toasts = [];

    const u = uiScale(this);
    this.cameras.main.setOrigin(0, 0).setZoom(u).setScroll(0, 0);
    const { w, h } = cssSize(this);
    const L = (this.L = computeLayout(w, h));

    this.hud = new Hud(this, L.hud, this.main.state);

    this.warning = text(this, L.notice.x, L.notice.y, '', 18, '#ffffff', {
      fontStyle: 'bold',
      backgroundColor: '#b3261e',
      padding: { x: 12, y: 5 },
    })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);

    this.buildControls(L);
    if (DEBUG.god) this.god = new GodPanel(this, L);

    if (this.junction) this.picker = new JunctionPicker(this, L.picker, this.junction, (i) => this.main.selectBranch(i), animate);
    if (this.panelArgs) this.panel = new PoiPanel(this, L.panel, this.panelArgs);
  }

  buildControls(L) {
    const audio = this.main.audio;
    const step = 46 * L.controls.dir;
    const drawMute = (g) => {
      g.clear();
      g.fillStyle(0xf6ead2, 1);
      g.fillRect(-9, -4, 5, 8);
      g.fillTriangle(-4, -4, 3, -10, 3, 10);
      g.fillTriangle(-4, 4, 3, -10, -4, -4);
      if (audio.muted) {
        g.lineStyle(3, 0xe05a4f, 1).lineBetween(-11, 10, 11, -10);
      } else {
        g.lineStyle(2, 0xf6ead2, 1);
        g.beginPath().arc(4, 0, 6, -0.9, 0.9).strokePath();
      }
    };
    roundButton(this, L.controls.x, L.controls.y, drawMute, (g) => {
      audio.toggleMute();
      drawMute(g);
    });

    if (this.scale.fullscreen.available) {
      const drawFull = (g) => {
        g.clear().lineStyle(2.5, 0xf6ead2, 1);
        const s = 8;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          g.lineBetween(sx * s, sy * s, sx * s - sx * 5, sy * s);
          g.lineBetween(sx * s, sy * s, sx * s, sy * s - sy * 5);
        }
      };
      roundButton(this, L.controls.x + step, L.controls.y, drawFull, () => {
        try {
          if (this.scale.isFullscreen) this.scale.stopFullscreen();
          else this.scale.startFullscreen();
        } catch {
          /* not allowed here (e.g. inside some embedded frames) */
        }
      });
    }
  }

  update(time) {
    if (this.needsLayout) {
      this.needsLayout = false;
      this.build(false);
    }
    const { state, motion, route } = this.main;
    this.hud.update(motion.speed, time);

    const warning = currentWarning(state);
    this.warning.setVisible(!!warning && !this.panel);
    if (warning) {
      this.warning.setText(warning);
      this.warning.setAlpha(0.8 + 0.2 * Math.sin(time * 0.01));
    }

    if (this.picker && route.junction) this.picker.setDistance(route.junction.at - state.distance);
    this.updateStatus();
  }

  /** Keeps the 'next stop' card (upright phones only) in step with the route. */
  updateStatus() {
    if (!this.L.status) return;
    const info = this.picker || this.panel ? null : this.statusInfo();
    if (!info || info.key !== this.statusKey) {
      this.status?.destroy();
      this.status = null;
      this.statusKey = null;
    }
    if (info && !this.status) {
      this.status = new StatusCard(this, this.L.status, info);
      this.statusKey = info.key;
    }
    this.status?.setDistance(info?.distance);
  }

  statusInfo() {
    const { phase, route, state } = this.main;
    if (phase === 'over') return null;
    if (phase === 'waiting') {
      return {
        key: 'waiting',
        label: 'NOW DEPARTING',
        image: START_STATION.building,
        title: START_STATION.name,
        subtitle: 'Pick your first stop at the junction ahead.',
        distance: null,
      };
    }
    const poi = route.poi;
    if (poi && !poi.visited) {
      const def = POI_TYPES[poi.type];
      return {
        key: `poi${poi.id}`,
        label: 'NEXT STOP',
        image: poi.building,
        title: def.name,
        subtitle: `${poi.name}: ${def.blurb.toLowerCase()}`,
        distance: poi.at - state.distance,
      };
    }
    const j = route.junction;
    if (j && !j.resolved) {
      return {
        key: `j${j.id}`,
        label: 'NEXT JUNCTION',
        image: 'junction-signpost',
        title: 'Junction ahead',
        subtitle: `Signposts appear ${BALANCE.route.signpostRevealDistance} m before it. Tap one to choose your next stop.`,
        distance: j.at - state.distance,
      };
    }
    return null;
  }

  // --- API used by GameScene -------------------------------------------------------------------

  showJunction(junction) {
    if (!this.L) return; // not built yet
    this.junction = junction;
    this.picker?.destroy(false);
    this.picker = new JunctionPicker(this, this.L.picker, junction, (i) => this.main.selectBranch(i), true);
  }

  setJunctionSelected(index) {
    this.picker?.setSelected(index);
  }

  hideJunction() {
    this.junction = null;
    this.picker?.destroy(true);
    this.picker = null;
  }

  openPanel({ state, visit }) {
    if (!this.L) return; // not built yet
    this.panelArgs = {
      state,
      visit,
      audio: this.main.audio,
      onDepart: () => this.main.depart(),
      onAbandon: () => this.main.endRun('Stranded without fuel'),
      onMessage: (m) => (this.panelArgs.message = m),
    };
    this.panel = new PoiPanel(this, this.L.panel, this.panelArgs);
  }

  closePanel() {
    this.panelArgs = null;
    this.panel?.destroy();
    this.panel = null;
  }

  toast(message, color = COLORS.text) {
    if (!this.L) return; // not built yet
    const L = this.L;
    this.toasts = this.toasts.filter((t) => t.active);
    const y = L.notice.y + 34 + this.toasts.length * 32;
    const t = text(this, L.notice.x, y, message, 16, color, {
      fontStyle: 'bold',
      backgroundColor: '#1d1612e6',
      padding: { x: 10, y: 5 },
      align: 'center',
      wordWrap: { width: L.notice.maxW },
    })
      .setOrigin(0.5)
      .setDepth(11)
      .setAlpha(0);
    this.toasts.push(t);
    this.tweens.add({ targets: t, alpha: 1, duration: 180 });
    this.tweens.add({ targets: t, alpha: 0, y: y - 14, delay: 2600, duration: 450, onComplete: () => t.destroy() });
  }
}
