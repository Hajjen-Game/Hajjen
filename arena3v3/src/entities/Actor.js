export class Actor {
  constructor(config, spawn) {
    this.config = config;
    this.id = config.id;
    this.name = config.name;
    this.className = config.className || config.displayName || config.name;
    this.classId = config.classId || "";
    this.visualStyle = config.visualStyle || "damage";
    this.team = config.team;
    this.role = config.role;
    this.control = config.control;

    this.x = spawn.x;
    this.y = spawn.y;
    this.facing = spawn.facing || 0;

    this.maxHealth = config.stats.maxHealth;
    this.health = this.maxHealth;
    this.radius = config.stats.radius;
    this.moveSpeed = config.stats.moveSpeed;
    this.hitChance = config.stats.hitChance;
    this.critChance = config.stats.critChance;
    this.dodgeChance = config.stats.dodgeChance;
    this.critMultiplier = config.stats.critMultiplier || 1.5;

    const resource = config.resource || { type: "none", max: 0, start: 0, regenPerSecond: 0 };
    this.resource = {
      type: resource.type,
      max: resource.max,
      value: resource.start ?? resource.max,
      regenPerSecond: resource.regenPerSecond ?? 0,
    };

    this.spells = config.spells;
    this.cooldowns = new Map();
    this.effects = [];
    this.cast = null;
    this.gcdRemaining = 0;
    this.targetId = null;
    this.aiTargetId = null;
    this.lastMove = { x: 0, y: 0 };
  }

  get alive() {
    return this.health > 0;
  }

  get healthPct() {
    return this.maxHealth > 0 ? this.health / this.maxHealth : 0;
  }

  get resourcePct() {
    return this.resource.max > 0 ? this.resource.value / this.resource.max : 0;
  }

  getSpell(spellId) {
    return this.spells.find(spell => spell.id === spellId);
  }

  cooldownFor(spellId) {
    return this.cooldowns.get(spellId) || 0;
  }

  hasEffect(spellId, sourceId = null) {
    return this.effects.some(effect =>
      effect.spellId === spellId
      && (!sourceId || effect.sourceId === sourceId)
      && effect.remainingMs > 0
    );
  }

  damageReduction() {
    return this.effects
      .filter(effect => effect.kind === "damageReduction" && effect.remainingMs > 0)
      .reduce((total, effect) => 1 - (1 - total) * (1 - effect.value), 0);
  }

  healingReduction() {
    return this.effects
      .filter(effect => effect.kind === "healingReduction" && effect.remainingMs > 0)
      .reduce((highest, effect) => Math.max(highest, effect.value || 0), 0);
  }
}
