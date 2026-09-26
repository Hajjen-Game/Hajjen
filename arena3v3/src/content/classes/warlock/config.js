export const warlockClass = {
  classId: "warlock",
  displayName: "Warlock",
  role: "caster",
  visualStyle: "warlock",
  stats: {
    maxHealth: 1270, moveSpeed: 180, radius: 20,
    hitChance: 0.93, critChance: 0.16, dodgeChance: 0.04, critMultiplier: 1.5,
  },
  resource: { type: "mana", max: 100, start: 100, regenPerSecond: 5.3 },
  ai: {
    preferredRange: 310, targetPriorityRoles: ["caster", "melee", "healer"],
    ccTargetRoles: ["healer", "caster"], oomHealerFocusPct: 0.10,
    repositionWhenHealerControlled: true, healerLosPullDistance: 125,
    peelHealthPct: 0.68, peelThreatRange: 120, peelDurationSeconds: 4.5,
    kiteThreatRange: 150, healerLosHealthPct: 0.78,
  },
  spells: [
    {
      id: "warlock-corruption", name: "Corruption", aiRole: "periodic", visualStyle: "warlock",
      target: "enemy", school: "shadow", resourceCost: 11, castMs: 0, cooldownMs: 7000, gcdMs: 1200, range: 360,
      effects: [{ kind: "dot", amount: 52, durationMs: 10000, tickMs: 2000 }],
    },
    {
      id: "warlock-shadow-bolt", name: "Shadow Bolt", aiRole: "filler", visualStyle: "warlock",
      target: "enemy", school: "shadow", resourceCost: 14, castMs: 1100, cooldownMs: 0, gcdMs: 1200, range: 360,
      effects: [{ kind: "damage", amount: 86 }],
    },
    {
      id: "warlock-chaos-bolt", offensiveCooldown: { durationMs: 2400, label: "BURST" }, name: "Chaos Bolt", aiRole: "bigDamage", visualStyle: "warlockChaos",
      target: "enemy", school: "chaos", resourceCost: 28, castMs: 2200, cooldownMs: 6000, gcdMs: 1200, range: 360,
      effects: [{ kind: "damage", amount: 205 }],
    },
    {
      id: "warlock-resolve", name: "Unending Resolve", aiRole: "defensiveSelf", visualStyle: "warlock",
      target: "self", school: "shadow", utility: true, resourceCost: 10, castMs: 0, cooldownMs: 20000, gcdMs: 1200, range: 0,
      effects: [{ kind: "damageReduction", value: 0.32, durationMs: 4500 }],
    },
    {
      id: "warlock-fear", name: "Fear", aiRole: "control", visualStyle: "warlock",
      target: "enemy", school: "shadow", utility: true, resourceCost: 15, castMs: 1350, cooldownMs: 15000, gcdMs: 1200, range: 335,
      noHitRoll: true,
      effects: [{ kind: "fear", drCategory: "disorient", durationMs: 4000, breakOnDamage: true }],
    },
  ],
};
