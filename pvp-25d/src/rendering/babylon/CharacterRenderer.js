const CLASS_STYLES = Object.freeze({
  priest: {
    primary: "#d6c9a6",
    secondary: "#f0e6c8",
    accent: "#d9b958",
    dark: "#50483f",
    trim: "#88713d",
    archetype: "robe",
    headgear: "hood",
    weapon: "sun-staff",
    scale: 1.02,
  },
  druid: {
    primary: "#7c5a38",
    secondary: "#a77a48",
    accent: "#73945a",
    dark: "#40362b",
    trim: "#9b7e48",
    archetype: "robe",
    headgear: "antler-cowl",
    weapon: "nature-staff",
    scale: 1.04,
  },
  paladin: {
    primary: "#b86f8f",
    secondary: "#d4a7b8",
    accent: "#e0bc62",
    dark: "#493943",
    trim: "#8b6049",
    archetype: "heavy",
    headgear: "crowned-helm",
    weapon: "hammer-shield",
    scale: 1.08,
  },
  warrior: {
    primary: "#8d4f3e",
    secondary: "#b27150",
    accent: "#c9a06b",
    dark: "#42322c",
    trim: "#6f4637",
    archetype: "heavy",
    headgear: "war-helm",
    weapon: "sword-shield",
    scale: 1.08,
  },
  rogue: {
    primary: "#9a8431",
    secondary: "#c3a743",
    accent: "#e0c768",
    dark: "#2f2c28",
    trim: "#5d512b",
    archetype: "light",
    headgear: "deep-hood",
    weapon: "dual",
    scale: 0.96,
  },
  "death-knight": {
    primary: "#5d343a",
    secondary: "#82464b",
    accent: "#b15459",
    dark: "#242831",
    trim: "#59323a",
    archetype: "heavy",
    headgear: "horned-helm",
    weapon: "greatsword",
    scale: 1.10,
  },
  mage: {
    primary: "#3f5f91",
    secondary: "#6b75ad",
    accent: "#8670be",
    dark: "#272d4a",
    trim: "#4d4778",
    archetype: "robe",
    headgear: "pointed-hood",
    weapon: "arcane-staff",
    scale: 0.99,
  },
  warlock: {
    primary: "#57406c",
    secondary: "#77568f",
    accent: "#9e6fbc",
    dark: "#2b2638",
    trim: "#563b65",
    archetype: "robe",
    headgear: "fel-hood",
    weapon: "fel-staff",
    scale: 1.00,
  },
  shaman: {
    primary: "#315b86",
    secondary: "#4b7897",
    accent: "#5ba3a1",
    dark: "#293945",
    trim: "#7f6e42",
    archetype: "mail",
    headgear: "totem-crest",
    weapon: "mace-shield",
    scale: 1.04,
  },
  hunter: {
    primary: "#5b7042",
    secondary: "#7d9256",
    accent: "#b39751",
    dark: "#30372b",
    trim: "#6e5735",
    archetype: "light",
    headgear: "ranger-hood",
    weapon: "bow",
    scale: 0.99,
  },
});

const OUTLINE = BABYLON.Color3.FromHexString("#251d19");

