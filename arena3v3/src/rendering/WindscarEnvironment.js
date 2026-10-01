const TAU = Math.PI * 2;
const WIND_SCAR_ID = "windscar-proving-grounds";
const TERRAIN_VERSION = "windscar-v1-volcanic";

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
    sum += valueNoise2d(x * frequency, y * frequency, seed + i * 137) * amp;
    norm += amp;
    amp *= .5;
    frequency *= 2.03;
  }

  return norm > 0 ? sum / norm : 0;
}

function mixRgb(a, b, t) {
  return [
    lerp(a[0], b[0], t),
    lerp(a[1], b[1], t),
    lerp(a[2], b[2], t),
  ];
}

function insideExpandedObstacle(x, y, obstacles, padding = 0) {
  return obstacles.some(rect =>
    x >= rect.x - padding
    && x <= rect.x + rect.w + padding
    && y >= rect.y - padding
    && y <= rect.y + rect.h + padding
  );
}

const BURNT_FIELDS = Object.freeze([
  { x: 150, y: 180, rx: 175, ry: 95, strength: .50 },
  { x: 450, y: 160, rx: 215, ry: 90, strength: .41 },
  { x: 790, y: 165, rx: 190, ry: 90, strength: .34 },
  { x: 1100, y: 205, rx: 150, ry: 100, strength: .48 },
  { x: 270, y: 405, rx: 220, ry: 105, strength: .44 },
  { x: 650, y: 380, rx: 235, ry: 105, strength: .38 },
  { x: 1030, y: 455, rx: 190, ry: 100, strength: .47 },
  { x: 560, y: 570, rx: 255, ry: 88, strength: .36 },
]);

const BLACK_GRAVEL_FIELDS = Object.freeze([
  { x: 215, y: 275, rx: 95, ry: 58 },
  { x: 490, y: 515, rx: 115, ry: 64 },
  { x: 740, y: 245, rx: 110, ry: 60 },
  { x: 1020, y: 310, rx: 98, ry: 58 },
  { x: 960, y: 555, rx: 94, ry: 54 },
  { x: 365, y: 155, rx: 84, ry: 48 },
]);

const PAINTED_PATCHES = Object.freeze([
  { x: 175, y: 150, rx: 155, ry: 58, rot: -.18, inner: "rgba(124,77,49,.16)", mid: "rgba(96,59,43,.06)" },
  { x: 430, y: 260, rx: 130, ry: 48, rot: .12, inner: "rgba(45,43,40,.18)", mid: "rgba(36,35,34,.07)" },
  { x: 675, y: 175, rx: 155, ry: 58, rot: -.08, inner: "rgba(117,67,44,.13)", mid: "rgba(94,54,40,.05)" },
  { x: 910, y: 245, rx: 135, ry: 54, rot: .16, inner: "rgba(47,45,42,.16)", mid: "rgba(36,35,33,.06)" },
  { x: 1110, y: 185, rx: 105, ry: 48, rot: -.20, inner: "rgba(124,73,46,.15)", mid: "rgba(98,58,40,.05)" },
  { x: 230, y: 505, rx: 145, ry: 56, rot: -.13, inner: "rgba(51,47,43,.18)", mid: "rgba(38,37,35,.06)" },
  { x: 595, y: 530, rx: 165, ry: 62, rot: .06, inner: "rgba(117,68,45,.13)", mid: "rgba(92,55,41,.05)" },
  { x: 875, y: 520, rx: 135, ry: 52, rot: -.10, inner: "rgba(50,46,43,.16)", mid: "rgba(37,36,34,.06)" },
]);

const HEAT_PATCHES = Object.freeze([
  { x: 215, y: 125, radius: 72, alpha: .08 },
  { x: 735, y: 185, radius: 58, alpha: .07 },
  { x: 1070, y: 500, radius: 70, alpha: .08 },
  { x: 485, y: 555, radius: 64, alpha: .06 },
]);

