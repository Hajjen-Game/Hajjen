import { usesWarlockVfx2 } from "../systems/MageShamanVfxProfile.js?v=20260930-vfx2b";

const TAU = Math.PI * 2;

const PROFILE = Object.freeze({
  "warlock-corruption": { kind: "corruption", main: "#9d63c7", core: "#d9b6f0", dark: "#38213f" },
  "warlock-shadow-bolt": { kind: "shadow-bolt", main: "#8a56bd", core: "#d5b4ee", dark: "#2b1838" },
  "warlock-chaos-bolt": { kind: "chaos-bolt", main: "#66d45f", core: "#dcff8a", dark: "#233629" },
  "warlock-resolve": { kind: "resolve", main: "#7654a7", core: "#c7a8ea", dark: "#251a33" },
  "warlock-fear": { kind: "fear", main: "#9a61bf", core: "#e3c4f3", dark: "#301b3b" },
  "warlock-drain-life": { kind: "drain", main: "#8f5bc1", core: "#d7b7ee", dark: "#261730" },
  "warlock-conflagrate": { kind: "conflagrate", main: "#d56d43", core: "#ffd59a", dark: "#512519" },
});

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOut(value) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function seeded(seed, index) {
  const value = Math.sin((Number(seed) || 1) * 17.171 + index * 41.733) * 43758.5453;
  return value - Math.floor(value);
}

