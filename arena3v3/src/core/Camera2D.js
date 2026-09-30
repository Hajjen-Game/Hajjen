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
    this.safeMargins = { left: 78, right: 78, top: 88, bottom: 94 };
    // Only the actual rectangles occupied by team frames need protection.
    // The rest of the arena's left/right edges stay available for gameplay.
    this.avoidRects = [];
    this.followMs = 180;
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

  resizeViewport(width, height) {
    const nextWidth = Math.max(1, Math.round(width || this.viewportWidth));
    const nextHeight = Math.max(1, Math.round(height || this.viewportHeight));
    if (nextWidth === this.viewportWidth && nextHeight === this.viewportHeight) return;

    // The HTML canvas changes shape with the browser, but world positions and
    // scale do not. Preserve the current world-space center while resizing.
    const dx = (nextWidth - this.viewportWidth) / 2;
    const dy = (nextHeight - this.viewportHeight) / 2;
    this.viewportWidth = nextWidth;
    this.viewportHeight = nextHeight;
    this.offsetX += dx;
    this.offsetY += dy;
    this.targetOffsetX += dx;
    this.targetOffsetY += dy;
    this.clampTargetOffsets();
    this.offsetX = clamp(
      this.offsetX,
      (this.viewportWidth - this.worldWidth * this.zoom) / 2 - this.viewportWidth * .25,
      (this.viewportWidth - this.worldWidth * this.zoom) / 2 + this.viewportWidth * .25,
    );
    this.offsetY = clamp(
      this.offsetY,
      (this.viewportHeight - this.worldHeight * this.zoom) / 2 - this.viewportHeight * .22,
      (this.viewportHeight - this.worldHeight * this.zoom) / 2 + this.viewportHeight * .22,
    );
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

  setAvoidRects(rectangles = []) {
    this.avoidRects = rectangles
      .filter(rect => rect && (rect.side === "left" || rect.side === "right"))
      .map(rect => ({
        side: rect.side,
        left: clamp(Number(rect.left) || 0, 0, this.viewportWidth),
        right: clamp(Number(rect.right) || 0, 0, this.viewportWidth),
        top: clamp(Number(rect.top) || 0, 0, this.viewportHeight),
        bottom: clamp(Number(rect.bottom) || 0, 0, this.viewportHeight),
      }))
      .filter(rect => rect.right > rect.left && rect.bottom > rect.top);
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
    const iconRadius = (Number(player.radius) || 25) * this.zoom;
    // Include the visible player highlight and name, not just the small
    // collision circle. A frame must never completely cover the player icon.
    const haloX = Math.max(45, iconRadius + 24);
    const haloY = Math.max(62, iconRadius + 40);
    const minX = Math.max(margins.left, haloX + 10);
    const maxX = Math.max(minX + 80, width - Math.max(margins.right, haloX + 10));
    const minY = Math.max(margins.top, haloY + 10);
    const maxY = Math.max(minY + 80, height - Math.max(margins.bottom, haloY + 10));

    // Work from the desired offset, not the currently interpolating camera.
    // This means the camera doesn't repeatedly overcorrect at a HUD edge.
    let px = player.x * this.zoom + this.targetOffsetX;
    let py = player.y * this.zoom + this.targetOffsetY;

    if (px < minX) this.targetOffsetX += minX - px;
    else if (px > maxX) this.targetOffsetX += maxX - px;

    if (py < minY) this.targetOffsetY += minY - py;
    else if (py > maxY) this.targetOffsetY += maxY - py;

    px = player.x * this.zoom + this.targetOffsetX;
    py = player.y * this.zoom + this.targetOffsetY;
    let avoidingHud = false;

    for (const rect of this.avoidRects) {
      // Crucially, don't pan horizontally when the player is BELOW the
      // upper-corner frames. The previous full-height side margins caused
      // needless camera motion throughout the entire match.
      if (py + haloY < rect.top - 6 || py - haloY > rect.bottom + 6) continue;

      if (rect.side === "left") {
        const clearance = rect.right + haloX + 12;
        if (px - haloX < rect.right + 12 && px + haloX > rect.left - 6) {
          const correction = Math.max(0, clearance - px);
          this.targetOffsetX += correction;
          px += correction;
          avoidingHud ||= correction > 0;
        }
      } else {
        const clearance = rect.left - haloX - 12;
        if (px + haloX > rect.left - 12 && px - haloX < rect.right + 6) {
          const correction = Math.max(0, px - clearance);
          this.targetOffsetX -= correction;
          px -= correction;
          avoidingHud ||= correction > 0;
        }
      }
    }

    this.clampTargetOffsets();

    // Normal movement stays calm. Approaching the HUD gets a slightly faster
    // response, with fading as backup if physical camera limits are reached.
    const responseMs = avoidingHud ? 110 : this.followMs;
    const alpha = 1 - Math.exp(-Math.min(deltaMs, 50) / responseMs);
    this.offsetX += (this.targetOffsetX - this.offsetX) * alpha;
    this.offsetY += (this.targetOffsetY - this.offsetY) * alpha;
  }

  snapToSafeArea(player) {
    if (!player?.alive) return;
    // Match starts should not spend their first half-second with the player
    // obscured by a team frame while the camera catches up.
    this.update(player, 16);
    this.offsetX = this.targetOffsetX;
    this.offsetY = this.targetOffsetY;
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
