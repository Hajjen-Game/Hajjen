import { CharacterRenderer } from "./CharacterRenderer.js";
import { VfxController } from "./VfxController.js";

const S = 0.02;

function color(hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function pbr(scene, name, hex, { roughness = 0.96, metallic = 0 } = {}) {
  const mat = new BABYLON.PBRMaterial(name, scene);
  mat.albedoColor = color(hex);
  mat.roughness = roughness;
  mat.metallic = metallic;
  return mat;
}

function standard(scene, name, hex, emissive = null) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = color(hex);
  if (emissive) mat.emissiveColor = color(emissive);
  return mat;
}

export class BabylonRenderer {
  constructor(canvas, arena) {
    if (!window.BABYLON) throw new Error("Babylon.js failed to load");

    this.canvas = canvas;
    this.arena = arena;
    this.engine = new BABYLON.Engine(canvas, true, {
      stencil: true,
      antialias: true,
      adaptToDeviceRatio: true,
    });
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = BABYLON.Color4.FromHexString(
      (arena.presentation?.sky || "#24140f") + "ff",
    );
    this.scene.ambientColor = new BABYLON.Color3(0.22, 0.13, 0.09);

    this.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
      "world-ui",
      true,
      this.scene,
    );
    this.textControls = new Map();
    this.torches = [];
    this.debug = new URLSearchParams(location.search).has("debug");
    this.debugPanel = document.querySelector("#debug-panel");
    this.debugPanel?.classList.toggle("hidden", !this.debug);
    this.lastTime = performance.now();

    this.buildScene();

