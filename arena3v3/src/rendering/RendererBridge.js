import { CanvasRenderer } from "./CanvasRenderer.js?v=20261001-pixi23";
import { PixiProofRenderer } from "./PixiProofRenderer.js?v=20261004-detachedtails2";
import { BabylonArenaRenderer } from "./BabylonArenaRenderer.js?v=20261002-babylon30";

function requestedRenderer() {
  if (typeof window === "undefined") return "canvas";
  const value = new URLSearchParams(window.location.search).get("renderer");
  if (value === "pixi") return "pixi";
  if (value === "babylon") return "babylon";
  return "canvas";
}

export class RendererBridge {
  constructor(canvas, arena) {
    this.canvas = canvas;
    this._arena = arena;
    this.canvasRenderer = new CanvasRenderer(canvas, arena);
    this.mode = requestedRenderer();
    this.pixiRenderer = null;
    this.babylonRenderer = null;
    this.gpuSurfacePrepared = false;

    if (this.mode === "pixi") {
      this.initializePixi();
    } else if (this.mode === "babylon") {
      this.initializeBabylonStack();
    }
  }

  initializePixi() {
    this.pixiRenderer = new PixiProofRenderer(this.canvas, this._arena, {
      // Image-backed test arenas provide their own untouched background below
      // the transparent Pixi combat canvas.
      renderEnvironment: !this._arena?.pixiBackgroundImage,
    });
    this.pixiRenderer.init().catch(error => {
      console.error("[Pixi preview] initialization failed; using Canvas fallback.", error);
      this.fallbackToCanvas();
    });
  }

  initializeBabylonStack() {
    this.babylonRenderer = new BabylonArenaRenderer(this.canvas, this._arena);
    this.pixiRenderer = new PixiProofRenderer(this.canvas, this._arena, {
      renderEnvironment: false,
      badgeText: "BABYLON ENV · PIXI COMBAT",
    });

    Promise.all([
      this.babylonRenderer.init(),
      this.pixiRenderer.init(),
    ]).catch(error => {
      console.error(
        "[Babylon preview] initialization failed; using Canvas fallback.",
        error,
      );
      this.fallbackToCanvas();
    });
  }

  fallbackToCanvas() {
    try {
      this.pixiRenderer?.destroy?.();
    } catch (error) {
      console.warn("[Renderer] Pixi cleanup was partial.", error);
    }
    try {
      this.babylonRenderer?.destroy?.();
    } catch (error) {
      console.warn("[Renderer] Babylon cleanup was partial.", error);
    }

    this.pixiRenderer = null;
    this.babylonRenderer = null;
    this.gpuSurfacePrepared = false;
    this.mode = "canvas";
    this.canvas.style.background = "";
    this.canvas.style.zIndex = "";
  }

  get arena() {
    return this._arena;
  }

  set arena(value) {
    this._arena = value;
    this.canvasRenderer.arena = value;
    this.pixiRenderer?.setArena?.(value);
    this.babylonRenderer?.setArena?.(value);
  }

  prepareGpuSurface() {
    if (this.gpuSurfacePrepared) return;

    const ctx = this.canvas.getContext("2d");
    if (ctx) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    this.canvas.style.background = "transparent";
    this.canvas.style.zIndex = "2";
    this.gpuSurfacePrepared = true;
  }

  render(game) {
    if (this.mode === "babylon") {
      if (this.babylonRenderer?.ready && this.pixiRenderer?.ready) {
        this.prepareGpuSurface();
        this.pixiRenderer.setEnvironmentOcclusion(
          this.babylonRenderer.getOcclusionPolygons(),
        );
        this.babylonRenderer.render(game);
        this.pixiRenderer.render(game);
        return;
      }
    } else if (this.mode === "pixi" && this.pixiRenderer?.ready) {
      this.prepareGpuSurface();
      this.pixiRenderer.render(game);
      return;
    }

    this.canvasRenderer.render(game);
  }

  recoverFromRenderError(error, game) {
    if (this.mode !== "pixi" && this.mode !== "babylon") return false;

    console.error(
      "[Renderer] GPU preview failed at runtime; switching to Canvas fallback.",
      error,
    );
    this.fallbackToCanvas();

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

  destroy() {
    this.pixiRenderer?.destroy?.();
    this.babylonRenderer?.destroy?.();
    this.pixiRenderer = null;
    this.babylonRenderer = null;
  }
}
