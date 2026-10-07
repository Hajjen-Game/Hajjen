import { CustomMiniCharacterRenderer } from "./CustomMiniCharacterRenderer.js?v=20261007-warrior-v2-direct";

export class WarriorV2CharacterRenderer extends CustomMiniCharacterRenderer {
  async preload() {
    await super.preload();

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
  }

  fileFor(actor) {
    if (actor.classId === "warrior") {
      return "minihero-warrior-v2.glb";
    }
    return super.fileFor(actor);
  }
}
