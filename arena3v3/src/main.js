import { Game } from "./core/Game.js";
import { InputManager } from "./core/InputManager.js";
import { CharacterStore } from "./core/CharacterStore.js";
import { HonorSystem, legacyHonorAvailable, migrateLegacyHonor } from "./core/HonorSystem.js";
import { arenaConfig } from "./content/arena/nagrand-inspired/config.js";
import {
  CLASS_REGISTRY,
  CLASS_IDS_BY_ROLE,
  DEFAULT_ROSTER,
  buildRosterConfigs,
  enemyRosterKey,
  randomizeEnemyRoster,
} from "./content/classes/registry.js";
import { WOW_CLASS_COLORS } from "./content/classes/classColors.js";

const ROSTER_STORAGE_KEY = "arena3v3-roster-v4";
const LEGACY_ROSTER_STORAGE_KEY = "arena3v3-roster-v3";

const canvas = document.querySelector("#arena");
const arenaWrap = document.querySelector("#arena-wrap");
const arenaStage = document.querySelector("#arena-stage");
const gameShell = document.querySelector("#game-shell");
const input = new InputManager();
const characters = new CharacterStore();
const PLAYABLE_CLASS_IDS = new Set([...CLASS_IDS_BY_ROLE.healer, "warrior", "mage"]);

let game = null;
let activeCharacter = null;
let baseRoster = loadTeamPreferences();
let roster = {
  ...baseRoster,
  playerClass: DEFAULT_ROSTER.playerClass,
  playerName: "Player",
};
let lastEnemyKey = "";
let setupRequired = true;
let resumeAfterCancel = false;
let canReturnToMatch = false;

function fitArenaStage() {
  if (!arenaWrap || !arenaStage) return;

  const logicalWidth = arenaConfig.width;
  const logicalHeight = arenaConfig.height;

  // Keep the center column close to the arena's real 16:9 footprint.
  // Any horizontal space that used to become black bars beside the arena
  // is instead given to YOUR TEAM / ENEMY TEAM.
  if (gameShell) {
    const shellWidth = gameShell.clientWidth;
    const shellHeight = gameShell.clientHeight;
    const columnGap = 8;
    const minSideWidth = window.innerWidth <= 1180 ? 185 : 220;

    if (shellWidth > 0 && shellHeight > 0) {
      const heightLimitedArenaWidth = Math.floor(
        shellHeight * (logicalWidth / logicalHeight),
      );
      const widthLimitedArenaWidth = Math.max(
        600,
        shellWidth - (minSideWidth * 2) - (columnGap * 2),
      );
      const arenaColumnWidth = Math.min(
        heightLimitedArenaWidth,
        widthLimitedArenaWidth,
      );

      gameShell.style.gridTemplateColumns =
        "minmax(" + minSideWidth + "px, 1fr) "
        + arenaColumnWidth + "px "
        + "minmax(" + minSideWidth + "px, 1fr)";
    }
  }

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

function readRosterStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function loadTeamPreferences() {
  const stored = readRosterStorage(ROSTER_STORAGE_KEY)
    || readRosterStorage(LEGACY_ROSTER_STORAGE_KEY)
    || {};

  return {
    allyHealer: validClassForRole(stored.allyHealer, "healer")
      ? stored.allyHealer
      : DEFAULT_ROSTER.allyHealer,
    allyMelee: validClassForRole(stored.allyMelee, "melee")
      ? stored.allyMelee
      : DEFAULT_ROSTER.allyMelee,
    allyCaster: validClassForRole(stored.allyCaster, "caster")
      ? stored.allyCaster
      : DEFAULT_ROSTER.allyCaster,
  };
}

function className(classId) {
  return CLASS_REGISTRY[classId]?.displayName || classId;
}

function currentCharacterRoster() {
  return {
    playerClass: activeCharacter?.classId || DEFAULT_ROSTER.playerClass,
    playerName: activeCharacter?.name || "Player",
    allyHealer: baseRoster.allyHealer,
    allyMelee: baseRoster.allyMelee,
    allyCaster: baseRoster.allyCaster,
  };
}

function rollOpponent() {
  const seedRoster = {
    ...currentCharacterRoster(),
    ...roster,
  };

  roster = randomizeEnemyRoster(seedRoster, lastEnemyKey);
  lastEnemyKey = enemyRosterKey(roster);
}

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
  const playerClassId = activeCharacter?.classId || DEFAULT_ROSTER.playerClass;
  const playerRole = CLASS_REGISTRY[playerClassId]?.role || "healer";

  document.querySelector("#setup-player-name").textContent = activeCharacter?.name || "Player";
  document.querySelector("#setup-player-role").textContent =
    "Your Character · " + playerRole.charAt(0).toUpperCase() + playerRole.slice(1);
  document.querySelector("#setup-player-class").textContent = className(playerClassId);

  fillSelect("#roster-ally-healer", "healer", baseRoster.allyHealer);
  fillSelect("#roster-ally-melee", "melee", baseRoster.allyMelee);
  fillSelect("#roster-ally-caster", "caster", baseRoster.allyCaster);

  document.querySelector("#roster-field-healer").hidden = playerRole === "healer";
  document.querySelector("#roster-field-melee").hidden = playerRole === "melee";
  document.querySelector("#roster-field-caster").hidden = playerRole === "caster";
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
  if (!activeCharacter || !game) return;
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

  if (resumeAfterCancel && game && !game.ended) {
    game.waitingForStart = false;
  }

  resumeAfterCancel = false;
}

