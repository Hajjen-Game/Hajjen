export const rogueClass = {
  classId: "rogue",
  displayName: "Rogue",
  role: "melee",
  visualStyle: "rogue",
  stats: {
    maxHealth: 1320, moveSpeed: 218, radius: 19,
    hitChance: 0.93, critChance: 0.19, dodgeChance: 0.11, critMultiplier: 1.6,
  },
  resource: { type: "energy", max: 100, start: 100, regenPerSecond: 16 },
  ai: {
    preferredRange: 50, targetPriorityRoles: ["caster", "healer", "melee"],
    oomHealerFocusPct: 0.10, repositionWhenHealerControlled: true, healerLosPullDistance: 110,
    ccTargetRoles: ["healer", "caster"],
  },
  spells: [
    {
      id: "rogue-garrote", name: "Garrote", aiRole: "periodic", visualStyle: "rogue",
      target: "enemy", school: "physical", resourceCost: 24, castMs: 0, cooldownMs: 7000, gcdMs: 1200, range: 58,
      effects: [{ kind: "dot", amount: 46, durationMs: 8000, tickMs: 2000 }],
    },
    {
      id: "rogue-sinister", name: "Sinister Strike", aiRole: "filler", visualStyle: "rogue",
      target: "enemy", school: "physical", resourceCost: 18, castMs: 0, cooldownMs: 0, gcdMs: 1200, range: 58,
      effects: [{ kind: "damage", amount: 82 }],
    },
    {
      id: "rogue-eviscerate", name: "Eviscerate", aiRole: "bigDamage", visualStyle: "rogue",
      target: "enemy", school: "physical", resourceCost: 38, castMs: 0, cooldownMs: 6000, gcdMs: 1200, range: 60,
      effects: [{ kind: "damage", amount: 205 }],
    },
    {
      id: "rogue-kidney", name: "Kidney Shot", aiRole: "control", visualStyle: "rogue",
      target: "enemy", school: "physical", utility: true, resourceCost: 25, castMs: 0, cooldownMs: 18000, gcdMs: 1200, range: 60,
      noHitRoll: true,
      effects: [{ kind: "stun", durationMs: 3200 }],
    },
    {
      id: "rogue-kick", name: "Kick", aiRole: "interrupt", visualStyle: "rogue",
      target: "enemy", school: "physical", utility: true, resourceCost: 10, castMs: 0, cooldownMs: 9000, gcdMs: 0, ignoreGcd: true, range: 68,
      noHitRoll: true,
      effects: [{ kind: "interrupt", durationMs: 3000 }],
    },
  ],
};
