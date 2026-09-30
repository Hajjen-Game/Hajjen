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

const IMPACT_OWNERS = new Set(MAGE_SHAMAN_VFX2_IDS);

export function baseSpellId(spellId = "") {
  return String(spellId).split(":chain:")[0];
}

export function usesMageShamanVfx2(spellId = "") {
  return MAGE_SHAMAN_VFX2_IDS.has(baseSpellId(spellId));
}

export function ownsMageShamanImpact(spellId = "") {
  return IMPACT_OWNERS.has(baseSpellId(spellId));
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
  };

  return durations[id] || 520;
}
