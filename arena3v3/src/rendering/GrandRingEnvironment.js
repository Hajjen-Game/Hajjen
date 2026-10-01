const TAU = Math.PI * 2;
const GRAND_RING_ID = "four-pillar-ring";

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function insideExpandedObstacle(x, y, obstacles, padding = 0) {
  return obstacles.some(rect =>
    x >= rect.x - padding
    && x <= rect.x + rect.w + padding
    && y >= rect.y - padding
    && y <= rect.y + rect.h + padding
  );
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

  const sample = (count, padding, make) => {
    const out = [];
    let guard = count * 18;
    while (out.length < count && guard-- > 0) {
      const x = bounds.x + 14 + random() * (bounds.w - 28);
      const y = bounds.y + 14 + random() * (bounds.h - 28);
      if (insideExpandedObstacle(x, y, obstacles, padding)) continue;
      out.push(make(x, y, random));
    }
    return out;
  };

  const pebbles = sample(66, 8, (x, y, r) => ({
    x,
    y,
    rx: 1.8 + r() * 4.8,
    ry: 1.3 + r() * 3.1,
    angle: r() * TAU,
    tone: r(),
  }));

  const grass = sample(72, 5, (x, y, r) => ({
    x,
    y,
    size: 2.5 + r() * 5.5,
    angle: r() * TAU,
    tone: r(),
  }));

  const clover = sample(27, 7, (x, y, r) => ({
    x,
    y,
    size: 3.7 + r() * 4.2,
    angle: r() * TAU,
    tone: r(),
  }));

  const tinyDirt = sample(31, 0, (x, y, r) => ({
    x,
    y,
    rx: 18 + r() * 35,
    ry: 10 + r() * 24,
    angle: r() * TAU,
    alpha: .025 + r() * .055,
  }));

  return { pebbles, grass, clover, tinyDirt };
}

const DECOR = buildDecor();

const LARGE_DIRT_PATCHES = Object.freeze([
  { x: 165, y: 170, rx: 150, ry: 76, angle: -.20, seed: 2, alpha: .34 },
  { x: 505, y: 132, rx: 175, ry: 67, angle: .10, seed: 8, alpha: .27 },
  { x: 830, y: 162, rx: 142, ry: 74, angle: -.08, seed: 14, alpha: .26 },
  { x: 1110, y: 215, rx: 128, ry: 72, angle: .22, seed: 20, alpha: .32 },
  { x: 405, y: 365, rx: 210, ry: 82, angle: -.06, seed: 26, alpha: .30 },
  { x: 735, y: 350, rx: 195, ry: 72, angle: .10, seed: 32, alpha: .22 },
  { x: 1085, y: 450, rx: 150, ry: 82, angle: -.14, seed: 38, alpha: .32 },
  { x: 185, y: 525, rx: 135, ry: 75, angle: .15, seed: 44, alpha: .29 },
  { x: 600, y: 555, rx: 205, ry: 76, angle: -.08, seed: 50, alpha: .25 },
]);

function irregularBlobPath(ctx, patch) {
  const random = seededRandom(patch.seed * 9187 + 73);
  const points = [];
  const count = 14;

  for (let i = 0; i < count; i += 1) {
    const angle = i / count * TAU;
    const jitter = .82 + random() * .31;
    const x = Math.cos(angle) * patch.rx * jitter;
    const y = Math.sin(angle) * patch.ry * (.84 + random() * .28);
    points.push({ x, y });
  }

  ctx.save();
  ctx.translate(patch.x, patch.y);
  ctx.rotate(patch.angle);

  ctx.beginPath();
  const first = points[0];
  const last = points[points.length - 1];
  ctx.moveTo((last.x + first.x) * .5, (last.y + first.y) * .5);

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    ctx.quadraticCurveTo(
      current.x,
      current.y,
      (current.x + next.x) * .5,
      (current.y + next.y) * .5,
    );
  }

  ctx.closePath();
  ctx.restore();
}

function drawGrassBlade(ctx, tuft) {
  const main = tuft.tone > .5 ? "#6f8341" : "#60753b";
  const light = tuft.tone > .68 ? "#82984a" : "#718641";

  ctx.save();
  ctx.translate(tuft.x, tuft.y);
  ctx.rotate(tuft.angle);
  ctx.lineCap = "round";
  ctx.globalAlpha = .31;

  for (let i = -1; i <= 1; i += 1) {
    const sway = i * tuft.size * .42;
    ctx.strokeStyle = i === 0 ? light : main;
    ctx.lineWidth = Math.max(.65, tuft.size * .16);
    ctx.beginPath();
    ctx.moveTo(i * tuft.size * .18, tuft.size * .35);
    ctx.quadraticCurveTo(
      sway * .45,
      -tuft.size * .22,
      sway,
      -tuft.size,
    );
    ctx.stroke();
  }

  ctx.restore();
}

