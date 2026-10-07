import { ownsCasterVfx2Impact, vfx2DurationFor } from "./MageShamanVfxProfile.js?v=20260930-vfx2e";

// Ranged projectiles were visually crossing the arena too quickly to read the
// VFX 3.0 silhouettes/trails. Keep casts, melee, sky spells and CC timing as-is;
// only true travelling projectiles get a longer visual flight on this pass.
const SHOWCASE_PROJECTILE_SPELLS = new Set([
  "mage-frostbolt",
  "mage-pyroblast",
  "mage-frostfire-bolt",
  "mage-arcane-barrage",
  "shaman-lava-burst",
  "shaman-elemental-blast",
  "warlock-shadow-bolt",
  "warlock-chaos-bolt",
  "paladin-hammer",
]);

const SHOWCASE_PROJECTILE_DURATION_MULTIPLIER = 1.35;

// Signature melee weapon animations need enough screen time to read as an
// actual swing/thrust rather than a single-frame slash. These multipliers are
// visual-only; combat resolution, GCDs, cooldowns and damage timing are unchanged.
const SHOWCASE_SIGNATURE_MELEE_DURATION_MULTIPLIERS = new Map([
  ["warrior-mortal-strike", 1.35],
  ["warrior-rend", 1.22],
  ["warrior-slam", 1.18],
  ["warrior-overpower", 1.22],
  ["warrior-bloodthirst", 1.20],
  ["rogue-garrote", 1.22],
  ["rogue-sinister", 1.25],
  ["rogue-eviscerate", 1.20],
  ["rogue-mutilate", 1.20],
  ["dk-death-strike", 1.16],
  ["dk-obliterate", 1.12],
  ["dk-frost-strike", 1.16],
  ["shaman-stormstrike", 1.18],
]);

export class VisualEffectSystem {
  constructor() {
    this.effects = [];
    this.nextId = 1;
  }

  reset() {
    this.effects = [];
    this.nextId = 1;
  }

  update(deltaMs) {
    for (const effect of this.effects) {
      effect.remainingMs -= deltaMs;
    }
    this.effects = this.effects.filter(effect => effect.remainingMs > 0);
  }

  add(type, data = {}, durationMs = 260) {
    this.effects.push({
      id: this.nextId++,
      type,
      totalMs: durationMs,
      remainingMs: durationMs,
      ...data,
    });
  }

  beam(source, target, style = "damage", durationMs = 220) {
    this.add("beam", {
      sourceId: source.id,
      targetId: target.id,
      style,
    }, durationMs);
  }

  burst(target, style = "damage", durationMs = 260) {
    this.add("burst", {
      targetId: target.id,
      x: target.x,
      y: target.y,
      style,
    }, durationMs);
  }

  ring(source, style = "fear", radiusStart = 28, radiusEnd = 135, durationMs = 420) {
    this.add("ring", {
      sourceId: source.id,
      x: source.x,
      y: source.y,
      style,
      radiusStart,
      radiusEnd,
    }, durationMs);
  }

  chain(actorIds, style = "lightning", durationMs = 360, spellId = "") {
    if (!actorIds || actorIds.length < 2) return;
    this.add("chain", {
      actorIds: [...actorIds],
      style,
      spellId,
      seed: this.nextId * 17,
    }, durationMs);
  }

  secondary(source, target, spellId, style = "damage", durationMs = 420) {
    if (!source || !target || !spellId) return;
    this.add("secondary", {
      sourceId: source.id,
      targetId: target.id,
      spellId,
      style,
      seed: this.nextId * 29,
    }, durationMs);
  }

  ownsImpact(spellId = "") {
    return ownsCasterVfx2Impact(spellId);
  }

  slash(target, style = "interrupt", durationMs = 280) {
    this.add("slash", {
      targetId: target.id,
      x: target.x,
      y: target.y,
      style,
    }, durationMs);
  }

  spell(source, target, spellId, style = "damage", missed = false) {
    if (!source || !target || !spellId) return;

    const durations = {
      "warlock-chaos-bolt": 720,
      "warlock-shadow-bolt": 540,
      "paladin-holy-shock": 520,
      "priest-greater-heal": 650,
      "paladin-holy-light": 650,
      "druid-regrowth": 620,
      "warrior-charge": 260,
    };

    const layeredDuration = ownsCasterVfx2Impact(spellId)
      ? vfx2DurationFor(spellId)
      : null;

    const baseDuration = layeredDuration || durations[spellId] || 520;
    let visualDuration = baseDuration;

    if (SHOWCASE_PROJECTILE_SPELLS.has(spellId)) {
      visualDuration = Math.round(
        baseDuration * SHOWCASE_PROJECTILE_DURATION_MULTIPLIER,
      );
    } else {
      const meleeMultiplier =
        SHOWCASE_SIGNATURE_MELEE_DURATION_MULTIPLIERS.get(spellId);
      if (meleeMultiplier) {
        visualDuration = Math.round(baseDuration * meleeMultiplier);
      }
    }

    this.add("spell", {
      sourceId: source.id,
      targetId: target.id,
      sourceX: source.x,
      sourceY: source.y,
      targetX: target.x,
      targetY: target.y,
      spellId,
      style,
      // Combat already resolved the miss/dodge before the VFX is emitted.
      // Keep the full spell/melee animation aimed at the target so misses read
      // through floating MISS/DODGE text instead of looking like bad aim.
      missed: false,
      outcomeMissed: Boolean(missed),
      seed: this.nextId * 37,
    }, visualDuration);
  }
}
