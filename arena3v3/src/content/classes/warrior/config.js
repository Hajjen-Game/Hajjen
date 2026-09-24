export const warriorClass = {
  classId: "warrior",
  displayName: "Warrior",
  role: "melee",
  visualStyle: "warrior",
  stats: { maxHealth: 1440, moveSpeed: 205, radius: 21, hitChance: 0.92, critChance: 0.15, dodgeChance: 0.07, critMultiplier: 1.5 },
  resource: { type: "rage", max: 100, start: 35, regenPerSecond: 6 },
  ai: { preferredRange: 54, targetPriorityRoles: ["caster", "melee", "healer"], oomHealerFocusPct: 0.10, repositionWhenHealerControlled: true, healerLosPullDistance: 115, ccTargetRoles: ["healer", "caster"] },
  spells: [
    { id: "warrior-rend", name: "Rend", aiRole: "periodic", visualStyle: "warrior", target: "enemy", school: "physical", resourceCost: 10, resourceGain: 12, castMs: 0, cooldownMs: 7000, gcdMs: 1200, range: 60, effects: [{ kind: "dot", amount: 42, durationMs: 8000, tickMs: 2000 }] },
    { id: "warrior-mortal-strike", name: "Mortal Strike", aiRole: "filler", visualStyle: "warrior", target: "enemy", school: "physical", resourceCost: 22, resourceGain: 8, castMs: 0, cooldownMs: 3500, gcdMs: 1200, range: 62, effects: [{ kind: "damage", amount: 118 }, { kind: "healingReduction", value: 0.25, durationMs: 6000 }] },
    { id: "warrior-slam", offensiveCooldown: { durationMs: 2400, label: "BURST" }, name: "Slam", aiRole: "bigDamage", visualStyle: "warrior", target: "enemy", school: "physical", interruptible: false, resourceCost: 32, resourceGain: 10, castMs: 850, cooldownMs: 5000, gcdMs: 1200, range: 62, effects: [{ kind: "damage", amount: 188 }] },
    { id: "warrior-charge", name: "Charge", aiRole: "gapClose", visualStyle: "warrior", target: "enemy", school: "physical", utility: true, resourceCost: 0, resourceGain: 20, castMs: 0, cooldownMs: 14000, gcdMs: 1200, range: 250, noHitRoll: true, effects: [{ kind: "gapClose", stopDistance: 48 }, { kind: "root", durationMs: 1200, breakOnDamage: false }] },
    { id: "warrior-pummel", name: "Pummel", aiRole: "interrupt", visualStyle: "warrior", target: "enemy", school: "physical", utility: true, resourceCost: 0, castMs: 0, cooldownMs: 10000, gcdMs: 0, ignoreGcd: true, range: 70, noHitRoll: true, effects: [{ kind: "interrupt", durationMs: 3000 }] },
  ],
};
