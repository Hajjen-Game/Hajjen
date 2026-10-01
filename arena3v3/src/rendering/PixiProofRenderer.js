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
    const obstacleBounce = new Graphics();
    const particleGlow = new Graphics();
    const particleCore = new Graphics();

    particleGlow.blendMode = "add";
    particleCore.blendMode = "screen";
    particleGlow.filters = [
      new BlurFilter({ strength: arena.id === "windscar-proving-grounds" ? 5 : 3, quality: 2 }),
    ];

    const particles = [];
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

      // Very soft warm bounce just under LOS obstacles visually reconnects
      // them to the ground without adding another dark fake shadow.
      for (const rect of arena.obstacles) {
        obstacleBounce
          .ellipse(
            rect.x + rect.w * .52,
            rect.y + rect.h + 2,
            Math.max(18, rect.w * .36),
            8,
          )
          .fill({ color: 0xd06a38, alpha: .030 });
      }
      obstacleBounce.blendMode = "screen";
      obstacleBounce.filters = [new BlurFilter({ strength: 9, quality: 2 })];

      for (let i = 0; i < 34; i += 1) {
        particles.push({
          x: b.x + 26 + random() * (b.w - 52),
          y: b.y + 18 + random() * (b.h - 36),
          speed: 4 + random() * 8,
          drift: 5 + random() * 13,
          phase: random() * Math.PI * 2,
          size: .65 + random() * 1.25,
          alpha: .18 + random() * .34,
          color: random() > .30 ? 0xff7a32 : 0xe2a05e,
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

    container.addChild(softLight, heatCore, obstacleBounce, particleGlow, particleCore);
    this.app.stage.addChildAt(container, Math.min(2, this.app.stage.children.length));

    this.atmosphere = {
      arenaId: arena.id,
      bounds: arena.bounds,
      container,
      softLight,
      heatCore,
      obstacleBounce,
      particleGlow,
      particleCore,
      particles,
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

    glow.clear();
    core.clear();

    if (atmosphere.arenaId === "windscar-proving-grounds") {
      atmosphere.softLight.alpha = .76 + Math.sin(t * 1.15) * .055;
      atmosphere.heatCore.alpha = .82 + Math.sin(t * 1.55) * .075;
      atmosphere.obstacleBounce.alpha = .88 + Math.sin(t * .72) * .035;

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
