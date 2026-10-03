import { arenaConfig as grandRingArena } from "./nagrand-inspired/config.js";
import { windscarProvingGroundsArena } from "./windscar-proving-grounds/config.js?v=20260925-windscar2";
import { emberwatchBastionArena } from "./emberwatch-bastion/config.js?v=20261002-bastion1";
import { sunscarCanyonArena } from "./sunscar-canyon/config.js?v=20261003-pixiimage1";

export const ARENA_REGISTRY = Object.freeze({
  [grandRingArena.id]: grandRingArena,
  [windscarProvingGroundsArena.id]: windscarProvingGroundsArena,
  [emberwatchBastionArena.id]: emberwatchBastionArena,
  [sunscarCanyonArena.id]: sunscarCanyonArena,
});

export const ARENA_IDS = Object.freeze(Object.keys(ARENA_REGISTRY));
export const DEFAULT_ARENA_ID = grandRingArena.id;
export const DEFAULT_ARENA = ARENA_REGISTRY[DEFAULT_ARENA_ID];

export function arenaById(arenaId) {
  return ARENA_REGISTRY[arenaId] || DEFAULT_ARENA;
}

export function randomArena(previousArenaId = null, random = Math.random) {
  const candidates = ARENA_IDS.filter(arenaId => {
    const arena=ARENA_REGISTRY[arenaId];
    if(arena?.previewOnly) return false;
    return ARENA_IDS.length <= 1 || arenaId !== previousArenaId;
  });

  const index = Math.floor(random() * candidates.length);
  return arenaById(candidates[Math.max(0, Math.min(candidates.length - 1, index))]);
}
