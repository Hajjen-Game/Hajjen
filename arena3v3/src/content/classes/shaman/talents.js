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

const HEALING_SURGE_SPELL = Object.freeze({
  id: "shaman-healing-surge",
  name: "Healing Surge",
  aiRole: "quickHeal",
  visualStyle: "shaman",
  target: "ally",
  school: "nature",
  resourceCost: 20,
  castMs: 1250,
  cooldownMs: 0,
  gcdMs: 1200,
  range: 350,
  effects: [{ kind: "heal", amount: 178 }],
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
          requiredPoints: 4,
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
          requiredPoints: 4,
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
          id: "shaman-reverberation",
          name: "Reverberation",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Wind Shear recharges 10% faster and locks the interrupted school 0.25s longer per rank.",
          rankDescriptions: [
            "Wind Shear: -10% cooldown · +0.25s lockout.",
            "Wind Shear: -20% cooldown · +0.50s lockout.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "shaman-wind-shear", field: "cooldownMs", perRank: -0.10, min: 3500 },
            { type: "spellEffectFieldAdd", spellId: "shaman-wind-shear", kinds: ["interrupt"], field: "durationMs", perRank: 250 },
          ],
        },
        {
          id: "shaman-elemental-precision",
          name: "Elemental Precision",
          tier: 3,
          requiredPoints: 8,
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
          requiredPoints: 12,
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
      id: "restoration",
      name: "Restoration",
      subtitle: "Hybrid sustain, Mana efficiency and stronger control while supporting the team.",
      accent: "#55c99a",
      talents: [
        {
          id: "shaman-healing-surge",
          name: "Healing Surge",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Healing Surge. Its healing is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Healing Surge · healing +10%.",
            "Healing Surge healing +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: HEALING_SURGE_SPELL },
            { type: "spellEffectScale", spellId: "shaman-healing-surge", kinds: ["heal"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "shaman-resurgence",
          name: "Resurgence",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Mana regeneration increases by 10% and maximum Mana by 5% per rank.",
          rankDescriptions: [
            "Mana regeneration +10% · maximum Mana +5%.",
            "Mana regeneration +20% · maximum Mana +10%.",
          ],
          effects: [
            { type: "resourceFieldScale", field: "regenPerSecond", perRank: 0.10 },
            { type: "resourceFieldScale", field: "max", perRank: 0.05, integer: true },
          ],
        },
        {
          id: "shaman-tidal-focus",
          name: "Tidal Focus",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Healing Surge costs 8% less Mana and casts 7% faster per rank.",
          rankDescriptions: [
            "Healing Surge: -8% Mana cost · 7% faster cast.",
            "Healing Surge: -16% Mana cost · 14% faster cast.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "shaman-healing-surge", field: "resourceCost", perRank: -0.08, min: 1 },
            { type: "spellFieldScale", spellId: "shaman-healing-surge", field: "castMs", perRank: -0.07, min: 500 },
          ],
        },
        {
          id: "shaman-hex-mastery",
          name: "Hex Mastery",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Hex recharges 8% faster and lasts 0.25s longer per rank.",
          rankDescriptions: [
            "Hex: -8% cooldown · +0.25s duration.",
            "Hex: -16% cooldown · +0.50s duration.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "shaman-hex", field: "cooldownMs", perRank: -0.08, min: 7000 },
            { type: "spellEffectFieldAdd", spellId: "shaman-hex", kinds: ["incapacitate"], field: "durationMs", perRank: 250 },
          ],
        },
        {
          id: "shaman-ancestral-vigor",
          name: "Ancestral Vigor",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Maximum Health increases by 4% and Healing Surge heals 6% more per rank.",
          rankDescriptions: [
            "Maximum Health +4% · Healing Surge +6%.",
            "Maximum Health +8% · Healing Surge +12%.",
          ],
          effects: [
            { type: "statFieldScale", field: "maxHealth", perRank: 0.04, integer: true },
            { type: "spellEffectScale", spellId: "shaman-healing-surge", kinds: ["heal"], field: "amount", perRank: 0.06 },
          ],
        },
        {
          id: "shaman-winds-grace",
          name: "Wind's Grace",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Movement speed increases by 3% and Wind Shear range by 6% per rank.",
          rankDescriptions: [
            "Movement speed +3% · Wind Shear range +6%.",
            "Movement speed +6% · Wind Shear range +12%.",
          ],
          effects: [
            { type: "statFieldScale", field: "moveSpeed", perRank: 0.03, integer: true },
            { type: "spellFieldScale", spellId: "shaman-wind-shear", field: "range", perRank: 0.06, min: 0 },
          ],
        },
        {
          id: "shaman-natures-guardian",
          name: "Nature's Guardian",
          tier: 4,
          requiredPoints: 12,
          maxRank: 1,
          capstone: true,
          description: "Healing Surge heals 20% more, maximum Health increases by 8%, and Hex casts 15% faster.",
          rankDescriptions: [
            "Healing Surge +20% · maximum Health +8% · Hex 15% faster.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "shaman-healing-surge", kinds: ["heal"], field: "amount", perRank: 0.20 },
            { type: "statFieldScale", field: "maxHealth", perRank: 0.08, integer: true },
            { type: "spellFieldScale", spellId: "shaman-hex", field: "castMs", perRank: -0.15, min: 500 },
          ],
        },
      ],
    },
  ],
});
