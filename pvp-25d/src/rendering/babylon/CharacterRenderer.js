const CLASS_STYLES = Object.freeze({
  priest: {
    primary: "#cbbf9d",
    secondary: "#efe2bf",
    accent: "#d7b85c",
    dark: "#5c5042",
    archetype: "robe",
    headgear: "hood",
    weapon: "staff",
  },
  druid: {
    primary: "#8d6038",
    secondary: "#b8844d",
    accent: "#71955c",
    dark: "#46372d",
    archetype: "robe",
    headgear: "cowl",
    weapon: "staff",
  },
  paladin: {
    primary: "#b86f8f",
    secondary: "#dba9bd",
    accent: "#e6c36a",
    dark: "#5c3e4c",
    archetype: "plate",
    headgear: "helm",
    weapon: "hammer-shield",
  },
  warrior: {
    primary: "#9c5d43",
    secondary: "#bd7f57",
    accent: "#c9a16d",
    dark: "#47332c",
    archetype: "plate",
    headgear: "helm",
    weapon: "sword-shield",
  },
  rogue: {
    primary: "#b09537",
    secondary: "#d2b750",
    accent: "#e1cf78",
    dark: "#342f28",
    archetype: "leather",
    headgear: "hood",
    weapon: "dual",
  },
  "death-knight": {
    primary: "#66373b",
    secondary: "#8e4a4f",
    accent: "#b45b60",
    dark: "#252831",
    archetype: "plate",
    headgear: "horned",
    weapon: "greatsword",
  },
  mage: {
    primary: "#416d9e",
    secondary: "#629bc4",
    accent: "#79b5d7",
    dark: "#26374d",
    archetype: "robe",
    headgear: "mage-hood",
    weapon: "staff",
  },
  warlock: {
    primary: "#624a79",
    secondary: "#80649a",
    accent: "#a078bd",
    dark: "#30283c",
    archetype: "robe",
    headgear: "hood",
    weapon: "staff",
  },
  shaman: {
    primary: "#345d91",
    secondary: "#4f7aad",
    accent: "#58a5a8",
    dark: "#293a4a",
    archetype: "mail",
    headgear: "crest",
    weapon: "mace-shield",
  },
  hunter: {
    primary: "#627548",
    secondary: "#81945c",
    accent: "#b19d58",
    dark: "#30382b",
    archetype: "leather",
    headgear: "hood",
    weapon: "bow",
  },
});