function drawClover(ctx, plant) {
  const dark = plant.tone > .55 ? "#567738" : "#4b6e34";
  const light = plant.tone > .62 ? "#78984b" : "#698a43";

  ctx.save();
  ctx.translate(plant.x, plant.y);
  ctx.rotate(plant.angle);
  ctx.globalAlpha = .34;

  for (let i = 0; i < 3; i += 1) {
    const a = i * TAU / 3;
    const x = Math.cos(a) * plant.size * .46;
    const y = Math.sin(a) * plant.size * .46;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    ctx.fillStyle = i === 0 ? light : dark;
    ctx.beginPath();
    ctx.ellipse(plant.size * .24, 0, plant.size * .58, plant.size * .36, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawPebble(ctx, stone) {
  ctx.save();
  ctx.translate(stone.x, stone.y);
  ctx.rotate(stone.angle);

  ctx.globalAlpha = .34;
  ctx.fillStyle = "rgba(19,18,13,.62)";
  ctx.beginPath();
  ctx.ellipse(1.2, 1.6, stone.rx * 1.08, stone.ry * 1.1, 0, 0, TAU);
  ctx.fill();

  const gradient = ctx.createLinearGradient(-stone.rx, -stone.ry, stone.rx, stone.ry);
  const light = stone.tone > .55 ? "#9a8c69" : "#85785c";
  const dark = stone.tone > .55 ? "#5d5545" : "#50493c";
  gradient.addColorStop(0, light);
  gradient.addColorStop(.52, "#756a53");
  gradient.addColorStop(1, dark);

  ctx.globalAlpha = .48;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, stone.rx, stone.ry, 0, 0, TAU);
  ctx.fill();

  ctx.globalAlpha = .18;
  ctx.fillStyle = "#d7c89c";
  ctx.beginPath();
  ctx.ellipse(-stone.rx * .28, -stone.ry * .32, stone.rx * .38, stone.ry * .22, -.25, 0, TAU);
  ctx.fill();

  ctx.restore();
}

function drawNaturalPillar(ctx, rect) {
  ctx.save();

  // A broad soft shadow gives the top-down block a little volume without
  // changing the game's camera angle or collision footprint.
  ctx.shadowColor = "rgba(22,18,12,.46)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 6;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#5e5543";
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.w, rect.h, 17);
  ctx.fill();

  ctx.shadowColor = "transparent";
  const body = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  body.addColorStop(0, "#887b5f");
  body.addColorStop(.42, "#756a53");
  body.addColorStop(1, "#514b3d");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.roundRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4, 15);
  ctx.fill();

  // Bright top slab, like a chunky carved arena stone rather than a UI panel.
  const topH = Math.min(32, rect.h * .24);
  const top = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + topH);
  top.addColorStop(0, "#b4a27f");
  top.addColorStop(1, "#918064");
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.roundRect(rect.x + 5, rect.y + 5, rect.w - 10, topH, 11);
  ctx.fill();

  // Subtle lower face.
  ctx.globalAlpha = .28;
  ctx.fillStyle = "#342f27";
  ctx.beginPath();
  ctx.roundRect(
    rect.x + 7,
    rect.y + rect.h * .62,
    rect.w - 14,
    rect.h * .29,
    8,
  );
  ctx.fill();

  // Moss/lichen stays purely decorative and inside the obstacle.
  ctx.globalAlpha = .22;
  ctx.fillStyle = "#66773d";
  const moss = [
    [rect.x + 14, rect.y + 22, 10, 5],
    [rect.x + rect.w - 24, rect.y + topH + 11, 13, 6],
    [rect.x + 18, rect.y + rect.h - 24, 8, 4],
  ];
  for (const [x, y, rx, ry] of moss) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, -.25, 0, TAU);
    ctx.fill();
  }

  ctx.globalAlpha = .24;
  ctx.strokeStyle = "#d1bd91";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(rect.x + 10, rect.y + 9);
  ctx.lineTo(rect.x + rect.w - 11, rect.y + 9);
  ctx.stroke();

  ctx.restore();
}

export function isGrandRingEnvironment(arena) {
  return arena?.id === GRAND_RING_ID;
}

