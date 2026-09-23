export class Actor {
  constructor(config, spawn) {
    this.config = config;
    this.id = config.id; this.name = config.name; this.team = config.team;
    this.role = config.role; this.control = config.control;
    this.x = spawn.x; this.y = spawn.y; this.facing = spawn.facing || 0;
    this.maxHealth = config.stats.maxHealth; this.health = this.maxHealth;
    this.radius = config.stats.radius; this.moveSpeed = config.stats.moveSpeed;
    this.hitChance = config.stats.hitChance; this.critChance = config.stats.critChance;
    this.dodgeChance = config.stats.dodgeChance; this.critMultiplier = config.stats.critMultiplier || 1.5;
    this.spells = config.spells;
    this.cooldowns = new Map(); this.effects = []; this.cast = null; this.gcdRemaining = 0;
    this.targetId = null; this.aiTargetId = null; this.lastMove = { x: 0, y: 0 };
  }
  get alive() { return this.health > 0; }
  get healthPct() { return this.health / this.maxHealth; }
  getSpell(spellId) { return this.spells.find(spell => spell.id === spellId); }
  cooldownFor(spellId) { return this.cooldowns.get(spellId) || 0; }
  hasEffect(spellId, sourceId = null) {
    return this.effects.some(effect =>
      effect.spellId === spellId && (!sourceId || effect.sourceId === sourceId) && effect.remainingMs > 0
    );
  }
  damageReduction() {
    return this.effects
      .filter(effect => effect.kind === "damageReduction" && effect.remainingMs > 0)
      .reduce((total, effect) => 1 - (1 - total) * (1 - effect.value), 0);
  }
}
