export const MAGE_SHAMAN_VFX2_IDS = Object.freeze(new Set([
  "mage-living-bomb",
  "mage-frostbolt",
  "mage-pyroblast",
  "mage-frost-nova",
  "mage-polymorph",
  "mage-frostfire-bolt",
  "mage-arcane-barrage",
  "shaman-flame-shock",
  "shaman-chain-lightning",
  "shaman-lava-burst",
  "shaman-hex",
  "shaman-astral-shift",
  "shaman-elemental-blast",
  "shaman-stormstrike",
]));

export const WARLOCK_VFX2_IDS = Object.freeze(new Set([
  "warlock-corruption",
  "warlock-shadow-bolt",
  "warlock-chaos-bolt",
  "warlock-resolve",
  "warlock-fear",
  "warlock-drain-life",
  "warlock-conflagrate",
]));

export const PRIEST_DRUID_VFX2_IDS = Object.freeze(new Set([
  "priest-renew",
  "priest-flash-heal",
  "priest-greater-heal",
  "priest-pain-suppression",
  "priest-psychic-scream",
  "priest-smite",
  "priest-holy-fire",
  "druid-rejuvenation",
  "druid-swiftmend",
  "druid-regrowth",
  "druid-ironbark",
  "druid-cyclone",
  "druid-lifebloom",
  "druid-moonfire",
]));

export const PALADIN_DK_VFX2_IDS = Object.freeze(new Set([
  "paladin-holy-shock",
  "paladin-flash-light",
  "paladin-holy-light",
  "paladin-blessing",
  "paladin-hammer",
  "paladin-word-of-glory",
  "paladin-judgment",
  "dk-fever",
  "dk-death-strike",
  "dk-obliterate",
  "dk-chains",
  "dk-mind-freeze",
  "dk-frost-strike",
  "dk-rune-tap",
]));

const CASTER_VFX2_IDS = new Set([
  ...MAGE_SHAMAN_VFX2_IDS,
  ...WARLOCK_VFX2_IDS,
  ...PRIEST_DRUID_VFX2_IDS,
  ...PALADIN_DK_VFX2_IDS,
]);

export function baseSpellId(spellId = "") {
  return String(spellId).split(":chain:")[0];
}

export function usesMageShamanVfx2(spellId = "") {
  return MAGE_SHAMAN_VFX2_IDS.has(baseSpellId(spellId));
}

export function usesWarlockVfx2(spellId = "") {
  return WARLOCK_VFX2_IDS.has(baseSpellId(spellId));
}

export function usesPriestDruidVfx2(spellId = "") {
  return PRIEST_DRUID_VFX2_IDS.has(baseSpellId(spellId));
}

export function usesPaladinDkVfx2(spellId = "") {
  return PALADIN_DK_VFX2_IDS.has(baseSpellId(spellId));
}

export function ownsCasterVfx2Impact(spellId = "") {
  return CASTER_VFX2_IDS.has(baseSpellId(spellId));
}

// Kept as a compatibility alias while the first VFX2 rollout is live.
export function ownsMageShamanImpact(spellId = "") {
  return ownsCasterVfx2Impact(spellId);
}

export function vfx2DurationFor(spellId = "") {
  const id = baseSpellId(spellId);
  const durations = {
    "mage-living-bomb": 500,
    "mage-frostbolt": 620,
    "mage-pyroblast": 680,
    "mage-frost-nova": 560,
    "mage-polymorph": 560,
    "mage-frostfire-bolt": 650,
    "mage-arcane-barrage": 520,

    "shaman-flame-shock": 500,
    "shaman-chain-lightning": 500,
    "shaman-lava-burst": 650,
    "shaman-hex": 560,
    "shaman-astral-shift": 620,
    "shaman-elemental-blast": 650,
    "shaman-stormstrike": 500,

    "warlock-corruption": 560,
    "warlock-shadow-bolt": 660,
    "warlock-chaos-bolt": 760,
    "warlock-resolve": 640,
    "warlock-fear": 620,
    "warlock-drain-life": 720,
    "warlock-conflagrate": 560,

    "priest-renew": 560,
    "priest-flash-heal": 560,
    "priest-greater-heal": 720,
    "priest-pain-suppression": 620,
    "priest-psychic-scream": 620,
    "priest-smite": 620,
    "priest-holy-fire": 700,

    "druid-rejuvenation": 580,
    "druid-swiftmend": 540,
    "druid-regrowth": 700,
    "druid-ironbark": 650,
    "druid-cyclone": 680,
    "druid-lifebloom": 600,
    "druid-moonfire": 680,

    "paladin-holy-shock": 560,
    "paladin-flash-light": 580,
    "paladin-holy-light": 720,
    "paladin-blessing": 640,
    "paladin-hammer": 560,
    "paladin-word-of-glory": 620,
    "paladin-judgment": 660,

    "dk-fever": 580,
    "dk-death-strike": 620,
    "dk-obliterate": 720,
    "dk-chains": 640,
    "dk-mind-freeze": 480,
    "dk-frost-strike": 600,
    "dk-rune-tap": 620,
  };

  return durations[id] || 520;
}
