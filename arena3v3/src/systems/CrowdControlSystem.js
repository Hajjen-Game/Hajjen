import { distance, normalize } from "../core/utils.js";

const HARD_CONTROL = new Set(["fear", "incapacitate"]);

export class CrowdControlSystem {
  constructor(game) {
    this.game = game;
  }

  hasKind(actor, kind) {
    return actor.effects.some(effect => effect.kind === kind && effect.remainingMs > 0);
  }

  isHardControlled(actor) {
    return actor.effects.some(effect => HARD_CONTROL.has(effect.kind) && effect.remainingMs > 0);
  }

  isRooted(actor) {
    return this.hasKind(actor, "root");
  }

  isSchoolLocked(actor, spell) {
    const school = spell.school || (actor.role === "melee" ? "physical" : "magic");
    return actor.effects.some(effect =>
      effect.kind === "schoolLock"
      && effect.remainingMs > 0
      && (effect.lockedSchool === "all" || effect.lockedSchool === school)
    );
  }

  forcedFearVector(actor) {
    const fear = actor.effects.find(effect => effect.kind === "fear" && effect.remainingMs > 0);
    if (!fear) return { x: 0, y: 0 };

    const source = this.game.getActor(fear.sourceId);
    const origin = source || { x: fear.originX ?? actor.x - 1, y: fear.originY ?? actor.y };
    return normalize(actor.x - origin.x, actor.y - origin.y);
  }

  applyFear(source, target, spell, effect) {
    if (!target.alive) return false;

    this.removeHardControl(target);
    this.cancelTargetCast(target, "fear");

    target.effects.push({
      kind: "fear",
      spellId: spell.id,
      sourceId: source.id,
      durationMs: effect.durationMs,
      remainingMs: effect.durationMs,
      breakOnDamage: effect.breakOnDamage !== false,
      originX: source.x,
      originY: source.y,
    });

    this.game.vfx.burst(target, "fear", 340);
    this.game.recordCc(source, target, "fear", effect.durationMs);
    this.game.addFloatingText(target, "FEAR", "cc");
    this.game.log(source.name + " fears " + target.name + " for " + (effect.durationMs / 1000).toFixed(1) + "s.");
    return true;
  }

  applyFearAoE(source, spell, effect) {
    let affected = 0;
    this.game.vfx.ring(source, "fear", source.radius + 10, effect.radius, 430);

    for (const target of this.game.actors.filter(actor => actor.alive && actor.team !== source.team)) {
      if (distance(source, target) > effect.radius + source.radius + target.radius) continue;
      if (!this.game.combat.hasLos(source, target)) continue;

      if (!spell.noHitRoll) {
        const outcome = this.game.combat.rollHit(source, target, spell.id + ":fear");
        if (outcome !== "hit") {
          this.game.recordAvoidance(source, target, outcome);
          this.game.addFloatingText(target, outcome.toUpperCase(), "avoid");
          continue;
        }
      }

      if (this.applyFear(source, target, spell, effect)) affected += 1;
    }

    if (affected === 0) {
      this.game.log(source.name + "'s " + spell.name + " hits no targets.");
    }

    return affected > 0;
  }

  applyIncapacitate(source, target, spell, effect) {
    if (!target.alive) return false;

    this.removeHardControl(target);
    this.cancelTargetCast(target, "crowd control");

    target.effects.push({
      kind: "incapacitate",
      spellId: spell.id,
      sourceId: source.id,
      durationMs: effect.durationMs,
      remainingMs: effect.durationMs,
      breakOnDamage: effect.breakOnDamage !== false,
    });

    this.game.vfx.beam(source, target, "control", 250);
    this.game.vfx.burst(target, "control", 360);
    this.game.recordCc(source, target, "incapacitate", effect.durationMs);
    this.game.addFloatingText(target, "CONTROLLED", "cc");
    this.game.log(source.name + " incapacitates " + target.name + " for " + (effect.durationMs / 1000).toFixed(1) + "s.");
    return true;
  }

  interrupt(source, target, spell, effect) {
    if (!target.alive || !target.cast) {
      this.game.log(source.name + "'s " + spell.name + " finds no cast to interrupt.");
      return false;
    }

    const interruptedSpell = target.getSpell(target.cast.spellId);
    const lockedSchool = interruptedSpell?.school || (target.role === "melee" ? "physical" : "magic");
    const interruptedName = interruptedSpell?.name || "cast";

    target.cast = null;
    target.effects = target.effects.filter(existing => existing.kind !== "schoolLock");
    target.effects.push({
      kind: "schoolLock",
      spellId: spell.id,
      sourceId: source.id,
      lockedSchool,
      durationMs: effect.durationMs,
      remainingMs: effect.durationMs,
      breakOnDamage: false,
    });

    this.game.vfx.beam(source, target, "interrupt", 180);
    this.game.vfx.slash(target, "interrupt", 300);
    this.game.recordInterrupt(source, target, effect.durationMs);
    this.game.addFloatingText(target, "INTERRUPTED", "cc");
    this.game.log(
      source.name + " interrupts " + target.name + "'s " + interruptedName
      + " — " + lockedSchool + " locked " + (effect.durationMs / 1000).toFixed(1) + "s.",
    );
    return true;
  }

  breakOnDamage(target) {
    const broken = target.effects.filter(effect =>
      effect.remainingMs > 0
      && effect.breakOnDamage
      && HARD_CONTROL.has(effect.kind)
    );

    if (broken.length === 0) return;

    target.effects = target.effects.filter(effect => !broken.includes(effect));
    this.game.log(target.name + "'s crowd control breaks from damage.");
  }

  removeHardControl(actor) {
    actor.effects = actor.effects.filter(effect => !HARD_CONTROL.has(effect.kind));
  }

  cancelTargetCast(target, reason) {
    if (!target.cast) return;
    const spell = target.getSpell(target.cast.spellId);
    target.cast = null;

    if (target.control === "player") {
      this.game.ui?.toast((spell?.name || "Cast") + " cancelled by " + reason);
    }
  }
}
