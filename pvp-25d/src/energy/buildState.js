import {
  ABILITY_BY_ID, FREE_ABILITIES, ROLES, TALENT_BUDGET, MAX_TALENT_RANK,
  MAX_ACTIVE_EVOLUTIONS, FREE_ABILITY_SLOTS, SAVED_BUILD_SLOTS, MAX_FLUX, BASE_FLUX_REGEN,
} from "./abilityCatalog.js?v=20261010-origins35";

export const ENERGY_STORAGE_KEY = "pvp25d-energy-builds-v1";
const VERSION = 1;
const FREE_IDS = new Set(FREE_ABILITIES.map(a => a.id));

export function createBuild(role = "healer") {
  if (!ROLES[role]) throw new Error("Unknown role: " + role);
  return {
    version: VERSION, role, name: ROLES[role].name + " Build",
    freeSlots: Array(FREE_ABILITY_SLOTS).fill(null),
    talents: {}, evolutions: {},
  };
}

export function allEquippedIds(build) {
  return [...ROLES[build.role].locked, ...build.freeSlots.filter(Boolean)];
}

export function spentTalentPoints(build) {
  return Object.values(build.talents).reduce((sum, n) => sum + n, 0);
}

export function activeEvolutionCount(build) {
  return Object.keys(build.evolutions).length;
}

export function isReady(build) {
  return build.freeSlots.every(Boolean);
}

export function validateBuild(build) {
  const problems = [];
  if (!build || !ROLES[build.role]) return ["Unknown build role"];
  if (!Array.isArray(build.freeSlots) || build.freeSlots.length !== FREE_ABILITY_SLOTS) {
    return ["Invalid free slot count"];
  }
  const free = build.freeSlots.filter(Boolean);
  if (free.some(id => !FREE_IDS.has(id))) problems.push("Unknown or role-locked ability in a free slot");
  if (new Set(free).size !== free.length) problems.push("Duplicate free abilities");
  const equipped = new Set([...ROLES[build.role].locked, ...free]);
  if (!build.talents || typeof build.talents !== "object" || Array.isArray(build.talents)) {
    problems.push("Invalid talents");
  } else {
    for (const [id, rank] of Object.entries(build.talents)) {
      if (!equipped.has(id) || !Number.isInteger(rank) || rank < 1 || rank > MAX_TALENT_RANK) {
        problems.push("Invalid talent: " + id);
      }
    }
    if (spentTalentPoints(build) > TALENT_BUDGET) problems.push("Talent budget exceeded");
  }
  if (!build.evolutions || typeof build.evolutions !== "object" || Array.isArray(build.evolutions)) {
    problems.push("Invalid evolutions");
  } else {
    if (activeEvolutionCount(build) > MAX_ACTIVE_EVOLUTIONS) problems.push("Evolution limit exceeded");
    for (const [id, evolution] of Object.entries(build.evolutions)) {
      if (!equipped.has(id) || build.talents[id] !== MAX_TALENT_RANK
        || !ABILITY_BY_ID[id]?.evolutions.some(e => e.id === evolution)) {
        problems.push("Invalid evolution: " + id);
      }
    }
  }
  return problems;
}

export function normalizeBuild(raw) {
  const build = createBuild(ROLES[raw?.role] ? raw.role : "healer");
  if (!raw || typeof raw !== "object") return build;
  build.name = typeof raw.name === "string" ? raw.name.trim().slice(0, 38) || build.name : build.name;
  // Rename only original default build titles; never overwrite a custom preset name.
  const oldNames = {healer:"Healer Build",melee:"Melee Build",caster:"Caster Build"};
  if (build.name === oldNames[build.role]) build.name = ROLES[build.role].name + " Build";
  if (Array.isArray(raw.freeSlots)) {
    const seen = new Set();
    for (let i = 0; i < FREE_ABILITY_SLOTS; i += 1) {
      const id = raw.freeSlots[i];
      if (FREE_IDS.has(id) && !seen.has(id)) {
        seen.add(id);
        build.freeSlots[i] = id;
      }
    }
  }
  const equipped = new Set(allEquippedIds(build));
  let points = TALENT_BUDGET;
  if (raw.talents && typeof raw.talents === "object" && !Array.isArray(raw.talents)) {
    for (const id of allEquippedIds(build)) {
      const rank = Number(raw.talents[id]);
      if (!Number.isInteger(rank) || rank <= 0) continue;
      const amount = Math.min(MAX_TALENT_RANK, rank, points);
      if (amount > 0) {
        build.talents[id] = amount;
        points -= amount;
      }
    }
  }
  if (raw.evolutions && typeof raw.evolutions === "object" && !Array.isArray(raw.evolutions)) {
    for (const id of allEquippedIds(build)) {
      if (Object.keys(build.evolutions).length >= MAX_ACTIVE_EVOLUTIONS) break;
      if (!equipped.has(id) || build.talents[id] !== MAX_TALENT_RANK) continue;
      const ev = raw.evolutions[id];
      if (ABILITY_BY_ID[id].evolutions.some(choice => choice.id === ev)) build.evolutions[id] = ev;
    }
  }
  return build;
}

function clone(build) {
  return {
    ...build, freeSlots: [...build.freeSlots],
    talents: { ...build.talents }, evolutions: { ...build.evolutions },
  };
}

