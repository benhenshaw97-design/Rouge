import { METRICS, OBJECTIVE_TEMPLATES } from '../content/objectives.js';

/**
 * Keeps a few objectives active (from content/objectives.js), tracks their progress and pays out
 * when they're done. No Phaser code: GameScene calls update() and shows what it returns.
 */
export class Objectives {
  /** @param {{ state, scene }} ctx  @param {number} active how many at once */
  constructor(ctx, active = 3, random = Math.random) {
    this.ctx = { ...ctx, pick: (list) => list[Math.floor(random() * list.length)] };
    this.random = random;
    this.active = active;
    this.list = [];
    this.completed = 0;
    this.fill();
  }

  fill() {
    while (this.list.length < this.active) {
      const used = new Set(this.list.map((o) => o.template));
      const free = OBJECTIVE_TEMPLATES.filter((t) => !used.has(t.id));
      if (!free.length) return;
      const t = free[Math.floor(this.random() * free.length)];
      const o = t.make(this.ctx);
      if (!o) {
        // (e.g. no next area): try another, but don't loop forever
        if (free.length === 1) return;
        continue;
      }
      o.template = t.id;
      o.start = METRICS[o.metric](this.ctx, o);
      this.list.push(o);
      this.refresh(o);
    }
  }

  refresh(o) {
    const done = Math.max(0, METRICS[o.metric](this.ctx, o) - o.start);
    o.progress = Math.min(o.target, done);
    const shown = o.metric === 'distanceKm' ? o.progress.toFixed(1) : Math.floor(o.progress);
    const count = o.target === 1 ? (o.progress >= 1 ? 'Done' : 'Not yet') : `${shown} / ${o.target}`;
    o.progressText = `${count}  ·  reward £${o.reward}`;
  }

  /** Checks progress; pays out and replaces finished objectives. Returns the ones just finished. */
  update() {
    const finished = [];
    for (const o of this.list) {
      this.refresh(o);
      if (o.progress >= o.target) finished.push(o);
    }
    if (!finished.length) return finished;
    for (const o of finished) {
      o.done = true;
      this.ctx.state.earn(o.reward);
      this.completed++;
    }
    this.list = this.list.filter((o) => !o.done);
    this.fill();
    return finished;
  }

  /** Debug: finish everything now. */
  completeAll() {
    for (const o of this.list) o.start = METRICS[o.metric](this.ctx, o) - o.target;
    return this.update();
  }

  /** Debug: swap in a fresh set. */
  reroll() {
    this.list = [];
    this.fill();
  }
}
