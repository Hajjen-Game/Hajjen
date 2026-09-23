export class PlayerAbilityQueue {
  constructor(game, windowMs = 400) {
    this.game = game;
    this.windowMs = windowMs;
    this.queued = null;
  }

  get queuedIndex() {
    return this.queued?.index ?? null;
  }

  clear() {
    this.queued = null;
  }

  request(index) {
    const game = this.game;
    const player = game.player;
    const spell = player?.spells[index];

    if (!player?.alive || game.ended || !spell) {
      this.clear();
      return { accepted: false, queued: false, cast: false };
    }

    const targetId = spell.target === "self" ? player.id : player.targetId;

    if (this.canCastNow(index, targetId)) {
      this.clear();
      const success = game.tryCastPlayerSpellNow(index, targetId);
      return { accepted: success, queued: false, cast: success };
    }

    if (this.canQueueSoon(index, targetId)) {
      this.queued = {
        index,
        targetId,
        expiresAt: performance.now() + this.windowMs + 80,
      };
      return { accepted: true, queued: true, cast: false };
    }

    this.clear();
    return { accepted: false, queued: false, cast: false };
  }

  update() {
    if (!this.queued) return;

    const game = this.game;
    const player = game.player;
    const queued = this.queued;

    if (!player?.alive || game.ended || performance.now() > queued.expiresAt) {
      this.clear();
      return;
    }

    const spell = player.spells[queued.index];
    const target = game.getActor(queued.targetId);

    if (!spell || !target?.alive) {
      this.clear();
      return;
    }

    if (!this.baseConditionsValid(spell, target)) {
      this.clear();
      return;
    }

    if (!this.canCastNow(queued.index, queued.targetId)) return;

    const index = queued.index;
    this.clear();

    const success = game.tryCastPlayerSpellNow(index, queued.targetId);
    if (success) game.ui?.pulseAction(index, true);
  }

  canCastNow(index, targetId) {
    const game = this.game;
    const player = game.player;
    const spell = player?.spells[index];
    const target = game.getActor(targetId);

    if (!spell || !target) return false;
    if (!this.baseConditionsValid(spell, target)) return false;
    if (player.cast) return false;
    if (!spell.ignoreGcd && player.gcdRemaining > 0) return false;
    if (player.cooldownFor(spell.id) > 0) return false;

    return true;
  }

  canQueueSoon(index, targetId) {
    const game = this.game;
    const player = game.player;
    const spell = player?.spells[index];
    const target = game.getActor(targetId);

    if (!spell || !target || !this.baseConditionsValid(spell, target)) return false;

    const castRemaining = player.cast?.remainingMs ?? 0;
    const gcdRemaining = spell.ignoreGcd ? 0 : player.gcdRemaining;
    const cooldownRemaining = player.cooldownFor(spell.id);

    const blockedByShortCast = castRemaining > 0 && castRemaining <= this.windowMs;
    const blockedByShortGcd = gcdRemaining > 0 && gcdRemaining <= this.windowMs;
    const blockedByShortCooldown = cooldownRemaining > 0 && cooldownRemaining <= this.windowMs;

    return blockedByShortCast || blockedByShortGcd || blockedByShortCooldown;
  }

  baseConditionsValid(spell, target) {
    const game = this.game;
    const player = game.player;

    if (!player.alive || game.ended) return false;
    if (game.cc.isHardControlled(player)) return false;
    if (game.cc.isSchoolLocked(player, spell)) return false;
    if (!game.combat.canTarget(player, target, spell)) return false;
    if (!game.resources.canPay(player, spell)) return false;
    if (!game.combat.inRange(player, target, spell.range)) return false;
    if (!game.combat.hasLos(player, target)) return false;

    return true;
  }
}