function basis(from, to) {
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

function along(from, to, t) {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

function dot(ctx, x, y, radius, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = radius * 2.2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function crookedPath(ctx, from, to, seed, phase, amplitude = 11, segments = 10) {
  const b = basis(from, to);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  for (let i = 1; i < segments; i += 1) {
    const t = i / segments;
    const envelope = Math.sin(t * Math.PI);
    const wave = Math.sin(t * 10.5 + phase * 8 + seed * .071) * amplitude * envelope;
    const jitter = (seeded(seed + Math.floor(phase * 6), i) - .5) * amplitude * .8 * envelope;
    const p = along(from, to, t);
    ctx.lineTo(
      p.x + b.nx * (wave + jitter),
      p.y + b.ny * (wave + jitter),
    );
  }
  ctx.lineTo(to.x, to.y);
}

function drawDarkWisps(ctx, x, y, profile, seed, progress, count = 7, spread = 36) {
  const fade = 1 - clamp01((progress - .72) / .28);
  for (let i = 0; i < count; i += 1) {
    const angle = seeded(seed + 3, i) * TAU + progress * (i % 2 ? 1.7 : -1.3);
    const rr = 8 + progress * (spread * (.55 + seeded(seed + 17, i) * .55));
    const px = x + Math.cos(angle) * rr;
    const py = y + Math.sin(angle) * rr - progress * 8;
    dot(ctx, px, py, 1.4 + seeded(seed + 31, i) * 2.2, i % 3 === 0 ? profile.core : profile.main, fade * .6);
  }
}

function drawImplosionImpact(ctx, to, profile, phase, seed, chaos = false) {
  const t = clamp01(phase);
  const fade = 1 - t;
  const squeeze = 1 - Math.sin(Math.min(1, t * 1.5) * Math.PI) * .45;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = chaos ? 22 : 16;
  ctx.lineWidth = chaos ? 3.2 : 2.4;
  ctx.globalAlpha = fade * .82;

  for (let i = 0; i < (chaos ? 6 : 5); i += 1) {
    const a0 = seeded(seed, i) * TAU + t * (i % 2 ? 2.1 : -1.7);
    const r = (26 + i * 3) * squeeze + t * 10;
    ctx.beginPath();
    ctx.arc(to.x, to.y, r, a0, a0 + .72 + seeded(seed + 11, i) * .62);
    ctx.stroke();
  }

  ctx.globalAlpha = fade * .34;
  ctx.fillStyle = profile.dark;
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(to.x, to.y, 18 * squeeze, 0, TAU);
  ctx.fill();

  const tendrils = chaos ? 9 : 7;
  for (let i = 0; i < tendrils; i += 1) {
    const a = (i / tendrils) * TAU + seeded(seed + 23, i) * .42;
    const len = 13 + easeOut(t) * (chaos ? 48 : 35) * (.65 + seeded(seed + 37, i) * .45);
    ctx.globalAlpha = fade * (.35 + seeded(seed + 45, i) * .42);
    ctx.strokeStyle = chaos && i % 3 === 0 ? profile.core : profile.main;
    ctx.lineWidth = i % 3 === 0 ? 2.3 : 1.4;
    ctx.beginPath();
    ctx.moveTo(
      to.x + Math.cos(a) * 7,
      to.y + Math.sin(a) * 7,
    );
    const bend = (seeded(seed + 51, i) - .5) * 16;
    ctx.quadraticCurveTo(
      to.x + Math.cos(a) * len * .55 - Math.sin(a) * bend,
      to.y + Math.sin(a) * len * .55 + Math.cos(a) * bend,
      to.x + Math.cos(a) * len,
      to.y + Math.sin(a) * len,
    );
    ctx.stroke();
  }

  drawDarkWisps(ctx, to.x, to.y, profile, seed, t, chaos ? 9 : 6, chaos ? 48 : 36);
  ctx.restore();
}

function drawShadowBolt(ctx, from, to, profile, progress, seed, missed) {
  const travelEnd = .48;
  const travel = easeOut(progress / travelEnd);
  const b = basis(from, to);
  const missSide = missed ? (seeded(seed, 1) > .5 ? 1 : -1) * 42 : 0;
  const end = missed
    ? { x: to.x + b.nx * missSide + b.tx * 18, y: to.y + b.ny * missSide + b.ty * 18 }
    : to;
  const p = along(from, end, travel);
  const bb = basis(from, end);
  const tail = along(from, end, Math.max(0, travel - .14));
  const phase = progress * 11;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  // Two breathing, uneven strands make Shadow Bolt feel organic rather than
  // like Mage's straight geometric projectile.
  for (const [offset, width, alpha] of [[-1, 8, .24], [1, 3, .8]]) {
    const t = {
      x: tail.x + bb.nx * offset * 3,
      y: tail.y + bb.ny * offset * 3,
    };
    const q = {
      x: p.x + bb.nx * offset * 2,
      y: p.y + bb.ny * offset * 2,
    };
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = offset < 0 ? profile.main : profile.core;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 18;
    ctx.lineWidth = width;
    crookedPath(ctx, t, q, seed + offset * 9, phase, 7, 7);
    ctx.stroke();
  }

  dot(ctx, p.x, p.y, 8.5, profile.main, .92);
  dot(ctx, p.x - bb.tx * 2, p.y - bb.ty * 2, 4, profile.core, .72);

  for (let i = 0; i < 7; i += 1) {
    const lag = Math.max(0, travel - .038 * (i + 1));
    const q = along(from, end, lag);
    const curl = Math.sin(phase + i * 1.8) * (5 + i);
    dot(ctx, q.x + bb.nx * curl, q.y + bb.ny * curl, Math.max(1.2, 3 - i * .24), profile.main, .52 - i * .05);
  }
  ctx.restore();

  if (!missed && progress >= travelEnd) {
    drawImplosionImpact(ctx, to, profile, (progress - travelEnd) / .42, seed, false);
  }
}

function drawChaosBolt(ctx, from, to, profile, progress, seed, missed) {
  const travelEnd = .52;
  const travel = easeOut(progress / travelEnd);
  const b = basis(from, to);
  const end = missed
    ? { x: to.x + b.nx * 48, y: to.y + b.ny * 48 }
    : to;
  const p = along(from, end, travel);
  const bb = basis(from, end);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const head = {
    x: p.x + bb.nx * Math.sin(progress * 17) * 5,
    y: p.y + bb.ny * Math.sin(progress * 17) * 5,
  };

  // Chaos Bolt has a forked, predatory silhouette instead of a round orb.
  const back = {
    x: head.x - bb.tx * 34,
    y: head.y - bb.ty * 34,
  };

  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 28;
  ctx.lineCap = "round";
  ctx.globalAlpha = .42;
  ctx.lineWidth = 12;
  crookedPath(ctx, back, head, seed, progress * 13, 9, 7);
  ctx.stroke();

  ctx.globalAlpha = .92;
  ctx.strokeStyle = profile.core;
  ctx.lineWidth = 3.5;
  crookedPath(ctx, back, head, seed + 19, progress * 13, 6, 7);
  ctx.stroke();

  ctx.strokeStyle = profile.main;
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = .82;
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(head.x - bb.tx * 7, head.y - bb.ty * 7);
    ctx.quadraticCurveTo(
      head.x - bb.tx * 18 + bb.nx * sign * 15,
      head.y - bb.ty * 18 + bb.ny * sign * 15,
      head.x - bb.tx * 28 + bb.nx * sign * 22,
      head.y - bb.ty * 28 + bb.ny * sign * 22,
    );
    ctx.stroke();
  }

  dot(ctx, head.x, head.y, 7, profile.core, .96);
  for (let i = 0; i < 8; i += 1) {
    const lag = Math.max(0, travel - .03 * (i + 1));
    const q = along(from, end, lag);
    const side = (seeded(seed + 8, i) - .5) * (10 + i * 2);
    dot(ctx, q.x + bb.nx * side, q.y + bb.ny * side, 1.4 + (i % 3) * .45, i % 3 === 0 ? profile.core : profile.main, .58 - i * .045);
  }
  ctx.restore();

  if (!missed && progress >= travelEnd) {
    drawImplosionImpact(ctx, to, profile, (progress - travelEnd) / .38, seed + 91, true);
  }
}

function drawCorruption(ctx, target, profile, progress, seed) {
  const appear = easeOut(progress / .22);
  const fade = 1 - clamp01((progress - .52) / .48);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 13;

  // Curling inward hooks, deliberately no circular rune.
  for (let i = 0; i < 7; i += 1) {
    const a = seeded(seed, i) * TAU + progress * (i % 2 ? 1.5 : -1.2);
    const outer = 30 + seeded(seed + 8, i) * 13;
    const inner = 9 + (1 - appear) * 18;
    const sx = target.x + Math.cos(a) * outer;
    const sy = target.y + Math.sin(a) * outer;
    const ex = target.x + Math.cos(a + .8) * inner;
    const ey = target.y + Math.sin(a + .8) * inner;
    ctx.globalAlpha = fade * (.4 + seeded(seed + 17, i) * .38);
    ctx.lineWidth = 1.4 + (i % 3) * .45;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(
      target.x + Math.cos(a + .42) * (outer * .48),
      target.y + Math.sin(a + .42) * (outer * .48),
      ex,
      ey,
    );
    ctx.stroke();
  }

  ctx.globalAlpha = fade * .25;
  ctx.fillStyle = profile.dark;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 11 + appear * 5, 0, TAU);
  ctx.fill();
  drawDarkWisps(ctx, target.x, target.y, profile, seed + 20, progress, 6, 28);
  ctx.restore();
}

function drawFear(ctx, from, to, profile, progress, seed) {
  const travelEnd = .32;
  const travel = easeOut(progress / travelEnd);
  const p = along(from, to, travel);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = .7;
  crookedPath(ctx, from, p, seed, progress * 8, 10, 9);
  ctx.stroke();

  if (progress >= travelEnd) {
    const t = clamp01((progress - travelEnd) / .58);
    const fade = 1 - t;
    const radius = 11 + easeOut(t) * 38;
    ctx.globalAlpha = fade * .78;
    ctx.lineWidth = 2.3;
    for (let i = 0; i < 3; i += 1) {
      const start = Math.PI * (1.02 + i * .47) + t * (i % 2 ? 1.4 : -1.1);
      ctx.beginPath();
      ctx.arc(to.x, to.y, radius + i * 5, start, start + 1.05);
      ctx.stroke();
    }

    // A narrow collapsing "eye" makes Fear distinct from Hex/Polymorph.
    ctx.globalAlpha = fade * .65;
    ctx.strokeStyle = profile.core;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(to.x, to.y, 18 + t * 7, 7 + t * 2, t * .4, 0, TAU);
    ctx.stroke();
    dot(ctx, to.x, to.y, 3.6 + (1 - t) * 2, profile.main, fade * .8);
  }
  ctx.restore();
}

function drawResolve(ctx, actor, profile, progress, seed) {
  const appear = easeOut(progress / .18);
  const fade = 1 - clamp01((progress - .72) / .28);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 15;

  // Broken defensive shell: thick offset crescents instead of Shaman's orbit.
  for (let i = 0; i < 3; i += 1) {
    const radius = actor.radius + 12 + i * 7;
    const start = -1.3 + i * 2.05 + progress * (i % 2 ? -1.7 : 1.25);
    ctx.globalAlpha = appear * fade * (.52 + i * .12);
    ctx.lineWidth = 4 - i * .65;
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, radius, start, start + 1.28);
    ctx.stroke();
  }

  drawDarkWisps(ctx, actor.x, actor.y, profile, seed, progress, 8, 34);
  ctx.restore();
}