function saveTeamPreferences() {
  try {
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify({
      allyHealer: baseRoster.allyHealer,
      allyMelee: baseRoster.allyMelee,
      allyCaster: baseRoster.allyCaster,
    }));
  } catch {
    // Team preferences are a convenience only.
  }
}

const characterScreen = document.querySelector("#character-screen");
const characterList = document.querySelector("#character-list");
const characterReturn = document.querySelector("#character-return");
const createCharacterModal = document.querySelector("#create-character-modal");
const createCharacterName = document.querySelector("#create-character-name");
const createCharacterClass = document.querySelector("#create-character-class");
const createCharacterError = document.querySelector("#create-character-error");

function renderCharacterList() {
  characterList.innerHTML = "";
  const saved = characters.all();

  if (saved.length === 0) {
    const empty = document.createElement("div");
    empty.className = "character-empty";
    empty.textContent = "No characters yet. Create a character to enter the arena.";
    characterList.appendChild(empty);
  }

  for (const character of saved) {
    const status = new HonorSystem(character.id).status();
    const card = document.createElement("button");
    card.type = "button";
    card.className = "character-card";
    card.style.setProperty(
      "--character-color",
      WOW_CLASS_COLORS[character.classId] || "#d9b977",
    );

    card.innerHTML =
      '<span class="character-class-mark"></span>'
      + '<span class="character-copy">'
      + '<strong class="character-name"></strong>'
      + '<span class="character-class"></span>'
      + '<span class="character-rank"></span>'
      + '</span>'
      + '<span class="character-honor"></span>'
      + '<span class="character-play">PLAY</span>';

    card.querySelector(".character-name").textContent = character.name;
    const role = CLASS_REGISTRY[character.classId]?.role || "unknown";
    card.querySelector(".character-class").textContent =
      className(character.classId) + " · " + role.charAt(0).toUpperCase() + role.slice(1);
    card.querySelector(".character-rank").textContent =
      "Rank " + status.rank + " · " + status.title + " · TP " + status.talentPoints;
    card.querySelector(".character-honor").textContent =
      status.lifetimeHonor.toLocaleString() + " Honor";
    card.addEventListener("click", () => selectCharacter(character.id));
    characterList.appendChild(card);
  }

  const createCard = document.createElement("button");
  createCard.type = "button";
  createCard.className = "character-card create-character-card";
  createCard.innerHTML =
    '<span class="create-character-plus">+</span>'
    + '<span class="character-copy"><strong>CREATE NEW CHARACTER</strong>'
    + '<span>Your existing characters stay saved.</span></span>';
  createCard.addEventListener("click", openCreateCharacter);
  characterList.appendChild(createCard);

  characterReturn.hidden = !canReturnToMatch;
}

function showCharacterScreen({ allowReturn = false } = {}) {
  canReturnToMatch = allowReturn;
  if (game) game.waitingForStart = true;
  rosterModal.classList.add("hidden");
  renderCharacterList();
  characterScreen.classList.remove("hidden");
}

function hideCharacterScreen() {
  characterScreen.classList.add("hidden");
}

function fillCharacterClassSelect(selectedClassId = "priest") {
  createCharacterClass.innerHTML = "";

  for (const classId of ["priest", "druid", "paladin", "warrior", "mage"]) {
    const option = document.createElement("option");
    option.value = classId;
    option.textContent =
      CLASS_REGISTRY[classId].displayName
      + " · " + CLASS_REGISTRY[classId].role.charAt(0).toUpperCase()
      + CLASS_REGISTRY[classId].role.slice(1);
    option.selected = classId === selectedClassId;
    createCharacterClass.appendChild(option);
  }
}

function openCreateCharacter() {
  createCharacterError.textContent = "";
  createCharacterName.value = "";
  fillCharacterClassSelect("priest");
  createCharacterModal.classList.remove("hidden");
  window.setTimeout(() => createCharacterName.focus(), 0);
}

function closeCreateCharacter() {
  createCharacterModal.classList.add("hidden");
  createCharacterError.textContent = "";
}

