import { rogueGear } from "../content/gear/rogue.js";
import { warriorGear } from "../content/gear/warrior.js";
import { shamanGear } from "../content/gear/shaman.js";

const STORAGE_PREFIX = "arena3v3-gear-v1:";

const GEAR_REGISTRY = Object.freeze({
  rogue: rogueGear,
  warrior: warriorGear,
  shaman: shamanGear,
});

function cloneConfig(config) {
  if (globalThis.structuredClone) return structuredClone(config);
  return JSON.parse(JSON.stringify(config));
}

function storageKey(characterId) {
  return characterId ? STORAGE_PREFIX + characterId : null;
}

function emptyState() {
  return {
    owned: [],
    equipped: {},
  };
}

function itemMapFor(definition) {
  return new Map((definition?.items || []).map(item => [item.id, item]));
}

function normalizeState(stored, definition) {
  if (!definition || !stored) return emptyState();

  const items = itemMapFor(definition);
  const owned = [...new Set(
    (Array.isArray(stored.owned) ? stored.owned : [])
      .filter(itemId => items.has(itemId)),
  )];

  const ownedSet = new Set(owned);
  const equipped = {};

  for (const [slot, itemId] of Object.entries(stored.equipped || {})) {
    const item = items.get(itemId);
    if (!item || item.slot !== slot || !ownedSet.has(itemId)) continue;
    equipped[slot] = itemId;
  }

  return { owned, equipped };
}

function scaleSpellEffects(spells, kinds, multiplier) {
  if (!Number.isFinite(multiplier) || multiplier === 1) return;

  for (const spell of spells || []) {
    for (const effect of spell.effects || []) {
      if (!kinds.includes(effect.kind) || !Number.isFinite(effect.amount)) continue;
      effect.amount = Math.max(0, Math.round(effect.amount * multiplier));
    }
  }
}

function applySetEffect(config, effect) {
  if (!config || !effect) return;

  if (effect.type === "allSpellEffectScale") {
    scaleSpellEffects(
      config.spells,
      effect.kinds || [],
      1 + (Number(effect.scale) || 0),
    );
    return;
  }

  if (effect.type === "spellFieldAdd") {
    const spell = config.spells?.find(candidate => candidate.id === effect.spellId);
    if (!spell || !Number.isFinite(spell[effect.field])) return;

    const value = spell[effect.field] + (Number(effect.amount) || 0);
    spell[effect.field] = Number.isFinite(effect.min)
      ? Math.max(effect.min, value)
      : value;
    return;
  }

  if (effect.type === "resourceFieldScale") {
    const current = config.resource?.[effect.field];
    if (!Number.isFinite(current)) return;

    const value = current * (1 + (Number(effect.scale) || 0));
    config.resource[effect.field] = effect.integer ? Math.round(value) : value;
    return;
  }

  if (effect.type === "statFieldScale") {
    const current = config.stats?.[effect.field];
    if (!Number.isFinite(current)) return;

    const value = current * (1 + (Number(effect.scale) || 0));
    config.stats[effect.field] = effect.integer ? Math.round(value) : value;
  }
}

export function describeGearStats(item) {
  const lines = [];
  const stats = item?.stats || {};

  if (stats.stamina) lines.push("+" + stats.stamina + " Health");
  if (stats.power) lines.push("+" + Math.round(stats.power * 1000) / 10 + "% Power");
  if (stats.criticalStrike) {
    lines.push("+" + Math.round(stats.criticalStrike * 1000) / 10 + "% Critical Strike");
  }
  if (stats.haste) lines.push("+" + Math.round(stats.haste * 1000) / 10 + "% Haste");
  if (stats.resolve) lines.push("+" + Math.round(stats.resolve * 1000) / 10 + "% Resolve");

  const spellNames = {
    "rogue-eviscerate": "Eviscerate",
    "warrior-slam": "Slam",
    "shaman-lava-burst": "Lava Burst",
    "shaman-stormstrike": "Stormstrike",
  };

  for (const modifier of item?.spellModifiers || []) {
    if (modifier.kind !== "damage") continue;
    const spellName = spellNames[modifier.spellId] || modifier.spellId;
    lines.push(spellName + " +" + Math.round((modifier.scale || 0) * 100) + "% damage");
  }

  return lines;
}

export class GearSystem {
  constructor(characterId = null, classId = null) {
    this.characterId = characterId;
    this.classId = classId;
    this.definition = GEAR_REGISTRY[classId] || null;
    this.storageKey = storageKey(characterId);
    this.state = this.load();
  }

  load() {
    if (!this.storageKey || !this.definition) return emptyState();

    try {
      return normalizeState(
        JSON.parse(localStorage.getItem(this.storageKey) || "null"),
        this.definition,
      );
    } catch {
      return emptyState();
    }
  }

