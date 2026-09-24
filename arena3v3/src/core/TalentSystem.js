import { TALENT_TREE_REGISTRY } from "../content/talents/registry.js";

const STORAGE_PREFIX = "arena3v3-talents-v1:";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function talentEntries(tree) {
  if (!tree) return [];
  return tree.branches.flatMap(branch =>
    branch.talents.map(talent => ({ branch, talent }))
  );
}

function talentForId(tree, talentId) {
  return talentEntries(tree).find(entry => entry.talent.id === talentId) || null;
}

function scaledValue(value, perRank, rank, min = -Infinity, integer = true) {
  const next = Number(value || 0) * (1 + perRank * rank);
  const bounded = Math.max(min, next);
  return integer ? Math.round(bounded) : bounded;
}

function addedValue(value, perRank, rank, min = -Infinity, integer = true) {
  const next = Number(value || 0) + perRank * rank;
  const bounded = Math.max(min, next);
  return integer ? Math.round(bounded) : bounded;
}

function matchingSpellEffects(spell, effect) {
  if (!spell) return [];
  const kinds = effect.kinds || (effect.kind ? [effect.kind] : []);
  return spell.effects.filter(item => kinds.length === 0 || kinds.includes(item.kind));
}

function applyTalentEffect(config, effect, rank) {
  if (!effect || rank <= 0) return;

  if (effect.type === "unlockSpell") {
    if (rank < (effect.minRank || 1)) return;
    if (!config.spells.some(spell => spell.id === effect.spell.id)) {
      config.spells.push(clone(effect.spell));
    }
    return;
  }

  if (effect.type === "passiveAdd") {
    config.talentPassives ||= {};
    config.talentPassives[effect.key] =
      Number(config.talentPassives[effect.key] || 0) + Number(effect.perRank || 0) * rank;
    return;
  }

  if (effect.type === "resourceFieldScale") {
    config.resource[effect.field] = scaledValue(
      config.resource[effect.field],
      effect.perRank,
      rank,
      effect.min,
      effect.integer === true,
    );
    return;
  }

  if (effect.type === "statFieldScale") {
    config.stats[effect.field] = scaledValue(
      config.stats[effect.field],
      effect.perRank,
      rank,
      effect.min,
      effect.integer === true,
    );
    return;
  }

  if (effect.type === "statFieldAdd") {
    config.stats[effect.field] = addedValue(
      config.stats[effect.field],
      effect.perRank,
      rank,
      effect.min,
      effect.integer === true,
    );
    return;
  }

  const spell = config.spells.find(item => item.id === effect.spellId);
  if (!spell) return;

  if (effect.type === "spellFieldScale") {
    spell[effect.field] = scaledValue(
      spell[effect.field],
      effect.perRank,
      rank,
      effect.min,
      effect.integer !== false,
    );
    return;
  }

  if (effect.type === "spellFieldAdd") {
    spell[effect.field] = addedValue(
      spell[effect.field],
      effect.perRank,
      rank,
      effect.min,
      effect.integer !== false,
    );
    return;
  }

  if (effect.type === "spellEffectScale") {
    for (const spellEffect of matchingSpellEffects(spell, effect)) {
      const field = effect.field || "amount";
      spellEffect[field] = scaledValue(
        spellEffect[field],
        effect.perRank,
        rank,
        effect.min,
        effect.integer !== false,
      );
    }
    return;
  }

  if (effect.type === "spellEffectFieldAdd") {
    for (const spellEffect of matchingSpellEffects(spell, effect)) {
      spellEffect[effect.field] = addedValue(
        spellEffect[effect.field],
        effect.perRank,
        rank,
        effect.min,
        effect.integer !== false,
      );
    }
  }
}

export class TalentSystem {
  constructor(characterId = null, classId = null) {
    this.characterId = characterId;
    this.classId = classId;
    this.tree = classId ? TALENT_TREE_REGISTRY[classId] || null : null;
    this.allocations = this.load();
  }

  storageKey() {
    return this.characterId ? STORAGE_PREFIX + this.characterId : null;
  }

  load() {
    const key = this.storageKey();
    if (!key || !this.tree) return {};

    try {
      const stored = JSON.parse(localStorage.getItem(key) || "{}");
      const allocations = {};

      for (const { talent } of talentEntries(this.tree)) {
        const rank = Math.max(0, Math.min(talent.maxRank, Number(stored[talent.id]) || 0));
        if (rank > 0) allocations[talent.id] = rank;
      }

      return allocations;
    } catch {
      return {};
    }
  }

  save() {
    const key = this.storageKey();
    if (!key) return;

    try {
      localStorage.setItem(key, JSON.stringify(this.allocations));
    } catch {
      // Talent progression should never block gameplay.
    }
  }

  rank(talentId) {
    return Number(this.allocations[talentId] || 0);
  }

  spentPoints() {
    return Object.values(this.allocations)
      .reduce((sum, rank) => sum + Math.max(0, Number(rank) || 0), 0);
  }

  branchSpent(branchId) {
    const branch = this.tree?.branches.find(item => item.id === branchId);
    if (!branch) return 0;
    return branch.talents.reduce((sum, talent) => sum + this.rank(talent.id), 0);
  }

  availablePoints(earnedPoints) {
    return Math.max(0, Math.floor(Number(earnedPoints) || 0) - this.spentPoints());
  }

  canSpend(talentId, earnedPoints) {
    if (!this.tree) return { ok: false, reason: "Talent tree not available for this class yet." };

    const entry = talentForId(this.tree, talentId);
    if (!entry) return { ok: false, reason: "Unknown talent." };

    const currentRank = this.rank(talentId);
    if (currentRank >= entry.talent.maxRank) {
      return { ok: false, reason: "Talent is already maxed." };
    }

    if (this.availablePoints(earnedPoints) <= 0) {
      return { ok: false, reason: "No Talent Points available." };
    }

    const branchPoints = this.branchSpent(entry.branch.id);
    if (branchPoints < entry.talent.requiredPoints) {
      return {
        ok: false,
        reason: "Spend " + entry.talent.requiredPoints + " points in " + entry.branch.name + " first.",
      };
    }

    return { ok: true, reason: "" };
  }

  spend(talentId, earnedPoints) {
    const check = this.canSpend(talentId, earnedPoints);
    if (!check.ok) return check;

    this.allocations[talentId] = this.rank(talentId) + 1;
    this.save();
    return { ok: true, reason: "" };
  }

  reset() {
    this.allocations = {};
    this.save();
  }

  status(earnedPoints = 0) {
    const branchPoints = {};

    for (const branch of this.tree?.branches || []) {
      branchPoints[branch.id] = this.branchSpent(branch.id);
    }

    return {
      tree: this.tree,
      allocations: { ...this.allocations },
      earnedPoints: Math.max(0, Math.floor(Number(earnedPoints) || 0)),
      spentPoints: this.spentPoints(),
      availablePoints: this.availablePoints(earnedPoints),
      branchPoints,
    };
  }

  applyToConfig(baseConfig) {
    const config = clone(baseConfig);

    if (!this.tree || config.classId !== this.classId) return config;

    config.talentPassives = { ...(config.talentPassives || {}) };

    for (const branch of this.tree.branches) {
      for (const talent of branch.talents) {
        const rank = this.rank(talent.id);
        if (rank <= 0) continue;

        for (const effect of talent.effects || []) {
          applyTalentEffect(config, effect, rank);
        }
      }
    }

    return config;
  }
}
