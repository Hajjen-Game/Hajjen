// SKYSHIFT 0.1 – deterministic, engine-independent track geometry and fairness helpers.
export const CONFIG = Object.freeze({
  startSpeed: 23,
  maxSpeed: 61,
  zoneLength: 320,
  gravity: 26,
  jumpVelocity: 11.5,
  hoverHeight: 1.05,
  sideSpeed: 17,
});
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
export const zoneAt = distance => Math.floor(Math.max(0, distance) / CONFIG.zoneLength) + 1;
export const speedAtZone = zone => Math.min(CONFIG.maxSpeed, CONFIG.startSpeed + (zone - 1) * 2.15);
export const airtimeAtLevel = () => 2 * CONFIG.jumpVelocity / CONFIG.gravity;
export const conservativeGap = speed => speed * airtimeAtLevel() * 0.38;

const START_SEQUENCE = ["flow", "precision", "flow", "surge", "split", "flow", "precision", "surge"];
const TYPES = ["flow", "precision", "surge", "split", "flow", "vertical"];

export function createTrack(seed = 19093) {
  let rng = (seed >>> 0) || 19093;
  const random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const randomRange = (a, b) => a + (b - a) * random();
  const segments = [];
  let mostRecent = null;
  let count = 0;

  function addSegment() {
    let type = count < START_SEQUENCE.length
      ? START_SEQUENCE[count]
      : TYPES[Math.floor(random() * TYPES.length)];
    if (mostRecent && type === mostRecent.type && count >= START_SEQUENCE.length)
      type = TYPES[(TYPES.indexOf(type) + 1) % TYPES.length];
    const length = type === "precision" ? 106 : type === "split" ? 118 : type === "vertical" ? 120 : 112;
    const start = mostRecent ? mostRecent.end : 0;
    const end = start + length;
    const startX = mostRecent ? mostRecent.endX : 0;
    const startY = mostRecent ? mostRecent.endY : 0;
    const dx = count === 0 ? 3 : randomRange(-9, 9);
    const dy = count === 0 ? 0 : randomRange(-1.8, 1.8);
    const width = type === "flow" ? 14 : type === "split" ? 15.5 : type === "precision" ? 10.8 : 11.8;
    const gapSize = Math.min(type === "precision" ? 9.5 : 10.2,
      Math.max(5.5, conservativeGap(speedAtZone(zoneAt(start))) * 0.88));
    const gapStart = (type === "precision" || type === "surge") ? start + length * 0.56 : null;
    const segment = {
      id: count++, type, start, end, length, startX, endX: startX + dx,
      startY, endY: startY + dy, bend: count === 1 ? 0 : randomRange(-3.5, 3.5),
      width, gapStart, gapEnd: gapStart === null ? null : gapStart + gapSize,
      splitStart: type === "split" ? start + length * 0.27 : null,
      splitEnd: type === "split" ? start + length * 0.83 : null,
      splitHalfGap: 1.75,
    };
    segments.push(segment);
    mostRecent = segment;
    return segment;
  }

  function ensureTo(distance) {
    while (!mostRecent || mostRecent.end < distance) addSegment();
    return segments;
  }

  function at(distance) {
    const d = Math.max(0, distance);
    ensureTo(d + 0.1);
    return segments.find(s => d >= s.start && d < s.end) || mostRecent;
  }

  function trimBefore(distance) {
    while (segments.length > 4 && segments[0].end < distance) segments.shift();
  }

  return { segments, ensureTo, at, trimBefore, get last() { return mostRecent; } };
}

export function centerAt(segment, distance) {
  const t = clamp((distance - segment.start) / segment.length, 0, 1);
  const easing = smooth(t);
  const mound = Math.sin(Math.PI * t) ** 2;
  return {
    x: segment.startX + (segment.endX - segment.startX) * easing + segment.bend * mound,
    y: segment.startY + (segment.endY - segment.startY) * easing +
      (segment.type === "vertical" ? 2.5 * Math.sin(Math.PI * t) ** 2 : 0),
  };
}

export function roadIntervals(segment, distance) {
  if (segment.gapStart !== null &&
      distance >= segment.gapStart && distance < segment.gapEnd) return [];
  const half = segment.width * 0.5;
  if (segment.splitStart !== null &&
      distance >= segment.splitStart && distance < segment.splitEnd) {
    return [[-half, -segment.splitHalfGap], [segment.splitHalfGap, half]];
  }
  return [[-half, half]];
}

export function surfaceAt(planner, distance, x, margin = 0.35) {
  const s = planner.at(distance);
  const center = centerAt(s, distance);
  const lateral = x - center.x;
  const intervals = roadIntervals(s, distance);
  const solid = intervals.some(([a,b]) => lateral >= a + margin && lateral <= b - margin);
  return { solid, height: center.y, centerX: center.x, type: s.type, segment: s };
}

// A conservative mathematical check; final judgement also depends on takeoff
// position, camera visibility, air steering and actual in-browser playtests.
export function isGapTheoreticallyFair(segment) {
  if (segment.gapStart === null) return true;
  const gap = segment.gapEnd - segment.gapStart;
  return gap < conservativeGap(speedAtZone(zoneAt(segment.start)));
}
