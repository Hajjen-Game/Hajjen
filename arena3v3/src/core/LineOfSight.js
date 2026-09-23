function segmentIntersectsSegment(a, b, c, d) {
  const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = cross(a, b, c), d2 = cross(a, b, d), d3 = cross(c, d, a), d4 = cross(c, d, b);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
    && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}
export function segmentIntersectsRect(a, b, rect, padding = 0) {
  const r = { x: rect.x - padding, y: rect.y - padding, w: rect.w + padding * 2, h: rect.h + padding * 2 };
  const inside = p => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
  if (inside(a) || inside(b)) return true;
  const tl = { x: r.x, y: r.y }, tr = { x: r.x + r.w, y: r.y };
  const br = { x: r.x + r.w, y: r.y + r.h }, bl = { x: r.x, y: r.y + r.h };
  return segmentIntersectsSegment(a, b, tl, tr)
    || segmentIntersectsSegment(a, b, tr, br)
    || segmentIntersectsSegment(a, b, br, bl)
    || segmentIntersectsSegment(a, b, bl, tl);
}
export function hasLineOfSight(a, b, obstacles) {
  return !obstacles.some(obstacle => segmentIntersectsRect(a, b, obstacle, 2));
}
