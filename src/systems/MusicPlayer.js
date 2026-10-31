import { AUDIO_VOLUME, MUSIC } from '../config/assets.js';

/**
 * Background music: plays the tracks in MUSIC in a shuffled order, one after another.
 *
 * Music is streamed with a plain <audio> element rather than Phaser's sound system, which
 * would decode each whole track into memory (tens of MB per track: too much for phones).
 * start() must first be called from a tap/click so mobile browsers allow playback.
 */
class MusicPlayer {
  constructor() {
    this.el = null;
    this.order = [];
    this.pos = -1;
    this.muted = false;
    this.failures = 0;
  }

  start() {
    if (this.el || !MUSIC.length || typeof Audio === 'undefined') return;
    const el = (this.el = new Audio());
    el.preload = 'auto';
    el.volume = AUDIO_VOLUME.music ?? 0.4;
    el.muted = this.muted;
    el.addEventListener('ended', () => this.next());
    el.addEventListener('playing', () => (this.failures = 0));
    el.addEventListener('error', () => {
      // Skip a missing or unplayable file, but don't spin forever if none will play.
      if (++this.failures < MUSIC.length) this.next();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) el.pause();
      else if (el.src) el.play().catch(() => {});
    });
    this.next();
  }

  next() {
    this.pos++;
    if (this.pos >= this.order.length) {
      this.order = shuffle(MUSIC.map((_, i) => i), this.order[this.order.length - 1]);
      this.pos = 0;
    }
    this.el.src = MUSIC[this.order[this.pos]];
    this.el.play().catch(() => {});
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

export const music = new MusicPlayer();
