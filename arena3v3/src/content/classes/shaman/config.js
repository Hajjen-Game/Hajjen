export const shamanClass = {
  classId: "shaman",
  displayName: "Shaman",
  role: "caster",
  visualStyle: "shaman",
  stats: {
    maxHealth: 1235, moveSpeed: 191, radius: 20,
    hitChance: 0.94, critChance: 0.17, dodgeChance: 0.05, critMultiplier: 1.5,
  },
  resource: { type: "mana", max: 100, start: 100, regenPerSecond: 5.2 },
  ai: {
    preferredRange: 305, targetPriorityRoles: ["caster", "melee", "healer"],
    ccTargetRoles: ["healer", "caster"], oomHealerFocusPct: 0.10,
    repositionWhenHealerControlled: true, healerLosPullDistance: 125,
    peelHealthPct: 0.70, peelThreatRange: 125, peelDurationSeconds: 4.5,
    kiteThreatRange: 158, healerLosHealthPct: 0.85,
  },
  spells: [
    {
      id: "shaman-flame-shock", name: "Flame Shock", aiRole: "periodic", visualStyle: "shaman",
      target: "enemy", school: "nature", resourceCost: 11, castMs: 0, cooldownMs: 7000, gcdMs: 1200, range: 360,
      effects: [{ kind: "dot", amount: 46, durationMs: 8000, tickMs: 2000 }],
    },
    {
      id: "shaman-chain-lightning", name: "Chain Lightning", aiRole: "filler", visualStyle: "shaman",
      target: "enemy", school: "nature", resourceCost: 17, castMs: 1050, cooldownMs: 0, gcdMs: 1200, range: 360,
      effects: [{
        kind: "chainDamage", amount: 82, range: 360, maxTargets: 3,
        multipliers: [1, 0.72, 0.55], visualStyle: "shaman",
      }],
    },
    {
      id: "shaman-lava-burst", name: "Lava Burst", aiRole: "bigDamage", visualStyle: "shaman",
      target: "enemy", school: "fire", resourceCost: 25, castMs: 1900, cooldownMs: 5000, gcdMs: 1200, range: 360,
      effects: [{ kind: "damage", amount: 182 }],
    },
    {
      id: "shaman-hex", name: "Hex", aiRole: "control", visualStyle: "shaman",
      target: "enemy", school: "nature", utility: true, resourceCost: 15, castMs: 1300, cooldownMs: 17000, gcdMs: 1200, range: 335,
      noHitRoll: true,
      effects: [{ kind: "incapacitate", durationMs: 4200, breakOnDamage: true }],
    },
    {
      id: "shaman-wind-shear", name: "Wind Shear", aiRole: "interrupt", visualStyle: "shaman",
      target: "enemy", school: "nature", utility: true, resourceCost: 8, castMs: 0, cooldownMs: 8000, gcdMs: 0, ignoreGcd: true, range: 260,
      noHitRoll: true,
      effects: [{ kind: "interrupt", durationMs: 2500 }],
    },
  ],
};