function ensureLegacyCharacter() {
  if (characters.all().length > 0 || !legacyHonorAvailable()) return;

  const legacyRoster = readRosterStorage(LEGACY_ROSTER_STORAGE_KEY) || {};
  const healerClass = validClassForRole(legacyRoster.playerHealer, "healer")
    ? legacyRoster.playerHealer
    : DEFAULT_ROSTER.playerHealer;

  try {
    const character = characters.create({
      name: "Player",
      classId: healerClass,
    });
    migrateLegacyHonor(character.id);
  } catch {
    // If migration fails, the regular creation flow remains available.
  }
}

function selectCharacter(characterId) {
  const character = characters.get(characterId);
  if (!character) return;

  activeCharacter = characters.touch(characterId) || character;
  baseRoster = loadTeamPreferences();
  roster = {
    ...currentCharacterRoster(),
  };
  rollOpponent();

  game.selectCharacter(activeCharacter, buildRosterConfigs(roster));

  document.querySelector("#active-character-label").textContent =
    activeCharacter.name + " · " + className(activeCharacter.classId);

  hideCharacterScreen();
  renderCharacterList();
  openMatchSetup({ reroll: false, required: true, resumeOnCancel: false });
}

document.querySelector("#characters-button").addEventListener("click", () => {
  canReturnToMatch = Boolean(
    activeCharacter
    && game
    && !game.ended
    && game.elapsedSeconds > 0
    && rosterModal.classList.contains("hidden")
  );
  showCharacterScreen({ allowReturn: canReturnToMatch });
});

characterReturn.addEventListener("click", () => {
  if (!canReturnToMatch || !game || game.ended) return;
  hideCharacterScreen();
  game.waitingForStart = false;
  canReturnToMatch = false;
});

document.querySelector("#create-character-button").addEventListener("click", openCreateCharacter);
document.querySelector("#create-character-close").addEventListener("click", closeCreateCharacter);
document.querySelector("#create-character-cancel").addEventListener("click", closeCreateCharacter);

document.querySelector("#create-character-confirm").addEventListener("click", () => {
  try {
    const classId = createCharacterClass.value;
    if (!PLAYABLE_CLASS_IDS.has(classId)) {
      throw new Error("Choose a playable class.");
    }

    const character = characters.create({
      name: createCharacterName.value,
      classId,
    });

    closeCreateCharacter();
    renderCharacterList();
    selectCharacter(character.id);
  } catch (error) {
    createCharacterError.textContent = error?.message || "Could not create character.";
  }
});

createCharacterName.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    document.querySelector("#create-character-confirm").click();
  }
});

document.querySelector("#roster-button").addEventListener("click", () => {
  if (!activeCharacter) {
    showCharacterScreen();
    return;
  }

  openMatchSetup({
    reroll: true,
    required: false,
    resumeOnCancel: Boolean(game && !game.ended),
  });
});
rosterClose.addEventListener("click", closeMatchSetup);
rosterCancel.addEventListener("click", closeMatchSetup);

document.querySelector("#roster-apply").addEventListener("click", () => {
  if (!activeCharacter || !game) return;

  baseRoster = {
    allyHealer: document.querySelector("#roster-ally-healer").value,
    allyMelee: document.querySelector("#roster-ally-melee").value,
    allyCaster: document.querySelector("#roster-ally-caster").value,
  };
  saveTeamPreferences();

  roster = {
    ...roster,
    ...currentCharacterRoster(),
    ...baseRoster,
  };

  game.startPreparedMatch(buildRosterConfigs(roster));
  rosterModal.classList.add("hidden");
  setupRequired = false;
  resumeAfterCancel = false;
  game.ui.toast(
    activeCharacter.name + " enters arena · vs "
    + className(roster.enemyHealer) + " / "
    + className(roster.enemyMelee) + " / "
    + className(roster.enemyCaster)
  );
});

window.addEventListener("arena3v3:request-match-setup", () => {
  if (!activeCharacter) {
    showCharacterScreen();
    return;
  }
  openMatchSetup({ reroll: true, required: true, resumeOnCancel: false });
});

fitArenaStage();

if ("ResizeObserver" in window) {
  const arenaResizeObserver = new ResizeObserver(fitArenaStage);
  arenaResizeObserver.observe(arenaWrap);
} else {
  window.addEventListener("resize", fitArenaStage);
}

ensureLegacyCharacter();

const placeholderRoster = randomizeEnemyRoster({
  ...DEFAULT_ROSTER,
  playerName: "Player",
});

game = new Game({
  canvas,
  input,
  arena: arenaConfig,
  characterConfigs: buildRosterConfigs(placeholderRoster),
});

fillCharacterClassSelect("priest");
game.start();
showCharacterScreen({ allowReturn: false });
window.arena3v3 = game;
