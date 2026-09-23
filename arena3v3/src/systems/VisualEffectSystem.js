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

  chain(actorIds, style = "lightning", durationMs = 360) {
    if (!actorIds || actorIds.length < 2) return;
    this.add("chain", {
      actorIds: [...actorIds],
      style,
      seed: this.nextId * 17,
    }, durationMs);
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
      "mage-pyroblast": 620,
      "warlock-chaos-bolt": 620,
      "shaman-lava-burst": 560,
      "priest-greater-heal": 560,
      "paladin-holy-light": 560,
      "druid-regrowth": 520,
      "warrior-charge": 520,
    };

    this.add("spell", {
      sourceId: source.id,
      targetId: target.id,
      sourceX: source.x,
      sourceY: source.y,
      targetX: target.x,
      targetY: target.y,
      spellId,
      style,
      missed,
      seed: this.nextId * 37,
    }, durations[spellId] || 420);
  }
}
