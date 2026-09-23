import { MarbleBagPool } from "../core/MarbleBag.js";
import { hasLineOfSight } from "../core/LineOfSight.js";
import { clamp, distance } from "../core/utils.js";

const AMOUNT_VARIANCE = [0.92, 0.95, 0.97, 0.99, 1, 1.01, 1.03, 1.05, 1.08];

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.rng = new MarbleBagPool();
  }

  reset() { this.rng.reset(); }

  update(deltaMs) {
    for (const actor of this.game.actors) {
      actor.gcdRemaining = Math.max(0, actor.gcdRemaining - deltaMs);
      for (const [spellId, remaining] of actor.cooldowns.entries()) {
        actor.cooldowns.set(spellId, Math.max(0, remaining - deltaMs));
      }

      if (actor.cast && actor.alive) {
        actor.cast.remainingMs -= deltaMs;
        if (actor.cast.remainingMs <= 0) {
          const completed = actor.cast;
          actor.cast = null;
          const spell = actor.getSpell(completed.spellId);
          const target = this.game.getActor(completed.targetId);
          if (spell && target?.alive) {
            if (!this.inRange(actor, target, spell.range) || !this.hasLos(actor, target)) {
              this.game.log(actor.name + "'s " + spell.name + " failed: target moved out of reach.");
              if (actor.control === "player") this.game.ui.toast("Target out of range or line of sight");
            } else {
              this.resolveSpell(actor, target, spell);
            }
          }
        }
      }
      this.updateEffects(actor, deltaMs);
    }
  }

  updateEffects(actor, deltaMs) {
    if (!actor.alive) return;
    for (const effect of actor.effects) {
      effect.remainingMs -= deltaMs;
      if (effect.kind !== "hot" && effect.kind !== "dot") continue;
      effect.nextTickMs -= deltaMs;
      while (effect.nextTickMs <= 0 && effect.remainingMs > -effect.tickMs) {
        effect.nextTickMs += effect.tickMs;
        const source = this.game.getActor(effect.sourceId);
        if (!source?.alive) continue;
        if (effect.kind === "hot") this.applyHeal(source, actor, effect.amount, effect.spellId, true);
        else this.applyDamage(source, actor, effect.amount, effect.spellId, true, true);
      }
    }
    actor.effects = actor.effects.filter(effect => effect.remainingMs > 0);
  }

  canTarget(caster, target, spell) {
    if (!target?.alive || !caster.alive) return false;
    if (spell.target === "ally") return caster.team === target.team;
    if (spell.target === "enemy") return caster.team !== target.team;
    return false;
  }

  inRange(caster, target, range) {
    return distance(caster, target) <= range + caster.radius + target.radius;
  }

  hasLos(caster, target) {
    return hasLineOfSight(caster, target, this.game.arena.obstacles);
  }

  tryCast(caster, spell, target, { silent = false } = {}) {
    if (!caster.alive || this.game.ended || caster.cast || !spell) return false;
    if (!target || !this.canTarget(caster, target, spell)) {
      if (!silent && caster.control === "player") this.game.ui.toast(spell.target === "ally" ? "Select a friendly target" : "Select an enemy target");
      return false;
    }
    if (caster.gcdRemaining > 0 || caster.cooldownFor(spell.id) > 0) return false;
    if (!this.inRange(caster, target, spell.range)) {
      if (!silent && caster.control === "player") this.game.ui.toast("Target out of range");
      return false;
    }
    if (!this.hasLos(caster, target)) {
      if (!silent && caster.control === "player") this.game.ui.toast("Line of sight blocked");
      return false;
    }

    caster.gcdRemaining = spell.gcdMs ?? 1200;
    if (spell.cooldownMs > 0) caster.cooldowns.set(spell.id, spell.cooldownMs);

    if (spell.castMs > 0) {
      caster.cast = { spellId: spell.id, targetId: target.id, totalMs: spell.castMs, remainingMs: spell.castMs };
      this.game.log(caster.name + " begins " + spell.name + ".");
      return true;
    }

    this.resolveSpell(caster, target, spell);
    return true;
  }

  cancelCast(actor, reason = "movement") {
    if (!actor.cast) return;
    const spell = actor.getSpell(actor.cast.spellId);
    actor.cast = null;
    if (actor.control === "player") this.game.ui.toast((spell?.name || "Cast") + " cancelled by " + reason);
  }

  resolveSpell(caster, target, spell) {
    if (spell.target === "enemy") {
      const hit = this.rollHit(caster, target, spell.id);
      if (hit !== "hit") {
        const label = hit === "miss" ? "MISS" : "DODGE";
        this.game.addFloatingText(target, label, "avoid");
        this.game.log(caster.name + "'s " + spell.name + ": " + label.toLowerCase() + ".");
        return;
      }
    }

    for (const effect of spell.effects) {
      switch (effect.kind) {
        case "damage": this.applyDamage(caster, target, effect.amount, spell.id, false, true); break;
        case "heal": this.applyHeal(caster, target, effect.amount, spell.id, false); break;
        case "dot":
        case "hot": this.applyPeriodic(caster, target, spell, effect); break;
        case "damageReduction": this.applyTimedBuff(caster, target, spell, effect); break;
        default: break;
      }
    }
  }

  rollHit(caster, target, spellId) {
    const missChance = clamp(1 - caster.hitChance, 0, 0.4);
    const dodgeChance = clamp(target.dodgeChance, 0, 0.35);
    const hitChance = Math.max(0, 1 - missChance - dodgeChance);
    return this.rng.drawWeighted(
      caster.id + ":" + target.id + ":" + spellId + ":hit",
      { hit: hitChance, miss: missChance, dodge: dodgeChance },
    );
  }

  rollCrit(source, spellId, context) {
    return this.rng.drawWeighted(
      source.id + ":" + spellId + ":" + context + ":crit",
      { crit: source.critChance, normal: 1 - source.critChance },
    ) === "crit";
  }

  amount(source, spellId, base, context) {
    const variance = this.rng.drawSequence(source.id + ":" + spellId + ":" + context + ":amount", AMOUNT_VARIANCE);
    return Math.round(base * variance);
  }

  applyDamage(source, target, baseAmount, spellId, periodic = false, skipHit = false) {
    if (!source.alive || !target.alive) return;
    if (!skipHit) {
      const outcome = this.rollHit(source, target, spellId);
      if (outcome !== "hit") {
        this.game.addFloatingText(target, outcome.toUpperCase(), "avoid");
        return;
      }
    }

    let amount = this.amount(source, spellId, baseAmount, periodic ? "dot" : "damage");
    const crit = this.rollCrit(source, spellId, periodic ? "dot" : "damage");
    if (crit) amount = Math.round(amount * source.critMultiplier);
    amount = Math.max(1, Math.round(amount * (1 - target.damageReduction())));
    target.health = Math.max(0, target.health - amount);

    this.game.addFloatingText(target, (crit ? "✦ " : "") + "-" + amount, crit ? "crit-damage" : "damage");
    this.game.log(source.name + " hits " + target.name + " for " + amount + (crit ? " (crit)" : "") + ".");

    if (!target.alive) {
      target.cast = null;
      this.game.log(target.name + " is down.");
      this.game.onActorDeath(target);
    }
  }

  applyHeal(source, target, baseAmount, spellId, periodic = false) {
    if (!source.alive || !target.alive) return;
    let amount = this.amount(source, spellId, baseAmount, periodic ? "hot" : "heal");
    const crit = this.rollCrit(source, spellId, periodic ? "hot" : "heal");
    if (crit) amount = Math.round(amount * source.critMultiplier);

    const actual = Math.min(amount, target.maxHealth - target.health);
    target.health = Math.min(target.maxHealth, target.health + amount);
    if (actual > 0) {
      this.game.addFloatingText(target, (crit ? "✦ " : "") + "+" + actual, crit ? "crit-heal" : "heal");
      this.game.log(source.name + " heals " + target.name + " for " + actual + (crit ? " (crit)" : "") + ".");
    }
  }

  applyPeriodic(source, target, spell, effect) {
    target.effects = target.effects.filter(existing =>
      !(existing.spellId === spell.id && existing.sourceId === source.id && existing.kind === effect.kind)
    );
    target.effects.push({
      kind: effect.kind, spellId: spell.id, sourceId: source.id, amount: effect.amount,
      durationMs: effect.durationMs, remainingMs: effect.durationMs,
      tickMs: effect.tickMs, nextTickMs: effect.tickMs, value: effect.value || 0,
    });
    this.game.log(source.name + " applies " + spell.name + " to " + target.name + ".");
  }

  applyTimedBuff(source, target, spell, effect) {
    target.effects = target.effects.filter(existing =>
      !(existing.spellId === spell.id && existing.sourceId === source.id && existing.kind === effect.kind)
    );
    target.effects.push({
      kind: effect.kind, spellId: spell.id, sourceId: source.id,
      durationMs: effect.durationMs, remainingMs: effect.durationMs, value: effect.value,
    });
    this.game.addFloatingText(target, "GUARDED", "buff");
    this.game.log(target.name + " gains " + spell.name + ".");
  }
}
