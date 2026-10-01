const TAU = Math.PI * 2;
const GRAND_RING_ID = "four-pillar-ring";
const TERRAIN_VERSION = "grand-ring-v4-polish";

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
  { x: 610, y: 285, rx: 66, ry: 42 },
  { x: 1010, y: 345, rx: 58, ry: 40 },
]);

// Medium-sized authored color masses are deliberately sparse. They sit above
// the procedural noise and create the "painted by hand" rhythm that pure
// noise cannot provide on its own.
const PAINTED_PATCHES = Object.freeze([
  { x: 175, y: 155, rx: 150, ry: 54, rot: -.14, inner: "rgba(147,123,72,.18)", mid: "rgba(132,108,63,.08)" },
  { x: 410, y: 270, rx: 118, ry: 48, rot: .18, inner: "rgba(92,112,58,.16)", mid: "rgba(72,96,50,.07)" },
  { x: 650, y: 170, rx: 145, ry: 56, rot: -.05, inner: "rgba(153,139,77,.13)", mid: "rgba(136,123,69,.06)" },
  { x: 890, y: 250, rx: 128, ry: 50, rot: .12, inner: "rgba(75,101,53,.15)", mid: "rgba(63,91,48,.07)" },
  { x: 1110, y: 180, rx: 104, ry: 52, rot: -.22, inner: "rgba(137,112,67,.16)", mid: "rgba(121,98,58,.07)" },
  { x: 250, y: 475, rx: 132, ry: 50, rot: -.16, inner: "rgba(68,94,49,.16)", mid: "rgba(57,83,45,.07)" },
  { x: 575, y: 520, rx: 148, ry: 56, rot: .07, inner: "rgba(143,119,69,.14)", mid: "rgba(126,105,61,.06)" },
  { x: 860, y: 520, rx: 126, ry: 48, rot: -.12, inner: "rgba(82,105,53,.14)", mid: "rgba(68,94,48,.06)" },
  { x: 1100, y: 515, rx: 116, ry: 54, rot: .16, inner: "rgba(144,116,66,.14)", mid: "rgba(126,101,58,.06)" },
]);

