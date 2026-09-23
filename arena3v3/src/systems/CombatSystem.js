import { MarbleBagPool } from "../core/MarbleBag.js";
import { hasLineOfSight } from "../core/LineOfSight.js";
import { clamp, distance } from "../core/utils.js";

const AMOUNT_VARIANCE = [0.92, 0.95, 0.97, 0.99, 1, 1.01, 1.03, 1.05, 1.08];

export class CombatSystem {
  constructor(game) {
    this.game = game;
    this.rng = new MarbleBagPool();
  }

  reset() {
    this.rng.reset();
  }

  update(deltaMs) {
    for (const actor of this.game.actors) {
      this.game.resources.update(actor, deltaMs);

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
              this.game.log(actor.name + "'s " + spell.name + " failed: target moved out of range or line of sight.");
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

        if (effect.kind === "hot") {
          this.applyHeal(
            source,
            actor,
            effect.amount,
            effect.spellId,
            true,
            effect.visualStyle,
          );
        } else {
          this.applyDamage(
            source,
            actor,
            effect.amount,
            effect.spellId,
            true,
            true,
            effect.visualStyle,
          );
        }
      }
    }

    actor.effects = actor.effects.filter(effect => effect.remainingMs > 0);
  }

  canTarget(caster, target, spell) {
    if (!caster.alive || !spell) return false;
    if (spell.target === "self") return target?.id === caster.id;
    if (!target?.alive) return false;
    if (spell.target === "ally") return caster.team === target.team;
    if (spell.target === "enemy") return caster.team !== target.team;
    return false;
  }

  inRange(caster, target, range) {
    if (target?.id === caster.id) return true;
    return distance(caster, target) <= range + caster.radius + target.radius;
  }

  hasLos(caster, target) {
    if (target?.id === caster.id) return true;
    return hasLineOfSight(caster, target, this.game.arena.obstacles);
  }

  tryCast(caster, spell, target, { silent = false } = {}) {
    if (!caster.alive || this.game.ended || caster.cast || !spell) return false;

    if (this.game.cc.isHardControlled(caster)) {
      if (!silent && caster.control === "player") this.game.ui.toast("Crowd controlled");
      return false;
    }

    if (this.game.cc.isSchoolLocked(caster, spell)) {
      if (!silent && caster.control === "player") this.game.ui.toast("Spell school is locked");
      return false;
    }

    if (!target || !this.canTarget(caster, target, spell)) {
      if (!silent && caster.control === "player") {
        this.game.ui.toast(
          spell.target === "ally"
            ? "Select a friendly target"
            : spell.target === "enemy"
              ? "Select an enemy target"
              : "Invalid target",
        );
      }
      return false;
    }

    if (!spell.ignoreGcd && caster.gcdRemaining > 0) return false;
    if (caster.cooldownFor(spell.id) > 0) return false;

    if (!this.game.resources.canPay(caster, spell)) {
      if (!silent && caster.control === "player") {
        this.game.ui.toast("Not enough " + caster.resource.type);
      }
      return false;
    }

    if (!this.inRange(caster, target, spell.range)) {
      if (!silent && caster.control === "player") this.game.ui.toast("Target out of range");
      return false;
    }

    if (!this.hasLos(caster, target)) {
      if (!silent && caster.control === "player") this.game.ui.toast("Line of sight blocked");
      return false;
    }

    if (!spell.ignoreGcd) {
      caster.gcdRemaining = spell.gcdMs ?? 1200;
    }

    if (spell.castMs > 0) {
      caster.cast = {
        spellId: spell.id,
        targetId: target.id,
        totalMs: spell.castMs,
        remainingMs: spell.castMs,
      };
      this.game.log(caster.name + " begins " + spell.name + ".");
      return true;
    }

    return this.resolveSpell(caster, target, spell);
  }

  cancelCast(actor, reason = "movement") {
    if (!actor.cast) return;

    const spell = actor.getSpell(actor.cast.spellId);
    actor.cast = null;

    if (actor.control === "player") {
      this.game.ui.toast((spell?.name || "Cast") + " cancelled by " + reason);
    }
  }

  resolveSpell(caster, target, spell) {
    if (!this.game.resources.canPay(caster, spell)) {
      if (caster.control === "player") this.game.ui.toast("Not enough " + caster.resource.type);
      return false;
    }

    const utilityKinds = new Set([
      "fearAoE", "fear", "interrupt", "incapacitate", "stun",
      "root", "rootAoE", "gapClose", "chainDamage",
    ]);
    const specialUtility = spell.effects.some(effect => utilityKinds.has(effect.kind));

    if (spell.target === "enemy" && !spell.noHitRoll && !specialUtility) {
      const hit = this.rollHit(caster, target, spell.id);

      if (hit !== "hit") {
        this.game.recordAvoidance(caster, target, hit);
        const label = hit === "miss" ? "MISS" : "DODGE";
        this.game.addFloatingText(target, label, "avoid");
        this.game.log(caster.name + "'s " + spell.name + ": " + label.toLowerCase() + ".");
        caster.cooldowns.set(spell.id, spell.cooldownMs || 0);
        this.game.resources.spend(caster, spell);
        this.game.recordCast(caster, spell);
        return true;
      }
    }

    if (!this.game.resources.spend(caster, spell)) return false;
    if (spell.resourceGain) this.game.resources.gain(caster, spell.resourceGain);

    if (spell.cooldownMs > 0) caster.cooldowns.set(spell.id, spell.cooldownMs);
    this.game.recordCast(caster, spell);

    for (const effect of spell.effects) {
      const effectTarget = effect.to === "self" ? caster : target;
      const style = effect.visualStyle || spell.visualStyle || caster.visualStyle || "damage";

      switch (effect.kind) {
        case "damage":
          this.applyDamage(caster, effectTarget, effect.amount, spell.id, false, true, style);
          break;
        case "chainDamage":
          this.applyChainDamage(caster, target, spell, effect);
          break;
        case "heal":
          this.applyHeal(caster, effectTarget, effect.amount, spell.id, false, style);
          break;
        case "dot":
        case "hot":
          this.applyPeriodic(caster, effectTarget, spell, effect, style);
          break;
        case "damageReduction":
        case "healingReduction":
          this.applyTimedEffect(caster, effectTarget, spell, effect, style);
          break;
        case "fearAoE":
          this.game.cc.applyFearAoE(caster, spell, effect);
          break;
        case "fear":
          this.game.cc.applyFear(caster, effectTarget, spell, effect);
          break;
        case "incapacitate":
          this.game.cc.applyIncapacitate(caster, effectTarget, spell, effect);
          break;
        case "stun":
          this.game.cc.applyStun(caster, effectTarget, spell, effect);
          break;
        case "root":
          this.game.cc.applyRoot(caster, effectTarget, spell, effect);
          break;
        case "rootAoE":
          this.game.cc.applyRootAoE(caster, spell, effect);
          break;
        case "interrupt":
          this.game.cc.interrupt(caster, effectTarget, spell, effect);
          break;
        case "gapClose":
          this.game.movement.dashToRange(
            caster,
            effectTarget,
            effect.stopDistance ?? 50,
            this.game.arena,
          );
          this.game.vfx.beam(caster, effectTarget, style, 170);
          break;
        default:
          break;
      }
    }

    return true;
  }

  applyChainDamage(caster, primaryTarget, spell, effect) {
    const maxTargets = effect.maxTargets ?? 3;
    const multipliers = effect.multipliers ?? [1, 0.72, 0.55];
    const validEnemies = this.game.actors.filter(candidate =>
      candidate.alive
      && candidate.team !== caster.team
      && this.inRange(caster, candidate, effect.range ?? spell.range)
      && this.hasLos(caster, candidate)
    );

    const ordered = [primaryTarget];
    const others = validEnemies
      .filter(candidate => candidate.id !== primaryTarget.id)
      .sort((a, b) => distance(primaryTarget, a) - distance(primaryTarget, b));

    ordered.push(...others);

    const targets = ordered.slice(0, maxTargets);
    const visualIds = [caster.id, ...targets.map(chainTarget => chainTarget.id)];
    const style = effect.visualStyle || spell.visualStyle || caster.visualStyle || "lightning";

    targets.forEach((chainTarget, index) => {
      const outcome = this.rollHit(caster, chainTarget, spell.id + ":chain:" + index);

      if (outcome !== "hit") {
        this.game.recordAvoidance(caster, chainTarget, outcome);
        this.game.addFloatingText(chainTarget, outcome.toUpperCase(), "avoid");
        return;
      }

      const multiplier = multipliers[index] ?? multipliers[multipliers.length - 1] ?? 1;
      this.applyDamage(
        caster,
        chainTarget,
        Math.round(effect.amount * multiplier),
        spell.id + ":chain:" + index,
        false,
        true,
        style,
      );
    });

    this.game.vfx.chain(visualIds, style, 380);

    if (targets.length > 1) {
      this.game.log(caster.name + "'s " + spell.name + " chains through " + targets.length + " targets.");
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
    const variance = this.rng.drawSequence(
      source.id + ":" + spellId + ":" + context + ":amount",
      AMOUNT_VARIANCE,
    );
    return Math.round(base * variance);
  }

  applyDamage(source, target, baseAmount, spellId, periodic = false, skipHit = false, visualStyle = "damage") {
    if (!source.alive || !target.alive) return;

    if (!skipHit) {
      const outcome = this.rollHit(source, target, spellId);
      if (outcome !== "hit") {
        this.game.recordAvoidance(source, target, outcome);
        this.game.addFloatingText(target, outcome.toUpperCase(), "avoid");
        return;
      }
    }

    this.game.cc.breakOnDamage(target);

    let amount = this.amount(source, spellId, baseAmount, periodic ? "dot" : "damage");
    const crit = this.rollCrit(source, spellId, periodic ? "dot" : "damage");

    if (crit) amount = Math.round(amount * source.critMultiplier);
    amount = Math.max(1, Math.round(amount * (1 - target.damageReduction())));

    const actual = Math.min(amount, target.health);
    target.health = Math.max(0, target.health - amount);

    this.game.recordDamage(source, target, actual, crit);
    this.game.addFloatingText(target, (crit ? "✦ " : "") + "-" + actual, crit ? "crit-damage" : "damage");

    if (!periodic) {
      this.game.vfx.burst(target, visualStyle, crit ? 360 : 250);
    }

    this.game.log(
      source.name + " hits " + target.name + " for " + actual + (crit ? " (crit)" : "") + ".",
    );

    if (!target.alive) {
      target.cast = null;
      this.game.log(target.name + " is down.");
      this.game.onActorDeath(target);
    }
  }

  applyHeal(source, target, baseAmount, spellId, periodic = false, visualStyle = "heal") {
    if (!source.alive || !target.alive) return;

    let amount = this.amount(source, spellId, baseAmount, periodic ? "hot" : "heal");
    const crit = this.rollCrit(source, spellId, periodic ? "hot" : "heal");

    if (crit) amount = Math.round(amount * source.critMultiplier);

    amount = this.game.dampening.applyToHealing(amount);
    amount = Math.round(amount * (1 - target.healingReduction()));

    const actual = Math.min(amount, target.maxHealth - target.health);
    target.health = Math.min(target.maxHealth, target.health + amount);

    if (actual > 0) {
      this.game.recordHealing(source, target, actual, crit);
      this.game.addFloatingText(target, (crit ? "✦ " : "") + "+" + actual, crit ? "crit-heal" : "heal");

      if (!periodic) {
        this.game.vfx.beam(source, target, visualStyle, 260);
        this.game.vfx.burst(target, visualStyle, crit ? 390 : 290);
      }

      this.game.log(
        source.name + " heals " + target.name + " for " + actual + (crit ? " (crit)" : "") + ".",
      );
    }
  }

  applyPeriodic(source, target, spell, effect, visualStyle) {
    target.effects = target.effects.filter(existing =>
      !(existing.spellId === spell.id
        && existing.sourceId === source.id
        && existing.kind === effect.kind)
    );

    target.effects.push({
      kind: effect.kind,
      spellId: spell.id,
      sourceId: source.id,
      amount: effect.amount,
      durationMs: effect.durationMs,
      remainingMs: effect.durationMs,
      tickMs: effect.tickMs,
      nextTickMs: effect.tickMs,
      value: effect.value || 0,
      visualStyle,
    });

    this.game.vfx.ring(target, visualStyle, target.radius + 4, target.radius + 22, 300);
    this.game.log(source.name + " applies " + spell.name + " to " + target.name + ".");
  }

  applyTimedEffect(source, target, spell, effect, visualStyle) {
    target.effects = target.effects.filter(existing =>
      !(existing.spellId === spell.id
        && existing.sourceId === source.id
        && existing.kind === effect.kind)
    );

    target.effects.push({
      kind: effect.kind,
      spellId: spell.id,
      sourceId: source.id,
      durationMs: effect.durationMs,
      remainingMs: effect.durationMs,
      value: effect.value,
      visualStyle,
    });

    this.game.vfx.ring(target, visualStyle, target.radius + 3, target.radius + 26, 360);

    if (effect.kind === "damageReduction") {
      this.game.addFloatingText(target, "GUARDED", "buff");
      this.game.log(target.name + " gains " + spell.name + ".");
    } else {
      this.game.addFloatingText(target, "HEALING REDUCED", "debuff");
      this.game.log(source.name + " applies healing reduction to " + target.name + ".");
    }
  }
}
