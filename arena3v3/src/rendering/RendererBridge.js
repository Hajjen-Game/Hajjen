import { CanvasRenderer } from "./CanvasRenderer.js?v=20261001-pixi23";
import { PixiProofRenderer } from "./PixiProofRenderer.js?v=20261002-pixi36";



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
    this.pixiSurfacePrepared = false;

    if (this.mode === "pixi") {
      this.pixiRenderer = new PixiProofRenderer(canvas, arena);
      this.pixiRenderer.init().catch(error => {
        console.error("[Pixi preview] initialization failed; using Canvas fallback.", error);
        this.pixiRenderer?.destroy?.();
        this.pixiRenderer = null;
        this.pixiSurfacePrepared = false;
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
      if (!this.pixiSurfacePrepared) {
        const ctx = this.canvas.getContext("2d");
        if (ctx) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = "source-over";
          ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.pixiSurfacePrepared = true;
      }

      this.pixiRenderer.render(game);
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
    this.pixiSurfacePrepared = false;
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