const PILLAR_VARIANTS = Object.freeze([
  { cut: 14, inset: 2, topInset: 6, topShift: -1, topScale: .24, crack: .22, moss: .30 },
  { cut: 10, inset: 3, topInset: 7, topShift: 2, topScale: .22, crack: -.18, moss: .20 },
  { cut: 16, inset: 2, topInset: 5, topShift: 1, topScale: .26, crack: .34, moss: .26 },
  { cut: 12, inset: 3, topInset: 6, topShift: -2, topScale: .23, crack: -.31, moss: .34 },
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
  const scale = 3;
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

      const grain = (fine - .5) * 9.6 + (hash2(px, py, 229) - .5) * 3.6;
      const microContrast = (middle - .5) * 4.2;
      const shade = .895 + macro * .15;

      const index = (py * texture.width + px) * 4;
      pixels[index] = Math.max(0, Math.min(255, color[0] * shade + grain + microContrast));
      pixels[index + 1] = Math.max(0, Math.min(255, color[1] * shade + grain + microContrast * .78));
      pixels[index + 2] = Math.max(0, Math.min(255, color[2] * shade + grain * .62 + microContrast * .42));
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

  // Isolated stones are now rare. Most stones appear as small authored-looking
  // groups, which reads much closer to the reference than evenly scattered dots.
  const pebbles = freeSample(7, 10, (x, y, r) => ({
    x,
    y,
    rx: 3.8 + r() * 5.8,
    ry: 2.6 + r() * 3.6,
    angle: r() * TAU,
    tone: r(),
  }));

  const rockGroups = freeSample(11, 18, (x, y, r) => {
    const count = 2 + Math.floor(r() * 3);
    const stones = [];

    for (let i = 0; i < count; i += 1) {
      const a = r() * TAU;
      const rr = 3 + r() * 13;
      stones.push({
        x: Math.cos(a) * rr,
        y: Math.sin(a) * rr * .65,
        rx: 2.8 + r() * 5.3,
        ry: 2 + r() * 3.2,
        angle: r() * TAU,
        tone: r(),
      });
    }

    return { x, y, stones };
  });

  const grass = clusteredSample(44, 6, (x, y, r) => ({
    x,
    y,
    size: 3.4 + r() * 5.2,
    angle: r() * TAU,
    tone: r(),
  }));

  const clover = clusteredSample(18, 8, (x, y, r) => ({
    x,
    y,
    size: 4.8 + r() * 4.4,
    angle: r() * TAU,
    tone: r(),
  }));

  const broadleaf = clusteredSample(30, 9, (x, y, r) => ({
    x,
    y,
    size: 5.4 + r() * 5.6,
    angle: r() * TAU,
    tone: r(),
    leaves: 3 + Math.floor(r() * 3),
  }));

  return { pebbles, rockGroups, grass, clover, broadleaf };
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

function drawRockGroup(ctx, group) {
  for (const stone of group.stones) {
    drawPebble(ctx, {
      ...stone,
      x: group.x + stone.x,
      y: group.y + stone.y,
    });
  }

  ctx.save();
  ctx.globalAlpha = .13;
  ctx.fillStyle = "#3d5133";
  ctx.beginPath();
  ctx.ellipse(group.x, group.y + 3, 15, 7, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawBroadleafCluster(ctx, plant) {
  const dark = plant.tone > .52 ? "#4d713d" : "#456638";
  const mid = plant.tone > .62 ? "#6d914b" : "#5f8446";
  const light = plant.tone > .74 ? "#829e55" : "#75934f";

  ctx.save();
  ctx.translate(plant.x, plant.y);
  ctx.rotate(plant.angle);
  ctx.globalAlpha = .44;

  ctx.strokeStyle = "#435f36";
  ctx.lineWidth = Math.max(.7, plant.size * .10);
  ctx.beginPath();
  ctx.moveTo(0, plant.size * .42);
  ctx.lineTo(0, -plant.size * .16);
  ctx.stroke();

  for (let i = 0; i < plant.leaves; i += 1) {
    const a = i / plant.leaves * TAU + (i % 2) * .16;
    const rr = plant.size * (.38 + (i % 3) * .05);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * .78;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = i % 3 === 0 ? light : i % 2 ? mid : dark;
    ctx.beginPath();
    ctx.ellipse(
      plant.size * .25,
      0,
      plant.size * .62,
      plant.size * .34,
      .08,
      0,
      TAU,
    );
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawPaintedGroundPatches(ctx) {
  for (const patch of PAINTED_PATCHES) {
    ctx.save();
    ctx.translate(patch.x, patch.y);
    ctx.rotate(patch.rot);
    ctx.scale(1, patch.ry / patch.rx);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, patch.rx);
    gradient.addColorStop(0, patch.inner);
    gradient.addColorStop(.56, patch.mid);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, patch.rx, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawPillarGrounding(ctx, rect, index) {
  const variant = PILLAR_VARIANTS[index % PILLAR_VARIANTS.length];

  ctx.save();

  // No separate oval/radial shadow here. Those detached shapes made the
  // pillar read as if it hovered above the floor. Grounding is now handled
  // by the pillar's own soft directional cast shadow, like the reference.
  ctx.globalAlpha = variant.moss * .72;
  ctx.fillStyle = "#5b743f";
  const baseY = rect.y + rect.h - 1;
  const tufts = [
    [rect.x + 11, baseY + 2, 8, 3.4, -.20],
    [rect.x + rect.w - 9, baseY + 1, 6.5, 3, .18],
    [rect.x + rect.w * .50, baseY + 3, 9, 3.4, .05],
  ];
  for (const [x, y, rx, ry, angle] of tufts) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
    ctx.fill();
  }

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

function drawStonePillar(ctx, rect, index = 0) {
  const variant = PILLAR_VARIANTS[index % PILLAR_VARIANTS.length];
  const inset = variant.inset;
  const x = rect.x + inset;
  const y = rect.y + inset;
  const w = rect.w - inset * 2;
  const h = rect.h - inset * 2;

  ctx.save();

  // Every pillar gets a slightly different silhouette while remaining fully
  // inside the original collision rectangle.
  // Soft directional shadow stays attached to the lower/right silhouette,
  // matching the grounded look in the reference screenshot.
  ctx.shadowColor = "rgba(18,20,15,.24)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 5 + (index % 2) * .5;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = "#48483f";
  chamferedRectPath(ctx, x, y, w, h, variant.cut);
  ctx.fill();

  ctx.shadowColor = "transparent";

  const body = ctx.createLinearGradient(x, y, x + w, y + h);
  body.addColorStop(0, index % 2 ? "#787467" : "#7d796b");
  body.addColorStop(.43, index % 3 ? "#646156" : "#686459");
  body.addColorStop(1, "#45463f");
  ctx.fillStyle = body;
  chamferedRectPath(ctx, x + 1, y + 1, w - 2, h - 2, Math.max(7, variant.cut - 2));
  ctx.fill();

  const topH = Math.min(38, h * variant.topScale);
  const topX = x + variant.topInset + variant.topShift;
  const topW = w - variant.topInset * 2;
  const top = ctx.createLinearGradient(topX, y + 4, topX, y + topH + 8);
  top.addColorStop(0, index % 2 ? "#a59d89" : "#9f9885");
  top.addColorStop(.52, "#8f8877");
  top.addColorStop(1, "#716d61");
  ctx.fillStyle = top;
  chamferedRectPath(
    ctx,
    topX,
    y + 5,
    topW,
    topH,
    Math.max(6, variant.cut - 5),
  );
  ctx.fill();

  // Side planes are offset per pillar so four identical collision rectangles
  // don't read as four cloned UI cards.
  ctx.globalAlpha = .25;
  ctx.fillStyle = "#363830";
  ctx.beginPath();
  ctx.moveTo(x + w - 10, y + topH + 10);
  ctx.lineTo(x + w - 2, y + topH + 4);
  ctx.lineTo(x + w - 3, y + h - 12);
  ctx.lineTo(x + w - 13, y + h - 5);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = .18;
  ctx.fillStyle = "#272a24";
  ctx.beginPath();
  ctx.moveTo(x + 9, y + h - 33);
  ctx.lineTo(x + w - 13, y + h - 31 + (index % 2) * 3);
  ctx.lineTo(x + w - 7, y + h - 10);
  ctx.lineTo(x + 12, y + h - 6);
  ctx.closePath();
  ctx.fill();

  // Hairline cracks make the blocks feel carved/weathered rather than plastic.
  ctx.globalAlpha = .20;
  ctx.strokeStyle = "#34362f";
  ctx.lineWidth = 1.15;
  ctx.beginPath();
  const crackX = x + w * (.34 + index * .07);
  const crackY = y + topH + 21;
  ctx.moveTo(crackX, crackY);
  ctx.lineTo(crackX + variant.crack * 18, crackY + 14);
  ctx.lineTo(crackX - variant.crack * 12, crackY + 28);
  ctx.lineTo(crackX + variant.crack * 20, crackY + 40);
  ctx.stroke();

  // Small top chips break the perfect top edge without ever leaving collision.
  ctx.globalAlpha = .28;
  ctx.fillStyle = "#625f55";
  const chipX = topX + topW * (index % 2 ? .72 : .25);
  ctx.beginPath();
  ctx.moveTo(chipX - 5, y + 5);
  ctx.lineTo(chipX + 6, y + 5);
  ctx.lineTo(chipX + 2, y + 10);
  ctx.lineTo(chipX - 4, y + 9);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = .16 + variant.moss * .15;
  ctx.fillStyle = "#617247";
  const lichen = [
    [x + 16, y + 18, 6 + index % 2, 3],
    [x + w - 19, y + topH + 13, 5.5, 2.8],
    [x + 15 + index * 2, y + h - 19, 5, 2.5],
  ];
  for (const [lx, ly, rx, ry] of lichen) {
    ctx.beginPath();
    ctx.ellipse(lx, ly, rx, ry, -.2, 0, TAU);
    ctx.fill();
  }

  ctx.globalAlpha = .13;
  ctx.strokeStyle = "#c5bdab";
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(topX + 7, y + 7);
  ctx.lineTo(topX + topW - 10, y + 7);
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

  // Authored medium-scale forms bridge the gap between broad procedural
  // terrain and tiny ground detail. This is the main v3 "hand-painted" layer.
  drawPaintedGroundPatches(ctx);

  // A few very soft light/shade masses sit on top of the noise so the floor
  // feels painted rather than like a visible procedural texture.
  const lightMasses = [
    [265, 225, 250, "rgba(188,188,97,.13)"],
    [690, 180, 320, "rgba(201,183,99,.09)"],
    [970, 480, 300, "rgba(45,72,41,.14)"],
    [405, 555, 260, "rgba(40,68,37,.12)"],
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
  for (let i = 0; i < 145; i += 1) {
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
  for (const plant of DECOR.broadleaf) drawBroadleafCluster(ctx, plant);
  for (const group of DECOR.rockGroups) drawRockGroup(ctx, group);
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

  arena.obstacles.forEach((obstacle, index) => {
    drawPillarGrounding(ctx, obstacle, index);
  });
  arena.obstacles.forEach((obstacle, index) => {
    drawStonePillar(ctx, obstacle, index);
  });

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
