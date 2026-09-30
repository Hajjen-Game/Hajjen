import { clamp } from "./utils.js";

/**
 * View-only world camera. Actor positions, arena collision and AI always stay
 * in world coordinates; only the canvas transform and pointer conversion use
 * this camera. HUD elements outside the canvas remain screen-fixed.
 */
export class Camera2D {
  constructor(viewportWidth, viewportHeight, worldWidth, worldHeight) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.safeMargins = { left: 130, right: 130, top: 95, bottom: 95 };
    this.followMs = 155;
    this.reset(worldWidth, worldHeight);
  }

  reset(worldWidth = this.worldWidth, worldHeight = this.worldHeight) {
    this.worldWidth = Math.max(1, worldWidth || this.viewportWidth);
    this.worldHeight = Math.max(1, worldHeight || this.viewportHeight);
    this.zoom = 1;

    // At zoom=1, the existing 1280x720 arena looks exactly as it did before
    // this camera was added. Panning only begins outside the dead zone.
    this.offsetX = (this.viewportWidth - this.worldWidth) / 2;
    this.offsetY = (this.viewportHeight - this.worldHeight) / 2;
    this.targetOffsetX = this.offsetX;
    this.targetOffsetY = this.offsetY;
  }

  setSafeMargins({ left, right, top, bottom } = {}) {
    const previous = this.safeMargins;
    this.safeMargins = {
      left: clamp(Number.isFinite(left) ? left : previous.left, 0, this.viewportWidth - 80),
      right: clamp(Number.isFinite(right) ? right : previous.right, 0, this.viewportWidth - 80),
      top: clamp(Number.isFinite(top) ? top : previous.top, 0, this.viewportHeight - 80),
      bottom: clamp(Number.isFinite(bottom) ? bottom : previous.bottom, 0, this.viewportHeight - 80),
    };
  }

  // Reserved for the full-arena HUD step. Zooming is centered on a screen
  // anchor and uses the same inverse conversion as mouse targeting.
  setZoom(value, screenAnchor = {
    x: this.viewportWidth / 2,
    y: this.viewportHeight / 2,
  }) {
    const newZoom = clamp(Number(value) || 1, 0.8, 1.4);
    if (Math.abs(newZoom - this.zoom) < 0.0001) return;

    const worldAnchor = this.screenToWorld(screenAnchor);
    this.zoom = newZoom;
    this.offsetX = screenAnchor.x - worldAnchor.x * newZoom;
    this.offsetY = screenAnchor.y - worldAnchor.y * newZoom;
    this.targetOffsetX = this.offsetX;
    this.targetOffsetY = this.offsetY;
    this.clampTargetOffsets();
    this.offsetX = this.targetOffsetX;
    this.offsetY = this.targetOffsetY;
  }

  clampTargetOffsets() {
    const centeredX = (this.viewportWidth - this.worldWidth * this.zoom) / 2;
    const centeredY = (this.viewportHeight - this.worldHeight * this.zoom) / 2;

    // A limited amount of arena floor outside the playable bounds may be
    // visible near the edges, so the camera can still protect the player.
    const maxPanX = this.viewportWidth * 0.25;
    const maxPanY = this.viewportHeight * 0.22;

    this.targetOffsetX = clamp(
      this.targetOffsetX,
      centeredX - maxPanX,
      centeredX + maxPanX,
    );
    this.targetOffsetY = clamp(
      this.targetOffsetY,
      centeredY - maxPanY,
      centeredY + maxPanY,
    );
  }

  update(player, deltaMs) {
    if (!player?.alive || !Number.isFinite(deltaMs) || deltaMs <= 0) return;

    const { viewportWidth: width, viewportHeight: height } = this;
    const margins = this.safeMargins;
    const minX = margins.left;
    const maxX = Math.max(minX + 80, width - margins.right);
    const minY = margins.top;
    const maxY = Math.max(minY + 80, height - margins.bottom);

    // Compare with the desired offset instead of the smoothed offset. That
    // prevents the camera from accumulating corrections and jittering when
    // a player lingers on the dead-zone boundary.
    const projectedX = player.x * this.zoom + this.targetOffsetX;
    const projectedY = player.y * this.zoom + this.targetOffsetY;

    if (projectedX < minX) this.targetOffsetX += minX - projectedX;
    else if (projectedX > maxX) this.targetOffsetX += maxX - projectedX;

    if (projectedY < minY) this.targetOffsetY += minY - projectedY;
    else if (projectedY > maxY) this.targetOffsetY += maxY - projectedY;

    this.clampTargetOffsets();

    const alpha = 1 - Math.exp(-Math.min(deltaMs, 50) / this.followMs);
    this.offsetX += (this.targetOffsetX - this.offsetX) * alpha;
    this.offsetY += (this.targetOffsetY - this.offsetY) * alpha;
  }

  worldToScreen({ x, y }) {
    return {
      x: x * this.zoom + this.offsetX,
      y: y * this.zoom + this.offsetY,
    };
  }

  screenToWorld({ x, y }) {
    return {
      x: (x - this.offsetX) / this.zoom,
      y: (y - this.offsetY) / this.zoom,
    };
  }

  applyToContext(ctx) {
    ctx.setTransform(this.zoom, 0, 0, this.zoom, this.offsetX, this.offsetY);
  }
}
