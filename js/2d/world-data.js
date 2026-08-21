import { WORLD } from "./config.js";

const path = (points, width = 112) => ({ points, width });
const obj = (type, x, y, variant = 0, options = {}) => ({ type, x, y, variant, ...options });

export const REGIONS = [
  { id: "central", name: "The Crossroads", x: 0, y: 0, w: WORLD.width, h: WORLD.height, palette: "central" }
];

export const PATHS = [
  path([[1800, 1900],[1800, 1500],[1670, 1250],[1400, 1040],[1100, 920],[760, 900]], 132),
  path([[1800, 1700],[2090, 1510],[2350, 1280],[2720, 1080],[3070, 1030]], 124),
  path([[1740, 1980],[1450, 2180],[1180, 2470],[1040, 2820]], 116),
  path([[1860, 1980],[2150, 2200],[2440, 2470],[2660, 2820]], 118),
  path([[760, 900],[540, 720],[390, 470]], 96),
  path([[3070, 1030],[3260, 810],[3320, 560]], 96)
];

const OBJECTS = [
  obj("tree", 1540, 1550, 0), obj("tree", 2050, 1570, 1), obj("tree", 1410, 1320, 2),
  obj("tree", 2210, 1320, 3), obj("tree", 1240, 1120, 1), obj("tree", 2460, 1120, 2),
  obj("tree", 980, 770, 3), obj("tree", 2840, 900, 0), obj("tree", 1260, 2360, 2),
  obj("tree", 2350, 2350, 1), obj("tree", 1050, 2730, 3), obj("tree", 2700, 2690, 0),
  obj("rock", 1620, 1780, 0), obj("rock", 1970, 1830, 1), obj("rock", 1490, 2110, 2),
  obj("rock", 2220, 2140, 0), obj("rock", 885, 1010, 1), obj("rock", 2920, 1130, 2),
  obj("bush", 1500, 1450, 2), obj("bush", 2140, 1460, 3), obj("bush", 1360, 2240, 1),
  obj("bush", 2480, 2260, 0), obj("branch", 1730, 1320, 0), obj("branch", 2010, 2250, 1)
];

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = Math.imul(1664525, s) + 1013904223 >>> 0) / 4294967296);
}

const rand = seeded(1729);
for (let i = 0; i < 135; i++) {
  const x = 240 + rand() * (WORLD.width - 480);
  const y = 240 + rand() * (WORLD.height - 480);
  const r = rand();
  const type = r < .48 ? "flower" : r < .72 ? "bush" : r < .9 ? "rock" : "tree";
  OBJECTS.push(obj(type, x, y, Math.floor(rand() * 4), { decorative: type === "flower" }));
}

export const WORLD_OBJECTS = OBJECTS;

export function buildChunks() {
  const chunks = new Map();
  for (const item of WORLD_OBJECTS) {
    const cx = Math.floor(item.x / WORLD.chunkSize);
    const cy = Math.floor(item.y / WORLD.chunkSize);
    const key = `${cx},${cy}`;
    if (!chunks.has(key)) chunks.set(key, []);
    chunks.get(key).push(item);
  }
  return chunks;
}
