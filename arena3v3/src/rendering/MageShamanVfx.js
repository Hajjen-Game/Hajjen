import { usesMageShamanVfx2 } from "../systems/MageShamanVfxProfile.js?v=20260930-vfx2b";

const TAU = Math.PI * 2;

const PROFILE = Object.freeze({
  "mage-living-bomb": { family: "mage", kind: "mage-bomb", main: "#d86b3f", core: "#ffe0a8", accent: "#9f342b" },
  "mage-frostbolt": { family: "mage", kind: "frost", main: "#63c9e7", core: "#effcff", accent: "#77a9dc" },
  "mage-pyroblast": { family: "mage", kind: "fire", main: "#d96839", core: "#ffe2aa", accent: "#a73d2d", heavy: true },
  "mage-frost-nova": { family: "mage", kind: "frost-nova", main: "#67cee8", core: "#f1fdff", accent: "#6f9fd7" },
  "mage-polymorph": { family: "mage", kind: "arcane-control", main: "#a38ada", core: "#f4e7ff", accent: "#6e5aa9" },
  "mage-frostfire-bolt": { family: "mage", kind: "frostfire", main: "#75d4e7", core: "#fff1d1", accent: "#dd7540", heavy: true },
  "mage-arcane-barrage": { family: "mage", kind: "arcane", main: "#a389db", core: "#f3e5ff", accent: "#6e5db7" },

  "shaman-flame-shock": { family: "shaman", kind: "shaman-flame-shock", main: "#d96d3e", core: "#ffe0a1", accent: "#9e3e2d" },
  "shaman-chain-lightning": { family: "shaman", kind: "lightning-release", main: "#63c7dd", core: "#ecfeff", accent: "#4c91bd" },
  "shaman-lava-burst": { family: "shaman", kind: "shaman-lava", main: "#d66a38", core: "#ffe7a4", accent: "#9d3527", heavy: true },
  "shaman-hex": { family: "shaman", kind: "shaman-hex", main: "#78b89e", core: "#eaffdf", accent: "#4d7f68" },
  "shaman-astral-shift": { family: "shaman", kind: "astral", main: "#78c4d6", core: "#effeff", accent: "#846cb7" },
  "shaman-elemental-blast": { family: "shaman", kind: "shaman-elemental", main: "#66c5dc", core: "#fff0bc", accent: "#d97843", heavy: true },
  "shaman-stormstrike": { family: "shaman", kind: "stormstrike", main: "#65cce0", core: "#efffff", accent: "#d19b58" },
});

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function easeOut(value) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function seeded(seed, index) {
  const value = Math.sin((Number(seed) || 1) * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function pointAlong(from, to, t) {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

function segmentBasis(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  return {
    dx,
    dy,
    length,
    tx: dx / length,
    ty: dy / length,
    nx: -dy / length,
    ny: dx / length,
    angle: Math.atan2(dy, dx),
  };
}

function glowDot(ctx, x, y, radius, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = radius * 2.1;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function strokeRing(ctx, x, y, radius, color, alpha, width = 2) {
  if (alpha <= 0 || radius <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function drawRuneSegments(ctx, x, y, radius, profile, phase, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(phase * 0.55);
  ctx.strokeStyle = profile.core;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 13;
  ctx.lineWidth = 1.8;
  ctx.globalAlpha *= alpha;

  for (let i = 0; i < 4; i += 1) {
    const start = i * Math.PI / 2 + 0.16;
    ctx.beginPath();
    ctx.arc(0, 0, radius, start, start + 0.62);
    ctx.stroke();
  }

  ctx.restore();
}

function drawCastMotes(ctx, actor, profile, progress, nowMs) {
  const count = profile.heavy ? 9 : 7;
  const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.015);
  const kind = profile.kind;

  for (let i = 0; i < count; i += 1) {
    const base = (i / count) * TAU;
    const spin = nowMs * (kind.includes("fire") || kind === "lava" ? 0.0021 : 0.0015);
    const angle = base + spin * (i % 2 ? 1 : -1);
    const startRadius = actor.radius + 34 + (i % 3) * 7;
    const radius = startRadius * (1 - progress * 0.58);
    const x = actor.x + Math.cos(angle) * radius;
    const y = actor.y + Math.sin(angle) * radius;
    const moteRadius = 1.6 + (i % 3) * 0.55 + progress * 0.8;

    ctx.save();
    ctx.globalAlpha = 0.22 + progress * 0.52;
    ctx.fillStyle = i % 3 === 0 ? profile.core : profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 7 + pulse * 4;
    ctx.beginPath();

    if (kind === "frost" || kind === "frost-nova") {
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.moveTo(0, -moteRadius * 1.8);
      ctx.lineTo(moteRadius, 0);
      ctx.lineTo(0, moteRadius * 1.8);
      ctx.lineTo(-moteRadius, 0);
      ctx.closePath();
    } else {
      ctx.arc(x, y, moteRadius, 0, TAU);
    }

    ctx.fill();
    ctx.restore();
  }
}

function drawLightningArc(ctx, from, to, seed, alpha, width, color, timePhase = 0) {
  const basis = segmentBasis(from, to);
  const segments = Math.max(5, Math.min(12, Math.round(basis.length / 28)));

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);

  for (let i = 1; i < segments; i += 1) {
    const t = i / segments;
    const envelope = Math.sin(t * Math.PI);
    const jitter = (seeded(seed + Math.floor(timePhase * 4), i) - 0.5)
      * Math.min(24, basis.length * 0.07)
      * envelope;
    const p = pointAlong(from, to, t);
    ctx.lineTo(p.x + basis.nx * jitter, p.y + basis.ny * jitter);
  }

  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  ctx.restore();
}

function drawImpact(ctx, to, profile, phase, seed, strength = 1) {
  const t = clamp01(phase);
  const fade = 1 - t;
  const pulse = Math.sin(Math.min(1, t * 1.7) * Math.PI);
  const outer = 9 + easeOut(t) * (profile.heavy ? 50 : 38);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(to.x, to.y, 0, to.x, to.y, 34 + pulse * 10);
  glow.addColorStop(0, profile.core);
  glow.addColorStop(0.28, profile.main);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = fade * 0.34 * strength;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(to.x, to.y, 34 + pulse * 10, 0, TAU);
  ctx.fill();

  strokeRing(ctx, to.x, to.y, outer, profile.main, fade * 0.78 * strength, profile.heavy ? 3.4 : 2.5);
  strokeRing(ctx, to.x, to.y, 7 + easeOut(t) * 27, profile.core, fade * 0.55 * strength, 1.5);

  const rayCount = profile.heavy ? 10 : 7;
  ctx.strokeStyle = profile.core;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 13;
  ctx.lineWidth = profile.heavy ? 2.4 : 1.8;

  for (let i = 0; i < rayCount; i += 1) {
    const angle = (i / rayCount) * TAU + seeded(seed, i) * 0.34;
    const inner = 8 + t * 4;
    const outerRay = 18 + easeOut(t) * (profile.heavy ? 44 : 31) * (0.72 + seeded(seed + 9, i) * 0.38);
    ctx.globalAlpha = fade * (0.35 + seeded(seed + 21, i) * 0.45) * strength;
    ctx.beginPath();
    ctx.moveTo(to.x + Math.cos(angle) * inner, to.y + Math.sin(angle) * inner);
    ctx.lineTo(to.x + Math.cos(angle) * outerRay, to.y + Math.sin(angle) * outerRay);
    ctx.stroke();
  }

  if (profile.kind === "frost" || profile.kind === "frostfire" || profile.kind === "frost-nova") {
    ctx.fillStyle = "#dffbff";
    for (let i = 0; i < 8; i += 1) {
      const angle = (i / 8) * TAU + seeded(seed, i) * 0.25;
      const rr = 12 + t * (26 + seeded(seed + 4, i) * 22);
      const x = to.x + Math.cos(angle) * rr;
      const y = to.y + Math.sin(angle) * rr;
      ctx.globalAlpha = fade * 0.72 * strength;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(2.6, 0);
      ctx.lineTo(0, 4);
      ctx.lineTo(-2.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else if (profile.kind === "fire" || profile.kind === "lava" || profile.kind === "fire-mark") {
    for (let i = 0; i < 9; i += 1) {
      const angle = seeded(seed, i) * TAU;
      const rr = 8 + t * (20 + seeded(seed + 5, i) * 32);
      const x = to.x + Math.cos(angle) * rr;
      const y = to.y + Math.sin(angle) * rr - t * 9;
      glowDot(ctx, x, y, 1.5 + seeded(seed + 12, i) * 2.2, i % 3 ? profile.main : profile.core, fade * 0.7 * strength);
    }
  } else if (profile.kind === "arcane" || profile.kind === "arcane-control") {
    drawRuneSegments(ctx, to.x, to.y, 18 + t * 18, profile, t * 4, fade * 0.78 * strength);
  }

  ctx.restore();
}

function drawAftermath(ctx, to, profile, phase, seed) {
  const t = clamp01(phase);
  const fade = 1 - t;
  if (fade <= 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 5; i += 1) {
    const angle = seeded(seed + 31, i) * TAU + t * (i % 2 ? 0.55 : -0.4);
    const rr = 14 + t * (24 + seeded(seed, i) * 16);
    const x = to.x + Math.cos(angle) * rr;
    const y = to.y + Math.sin(angle) * rr - t * (profile.kind.includes("fire") || profile.kind === "lava" ? 14 : 5);
    glowDot(ctx, x, y, 1.2 + seeded(seed + 77, i) * 1.8, i % 2 ? profile.main : profile.accent, fade * 0.42);
  }
  ctx.restore();
}

function drawProjectile(ctx, from, to, profile, progress, seed, missed) {
  const heavy = Boolean(profile.heavy);
  const travelEnd = heavy ? 0.46 : 0.40;
  const travelT = easeOut((progress - 0.035) / (travelEnd - 0.035));
  const basis = segmentBasis(from, to);
  const missOffset = missed ? (seeded(seed, 0) > 0.5 ? 1 : -1) * 38 : 0;
  const missEnd = {
    x: to.x + basis.nx * missOffset + (missed ? basis.tx * 16 : 0),
    y: to.y + basis.ny * missOffset + (missed ? basis.ty * 16 : 0),
  };
  const destination = missed ? missEnd : to;
  const endBasis = segmentBasis(from, destination);
  const p = pointAlong(from, destination, travelT);
  const tailLength = Math.min(heavy ? 76 : 58, Math.max(28, endBasis.length * 0.19));
  const tail = {
    x: p.x - endBasis.tx * tailLength * (0.5 + 0.5 * travelT),
    y: p.y - endBasis.ty * tailLength * (0.5 + 0.5 * travelT),
  };
  const travelFade = progress > travelEnd ? clamp01(1 - (progress - travelEnd) / 0.08) : 1;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  ctx.globalAlpha = 0.26 * travelFade;
  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = heavy ? 28 : 22;
  ctx.lineWidth = heavy ? 13 : 9;
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();

  ctx.globalAlpha = 0.86 * travelFade;
  ctx.strokeStyle = profile.core;
  ctx.lineWidth = heavy ? 4.2 : 3.1;
  ctx.beginPath();
  ctx.moveTo(tail.x, tail.y);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();

  for (let i = 0; i < (heavy ? 8 : 6); i += 1) {
    const lag = Math.max(0, travelT - 0.035 * (i + 1));
    const q = pointAlong(from, destination, lag);
    const wobble = (seeded(seed + 8, i) - 0.5) * (10 + i * 1.2);
    const x = q.x + endBasis.nx * wobble;
    const y = q.y + endBasis.ny * wobble;
    glowDot(
      ctx,
      x,
      y,
      Math.max(1.2, (heavy ? 3.4 : 2.8) - i * 0.28),
      i % 3 === 0 ? profile.accent : profile.main,
      travelFade * Math.max(0.12, 0.62 - i * 0.065),
    );
  }

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(endBasis.angle);
  ctx.globalAlpha = travelFade;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = heavy ? 28 : 21;

  if (profile.kind === "frost") {
    ctx.fillStyle = profile.main;
    ctx.strokeStyle = profile.core;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(17, 0);
    ctx.lineTo(-5, -7);
    ctx.lineTo(-1, -2);
    ctx.lineTo(-12, 0);
    ctx.lineTo(-1, 2);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (profile.kind === "frostfire") {
    ctx.fillStyle = profile.main;
    ctx.strokeStyle = profile.core;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 0);
    ctx.lineTo(-5, -9);
    ctx.lineTo(-13, 0);
    ctx.lineTo(-5, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    glowDot(ctx, -3, 0, 6, profile.accent, 0.75);
  } else if (profile.kind === "arcane") {
    ctx.strokeStyle = profile.core;
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, 7 + i * 3.6, -1.15 + i * 0.7, 1.15 + i * 0.7);
      ctx.stroke();
    }
    glowDot(ctx, 0, 0, 5.5, profile.main, 0.9);
  } else if (profile.kind === "elemental") {
    glowDot(ctx, 0, 0, 9, profile.core, 0.95);
    ctx.strokeStyle = profile.main;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const a = i * Math.PI / 2 + progress * 5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      ctx.lineTo(Math.cos(a + 0.4) * 15, Math.sin(a + 0.4) * 15);
      ctx.stroke();
    }
  } else {
    glowDot(ctx, 0, 0, heavy ? 10 : 7.5, profile.main, 0.95);
    glowDot(ctx, 0, 0, heavy ? 5.2 : 4.1, profile.core, 1);
  }

  ctx.restore();
  ctx.restore();

  if (!missed && progress >= travelEnd) {
    drawImpact(ctx, to, profile, (progress - travelEnd) / 0.34, seed, 1);
    if (progress > travelEnd + 0.17) {
      drawAftermath(ctx, to, profile, (progress - travelEnd - 0.17) / 0.37, seed);
    }
  } else if (missed && progress >= travelEnd) {
    const disperse = clamp01((progress - travelEnd) / 0.24);
    for (let i = 0; i < 5; i += 1) {
      const a = endBasis.angle + (seeded(seed, i) - 0.5) * 1.8;
      const rr = disperse * (12 + seeded(seed + 4, i) * 26);
      glowDot(ctx, destination.x + Math.cos(a) * rr, destination.y + Math.sin(a) * rr, 2, profile.main, (1 - disperse) * 0.55);
    }
  }
}

function drawControl(ctx, from, to, profile, progress, seed, missed) {
  const travelEnd = 0.30;
  const t = easeOut(progress / travelEnd);
  const destination = missed
    ? { x: to.x + 30, y: to.y - 18 }
    : to;
  const p = pointAlong(from, destination, t);
  const basis = segmentBasis(from, destination);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  drawRuneSegments(ctx, p.x, p.y, 8 + t * 6, profile, progress * 7, 0.62);
  glowDot(ctx, p.x, p.y, 4.5, profile.core, 0.8);

  for (let i = 0; i < 5; i += 1) {
    const lag = Math.max(0, t - 0.055 * (i + 1));
    const q = pointAlong(from, destination, lag);
    const wobble = Math.sin(seed * 0.11 + i * 2.2 + progress * 13) * 6;
    glowDot(ctx, q.x + basis.nx * wobble, q.y + basis.ny * wobble, 1.5, profile.main, 0.38);
  }

  if (!missed && progress >= travelEnd) {
    const phase = clamp01((progress - travelEnd) / 0.55);
    const fade = 1 - phase;
    drawRuneSegments(ctx, to.x, to.y, 18 + phase * 18, profile, -phase * 4, fade * 0.92);
    strokeRing(ctx, to.x, to.y, 12 + phase * 32, profile.main, fade * 0.56, 2);
    for (let i = 0; i < 6; i += 1) {
      const angle = i / 6 * TAU + phase * (profile.kind === "nature-control" ? 1.2 : -1.1);
      const rr = 11 + phase * 24;
      glowDot(ctx, to.x + Math.cos(angle) * rr, to.y + Math.sin(angle) * rr, 2, i % 2 ? profile.main : profile.core, fade * 0.55);
    }
  }

  ctx.restore();
}

function drawMark(ctx, target, profile, progress, seed) {
  const pop = smoothstep(progress / 0.22);
  const fade = 1 - clamp01((progress - 0.45) / 0.55);
  const radius = 13 + pop * 19;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  strokeRing(ctx, target.x, target.y, radius, profile.main, fade * 0.84, 2.5);
  drawRuneSegments(ctx, target.x, target.y, radius - 5, profile, progress * 3.5, fade * 0.72);
  glowDot(ctx, target.x, target.y, 6 + pop * 3, profile.core, fade * 0.44);

  for (let i = 0; i < 7; i += 1) {
    const angle = seeded(seed, i) * TAU;
    const rise = progress * (16 + seeded(seed + 8, i) * 25);
    const rr = 7 + seeded(seed + 18, i) * 14;
    glowDot(
      ctx,
      target.x + Math.cos(angle) * rr,
      target.y + Math.sin(angle) * rr - rise,
      1.3 + seeded(seed + 33, i) * 1.6,
      i % 3 ? profile.main : profile.core,
      fade * 0.58,
    );
  }

  ctx.restore();
}

function drawNova(ctx, actor, profile, progress, seed) {
  const wave = easeOut(progress / 0.72);
  const fade = 1 - clamp01((progress - 0.50) / 0.50);
  const radius = actor.radius + 8 + wave * 108;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  strokeRing(ctx, actor.x, actor.y, radius, profile.main, fade * 0.78, 3.2);
  strokeRing(ctx, actor.x, actor.y, Math.max(actor.radius + 4, radius - 12), profile.core, fade * 0.35, 1.5);

  for (let i = 0; i < 12; i += 1) {
    const angle = i / 12 * TAU + seeded(seed, i) * 0.13;
    const rr = actor.radius + 4 + wave * (88 + seeded(seed + 3, i) * 22);
    const x = actor.x + Math.cos(angle) * rr;
    const y = actor.y + Math.sin(angle) * rr;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.globalAlpha = fade * 0.72;
    ctx.fillStyle = profile.core;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(3.2, 0);
    ctx.lineTo(0, 5);
    ctx.lineTo(-3.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawAstral(ctx, actor, profile, progress, seed) {
  const appear = smoothstep(progress / 0.18);
  const fade = 1 - clamp01((progress - 0.68) / 0.32);
  const base = actor.radius + 10;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const glow = ctx.createRadialGradient(actor.x, actor.y, 2, actor.x, actor.y, base + 26);
  glow.addColorStop(0, "rgba(238,254,255,.20)");
  glow.addColorStop(0.55, "rgba(112,193,213,.12)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = appear * fade;
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(actor.x, actor.y, base + 25, 0, TAU);
  ctx.fill();

  for (let i = 0; i < 4; i += 1) {
    const radius = base + i * 5;
    const start = progress * (i % 2 ? -2.3 : 2.1) + i * 1.2;
    ctx.globalAlpha = appear * fade * (0.48 + i * 0.09);
    ctx.strokeStyle = i % 2 ? profile.accent : profile.main;
    ctx.shadowColor = profile.core;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, radius, start, start + 1.15);
    ctx.stroke();
  }

  for (let i = 0; i < 7; i += 1) {
    const angle = seeded(seed, i) * TAU + progress * (i % 2 ? 2 : -1.5);
    const rr = base + 6 + seeded(seed + 7, i) * 18;
    glowDot(ctx, actor.x + Math.cos(angle) * rr, actor.y + Math.sin(angle) * rr, 1.6, i % 2 ? profile.main : profile.core, appear * fade * 0.55);
  }

  ctx.restore();
}

function drawStormstrike(ctx, from, to, profile, progress, seed) {
  const slash = smoothstep(progress / 0.26);
  const fade = 1 - clamp01((progress - 0.42) / 0.58);
  const basis = segmentBasis(from, to);
  const reach = 24 + slash * 26;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(to.x, to.y);
  ctx.rotate(basis.angle);
  ctx.globalAlpha = fade;
  ctx.lineCap = "round";

  for (const sign of [-1, 1]) {
    ctx.strokeStyle = sign < 0 ? profile.main : profile.core;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 14;
    ctx.lineWidth = sign < 0 ? 5 : 2.4;
    ctx.beginPath();
    ctx.moveTo(-reach * 0.75, -reach * 0.6 * sign);
    ctx.quadraticCurveTo(0, 0, reach * 0.75, reach * 0.58 * sign);
    ctx.stroke();
  }

  ctx.restore();
  drawImpact(ctx, to, profile, clamp01((progress - 0.10) / 0.52), seed, 0.72);
}

function drawShamanCastCharge(ctx, actor, profile, progress, nowMs) {
  const p = clamp01(progress);
  const pulse = .5 + .5 * Math.sin(nowMs * .019);
  const count = profile.heavy ? 8 : 6;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (let i = 0; i < count; i += 1) {
    const angle = seeded(actor.x + actor.y, i) * TAU + nowMs * .0011 * (i % 2 ? 1 : -1);
    const start = actor.radius + 29 + seeded(actor.x, i) * 18;
    const end = Math.max(actor.radius + 7, start * (1 - p * .58));
    const x1 = actor.x + Math.cos(angle) * start;
    const y1 = actor.y + Math.sin(angle) * start;
    const x2 = actor.x + Math.cos(angle + .16 * Math.sin(i + p * 8)) * end;
    const y2 = actor.y + Math.sin(angle + .16 * Math.sin(i + p * 8)) * end;

    ctx.globalAlpha = .18 + p * .42;
    ctx.strokeStyle = i % 3 === 0 ? profile.core : profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 8 + pulse * 5;
    ctx.lineWidth = 1.2 + (i % 2) * .8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    const bendX = (seeded(actor.y, i + 20) - .5) * 13;
    const bendY = (seeded(actor.x, i + 40) - .5) * 13;
    ctx.lineTo((x1 + x2) * .5 + bendX, (y1 + y2) * .5 + bendY);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  if (p > .68) {
    const flicker = (p - .68) / .32;
    for (let i = 0; i < 4; i += 1) {
      const a = i / 4 * TAU + nowMs * .002;
      glowDot(
        ctx,
        actor.x + Math.cos(a) * (actor.radius + 5),
        actor.y + Math.sin(a) * (actor.radius + 5),
        1.7 + pulse,
        i % 2 ? profile.core : profile.main,
        flicker * .65,
      );
    }
  }

  ctx.restore();
}

function drawMageBomb(ctx, target, profile, progress, seed) {
  const p = clamp01(progress);
  const pop = smoothstep(p / .18);
  const fade = 1 - clamp01((p - .58) / .42);
  const radius = 12 + pop * 20;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(target.x, target.y);
  ctx.rotate(p * 2.8);
  ctx.globalAlpha = fade * .82;
  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2.2;

  // Mage fire remains precise: a rotating four-corner bomb sigil.
  ctx.beginPath();
  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.rotate(-p * 5.1);
  ctx.globalAlpha = fade * .62;
  ctx.beginPath();
  ctx.arc(0, 0, radius * .62, 0, TAU);
  ctx.stroke();

  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    glowDot(ctx, Math.cos(a) * radius * .72, Math.sin(a) * radius * .72, 2.2, profile.core, fade * .72);
  }
  glowDot(ctx, 0, 0, 5 + pop * 3, profile.core, fade * .55);
  ctx.restore();
}

function drawShamanFlameShock(ctx, target, profile, progress, seed) {
  const p = clamp01(progress);
  const fade = 1 - clamp01((p - .55) / .45);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // Shaman fire crawls upward in uneven tongues; no rune geometry.
  for (let i = 0; i < 8; i += 1) {
    const side = (seeded(seed, i) - .5) * 38;
    const baseX = target.x + side;
    const baseY = target.y + 17 - seeded(seed + 10, i) * 7;
    const rise = easeOut(p) * (18 + seeded(seed + 30, i) * 30);
    ctx.globalAlpha = fade * (.35 + seeded(seed + 50, i) * .43);
    ctx.strokeStyle = i % 3 === 0 ? profile.core : profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 11;
    ctx.lineWidth = 1.6 + seeded(seed + 70, i) * 2.2;
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.quadraticCurveTo(
      baseX + Math.sin(i * 2.2 + p * 10) * 10,
      baseY - rise * .55,
      baseX + Math.cos(i + p * 8) * 5,
      baseY - rise,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawShamanLava(ctx, from, to, profile, progress, seed, missed) {
  const travelEnd = .52;
  const t = easeOut(progress / travelEnd);
  const b = segmentBasis(from, to);
  const destination = missed
    ? { x: to.x + b.nx * 42 + b.tx * 12, y: to.y + b.ny * 42 + b.ty * 12 }
    : to;

  // A slight arc makes this read like thrown molten rock rather than Mage Pyro.
  const base = pointAlong(from, destination, t);
  const arcHeight = Math.sin(t * Math.PI) * 24;
  const p = { x: base.x, y: base.y - arcHeight };

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(p.x, p.y);
  ctx.rotate(progress * 11 + seed * .01);

  ctx.fillStyle = "#6b3426";
  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 20;
  ctx.lineWidth = 3;
  ctx.globalAlpha = .96;
  ctx.beginPath();
  for (let i = 0; i < 9; i += 1) {
    const a = i / 9 * TAU;
    const rr = i % 2 ? 9 : 13;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = profile.core;
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 3; i += 1) {
    const a = i * 2.1 + progress * 4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 3, Math.sin(a) * 3);
    ctx.lineTo(Math.cos(a + .45) * 9, Math.sin(a + .45) * 9);
    ctx.stroke();
  }
  ctx.restore();

  for (let i = 0; i < 7; i += 1) {
    const lag = Math.max(0, t - .038 * (i + 1));
    const q0 = pointAlong(from, destination, lag);
    const y = q0.y - Math.sin(lag * Math.PI) * 24;
    glowDot(ctx, q0.x + (seeded(seed, i) - .5) * 12, y + (seeded(seed + 9, i) - .5) * 8, 1.6 + (i % 3) * .5, i % 3 ? profile.main : profile.core, .52 - i * .045);
  }

  if (!missed && progress >= travelEnd) {
    const hit = clamp01((progress - travelEnd) / .38);
    const fade = 1 - hit;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i += 1) {
      const a = seeded(seed + 21, i) * TAU;
      const rr = 7 + easeOut(hit) * (22 + seeded(seed + 41, i) * 30);
      const x = to.x + Math.cos(a) * rr;
      const y = to.y + Math.sin(a) * rr - hit * 8;
      glowDot(ctx, x, y, 1.7 + seeded(seed + 61, i) * 2.6, i % 3 === 0 ? profile.core : profile.main, fade * .75);
    }
    ctx.strokeStyle = "#8b4b31";
    ctx.globalAlpha = fade * .7;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const a = i / 6 * TAU + seeded(seed, i) * .3;
      ctx.beginPath();
      ctx.moveTo(to.x + Math.cos(a) * 6, to.y + Math.sin(a) * 6);
      ctx.lineTo(to.x + Math.cos(a) * (18 + hit * 28), to.y + Math.sin(a) * (18 + hit * 28));
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawShamanElemental(ctx, from, to, profile, progress, seed, missed) {
  const travelEnd = .50;
  const t = easeOut(progress / travelEnd);
  const b = segmentBasis(from, to);
  const destination = missed
    ? { x: to.x + b.nx * 40, y: to.y + b.ny * 40 }
    : to;
  const p = pointAlong(from, destination, t);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Three unstable elemental satellites orbit a bright moving core.
  glowDot(ctx, p.x, p.y, 7.5, profile.core, .95);
  const satelliteColors = [profile.main, profile.accent, "#87b978"];
  for (let i = 0; i < 3; i += 1) {
    const a = progress * 15 * (i % 2 ? -1 : 1) + i * TAU / 3;
    const rr = 10 + (i % 2) * 4;
    const sx = p.x + Math.cos(a) * rr;
    const sy = p.y + Math.sin(a) * rr;
    glowDot(ctx, sx, sy, 3.2, satelliteColors[i], .78);
    ctx.globalAlpha = .38;
    ctx.strokeStyle = satelliteColors[i];
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(sx, sy);
    ctx.stroke();
  }

  const tail = pointAlong(from, destination, Math.max(0, t - .13));
  drawLightningArc(ctx, tail, p, seed + 71, .72, 2.2, profile.main, progress * 4);
  ctx.restore();

  if (!missed && progress >= travelEnd) {
    const hit = clamp01((progress - travelEnd) / .38);
    const fade = 1 - hit;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let i = 0; i < 9; i += 1) {
      const a = i / 9 * TAU + seeded(seed, i) * .24;
      const inner = 7 + hit * 3;
      const outer = 18 + easeOut(hit) * (28 + seeded(seed + 17, i) * 18);
      ctx.globalAlpha = fade * .68;
      ctx.strokeStyle = satelliteColors[i % 3];
      ctx.shadowColor = satelliteColors[i % 3];
      ctx.shadowBlur = 9;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(to.x + Math.cos(a) * inner, to.y + Math.sin(a) * inner);
      ctx.lineTo(to.x + Math.cos(a) * outer, to.y + Math.sin(a) * outer);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawShamanHex(ctx, from, to, profile, progress, seed, missed) {
  const travelEnd = .34;
  const t = easeOut(progress / travelEnd);
  const b = segmentBasis(from, to);
  const destination = missed ? { x: to.x + b.nx * 31, y: to.y + b.ny * 31 } : to;
  const p = pointAlong(from, destination, t);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Twisting paired nature wisps instead of Mage's rotating runes.
  for (const sign of [-1, 1]) {
    const side = Math.sin(progress * 14) * 7 * sign;
    glowDot(ctx, p.x + b.nx * side, p.y + b.ny * side, 3.2, sign > 0 ? profile.core : profile.main, .72);
  }

  if (!missed && progress >= travelEnd) {
    const phase = clamp01((progress - travelEnd) / .56);
    const fade = 1 - phase;
    ctx.strokeStyle = profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const a = i / 5 * TAU + phase * 1.3;
      const r0 = 8 + phase * 8;
      const r1 = 17 + phase * 22;
      ctx.globalAlpha = fade * .7;
      ctx.beginPath();
      ctx.moveTo(to.x + Math.cos(a) * r0, to.y + Math.sin(a) * r0);
      ctx.quadraticCurveTo(
        to.x + Math.cos(a + .55) * ((r0 + r1) * .55),
        to.y + Math.sin(a + .55) * ((r0 + r1) * .55),
        to.x + Math.cos(a + .18) * r1,
        to.y + Math.sin(a + .18) * r1,
      );
      ctx.stroke();
      glowDot(ctx, to.x + Math.cos(a + .18) * r1, to.y + Math.sin(a + .18) * r1, 1.8, i % 2 ? profile.core : profile.main, fade * .55);
    }
  }

  ctx.restore();
}

function drawChainSegment(ctx, from, to, profile, phase, seed) {
  const t = clamp01(phase);
  if (t <= 0) return;
  const fade = 1 - clamp01((t - 0.54) / 0.46);
  const endpoint = pointAlong(from, to, easeOut(Math.min(1, t / 0.34)));

  drawLightningArc(ctx, from, endpoint, seed, fade * 0.38, 8, profile.main, t * 5);
  drawLightningArc(ctx, from, endpoint, seed + 13, fade * 0.95, 2.3, profile.core, t * 5);

  if (t > 0.28) {
    drawImpact(ctx, to, profile, (t - 0.28) / 0.62, seed + 31, 0.58);
  }
}

export function drawMageShamanCastVfx(ctx, actor, spell, progress, nowMs = performance.now()) {
  if (!spell || !usesMageShamanVfx2(spell.id)) return false;
  const profile = PROFILE[spell.id];
  if (!profile) return false;

  const p = clamp01(progress);

  if (profile.family === "shaman") {
    drawShamanCastCharge(ctx, actor, profile, p, nowMs);
    return true;
  }

  const swell = smoothstep(p);
  const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.012 + actor.x * 0.01);
  const radius = actor.radius + 10 + swell * (profile.heavy ? 16 : 10);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.32 + p * 0.48;
  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 9 + p * 14;
  ctx.lineWidth = 2 + p * 1.1;
  ctx.beginPath();
  ctx.arc(actor.x, actor.y, radius + pulse * 2, 0, TAU);
  ctx.stroke();

  drawRuneSegments(ctx, actor.x, actor.y, radius + 6, profile, nowMs * 0.0017, 0.30 + p * 0.48);
  drawCastMotes(ctx, actor, profile, p, nowMs);

  if (p > 0.72) {
    glowDot(ctx, actor.x, actor.y, 5 + (p - 0.72) * 15, profile.core, (p - 0.72) * 1.7);
  }

  ctx.restore();
  return true;
}

export function drawMageShamanSpellVfx(ctx, effect, game, progress, alpha) {
  const id = effect?.spellId || "";
  if (!usesMageShamanVfx2(id)) return false;
  const profile = PROFILE[id];
  if (!profile) return false;

  const source = game.getActor(effect.sourceId);
  const target = game.getActor(effect.targetId);
  const from = {
    x: effect.sourceX ?? source?.x ?? 0,
    y: effect.sourceY ?? source?.y ?? 0,
  };
  const to = {
    x: target?.x ?? effect.targetX ?? from.x,
    y: target?.y ?? effect.targetY ?? from.y,
  };
  const p = clamp01(progress);
  const seed = effect.seed || effect.id || 1;

  ctx.save();
  ctx.globalAlpha *= Math.max(0, Math.min(1, alpha * 1.35));

  switch (profile.kind) {
    case "frost":
    case "fire":
    case "frostfire":
    case "arcane":
      drawProjectile(ctx, from, to, profile, p, seed, Boolean(effect.missed));
      break;

    case "arcane-control":
      drawControl(ctx, from, to, profile, p, seed, Boolean(effect.missed));
      break;

    case "mage-bomb":
      drawMageBomb(ctx, to, profile, p, seed);
      break;

    case "shaman-flame-shock":
      drawShamanFlameShock(ctx, to, profile, p, seed);
      break;

    case "shaman-lava":
      drawShamanLava(ctx, from, to, profile, p, seed, Boolean(effect.missed));
      break;

    case "shaman-elemental":
      drawShamanElemental(ctx, from, to, profile, p, seed, Boolean(effect.missed));
      break;

    case "shaman-hex":
      drawShamanHex(ctx, from, to, profile, p, seed, Boolean(effect.missed));
      break;

    case "frost-nova":
      drawNova(ctx, source || to, profile, p, seed);
      break;

    case "astral":
      drawAstral(ctx, source || to, profile, p, seed);
      break;

    case "stormstrike":
      drawStormstrike(ctx, from, to, profile, p, seed);
      break;

    case "lightning-release": {
      const pulse = 1 - clamp01((p - 0.34) / 0.32);
      strokeRing(ctx, from.x, from.y, 12 + p * 24, profile.main, pulse * 0.5, 2);
      for (let i = 0; i < 5; i += 1) {
        const a = i / 5 * TAU + p * 4;
        const q = {
          x: from.x + Math.cos(a) * (15 + p * 18),
          y: from.y + Math.sin(a) * (15 + p * 18),
        };
        drawLightningArc(ctx, from, q, seed + i * 11, pulse * 0.5, 1.5, profile.core, p * 5);
      }
      break;
    }

    default:
      break;
  }

  ctx.restore();
  return true;
}

export function drawMageShamanChainVfx(ctx, effect, game, progress, alpha) {
  if (effect?.spellId !== "shaman-chain-lightning") return false;
  const profile = PROFILE["shaman-chain-lightning"];
  const actors = effect.actorIds
    .map(id => game.getActor(id))
    .filter(Boolean);

  if (actors.length < 2) return true;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha *= Math.max(0, Math.min(1, alpha * 1.7));

  for (let i = 0; i < actors.length - 1; i += 1) {
    const local = (progress - i * 0.10) / 0.66;
    drawChainSegment(
      ctx,
      actors[i],
      actors[i + 1],
      profile,
      local,
      (effect.seed || 1) + i * 47,
    );
  }

  ctx.restore();
  return true;
}
