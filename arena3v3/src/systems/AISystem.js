import { hasLineOfSight } from "../core/LineOfSight.js";
import { distance, normalize, stableHash } from "../core/utils.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export class AISystem {
  constructor(game, movementSystem) {
    this.game = game;
    this.movement = movementSystem;
    this.thinkTimers = new Map();
  }

  behaviorProfile(actor) {
    return actor?.config?.aiBehaviorProfile || null;
  }

  skill(actor) {
    return clamp01(this.behaviorProfile(actor)?.skill ?? 0.65);
  }

  behavior(actor, key, fallback = 0.5) {
    const profile = this.behaviorProfile(actor);
    if (!profile || !Number.isFinite(profile[key])) return fallback;

    const base = clamp01(profile[key]);
    const volatility = clamp01(profile.volatility ?? 0.35);
    const seed = Number(profile.seed) || stableHash(actor.id + ":behavior");
    const driftSeconds = 7 + (Math.abs(seed) % 5);
    const bucket = Math.floor(this.game.elapsedSeconds / driftSeconds);
    const raw = (stableHash(seed + ":" + key + ":" + bucket) % 10001) / 10000;
    const drift = (raw - 0.5) * 0.28 * volatility;

    return clamp01(base + drift);
  }

  decisionRoll(actor, key, bucketSeconds = 2.5) {
    const profile = this.behaviorProfile(actor);
    const seed = Number(profile?.seed) || stableHash(actor.id + ":decision");
    const bucket = Math.floor(this.game.elapsedSeconds / Math.max(0.35, bucketSeconds));
    return (stableHash(seed + ":" + key + ":" + bucket) % 10001) / 10000;
  }

  shouldAttempt(actor, key, chance, bucketSeconds = 2.5) {
    return this.decisionRoll(actor, key, bucketSeconds) < clamp01(chance);
  }

  thinkDelay(actor) {
    const skill = this.skill(actor);
    const base = 0.225 - skill * 0.105;
    const jitter = (stableHash(actor.id + ":think") % 31) / 1000;
    return Math.max(0.095, base + jitter);
  }

  update(deltaSeconds) {
    for (const actor of this.game.actors) {
      if (!actor.alive || actor.control === "player") continue;
      if (this.game.cc.isHardControlled(actor)) continue;

      const remaining = (this.thinkTimers.get(actor.id) || 0) - deltaSeconds;
      this.thinkTimers.set(actor.id, remaining);

      if (actor.role === "caster" && actor.cast && this.casterMustRecoverHealerSupport(actor)) {
        const spell = actor.getSpell(actor.cast.spellId);
        this.game.combat.cancelCast(actor, "recover healer LOS");
        this.game.log(
          this.game.combatantLabel(actor)
          + " cancels " + (spell?.name || "cast") + " to recover healer line of sight.",
        );
      }

      if (actor.role === "healer" && actor.cast) {
        this.reconsiderHealerCast(actor);
      }

      if (remaining <= 0) {
        this.thinkTimers.set(actor.id, this.thinkDelay(actor));
        this.think(actor);
      }

      if (actor.cast || this.game.cc.isRooted(actor)) continue;

      const target = this.game.getActor(actor.aiTargetId);
      if (target?.alive) this.moveForRole(actor, target, deltaSeconds);
    }
  }

  think(actor) {
    if (actor.role === "healer") this.healerThink(actor);
    else this.damageThink(actor);
  }

  spells(actor, aiRole) {
    return actor.spells.filter(spell => spell.aiRole === aiRole);
  }

  spell(actor, aiRole, target = null) {
    const matches = this.spells(actor, aiRole);
    if (matches.length <= 1) return matches[0] || null;

    let candidates = matches.filter(spell => this.ready(actor, spell));

    if (target && ["periodic", "sustainHot"].includes(aiRole)) {
      const missingEffects = candidates.filter(spell =>
        !target.hasEffect(spell.id, actor.id)
      );
      if (missingEffects.length > 0) candidates = missingEffects;
    }

    if (candidates.length === 0) candidates = matches;

    // A stable short rotation lets talent-unlocked abilities compete with
    // baseline abilities instead of always losing to the first matching role.
    const bucket = Math.floor(this.game.elapsedSeconds / 1.25);
    const index = stableHash(actor.id + ":" + aiRole + ":" + bucket) % candidates.length;
    return candidates[index];
  }

  healingUrgencyScore(actor, ally) {
    if (!ally?.alive || ally.team !== actor.team) return -Infinity;

    const healthPct = ally.healthPct;
    const enemies = this.game.actors.filter(candidate =>
      candidate.alive
      && candidate.team !== actor.team
      && !this.game.cc.isHardControlled(candidate)
    );

    const activeAttackers = enemies.filter(candidate =>
      this.combatTargetId(candidate) === ally.id
    ).length;

    const hasDot = ally.effects.some(effect =>
      effect.kind === "dot" && effect.remainingMs > 0
    );
    const hasHealingReduction = ally.effects.some(effect =>
      effect.kind === "healingReduction" && effect.remainingMs > 0
    );

    // Healers do not all read pressure the same way. Higher triage values
    // react earlier to incoming pressure; lower values lean more heavily on
    // the raw health bar. Rank improves the quality of that read without
    // removing the hidden playstyle.
    const triage = this.behavior(actor, "healerTriage", 0.70);
    const pressureRead = 0.72 + triage * 0.48;
    let score = (1 - healthPct) * (90 + triage * 20);
    score += activeAttackers * (healthPct < 0.70 ? 10 : 6) * pressureRead;
    if (hasDot) score += 3 + triage * 2;
    if (hasHealingReduction) score += 4 + triage * 2;
    if (healthPct < 0.45) score += 10 + triage * 4;
    if (healthPct < 0.30) score += 15 + triage * 6;

    return score;
  }

  pickHealTarget(actor, allies) {
    return [...allies].sort((a, b) => {
      const scoreDiff = this.healingUrgencyScore(actor, b)
        - this.healingUrgencyScore(actor, a);
      if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
      return a.healthPct - b.healthPct;
    })[0] || null;
  }

  reconsiderHealerCast(actor) {
    const cast = actor.cast;
    if (!cast) return false;

    const spell = actor.getSpell(cast.spellId);
    if (
      !spell
      || spell.target !== "ally"
      || !spell.effects.some(effect => ["heal", "hot"].includes(effect.kind))
    ) {
      return false;
    }

    const allies = this.game.actors.filter(candidate =>
      candidate.alive && candidate.team === actor.team
    );
    const best = this.pickHealTarget(actor, allies);
    const current = this.game.getActor(cast.targetId);

    if (!best || best.id === current?.id) return false;

    const bestScore = this.healingUrgencyScore(actor, best);
    const currentScore = current
      ? this.healingUrgencyScore(actor, current)
      : -Infinity;
    const hpGap = current ? current.healthPct - best.healthPct : 1;
    const scoreGap = bestScore - currentScore;

    const bestReachable = this.game.combat.inRange(actor, best, spell.range)
      && this.game.combat.hasLos(actor, best);

    const reactivity = (this.behavior(actor, "healerTriage", 0.70) + this.skill(actor)) / 2;
    const criticalSwap = best.healthPct < 0.30
      && (hpGap >= 0.06 - reactivity * 0.03 || scoreGap >= 12 - reactivity * 5);
    const emergencySwap = best.healthPct < 0.50
      && (hpGap >= 0.11 - reactivity * 0.05 || scoreGap >= 20 - reactivity * 8);
    const pressureSwap = best.healthPct < 0.62 + reactivity * 0.08
      && hpGap >= 0.18 - reactivity * 0.07
      && scoreGap >= 16 - reactivity * 6;

    if (
      !criticalSwap
      && !emergencySwap
      && !pressureSwap
    ) {
      return false;
    }

    // Do not throw away a useful heal for a merely preferable target hidden
    // behind LOS. A truly critical ally is the exception: cancel and move.
    if (!bestReachable && best.healthPct >= 0.30) return false;

    this.game.combat.cancelCast(actor, "emergency triage");
    actor.aiTargetId = best.id;
    this.thinkTimers.set(actor.id, 0);

    this.game.log(
      this.game.combatantLabel(actor)
      + " cancels " + spell.name
      + " to triage " + this.game.combatantLabel(best) + ".",
    );

    return true;
  }

  healerThink(actor) {
    const enemies = this.game.actors.filter(candidate =>
      candidate.alive && candidate.team !== actor.team
    );
    const allies = this.game.actors
      .filter(candidate => candidate.alive && candidate.team === actor.team);

    const target = this.pickHealTarget(actor, allies);
    if (!target) return;

    actor.aiTargetId = target.id;

    const skill = this.skill(actor);
    const triage = this.behavior(actor, "healerTriage", 0.70);
    const manaConservation = this.behavior(actor, "manaConservation", 0.50);
    const defensiveGreed = this.behavior(actor, "defensiveGreed", 0.42);
    const ccBias = this.behavior(actor, "ccBias", 0.58);
    const offenseBias = this.behavior(actor, "healerOffenseBias", 0.42);

    const defensiveThreshold = 0.50 - defensiveGreed * 0.16 + skill * 0.02;
    const emergencyThreshold = 0.66 + triage * 0.10 - manaConservation * 0.04;
    const bigHealThreshold = 0.64 + triage * 0.09 - manaConservation * 0.05;
    const instantThreshold = 0.78 + triage * 0.08 - manaConservation * 0.03;
    const sustainThreshold = 0.87 + triage * 0.06 - manaConservation * 0.05;
    const quickThreshold = 0.91 + triage * 0.05 - manaConservation * 0.05;

    const panicCc = this.spell(actor, "panicCc");
    if (panicCc && this.ready(actor, panicCc)) {
      const effect = panicCc.effects.find(item => ["fearAoE", "rootAoE"].includes(item.kind));
      const radius = effect?.radius || 0;
      const closeEnemy = enemies.find(candidate =>
        distance(actor, candidate) <= radius + actor.radius + candidate.radius
        && !this.game.cc.wouldBeImmune(candidate, panicCc)
      );
      const selfThreat = this.meleeThreatTo(actor, actor.config.ai.peelThreatRange ?? 135);

      // Do not spend the healer's next global on panic CC while a teammate is
      // in real danger, unless the healer is personally being trained and
      // needs the CC to stay alive / keep casting.
      const panicSafePct = 0.66 - ccBias * 0.16;
      const panicChance = 0.30 + ccBias * 0.55 + skill * 0.10;

      if (
        closeEnemy
        && (selfThreat || (
          target.healthPct >= panicSafePct
          && this.shouldAttempt(actor, "healer-panic-cc", panicChance, 2.0)
        ))
        && this.castIfPossible(actor, panicCc, actor)
      ) return;
    }

    const defensive = this.spell(actor, "defensive");
    const big = this.spell(actor, "bigHeal");
    const quick = this.spell(actor, "quickHeal");
    const instant = this.spell(actor, "instantHeal");
    const sustain = this.spell(actor, "sustainHot", target);

    if (
      target.healthPct < defensiveThreshold
      && defensive
      && this.ready(actor, defensive)
      && this.castIfPossible(actor, defensive, target)
    ) return;

    // Under heavy pressure, prefer a true instant heal before committing to a
    // long big-heal cast. This catches Paladin Holy Shock and Druid Swiftmend,
    // while casted quick heals such as Priest Flash Heal keep their normal role.
    const emergencyInstant = [instant, quick]
      .filter(Boolean)
      .find(spell => (spell.castMs || 0) <= 0);

    if (
      target.healthPct < emergencyThreshold
      && emergencyInstant
      && this.ready(actor, emergencyInstant)
      && this.castIfPossible(actor, emergencyInstant, target)
    ) return;

    if (target.healthPct < bigHealThreshold && big && this.ready(actor, big) && this.castIfPossible(actor, big, target)) return;
    if (target.healthPct < instantThreshold && instant && this.ready(actor, instant) && this.castIfPossible(actor, instant, target)) return;

    if (target.healthPct < sustainThreshold && sustain && this.ready(actor, sustain)) {
      const hot = sustain.effects.find(effect => effect.kind === "hot");
      const shouldApply = !hot || !target.hasEffect(sustain.id, actor.id);
      if (shouldApply && this.castIfPossible(actor, sustain, target)) return;
    }

    if (target.healthPct < quickThreshold && quick && this.ready(actor, quick) && this.castIfPossible(actor, quick, target)) return;

    const control = this.spell(actor, "control");
    const controlStablePct = 0.68 - ccBias * 0.14;
    const controlChance = 0.24 + ccBias * 0.58 + skill * 0.10;
    if (
      control
      && this.ready(actor, control)
      && allies.every(ally => ally.healthPct > controlStablePct)
      && this.shouldAttempt(actor, "healer-control", controlChance, 3.0)
    ) {
      const controlTarget = this.pickCcTarget(actor, enemies, control);
      if (controlTarget && this.castIfPossible(actor, control, controlTarget)) return;
    }

    // Aggressive healers create pressure more readily; conservative healers
    // wait for a cleaner window. The profile drifts during the match, so the
    // tendency is readable without becoming completely deterministic.
    const offenseStablePct = 0.97 - offenseBias * 0.13;
    const offenseChance = 0.20 + offenseBias * 0.65 + skill * 0.10;
    if (
      allies.every(ally => ally.healthPct > offenseStablePct)
      && enemies.length > 0
      && this.shouldAttempt(actor, "healer-offense", offenseChance, 2.4)
    ) {
      const offensiveTarget = [...enemies].sort((a, b) => a.healthPct - b.healthPct)[0];
      const periodic = this.spell(actor, "periodic", offensiveTarget);
      const bigDamage = this.spell(actor, "bigDamage");
      const filler = this.spell(actor, "filler");

      if (
        periodic
        && this.ready(actor, periodic)
        && !offensiveTarget.hasEffect(periodic.id, actor.id)
        && this.castIfPossible(actor, periodic, offensiveTarget)
      ) return;

      if (
        bigDamage
        && this.ready(actor, bigDamage)
        && this.castIfPossible(actor, bigDamage, offensiveTarget)
      ) return;

      if (
        filler
        && this.ready(actor, filler)
        && this.castIfPossible(actor, filler, offensiveTarget)
      ) return;
    }
  }

  damageThink(actor) {
    const enemies = this.game.actors.filter(candidate =>
      candidate.alive && candidate.team !== actor.team,
    );
    if (enemies.length === 0) return;

    if (actor.role === "caster" && this.casterMustRecoverHealerSupport(actor)) {
      return;
    }

    const damageableEnemies = enemies.filter(candidate =>
      !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, candidate)
    );

    const skill = this.skill(actor);
    const defensiveGreed = this.behavior(actor, "defensiveGreed", 0.48);
    const defensiveThreshold = 0.52 - defensiveGreed * 0.20 + skill * 0.02;

    const defensive = this.spell(actor, "defensiveSelf") || this.spell(actor, "defensive");
    if (defensive && actor.healthPct < defensiveThreshold && this.ready(actor, defensive)) {
      if (this.castIfPossible(actor, defensive, actor)) return;
    }

    const interrupt = this.spell(actor, "interrupt");
    const interruptDiscipline = this.behavior(actor, "interruptDiscipline", 0.65);
    const interruptChance = 0.32 + skill * 0.45 + interruptDiscipline * 0.28;
    if (
      interrupt
      && this.ready(actor, interrupt)
      && this.shouldAttempt(actor, "interrupt", interruptChance, 0.75)
    ) {
      const interruptTarget = damageableEnemies
        .filter(candidate =>
          candidate.cast
          && this.game.combat.inRange(actor, candidate, interrupt.range)
          && this.game.combat.hasLos(actor, candidate)
        )
        .sort((a, b) => {
          const score = role => role === "healer" ? 0 : role === "caster" ? 1 : 2;
          return score(a.role) - score(b.role);
        })[0];

      if (interruptTarget && this.castIfPossible(actor, interrupt, interruptTarget)) return;
    }

    const panicRoot = this.spell(actor, "panicRoot");
    if (panicRoot && this.ready(actor, panicRoot)) {
      const effect = panicRoot.effects.find(item => item.kind === "rootAoE");
      const radius = effect?.radius || 0;
      const closeMelee = damageableEnemies.find(candidate =>
        candidate.role === "melee"
        && distance(actor, candidate) <= radius + actor.radius + candidate.radius
        && !this.game.cc.wouldBeImmune(candidate, panicRoot)
      );
      const rootChance = 0.32
        + this.behavior(actor, "ccBias", 0.58) * 0.48
        + skill * 0.15;
      if (
        closeMelee
        && (actor.healthPct < 0.52 || this.shouldAttempt(actor, "panic-root", rootChance, 2.0))
        && this.castIfPossible(actor, panicRoot, actor)
      ) return;
    }

    if (damageableEnemies.length === 0) return;

    const peel = this.findPeelSituation(actor, damageableEnemies);
    const oomHealer = this.findOomHealerTarget(actor, damageableEnemies);
    const healerPressure = this.findHealerPressureTarget(actor, damageableEnemies);

    let target = null;

    if (peel) {
      target = peel.attacker;
      this.beginPeel(actor, peel);
    } else if (oomHealer) {
      target = oomHealer;
      if (actor.aiTargetId !== oomHealer.id) {
        this.game.log(
          this.game.combatantLabel(actor)
          + " switches pressure to " + this.game.combatantLabel(oomHealer)
          + " — healer is out of mana.",
        );
      }
      actor.aiTargetId = oomHealer.id;
      actor.aiPeelTargetId = null;
      actor.aiPeelUntil = 0;
    } else if (healerPressure) {
      target = healerPressure;
      if (actor.aiTargetId !== healerPressure.id) {
        this.game.log(
          this.game.combatantLabel(actor)
          + " tests pressure on " + this.game.combatantLabel(healerPressure)
          + ".",
        );
      }
      actor.aiTargetId = healerPressure.id;
      actor.aiPeelTargetId = null;
      actor.aiPeelUntil = 0;
    } else {
      const current = this.game.getActor(actor.aiTargetId);
      const currentProtected = current?.alive
        && this.game.cc.shouldAvoidBreakingFriendlyCc(actor, current);

      if (currentProtected) {
        const alternate = this.pickPriorityTarget(actor, damageableEnemies);
        if (alternate && alternate.id !== current.id) {
          this.game.log(
            this.game.combatantLabel(actor)
            + " swaps off " + this.game.combatantLabel(current)
            + " to preserve friendly crowd control.",
          );
          target = alternate;
          actor.aiTargetId = alternate.id;
        }
      }

      if (!target) {
        const currentDamageable = current?.alive
          && damageableEnemies.some(candidate => candidate.id === current.id)
          ? current
          : null;
        const lowest = [...damageableEnemies].sort((a, b) => a.healthPct - b.healthPct)[0];

        // A short healer-pressure test should end cleanly instead of turning
        // into a permanent healer tunnel. Once the window closes, return to
        // the normal role priority unless the healer is actually OOM or is
        // now the lowest kill target.
        if (currentDamageable?.role === "healer" && lowest.id !== currentDamageable.id) {
          const nonHealers = damageableEnemies.filter(candidate => candidate.role !== "healer");
          const resetTarget = this.pickPriorityTarget(actor, nonHealers);

          if (resetTarget) {
            target = resetTarget;
            actor.aiTargetId = resetTarget.id;
            this.game.log(
              this.game.combatantLabel(actor)
              + " returns pressure to " + this.game.combatantLabel(resetTarget)
              + ".",
            );
          }
        }

        if (!target && currentDamageable) {
          const voluntarySwap = this.pickVoluntarySwapTarget(
            actor,
            currentDamageable,
            damageableEnemies,
          );

          if (voluntarySwap) {
            target = voluntarySwap;
            actor.aiTargetId = voluntarySwap.id;
            this.game.log(
              this.game.combatantLabel(actor)
              + " swaps pressure to " + this.game.combatantLabel(voluntarySwap) + ".",
            );
          }
        }

        if (!target) {
          if (!currentDamageable || lowest.healthPct < 0.24) {
            target = lowest.healthPct < 0.24
              ? lowest
              : this.pickPriorityTarget(actor, damageableEnemies);
            actor.aiTargetId = target.id;
          } else {
            target = currentDamageable;
          }
        }
      }
    }

    if (!target?.alive) return;

    const gapClose = this.spell(actor, "gapClose");
    if (
      gapClose
      && this.ready(actor, gapClose)
      && distance(actor, target) > (actor.config.ai.preferredRange || 55) * 1.8
      && this.game.combat.inRange(actor, target, gapClose.range)
      && this.game.combat.hasLos(actor, target)
    ) {
      if (this.castIfPossible(actor, gapClose, target)) return;
    }

    const control = this.spell(actor, "control");
    if (control && this.ready(actor, control)) {
      let controlTarget = null;

      if (
        peel
        && this.canControlTarget(actor, peel.attacker, control)
      ) {
        controlTarget = peel.attacker;
      } else {
        const ccBias = this.behavior(actor, "ccBias", 0.58);
        const ccChance = 0.22 + ccBias * 0.58 + skill * 0.12;
        if (this.shouldAttempt(actor, "damage-control", ccChance, 2.8)) {
          controlTarget = this.pickCcTarget(actor, enemies, control);
        }
      }

      if (controlTarget && this.castIfPossible(actor, control, controlTarget)) return;
    }

    const periodic = this.spell(actor, "periodic", target);
    const big = this.spell(actor, "bigDamage");
    const filler = this.spell(actor, "filler");

    if (
      periodic
      && this.ready(actor, periodic)
      && !target.hasEffect(periodic.id, actor.id)
      && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, target)
      && this.castIfPossible(actor, periodic, target)
    ) return;

    if (
      big
      && this.ready(actor, big)
      && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, target)
      && this.castIfPossible(actor, big, target)
    ) return;

    if (
      filler
      && this.ready(actor, filler)
      && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, target)
    ) {
      this.castIfPossible(actor, filler, target);
    }
  }

  combatTargetId(actor) {
    return actor?.control === "player" ? actor.targetId : actor?.aiTargetId;
  }

  meleeThreatTo(actor, threatRange = null) {
    if (!actor?.alive) return null;

    const range = threatRange
      ?? actor.config.ai.peelThreatRange
      ?? 125;

    return this.game.actors
      .filter(candidate =>
        candidate.alive
        && candidate.team !== actor.team
        && candidate.role === "melee"
        && this.combatTargetId(candidate) === actor.id
        && distance(candidate, actor) <= range
        && !this.game.cc.isHardControlled(candidate)
        && !this.game.cc.isRooted(candidate)
      )
      .sort((a, b) => distance(a, actor) - distance(b, actor))[0] || null;
  }

  allyNeedsPeel(actor, ally) {
    if (!ally?.alive || ally.team !== actor.team) return false;

    // Healers should receive help as soon as a melee is actively tunnelling
    // them; waiting until they are already low makes peel arrive too late.
    if (ally.role === "healer") return Boolean(this.meleeThreatTo(ally));

    // Casters still require meaningful pressure before teammates abandon
    // their current offensive plan to peel for them.
    if (ally.role === "caster") {
      const threshold = actor.config.ai.peelHealthPct ?? 0.62;
      return ally.healthPct <= threshold && Boolean(this.meleeThreatTo(ally));
    }

    return false;
  }

  findPeelSituation(actor, enemies) {
    const now = this.game.elapsedSeconds;
    const stickyTarget = this.game.getActor(actor.aiPeelTargetId);

    if (
      actor.aiPeelUntil > now
      && stickyTarget?.alive
      && enemies.some(candidate => candidate.id === stickyTarget.id)
    ) {
      const threatened = this.findThreatenedAlly(actor, stickyTarget);
      if (threatened) return { attacker: stickyTarget, ally: threatened };
    }

    const allies = this.game.actors
      .filter(candidate =>
        candidate.alive
        && candidate.team === actor.team
        && ["healer", "caster"].includes(candidate.role)
        && this.allyNeedsPeel(actor, candidate)
      )
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === "healer" ? -1 : 1;
        return a.healthPct - b.healthPct;
      });

    for (const ally of allies) {
      const attacker = this.meleeThreatTo(
        ally,
        actor.config.ai.peelThreatRange ?? 125,
      );

      if (
        attacker
        && enemies.some(candidate => candidate.id === attacker.id)
      ) {
        const peelBias = this.behavior(actor, "peelBias", 0.55);
        const urgency = ally.role === "healer"
          ? 0.12 + Math.max(0, 0.72 - ally.healthPct) * 0.55
          : Math.max(0, 0.68 - ally.healthPct) * 0.45;
        const peelChance = 0.14 + peelBias * 0.62 + this.skill(actor) * 0.16 + urgency;

        if (
          ally.healthPct < 0.32
          || this.shouldAttempt(actor, "peel:" + ally.id, peelChance, 2.2)
        ) {
          return { attacker, ally };
        }
      }
    }

    actor.aiPeelTargetId = null;
    actor.aiPeelUntil = 0;
    return null;
  }

  findThreatenedAlly(actor, attacker) {
    const targetId = this.combatTargetId(attacker);
    if (!targetId) return null;

    const ally = this.game.getActor(targetId);
    if (
      !ally?.alive
      || ally.team !== actor.team
      || !["healer", "caster"].includes(ally.role)
      || distance(attacker, ally) > (actor.config.ai.peelThreatRange ?? 125)
    ) {
      return null;
    }

    if (ally.role === "healer") return ally;

    return ally.healthPct <= (actor.config.ai.peelHealthPct ?? 0.62)
      ? ally
      : null;
  }

  beginPeel(actor, peel) {
    const now = this.game.elapsedSeconds;
    const isNewPeel = actor.aiPeelTargetId !== peel.attacker.id || actor.aiPeelUntil <= now;

    actor.aiPeelTargetId = peel.attacker.id;
    actor.aiPeelUntil = now + (actor.config.ai.peelDurationSeconds ?? 4.5);
    actor.aiTargetId = peel.attacker.id;

    if (isNewPeel) {
      if (peel.ally.id === actor.id) {
        this.game.log(
          this.game.combatantLabel(actor)
          + " self-peels " + this.game.combatantLabel(peel.attacker) + ".",
        );
      } else {
        this.game.log(
          this.game.combatantLabel(actor)
          + " peels " + this.game.combatantLabel(peel.attacker)
          + " off " + this.game.combatantLabel(peel.ally) + ".",
        );
      }
    }
  }

  canControlTarget(actor, target, spell) {
    if (!target?.alive) return false;
    if (this.game.cc.isHardControlled(target) || this.game.cc.isRooted(target)) return false;
    if (this.game.cc.wouldBeImmune(target, spell)) return false;
    if (!this.game.combat.inRange(actor, target, spell.range)) return false;
    if (!this.game.combat.hasLos(actor, target)) return false;

    if (this.isBreakableControlSpell(spell) && this.hasFriendlyDotPressure(actor, target)) {
      return false;
    }

    return true;
  }

  pickCcTarget(actor, enemies, spell) {
    const priorityRoles = actor.config.ai.ccTargetRoles || ["healer", "caster"];

    for (const role of priorityRoles) {
      const target = enemies.find(candidate =>
        candidate.role === role
        && this.canControlTarget(actor, candidate, spell)
      );
      if (target) return target;
    }

    return null;
  }

  isBreakableControlSpell(spell) {
    return spell.effects.some(effect =>
      ["fear", "incapacitate", "root"].includes(effect.kind)
      && effect.breakOnDamage !== false
    );
  }

  hasFriendlyDotPressure(actor, target) {
    return target.effects.some(effect => {
      if (effect.kind !== "dot" || effect.remainingMs <= 0) return false;
      const source = this.game.getActor(effect.sourceId);
      return source?.team === actor.team;
    });
  }

  findOomHealerTarget(actor, enemies) {
    const threshold = actor.config.ai.oomHealerFocusPct ?? 0.1;

    return enemies.find(candidate =>
      candidate.role === "healer"
      && candidate.resource.type === "mana"
      && candidate.resourcePct <= threshold
    ) || null;
  }

  findHealerPressureTarget(actor, enemies) {
    const healer = enemies.find(candidate => candidate.role === "healer");
    if (!healer) return null;

    const nonHealers = enemies.filter(candidate => candidate.id !== healer.id);
    const lowestNonHealer = [...nonHealers]
      .sort((a, b) => a.healthPct - b.healthPct)[0];

    // Swap-heavy players test the healer more often, while sticky players
    // may spend most of the match tunnelling a DPS. An obvious kill still
    // overrides personality.
    const healerSwapBias = this.behavior(actor, "healerSwapBias", 0.45);
    const killStopPct = actor.config.ai.healerPressureKillStopPct
      ?? (0.29 + this.skill(actor) * 0.04);
    if (lowestNonHealer?.healthPct <= killStopPct) return null;

    const cycleSeconds = actor.config.ai.healerPressureCycleSeconds
      ?? (24 - healerSwapBias * 11);
    const windowSeconds = actor.config.ai.healerPressureWindowSeconds
      ?? (2.1 + healerSwapBias * 3.8);
    const cycleMs = Math.max(1000, Math.round(cycleSeconds * 1000));
    const profileSeed = this.behaviorProfile(actor)?.seed ?? actor.id;
    const phaseOffset = (stableHash(profileSeed + ":healer-pressure") % cycleMs) / 1000;
    const phase = (this.game.elapsedSeconds + phaseOffset) % cycleSeconds;

    if (phase >= windowSeconds) return null;

    const castSpell = healer.cast
      ? healer.getSpell(healer.cast.spellId)
      : null;
    const activelyHealing = Boolean(
      castSpell
      && castSpell.target === "ally"
      && castSpell.effects.some(effect => ["heal", "hot"].includes(effect.kind))
    );

    const manaThreshold = actor.config.ai.healerPressureManaPct
      ?? (0.54 + healerSwapBias * 0.32);
    const manaExposed = healer.resource.type === "mana"
      && healer.resourcePct <= manaThreshold;
    const healthExposed = healer.healthPct <= 0.70 + healerSwapBias * 0.18;

    // Pressure windows are opportunities, not mandatory swaps. The healer
    // must expose something worth reacting to, and personality still decides
    // whether this particular window is taken.
    if (!activelyHealing && !manaExposed && !healthExposed) return null;

    const swapChance = 0.16 + healerSwapBias * 0.62 + this.skill(actor) * 0.12;
    return this.shouldAttempt(actor, "healer-pressure", swapChance, 2.6)
      ? healer
      : null;
  }

  pickVoluntarySwapTarget(actor, current, enemies) {
    if (!current?.alive || enemies.length < 2) return null;

    const alternatives = enemies
      .filter(candidate => candidate.id !== current.id)
      .sort((a, b) => a.healthPct - b.healthPct);
    const candidate = alternatives[0];
    if (!candidate) return null;

    const stickiness = this.behavior(actor, "targetStickiness", 0.58);
    const healerSwapBias = this.behavior(actor, "healerSwapBias", 0.42);
    const aggression = this.behavior(actor, "aggression", 0.65);
    const healthAdvantage = current.healthPct - candidate.healthPct;

    if (candidate.role === "healer" && healerSwapBias < 0.52) return null;
    if (candidate.role !== "healer" && healthAdvantage < -0.08) return null;

    const minInterval = 2.8 + stickiness * 5.2;
    const lastSwap = Number(actor.aiLastVoluntarySwapAt) || -99;
    if (this.game.elapsedSeconds - lastSwap < minInterval) return null;

    const killOpportunity = candidate.healthPct < 0.45 ? 0.18 : 0;
    const chance = (1 - stickiness) * 0.46
      + Math.max(0, healthAdvantage) * 1.15
      + aggression * 0.08
      + killOpportunity;

    if (!this.shouldAttempt(actor, "voluntary-swap", chance, 3.2)) return null;

    actor.aiLastVoluntarySwapAt = this.game.elapsedSeconds;
    return candidate;
  }

  pickPriorityTarget(actor, enemies) {
    const priorityRoles = actor.config.ai.targetPriorityRoles || ["caster", "melee", "healer"];

    for (const role of priorityRoles) {
      const candidates = enemies.filter(candidate => candidate.role === role);

      if (candidates.length > 0) {
        return candidates.sort((a, b) => a.healthPct - b.healthPct)[0];
      }
    }

    return enemies[0];
  }

  ready(actor, spell) {
    return (spell.ignoreGcd || actor.gcdRemaining <= 0)
      && actor.cooldownFor(spell.id) <= 0
      && !actor.cast
      && !this.game.cc.isHardControlled(actor)
      && !this.game.cc.isSchoolLocked(actor, spell)
      && this.game.resources.canPay(actor, spell);
  }

  castIfPossible(actor, spell, target) {
    if (
      Number.isFinite(spell?.aiStartRange)
      && spell.castMs > 0
      && spell.target === "enemy"
      && target?.alive
    ) {
      const maxStartDistance = spell.aiStartRange + actor.radius + target.radius;
      if (distance(actor, target) > maxStartDistance) return false;
      if (!this.game.combat.hasLos(actor, target)) return false;
    }

    return this.game.combat.tryCast(actor, spell, target, { silent: true });
  }

  moveForRole(actor, target, deltaSeconds) {
    if (!target?.alive || this.game.cc.isRooted(actor)) return;

    if (actor.role === "healer") {
      const meleeThreat = this.meleeThreatTo(
        actor,
        actor.config.ai.peelThreatRange ?? 135,
      );

      if (meleeThreat) {
        const escapeVector = this.kiteVector(actor, meleeThreat, null);

        if (escapeVector.x !== 0 || escapeVector.y !== 0) {
          this.movement.moveAI(actor, escapeVector, deltaSeconds, this.game.arena);
          return;
        }
      }
    }

    if (actor.role === "caster") {
      const healer = this.getTeamHealer(actor);
      const meleeThreat = this.findCasterMeleeThreat(actor);

      if (
        healer
        && this.casterMustRecoverHealerSupport(actor)
      ) {
        const recoveryVector = this.healerSupportVector(actor, healer, meleeThreat);

        if (recoveryVector.x !== 0 || recoveryVector.y !== 0) {
          this.movement.moveAI(actor, recoveryVector, deltaSeconds, this.game.arena);
          return;
        }
      }

      if (meleeThreat) {
        const kiteVector = this.kiteVector(actor, meleeThreat, healer);

        if (kiteVector.x !== 0 || kiteVector.y !== 0) {
          this.movement.moveAI(actor, kiteVector, deltaSeconds, this.game.arena);
          return;
        }
      }
    }

    if (actor.role !== "healer" && this.shouldPullForControlledHealer(actor, target)) {
      const pullVector = this.healerLosPullVector(actor, target);

      if (pullVector.x !== 0 || pullVector.y !== 0) {
        this.movement.moveAI(actor, pullVector, deltaSeconds, this.game.arena);
        return;
      }
    }

    const preferred = actor.config.ai.preferredRange;
    const los = hasLineOfSight(actor, target, this.game.arena.obstacles);
    const dist = distance(actor, target);
    let vector = { x: 0, y: 0 };

    if (!los || dist > preferred * 1.08) {
      vector = this.steer(actor, target, 1);
    } else if (actor.role === "caster" && dist < preferred * 0.5) {
      vector = this.steer(actor, target, -1);
    } else if (actor.role === "healer" && dist < 120) {
      vector = this.steer(actor, target, -0.35);
    }

    if (vector.x !== 0 || vector.y !== 0) {
      this.movement.moveAI(actor, vector, deltaSeconds, this.game.arena);
    }
  }

  casterMustRecoverHealerSupport(actor) {
    if (actor.role !== "caster") return false;

    const healer = this.getTeamHealer(actor);
    if (!healer?.alive) return false;

    const meleeThreat = this.findCasterMeleeThreat(actor);
    const healerLosHealthPct = actor.config.ai.healerLosHealthPct ?? 0.82;
    const emergencyHealthPct = actor.config.ai.healerLosEmergencyPct ?? 0.62;
    const pressured = Boolean(meleeThreat);
    const low = actor.healthPct <= healerLosHealthPct;
    const emergency = actor.healthPct <= emergencyHealthPct;

    if (!pressured && !low) return false;

    const supported = this.hasHealerSupport(actor, healer);
    if (supported) return false;

    // At low HP, or whenever a melee is actively tunnelling the caster,
    // healer LOS/range is a hard priority over offensive casting.
    return emergency || pressured || low;
  }

  findCasterMeleeThreat(actor) {
    const threatRange = actor.config.ai.kiteThreatRange ?? 150;

    return this.game.actors
      .filter(candidate =>
        candidate.alive
        && candidate.team !== actor.team
        && candidate.role === "melee"
        && candidate.aiTargetId === actor.id
        && !this.game.cc.isHardControlled(candidate)
        && !this.game.cc.isRooted(candidate)
        && distance(candidate, actor) <= threatRange
      )
      .sort((a, b) => distance(a, actor) - distance(b, actor))[0] || null;
  }

  kiteVector(actor, threat, healer = null) {
    const directAway = normalize(actor.x - threat.x, actor.y - threat.y);
    const sign = stableHash(actor.id + ":kite") % 2 === 0 ? 1 : -1;
    const side = {
      x: -directAway.y * sign,
      y: directAway.x * sign,
    };

    const candidates = [
      directAway,
      normalize(directAway.x * 0.75 + side.x * 0.65, directAway.y * 0.75 + side.y * 0.65),
      normalize(directAway.x * 0.75 - side.x * 0.65, directAway.y * 0.75 - side.y * 0.65),
      side,
      { x: -side.x, y: -side.y },
    ].filter(candidate =>
      !this.movement.wouldCollide(actor, candidate, Math.max(18, actor.radius), this.game.arena)
    );

    // Let MovementSystem's obstacle navigator handle the escape instead of
    // returning a zero vector, which previously bypassed anti-stuck logic.
    if (candidates.length === 0) return directAway;

    const probeDistance = 54;

    const scored = candidates.map(candidate => {
      const probe = {
        x: actor.x + candidate.x * probeDistance,
        y: actor.y + candidate.y * probeDistance,
      };

      let score = distance(probe, threat);

      if (healer?.alive) {
        if (this.hasHealerSupport(probe, healer, actor.radius)) {
          score += 260;
        } else {
          score -= 220;
        }

        const supportRange = this.healerSupportRange(healer);
        const healerDistance = distance(probe, healer);
        if (healerDistance > supportRange * 0.92) {
          score -= (healerDistance - supportRange * 0.92) * 1.6;
        }
      }

      return { candidate, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].candidate;
  }

  hasHealerSupport(actorOrPoint, healer, actorRadius = null) {
    if (!healer?.alive) return true;

    const radius = actorRadius ?? actorOrPoint.radius ?? 0;
    const supportRange = this.healerSupportRange(healer);
    const inRange = distance(actorOrPoint, healer) <= supportRange + radius + healer.radius;
    const los = hasLineOfSight(actorOrPoint, healer, this.game.arena.obstacles);

    return inRange && los;
  }

  healerSupportRange(healer) {
    const allyRanges = healer.spells
      .filter(spell => spell.target === "ally")
      .map(spell => spell.range || 0);

    return allyRanges.length > 0 ? Math.max(...allyRanges) : 330;
  }

  healerSupportVector(actor, healer, threat = null) {
    const towardHealer = this.steer(actor, healer, 1);
    if (!threat) return towardHealer;

    const awayFromThreat = normalize(actor.x - threat.x, actor.y - threat.y);
    const combined = normalize(
      towardHealer.x * 1.15 + awayFromThreat.x * 0.55,
      towardHealer.y * 1.15 + awayFromThreat.y * 0.55,
    );

    if (
      (combined.x !== 0 || combined.y !== 0)
      && !this.movement.wouldCollide(actor, combined, Math.max(16, actor.radius * 0.9), this.game.arena)
    ) {
      return combined;
    }

    return towardHealer;
  }

  shouldPullForControlledHealer(actor, target) {
    if (actor.config.ai.repositionWhenHealerControlled === false) return false;

    const healer = this.getTeamHealer(actor);
    if (!healer || !this.game.cc.isHardControlled(healer)) return false;

    return !hasLineOfSight(healer, target, this.game.arena.obstacles);
  }

  healerLosPullVector(actor, target) {
    const healer = this.getTeamHealer(actor);
    if (!healer) return { x: 0, y: 0 };

    const pullDistance = actor.config.ai.healerLosPullDistance ?? 115;
    const healerToTarget = normalize(target.x - healer.x, target.y - healer.y);

    const pullPoint = {
      x: healer.x + healerToTarget.x * pullDistance,
      y: healer.y + healerToTarget.y * pullDistance,
    };

    const distToPullPoint = distance(actor, pullPoint);

    if (distToPullPoint > 52) {
      return this.steer(actor, pullPoint, 1);
    }

    const sign = stableHash(actor.id + ":healer-pull") % 2 === 0 ? 1 : -1;
    const side = {
      x: -healerToTarget.y * sign,
      y: healerToTarget.x * sign,
    };

    if (!this.movement.wouldCollide(actor, side, Math.max(16, actor.radius * 0.9), this.game.arena)) {
      return side;
    }

    return this.steer(actor, healer, 1);
  }

  getTeamHealer(actor) {
    return this.game.actors.find(candidate =>
      candidate.alive
      && candidate.team === actor.team
      && candidate.role === "healer"
    );
  }

  steer(actor, target, toward = 1) {
    const direct = normalize((target.x - actor.x) * toward, (target.y - actor.y) * toward);

    if (!this.movement.wouldCollide(actor, direct, Math.max(14, actor.radius * 0.8), this.game.arena)) {
      return direct;
    }

    const sign = stableHash(actor.id) % 2 === 0 ? 1 : -1;
    const side = { x: -direct.y * sign, y: direct.x * sign };

    const candidates = [
      normalize(direct.x * 0.25 + side.x, direct.y * 0.25 + side.y),
      normalize(direct.x * 0.25 - side.x, direct.y * 0.25 - side.y),
      side,
      { x: -side.x, y: -side.y },
    ];

    for (const candidate of candidates) {
      if (!this.movement.wouldCollide(actor, candidate, Math.max(16, actor.radius * 0.9), this.game.arena)) {
        return candidate;
      }
    }

    // Do not give up here. A zero vector means moveAI never runs, so its
    // alternate-angle and stuck-recovery logic cannot help at a pillar corner.
    return direct;
  }
}
