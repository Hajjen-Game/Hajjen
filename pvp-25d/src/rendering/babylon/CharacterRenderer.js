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
    archetype: "caster",
    primary: "#eee1bd",
    secondary: "#b89848",
    accent: "#e7c85e",
    scale: 1.13,
    width: 0.90,
    depth: 0.94,
    props: [
      { file: "staff.gltf", pos: [0.51, 0.86, 0.10], scale: 0.70, rot: [0, 0, -0.14] },
      { file: "spellbook_open.gltf", pos: [-0.36, 0.98, 0.18], scale: 0.40, rot: [-0.38, 0, -0.06] },
    ],
  },
  mage: {
    archetype: "caster",
    primary: "#5b9fe8",
    secondary: "#51449f",
    accent: "#8874ef",
    scale: 1.12,
    width: 0.88,
    depth: 0.93,
    props: [
      { file: "staff.gltf", pos: [0.50, 0.86, 0.10], scale: 0.70, rot: [0, 0, -0.14] },
    ],
  },
  warlock: {
    accent: "#9b69c7",
    scale: 1.01,
    width: 0.94,
    depth: 0.96,
    props: [
      { file: "wand.gltf", pos: [0.34, 0.83, 0.10], scale: 0.43, rot: [0, 0, -0.28] },
      { file: "spellbook_open.gltf", pos: [-0.29, 0.91, 0.13], scale: 0.30, rot: [-0.36, 0, 0.06] },
    ],
  },
  druid: {
    accent: "#72a65b",
    scale: 1.03,
    width: 1.00,
    depth: 1.00,
    props: [
      { file: "staff.gltf", pos: [0.39, 0.76, 0.08], scale: 0.43, rot: [0, 0, -0.10] },
    ],
  },
  warrior: {
    archetype: "heavy",
    primary: "#9f5848",
    secondary: "#848a91",
    accent: "#d08a63",
    scale: 1.20,
    width: 1.24,
    depth: 1.10,
    props: [
      { file: "sword_2handed.gltf", pos: [0.54, 0.72, 0.04], scale: 0.66, rot: [0, 0, -0.52] },
    ],
  },
  paladin: {
    accent: "#e7b6cd",
    scale: 1.07,
    width: 1.08,
    depth: 1.04,
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
    archetype: "light",
    primary: "#a08b31",
    secondary: "#403a28",
    accent: "#dec85b",
    scale: 1.07,
    width: 0.82,
    depth: 0.88,
    props: [
      { file: "dagger.gltf", pos: [-0.40, 0.72, 0.13], scale: 0.58, rot: [0, 0, 0.52] },
      { file: "dagger.gltf", pos: [0.40, 0.72, 0.13], scale: 0.58, rot: [0, 0, -0.52] },
    ],
  },
  shaman: {
    accent: "#58aaa8",
    scale: 1.03,
    width: 1.02,
    depth: 1.00,
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
  archetype: null,
  primary: "#8f8171",
  secondary: "#5b534a",
  accent: "#c9b888",
  scale: 1,
  width: 1,
  depth: 1,
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

    const silhouetteRoot = new BABYLON.TransformNode(
      "archetype-silhouette:" + actor.id,
      this.scene,
    );
    silhouetteRoot.parent = root;
    silhouetteRoot.rotation.y = Math.PI;

    const propRoot = new BABYLON.TransformNode(
      "class-props:" + actor.id,
      this.scene,
    );
    propRoot.parent = root;
    propRoot.rotation.y = Math.PI;

    const entry = {
      root,
      visualRoot,
      silhouetteRoot,
      propRoot,
      classId: actor.classId,
      role: actor.role,
      style: this.styleFor(actor),
      modelAttached: false,
      modelMeshes: [],
      propMeshes: [],
      silhouetteMeshes: [],
      ownedMaterials: [],
      animationGroups: [],
      animationState: null,
      hp: null,
      hpBack: null,
      barRoot: null,
      contactShadow: null,
      classRing: null,
      baseVisualY: 0,
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
      this.createArchetypeSilhouette(actor, entry);
      this.attachClassProps(actor, entry);
      entry.modelAttached = true;
      this.setAnimation(entry, "idle", true);
    } catch (error) {
      console.error("Failed to instantiate Tiby character", error);
      this.createFallbackMarker(actor, entry);
    }
  }

  prepareBody(actor, entry) {
    const primary = color(entry.style.primary || entry.style.accent);
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
      mesh.outlineColor = new BABYLON.Color3(0.05, 0.04, 0.035);
      mesh.outlineWidth = 0.024;
      this.shadowGenerator?.addShadowCaster(mesh);

      const original = mesh.material;
      if (!original?.clone) continue;

      const material = original.clone(
        actor.id + ":body:" + (original.name || "material"),
      );
      mesh.material = material;
      entry.ownedMaterials.push(material);

      const materialName = String(original.name || "").toLowerCase();
      const looksLikeSkin =
        materialName.includes("skin")
        || materialName.includes("face")
        || materialName.includes("head");

      // The source often uses broad/simple materials, so use a strong tint for
      // arena readability. Named skin/face materials keep more of the source.
      const tintStrength = looksLikeSkin ? 0.18 : 0.58;

      if (material.albedoColor) {
        material.albedoColor = BABYLON.Color3.Lerp(
          material.albedoColor,
          primary,
          tintStrength,
        );
        material.emissiveColor = accent.scale(0.018);
        if ("roughness" in material) material.roughness = 0.84;
        if ("metallic" in material) material.metallic = 0;
      } else if (material.diffuseColor) {
        material.diffuseColor = BABYLON.Color3.Lerp(
          material.diffuseColor,
          primary,
          tintStrength,
        );
        material.emissiveColor = accent.scale(0.016);
        material.specularColor = new BABYLON.Color3(0.025, 0.025, 0.022);
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

    const uniform = (2.08 * (entry.style.scale || 1)) / height;
    entry.visualRoot.scaling.set(
      uniform * (entry.style.width || 1),
      uniform,
      uniform * (entry.style.depth || 1),
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
    entry.baseVisualY = entry.visualRoot.position.y;
  }

  createVisualMaterial(entry, name, hex) {
    const material = new BABYLON.StandardMaterial(
      name + ":" + entry.classId,
      this.scene,
    );
    material.diffuseColor = color(hex);
    material.ambientColor = color(hex).scale(0.12);
    material.emissiveColor = color(hex).scale(0.012);
    material.specularColor = new BABYLON.Color3(0.035, 0.035, 0.03);
    entry.ownedMaterials.push(material);
    return material;
  }

  registerSilhouetteMesh(actor, entry, mesh, material) {
    mesh.parent = entry.silhouetteRoot;
    mesh.material = material;
    mesh.metadata = {
      ...(mesh.metadata || {}),
      actorId: actor.id,
      archetypeSilhouette: true,
    };
    mesh.isPickable = true;
    mesh.receiveShadows = true;
    mesh.renderOutline = true;
    mesh.outlineColor = new BABYLON.Color3(0.06, 0.047, 0.04);
    mesh.outlineWidth = 0.018;
    this.shadowGenerator?.addShadowCaster(mesh);
    entry.silhouetteMeshes.push(mesh);
    return mesh;
  }

  createArchetypeSilhouette(actor, entry) {
    const archetype = entry.style.archetype;
    if (!archetype) return;

    const primary = this.createVisualMaterial(
      entry,
      "archetype-primary:" + actor.id,
      entry.style.primary,
    );
    const secondary = this.createVisualMaterial(
      entry,
      "archetype-secondary:" + actor.id,
      entry.style.secondary,
    );

    if (archetype === "caster") {
      // A broad robe is the dominant silhouette. It deliberately hides much
      // of Tiby's neutral lower body so the unit reads as caster from range.
      const robe = BABYLON.MeshBuilder.CreateCylinder(
        "caster-robe:" + actor.id,
        {
          height: 1.06,
          diameterTop: 0.52,
          diameterBottom: 1.02,
          tessellation: 8,
        },
        this.scene,
      );
      robe.position.set(0, 0.54, 0);
      this.registerSilhouetteMesh(actor, entry, robe, primary);

      const upperRobe = BABYLON.MeshBuilder.CreateCylinder(
        "caster-upper:" + actor.id,
        {
          height: 0.50,
          diameterTop: 0.62,
          diameterBottom: 0.70,
          tessellation: 8,
        },
        this.scene,
      );
      upperRobe.position.set(0, 1.13, 0);
      this.registerSilhouetteMesh(actor, entry, upperRobe, primary);

      const mantle = BABYLON.MeshBuilder.CreateCylinder(
        "caster-mantle:" + actor.id,
        {
          height: 0.20,
          diameterTop: 0.86,
          diameterBottom: 0.76,
          tessellation: 8,
        },
        this.scene,
      );
      mantle.position.set(0, 1.37, 0);
      this.registerSilhouetteMesh(actor, entry, mantle, secondary);

      const tabard = BABYLON.MeshBuilder.CreateBox(
        "caster-tabard:" + actor.id,
        { width: 0.24, height: 0.78, depth: 0.08 },
        this.scene,
      );
      tabard.position.set(0, 0.88, 0.46);
      tabard.rotation.z = actor.classId === "mage" ? 0.10 : -0.06;
      this.registerSilhouetteMesh(actor, entry, tabard, secondary);

      // Small collar fins create a clear shoulder line without another hat.
      for (const side of [-1, 1]) {
        const collar = BABYLON.MeshBuilder.CreatePolyhedron(
          "caster-collar:" + actor.id + ":" + side,
          { type: 2, size: 0.18 },
          this.scene,
        );
        collar.position.set(side * 0.38, 1.40, 0);
        collar.scaling.set(1.10, 0.60, 0.82);
        this.registerSilhouetteMesh(actor, entry, collar, secondary);
      }
      return;
    }

    if (archetype === "light") {
      // Keep the rogue narrow through the torso but create a sharp triangular
      // read using vest, scarf and oversized daggers.
      const vest = BABYLON.MeshBuilder.CreateCylinder(
        "light-vest:" + actor.id,
        {
          height: 0.72,
          diameterTop: 0.48,
          diameterBottom: 0.60,
          tessellation: 8,
        },
        this.scene,
      );
      vest.position.set(0, 1.00, 0);
      this.registerSilhouetteMesh(actor, entry, vest, secondary);

      const belt = BABYLON.MeshBuilder.CreateCylinder(
        "light-belt:" + actor.id,
        {
          height: 0.13,
          diameterTop: 0.64,
          diameterBottom: 0.64,
          tessellation: 8,
        },
        this.scene,
      );
      belt.position.set(0, 0.67, 0);
      this.registerSilhouetteMesh(actor, entry, belt, primary);

      const scarf = BABYLON.MeshBuilder.CreateBox(
        "light-scarf:" + actor.id,
        { width: 0.54, height: 0.16, depth: 0.12 },
        this.scene,
      );
      scarf.position.set(0, 1.31, 0.30);
      scarf.rotation.z = -0.10;
      this.registerSilhouetteMesh(actor, entry, scarf, primary);

      const scarfTail = BABYLON.MeshBuilder.CreateBox(
        "light-scarf-tail:" + actor.id,
        { width: 0.16, height: 0.62, depth: 0.09 },
        this.scene,
      );
      scarfTail.position.set(-0.26, 1.05, -0.28);
      scarfTail.rotation.z = -0.44;
      this.registerSilhouetteMesh(actor, entry, scarfTail, primary);

      for (const side of [-1, 1]) {
        const shoulder = BABYLON.MeshBuilder.CreatePolyhedron(
          "light-shoulder:" + actor.id + ":" + side,
          { type: 2, size: 0.14 },
          this.scene,
        );
        shoulder.position.set(side * 0.32, 1.30, 0);
        shoulder.scaling.set(0.92, 0.58, 0.80);
        this.registerSilhouetteMesh(actor, entry, shoulder, primary);
      }
      return;
    }

    if (archetype === "heavy") {
      // Warrior intentionally exaggerates width. The pauldrons should remain
      // readable even at full arena zoom.
      const chest = BABYLON.MeshBuilder.CreateBox(
        "heavy-chest:" + actor.id,
        { width: 1.08, height: 0.72, depth: 0.58 },
        this.scene,
      );
      chest.position.set(0, 1.08, 0.03);
      chest.rotation.x = -0.05;
      this.registerSilhouetteMesh(actor, entry, chest, primary);

      const breastplate = BABYLON.MeshBuilder.CreateBox(
        "heavy-front-plate:" + actor.id,
        { width: 0.66, height: 0.56, depth: 0.10 },
        this.scene,
      );
      breastplate.position.set(0, 1.09, 0.35);
      this.registerSilhouetteMesh(actor, entry, breastplate, secondary);

      const waist = BABYLON.MeshBuilder.CreateCylinder(
        "heavy-waist:" + actor.id,
        {
          height: 0.42,
          diameterTop: 0.76,
          diameterBottom: 0.86,
          tessellation: 8,
        },
        this.scene,
      );
      waist.position.set(0, 0.62, 0);
      this.registerSilhouetteMesh(actor, entry, waist, primary);

      for (const side of [-1, 1]) {
        const pauldron = BABYLON.MeshBuilder.CreatePolyhedron(
          "heavy-pauldron:" + actor.id + ":" + side,
          { type: 2, size: 0.39 },
          this.scene,
        );
        pauldron.position.set(side * 0.66, 1.43, 0);
        pauldron.scaling.set(1.28, 0.78, 1.00);
        pauldron.rotation.z = side * 0.12;
        this.registerSilhouetteMesh(actor, entry, pauldron, secondary);

        const armGuard = BABYLON.MeshBuilder.CreateBox(
          "heavy-armguard:" + actor.id + ":" + side,
          { width: 0.22, height: 0.46, depth: 0.28 },
          this.scene,
        );
        armGuard.position.set(side * 0.61, 1.02, 0);
        armGuard.rotation.z = side * 0.10;
        this.registerSilhouetteMesh(actor, entry, armGuard, primary);
      }

      const belt = BABYLON.MeshBuilder.CreateCylinder(
        "heavy-belt:" + actor.id,
        {
          height: 0.15,
          diameterTop: 0.88,
          diameterBottom: 0.88,
          tessellation: 8,
        },
        this.scene,
      );
      belt.position.set(0, 0.72, 0);
      this.registerSilhouetteMesh(actor, entry, belt, secondary);
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
    barRoot.position.y = 2.72;

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
    for (const material of entry.ownedMaterials || []) {
      try { material.dispose(); } catch {}
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
      entry.visualRoot.position.y = entry.baseVisualY + bob;
      entry.silhouetteRoot.position.y = bob;
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
