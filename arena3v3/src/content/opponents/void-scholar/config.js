export const enemyCasterConfig = {
  id: "enemy-caster",
  name: "Void Scholar",
  team: "enemy",
  role: "caster",
  control: "ai",

  stats: {
    maxHealth: 1170,
    moveSpeed: 182,
    radius: 19,
    hitChance: 0.92,
    critChance: 0.17,
    dodgeChance: 0.04,
    critMultiplier: 1.5,
  },

  resource: {
    type: "mana",
    max: 100,
    start: 100,
    regenPerSecond: 5,
  },

  ai: {
    preferredRange: 300,
    targetPriorityRoles: ["caster", "melee", "healer"],
  },

  spells: [
    {
      id: "scholar-hex",
      name: "Lingering Hex",
      target: "enemy",
      resourceCost: 12,
      castMs: 0,
      cooldownMs: 7000,
      gcdMs: 1200,
      range: 360,
      effects: [
        { kind: "dot", amount: 47, durationMs: 8000, tickMs: 2000 },
      ],
    },
    {
      id: "scholar-spark",
      name: "Void Spark",
      target: "enemy",
      resourceCost: 15,
      castMs: 950,
      cooldownMs: 0,
      gcdMs: 1200,
      range: 360,
      effects: [
        { kind: "damage", amount: 84 },
      ],
    },
    {
      id: "scholar-rift",
      name: "Deep Rift",
      target: "enemy",
      resourceCost: 24,
      castMs: 2100,
      cooldownMs: 4500,
      gcdMs: 1200,
      range: 360,
      effects: [
        { kind: "damage", amount: 172 },
      ],
    },
    {
      id: "scholar-collapse",
      name: "Star Collapse",
      target: "enemy",
      resourceCost: 30,
      castMs: 1250,
      cooldownMs: 14500,
      gcdMs: 1200,
      range: 360,
      effects: [
        { kind: "damage", amount: 234 },
      ],
    },
  ],
};
