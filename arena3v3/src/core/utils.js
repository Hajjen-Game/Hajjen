export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export function distance(a, b) { return Math.hypot(b.x - a.x, b.y - a.y); }
export function normalize(x, y) {
  const length = Math.hypot(x, y);
  if (length <= 0.0001) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
}
export function lerp(a, b, t) { return a + (b - a) * t; }
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
export function stableHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
}
export function roundTo(value, decimals = 0) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
