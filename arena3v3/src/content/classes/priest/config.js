export const priestClass = {
  classId: "priest",
  displayName: "Priest",
  role: "healer",
  visualStyle: "priest",
  stats: {
    maxHealth: 1260, moveSpeed: 194, radius: 20,
    hitChance: 0.94, critChance: 0.17, dodgeChance: 0.05, critMultiplier: 1.5,
  },
  resource: { type: "mana", max: 100, start: 100, regenPerSecond: 4.6 },
  ai: { preferredRange: 320, ccTargetRoles: ["healer", "caster"] },
  spells: [
    {
      id: "priest-renew", name: "Renew", aiRole: "sustainHot", visualStyle: "priest",
      target: "ally", school: "holy", resourceCost: 12, castMs: 0, cooldownMs: 0, gcdMs: 1200, range: 345,
      effects: [{ kind: "hot", amount: 66, durationMs: 9000, tickMs: 3000 }],
    },
    {
      id: "priest-flash-heal", name: "Flash Heal", aiRole: "quickHeal", visualStyle: "priest",
      target: "ally", school: "holy", resourceCost: 14, castMs: 850, cooldownMs: 0, gcdMs: 1200, range: 345,
      effects: [{ kind: "heal", amount: 132 }],
    },
    {
      id: "priest-greater-heal", name: "Greater Heal", aiRole: "bigHeal", visualStyle: "priest",
      target: "ally", school: "holy", resourceCost: 24, castMs: 2100, cooldownMs: 0, gcdMs: 1200, range: 345,
      effects: [{ kind: "heal", amount: 294 }],
    },
    {
      id: "priest-pain-suppression", name: "Pain Suppression", aiRole: "defensive", visualStyle: "priest",
      target: "ally", school: "holy", resourceCost: 20, castMs: 0, cooldownMs: 18000, gcdMs: 1200, range: 345,
      effects: [{ kind: "damageReduction", value: 0.30, durationMs: 4200 }],
    },
    {
      id: "priest-psychic-scream", name: "Psychic Scream", aiRole: "panicCc", visualStyle: "priest",
      target: "self", school: "shadow", utility: true, resourceCost: 10, castMs: 0, cooldownMs: 24000, gcdMs: 1200, range: 0,
      noHitRoll: true,
      effects: [{ kind: "fearAoE", drCategory: "disorient", radius: 125, durationMs: 3500, breakOnDamage: true }],
    },
  ],
};
