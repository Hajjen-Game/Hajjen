const ELEMENTAL_BLAST_SPELL = Object.freeze({
  id: "shaman-elemental-blast",
  name: "Elemental Blast",
  aiRole: "bigDamage",
  visualStyle: "shaman",
  target: "enemy",
  school: "nature",
  resourceCost: 22,
  castMs: 1450,
  cooldownMs: 7000,
  gcdMs: 1200,
  range: 360,
  effects: [{ kind: "damage", amount: 158 }],
});

const STORMSTRIKE_SPELL = Object.freeze({
  id: "shaman-stormstrike",
  name: "Stormstrike",
  aiRole: "filler",
  visualStyle: "shaman",
  target: "enemy",
  school: "physical",
  interruptible: false,
  resourceCost: 14,
  castMs: 0,
  cooldownMs: 5500,
  gcdMs: 1200,
  range: 92,
  effects: [{ kind: "damage", amount: 138 }],
});

export const shamanTalentTree = Object.freeze({
  classId: "shaman",
  displayName: "Shaman",
  branches: [
    {
      id: "elemental",
      name: "Elemental",
      subtitle: "Explosive spell pressure, stronger shocks and faster lightning casts.",
      accent: "#4aa3ff",
      talents: [
        {
          id: "shaman-elemental-blast",
          name: "Elemental Blast",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Elemental Blast. Its damage is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Elemental Blast · damage +10%.",
            "Elemental Blast damage +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: ELEMENTAL_BLAST_SPELL },
            { type: "spellEffectScale", spellId: "shaman-elemental-blast", kinds: ["damage"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "shaman-searing-flames",
          name: "Searing Flames",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Flame Shock deals 12% more periodic damage per rank.",
          rankDescriptions: [
            "Flame Shock DoT damage +12%.",
            "Flame Shock DoT damage +24%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "shaman-flame-shock", kinds: ["dot"], field: "amount", perRank: 0.12 },
          ],
        },
        {
          id: "shaman-convection",
          name: "Convection",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Chain Lightning costs 8% less Mana and casts 6% faster per rank.",
          rankDescriptions: [
            "Chain Lightning: -8% Mana cost · 6% faster cast.",
            "Chain Lightning: -16% Mana cost · 12% faster cast.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "shaman-chain-lightning", field: "resourceCost", perRank: -0.08, min: 1 },
            { type: "spellFieldScale", spellId: "shaman-chain-lightning", field: "castMs", perRank: -0.06, min: 500 },
          ],
        },
        {
          id: "shaman-lava-surge",
          name: "Lava Surge",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Lava Burst deals 8% more damage and recharges 6% faster per rank.",
          rankDescriptions: [
            "Lava Burst: +8% damage · -6% cooldown.",
            "Lava Burst: +16% damage · -12% cooldown.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "shaman-lava-burst", kinds: ["damage"], field: "amount", perRank: 0.08 },
            { type: "spellFieldScale", spellId: "shaman-lava-burst", field: "cooldownMs", perRank: -0.06, min: 2500 },
          ],
        },
        {
          id: "shaman-elemental-warding",
          name: "Elemental Warding",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Astral Shift recharges 8% faster and lasts 0.25s longer per rank.",
          rankDescriptions: [
            "Astral Shift: -8% cooldown · +0.25s duration.",
            "Astral Shift: -16% cooldown · +0.50s duration.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "shaman-astral-shift", field: "cooldownMs", perRank: -0.08, min: 12000 },
            { type: "spellEffectFieldAdd", spellId: "shaman-astral-shift", kinds: ["damageReduction"], field: "durationMs", perRank: 250 },
          ],
        },
        {
          id: "shaman-elemental-precision",
          name: "Elemental Precision",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Critical strike chance increases by 2 percentage points and Elemental Blast deals 5% more damage per rank.",
          rankDescriptions: [
            "Critical strike chance +2 points · Elemental Blast damage +5%.",
            "Critical strike chance +4 points · Elemental Blast damage +10%.",
          ],
          effects: [
            { type: "statFieldAdd", field: "critChance", perRank: 0.02, integer: false },
            { type: "spellEffectScale", spellId: "shaman-elemental-blast", kinds: ["damage"], field: "amount", perRank: 0.05 },
          ],
        },
        {
          id: "shaman-elemental-mastery",
          name: "Elemental Mastery",
          tier: 4,
          requiredPoints: 9,
          maxRank: 1,
          capstone: true,
          description: "Lava Burst and Elemental Blast deal 18% more damage. Chain Lightning casts 12% faster.",
          rankDescriptions: [
            "Lava Burst & Elemental Blast +18% damage · Chain Lightning 12% faster.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "shaman-lava-burst", kinds: ["damage"], field: "amount", perRank: 0.18 },
            { type: "spellEffectScale", spellId: "shaman-elemental-blast", kinds: ["damage"], field: "amount", perRank: 0.18 },
            { type: "spellFieldScale", spellId: "shaman-chain-lightning", field: "castMs", perRank: -0.12, min: 450 },
          ],
        },
      ],
    },
    {
      id: "enhancement",
      name: "Enhancement",
      subtitle: "Aggressive battle-shaman pressure, fast shocks, mobility and close-range disruption.",
      accent: "#d88b45",
      talents: [
        {
          id: "shaman-stormstrike",
          name: "Stormstrike",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Stormstrike. Its damage is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Stormstrike · damage +10%.",
            "Stormstrike damage +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: STORMSTRIKE_SPELL },
            { type: "spellEffectScale", spellId: "shaman-stormstrike", kinds: ["damage"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "shaman-static-shock",
          name: "Static Shock",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Flame Shock deals 8% more periodic damage and recharges 6% faster per rank.",
          rankDescriptions: [
            "Flame Shock: +8% DoT damage · -6% cooldown.",
            "Flame Shock: +16% DoT damage · -12% cooldown.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "shaman-flame-shock", kinds: ["dot"], field: "amount", perRank: 0.08 },
            { type: "spellFieldScale", spellId: "shaman-flame-shock", field: "cooldownMs", perRank: -0.06, min: 2500 },
          ],
        },
        {
          id: "shaman-storms-reach",
          name: "Storm's Reach",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Stormstrike gains 10% range and recharges 7% faster per rank.",
          rankDescriptions: [
            "Stormstrike: +10% range · -7% cooldown.",
            "Stormstrike: +20% range · -14% cooldown.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "shaman-stormstrike", field: "range", perRank: 0.10, min: 0 },
            { type: "spellFieldScale", spellId: "shaman-stormstrike", field: "cooldownMs", perRank: -0.07, min: 2500 },
          ],
        },
        {
          id: "shaman-maelstrom-weapon",
          name: "Maelstrom Weapon",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Chain Lightning casts 7% faster and costs 6% less Mana per rank.",
          rankDescriptions: [
            "Chain Lightning: 7% faster cast · -6% Mana cost.",
            "Chain Lightning: 14% faster cast · -12% Mana cost.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "shaman-chain-lightning", field: "castMs", perRank: -0.07, min: 450 },
            { type: "spellFieldScale", spellId: "shaman-chain-lightning", field: "resourceCost", perRank: -0.06, min: 1 },
          ],
        },
        {
          id: "shaman-toughness",
          name: "Toughness",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Maximum Health increases by 4% and movement speed by 3% per rank.",
          rankDescriptions: [
            "Maximum Health +4% · movement speed +3%.",
            "Maximum Health +8% · movement speed +6%.",
          ],
          effects: [
            { type: "statFieldScale", field: "maxHealth", perRank: 0.04, integer: true },
            { type: "statFieldScale", field: "moveSpeed", perRank: 0.03, integer: true },
          ],
        },
        {
          id: "shaman-ancestral-fortitude",
          name: "Ancestral Fortitude",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Astral Shift reduces an additional 2.5 percentage points of damage per rank.",
          rankDescriptions: [
            "Astral Shift damage reduction +2.5 points.",
            "Astral Shift damage reduction +5 points.",
          ],
          effects: [
            { type: "spellEffectFieldAdd", spellId: "shaman-astral-shift", kinds: ["damageReduction"], field: "value", perRank: 0.025 },
          ],
        },
        {
          id: "shaman-stormbringer",
          name: "Stormbringer",
          tier: 4,
          requiredPoints: 9,
          maxRank: 1,
          capstone: true,
          description: "Stormstrike deals 20% more damage. Flame Shock deals 12% more periodic damage and Chain Lightning casts 10% faster.",
          rankDescriptions: [
            "Stormstrike +20% · Flame Shock DoT +12% · Chain Lightning 10% faster.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "shaman-stormstrike", kinds: ["damage"], field: "amount", perRank: 0.20 },
            { type: "spellEffectScale", spellId: "shaman-flame-shock", kinds: ["dot"], field: "amount", perRank: 0.12 },
            { type: "spellFieldScale", spellId: "shaman-chain-lightning", field: "castMs", perRank: -0.10, min: 400 },
          ],
        },
      ],
    },
  ],
});
