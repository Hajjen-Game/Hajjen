export class DampeningSystem {
  constructor(game, config = {}) {
    this.game = game;

    // WoW-inspired structure, scaled to this prototype's much shorter matches:
    // healing is untouched during the opener, then Dampening begins at a
    // visible baseline and rises in fixed timed steps.
    this.startSeconds = config.startSeconds ?? 45;
    this.startPercent = config.startPercent ?? 10;
    this.stepSeconds = config.stepSeconds ?? 10;
    this.stepPercent = config.stepPercent ?? 2;
    this.maxPercent = config.maxPercent ?? 100;

    this.percent = 0;
    this.lastLoggedThreshold = 0;
  }

  reset() {
    this.percent = 0;
    this.lastLoggedThreshold = 0;
  }

  update(elapsedSeconds) {
    const previous = this.percent;

    if (elapsedSeconds < this.startSeconds) {
      this.percent = 0;
      return;
    }

    const rampSeconds = elapsedSeconds - this.startSeconds;
    const steps = Math.floor(rampSeconds / this.stepSeconds);

    this.percent = Math.min(
      this.maxPercent,
      this.startPercent + steps * this.stepPercent,
    );

    if (previous === 0 && this.percent > 0) {
      this.game.log("Dampening begins at " + this.percent + "% — all healing received is reduced.");
      this.lastLoggedThreshold = Math.floor(this.percent / 10) * 10;
      return;
    }

    const threshold = Math.floor(this.percent / 10) * 10;
    if (threshold >= 20 && threshold > this.lastLoggedThreshold) {
      this.lastLoggedThreshold = threshold;
      this.game.log("Dampening rises to " + this.percent + "%.");
    }
  }

  healingMultiplier() {
    return Math.max(0, 1 - this.percent / 100);
  }

  applyToHealing(amount) {
    return Math.max(0, Math.round(amount * this.healingMultiplier()));
  }

  nextStepSeconds(elapsedSeconds) {
    if (elapsedSeconds < this.startSeconds) {
      return Math.max(0, this.startSeconds - elapsedSeconds);
    }

    if (this.percent >= this.maxPercent) return null;

    const sinceStart = elapsedSeconds - this.startSeconds;
    const intoStep = sinceStart % this.stepSeconds;
    return intoStep === 0 ? this.stepSeconds : this.stepSeconds - intoStep;
  }
}