  save() {
    if (!this.storageKey || !this.definition) return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // Gear progression should never block the match if storage is unavailable.
    }
  }

  item(itemId) {
    return this.definition?.items.find(item => item.id === itemId) || null;
  }

  equippedItems() {
    if (!this.definition) return [];

    return Object.values(this.state.equipped)
      .map(itemId => this.item(itemId))
      .filter(Boolean);
  }

  setPieceCount() {
    const setId = this.definition?.set?.id;
    if (!setId) return 0;

    return this.equippedItems()
      .filter(item => item.setId === setId)
      .length;
  }

  activeSetBonuses() {
    const pieces = this.setPieceCount();
    return (this.definition?.set?.bonuses || [])
      .filter(bonus => pieces >= bonus.pieces);
  }

  canPurchase(itemId, rank, honorPoints) {
    const item = this.item(itemId);

    if (!this.definition) {
      return { ok: false, reason: "Gear is not available for this class yet." };
    }
    if (!item) return { ok: false, reason: "Unknown gear item." };
    if (this.state.owned.includes(item.id)) {
      return { ok: false, reason: "Already owned." };
    }
    if (rank < item.rankRequired) {
      return {
        ok: false,
        reason: "Requires Rank " + item.rankRequired + ".",
      };
    }
    if (item.upgradeFrom && !this.state.owned.includes(item.upgradeFrom)) {
      const base = this.item(item.upgradeFrom);
      return {
        ok: false,
        reason: "Requires " + (base?.name || "the previous item") + ".",
      };
    }
    if (honorPoints < item.cost) {
      return {
        ok: false,
        reason: "Need " + (item.cost - honorPoints).toLocaleString() + " more Honor Points.",
      };
    }

    return { ok: true };
  }

  purchase(itemId, rank, honorSystem) {
    const honor = honorSystem?.status?.();
    const check = this.canPurchase(itemId, rank, honor?.honorPoints || 0);
    if (!check.ok) return check;

    const item = this.item(itemId);
    if (!honorSystem.spend(item.cost)) {
      return { ok: false, reason: "Not enough Honor Points." };
    }

    this.state.owned.push(item.id);
    this.state.equipped[item.slot] = item.id;
    this.save();

    return {
      ok: true,
      item,
      equipped: true,
    };
  }

  status(rank = 1, honorPoints = 0) {
    if (!this.definition) {
      return {
        available: false,
        classId: this.classId,
        owned: [],
        equipped: {},
        items: [],
        set: null,
        setPieces: 0,
        activeSetBonuses: [],
      };
    }

    const ownedSet = new Set(this.state.owned);

    return {
      available: true,
      classId: this.classId,
      definition: this.definition,
      owned: [...this.state.owned],
      equipped: { ...this.state.equipped },
      set: this.definition.set,
      setPieces: this.setPieceCount(),
      activeSetBonuses: this.activeSetBonuses(),
      items: this.definition.items.map(item => ({
        ...item,
        owned: ownedSet.has(item.id),
        equipped: this.state.equipped[item.slot] === item.id,
        purchase: this.canPurchase(item.id, rank, honorPoints),
      })),
    };
  }

  applyToConfig(config) {
    if (!this.definition || config.classId !== this.classId) return config;

    const next = cloneConfig(config);
    const items = this.equippedItems();

    let stamina = 0;
    let power = 0;
    let criticalStrike = 0;
    let haste = 0;
    let resolve = 0;

    for (const item of items) {
      const stats = item.stats || {};
      stamina += Number(stats.stamina) || 0;
      power += Number(stats.power) || 0;
      criticalStrike += Number(stats.criticalStrike) || 0;
      haste += Number(stats.haste) || 0;
      resolve += Number(stats.resolve) || 0;
    }

    next.stats.maxHealth = Math.round(next.stats.maxHealth + stamina);
    next.stats.critChance = Math.min(0.75, next.stats.critChance + criticalStrike);

    if (haste > 0) {
      for (const spell of next.spells || []) {
        if (spell.castMs > 0) {
          spell.castMs = Math.max(250, Math.round(spell.castMs * (1 - haste)));
        }
      }
    }

    if (power > 0) {
      scaleSpellEffects(next.spells, ["damage", "heal", "hot", "dot", "chainDamage"], 1 + power);
    }

    const baseResolve = Number(next.stats.baseDamageReduction) || 0;
    next.stats.baseDamageReduction = Math.min(
      0.25,
      1 - (1 - baseResolve) * (1 - Math.min(0.25, resolve)),
    );

    const setPieces = this.setPieceCount();

    for (const bonus of this.definition.set?.bonuses || []) {
      if (setPieces < bonus.pieces) continue;
      for (const effect of bonus.effects || []) {
        applySetEffect(next, effect);
      }
    }

    for (const item of items) {
      for (const modifier of item.spellModifiers || []) {
        const spell = next.spells.find(candidate => candidate.id === modifier.spellId);
        if (!spell) continue;

        for (const effect of spell.effects || []) {
          if (effect.kind !== modifier.kind || !Number.isFinite(effect.amount)) continue;
          effect.amount = Math.round(effect.amount * (1 + (modifier.scale || 0)));
        }
      }
    }

    next.gearSummary = {
      equippedCount: items.length,
      setPieces,
      setName: this.definition.set?.name || null,
    };

    return next;
  }
}