export function drawGrandRingEnvironment(ctx, arena, width, height) {
  if (!isGrandRingEnvironment(arena)) return false;

  // Outside the playable walls remains dark earth so the ring still reads
  // immediately, while the playable floor becomes organic.
  const outside = ctx.createRadialGradient(width * .5, height * .48, 110, width * .5, height * .5, 760);
  outside.addColorStop(0, "#3e4829");
  outside.addColorStop(1, "#25281d");
  ctx.fillStyle = outside;
  ctx.fillRect(0, 0, width, height);

  const b = arena.bounds;
  ctx.save();
  ctx.beginPath();
  ctx.rect(b.x, b.y, b.w, b.h);
  ctx.clip();

  const grass = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
  grass.addColorStop(0, "#5d7138");
  grass.addColorStop(.42, "#69783b");
  grass.addColorStop(1, "#596936");
  ctx.fillStyle = grass;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  // Broad mottled color masses remove the flat "computer grid" feeling.
  const masses = [
    [180, 160, 260, "#435b35", .16],
    [520, 225, 310, "#798044", .12],
    [980, 175, 270, "#687940", .14],
    [325, 545, 250, "#4d6336", .15],
    [760, 500, 330, "#797344", .11],
    [1120, 520, 250, "#4b6035", .14],
  ];

  for (const [x, y, radius, color, alpha] of masses) {
    const g = ctx.createRadialGradient(x, y, 10, x, y, radius);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }

  // Large irregular earth zones, intentionally soft-edged and desaturated.
  for (const patch of LARGE_DIRT_PATCHES) {
    ctx.globalAlpha = patch.alpha;
    ctx.fillStyle = "#756243";
    irregularBlobPath(ctx, patch);
    ctx.fill();

    ctx.globalAlpha = patch.alpha * .34;
    ctx.strokeStyle = "#9a8457";
    ctx.lineWidth = 5;
    irregularBlobPath(ctx, { ...patch, rx: patch.rx * .91, ry: patch.ry * .88 });
    ctx.stroke();
  }

  // Tiny earth mottling bridges the large patches so they don't feel like
  // isolated painted circles.
  for (const patch of DECOR.tinyDirt) {
    ctx.save();
    ctx.translate(patch.x, patch.y);
    ctx.rotate(patch.angle);
    ctx.globalAlpha = patch.alpha;
    ctx.fillStyle = "#8a744b";
    ctx.beginPath();
    ctx.ellipse(0, 0, patch.rx, patch.ry, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // Fine ground grain. Static coordinates mean no frame-to-frame shimmer.
  const grain = seededRandom(0x31f26a);
  for (let i = 0; i < 430; i += 1) {
    const x = b.x + grain() * b.w;
    const y = b.y + grain() * b.h;
    if (insideExpandedObstacle(x, y, arena.obstacles, 0)) continue;
    const light = grain() > .56;
    ctx.globalAlpha = .055 + grain() * .05;
    ctx.fillStyle = light ? "#bac078" : "#273622";
    const size = .6 + grain() * 1.3;
    ctx.fillRect(x, y, size, size);
  }

  for (const tuft of DECOR.grass) drawGrassBlade(ctx, tuft);
  for (const plant of DECOR.clover) drawClover(ctx, plant);
  for (const pebble of DECOR.pebbles) drawPebble(ctx, pebble);

  // Very soft center light and edge shade gives depth without a new camera.
  ctx.globalAlpha = .13;
  const ambient = ctx.createRadialGradient(
    b.x + b.w * .48,
    b.y + b.h * .45,
    90,
    b.x + b.w * .5,
    b.y + b.h * .5,
    b.w * .66,
  );
  ambient.addColorStop(0, "rgba(229,210,132,.28)");
  ambient.addColorStop(.62, "rgba(60,66,35,0)");
  ambient.addColorStop(1, "rgba(21,25,17,.62)");
  ctx.fillStyle = ambient;
  ctx.fillRect(b.x, b.y, b.w, b.h);

  ctx.restore();

  // Natural earth rim replaces the old bright technical rectangle.
  ctx.save();
  ctx.strokeStyle = "#75603d";
  ctx.lineWidth = 5;
  ctx.globalAlpha = .76;
  ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.strokeStyle = "#a08450";
  ctx.lineWidth = 1.3;
  ctx.globalAlpha = .32;
  ctx.strokeRect(b.x + 3, b.y + 3, b.w - 6, b.h - 6);
  ctx.restore();

  for (const obstacle of arena.obstacles) drawNaturalPillar(ctx, obstacle);

  return true;
}
