const TAU = Math.PI * 2;
const GRAND_RING_ID = "four-pillar-ring";
const TERRAIN_VERSION = "grand-ring-v2-noise";

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, value) {
  const t = clamp01((value - edge0) / Math.max(.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function hash2(x, y, seed) {
  let h = Math.imul(x | 0, 374761393)
    + Math.imul(y | 0, 668265263)
    + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise2d(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hash2(x0, y0, seed);
  const n10 = hash2(x0 + 1, y0, seed);
  const n01 = hash2(x0, y0 + 1, seed);
  const n11 = hash2(x0 + 1, y0 + 1, seed);

  return lerp(
    lerp(n00, n10, sx),
    lerp(n01, n11, sx),
    sy,
  );
}

function fbm(x, y, seed, octaves = 4) {
  let sum = 0;
  let amp = .55;
  let frequency = 1;
  let norm = 0;

  for (let i = 0; i < octaves; i += 1) {
    sum += valueNoise2d(x * frequency, y * frequency, seed + i * 131) * amp;
    norm += amp;
    amp *= .5;
    frequency *= 2.03;
  }

  return norm > 0 ? sum / norm : 0;
}

function insideExpandedObstacle(x, y, obstacles, padding = 0) {
  return obstacles.some(rect =>
    x >= rect.x - padding
    && x <= rect.x + rect.w + padding
    && y >= rect.y - padding
    && y <= rect.y + rect.h + padding
  );
}

const DIRT_FIELDS = Object.freeze([
  { x: 145, y: 155, rx: 185, ry: 92, strength: .62 },
  { x: 490, y: 145, rx: 220, ry: 100, strength: .46 },
  { x: 830, y: 190, rx: 170, ry: 98, strength: .38 },
  { x: 1090, y: 220, rx: 165, ry: 110, strength: .52 },
  { x: 420, y: 365, rx: 250, ry: 110, strength: .50 },
  { x: 760, y: 365, rx: 235, ry: 110, strength: .34 },
  { x: 1080, y: 475, rx: 185, ry: 100, strength: .49 },
  { x: 190, y: 535, rx: 175, ry: 105, strength: .47 },
  { x: 620, y: 555, rx: 250, ry: 95, strength: .40 },
]);

const VEGETATION_CLUSTERS = Object.freeze([
  { x: 135, y: 245, rx: 70, ry: 48 },
  { x: 430, y: 190, rx: 74, ry: 45 },
  { x: 720, y: 150, rx: 58, ry: 42 },
  { x: 1080, y: 155, rx: 64, ry: 48 },
  { x: 510, y: 475, rx: 78, ry: 52 },
  { x: 810, y: 520, rx: 74, ry: 48 },
  { x: 1110, y: 540, rx: 62, ry: 46 },
  { x: 160, y: 560, rx: 65, ry: 46 },
]);

function dirtFieldAt(x, y) {
  let strongest = 0;

  for (const patch of DIRT_FIELDS) {
    const dx = (x - patch.x) / patch.rx;
    const dy = (y - patch.y) / patch.ry;
    const distance = dx * dx + dy * dy;

    if (distance >= 1.7) continue;
    const influence = Math.exp(-distance * 2.15) * patch.strength;
    strongest = Math.max(strongest, influence);
  }

  return strongest;
}

function mixRgb(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

function buildTerrainTexture(arena) {
  if (
    typeof document === "undefined"
    || typeof document.createElement !== "function"
  ) return null;

  const b = arena.bounds;
  const scale = 4;
  const texture = document.createElement("canvas");
  texture.width = Math.max(1, Math.ceil(b.w / scale));
  texture.height = Math.max(1, Math.ceil(b.h / scale));

  const ctx = texture.getContext("2d");
  if (!ctx) return null;

  const image = ctx.createImageData(texture.width, texture.height);
  const pixels = image.data;

  const grassDark = [72, 91, 46];
  const grassLight = [103, 115, 59];
  const moss = [63, 91, 48];
  const dryGrass = [121, 118, 65];
  const dirt = [116, 91, 57];
  const warmDirt = [132, 105, 65];

  for (let py = 0; py < texture.height; py += 1) {
    for (let px = 0; px < texture.width; px += 1) {
      const worldX = b.x + (px + .5) / texture.width * b.w;
      const worldY = b.y + (py + .5) / texture.height * b.h;

      const macro = fbm(worldX * .0042, worldY * .0042, 19, 4);
      const middle = fbm(worldX * .011, worldY * .011, 47, 4);
      const fine = fbm(worldX * .031, worldY * .031, 83, 3);
      const dirtNoise = fbm(worldX * .0054 + 17.3, worldY * .0054 - 8.1, 113, 5);
      const mossNoise = fbm(worldX * .0062 - 12.7, worldY * .0062 + 5.4, 151, 4);
      const dryNoise = fbm(worldX * .0048 + 4.2, worldY * .0048 + 16.9, 181, 4);

      let color = mixRgb(grassDark, grassLight, clamp01(.18 + macro * .72));
      color = mixRgb(color, grassLight, (middle - .5) * .20 + .10);

      const authoredDirt = dirtFieldAt(worldX, worldY);
      const dirtSignal = dirtNoise * .67 + authoredDirt * .54 + dryNoise * .11;
      const dirtAmount = smoothstep(.49, .69, dirtSignal);
      const dirtColor = mixRgb(dirt, warmDirt, clamp01(.2 + dryNoise * .62));
      color = mixRgb(color, dirtColor, dirtAmount * .84);

      const mossAmount = smoothstep(.61, .82, mossNoise)
        * (1 - dirtAmount)
        * (.34 + middle * .34);
      color = mixRgb(color, moss, mossAmount);

      const dryAmount = smoothstep(.64, .85, dryNoise)
        * (1 - dirtAmount * .62)
        * .34;
      color = mixRgb(color, dryGrass, dryAmount);

      const grain = (fine - .5) * 8.5 + (hash2(px, py, 229) - .5) * 3.2;
      const shade = .91 + macro * .13;

      const index = (py * texture.width + px) * 4;
      pixels[index] = Math.max(0, Math.min(255, color[0] * shade + grain));
      pixels[index + 1] = Math.max(0, Math.min(255, color[1] * shade + grain));
      pixels[index + 2] = Math.max(0, Math.min(255, color[2] * shade + grain * .62));
      pixels[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return texture;
}

function clusteredPoint(random, cluster) {
  const angle = random() * TAU;
  const radius = Math.sqrt(random());
  return {
    x: cluster.x + Math.cos(angle) * cluster.rx * radius,
    y: cluster.y + Math.sin(angle) * cluster.ry * radius,
  };
}

function buildDecor() {
  const random = seededRandom(0x6a72616e);
  const bounds = { x: 58, y: 58, w: 1164, h: 604 };
  const obstacles = [
    { x: 250, y: 145, w: 100, h: 140 },
    { x: 250, y: 435, w: 100, h: 140 },
    { x: 930, y: 145, w: 100, h: 140 },
    { x: 930, y: 435, w: 100, h: 140 },
  ];

  const valid = (point, padding) =>
    point.x >= bounds.x + 10
    && point.x <= bounds.x + bounds.w - 10
    && point.y >= bounds.y + 10
    && point.y <= bounds.y + bounds.h - 10
    && !insideExpandedObstacle(point.x, point.y, obstacles, padding);

  const clusteredSample = (count, padding, make) => {
    const out = [];
    let guard = count * 30;

    while (out.length < count && guard-- > 0) {
      const cluster = VEGETATION_CLUSTERS[Math.floor(random() * VEGETATION_CLUSTERS.length)];
      const point = clusteredPoint(random, cluster);
      if (!valid(point, padding)) continue;
      out.push(make(point.x, point.y, random));
    }

    return out;
  };

  const freeSample = (count, padding, make) => {
    const out = [];
    let guard = count * 30;

    while (out.length < count && guard-- > 0) {
      const point = {
        x: bounds.x + 18 + random() * (bounds.w - 36),
        y: bounds.y + 18 + random() * (bounds.h - 36),
      };
      if (!valid(point, padding)) continue;
      out.push(make(point.x, point.y, random));
    }

    return out;
  };

  // Much fewer stones than v1. They are larger, softer and more deliberate.
  const pebbles = freeSample(24, 8, (x, y, r) => ({
    x,
    y,
    rx: 3.4 + r() * 5.8,
    ry: 2.3 + r() * 3.8,
    angle: r() * TAU,
    tone: r(),
  }));

  const grass = clusteredSample(54, 6, (x, y, r) => ({
    x,
    y,
    size: 3.2 + r() * 5.3,
    angle: r() * TAU,
    tone: r(),
  }));

  const clover = clusteredSample(22, 8, (x, y, r) => ({
    x,
    y,
    size: 4.2 + r() * 4.3,
    angle: r() * TAU,
    tone: r(),
  }));

  return { pebbles, grass, clover };
}

const DECOR = buildDecor();

function drawGrassBlade(ctx, tuft) {
  const main = tuft.tone > .5 ? "#617a40" : "#536c39";
  const light = tuft.tone > .68 ? "#78934c" : "#6a8545";

  ctx.save();
  ctx.translate(tuft.x, tuft.y);
  ctx.rotate(tuft.angle);
  ctx.lineCap = "round";
  ctx.globalAlpha = .25;

  for (let i = -1; i <= 1; i += 1) {
    const sway = i * tuft.size * .42;
    ctx.strokeStyle = i === 0 ? light : main;
    ctx.lineWidth = Math.max(.65, tuft.size * .15);
    ctx.beginPath();
    ctx.moveTo(i * tuft.size * .17, tuft.size * .30);
    ctx.quadraticCurveTo(
      sway * .42,
      -tuft.size * .18,
      sway,
      -tuft.size,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawClover(ctx, plant) {
  const dark = plant.tone > .55 ? "#52743d" : "#476837";
  const light = plant.tone > .62 ? "#70904b" : "#638344";

  ctx.save();
  ctx.translate(plant.x, plant.y);
  ctx.rotate(plant.angle);
  ctx.globalAlpha = .29;

  for (let i = 0; i < 3; i += 1) {
    const a = i * TAU / 3;
    const x = Math.cos(a) * plant.size * .45;
    const y = Math.sin(a) * plant.size * .45;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = i === 0 ? light : dark;
    ctx.beginPath();
    ctx.ellipse(plant.size * .23, 0, plant.size * .56, plant.size * .35, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawPebble(ctx, stone) {
  ctx.save();
  ctx.translate(stone.x, stone.y);
  ctx.rotate(stone.angle);

  ctx.globalAlpha = .22;
  ctx.fillStyle = "#1e2119";
  ctx.beginPath();
  ctx.ellipse(
    2.2,
    2.6,
    stone.rx * 1.15,
    stone.ry * 1.16,
    0,
    0,
    TAU,
  );
  ctx.fill();

  const gradient = ctx.createLinearGradient(
    -stone.rx,
    -stone.ry,
    stone.rx,
    stone.ry,
  );
  const light = stone.tone > .55 ? "#9d967a" : "#8c856d";
  const middle = stone.tone > .55 ? "#77715d" : "#6c6655";
  const dark = stone.tone > .55 ? "#575346" : "#4e4b40";
  gradient.addColorStop(0, light);
  gradient.addColorStop(.48, middle);
  gradient.addColorStop(1, dark);

  ctx.globalAlpha = .52;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, stone.rx, stone.ry, 0, 0, TAU);
  ctx.fill();

  ctx.globalAlpha = .16;
  ctx.fillStyle = "#e1d9bb";
  ctx.beginPath();
  ctx.ellipse(
    -stone.rx * .27,
    -stone.ry * .30,
    stone.rx * .34,
    stone.ry * .20,
    -.22,
    0,
    TAU,
  );
  ctx.fill();

  ctx.restore();
}

function chamferedRectPath(ctx, x, y, w, h, cut = 10) {
  const c = Math.min(cut, w * .18, h * .18);
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function drawStonePillar(ctx, rect) {
  ctx.save();

  // Broad ground shadow — visual only, collision remains the original rect.
  ctx.shadowColor = "rgba(23,24,18,.42)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 11;
  ctx.fillStyle = "#4b4b40";
  chamferedRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();

  ctx.shadowColor = "transparent";

  const body = ctx.createLinearGradient(
    rect.x,
    rect.y,
    rect.x + rect.w,
    rect.y + rect.h,
  );
  body.addColorStop(0, "#898474");
  body.addColorStop(.45, "#726e61");
  body.addColorStop(1, "#555348");
  ctx.fillStyle = body;
  chamferedRectPath(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 11);
  ctx.fill();

  // Distinct top slab and side face make the pillar read as a block of stone.
  const topH = Math.min(34, rect.h * .25);
  const top = ctx.createLinearGradient(
    rect.x,
    rect.y,
    rect.x,
    rect.y + topH,
  );
  top.addColorStop(0, "#b8b09b");
  top.addColorStop(.55, "#a39a83");
  top.addColorStop(1, "#89816f");
  ctx.fillStyle = top;
  chamferedRectPath(
    ctx,
    rect.x + 5,
    rect.y + 5,
    rect.w - 10,
    topH,
    8,
  );
  ctx.fill();

  ctx.globalAlpha = .24;
  ctx.fillStyle = "#393a33";
  ctx.beginPath();
  ctx.moveTo(rect.x + rect.w - 9, rect.y + topH + 9);
  ctx.lineTo(rect.x + rect.w - 3, rect.y + topH + 4);
  ctx.lineTo(rect.x + rect.w - 3, rect.y + rect.h - 11);
  ctx.lineTo(rect.x + rect.w - 12, rect.y + rect.h - 5);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = .19;
  ctx.fillStyle = "#262820";
  ctx.beginPath();
  ctx.moveTo(rect.x + 10, rect.y + rect.h - 31);
  ctx.lineTo(rect.x + rect.w - 12, rect.y + rect.h - 31);
  ctx.lineTo(rect.x + rect.w - 5, rect.y + rect.h - 10);
  ctx.lineTo(rect.x + 10, rect.y + rect.h - 6);
  ctx.closePath();
  ctx.fill();

  // Tiny lichen, not large moss blobs.
  ctx.globalAlpha = .18;
  const lichen = [
    [rect.x + 17, rect.y + 18, 7, 3],
    [rect.x + rect.w - 20, rect.y + topH + 12, 6, 3],
    [rect.x + 15, rect.y + rect.h - 20, 5, 2.6],
  ];
  for (const [x, y, rx, ry] of lichen) {
    ctx.fillStyle = "#667548";
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -.2, 0, TAU);
    ctx.fill();
  }

  ctx.globalAlpha = .22;
  ctx.strokeStyle = "#d7cfb6";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(rect.x + 12, rect.y + 7);
  ctx.lineTo(rect.x + rect.w - 15, rect.y + 7);
  ctx.stroke();

  ctx.restore();
}

function drawFallbackTerrain(ctx, arena) {
  const b = arena.bounds;
  const grass = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  grass.addColorStop(0, "#526a3a");
  grass.addColorStop(.5, "#687640");
  grass.addColorStop(1, "#53673a");
  ctx.fillStyle = grass;
  ctx.fillRect(b.x, b.y, b.w, b.h);
}

function paintGrandRingEnvironment(ctx, arena, width, height) {
  if (!isGrandRingEnvironment(arena)) return false;

  const outside = ctx.createRadialGradient(
    width * .5,
    height * .48,
    100,
    width * .5,
    height * .5,
    760,
  );
  outside.addColorStop(0, "#35412a");
  outside.addColorStop(1, "#20251d");
  ctx.fillStyle = outside;
  ctx.fillRect(0, 0, width, height);

  const b = arena.bounds;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();

  const terrain = buildTerrainTexture(arena);
  if (terrain) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      terrain,
      0,
      0,
      terrain.width,
      terrain.height,
      b.x,
      b.y,
      b.w,
      b.h,
    );
    ctx.restore();
  } else {
    drawFallbackTerrain(ctx, arena);
  }

  // A few very soft light/shade masses sit on top of the noise so the floor
  // feels painted rather than like a visible procedural texture.
  const lightMasses = [
    [265, 225, 250, "rgba(188,188,97,.12)"],
    [690, 180, 320, "rgba(201,183,99,.08)"],
    [970, 480, 300, "rgba(49,76,43,.12)"],
    [405, 555, 260, "rgba(43,71,39,.10)"],
  ];

  for (const [x, y, radius, color] of lightMasses) {
    const g = ctx.createRadialGradient(x, y, 12, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Subtle grounded grain instead of hundreds of visible black dots.
  const grain = seededRandom(0x31f26a);
  for (let i = 0; i < 170; i += 1) {
    const x = b.x + grain() * b.w;
    const y = b.y + grain() * b.h;
    if (insideExpandedObstacle(x, y, arena.obstacles, 0)) continue;
    ctx.globalAlpha = .025 + grain() * .025;
    ctx.fillStyle = grain() > .48 ? "#d0ca89" : "#293824";
    const size = .5 + grain() * .9;
    ctx.fillRect(x, y, size, size);
  }

  for (const tuft of DECOR.grass) drawGrassBlade(ctx, tuft);
  for (const plant of DECOR.clover) drawClover(ctx, plant);
  for (const pebble of DECOR.pebbles) drawPebble(ctx, pebble);

  // Soft ambient shading: keep the middle playable and readable while the
  // edges fall slightly darker like the reference image.
  ctx.globalAlpha = .12;
  const ambient = ctx.createRadialGradient(
    b.x + b.w * .48,
    b.y + b.h * .45,
    100,
    b.x + b.w * .50,
    b.y + b.h * .50,
    b.w * .68,
  );
  ambient.addColorStop(0, "rgba(222,207,129,.22)");
  ambient.addColorStop(.66, "rgba(50,62,36,0)");
  ambient.addColorStop(1, "rgba(17,23,17,.58)");
  ctx.fillStyle = ambient;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.restore();

  // Muted earth rim. It should frame the arena without looking like a grid.
  ctx.save();
  ctx.strokeStyle = "#695b40";
  ctx.lineWidth = 4;
  ctx.globalAlpha = .66;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "#a18a5a";
  ctx.lineWidth = 1;
  ctx.globalAlpha = .20;
  ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
  ctx.restore();

  for (const obstacle of arena.obstacles) drawStonePillar(ctx, obstacle);

  return true;
}

export function isGrandRingEnvironment(arena) {
  return arena?.id === GRAND_RING_ID;
}

let cachedTerrain = null;
let cachedTerrainKey = "";

export function drawGrandRingEnvironment(ctx, arena, width, height) {
  if (!isGrandRingEnvironment(arena)) return false;

  const cacheKey = [
    TERRAIN_VERSION,
    arena.id,
    width + "x" + height,
  ].join(":");

  const canCache =
    typeof document !== "undefined"
    && typeof document.createElement === "function";

  if (canCache && (!cachedTerrain || cachedTerrainKey !== cacheKey)) {
    const buffer = document.createElement("canvas");
    buffer.width = width;
    buffer.height = height;
    const bufferCtx = buffer.getContext("2d");

    if (bufferCtx) {
      paintGrandRingEnvironment(bufferCtx, arena, width, height);
      cachedTerrain = buffer;
      cachedTerrainKey = cacheKey;
    }
  }

  if (cachedTerrain && cachedTerrainKey === cacheKey) {
    ctx.drawImage(cachedTerrain, 0, 0);
    return true;
  }

  return paintGrandRingEnvironment(ctx, arena, width, height);
}
