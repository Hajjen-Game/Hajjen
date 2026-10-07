const TIBY_ROOT = "./assets/characters/tiby/";
const TIBY_FILE = "tiby-base.glb";

const KAYKIT_COMMIT = "672074b73ba276876a19e8816ecdc5241817ab47";
const KAYKIT_ASSET_ROOT =
  "https://raw.githubusercontent.com/KayKit-Game-Assets/"
  + "KayKit-Character-Pack-Adventures-1.0/"
  + KAYKIT_COMMIT
  + "/addons/kaykit_character_pack_adventures/Assets/gltf/";

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
    accent: "#e7d18a",
    scale: 1.02,
    width: 0.95,
    props: [
      { file: "staff.gltf", pos: [0.39, 0.76, 0.08], scale: 0.43, rot: [0, 0, -0.10] },
      { file: "spellbook_open.gltf", pos: [-0.30, 0.92, 0.14], scale: 0.31, rot: [-0.38, 0, -0.06] },
    ],
  },
  mage: {
    accent: "#729cf2",
    scale: 1.01,
    width: 0.93,
    props: [
      { file: "staff.gltf", pos: [0.38, 0.76, 0.08], scale: 0.43, rot: [0, 0, -0.10] },
    ],
  },
  warlock: {
    accent: "#9b69c7",
    scale: 1.01,
    width: 0.94,
    props: [
      { file: "wand.gltf", pos: [0.34, 0.83, 0.10], scale: 0.43, rot: [0, 0, -0.28] },
      { file: "spellbook_open.gltf", pos: [-0.29, 0.91, 0.13], scale: 0.30, rot: [-0.36, 0, 0.06] },
    ],
  },
  druid: {
    accent: "#72a65b",
    scale: 1.03,
    width: 1.00,
    props: [
      { file: "staff.gltf", pos: [0.39, 0.76, 0.08], scale: 0.43, rot: [0, 0, -0.10] },
    ],
  },
  warrior: {
    accent: "#c7795b",
    scale: 1.08,
    width: 1.10,
    props: [
      { file: "sword_2handed.gltf", pos: [0.40, 0.66, 0.03], scale: 0.37, rot: [0, 0, -0.48] },
    ],
  },
  paladin: {
    accent: "#e7b6cd",
    scale: 1.07,
    width: 1.08,
    props: [
      { file: "sword_1handed.gltf", pos: [0.35, 0.74, 0.11], scale: 0.38, rot: [0, 0, -0.46] },
      { file: "shield_badge.gltf", pos: [-0.35, 0.82, 0.16], scale: 0.48, rot: [0, 0.04, 0.05] },
    ],
  },
  "death-knight": {
    accent: "#6fa8c7",
    scale: 1.09,
    width: 1.08,
    props: [
      { file: "sword_2handed.gltf", pos: [0.40, 0.66, 0.03], scale: 0.39, rot: [0, 0, -0.47] },
    ],
  },
  rogue: {
    accent: "#d7bd55",
    scale: 0.97,
    width: 0.90,
    props: [
      { file: "dagger.gltf", pos: [-0.28, 0.68, 0.11], scale: 0.34, rot: [0, 0, 0.45] },
      { file: "dagger.gltf", pos: [0.28, 0.68, 0.11], scale: 0.34, rot: [0, 0, -0.45] },
    ],
  },
  shaman: {
    accent: "#58aaa8",
    scale: 1.03,
    width: 1.02,
    props: [
      { file: "axe_1handed.gltf", pos: [0.33, 0.73, 0.11], scale: 0.38, rot: [0, 0, -0.42] },
      { file: "shield_round.gltf", pos: [-0.34, 0.81, 0.16], scale: 0.46, rot: [0, 0.04, 0.04] },
    ],
  },
  hunter: {
    accent: "#8da75e",
    scale: 0.98,
    width: 0.94,
    props: [
      { file: "crossbow_2handed.gltf", pos: [0.12, 0.87, -0.14], scale: 0.35, rot: [0.08, 0, -0.72] },
    ],
  },
});

