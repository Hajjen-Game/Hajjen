import { arenaConfig as grandRingArena } from "./nagrand-inspired/config.js";
import { twinRuinsArena } from "./twin-ruins/config.js";

export const ARENA_REGISTRY = Object.freeze({
  [grandRingArena.id]: grandRingArena,
  [twinRuinsArena.id]: twinRuinsArena,
});

export const ARENA_IDS = Object.freeze(Object.keys(ARENA_REGISTRY));
export const DEFAULT_ARENA_ID = grandRingArena.id;
export const DEFAULT_ARENA = ARENA_REGISTRY[DEFAULT_ARENA_ID];

export function arenaById(arenaId) {
  return ARENA_REGISTRY[arenaId] || DEFAULT_ARENA;
}

export function randomArena(previousArenaId = null, random = Math.random) {
  const candidates = ARENA_IDS.filter(arenaId =>
    ARENA_IDS.length <= 1 || arenaId !== previousArenaId
  );

  const index = Math.floor(random() * candidates.length);
  return arenaById(candidates[Math.max(0, Math.min(candidates.length - 1, index))]);
}
