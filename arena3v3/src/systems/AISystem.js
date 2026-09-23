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

    const defensive = this.spell(actor, "defensiveSelf");
    if (defensive && actor.healthPct < 0.42 && this.ready(actor, defensive)) {
      if (this.castIfPossible(actor, defensive, actor)) return;
    }

    const interrupt = this.spell(actor, "interrupt");
    if (interrupt && this.ready(actor, interrupt)) {
      const interruptTarget = enemies
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
      const closeMelee = enemies.find(candidate =>
        candidate.role === "melee"
        && distance(actor, candidate) <= radius + actor.radius + candidate.radius
      );
      if (closeMelee && this.castIfPossible(actor, panicRoot, actor)) return;
    }

    const oomHealer = this.findOomHealerTarget(actor, enemies);
    if (oomHealer && actor.aiTargetId !== oomHealer.id) {
      actor.aiTargetId = oomHealer.id;
      this.game.log(actor.name + " switches pressure to " + oomHealer.name + " — healer is out of mana.");
    }

    let target = this.game.getActor(actor.aiTargetId);
    const lowest = [...enemies].sort((a, b) => a.healthPct - b.healthPct)[0];

    if (oomHealer) {
      target = oomHealer;
      actor.aiTargetId = oomHealer.id;
    } else if (!target?.alive || lowest.healthPct < 0.24) {
      target = lowest.healthPct < 0.24 ? lowest : this.pickPriorityTarget(actor, enemies);
      actor.aiTargetId = target.id;
    }

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
      const controlTarget = this.pickCcTarget(actor, enemies, control);
      if (controlTarget && this.castIfPossible(actor, control, controlTarget)) return;
    }

    const periodic = this.spell(actor, "periodic");
    const big = this.spell(actor, "bigDamage");
    const filler = this.spell(actor, "filler");

    if (
      periodic
      && this.ready(actor, periodic)
      && !target.hasEffect(periodic.id, actor.id)
      && this.castIfPossible(actor, periodic, target)
    ) return;

    if (big && this.ready(actor, big) && this.castIfPossible(actor, big, target)) return;
    if (filler && this.ready(actor, filler)) this.castIfPossible(actor, filler, target);
  }

  pickCcTarget(actor, enemies, spell) {
    const priorityRoles = actor.config.ai.ccTargetRoles || ["healer", "caster"];

    for (const role of priorityRoles) {
      const target = enemies.find(candidate =>
        candidate.role === role
        && !this.game.cc.isHardControlled(candidate)
        && !this.game.cc.isRooted(candidate)
        && this.game.combat.inRange(actor, candidate, spell.range)
        && this.game.combat.hasLos(actor, candidate)
      );
      if (target) return target;
    }

    return null;
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

    if (actor.role !== "healer" && this.shouldPullForControlledHealer(actor, target)) {
      const pullVector = this.healerLosPullVector(actor, target);

      if (pullVector.x !== 0 || pullVector.y !== 0) {
        this.movement.move(actor, pullVector, deltaSeconds, this.game.arena);
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
      this.movement.move(actor, vector, deltaSeconds, this.game.arena);
    }
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

    if (!this.movement.wouldCollide(actor, side, actor.radius + 24, this.game.arena)) {
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

    if (!this.movement.wouldCollide(actor, direct, actor.radius + 20, this.game.arena)) {
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
      if (!this.movement.wouldCollide(actor, candidate, actor.radius + 22, this.game.arena)) {
        return candidate;
      }
    }

    return { x: 0, y: 0 };
  }
}
