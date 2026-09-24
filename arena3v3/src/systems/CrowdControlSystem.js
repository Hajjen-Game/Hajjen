import { distance, normalize } from "../core/utils.js";

const HARD_CONTROL = new Set(["fear", "incapacitate", "stun"]);
const DR_RESET_MS = 20000;

const DR_LABELS = Object.freeze({
  stun: "STUN",
  incapacitate: "INCAP",
  disorient: "DISORIENT",
  root: "ROOT",
});

function drCategoryForEffect(effect) {
  if (!effect) return null;

  if (Object.prototype.hasOwnProperty.call(effect, "drCategory")) {
    return effect.drCategory || null;
  }

  if (effect.kind === "stun") return "stun";
  if (effect.kind === "incapacitate") return "incapacitate";
  if (effect.kind === "fear" || effect.kind === "fearAoE") return "disorient";
  if (effect.kind === "root" || effect.kind === "rootAoE") return "root";
  return null;
}

export class CrowdControlSystem {
  constructor(game) {
    this.game = game;
  }

  nowMs() {
    return this.game.elapsedSeconds * 1000;
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

  shouldAvoidBreakingFriendlyCc(actor, target) {
    if (!actor?.alive || !target?.alive) return false;

    return target.effects.some(effect => {
      if (effect.remainingMs <= 0 || !effect.breakOnDamage) return false;
      if (!["fear", "incapacitate", "root"].includes(effect.kind)) return false;

      const source = this.game.getActor(effect.sourceId);
      return source?.team === actor.team;
    });
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

  normalizeDrState(target, category) {
    if (!category || !target?.drStates) return null;

    const state = target.drStates.get(category);
    if (!state) return null;

    if (state.resetAtMs !== null && this.nowMs() >= state.resetAtMs) {
      target.drStates.delete(category);
      return null;
    }

    return state;
  }

  syncDrStates(target) {
    if (!target?.drStates || target.drStates.size === 0) return;

    const now = this.nowMs();

    for (const [category, state] of [...target.drStates.entries()]) {
      if (state.resetAtMs !== null && now >= state.resetAtMs) {
        target.drStates.delete(category);
        continue;
      }

      const active = target.effects.some(effect =>
        effect.remainingMs > 0 && effect.drCategory === category
      );

      if (active) {
        state.resetAtMs = null;
      } else if (state.resetAtMs === null) {
        state.resetAtMs = now + DR_RESET_MS;
      }
    }
  }

  drCategoryForSpell(spell) {
    for (const effect of spell?.effects || []) {
      const category = drCategoryForEffect(effect);
      if (category) return category;
    }
    return null;
  }

  wouldBeImmune(target, spell) {
    const category = this.drCategoryForSpell(spell);
    if (!category) return false;

    this.syncDrStates(target);
    const state = this.normalizeDrState(target, category);
    return (state?.applications || 0) >= 2;
  }

  drStatuses(target) {
    this.syncDrStates(target);
    const now = this.nowMs();
    const statuses = [];

    for (const [category, state] of target?.drStates || []) {
      if (state.applications <= 0) continue;

      const activeEffects = target.effects.filter(effect =>
        effect.remainingMs > 0 && effect.drCategory === category
      );
      const activeRemainingMs = activeEffects.reduce(
        (highest, effect) => Math.max(highest, effect.remainingMs),
        0,
      );

      const resetRemainingMs = state.resetAtMs === null
        ? activeRemainingMs + DR_RESET_MS
        : Math.max(0, state.resetAtMs - now);

      statuses.push({
        category,
        label: DR_LABELS[category] || category.toUpperCase(),
        applications: state.applications,
        nextMultiplier: state.applications >= 2 ? 0 : 0.5,
        immune: state.applications >= 2,
        active: activeRemainingMs > 0,
        resetRemainingMs,
      });
    }

    return statuses.sort((a, b) => a.label.localeCompare(b.label));
  }

  applyDr(source, target, spell, effect) {
    const category = drCategoryForEffect(effect);
    const baseDurationMs = Math.max(0, Number(effect.durationMs) || 0);

    if (!category || baseDurationMs <= 0) {
      return {
        immune: false,
        category: null,
        durationMs: baseDurationMs,
        multiplier: 1,
      };
    }

    this.syncDrStates(target);
    let state = this.normalizeDrState(target, category);

    if (!state) {
      state = { applications: 0, resetAtMs: null };
      target.drStates.set(category, state);
    }

    if (state.applications >= 2) {
      const label = DR_LABELS[category] || category.toUpperCase();
      this.game.addFloatingText(target, "IMMUNE", "avoid");
      this.game.log(
        target.name + " is immune to " + spell.name + " — " + label + " DR.",
      );
      return {
        immune: true,
        category,
        durationMs: 0,
        multiplier: 0,
      };
    }

    const multiplier = state.applications === 0 ? 1 : 0.5;
    const durationMs = Math.max(1, Math.round(baseDurationMs * multiplier));

    state.applications += 1;
    state.resetAtMs = null;

    return {
      immune: false,
      category,
      durationMs,
      multiplier,
    };
  }

  drLogSuffix(dr) {
    return dr?.multiplier === 0.5 ? " · 50% DR" : "";
  }

  applyFear(source, target, spell, effect) {
    if (!target.alive) return false;

    const dr = this.applyDr(source, target, spell, effect);
    if (dr.immune) return false;

    this.removeHardControl(target);
    this.cancelTargetCast(target, "fear");

    target.effects.push({
      kind: "fear",
      spellId: spell.id,
      sourceId: source.id,
      drCategory: dr.category,
      durationMs: dr.durationMs,
      remainingMs: dr.durationMs,
      breakOnDamage: effect.breakOnDamage !== false,
      originX: source.x,
      originY: source.y,
    });
    this.syncDrStates(target);

    this.game.vfx.burst(target, spell.visualStyle || source.visualStyle || "fear", 340);
    this.game.recordCc(source, target, "fear", dr.durationMs);
    this.game.addFloatingText(target, "FEAR", "cc");
    this.game.log(
      source.name + " fears " + target.name + " for "
      + (dr.durationMs / 1000).toFixed(1) + "s"
      + this.drLogSuffix(dr) + ".",
    );
    return true;
  }

  applyFearAoE(source, spell, effect) {
    let affected = 0;
    this.game.vfx.ring(
      source,
      spell.visualStyle || source.visualStyle || "fear",
      source.radius + 10,
      effect.radius,
      430,
    );

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
      this.game.log(source.name + "'s " + spell.name + " hits no controllable targets.");
    }

    return affected > 0;
  }

  applyIncapacitate(source, target, spell, effect) {
    if (!target.alive) return false;

    const dr = this.applyDr(source, target, spell, effect);
    if (dr.immune) return false;

    this.removeHardControl(target);
    this.cancelTargetCast(target, "crowd control");

    target.effects.push({
      kind: "incapacitate",
      spellId: spell.id,
      sourceId: source.id,
      drCategory: dr.category,
      durationMs: dr.durationMs,
      remainingMs: dr.durationMs,
      breakOnDamage: effect.breakOnDamage !== false,
    });
    this.syncDrStates(target);

    const style = spell.visualStyle || source.visualStyle || "control";
    this.game.vfx.beam(source, target, style, 250);
    this.game.vfx.burst(target, style, 360);
    this.game.recordCc(source, target, "incapacitate", dr.durationMs);
    this.game.addFloatingText(target, "CONTROLLED", "cc");
    this.game.log(
      source.name + " incapacitates " + target.name + " for "
      + (dr.durationMs / 1000).toFixed(1) + "s"
      + this.drLogSuffix(dr) + ".",
    );
    return true;
  }

  applyStun(source, target, spell, effect) {
    if (!target.alive) return false;

    const dr = this.applyDr(source, target, spell, effect);
    if (dr.immune) return false;

    this.removeHardControl(target);
    this.cancelTargetCast(target, "stun");

    target.effects.push({
      kind: "stun",
      spellId: spell.id,
      sourceId: source.id,
      drCategory: dr.category,
      durationMs: dr.durationMs,
      remainingMs: dr.durationMs,
      breakOnDamage: false,
    });
    this.syncDrStates(target);

    const style = spell.visualStyle || source.visualStyle || "control";
    this.game.vfx.burst(target, style, 360);
    this.game.recordCc(source, target, "stun", dr.durationMs);
    this.game.addFloatingText(target, "STUNNED", "cc");
    this.game.log(
      source.name + " stuns " + target.name + " for "
      + (dr.durationMs / 1000).toFixed(1) + "s"
      + this.drLogSuffix(dr) + ".",
    );
    return true;
  }

  applyRoot(source, target, spell, effect) {
    if (!target.alive) return false;

    const dr = this.applyDr(source, target, spell, effect);
    if (dr.immune) return false;

    target.effects = target.effects.filter(existing =>
      !(existing.kind === "root" && existing.sourceId === source.id)
    );

    target.effects.push({
      kind: "root",
      spellId: spell.id,
      sourceId: source.id,
      drCategory: dr.category,
      durationMs: dr.durationMs,
      remainingMs: dr.durationMs,
      breakOnDamage: effect.breakOnDamage === true,
    });
    this.syncDrStates(target);

    const style = spell.visualStyle || source.visualStyle || "control";
    this.game.vfx.ring(target, style, target.radius + 2, target.radius + 24, 360);
    this.game.recordCc(source, target, "root", dr.durationMs);
    this.game.addFloatingText(target, "ROOTED", "cc");
    this.game.log(
      source.name + " roots " + target.name + " for "
      + (dr.durationMs / 1000).toFixed(1) + "s"
      + this.drLogSuffix(dr) + ".",
    );
    return true;
  }

  applyRootAoE(source, spell, effect) {
    let affected = 0;
    this.game.vfx.ring(
      source,
      spell.visualStyle || source.visualStyle || "control",
      source.radius + 8,
      effect.radius,
      420,
    );

    for (const target of this.game.actors.filter(actor => actor.alive && actor.team !== source.team)) {
      if (distance(source, target) > effect.radius + source.radius + target.radius) continue;
      if (!this.game.combat.hasLos(source, target)) continue;
      if (this.applyRoot(source, target, spell, effect)) affected += 1;
    }

    return affected > 0;
  }

  interrupt(source, target, spell, effect) {
    if (!target.alive || !target.cast) {
      this.game.log(source.name + "'s " + spell.name + " finds no cast to interrupt.");
      return false;
    }

    const interruptedSpell = target.getSpell(target.cast.spellId);
    const interruptedName = interruptedSpell?.name || "cast";

    if (interruptedSpell?.interruptible === false) {
      this.game.log(
        source.name + "'s " + spell.name + " cannot interrupt " + target.name + "'s " + interruptedName + ".",
      );
      return false;
    }

    const lockedSchool = interruptedSpell?.school || (target.role === "melee" ? "physical" : "magic");

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

    const style = spell.visualStyle || source.visualStyle || "interrupt";
    this.game.vfx.beam(source, target, style, 180);
    this.game.vfx.slash(target, style, 300);
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
      && (HARD_CONTROL.has(effect.kind) || effect.kind === "root")
    );

    if (broken.length === 0) return;

    target.effects = target.effects.filter(effect => !broken.includes(effect));
    this.syncDrStates(target);
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
