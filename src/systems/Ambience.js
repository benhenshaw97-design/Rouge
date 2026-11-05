import { AMBIENCE_FILES } from '../config/assets.js';
import { music } from './MusicPlayer.js';

/**
 * Background sound for each area (wind in the snow, waves on the coast, frogs in the marsh…).
 *
 * If an area has a loop file in AMBIENCE_FILES (assets.js) that's streamed; otherwise the sound is
 * made on the fly from the RECIPES below with the Web Audio API (filtered noise for wind and surf,
 * little synthesised chirps and croaks). Swap in real recordings whenever you have them.
 * Changing area crossfades over a few seconds. Volume: the radio's Ambience slider.
 */
const RECIPES = {
  meadow: { wind: 0.25, birds: 1 },
  desert: { wind: 0.75 },
  snow: { wind: 1 },
  jungle: { birds: 1.4, insects: 0.5, wind: 0.1 },
  marsh: { frogs: 1, insects: 0.3, wind: 0.15 },
  coast: { surf: 1, wind: 0.35 },
  town: { wind: 0.2 },
};
const BASE_VOLUME = 0.35;
const FADE = 3; // seconds

export class Ambience {
  constructor(scene) {
    this.scene = scene;
    const ctx = scene.sound.context; // (only with Web Audio)
    if (!ctx) return;
    this.ctx = ctx;
    this.out = ctx.createGain();
    this.out.connect(scene.sound.destination ?? ctx.destination);
    this.recipe = {};
    this.layers = {};
    this.timers = [];
    this.applyVolume();
    this.unsubscribe = music.onChange(() => this.applyVolume());
    scene.events.once('shutdown', () => this.destroy());
  }

  applyVolume() {
    if (!this.ctx) return;
    this.out.gain.setTargetAtTime(BASE_VOLUME * music.ambienceVolume, this.ctx.currentTime, 0.1);
    if (this.file) this.file.volume = Math.min(1, BASE_VOLUME * 2 * music.ambienceVolume);
  }

  /** Fades over to an area's sounds. */
  setArea(area) {
    if (!this.ctx) return;
    const file = AMBIENCE_FILES[area.id];
    this.setFile(file);
    this.recipe = file ? {} : (RECIPES[area.id] ?? {});
    const t = this.ctx.currentTime;
    for (const name of ['wind', 'surf', 'insects']) {
      const amount = this.recipe[name] ?? 0;
      if (amount && !this.layers[name]) this.layers[name] = this[`make_${name}`]();
      this.layers[name]?.gain.gain.setTargetAtTime(amount, t, FADE / 3);
    }
    this.startTimers();
  }

  /** A real recording for the area (streamed, looping), or none. */
  setFile(src) {
    if (this.fileSrc === src) return;
    this.fileSrc = src;
    this.file?.pause();
    this.file = null;
    if (!src || typeof Audio === 'undefined') return;
    this.file = new Audio(src);
    this.file.loop = true;
    this.file.muted = this.scene.sound.mute;
    this.applyVolume();
    this.file.play().catch(() => {});
  }

  destroy() {
    this.unsubscribe?.();
    this.timers.forEach(clearTimeout);
    this.timers = [];
    for (const l of Object.values(this.layers)) l.stop();
    this.layers = {};
    this.file?.pause();
    this.out?.disconnect();
    this.ctx = null;
  }

  // --- Continuous layers -----------------------------------------------------------------------

  noise() {
    if (!this.noiseBuffer) {
      const len = this.ctx.sampleRate * 2;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    return src;
  }

  /** source → filter → swell (slowly wandering loudness) → layer gain → out */
  layer(source, filter, wander) {
    const swell = this.ctx.createGain();
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    source.connect(filter).connect(swell).connect(gain).connect(this.out);
    source.start();
    const move = () => {
      if (!this.ctx) return;
      wander(swell.gain, filter, this.ctx.currentTime);
      this.timers.push(setTimeout(move, 1500 + Math.random() * 2500));
    };
    move();
    return { gain, stop: () => source.stop() };
  }

  make_wind() {
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    return this.layer(this.noise(), f, (g, filter, t) => {
      g.setTargetAtTime(0.15 + Math.random() * 0.35, t, 1.2);
      filter.frequency.setTargetAtTime(250 + Math.random() * 500, t, 1.5);
    });
  }

  make_surf() {
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    return this.layer(this.noise(), f, (g, filter, t) => {
      // A wave: build up, break, drain away.
      g.cancelScheduledValues(t);
      g.setTargetAtTime(0.6, t, 0.9);
      g.setTargetAtTime(0.08, t + 2.2, 1.1);
      filter.frequency.setTargetAtTime(500 + Math.random() * 500, t, 1);
    });
  }

  make_insects() {
    const osc = this.ctx.createOscillator();
    osc.frequency.value = 4400;
    const trem = this.ctx.createOscillator();
    trem.frequency.value = 28;
    const tremGain = this.ctx.createGain();
    tremGain.gain.value = 0.5;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 3000;
    const l = this.layer(osc, f, (g, filter, t) => g.setTargetAtTime(Math.random() < 0.3 ? 0 : 0.012 + Math.random() * 0.012, t, 0.8));
    trem.connect(tremGain).connect(l.gain.gain);
    trem.start();
    return { gain: l.gain, stop: () => (l.stop(), trem.stop()) };
  }

  // --- Occasional sounds -----------------------------------------------------------------------

  startTimers() {
    if (this.timersStarted) return;
    this.timersStarted = true;
    const loop = (name, every) => {
      const go = () => {
        if (!this.ctx) return;
        const amount = this.recipe[name] ?? 0;
        if (amount && !this.scene.sound.mute) this[name]();
        this.timers.push(setTimeout(go, ((every[0] + Math.random() * (every[1] - every[0])) * 1000) / Math.max(0.5, amount || 1)));
      };
      this.timers.push(setTimeout(go, 800 + Math.random() * 2000));
    };
    loop('birds', [1.5, 5]);
    loop('frogs', [0.8, 3.5]);
  }

  /** A little bird: 2–4 quick rising chirps. */
  birds() {
    const t0 = this.ctx.currentTime;
    const base = 2600 + Math.random() * 1800;
    const notes = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < notes; i++) {
      const t = t0 + i * (0.09 + Math.random() * 0.05);
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.2), t);
      o.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.06);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.08);
      o.connect(g).connect(this.out);
      o.start(t);
      o.stop(t + 0.1);
    }
  }

  /** A frog: a low, buzzy ribbit of a few pulses. */
  frogs() {
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = 85 + Math.random() * 70;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 700;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    const pulses = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < pulses; i++) {
      const t = t0 + i * 0.07;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.012);
      g.gain.linearRampToValueAtTime(0, t + 0.05);
    }
    o.connect(f).connect(g).connect(this.out);
    o.start(t0);
    o.stop(t0 + pulses * 0.07 + 0.05);
  }
}
