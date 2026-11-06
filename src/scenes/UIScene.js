import Phaser from 'phaser';
import { COLORS } from '../config/display.js';
import { computeLayout, cssSize, uiScale } from '../systems/Viewport.js';
import { currentWarning, Hud } from '../ui/Hud.js';
import { JunctionPicker } from '../ui/JunctionPicker.js';
import { roundButton, text } from '../ui/kit.js';
import { PoiPanel } from '../ui/PoiPanel.js';
import { StatusCard } from '../ui/StatusCard.js';
import { GodPanel } from '../ui/GodPanel.js';
import { MapView } from '../ui/MapView.js';
import { SpeechBox } from '../ui/SpeechBox.js';
import { LINES } from '../content/dialogue.js';
import { RadioPanel } from '../ui/RadioPanel.js';
import { music } from '../systems/MusicPlayer.js';
import { saveRun } from '../state/save.js';
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
    // (Keyboard listeners go when the scene restarts, so they're added again.)
    this.mapKeys = false;
    this.radioKeys = false;
    this.mapOpen = false;
    this.radioOpen = false;
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

    this.speech = new SpeechBox(this);
    this.warning = text(this, L.notice.x, L.notice.y, '', 18, '#ffffff', {
      fontStyle: 'bold',
      backgroundColor: '#b3261e',
      padding: { x: 12, y: 5 },
    })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);

    this.buildControls(L);
    // Its button sits after the sound (and, where the browser has one, fullscreen) button.
    const slot = this.scale.fullscreen.available ? 2 : 1;
    this.god = new GodPanel(this, L, slot);
    this.addMapButton(L, slot + 1);
    this.addRadioButton(L, slot + 2);
    if (this.mapOpen) this.showMap();

    if (this.junction && !this.panelArgs) this.picker = new JunctionPicker(this, L.picker, this.junction, (i) => this.main.selectBranch(i), animate);
    if (this.panelArgs) this.panel = new PoiPanel(this, L.panel, this.panelArgs);
  }

  // --- Radio -----------------------------------------------------------------------------------

  addRadioButton(L, slot) {
    const step = 46 * L.controls.dir;
    const draw = (g) => {
      // A little wireless set: body, speaker grille, dial and aerial.
      g.clear();
      g.lineStyle(2, 0xf6ead2, 1).lineBetween(4, -6, 9, -12);
      g.fillStyle(0xf6ead2, 1).fillRoundedRect(-11, -6, 22, 15, 3);
      g.fillStyle(COLORS.panel, 1).fillCircle(-4, 1.5, 4.5).fillRect(4, -2, 4, 2).fillRect(4, 2, 4, 2).fillRect(4, 6, 4, 1.5);
      g.fillStyle(music.playing ? 0xa8f0a0 : 0x8a6a48, 1).fillCircle(-4, 1.5, 2);
    };
    this.radioButton = roundButton(this, L.controls.x + step * slot, L.controls.y, draw, () => this.toggleRadio());
    this.radioAnchor = { x: L.controls.x + step * slot, y: L.controls.y, dir: L.controls.dir };
    this.radioDraw = draw;
    if (!this.radioKeys) {
      this.radioKeys = true;
      this.input.keyboard?.on('keydown-R', () => this.toggleRadio());
      this.unsubscribeRadio = music.onChange(() => this.radioButton?.active && this.radioDraw(this.radioButton.list[1]));
      this.events.once('shutdown', () => this.unsubscribeRadio?.());
    }
    if (this.radioOpen) this.showRadio();
  }

  toggleRadio() {
    this.radioOpen = !this.radioOpen;
    if (this.radioOpen) this.showRadio();
    else this.hideRadio();
  }

  showRadio() {
    this.radio?.destroy();
    this.radio = new RadioPanel(this, this.radioAnchor, { onClose: () => this.toggleRadio() });
  }

  hideRadio() {
    this.radio?.destroy();
    this.radio = null;
  }

  // --- Route map -----------------------------------------------------------------------------

  addMapButton(L, slot) {
    const step = 46 * L.controls.dir;
    const draw = (g) => {
      // A little folded map.
      g.clear().fillStyle(0xf6ead2, 1);
      g.fillPoints([{ x: -10, y: -7 }, { x: -3, y: -9 }, { x: -3, y: 8 }, { x: -10, y: 10 }], true);
      g.fillPoints([{ x: -1, y: -9 }, { x: 4, y: -7 }, { x: 4, y: 10 }, { x: -1, y: 8 }], true);
      g.fillPoints([{ x: 6, y: -7 }, { x: 11, y: -9 }, { x: 11, y: 8 }, { x: 6, y: 10 }], true);
    };
    roundButton(this, L.controls.x + step * slot, L.controls.y, draw, () => this.toggleMap());
    if (!this.mapKeys) {
      this.mapKeys = true;
      this.input.keyboard?.on('keydown-TAB', (e) => {
        e.preventDefault?.();
        this.toggleMap();
      });
    }
  }

  toggleMap() {
    if (this.mapOpen) this.closeMap();
    else this.openMap();
  }

  openMap() {
    if (this.main.phase === 'over') return;
    this.mapOpen = true;
    if (this.main.scene.isActive()) this.main.scene.pause();
    this.showMap();
  }

  showMap() {
    this.mapView?.destroy();
    this.mapView = new MapView(this, { onClose: () => this.closeMap(), sidebar: (view, rect) => this.drawMapSidebar(view, rect) });
    this.mapView.objects.forEach((o) => o.setDepth?.(50 + (o.depth || 0)));
  }

  closeMap() {
    this.mapOpen = false;
    this.mapView?.destroy();
    this.mapView = null;
    if (this.main.scene.isPaused()) this.main.scene.resume();
  }

  /** Beside the map: objectives (see systems/Objectives.js), if the run has them. */
  drawMapSidebar(view, rect) {
    const list = this.main.objectives?.list ?? [];
    let y = rect.y;
    view.add(text(this, rect.x, y, 'OBJECTIVES', 15, COLORS.gold, { fontStyle: 'bold' }));
    y += 24;
    if (!list.length) view.add(text(this, rect.x, y, 'None right now.', 13, COLORS.textDim));
    const icons = { deliver: 'objective-passengers', sell: 'objective-cargo', travel: 'objective-distance', visit: 'objective-visit', reach: 'objective-reach-area', earn: 'objective-money' };
    for (const o of list) {
      const icon = icons[o.template];
      const ix = icon && this.textures.exists(icon) ? 34 : 0;
      if (ix) view.add(this.add.image(rect.x + 14, y + 14, icon).setDisplaySize(28, 28));
      const t = view.add(
        text(this, rect.x + ix, y, `${ix ? '' : o.done ? '✓ ' : '• '}${o.text}`, 13, o.done ? COLORS.good : COLORS.text, { wordWrap: { width: rect.w - 8 - ix } }),
      );
      const progress = view.add(text(this, rect.x + ix, y + t.height + 2, o.progressText ?? '', 12, COLORS.textDim));
      y += Math.max(t.height + progress.height, ix ? 30 : 0) + 10;
      if (y > rect.y + rect.h - 20) break;
    }
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
    this.picker = this.panelArgs ? null : new JunctionPicker(this, this.L.picker, junction, (i) => this.main.selectBranch(i), true);
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
      onAbandon: () => this.main.endRun(visit.poi.type === 'stranded' ? 'Ran out of fuel between stops' : 'Stranded without fuel'),
      onMessage: (m) => {
        this.panelArgs.message = m;
        saveRun(this.main); // (whatever was bought or sold at the stop is kept)
      },
    };
    // Stop menus can open minigames (ticket punching, the slot machine…) over everything.
    visit.openMinigame = (key, data) => this.openMinigame(key, data);
    // (Signposts share the space; they step aside while the menu is open, e.g. when stranded
    // just short of a junction, and come back when it closes.)
    this.picker?.destroy(false);
    this.picker = null;
    this.panel = new PoiPanel(this, this.L.panel, this.panelArgs);
  }

  /** Opens a minigame scene (src/minigames) over the UI; the stop menu refreshes when it closes. */
  openMinigame(key, data = {}) {
    if (this.scene.isActive(key)) return;
    this.scene.launch(key, {
      state: this.main.state,
      audio: this.main.audio,
      ...data,
      onClose: (result) => {
        data.onClose?.(result);
        saveRun(this.main);
        if (this.panelArgs) {
          this.panel?.destroy();
          this.panel = new PoiPanel(this, this.L.panel, this.panelArgs);
        }
      },
    });
    this.scene.bringToTop(key);
  }

  closePanel() {
    this.panelArgs = null;
    this.panel?.destroy();
    this.panel = null;
    if (this.junction && !this.picker && this.L) {
      this.picker = new JunctionPicker(this, this.L.picker, this.junction, (i) => this.main.selectBranch(i), true);
    }
  }

  /**
   * A character says a line for a moment (content/dialogue.js, LINES[moment]); a random one,
   * not the same as last time. Quiet for a little while after each, so it never chatters.
   */
  say(moment, { force = false } = {}) {
    const lines = LINES[moment];
    if (!lines?.length || !this.L) return;
    const now = this.time.now;
    if (!force && now < (this.quietUntil ?? 0)) return;
    this.quietUntil = now + 9000;
    const pool = lines.length > 1 ? lines.filter((l) => l !== this.lastLine) : lines;
    const line = pool[Math.floor(Math.random() * pool.length)];
    this.lastLine = line;
    const L = this.L;
    // Upright phones: across the top of the scene. Short landscape screens: above the buttons at
    // the bottom (warnings sit under the gauges there). Otherwise under the gauges.
    const at = L.portrait
      ? { x: L.pad, y: L.world.y + 6, w: L.cssW - L.pad * 2 }
      : L.compact
        ? { x: L.hud.x, bottom: L.controls.y - 26, w: Math.min(430, L.side.x - L.hud.x - L.pad) }
        : { x: L.hud.x, y: L.hud.y + L.hud.h + 10, w: Math.min(430, L.side.x - L.hud.x - L.pad) };
    this.speech.say(line[0], line[1], line[2], at);
  }

  /** The "Complete!" ribbon with an objective's name, popping up at the top. */
  showRibbon(label) {
    if (!this.L || !this.textures.exists('objective-complete')) return;
    const L = this.L;
    // Over the middle of the scene, clear of the messages along the top.
    const x = L.portrait ? L.cssW / 2 : Math.max(L.hud.x + L.hud.w + 130, (L.hud.x + L.hud.w + L.side.x) / 2);
    const y = L.portrait ? L.world.y + L.world.h * 0.45 : L.cssH * 0.36;
    const c = this.add.container(x, y).setDepth(45);
    const rib = this.add.image(0, 0, 'objective-complete').setDisplaySize(220, 82);
    const t = text(this, 0, 44, label, 13, COLORS.text, { fontStyle: 'bold', backgroundColor: '#1d1612cc', padding: { x: 8, y: 3 } }).setOrigin(0.5, 0);
    c.add([rib, t]);
    c.setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 320, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, y: y - 16, delay: 2600, duration: 450, onComplete: () => c.destroy() });
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
