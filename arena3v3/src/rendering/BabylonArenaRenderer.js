import { GAME_HEIGHT, GAME_WIDTH } from "../core/constants.js";
import { createArenaWorldMapping } from "./ArenaWorldMapping.js?v=20261002-babylon1";
import {
  babylonObstacleVisualHeight,
  buildBabylonArenaGeometry,
} from "./BabylonArenaGeometry.js?v=20261002-babylon19";

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
    this.defaultPipeline = null;
    this.ssaoPipeline = null;
    this.environmentHelper = null;
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
    scene.imageProcessingConfiguration.exposure = .92;
    scene.imageProcessingConfiguration.contrast = 1.10;
    scene.imageProcessingConfiguration.vignetteEnabled = true;
    scene.imageProcessingConfiguration.vignetteWeight = 1.34;
    scene.imageProcessingConfiguration.vignetteStretch = .18;
    scene.imageProcessingConfiguration.vignetteColor =
      new BABYLON.Color4(.09,.045,.028,1);
    scene.imageProcessingConfiguration.vignetteBlendMode =
      BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
    scene.imageProcessingConfiguration.ditheringEnabled = true;
    scene.imageProcessingConfiguration.ditheringIntensity = .012;
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

    const shadows = new BABYLON.ShadowGenerator(2048, key);
    shadows.bias = 0.00065;
    shadows.normalBias = 0.018;
    shadows.setDarkness?.(.31);
    if(
      engine.webGLVersion > 1 &&
      "useContactHardeningShadow" in shadows
    ){
      shadows.useContactHardeningShadow = true;
      shadows.contactHardeningLightSizeUVRatio = .045;
    }else{
      shadows.useBlurExponentialShadowMap = true;
      shadows.blurKernel = 32;
    }
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
    glowLayer.intensity=.48;
    this.glowLayer=glowLayer;

    // Babylon's default environment provides the IBL that PBR materials need.
    // No skybox or helper ground is rendered; this only lights/refines materials.
    try{
      this.environmentHelper=scene.createDefaultEnvironment?.({
        createGround:false,
        createSkybox:false,
      })||null;
      if(scene.environmentTexture){
        scene.environmentTexture.level=.62;
      }
    }catch(error){
      console.warn("[Babylon preview] environment IBL unavailable",error);
      this.environmentHelper=null;
    }

    // Use Babylon's HDR post-processing stack instead of relying only on
    // StandardMaterial + GlowLayer.
    if(BABYLON.DefaultRenderingPipeline){
      const pipeline=new BABYLON.DefaultRenderingPipeline(
        "arena-default-pipeline",
        true,
        scene,
        [camera],
      );
      pipeline.samples=Math.max(
        1,
        Math.min(4,engine.getCaps?.().maxMSAASamples||1),
      );
      pipeline.fxaaEnabled=true;
      pipeline.bloomEnabled=true;
      pipeline.bloomThreshold=.76;
      pipeline.bloomWeight=.22;
      pipeline.bloomKernel=48;
      pipeline.bloomScale=.50;
      pipeline.sharpenEnabled=true;
      if(pipeline.sharpen){
        pipeline.sharpen.edgeAmount=.16;
        pipeline.sharpen.colorAmount=.85;
      }
      pipeline.imageProcessingEnabled=true;
      this.defaultPipeline=pipeline;
    }

    // SSAO gives the low-poly masonry real contact depth between plinths,
    // buttresses, battlements and the floor. Keep it moderate for readability.
    if(BABYLON.SSAO2RenderingPipeline){
      try{
        const ssao=new BABYLON.SSAO2RenderingPipeline(
          "arena-ssao",
          scene,
          {ssaoRatio:.72,blurRatio:.55},
          [camera],
        );
        ssao.radius=1.65;
        ssao.totalStrength=.72;
        ssao.base=.18;
        ssao.samples=8;
        ssao.maxZ=140;
        ssao.minZAspect=.20;
        ssao.expensiveBlur=true;
        this.ssaoPipeline=ssao;
      }catch(error){
        console.warn("[Babylon preview] SSAO unavailable",error);
        this.ssaoPipeline=null;
      }
    }

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
      cameraHeight: 90,
      cameraDepth: 50,
      padding: 1,
    });
    this.camera.position.set(0, cameraPose.cameraHeight, -cameraPose.cameraDepth);
    this.camera.setTarget(this.BABYLON.Vector3.Zero());

    const isBastion=arena.id==="emberwatch-bastion";
    const isWindscar=arena.id==="windscar-proving-grounds";
    if(this.scene.environmentTexture){
      this.scene.environmentTexture.level=isBastion?.43:.62;
    }
    if(isBastion){
      this.scene.clearColor=new this.BABYLON.Color4(.050,.031,.024,1);
      this.scene.ambientColor=new this.BABYLON.Color3(.15,.115,.10);
      this.scene.imageProcessingConfiguration.vignetteEnabled=true;
      this.scene.imageProcessingConfiguration.vignetteWeight=.54;
      this.scene.imageProcessingConfiguration.vignetteStretch=.05;
      this.scene.imageProcessingConfiguration.exposure=1.03;
      this.scene.imageProcessingConfiguration.contrast=1.11;
      if(this.ambientLight){
        this.ambientLight.intensity=.40;
        this.ambientLight.diffuse=new this.BABYLON.Color3(.56,.63,.74);
        this.ambientLight.groundColor=new this.BABYLON.Color3(.12,.065,.045);
      }
      if(this.keyLight){
        this.keyLight.intensity=1.30;
        this.keyLight.diffuse=new this.BABYLON.Color3(1.0,.68,.42);
      }
      if(this.fillLight){
        this.fillLight.intensity=.16;
        this.fillLight.diffuse=new this.BABYLON.Color3(.42,.52,.66);
      }
      this.glowLayer.intensity=.68;
      this.shadowGenerator?.setDarkness?.(.39);
    }else if(isWindscar){
      this.shadowGenerator?.setDarkness?.(.31);
      this.scene.clearColor=new this.BABYLON.Color4(.038,.026,.022,1);
      this.scene.ambientColor=new this.BABYLON.Color3(.135,.108,.090);
      this.scene.imageProcessingConfiguration.vignetteEnabled=true;
      this.scene.imageProcessingConfiguration.vignetteWeight=1.34;
      this.scene.imageProcessingConfiguration.vignetteStretch=.18;
      this.scene.imageProcessingConfiguration.exposure=.91;
      this.scene.imageProcessingConfiguration.contrast=1.12;
      if(this.ambientLight){
        this.ambientLight.intensity=.44;
        this.ambientLight.diffuse=new this.BABYLON.Color3(.67,.59,.53);
        this.ambientLight.groundColor=new this.BABYLON.Color3(.055,.038,.033);
      }
      if(this.keyLight){
        this.keyLight.intensity=.94;
        this.keyLight.diffuse=new this.BABYLON.Color3(.95,.73,.56);
      }
      if(this.fillLight){
        this.fillLight.intensity=.20;
        this.fillLight.diffuse=new this.BABYLON.Color3(.60,.59,.58);
      }
      this.glowLayer.intensity=.56;
    }else{
      this.shadowGenerator?.setDarkness?.(.31);
      this.scene.imageProcessingConfiguration.vignetteEnabled=false;
      this.scene.imageProcessingConfiguration.exposure=.98;
      this.scene.imageProcessingConfiguration.contrast=1.08;
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
      const isBastion=this._arena.id==="emberwatch-bastion";
      const isWindscar=this._arena.id==="windscar-proving-grounds";
      const isCenterWall=isWindscar && obstacle.id==="center-wall";
      const baseHeight=babylonObstacleVisualHeight(rect);
      const height=isBastion
        ? (obstacle.id.includes("rampart")?3.82:5.20)
        : isWindscar
          ? (isCenterWall?5.72:6.10)
          : baseHeight;
      const capHeight=isBastion?.18:(isWindscar?.18:.52);
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
          color: 0x4a3025,
          alpha: .76,
        });
      }
      if (top.every(Boolean)) {
        polygons.push({
          points: top,
          depthY: y1,
          color: 0x8b644a,
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
    this.ssaoPipeline?.dispose?.();
    this.ssaoPipeline = null;
    this.defaultPipeline?.dispose?.();
    this.defaultPipeline = null;
    this.environmentHelper?.dispose?.();
    this.environmentHelper = null;
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
