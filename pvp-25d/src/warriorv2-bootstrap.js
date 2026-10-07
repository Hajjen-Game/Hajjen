// PvP 2.5D Warrior v2 isolated A/B bootstrap.
// Keep the normal PvP 2.5D character renderer for every class except Warrior.
import { CharacterRenderer } from "./rendering/babylon/CharacterRenderer.js?v=20261007-warrior-v2-isolated";

const originalPreload = CharacterRenderer.prototype.preloadAssets;
CharacterRenderer.prototype.preloadAssets = async function () {
  await originalPreload.call(this);

  try {
    const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
      "./assets/characters/miniheroes/",
      "minihero-warrior-v2.glb",
      this.scene,
    );
    this.bodyContainers.set("minihero-warrior-v2.glb", container);
  } catch (error) {
    console.error("Warrior v2 model load failed", error);
  }
};

const originalBodyFileFor = CharacterRenderer.prototype.bodyFileFor;
CharacterRenderer.prototype.bodyFileFor = function (actor) {
  if (actor.classId === "warrior") {
    return "minihero-warrior-v2.glb";
  }
  return originalBodyFileFor.call(this, actor);
};

// Remove any old experiment selector from cached/shared URLs.
// warriorv2.html should use the standard renderer, with only Warrior overridden.
const url = new URL(window.location.href);
url.searchParams.delete("characters");
url.searchParams.delete("warrior");
url.searchParams.set("warriorV2Test", "1");
history.replaceState(null, "", url);

import("./main.js?v=20261007-warrior-v2-rosterlock");
