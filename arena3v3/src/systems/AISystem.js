import { hasLineOfSight } from "../core/LineOfSight.js";
import { distance, normalize, stableHash } from "../core/utils.js";

export class AISystem {
  constructor(game, movementSystem) {
    this.game = game;
    this.movement = movementSystem;
    this.thinkTimers = new Map();
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
          actor.name + " cancels " + (spell?.name || "cast") + " to recover healer line of sight.",
        );
      }

      if (remaining <= 0) {
        this.thinkTimers.set(actor.id, 0.12 + (stableHash(actor.id) % 80) / 1000);
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

  spell(actor, aiRole) {
    return actor.spells.find(spell => spell.aiRole === aiRole);
  }

  healerThink(actor) {
    const enemies = this.game.actors.filter(candidate =>
      candidate.alive && candidate.team !== actor.team
    );

    const panicCc = this.spell(actor, "panicCc");
    if (panicCc && this.ready(actor, panicCc)) {
      const effect = panicCc.effects.find(item => ["fearAoE", "rootAoE"].includes(item.kind));
      const radius = effect?.radius || 0;
      const closeEnemy = enemies.find(candidate =>
        distance(actor, candidate) <= radius + actor.radius + candidate.radius
      );
      if (closeEnemy && this.castIfPossible(actor, panicCc, actor)) return;
    }

    const allies = this.game.actors
      .filter(candidate => candidate.alive && candidate.team === actor.team)
      .sort((a, b) => a.healthPct - b.healthPct);

    const target = allies[0];
    if (!target) return;

    actor.aiTargetId = target.id;

    const defensive = this.spell(actor, "defensive");
    const big = this.spell(actor, "bigHeal");
    const quick = this.spell(actor, "quickHeal");
    const instant = this.spell(actor, "instantHeal");
    const sustain = this.spell(actor, "sustainHot");

    if (target.healthPct < 0.42 && defensive && this.ready(actor, defensive) && this.castIfPossible(actor, defensive, target)) return;
    if (target.healthPct < 0.70 && big && this.ready(actor, big) && this.castIfPossible(actor, big, target)) return;
    if (target.healthPct < 0.82 && instant && this.ready(actor, instant) && this.castIfPossible(actor, instant, target)) return;

    if (target.healthPct < 0.90 && sustain && this.ready(actor, sustain)) {
      const hot = sustain.effects.find(effect => effect.kind === "hot");
      const shouldApply = !hot || !target.hasEffect(sustain.id, actor.id);
      if (shouldApply && this.castIfPossible(actor, sustain, target)) return;
    }

    if (target.healthPct < 0.94 && quick && this.ready(actor, quick) && this.castIfPossible(actor, quick, target)) return;

    const control = this.spell(actor, "control");
    if (control && this.ready(actor, control) && allies.every(ally => ally.healthPct > 0.55)) {
      const controlTarget = this.pickCcTarget(actor, enemies, control);
      if (controlTarget && this.castIfPossible(actor, control, controlTarget)) return;
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

    const defensive = this.spell(actor, "defensiveSelf");
    if (defensive && actor.healthPct < 0.42 && this.ready(actor, defensive)) {
      if (this.castIfPossible(actor, defensive, actor)) return;
    }

    const interrupt = this.spell(actor, "interrupt");
    if (interrupt && this.ready(actor, interrupt)) {
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
      );
      if (closeMelee && this.castIfPossible(actor, panicRoot, actor)) return;
    }

    if (damageableEnemies.length === 0) return;

    const peel = this.findPeelSituation(actor, damageableEnemies);
    const oomHealer = this.findOomHealerTarget(actor, damageableEnemies);

    let target = null;

    if (peel) {
      target = peel.attacker;
      this.beginPeel(actor, peel);
    } else if (oomHealer) {
      target = oomHealer;
      if (actor.aiTargetId !== oomHealer.id) {
        this.game.log(actor.name + " switches pressure to " + oomHealer.name + " — healer is out of mana.");
      }
      actor.aiTargetId = oomHealer.id;
      actor.aiPeelTargetId = null;
      actor.aiPeelUntil = 0;
    } else {
      const current = this.game.getActor(actor.aiTargetId);
      const currentProtected = current?.alive
        && this.game.cc.shouldAvoidBreakingFriendlyCc(actor, current);

      if (currentProtected) {
        const alternate = this.pickPriorityTarget(actor, damageableEnemies);
        if (alternate && alternate.id !== current.id) {
          this.game.log(actor.name + " swaps off " + current.name + " to preserve friendly crowd control.");
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
        controlTarget = this.pickCcTarget(actor, enemies, control);
      }

      if (controlTarget && this.castIfPossible(actor, control, controlTarget)) return;
    }

    const periodic = this.spell(actor, "periodic");
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
        && candidate.healthPct <= (actor.config.ai.peelHealthPct ?? 0.62)
      )
      .sort((a, b) => a.healthPct - b.healthPct);

    for (const ally of allies) {
      const attacker = enemies
        .filter(candidate =>
          candidate.role === "melee"
          && candidate.aiTargetId === ally.id
          && distance(candidate, ally) <= (actor.config.ai.peelThreatRange ?? 115)
          && !this.game.cc.isHardControlled(candidate)
          && !this.game.cc.isRooted(candidate)
        )
        .sort((a, b) => distance(a, ally) - distance(b, ally))[0];

      if (attacker) return { attacker, ally };
    }

    actor.aiPeelTargetId = null;
    actor.aiPeelUntil = 0;
    return null;
  }

  findThreatenedAlly(actor, attacker) {
    return this.game.actors.find(candidate =>
      candidate.alive
      && candidate.team === actor.team
      && ["healer", "caster"].includes(candidate.role)
      && candidate.id === attacker.aiTargetId
      && candidate.healthPct <= 0.72
      && distance(attacker, candidate) <= (actor.config.ai.peelThreatRange ?? 115)
    ) || null;
  }

  beginPeel(actor, peel) {
    const now = this.game.elapsedSeconds;
    const isNewPeel = actor.aiPeelTargetId !== peel.attacker.id || actor.aiPeelUntil <= now;

    actor.aiPeelTargetId = peel.attacker.id;
    actor.aiPeelUntil = now + (actor.config.ai.peelDurationSeconds ?? 4.5);
    actor.aiTargetId = peel.attacker.id;

    if (isNewPeel) {
      if (peel.ally.id === actor.id) {
        this.game.log(actor.name + " self-peels " + peel.attacker.name + ".");
      } else {
        this.game.log(
          actor.name + " peels " + peel.attacker.name + " off " + peel.ally.name + ".",
        );
      }
    }
  }

  canControlTarget(actor, target, spell) {
    if (!target?.alive) return false;
    if (this.game.cc.isHardControlled(target) || this.game.cc.isRooted(target)) return false;
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
    return this.game.combat.tryCast(actor, spell, target, { silent: true });
  }

  moveForRole(actor, target, deltaSeconds) {
    if (!target?.alive || this.game.cc.isRooted(actor)) return;

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

    if (candidates.length === 0) return { x: 0, y: 0 };

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

    return { x: 0, y: 0 };
  }
}
