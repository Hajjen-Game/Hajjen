// PvP 2.5D Warrior v2 isolated bootstrap.
import { CustomMiniCharacterRenderer } from "./rendering/babylon/CustomMiniCharacterRenderer.js?v=20261007-miniheroes-v1";

const originalPreload = CustomMiniCharacterRenderer.prototype.preload;
CustomMiniCharacterRenderer.prototype.preload = async function () {
  await originalPreload.call(this);
  try {
    const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
      "./assets/characters/miniheroes/",
      "minihero-warrior-v2.glb",
      this.scene,
    );
    this.containers.set("minihero-warrior-v2.glb", container);
  } catch (error) {
    console.error("Warrior v2 model load failed", error);
  }
};

const originalFileFor = CustomMiniCharacterRenderer.prototype.fileFor;
CustomMiniCharacterRenderer.prototype.fileFor = function (actor) {
  if (actor.classId === "warrior") return "minihero-warrior-v2.glb";
  return originalFileFor.call(this, actor);
};

const url = new URL(window.location.href);
url.searchParams.set("characters", "custom");
history.replaceState(null, "", url);

import("./main.js?v=20261007-miniheroes-v1");
