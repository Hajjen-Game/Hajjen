import { GAME_HEIGHT, GAME_WIDTH } from "../core/constants.js";
import { createArenaWorldMapping } from "./ArenaWorldMapping.js?v=20261002-babylon1";
import {
  babylonObstacleVisualHeight,
  buildBabylonArenaGeometry,
} from "./BabylonArenaGeometry.js?v=20261002-babylon9";

const BABYLON_CDN_URL =
  "https://cdn.jsdelivr.net/npm/babylonjs@9.28.0/babylon.js";

let babylonLoadPromise = null;

function loadBabylon() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new Error("Babylon renderer requires a browser."));
  }
  if (window.BABYLON) return Promise.resolve(window.BABYLON);
  if (babylonLoadPromise) return babylonLoadPromise;

  babylonLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-arena3v3-babylon="true"]',
    );

    const finish = () => {
      if (window.BABYLON) resolve(window.BABYLON);
      else reject(new Error("Babylon.js loaded without exposing BABYLON."));
    };

    if (existing) {
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Babylon.js CDN load failed.")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = BABYLON_CDN_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.dataset.arena3v3Babylon = "true";
    script.addEventListener("load", finish, { once: true });
    script.addEventListener(
      "error",
      () => reject(new Error("Babylon.js CDN load failed.")),
      { once: true },
    );
    document.head.appendChild(script);
  });

  return babylonLoadPromise;
}

export class BabylonArenaRenderer {
  constructor(inputCanvas, arena) {
    this.inputCanvas = inputCanvas;
    this._arena = arena;
    this.BABYLON = null;
    this.view = null;
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.mapping = null;
    this.ambientLight = null;
    this.keyLight = null;
    this.fillLight = null;
    this.environment = null;
    this.shadowGenerator = null;
    this.glowLayer = null;
    this.ready = false;
    this.renderedArenaId = "";
  }

  async init() {
    const BABYLON = await loadBabylon();
    this.BABYLON = BABYLON;

    const view = document.createElement("canvas");
    view.className = "babylon-arena-canvas";
    view.width = GAME_WIDTH;
    view.height = GAME_HEIGHT;
    view.setAttribute("aria-hidden", "true");
    Object.assign(view.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      pointerEvents: "none",
      zIndex: "0",
    });

    this.inputCanvas.parentElement?.insertBefore(view, this.inputCanvas);
    this.view = view;

