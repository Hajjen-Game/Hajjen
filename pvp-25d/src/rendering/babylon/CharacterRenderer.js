const KAYKIT_ROOT = "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/672074b73ba276876a19e8816ecdc5241817ab47/addons/kaykit_character_pack_adventures/Characters/gltf/";

const MODEL_BY_CLASS = Object.freeze({
  priest: "Mage.glb",
  mage: "Mage.glb",
  warlock: "Mage.glb",
  druid: "Mage.glb",
  warrior: "Knight.glb",
  paladin: "Knight.glb",
  "death-knight": "Barbarian.glb",
  rogue: "Rogue_Hooded.glb",
  hunter: "Rogue_Hooded.glb",
  shaman: "Barbarian.glb",
});

const MODEL_FILES = Object.freeze([
  "Knight.glb",
  "Mage.glb",
  "Rogue_Hooded.glb",
  "Barbarian.glb",
]);

const CLASS_SCALE = Object.freeze({
  priest: 0.98,
  mage: 0.98,
  warlock: 1.00,
  druid: 1.00,
  warrior: 1.06,
  paladin: 1.05,
  "death-knight": 1.08,
  rogue: 0.96,
  hunter: 0.98,
  shaman: 1.03,
});

function findAnimation(groups, hints) {
  const lowered = hints.map(hint => hint.toLowerCase());
  return groups.find(group => {
    const name = String(group?.name || "").toLowerCase();
    return lowered.some(hint => name.includes(hint));
  }) || null;
}

export class CharacterRenderer {
  constructor(scene, shadowGenerator, scale) {
    this.scene = scene;
    this.shadowGenerator = shadowGenerator;
    this.scale = scale;
    this.entries = new Map();
    this.containers = new Map();
    this.failedModels = new Set();
    this.loadingPromise = this.preloadModels();
  }

