export class GroundEffectSystem {
  constructor(game) {
    this.game = game;
    this.effects = [];
    this.nextId = 1;
  }

  reset() {
    this.effects = [];
    this.nextId = 1;
  }

  add(source, spell, effect, point) {
    if (!source || !spell || !effect || !point) return null;

    const durationMs = Math.max(1, Number(effect.durationMs) || 1);
    const zone = {
      id: this.nextId++,
      kind: effect.kind,
      spellId: spell.id,
      sourceId: source.id,
      team: source.team,
      x: Number(point.x) || 0,
      y: Number(point.y) || 0,
      radius: Math.max(1, Number(effect.radius) || 1),
      value: Math.max(0, Number(effect.value) || 0),
      durationMs,
      remainingMs: durationMs,
      visualStyle: spell.visualStyle || source.visualStyle || "priest",
    };

    this.effects.push(zone);
    return zone;
  }

  update(deltaMs) {
    for (const effect of this.effects) {
      effect.remainingMs -= deltaMs;
    }
    this.effects = this.effects.filter(effect => effect.remainingMs > 0);
  }

  damageReductionFor(actor) {
    if (!actor?.alive) return 0;

    let combined = 0;

    for (const effect of this.effects) {
      if (
        effect.remainingMs <= 0
        || effect.kind !== "groundBarrier"
        || effect.team !== actor.team
      ) continue;

      const distance = Math.hypot(actor.x - effect.x, actor.y - effect.y);
      if (distance > effect.radius + Math.max(0, actor.radius * 0.25)) continue;

      combined = 1 - (1 - combined) * (1 - Math.min(0.75, effect.value));
    }

    return Math.max(0, Math.min(0.85, combined));
  }
}
