import { Game } from "./core/Game.js";
import { InputManager } from "./core/InputManager.js";
import { arenaConfig } from "./content/arena/nagrand-inspired/config.js";
import { playerHealerConfig } from "./content/classes/field-mender/config.js";
import { allyMeleeConfig } from "./content/teammates/iron-vanguard/config.js";
import { allyCasterConfig } from "./content/teammates/ember-arcanist/config.js";
import { enemyHealerConfig } from "./content/opponents/dusk-warden/config.js";
import { enemyMeleeConfig } from "./content/opponents/ash-reaver/config.js";
import { enemyCasterConfig } from "./content/opponents/void-scholar/config.js";

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
  characterConfigs: [
    playerHealerConfig,
    allyMeleeConfig,
    allyCasterConfig,
    enemyHealerConfig,
    enemyMeleeConfig,
    enemyCasterConfig,
  ],
});

game.start();
window.arena3v3 = game;
