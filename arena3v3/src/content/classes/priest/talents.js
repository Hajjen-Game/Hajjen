const MIND_BLAST_SPELL = Object.freeze({
  id: "priest-smite",
  name: "Mind Blast",
  aiRole: "filler",
  visualStyle: "priestShadow",
  target: "enemy",
  school: "shadow",
  resourceCost: 11,
  castMs: 1150,
  cooldownMs: 0,
  gcdMs: 1200,
  range: 345,
  talentDamageHeal: true,
  effects: [{ kind: "damage", amount: 92 }],
});

const HOLY_FIRE_SPELL = Object.freeze({
  id: "priest-holy-fire",
  name: "Holy Fire",
  aiRole: "bigDamage",
  visualStyle: "priest",
  target: "enemy",
  school: "holy",
  resourceCost: 15,
  castMs: 1250,
  cooldownMs: 6000,
  gcdMs: 1200,
  range: 345,
  talentDamageHeal: true,
  effects: [
    { kind: "damage", amount: 108 },
    { kind: "dot", amount: 30, durationMs: 6000, tickMs: 2000 },
  ],
});

export const priestTalentTree = Object.freeze({
  classId: "priest",
  displayName: "Priest",
  branches: [
    {
      id: "holy-grace",
      name: "Holy Grace",
      subtitle: "Pure healing, mana efficiency and stronger defensive support.",
      accent: "#efd477",
      talents: [
        {
          id: "priest-renewed-faith",
          name: "Renewed Faith",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Renew heals 10% more per rank.",
          rankDescriptions: [
            "Renew healing +10%.",
            "Renew healing +20%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "priest-renew", kinds: ["hot"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "priest-focused-mending",
          name: "Focused Mending",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Flash Heal heals 8% more and costs 5% less mana per rank.",
          rankDescriptions: [
            "Flash Heal: +8% healing · -5% mana cost.",
            "Flash Heal: +16% healing · -10% mana cost.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "priest-flash-heal", kinds: ["heal"], field: "amount", perRank: 0.08 },
            { type: "spellFieldScale", spellId: "priest-flash-heal", field: "resourceCost", perRank: -0.05, min: 1 },
          ],
        },
        {
          id: "priest-greater-grace",
          name: "Greater Grace",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Greater Heal heals 10% more and casts 6% faster per rank.",
          rankDescriptions: [
            "Greater Heal: +10% healing · 6% faster cast.",
            "Greater Heal: +20% healing · 12% faster cast.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "priest-greater-heal", kinds: ["heal"], field: "amount", perRank: 0.10 },
            { type: "spellFieldScale", spellId: "priest-greater-heal", field: "castMs", perRank: -0.06, min: 900 },
          ],
        },
        {
          id: "priest-inner-reserve",
          name: "Inner Reserve",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Mana regeneration is increased by 8% per rank.",
          rankDescriptions: [
            "Mana regeneration +8%.",
            "Mana regeneration +16%.",
          ],
          effects: [
            { type: "resourceFieldScale", field: "regenPerSecond", perRank: 0.08 },
          ],
        },
        {
          id: "priest-guardians-resolve",
          name: "Guardian's Resolve",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Pain Suppression gains 4% damage reduction and 0.35s duration per rank.",
          rankDescriptions: [
            "Pain Suppression: +4% damage reduction · +0.35s duration.",
            "Pain Suppression: +8% damage reduction · +0.70s duration.",
          ],
          effects: [
            { type: "spellEffectFieldAdd", spellId: "priest-pain-suppression", kinds: ["damageReduction"], field: "value", perRank: 0.04, integer: false },
            { type: "spellEffectFieldAdd", spellId: "priest-pain-suppression", kinds: ["damageReduction"], field: "durationMs", perRank: 350 },
          ],
        },
        {
          id: "priest-holy-momentum",
          name: "Holy Momentum",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Flash Heal casts 7% faster and Greater Heal 5% faster per rank.",
          rankDescriptions: [
            "Flash Heal 7% faster · Greater Heal 5% faster.",
            "Flash Heal 14% faster · Greater Heal 10% faster.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "priest-flash-heal", field: "castMs", perRank: -0.07, min: 450 },
            { type: "spellFieldScale", spellId: "priest-greater-heal", field: "castMs", perRank: -0.05, min: 750 },
          ],
        },
        {
          id: "priest-divine-grace",
          name: "Divine Grace",
          tier: 4,
          requiredPoints: 9,
          maxRank: 1,
          capstone: true,
          description: "Renew, Flash Heal and Greater Heal gain 15% healing. Direct heals cost 15% less mana.",
          rankDescriptions: [
            "Renew, Flash Heal and Greater Heal: +15% healing · direct heals -15% mana cost.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "priest-renew", kinds: ["hot"], field: "amount", perRank: 0.15 },
            { type: "spellEffectScale", spellId: "priest-flash-heal", kinds: ["heal"], field: "amount", perRank: 0.15 },
            { type: "spellEffectScale", spellId: "priest-greater-heal", kinds: ["heal"], field: "amount", perRank: 0.15 },
            { type: "spellFieldScale", spellId: "priest-flash-heal", field: "resourceCost", perRank: -0.15, min: 1 },
            { type: "spellFieldScale", spellId: "priest-greater-heal", field: "resourceCost", perRank: -0.15, min: 1 },
          ],
        },
      ],
    },
    {
      id: "atonement",
      name: "Atonement",
      subtitle: "Offensive holy and shadow magic that turns pressure into smart healing for your team.",
      accent: "#c892e8",
      talents: [
        {
          id: "priest-smite",
          name: "Mind Blast",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Mind Blast. Its damage is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Mind Blast · Mind Blast damage +10%.",
            "Mind Blast damage +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: MIND_BLAST_SPELL },
            { type: "spellEffectScale", spellId: "priest-smite", kinds: ["damage"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "priest-searing-faith",
          name: "Searing Faith",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Mind Blast casts 7% faster and costs 8% less mana per rank.",
          rankDescriptions: [
            "Mind Blast: 7% faster cast · -8% mana cost.",
            "Mind Blast: 14% faster cast · -16% mana cost.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "priest-smite", field: "castMs", perRank: -0.07, min: 550 },
            { type: "spellFieldScale", spellId: "priest-smite", field: "resourceCost", perRank: -0.08, min: 1 },
          ],
        },
        {
          id: "priest-holy-fire",
          name: "Holy Fire",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Unlock Holy Fire. Its direct and periodic damage is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Holy Fire · direct and DoT damage +10%.",
            "Holy Fire direct and DoT damage +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: HOLY_FIRE_SPELL },
            { type: "spellEffectScale", spellId: "priest-holy-fire", kinds: ["damage", "dot"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "priest-atonement",
          name: "Atonement",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Mind Blast and Holy Fire heal the lowest-health ally for 15% of damage dealt per rank.",
          rankDescriptions: [
            "Atonement heals the lowest-health ally for 15% of damage dealt.",
            "Atonement heals the lowest-health ally for 30% of damage dealt.",
          ],
          effects: [
            { type: "passiveAdd", key: "damageHealPct", perRank: 0.15 },
          ],
        },
        {
          id: "priest-evangelism",
          name: "Evangelism",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Mind Blast and Holy Fire deal 8% more damage and cost 6% less mana per rank.",
          rankDescriptions: [
            "Mind Blast & Holy Fire: +8% damage · -6% mana cost.",
            "Mind Blast & Holy Fire: +16% damage · -12% mana cost.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "priest-smite", kinds: ["damage"], field: "amount", perRank: 0.08 },
            { type: "spellEffectScale", spellId: "priest-holy-fire", kinds: ["damage", "dot"], field: "amount", perRank: 0.08 },
            { type: "spellFieldScale", spellId: "priest-smite", field: "resourceCost", perRank: -0.06, min: 1 },
            { type: "spellFieldScale", spellId: "priest-holy-fire", field: "resourceCost", perRank: -0.06, min: 1 },
          ],
        },
        {
          id: "priest-contrition",
          name: "Contrition",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Atonement healing is increased by another 10% of damage dealt per rank.",
          rankDescriptions: [
            "Atonement conversion +10 percentage points.",
            "Atonement conversion +20 percentage points.",
          ],
          effects: [
            { type: "passiveAdd", key: "damageHealPct", perRank: 0.10 },
          ],
        },
        {
          id: "priest-radiant-wrath",
          name: "Radiant Wrath",
          tier: 4,
          requiredPoints: 9,
          maxRank: 1,
          capstone: true,
          description: "Mind Blast and Holy Fire deal 20% more damage, Holy Fire recharges 20% faster, and Atonement gains +15%.",
          rankDescriptions: [
            "Mind Blast & Holy Fire +20% damage · Holy Fire -20% cooldown · Atonement +15 percentage points.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "priest-smite", kinds: ["damage"], field: "amount", perRank: 0.20 },
            { type: "spellEffectScale", spellId: "priest-holy-fire", kinds: ["damage", "dot"], field: "amount", perRank: 0.20 },
            { type: "spellFieldScale", spellId: "priest-holy-fire", field: "cooldownMs", perRank: -0.20, min: 1000 },
            { type: "passiveAdd", key: "damageHealPct", perRank: 0.15 },
          ],
        },
      ],
    },
  ],
});
