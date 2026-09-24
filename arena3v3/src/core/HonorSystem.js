const LEGACY_STORAGE_KEY = "arena3v3-honor-v1";
const STORAGE_PREFIX = "arena3v3-honor-v2:";
const LEGACY_MIGRATION_KEY = "arena3v3-honor-v2-legacy-migrated";

export const HONOR_REWARDS = Object.freeze({
  VICTORY: 200,
  DEFEAT: 70,
});

export const HONOR_RANKS = Object.freeze([
  { rank: 1, title: "Private", requiredHonor: 0 },
  { rank: 2, title: "Corporal", requiredHonor: 400 },
  { rank: 3, title: "Sergeant", requiredHonor: 1100 },
  { rank: 4, title: "Master Sergeant", requiredHonor: 2250 },
  { rank: 5, title: "Sergeant Major", requiredHonor: 4000 },
  { rank: 6, title: "Knight", requiredHonor: 6500 },
  { rank: 7, title: "Knight-Lieutenant", requiredHonor: 10000 },
  { rank: 8, title: "Knight-Captain", requiredHonor: 14500 },
  { rank: 9, title: "Knight-Champion", requiredHonor: 20000 },
  { rank: 10, title: "Lieutenant Commander", requiredHonor: 26500 },
  { rank: 11, title: "Commander", requiredHonor: 34000 },
  { rank: 12, title: "Marshal", requiredHonor: 42500 },
  { rank: 13, title: "Field Marshal", requiredHonor: 51500 },
  { rank: 14, title: "Grand Marshal", requiredHonor: 62500 },
]);

function emptyState() {
  return {
    lifetimeHonor: 0,
    wins: 0,
    losses: 0,
    rank: 1,
    talentPoints: 0,
  };
}

function normalizeState(stored) {
  if (!stored) return emptyState();

  return {
    lifetimeHonor: Math.max(0, Number(stored.lifetimeHonor) || 0),
    wins: Math.max(0, Number(stored.wins) || 0),
    losses: Math.max(0, Number(stored.losses) || 0),
    rank: Math.max(1, Math.min(14, Number(stored.rank) || 1)),
    talentPoints: Math.max(0, Number(stored.talentPoints) || 0),
  };
}

function storageKey(characterId) {
  return characterId ? STORAGE_PREFIX + characterId : null;
}

function rankForHonor(honor) {
  let current = HONOR_RANKS[0];

  for (const rank of HONOR_RANKS) {
    if (honor < rank.requiredHonor) break;
    current = rank;
  }

  return current;
}

export function legacyHonorAvailable() {
  try {
    if (localStorage.getItem(LEGACY_MIGRATION_KEY) === "1") return false;
    const legacy = normalizeState(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null"));
    return legacy.lifetimeHonor > 0 || legacy.wins > 0 || legacy.losses > 0 || legacy.talentPoints > 0;
  } catch {
    return false;
  }
}

export function migrateLegacyHonor(characterId) {
  const key = storageKey(characterId);
  if (!key) return false;

  try {
    if (!legacyHonorAvailable() || localStorage.getItem(key)) return false;

    const legacy = normalizeState(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "null"));
    localStorage.setItem(key, JSON.stringify(legacy));
    localStorage.setItem(LEGACY_MIGRATION_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export class HonorSystem {
  constructor(characterId = null) {
    this.characterId = characterId;
    this.storageKey = storageKey(characterId);
    this.state = this.load();
    this.lastAward = null;
    this.reconcileRank();
  }

  load() {
    if (!this.storageKey) return emptyState();

    try {
      return normalizeState(JSON.parse(localStorage.getItem(this.storageKey) || "null"));
    } catch {
      return emptyState();
    }
  }

  save() {
    if (!this.storageKey) return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // Progression should not block gameplay if storage is unavailable.
    }
  }

  reconcileRank() {
    const current = rankForHonor(this.state.lifetimeHonor);
    this.state.rank = current.rank;
    this.state.talentPoints = Math.max(this.state.talentPoints, current.rank - 1);
    this.save();
  }

  award(result) {
    if (!this.characterId) return null;

    const gain = HONOR_REWARDS[result];
    if (!gain) return null;

    const before = rankForHonor(this.state.lifetimeHonor);
    this.state.lifetimeHonor += gain;

    if (result === "VICTORY") this.state.wins += 1;
    else this.state.losses += 1;

    const after = rankForHonor(this.state.lifetimeHonor);
    const ranksGained = Math.max(0, after.rank - before.rank);
    const talentPointsGained = ranksGained;

    this.state.rank = after.rank;
    this.state.talentPoints += talentPointsGained;
    this.save();

    this.lastAward = {
      result,
      honor: gain,
      rankBefore: before.rank,
      rankAfter: after.rank,
      rankTitle: after.title,
      rankedUp: ranksGained > 0,
      ranksGained,
      talentPointsGained,
      lifetimeHonor: this.state.lifetimeHonor,
      talentPoints: this.state.talentPoints,
    };

    return this.lastAward;
  }

  status() {
    const current = rankForHonor(this.state.lifetimeHonor);
    const next = HONOR_RANKS.find(item => item.rank === current.rank + 1) || null;

    let progress = 1;
    let progressHonor = 0;
    let neededHonor = 0;

    if (next) {
      const currentFloor = current.requiredHonor;
      const span = next.requiredHonor - currentFloor;
      progressHonor = this.state.lifetimeHonor - currentFloor;
      neededHonor = span;
      progress = Math.max(0, Math.min(1, progressHonor / span));
    }

    return {
      ...this.state,
      rank: current.rank,
      title: current.title,
      nextRank: next,
      progress,
      progressHonor,
      neededHonor,
    };
  }
}
