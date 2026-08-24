import { WORLD } from "./config.js";

const obj = (type, x, y, variant = 0, options = {}) => ({ type, x, y, variant, ...options });

export const REGIONS = [
  { id: "central", name: "The Crossroads", x: 0, y: 0, w: WORLD.width, h: WORLD.height, palette: "central" }
];

// Deliberate, compact composition for the Standard Terrain gameplay-style proof of concept.
// Terrain baked into the 256x256 ground tiles remains fully walkable; only these separate
// world objects participate in the existing collision/depth system.
const OBJECTS = [
  // North-west grove framing the approach to the path.
  obj("tree", 620, 430, 0),
  obj("tree", 760, 360, 1),
  obj("tree", 890, 470, 3),
  obj("rock", 700, 570, 1),
  obj("bush", 820, 560, 2),
  obj("flower", 930, 585, 1, { decorative: true }),

  // Quiet meadow west of the main route.
  obj("rock", 470, 940, 0),
  obj("rock", 540, 1010, 2),
  obj("flower", 610, 900, 0, { decorative: true }),
  obj("flower", 655, 990, 3, { decorative: true }),
  obj("branch", 720, 1080, 0),

  // Trees hugging the upper bend without blocking the path itself.
  obj("tree", 1040, 700, 2),
  obj("tree", 1240, 690, 0),
  obj("tree", 1515, 705, 1),
  obj("bush", 1420, 780, 3),
  obj("rock", 1590, 840, 1),

  // East-side denser pocket around the second turn.
  obj("tree", 1840, 760, 3),
  obj("tree", 1960, 900, 2),
  obj("tree", 1870, 1080, 0),
  obj("rock", 1740, 1010, 2),
  obj("bush", 1810, 1180, 1),
  obj("flower", 1940, 1170, 2, { decorative: true }),

  // South meadow and final approach.
  obj("tree", 1480, 1440, 1),
  obj("tree", 1270, 1540, 3),
  obj("tree", 980, 1600, 0),
  obj("rock", 1370, 1375, 0),
  obj("rock", 1120, 1450, 2),
  obj("branch", 920, 1390, 1),
  obj("bush", 760, 1490, 2),
  obj("flower", 670, 1370, 0, { decorative: true }),
  obj("flower", 790, 1325, 1, { decorative: true }),

  // A few edge anchors so the area feels bounded without forming a wall.
  obj("tree", 340, 620, 2),
  obj("tree", 2240, 570, 1),
  obj("tree", 2230, 1420, 3),
  obj("tree", 430, 1640, 0),
  obj("rock", 2150, 1260, 1),
  obj("rock", 520, 1320, 2)
];

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
