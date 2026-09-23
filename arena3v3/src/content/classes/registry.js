import { priestClass } from "./priest/config.js";
import { druidClass } from "./druid/config.js";
import { paladinClass } from "./paladin/config.js";
import { warriorClass } from "./warrior/config.js";
import { rogueClass } from "./rogue/config.js";
import { deathKnightClass } from "./death-knight/config.js";
import { mageClass } from "./mage/config.js";
import { warlockClass } from "./warlock/config.js";
import { shamanClass } from "./shaman/config.js";

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
  playerHealer: "priest",
  allyMelee: "warrior",
  allyCaster: "mage",
  enemyHealer: "paladin",
  enemyMelee: "rogue",
  enemyCaster: "warlock",
};

const SLOT_META = {
  playerHealer: { id: "player-healer", team: "friendly", control: "player", role: "healer", name: "Player" },
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
  if (template.role !== slot.role) {
    throw new Error(template.displayName + " cannot be used in " + slot.role + " slot");
  }

  const config = clone(template);
  return {
    ...config,
    id: slot.id,
    name: slot.name || template.displayName,
    className: template.displayName,
    team: slot.team,
    role: slot.role,
    control: slot.control,
  };
}

export function buildRosterConfigs(roster) {
  const configs = [
    createCombatantConfig(roster.playerHealer, "playerHealer"),
    createCombatantConfig(roster.allyMelee, "allyMelee"),
    createCombatantConfig(roster.allyCaster, "allyCaster"),
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
