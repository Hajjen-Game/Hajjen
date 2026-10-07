// PvP 2.5D Warrior v2 A/B bootstrap.
// Use our own Blender-generated Mini Hero renderer for every class.
// Only Warrior is overridden with the dedicated Warrior v2 GLB.
import { CustomMiniCharacterRenderer } from "./rendering/babylon/CustomMiniCharacterRenderer.js?v=20261007-warrior-v2-custombase";

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
  if (actor.classId === "warrior") {
    return "minihero-warrior-v2.glb";
  }
  return originalFileFor.call(this, actor);
};

// Force BabylonRenderer to use our custom Blender Mini Hero renderer,
// while keeping the deterministic Warrior test roster.
const url = new URL(window.location.href);
url.searchParams.set("characters", "custom");
url.searchParams.set("warriorV2Test", "1");
url.searchParams.delete("warrior");
history.replaceState(null, "", url);

import("./main.js?v=20261007-warrior-v2-custombase");
