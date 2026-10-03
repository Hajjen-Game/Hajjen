const KAYKIT_COMMIT = "672074b73ba276876a19e8816ecdc5241817ab47";
const KAYKIT_BASE =
  "https://raw.githubusercontent.com/KayKit-Game-Assets/"
  + "KayKit-Character-Pack-Adventures-1.0/"
  + KAYKIT_COMMIT
  + "/addons/kaykit_character_pack_adventures/";

const CHARACTER_ROOT = KAYKIT_BASE + "Characters/gltf/";
const ASSET_ROOT = KAYKIT_BASE + "Assets/gltf/";

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

const ACCESSORY_FILES = Object.freeze([
  "staff.gltf",
  "wand.gltf",
  "spellbook_open.gltf",
  "sword_1handed.gltf",
  "sword_2handed.gltf",
  "dagger.gltf",
  "axe_1handed.gltf",
  "shield_badge.gltf",
  "shield_round.gltf",
  "crossbow_2handed.gltf",
]);

const CLASS_STYLE = Object.freeze({
  priest: {
    tint: "#fff1cf",
    accent: "#e8c663",
    tintStrength: 0.22,
    scale: 1.02,
    props: [
      { file: "staff.gltf", pos: [0.48, 0.82, 0.10], scale: 0.63, rot: [0, 0, -0.12] },
      { file: "spellbook_open.gltf", pos: [-0.43, 1.00, 0.18], scale: 0.54, rot: [-0.45, 0, -0.12] },
    ],
  },
  mage: {
    tint: "#8cc6ff",
    accent: "#7e87ff",
    tintStrength: 0.24,
    scale: 1.01,
    props: [
      { file: "staff.gltf", pos: [0.48, 0.82, 0.10], scale: 0.64, rot: [0, 0, -0.12] },
    ],
  },
  warlock: {
    tint: "#b78adf",
    accent: "#8a4fc8",
    tintStrength: 0.32,
    scale: 1.02,
    props: [
      { file: "wand.gltf", pos: [0.46, 0.90, 0.13], scale: 0.66, rot: [0, 0, -0.35] },
      { file: "spellbook_open.gltf", pos: [-0.42, 1.00, 0.15], scale: 0.52, rot: [-0.42, 0, 0.10] },
    ],
  },
  druid: {
    tint: "#b58a58",
    accent: "#75a35c",
    tintStrength: 0.25,
    scale: 1.03,
    props: [
      { file: "staff.gltf", pos: [0.48, 0.82, 0.10], scale: 0.64, rot: [0, 0, -0.12] },
    ],
  },
  warrior: {
    tint: "#b66c55",
    accent: "#d39b66",
    tintStrength: 0.24,
    scale: 1.08,
    props: [
      { file: "sword_2handed.gltf", pos: [0.50, 0.72, 0.04], scale: 0.52, rot: [0, 0, -0.53] },
    ],
  },
  paladin: {
    tint: "#f0b2cf",
    accent: "#edc968",
    tintStrength: 0.22,
    scale: 1.07,
    props: [
      { file: "sword_1handed.gltf", pos: [0.45, 0.80, 0.15], scale: 0.58, rot: [0, 0, -0.52] },
      { file: "shield_badge.gltf", pos: [-0.48, 0.90, 0.22], scale: 0.75, rot: [0, 0.05, 0.08] },
    ],
  },
  "death-knight": {
    tint: "#71566f",
    accent: "#76b5d6",
    tintStrength: 0.30,
    scale: 1.10,
    props: [
      { file: "sword_2handed.gltf", pos: [0.52, 0.72, 0.05], scale: 0.55, rot: [0, 0, -0.50] },
    ],
  },
  rogue: {
    tint: "#d2bb58",
    accent: "#e2c969",
    tintStrength: 0.23,
    scale: 0.96,
    props: [
      { file: "dagger.gltf", pos: [-0.39, 0.73, 0.14], scale: 0.56, rot: [0, 0, 0.52] },
      { file: "dagger.gltf", pos: [0.39, 0.73, 0.14], scale: 0.56, rot: [0, 0, -0.52] },
    ],
  },
  shaman: {
    tint: "#6aa7da",
    accent: "#55c0b6",
    tintStrength: 0.30,
    scale: 1.04,
    props: [
      { file: "axe_1handed.gltf", pos: [0.44, 0.80, 0.14], scale: 0.60, rot: [0, 0, -0.48] },
      { file: "shield_round.gltf", pos: [-0.47, 0.89, 0.22], scale: 0.74, rot: [0, 0.05, 0.06] },
    ],
  },
  hunter: {
    tint: "#7f9b5b",
    accent: "#bda55c",
    tintStrength: 0.26,
    scale: 0.98,
    props: [
      { file: "crossbow_2handed.gltf", pos: [0.18, 0.96, -0.20], scale: 0.53, rot: [0.10, 0, -0.82] },
    ],
  },
});

