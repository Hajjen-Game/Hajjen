const LIFEBLOOM_SPELL = Object.freeze({
  id: "druid-lifebloom",
  name: "Lifebloom",
  aiRole: "sustainHot",
  visualStyle: "druid",
  target: "ally",
  school: "nature",
  resourceCost: 13,
  castMs: 0,
  cooldownMs: 0,
  gcdMs: 1200,
  range: 355,
  effects: [{ kind: "hot", amount: 46, durationMs: 8000, tickMs: 2000 }],
});

const MOONFIRE_SPELL = Object.freeze({
  id: "druid-moonfire",
  name: "Moonfire",
  aiRole: "periodic",
  visualStyle: "druid",
  target: "enemy",
  school: "arcane",
  resourceCost: 12,
  castMs: 0,
  cooldownMs: 6000,
  gcdMs: 1200,
  range: 350,
  effects: [
    { kind: "damage", amount: 48 },
    { kind: "dot", amount: 31, durationMs: 8000, tickMs: 2000 },
  ],
});

export const druidTalentTree = Object.freeze({
  classId: "druid",
  displayName: "Druid",
  branches: [
    {
      id: "restoration",
      name: "Restoration",
      subtitle: "Deep healing, efficient HoTs and stronger defensive support.",
      accent: "#6fcb79",
      talents: [
        {
          id: "druid-lifebloom",
          name: "Lifebloom",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Lifebloom. Its periodic healing is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Lifebloom · periodic healing +10%.",
            "Lifebloom periodic healing +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: LIFEBLOOM_SPELL },
            { type: "spellEffectScale", spellId: "druid-lifebloom", kinds: ["hot"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "druid-flourish",
          name: "Flourish",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Rejuvenation heals 10% more and costs 5% less Mana per rank.",
          rankDescriptions: [
            "Rejuvenation: +10% healing · -5% Mana cost.",
            "Rejuvenation: +20% healing · -10% Mana cost.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "druid-rejuvenation", kinds: ["hot"], field: "amount", perRank: 0.10 },
            { type: "spellFieldScale", spellId: "druid-rejuvenation", field: "resourceCost", perRank: -0.05, min: 1 },
          ],
        },
        {
          id: "druid-natural-focus",
          name: "Natural Focus",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Regrowth heals 8% more, casts 6% faster and costs 5% less Mana per rank.",
          rankDescriptions: [
            "Regrowth: +8% healing · 6% faster cast · -5% Mana cost.",
            "Regrowth: +16% healing · 12% faster cast · -10% Mana cost.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "druid-regrowth", kinds: ["heal", "hot"], field: "amount", perRank: 0.08 },
            { type: "spellFieldScale", spellId: "druid-regrowth", field: "castMs", perRank: -0.06, min: 650 },
            { type: "spellFieldScale", spellId: "druid-regrowth", field: "resourceCost", perRank: -0.05, min: 1 },
          ],
        },
        {
          id: "druid-gift-of-ysera",
          name: "Gift of Ysera",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Mana regeneration increases by 8% and maximum Mana by 5% per rank.",
          rankDescriptions: [
            "Mana regeneration +8% · maximum Mana +5%.",
            "Mana regeneration +16% · maximum Mana +10%.",
          ],
          effects: [
            { type: "resourceFieldScale", field: "regenPerSecond", perRank: 0.08 },
            { type: "resourceFieldScale", field: "max", perRank: 0.05, integer: true },
          ],
        },
        {
          id: "druid-swift-recovery",
          name: "Swift Recovery",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Swiftmend heals 9% more and recharges 7% faster per rank.",
          rankDescriptions: [
            "Swiftmend: +9% healing · -7% cooldown.",
            "Swiftmend: +18% healing · -14% cooldown.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "druid-swiftmend", kinds: ["heal"], field: "amount", perRank: 0.09 },
            { type: "spellFieldScale", spellId: "druid-swiftmend", field: "cooldownMs", perRank: -0.07, min: 3000 },
          ],
        },
        {
          id: "druid-ironwood",
          name: "Ironwood",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Ironbark gains 3 percentage points of damage reduction and 0.35s duration per rank.",
          rankDescriptions: [
            "Ironbark: +3% damage reduction · +0.35s duration.",
            "Ironbark: +6% damage reduction · +0.70s duration.",
          ],
          effects: [
            { type: "spellEffectFieldAdd", spellId: "druid-ironbark", kinds: ["damageReduction"], field: "value", perRank: 0.03, integer: false },
            { type: "spellEffectFieldAdd", spellId: "druid-ironbark", kinds: ["damageReduction"], field: "durationMs", perRank: 350 },
          ],
        },
        {
          id: "druid-tree-of-life",
          name: "Tree of Life",
          tier: 4,
          requiredPoints: 9,
          maxRank: 1,
          capstone: true,
          description: "Rejuvenation and Lifebloom heal 15% more, Swiftmend heals 12% more, and maximum Health increases by 6%.",
          rankDescriptions: [
            "Rejuvenation & Lifebloom +15% · Swiftmend +12% · maximum Health +6%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "druid-rejuvenation", kinds: ["hot"], field: "amount", perRank: 0.15 },
            { type: "spellEffectScale", spellId: "druid-lifebloom", kinds: ["hot"], field: "amount", perRank: 0.15 },
            { type: "spellEffectScale", spellId: "druid-swiftmend", kinds: ["heal"], field: "amount", perRank: 0.12 },
            { type: "statFieldScale", field: "maxHealth", perRank: 0.06, integer: true },
          ],
        },
      ],
    },
    {
      id: "wildheart",
      name: "Wildheart",
      subtitle: "Mobile pressure, stronger control and a tougher arena playstyle.",
      accent: "#8ebf68",
      talents: [
        {
          id: "druid-moonfire",
          name: "Moonfire",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Moonfire. Its direct and periodic damage is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Moonfire · direct and DoT damage +10%.",
            "Moonfire direct and DoT damage +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: MOONFIRE_SPELL },
            { type: "spellEffectScale", spellId: "druid-moonfire", kinds: ["damage", "dot"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "druid-feline-grace",
          name: "Feline Grace",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Movement speed increases by 3% and dodge chance by 1 percentage point per rank.",
          rankDescriptions: [
            "Movement speed +3% · dodge chance +1 point.",
            "Movement speed +6% · dodge chance +2 points.",
          ],
          effects: [
            { type: "statFieldScale", field: "moveSpeed", perRank: 0.03, integer: true },
            { type: "statFieldAdd", field: "dodgeChance", perRank: 0.01, integer: false },
          ],
        },
        {
          id: "druid-cyclone-mastery",
          name: "Cyclone Mastery",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Cyclone casts 7% faster and recharges 6% faster per rank.",
          rankDescriptions: [
            "Cyclone: 7% faster cast · -6% cooldown.",
            "Cyclone: 14% faster cast · -12% cooldown.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "druid-cyclone", field: "castMs", perRank: -0.07, min: 650 },
            { type: "spellFieldScale", spellId: "druid-cyclone", field: "cooldownMs", perRank: -0.06, min: 7500 },
          ],
        },
        {
          id: "druid-lunar-guidance",
          name: "Lunar Guidance",
          tier: 2,
          requiredPoints: 3,
          maxRank: 2,
          description: "Moonfire costs 8% less Mana and recharges 7% faster per rank.",
          rankDescriptions: [
            "Moonfire: -8% Mana cost · -7% cooldown.",
            "Moonfire: -16% Mana cost · -14% cooldown.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "druid-moonfire", field: "resourceCost", perRank: -0.08, min: 1 },
            { type: "spellFieldScale", spellId: "druid-moonfire", field: "cooldownMs", perRank: -0.07, min: 2500 },
          ],
        },
        {
          id: "druid-thick-hide",
          name: "Thick Hide",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Maximum Health increases by 4% and Ironbark costs 6% less Mana per rank.",
          rankDescriptions: [
            "Maximum Health +4% · Ironbark -6% Mana cost.",
            "Maximum Health +8% · Ironbark -12% Mana cost.",
          ],
          effects: [
            { type: "statFieldScale", field: "maxHealth", perRank: 0.04, integer: true },
            { type: "spellFieldScale", spellId: "druid-ironbark", field: "resourceCost", perRank: -0.06, min: 1 },
          ],
        },
        {
          id: "druid-dreamstate",
          name: "Dreamstate",
          tier: 3,
          requiredPoints: 6,
          maxRank: 2,
          description: "Mana regeneration increases by 6% and Regrowth casts 5% faster per rank.",
          rankDescriptions: [
            "Mana regeneration +6% · Regrowth 5% faster.",
            "Mana regeneration +12% · Regrowth 10% faster.",
          ],
          effects: [
            { type: "resourceFieldScale", field: "regenPerSecond", perRank: 0.06 },
            { type: "spellFieldScale", spellId: "druid-regrowth", field: "castMs", perRank: -0.05, min: 650 },
          ],
        },
        {
          id: "druid-heart-of-the-wild",
          name: "Heart of the Wild",
          tier: 4,
          requiredPoints: 9,
          maxRank: 1,
          capstone: true,
          description: "Moonfire deals 20% more damage, Cyclone casts 15% faster, and movement speed increases by 5%.",
          rankDescriptions: [
            "Moonfire +20% damage · Cyclone 15% faster · movement speed +5%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "druid-moonfire", kinds: ["damage", "dot"], field: "amount", perRank: 0.20 },
            { type: "spellFieldScale", spellId: "druid-cyclone", field: "castMs", perRank: -0.15, min: 550 },
            { type: "statFieldScale", field: "moveSpeed", perRank: 0.05, integer: true },
          ],
        },
      ],
    },
  ],
});
