import { MarbleBagPool } from "../core/MarbleBag.js";
import { hasLineOfSight } from "../core/LineOfSight.js";
import { clamp, distance } from "../core/utils.js";

const AMOUNT_VARIANCE = [0.92, 0.95, 0.97, 0.99, 1, 1.01, 1.03, 1.05, 1.08];
const CAST_COMPLETION_RANGE_GRACE = 20;
const CAST_COMPLETION_GRACE_THRESHOLD = 280;

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
      if (actor.gcdRemaining <= 0) actor.gcdTotalMs = 0;

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
            const baseRangeOk = this.spellInRange(actor, target, spell);
            const rangeOk = this.completionSpellInRange(actor, target, spell);
            const losOk = this.hasLos(actor, target);

            if (!baseRangeOk && rangeOk && losOk) {
              this.castDiagnostic(actor, spell).graceSaves += 1;
            }

            if (!rangeOk || !losOk) {
              if (actor.control === "player") {
                this.game.ui?.onPlayerCastFailed?.(spell.id);
              }
              if (actor.control === "ai" && Number.isFinite(spell.aiStartRange)) {
                actor.aiRangeLosCastFailures = actor.aiRangeLosCastFailures || {};
                actor.aiRangeLosCastFailures[spell.id] =
                  (actor.aiRangeLosCastFailures[spell.id] || 0) + 1;
              }

              this.recordCastCompletionFailure(
                actor,
                target,
                spell,
                completed,
                rangeOk,
                losOk,
              );

              const reason = !rangeOk && !losOk
                ? "OUT OF RANGE + LINE OF SIGHT"
                : !rangeOk
                  ? "OUT OF RANGE"
                  : "LINE OF SIGHT";
              const startDistance = Math.round(Number(completed.startDistance) || 0);
              const endDistance = Math.round(this.edgeDistance(actor, target));
              const spellRange = Math.round(Number(completed.spellRange ?? spell.range) || 0);
              const completionRange = Math.round(this.completionRangeFor(spell));

              this.game.log(
                this.game.combatantLabel(actor) + "'s " + spell.name
                + " failed: " + reason
                + " · start " + startDistance
                + " · end " + endDistance
                + " · range " + spellRange
                + (completionRange > spellRange
                  ? " · completion limit " + completionRange
                  : "")
                + ".",
              );

              if (actor.control === "player") {
                this.game.ui.toast(
                  reason === "OUT OF RANGE"
                    ? "Target moved out of range"
                    : reason === "LINE OF SIGHT"
                      ? "Line of sight blocked"
                      : "Target moved out of range and line of sight",
                );
              }
            } else {
              this.resolveSpell(actor, target, spell);
            }
          } else if (spell && actor.control === "player") {
            this.game.ui?.onPlayerCastFailed?.(spell.id);
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
    this.game.cc.syncDrStates(actor);
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

  spellInRange(caster, target, spell) {
    return this.inRange(caster, target, Number(spell?.range) || 0);
  }

  completionRangeFor(spell) {
    const baseRange = Number(spell?.range) || 0;
    const getsGrace = baseRange >= CAST_COMPLETION_GRACE_THRESHOLD
      && ["ally", "enemy"].includes(spell?.target);

    return baseRange + (getsGrace ? CAST_COMPLETION_RANGE_GRACE : 0);
  }

  completionSpellInRange(caster, target, spell) {
    return this.inRange(caster, target, this.completionRangeFor(spell));
  }

  edgeDistance(caster, target) {
    if (!caster || !target || caster.id === target.id) return 0;
    return Math.max(
      0,
      distance(caster, target) - (Number(caster.radius) || 0) - (Number(target.radius) || 0),
    );
  }

  castDiagnostic(actor, spell) {
    actor.castRangeDiagnostics = actor.castRangeDiagnostics || {};
    actor.castRangeDiagnostics[spell.id] = actor.castRangeDiagnostics[spell.id] || {
      starts: 0,
      graceSaves: 0,
      outOfRangeFailures: 0,
      losFailures: 0,
      bothFailures: 0,
      samples: [],
    };
    return actor.castRangeDiagnostics[spell.id];
  }

  recordCastStart(actor, target, spell) {
    const diagnostic = this.castDiagnostic(actor, spell);
    diagnostic.starts += 1;
    return {
      startDistance: this.edgeDistance(actor, target),
      spellRange: Number(spell.range) || 0,
      startHadLos: this.hasLos(actor, target),
    };
  }

  recordCastCompletionFailure(actor, target, spell, completed, rangeOk, losOk) {
    const diagnostic = this.castDiagnostic(actor, spell);
    if (!rangeOk) diagnostic.outOfRangeFailures += 1;
    if (!losOk) diagnostic.losFailures += 1;
    if (!rangeOk && !losOk) diagnostic.bothFailures += 1;

    if (diagnostic.samples.length < 6) {
      diagnostic.samples.push({
        reason: !rangeOk && !losOk
          ? "OUT OF RANGE + LINE OF SIGHT"
          : !rangeOk
            ? "OUT OF RANGE"
            : "LINE OF SIGHT",
        startDistance: Math.round(Number(completed.startDistance) || 0),
        endDistance: Math.round(this.edgeDistance(actor, target)),
        range: Math.round(Number(completed.spellRange ?? spell.range) || 0),
        completionRange: Math.round(this.completionRangeFor(spell)),
      });
    }
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

    if (!this.spellInRange(caster, target, spell)) {
      if (!silent && caster.control === "player") this.game.ui.toast("Target out of range");
      return false;
    }

    if (!this.hasLos(caster, target)) {
      if (!silent && caster.control === "player") this.game.ui.toast("Line of sight blocked");
      return false;
    }

    if (!spell.ignoreGcd) {
      const baseGcdMs = spell.gcdMs ?? 1200;
      const gcdMultiplier = this.game.powerUps?.gcdMultiplierFor?.(caster) ?? 1;
      const gcdMs = Math.max(0, Math.round(baseGcdMs * gcdMultiplier));
      caster.gcdRemaining = gcdMs;
      caster.gcdTotalMs = gcdMs;
    }

    if (spell.castMs > 0) {
      const startDiagnostic = this.recordCastStart(caster, target, spell);
      const castMultiplier = this.game.powerUps?.castTimeMultiplierFor?.(caster) ?? 1;
      const castMs = Math.max(1, Math.round(spell.castMs * castMultiplier));
      caster.cast = {
        spellId: spell.id,
        targetId: target.id,
        totalMs: castMs,
        remainingMs: castMs,
        startDistance: startDiagnostic.startDistance,
        spellRange: startDiagnostic.spellRange,
        startHadLos: startDiagnostic.startHadLos,
      };

      if (caster.control === "ai" && Number.isFinite(spell.aiStartRange)) {
        caster.aiGuardedCastStarts = caster.aiGuardedCastStarts || {};
        caster.aiGuardedCastStarts[spell.id] =
          (caster.aiGuardedCastStarts[spell.id] || 0) + 1;
      }

      if (caster.control === "player") {
        this.game.ui?.onPlayerCastStarted?.(spell.id);
      }
      this.game.log(this.game.combatantLabel(caster) + " begins " + spell.name + ".");
      return true;
    }

    return this.resolveSpell(caster, target, spell);
  }

  cancelCast(actor, reason = "movement") {
    if (!actor.cast) return;

    const spell = actor.getSpell(actor.cast.spellId);
    actor.cast = null;

    if (actor.control === "player") {
      if (spell?.id) this.game.ui?.onPlayerCastCancelled?.(spell.id);
      this.game.ui.toast((spell?.name || "Cast") + " cancelled by " + reason);
    }
  }

  resolveSpell(caster, target, spell) {
    if (caster.control === "player") {
      this.game.ai?.observePlayerSpell?.(caster, target, spell);
    }

    if (
      caster.control === "ai"
      && spell.target === "enemy"
      && this.spellWouldBreakFriendlyCc(spell)
      && this.game.cc.shouldAvoidBreakingFriendlyCc(caster, target)
    ) {
      this.game.log(this.game.combatantLabel(caster) + " holds " + spell.name + " to preserve friendly crowd control.");
      return false;
    }

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
        this.game.addActionFloatingText(caster, target, label, "avoid");
        this.game.log(this.game.combatantLabel(caster) + "'s " + spell.name + ": " + label.toLowerCase() + ".");
        this.game.vfx.spell(
          caster,
          target,
          spell.id,
          spell.visualStyle || caster.visualStyle || "damage",
          true,
        );
        caster.cooldowns.set(spell.id, spell.cooldownMs || 0);
        this.game.resources.spend(caster, spell);
        this.game.recordCast(caster, spell);
        if (caster.control === "player") {
          this.game.ui?.onPlayerSpellSucceeded?.(spell.id);
        }
        return true;
      }
    }

    if (!this.game.resources.spend(caster, spell)) return false;
    if (spell.resourceGain) this.game.resources.gain(caster, spell.resourceGain);

    if (spell.cooldownMs > 0) caster.cooldowns.set(spell.id, spell.cooldownMs);
    this.game.recordCast(caster, spell);
    this.activateOffensiveCooldown(caster, spell);
    this.game.vfx.spell(
      caster,
      target,
      spell.id,
      spell.visualStyle || caster.visualStyle || "damage",
      false,
    );

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
        case "slow":
          if (effectTarget.alive) {
            this.applyTimedEffect(caster, effectTarget, spell, effect, style);
          }
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
            effect.dashDurationMs ?? 0,
          );
          // Warrior Charge owns its moving dust trail and Rogue Shadowstep
          // owns its vanish/reappear cue. A legacy beam visually joins their
          // positions and makes Shadowstep appear to shoot a projectile.
          if (!this.game.vfx.ownsImpact(spell.id)) {
            this.game.vfx.beam(caster, effectTarget, style, 170);
          }
          break;
        default:
          break;
      }
    }

    if (caster.control === "player") {
      this.game.ui?.onPlayerSpellSucceeded?.(spell.id);
    }
    return true;
  }

  activateOffensiveCooldown(caster, spell) {
    if (!spell.offensiveCooldown) return;

    const durationMs = spell.offensiveCooldown.durationMs ?? 2400;
    const label = spell.offensiveCooldown.label || "BURST";
    const style = spell.visualStyle || caster.visualStyle || "damage";

    caster.effects = caster.effects.filter(effect =>
      !(effect.kind === "offensiveCooldown" && effect.sourceId === caster.id)
    );

    caster.effects.push({
      kind: "offensiveCooldown",
      spellId: spell.id,
      sourceId: caster.id,
      durationMs,
      remainingMs: durationMs,
      breakOnDamage: false,
      visualStyle: style,
      label,
    });

    // The old BURST world ring is intentionally disabled.
    // Keep the lightweight text/status marker for now until true offensive cooldowns exist.
    this.game.addFloatingText(caster, label, "burst");
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

    const targets = ordered
      .filter((chainTarget, index) =>
        index === 0 || !this.game.cc.shouldAvoidBreakingFriendlyCc(caster, chainTarget)
      )
      .slice(0, maxTargets);
    const hitVisualIds = [caster.id];
    const style = effect.visualStyle || spell.visualStyle || caster.visualStyle || "lightning";

    targets.forEach((chainTarget, index) => {
      const outcome = this.rollHit(caster, chainTarget, spell.id + ":chain:" + index);

      if (outcome !== "hit") {
        this.game.recordAvoidance(caster, chainTarget, outcome);
        this.game.addActionFloatingText(caster, chainTarget, outcome.toUpperCase(), "avoid");
        return;
      }

      hitVisualIds.push(chainTarget.id);
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

      if (index === 0 && chainTarget.alive && effect.primarySlow) {
        this.applyTimedEffect(
          caster,
          chainTarget,
          spell,
          {
            kind: "slow",
            value: effect.primarySlow.value,
            durationMs: effect.primarySlow.durationMs,
          },
          style,
        );
      }
    });

    this.game.vfx.chain(hitVisualIds, style, 420, spell.id);

    if (targets.length > 1) {
      this.game.log(this.game.combatantLabel(caster) + "'s " + spell.name + " chains through " + targets.length + " targets.");
    }
  }

  spellWouldBreakFriendlyCc(spell) {
    return spell.effects.some(effect =>
      ["damage", "dot", "chainDamage"].includes(effect.kind)
    );
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
        this.game.addActionFloatingText(source, target, outcome.toUpperCase(), "avoid");
        return;
      }
    }

    this.game.cc.breakOnDamage(target);

    let amount = this.amount(source, spellId, baseAmount, periodic ? "dot" : "damage");
    const crit = this.rollCrit(source, spellId, periodic ? "dot" : "damage");

    if (crit) amount = Math.round(amount * source.critMultiplier);

    const powerUpDamageMultiplier =
      this.game.powerUps?.damageMultiplierFor?.(source) ?? 1;
    amount = Math.round(amount * powerUpDamageMultiplier);

    amount = Math.max(1, Math.round(amount * (1 - target.damageReduction())));

    const actual = Math.min(amount, target.health);
    target.health = Math.max(0, target.health - amount);

    this.game.recordDamage(source, target, actual, crit);
    this.game.addActionFloatingText(source, target, (crit ? "✦ " : "") + "-" + actual, crit ? "crit-damage" : "damage");
    this.applyTalentDamageHealing(source, spellId, actual);

    if (!periodic && !this.game.vfx.ownsImpact(spellId)) {
      this.game.vfx.burst(target, visualStyle, crit ? 360 : 250);
    }

    this.game.log(
      this.game.combatantLabel(source) + " hits " + this.game.combatantLabel(target) + " for " + actual + (crit ? " (crit)" : "") + ".",
    );

    if (!target.alive) {
      target.cast = null;
      this.game.log(this.game.combatantLabel(target) + " is down.");
      this.game.onActorDeath(target);
    }
  }

  applyTalentDamageHealing(source, spellId, damageAmount) {
    const damageHealPct = Number(source.talentPassives?.damageHealPct || 0);
    const spell = source.getSpell(spellId);

    if (damageHealPct <= 0 || !spell?.talentDamageHeal || damageAmount <= 0) return;

    const healTarget = this.game.actors
      .filter(actor =>
        actor.alive
        && actor.team === source.team
        && actor.health < actor.maxHealth
      )
      .sort((a, b) => a.healthPct - b.healthPct || a.health - b.health)[0];

    if (!healTarget) return;

    let amount = Math.max(1, Math.round(damageAmount * damageHealPct));
    amount = this.game.dampening.applyToHealing(amount);
    amount = Math.round(amount * (1 - healTarget.healingReduction()));

    const actual = Math.min(amount, healTarget.maxHealth - healTarget.health);
    if (actual <= 0) return;

    healTarget.health = Math.min(healTarget.maxHealth, healTarget.health + actual);
    this.game.recordHealing(source, healTarget, actual, false);

    // Atonement is passive conversion. Its healing number must always use the
    // normal green player combat text, but it must not create a heal beam/burst.
    if (source?.control === "player" || source?.id === this.game.player?.id) {
      this.game.addFloatingText(healTarget, "+" + actual, "heal");
    }

    this.game.log(
      this.game.combatantLabel(source) + "'s Atonement heals " + this.game.combatantLabel(healTarget) + " for " + actual + ".",
    );
  }

  emitHealFeedback(source, target, actual, crit, visualStyle = "heal", periodic = false, suppressLegacyVisual = false) {
    if (actual <= 0) return;

    // Direct player healing uses the shared green scrolling combat text path.
    // Atonement is emitted explicitly at its conversion site so it can stay
    // text-only without accidentally reintroducing a heal beam/burst.
    this.game.addActionFloatingText(
      source,
      target,
      (crit ? "✦ " : "") + "+" + actual,
      crit ? "crit-heal" : "heal",
    );

    if (!periodic && !suppressLegacyVisual) {
      this.game.vfx.beam(source, target, visualStyle, 260);
      this.game.vfx.burst(target, visualStyle, crit ? 390 : 290);
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
      this.emitHealFeedback(
        source,
        target,
        actual,
        crit,
        visualStyle,
        periodic,
        this.game.vfx.ownsImpact(spellId),
      );

      if (
        !periodic
        && source.id === target.id
        && ["warrior-bloodthirst", "dk-death-strike"].includes(spellId)
      ) {
        this.game.vfx.secondary(
          source,
          target,
          spellId,
          visualStyle,
          crit ? 520 : 440,
        );
      }

      this.game.log(
        this.game.combatantLabel(source) + " heals " + this.game.combatantLabel(target) + " for " + actual + (crit ? " (crit)" : "") + ".",
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

    if (!this.game.vfx.ownsImpact(spell.id)) {
      this.game.vfx.ring(target, visualStyle, target.radius + 4, target.radius + 22, 300);
    }
    this.game.log(this.game.combatantLabel(source) + " applies " + spell.name + " to " + this.game.combatantLabel(target) + ".");
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

    if (!this.game.vfx.ownsImpact(spell.id)) {
      this.game.vfx.ring(target, visualStyle, target.radius + 3, target.radius + 26, 360);
    }

    if (effect.kind === "damageReduction") {
      this.game.addFloatingText(target, "GUARDED", "buff");
      this.game.log(this.game.combatantLabel(target) + " gains " + spell.name + ".");
    } else if (effect.kind === "healingReduction") {
      this.game.addFloatingText(target, "HEALING REDUCED", "debuff");
      this.game.log(this.game.combatantLabel(source) + " applies healing reduction to " + this.game.combatantLabel(target) + ".");
    } else if (effect.kind === "slow") {
      this.game.addFloatingText(target, "SLOWED", "debuff");
      this.game.log(
        this.game.combatantLabel(source)
        + " slows "
        + this.game.combatantLabel(target)
        + " with "
        + spell.name
        + ".",
      );
    }
  }
}
