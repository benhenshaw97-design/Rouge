import { AUDIO_VOLUME, RADIO_STATIONS, TRACK_TITLES } from '../config/assets.js';

const SETTINGS_KEY = 'rouge.radio';

/**
 * Background music, played as an in-game radio: pick a station (RADIO_STATIONS in assets.js) and
 * it plays that station's tracks in a shuffled order. You can skip, go back, pause, change
 * station, or switch the radio off, and set music and effects volumes. The station and volumes
 * are remembered on the device.
 *
 * Music is streamed with a plain <audio> element rather than Phaser's sound system, which
 * would decode each whole track into memory (tens of MB per track: too much for phones).
 * start() must first be called from a tap/click so mobile browsers allow playback.
 */
class MusicPlayer {
  constructor() {
    this.el = null;
    this.muted = false; // the game's mute button (everything)
    this.failures = 0;
    this.history = []; // tracks played on this station, for "previous"
    this.listeners = new Set();
    const saved = readSettings();
    this.stationIndex = Math.max(0, RADIO_STATIONS.findIndex((s) => s.id === saved.station));
    this.on = saved.on ?? true; // radio switched on
    this.volume = saved.volume ?? 1; // 0..1, times the base music volume
    this.effectsVolume = saved.effectsVolume ?? 1;
    this.ambienceVolume = saved.ambienceVolume ?? 1;
  }

  get station() {
    return RADIO_STATIONS[this.stationIndex];
  }

  /** The current track's title, e.g. "Trains 3". */
  get title() {
    const src = this.history[this.history.length - 1];
    if (!src) return '';
    const name = src.split('/').pop().replace(/\.[^.]+$/, '');
    return TRACK_TITLES[name] ?? name.replace(/-(\d+)$/, ' $1').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  get playing() {
    return !!this.el && this.on && !this.el.paused;
  }

  /** Calls fn() whenever the station, track or settings change. Returns an unsubscribe function. */
  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  changed() {
    writeSettings({ station: this.station.id, on: this.on, volume: this.volume, effectsVolume: this.effectsVolume, ambienceVolume: this.ambienceVolume });
    for (const fn of this.listeners) fn();
  }

  start() {
    if (this.el || !RADIO_STATIONS.length || typeof Audio === 'undefined') return;
    const el = (this.el = new Audio());
    el.preload = 'auto';
    this.applyVolume();
    el.muted = this.muted;
    el.addEventListener('ended', () => this.next());
    el.addEventListener('playing', () => {
      this.failures = 0;
      this.changed();
    });
    el.addEventListener('pause', () => this.changed());
    el.addEventListener('error', () => {
      // Skip a missing or unplayable file, but don't spin forever if none will play.
      if (++this.failures < this.station.tracks.length) this.next();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) el.pause();
      else if (el.src && this.on) el.play().catch(() => {});
    });
    if (this.on) this.next();
  }

  /** Next track on this station (shuffled, without repeating until they've all played). */
  next() {
    if (!this.el) return;
    const tracks = this.station.tracks;
    if (!this.queue?.length) this.queue = shuffle(tracks, this.history[this.history.length - 1]);
    this.play(this.queue.shift());
  }

  /** Back to the previous track (or the start of this one if it's been playing a while). */
  previous() {
    if (!this.el) return;
    if (this.history.length < 2 || this.el.currentTime > 4) {
      this.el.currentTime = 0;
      this.resume();
      return;
    }
    const current = this.history.pop();
    this.queue = [current, ...(this.queue ?? [])];
    this.play(this.history.pop());
  }

  play(src) {
    this.history.push(src);
    if (this.history.length > 30) this.history.shift();
    this.on = true;
    this.el.src = src;
    this.el.play().catch(() => {});
    this.changed();
  }

  resume() {
    this.on = true;
    if (!this.el.src) this.next();
    else this.el.play().catch(() => {});
    this.changed();
  }

  /** Radio on/off (pauses the music; effects carry on). */
  togglePlay() {
    if (!this.el) return;
    if (this.playing) {
      this.on = false;
      this.el.pause();
      this.changed();
    } else {
      this.resume();
    }
  }

  /** Tunes to the next (+1) or previous (−1) station and starts playing it. */
  changeStation(step) {
    this.stationIndex = (this.stationIndex + step + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    this.queue = null;
    this.history = [];
    if (this.el) this.next();
    else this.changed();
  }

  setVolume(v) {
    this.volume = clamp01(v);
    this.applyVolume();
    this.changed();
  }

  setEffectsVolume(v) {
    this.effectsVolume = clamp01(v);
    this.changed();
  }

  setAmbienceVolume(v) {
    this.ambienceVolume = clamp01(v);
    this.changed();
  }

  applyVolume() {
    if (this.el) this.el.volume = (AUDIO_VOLUME.music ?? 0.4) * this.volume;
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.el) this.el.muted = muted;
  }
}

/** Shuffle, avoiding starting with the track that just played. */
function shuffle(list, avoidFirst) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  if (a.length > 1 && a[0] === avoidFirst) [a[0], a[1]] = [a[1], a[0]];
  return a;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: settings last until reload */
  }
}

export const music = new MusicPlayer();
