const DRAIN_LIFE_SPELL = Object.freeze({
  id: "warlock-drain-life",
  name: "Drain Life",
  aiRole: "filler",
  visualStyle: "warlock",
  target: "enemy",
  school: "shadow",
  resourceCost: 18,
  castMs: 1500,
  cooldownMs: 5000,
  gcdMs: 1200,
  range: 345,
  effects: [
    { kind: "damage", amount: 96 },
    { kind: "heal", amount: 72, to: "self" },
  ],
});

const CONFLAGRATE_SPELL = Object.freeze({
  id: "warlock-conflagrate",
  name: "Conflagrate",
  aiRole: "bigDamage",
  visualStyle: "warlock",
  target: "enemy",
  school: "shadow",
  resourceCost: 20,
  castMs: 0,
  cooldownMs: 7000,
  gcdMs: 1200,
  range: 350,
  effects: [{ kind: "damage", amount: 148 }],
});

export const warlockTalentTree = Object.freeze({
  classId: "warlock",
  displayName: "Warlock",
  branches: [
    {
      id: "affliction",
      name: "Affliction",
      subtitle: "Relentless shadow pressure, stronger Fear and self-sustain through draining magic.",
      accent: "#9a68c7",
      talents: [
        {
          id: "warlock-drain-life",
          name: "Drain Life",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Drain Life. Its damage and self-healing are increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Drain Life · damage and self-healing +10%.",
            "Drain Life damage and self-healing +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: DRAIN_LIFE_SPELL },
            { type: "spellEffectScale", spellId: "warlock-drain-life", kinds: ["damage", "heal"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "warlock-improved-corruption",
          name: "Improved Corruption",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Corruption deals 12% more periodic damage per rank.",
          rankDescriptions: [
            "Corruption DoT damage +12%.",
            "Corruption DoT damage +24%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warlock-corruption", kinds: ["dot"], field: "amount", perRank: 0.12 },
          ],
        },
        {
          id: "warlock-nightfall",
          name: "Nightfall",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Shadow Bolt casts 8% faster and costs 7% less Mana per rank.",
          rankDescriptions: [
            "Shadow Bolt: 8% faster cast · -7% Mana cost.",
            "Shadow Bolt: 16% faster cast · -14% Mana cost.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "warlock-shadow-bolt", field: "castMs", perRank: -0.08, min: 450 },
            { type: "spellFieldScale", spellId: "warlock-shadow-bolt", field: "resourceCost", perRank: -0.07, min: 1 },
          ],
        },
        {
          id: "warlock-fear-mastery",
          name: "Fear Mastery",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Fear recharges 8% faster and lasts 0.25s longer per rank.",
          rankDescriptions: [
            "Fear: -8% cooldown · +0.25s duration.",
            "Fear: -16% cooldown · +0.50s duration.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "warlock-fear", field: "cooldownMs", perRank: -0.08, min: 7000 },
            { type: "spellEffectFieldAdd", spellId: "warlock-fear", kinds: ["fear"], field: "durationMs", perRank: 250 },
          ],
        },
        {
          id: "warlock-soul-siphon",
          name: "Soul Siphon",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Drain Life heals 18% more and recharges 6% faster per rank.",
          rankDescriptions: [
            "Drain Life: +18% self-healing · -6% cooldown.",
            "Drain Life: +36% self-healing · -12% cooldown.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warlock-drain-life", kinds: ["heal"], field: "amount", perRank: 0.18 },
            { type: "spellFieldScale", spellId: "warlock-drain-life", field: "cooldownMs", perRank: -0.06, min: 2500 },
          ],
        },
        {
          id: "warlock-dark-resilience",
          name: "Dark Resilience",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Maximum Health increases by 4% and Unending Resolve recharges 6% faster per rank.",
          rankDescriptions: [
            "Maximum Health +4% · Unending Resolve cooldown -6%.",
            "Maximum Health +8% · Unending Resolve cooldown -12%.",
          ],
          effects: [
            { type: "statFieldScale", field: "maxHealth", perRank: 0.04, integer: true },
            { type: "spellFieldScale", spellId: "warlock-resolve", field: "cooldownMs", perRank: -0.06, min: 9000 },
          ],
        },
        {
          id: "warlock-master-affliction",
          name: "Master Affliction",
          tier: 4,
          requiredPoints: 9,
          maxRank: 1,
          capstone: true,
          description: "Corruption deals 18% more periodic damage. Drain Life deals and heals 18% more.",
          rankDescriptions: [
            "Corruption DoT +18% · Drain Life damage and self-healing +18%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warlock-corruption", kinds: ["dot"], field: "amount", perRank: 0.18 },
            { type: "spellEffectScale", spellId: "warlock-drain-life", kinds: ["damage", "heal"], field: "amount", perRank: 0.18 },
          ],
        },
      ],
    },
    {
      id: "destruction",
      name: "Destruction",
      subtitle: "Fast direct pressure, stronger Chaos Bolts and explosive instant damage.",
      accent: "#d16650",
      talents: [
        {
          id: "warlock-conflagrate",
          name: "Conflagrate",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Conflagrate. Its damage is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Conflagrate · damage +10%.",
            "Conflagrate damage +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: CONFLAGRATE_SPELL },
            { type: "spellEffectScale", spellId: "warlock-conflagrate", kinds: ["damage"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "warlock-cataclysmic-bolts",
          name: "Cataclysmic Bolts",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Chaos Bolt deals 10% more damage per rank.",
          rankDescriptions: [
            "Chaos Bolt damage +10%.",
            "Chaos Bolt damage +20%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warlock-chaos-bolt", kinds: ["damage"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "warlock-backdraft",
          name: "Backdraft",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Chaos Bolt casts 8% faster and costs 6% less Mana per rank.",
          rankDescriptions: [
            "Chaos Bolt: 8% faster cast · -6% Mana cost.",
            "Chaos Bolt: 16% faster cast · -12% Mana cost.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "warlock-chaos-bolt", field: "castMs", perRank: -0.08, min: 800 },
            { type: "spellFieldScale", spellId: "warlock-chaos-bolt", field: "resourceCost", perRank: -0.06, min: 1 },
          ],
        },
        {
          id: "warlock-emberstorm",
          name: "Emberstorm",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Conflagrate recharges 8% faster and Shadow Bolt deals 6% more damage per rank.",
          rankDescriptions: [
            "Conflagrate cooldown -8% · Shadow Bolt damage +6%.",
            "Conflagrate cooldown -16% · Shadow Bolt damage +12%.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "warlock-conflagrate", field: "cooldownMs", perRank: -0.08, min: 3000 },
            { type: "spellEffectScale", spellId: "warlock-shadow-bolt", kinds: ["damage"], field: "amount", perRank: 0.06 },
          ],
        },
        {
          id: "warlock-devastation",
          name: "Devastation",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Critical strike chance increases by 2 percentage points and Conflagrate deals 5% more damage per rank.",
          rankDescriptions: [
            "Critical strike chance +2 points · Conflagrate damage +5%.",
            "Critical strike chance +4 points · Conflagrate damage +10%.",
          ],
          effects: [
            { type: "statFieldAdd", field: "critChance", perRank: 0.02, integer: false },
            { type: "spellEffectScale", spellId: "warlock-conflagrate", kinds: ["damage"], field: "amount", perRank: 0.05 },
          ],
        },
        {
          id: "warlock-chaotic-energy",
          name: "Chaotic Energy",
          tier: 3,
          requiredPoints: 6,
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
          id: "warlock-ruin",
          name: "Ruin",
          tier: 4,
          requiredPoints: 9,
          maxRank: 1,
          capstone: true,
          description: "Chaos Bolt and Conflagrate deal 20% more damage. Shadow Bolt casts 12% faster.",
          rankDescriptions: [
            "Chaos Bolt & Conflagrate +20% damage · Shadow Bolt 12% faster.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "warlock-chaos-bolt", kinds: ["damage"], field: "amount", perRank: 0.20 },
            { type: "spellEffectScale", spellId: "warlock-conflagrate", kinds: ["damage"], field: "amount", perRank: 0.20 },
            { type: "spellFieldScale", spellId: "warlock-shadow-bolt", field: "castMs", perRank: -0.12, min: 450 },
          ],
        },
      ],
    },
  ],
});
