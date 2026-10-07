import { CustomMiniCharacterRenderer } from "./CustomMiniCharacterRenderer.js?v=20261007-warrior-arms-axe-2";
import { VfxController } from "./VfxController.js?v=20261002-2250";

const S = 0.02;

function color(hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function color4(hex, alpha = 1) {
  const c = color(hex);
  return new BABYLON.Color4(c.r, c.g, c.b, alpha);
}

function pbr(scene, name, hex, roughness = 0.96) {
  const mat = new BABYLON.PBRMaterial(name, scene);
  mat.albedoColor = color(hex);
  mat.roughness = roughness;
  mat.metallic = 0;
  return mat;
}

function standard(scene, name, hex, emissive = null) {
  const mat = new BABYLON.StandardMaterial(name, scene);
  mat.diffuseColor = color(hex);
  mat.specularColor = new BABYLON.Color3(0.04, 0.03, 0.02);
  if (emissive) mat.emissiveColor = color(emissive);
  return mat;
}

function hash01(x, z, seed = 0) {
  const value = Math.sin(
    x * 12.9898 + z * 78.233 + seed * 37.719,
  ) * 43758.5453;
  return value - Math.floor(value);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(a, b, t) {
  return new BABYLON.Color4(
    lerp(a.r, b.r, t),
    lerp(a.g, b.g, t),
    lerp(a.b, b.b, t),
    1,
  );
}

export class BabylonRenderer {
  constructor(canvas, arena) {
    if (!window.BABYLON) throw new Error("Babylon.js failed to load");

    this.canvas = canvas;
    this.arena = arena;
    this.engine = null;
    this.scene = null;
    this.gui = null;
    this.actorRender = null;
    this.vfx = null;
    this.backend = "initializing";
    this.ready = false;
    this.initError = null;
    this.webGpuError = null;
    this.textControls = new Map();
    this.torches = [];
    this.debug = new URLSearchParams(location.search).has("debug");
    this.debugPanel = document.querySelector("#debug-panel");
    this.debugPanel?.classList.toggle("hidden", !this.debug);
    this.lastTime = performance.now();
    this.renderHealthFrames = 0;
    this.webGpuHealthChecked = false;

    this.initialize().catch(error => {
      this.initError = error;
      this.backend = "failed";
      console.error("PvP-2.5D renderer initialization failed", error);
    });

    window.addEventListener("resize", () => this.handleResize());
    if ("ResizeObserver" in window) {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(canvas.parentElement || canvas);
    }
  }

  async initialize() {
    const params = new URLSearchParams(location.search);
    const requestedRenderer = params.get("renderer");
    const wantsWebGPU = requestedRenderer === "webgpu";

    // WebGL2 is the stable default while we isolate a presentation issue in
    // Babylon's WebGPU path on the user's current browsers. WebGPU remains
    // available explicitly for A/B testing through ?renderer=webgpu.
    this.backendReason = wantsWebGPU
      ? "explicit WebGPU test"
      : "stable WebGL default";

    if (wantsWebGPU) {
      const supported = Boolean(
        BABYLON.WebGPUEngine
        && await BABYLON.WebGPUEngine.IsSupportedAsync
      );

      if (supported) {
        try {
          const webGpuEngine = new BABYLON.WebGPUEngine(
            this.canvas,
            {
              antialias: true,
              adaptToDeviceRatio: true,
            },
          );

          await webGpuEngine.initAsync();
          await this.initializeRuntime(webGpuEngine, "WebGPU");
          return;
        } catch (error) {
          this.webGpuError = error;
          this.backendReason = "WebGPU failed → WebGL fallback";
          console.warn(
            "Explicit WebGPU test failed; falling back to WebGL.",
            error,
          );
        }
      } else {
        this.backendReason = "WebGPU unsupported → WebGL fallback";
      }
    }

    const webGlEngine = new BABYLON.Engine(
      this.canvas,
      true,
      {
        stencil: true,
        antialias: true,
        adaptToDeviceRatio: true,
      },
    );

    const backend = Number(webGlEngine.webGLVersion) >= 2
      ? "WebGL2"
      : "WebGL1";

    await this.initializeRuntime(webGlEngine, backend);
  }

  async initializeRuntime(engine, backend) {
    this.engine = engine;
    this.backend = backend;
    this.scene = new BABYLON.Scene(this.engine);
    this.scene.clearColor = BABYLON.Color4.FromHexString(
      (this.arena.presentation?.sky || "#28150f") + "ff",
    );
    this.scene.ambientColor = new BABYLON.Color3(0.15, 0.085, 0.06);

    // Keep the warm canyon look while avoiding blown-out character whites.
    this.scene.imageProcessingConfiguration.contrast = 1.08;
    this.scene.imageProcessingConfiguration.exposure = 0.90;

    this.gui = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI(
      "world-ui",
      true,
      this.scene,
    );

    this.buildScene();
    this.ready = true;
    this.initError = null;
    this.lastTime = performance.now();
    this.engine.resize();
    this.fitCameraToCanvas();
  }

  handleResize() {
    this.engine?.resize();
    this.fitCameraToCanvas();
  }

  fitCameraToCanvas() {
    if (!this.camera || !this.engine) return;

    const a = this.arena;
    const centerX = a.width * S * 0.5;
    const centerZ = a.height * S * 0.5 + 0.6;
    const renderWidth = Math.max(
      1,
      Number(this.engine.getRenderWidth?.())
        || this.canvas.clientWidth
        || 1,
    );
    const renderHeight = Math.max(
      1,
      Number(this.engine.getRenderHeight?.())
        || this.canvas.clientHeight
        || 1,
    );
    const aspect = renderWidth / renderHeight;

    const referenceAspect = 1.55;
    const framingScale = Math.max(1, referenceAspect / aspect);
    const baseRadius = 23.45;

    this.camera.target.set(centerX, 0, centerZ);
    this.camera.alpha = -Math.PI / 2;
    this.camera.beta = 0.30;
    this.camera.radius = baseRadius * framingScale;
    this.camera.fov = 0.72;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 140;

    // Force matrices to update immediately after resize/backend changes.
    this.scene.activeCamera = this.camera;
    this.camera.getViewMatrix(true);
    this.camera.getProjectionMatrix(true);
  }

  setArena(arena) {
    this.arena = arena;
  }

  buildScene() {
    const a = this.arena;
    const c = new BABYLON.Vector3(
      a.width * S * 0.5,
      0,
      a.height * S * 0.5,
    );

    this.camera = new BABYLON.ArcRotateCamera(
      "camera",
      -Math.PI / 2,
      0.30,
      23.45,
      new BABYLON.Vector3(c.x, 0, c.z + 0.6),
      this.scene,
    );
    this.camera.inputs.clear();
    this.camera.panningSensibility = 0;
    this.camera.wheelPrecision = 0;
    this.scene.activeCamera = this.camera;
    this.fitCameraToCanvas();

    const hemi = new BABYLON.HemisphericLight(
      "hemi",
      new BABYLON.Vector3(-0.28, 1, 0.22),
      this.scene,
    );
    hemi.intensity = 0.48;
    hemi.diffuse = new BABYLON.Color3(1.0, 0.76, 0.58);
    hemi.groundColor = new BABYLON.Color3(0.16, 0.075, 0.055);

    this.sun = new BABYLON.DirectionalLight(
      "sun",
      new BABYLON.Vector3(-0.64, -1, 0.46),
      this.scene,
    );
    this.sun.position = new BABYLON.Vector3(c.x + 11, 18, c.z - 12);
    this.sun.intensity = 1.12;
    this.sun.diffuse = new BABYLON.Color3(1.0, 0.69, 0.42);

    this.shadowGenerator = new BABYLON.ShadowGenerator(2048, this.sun);
    this.shadowGenerator.useBlurExponentialShadowMap = true;
    this.shadowGenerator.blurKernel = 26;
    this.shadowGenerator.bias = 0.00055;
    this.shadowGenerator.normalBias = 0.018;

    this.buildGround();
    this.buildCanyonPerimeter();
    this.buildLosFormations();
    this.buildEdgeDetails();

    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    const ActorRenderer = CustomMiniCharacterRenderer;

    this.actorRender = new ActorRenderer(
      this.scene,
      this.shadowGenerator,
      S,
    );
    this.vfx = new VfxController(this.scene, this.actorRender, S);

    this.targetMat = new BABYLON.StandardMaterial("targetMat", this.scene);
    this.targetMat.disableLighting = true;
    this.target = BABYLON.MeshBuilder.CreateTorus(
      "target",
      { diameter: 1.68, thickness: 0.09, tessellation: 48 },
      this.scene,
    );
    this.target.position.y = 0.18;
    this.target.material = this.targetMat;
    this.target.isPickable = false;
    this.target.setEnabled(false);

    this.glow = new BABYLON.GlowLayer("glow", this.scene, {
      blurKernelSize: 32,
    });
    this.glow.intensity = 0.18;

    this.installAmbientOcclusion();
  }

  installAmbientOcclusion() {
    // SSAO2 has shown unreliable output on some WebGPU/browser combinations.
    // Keep WebGPU for the main renderer and VFX, but only enable this optional
    // post-process on the mature WebGL path for now.
    if (this.backend === "WebGPU") return;
    if (!BABYLON.SSAO2RenderingPipeline) return;

    try {
      this.ssao = new BABYLON.SSAO2RenderingPipeline(
        "arena-ssao",
        this.scene,
        { ssaoRatio: 0.5, blurRatio: 0.5 },
        [this.camera],
      );
      this.ssao.radius = 1.25;
      this.ssao.totalStrength = 0.58;
      this.ssao.base = 0.16;
      this.ssao.samples = 8;
      this.ssao.maxZ = 60;
    } catch {
      this.ssao = null;
    }
  }

  groundHeight(gx, gz, cols, rows) {
    if (gx === 0 || gz === 0 || gx === cols || gz === rows) return 0;

    const broad =
      Math.sin(gx * 0.72) * 0.018
      + Math.cos(gz * 0.81) * 0.015
      + Math.sin((gx + gz) * 0.43) * 0.011;
    const jitter = (hash01(gx, gz, 7) - 0.5) * 0.025;
    return broad + jitter;
  }

  buildGround() {
    const a = this.arena;
    const w = a.width * S;
    const h = a.height * S;
    const cols = 16;
    const rows = 10;

    const positions = [];
    const indices = [];
    const colors = [];
    const normals = [];

    const sand = color4(a.presentation?.ground || "#c87849");
    const light = color4(a.presentation?.groundLight || "#d58a55");
    const dark = color4(a.presentation?.groundDark || "#a85a3b");

    let vertexIndex = 0;

    const corner = (gx, gz) => ({
      x: w * gx / cols,
      y: this.groundHeight(gx, gz, cols, rows),
      z: h * gz / rows,
    });

    const addTriangle = (p0, p1, p2, shade) => {
      for (const p of [p0, p1, p2]) {
        positions.push(p.x, p.y, p.z);
      }

      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2);
      vertexIndex += 3;

      const baseMix = shade < 0.5
        ? mixColor(dark, sand, shade * 2)
        : mixColor(sand, light, (shade - 0.5) * 2);

      for (let i = 0; i < 3; i += 1) {
        colors.push(baseMix.r, baseMix.g, baseMix.b, 1);
      }
    };

    for (let z = 0; z < rows; z += 1) {
      for (let x = 0; x < cols; x += 1) {
        const a0 = corner(x, z);
        const b0 = corner(x + 1, z);
        const c0 = corner(x, z + 1);
        const d0 = corner(x + 1, z + 1);

        const shadeA = 0.34 + hash01(x, z, 3) * 0.34;
        const shadeB = 0.34 + hash01(x, z, 11) * 0.34;
        const flip = hash01(x, z, 19) > 0.5;

        if (flip) {
          addTriangle(a0, b0, d0, shadeA);
          addTriangle(a0, d0, c0, shadeB);
        } else {
          addTriangle(a0, b0, c0, shadeA);
          addTriangle(b0, d0, c0, shadeB);
        }
      }
    }

    BABYLON.VertexData.ComputeNormals(positions, indices, normals);

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = positions;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.colors = colors;

    const ground = new BABYLON.Mesh("arena-ground", this.scene);
    vertexData.applyToMesh(ground);
    ground.useVertexColors = true;
    ground.hasVertexAlpha = false;
    ground.material = standard(this.scene, "ground-faceted", "#ffffff");
    ground.material.diffuseColor = new BABYLON.Color3(1, 1, 1);
    ground.receiveShadows = true;
    ground.metadata = { ground: true };
    this.ground = ground;

    const crackColor = color("#77412f");
    const crackSets = [
      [[0.10,0.29],[0.14,0.31],[0.17,0.30],[0.20,0.34]],
      [[0.38,0.15],[0.41,0.18],[0.45,0.19],[0.47,0.23]],
      [[0.56,0.73],[0.60,0.69],[0.64,0.71],[0.68,0.69]],
      [[0.77,0.34],[0.81,0.37],[0.84,0.36],[0.88,0.40]],
      [[0.27,0.82],[0.31,0.78],[0.35,0.80],[0.38,0.75]],
      [[0.48,0.46],[0.51,0.43],[0.54,0.44],[0.57,0.40]],
    ];

    crackSets.forEach((set, i) => {
      const line = BABYLON.MeshBuilder.CreateLines(
        "crack-" + i,
        {
          points: set.map(
            ([x, z]) => new BABYLON.Vector3(w * x, 0.055, h * z),
          ),
        },
        this.scene,
      );
      line.color = crackColor;
      line.alpha = 0.34;
      line.isPickable = false;
    });

    const pebbleMat = pbr(this.scene, "floor-pebbles", "#784635", 1);
    const pebbleSets = [
      [0.11,0.20,3],[0.15,0.58,2],[0.23,0.68,4],[0.32,0.31,3],
      [0.42,0.72,2],[0.54,0.22,3],[0.61,0.60,4],[0.72,0.33,2],
      [0.79,0.69,3],[0.89,0.45,4],[0.31,0.88,2],[0.67,0.87,3],
    ];

    pebbleSets.forEach((p, i) => {
      for (let j = 0; j < p[2]; j += 1) {
        const px = w * p[0] + (hash01(i, j, 2) - 0.5) * 0.62;
        const pz = h * p[1] + (hash01(i, j, 5) - 0.5) * 0.42;
        const pebble = BABYLON.MeshBuilder.CreatePolyhedron(
          "floor-pebble-" + i + "-" + j,
          { type: 2, size: 0.055 + hash01(i, j, 8) * 0.055 },
          this.scene,
        );
        pebble.position.set(px, 0.045, pz);
        pebble.scaling.set(1.3, 0.38, 0.85);
        pebble.rotation.y = hash01(i, j, 13) * Math.PI;
        pebble.material = pebbleMat;
        pebble.isPickable = false;
        pebble.receiveShadows = true;
      }
    });
  }

  buildCanyonPerimeter() {
    const a = this.arena;
    const w = a.width * S;
    const h = a.height * S;
    const pad = a.boundaryPadding * S;

    const cliffDark = pbr(
      this.scene,
      "cliff-dark",
      a.presentation?.stoneDark || "#5e3328",
      1,
    );
    const cliff = pbr(
      this.scene,
      "cliff-main",
      a.presentation?.stone || "#985338",
      1,
    );
    const cliffLight = pbr(
      this.scene,
      "cliff-light",
      a.presentation?.stoneLight || "#c97848",
      1,
    );

    // A low dark shelf under the rock ring gives the canyon a continuous base
    // without showing the old rectangular arena wall.
    const shelfMat = pbr(this.scene, "canyon-shelf", "#4b271f", 1);
    const shelf = BABYLON.MeshBuilder.CreateBox(
      "canyon-shelf",
      {
        width: w + 2.4,
        depth: h + 2.4,
        height: 0.36,
      },
      this.scene,
    );
    shelf.position.set(w * 0.5, -0.12, h * 0.5);
    shelf.material = shelfMat;
    shelf.receiveShadows = true;

    const inner = {
      left: pad - 0.05,
      right: w - pad + 0.05,
      top: pad - 0.05,
      bottom: h - pad + 0.05,
    };

    const segments = [];

    const pushHorizontal = (z, sideSeed, count = 14) => {
      for (let i = 0; i < count; i += 1) {
        const t = (i + 0.5) / count;
        const x = lerp(inner.left, inner.right, t);
        const outward = sideSeed === 1 ? -1 : 1;
        const jitter = (hash01(i, sideSeed, 17) - 0.5) * 0.42;
        segments.push({
          x,
          z: z + outward * (0.33 + hash01(i, sideSeed, 7) * 0.24),
          sx: 0.72 + hash01(i, sideSeed, 2) * 0.72,
          sz: 0.55 + hash01(i, sideSeed, 3) * 0.50,
          sy: 0.82 + hash01(i, sideSeed, 4) * 0.96,
          ry: jitter,
          seed: i + sideSeed * 31,
        });
      }
    };

    const pushVertical = (x, sideSeed, count = 9) => {
      for (let i = 0; i < count; i += 1) {
        const t = (i + 0.5) / count;
        const z = lerp(inner.top, inner.bottom, t);
        const outward = sideSeed === 3 ? -1 : 1;
        const jitter = (hash01(i, sideSeed, 23) - 0.5) * 0.42;
        segments.push({
          x: x + outward * (0.33 + hash01(i, sideSeed, 9) * 0.24),
          z,
          sx: 0.55 + hash01(i, sideSeed, 10) * 0.50,
          sz: 0.72 + hash01(i, sideSeed, 11) * 0.72,
          sy: 0.82 + hash01(i, sideSeed, 12) * 0.96,
          ry: jitter,
          seed: i + sideSeed * 31,
        });
      }
    };

    pushHorizontal(inner.top, 1);
    pushHorizontal(inner.bottom, 2);
    pushVertical(inner.left, 3);
    pushVertical(inner.right, 4);

    segments.forEach((s, i) => {
      const rock = BABYLON.MeshBuilder.CreatePolyhedron(
        "canyon-rock-" + i,
        { type: 2, size: 1 },
        this.scene,
      );
      rock.position.set(s.x, s.sy * 0.44, s.z);
      rock.scaling.set(s.sx, s.sy, s.sz);
      rock.rotation.set(
        (hash01(s.seed, 1, 2) - 0.5) * 0.15,
        s.ry,
        (hash01(s.seed, 2, 4) - 0.5) * 0.12,
      );
      rock.material =
        i % 5 === 0 ? cliffLight : i % 3 === 0 ? cliffDark : cliff;
      rock.isPickable = false;
      rock.receiveShadows = true;
      this.shadowGenerator.addShadowCaster(rock);

      if (i % 3 === 0) {
        const upper = rock.clone("canyon-upper-" + i);
        upper.position.y += s.sy * 0.48;
        upper.position.x += (hash01(i, 4, 2) - 0.5) * 0.32;
        upper.position.z += (hash01(i, 4, 8) - 0.5) * 0.28;
        upper.scaling.scaleInPlace(0.70);
        upper.rotation.y += 0.34;
        upper.material = i % 2 === 0 ? cliff : cliffLight;
        this.shadowGenerator.addShadowCaster(upper);
      }
    });

    // Stronger corner masses make the perimeter read as a canyon rather than a
    // string of separate rocks.
    const corners = [
      [inner.left - 0.45, inner.top - 0.42],
      [inner.right + 0.45, inner.top - 0.42],
      [inner.left - 0.45, inner.bottom + 0.42],
      [inner.right + 0.45, inner.bottom + 0.42],
    ];

    corners.forEach((c, i) => {
      for (let j = 0; j < 4; j += 1) {
        const rock = BABYLON.MeshBuilder.CreatePolyhedron(
          "corner-mass-" + i + "-" + j,
          { type: 2, size: 1 },
          this.scene,
        );
        rock.position.set(
          c[0] + (j % 2 ? 0.32 : -0.22),
          0.62 + j * 0.17,
          c[1] + (j > 1 ? 0.27 : -0.20),
        );
        rock.scaling.set(
          0.82 + j * 0.08,
          1.0 + j * 0.12,
          0.78 + (3 - j) * 0.08,
        );
        rock.rotation.y = i * 0.7 + j * 0.45;
        rock.material = j % 2 ? cliffLight : cliff;
        rock.isPickable = false;
        rock.receiveShadows = true;
        this.shadowGenerator.addShadowCaster(rock);
      }
    });
  }

  buildLosFormations() {
    const a = this.arena;
    const rock = pbr(
      this.scene,
      "los-rock",
      a.presentation?.stone || "#985338",
      1,
    );
    const light = pbr(
      this.scene,
      "los-rock-light",
      a.presentation?.stoneLight || "#c97848",
      1,
    );
    const dark = pbr(
      this.scene,
      "los-rock-dark",
      a.presentation?.stoneDark || "#5e3328",
      1,
    );

    for (const o of a.obstacles) {
      const w = o.w * S;
      const d = o.h * S;
      const x = (o.x + o.w / 2) * S;
      const z = (o.y + o.h / 2) * S;

      // Exact collider footprint remains visually represented at ground level.
      const base = BABYLON.MeshBuilder.CreateBox(
        "los:" + o.id,
        {
          width: w,
          depth: d,
          height: 0.18,
        },
        this.scene,
      );
      base.position.set(x, 0.09, z);
      base.material = dark;
      base.receiveShadows = true;
      base.metadata = { obstacleId: o.id };
      this.shadowGenerator.addShadowCaster(base);

      const chunks = [
        [-0.25,-0.22,0.34,0.42,0.86],
        [ 0.18,-0.18,0.39,0.46,1.05],
        [-0.23, 0.24,0.38,0.34,0.72],
        [ 0.23, 0.25,0.36,0.35,0.82],
        [ 0.02, 0.03,0.40,0.38,1.16],
      ];

      chunks.forEach((chunk, i) => {
        const mesh = BABYLON.MeshBuilder.CreatePolyhedron(
          "los-chunk:" + o.id + ":" + i,
          { type: 2, size: 1 },
          this.scene,
        );
        mesh.position.set(
          x + w * chunk[0],
          chunk[4] * 0.48 + 0.14,
          z + d * chunk[1],
        );
        mesh.scaling.set(
          w * chunk[2],
          chunk[4],
          d * chunk[3],
        );
        mesh.rotation.set(
          (hash01(i, 2, 5) - 0.5) * 0.12,
          (hash01(i, 3, 7) - 0.5) * 0.38,
          (hash01(i, 4, 9) - 0.5) * 0.08,
        );
        mesh.material = i === 4 ? light : i % 3 === 0 ? dark : rock;
        mesh.isPickable = false;
        mesh.receiveShadows = true;
        this.shadowGenerator.addShadowCaster(mesh);
      });

      const ledge = BABYLON.MeshBuilder.CreateBox(
        "los-ledge:" + o.id,
        {
          width: w * 0.72,
          depth: d * 0.52,
          height: 0.12,
        },
        this.scene,
      );
      ledge.position.set(x - w * 0.04, 0.95, z - d * 0.02);
      ledge.rotation.y = 0.045;
      ledge.material = light;
      ledge.isPickable = false;
      ledge.receiveShadows = true;
      this.shadowGenerator.addShadowCaster(ledge);

      const rubble = [
        [-0.40,-0.38,0.11],[0.41,-0.31,0.09],
        [-0.39, 0.38,0.08],[0.39, 0.39,0.10],
      ];
      rubble.forEach((r, i) => {
        const chip = BABYLON.MeshBuilder.CreatePolyhedron(
          "los-rubble:" + o.id + ":" + i,
          { type: 2, size: r[2] },
          this.scene,
        );
        chip.position.set(
          x + w * r[0],
          0.13,
          z + d * r[1],
        );
        chip.scaling.set(1.35, 0.58, 1.05);
        chip.rotation.y = i * 1.07;
        chip.material = i % 2 ? light : rock;
        chip.isPickable = false;
        chip.receiveShadows = true;
      });
    }
  }

  buildEdgeDetails() {
    const a = this.arena;
    const w = a.width * S;
    const h = a.height * S;
    const scrub = standard(
      this.scene,
      "dry-scrub",
      a.presentation?.scrub || "#8d7b37",
    );
    const cactus = standard(
      this.scene,
      "cactus",
      a.presentation?.cactus || "#507248",
    );

    const plants = [
      [0.08,0.12],[0.16,0.08],[0.28,0.06],[0.74,0.07],[0.88,0.11],
      [0.94,0.23],[0.06,0.76],[0.13,0.89],[0.28,0.94],[0.74,0.93],
      [0.88,0.88],[0.94,0.72],
    ];

    plants.forEach((p, i) => {
      const root = new BABYLON.TransformNode("scrub:" + i, this.scene);
      root.position.set(w * p[0], 0.03, h * p[1]);

      for (let j = 0; j < 5; j += 1) {
        const blade = BABYLON.MeshBuilder.CreateBox(
          "scrub-blade:" + i + ":" + j,
          {
            width: 0.045,
            height: 0.24 + j * 0.028,
            depth: 0.045,
          },
          this.scene,
        );
        blade.parent = root;
        blade.position.set(
          (j - 2) * 0.062,
          0.12,
          j % 2 ? 0.04 : -0.035,
        );
        blade.rotation.z = (j - 2) * 0.18;
        blade.rotation.y = j * 0.84;
        blade.material = scrub;
        blade.isPickable = false;
      }
    });

    const cactusPoints = [
      [0.09,0.32,0.78],
      [0.18,0.91,0.68],
      [0.83,0.10,0.76],
      [0.91,0.62,0.72],
      [0.73,0.91,0.65],
    ];
    cactusPoints.forEach((p, i) => {
      this.createCactus(w * p[0], h * p[1], p[2], cactus, i);
    });

    const torchLocations = [
      [0.055,0.055],
      [0.945,0.055],
      [0.055,0.945],
      [0.945,0.945],
    ];
    torchLocations.forEach(
      (p, i) => this.createTorch(w * p[0], h * p[1], i),
    );
  }

  createCactus(x, z, scale, material, index) {
    const root = new BABYLON.TransformNode("cactus:" + index, this.scene);
    root.position.set(x, 0.02, z);
    root.scaling.setAll(scale);

    const trunk = BABYLON.MeshBuilder.CreateCylinder(
      "cactus-trunk:" + index,
      {
        height: 0.78,
        diameter: 0.16,
        tessellation: 7,
      },
      this.scene,
    );
    trunk.parent = root;
    trunk.position.y = 0.39;
    trunk.material = material;
    trunk.isPickable = false;

    for (const side of [-1, 1]) {
      const arm = BABYLON.MeshBuilder.CreateCylinder(
        "cactus-arm:" + index + ":" + side,
        {
          height: 0.37,
          diameter: 0.11,
          tessellation: 7,
        },
        this.scene,
      );
      arm.parent = root;
      arm.position.set(side * 0.14, 0.43, 0);
      arm.rotation.z = side * 0.92;
      arm.material = material;
      arm.isPickable = false;

      const tip = BABYLON.MeshBuilder.CreateCylinder(
        "cactus-tip:" + index + ":" + side,
        {
          height: 0.28,
          diameter: 0.11,
          tessellation: 7,
        },
        this.scene,
      );
      tip.parent = root;
      tip.position.set(side * 0.27, 0.56, 0);
      tip.material = material;
      tip.isPickable = false;
    }
  }

  createTorch(x, z, index) {
    const pedestalMat = pbr(
      this.scene,
      "torch-stone-" + index,
      "#5a3026",
      1,
    );
    const emberMat = standard(
      this.scene,
      "torch-ember-" + index,
      "#ff9e32",
      "#ff6b17",
    );

    const pedestal = BABYLON.MeshBuilder.CreateCylinder(
      "torch-pedestal-" + index,
      {
        height: 0.58,
        diameterTop: 0.50,
        diameterBottom: 0.72,
        tessellation: 6,
      },
      this.scene,
    );
    pedestal.position.set(x, 0.29, z);
    pedestal.material = pedestalMat;
    pedestal.receiveShadows = true;
    pedestal.isPickable = false;
    this.shadowGenerator.addShadowCaster(pedestal);

    const bowl = BABYLON.MeshBuilder.CreateCylinder(
      "torch-bowl-" + index,
      {
        height: 0.12,
        diameterTop: 0.48,
        diameterBottom: 0.30,
        tessellation: 8,
      },
      this.scene,
    );
    bowl.position.set(x, 0.61, z);
    bowl.material = pedestalMat;
    bowl.isPickable = false;

    const flame = BABYLON.MeshBuilder.CreatePolyhedron(
      "torch-flame-" + index,
      { type: 1, size: 0.24 },
      this.scene,
    );
    flame.position.set(x, 0.84, z);
    flame.scaling.set(0.68, 1.62, 0.68);
    flame.material = emberMat;
    flame.isPickable = false;

    const light = new BABYLON.PointLight(
      "torch-light-" + index,
      new BABYLON.Vector3(x, 0.92, z),
      this.scene,
    );
    light.diffuse = new BABYLON.Color3(1, 0.35, 0.075);
    light.intensity = 0.88;
    light.range = 4.9;

    this.torches.push({ flame, light, phase: index * 1.73 });
  }

  render(game) {
    if (!this.ready || !this.scene || !this.actorRender || !this.vfx) {
      if (this.debug && this.debugPanel) {
        const detail = this.initError
          ? " · " + (this.initError.message || "initialization failed")
          : "";
        this.debugPanel.textContent =
          "Backend " + this.backend + detail;
      }
      return;
    }

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
    this.checkWebGpuRenderHealth();
  }

  checkWebGpuRenderHealth() {
    if (
      this.backend !== "WebGPU"
      || this.webGpuHealthChecked
      || !this.scene
      || !this.engine
    ) return;

    this.renderHealthFrames += 1;
    if (this.renderHealthFrames < 8) return;

    const activeMeshes = this.scene.getActiveMeshes().length;
    const totalMeshes = this.scene.meshes.length;

    const drawCounter =
      this.engine._drawCalls?.current
      ?? this.engine._drawCalls?.lastSecAverage
      ?? this.engine._drawCalls
      ?? null;

    const numericDrawCalls = Number(drawCounter);
    const hasReliableDrawCounter = Number.isFinite(numericDrawCalls);
    const looksBlank =
      totalMeshes > 50
      && activeMeshes > 20
      && hasReliableDrawCounter
      && numericDrawCalls <= 1;

    if (looksBlank) {
      console.warn(
        "WebGPU scene has active meshes but no healthy draw output. "
        + "Reloading with WebGL fallback.",
      );
      this.webGpuHealthChecked = true;
      console.warn(
        "WebGPU test appears unhealthy; use the default URL for stable WebGL.",
      );
      return;
    }

    // If Babylon does not expose a usable draw counter on this version,
    // do not punish a healthy WebGPU desktop renderer.
    this.webGpuHealthChecked = true;
  }

  animateTorches(now) {
    const t = now * 0.006;
    for (const torch of this.torches) {
      const pulse = 1 + Math.sin(t + torch.phase) * 0.085;
      torch.flame.scaling.y = 1.62 * pulse;
      torch.flame.rotation.y = t * 0.30 + torch.phase;
      torch.light.intensity =
        0.82 + Math.sin(t * 1.7 + torch.phase) * 0.12;
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
    if (!this.ready || !this.scene) return null;

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
    if (!this.ready || !this.scene || !this.ground) return null;

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
      "Backend " + this.backend
      + (this.backendReason ? " · " + this.backendReason : "")
      + (this.webGpuError ? " (WebGPU error)" : "")
      + "\nAspect "
      + (
        this.engine.getRenderWidth()
        / Math.max(1, this.engine.getRenderHeight())
      ).toFixed(2)
      + "\nFPS " + this.engine.getFps().toFixed(0)
      + "\nActors " + game.actors.length
      + "\nActiveMeshes " + this.scene.getActiveMeshes().length
      + "\nTotalMeshes " + this.scene.meshes.length
      + "\nCamera "
      + (this.scene.activeCamera ? this.scene.activeCamera.getClassName() : "none")
      + "\nDrawCalls "
      + String(
        this.engine._drawCalls?.current
        ?? this.engine._drawCalls?.lastSecAverage
        ?? this.engine._drawCalls
        ?? "n/a"
      )
      + "\nVFX " + this.vfx.active.length
      + "\nTime " + game.elapsedSeconds.toFixed(1) + "s";
  }
}
