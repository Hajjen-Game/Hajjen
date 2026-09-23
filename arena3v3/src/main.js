import { Game } from "./core/Game.js";
import { InputManager } from "./core/InputManager.js";
import { arenaConfig } from "./content/arena/nagrand-inspired/config.js";
import {
  CLASS_REGISTRY,
  CLASS_IDS_BY_ROLE,
  DEFAULT_ROSTER,
  buildRosterConfigs,
  enemyRosterKey,
  randomizeEnemyRoster,
} from "./content/classes/registry.js";

const ROSTER_STORAGE_KEY = "arena3v3-roster-v2";

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

    return {
      playerHealer: candidate.playerHealer,
      allyMelee: candidate.allyMelee,
      allyCaster: candidate.allyCaster,
    };
  } catch {
    return { ...DEFAULT_ROSTER };
  }
}

let baseRoster = loadRoster();
let roster = randomizeEnemyRoster(baseRoster);
let lastEnemyKey = enemyRosterKey(roster);
let setupRequired = true;
let resumeAfterCancel = false;

function rollOpponent() {
  roster = randomizeEnemyRoster(baseRoster, lastEnemyKey);
  lastEnemyKey = enemyRosterKey(roster);
}

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
  fillSelect("#roster-player-healer", "healer", baseRoster.playerHealer);
  fillSelect("#roster-ally-melee", "melee", baseRoster.allyMelee);
  fillSelect("#roster-ally-caster", "caster", baseRoster.allyCaster);
}

function className(classId) {
  return CLASS_REGISTRY[classId]?.displayName || classId;
}

function renderEnemyPreview() {
  document.querySelector("#setup-enemy-healer").textContent = className(roster.enemyHealer);
  document.querySelector("#setup-enemy-melee").textContent = className(roster.enemyMelee);
  document.querySelector("#setup-enemy-caster").textContent = className(roster.enemyCaster);
}

const rosterModal = document.querySelector("#roster-modal");
const rosterClose = document.querySelector("#roster-close");
const rosterCancel = document.querySelector("#roster-cancel");

function openMatchSetup({ reroll = true, required = true, resumeOnCancel = false } = {}) {
  if (reroll) rollOpponent();

  setupRequired = required;
  resumeAfterCancel = resumeOnCancel;
  game.waitingForStart = true;

  renderRosterForm();
  renderEnemyPreview();

  rosterClose.hidden = required;
  rosterCancel.hidden = required;
  rosterModal.classList.remove("hidden");
}

function closeMatchSetup() {
  if (setupRequired) return;

  rosterModal.classList.add("hidden");

  if (resumeAfterCancel && !game.ended) {
    game.waitingForStart = false;
  }

  resumeAfterCancel = false;
}

document.querySelector("#roster-button").addEventListener("click", () => {
  openMatchSetup({ reroll: true, required: false, resumeOnCancel: !game.ended });
});
rosterClose.addEventListener("click", closeMatchSetup);
rosterCancel.addEventListener("click", closeMatchSetup);

document.querySelector("#roster-apply").addEventListener("click", () => {
  baseRoster = {
    playerHealer: document.querySelector("#roster-player-healer").value,
    allyMelee: document.querySelector("#roster-ally-melee").value,
    allyCaster: document.querySelector("#roster-ally-caster").value,
  };

  localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(baseRoster));

  roster = {
    ...roster,
    ...baseRoster,
  };

  game.startPreparedMatch(buildRosterConfigs(roster));
  rosterModal.classList.add("hidden");
  setupRequired = false;
  resumeAfterCancel = false;
  game.ui.toast(
    "Match started · vs "
    + className(roster.enemyHealer) + " / "
    + className(roster.enemyMelee) + " / "
    + className(roster.enemyCaster)
  );
});

window.addEventListener("arena3v3:request-match-setup", () => {
  openMatchSetup({ reroll: true, required: true, resumeOnCancel: false });
});

renderRosterForm();
renderEnemyPreview();
game.start();
openMatchSetup({ reroll: false, required: true, resumeOnCancel: false });
window.arena3v3 = game;
