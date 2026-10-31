import { AUDIO_VOLUME } from '../config/assets.js';
import { music } from './MusicPlayer.js';

const MUTE_KEY = 'rouge.muted';

/**
 * Thin wrapper over Phaser's sound manager (effects) and the music player. Missing audio files are skipped silently, so you
 * can delete or rename sounds while working on them without breaking the game.
 */
export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.sound = scene.sound;
    this.sound.mute = readMuted();
    music.setMuted(this.sound.mute);
  }

  has(key) {
    return this.scene.cache.audio.exists(key);
  }

  play(key, config = {}) {
    // While the browser hasn't unlocked audio yet, skip one-shots instead of queueing them up.
    if (!this.has(key) || this.sound.locked) return;
    this.sound.play(key, { volume: AUDIO_VOLUME[key] ?? 0.5, ...config });
  }

  /** Starts the music playlist (call from a tap/click the first time, for mobile browsers). */
  startMusic() {
    music.start();
  }

  get muted() {
    return this.sound.mute;
  }

  toggleMute() {
    this.sound.mute = !this.sound.mute;
    music.setMuted(this.sound.mute);
    try {
      localStorage.setItem(MUTE_KEY, this.sound.mute ? '1' : '0');
    } catch {
      /* storage unavailable: ignore */
    }
    return this.sound.mute;
  }
}

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}