export function renameBuild(build, name) {
  const next = clone(build);
  next.name = String(name || "").trim().slice(0, 38) || ROLES[build.role].name + " Build";
  return next;
}

export function changeRole(build, role) {
  if (!ROLES[role]) throw new Error("Unknown role");
  if (role === build.role) return clone(build);
  // The role-bound abilities change. A role switch intentionally starts a new build.
  return createBuild(role);
}

export function equipAbility(build, slotIndex, abilityId) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= FREE_ABILITY_SLOTS) {
    throw new Error("Choose one of the eight free slots");
  }
  if (!FREE_IDS.has(abilityId)) throw new Error("Only shared abilities can go into free slots");
  if (build.freeSlots.some((id, index) => id === abilityId && index !== slotIndex)) {
    throw new Error("Already equipped. Remove it from the other slot first.");
  }
  const next = clone(build);
  const old = next.freeSlots[slotIndex];
  if (old !== abilityId) {
    delete next.talents[old];
    delete next.evolutions[old];
    next.freeSlots[slotIndex] = abilityId;
  }
  return next;
}

export function clearAbility(build, slotIndex) {
  if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= FREE_ABILITY_SLOTS) {
    throw new Error("Role abilities cannot be removed");
  }
  const next = clone(build);
  const old = next.freeSlots[slotIndex];
  next.freeSlots[slotIndex] = null;
  if (old) {
    delete next.talents[old];
    delete next.evolutions[old];
  }
  return next;
}

export function adjustTalent(build, abilityId, delta) {
  if (!allEquippedIds(build).includes(abilityId)) throw new Error("Equip the ability first");
  if (delta !== -1 && delta !== 1) throw new Error("Invalid talent change");
  const next = clone(build);
  const rank = next.talents[abilityId] || 0;
  const proposed = rank + delta;
  if (proposed < 0 || proposed > MAX_TALENT_RANK) throw new Error("Talent rank must be between 0 and 3");
  if (delta > 0 && spentTalentPoints(next) >= TALENT_BUDGET) throw new Error("All "+TALENT_BUDGET+" Talent Points are allocated");
  if (proposed === 0) delete next.talents[abilityId];
  else next.talents[abilityId] = proposed;
  if (proposed < MAX_TALENT_RANK) delete next.evolutions[abilityId];
  return next;
}

export function chooseEvolution(build, abilityId, evolutionId) {
  if (!allEquippedIds(build).includes(abilityId)) throw new Error("Ability not equipped");
  const next = clone(build);
  if (!evolutionId) {
    delete next.evolutions[abilityId];
    return next;
  }
  if (next.talents[abilityId] !== MAX_TALENT_RANK) throw new Error("Spend 3 Talent Points on this ability first");
  if (!ABILITY_BY_ID[abilityId].evolutions.some(e => e.id === evolutionId)) throw new Error("Unknown evolution");
  if (!next.evolutions[abilityId] && activeEvolutionCount(next) >= MAX_ACTIVE_EVOLUTIONS) {
    throw new Error("All "+MAX_ACTIVE_EVOLUTIONS+" Evolution slots are occupied. Remove one first.");
  }
  next.evolutions[abilityId] = evolutionId;
  return next;
}

export function resetTalents(build) {
  return { ...clone(build), talents: {}, evolutions: {} };
}

export function readBuildStorage(storage) {
  const empty = { version: VERSION, saved: Array(SAVED_BUILD_SLOTS).fill(null), draft: createBuild() };
  try {
    const raw = JSON.parse(storage.getItem(ENERGY_STORAGE_KEY) || "null");
    if (raw?.version !== VERSION || !Array.isArray(raw.saved)) return empty;
    return {
      version: VERSION,
      saved: Array.from({ length: SAVED_BUILD_SLOTS }, (_, i) => raw.saved[i] ? normalizeBuild(raw.saved[i]) : null),
      draft: raw.draft ? normalizeBuild(raw.draft) : createBuild(),
    };
  } catch {
    return empty;
  }
}

export function writeBuildStorage(storage, state) {
  const saved = Array.from({ length: SAVED_BUILD_SLOTS }, (_, i) => state.saved[i] ? normalizeBuild(state.saved[i]) : null);
  const draft = normalizeBuild(state.draft);
  storage.setItem(ENERGY_STORAGE_KEY, JSON.stringify({ version: VERSION, saved, draft }));
}


// Validated, immutable handoff for the eventual new combat actor pipeline.
// The current match engine intentionally does not consume this yet.
export function buildCombatLoadout(build) {
  const errors = validateBuild(build);
  if (errors.length) throw new Error("Invalid energy build: " + errors.join("; "));
  if (!isReady(build)) throw new Error("Equip all eight free abilities before entering a match");
  return Object.freeze({
    schema: "energy-build-v1",
    name: build.name,
    role: build.role,
    abilitySlots: Object.freeze(allEquippedIds(build).map(id => Object.freeze({
      id,
      talentRank: build.talents[id] || 0,
      evolutionId: build.evolutions[id] || null,
    }))),
    resource: Object.freeze({
      type: "flux",
      max: MAX_FLUX,
      regenerationPerSecond: BASE_FLUX_REGEN,
    }),
    rolePassive: ROLES[build.role].passive,
  });
}