const DEFAULT_STYLE = Object.freeze({
  accent: "#c9b888",
  scale: 1,
  width: 1,
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
    this.bodyContainer = null;
    this.accessoryContainers = new Map();
    this.loadingPromise = this.preloadAssets();
  }

  styleFor(actor) {
    return CLASS_STYLE[actor.classId] || DEFAULT_STYLE;
  }

  async preloadAssets() {
    if (!BABYLON.SceneLoader) {
      console.error("Babylon SceneLoader is unavailable.");
      return;
    }

    const bodyPromise = BABYLON.SceneLoader.LoadAssetContainerAsync(
      TIBY_ROOT,
      TIBY_FILE,
      this.scene,
    ).then(container => {
      this.bodyContainer = container;
    }).catch(error => {
      console.error("Failed to load local Tiby body", error);
    });

    const accessoryPromises = ACCESSORY_FILES.map(async file => {
      try {
        const container = await BABYLON.SceneLoader.LoadAssetContainerAsync(
          KAYKIT_ASSET_ROOT,
          file,
          this.scene,
        );
        this.accessoryContainers.set(file, container);
      } catch (error) {
        console.warn("Failed to load class accessory", file, error);
      }
    });

    await Promise.all([bodyPromise, ...accessoryPromises]);
  }

  create(actor) {
    const root = new BABYLON.TransformNode("actor:" + actor.id, this.scene);
    const visualRoot = new BABYLON.TransformNode(
      "tiby-visual:" + actor.id,
      this.scene,
    );
    visualRoot.parent = root;
    visualRoot.rotation.y = Math.PI;

    const propRoot = new BABYLON.TransformNode(
      "class-props:" + actor.id,
      this.scene,
    );
    propRoot.parent = root;
    propRoot.rotation.y = Math.PI;

    const entry = {
      root,
      visualRoot,
      propRoot,
      classId: actor.classId,
      role: actor.role,
      style: this.styleFor(actor),
      modelAttached: false,
      modelMeshes: [],
      propMeshes: [],
      animationGroups: [],
      animationState: null,
      hp: null,
      hpBack: null,
      barRoot: null,
      contactShadow: null,
      classRing: null,
    };

    this.createGrounding(actor, entry);
    this.createHealthBar(actor, entry);
    this.entries.set(actor.id, entry);
    this.attachWhenReady(actor, entry);
    return entry;
  }

  async attachWhenReady(actor, entry) {
    await this.loadingPromise;
    if (!this.entries.has(actor.id) || entry.modelAttached) return;

    if (!this.bodyContainer) {
      this.createFallbackMarker(actor, entry);
      return;
    }

    try {
      const instance = this.bodyContainer.instantiateModelsToScene(
        sourceName => actor.id + ":" + sourceName,
        false,
      );

      for (const node of instance.rootNodes || []) {
        node.parent = entry.visualRoot;
      }

      entry.modelMeshes = entry.visualRoot.getChildMeshes(false);
      entry.animationGroups = instance.animationGroups || [];

      this.prepareBody(actor, entry);
      this.normalizeBody(entry);
      this.attachClassProps(actor, entry);
      entry.modelAttached = true;
      this.setAnimation(entry, "idle", true);
    } catch (error) {
      console.error("Failed to instantiate Tiby character", error);
      this.createFallbackMarker(actor, entry);
    }
  }

  prepareBody(actor, entry) {
    const accent = color(entry.style.accent);

    for (const mesh of entry.modelMeshes) {
      mesh.metadata = {
        ...(mesh.metadata || {}),
        actorId: actor.id,
        tiby: true,
      };
      mesh.isPickable = true;
      mesh.receiveShadows = true;
      mesh.renderOutline = true;
      mesh.outlineColor = new BABYLON.Color3(0.065, 0.052, 0.045);
      mesh.outlineWidth = 0.018;
      this.shadowGenerator?.addShadowCaster(mesh);

      const material = mesh.material;
      if (!material) continue;

      // Preserve the source skin/face colors. A very small class accent keeps
      // the body readable without dyeing the entire chibi model.
      if (material.emissiveColor) {
        material.emissiveColor = accent.scale(0.008);
      }
      if (material.specularColor) {
        material.specularColor = new BABYLON.Color3(0.025, 0.025, 0.022);
      }
      if ("roughness" in material && material.roughness != null) {
        material.roughness = Math.max(0.78, material.roughness);
      }
    }
  }

  normalizeBody(entry) {
    const meshes = entry.modelMeshes.filter(mesh => mesh.getBoundingInfo);
    if (!meshes.length) return;

    for (const mesh of meshes) mesh.computeWorldMatrix(true);

    let minY = Number.POSITIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const mesh of meshes) {
      const box = mesh.getBoundingInfo()?.boundingBox;
      if (!box) continue;
      minY = Math.min(minY, box.minimumWorld.y);
      maxY = Math.max(maxY, box.maximumWorld.y);
    }

    const height = maxY - minY;
    if (!Number.isFinite(height) || height <= 0.001) return;

    const uniform = (1.70 * (entry.style.scale || 1)) / height;
    entry.visualRoot.scaling.set(
      uniform * (entry.style.width || 1),
      uniform,
      uniform,
    );

    for (const mesh of meshes) mesh.computeWorldMatrix(true);
    minY = Number.POSITIVE_INFINITY;
    for (const mesh of meshes) {
      const box = mesh.getBoundingInfo()?.boundingBox;
      if (!box) continue;
      minY = Math.min(minY, box.minimumWorld.y);
    }
    if (Number.isFinite(minY)) {
      entry.visualRoot.position.y -= minY;
    }
  }

  attachClassProps(actor, entry) {
    for (const [index, spec] of (entry.style.props || []).entries()) {
      const container = this.accessoryContainers.get(spec.file);
      if (!container) continue;

      try {
        const instance = container.instantiateModelsToScene(
          sourceName => actor.id + ":prop:" + index + ":" + sourceName,
          false,
        );

        const anchor = new BABYLON.TransformNode(
          actor.id + ":prop-anchor:" + index,
          this.scene,
        );
        anchor.parent = entry.propRoot;
        anchor.position.set(...spec.pos);
        anchor.rotation.set(...spec.rot);
        anchor.scaling.setAll(spec.scale);

        for (const node of instance.rootNodes || []) {
          node.parent = anchor;
        }

        const meshes = anchor.getChildMeshes(false);
        for (const mesh of meshes) {
          mesh.metadata = {
            ...(mesh.metadata || {}),
            actorId: actor.id,
            classProp: true,
          };
          mesh.isPickable = true;
          mesh.receiveShadows = true;
          mesh.renderOutline = true;
          mesh.outlineColor = new BABYLON.Color3(0.065, 0.052, 0.045);
          mesh.outlineWidth = 0.015;
          this.shadowGenerator?.addShadowCaster(mesh);
        }
        entry.propMeshes.push(...meshes);
      } catch (error) {
        console.warn("Could not instantiate class prop", spec.file, error);
      }
    }
  }

  createGrounding(actor, entry) {
    const shadowMat = new BABYLON.StandardMaterial(
      "tiby-shadow:" + actor.id,
      this.scene,
    );
    shadowMat.diffuseColor = new BABYLON.Color3(0.045, 0.032, 0.027);
    shadowMat.specularColor = BABYLON.Color3.Black();
    shadowMat.alpha = 0.28;
    shadowMat.disableLighting = true;

    const shadow = BABYLON.MeshBuilder.CreateCylinder(
      "contact-shadow:" + actor.id,
      { height: 0.010, diameter: 0.90, tessellation: 20 },
      this.scene,
    );
    shadow.parent = entry.root;
    shadow.position.y = 0.010;
    shadow.scaling.set(1.16, 1, 0.74);
    shadow.material = shadowMat;
    shadow.isPickable = false;
    entry.contactShadow = shadow;

    const ringMat = new BABYLON.StandardMaterial(
      "class-ring:" + actor.id,
      this.scene,
    );
    ringMat.diffuseColor = color(entry.style.accent);
    ringMat.emissiveColor = color(entry.style.accent).scale(0.06);
    ringMat.specularColor = BABYLON.Color3.Black();
    ringMat.alpha = 0.16;
    ringMat.disableLighting = true;

    const ring = BABYLON.MeshBuilder.CreateTorus(
      "class-ring:" + actor.id,
      { diameter: 0.82, thickness: 0.020, tessellation: 30 },
      this.scene,
    );
    ring.parent = entry.root;
    ring.position.y = 0.03;
    ring.material = ringMat;
    ring.isPickable = false;
    entry.classRing = ring;
  }

  createHealthBar(actor, entry) {
    const backMat = new BABYLON.StandardMaterial(
      "hp-back:" + actor.id,
      this.scene,
    );
    backMat.diffuseColor = BABYLON.Color3.FromHexString("#171412");
    backMat.specularColor = BABYLON.Color3.Black();
    backMat.disableLighting = true;

    const hpMat = new BABYLON.StandardMaterial(
      "hp:" + actor.id,
      this.scene,
    );
    hpMat.diffuseColor = BABYLON.Color3.FromHexString(
      actor.team === "friendly" ? "#58b96b" : "#d55c50",
    );
    hpMat.emissiveColor = hpMat.diffuseColor.scale(0.025);
    hpMat.specularColor = BABYLON.Color3.Black();
    hpMat.disableLighting = true;

    const barRoot = new BABYLON.TransformNode("status:" + actor.id, this.scene);
    barRoot.parent = entry.root;
    barRoot.position.y = 2.18;

    const hpBack = BABYLON.MeshBuilder.CreatePlane(
      "hpBack:" + actor.id,
      { width: 1.22, height: 0.105, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
      this.scene,
    );
    hpBack.parent = barRoot;
    hpBack.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    hpBack.material = backMat;
    hpBack.isPickable = false;

    const hp = BABYLON.MeshBuilder.CreatePlane(
      "hp:" + actor.id,
      { width: 1.16, height: 0.064, sideOrientation: BABYLON.Mesh.DOUBLESIDE },
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

    const mat = new BABYLON.StandardMaterial("fallback:" + actor.id, this.scene);
    mat.diffuseColor = color(entry.style.accent);

    const marker = BABYLON.MeshBuilder.CreateCapsule(
      "fallback:" + actor.id,
      { height: 1.25, radius: 0.29, tessellation: 8 },
      this.scene,
    );
    marker.parent = entry.visualRoot;
    marker.position.y = 0.63;
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
      ? ["run", "walk"]
      : state === "cast"
        ? ["cast", "spell", "attack"]
        : state === "death"
          ? ["death", "die"]
          : ["idle"];

    const selected = findAnimation(entry.animationGroups, hints);
    for (const group of entry.animationGroups) {
      if (group !== selected) group.stop();
    }
    if (selected) {
      selected.start(true, 1, selected.from, selected.to, false);
      entry.animationState = state;
    }
  }

  disposeEntry(entry) {
    for (const group of entry.animationGroups || []) {
      try { group.stop(); group.dispose(); } catch {}
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
        && (entry.classId !== actor.classId || entry.role !== actor.role)
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
        entry.root.rotation.y = Math.atan2(movement.x, movement.y);
      }

      if (actor.cast) this.setAnimation(entry, "cast");
      else if (moving) this.setAnimation(entry, "run");
      else this.setAnimation(entry, "idle");

      // Tiby has a rig but may export without authored clips. Keep a subtle
      // miniature-style procedural pose so the arena does not feel static.
      const bob = moving
        ? Math.sin(time * 0.012) * 0.028
        : Math.sin(time * 0.0024) * 0.008;
      entry.visualRoot.position.y += bob;
      entry.propRoot.position.y = bob;

      const health = Math.max(0, Math.min(1, actor.healthPct));
      entry.hp.scaling.x = health;
      entry.hp.position.x = -0.58 * (1 - health);

      const hpColor = health < 0.20
        ? "#e14d43"
        : actor.team === "friendly"
          ? "#58b96b"
          : "#d55c50";
      entry.hp.material.diffuseColor = BABYLON.Color3.FromHexString(hpColor);
      entry.hp.material.emissiveColor =
        entry.hp.material.diffuseColor.scale(health < 0.20 ? 0.07 : 0.025);

      entry.classRing.visibility = actor.cast ? 0.34 : 0.16;
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
