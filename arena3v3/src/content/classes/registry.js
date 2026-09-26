import { priestClass } from "./priest/config.js?v=20260926-manapressure3";
import { druidClass } from "./druid/config.js?v=20260926-manapressure2";
import { paladinClass } from "./paladin/config.js?v=20260926-manapressure2";
import { warriorClass } from "./warrior/config.js?v=20260926-interrupt12";
import { rogueClass } from "./rogue/config.js?v=20260926-interrupt12";
import { deathKnightClass } from "./death-knight/config.js?v=20260926-interrupt12";
import { mageClass } from "./mage/config.js";
import { warlockClass } from "./warlock/config.js?v=20260926-schoolvfx2";
import { shamanClass } from "./shaman/config.js?v=20260926-astralshift1";

export const CLASS_REGISTRY = {
  priest: priestClass,
  druid: druidClass,
  paladin: paladinClass,
  warrior: warriorClass,
  rogue: rogueClass,
  "death-knight": deathKnightClass,
  mage: mageClass,
  warlock: warlockClass,
  shaman: shamanClass,
};

export const CLASS_IDS_BY_ROLE = {
  healer: ["priest", "druid", "paladin"],
  melee: ["warrior", "rogue", "death-knight"],
  caster: ["mage", "warlock", "shaman"],
};

export const DEFAULT_ROSTER = {
  playerClass: "priest",
  playerHealer: "priest",
  allyHealer: "priest",
  allyMelee: "warrior",
  allyCaster: "mage",
  enemyHealer: "paladin",
  enemyMelee: "rogue",
  enemyCaster: "warlock",
};

const SLOT_META = {
  player: { id: "player-healer", team: "friendly", control: "player", role: null, name: "Player" },
  allyHealer: { id: "ally-healer", team: "friendly", control: "ai", role: "healer" },
  allyMelee: { id: "ally-melee", team: "friendly", control: "ai", role: "melee" },
  allyCaster: { id: "ally-caster", team: "friendly", control: "ai", role: "caster" },
  enemyHealer: { id: "enemy-healer", team: "enemy", control: "ai", role: "healer" },
  enemyMelee: { id: "enemy-melee", team: "enemy", control: "ai", role: "melee" },
  enemyCaster: { id: "enemy-caster", team: "enemy", control: "ai", role: "caster" },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function createCombatantConfig(classId, slotKey) {
  const template = CLASS_REGISTRY[classId];
  const slot = SLOT_META[slotKey];

  if (!template) throw new Error("Unknown class: " + classId);
  if (!slot) throw new Error("Unknown roster slot: " + slotKey);
  if (slot.role && template.role !== slot.role) {
    throw new Error(template.displayName + " cannot be used in " + slot.role + " slot");
  }

  const config = clone(template);
  const role = slot.role || template.role;

  return {
    ...config,
    id: slot.id,
    name: slot.name || template.displayName,
    className: template.displayName,
    team: slot.team,
    role,
    control: slot.control,
    // Spawn by actual combat role instead of actor id. The player's actor id
    // is intentionally stable across classes, so id-based spawning would put
    // melee/caster players in the old healer position.
    spawnId: slot.team + "-" + role,
  };
}

export function buildRosterConfigs(roster) {
  const playerClassId = roster.playerClass || roster.playerHealer || DEFAULT_ROSTER.playerClass;
  const playerTemplate = CLASS_REGISTRY[playerClassId];

  if (!playerTemplate) throw new Error("Unknown player class: " + playerClassId);

  const friendly = [createCombatantConfig(playerClassId, "player")];

  if (playerTemplate.role !== "healer") {
    friendly.push(createCombatantConfig(roster.allyHealer || DEFAULT_ROSTER.allyHealer, "allyHealer"));
  }
  if (playerTemplate.role !== "melee") {
    friendly.push(createCombatantConfig(roster.allyMelee || DEFAULT_ROSTER.allyMelee, "allyMelee"));
  }
  if (playerTemplate.role !== "caster") {
    friendly.push(createCombatantConfig(roster.allyCaster || DEFAULT_ROSTER.allyCaster, "allyCaster"));
  }

  const configs = [
    ...friendly,
    createCombatantConfig(roster.enemyHealer, "enemyHealer"),
    createCombatantConfig(roster.enemyMelee, "enemyMelee"),
    createCombatantConfig(roster.enemyCaster, "enemyCaster"),
  ];

  if (roster.playerName) configs[0].name = roster.playerName;
  return configs;
}


function randomClassId(role) {
  const pool = CLASS_IDS_BY_ROLE[role];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function enemyRosterKey(roster) {
  return [roster.enemyHealer, roster.enemyMelee, roster.enemyCaster].join("|");
}

export function randomizeEnemyRoster(roster, previousEnemyKey = "") {
  let candidate = null;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    candidate = {
      ...roster,
      enemyHealer: randomClassId("healer"),
      enemyMelee: randomClassId("melee"),
      enemyCaster: randomClassId("caster"),
    };

    if (enemyRosterKey(candidate) !== previousEnemyKey) return candidate;
  }

  return candidate;
}
