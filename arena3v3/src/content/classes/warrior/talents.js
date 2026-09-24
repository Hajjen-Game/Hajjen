const OVERPOWER_SPELL = Object.freeze({
  id: "warrior-overpower",
  name: "Overpower",
  aiRole: "filler",
  visualStyle: "warrior",
  target: "enemy",
  school: "physical",
  interruptible: false,
  resourceCost: 20,
  resourceGain: 8,
  castMs: 0,
  cooldownMs: 5000,
  gcdMs: 1200,
  range: 62,
  effects: [{ kind: "damage", amount: 132 }],
});

const BLOODTHIRST_SPELL = Object.freeze({
  id: "warrior-bloodthirst",
  name: "Bloodthirst",
  aiRole: "filler",
  visualStyle: "warrior",
  target: "enemy",
  school: "physical",
  interruptible: false,
  resourceCost: 26,
  resourceGain: 14,
  castMs: 0,
  cooldownMs: 6000,
  gcdMs: 1200,
  range: 62,
  effects: [
    { kind: "damage", amount: 122 },
    { kind: "heal", amount: 52, to: "self" },
  ],
});

export const warriorTalentTree = Object.freeze({
  classId: "warrior",
  displayName: "Warrior",
  branches: [
    {
      id: "arms",
      name: "Arms",
      subtitle: "Bleeds, Mortal Strike pressure, control and deliberate heavy attacks.",
      accent: "#d0a06f",
      talents: [
        {
          id: "warrior-overpower",
          name: "Overpower",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Overpower. Its damage is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Overpower · Overpower damage +10%.",
            "Overpower damage +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: OVERPOWER_SPELL },
            { type: "spellEffectScale", spellId: "warrior-overpower", kinds: ["damage"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "warrior-deep-wounds",
          name: "Deep Wounds",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Rend deals 10% more periodic damage per rank.",
          rankDescriptions: [
            "Rend DoT damage +10%.",
            "Rend DoT damage +20%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warrior-rend", kinds: ["dot"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "warrior-mortal-precision",
          name: "Mortal Precision",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Mortal Strike deals 8% more damage and reduces 2.5% more healing per rank.",
          rankDescriptions: [
            "Mortal Strike: +8% damage · 27.5% healing reduction.",
            "Mortal Strike: +16% damage · 30% healing reduction.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warrior-mortal-strike", kinds: ["damage"], field: "amount", perRank: 0.08 },
            { type: "spellEffectFieldAdd", spellId: "warrior-mortal-strike", kinds: ["healingReduction"], field: "value", perRank: 0.025, integer: false },
          ],
        },
        {
          id: "warrior-tactical-advance",
          name: "Tactical Advance",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Charge recharges 8% faster and generates 10% more Rage per rank.",
          rankDescriptions: [
            "Charge: -8% cooldown · +10% Rage generation.",
            "Charge: -16% cooldown · +20% Rage generation.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "warrior-charge", field: "cooldownMs", perRank: -0.08, min: 5000 },
            { type: "spellFieldScale", spellId: "warrior-charge", field: "resourceGain", perRank: 0.10, min: 0 },
          ],
        },
        {
          id: "warrior-heavy-blows",
          name: "Heavy Blows",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Slam deals 10% more damage and winds up 6% faster per rank.",
          rankDescriptions: [
            "Slam: +10% damage · 6% faster wind-up.",
            "Slam: +20% damage · 12% faster wind-up.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warrior-slam", kinds: ["damage"], field: "amount", perRank: 0.10 },
            { type: "spellFieldScale", spellId: "warrior-slam", field: "castMs", perRank: -0.06, min: 450 },
          ],
        },
        {
          id: "warrior-disruptive-strikes",
          name: "Disruptive Strikes",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Pummel recharges 10% faster and locks the interrupted school 0.25s longer per rank.",
          rankDescriptions: [
            "Pummel: -10% cooldown · +0.25s lockout.",
            "Pummel: -20% cooldown · +0.50s lockout.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "warrior-pummel", field: "cooldownMs", perRank: -0.10, min: 4000 },
            { type: "spellEffectFieldAdd", spellId: "warrior-pummel", kinds: ["interrupt"], field: "durationMs", perRank: 250 },
          ],
        },
        {
          id: "warrior-mortal-mastery",
          name: "Mortal Mastery",
          tier: 4,
          requiredPoints: 12,
          maxRank: 1,
          capstone: true,
          description: "Mortal Strike and Overpower deal 20% more damage. Mortal Strike reduces another 5% healing.",
          rankDescriptions: [
            "Mortal Strike & Overpower +20% damage · Mortal Strike healing reduction +5 percentage points.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warrior-mortal-strike", kinds: ["damage"], field: "amount", perRank: 0.20 },
            { type: "spellEffectScale", spellId: "warrior-overpower", kinds: ["damage"], field: "amount", perRank: 0.20 },
            { type: "spellEffectFieldAdd", spellId: "warrior-mortal-strike", kinds: ["healingReduction"], field: "value", perRank: 0.05, integer: false },
          ],
        },
      ],
    },
    {
      id: "fury",
      name: "Fury",
      subtitle: "Fast Rage-fueled pressure, self-sustain and relentless offensive tempo.",
      accent: "#d85d45",
      talents: [
        {
          id: "warrior-bloodthirst",
          name: "Bloodthirst",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Bloodthirst. Its damage and self-healing are increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Bloodthirst · damage and self-healing +10%.",
            "Bloodthirst damage and self-healing +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: BLOODTHIRST_SPELL },
            { type: "spellEffectScale", spellId: "warrior-bloodthirst", kinds: ["damage", "heal"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "warrior-endless-rage",
          name: "Endless Rage",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Rage regeneration increases by 10% and maximum Rage by 5% per rank.",
          rankDescriptions: [
            "Rage regeneration +10% · maximum Rage +5%.",
            "Rage regeneration +20% · maximum Rage +10%.",
          ],
          effects: [
            { type: "resourceFieldScale", field: "regenPerSecond", perRank: 0.10 },
            { type: "resourceFieldScale", field: "max", perRank: 0.05, integer: true },
          ],
        },
        {
          id: "warrior-flurry",
          name: "Flurry",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Slam winds up 10% faster and costs 8% less Rage per rank.",
          rankDescriptions: [
            "Slam: 10% faster wind-up · -8% Rage cost.",
            "Slam: 20% faster wind-up · -16% Rage cost.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "warrior-slam", field: "castMs", perRank: -0.10, min: 400 },
            { type: "spellFieldScale", spellId: "warrior-slam", field: "resourceCost", perRank: -0.08, min: 1 },
          ],
        },
        {
          id: "warrior-cruel-strikes",
          name: "Cruel Strikes",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Mortal Strike and Slam deal 6% more damage per rank.",
          rankDescriptions: [
            "Mortal Strike & Slam damage +6%.",
            "Mortal Strike & Slam damage +12%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warrior-mortal-strike", kinds: ["damage"], field: "amount", perRank: 0.06 },
            { type: "spellEffectScale", spellId: "warrior-slam", kinds: ["damage"], field: "amount", perRank: 0.06 },
          ],
        },
        {
          id: "warrior-blood-craze",
          name: "Blood Craze",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Bloodthirst heals 20% more and recharges 6% faster per rank.",
          rankDescriptions: [
            "Bloodthirst: +20% self-healing · -6% cooldown.",
            "Bloodthirst: +40% self-healing · -12% cooldown.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warrior-bloodthirst", kinds: ["heal"], field: "amount", perRank: 0.20 },
            { type: "spellFieldScale", spellId: "warrior-bloodthirst", field: "cooldownMs", perRank: -0.06, min: 2500 },
          ],
        },
        {
          id: "warrior-berserkers-rush",
          name: "Berserker's Rush",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Charge recharges 10% faster and generates 15% more Rage per rank.",
          rankDescriptions: [
            "Charge: -10% cooldown · +15% Rage generation.",
            "Charge: -20% cooldown · +30% Rage generation.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "warrior-charge", field: "cooldownMs", perRank: -0.10, min: 5000 },
            { type: "spellFieldScale", spellId: "warrior-charge", field: "resourceGain", perRank: 0.15, min: 0 },
          ],
        },
        {
          id: "warrior-recklessness",
          name: "Recklessness",
          tier: 4,
          requiredPoints: 12,
          maxRank: 1,
          capstone: true,
          description: "Gain 5% critical strike chance. Slam and Bloodthirst deal 15% more damage.",
          rankDescriptions: [
            "Critical strike chance +5 percentage points · Slam & Bloodthirst damage +15%.",
          ],
          effects: [
            { type: "statFieldAdd", field: "critChance", perRank: 0.05, integer: false },
            { type: "spellEffectScale", spellId: "warrior-slam", kinds: ["damage"], field: "amount", perRank: 0.15 },
            { type: "spellEffectScale", spellId: "warrior-bloodthirst", kinds: ["damage"], field: "amount", perRank: 0.15 },
          ],
        },
      ],
    },
  ],
});
