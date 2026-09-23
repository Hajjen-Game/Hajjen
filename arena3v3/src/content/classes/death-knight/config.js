export const deathKnightClass = {
  classId: "death-knight",
  displayName: "Death Knight",
  role: "melee",
  visualStyle: "deathKnight",
  stats: {
    maxHealth: 1500, moveSpeed: 186, radius: 22,
    hitChance: 0.92, critChance: 0.14, dodgeChance: 0.05, critMultiplier: 1.5,
  },
  resource: { type: "runic", max: 100, start: 45, regenPerSecond: 8 },
  ai: {
    preferredRange: 58, targetPriorityRoles: ["caster", "healer", "melee"],
    oomHealerFocusPct: 0.10, repositionWhenHealerControlled: true, healerLosPullDistance: 115,
    ccTargetRoles: ["caster", "healer"],
  },
  spells: [
    {
      id: "dk-fever", name: "Frost Fever", aiRole: "periodic", visualStyle: "deathKnight",
      target: "enemy", school: "shadowfrost", resourceCost: 12, resourceGain: 8, castMs: 0, cooldownMs: 7000, gcdMs: 1200, range: 220,
      effects: [{ kind: "dot", amount: 44, durationMs: 9000, tickMs: 3000 }],
    },
    {
      id: "dk-death-strike", name: "Death Strike", aiRole: "filler", visualStyle: "deathKnight",
      target: "enemy", school: "physical", resourceCost: 24, resourceGain: 10, castMs: 0, cooldownMs: 2500, gcdMs: 1200, range: 62,
      effects: [
        { kind: "damage", amount: 92 },
        { kind: "heal", amount: 62, to: "self" },
      ],
    },
    {
      id: "dk-obliterate", offensiveCooldown: { durationMs: 2400, label: "BURST" }, name: "Obliterate", aiRole: "bigDamage", visualStyle: "deathKnight",
      target: "enemy", school: "shadowfrost", resourceCost: 36, resourceGain: 12, castMs: 900, cooldownMs: 5000, gcdMs: 1200, range: 62,
      effects: [{ kind: "damage", amount: 198 }],
    },
    {
      id: "dk-chains", name: "Chains of Ice", aiRole: "control", visualStyle: "deathKnight",
      target: "enemy", school: "frost", utility: true, resourceCost: 12, castMs: 0, cooldownMs: 12000, gcdMs: 1200, range: 250,
      noHitRoll: true,
      effects: [{ kind: "root", durationMs: 2600, breakOnDamage: false }],
    },
    {
      id: "dk-mind-freeze", name: "Mind Freeze", aiRole: "interrupt", visualStyle: "deathKnight",
      target: "enemy", school: "shadowfrost", utility: true, resourceCost: 8, castMs: 0, cooldownMs: 10000, gcdMs: 0, ignoreGcd: true, range: 75,
      noHitRoll: true,
      effects: [{ kind: "interrupt", durationMs: 3000 }],
    },
  ],
};
