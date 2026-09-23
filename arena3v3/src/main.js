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
const input = new InputManager();

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