const CRACKS = Object.freeze([
  { x: 160, y: 230, angle: .24, length: 86, branches: 2, glow: .45 },
  { x: 520, y: 145, angle: -.18, length: 76, branches: 2, glow: .35 },
  { x: 770, y: 530, angle: .46, length: 94, branches: 3, glow: .48 },
  { x: 1080, y: 265, angle: -.34, length: 72, branches: 2, glow: .38 },
  { x: 420, y: 430, angle: .66, length: 62, branches: 2, glow: .28 },
  { x: 930, y: 150, angle: .20, length: 58, branches: 2, glow: .26 },
]);

const OBSTACLE_VARIANTS = Object.freeze([
  { cut: 15, inset: 2, topScale: .24, crack: .30, warm: .18 },
  { cut: 11, inset: 2, topScale: .27, crack: -.24, warm: .24 },
  { cut: 14, inset: 3, topScale: .23, crack: .18, warm: .16 },
]);

function fieldStrength(x, y, fields) {
  let strongest = 0;

  for (const patch of fields) {
    const dx = (x - patch.x) / patch.rx;
    const dy = (y - patch.y) / patch.ry;
    const distance = dx * dx + dy * dy;
    if (distance >= 1.7) continue;

    const influence = Math.exp(-distance * 2.12)
      * (Number.isFinite(patch.strength) ? patch.strength : 1);
    strongest = Math.max(strongest, influence);
  }

  return strongest;
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

  const ashDark = [47, 43, 39];
  const ashMid = [67, 58, 50];
  const earth = [89, 63, 46];
  const burntEarth = [108, 66, 43];
  const char = [35, 34, 33];
  const gravel = [46, 45, 43];

  for (let py = 0; py < texture.height; py += 1) {
    for (let px = 0; px < texture.width; px += 1) {
      const worldX = b.x + (px + .5) / texture.width * b.w;
      const worldY = b.y + (py + .5) / texture.height * b.h;

      const macro = fbm(worldX * .0040, worldY * .0040, 31, 4);
      const middle = fbm(worldX * .010, worldY * .010, 59, 4);
      const fine = fbm(worldX * .030, worldY * .030, 91, 3);
      const burntNoise = fbm(worldX * .0052 + 13.7, worldY * .0052 - 9.1, 127, 5);
      const charNoise = fbm(worldX * .0070 - 11.4, worldY * .0070 + 6.9, 173, 4);
      const gravelNoise = fbm(worldX * .0082 + 8.2, worldY * .0082 + 14.2, 211, 4);

      let color = mixRgb(ashDark, ashMid, clamp01(.18 + macro * .73));
      color = mixRgb(color, earth, smoothstep(.54, .79, middle) * .28);

      const authoredBurn = fieldStrength(worldX, worldY, BURNT_FIELDS);
      const burnSignal = burntNoise * .68 + authoredBurn * .58;
      const burnAmount = smoothstep(.51, .73, burnSignal);
      color = mixRgb(color, burntEarth, burnAmount * .70);

      const charAmount = smoothstep(.62, .84, charNoise)
        * (1 - burnAmount * .38)
        * .54;
      color = mixRgb(color, char, charAmount);

      const gravelAmount = smoothstep(.60, .83, gravelNoise)
        * (1 - burnAmount * .25)
        * .37;
      color = mixRgb(color, gravel, gravelAmount);

      const grain = (fine - .5) * 8.8 + (hash2(px, py, 257) - .5) * 4.4;
      const microContrast = (middle - .5) * 4.1;
      const shade = .90 + macro * .14;

      const index = (py * texture.width + px) * 4;
      pixels[index] = Math.max(0, Math.min(255, color[0] * shade + grain + microContrast));
      pixels[index + 1] = Math.max(0, Math.min(255, color[1] * shade + grain * .80 + microContrast * .62));
      pixels[index + 2] = Math.max(0, Math.min(255, color[2] * shade + grain * .55 + microContrast * .38));
      pixels[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  return texture;
}

function drawPaintedPatches(ctx) {
  for (const patch of PAINTED_PATCHES) {
    ctx.save();
    ctx.translate(patch.x, patch.y);
    ctx.rotate(patch.rot);
    ctx.scale(1, patch.ry / patch.rx);

    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, patch.rx);
    gradient.addColorStop(0, patch.inner);
    gradient.addColorStop(.58, patch.mid);
    gradient.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, patch.rx, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawHeatPatches(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const patch of HEAT_PATCHES) {
    const g = ctx.createRadialGradient(
      patch.x,
      patch.y,
      0,
      patch.x,
      patch.y,
      patch.radius,
    );
    g.addColorStop(0, `rgba(202,92,31,${patch.alpha})`);
    g.addColorStop(.48, `rgba(149,57,27,${patch.alpha * .46})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(
      patch.x - patch.radius,
      patch.y - patch.radius,
      patch.radius * 2,
      patch.radius * 2,
    );
  }

  ctx.restore();
}

function drawCrack(ctx, crack, index) {
  const random = seededRandom(0x9a31 + index * 73);
  const dirX = Math.cos(crack.angle);
  const dirY = Math.sin(crack.angle);
  const normX = -dirY;
  const normY = dirX;

  const points = [{ x: crack.x, y: crack.y }];
  const segments = 7;

  // Uneven segment spacing + lateral drift keeps cracks from reading like
  // hand-drawn zig-zag lines while remaining deterministic.
  let traveled = 0;
  const steps = [];
  for (let i = 0; i < segments; i += 1) {
    const step = .78 + random() * .48;
    steps.push(step);
    traveled += step;
  }

  let accumulated = 0;
  for (let i = 1; i <= segments; i += 1) {
    accumulated += steps[i - 1];
    const t = accumulated / traveled;
    const edgeFade = Math.sin(Math.PI * t);
    const jitter = (random() - .5) * (11 + edgeFade * 9);
    points.push({
      x: crack.x + dirX * crack.length * t + normX * jitter,
      y: crack.y + dirY * crack.length * t + normY * jitter,
    });
  }

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Draw each segment with slightly different width instead of one perfectly
  // uniform stroke. This makes the fissure feel chipped into the terrain.
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const widthNoise = .82 + random() * .40;

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(18,16,15,.73)";
    ctx.lineWidth = 3.4 * widthNoise;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();

    if (crack.glow > 0) {
      const glowNoise = .72 + random() * .34;
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "rgba(255,103,31,.48)";
      ctx.shadowBlur = 6;
      ctx.strokeStyle = `rgba(226,83,25,${(.16 + crack.glow * .25) * glowNoise})`;
      ctx.lineWidth = .78 + random() * .48;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  for (let branch = 0; branch < crack.branches; branch += 1) {
    const anchorIndex = 1 + Math.floor(random() * (points.length - 2));
    const anchor = points[anchorIndex];
    const sign = random() > .5 ? 1 : -1;
    const branchAngle = crack.angle + sign * (.52 + random() * .52);
    const branchLength = 14 + random() * 25;
    const bend = (random() - .5) * .40;

    const midX = anchor.x + Math.cos(branchAngle) * branchLength * .54;
    const midY = anchor.y + Math.sin(branchAngle) * branchLength * .54;
    const endX = midX + Math.cos(branchAngle + bend) * branchLength * .46;
    const endY = midY + Math.sin(branchAngle + bend) * branchLength * .46;

    ctx.globalCompositeOperation = "source-over";
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(17,15,14,.58)";
    ctx.lineWidth = 1.55 + random() * .55;
    ctx.beginPath();
    ctx.moveTo(anchor.x, anchor.y);
    ctx.lineTo(midX, midY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    if (crack.glow > .3) {
      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = "rgba(243,91,28,.35)";
      ctx.shadowBlur = 4;
      ctx.strokeStyle = `rgba(215,75,23,${.08 + crack.glow * .13})`;
      ctx.lineWidth = .55 + random() * .22;
      ctx.beginPath();
      ctx.moveTo(anchor.x, anchor.y);
      ctx.lineTo(midX, midY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function buildDecor(arena) {
  const random = seededRandom(0x7a1f0c);
  const b = arena.bounds;

  const valid = (x, y, padding = 0) =>
    x >= b.x + 14
    && x <= b.x + b.w - 14
    && y >= b.y + 14
    && y <= b.y + b.h - 14
    && !insideExpandedObstacle(x, y, arena.obstacles, padding);

  const gravelGroups = [];
  for (const field of BLACK_GRAVEL_FIELDS) {
    const stones = [];
    for (let i = 0; i < 11; i += 1) {
      const a = random() * TAU;
      const rr = Math.sqrt(random());
      const x = field.x + Math.cos(a) * field.rx * rr;
      const y = field.y + Math.sin(a) * field.ry * rr;

      if (!valid(x, y, 5)) continue;
      stones.push({
        x,
        y,
        rx: 1.4 + random() * 3.5,
        ry: 1 + random() * 2.4,
        angle: random() * TAU,
        tone: random(),
      });
    }
    gravelGroups.push(stones);
  }

  const rocks = [];
  let guard = 240;
  while (rocks.length < 18 && guard-- > 0) {
    const x = b.x + 18 + random() * (b.w - 36);
    const y = b.y + 18 + random() * (b.h - 36);
    if (!valid(x, y, 10)) continue;
    rocks.push({
      x,
      y,
      rx: 3.8 + random() * 6.2,
      ry: 2.4 + random() * 4.0,
      angle: random() * TAU,
      tone: random(),
    });
  }

  const ashTufts = [];
  guard = 260;
  while (ashTufts.length < 24 && guard-- > 0) {
    const x = b.x + 20 + random() * (b.w - 40);
    const y = b.y + 20 + random() * (b.h - 40);
    if (!valid(x, y, 7)) continue;
    ashTufts.push({
      x,
      y,
      size: 3.4 + random() * 4.8,
      angle: random() * TAU,
      tone: random(),
    });
  }

  return { gravelGroups, rocks, ashTufts };
}

function drawGravelStone(ctx, stone, group = false) {
  ctx.save();
  ctx.translate(stone.x, stone.y);
  ctx.rotate(stone.angle);

  ctx.globalAlpha = group ? .24 : .32;
  ctx.fillStyle = "#181817";
  ctx.beginPath();
  ctx.ellipse(1.4, 1.8, stone.rx * 1.14, stone.ry * 1.15, 0, 0, TAU);
  ctx.fill();

  const gradient = ctx.createLinearGradient(-stone.rx, -stone.ry, stone.rx, stone.ry);
  const high = stone.tone > .55 ? "#68645e" : "#5c5955";
  const mid = stone.tone > .55 ? "#474542" : "#3e3d3b";
  const low = stone.tone > .55 ? "#2f2e2d" : "#292827";
  gradient.addColorStop(0, high);
  gradient.addColorStop(.48, mid);
  gradient.addColorStop(1, low);

  ctx.globalAlpha = group ? .38 : .50;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, stone.rx, stone.ry, 0, 0, TAU);
  ctx.fill();

  ctx.restore();
}

function drawAshTuft(ctx, tuft) {
  const dark = tuft.tone > .55 ? "#51473d" : "#474139";
  const light = tuft.tone > .70 ? "#6d5c49" : "#5d5144";

  ctx.save();
  ctx.translate(tuft.x, tuft.y);
  ctx.rotate(tuft.angle);
  ctx.lineCap = "round";
  ctx.globalAlpha = .24;

  for (let i = -1; i <= 1; i += 1) {
    const sway = i * tuft.size * .40;
    ctx.strokeStyle = i === 0 ? light : dark;
    ctx.lineWidth = Math.max(.65, tuft.size * .14);
    ctx.beginPath();
    ctx.moveTo(i * tuft.size * .16, tuft.size * .34);
    ctx.quadraticCurveTo(
      sway * .36,
      -tuft.size * .18,
      sway,
      -tuft.size,
    );
    ctx.stroke();
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

function drawVolcanicObstacle(ctx, rect, index) {
  const variant = OBSTACLE_VARIANTS[index % OBSTACLE_VARIANTS.length];
  const inset = variant.inset;
  const x = rect.x + inset;
  const y = rect.y + inset;
  const w = rect.w - inset * 2;
  const h = rect.h - inset * 2;
  const random = seededRandom(0xb451 + index * 97);

  ctx.save();

  // Same grounded shadow language as the corrected Grand Ring: one soft,
  // attached cast shadow only, no detached oval beneath the obstacle.
  ctx.shadowColor = "rgba(14,12,11,.34)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = "#2b2a29";
  chamferedRectPath(ctx, x, y, w, h, variant.cut);
  ctx.fill();

  ctx.shadowColor = "transparent";

  const body = ctx.createLinearGradient(x, y, x + w, y + h);
  body.addColorStop(0, "#56514c");
  body.addColorStop(.38, "#45413e");
  body.addColorStop(1, "#292a2a");
  ctx.fillStyle = body;
  chamferedRectPath(ctx, x + 1, y + 1, w - 2, h - 2, Math.max(7, variant.cut - 2));
  ctx.fill();

  const topH = Math.min(34, Math.max(18, h * variant.topScale));
  const top = ctx.createLinearGradient(x, y + 4, x, y + topH + 7);
  top.addColorStop(0, "#74706a");
  top.addColorStop(.48, "#5f5b56");
  top.addColorStop(1, "#484541");
  ctx.fillStyle = top;
  chamferedRectPath(ctx, x + 5, y + 5, w - 10, topH, Math.max(6, variant.cut - 5));
  ctx.fill();

  ctx.globalAlpha = .24;
  ctx.fillStyle = "#1e1f20";
  ctx.beginPath();
  ctx.moveTo(x + w - 10, y + topH + 9);
  ctx.lineTo(x + w - 2, y + topH + 4);
  ctx.lineTo(x + w - 3, y + h - 12);
  ctx.lineTo(x + w - 13, y + h - 5);
  ctx.closePath();
  ctx.fill();

  // Sparse basalt flecks break up the large clean faces without turning the
  // LOS obstacles into noisy textures.
  ctx.globalAlpha = .16;
  for (let i = 0; i < 7; i += 1) {
    const fx = x + 13 + random() * Math.max(8, w - 26);
    const fy = y + topH + 12 + random() * Math.max(8, h - topH - 28);
    const size = 1.1 + random() * 2.2;
    ctx.fillStyle = random() > .42 ? "#242526" : "#69635d";
    ctx.beginPath();
    ctx.ellipse(
      fx,
      fy,
      size,
      size * (.42 + random() * .34),
      random() * TAU,
      0,
      TAU,
    );
    ctx.fill();
  }

  // Tiny chips along the top rim make each obstacle feel hewn rather than
  // perfectly manufactured, while staying inside its collision rectangle.
  ctx.globalAlpha = .20;
  ctx.fillStyle = "#3e3c39";
  for (let i = 0; i < 3; i += 1) {
    const cx = x + 17 + random() * Math.max(10, w - 34);
    const cy = y + 5 + random() * 3;
    const cw = 4 + random() * 6;
    ctx.beginPath();
    ctx.moveTo(cx - cw * .5, cy);
    ctx.lineTo(cx + cw * .5, cy);
    ctx.lineTo(cx + cw * .18, cy + 4 + random() * 3);
    ctx.lineTo(cx - cw * .36, cy + 3 + random() * 2);
    ctx.closePath();
    ctx.fill();
  }

  ctx.globalAlpha = .24;
  ctx.strokeStyle = "#242322";
  ctx.lineWidth = 1.2;
  const crackX = x + w * (.33 + index * .12);
  const crackY = y + topH + 14;
  ctx.beginPath();
  ctx.moveTo(crackX, crackY);
  ctx.lineTo(crackX + variant.crack * 22, crackY + 13);
  ctx.lineTo(crackX - variant.crack * 12, crackY + 27);
  ctx.lineTo(crackX + variant.crack * 18, crackY + 41);
  ctx.stroke();

  // Secondary hairline fracture differs per obstacle and keeps the surface
  // from looking cloned without adding another strong visual mark.
  ctx.globalAlpha = .12;
  ctx.lineWidth = .8;
  const hairX = x + w * (.64 - index * .07);
  const hairY = y + topH + 20 + index * 5;
  ctx.beginPath();
  ctx.moveTo(hairX, hairY);
  ctx.lineTo(hairX + (random() - .5) * 8, hairY + 10);
  ctx.lineTo(hairX + (random() - .5) * 12, hairY + 19);
  ctx.stroke();

  // Tiny warm reflection from hot ground, not an emissive obstacle.
  ctx.globalAlpha = variant.warm;
  const warm = ctx.createLinearGradient(x, y + h - 25, x, y + h);
  warm.addColorStop(0, "rgba(139,63,33,0)");
  warm.addColorStop(1, "rgba(157,70,31,.48)");
  ctx.fillStyle = warm;
  ctx.fillRect(x + 7, y + h - 26, w - 14, 20);

  ctx.globalAlpha = .12;
  ctx.strokeStyle = "#aaa095";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + 11, y + 7);
  ctx.lineTo(x + w - 13, y + 7);
  ctx.stroke();

  ctx.restore();
}

function drawFallbackTerrain(ctx, arena) {
  const b = arena.bounds;
  const gradient = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  gradient.addColorStop(0, "#4d4138");
  gradient.addColorStop(.52, "#594536");
  gradient.addColorStop(1, "#353332");
  ctx.fillStyle = gradient;
  ctx.fillRect(b.x, b.y, b.w, b.h);
}

function paintWindscarEnvironment(ctx, arena, width, height) {
  if (!isWindscarEnvironment(arena)) return false;

  const outside = ctx.createRadialGradient(
    width * .5,
    height * .48,
    100,
    width * .5,
    height * .5,
    760,
  );
  outside.addColorStop(0, "#2e2926");
  outside.addColorStop(1, "#171615");
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

  drawPaintedPatches(ctx);
  drawHeatPatches(ctx);

  const decor = buildDecor(arena);
  for (const group of decor.gravelGroups) {
    for (const stone of group) drawGravelStone(ctx, stone, true);
  }
  for (const stone of decor.rocks) drawGravelStone(ctx, stone, false);
  for (const tuft of decor.ashTufts) drawAshTuft(ctx, tuft);

  CRACKS.forEach((crack, index) => {
    if (!insideExpandedObstacle(crack.x, crack.y, arena.obstacles, 18)) {
      drawCrack(ctx, crack, index);
    }
  });

  // Keep center readable and edges a little darker, like Grand Ring.
  ctx.globalAlpha = .13;
  const ambient = ctx.createRadialGradient(
    b.x + b.w * .50,
    b.y + b.h * .46,
    110,
    b.x + b.w * .50,
    b.y + b.h * .50,
    b.w * .67,
  );
  ambient.addColorStop(0, "rgba(143,97,61,.12)");
  ambient.addColorStop(.64, "rgba(47,39,34,0)");
  ambient.addColorStop(1, "rgba(12,12,12,.60)");
  ctx.fillStyle = ambient;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "#5a4436";
  ctx.lineWidth = 4;
  ctx.globalAlpha = .74;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "#9b6847";
  ctx.lineWidth = 1;
  ctx.globalAlpha = .18;
  ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
  ctx.restore();

  arena.obstacles.forEach((obstacle, index) => {
    drawVolcanicObstacle(ctx, obstacle, index);
  });

  return true;
}

export function isWindscarEnvironment(arena) {
  return arena?.id === WIND_SCAR_ID;
}

let cachedTerrain = null;
let cachedTerrainKey = "";

export function drawWindscarEnvironment(ctx, arena, width, height) {
  if (!isWindscarEnvironment(arena)) return false;

  const obstacleKey = arena.obstacles
    .map(rect => [rect.x, rect.y, rect.w, rect.h].join(","))
    .join("|");
  const cacheKey = [
    TERRAIN_VERSION,
    arena.id,
    width + "x" + height,
    obstacleKey,
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
      paintWindscarEnvironment(bufferCtx, arena, width, height);
      cachedTerrain = buffer;
      cachedTerrainKey = cacheKey;
    }
  }

  if (cachedTerrain && cachedTerrainKey === cacheKey) {
    ctx.drawImage(cachedTerrain, 0, 0);
    return true;
  }

  return paintWindscarEnvironment(ctx, arena, width, height);
}
