import { CustomMiniCharacterRenderer } from "./CustomMiniCharacterRenderer.js?v=20261007-orbs-v2-void";
import { OrbCharacterRenderer } from "./OrbCharacterRenderer.js?v=20261008-orbs-v9-energycore";
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
    this.orbMode = window.location.pathname.toLowerCase().endsWith("/orbs.html");
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
    const baseRadius = this.orbMode ? 24.10 : 23.45;

    this.camera.target.set(centerX, 0, centerZ);
    this.camera.alpha = -Math.PI / 2;
    this.camera.beta = this.orbMode ? 0.43 : 0.30;
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
      this.orbMode ? 0.43 : 0.30,
      this.orbMode ? 24.10 : 23.45,
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

    if (this.orbMode) {
      this.buildOrbArena();
    } else {
      this.buildGround();
      this.buildCanyonPerimeter();
      this.buildLosFormations();
      this.buildEdgeDetails();
    }

    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname.toLowerCase();
    const ActorRenderer = this.orbMode
      ? OrbCharacterRenderer
      : CustomMiniCharacterRenderer;

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
    this.glow.intensity = this.orbMode ? 0.40 : 0.18;

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

  buildOrbArena() {
    const a = this.arena;
    const w = a.width * S;
    const h = a.height * S;

    this.scene.clearColor = BABYLON.Color4.FromHexString("#000107ff");
    this.scene.ambientColor = new BABYLON.Color3(0.018,0.024,0.036);
    this.scene.imageProcessingConfiguration.contrast = 1.24;
    this.scene.imageProcessingConfiguration.exposure = 0.82;

    const makeGlass=(name,hex,alpha,edgeStrength=0.85)=>{
      const m=new BABYLON.StandardMaterial(name,this.scene);
      const cc=color(hex);
      m.diffuseColor=cc.scale(0.10);
      m.emissiveColor=cc.scale(0.012);
      m.specularColor=cc.scale(0.82);
      m.specularPower=128;
      m.alpha=alpha;
      m.backFaceCulling=false;
      m.needDepthPrePass=true;

      if(BABYLON.Material?.MATERIAL_ALPHABLEND!==undefined){
        m.transparencyMode=BABYLON.Material.MATERIAL_ALPHABLEND;
      }

      if(BABYLON.FresnelParameters){
        const fresnel=new BABYLON.FresnelParameters();
        fresnel.bias=0.04;
        fresnel.power=3.4;
        fresnel.leftColor=BABYLON.Color3.White().scale(edgeStrength);
        fresnel.rightColor=BABYLON.Color3.Black();
        m.opacityFresnelParameters=fresnel;

        const emissiveFresnel=new BABYLON.FresnelParameters();
        emissiveFresnel.bias=0.02;
        emissiveFresnel.power=4.4;
        emissiveFresnel.leftColor=cc.scale(0.28);
        emissiveFresnel.rightColor=BABYLON.Color3.Black();
        m.emissiveFresnelParameters=emissiveFresnel;
      }

      return m;
    };

    const edgeMat=new BABYLON.StandardMaterial(
      "orb-glass-edge-mat",
      this.scene,
    );
    edgeMat.diffuseColor=new BABYLON.Color3(0.40,0.78,1.00);
    edgeMat.emissiveColor=new BABYLON.Color3(0.12,0.78,1.00);
    edgeMat.specularColor=new BABYLON.Color3(0.94,0.98,1.00);
    edgeMat.specularPower=220;
    edgeMat.alpha=1.00;
    edgeMat.disableLighting=true;

    const hotEdgeMat=edgeMat.clone("orb-glass-hot-edge-mat");
    hotEdgeMat.diffuseColor=new BABYLON.Color3(0.82,0.95,1.00);
    hotEdgeMat.emissiveColor=new BABYLON.Color3(0.34,0.86,1.00);
    hotEdgeMat.specularColor=BABYLON.Color3.White();
    hotEdgeMat.alpha=0.92;

    const groundMat=makeGlass(
      "orb-arena-ground-mat",
      "#d6dde4",
      0.026,
      0.38,
    );

    const ground=BABYLON.MeshBuilder.CreateBox(
      "orb-arena-ground",
      {width:w,depth:h,height:0.065},
      this.scene,
    );
    ground.position.set(w*0.5,-0.015,h*0.5);
    ground.material=groundMat;
    ground.receiveShadows=false;
    ground.metadata={ground:true};
    ground.isPickable=true;
    this.ground=ground;

    const underMat=makeGlass(
      "orb-arena-under-mat",
      "#111827",
      0.018,
      0.28,
    );
    const under=BABYLON.MeshBuilder.CreateBox(
      "orb-arena-under",
      {width:w*0.992,depth:h*0.992,height:0.26},
      this.scene,
    );
    under.position.set(w*0.5,-0.24,h*0.5);
    under.material=underMat;
    under.isPickable=false;

    const pad=a.boundaryPadding*S;
    const innerW=w-pad*2;
    const innerH=h-pad*2;
    const rail=0.012;
    const railY=0.085;

    const frameGlassMat=makeGlass(
      "orb-frame-glass-mat",
      "#d2dce6",
      0.055,
      0.62,
    );

    const frameThickness=0.20;
    const frameHeight=0.28;
    const frameGlassBars=[
      {name:"n",x:w*0.5,z:pad,width:innerW+frameThickness,depth:frameThickness},
      {name:"s",x:w*0.5,z:h-pad,width:innerW+frameThickness,depth:frameThickness},
      {name:"w",x:pad,z:h*0.5,width:frameThickness,depth:innerH+frameThickness},
      {name:"e",x:w-pad,z:h*0.5,width:frameThickness,depth:innerH+frameThickness},
    ];
    for(const b of frameGlassBars){
      const bar=BABYLON.MeshBuilder.CreateBox(
        "orb-frame-glass:"+b.name,
        {width:b.width,depth:b.depth,height:frameHeight},
        this.scene,
      );
      bar.position.set(b.x,frameHeight*0.5-0.01,b.z);
      bar.material=frameGlassMat;
      bar.isPickable=false;
    }

    const makeRail=(name,x,z,width,depth,y=railY,material=edgeMat)=>{
      const mesh=BABYLON.MeshBuilder.CreateBox(
        name,
        {width,depth,height:0.032},
        this.scene,
      );
      mesh.position.set(x,y,z);
      mesh.material=material;
      mesh.isPickable=false;
      return mesh;
    };

    const makeHotRail=(name,x,z,width,depth,y=railY)=>{
      const mesh=BABYLON.MeshBuilder.CreateBox(
        name,
        {width,depth,height:0.015},
        this.scene,
      );
      mesh.position.set(x,y,z);
      mesh.material=hotEdgeMat;
      mesh.isPickable=false;
      return mesh;
    };

    // Crisp top edge + a faint inner highlight give the glass frame real thickness.
    makeRail("orb-frame-n",w*0.5,pad,innerW,rail,0.145);
    makeRail("orb-frame-s",w*0.5,h-pad,innerW,rail,0.145);
    makeRail("orb-frame-w",pad,h*0.5,rail,innerH,0.145);
    makeRail("orb-frame-e",w-pad,h*0.5,rail,innerH,0.145);

    const hotRail=0.0045;
    makeHotRail("orb-frame-hot-n",w*0.5,pad,innerW,hotRail,0.158);
    makeHotRail("orb-frame-hot-s",w*0.5,h-pad,innerW,hotRail,0.158);
    makeHotRail("orb-frame-hot-w",pad,h*0.5,hotRail,innerH,0.158);
    makeHotRail("orb-frame-hot-e",w-pad,h*0.5,hotRail,innerH,0.158);

    const innerEdgeMat=edgeMat.clone("orb-glass-edge-inner-mat");
    innerEdgeMat.alpha=0.28;
    innerEdgeMat.emissiveColor=edgeMat.emissiveColor.scale(0.34);
    const inset=0.11;
    makeRail("orb-frame-inner-n",w*0.5,pad+inset,innerW-inset*2,rail*0.70,0.060,innerEdgeMat);
    makeRail("orb-frame-inner-s",w*0.5,h-pad-inset,innerW-inset*2,rail*0.70,0.060,innerEdgeMat);
    makeRail("orb-frame-inner-w",pad+inset,h*0.5,rail*0.70,innerH-inset*2,0.060,innerEdgeMat);
    makeRail("orb-frame-inner-e",w-pad-inset,h*0.5,rail*0.70,innerH-inset*2,0.060,innerEdgeMat);

    // Subtle second frame below the slab makes the glass thickness readable.
    const lowerEdgeMat=edgeMat.clone("orb-glass-edge-lower-mat");
    lowerEdgeMat.alpha=0.24;
    lowerEdgeMat.emissiveColor=edgeMat.emissiveColor.scale(0.28);
    makeRail("orb-frame-under-n",w*0.5,pad,innerW,rail,-0.285,lowerEdgeMat);
    makeRail("orb-frame-under-s",w*0.5,h-pad,innerW,rail,-0.285,lowerEdgeMat);
    makeRail("orb-frame-under-w",pad,h*0.5,rail,innerH,-0.285,lowerEdgeMat);
    makeRail("orb-frame-under-e",w-pad,h*0.5,rail,innerH,-0.285,lowerEdgeMat);

    const obstacleMat=makeGlass(
      "orb-los-mat",
      "#dfe7ed",
      0.028,
      0.44,
    );
    const topMat=makeGlass(
      "orb-los-top-mat",
      "#eef4f8",
      0.024,
      0.50,
    );

    const makeObstacleEdges=(o,x,z,ow,od)=>{
      const topY=1.305;
      const vThickness=0.009;
      const topRail=0.010;

      makeRail(
        "orb-los-edge-n:"+o.id,
        x,
        z-od*0.5,
        ow,
        topRail,
        topY,
      );
      makeRail(
        "orb-los-edge-s:"+o.id,
        x,
        z+od*0.5,
        ow,
        topRail,
        topY,
      );
      makeRail(
        "orb-los-edge-w:"+o.id,
        x-ow*0.5,
        z,
        topRail,
        od,
        topY,
      );
      makeRail(
        "orb-los-edge-e:"+o.id,
        x+ow*0.5,
        z,
        topRail,
        od,
        topY,
      );

      const hot=0.0040;
      makeHotRail("orb-los-hot-n:"+o.id,x,z-od*0.5,ow,hot,topY+0.014);
      makeHotRail("orb-los-hot-s:"+o.id,x,z+od*0.5,ow,hot,topY+0.014);
      makeHotRail("orb-los-hot-w:"+o.id,x-ow*0.5,z,hot,od,topY+0.014);
      makeHotRail("orb-los-hot-e:"+o.id,x+ow*0.5,z,hot,od,topY+0.014);

      const corners=[
        [x-ow*0.5,z-od*0.5],
        [x+ow*0.5,z-od*0.5],
        [x-ow*0.5,z+od*0.5],
        [x+ow*0.5,z+od*0.5],
      ];
      corners.forEach(([cx,cz],i)=>{
        const post=BABYLON.MeshBuilder.CreateBox(
          "orb-los-post:"+o.id+":"+i,
          {
            width:vThickness,
            depth:vThickness,
            height:1.27,
          },
          this.scene,
        );
        post.position.set(cx,0.67,cz);
        post.material=edgeMat;
        post.isPickable=false;
      });
    };

    for(const o of a.obstacles){
      const ow=o.w*S;
      const od=o.h*S;
      const x=(o.x+o.w*0.5)*S;
      const z=(o.y+o.h*0.5)*S;

      const body=BABYLON.MeshBuilder.CreateBox(
        "orb-los:"+o.id,
        {width:ow,depth:od,height:1.28},
        this.scene,
      );
      body.position.set(x,0.64,z);
      body.material=obstacleMat;
      body.receiveShadows=false;
      body.metadata={obstacleId:o.id};
      body.isPickable=false;

      const top=BABYLON.MeshBuilder.CreateBox(
        "orb-los-top:"+o.id,
        {width:ow*0.96,depth:od*0.96,height:0.035},
        this.scene,
      );
      top.position.set(x,1.295,z);
      top.material=topMat;
      top.receiveShadows=false;
      top.isPickable=false;

      makeObstacleEdges(o,x,z,ow,od);
    }

    const lineMat=new BABYLON.StandardMaterial(
      "orb-floor-line-mat",
      this.scene,
    );
    lineMat.diffuseColor=new BABYLON.Color3(0.16,0.24,0.34);
    lineMat.emissiveColor=new BABYLON.Color3(0.035,0.065,0.11);
    lineMat.alpha=0.16;
    lineMat.disableLighting=true;

    const center=BABYLON.MeshBuilder.CreateTorus(
      "orb-arena-center",
      {diameter:2.7,thickness:0.022,tessellation:64},
      this.scene,
    );
    center.position.set(w*0.5,0.025,h*0.5);
    center.material=lineMat;
    center.isPickable=false;

    // Bright readable procedural space backdrop far below the glass.
    // Unlike the transparent nebula layers, this gives the eye a real "space below" reference.
    const spaceBackdropTexture=new BABYLON.DynamicTexture(
      "orb-space-backdrop-texture",
      {width:1024,height:512},
      this.scene,
      false,
    );
    const sbctx=spaceBackdropTexture.getContext();
    sbctx.fillStyle="#020612";
    sbctx.fillRect(0,0,1024,512);

    const cloud=(x,y,r,c0,c1)=>{
      const g=sbctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,c0);
      g.addColorStop(0.42,c1);
      g.addColorStop(1,"rgba(0,0,0,0)");
      sbctx.fillStyle=g;
      sbctx.fillRect(x-r,y-r,r*2,r*2);
    };

    cloud(165,355,190,"rgba(42,78,210,0.18)","rgba(18,24,84,0.035)");
    cloud(760,340,210,"rgba(92,44,210,0.17)","rgba(42,18,88,0.032)");
    cloud(530,455,145,"rgba(24,96,185,0.12)","rgba(12,36,76,0.025)");

    for(let i=0;i<170;i++){
      const x=(i*619)%1019;
      const y=(i*283+71)%509;
      const size=i%19===0?2.6:i%7===0?1.7:0.75;
      const a=i%11===0?0.95:0.48+(i%5)*0.08;
      sbctx.fillStyle=`rgba(180,220,255,${a})`;
      sbctx.beginPath();
      sbctx.arc(x,y,size,0,Math.PI*2);
      sbctx.fill();

      if(i%23===0){
        sbctx.strokeStyle="rgba(120,180,255,0.42)";
        sbctx.lineWidth=0.7;
        sbctx.beginPath();
        sbctx.moveTo(x-5,y);
        sbctx.lineTo(x+5,y);
        sbctx.moveTo(x,y-5);
        sbctx.lineTo(x,y+5);
        sbctx.stroke();
      }
    }

    spaceBackdropTexture.hasAlpha=false;
    spaceBackdropTexture.update();

    const spaceBackdropMat=new BABYLON.StandardMaterial(
      "orb-space-backdrop-mat",
      this.scene,
    );
    spaceBackdropMat.diffuseTexture=spaceBackdropTexture;
    spaceBackdropMat.emissiveColor=new BABYLON.Color3(0.045,0.055,0.085);
    spaceBackdropMat.specularColor=BABYLON.Color3.Black();
    spaceBackdropMat.disableLighting=true;
    spaceBackdropMat.backFaceCulling=false;

    const spaceBackdrop=BABYLON.MeshBuilder.CreatePlane(
      "orb-space-backdrop",
      {
        width:w*1.55,
        height:h*1.90,
        sideOrientation:BABYLON.Mesh.DOUBLESIDE,
      },
      this.scene,
    );
    spaceBackdrop.rotation.x=Math.PI/2;
    spaceBackdrop.position.set(w*0.50,-4.35,h*0.50);
    spaceBackdrop.material=spaceBackdropMat;
    spaceBackdrop.isPickable=false;
    this.orbSpaceBackdrop=spaceBackdrop;
    this.orbSpaceBackdropTexture=spaceBackdropTexture;

    // Mid-depth stars: a distinct layer between the near drifting motes
    // and the far backdrop, so the transparent glass has visible depth/parallax.
    const midStarMat=new BABYLON.StandardMaterial(
      "orb-mid-star-mat",
      this.scene,
    );
    midStarMat.diffuseColor=new BABYLON.Color3(0.68,0.82,1.00);
    midStarMat.emissiveColor=new BABYLON.Color3(0.28,0.52,1.00);
    midStarMat.alpha=0.72;
    midStarMat.disableLighting=true;

    this.orbMidStars=[];
    for(let i=0;i<54;i++){
      const star=BABYLON.MeshBuilder.CreateSphere(
        "orb-mid-stars:"+i,
        {diameter:0.018+(i%9===0?0.038:(i%4)*0.005),segments:5},
        this.scene,
      );
      const u=((i*47+11)%109)/108;
      const v=((i*71+23)%113)/112;
      star.position.set(
        pad+u*innerW,
        -1.55-(i%4)*0.22,
        pad+v*innerH,
      );
      star.material=midStarMat;
      star.isPickable=false;
      this.orbMidStars.push({
        mesh:star,
        baseY:star.position.y,
        phase:i*0.51,
      });
    }

    // Soft procedural nebula layers far below the glass. They provide a readable
    // sense of space/depth without turning the arena itself into a busy texture.
    const nebulaTexture=new BABYLON.DynamicTexture(
      "orb-nebula-texture",
      {width:512,height:256},
      this.scene,
      false,
    );
    const nctx=nebulaTexture.getContext();
    nctx.clearRect(0,0,512,256);

    const addNebulaCloud=(x,y,r,inner,outer)=>{
      const g=nctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,inner);
      g.addColorStop(0.38,inner.replace(/0\.([0-9]+)\)/,"0.20)"));
      g.addColorStop(0.72,outer);
      g.addColorStop(1,"rgba(0,0,0,0)");
      nctx.fillStyle=g;
      nctx.fillRect(x-r,y-r,r*2,r*2);
    };

    addNebulaCloud(108,142,120,"rgba(50,94,255,0.34)","rgba(20,42,130,0.05)");
    addNebulaCloud(256,104,150,"rgba(58,146,255,0.28)","rgba(16,50,120,0.04)");
    addNebulaCloud(402,160,135,"rgba(130,74,255,0.30)","rgba(55,24,130,0.05)");
    addNebulaCloud(314,214,110,"rgba(30,180,255,0.20)","rgba(12,70,130,0.03)");
    nebulaTexture.hasAlpha=true;
    nebulaTexture.update();

    const nebulaMat=new BABYLON.StandardMaterial(
      "orb-nebula-mat",
      this.scene,
    );
    nebulaMat.diffuseTexture=nebulaTexture;
    nebulaMat.emissiveTexture=nebulaTexture;
    nebulaMat.opacityTexture=nebulaTexture;
    nebulaMat.diffuseColor=new BABYLON.Color3(0.20,0.30,0.58);
    nebulaMat.emissiveColor=new BABYLON.Color3(0.18,0.38,0.78);
    nebulaMat.alpha=0.18;
    nebulaMat.backFaceCulling=false;
    nebulaMat.disableLighting=true;
    nebulaMat.useAlphaFromDiffuseTexture=true;

    const nebula=BABYLON.MeshBuilder.CreatePlane(
      "orb-nebula-layer-a",
      {width:w*1.32,height:h*1.55,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene,
    );
    nebula.rotation.x=Math.PI/2;
    nebula.rotation.z=-0.10;
    nebula.position.set(w*0.50,-2.85,h*0.53);
    nebula.material=nebulaMat;
    nebula.isPickable=false;

    const nebulaMatB=nebulaMat.clone("orb-nebula-mat-b");
    nebulaMatB.alpha=0.10;
    nebulaMatB.emissiveColor=new BABYLON.Color3(0.34,0.16,0.62);

    const nebulaB=BABYLON.MeshBuilder.CreatePlane(
      "orb-nebula-layer-b",
      {width:w*1.55,height:h*1.82,sideOrientation:BABYLON.Mesh.DOUBLESIDE},
      this.scene,
    );
    nebulaB.rotation.x=Math.PI/2;
    nebulaB.rotation.z=0.16;
    nebulaB.position.set(w*0.48,-3.65,h*0.46);
    nebulaB.scaling.set(1.08,1.08,1.08);
    nebulaB.material=nebulaMatB;
    nebulaB.isPickable=false;

    this.orbNebulaLayers=[
      {mesh:nebula,baseY:nebula.position.y,phase:0.3,speed:0.000018},
      {mesh:nebulaB,baseY:nebulaB.position.y,phase:2.1,speed:-0.000012},
    ];
    this.orbNebulaTexture=nebulaTexture;

    // Soft particle field physically below the transparent arena.
    const particleTexture=new BABYLON.DynamicTexture(
      "orb-under-space-particle",
      {width:32,height:32},
      this.scene,
      false,
    );
    const ctx=particleTexture.getContext();
    const gradient=ctx.createRadialGradient(16,16,0,16,16,16);
    gradient.addColorStop(0,"rgba(190,225,255,1)");
    gradient.addColorStop(0.20,"rgba(120,185,255,0.85)");
    gradient.addColorStop(0.55,"rgba(60,110,210,0.30)");
    gradient.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,32,32);
    particleTexture.hasAlpha=true;
    particleTexture.update();

    const spaceParticles=new BABYLON.ParticleSystem(
      "orb-under-space",
      520,
      this.scene,
    );
    spaceParticles.particleTexture=particleTexture;
    spaceParticles.emitter=new BABYLON.Vector3(w*0.5,-0.36,h*0.5);
    spaceParticles.minEmitBox=new BABYLON.Vector3(
      -w*0.48,
      -1.15,
      -h*0.48,
    );
    spaceParticles.maxEmitBox=new BABYLON.Vector3(
      w*0.48,
      -0.10,
      h*0.48,
    );
    spaceParticles.color1=new BABYLON.Color4(0.36,0.66,1.00,0.32);
    spaceParticles.color2=new BABYLON.Color4(0.78,0.92,1.00,0.46);
    spaceParticles.colorDead=new BABYLON.Color4(0.04,0.09,0.18,0);
    spaceParticles.minSize=0.020;
    spaceParticles.maxSize=0.080;
    spaceParticles.minLifeTime=9;
    spaceParticles.maxLifeTime=18;
    spaceParticles.emitRate=24;
    spaceParticles.preWarmCycles=180;
    spaceParticles.preWarmStepOffset=4;
    spaceParticles.direction1=new BABYLON.Vector3(-0.020,0.010,-0.016);
    spaceParticles.direction2=new BABYLON.Vector3(0.020,0.030,0.016);
    spaceParticles.minEmitPower=0.018;
    spaceParticles.maxEmitPower=0.055;
    spaceParticles.updateSpeed=0.012;
    spaceParticles.gravity=BABYLON.Vector3.Zero();
    spaceParticles.blendMode=BABYLON.ParticleSystem.BLENDMODE_ADD;
    spaceParticles.start();
    this.orbSpaceParticles=spaceParticles;
    this.orbSpaceParticleTexture=particleTexture;

    // A handful of larger, dim motes adds depth/parallax below the glass.
    const moteMat=new BABYLON.StandardMaterial(
      "orb-under-mote-mat",
      this.scene,
    );
    moteMat.diffuseColor=new BABYLON.Color3(0.10,0.18,0.32);
    moteMat.emissiveColor=new BABYLON.Color3(0.035,0.075,0.16);
    moteMat.alpha=0.28;
    moteMat.disableLighting=true;

    this.orbVoidMotes=[];
    for(let i=0;i<24;i++){
      const mote=BABYLON.MeshBuilder.CreatePolyhedron(
        "orb-under-mote:"+i,
        {type:2,size:0.020+(i%5)*0.008},
        this.scene,
      );
      const u=((i*37)%101)/100;
      const v=((i*61+17)%103)/102;
      mote.position.set(
        pad+u*innerW,
        -0.55-(i%6)*0.28,
        pad+v*innerH,
      );
      mote.material=moteMat;
      mote.isPickable=false;
      this.orbVoidMotes.push({
        mesh:mote,
        baseY:mote.position.y,
        phase:i*0.73,
      });
    }
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

  animateOrbVoid(now) {
    if (!this.orbMode || !this.orbVoidMotes) return;

    for (const mote of this.orbVoidMotes) {
      mote.mesh.position.y =
        mote.baseY + Math.sin(now*0.00045+mote.phase)*0.10;
      mote.mesh.rotation.x = now*0.00010 + mote.phase;
      mote.mesh.rotation.y = -now*0.00013 + mote.phase*0.7;
    }

    for (const layer of this.orbNebulaLayers || []) {
      layer.mesh.rotation.z += layer.speed;
      layer.mesh.position.y =
        layer.baseY + Math.sin(now*0.00012+layer.phase)*0.06;
    }

    for (const star of this.orbMidStars || []) {
      star.mesh.position.y =
        star.baseY + Math.sin(now*0.00020+star.phase)*0.035;
    }
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
    this.animateOrbVoid(now);
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
