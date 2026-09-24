export const mageClass = {
  classId: "mage",
  displayName: "Mage",
  role: "caster",
  visualStyle: "mage",
  stats: {
    maxHealth: 1210, moveSpeed: 194, radius: 19,
    hitChance: 0.94, critChance: 0.18, dodgeChance: 0.05, critMultiplier: 1.55,
  },
  resource: { type: "mana", max: 100, start: 100, regenPerSecond: 5.0 },
  ai: {
    preferredRange: 315, targetPriorityRoles: ["caster", "melee", "healer"],
    ccTargetRoles: ["healer", "caster"], oomHealerFocusPct: 0.10,
    repositionWhenHealerControlled: true, healerLosPullDistance: 125,
    peelHealthPct: 0.72, peelThreatRange: 125, peelDurationSeconds: 5.0,
    kiteThreatRange: 165, healerLosHealthPct: 0.88,
  },
  spells: [
    {
      id: "mage-living-bomb", name: "Living Bomb", aiRole: "periodic", visualStyle: "mage",
      target: "enemy", school: "fire", resourceCost: 12, castMs: 0, cooldownMs: 7000, gcdMs: 1200, range: 360,
      effects: [{ kind: "dot", amount: 46, durationMs: 8000, tickMs: 2000 }],
    },
    {
      id: "mage-frostbolt", name: "Frostbolt", aiRole: "filler", visualStyle: "mage",
      target: "enemy", school: "frost", resourceCost: 14, castMs: 950, cooldownMs: 0, gcdMs: 1200, range: 365,
      effects: [{ kind: "damage", amount: 88 }],
    },
    {
      id: "mage-pyroblast", offensiveCooldown: { durationMs: 2400, label: "BURST" }, name: "Pyroblast", aiRole: "bigDamage", visualStyle: "mage",
      target: "enemy", school: "fire", resourceCost: 26, castMs: 2100, cooldownMs: 5000, gcdMs: 1200, range: 365,
      effects: [{ kind: "damage", amount: 188 }],
    },
    {
      id: "mage-frost-nova", name: "Frost Nova", aiRole: "panicRoot", visualStyle: "mage",
      target: "self", school: "frost", utility: true, resourceCost: 12, castMs: 0, cooldownMs: 16000, gcdMs: 1200, range: 0,
      noHitRoll: true,
      effects: [{ kind: "rootAoE", drCategory: "root", radius: 120, durationMs: 2600, breakOnDamage: false }],
    },
    {
      id: "mage-polymorph", name: "Polymorph", aiRole: "control", visualStyle: "mage",
      target: "enemy", school: "arcane", utility: true, resourceCost: 16, castMs: 1500, cooldownMs: 16000, gcdMs: 1200, range: 340,
      noHitRoll: true,
      effects: [{ kind: "incapacitate", drCategory: "incapacitate", durationMs: 4500, breakOnDamage: true }],
    },
  ],
};
