/* CHROMA RUSH · Corner Tide 1.0
 * Four symmetric waves converge toward the middle of the arena on every
 * ten-second color change. Canvas-only, color-only: no collision shapes.
 * Reusable for the next arcade games with rectangular stages.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.ChromaCornerTide = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));
  const corners = (x, y, w, h) =>
    [[x, y], [x + w, y], [x, y + h], [x + w, y + h]];
  const radiusAt = (progress, w, h) => {
    // The nearest corner is farthest from the exact center.
    // Slightly front-loaded pacing makes the first half of the transition
    // obvious while preserving a short, dramatic final convergence.
    const eased = Math.pow(clamp(progress), 0.82);
    return Math.hypot(w / 2, h / 2) * (eased * 1.025);
  };
  const nearestCornerDistance = (x, y, rect) => Math.min(
    ...corners(rect.x, rect.y, rect.w, rect.h).map(c =>
      Math.hypot(x - c[0], y - c[1])));
  const reached = (x, y, rect, progress) =>
    nearestCornerDistance(x, y, rect) <= radiusAt(progress, rect.w, rect.h);

  function clipNewColor(ctx, rect, progress) {
    const radius = radiusAt(progress, rect.w, rect.h);
    ctx.beginPath();
    // Four circles added to a single path form a union with the nonzero
    // winding rule. The "new" environment exists only behind their front.
    for (const c of corners(rect.x, rect.y, rect.w, rect.h)) {
      ctx.moveTo(c[0] + radius, c[1]);
      ctx.arc(c[0], c[1], Math.max(0.00001, radius), 0, TAU);
    }
    ctx.clip();
    return radius;
  }

  function drawFront(ctx, rect, progress, color, intensity = 1) {
    if (progress <= 0 || progress >= 1 || !intensity) return;
    const radius = radiusAt(progress, rect.w, rect.h);
    const opacity = Math.min(1, progress * 7, (1 - progress) * 8);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.40 * opacity * intensity;
    ctx.shadowColor = color;
    // Full-screen Canvas shadow blur forces expensive intermediate surfaces
    // on mobile GPUs. Two crisp translucent strokes provide the front glow.
    ctx.shadowBlur = 0;
    ctx.lineWidth = 4.2;
    for (const c of corners(rect.x, rect.y, rect.w, rect.h)) {
      ctx.beginPath();
      ctx.arc(c[0], c[1], radius, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.53 * opacity * intensity;
    ctx.lineWidth = 1.35;
    ctx.shadowBlur = 0;
    for (const c of corners(rect.x, rect.y, rect.w, rect.h)) {
      ctx.beginPath();
      ctx.arc(c[0], c[1], radius - 4.3, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }
  return {
    corners, radiusAt, nearestCornerDistance, reached,
    clipNewColor, drawFront
  };
});