    window.addEventListener("resize", () => this.engine.resize());
    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(() => this.engine.resize());
      this.resizeObserver.observe(canvas.parentElement || canvas);
    }
  }

  setArena(arena) {
    this.arena = arena;
  }

  buildScene() {
    const a = this.arena;
    const c = new BABYLON.Vector3(a.width * S * 0.5, 0, a.height * S * 0.5);

    // High near-top-down tactical camera. The slight forward tilt keeps 2.5D
    // depth while greatly reducing units being hidden by the LOS ruins.
    this.camera = new BABYLON.FreeCamera(
      "camera",
      new BABYLON.Vector3(c.x, 25.5, c.z - 3.8),
      this.scene,
    );
    this.camera.setTarget(new BABYLON.Vector3(c.x, 0, c.z + 0.45));
    this.camera.fov = 0.68;
    this.camera.minZ = 0.1;
    this.camera.inputs.clear();

    const hemi = new BABYLON.HemisphericLight(
      "hemi",
      new BABYLON.Vector3(-0.25, 1, 0.2),
      this.scene,
    );
    hemi.intensity = 0.82;
    hemi.diffuse = new BABYLON.Color3(1.0, 0.72, 0.5);
    hemi.groundColor = new BABYLON.Color3(0.18, 0.09, 0.065);

    this.sun = new BABYLON.DirectionalLight(
      "sun",
      new BABYLON.Vector3(-0.62, -1, 0.42),
      this.scene,
    );
    this.sun.position = new BABYLON.Vector3(c.x + 9, 16, c.z - 10);
    this.sun.intensity = 1.28;
    this.sun.diffuse = new BABYLON.Color3(1.0, 0.69, 0.43);

    this.shadowGenerator = new BABYLON.ShadowGenerator(2048, this.sun);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 24;
    this.shadowGenerator.bias = 0.0005;

    this.buildGround();
    this.buildBoundary();
    this.buildPillars();
    this.buildScenery();

    this.actorRender = new CharacterRenderer(
      this.scene,
      this.shadowGenerator,
      S,
    );
    this.vfx = new VfxController(this.scene, this.actorRender, S);

    this.targetMat = new BABYLON.StandardMaterial("targetMat", this.scene);
    this.targetMat.disableLighting = true;
    this.target = BABYLON.MeshBuilder.CreateTorus(
      "target",
      { diameter: 1.45, thickness: 0.085, tessellation: 48 },
      this.scene,
    );
    this.target.position.y = 0.18;
    this.target.material = this.targetMat;
    this.target.isPickable = false;
    this.target.setEnabled(false);

    this.glow = new BABYLON.GlowLayer("glow", this.scene, {
      blurKernelSize: 32,
    });
    this.glow.intensity = 0.32;
  }

  buildGround() {
    const a = this.arena;
    const w = a.width * S;
    const h = a.height * S;
    const center = new BABYLON.Vector3(w * 0.5, 0, h * 0.5);

    const ground = BABYLON.MeshBuilder.CreateGround(
      "arena-ground",
      { width: w, height: h, subdivisions: 2 },
      this.scene,
    );
    ground.position.copyFrom(center);
    ground.material = pbr(
      this.scene,
      "ground",
      a.presentation?.ground || "#a9542f",
    );
    ground.receiveShadows = true;
    ground.metadata = { ground: true };
    this.ground = ground;

    const lightMat = pbr(
      this.scene,
      "ground-light",
      a.presentation?.groundLight || "#c36b39",
    );
    const darkMat = pbr(
      this.scene,
      "ground-dark",
      a.presentation?.groundDark || "#81402a",
    );
    lightMat.roughness = 1;
    darkMat.roughness = 1;

    const patches = [
      [0.20, 0.18, 3.8, 2.2, 0.18, "light"],
      [0.47, 0.24, 4.7, 2.7, -0.12, "dark"],
      [0.76, 0.19, 4.0, 2.0, 0.08, "light"],
      [0.28, 0.51, 5.0, 2.5, -0.06, "light"],
      [0.61, 0.48, 4.2, 2.4, 0.16, "dark"],
      [0.83, 0.58, 3.9, 2.3, -0.18, "light"],
      [0.14, 0.77, 3.2, 1.9, 0.12, "dark"],
      [0.43, 0.80, 4.8, 2.2, -0.09, "light"],
      [0.70, 0.82, 4.3, 2.1, 0.14, "dark"],
    ];

    patches.forEach((p, i) => {
      const plate = BABYLON.MeshBuilder.CreateCylinder(
        "floor-plate-" + i,
        { height: 0.018, diameter: 2, tessellation: 7 + (i % 2) },
        this.scene,
      );
      plate.position.set(w * p[0], 0.012 + i * 0.0002, h * p[1]);
      plate.scaling.set(p[2], 1, p[3]);
      plate.rotation.y = p[4];
      plate.material = p[5] === "light" ? lightMat : darkMat;
      plate.receiveShadows = true;
      plate.isPickable = false;
    });

    const crackColor = color("#6f3828");
    const crackSets = [
      [[0.12,0.32],[0.18,0.35],[0.22,0.33],[0.27,0.37]],
      [[0.42,0.12],[0.44,0.18],[0.49,0.21],[0.50,0.26]],
      [[0.58,0.68],[0.63,0.65],[0.66,0.70],[0.71,0.72]],
      [[0.78,0.35],[0.82,0.39],[0.86,0.38],[0.89,0.43]],
      [[0.31,0.82],[0.35,0.77],[0.39,0.78],[0.42,0.73]],
    ];

    crackSets.forEach((set, i) => {
      const line = BABYLON.MeshBuilder.CreateLines(
        "crack-" + i,
        {
          points: set.map(
            ([x, z]) => new BABYLON.Vector3(w * x, 0.035, h * z),
          ),
        },
        this.scene,
      );
      line.color = crackColor;
      line.alpha = 0.48;
      line.isPickable = false;
    });
  }

  buildBoundary() {
    const a = this.arena;
    const w = a.width * S;
    const h = a.height * S;
    const pad = a.boundaryPadding * S;
    const wallThickness = Math.max(0.68, pad + 0.12);

    const wallMat = pbr(
      this.scene,
      "canyon-wall",
      a.presentation?.stoneDark || "#633b2d",
    );
    const capMat = pbr(
      this.scene,
      "canyon-wall-cap",
      a.presentation?.stone || "#a65d3b",
    );

    const walls = [
      { x: w / 2, z: pad / 2 - 0.08, sx: w + 0.6, sz: wallThickness },
      { x: w / 2, z: h - pad / 2 + 0.08, sx: w + 0.6, sz: wallThickness },
      { x: pad / 2 - 0.08, z: h / 2, sx: wallThickness, sz: h + 0.2 },
      { x: w - pad / 2 + 0.08, z: h / 2, sx: wallThickness, sz: h + 0.2 },
    ];

    for (const edge of walls) {
      const base = BABYLON.MeshBuilder.CreateBox(
        "arena-boundary",
        { width: edge.sx, depth: edge.sz, height: 0.72 },
        this.scene,
      );
      base.position.set(edge.x, 0.28, edge.z);
      base.material = wallMat;
      base.receiveShadows = true;
      this.shadowGenerator.addShadowCaster(base);

      const cap = BABYLON.MeshBuilder.CreateBox(
        "arena-boundary-cap",
        {
          width: Math.max(0.2, edge.sx - 0.08),
          depth: Math.max(0.2, edge.sz - 0.08),
          height: 0.16,
        },
        this.scene,
      );
      cap.position.set(edge.x, 0.69, edge.z);
      cap.material = capMat;
      cap.receiveShadows = true;
      this.shadowGenerator.addShadowCaster(cap);
    }
  }

  buildPillars() {
    const a = this.arena;
    const stone = pbr(
      this.scene,
      "pillar-stone",
      a.presentation?.stone || "#a65d3b",
    );
    const stoneLight = pbr(
      this.scene,
      "pillar-light",
      a.presentation?.stoneLight || "#cf8050",
    );
    const stoneDark = pbr(
      this.scene,
      "pillar-dark",
      a.presentation?.stoneDark || "#633b2d",
    );

    for (const o of a.obstacles) {
      const w = o.w * S;
      const d = o.h * S;
      const x = (o.x + o.w / 2) * S;
      const z = (o.y + o.h / 2) * S;

      const base = BABYLON.MeshBuilder.CreateBox(
        "los:" + o.id,
        { width: w, depth: d, height: 1.55 },
        this.scene,
      );
      base.position.set(x, 0.75, z);
      base.material = stone;
      base.receiveShadows = true;
      base.metadata = { obstacleId: o.id };
      this.shadowGenerator.addShadowCaster(base);

      const plinth = BABYLON.MeshBuilder.CreateBox(
        "plinth:" + o.id,
        { width: w, depth: d, height: 0.16 },
        this.scene,
      );
      plinth.position.set(x, 0.08, z);
      plinth.material = stoneDark;
      plinth.receiveShadows = true;

      const slabWidth = w * 0.29;
      const slabGap = w * 0.015;
      for (let i = -1; i <= 1; i += 1) {
        const slab = BABYLON.MeshBuilder.CreateBox(
          "ruin-slab:" + o.id + ":" + i,
          {
            width: slabWidth,
            depth: d * (0.86 - Math.abs(i) * 0.05),
            height: 0.24 + (i === 0 ? 0.08 : 0),
          },
          this.scene,
        );
        slab.position.set(
          x + i * (slabWidth + slabGap),
          1.62 + (i === 0 ? 0.035 : 0),
          z + i * 0.03,
        );
        slab.rotation.y = i * 0.025;
        slab.material = i === 0 ? stoneLight : stone;
        slab.receiveShadows = true;
        this.shadowGenerator.addShadowCaster(slab);
      }

      const chipOffsets = [
        [-0.38, -0.32, 0.18],
        [0.36, 0.30, 0.14],
      ];
      chipOffsets.forEach((entry, i) => {
        const chip = BABYLON.MeshBuilder.CreatePolyhedron(
          "pillar-chip:" + o.id + ":" + i,
          { type: 2, size: entry[2] },
          this.scene,
        );
        chip.position.set(
          x + entry[0] * w,
          1.72,
          z + entry[1] * d,
        );
        chip.scaling.set(1.2, 0.72, 1.05);
        chip.rotation.y = (i + 1) * 0.72;
        chip.material = stoneLight;
        chip.isPickable = false;
        this.shadowGenerator.addShadowCaster(chip);
      });
    }
  }

  buildScenery() {
    const a = this.arena;
    const w = a.width * S;
    const h = a.height * S;
    const rockMat = pbr(
      this.scene,
      "edge-rock",
      a.presentation?.stoneDark || "#633b2d",
    );
    const rockLight = pbr(
      this.scene,
      "edge-rock-light",
      a.presentation?.stone || "#a65d3b",
    );
    const scrubMat = standard(
      this.scene,
      "dry-scrub",
      a.presentation?.scrub || "#89773b",
    );

    const rockPoints = [
      [0.02,0.08,0.9,0.65],[0.08,0.03,0.65,0.48],[0.18,0.02,0.6,0.42],
      [0.82,0.02,0.72,0.5],[0.93,0.04,0.9,0.62],[0.98,0.14,0.7,0.55],
      [0.02,0.86,0.82,0.58],[0.08,0.96,0.68,0.48],[0.20,0.98,0.72,0.52],
      [0.80,0.98,0.72,0.50],[0.92,0.96,0.9,0.62],[0.98,0.84,0.72,0.52],
      [0.01,0.38,0.58,0.44],[0.99,0.42,0.62,0.46],[0.01,0.62,0.65,0.48],
      [0.99,0.67,0.62,0.44],
    ];

    rockPoints.forEach((p, i) => {
      const r = BABYLON.MeshBuilder.CreatePolyhedron(
        "edge-rock:" + i,
        { type: 2, size: 1 },
        this.scene,
      );
      r.position.set(w * p[0], p[3], h * p[1]);
      r.scaling.set(
        p[2],
        p[3] * 1.35,
        p[2] * (0.78 + (i % 3) * 0.09),
      );
      r.rotation.set(
        0.08 * (i % 2),
        i * 0.61,
        0.04 * ((i + 1) % 2),
      );
      r.material = i % 3 === 0 ? rockLight : rockMat;
      r.isPickable = false;
      this.shadowGenerator.addShadowCaster(r);
    });

    const scrubPoints = [
      [0.10,0.11],[0.16,0.06],[0.87,0.08],[0.92,0.16],
      [0.07,0.80],[0.14,0.92],[0.86,0.91],[0.94,0.78],
      [0.26,0.05],[0.72,0.95],
    ];
    scrubPoints.forEach((p, i) => {
      const root = new BABYLON.TransformNode("scrub:" + i, this.scene);
      root.position.set(w * p[0], 0.03, h * p[1]);

      for (let j = 0; j < 4; j += 1) {
        const blade = BABYLON.MeshBuilder.CreateBox(
          "scrub-blade",
          {
            width: 0.055,
            height: 0.34 + j * 0.035,
            depth: 0.055,
          },
          this.scene,
        );
        blade.parent = root;
        blade.position.set(
          (j - 1.5) * 0.075,
          0.16,
          j % 2 ? 0.05 : -0.04,
        );
        blade.rotation.z = (j - 1.5) * 0.16;
        blade.rotation.y = j * 0.7;
        blade.material = scrubMat;
        blade.isPickable = false;
      }
    });

    const torchLocations = [
      [0.045,0.045],
      [0.955,0.045],
      [0.045,0.955],
      [0.955,0.955],
    ];
    torchLocations.forEach(
      (p, i) => this.createTorch(w * p[0], h * p[1], i),
    );
  }

  createTorch(x, z, index) {
    const pedestalMat = pbr(
      this.scene,
      "torch-stone-" + index,
      "#5d3428",
    );
    const emberMat = standard(
      this.scene,
      "torch-ember-" + index,
      "#ff8b28",
      "#ff6f1f",
    );

    const pedestal = BABYLON.MeshBuilder.CreateCylinder(
      "torch-pedestal-" + index,
      {
        height: 0.54,
        diameterTop: 0.55,
        diameterBottom: 0.72,
        tessellation: 6,
      },
      this.scene,
    );
    pedestal.position.set(x, 0.27, z);
    pedestal.material = pedestalMat;
    pedestal.receiveShadows = true;
    pedestal.isPickable = false;
    this.shadowGenerator.addShadowCaster(pedestal);

    const flame = BABYLON.MeshBuilder.CreatePolyhedron(
      "torch-flame-" + index,
      { type: 1, size: 0.22 },
      this.scene,
    );
    flame.position.set(x, 0.73, z);
    flame.scaling.set(0.65, 1.55, 0.65);
    flame.material = emberMat;
    flame.isPickable = false;

    const light = new BABYLON.PointLight(
      "torch-light-" + index,
      new BABYLON.Vector3(x, 0.86, z),
      this.scene,
    );
    light.diffuse = new BABYLON.Color3(1, 0.38, 0.09);
    light.intensity = 0.72;
    light.range = 4.5;

    this.torches.push({ flame, light, phase: index * 1.73 });
  }

  render(game) {
    const now = performance.now();
    const dt = Math.min(50, now - this.lastTime);
    this.lastTime = now;

    if (game.vfx?.game !== game) game.vfx?.bindGame?.(game);

    this.actorRender.sync(game, now);
    this.vfx.consume(game.vfx?.events || []);
    this.vfx.update(dt);
    this.animateTorches(now);
    this.syncTarget(game);
    this.syncText(game);
    this.syncDebug(game);
    this.scene.render();
  }

  animateTorches(now) {
    const t = now * 0.006;
    for (const torch of this.torches) {
      const pulse = 1 + Math.sin(t + torch.phase) * 0.09;
      torch.flame.scaling.y = 1.55 * pulse;
      torch.flame.rotation.y = t * 0.28 + torch.phase;
      torch.light.intensity =
        0.68 + Math.sin(t * 1.7 + torch.phase) * 0.1;
    }
  }

  syncTarget(game) {
    const actor = game.getActor(game.player?.targetId);
    const root = actor ? this.actorRender.rootForActor(actor.id) : null;

    if (!root || !actor?.alive) {
      this.target.setEnabled(false);
      return;
    }

    this.target.setEnabled(true);
    this.target.position.x = root.position.x;
    this.target.position.z = root.position.z;
    this.targetMat.emissiveColor =
      actor.team === game.player.team
        ? new BABYLON.Color3(0.18, 0.9, 0.42)
        : new BABYLON.Color3(0.95, 0.18, 0.18);
  }

  syncText(game) {
    const live = new Set(game.floatingTexts || []);

    for (const [item, control] of this.textControls) {
      if (live.has(item)) continue;
      control.dispose();
      this.textControls.delete(item);
    }

    for (const item of live) {
      let control = this.textControls.get(item);

      if (!control) {
        const mesh = this.actorRender.meshForActor(item.actorId);
        if (!mesh) continue;

        control = new BABYLON.GUI.TextBlock("combatText");
        control.text = String(item.text);
        control.fontWeight = "800";
        control.outlineWidth = 3;
        control.outlineColor = "rgba(0,0,0,.75)";
        control.color = item.type.includes("heal")
          ? "#54e487"
          : item.type === "avoid"
            ? "#f2d081"
            : "#ff5b5b";
        control.linkWithMesh(mesh);
        this.gui.addControl(control);
        this.textControls.set(item, control);
      }

      const progress =
        1 - Math.max(0, item.remainingMs) / Math.max(1, item.totalMs);
      control.fontSize = item.type.includes("crit")
        ? 28 + (1 - progress) * 9
        : 24;
      control.alpha = Math.min(1, item.remainingMs / 180);
      control.linkOffsetY = -70 - progress * 34;
    }
  }

  targetHitScore(actor, game, x, y) {
    const pick = this.scene.pick(
      x,
      y,
      mesh => Boolean(mesh?.metadata?.actorId),
    );
    return pick?.hit &&
      pick.pickedMesh?.metadata?.actorId === actor.id
      ? 0
      : null;
  }

  screenToWorld(x, y) {
    const pick = this.scene.pick(
      x,
      y,
      mesh => mesh === this.ground,
    );
    return pick?.hit && pick.pickedPoint
      ? {
          x: pick.pickedPoint.x / S,
          y: pick.pickedPoint.z / S,
        }
      : null;
  }

  syncDebug(game) {
    if (!this.debug || !this.debugPanel) return;

    this.debugPanel.textContent =
      "FPS " + this.engine.getFps().toFixed(0)
      + "\nActors " + game.actors.length
      + "\nMeshes " + this.scene.getActiveMeshes().length
      + "\nVFX " + this.vfx.active.length
      + "\nTime " + game.elapsedSeconds.toFixed(1) + "s";
  }
}