function drawDrain(ctx, from, to, profile, progress, seed) {
  const fade = 1 - clamp01((progress - .82) / .18);
  const b = basis(to, from);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let strand = 0; strand < 3; strand += 1) {
    ctx.globalAlpha = fade * (.30 + strand * .18);
    ctx.strokeStyle = strand === 1 ? profile.core : profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 12;
    ctx.lineWidth = strand === 1 ? 2.2 : 4.5;
    crookedPath(ctx, to, from, seed + strand * 17, progress * 10 + strand, 8 + strand * 3, 12);
    ctx.stroke();
  }

  // Soul motes visibly travel target -> caster, opposite ordinary projectiles.
  for (let i = 0; i < 8; i += 1) {
    const t = (progress * 1.75 + i / 8) % 1;
    const q = along(to, from, t);
    const side = Math.sin(t * 11 + i + seed) * 7;
    dot(ctx, q.x + b.nx * side, q.y + b.ny * side, 1.8 + (i % 3) * .45, i % 3 === 0 ? profile.core : profile.main, fade * (.42 + (1 - t) * .3));
  }

  drawImplosionImpact(ctx, to, profile, (progress * 1.35) % 1, seed + 44, false);
  ctx.restore();
}

function drawConflagrate(ctx, target, profile, progress, seed) {
  const t = easeOut(progress / .72);
  const fade = 1 - clamp01((progress - .58) / .42);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // Flame tongues rise from several offset points rather than a travelling bolt.
  for (let i = 0; i < 8; i += 1) {
    const side = (seeded(seed, i) - .5) * 38;
    const baseY = target.y + 17 - seeded(seed + 6, i) * 10;
    const rise = t * (28 + seeded(seed + 14, i) * 31);
    const x = target.x + side;
    const y = baseY - rise;
    ctx.globalAlpha = fade * (.42 + seeded(seed + 25, i) * .4);
    ctx.strokeStyle = i % 3 === 0 ? profile.core : profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2 + seeded(seed + 31, i) * 2.4;
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(
      x + Math.sin(i * 2.4 + progress * 9) * 11,
      baseY - rise * .55,
      x + Math.cos(i + progress * 7) * 5,
      y,
    );
    ctx.stroke();
  }
  dot(ctx, target.x, target.y, 8 + (1 - t) * 6, profile.core, fade * .55);
  ctx.restore();
}

