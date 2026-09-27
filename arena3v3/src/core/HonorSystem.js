const LEGACY_STORAGE_KEY = "arena3v3-honor-v1";
const STORAGE_PREFIX = "arena3v3-honor-v2:";
const LEGACY_MIGRATION_KEY = "arena3v3-honor-v2-legacy-migrated";

export const HONOR_REWARDS = Object.freeze({
  VICTORY: 200,
  DEFEAT: 70,
});

export const HONOR_RANKS = Object.freeze([
  { rank: 1, requiredHonor: 0, talentPointsAward: 0, totalTalentPoints: 0 },
  { rank: 2, requiredHonor: 150, talentPointsAward: 1, totalTalentPoints: 1 },
  { rank: 3, requiredHonor: 300, talentPointsAward: 1, totalTalentPoints: 2 },
  { rank: 4, requiredHonor: 550, talentPointsAward: 1, totalTalentPoints: 3 },
  { rank: 5, requiredHonor: 800, talentPointsAward: 1, totalTalentPoints: 4 },
  { rank: 6, requiredHonor: 1200, talentPointsAward: 1, totalTalentPoints: 5 },
  { rank: 7, requiredHonor: 1600, talentPointsAward: 1, totalTalentPoints: 6 },
  { rank: 8, requiredHonor: 2700, talentPointsAward: 1, totalTalentPoints: 7 },
  { rank: 9, requiredHonor: 3450, talentPointsAward: 1, totalTalentPoints: 8 },
  { rank: 10, requiredHonor: 4200, talentPointsAward: 1, totalTalentPoints: 9 },
  { rank: 11, requiredHonor: 6100, talentPointsAward: 1, totalTalentPoints: 10 },
  { rank: 12, requiredHonor: 7300, talentPointsAward: 1, totalTalentPoints: 11 },
  { rank: 13, requiredHonor: 8500, talentPointsAward: 1, totalTalentPoints: 12 },
  { rank: 14, requiredHonor: 11500, talentPointsAward: 1, totalTalentPoints: 13 },
  { rank: 15, requiredHonor: 15100, talentPointsAward: 1, totalTalentPoints: 14 },
  { rank: 16, requiredHonor: 17200, talentPointsAward: 1, totalTalentPoints: 15 },
  { rank: 17, requiredHonor: 19300, talentPointsAward: 1, totalTalentPoints: 16 },
  { rank: 18, requiredHonor: 24100, talentPointsAward: 1, totalTalentPoints: 17 },
  { rank: 19, requiredHonor: 29500, talentPointsAward: 1, totalTalentPoints: 18 },
  { rank: 20, requiredHonor: 35500, talentPointsAward: 1, totalTalentPoints: 19 },
]);

function emptyState() {
  return {
    lifetimeHonor: 0,
    honorPoints: 0,
    wins: 0,
    losses: 0,
    rank: 1,
    talentPoints: 0,
  };
}

function normalizeState(stored) {
  if (!stored) return emptyState();

  const lifetimeHonor = Math.max(0, Number(stored.lifetimeHonor) || 0);
  const hasHonorWallet = Object.prototype.hasOwnProperty.call(stored, "honorPoints");

  return {
    lifetimeHonor,
    // One-time migration for characters created before purchasable gear existed:
    // all Honor they already earned becomes spendable once, without reducing rank.
    honorPoints: hasHonorWallet
      ? Math.max(0, Number(stored.honorPoints) || 0)
      : lifetimeHonor,
    wins: Math.max(0, Number(stored.wins) || 0),
    losses: Math.max(0, Number(stored.losses) || 0),
    rank: Math.max(1, Math.min(20, Number(stored.rank) || 1)),
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

export function talentPointsForRank(rank) {
  const entry = HONOR_RANKS.find(item => item.rank === rank) || HONOR_RANKS[0];
  return entry.totalTalentPoints || 0;
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
    this.state.talentPoints = Math.max(
      this.state.talentPoints,
      talentPointsForRank(current.rank),
    );
    this.save();
  }

  award(result) {
    if (!this.characterId) return null;

    const gain = HONOR_REWARDS[result];
    if (!gain) return null;

    const before = rankForHonor(this.state.lifetimeHonor);
    this.state.lifetimeHonor += gain;
    this.state.honorPoints += gain;

    if (result === "VICTORY") this.state.wins += 1;
    else this.state.losses += 1;

    const after = rankForHonor(this.state.lifetimeHonor);
    const ranksGained = Math.max(0, after.rank - before.rank);
    const talentPointsGained = Math.max(
      0,
      talentPointsForRank(after.rank) - talentPointsForRank(before.rank),
    );

    this.state.rank = after.rank;
    this.state.talentPoints = Math.max(
      this.state.talentPoints,
      talentPointsForRank(after.rank),
    );
    this.save();

    this.lastAward = {
      result,
      honor: gain,
      rankBefore: before.rank,
      rankAfter: after.rank,
      rankedUp: ranksGained > 0,
      ranksGained,
      talentPointsGained,
      lifetimeHonor: this.state.lifetimeHonor,
      honorPoints: this.state.honorPoints,
      talentPoints: this.state.talentPoints,
    };

    return this.lastAward;
  }

  spend(amount) {
    const cost = Math.max(0, Math.round(Number(amount) || 0));
    if (cost <= 0) return true;
    if (this.state.honorPoints < cost) return false;

    this.state.honorPoints -= cost;
    this.save();
    return true;
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