function c3(hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function makeMaterial(scene, name, hex, emissive = 0) {
  const material = new BABYLON.StandardMaterial(name, scene);
  material.diffuseColor = c3(hex);
  material.specularColor = new BABYLON.Color3(0.035, 0.035, 0.03);
  material.ambientColor = c3(hex).scale(0.16);
  if (emissive > 0) {
    material.emissiveColor = c3(hex).scale(emissive);
  }
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

  getMaterial(key, hex, emissive = 0) {
    const id = key + ":" + hex + ":" + emissive;
    if (!this.materials.has(id)) {
      this.materials.set(
        id,
        makeMaterial(this.scene, id, hex, emissive),
      );
    }
    return this.materials.get(id);
  }

  styleFor(actor) {
    return CLASS_STYLES[actor.classId] || {
      primary: "#667a78",
      secondary: "#899b95",
      accent: "#b2b69d",
      dark: "#303b3a",
      archetype: actor.role === "melee" ? "plate" : "robe",
      headgear: "hood",
      weapon: actor.role === "melee" ? "sword-shield" : "staff",
    };
  }

  tag(mesh, actor, pickable = true) {
    mesh.metadata = {
      ...(mesh.metadata || {}),
      actorId: actor.id,
    };
    mesh.isPickable = pickable;

    if (pickable) {
      this.shadowGenerator?.addShadowCaster(mesh);
    }

    return mesh;
  }

  createBox(name, options, parent, position, material, actor) {
    const mesh = BABYLON.MeshBuilder.CreateBox(name, options, this.scene);
    mesh.parent = parent;
    mesh.position.set(...position);
    mesh.material = material;
    return this.tag(mesh, actor);
  }

  createCylinder(name, options, parent, position, material, actor) {
    const mesh = BABYLON.MeshBuilder.CreateCylinder(
      name,
      options,
      this.scene,
    );
    mesh.parent = parent;
    mesh.position.set(...position);
    mesh.material = material;
    return this.tag(mesh, actor);
  }

  createSphere(name, options, parent, position, material, actor) {
    const mesh = BABYLON.MeshBuilder.CreateSphere(name, options, this.scene);
    mesh.parent = parent;
    mesh.position.set(...position);
    mesh.material = material;
    return this.tag(mesh, actor);
  }

  createPoly(name, options, parent, position, material, actor) {
    const mesh = BABYLON.MeshBuilder.CreatePolyhedron(
      name,
      options,
      this.scene,
    );
    mesh.parent = parent;
    mesh.position.set(...position);
    mesh.material = material;
    return this.tag(mesh, actor);
  }

  create(actor) {
    const style = this.styleFor(actor);
    const root = new BABYLON.TransformNode("actor:" + actor.id, this.scene);
    const visual = new BABYLON.TransformNode(
      "actor-visual:" + actor.id,
      this.scene,
    );
    visual.parent = root;

    const primary = this.getMaterial("primary", style.primary);
    const secondary = this.getMaterial("secondary", style.secondary);
    const accent = this.getMaterial("accent", style.accent);
    const dark = this.getMaterial("dark", style.dark);
    const skin = this.getMaterial("skin", "#b98063");
    const metal = this.getMaterial("metal", "#776f63");

    const parts = {
      visual,
      feet: [],
      weaponParts: [],
      animated: [],
    };

    this.createFeet(actor, visual, dark, parts);
    this.createBody(
      actor,
      style,
      visual,
      { primary, secondary, accent, dark, skin, metal },
      parts,
    );
    this.createHead(
      actor,
      style,
      visual,
      { primary, secondary, accent, dark, skin, metal },
      parts,
    );
    this.createWeapon(
      actor,
      style,
      visual,
      { primary, secondary, accent, dark, skin, metal },
      parts,
    );

    const castMat = this.getMaterial(
      "cast",
      style.accent,
      0.14,
    );
    const castOrb = this.createSphere(
      "cast:" + actor.id,
      { diameter: 0.20, segments: 7 },
      visual,
      [0, 2.05, 0],
      castMat,
      actor,
    );
    castOrb.isVisible = false;
    castOrb.isPickable = false;
    parts.castOrb = castOrb;

    const barRoot = new BABYLON.TransformNode(
      "status:" + actor.id,
      this.scene,
    );
    barRoot.parent = root;
    barRoot.position.y = 2.35;

    const hpBack = BABYLON.MeshBuilder.CreatePlane(
      "hpBack:" + actor.id,
      {
        width: 1.42,
        height: 0.105,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      this.scene,
    );
    hpBack.parent = barRoot;
    hpBack.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    hpBack.material = this.getMaterial("hpBack", "#171613");
    hpBack.isPickable = false;

    const hp = BABYLON.MeshBuilder.CreatePlane(
      "hp:" + actor.id,
      {
        width: 1.36,
        height: 0.065,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE,
      },
      this.scene,
    );
    hp.parent = barRoot;
    hp.position.z = -0.012;
    hp.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
    hp.material = this.getMaterial(
      "hp",
      actor.team === "friendly" ? "#4eae78" : "#c45750",
    );
    hp.isPickable = false;

    this.entries.set(actor.id, {
      root,
      visual,
      body: parts.body,
      head: parts.head,
      feet: parts.feet,
      weaponParts: parts.weaponParts,
      animated: parts.animated,
      castOrb,
      hp,
      hpBack,
      barRoot,
      classId: actor.classId,
      role: actor.role,
      baseBodyY: parts.baseBodyY,
      baseHeadY: parts.baseHeadY,
    });

    return this.entries.get(actor.id);
  }

  createFeet(actor, parent, material, parts) {
    for (const side of [-1, 1]) {
      const foot = this.createBox(
        "foot:" + actor.id + ":" + side,
        { width: 0.25, height: 0.22, depth: 0.36 },
        parent,
        [side * 0.19, 0.20, 0.055],
        material,
        actor,
      );
      foot.rotation.y = side * 0.08;
      parts.feet.push(foot);
    }
  }

  createBody(actor, style, parent, mats, parts) {
    if (style.archetype === "robe") {
      const body = this.createCylinder(
        "body:" + actor.id,
        {
          height: 0.88,
          diameterTop: 0.58,
          diameterBottom: 0.92,
          tessellation: 7,
        },
        parent,
        [0, 0.82, 0],
        mats.primary,
        actor,
      );
      parts.body = body;
      parts.baseBodyY = 0.82;

      const mantle = this.createCylinder(
        "mantle:" + actor.id,
        {
          height: 0.22,
          diameterTop: 0.72,
          diameterBottom: 0.62,
          tessellation: 7,
        },
        parent,
        [0, 1.25, 0],
        mats.secondary,
        actor,
      );
      parts.animated.push(mantle);

      const sash = this.createBox(
        "sash:" + actor.id,
        { width: 0.64, height: 0.12, depth: 0.62 },
        parent,
        [0, 0.83, -0.02],
        mats.accent,
        actor,
      );
      parts.animated.push(sash);
      return;
    }

    if (style.archetype === "plate") {
      const body = this.createBox(
        "body:" + actor.id,
        { width: 0.72, height: 0.72, depth: 0.58 },
        parent,
        [0, 0.94, 0],
        mats.primary,
        actor,
      );
      body.rotation.y = Math.PI / 4;
      parts.body = body;
      parts.baseBodyY = 0.94;

      const chest = this.createBox(
        "chest:" + actor.id,
        { width: 0.54, height: 0.48, depth: 0.50 },
        parent,
        [0, 1.03, -0.01],
        mats.secondary,
        actor,
      );
      chest.rotation.y = Math.PI / 4;
      parts.animated.push(chest);

      for (const side of [-1, 1]) {
        const shoulder = this.createSphere(
          "shoulder:" + actor.id + ":" + side,
          { diameter: 0.34, segments: 5 },
          parent,
          [side * 0.43, 1.22, 0],
          side === -1 ? mats.dark : mats.accent,
          actor,
        );
        shoulder.scaling.set(1.12, 0.75, 1.05);
        parts.animated.push(shoulder);
      }
      return;
    }

    const body = this.createCylinder(
      "body:" + actor.id,
      {
        height: 0.78,
        diameterTop: 0.60,
        diameterBottom: 0.72,
        tessellation: 7,
      },
      parent,
      [0, 0.88, 0],
      mats.primary,
      actor,
    );
    parts.body = body;
    parts.baseBodyY = 0.88;

    for (const side of [-1, 1]) {
      const shoulder = this.createBox(
        "leather-shoulder:" + actor.id + ":" + side,
        { width: 0.25, height: 0.17, depth: 0.35 },
        parent,
        [side * 0.39, 1.18, 0],
        mats.secondary,
        actor,
      );
      shoulder.rotation.z = side * 0.16;
      parts.animated.push(shoulder);
    }
  }

  createHead(actor, style, parent, mats, parts) {
    const head = this.createSphere(
      "head:" + actor.id,
      { diameter: 0.62, segments: 7 },
      parent,
      [0, 1.61, -0.015],
      mats.skin,
      actor,
    );
    head.scaling.set(1, 0.93, 0.96);
    parts.head = head;
    parts.baseHeadY = 1.61;

    if (style.headgear === "helm" || style.headgear === "horned") {
      const helm = this.createCylinder(
        "helm:" + actor.id,
        {
          height: 0.42,
          diameterTop: 0.48,
          diameterBottom: 0.62,
          tessellation: 6,
        },
        parent,
        [0, 1.73, -0.02],
        mats.dark,
        actor,
      );
      helm.rotation.y = Math.PI / 6;

      const brow = this.createBox(
        "helm-brow:" + actor.id,
        { width: 0.55, height: 0.14, depth: 0.16 },
        parent,
        [0, 1.64, -0.28],
        mats.accent,
        actor,
      );
      brow.rotation.y = 0;

      if (style.headgear === "horned") {
        for (const side of [-1, 1]) {
          const horn = this.createCylinder(
            "horn:" + actor.id + ":" + side,
            {
              height: 0.42,
              diameterTop: 0.035,
              diameterBottom: 0.12,
              tessellation: 6,
            },
            parent,
            [side * 0.25, 2.02, -0.02],
            mats.accent,
            actor,
          );
          horn.rotation.z = side * 0.52;
        }
      }
      return;
    }

    if (style.headgear === "crest") {
      const cowl = this.createCylinder(
        "crest-cowl:" + actor.id,
        {
          height: 0.34,
          diameterTop: 0.45,
          diameterBottom: 0.65,
          tessellation: 7,
        },
        parent,
        [0, 1.74, 0],
        mats.dark,
        actor,
      );

      const crest = this.createPoly(
        "crest:" + actor.id,
        { type: 1, size: 0.23 },
        parent,
        [0, 2.03, 0.02],
        mats.accent,
        actor,
      );
      crest.scaling.set(0.52, 1.5, 0.72);
      return;
    }

    const hood = this.createCylinder(
      "hood:" + actor.id,
      {
        height: 0.42,
        diameterTop:
          style.headgear === "mage-hood" ? 0.28 : 0.42,
        diameterBottom: 0.70,
        tessellation: 7,
      },
      parent,
      [0, 1.76, 0],
      mats.dark,
      actor,
    );

    if (style.headgear === "mage-hood") {
      hood.position.y = 1.82;
      hood.scaling.y = 1.22;
      const tip = this.createPoly(
        "hood-tip:" + actor.id,
        { type: 1, size: 0.20 },
        parent,
        [0.10, 2.09, 0.04],
        mats.primary,
        actor,
      );
      tip.scaling.set(0.56, 1.35, 0.64);
      tip.rotation.z = -0.22;
    }

    if (style.headgear === "cowl") {
      const antlers = [-1, 1].map(side => {
        const antler = this.createCylinder(
          "antler:" + actor.id + ":" + side,
          {
            height: 0.36,
            diameterTop: 0.035,
            diameterBottom: 0.075,
            tessellation: 6,
          },
          parent,
          [side * 0.25, 2.00, 0.01],
          mats.accent,
          actor,
        );
        antler.rotation.z = side * 0.47;
        return antler;
      });
      void antlers;
    }
  }

  createWeapon(actor, style, parent, mats, parts) {
    const makeBlade = (name, side, length = 0.72) => {
      const blade = this.createBox(
        name,
        { width: 0.075, height: length, depth: 0.11 },
        parent,
        [side * 0.48, 0.91, -0.02],
        mats.metal,
        actor,
      );
      blade.rotation.z = side * -0.55;
      parts.weaponParts.push(blade);
      return blade;
    };

    if (style.weapon === "dual") {
      makeBlade("blade-left:" + actor.id, -1, 0.66);
      makeBlade("blade-right:" + actor.id, 1, 0.66);
      return;
    }

    if (style.weapon === "greatsword") {
      const sword = makeBlade("greatsword:" + actor.id, 1, 1.20);
      sword.position.set(0.52, 1.04, 0.03);
      sword.scaling.x = 1.35;
      return;
    }

    if (style.weapon.includes("shield")) {
      const handWeapon = this.createCylinder(
        "hand-weapon:" + actor.id,
        {
          height: style.weapon.startsWith("hammer") ? 0.74 : 0.86,
          diameter: 0.075,
          tessellation: 6,
        },
        parent,
        [0.48, 0.84, -0.02],
        mats.dark,
        actor,
      );
      handWeapon.rotation.z = -0.48;
      parts.weaponParts.push(handWeapon);

      if (style.weapon.startsWith("hammer")) {
        const hammer = this.createBox(
          "hammer-head:" + actor.id,
          { width: 0.36, height: 0.20, depth: 0.22 },
          parent,
          [0.66, 1.13, -0.02],
          mats.accent,
          actor,
        );
        hammer.rotation.z = -0.18;
        parts.weaponParts.push(hammer);
      } else if (style.weapon.startsWith("mace")) {
        const mace = this.createPoly(
          "mace-head:" + actor.id,
          { type: 1, size: 0.19 },
          parent,
          [0.64, 1.13, -0.02],
          mats.accent,
          actor,
        );
        parts.weaponParts.push(mace);
      } else {
        const blade = this.createBox(
          "sword-blade:" + actor.id,
          { width: 0.09, height: 0.60, depth: 0.10 },
          parent,
          [0.66, 1.16, -0.02],
          mats.metal,
          actor,
        );
        blade.rotation.z = -0.48;
        parts.weaponParts.push(blade);
      }

      const shield = this.createCylinder(
        "shield:" + actor.id,
        {
          height: 0.15,
          diameterTop: 0.48,
          diameterBottom: 0.48,
          tessellation: 6,
        },
        parent,
        [-0.49, 0.99, -0.03],
        mats.secondary,
        actor,
      );
      shield.rotation.z = Math.PI / 2;
      shield.rotation.y = Math.PI / 2;
      shield.scaling.set(1.0, 1.0, 1.14);
      parts.weaponParts.push(shield);
      return;
    }

    if (style.weapon === "bow") {
      const upper = this.createCylinder(
        "bow-upper:" + actor.id,
        { height: 0.62, diameter: 0.06, tessellation: 6 },
        parent,
        [0.52, 1.12, 0],
        mats.accent,
        actor,
      );
      upper.rotation.z = -0.38;
      const lower = this.createCylinder(
        "bow-lower:" + actor.id,
        { height: 0.62, diameter: 0.06, tessellation: 6 },
        parent,
        [0.50, 0.63, 0],
        mats.accent,
        actor,
      );
      lower.rotation.z = 0.38;
      parts.weaponParts.push(upper, lower);
      return;
    }

    const staff = this.createCylinder(
      "staff:" + actor.id,
      { height: 1.42, diameter: 0.075, tessellation: 6 },
      parent,
      [0.49, 0.94, 0],
      mats.dark,
      actor,
    );
    staff.rotation.z = -0.14;
    parts.weaponParts.push(staff);

    const focus = this.createPoly(
      "staff-focus:" + actor.id,
      { type: 1, size: 0.18 },
      parent,
      [0.60, 1.66, 0],
      mats.accent,
      actor,
    );
    focus.scaling.set(0.82, 1.06, 0.82);
    parts.weaponParts.push(focus);
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

      entry.root.scaling.setAll(1.17);
      entry.root.position.set(
        actor.x * this.scale,
        0.19,
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

      const phase = time * 0.011;
      const bob = moving
        ? Math.sin(phase) * 0.040
        : Math.sin(time * 0.0025) * 0.012;

      entry.body.position.y = entry.baseBodyY + bob;
      entry.head.position.y = entry.baseHeadY + bob * 0.48;
      entry.visual.rotation.z = moving
        ? Math.sin(phase) * 0.025
        : 0;

      if (entry.feet[0] && entry.feet[1]) {
        const step = moving ? Math.sin(phase) * 0.10 : 0;
        entry.feet[0].position.z = 0.055 + step;
        entry.feet[1].position.z = 0.055 - step;
      }

      entry.castOrb.isVisible = Boolean(actor.cast);
      if (actor.cast) {
        const pulse = 0.90 + Math.sin(time * 0.012) * 0.10;
        entry.castOrb.scaling.setAll(pulse);
        entry.castOrb.rotation.y += 0.06;
      }

      const health = Math.max(0, Math.min(1, actor.healthPct));
      entry.hp.scaling.x = health;
      entry.hp.position.x = -0.68 * (1 - health);

      const critical = health < 0.20;
      entry.hp.material = this.getMaterial(
        critical ? "critical-hp" : "hp",
        critical
          ? "#d9473f"
          : actor.team === "friendly"
            ? "#4eae78"
            : "#c45750",
        critical ? 0.04 : 0,
      );
    }
  }

  meshForActor(id) {
    return this.entries.get(id)?.body || null;
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
