/* CHROMA RUSH — Adaptive Flow Director 1.0.
 * Deterministic scheduling based on elapsed phase time, recent damage, near misses,
 * survival and safe physical transitions between jump/duck obstacles.
 * No machine learning, no network, no unbounded spawn loops.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ChromaDirector = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const PHASE = Object.freeze({ BUILD: 'BUILD', PEAK: 'PEAK', FADE: 'FADE', RELAX: 'RELAX' });
  const ORDER = [PHASE.BUILD, PHASE.PEAK, PHASE.FADE, PHASE.RELAX];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const minimumGap = (previous, next, speed, obstacleWidth = 60) => {
    // Both actions must have enough time to recover. Includes traversal time of a hitbox.
    const traverse = obstacleWidth / Math.max(300, speed);
    if (previous === 'jump' && next === 'jump') return 0.91 + traverse;
    if (previous === 'jump' && next === 'duck') return 0.92 + traverse;
    if (previous === 'duck' && next === 'jump') return 0.64 + traverse;
    return 0.60 + traverse;
  };

  class AdaptiveFlowDirector {
    constructor(random = Math.random) { this.random = random; this.reset(); }
    reset() {
      this.phase = PHASE.BUILD;
      this.phaseElapsed = 0;
      this.phaseDuration = 7.4;
      this.spawnCountdown = 2.2; // introductory breathing room
      this.previousType = null;
      this.lastDamageAt = -999;
      this.lastNearMissAt = -999;
      this.time = 0;
      this.totalSpawned = 0;
      this.cycle = 0;
      this.peakIntensity = 0;
      this.relaxBonus = 0;
    }
    registerDamage() { this.lastDamageAt = this.time; this.relaxBonus = Math.min(1.3, this.relaxBonus + .5); }
    registerNearMiss() { this.lastNearMissAt = this.time; }
    durationFor(phase, context) {
      switch (phase) {
        case PHASE.BUILD: return clamp(6.2 + this.random() * 2.0 - context.zone * .045, 4.8, 8.3);
        case PHASE.PEAK: return clamp(4.4 + this.random() * 1.8 - context.zone * .035, 3.3, 6.1);
        case PHASE.FADE: return 2.1;
        default: return 2.2 + this.relaxBonus + (context.hp <= 25 ? .9 : 0);
      }
    }
    advance(context) {
      const idx = ORDER.indexOf(this.phase);
      this.phase = ORDER[(idx + 1) % ORDER.length];
      this.phaseElapsed = 0;
      this.phaseDuration = this.durationFor(this.phase, context);
      if (this.phase === PHASE.RELAX) {
        this.spawnCountdown = Math.max(this.spawnCountdown, this.phaseDuration + .7);
      } else if (this.phase === PHASE.BUILD) {
        this.cycle++;
        this.spawnCountdown = Math.max(this.spawnCountdown, .5);
        this.relaxBonus = 0;
      }
    }
    gapFor(context) {
      const zone = Math.max(1, context.zone);
      const extra = context.hp <= 25 ? .15 : context.hp <= 50 ? .07 : 0;
      const recentHit = this.time - this.lastDamageAt < 3 ? .18 : 0;
      const base = this.phase === PHASE.PEAK ? 1.06 : this.phase === PHASE.FADE ? 1.52 : 1.42;
      const difficulty = clamp((zone - 1) * .048, 0, .34);
      return clamp(base - difficulty + extra + recentHit + (this.random() - .5) * .23, .77, 1.9);
    }
    nextType() {
      return this.random() < .5 ? 'jump' : 'duck';
    }
    tick(dt, context, spawn) {
      if (dt <= 0) return;
      this.time += dt;
      this.phaseElapsed += dt;
      // Fade/relax can be extended automatically when player is critical.
      if (this.phaseElapsed >= this.phaseDuration) this.advance(context);
      this.spawnCountdown -= dt;
      if (this.phase === PHASE.RELAX) {
        this.spawnCountdown = Math.max(this.spawnCountdown, .18);
        return;
      }
      if (this.spawnCountdown > 0) return;
      const type = this.nextType();
      const safety = this.previousType ? minimumGap(this.previousType, type, context.speed) : 0;
      const desiredGap = this.gapFor(context);
      // Every obstacle is explicitly named JUMP or DUCK; both have unique collision geometry.
      spawn({ type, phase: this.phase });
      this.previousType = type;
      this.totalSpawned++;
      this.spawnCountdown += Math.max(safety, desiredGap);
      // Guard large frame gaps and deterministic behavior after tab suspension.
      this.spawnCountdown = Math.max(this.spawnCountdown, .18);
    }
    get label() {
      return ({BUILD:'BUILDING',PEAK:'INTENSE',FADE:'EASING',RELAX:'BREATHE'})[this.phase];
    }
  }
  return { PHASE, AdaptiveFlowDirector, minimumGap };
});
