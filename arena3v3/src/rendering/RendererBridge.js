import { CanvasRenderer } from "./CanvasRenderer.js?v=20261001-pixi19";
import { PixiProofRenderer } from "./PixiProofRenderer.js?v=20261001-pixi25";

const PIXI_NATIVE_SPELL_VFX_IDS = Object.freeze([
  "priest-renew",
  "priest-flash-heal",
  "priest-greater-heal",

  "mage-living-bomb",
  "mage-frostbolt",
  "mage-pyroblast",
  "mage-frost-nova",
  "mage-polymorph",
  "mage-frostfire-bolt",
  "mage-arcane-barrage",

  "shaman-flame-shock",
  "shaman-chain-lightning",
  "shaman-lava-burst",
  "shaman-hex",
  "shaman-astral-shift",
  "shaman-elemental-blast",
  "shaman-stormstrike",

  "warlock-corruption",
  "warlock-shadow-bolt",
  "warlock-chaos-bolt",
  "warlock-resolve",
  "warlock-fear",
  "warlock-drain-life",
  "warlock-conflagrate",
]);

function requestedRenderer() {
  if (typeof window === "undefined") return "canvas";
  const value = new URLSearchParams(window.location.search).get("renderer");
  return value === "pixi" ? "pixi" : "canvas";
}

export class RendererBridge {
  constructor(canvas, arena) {
    this.canvas = canvas;
    this._arena = arena;
    this.canvasRenderer = new CanvasRenderer(canvas, arena);
    this.mode = requestedRenderer();
    this.pixiRenderer = null;

    if (this.mode === "pixi") {
      this.pixiRenderer = new PixiProofRenderer(canvas, arena);
      this.pixiRenderer.init().catch(error => {
        console.error("[Pixi preview] initialization failed; using Canvas fallback.", error);
        this.pixiRenderer?.destroy?.();
        this.pixiRenderer = null;
        this.mode = "canvas";
        this.canvas.style.background = "";
        this.canvas.style.zIndex = "";
      });
    }
  }

  get arena() {
    return this._arena;
  }

  set arena(value) {
    this._arena = value;
    this.canvasRenderer.arena = value;
    this.pixiRenderer?.setArena?.(value);
  }

  render(game) {
    if (this.pixiRenderer?.ready) {
      this.pixiRenderer.render(game);
      this.canvasRenderer.renderEffectsOverlay(game, {
        skipBurstVfx: true,
        skipSlashVfx: true,
        skipRingVfx: true,
        skipBeamVfx: true,
        skipChainVfx: true,
        skipSpellVfxIds: PIXI_NATIVE_SPELL_VFX_IDS,
      });
      return;
    }

    this.canvasRenderer.render(game);
  }

  recoverFromRenderError(error, game) {
    if (this.mode !== "pixi" || !this.pixiRenderer) return false;

    console.error("[Pixi preview] runtime render failed; switching to Canvas fallback.", error);

    try {
      this.pixiRenderer.destroy?.();
    } catch (cleanupError) {
      console.warn("[Pixi preview] cleanup after runtime failure was partial.", cleanupError);
    }

    this.pixiRenderer = null;
    this.mode = "canvas";
    this.canvas.style.background = "";
    this.canvas.style.zIndex = "";

    try {
      this.canvasRenderer.render(game);
    } catch (fallbackError) {
      console.error("[Canvas fallback] recovery frame failed.", fallbackError);
    }

    return true;
  }

  targetHitScore(actor, game, x, y) {
    return this.canvasRenderer.targetHitScore(actor, game, x, y);
  }
}