    const engine = new BABYLON.Engine(
      view,
      true,
      {
        preserveDrawingBuffer: false,
        stencil: true,
        doNotHandleContextLost: false,
      },
      false,
    );
    engine.setHardwareScalingLevel(1);
    engine.setSize(GAME_WIDTH, GAME_HEIGHT, false);
    this.engine = engine;

    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0.055, 0.045, 0.038, 1);
    scene.ambientColor = new BABYLON.Color3(0.20, 0.18, 0.16);
    scene.skipPointerMovePicking = true;
    scene.imageProcessingConfiguration.exposure = .98;
    scene.imageProcessingConfiguration.contrast = 1.08;
    if (BABYLON.ImageProcessingConfiguration?.TONEMAPPING_ACES != null) {
      scene.imageProcessingConfiguration.toneMappingEnabled = true;
      scene.imageProcessingConfiguration.toneMappingType =
        BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    }
    this.scene = scene;

    const camera = new BABYLON.FreeCamera(
      "arena-orthographic-camera",
      new BABYLON.Vector3(0, 96, -44),
      scene,
    );
    camera.mode = BABYLON.Camera.ORTHOGRAPHIC_CAMERA;
    camera.minZ = 0.1;
    camera.maxZ = 500;
    camera.setTarget(BABYLON.Vector3.Zero());
    scene.activeCamera = camera;
    this.camera = camera;

    const ambient = new BABYLON.HemisphericLight(
      "arena-ambient",
      new BABYLON.Vector3(0, 1, 0),
      scene,
    );
    ambient.intensity = 0.56;
    ambient.diffuse = new BABYLON.Color3(0.76, 0.72, 0.68);
    ambient.groundColor = new BABYLON.Color3(0.12, 0.09, 0.075);
    this.ambientLight = ambient;

    const key = new BABYLON.DirectionalLight(
      "arena-key",
      new BABYLON.Vector3(-0.34, -1, 0.42),
      scene,
    );
    key.position = new BABYLON.Vector3(18, 46, -28);
    key.intensity = 0.72;
    key.diffuse = new BABYLON.Color3(0.93, 0.79, 0.67);
    this.keyLight = key;

    const shadows = new BABYLON.ShadowGenerator(1024, key);
    shadows.useBlurExponentialShadowMap = true;
    shadows.blurKernel = 32;
    shadows.bias = 0.0008;
    shadows.normalBias = 0.02;
    shadows.setDarkness?.(.28);
    this.shadowGenerator = shadows;

    const fill = new BABYLON.DirectionalLight(
      "arena-camera-fill",
      new BABYLON.Vector3(0.22,-1,-0.38),
      scene,
    );
    fill.position = new BABYLON.Vector3(-12,36,26);
    fill.intensity = .24;
    fill.diffuse = new BABYLON.Color3(.72,.72,.70);
    this.fillLight = fill;

    // Emissive flame materials finally get a soft bloom halo instead of reading
    // as flat orange discs.
    const glowLayer=new BABYLON.GlowLayer("arena-fire-glow",scene,{
      blurKernelSize:32,
      mainTextureRatio:.50,
    });
    glowLayer.intensity=.62;
    this.glowLayer=glowLayer;

    await this.rebuildArena(this._arena);
    this.ready = true;
  }

  setArena(arena) {
    this._arena = arena;
    if (this.ready && arena?.id !== this.renderedArenaId) {
      this.rebuildArena(arena).catch(error => {
        console.error("[Babylon preview] arena rebuild failed", error);
      });
    }
  }

  async rebuildArena(arena) {
    if (!arena || !this.BABYLON || !this.scene || !this.camera) return;

    this.environment?.dispose?.();
    this.environment = null;

    this.mapping = createArenaWorldMapping(arena);
    const cameraPose = this.mapping.configureOrthographicCamera(this.camera, {
      cameraHeight: 96,
      cameraDepth: 44,
      padding: 1,
    });
    this.camera.position.set(0, cameraPose.cameraHeight, -cameraPose.cameraDepth);
    this.camera.setTarget(this.BABYLON.Vector3.Zero());

    const isWindscar=arena.id==="windscar-proving-grounds";
    if(isWindscar){
      this.scene.clearColor=new this.BABYLON.Color4(.045,.030,.024,1);
      this.scene.ambientColor=new this.BABYLON.Color3(.16,.13,.11);
      if(this.ambientLight){
        this.ambientLight.intensity=.48;
        this.ambientLight.diffuse=new this.BABYLON.Color3(.74,.66,.60);
        this.ambientLight.groundColor=new this.BABYLON.Color3(.10,.065,.050);
      }
      if(this.keyLight){
        this.keyLight.intensity=.74;
        this.keyLight.diffuse=new this.BABYLON.Color3(.91,.70,.55);
      }
      if(this.fillLight){
        this.fillLight.intensity=.20;
        this.fillLight.diffuse=new this.BABYLON.Color3(.68,.66,.63);
      }
      this.glowLayer.intensity=.72;
    }else{
      this.scene.clearColor=new this.BABYLON.Color4(.027,.038,.028,1);
      this.scene.ambientColor=new this.BABYLON.Color3(.12,.17,.12);
      if(this.ambientLight){
        this.ambientLight.intensity=.56;
        this.ambientLight.diffuse=new this.BABYLON.Color3(.66,.75,.64);
        this.ambientLight.groundColor=new this.BABYLON.Color3(.07,.10,.07);
      }
      if(this.keyLight){
        this.keyLight.intensity=.66;
        this.keyLight.diffuse=new this.BABYLON.Color3(.78,.82,.70);
      }
      if(this.fillLight){
        this.fillLight.intensity=.18;
        this.fillLight.diffuse=new this.BABYLON.Color3(.68,.72,.66);
      }
      this.glowLayer.intensity=.35;
    }

    const environment = buildBabylonArenaGeometry(
      this.BABYLON,
      this.scene,
      arena,
      this.mapping,
    );
    this.environment = environment;

    for (const mesh of environment.shadowCasters || []) {
      this.shadowGenerator?.addShadowCaster?.(mesh, true);
    }

    this.renderedArenaId = arena.id;
  }

  render() {
    if (!this.ready || !this.scene) return;
    this.environment?.animate?.(performance.now()/1000);
    this.scene.render();
  }

  getOcclusionPolygons() {
    if (!this.ready || !this.mapping || !this._arena) return [];

    const polygons = [];

    for (const obstacle of this._arena.obstacles || []) {
      const rect = this.mapping.rectToWorld(obstacle);
      const height = babylonObstacleVisualHeight(rect);
      const capHeight = 0.52;
      const topElevation = height + capHeight;

      const x0 = Number(obstacle.x);
      const x1 = x0 + Number(obstacle.w);
      const y0 = Number(obstacle.y);
      const y1 = y0 + Number(obstacle.h);

      const top = [
        this.projectGamePoint(x0, y0, topElevation),
        this.projectGamePoint(x1, y0, topElevation),
        this.projectGamePoint(x1, y1, topElevation),
        this.projectGamePoint(x0, y1, topElevation),
      ];

      // The camera sits on the negative world-Z side. In game coordinates that
      // makes the obstacle's larger-Y edge the near/front vertical face.
      const front = [
        this.projectGamePoint(x0, y1, 0),
        this.projectGamePoint(x1, y1, 0),
        this.projectGamePoint(x1, y1, topElevation),
        this.projectGamePoint(x0, y1, topElevation),
      ];

      if (front.every(Boolean)) {
        polygons.push({
          points: front,
          depthY: y1,
          color: 0x3a2118,
          alpha: .76,
        });
      }
      if (top.every(Boolean)) {
        polygons.push({
          points: top,
          depthY: y1,
          color: 0x76503a,
          alpha: .68,
        });
      }
    }

    return polygons;
  }

  projectGamePoint(x, y, elevation = 0) {
    if (!this.mapping) return null;
    const world = this.mapping.gameToWorld(x, y, elevation);
    return this.mapping.worldToScreen(
      this.BABYLON,
      this.scene,
      this.camera,
      this.engine,
      world,
    );
  }

  destroy() {
    this.ready = false;
    this.environment?.dispose?.();
    this.environment = null;
    this.shadowGenerator?.dispose?.();
    this.shadowGenerator = null;
    this.glowLayer?.dispose?.();
    this.glowLayer = null;
    this.scene?.dispose?.();
    this.scene = null;
    this.engine?.dispose?.();
    this.engine = null;
    this.view?.remove();
    this.view = null;
    this.camera = null;
    this.mapping = null;
  }
}
