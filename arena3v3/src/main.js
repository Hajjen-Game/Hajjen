import { Game } from "./core/Game.js";
import { InputManager } from "./core/InputManager.js";
import { arenaConfig } from "./content/arena/nagrand-inspired/config.js";
import {
  CLASS_REGISTRY,
  CLASS_IDS_BY_ROLE,
  DEFAULT_ROSTER,
  buildRosterConfigs,
} from "./content/classes/registry.js";

const ROSTER_STORAGE_KEY = "arena3v3-roster-v1";

const canvas = document.querySelector("#arena");
const arenaWrap = document.querySelector("#arena-wrap");
const arenaStage = document.querySelector("#arena-stage");
const input = new InputManager();

function fitArenaStage() {
  if (!arenaWrap || !arenaStage) return;

  const logicalWidth = arenaConfig.width;
  const logicalHeight = arenaConfig.height;
  const availableWidth = arenaWrap.clientWidth;
  const availableHeight = arenaWrap.clientHeight;

  if (availableWidth <= 0 || availableHeight <= 0) return;

  const scale = Math.min(
    availableWidth / logicalWidth,
    availableHeight / logicalHeight,
  );

  arenaStage.style.width = Math.floor(logicalWidth * scale) + "px";
  arenaStage.style.height = Math.floor(logicalHeight * scale) + "px";
}

function validClassForRole(classId, role) {
  return CLASS_IDS_BY_ROLE[role].includes(classId);
}

function loadRoster() {
  try {
    const stored = JSON.parse(localStorage.getItem(ROSTER_STORAGE_KEY) || "null");
    const candidate = { ...DEFAULT_ROSTER, ...(stored || {}) };

    if (!validClassForRole(candidate.playerHealer, "healer")) candidate.playerHealer = DEFAULT_ROSTER.playerHealer;
    if (!validClassForRole(candidate.allyMelee, "melee")) candidate.allyMelee = DEFAULT_ROSTER.allyMelee;
    if (!validClassForRole(candidate.allyCaster, "caster")) candidate.allyCaster = DEFAULT_ROSTER.allyCaster;
    if (!validClassForRole(candidate.enemyHealer, "healer")) candidate.enemyHealer = DEFAULT_ROSTER.enemyHealer;
    if (!validClassForRole(candidate.enemyMelee, "melee")) candidate.enemyMelee = DEFAULT_ROSTER.enemyMelee;
    if (!validClassForRole(candidate.enemyCaster, "caster")) candidate.enemyCaster = DEFAULT_ROSTER.enemyCaster;

    return candidate;
  } catch {
    return { ...DEFAULT_ROSTER };
  }
}

let roster = loadRoster();

fitArenaStage();

if ("ResizeObserver" in window) {
  const arenaResizeObserver = new ResizeObserver(fitArenaStage);
  arenaResizeObserver.observe(arenaWrap);
} else {
  window.addEventListener("resize", fitArenaStage);
}

const game = new Game({
  canvas,
  input,
  arena: arenaConfig,
  characterConfigs: buildRosterConfigs(roster),
});

function fillSelect(selectId, role, selectedClassId) {
  const select = document.querySelector(selectId);
  select.innerHTML = "";

  for (const classId of CLASS_IDS_BY_ROLE[role]) {
    const option = document.createElement("option");
    option.value = classId;
    option.textContent = CLASS_REGISTRY[classId].displayName;
    option.selected = classId === selectedClassId;
    select.appendChild(option);
  }
}

function renderRosterForm() {
  fillSelect("#roster-player-healer", "healer", roster.playerHealer);
  fillSelect("#roster-ally-melee", "melee", roster.allyMelee);
  fillSelect("#roster-ally-caster", "caster", roster.allyCaster);
  fillSelect("#roster-enemy-healer", "healer", roster.enemyHealer);
  fillSelect("#roster-enemy-melee", "melee", roster.enemyMelee);
  fillSelect("#roster-enemy-caster", "caster", roster.enemyCaster);
}

const rosterModal = document.querySelector("#roster-modal");
document.querySelector("#roster-button").addEventListener("click", () => {
  renderRosterForm();
  rosterModal.classList.remove("hidden");
});
document.querySelector("#roster-close").addEventListener("click", () => {
  rosterModal.classList.add("hidden");
});
document.querySelector("#roster-cancel").addEventListener("click", () => {
  rosterModal.classList.add("hidden");
});
document.querySelector("#roster-apply").addEventListener("click", () => {
  roster = {
    playerHealer: document.querySelector("#roster-player-healer").value,
    allyMelee: document.querySelector("#roster-ally-melee").value,
    allyCaster: document.querySelector("#roster-ally-caster").value,
    enemyHealer: document.querySelector("#roster-enemy-healer").value,
    enemyMelee: document.querySelector("#roster-enemy-melee").value,
    enemyCaster: document.querySelector("#roster-enemy-caster").value,
  };

  localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(roster));
  game.setCharacterConfigs(buildRosterConfigs(roster));
  rosterModal.classList.add("hidden");
  game.ui.toast("Roster applied");
});

renderRosterForm();
game.start();
window.arena3v3 = game;
