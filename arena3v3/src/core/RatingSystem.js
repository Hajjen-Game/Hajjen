const STORAGE_PREFIX = "arena3v3-rating-v1:";
const STARTING_RATING_RESET_KEY = "arena3v3-rating-reset-1000-v1";

export const STARTING_RATING = 1000;

export const RATING_CHANGES = Object.freeze({
  VICTORY: 25,
  DEFEAT: -25,
});

function emptyState() {
  return {
    rating: STARTING_RATING,
    peakRating: STARTING_RATING,
    matches: 0,
  };
}

function normalizeState(stored) {
  if (!stored) return emptyState();

  const rating = Math.max(0, Math.round(Number(stored.rating) || STARTING_RATING));
  const peakRating = Math.max(
    rating,
    Math.round(Number(stored.peakRating) || rating),
  );

  return {
    rating,
    peakRating,
    matches: Math.max(0, Math.round(Number(stored.matches) || 0)),
  };
}

function storageKey(characterId) {
  return characterId ? STORAGE_PREFIX + characterId : null;
}

export function migrateExistingRatingsToStartingRating(characterIds = []) {
  try {
    if (localStorage.getItem(STARTING_RATING_RESET_KEY) === "1") return false;

    for (const characterId of characterIds) {
      const key = storageKey(characterId);
      if (!key) continue;

      const stored = JSON.parse(localStorage.getItem(key) || "null");
      if (!stored) continue;

      const state = normalizeState(stored);
      state.rating = STARTING_RATING;
      state.peakRating = Math.max(state.peakRating, STARTING_RATING);
      localStorage.setItem(key, JSON.stringify(state));
    }

    localStorage.setItem(STARTING_RATING_RESET_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

export class RatingSystem {
  constructor(characterId = null) {
    this.characterId = characterId;
    this.storageKey = storageKey(characterId);
    this.state = this.load();
    this.lastAward = null;
  }

  load() {
    if (!this.storageKey) return emptyState();

    try {
      return normalizeState(
        JSON.parse(localStorage.getItem(this.storageKey) || "null"),
      );
    } catch {
      return emptyState();
    }
  }

  save() {
    if (!this.storageKey) return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch {
      // Rating should never block arena gameplay if storage is unavailable.
    }
  }

  award(result) {
    if (!this.characterId) return null;

    const change = RATING_CHANGES[result];
    if (!Number.isFinite(change)) return null;

    const before = this.state.rating;
    const after = Math.max(0, before + change);

    this.state.rating = after;
    this.state.peakRating = Math.max(this.state.peakRating, after);
    this.state.matches += 1;
    this.save();

    this.lastAward = {
      result,
      before,
      after,
      change: after - before,
      peakRating: this.state.peakRating,
      matches: this.state.matches,
    };

    return this.lastAward;
  }

  status() {
    return { ...this.state };
  }
}
