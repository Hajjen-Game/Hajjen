export const playerHealerConfig = {
  id: "player-healer",
  name: "Field Mender",
  team: "friendly",
  role: "healer",
  control: "player",

  stats: {
    maxHealth: 1260,
    moveSpeed: 194,
    radius: 20,
    hitChance: 0.94,
    critChance: 0.17,
    dodgeChance: 0.05,
    critMultiplier: 1.5,
  },

  resource: {
    type: "mana",
    max: 100,
    start: 100,
    regenPerSecond: 5.5,
  },

  ai: {
    preferredRange: 320,
  },

  spells: [
    {
      id: "renewing-thread",
      name: "Renewing Thread",
      target: "ally",
      resourceCost: 12,
      castMs: 0,
      cooldownMs: 0,
      gcdMs: 1200,
      range: 345,
      effects: [
        { kind: "hot", amount: 66, durationMs: 9000, tickMs: 3000 },
      ],
    },
    {
      id: "quick-mend",
      name: "Quick Mend",
      target: "ally",
      resourceCost: 14,
      castMs: 850,
      cooldownMs: 0,
      gcdMs: 1200,
      range: 345,
      effects: [
        { kind: "heal", amount: 132 },
      ],
    },
    {
      id: "deep-restoration",
      name: "Deep Restoration",
      target: "ally",
      resourceCost: 24,
      castMs: 2100,
      cooldownMs: 0,
      gcdMs: 1200,
      range: 345,
      effects: [
        { kind: "heal", amount: 294 },
      ],
    },
    {
      id: "guardian-pulse",
      name: "Guardian Pulse",
      target: "ally",
      resourceCost: 20,
      castMs: 0,
      cooldownMs: 18000,
      gcdMs: 1200,
      range: 345,
      effects: [
        { kind: "heal", amount: 330 },
        { kind: "damageReduction", value: 0.24, durationMs: 4200 },
      ],
    },
  ],
};