  async preloadModels() {
    if (!BABYLON.SceneLoader) {
      console.error("Babylon SceneLoader is unavailable; KayKit models cannot load.");
      return;
    }

    await Promise.all(
      MODEL_FILES.map(async file => {
        try {
          const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
            KAYKIT_ROOT,
            file,
            this.scene,
          );
          this.containers.set(file, container);
        } catch (error) {
          this.failedModels.add(file);
          console.error("Failed to load KayKit model", file, error);
        }
      }),
    );
  }

  modelFor(actor) {
    return MODEL_BY_CLASS[actor.classId]
      || (actor.role === "melee" ? "Knight.glb" : "Mage.glb");
  }

  create(actor) {
    const root = new BABYLON.TransformNode("actor:" + actor.id, this.scene);
    const modelPivot = new BABYLON.TransformNode(
      "kaykit-pivot:" + actor.id,
      this.scene,
    );
    modelPivot.parent = root;
    // KayKit's character forward axis needs a half turn relative to our
    // simulation-facing convention.
    modelPivot.rotation.y = Math.PI;

    const entry = {
      root,
      modelPivot,
      classId: actor.classId,
      role: actor.role,
      modelFile: this.modelFor(actor),
      modelAttached: false,
      modelMeshes: [],
      animationGroups: [],
      animationState: null,
      hp: null,
      hpBack: null,
      barRoot: null,
      contactShadow: null,
    };

    this.createContactShadow(actor, entry);
    this.createHealthBar(actor, entry);
    this.entries.set(actor.id, entry);
    this.attachModelWhenReady(actor, entry);
    return entry;
  }

  async attachModelWhenReady(actor, entry) {
    await this.loadingPromise;

    if (!this.entries.has(actor.id) || entry.modelAttached) return;

    const container = this.containers.get(entry.modelFile);
    if (!container) {
      console.warn("No KayKit container available for", entry.modelFile);
      this.createFallbackMarker(actor, entry);
      return;
    }

    try {
      const instance = container.instantiateModelsToScene(
        sourceName => actor.id + ":" + sourceName,
        false,
      );

      const roots = instance.rootNodes || [];
      for (const node of roots) {
        node.parent = entry.modelPivot;
      }

      entry.modelMeshes = entry.modelPivot.getChildMeshes(false);
      entry.animationGroups = instance.animationGroups || [];

      for (const mesh of entry.modelMeshes) {
        mesh.metadata = {
          ...(mesh.metadata || {}),
          actorId: actor.id,
          kaykit: true,
        };
        mesh.isPickable = true;
        mesh.receiveShadows = true;
        this.shadowGenerator?.addShadowCaster(mesh);
      }

      this.normalizeModelHeight(entry, actor);
      entry.modelAttached = true;
      this.setAnimation(entry, "idle", true);
    } catch (error) {
      console.error("Failed to instantiate KayKit model", entry.modelFile, error);
      this.createFallbackMarker(actor, entry);
    }
  }

  normalizeModelHeight(entry, actor) {
    const meshes = entry.modelMeshes.filter(mesh => mesh.getBoundingInfo);
    if (!meshes.length) return;

    for (const mesh of meshes) mesh.computeWorldMatrix(true);

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const mesh of meshes) {
      const bounds = mesh.getBoundingInfo()?.boundingBox;
      if (!bounds) continue;
      minY = Math.min(minY, bounds.minimumWorld.y);
      maxY = Math.max(maxY, bounds.maximumWorld.y);
    }

    const height = maxY - minY;
    if (!Number.isFinite(height) || height <= 0.001) return;

    const classScale = CLASS_SCALE[actor.classId] || 1;
    const targetHeight = 1.72 * classScale;
    const uniform = targetHeight / height;
    entry.modelPivot.scaling.setAll(uniform);

    // Re-evaluate feet after scaling and rest the model on the arena floor.
    for (const mesh of meshes) mesh.computeWorldMatrix(true);
    minY = Number.POSITIVE_INFINITY;
    for (const mesh of meshes) {
      const bounds = mesh.getBoundingInfo()?.boundingBox;
      if (!bounds) continue;
      minY = Math.min(minY, bounds.minimumWorld.y);
    }
    if (Number.isFinite(minY)) {
      entry.modelPivot.position.y -= minY;
    }
  }

  createContactShadow(actor, entry) {
    const mat = new BABYLON.StandardMaterial(
      "kaykit-shadow-mat:" + actor.id,
      this.scene,
    );
    mat.diffuseColor = new BABYLON.Color3(0.07, 0.045, 0.035);
    mat.emissiveColor = BABYLON.Color3.Black();
    mat.specularColor = BABYLON.Color3.Black();
    mat.alpha = 0.24;
    mat.disableLighting = true;

    const shadow = BABYLON.MeshBuilder.CreateCylinder(
      "contact-shadow:" + actor.id,
      {
        height: 0.012,
        diameter: 0.96,
        tessellation: 20,
      },
      this.scene,
    );
    shadow.parent = entry.root;
    shadow.position.y = 0.012;
    shadow.scaling.set(1.18, 1, 0.74);
    shadow.material = mat;
    shadow.isPickable = false;
    entry.contactShadow = shadow;
  }

  createHealthBar(actor, entry) {
    const backMat = new BABYLON.StandardMaterial(
      "hp-back-mat:" + actor.id,
      this.scene,
    );
    backMat.diffuseColor = BABYLON.Color3.FromHexString("#171412");
    backMat.specularColor = BABYLON.Color3.Black();
    backMat.disableLighting = true;

    const hpMat = new BABYLON.StandardMaterial(
      "hp-mat:" + actor.id,
      this.scene,
    );
    hpMat.diffuseColor = BABYLON.Color3.FromHexString(
      actor.team === "friendly" ? "#58b96b" : "#d55c50",
    );
    hpMat.emissiveColor = hpMat.diffuseColor.scale(0.04);
    hpMat.specularColor = BABYLON.Color3.Black();
    hpMat.disableLighting = true;

    const barRoot = new BABYLON.TransformNode(
      "status:" + actor.id,
      this.scene,
    );
    barRoot.parent = entry.root;
    barRoot.position.y = 2.18;

    const hpBack = BABYLON.MeshBuilder.CreatePlane(
      "hpBack:" + actor.id,
      {
        width: 1.26,
        height: 0.11,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      this.scene,
    );
    hpBack.parent = barRoot;
    hpBack.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    hpBack.material = backMat;
    hpBack.isPickable = false;

    const hp = BABYLON.MeshBuilder.CreatePlane(
      "hp:" + actor.id,
      {
        width: 1.20,
        height: 0.068,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      this.scene,
    );
    hp.parent = barRoot;
    hp.position.z = -0.012;
    hp.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    hp.material = hpMat;
    hp.isPickable = false;

    entry.barRoot = barRoot;
    entry.hpBack = hpBack;
    entry.hp = hp;
  }

  createFallbackMarker(actor, entry) {
    if (!this.entries.has(actor.id) || entry.modelAttached) return;

    const mat = new BABYLON.StandardMaterial(
      "fallback:" + actor.id,
      this.scene,
    );
    mat.diffuseColor = actor.team === "friendly"
      ? new BABYLON.Color3(0.35, 0.65, 0.52)
      : new BABYLON.Color3(0.72, 0.35, 0.31);

    const marker = BABYLON.MeshBuilder.CreateCapsule(
      "fallback:" + actor.id,
      {
        height: 1.30,
        radius: 0.30,
        tessellation: 8,
      },
      this.scene,
    );
    marker.parent = entry.modelPivot;
    marker.position.y = 0.65;
    marker.material = mat;
    marker.metadata = { actorId: actor.id };
    this.shadowGenerator?.addShadowCaster(marker);
    entry.modelMeshes = [marker];
    entry.modelAttached = true;
  }

  setAnimation(entry, state, force = false) {
    if (!entry.animationGroups.length) return;
    if (!force && entry.animationState === state) return;

    const hints = state === "run"
      ? ["run", "running", "walk", "walking"]
      : state === "cast"
        ? ["cast", "spell", "magic", "attack_magic"]
        : state === "death"
          ? ["death", "die", "dying"]
          : ["idle"];

    const selected = findAnimation(entry.animationGroups, hints)
      || entry.animationGroups[0];

    for (const group of entry.animationGroups) {
      if (group === selected) continue;
      group.stop();
    }

    if (selected) {
      selected.start(true, 1.0, selected.from, selected.to, false);
      entry.animationState = state;
    }
  }

  disposeEntry(entry) {
    for (const group of entry.animationGroups || []) {
      try {
        group.stop();
        group.dispose();
      } catch {
        // Animation disposal must never break a match reset.
      }
    }
    entry.root.dispose(false, true);
  }

  sync(game) {
    const ids = new Set(game.actors.map(actor => actor.id));

    for (const [id, entry] of this.entries) {
      if (ids.has(id)) continue;
      this.disposeEntry(entry);
      this.entries.delete(id);
    }

    for (const actor of game.actors) {
      let entry = this.entries.get(actor.id);

      if (
        entry
        && (
          entry.classId !== actor.classId
          || entry.role !== actor.role
        )
      ) {
        this.disposeEntry(entry);
        this.entries.delete(actor.id);
        entry = null;
      }

      entry = entry || this.create(actor);
      entry.root.setEnabled(actor.alive);

      if (!actor.alive) {
        this.setAnimation(entry, "death");
        continue;
      }

      entry.root.position.set(
        actor.x * this.scale,
        0.16,
        actor.y * this.scale,
      );

      const movement = actor.lastMove || { x: 0, y: 0 };
      const moving = Math.hypot(movement.x, movement.y) > 0.05;

      if (moving) {
        entry.root.rotation.y = Math.atan2(
          movement.x,
          movement.y,
        );
      }

      if (actor.cast) this.setAnimation(entry, "cast");
      else if (moving) this.setAnimation(entry, "run");
      else this.setAnimation(entry, "idle");

      const health = Math.max(0, Math.min(1, actor.healthPct));
      entry.hp.scaling.x = health;
      entry.hp.position.x = -0.60 * (1 - health);

      const hpColor = health < 0.20
        ? "#e14d43"
        : actor.team === "friendly"
          ? "#58b96b"
          : "#d55c50";

      entry.hp.material.diffuseColor =
        BABYLON.Color3.FromHexString(hpColor);
      entry.hp.material.emissiveColor =
        entry.hp.material.diffuseColor.scale(health < 0.20 ? 0.08 : 0.03);
    }
  }

  meshForActor(id) {
    return this.entries.get(id)?.modelMeshes?.[0] || null;
  }

  rootForActor(id) {
    return this.entries.get(id)?.root || null;
  }

  worldPosition(id, y = 1.22) {
    const root = this.rootForActor(id);
    return root
      ? new BABYLON.Vector3(
          root.position.x,
          root.position.y + y,
          root.position.z,
        )
      : null;
  }
}
