const FROSTFIRE_BOLT_SPELL = Object.freeze({
  id: "mage-frostfire-bolt",
  name: "Frostfire Bolt",
  aiRole: "bigDamage",
  visualStyle: "mage",
  target: "enemy",
  school: "frost",
  resourceCost: 19,
  castMs: 1350,
  cooldownMs: 5000,
  gcdMs: 1200,
  range: 365,
  effects: [{ kind: "damage", amount: 142 }],
});

const ARCANE_BARRAGE_SPELL = Object.freeze({
  id: "mage-arcane-barrage",
  name: "Arcane Barrage",
  aiRole: "filler",
  visualStyle: "mage",
  target: "enemy",
  school: "arcane",
  resourceCost: 17,
  castMs: 0,
  cooldownMs: 6500,
  gcdMs: 1200,
  range: 350,
  effects: [{ kind: "damage", amount: 126 }],
});

export const mageTalentTree = Object.freeze({
  classId: "mage",
  displayName: "Mage",
  branches: [
    {
      id: "frostfire",
      name: "Frost / Fire",
      subtitle: "Elemental burst, stronger pressure and aggressive control through fire and ice.",
      accent: "#8ecff1",
      talents: [
        {
          id: "mage-frostfire-bolt",
          name: "Frostfire Bolt",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Frostfire Bolt. Its damage is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Frostfire Bolt · damage +10%.",
            "Frostfire Bolt damage +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: FROSTFIRE_BOLT_SPELL },
            { type: "spellEffectScale", spellId: "mage-frostfire-bolt", kinds: ["damage"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "mage-burning-ice",
          name: "Burning Ice",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Living Bomb deals 10% more periodic damage and Frostbolt deals 6% more damage per rank.",
          rankDescriptions: [
            "Living Bomb DoT +10% · Frostbolt damage +6%.",
            "Living Bomb DoT +20% · Frostbolt damage +12%.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "mage-living-bomb", kinds: ["dot"], field: "amount", perRank: 0.10 },
            { type: "spellEffectScale", spellId: "mage-frostbolt", kinds: ["damage"], field: "amount", perRank: 0.06 },
          ],
        },
        {
          id: "mage-shatter",
          name: "Shatter",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Critical strike chance increases by 2 percentage points and Pyroblast deals 5% more damage per rank.",
          rankDescriptions: [
            "Critical strike chance +2 points · Pyroblast damage +5%.",
            "Critical strike chance +4 points · Pyroblast damage +10%.",
          ],
          effects: [
            { type: "statFieldAdd", field: "critChance", perRank: 0.02, integer: false },
            { type: "spellEffectScale", spellId: "mage-pyroblast", kinds: ["damage"], field: "amount", perRank: 0.05 },
          ],
        },
        {
          id: "mage-frostbite",
          name: "Frostbite",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Frost Nova recharges 7% faster and lasts 0.20s longer per rank.",
          rankDescriptions: [
            "Frost Nova: -7% cooldown · +0.20s root duration.",
            "Frost Nova: -14% cooldown · +0.40s root duration.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "mage-frost-nova", field: "cooldownMs", perRank: -0.07, min: 7500 },
            { type: "spellEffectFieldAdd", spellId: "mage-frost-nova", kinds: ["rootAoE"], field: "durationMs", perRank: 200 },
          ],
        },
        {
          id: "mage-hot-streak",
          name: "Hot Streak",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Pyroblast casts 7% faster and recharges 6% faster per rank.",
          rankDescriptions: [
            "Pyroblast: 7% faster cast · -6% cooldown.",
            "Pyroblast: 14% faster cast · -12% cooldown.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "mage-pyroblast", field: "castMs", perRank: -0.07, min: 900 },
            { type: "spellFieldScale", spellId: "mage-pyroblast", field: "cooldownMs", perRank: -0.06, min: 2500 },
          ],
        },
        {
          id: "mage-piercing-cold",
          name: "Piercing Cold",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Frostbolt casts 5% faster and costs 6% less Mana per rank.",
          rankDescriptions: [
            "Frostbolt: 5% faster cast · -6% Mana cost.",
            "Frostbolt: 10% faster cast · -12% Mana cost.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "mage-frostbolt", field: "castMs", perRank: -0.05, min: 450 },
            { type: "spellFieldScale", spellId: "mage-frostbolt", field: "resourceCost", perRank: -0.06, min: 1 },
          ],
        },
        {
          id: "mage-elemental-fusion",
          name: "Elemental Fusion",
          tier: 4,
          requiredPoints: 12,
          maxRank: 1,
          capstone: true,
          description: "Frostfire Bolt deals 20% more damage. Living Bomb, Frostbolt and Pyroblast deal 12% more damage.",
          rankDescriptions: [
            "Frostfire Bolt +20% · Living Bomb, Frostbolt & Pyroblast +12% damage.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "mage-frostfire-bolt", kinds: ["damage"], field: "amount", perRank: 0.20 },
            { type: "spellEffectScale", spellId: "mage-living-bomb", kinds: ["dot"], field: "amount", perRank: 0.12 },
            { type: "spellEffectScale", spellId: "mage-frostbolt", kinds: ["damage"], field: "amount", perRank: 0.12 },
            { type: "spellEffectScale", spellId: "mage-pyroblast", kinds: ["damage"], field: "amount", perRank: 0.12 },
          ],
        },
      ],
    },
    {
      id: "arcane-frost",
      name: "Arcane / Frost",
      subtitle: "Mana efficiency, kiting and precise control backed by instant arcane pressure.",
      accent: "#a99be8",
      talents: [
        {
          id: "mage-arcane-barrage",
          name: "Arcane Barrage",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Unlock Arcane Barrage. Its damage is increased by 10% per rank.",
          rankDescriptions: [
            "Unlock Arcane Barrage · damage +10%.",
            "Arcane Barrage damage +20%.",
          ],
          effects: [
            { type: "unlockSpell", minRank: 1, spell: ARCANE_BARRAGE_SPELL },
            { type: "spellEffectScale", spellId: "mage-arcane-barrage", kinds: ["damage"], field: "amount", perRank: 0.10 },
          ],
        },
        {
          id: "mage-arcane-mind",
          name: "Arcane Mind",
          tier: 1,
          requiredPoints: 0,
          maxRank: 2,
          description: "Maximum Mana increases by 6% and Mana regeneration by 8% per rank.",
          rankDescriptions: [
            "Maximum Mana +6% · Mana regeneration +8%.",
            "Maximum Mana +12% · Mana regeneration +16%.",
          ],
          effects: [
            { type: "resourceFieldScale", field: "max", perRank: 0.06, integer: true },
            { type: "resourceFieldScale", field: "regenPerSecond", perRank: 0.08 },
          ],
        },
        {
          id: "mage-improved-polymorph",
          name: "Improved Polymorph",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Polymorph casts 7% faster and recharges 6% faster per rank.",
          rankDescriptions: [
            "Polymorph: 7% faster cast · -6% cooldown.",
            "Polymorph: 14% faster cast · -12% cooldown.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "mage-polymorph", field: "castMs", perRank: -0.07, min: 650 },
            { type: "spellFieldScale", spellId: "mage-polymorph", field: "cooldownMs", perRank: -0.06, min: 7500 },
          ],
        },
        {
          id: "mage-glacial-mobility",
          name: "Glacial Mobility",
          tier: 2,
          requiredPoints: 4,
          maxRank: 2,
          description: "Movement speed increases by 3% and Frost Nova recharges 6% faster per rank.",
          rankDescriptions: [
            "Movement speed +3% · Frost Nova cooldown -6%.",
            "Movement speed +6% · Frost Nova cooldown -12%.",
          ],
          effects: [
            { type: "statFieldScale", field: "moveSpeed", perRank: 0.03, integer: true },
            { type: "spellFieldScale", spellId: "mage-frost-nova", field: "cooldownMs", perRank: -0.06, min: 7500 },
          ],
        },
        {
          id: "mage-arcane-efficiency",
          name: "Arcane Efficiency",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Arcane Barrage costs 8% less Mana and recharges 7% faster per rank.",
          rankDescriptions: [
            "Arcane Barrage: -8% Mana cost · -7% cooldown.",
            "Arcane Barrage: -16% Mana cost · -14% cooldown.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "mage-arcane-barrage", field: "resourceCost", perRank: -0.08, min: 1 },
            { type: "spellFieldScale", spellId: "mage-arcane-barrage", field: "cooldownMs", perRank: -0.07, min: 2500 },
          ],
        },
        {
          id: "mage-icy-veins",
          name: "Icy Veins",
          tier: 3,
          requiredPoints: 8,
          maxRank: 2,
          description: "Frostbolt casts 7% faster and Polymorph costs 7% less Mana per rank.",
          rankDescriptions: [
            "Frostbolt 7% faster · Polymorph -7% Mana cost.",
            "Frostbolt 14% faster · Polymorph -14% Mana cost.",
          ],
          effects: [
            { type: "spellFieldScale", spellId: "mage-frostbolt", field: "castMs", perRank: -0.07, min: 450 },
            { type: "spellFieldScale", spellId: "mage-polymorph", field: "resourceCost", perRank: -0.07, min: 1 },
          ],
        },
        {
          id: "mage-arcane-freeze",
          name: "Arcane Freeze",
          tier: 4,
          requiredPoints: 12,
          maxRank: 1,
          capstone: true,
          description: "Arcane Barrage deals 20% more damage, Frostbolt casts 12% faster, and Polymorph casts 10% faster.",
          rankDescriptions: [
            "Arcane Barrage +20% damage · Frostbolt 12% faster · Polymorph 10% faster.",
          ],
          effects: [
            { type: "spellEffectScale", spellId: "mage-arcane-barrage", kinds: ["damage"], field: "amount", perRank: 0.20 },
            { type: "spellFieldScale", spellId: "mage-frostbolt", field: "castMs", perRank: -0.12, min: 400 },
            { type: "spellFieldScale", spellId: "mage-polymorph", field: "castMs", perRank: -0.10, min: 550 },
          ],
        },
      ],
    },
  ],
});
