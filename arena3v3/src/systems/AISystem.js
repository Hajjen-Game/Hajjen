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

  healerThink(actor) {
    const utility = actor.spells.find(spell => spell.aiRole === "panicCc");

    if (utility && this.ready(actor, utility)) {
      const effect = utility.effects.find(item => item.kind === "fearAoE");
      const closeEnemy = this.game.actors.find(candidate =>
        candidate.alive
        && candidate.team !== actor.team
        && distance(actor, candidate) <= (effect?.radius || 0) + actor.radius + candidate.radius
      );

      if (closeEnemy && this.castIfPossible(actor, utility, actor)) return;
    }

    const allies = this.game.actors
      .filter(candidate => candidate.alive && candidate.team === actor.team)
      .sort((a, b) => a.healthPct - b.healthPct);

    const target = allies[0];
    if (!target) return;

    actor.aiTargetId = target.id;

    const rotation = actor.spells.filter(spell => !spell.utility);
    const [hot, quick, big, cooldown] = rotation;

    if (target.healthPct < 0.38 && this.ready(actor, cooldown) && this.castIfPossible(actor, cooldown, target)) return;
    if (target.healthPct < 0.72 && this.ready(actor, big) && this.castIfPossible(actor, big, target)) return;

    if (
      target.healthPct < 0.9
      && !target.hasEffect(hot.id, actor.id)
      && this.ready(actor, hot)
      && this.castIfPossible(actor, hot, target)
    ) return;

    if (target.healthPct < 0.94 && this.ready(actor, quick)) {
      this.castIfPossible(actor, quick, target);
    }
  }

  damageThink(actor) {
    const enemies = this.game.actors.filter(candidate =>
      candidate.alive && candidate.team !== actor.team,
    );
    if (enemies.length === 0) return;

    const interrupt = actor.spells.find(spell => spell.aiRole === "interrupt");

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

    const control = actor.spells.find(spell => spell.aiRole === "control");

    if (control && this.ready(actor, control)) {
      const priorityRoles = actor.config.ai.ccTargetRoles || ["healer", "caster"];
      let controlTarget = null;

      for (const role of priorityRoles) {
        controlTarget = enemies.find(candidate =>
          candidate.role === role
          && !this.game.cc.isHardControlled(candidate)
          && this.game.combat.inRange(actor, candidate, control.range)
          && this.game.combat.hasLos(actor, candidate)
        );

        if (controlTarget) break;
      }

      if (controlTarget && this.castIfPossible(actor, control, controlTarget)) return;
    }

    let target = this.game.getActor(actor.aiTargetId);
    const lowest = [...enemies].sort((a, b) => a.healthPct - b.healthPct)[0];

    if (!target?.alive || lowest.healthPct < 0.24) {
      target = lowest.healthPct < 0.24 ? lowest : this.pickPriorityTarget(actor, enemies);
      actor.aiTargetId = target.id;
    }

    const rotation = actor.spells.filter(spell => !spell.utility);
    const [periodic, quick, big, cooldown] = rotation;

    if (target.healthPct < 0.68 && this.ready(actor, cooldown) && this.castIfPossible(actor, cooldown, target)) return;

    if (
      !target.hasEffect(periodic.id, actor.id)
      && this.ready(actor, periodic)
      && this.castIfPossible(actor, periodic, target)
    ) return;

    if (this.ready(actor, big) && this.castIfPossible(actor, big, target)) return;
    if (this.ready(actor, quick)) this.castIfPossible(actor, quick, target);
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