function c3(hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function makeMaterial(scene, name, hex, options = {}) {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.diffuseColor = c3(hex);
  material.ambientColor = c3(hex).scale(options.ambient ?? 0.12);
  material.specularColor = new BABYLON.Color3(
    options.specular ?? 0.025,
    options.specular ?? 0.025,
    options.specular ?? 0.022,
  );
  material.emissiveColor = options.emissive
    ? c3(hex).scale(options.emissive)
    : BABYLON.Color3.Black();
  material.alpha = options.alpha ?? 1;
  if (options.disableLighting) material.disableLighting = true;
  return material;
}

export class CharacterRenderer {
  constructor(scene, shadowGenerator, scale) {
    this.scene = scene;
    this.shadowGenerator = shadowGenerator;
    this.scale = scale;
    this.entries = new Map();
    this.materials = new Map();
  }

  styleFor(actor) {
    return CLASS_STYLES[actor.classId] || {
      primary: "#62736f",
      secondary: "#83908a",
      accent: "#b1ad84",
      dark: "#303936",
      trim: "#555f56",
      archetype: actor.role === "melee" ? "heavy" : "robe",
      headgear: actor.role === "melee" ? "war-helm" : "hood",
      weapon: actor.role === "melee" ? "sword-shield" : "arcane-staff",
      scale: 1,
    };
  }

  material(key, hex, options = {}) {
    const signature = [
      key,
      hex,
      options.emissive || 0,
      options.alpha ?? 1,
      options.specular ?? 0.025,
    ].join(":");

    if (!this.materials.has(signature)) {
      this.materials.set(
        signature,
        makeMaterial(this.scene, signature, hex, options),
      );
    }

    return this.materials.get(signature);
  }

  tag(mesh, actor, { outline = false, shadow = true } = {}) {
    mesh.metadata = {
      ...(mesh.metadata || {}),
      actorId: actor.id,
    };
    mesh.isPickable = true;

    if (outline) {
      mesh.renderOutline = true;
      mesh.outlineColor = OUTLINE;
      mesh.outlineWidth = 0.025;
    }

    if (shadow) this.shadowGenerator?.addShadowCaster(mesh);
    return mesh;
  }

  box(name, options, parent, position, material, actor, extras = {}) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, options, this.scene);
    mesh.parent = parent;
    mesh.position.set(...position);
    mesh.material = material;
    return this.tag(mesh, actor, extras);
  }

  cylinder(name, options, parent, position, material, actor, extras = {}) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(
      name,
      options,
      this.scene,
    );
    mesh.parent = parent;
    mesh.position.set(...position);
    mesh.material = material;
    return this.tag(mesh, actor, extras);
  }

  sphere(name, options, parent, position, material, actor, extras = {}) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, options, this.scene);
    mesh.parent = parent;
    mesh.position.set(...position);
    mesh.material = material;
    return this.tag(mesh, actor, extras);
  }

  poly(name, options, parent, position, material, actor, extras = {}) {
    const mesh = BABYLON.MeshBuilder.CreatePolyhedron(
      name,
      options,
      this.scene,
    );
    mesh.parent = parent;
    mesh.position.set(...position);
    mesh.material = material;
    return this.tag(mesh, actor, extras);
  }

  create(actor) {
    const style = this.styleFor(actor);
    const root = new BABYLON.TransformNode("actor:" + actor.id, this.scene);
    const visual = new BABYLON.TransformNode(
      "actor-visual:" + actor.id,
      this.scene,
    );
    visual.parent = root;

    const mats = {
      primary: this.material("primary", style.primary),
      secondary: this.material("secondary", style.secondary),
      accent: this.material("accent", style.accent),
      dark: this.material("dark", style.dark),
      trim: this.material("trim", style.trim),
      skin: this.material("skin", "#b98262"),
      metal: this.material("metal", "#8f887a", { specular: 0.055 }),
      leather: this.material("leather", "#4a362a"),
      black: this.material("black", "#171715"),
    };

    const parts = {
      visual,
      feet: [],
      arms: [],
      weaponRigs: [],
      animated: [],
      classDetail: [],
    };

    this.createGrounding(actor, root);
    this.createFeet(actor, style, visual, mats, parts);
    this.createBody(actor, style, visual, mats, parts);
    this.createArms(actor, style, visual, mats, parts);
    this.createHead(actor, style, visual, mats, parts);
    this.createClassDetails(actor, style, visual, mats, parts);
    this.createWeapon(actor, style, visual, mats, parts);

    const castMat = this.material("cast:" + actor.classId, style.accent, {
      emissive: 0.10,
      specular: 0,
    });
    const castOrb = this.sphere(
      "cast:" + actor.id,
      { diameter: 0.18, segments: 7 },
      visual,
      [0.52, 1.20, 0.40],
      castMat,
      actor,
      { shadow: false },
    );
    castOrb.isVisible = false;
    castOrb.isPickable = false;

    const barRoot = new BABYLON.TransformNode(
      "status:" + actor.id,
      this.scene,
    );
    barRoot.parent = root;
    barRoot.position.y = 2.28;

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
    hpBack.material = this.material("hpBack", "#171412");
    hpBack.isPickable = false;

    const hp = BABYLON.MeshBuilder.CreatePlane(
      "hp:" + actor.id,
      {
        width: 1.24,
        height: 0.072,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      this.scene,
    );
    hp.parent = barRoot;
    hp.position.z = -0.012;
    hp.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    hp.material = this.material(
      "hp:" + actor.team,
      actor.team === "friendly" ? "#5cbc68" : "#dd5d50",
      { emissive: 0.02, specular: 0 },
    );
    hp.isPickable = false;

    const entry = {
      root,
      visual,
      body: parts.body,
      head: parts.head,
      feet: parts.feet,
      arms: parts.arms,
      weaponRigs: parts.weaponRigs,
      animated: parts.animated,
      classDetail: parts.classDetail,
      castOrb,
      hp,
      hpBack,
      barRoot,
      classId: actor.classId,
      role: actor.role,
      style,
    };

    this.entries.set(actor.id, entry);
    return entry;
  }

  createGrounding(actor, root) {
    const shadowMat = this.material("contact-shadow", "#16100d", {
      alpha: 0.22,
      disableLighting: true,
      specular: 0,
    });

    const shadow = BABYLON.MeshBuilder.CreateCylinder(
      "contact-shadow:" + actor.id,
      {
        height: 0.012,
        diameter: 1.00,
        tessellation: 18,
      },
      this.scene,
    );
    shadow.parent = root;
    shadow.position.y = 0.012;
    shadow.scaling.set(1.18, 1, 0.78);
    shadow.material = shadowMat;
    shadow.isPickable = false;
  }

  createFeet(actor, style, parent, mats, parts) {
    const width = style.archetype === "heavy" ? 0.24 : 0.20;
    const depth = style.archetype === "robe" ? 0.25 : 0.31;

    for (const side of [-1, 1]) {
      const foot = this.box(
        "foot:" + actor.id + ":" + side,
        { width, height: 0.18, depth },
        parent,
        [side * 0.18, 0.19, 0.08],
        style.archetype === "heavy" ? mats.dark : mats.leather,
        actor,
        { outline: true },
      );
      foot.rotation.y = side * 0.08;
      parts.feet.push(foot);
    }
  }

  createBody(actor, style, parent, mats, parts) {
    if (style.archetype === "robe") {
      const skirt = this.cylinder(
        "robe:" + actor.id,
        {
          height: 0.76,
          diameterTop: 0.50,
          diameterBottom: 0.84,
          tessellation: 8,
        },
        parent,
        [0, 0.62, 0],
        mats.primary,
        actor,
        { outline: true },
      );

      const torso = this.cylinder(
        "torso:" + actor.id,
        {
          height: 0.48,
          diameterTop: 0.55,
          diameterBottom: 0.62,
          tessellation: 8,
        },
        parent,
        [0, 1.08, 0],
        mats.secondary,
        actor,
        { outline: true },
      );

      const mantle = this.cylinder(
        "mantle:" + actor.id,
        {
          height: 0.15,
          diameterTop: 0.68,
          diameterBottom: 0.62,
          tessellation: 8,
        },
        parent,
        [0, 1.30, 0],
        mats.dark,
        actor,
        { outline: true },
      );

      const belt = this.cylinder(
        "belt:" + actor.id,
        {
          height: 0.10,
          diameterTop: 0.64,
          diameterBottom: 0.64,
          tessellation: 8,
        },
        parent,
        [0, 0.88, 0],
        mats.trim,
        actor,
      );

      parts.body = torso;
      parts.animated.push(skirt, mantle, belt);
      return;
    }

    if (style.archetype === "heavy") {
      const hips = this.cylinder(
        "hips:" + actor.id,
        {
          height: 0.36,
          diameterTop: 0.60,
          diameterBottom: 0.68,
          tessellation: 7,
        },
        parent,
        [0, 0.58, 0],
        mats.dark,
        actor,
        { outline: true },
      );

      const torso = this.poly(
        "torso:" + actor.id,
        { type: 2, size: 0.50 },
        parent,
        [0, 1.04, 0],
        mats.primary,
        actor,
        { outline: true },
      );
      torso.scaling.set(0.92, 0.88, 0.72);

      const chest = this.box(
        "chest-plate:" + actor.id,
        { width: 0.60, height: 0.42, depth: 0.18 },
        parent,
        [0, 1.10, 0.31],
        mats.secondary,
        actor,
        { outline: true },
      );
      chest.rotation.x = -0.08;

      for (const side of [-1, 1]) {
        const shoulder = this.poly(
          "pauldron:" + actor.id + ":" + side,
          { type: 2, size: 0.25 },
          parent,
          [side * 0.43, 1.28, 0],
          side < 0 ? mats.dark : mats.accent,
          actor,
          { outline: true },
        );
        shoulder.scaling.set(1.10, 0.72, 0.94);
        parts.animated.push(shoulder);
      }

      parts.body = torso;
      parts.animated.push(hips, chest);
      return;
    }

    if (style.archetype === "mail") {
      const hips = this.cylinder(
        "mail-skirt:" + actor.id,
        {
          height: 0.46,
          diameterTop: 0.58,
          diameterBottom: 0.70,
          tessellation: 8,
        },
        parent,
        [0, 0.58, 0],
        mats.dark,
        actor,
        { outline: true },
      );

      const torso = this.cylinder(
        "mail-torso:" + actor.id,
        {
          height: 0.58,
          diameterTop: 0.61,
          diameterBottom: 0.66,
          tessellation: 8,
        },
        parent,
        [0, 1.03, 0],
        mats.primary,
        actor,
        { outline: true },
      );

      for (const side of [-1, 1]) {
        const shoulder = this.poly(
          "totem-shoulder:" + actor.id + ":" + side,
          { type: 1, size: 0.24 },
          parent,
          [side * 0.40, 1.29, 0],
          side < 0 ? mats.accent : mats.secondary,
          actor,
          { outline: true },
        );
        shoulder.scaling.set(1.05, 0.76, 0.95);
        parts.animated.push(shoulder);
      }

      parts.body = torso;
      parts.animated.push(hips);
      return;
    }

    const hips = this.cylinder(
      "light-hips:" + actor.id,
      {
        height: 0.38,
        diameterTop: 0.53,
        diameterBottom: 0.60,
        tessellation: 8,
      },
      parent,
      [0, 0.58, 0],
      mats.dark,
      actor,
      { outline: true },
    );

    const torso = this.cylinder(
      "light-torso:" + actor.id,
      {
        height: 0.54,
        diameterTop: 0.54,
        diameterBottom: 0.60,
        tessellation: 8,
      },
      parent,
      [0, 1.00, 0],
      mats.primary,
      actor,
      { outline: true },
    );

    const scarf = this.box(
      "scarf:" + actor.id,
      { width: 0.58, height: 0.12, depth: 0.15 },
      parent,
      [0, 1.22, 0.28],
      mats.accent,
      actor,
      { outline: true },
    );

    parts.body = torso;
    parts.animated.push(hips, scarf);
  }

  createArms(actor, style, parent, mats, parts) {
    const armor = style.archetype === "heavy" || style.archetype === "mail";
    const armMat = armor ? mats.secondary : mats.primary;
    const armLength = style.archetype === "heavy" ? 0.50 : 0.46;

    for (const side of [-1, 1]) {
      const arm = this.cylinder(
        "arm:" + actor.id + ":" + side,
        {
          height: armLength,
          diameter: armor ? 0.18 : 0.15,
          tessellation: 7,
        },
        parent,
        [side * 0.39, 0.98, 0.06],
        armMat,
        actor,
        { outline: true },
      );
      arm.rotation.z = side * 0.25;
      arm.rotation.x = 0.08;
      parts.arms.push(arm);

      const hand = this.sphere(
        "hand:" + actor.id + ":" + side,
        { diameter: 0.18, segments: 6 },
        parent,
        [side * 0.45, 0.75, 0.10],
        mats.skin,
        actor,
      );
      hand.scaling.set(0.85, 0.85, 0.85);
      parts.animated.push(hand);
    }
  }

  createHead(actor, style, parent, mats, parts) {
    const headY = 1.62;
    const head = this.sphere(
      "head:" + actor.id,
      { diameter: 0.66, segments: 8 },
      parent,
      [0, headY, 0.03],
      mats.skin,
      actor,
      { outline: true },
    );
    head.scaling.set(1.02, 0.94, 0.98);
    parts.head = head;

    if (
      style.headgear === "war-helm"
      || style.headgear === "crowned-helm"
      || style.headgear === "horned-helm"
    ) {
      const helm = this.cylinder(
        "helm:" + actor.id,
        {
          height: 0.44,
          diameterTop: 0.46,
          diameterBottom: 0.67,
          tessellation: 7,
        },
        parent,
        [0, 1.76, 0.02],
        mats.dark,
        actor,
        { outline: true },
      );

      const visor = this.box(
        "visor:" + actor.id,
        { width: 0.48, height: 0.13, depth: 0.10 },
        parent,
        [0, 1.65, 0.31],
        mats.accent,
        actor,
        { outline: true },
      );

      if (style.headgear === "crowned-helm") {
        for (const side of [-1, 0, 1]) {
          const crown = this.poly(
            "crown:" + actor.id + ":" + side,
            { type: 1, size: 0.12 },
            parent,
            [side * 0.17, 2.00 + Math.abs(side) * 0.02, 0.03],
            mats.accent,
            actor,
            { outline: true },
          );
          crown.scaling.set(0.52, 1.22, 0.58);
        }
      }

      if (style.headgear === "horned-helm") {
        for (const side of [-1, 1]) {
          const horn = this.cylinder(
            "horn:" + actor.id + ":" + side,
            {
              height: 0.42,
              diameterTop: 0.03,
              diameterBottom: 0.11,
              tessellation: 6,
            },
            parent,
            [side * 0.28, 1.99, 0.03],
            mats.accent,
            actor,
            { outline: true },
          );
          horn.rotation.z = side * 0.58;
        }
      }

      parts.classDetail.push(helm, visor);
      return;
    }

    if (style.headgear === "pointed-hood") {
      const hood = this.cylinder(
        "mage-hood:" + actor.id,
        {
          height: 0.50,
          diameterTop: 0.08,
          diameterBottom: 0.72,
          tessellation: 8,
        },
        parent,
        [0, 1.83, 0.01],
        mats.dark,
        actor,
        { outline: true },
      );
      hood.rotation.z = -0.08;

      const tip = this.poly(
        "mage-hood-tip:" + actor.id,
        { type: 1, size: 0.17 },
        parent,
        [0.11, 2.08, 0.02],
        mats.primary,
        actor,
        { outline: true },
      );
      tip.scaling.set(0.55, 1.10, 0.60);
      tip.rotation.z = -0.27;

      this.createFaceWindow(actor, parent, mats);
      parts.classDetail.push(hood, tip);
      return;
    }

    const hood = this.sphere(
      "hood:" + actor.id,
      { diameter: 0.76, segments: 8 },
      parent,
      [0, 1.69, 0.01],
      mats.dark,
      actor,
      { outline: true },
    );
    hood.scaling.set(1.03, 0.97, 1.04);
    this.createFaceWindow(actor, parent, mats);

    if (style.headgear === "antler-cowl") {
      for (const side of [-1, 1]) {
        const antler = this.cylinder(
          "antler:" + actor.id + ":" + side,
          {
            height: 0.36,
            diameterTop: 0.03,
            diameterBottom: 0.075,
            tessellation: 6,
          },
          parent,
          [side * 0.25, 2.00, 0.02],
          mats.accent,
          actor,
          { outline: true },
        );
        antler.rotation.z = side * 0.52;
      }
    }

    if (style.headgear === "fel-hood") {
      for (const side of [-1, 1]) {
        const horn = this.poly(
          "fel-horn:" + actor.id + ":" + side,
          { type: 1, size: 0.12 },
          parent,
          [side * 0.24, 1.98, 0.00],
          mats.accent,
          actor,
          { outline: true },
        );
        horn.scaling.set(0.45, 1.12, 0.48);
        horn.rotation.z = side * 0.42;
      }
    }

    if (style.headgear === "totem-crest") {
      const crest = this.poly(
        "totem-crest:" + actor.id,
        { type: 1, size: 0.16 },
        parent,
        [0, 2.03, -0.02],
        mats.accent,
        actor,
        { outline: true },
      );
      crest.scaling.set(0.52, 1.35, 0.72);
    }

    parts.classDetail.push(hood);
  }

  createFaceWindow(actor, parent, mats) {
    const face = this.sphere(
      "face-window:" + actor.id,
      { diameter: 0.45, segments: 7 },
      parent,
      [0, 1.62, 0.29],
      mats.skin,
      actor,
      { outline: true },
    );
    face.scaling.set(0.92, 0.72, 0.42);

    const brow = this.box(
      "hood-brow:" + actor.id,
      { width: 0.42, height: 0.07, depth: 0.06 },
      parent,
      [0, 1.78, 0.38],
      mats.dark,
      actor,
    );
    brow.rotation.x = -0.12;
  }

  createClassDetails(actor, style, parent, mats, parts) {
    if (actor.classId === "priest") {
      const tabard = this.box(
        "priest-tabard:" + actor.id,
        { width: 0.22, height: 0.66, depth: 0.06 },
        parent,
        [0, 0.92, 0.38],
        mats.accent,
        actor,
        { outline: true },
      );
      parts.classDetail.push(tabard);
    }

    if (actor.classId === "paladin") {
      const tabard = this.box(
        "paladin-tabard:" + actor.id,
        { width: 0.26, height: 0.54, depth: 0.07 },
        parent,
        [0, 0.98, 0.39],
        mats.accent,
        actor,
        { outline: true },
      );
      parts.classDetail.push(tabard);
    }

    if (actor.classId === "warrior") {
      const sash = this.box(
        "warrior-sash:" + actor.id,
        { width: 0.16, height: 0.56, depth: 0.06 },
        parent,
        [-0.13, 0.92, 0.39],
        mats.accent,
        actor,
        { outline: true },
      );
      sash.rotation.z = -0.18;
      parts.classDetail.push(sash);
    }

    if (actor.classId === "rogue") {
      const tail = this.box(
        "rogue-scarf-tail:" + actor.id,
        { width: 0.14, height: 0.52, depth: 0.09 },
        parent,
        [-0.24, 1.10, -0.31],
        mats.accent,
        actor,
        { outline: true },
      );
      tail.rotation.z = -0.36;
      parts.classDetail.push(tail);
    }

    if (actor.classId === "shaman") {
      for (const side of [-1, 1]) {
        const bead = this.poly(
          "shaman-bead:" + actor.id + ":" + side,
          { type: 2, size: 0.10 },
          parent,
          [side * 0.31, 1.37, 0.28],
          mats.accent,
          actor,
          { outline: true },
        );
        parts.classDetail.push(bead);
      }
    }

    if (actor.classId === "hunter") {
      const quiver = this.cylinder(
        "hunter-quiver:" + actor.id,
        {
          height: 0.64,
          diameterTop: 0.16,
          diameterBottom: 0.18,
          tessellation: 7,
        },
        parent,
        [-0.35, 1.02, -0.25],
        mats.leather,
        actor,
        { outline: true },
      );
      quiver.rotation.z = -0.32;
      parts.classDetail.push(quiver);
    }
  }

  createWeapon(actor, style, parent, mats, parts) {
    const rightRig = new BABYLON.TransformNode(
      "weapon-rig-right:" + actor.id,
      this.scene,
    );
    rightRig.parent = parent;
    parts.weaponRigs.push(rightRig);

    const leftRig = new BABYLON.TransformNode(
      "weapon-rig-left:" + actor.id,
      this.scene,
    );
    leftRig.parent = parent;
    parts.weaponRigs.push(leftRig);

    const blade = (name, rig, side, length = 0.68) => {
      const weapon = this.box(
        name,
        { width: 0.075, height: length, depth: 0.10 },
        rig,
        [side * 0.50, 0.90, 0.12],
        mats.metal,
        actor,
        { outline: true },
      );
      weapon.rotation.z = side * -0.55;

      const grip = this.box(
        name + ":grip",
        { width: 0.11, height: 0.24, depth: 0.12 },
        rig,
        [side * 0.37, 0.67, 0.09],
        mats.leather,
        actor,
      );
      grip.rotation.z = side * -0.55;
      return weapon;
    };

    if (style.weapon === "dual") {
      blade("dagger-left:" + actor.id, leftRig, -1, 0.54);
      blade("dagger-right:" + actor.id, rightRig, 1, 0.54);
      return;
    }

    if (style.weapon === "greatsword") {
      const sword = blade(
        "greatsword:" + actor.id,
        rightRig,
        1,
        1.08,
      );
      sword.position.set(0.53, 1.02, 0.02);
      sword.scaling.x = 1.35;

      const rune = this.box(
        "greatsword-rune:" + actor.id,
        { width: 0.18, height: 0.18, depth: 0.12 },
        rightRig,
        [0.61, 1.35, 0.03],
        mats.accent,
        actor,
        { outline: true },
      );
      rune.rotation.z = -0.50;
      return;
    }

    if (
      style.weapon === "sword-shield"
      || style.weapon === "hammer-shield"
      || style.weapon === "mace-shield"
    ) {
      const handle = this.cylinder(
        "handle:" + actor.id,
        {
          height: 0.70,
          diameter: 0.07,
          tessellation: 6,
        },
        rightRig,
        [0.48, 0.88, 0.10],
        mats.leather,
        actor,
      );
      handle.rotation.z = -0.48;

      if (style.weapon === "sword-shield") {
        const sword = this.box(
          "sword:" + actor.id,
          { width: 0.09, height: 0.58, depth: 0.10 },
          rightRig,
          [0.65, 1.15, 0.10],
          mats.metal,
          actor,
          { outline: true },
        );
        sword.rotation.z = -0.48;
      } else if (style.weapon === "hammer-shield") {
        const hammer = this.box(
          "hammer:" + actor.id,
          { width: 0.36, height: 0.20, depth: 0.23 },
          rightRig,
          [0.66, 1.16, 0.10],
          mats.accent,
          actor,
          { outline: true },
        );
        hammer.rotation.z = -0.18;
      } else {
        const mace = this.poly(
          "mace:" + actor.id,
          { type: 1, size: 0.19 },
          rightRig,
          [0.65, 1.16, 0.10],
          mats.accent,
          actor,
          { outline: true },
        );
      }

      const shield = this.cylinder(
        "shield:" + actor.id,
        {
          height: 0.13,
          diameterTop: 0.52,
          diameterBottom: 0.52,
          tessellation: 8,
        },
        leftRig,
        [-0.50, 0.98, 0.14],
        mats.secondary,
        actor,
        { outline: true },
      );
      shield.rotation.z = Math.PI / 2;
      shield.rotation.y = Math.PI / 2;
      shield.scaling.set(1.04, 1, 1.14);

      const boss = this.poly(
        "shield-boss:" + actor.id,
        { type: 2, size: 0.13 },
        leftRig,
        [-0.54, 0.99, 0.39],
        mats.accent,
        actor,
        { outline: true },
      );
      boss.scaling.set(0.90, 0.90, 0.55);
      return;
    }

    if (style.weapon === "bow") {
      const upper = this.cylinder(
        "bow-upper:" + actor.id,
        {
          height: 0.60,
          diameter: 0.055,
          tessellation: 6,
        },
        rightRig,
        [0.48, 1.14, 0.12],
        mats.accent,
        actor,
        { outline: true },
      );
      upper.rotation.z = -0.38;

      const lower = this.cylinder(
        "bow-lower:" + actor.id,
        {
          height: 0.60,
          diameter: 0.055,
          tessellation: 6,
        },
        rightRig,
        [0.47, 0.68, 0.12],
        mats.accent,
        actor,
        { outline: true },
      );
      lower.rotation.z = 0.38;
      return;
    }

    const staff = this.cylinder(
      "staff:" + actor.id,
      {
        height: 1.35,
        diameter: 0.07,
        tessellation: 7,
      },
      rightRig,
      [0.51, 1.02, 0.08],
      mats.dark,
      actor,
      { outline: true },
    );
    staff.rotation.z = -0.14;

    const focus = this.poly(
      "staff-focus:" + actor.id,
      { type: style.weapon === "sun-staff" ? 1 : 2, size: 0.18 },
      rightRig,
      [0.61, 1.69, 0.08],
      mats.accent,
      actor,
      { outline: true },
    );
    focus.scaling.set(0.88, 1.08, 0.88);

    if (style.weapon === "nature-staff") {
      for (const side of [-1, 1]) {
        const leaf = this.poly(
          "leaf:" + actor.id + ":" + side,
          { type: 1, size: 0.09 },
          rightRig,
          [0.61 + side * 0.13, 1.68, 0.08],
          mats.accent,
          actor,
          { outline: true },
        );
        leaf.scaling.set(0.50, 1.05, 0.45);
        leaf.rotation.z = side * 0.52;
      }
    }

    if (style.weapon === "fel-staff") {
      focus.scaling.set(0.72, 1.34, 0.72);
      focus.rotation.z = 0.32;
    }
  }

  sync(game, time) {
    const ids = new Set(game.actors.map(actor => actor.id));

    for (const [id, entry] of this.entries) {
      if (ids.has(id)) continue;
      entry.root.dispose(false, true);
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
        entry.root.dispose(false, true);
        this.entries.delete(actor.id);
        entry = null;
      }

      entry = entry || this.create(actor);
      entry.root.setEnabled(actor.alive);
      if (!actor.alive) continue;

      const styleScale = entry.style.scale || 1;
      entry.root.scaling.setAll(1.11 * styleScale);
      entry.root.position.set(
        actor.x * this.scale,
        0.18,
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

      const phase = time * 0.0105;
      const idle = Math.sin(time * 0.0023) * 0.010;
      const bob = moving ? Math.sin(phase * 2) * 0.035 : idle;

      entry.visual.position.y = bob;
      entry.visual.rotation.z = moving
        ? Math.sin(phase) * 0.022
        : 0;

      if (entry.feet[0] && entry.feet[1]) {
        const step = moving ? Math.sin(phase * 2) * 0.09 : 0;
        entry.feet[0].position.z = 0.08 + step;
        entry.feet[1].position.z = 0.08 - step;
      }

      entry.arms.forEach((arm, index) => {
        const side = index === 0 ? -1 : 1;
        arm.rotation.z =
          side * 0.25
          + (moving ? side * Math.sin(phase * 2) * 0.06 : 0);
      });

      entry.weaponRigs.forEach((rig, index) => {
        const side = index === 0 ? 1 : -1;
        rig.rotation.z = moving
          ? side * Math.sin(phase * 2) * 0.018
          : 0;
      });

      entry.castOrb.isVisible = Boolean(actor.cast);
      if (actor.cast) {
        const pulse = 0.90 + Math.sin(time * 0.014) * 0.12;
        entry.castOrb.scaling.setAll(pulse);
        entry.castOrb.rotation.y += 0.08;

        if (entry.arms[0]) entry.arms[0].rotation.x = -0.40;
        if (entry.arms[1]) entry.arms[1].rotation.x = -0.48;
      } else {
        entry.arms.forEach(arm => {
          arm.rotation.x = 0.08;
        });
      }

      const health = Math.max(0, Math.min(1, actor.healthPct));
      entry.hp.scaling.x = health;
      entry.hp.position.x = -0.62 * (1 - health);

      const critical = health < 0.20;
      entry.hp.material = this.material(
        critical ? "critical-hp" : "hp:" + actor.team,
        critical
          ? "#e24d43"
          : actor.team === "friendly"
            ? "#5cbc68"
            : "#dd5d50",
        {
          emissive: critical ? 0.035 : 0.015,
          specular: 0,
        },
      );
    }
  }

  meshForActor(id) {
    return this.entries.get(id)?.body || null;
  }

  rootForActor(id) {
    return this.entries.get(id)?.root || null;
  }

  worldPosition(id, y = 1.20) {
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
