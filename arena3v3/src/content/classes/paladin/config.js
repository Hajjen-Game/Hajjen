export const paladinClass = {
  classId: "paladin",
  displayName: "Paladin",
  role: "healer",
  visualStyle: "paladin",
  stats: { maxHealth: 1360, moveSpeed: 184, radius: 21, hitChance: 0.95, critChance: 0.15, dodgeChance: 0.04, critMultiplier: 1.5 },
  resource: { type: "mana", max: 100, start: 100, regenPerSecond: 5.0 },
  ai: { preferredRange: 285, ccTargetRoles: ["melee", "healer"] },
  spells: [
    { id: "paladin-holy-shock", name: "Holy Shock", aiRole: "instantHeal", visualStyle: "paladin", target: "ally", school: "holy", resourceCost: 13, castMs: 0, cooldownMs: 5000, gcdMs: 1200, range: 310, effects: [{ kind: "heal", amount: 150 }] },
    { id: "paladin-flash-light", name: "Flash of Light", aiRole: "quickHeal", visualStyle: "paladin", target: "ally", school: "holy", resourceCost: 16, castMs: 950, cooldownMs: 0, gcdMs: 1200, range: 310, effects: [{ kind: "heal", amount: 150 }] },
    { id: "paladin-holy-light", name: "Holy Light", aiRole: "bigHeal", visualStyle: "paladin", target: "ally", school: "holy", resourceCost: 24, castMs: 1950, cooldownMs: 0, gcdMs: 1200, range: 310, effects: [{ kind: "heal", amount: 305 }] },
    { id: "paladin-blessing", name: "Blessing of Protection", aiRole: "defensive", visualStyle: "paladin", target: "ally", school: "holy", resourceCost: 18, castMs: 0, cooldownMs: 20000, gcdMs: 1200, range: 310, effects: [{ kind: "damageReduction", value: 0.38, durationMs: 3500 }] },
    { id: "paladin-hammer", name: "Hammer of Justice", aiRole: "control", visualStyle: "paladin", target: "enemy", school: "holy", utility: true, resourceCost: 10, castMs: 0, cooldownMs: 18000, gcdMs: 1200, range: 135, noHitRoll: true, effects: [{ kind: "stun", drCategory: "stun", durationMs: 3000 }] },
  ],
};
