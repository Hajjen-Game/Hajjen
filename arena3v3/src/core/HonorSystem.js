const STORAGE_KEY = "arena3v3-honor-v1";

export const HONOR_REWARDS = Object.freeze({
  VICTORY: 200,
  DEFEAT: 70,
});

// Classic-inspired 14-rank ladder adapted for a single-player game.
// The original WoW system depended on weekly realm/faction standings;
// here the grind is deterministic and persistent instead.
export const HONOR_RANKS = Object.freeze([
  { rank: 1, title: "Private", requiredHonor: 0 },
  { rank: 2, title: "Corporal", requiredHonor: 800 },
  { rank: 3, title: "Sergeant", requiredHonor: 2200 },
  { rank: 4, title: "Master Sergeant", requiredHonor: 4500 },
  { rank: 5, title: "Sergeant Major", requiredHonor: 8000 },
  { rank: 6, title: "Knight", requiredHonor: 13000 },
  { rank: 7, title: "Knight-Lieutenant", requiredHonor: 20000 },
  { rank: 8, title: "Knight-Captain", requiredHonor: 29000 },
  { rank: 9, title: "Knight-Champion", requiredHonor: 40000 },
  { rank: 10, title: "Lieutenant Commander", requiredHonor: 53000 },
  { rank: 11, title: "Commander", requiredHonor: 68000 },
  { rank: 12, title: "Marshal", requiredHonor: 85000 },
  { rank: 13, title: "Field Marshal", requiredHonor: 103000 },
  { rank: 14, title: "Grand Marshal", requiredHonor: 125000 },
]);

function rankForHonor(honor) {
  let current = HONOR_RANKS[0];

  for (const rank of HONOR_RANKS) {
    if (honor < rank.requiredHonor) break;
    current = rank;
  }

  return current;
}

export class HonorSystem {
  constructor() {
    this.state = this.load();
    this.lastAward = null;
    this.reconcileRank();
  }

  load() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!stored) throw new Error("missing");

      return {
        lifetimeHonor: Math.max(0, Number(stored.lifetimeHonor) || 0),
        wins: Math.max(0, Number(stored.wins) || 0),
        losses: Math.max(0, Number(stored.losses) || 0),
        rank: Math.max(1, Math.min(14, Number(stored.rank) || 1)),
        talentPoints: Math.max(0, Number(stored.talentPoints) || 0),
      };
    } catch {
      return {
        lifetimeHonor: 0,
        wins: 0,
        losses: 0,
        rank: 1,
        talentPoints: 0,
      };
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Progression should not block gameplay if storage is unavailable.
    }
  }

  reconcileRank() {
    const current = rankForHonor(this.state.lifetimeHonor);
    this.state.rank = current.rank;
    // One point for every rank gained after Rank 1.
    this.state.talentPoints = Math.max(this.state.talentPoints, current.rank - 1);
    this.save();
  }

  award(result) {
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
