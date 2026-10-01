import { GAME_HEIGHT, GAME_WIDTH } from "../core/constants.js";
import { classColorFor } from "../content/classes/classColors.js";
import { classIconUrlFor } from "./ClassIconRegistry.js";
import { castBarPaletteFor } from "./CastPalette.js?v=20260928-focusrestyle1";
import { drawGrandRingEnvironment } from "./GrandRingEnvironment.js?v=20261001-grandring7";
import { drawWindscarEnvironment } from "./WindscarEnvironment.js?v=20261001-windscar2";

const PIXI_MODULE_URL = "https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
const CLASS_IDS = Object.freeze([
  "priest",
  "druid",
  "paladin",
  "warrior",
  "rogue",
  "death-knight",
  "mage",
  "warlock",
  "shaman",
]);

function hexNumber(cssColor, fallback = 0xffffff) {
  if (typeof cssColor !== "string") return fallback;
  const match = cssColor.trim().match(/^#([0-9a-f]{6})$/i);
  return match ? Number.parseInt(match[1], 16) : fallback;
}

function resourceColor(type) {
  if (type === "mana") return 0x7464b8;
  if (type === "energy") return 0xc5a34a;
  if (type === "rage") return 0xa94f45;
  if (type === "runic") return 0x4ca7b3;
  return 0x777777;
}

function burstColors(style = "damage") {
  const colors = {
    heal: [0x65db78, 0xedffe7],
    priest: [0xffd45d, 0xfff9d9],
    druid: [0x69dd7b, 0xe9ffd9],
    paladin: [0xffca45, 0xfff4bd],
    mage: [0x65cfff, 0xf0fbff],
    shaman: [0x62d9ff, 0xf1fdff],
    lightning: [0x62d9ff, 0xf1fdff],
    warlock: [0xa45dff, 0xf0dcff],
    warrior: [0xd86b5c, 0xffd9c9],
    rogue: [0xe9c85c, 0xfff2bc],
    "death-knight": [0xd95b56, 0xffddd1],
    damage: [0xe56b5c, 0xffe0d4],
  };
  return colors[style] || colors.damage;
}

function priestHealSpellColors(spellId) {
  const colors = {
    "priest-renew": [0xe7cf8d, 0xfff7cf, 0xc9a95e],
    "priest-flash-heal": [0xead38f, 0xfff9dc, 0xc8aa61],
    "priest-greater-heal": [0xe8d39a, 0xfffce7, 0xc9aa6a],
  };
  return colors[spellId] || colors["priest-flash-heal"];
}

function commonCasterSpellProfile(spellId) {
  const profiles = {
    "mage-frostbolt": {
      kind: "frost",
      main: 0x63c9e7,
      core: 0xeffcff,
      accent: 0x77a9dc,
      travelEnd: .55,
      size: 7,
    },
    "mage-pyroblast": {
      kind: "fire",
      main: 0xd96839,
      core: 0xffe2aa,
      accent: 0xa73d2d,
      travelEnd: .58,
      size: 11,
      heavy: true,
    },
    "shaman-flame-shock": {
      kind: "flame-shock",
      main: 0xd96d3e,
      core: 0xffe0a1,
      accent: 0x9e3e2d,
    },
    "shaman-lava-burst": {
      kind: "lava",
      main: 0xd66a38,
      core: 0xffe7a4,
      accent: 0x9d3527,
      travelEnd: .52,
      size: 10,
      heavy: true,
    },
    "warlock-corruption": {
      kind: "corruption",
      main: 0x9d63c7,
      core: 0xd9b6f0,
      accent: 0x38213f,
    },
    "warlock-shadow-bolt": {
      kind: "shadow",
      main: 0x8a56bd,
      core: 0xd5b4ee,
      accent: 0x2b1838,
      travelEnd: .56,
      size: 8,
    },
    "warlock-chaos-bolt": {
      kind: "chaos",
      main: 0x66d45f,
      core: 0xdcff8a,
      accent: 0x233629,
      travelEnd: .62,
      size: 12,
      heavy: true,
    },
  };
  return profiles[spellId] || null;
}

function actorVisualSignature(actor) {
  return [
    actor?.classId || "",
    actor?.team || "",
    actor?.resource?.type || "",
    Number(actor?.radius) || 0,
  ].join("|");
}

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function paintFallbackArena(ctx, arena) {
  ctx.fillStyle = "#33281f";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = "#51402e";
  ctx.fillRect(arena.bounds.x, arena.bounds.y, arena.bounds.w, arena.bounds.h);

  ctx.strokeStyle = "#806240";
  ctx.lineWidth = 4;
  ctx.strokeRect(arena.bounds.x, arena.bounds.y, arena.bounds.w, arena.bounds.h);

  for (const rect of arena.obstacles) {
    ctx.fillStyle = "#5d5548";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
}

function makeSharpIconTexture(PIXI, sourceTexture, size = 128) {
  const resource = sourceTexture?.source?.resource;
  if (!resource || typeof document === "undefined") return sourceTexture;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceTexture;

  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(resource, 0, 0, size, size);

  const texture = PIXI.Texture.from(canvas);
  texture.source.scaleMode = "linear";
  texture.source.autoGenerateMipmaps = false;
  return texture;
}

const WIND_SCAR_HEAT_VERTEX = `
in vec2 aPosition;

out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void)
{
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void)
{
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const WIND_SCAR_HEAT_FRAGMENT = `
in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uStrength;

float ellipseMask(vec2 uv, vec2 center, vec2 radius)
{
  vec2 d = (uv - center) / radius;
  float q = dot(d, d);
  return 1.0 - smoothstep(0.40, 1.0, q);
}

void main(void)
{
  vec2 uv = vTextureCoord;

  float heat = 0.0;
  heat = max(heat, ellipseMask(uv, vec2(0.168, 0.178), vec2(0.078, 0.060)));
  heat = max(heat, ellipseMask(uv, vec2(0.570, 0.253), vec2(0.072, 0.054)));
  heat = max(heat, ellipseMask(uv, vec2(0.832, 0.701), vec2(0.082, 0.063)));
  heat = max(heat, ellipseMask(uv, vec2(0.383, 0.771), vec2(0.076, 0.055)));

  float waveA = sin(uv.y * 122.0 + uTime * 2.4 + sin(uv.x * 47.0) * 1.6);
  float waveB = cos(uv.x * 93.0 - uTime * 1.7 + uv.y * 29.0);
  float shimmer = waveA * 0.62 + waveB * 0.38;

  vec2 offset = vec2(
    shimmer * 0.00125,
    (waveB - waveA * 0.35) * 0.00105
  ) * heat * uStrength;

  vec4 baseColor = texture2D(uTexture, uv);
  vec4 shiftedColor = texture2D(uTexture, uv + offset);
  float distortionMix = clamp(heat * uStrength, 0.0, 1.0);

  // Replace the ground sample instead of alpha-blending a second copy of the
  // terrain over itself. The old overlay path could double dark baked terrain
  // features and make them read as large detached shadows.
  gl_FragColor = mix(baseColor, shiftedColor, distortionMix);
}
`;

function makeArenaCanvas(arena) {
  const canvas = document.createElement("canvas");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) return canvas;

  const handled =
    drawGrandRingEnvironment(ctx, arena, GAME_WIDTH, GAME_HEIGHT)
    || drawWindscarEnvironment(ctx, arena, GAME_WIDTH, GAME_HEIGHT);

  if (!handled) paintFallbackArena(ctx, arena);
  return canvas;
}

export class PixiProofRenderer {
  constructor(inputCanvas, arena) {
    this.inputCanvas = inputCanvas;
    this._arena = arena;
    this.ready = false;
    this.failed = false;
    this.PIXI = null;
    this.app = null;
    this.view = null;
    this.badge = null;
    this.terrainSprite = null;
    this.terrainTexture = null;
    this.heatShimmer = null;
    this.renderedArenaId = "";
    this.iconTextures = new Map();
    this.ownedIconTextures = new Set();
    this.actorViews = new Map();
    this.arenaBuildPromise = null;
    this.atmosphere = null;
  }

  async init() {
    const PIXI = await import(PIXI_MODULE_URL);
    this.PIXI = PIXI;

    const view = document.createElement("canvas");
    view.className = "pixi-arena-canvas";
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
      zIndex: "1",
    });

    this.inputCanvas.parentElement?.insertBefore(view, this.inputCanvas);
    this.view = view;

    const app = new PIXI.Application();
    await app.init({
      canvas: view,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundAlpha: 0,
      antialias: true,
      autoStart: false,
      preference: "webgl",
      resolution: Math.min(2, Math.max(1.5, Number(window.devicePixelRatio) || 1)),
    });
    this.app = app;

    this.inputCanvas.style.zIndex = "2";
    this.inputCanvas.style.background = "transparent";

    await this.loadClassIcons();
    await this.rebuildArena(this._arena);

    this.installBadge();
    this.ready = true;
  }

  installBadge() {
    const host = this.inputCanvas.parentElement;
    if (!host) return;

    const badge = document.createElement("div");
    badge.textContent = "PIXIJS 8.21 · GPU FX PREVIEW";
    badge.setAttribute("aria-hidden", "true");
    Object.assign(badge.style, {
      position: "absolute",
      left: "8px",
      top: "8px",
      zIndex: "7",
      padding: "4px 7px",
      borderRadius: "5px",
      border: "1px solid rgba(110,190,255,.34)",
      background: "rgba(6,12,17,.76)",
      color: "#9edcff",
      font: "700 9px system-ui",
      letterSpacing: ".06em",
      pointerEvents: "none",
    });
    host.appendChild(badge);
    this.badge = badge;
  }

  async loadClassIcons() {
    const { Assets } = this.PIXI;
    await Promise.all(CLASS_IDS.map(async classId => {
      const url = classIconUrlFor(classId);
      if (!url) return;

      try {
        const sourceTexture = await Assets.load(url);
        const texture = makeSharpIconTexture(this.PIXI, sourceTexture, 128);

        if (texture !== sourceTexture) this.ownedIconTextures.add(texture);
        this.iconTextures.set(classId, texture);
      } catch (error) {
        console.warn("[Pixi preview] icon failed to load", classId, error);
      }
    }));
  }

  setArena(arena) {
    this._arena = arena;
    if (this.ready && arena?.id !== this.renderedArenaId) {
      this.rebuildArena(arena).catch(error => {
        console.error("[Pixi preview] arena rebuild failed", error);
      });
    }
  }

  async rebuildArena(arena) {
    if (!arena || !this.PIXI || !this.app) return;

    const { Sprite, Texture } = this.PIXI;
    const arenaCanvas = makeArenaCanvas(arena);
    const texture = Texture.from(arenaCanvas);
    const sprite = new Sprite(texture);
    sprite.width = GAME_WIDTH;
    sprite.height = GAME_HEIGHT;

    this.destroyHeatShimmer();

    if (this.terrainSprite) {
      this.app.stage.removeChild(this.terrainSprite);
      this.terrainSprite.destroy();
    }
    if (this.terrainTexture) {
      this.terrainTexture.destroy(true);
    }

    this.terrainTexture = texture;
    this.terrainSprite = sprite;
    this.app.stage.addChildAt(sprite, 0);
    this.createHeatShimmer(arena, texture);
    this.createAtmosphere(arena);
    this.renderedArenaId = arena.id;
  }

  destroyHeatShimmer() {
    if (!this.heatShimmer) return;

    const { container, heatTexture } = this.heatShimmer;
    if (container?.parent) container.parent.removeChild(container);
    container?.destroy?.({ children: true, texture: false });
    heatTexture?.destroy?.(true);
    this.heatShimmer = null;
  }

  createHeatShimmer(arena, terrainTexture) {
    this.destroyHeatShimmer();

    if (
      arena?.id !== "windscar-proving-grounds"
      || !terrainTexture
      || !this.PIXI
      || !this.app
      || typeof document === "undefined"
    ) return;

    const { Container, Filter, GlProgram, Sprite, Texture } = this.PIXI;
    const source = terrainTexture?.source?.resource;
    if (!source) return;

    const b = arena.bounds;
    const heatCanvas = document.createElement("canvas");
    heatCanvas.width = Math.max(1, Math.round(b.w));
    heatCanvas.height = Math.max(1, Math.round(b.h));

    const heatCtx = heatCanvas.getContext("2d");
    if (!heatCtx) return;

    // Work on an arena-local copy so the shader's 0..1 UV coordinates map
    // exactly to Windscar's authored heat zones. This also keeps the normal
    // Canvas link untouched and prevents filter-frame sampling artifacts.
    heatCtx.imageSmoothingEnabled = true;
    heatCtx.imageSmoothingQuality = "high";
    heatCtx.drawImage(
      source,
      b.x,
      b.y,
      b.w,
      b.h,
      0,
      0,
      heatCanvas.width,
      heatCanvas.height,
    );

    const heatTexture = Texture.from(heatCanvas);
    const heatSprite = new Sprite(heatTexture);
    heatSprite.position.set(b.x, b.y);
    heatSprite.width = b.w;
    heatSprite.height = b.h;
    heatSprite.alpha = 1;

    const container = new Container();
    container.label = "windscar-heat-shimmer";
    container.eventMode = "none";

    const glProgram = GlProgram.from({
      vertex: WIND_SCAR_HEAT_VERTEX,
      fragment: WIND_SCAR_HEAT_FRAGMENT,
    });

    const heatFilter = new Filter({
      glProgram,
      resources: {
        heatUniforms: {
          uTime: { value: 0, type: "f32" },
          uStrength: { value: 1, type: "f32" },
        },
      },
    });

    heatFilter.padding = 3;
    heatSprite.filters = [heatFilter];

    container.addChild(heatSprite);
    this.app.stage.addChildAt(container, Math.min(1, this.app.stage.children.length));

    this.heatShimmer = {
      container,
      heatSprite,
      heatTexture,
      heatFilter,
    };
  }

  updateHeatShimmer(game) {
    const heat = this.heatShimmer;
    if (!heat || game.arena?.id !== "windscar-proving-grounds") return;

    const t = Number(game.elapsedSeconds) || 0;
    const uniforms = heat.heatFilter.resources.heatUniforms.uniforms;

    uniforms.uTime = t;
    uniforms.uStrength = .78 + Math.sin(t * .74) * .08;
    heat.heatSprite.alpha = 1;
  }

  destroyAtmosphere() {
    if (!this.atmosphere) return;

    const container = this.atmosphere.container;
    if (container?.parent) container.parent.removeChild(container);
    container?.destroy?.({ children: true });
    this.atmosphere = null;
  }

  createAtmosphere(arena) {
    this.destroyAtmosphere();
    if (!arena || !this.PIXI || !this.app) return;

    const { BlurFilter, Container, Graphics } = this.PIXI;
    const container = new Container();
    container.label = "pixi-atmosphere:" + arena.id;
    container.eventMode = "none";

    const softLight = new Graphics();
    const heatCore = new Graphics();
    const hazeVeil = new Graphics();
    const groundDetail = new Graphics();
    const obstacleContact = new Graphics();
    const obstacleBounce = new Graphics();
    const ashDust = new Graphics();
    const particleGlow = new Graphics();
    const particleCore = new Graphics();

    particleGlow.blendMode = "add";
    particleCore.blendMode = "screen";
    particleGlow.filters = [
      new BlurFilter({ strength: arena.id === "windscar-proving-grounds" ? 5 : 3, quality: 2 }),
    ];

    const particles = [];
    const ashParticles = [];
    const random = seededRandom(
      arena.id === "windscar-proving-grounds" ? 0x7a11ce : 0x47a6d,
    );
    const b = arena.bounds;

    if (arena.id === "windscar-proving-grounds") {
      softLight
        .ellipse(215, 128, 82, 42)
        .fill({ color: 0xd75422, alpha: .085 })
        .ellipse(730, 182, 72, 38)
        .fill({ color: 0xc94b20, alpha: .072 })
        .ellipse(1065, 505, 86, 44)
        .fill({ color: 0xe06425, alpha: .085 })
        .ellipse(490, 555, 78, 38)
        .fill({ color: 0xbc431e, alpha: .064 });
      softLight.blendMode = "screen";
      softLight.filters = [new BlurFilter({ strength: 18, quality: 3 })];

      // A tighter warm core gives the hot ground actual depth instead of one
      // broad orange blur. It remains subtle enough not to compete with units.
      heatCore
        .ellipse(215, 128, 45, 20)
        .fill({ color: 0xff7b35, alpha: .105 })
        .ellipse(730, 182, 39, 18)
        .fill({ color: 0xff7130, alpha: .090 })
        .ellipse(1065, 505, 48, 21)
        .fill({ color: 0xff8438, alpha: .110 })
        .ellipse(490, 555, 42, 18)
        .fill({ color: 0xee6c30, alpha: .082 });
      heatCore.blendMode = "add";
      heatCore.filters = [new BlurFilter({ strength: 8, quality: 2 })];

      // A very low-contrast drifting haze gives the arena depth without
      // lowering combat readability. It sits under units and world bars.
      hazeVeil
        .ellipse(b.x + b.w * .28, b.y + b.h * .36, 210, 72)
        .fill({ color: 0x8a624a, alpha: .018 })
        .ellipse(b.x + b.w * .67, b.y + b.h * .58, 245, 82)
        .fill({ color: 0x6f594b, alpha: .015 })
        .ellipse(b.x + b.w * .48, b.y + b.h * .78, 185, 58)
        .fill({ color: 0x9b694c, alpha: .012 });
      hazeVeil.filters = [new BlurFilter({ strength: 26, quality: 2 })];

      // Tiny clinker flecks around the authored hot areas add close-up terrain
      // detail in Pixi only. They are deterministic and never affect collision.
      const heatZones = [
        { x: 215, y: 128, rx: 80, ry: 38 },
        { x: 730, y: 182, rx: 70, ry: 35 },
        { x: 1065, y: 505, rx: 83, ry: 40 },
        { x: 490, y: 555, rx: 74, ry: 34 },
      ];
      for (let i = 0; i < 38; i += 1) {
        const zone = heatZones[i % heatZones.length];
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random());
        const x = zone.x + Math.cos(angle) * zone.rx * distance;
        const y = zone.y + Math.sin(angle) * zone.ry * distance;
        const blocked = arena.obstacles.some(rect =>
          x >= rect.x - 5
          && x <= rect.x + rect.w + 5
          && y >= rect.y - 5
          && y <= rect.y + rect.h + 5
        );
        if (blocked) continue;

        const size = .55 + random() * 1.05;
        const warm = random() > .48;
        groundDetail
          .circle(x, y, size)
          .fill({
            color: warm ? 0xd97838 : 0x2b2825,
            alpha: warm ? .10 + random() * .08 : .085 + random() * .055,
          });
      }

      // Keep obstacle grounding extremely tight. This is contact occlusion,
      // not a second cast shadow, so it cannot recreate the old black clouds.
      for (const rect of arena.obstacles) {
        obstacleContact
          .ellipse(
            rect.x + rect.w * .51,
            rect.y + rect.h + 1.5,
            Math.max(15, rect.w * .24),
            4.5,
          )
          .fill({ color: 0x151210, alpha: .042 });

        obstacleBounce
          .ellipse(
            rect.x + rect.w * .52,
            rect.y + rect.h + 2,
            Math.max(18, rect.w * .36),
            8,
          )
          .fill({ color: 0xd06a38, alpha: .030 });
      }
      obstacleContact.filters = [new BlurFilter({ strength: 4, quality: 2 })];
      obstacleBounce.blendMode = "screen";
      obstacleBounce.filters = [new BlurFilter({ strength: 9, quality: 2 })];

      // Bright embers stay sparse and readable; ash uses its own slower,
      // darker layer so the arena gains atmosphere rather than visual noise.
      for (let i = 0; i < 28; i += 1) {
        particles.push({
          x: b.x + 26 + random() * (b.w - 52),
          y: b.y + 18 + random() * (b.h - 36),
          speed: 4 + random() * 8,
          drift: 5 + random() * 13,
          phase: random() * Math.PI * 2,
          size: .65 + random() * 1.20,
          alpha: .16 + random() * .28,
          color: random() > .30 ? 0xff7a32 : 0xe2a05e,
        });
      }

      for (let i = 0; i < 18; i += 1) {
        ashParticles.push({
          x: b.x + 24 + random() * (b.w - 48),
          y: b.y + 20 + random() * (b.h - 40),
          speed: 1.1 + random() * 2.5,
          drift: 2 + random() * 5,
          phase: random() * Math.PI * 2,
          size: .55 + random() * .85,
          alpha: .035 + random() * .065,
          color: random() > .42 ? 0x9b8d80 : 0x665d56,
        });
      }
    } else if (arena.id === "four-pillar-ring") {
      softLight
        .ellipse(250, 170, 155, 58)
        .fill({ color: 0xd6d29a, alpha: .045 })
        .ellipse(670, 155, 175, 62)
        .fill({ color: 0xe2d7a0, alpha: .038 })
        .ellipse(980, 470, 145, 54)
        .fill({ color: 0xc7d49a, alpha: .042 })
        .ellipse(520, 520, 165, 56)
        .fill({ color: 0xd8cc8d, alpha: .034 });
      softLight.blendMode = "screen";
      softLight.filters = [new BlurFilter({ strength: 28, quality: 3 })];

      for (let i = 0; i < 24; i += 1) {
        particles.push({
          x: b.x + 28 + random() * (b.w - 56),
          y: b.y + 24 + random() * (b.h - 48),
          speed: 1.6 + random() * 3.5,
          drift: 6 + random() * 16,
          phase: random() * Math.PI * 2,
          size: .55 + random() * .9,
          alpha: .10 + random() * .18,
          color: random() > .48 ? 0xd7c982 : 0xbfc78c,
        });
      }
    }

    container.addChild(
      softLight,
      heatCore,
      hazeVeil,
      groundDetail,
      obstacleContact,
      obstacleBounce,
      ashDust,
      particleGlow,
      particleCore,
    );
    this.app.stage.addChildAt(container, Math.min(2, this.app.stage.children.length));

    this.atmosphere = {
      arenaId: arena.id,
      bounds: arena.bounds,
      container,
      softLight,
      heatCore,
      hazeVeil,
      groundDetail,
      obstacleContact,
      obstacleBounce,
      ashDust,
      particleGlow,
      particleCore,
      particles,
      ashParticles,
    };
  }

  updateAtmosphere(game) {
    const atmosphere = this.atmosphere;
    if (!atmosphere || atmosphere.arenaId !== game.arena?.id) return;

    const t = Number(game.elapsedSeconds) || 0;
    const b = atmosphere.bounds;
    const spanY = Math.max(1, b.h - 28);
    const glow = atmosphere.particleGlow;
    const core = atmosphere.particleCore;
    const ash = atmosphere.ashDust;

    glow.clear();
    core.clear();
    ash.clear();

    if (atmosphere.arenaId === "windscar-proving-grounds") {
      atmosphere.softLight.alpha = .76 + Math.sin(t * 1.15) * .055;
      atmosphere.heatCore.alpha = .82 + Math.sin(t * 1.55) * .075;
      atmosphere.obstacleBounce.alpha = .88 + Math.sin(t * .72) * .035;
      atmosphere.hazeVeil.position.set(
        Math.sin(t * .055) * 3.2,
        Math.cos(t * .043) * 1.6,
      );

      for (const dust of atmosphere.ashParticles) {
        const x = b.x + 14 + (
          ((dust.x - b.x - 14 + t * dust.speed) % (b.w - 28) + (b.w - 28))
          % (b.w - 28)
        );
        const y = dust.y + Math.sin(t * .24 + dust.phase) * dust.drift;
        const fade = .72 + Math.sin(t * .48 + dust.phase) * .28;

        ash
          .ellipse(x, y, dust.size * 1.45, dust.size * .58)
          .fill({
            color: dust.color,
            alpha: dust.alpha * fade,
          });
      }

      for (const particle of atmosphere.particles) {
        const wrapped = ((particle.y - b.y - 14 - t * particle.speed) % spanY + spanY) % spanY;
        const y = b.y + 14 + wrapped;
        const x = particle.x
          + Math.sin(t * .75 + particle.phase) * particle.drift;
        const pulse = .72 + Math.sin(t * 2.2 + particle.phase) * .28;
        const alpha = particle.alpha * pulse;

        glow
          .circle(x, y, particle.size * 3.1)
          .fill({ color: particle.color, alpha: alpha * .26 });
        core
          .circle(x, y, particle.size)
          .fill({ color: particle.color, alpha });
      }
      return;
    }

    if (atmosphere.arenaId === "four-pillar-ring") {
      atmosphere.softLight.alpha = .78 + Math.sin(t * .28) * .07;

      for (const particle of atmosphere.particles) {
        const x = b.x + 18 + (
          ((particle.x - b.x - 18 + t * particle.speed) % (b.w - 36) + (b.w - 36))
          % (b.w - 36)
        );
        const y = particle.y
          + Math.sin(t * .42 + particle.phase) * particle.drift;
        const pulse = .70 + Math.sin(t * 1.1 + particle.phase) * .30;
        const alpha = particle.alpha * pulse;

        glow
          .circle(x, y, particle.size * 2.7)
          .fill({ color: particle.color, alpha: alpha * .18 });
        core
          .circle(x, y, particle.size)
          .fill({ color: particle.color, alpha });
      }
    }
  }

  createActorView(actor) {
    const { Container, Graphics, Sprite, Text } = this.PIXI;
    const root = new Container();
    root.label = "actor:" + actor.id;

    const shadow = new Graphics()
      .ellipse(0, actor.radius * .58, actor.radius * .92, actor.radius * .34)
      .fill({ color: 0x000000, alpha: .28 });
    root.addChild(shadow);

    const teamColor = actor.team === "friendly" ? 0x55c878 : 0xd45a5a;
    const ring = new Graphics()
      .circle(0, 0, actor.radius + 3)
      .stroke({ color: teamColor, width: 2, alpha: .72 });
    root.addChild(ring);

    const texture = this.iconTextures.get(actor.classId);
    let body;
    if (texture) {
      body = new Sprite(texture);
      body.anchor.set(.5);
      body.width = actor.radius * 2.18;
      body.height = actor.radius * 2.18;
    } else {
      body = new Graphics()
        .circle(0, 0, actor.radius)
        .fill(hexNumber(classColorFor(actor), 0x888888));
    }
    root.addChild(body);

    // Native Pixi burst preview lives inside the already-stable actor tree.
    // No extra stage container or filter is used in this migration step.
    const burstFx = new Graphics();
    burstFx.visible = false;
    root.addChild(burstFx);

    const slashFx = new Graphics();
    slashFx.visible = false;
    root.addChild(slashFx);

    const ringFx = new Graphics();
    ringFx.visible = false;
    root.addChild(ringFx);

    const beamFx = new Graphics();
    beamFx.visible = false;
    root.addChild(beamFx);

    const chainFx = new Graphics();
    chainFx.visible = false;
    root.addChild(chainFx);

    const priestHealSpellFx = new Graphics();
    priestHealSpellFx.visible = false;
    root.addChild(priestHealSpellFx);

    const commonCasterSpellFx = new Graphics();
    commonCasterSpellFx.visible = false;
    root.addChild(commonCasterSpellFx);

    const { BlurFilter } = this.PIXI;

    const playerGlow = new Graphics()
      .circle(0, 0, actor.radius + 8)
      .stroke({ color: 0x78dce8, width: 7, alpha: .26 });
    playerGlow.blendMode = "screen";
    playerGlow.filters = [new BlurFilter({ strength: 5, quality: 2 })];
    playerGlow.visible = false;
    root.addChild(playerGlow);

    const playerRing = new Graphics()
      .circle(0, 0, actor.radius + 7)
      .stroke({ color: 0x92e9ef, width: 2.2, alpha: .82 });
    playerRing.visible = false;
    root.addChild(playerRing);

    const targetGlow = new Graphics()
      .circle(0, 0, actor.radius + 9)
      .stroke({ color: 0xff0000, width: 8, alpha: .28 });
    targetGlow.blendMode = "screen";
    targetGlow.filters = [new BlurFilter({ strength: 6, quality: 2 })];
    targetGlow.visible = false;
    root.addChild(targetGlow);

    const targetRing = new Graphics()
      .circle(0, 0, actor.radius + 8)
      .stroke({ color: 0xff2b2b, width: 3, alpha: .92 });
    targetRing.visible = false;
    root.addChild(targetRing);

    const name = new Text({
      text: actor.name,
      style: {
        fontFamily: "system-ui",
        fontSize: 12,
        fontWeight: "800",
        fill: actor.team === "friendly" ? "#f1e8d8" : "#ff786d",
        stroke: { color: "#120e0b", width: 3 },
      },
    });
    name.anchor.set(.5);
    name.position.set(0, -actor.radius - 36);
    root.addChild(name);

    const healthBg = new Graphics()
      .rect(0, 0, 80, 9)
      .fill({ color: 0x0b0806, alpha: .95 });
    healthBg.position.set(-40, -actor.radius - 24);
    root.addChild(healthBg);

    const healthFill = new Graphics()
      .rect(0, 0, 78, 7)
      .fill(hexNumber(classColorFor(actor), 0x8da66c));
    healthFill.position.set(-39, -actor.radius - 23);
    root.addChild(healthFill);

    const resourceBg = new Graphics()
      .rect(0, 0, 80, 6)
      .fill({ color: 0x090807, alpha: .92 });
    resourceBg.position.set(-40, -actor.radius - 12);
    root.addChild(resourceBg);

    const resourceFill = new Graphics()
      .rect(0, 0, 78, 4)
      .fill(resourceColor(actor.resource?.type));
    resourceFill.position.set(-39, -actor.radius - 11);
    root.addChild(resourceFill);

    const castBg = new Graphics()
      .rect(0, 0, 86, 8)
      .fill({ color: 0x0b0806, alpha: .95 });
    castBg.position.set(-43, -actor.radius - 49);
    castBg.visible = false;
    root.addChild(castBg);

    const castFill = new Graphics()
      .rect(0, 0, 84, 6)
      .fill(0xc9a36a);
    castFill.position.set(-42, -actor.radius - 48);
    castFill.visible = false;
    root.addChild(castFill);

    const castBorder = new Graphics()
      .rect(0, 0, 86, 8)
      .stroke({ color: 0xd6c69e, width: 1, alpha: 1 });
    castBorder.position.set(-43, -actor.radius - 49);
    castBorder.visible = false;
    root.addChild(castBorder);

    this.app.stage.addChild(root);

    const view = {
      root,
      name,
      burstFx,
      slashFx,
      ringFx,
      beamFx,
      chainFx,
      priestHealSpellFx,
      commonCasterSpellFx,
      playerGlow,
      playerRing,
      targetGlow,
      targetRing,
      targetVariant: null,
      healthBg,
      healthFill,
      resourceBg,
      resourceFill,
      castBg,
      castFill,
      castBorder,
      castSpellId: null,
      visualSignature: actorVisualSignature(actor),
    };
    this.actorViews.set(actor.id, view);
    return view;
  }

  updateActorView(view, actor, game) {
    view.root.visible = actor.alive;
    if (!actor.alive) return;

    view.root.position.set(actor.x, actor.y);
    if (view.name.text !== actor.name) view.name.text = actor.name;

    const isPlayer = actor.id === game.player?.id;
    const selected = game.player?.targetId === actor.id;

    const targetFriendly = actor.team === game.player?.team;
    const targetVariant = targetFriendly ? "friendly" : "enemy";

    if (view.targetVariant !== targetVariant) {
      const ringColor = targetFriendly ? 0x4dff88 : 0xff2b2b;
      const glowColor = targetFriendly ? 0x00e866 : 0xff0000;

      view.targetGlow.clear()
        .circle(0, 0, actor.radius + 9)
        .stroke({ color: glowColor, width: 8, alpha: .28 });

      view.targetRing.clear()
        .circle(0, 0, actor.radius + 8)
        .stroke({ color: ringColor, width: 3, alpha: .92 });

      view.targetVariant = targetVariant;
    }

    view.playerGlow.visible = isPlayer;
    view.playerRing.visible = isPlayer;
    view.targetGlow.visible = selected && !isPlayer;
    view.targetRing.visible = selected && !isPlayer;

    if (isPlayer) {
      const playerPulse = 1 + Math.sin(game.elapsedSeconds * 3.4) * .025;
      view.playerGlow.scale.set(playerPulse);
    } else {
      view.playerGlow.scale.set(1);
    }

    if (selected && !isPlayer) {
      const pulse = 1 + Math.sin(game.elapsedSeconds * 8) * .045;
      const glowPulse = 1 + Math.sin(game.elapsedSeconds * 5.6) * .075;
      view.targetRing.scale.set(pulse);
      view.targetGlow.scale.set(glowPulse);
    } else {
      view.targetRing.scale.set(1);
      view.targetGlow.scale.set(1);
    }

    // Match current Canvas behavior: the player's own world bars stay hidden.
    const showBars = !isPlayer;
    view.name.visible = true;
    view.healthBg.visible = showBars;
    view.healthFill.visible = showBars;
    view.resourceBg.visible = showBars && actor.resource?.max > 0;
    view.resourceFill.visible = showBars && actor.resource?.max > 0;

    view.healthFill.scale.x = Math.max(0, Math.min(1, actor.healthPct));
    view.resourceFill.scale.x = Math.max(0, Math.min(1, actor.resourcePct));

    const casting = Boolean(actor.cast) && !isPlayer;
    view.castBg.visible = casting;
    view.castFill.visible = casting;
    view.castBorder.visible = casting;

    if (casting) {
      const progress = 1 - actor.cast.remainingMs / Math.max(1, actor.cast.totalMs);
      view.castFill.scale.x = Math.max(0, Math.min(1, progress));

      const spellId = actor.cast.spellId;
      if (view.castSpellId !== spellId) {
        const palette = castBarPaletteFor(actor, {
          start: "#c9a36a",
          end: "#d8ba80",
          glow: "#c9a36a",
          border: "#d6c69e",
        });
        const spell = actor.getSpell(spellId);
        const uninterruptible = spell?.interruptible === false;

        view.castFill.clear()
          .rect(0, 0, 84, 6)
          .fill(hexNumber(palette.start, 0xc9a36a));

        view.castBorder.clear()
          .rect(0, 0, 86, 8)
          .stroke({
            color: hexNumber(
              uninterruptible ? "#e7bd63" : palette.border,
              0xd6c69e,
            ),
            width: uninterruptible ? 1.8 : 1,
            alpha: 1,
          });

        view.castSpellId = spellId;
      }
    } else {
      view.castSpellId = null;
    }
  }

  updateNativeBurstVfx(game) {
    for (const view of this.actorViews.values()) {
      view.burstFx.clear();
      view.burstFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "burst") continue;

      const view = this.actorViews.get(effect.targetId);
      if (!view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core] = burstColors(effect.style);
      const healing = ["heal", "priest", "druid", "paladin"].includes(effect.style);
      const outer = 8 + progress * (healing ? 38 : 30);
      const inner = 5 + progress * (healing ? 23 : 18);

      view.burstFx.visible = true;
      view.burstFx
        .circle(0, 0, outer)
        .stroke({
          color: main,
          width: healing ? 3.4 : 2.7,
          alpha: alpha * .88,
        })
        .circle(0, 0, inner)
        .stroke({
          color: core,
          width: 1.2,
          alpha: alpha * .72,
        });

      const motes = healing ? 7 : 5;
      for (let i = 0; i < motes; i += 1) {
        const angle = (i / motes) * Math.PI * 2 + progress * 1.25;
        const radius = 8 + progress * (healing ? 27 : 21);
        view.burstFx
          .circle(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            healing ? 2 : 1.6,
          )
          .fill({
            color: i % 2 ? core : main,
            alpha: alpha * .62,
          });
      }
    }
  }

  updateNativeSlashVfx(game) {
    for (const view of this.actorViews.values()) {
      view.slashFx.clear();
      view.slashFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "slash") continue;

      const view = this.actorViews.get(effect.targetId);
      if (!view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core] = burstColors(effect.style);
      const spread = 8 + progress * 18;

      view.slashFx.visible = true;

      view.slashFx
        .moveTo(-spread, -spread)
        .lineTo(spread, spread)
        .moveTo(spread, -spread)
        .lineTo(-spread, spread)
        .stroke({
          color: main,
          width: 4.6,
          alpha: alpha * .78,
        });

      view.slashFx
        .moveTo(-spread * .9, -spread * .9)
        .lineTo(spread * .9, spread * .9)
        .moveTo(spread * .9, -spread * .9)
        .lineTo(-spread * .9, spread * .9)
        .stroke({
          color: core,
          width: 1.35,
          alpha: alpha * .90,
        });

      view.slashFx
        .circle(0, 0, Math.max(6, spread * .72))
        .stroke({
          color: main,
          width: 1.1,
          alpha: alpha * .34,
        });
    }
  }

  updateNativeRingVfx(game) {
    for (const view of this.actorViews.values()) {
      view.ringFx.clear();
      view.ringFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "ring") continue;

      const view = this.actorViews.get(effect.sourceId);
      if (!view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core] = burstColors(effect.style);
      const healing = ["heal", "priest", "druid", "paladin"].includes(effect.style);
      const start = Number(effect.radiusStart) || 20;
      const end = Number(effect.radiusEnd) || 80;
      const radius = start + (end - start) * progress;

      view.ringFx.visible = true;
      view.ringFx
        .circle(0, 0, radius)
        .stroke({
          color: main,
          width: healing ? 3.6 - progress * .8 : 3.8 - progress * 1.0,
          alpha: alpha * .86,
        });

      view.ringFx
        .circle(0, 0, Math.max(4, radius - 7))
        .stroke({
          color: core,
          width: 1.15,
          alpha: alpha * (healing ? .56 : .40),
        });

      if (healing) {
        const motes = effect.style === "druid" ? 7 : 6;
        for (let i = 0; i < motes; i += 1) {
          const angle = (i / motes) * Math.PI * 2 + progress * 2.1;
          const rr = Math.max(8, radius - 3);
          view.ringFx
            .circle(
              Math.cos(angle) * rr,
              Math.sin(angle) * rr - progress * 6,
              effect.style === "druid" ? 1.8 : 1.6,
            )
            .fill({
              color: i % 2 ? core : main,
              alpha: alpha * .62,
            });
        }
      }
    }
  }

  updateNativeBeamVfx(game) {
    for (const view of this.actorViews.values()) {
      view.beamFx.clear();
      view.beamFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "beam") continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !target || !view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core] = burstColors(effect.style);
      const healing = ["heal", "priest", "druid", "paladin"].includes(effect.style);

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length;
      const ny = dx / length;

      view.beamFx.visible = true;

      if (healing) {
        const bendSign = effect.id % 2 === 0 ? 1 : -1;
        const bend = Math.min(42, Math.max(16, length * .09)) * bendSign;
        const cx = dx * .5 + nx * bend;
        const cy = dy * .5 + ny * bend;
        const segments = 12;

        const curvePoint = t => {
          const inv = 1 - t;
          return {
            x: 2 * inv * t * cx + t * t * dx,
            y: 2 * inv * t * cy + t * t * dy,
          };
        };

        let previous = { x: 0, y: 0 };
        for (let i = 1; i <= segments; i += 1) {
          const point = curvePoint(i / segments);
          view.beamFx
            .moveTo(previous.x, previous.y)
            .lineTo(point.x, point.y)
            .stroke({
              color: main,
              width: effect.style === "paladin" ? 5.2 : 4.4,
              alpha: alpha * .84,
            });
          view.beamFx
            .moveTo(previous.x, previous.y)
            .lineTo(point.x, point.y)
            .stroke({
              color: core,
              width: 1.25,
              alpha: alpha * .88,
            });
          previous = point;
        }

        const motes = effect.style === "druid" ? 7 : 6;
        for (let i = 0; i < motes; i += 1) {
          const t = (progress * 1.45 + i / motes) % 1;
          const point = curvePoint(t);
          const wobble = Math.sin(effect.id * 1.7 + i * 2.3 + progress * 9) * 6;
          view.beamFx
            .circle(
              point.x + nx * wobble,
              point.y + ny * wobble,
              effect.style === "druid" ? 2.1 : 1.8,
            )
            .fill({
              color: i % 2 ? core : main,
              alpha: alpha * (.34 + (1 - t) * .34),
            });
        }

        const impactRadius = 14 + progress * 14;
        view.beamFx
          .circle(dx, dy, impactRadius)
          .stroke({
            color: core,
            width: 1.7,
            alpha: alpha * .68,
          });
      } else {
        view.beamFx
          .moveTo(0, 0)
          .lineTo(dx, dy)
          .stroke({
            color: main,
            width: 3.2,
            alpha: alpha * .82,
          });

        view.beamFx
          .moveTo(0, 0)
          .lineTo(dx, dy)
          .stroke({
            color: core,
            width: 1.0,
            alpha: alpha * .72,
          });
      }
    }
  }

  updateNativeChainVfx(game) {
    for (const view of this.actorViews.values()) {
      view.chainFx.clear();
      view.chainFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "chain") continue;

      const actors = (effect.actorIds || [])
        .map(id => game.getActor(id))
        .filter(Boolean);
      if (actors.length < 2) continue;

      const source = actors[0];
      const view = this.actorViews.get(source.id);
      if (!view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core] = burstColors(effect.style || "lightning");
      const specialChainLightning = effect.spellId === "shaman-chain-lightning";

      view.chainFx.visible = true;

      for (let segmentIndex = 0; segmentIndex < actors.length - 1; segmentIndex += 1) {
        const fromActor = actors[segmentIndex];
        const toActor = actors[segmentIndex + 1];
        const localProgress = specialChainLightning
          ? Math.max(0, Math.min(1, (progress - segmentIndex * .10) / .66))
          : progress;
        if (localProgress <= 0) continue;

        const fade = specialChainLightning
          ? 1 - Math.max(0, Math.min(1, (localProgress - .54) / .46))
          : alpha;

        const reveal = specialChainLightning
          ? Math.max(0, Math.min(1, localProgress / .34))
          : 1;
        const easedReveal = 1 - Math.pow(1 - reveal, 3);

        const from = {
          x: fromActor.x - source.x,
          y: fromActor.y - source.y,
        };
        const fullTo = {
          x: toActor.x - source.x,
          y: toActor.y - source.y,
        };
        const to = {
          x: from.x + (fullTo.x - from.x) * easedReveal,
          y: from.y + (fullTo.y - from.y) * easedReveal,
        };

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const px = -dy / length;
        const py = dx / length;
        const segments = Math.max(6, Math.min(9, Math.round(length / 34)));
        const seed = Number(effect.seed || 1) + segmentIndex * 47;
        const phase = localProgress * 5;

        const points = [{ x: from.x, y: from.y }];
        for (let i = 1; i < segments; i += 1) {
          const t = i / segments;
          const baseX = from.x + dx * t;
          const baseY = from.y + dy * t;
          const wave =
            Math.sin(seed * .37 + i * 2.31 + phase * 1.8) * 7
            + Math.sin(seed * .17 + i * 4.2 - phase * 2.1) * 2.5;
          points.push({
            x: baseX + px * wave,
            y: baseY + py * wave,
          });
        }
        points.push(to);

        view.chainFx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
          view.chainFx.lineTo(points[i].x, points[i].y);
        }
        view.chainFx.stroke({
          color: main,
          width: specialChainLightning ? 5.4 : 4.6,
          alpha: alpha * fade * .46,
        });

        view.chainFx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i += 1) {
          view.chainFx.lineTo(points[i].x, points[i].y);
        }
        view.chainFx.stroke({
          color: core,
          width: specialChainLightning ? 1.8 : 1.4,
          alpha: alpha * fade * .96,
        });

        if (specialChainLightning && localProgress > .28) {
          const impactProgress = Math.max(0, Math.min(1, (localProgress - .28) / .62));
          const impactRadius = 7 + impactProgress * 20;
          view.chainFx
            .circle(fullTo.x, fullTo.y, impactRadius)
            .stroke({
              color: main,
              width: 2.1,
              alpha: alpha * fade * .56,
            });
          view.chainFx
            .circle(fullTo.x, fullTo.y, Math.max(4, impactRadius - 5))
            .stroke({
              color: core,
              width: 1,
              alpha: alpha * fade * .74,
            });
        }
      }
    }
  }

  updateNativePriestHealSpellVfx(game) {
    const supported = new Set([
      "priest-renew",
      "priest-flash-heal",
      "priest-greater-heal",
    ]);

    for (const view of this.actorViews.values()) {
      view.priestHealSpellFx.clear();
      view.priestHealSpellFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell" || !supported.has(effect.spellId)) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !target || !view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core, accent] = priestHealSpellColors(effect.spellId);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const seed = Number(effect.seed || effect.id || 1);
      const random = seededRandom(seed);

      view.priestHealSpellFx.visible = true;

      // Small source release cue, matching the Canvas spell layer.
      const cueWindow = effect.spellId === "priest-greater-heal" ? .22 : .18;
      const cueP = Math.max(0, Math.min(1, p / cueWindow));
      const cueFade = 1 - cueP;
      if (cueFade > 0) {
        const cueRadius = source.radius + 9 + cueP * 11;
        view.priestHealSpellFx
          .circle(0, 0, cueRadius)
          .stroke({
            color: main,
            width: 2,
            alpha: alpha * cueFade * .50,
          });

        for (let i = 0; i < 6; i += 1) {
          const a = i / 6 * Math.PI * 2;
          const inner = source.radius + 4;
          const outer = source.radius + 16 + cueP * 14;
          view.priestHealSpellFx
            .moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
            .lineTo(Math.cos(a) * outer, Math.sin(a) * outer)
            .stroke({
              color: i % 2 ? core : main,
              width: 1.35,
              alpha: alpha * cueFade * .46,
            });
        }
      }

      if (effect.spellId === "priest-renew") {
        const fade = 1 - Math.max(0, Math.min(1, (p - .62) / .38));
        const eased = 1 - Math.pow(1 - p, 3);
        const radius = 12 + eased * 24;

        view.priestHealSpellFx
          .circle(dx, dy, 11 + p * 24)
          .stroke({
            color: main,
            width: 1.5,
            alpha: alpha * fade * .42,
          });

        for (let i = 0; i < 6; i += 1) {
          const a = i / 6 * Math.PI * 2 - p * 1.2;
          view.priestHealSpellFx
            .circle(
              dx + Math.cos(a) * radius,
              dy + Math.sin(a) * radius - p * 5,
              1.8 + (i % 2) * .7,
            )
            .fill({
              color: i % 2 ? main : core,
              alpha: alpha * fade * .66,
            });
        }
        continue;
      }

      const strong = effect.spellId === "priest-greater-heal";
      const appearRaw = Math.max(0, Math.min(1, p / .18));
      const appear = appearRaw * appearRaw * (3 - 2 * appearRaw);
      const fade = 1 - Math.max(0, Math.min(1, (p - .58) / .42));
      const height = strong ? 118 : 88;
      const width = strong ? 34 : 24;
      const topY = dy - height;
      const rayAlpha = alpha * appear * fade * (strong ? .38 : .30);

      // A visible holy column built only from safe Graphics line primitives.
      const rays = strong ? 6 : 4;
      for (let i = 0; i < rays; i += 1) {
        const lane = rays === 1 ? 0 : i / (rays - 1) - .5;
        const topX = dx + lane * width;
        const bottomX = dx + lane * width * 1.35;
        view.priestHealSpellFx
          .moveTo(topX, topY)
          .lineTo(bottomX, dy + 10)
          .stroke({
            color: i % 2 ? core : main,
            width: strong ? 3.2 : 2.5,
            alpha: rayAlpha * (i % 2 ? .85 : .58),
          });
      }

      const eased = 1 - Math.pow(1 - p, 3);
      const ringRadius = 10 + eased * (strong ? 30 : 22);
      view.priestHealSpellFx
        .circle(dx, dy, ringRadius)
        .stroke({
          color: main,
          width: strong ? 2.8 : 2.1,
          alpha: alpha * fade * .74,
        })
        .circle(dx, dy, Math.max(5, ringRadius - 6))
        .stroke({
          color: core,
          width: 1.05,
          alpha: alpha * fade * .44,
        });

      const motes = strong ? 9 : 6;
      for (let i = 0; i < motes; i += 1) {
        const rx = random();
        const ry = random();
        const rr = random();
        view.priestHealSpellFx
          .circle(
            dx + (rx - .5) * width * 1.5,
            topY + ry * height * .78 + p * 12,
            1.4 + rr * 1.8,
          )
          .fill({
            color: i % 3 === 0 ? core : (i % 2 ? main : accent),
            alpha: alpha * fade * .62,
          });
      }

      // Stronger landing flash for Greater Heal, deliberately obvious for testing.
      if (strong && p > .08 && p < .52) {
        const flashP = Math.max(0, Math.min(1, (p - .08) / .44));
        const flashFade = 1 - flashP;
        view.priestHealSpellFx
          .circle(dx, dy, 5 + flashP * 18)
          .fill({
            color: core,
            alpha: alpha * flashFade * .22,
          });
      }
    }
  }

  updateNativeCommonCasterSpellVfx(game) {
    for (const view of this.actorViews.values()) {
      view.commonCasterSpellFx.clear();
      view.commonCasterSpellFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell") continue;

      const profile = commonCasterSpellProfile(effect.spellId);
      if (!profile) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !view || !view.root.visible) continue;

      const targetX = target?.x ?? effect.targetX;
      const targetY = target?.y ?? effect.targetY;
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const seed = Number(effect.seed || effect.id || 1);
      const dxFull = targetX - source.x;
      const dyFull = targetY - source.y;
      const distance = Math.max(1, Math.hypot(dxFull, dyFull));
      const tx = dxFull / distance;
      const ty = dyFull / distance;
      const nx = -ty;
      const ny = tx;
      const missed = Boolean(effect.missed);

      view.commonCasterSpellFx.visible = true;

      if (profile.kind === "flame-shock") {
        const fade = 1 - Math.max(0, Math.min(1, (p - .55) / .45));
        for (let i = 0; i < 8; i += 1) {
          const side = Math.sin(seed * .41 + i * 1.91) * 19;
          const baseX = dxFull + side;
          const baseY = dyFull + 15 - (i % 3) * 2.5;
          const rise = (18 + (i % 4) * 8) * (1 - Math.pow(1 - p, 3));
          const sway = Math.sin(i * 2.2 + p * 10) * 8;

          view.commonCasterSpellFx
            .moveTo(baseX, baseY)
            .lineTo(baseX + sway * .45, baseY - rise * .55)
            .lineTo(baseX + sway, baseY - rise)
            .stroke({
              color: i % 3 === 0 ? profile.core : profile.main,
              width: 1.6 + (i % 3) * .55,
              alpha: alpha * fade * (.45 + (i % 2) * .18),
            });
        }

        view.commonCasterSpellFx
          .circle(dxFull, dyFull, 8 + p * 22)
          .stroke({
            color: profile.accent,
            width: 1.2,
            alpha: alpha * fade * .36,
          });
        continue;
      }

      if (profile.kind === "corruption") {
        const fade = 1 - Math.max(0, Math.min(1, (p - .68) / .32));
        const outer = 12 + p * 24;

        view.commonCasterSpellFx
          .circle(dxFull, dyFull, outer)
          .stroke({
            color: profile.main,
            width: 2,
            alpha: alpha * fade * .46,
          })
          .circle(dxFull, dyFull, Math.max(5, outer - 8))
          .stroke({
            color: profile.core,
            width: 1,
            alpha: alpha * fade * .34,
          });

        for (let i = 0; i < 7; i += 1) {
          const a = (i / 7) * Math.PI * 2 + p * (i % 2 ? 1.7 : -1.35);
          const rr = 8 + p * (18 + (i % 3) * 6);
          view.commonCasterSpellFx
            .circle(
              dxFull + Math.cos(a) * rr,
              dyFull + Math.sin(a) * rr - p * 7,
              1.5 + (i % 3) * .5,
            )
            .fill({
              color: i % 3 === 0 ? profile.core : profile.main,
              alpha: alpha * fade * .58,
            });
        }
        continue;
      }

      const travelEnd = profile.travelEnd || .56;
      const rawTravel = Math.max(0, Math.min(1, p / travelEnd));
      const travel = 1 - Math.pow(1 - rawTravel, 3);
      const missOffset = missed ? 38 : 0;
      const destinationX = dxFull + nx * missOffset + tx * (missed ? 10 : 0);
      const destinationY = dyFull + ny * missOffset + ty * (missed ? 10 : 0);

      let projectileX = destinationX * travel;
      let projectileY = destinationY * travel;
      if (profile.kind === "lava") {
        projectileY -= Math.sin(travel * Math.PI) * 24;
      } else if (profile.kind === "shadow") {
        projectileX += nx * Math.sin(p * 13 + seed * .07) * 8;
        projectileY += ny * Math.sin(p * 13 + seed * .07) * 8;
      } else if (profile.kind === "chaos") {
        projectileX += nx * Math.sin(p * 17 + seed * .05) * 5;
        projectileY += ny * Math.sin(p * 17 + seed * .05) * 5;
      }

      const size = profile.size || 8;

      // Tail first so the projectile core reads clearly on top.
      const tailCount = profile.heavy ? 6 : 4;
      for (let i = 0; i < tailCount; i += 1) {
        const lag = Math.max(0, travel - .045 * (i + 1));
        let qx = destinationX * lag;
        let qy = destinationY * lag;
        if (profile.kind === "lava") qy -= Math.sin(lag * Math.PI) * 24;
        const wobble = Math.sin(seed * .13 + i * 2.2 + p * 8) * 4;

        view.commonCasterSpellFx
          .circle(
            qx + nx * wobble,
            qy + ny * wobble,
            Math.max(1.2, size * .28 - i * .12),
          )
          .fill({
            color: i % 2 ? profile.main : profile.core,
            alpha: alpha * Math.max(.18, .52 - i * .065),
          });
      }

      if (profile.kind === "frost") {
        view.commonCasterSpellFx
          .circle(projectileX, projectileY, size)
          .fill({ color: profile.main, alpha: alpha * .82 })
          .circle(projectileX, projectileY, size * .48)
          .fill({ color: profile.core, alpha: alpha * .94 });

        for (let i = 0; i < 4; i += 1) {
          const a = i / 4 * Math.PI * 2 + p * 7;
          view.commonCasterSpellFx
            .moveTo(projectileX, projectileY)
            .lineTo(
              projectileX + Math.cos(a) * (size + 5),
              projectileY + Math.sin(a) * (size + 5),
            )
            .stroke({
              color: profile.accent,
              width: 1.2,
              alpha: alpha * .58,
            });
        }
      } else if (profile.kind === "fire" || profile.kind === "lava") {
        view.commonCasterSpellFx
          .circle(projectileX, projectileY, size + 2)
          .fill({ color: profile.accent, alpha: alpha * .72 })
          .circle(projectileX, projectileY, size)
          .fill({ color: profile.main, alpha: alpha * .92 })
          .circle(projectileX, projectileY, size * .42)
          .fill({ color: profile.core, alpha: alpha * .95 });

        for (let i = 0; i < 5; i += 1) {
          const a = i / 5 * Math.PI * 2 + p * 9;
          view.commonCasterSpellFx
            .moveTo(
              projectileX + Math.cos(a) * size * .45,
              projectileY + Math.sin(a) * size * .45,
            )
            .lineTo(
              projectileX + Math.cos(a + .22) * (size + 5),
              projectileY + Math.sin(a + .22) * (size + 5),
            )
            .stroke({
              color: i % 2 ? profile.core : profile.main,
              width: 1.3,
              alpha: alpha * .64,
            });
        }
      } else if (profile.kind === "shadow") {
        view.commonCasterSpellFx
          .circle(projectileX, projectileY, size + 3)
          .fill({ color: profile.accent, alpha: alpha * .52 })
          .circle(projectileX, projectileY, size)
          .fill({ color: profile.main, alpha: alpha * .86 })
          .circle(projectileX, projectileY, size * .4)
          .fill({ color: profile.core, alpha: alpha * .82 });

        for (let i = 0; i < 4; i += 1) {
          const a = p * 8 + i * Math.PI / 2;
          const rr = size + 6;
          view.commonCasterSpellFx
            .circle(
              projectileX + Math.cos(a) * rr,
              projectileY + Math.sin(a) * rr,
              1.7,
            )
            .fill({
              color: i % 2 ? profile.core : profile.main,
              alpha: alpha * .52,
            });
        }
      } else if (profile.kind === "chaos") {
        view.commonCasterSpellFx
          .circle(projectileX, projectileY, size + 5)
          .fill({ color: profile.accent, alpha: alpha * .46 })
          .circle(projectileX, projectileY, size + 1)
          .fill({ color: profile.main, alpha: alpha * .88 })
          .circle(projectileX, projectileY, size * .46)
          .fill({ color: profile.core, alpha: alpha * .98 });

        for (const sign of [-1, 1]) {
          const a = p * 12 * sign + seed * .03;
          view.commonCasterSpellFx
            .circle(
              projectileX + Math.cos(a) * (size + 7),
              projectileY + Math.sin(a) * (size + 7),
              2.4,
            )
            .fill({
              color: sign > 0 ? profile.core : profile.main,
              alpha: alpha * .72,
            });
        }
      }

      if (!missed && p >= travelEnd) {
        const hit = Math.max(0, Math.min(1, (p - travelEnd) / .38));
        const fade = 1 - hit;
        const impactRadius = 9 + hit * (profile.heavy ? 36 : 26);

        view.commonCasterSpellFx
          .circle(dxFull, dyFull, impactRadius)
          .stroke({
            color: profile.main,
            width: profile.heavy ? 3.2 : 2.3,
            alpha: alpha * fade * .72,
          })
          .circle(dxFull, dyFull, Math.max(5, impactRadius - 7))
          .stroke({
            color: profile.core,
            width: 1.15,
            alpha: alpha * fade * .68,
          });

        const sparks = profile.heavy ? 9 : 6;
        for (let i = 0; i < sparks; i += 1) {
          const a = i / sparks * Math.PI * 2 + seed * .11;
          const rr = 7 + hit * (18 + (i % 4) * 5);
          view.commonCasterSpellFx
            .circle(
              dxFull + Math.cos(a) * rr,
              dyFull + Math.sin(a) * rr - hit * 5,
              1.6 + (i % 3) * .55,
            )
            .fill({
              color: i % 3 === 0 ? profile.core : profile.main,
              alpha: alpha * fade * .68,
            });
        }
      }
    }
  }

  render(game) {
    if (!this.ready || !this.app) return;

    if (game.arena?.id !== this.renderedArenaId && !this.arenaBuildPromise) {
      this.arenaBuildPromise = this.rebuildArena(game.arena)
        .catch(error => console.error("[Pixi preview] arena rebuild failed", error))
        .finally(() => {
          this.arenaBuildPromise = null;
        });
    }

    this.updateHeatShimmer(game);
    this.updateAtmosphere(game);

    const livingIds = new Set(game.actors.map(actor => actor.id));

    for (const [id, view] of this.actorViews) {
      if (livingIds.has(id)) continue;
      this.app.stage.removeChild(view.root);
      view.root.destroy({ children: true });
      this.actorViews.delete(id);
    }

    for (const actor of game.actors) {
      let view = this.actorViews.get(actor.id);
      const nextSignature = actorVisualSignature(actor);

      // Actor ids are role/slot based and survive roster rerolls. If a slot
      // changes from Mage to Shaman (or any other visual identity change),
      // the old Pixi sprite must not be reused.
      if (view && view.visualSignature !== nextSignature) {
        this.app.stage.removeChild(view.root);
        view.root.destroy({ children: true });
        this.actorViews.delete(actor.id);
        view = null;
      }

      view = view || this.createActorView(actor);
      this.updateActorView(view, actor, game);
    }

    this.updateNativeBurstVfx(game);
    this.updateNativeSlashVfx(game);
    this.updateNativeRingVfx(game);
    this.updateNativeBeamVfx(game);
    this.updateNativeChainVfx(game);
    this.updateNativePriestHealSpellVfx(game);
    this.updateNativeCommonCasterSpellVfx(game);

    this.app.render();
  }

  destroy() {
    this.ready = false;
    this.destroyHeatShimmer();
    this.destroyAtmosphere();
    this.badge?.remove();
    this.badge = null;

    if (this.inputCanvas) {
      this.inputCanvas.style.background = "";
      this.inputCanvas.style.zIndex = "";
    }

    for (const texture of this.ownedIconTextures) {
      texture.destroy?.(true);
    }
    this.ownedIconTextures.clear();
    this.iconTextures.clear();

    if (this.app?.renderer) {
      try {
        this.app.destroy({ removeView: true }, { children: true, texture: false });
      } catch (error) {
        console.warn("[Pixi preview] cleanup after failed init was partial", error);
        this.view?.remove();
      }
      this.app = null;
    } else {
      this.view?.remove();
      this.app = null;
    }

    this.view = null;
  }
}
