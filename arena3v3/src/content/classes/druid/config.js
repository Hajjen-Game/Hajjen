export const druidClass = {
  classId: "druid",
  displayName: "Druid",
  role: "healer",
  visualStyle: "druid",
  stats: {
    maxHealth: 1210, moveSpeed: 205, radius: 19,
    hitChance: 0.95, critChance: 0.16, dodgeChance: 0.06, critMultiplier: 1.5,
  },
  resource: { type: "mana", max: 100, start: 100, regenPerSecond: 6.0 },
  ai: { preferredRange: 330, ccTargetRoles: ["healer", "caster"] },
  spells: [
    {
      id: "druid-rejuvenation", name: "Rejuvenation", aiRole: "sustainHot", visualStyle: "druid",
      target: "ally", school: "nature", resourceCost: 11, castMs: 0, cooldownMs: 0, gcdMs: 1200, range: 355,
      effects: [{ kind: "hot", amount: 58, durationMs: 10000, tickMs: 2000 }],
    },
    {
      id: "druid-swiftmend", name: "Swiftmend", aiRole: "quickHeal", visualStyle: "druid",
      target: "ally", school: "nature", resourceCost: 18, castMs: 0, cooldownMs: 6500, gcdMs: 1200, range: 355,
      effects: [{ kind: "heal", amount: 168 }],
    },
    {
      id: "druid-regrowth", name: "Regrowth", aiRole: "bigHeal", visualStyle: "druid",
      target: "ally", school: "nature", resourceCost: 23, castMs: 1550, cooldownMs: 0, gcdMs: 1200, range: 355,
      effects: [
        { kind: "heal", amount: 215 },
        { kind: "hot", amount: 34, durationMs: 6000, tickMs: 2000 },
      ],
    },
    {
      id: "druid-ironbark", name: "Ironbark", aiRole: "defensive", visualStyle: "druid",
      target: "ally", school: "nature", resourceCost: 16, castMs: 0, cooldownMs: 18000, gcdMs: 1200, range: 355,
      effects: [{ kind: "damageReduction", value: 0.26, durationMs: 5000 }],
    },
    {
      id: "druid-cyclone", name: "Cyclone", aiRole: "control", visualStyle: "druid",
      target: "enemy", school: "nature", utility: true, resourceCost: 14, castMs: 1400, cooldownMs: 15000, gcdMs: 1200, range: 320,
      noHitRoll: true,
      effects: [{ kind: "incapacitate", drCategory: "disorient", durationMs: 4000, breakOnDamage: false }],
    },
  ],
};
