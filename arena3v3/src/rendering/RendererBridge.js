import { CanvasRenderer } from "./CanvasRenderer.js?v=20261001-pixi4";
import { PixiProofRenderer } from "./PixiProofRenderer.js?v=20261001-pixi4";

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
      this.canvasRenderer.renderEffectsOverlay(game);
      return;
    }

    this.canvasRenderer.render(game);
  }

  targetHitScore(actor, game, x, y) {
    return this.canvasRenderer.targetHitScore(actor, game, x, y);
  }
}