export function drawWarlockCastVfx(ctx, actor, spell, progress, nowMs = performance.now()) {
  if (!spell || !usesWarlockVfx2(spell.id)) return false;
  const profile = PROFILE[spell.id];
  if (!profile) return false;

  const p = clamp01(progress);
  const pulse = .5 + .5 * Math.sin(nowMs * .012);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // Warlock casting pulls smoky motes inward on uneven spirals; intentionally
  // no perfect rune ring like Mage and no electrical orbit like Shaman.
  for (let i = 0; i < 8; i += 1) {
    const base = seeded(actor.id?.length || 1, i) * TAU;
    const angle = base + nowMs * .0013 * (i % 2 ? 1 : -1);
    const radius = actor.radius + 38 + (i % 4) * 5;
    const inward = radius * (1 - p * .68);
    const x = actor.x + Math.cos(angle) * inward;
    const y = actor.y + Math.sin(angle) * inward;
    dot(ctx, x, y, 1.5 + (i % 3) * .55, i % 3 === 0 ? profile.core : profile.main, .25 + p * .5);
  }

  ctx.globalAlpha = .25 + p * .45;
  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 9 + p * 13;
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i += 1) {
    const radius = actor.radius + 11 + i * 5 + pulse * 2;
    const start = -1.4 + i * 2.1 + nowMs * .001 * (i % 2 ? -1 : 1);
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, radius, start, start + .9);
    ctx.stroke();
  }

  if (p > .74) {
    dot(ctx, actor.x, actor.y, 4 + (p - .74) * 16, profile.core, (p - .74) * 1.8);
  }

  ctx.restore();
  return true;
}

export function drawWarlockSpellVfx(ctx, effect, game, progress, alpha) {
  const id = effect?.spellId || "";
  if (!usesWarlockVfx2(id)) return false;
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
  ctx.globalAlpha *= Math.min(1, alpha * 1.35);

  switch (profile.kind) {
    case "corruption":
      drawCorruption(ctx, target || to, profile, p, seed);
      break;
    case "shadow-bolt":
      drawShadowBolt(ctx, from, to, profile, p, seed, Boolean(effect.missed));
      break;
    case "chaos-bolt":
      drawChaosBolt(ctx, from, to, profile, p, seed, Boolean(effect.missed));
      break;
    case "resolve":
      drawResolve(ctx, source || to, profile, p, seed);
      break;
    case "fear":
      drawFear(ctx, from, to, profile, p, seed);
      break;
    case "drain":
      drawDrain(ctx, from, to, profile, p, seed);
      break;
    case "conflagrate":
      drawConflagrate(ctx, target || to, profile, p, seed);
      break;
    default:
      break;
  }

  ctx.restore();
  return true;
}