const DEFAULT_STYLE = Object.freeze({
  tint: "#ffffff",
  accent: "#c6b98a",
  tintStrength: 0.16,
  scale: 1,
  props: [],
});

function color(hex) {
  return BABYLON.Color3.FromHexString(hex);
}

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
    this.characterContainers = new Map();
    this.accessoryContainers = new Map();
    this.failedModels = new Set();
    this.loadingPromise = this.preloadAssets();
  }

  styleFor(actor) {
    return CLASS_STYLE[actor.classId] || DEFAULT_STYLE;
  }

  async preloadAssets() {
    if (!BABYLON.SceneLoader) {
      console.error("Babylon SceneLoader is unavailable; KayKit models cannot load.");
      return;
    }

    const loadCharacter = async file => {
      try {
        const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
          CHARACTER_ROOT,
          file,
          this.scene,
        );
        this.characterContainers.set(file, container);
      } catch (error) {
        this.failedModels.add(file);
        console.error("Failed to load KayKit character", file, error);
      }
    };

    const loadAccessory = async file => {
      try {
        const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
          ASSET_ROOT,
          file,
          this.scene,
        );
        this.accessoryContainers.set(file, container);
      } catch (error) {
        console.warn("Failed to load KayKit accessory", file, error);
      }
    };

    await Promise.all([
      ...MODEL_FILES.map(loadCharacter),
      ...ACCESSORY_FILES.map(loadAccessory),
    ]);
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
    modelPivot.rotation.y = Math.PI;

    const propRoot = new BABYLON.TransformNode(
      "class-props:" + actor.id,
      this.scene,
    );
    propRoot.parent = root;
    propRoot.rotation.y = Math.PI;

    const entry = {
      root,
      modelPivot,
      propRoot,
      classId: actor.classId,
      role: actor.role,
      style: this.styleFor(actor),
      modelFile: this.modelFor(actor),
      modelAttached: false,
      modelMeshes: [],
      propMeshes: [],
      clonedMaterials: [],
      animationGroups: [],
      animationState: null,
      hp: null,
      hpBack: null,
      barRoot: null,
      contactShadow: null,
      accentRing: null,
    };

    this.createGrounding(actor, entry);
    this.createHealthBar(actor, entry);
    this.entries.set(actor.id, entry);
    this.attachModelWhenReady(actor, entry);
    return entry;
  }

  async attachModelWhenReady(actor, entry) {
    await this.loadingPromise;

    if (!this.entries.has(actor.id) || entry.modelAttached) return;

    const container = this.characterContainers.get(entry.modelFile);
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

      for (const node of instance.rootNodes || []) {
        node.parent = entry.modelPivot;
      }

      entry.modelMeshes = entry.modelPivot.getChildMeshes(false);
      entry.animationGroups = instance.animationGroups || [];

      this.applyClassLook(actor, entry);
      this.normalizeModelHeight(entry, actor);
      this.attachClassProps(actor, entry);

      entry.modelAttached = true;
      this.setAnimation(entry, "idle", true);
    } catch (error) {
      console.error("Failed to instantiate KayKit model", entry.modelFile, error);
      this.createFallbackMarker(actor, entry);
    }
  }

  applyClassLook(actor, entry) {
    const style = entry.style;
    const tint = color(style.tint);
    const tintFactor = BABYLON.Color3.Lerp(
      BABYLON.Color3.White(),
      tint,
      style.tintStrength,
    );
    const accent = color(style.accent);

    for (const mesh of entry.modelMeshes) {
      mesh.metadata = {
        ...(mesh.metadata || {}),
        actorId: actor.id,
        kaykit: true,
      };
      mesh.isPickable = true;
      mesh.receiveShadows = true;
      mesh.renderOutline = true;
      mesh.outlineColor = new BABYLON.Color3(0.07, 0.055, 0.05);
      mesh.outlineWidth = 0.018;
      this.shadowGenerator?.addShadowCaster(mesh);

      const original = mesh.material;
      if (!original?.clone) continue;

      const cloned = original.clone(actor.id + ":" + original.name);
      mesh.material = cloned;
      entry.clonedMaterials.push(cloned);

      if (cloned.albedoColor) {
        cloned.albedoColor = cloned.albedoColor.multiply(tintFactor);
        cloned.emissiveColor = accent.scale(0.012);
        if ("roughness" in cloned) cloned.roughness = Math.max(0.72, cloned.roughness ?? 0.8);
      } else if (cloned.diffuseColor) {
        cloned.diffuseColor = cloned.diffuseColor.multiply(tintFactor);
        cloned.emissiveColor = accent.scale(0.010);
        cloned.specularColor = new BABYLON.Color3(0.04, 0.04, 0.035);
      }
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

    const targetHeight = 1.78 * (entry.style.scale || 1);
    const uniform = targetHeight / height;
    entry.modelPivot.scaling.setAll(uniform);

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

  attachClassProps(actor, entry) {
    const specs = entry.style.props || [];

    specs.forEach((spec, index) => {
      const container = this.accessoryContainers.get(spec.file);
      if (!container) return;

      try {
        const instance = container.instantiateModelsToScene(
          sourceName => actor.id + ":prop:" + index + ":" + sourceName,
          false,
        );

        const propAnchor = new BABYLON.TransformNode(
          actor.id + ":prop-anchor:" + index,
          this.scene,
        );
        propAnchor.parent = entry.propRoot;
        propAnchor.position.set(...spec.pos);
        propAnchor.rotation.set(...spec.rot);
        propAnchor.scaling.setAll(spec.scale);

        for (const node of instance.rootNodes || []) {
          node.parent = propAnchor;
        }

        const meshes = propAnchor.getChildMeshes(false);
        for (const mesh of meshes) {
          mesh.metadata = {
            ...(mesh.metadata || {}),
            actorId: actor.id,
            kaykitProp: true,
          };
          mesh.isPickable = true;
          mesh.receiveShadows = true;
          mesh.renderOutline = true;
          mesh.outlineColor = new BABYLON.Color3(0.07, 0.055, 0.05);
          mesh.outlineWidth = 0.016;
          this.shadowGenerator?.addShadowCaster(mesh);

          const original = mesh.material;
          if (original?.clone) {
            const cloned = original.clone(
              actor.id + ":prop:" + index + ":" + original.name,
            );
            const accentFactor = BABYLON.Color3.Lerp(
              BABYLON.Color3.White(),
              color(entry.style.accent),
              0.16,
            );

            if (cloned.albedoColor) {
              cloned.albedoColor = cloned.albedoColor.multiply(accentFactor);
            } else if (cloned.diffuseColor) {
              cloned.diffuseColor = cloned.diffuseColor.multiply(accentFactor);
            }

            mesh.material = cloned;
            entry.clonedMaterials.push(cloned);
          }
        }

        entry.propMeshes.push(...meshes);
      } catch (error) {
        console.warn(
          "Could not instantiate KayKit class prop",
          actor.classId,
          spec.file,
          error,
        );
      }
    });
  }

  createGrounding(actor, entry) {
    const shadowMat = new BABYLON.StandardMaterial(
      "kaykit-shadow-mat:" + actor.id,
      this.scene,
    );
    shadowMat.diffuseColor = new BABYLON.Color3(0.055, 0.038, 0.03);
    shadowMat.specularColor = BABYLON.Color3.Black();
    shadowMat.alpha = 0.30;
    shadowMat.disableLighting = true;

    const shadow = BABYLON.MeshBuilder.CreateCylinder(
      "contact-shadow:" + actor.id,
      {
        height: 0.010,
        diameter: 1.02,
        tessellation: 22,
      },
      this.scene,
    );
    shadow.parent = entry.root;
    shadow.position.y = 0.010;
    shadow.scaling.set(1.20, 1, 0.76);
    shadow.material = shadowMat;
    shadow.isPickable = false;
    entry.contactShadow = shadow;

    const ringMat = new BABYLON.StandardMaterial(
      "class-accent-mat:" + actor.id,
      this.scene,
    );
    ringMat.diffuseColor = color(entry.style.accent);
    ringMat.emissiveColor = color(entry.style.accent).scale(0.10);
    ringMat.specularColor = BABYLON.Color3.Black();
    ringMat.alpha = 0.23;
    ringMat.disableLighting = true;

    const ring = BABYLON.MeshBuilder.CreateTorus(
      "class-accent:" + actor.id,
      {
        diameter: 0.88,
        thickness: 0.024,
        tessellation: 32,
      },
      this.scene,
    );
    ring.parent = entry.root;
    ring.position.y = 0.035;
    ring.material = ringMat;
    ring.isPickable = false;
    entry.accentRing = ring;
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
    hpMat.emissiveColor = hpMat.diffuseColor.scale(0.035);
    hpMat.specularColor = BABYLON.Color3.Black();
    hpMat.disableLighting = true;

    const barRoot = new BABYLON.TransformNode(
      "status:" + actor.id,
      this.scene,
    );
    barRoot.parent = entry.root;
    barRoot.position.y = 2.24;

    const hpBack = BABYLON.MeshBuilder.CreatePlane(
      "hpBack:" + actor.id,
      {
        width: 1.30,
        height: 0.115,
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
        width: 1.24,
        height: 0.070,
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
    mat.diffuseColor = color(entry.style.tint);

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

    const castHints = entry.role === "melee"
      ? ["attack", "slash", "melee", "swing"]
      : ["cast", "spell", "magic", "attack_magic"];

    const hints = state === "run"
      ? ["run", "running", "walk", "walking"]
      : state === "cast"
        ? castHints
        : state === "death"
          ? ["death", "die", "dying"]
          : ["idle", "standing"];

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

    for (const material of entry.clonedMaterials || []) {
      try {
        material.dispose();
      } catch {
        // Cloned visual materials are best-effort cleanup only.
      }
    }

    entry.root.dispose(false, true);
  }

  sync(game, time = performance.now()) {
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

      const propBob = moving
        ? Math.sin(time * 0.010) * 0.018
        : Math.sin(time * 0.0025) * 0.007;
      entry.propRoot.position.y = propBob;

      const health = Math.max(0, Math.min(1, actor.healthPct));
      entry.hp.scaling.x = health;
      entry.hp.position.x = -0.62 * (1 - health);

      const hpColor = health < 0.20
        ? "#e14d43"
        : actor.team === "friendly"
          ? "#58b96b"
          : "#d55c50";

      entry.hp.material.diffuseColor = BABYLON.Color3.FromHexString(hpColor);
      entry.hp.material.emissiveColor =
        entry.hp.material.diffuseColor.scale(health < 0.20 ? 0.08 : 0.03);

      if (entry.accentRing) {
        entry.accentRing.visibility = actor.cast ? 0.72 : 0.42;
        const pulse = actor.cast
          ? 1 + Math.sin(time * 0.015) * 0.08
          : 1;
        entry.accentRing.scaling.setAll(pulse);
      }
    }
  }

  meshForActor(id) {
    return this.entries.get(id)?.modelMeshes?.[0] || null;
  }

  rootForActor(id) {
    return this.entries.get(id)?.root || null;
  }

  worldPosition(id, y = 1.25) {
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
