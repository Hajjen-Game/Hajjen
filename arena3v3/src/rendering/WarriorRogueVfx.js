import { usesWarriorRogueVfx2 } from "../systems/MageShamanVfxProfile.js?v=20260930-vfx2e";

const TAU = Math.PI * 2;

const PROFILE = Object.freeze({
  "warrior-rend": { family: "warrior", kind: "rend", main: "#b76955", core: "#e0b69b", steel: "#9a9b98" },
  "warrior-mortal-strike": { family: "warrior", kind: "mortal", main: "#bf755b", core: "#eee0c8", steel: "#a7a6a1" },
  "warrior-slam": { family: "warrior", kind: "slam", main: "#ba815d", core: "#e9d7ba", steel: "#9b9b96" },
  "warrior-charge": { family: "warrior", kind: "charge", main: "#aa8a68", core: "#d7c7a7", steel: "#8c8a84" },
  "warrior-pummel": { family: "warrior", kind: "pummel", main: "#a9795c", core: "#e1d1b5", steel: "#999894" },
  "warrior-overpower": { family: "warrior", kind: "overpower", main: "#c48a61", core: "#efe1c6", steel: "#a5a49f" },
  "warrior-bloodthirst": { family: "warrior", kind: "bloodthirst", main: "#a94d48", core: "#df9a89", steel: "#8e8e89" },

  "rogue-garrote": { family: "rogue", kind: "garrote", main: "#a5a35c", core: "#e2dda0", shadow: "#514666" },
  "rogue-sinister": { family: "rogue", kind: "sinister", main: "#c2b867", core: "#eee4aa", shadow: "#594c6c" },
  "rogue-eviscerate": { family: "rogue", kind: "eviscerate", main: "#c6b95e", core: "#f4e6a4", shadow: "#5a4a69" },
  "rogue-kidney": { family: "rogue", kind: "kidney", main: "#a18a64", core: "#e1d29b", shadow: "#6a537b" },
  "rogue-kick": { family: "rogue", kind: "kick", main: "#aaa067", core: "#eee1a3", shadow: "#5d4e70" },
  "rogue-mutilate": { family: "rogue", kind: "mutilate", main: "#b7ad61", core: "#f0e2a0", shadow: "#684f78" },
  "rogue-shadowstep": { family: "rogue", kind: "shadowstep", main: "#8f76a8", core: "#cbb5df", shadow: "#43384f" },
});

function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function easeOut(v) { const t = clamp01(v); return 1 - Math.pow(1 - t, 3); }
function smooth(v) { const t = clamp01(v); return t * t * (3 - 2 * t); }
function seeded(seed, i) {
  const v = Math.sin((Number(seed) || 1) * 14.137 + i * 53.813) * 43758.5453;
  return v - Math.floor(v);
}
function along(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
function basis(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.max(1, Math.hypot(dx, dy));
  return { tx: dx / len, ty: dy / len, nx: -dy / len, ny: dx / len, angle: Math.atan2(dy, dx), len };
}
function dot(ctx, x, y, r, color, alpha = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = r * 1.8;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}
function ring(ctx, x, y, r, color, alpha, width = 2) {
  if (alpha <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function weaponSlash(ctx, target, angle, length, profile, alpha, width = 4, bend = 0) {
  ctx.save();
  ctx.translate(target.x, target.y);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = profile.core;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 11;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-length * .52, -bend);
  ctx.quadraticCurveTo(0, bend, length * .52, bend * .15);
  ctx.stroke();
  ctx.globalAlpha *= .45;
  ctx.strokeStyle = profile.steel || profile.main;
  ctx.lineWidth = Math.max(1, width + 4);
  ctx.beginPath();
  ctx.moveTo(-length * .44, -bend);
  ctx.quadraticCurveTo(0, bend, length * .44, bend * .15);
  ctx.stroke();
  ctx.restore();
}

function drawWarriorSignatureBlade(
  ctx,
  source,
  angle,
  length,
  halfWidth,
  profile,
  alpha,
  shape = "sword",
) {
  if (!source || alpha <= 0) return;

  const local = (x, y) => ({
    x: source.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: source.y + x * Math.sin(angle) + y * Math.cos(angle),
  });
  const root = source.radius + 4;
  const shoulder =
    shape === "cleaver"
      ? length * .66
      : length - Math.max(10, halfWidth * 1.8);
  const shoulderWidth =
    shape === "cleaver" ? halfWidth * 1.32 : halfWidth * .72;
  const tipWidth = shape === "cleaver" ? halfWidth * .34 : halfWidth * .12;
  const blade = [
    local(root, -halfWidth),
    local(shoulder, -shoulderWidth),
    local(length, -tipWidth),
    local(length + (shape === "cleaver" ? 4 : 6), 0),
    local(length, tipWidth),
    local(shoulder, shoulderWidth),
    local(root, halfWidth),
  ];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 14;
  ctx.fillStyle = profile.main;
  ctx.globalAlpha = alpha * .18;
  ctx.beginPath();
  ctx.moveTo(blade[0].x, blade[0].y);
  for (let i = 1; i < blade.length; i += 1) ctx.lineTo(blade[i].x, blade[i].y);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 4;
  ctx.globalAlpha = alpha * .48;
  ctx.fill();

  ctx.strokeStyle = profile.core;
  ctx.lineWidth = 2.1;
  ctx.globalAlpha = Math.min(1, alpha * 1.08);
  ctx.stroke();

  const ridgeA = local(root + 5, 0);
  const ridgeB = local(length - 7, 0);
  ctx.lineWidth = 1.35;
  ctx.globalAlpha = alpha * .92;
  ctx.beginPath();
  ctx.moveTo(ridgeA.x, ridgeA.y);
  ctx.lineTo(ridgeB.x, ridgeB.y);
  ctx.stroke();
  ctx.restore();
}

function drawWarriorDoubleAxe(
  ctx,
  source,
  angle,
  length,
  headSize,
  profile,
  alpha,
) {
  if (!source || alpha <= 0) return;

  const local = (x, y) => ({
    x: source.x + x * Math.cos(angle) - y * Math.sin(angle),
    y: source.y + x * Math.sin(angle) + y * Math.cos(angle),
  });
  const root = source.radius + 4;
  const handleStart = local(Math.max(3, root - 14), 0);
  const handleEnd = local(length + 7, 0);
  const headX = length - 3;
  const steel = profile.steel || "#a8a8a3";
  const steelEdge = profile.core || "#eee2cf";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Class-colour glow around a visible wooden shaft.
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = profile.main;
  ctx.lineWidth = 9;
  ctx.globalAlpha = alpha * .07;
  ctx.beginPath();
  ctx.moveTo(handleStart.x, handleStart.y);
  ctx.lineTo(handleEnd.x, handleEnd.y);
  ctx.stroke();

  ctx.shadowBlur = 3;
  ctx.strokeStyle = "#785038";
  ctx.lineWidth = 5;
  ctx.globalAlpha = alpha * .92;
  ctx.stroke();

  ctx.strokeStyle = "#b07b52";
  ctx.lineWidth = 1.25;
  ctx.globalAlpha = alpha * .64;
  ctx.stroke();

  for (const sign of [-1, 1]) {
    const blade = [
      local(headX - 4, sign * 2.4),
      local(headX - 13, sign * (headSize * .34)),
      local(headX - 17, sign * (headSize * .72)),
      local(headX - 11, sign * (headSize * 1.12)),
      local(headX - 1, sign * (headSize * 1.42)),
      local(headX + 10, sign * (headSize * 1.16)),
      local(headX + 15, sign * (headSize * .72)),
      local(headX + 10, sign * (headSize * .34)),
      local(headX + 3, sign * 2.2),
    ];

    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 14;
    ctx.fillStyle = profile.main;
    ctx.globalAlpha = alpha * .16;
    ctx.beginPath();
    ctx.moveTo(blade[0].x, blade[0].y);
    for (let i = 1; i < blade.length; i += 1) {
      ctx.lineTo(blade[i].x, blade[i].y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 4;
    ctx.fillStyle = steel;
    ctx.globalAlpha = alpha * .84;
    ctx.fill();

    ctx.strokeStyle = steelEdge;
    ctx.lineWidth = 2;
    ctx.globalAlpha = Math.min(1, alpha * 1.05);
    ctx.stroke();

    const edgeA = local(headX - 10, sign * (headSize * 1.05));
    const edgeM = local(headX - 1, sign * (headSize * 1.35));
    const edgeB = local(headX + 11, sign * (headSize * 1.04));
    ctx.strokeStyle = steelEdge;
    ctx.lineWidth = 1.55;
    ctx.globalAlpha = alpha * .92;
    ctx.beginPath();
    ctx.moveTo(edgeA.x, edgeA.y);
    ctx.lineTo(edgeM.x, edgeM.y);
    ctx.lineTo(edgeB.x, edgeB.y);
    ctx.stroke();
  }

  const socket = [
    local(headX - 5, -3.3),
    local(headX + 5, -3.3),
    local(headX + 5, 3.3),
    local(headX - 5, 3.3),
  ];
  ctx.fillStyle = steel;
  ctx.globalAlpha = alpha * .94;
  ctx.beginPath();
  ctx.moveTo(socket[0].x, socket[0].y);
  for (let i = 1; i < socket.length; i += 1) {
    ctx.lineTo(socket[i].x, socket[i].y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = steelEdge;
  ctx.lineWidth = 1.2;
  ctx.globalAlpha = alpha * .76;
  ctx.stroke();

  ctx.restore();
}

function drawWarriorSweepArc(
  ctx,
  source,
  radius,
  start,
  end,
  profile,
  alpha,
  width = 4,
) {
  if (!source || alpha <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 9;
  ctx.strokeStyle = profile.main;
  ctx.lineWidth = width * 3.4;
  ctx.globalAlpha = alpha * .10;
  ctx.beginPath();
  ctx.arc(source.x, source.y, radius, start, end, end < start);
  ctx.stroke();

  ctx.shadowBlur = 3;
  ctx.strokeStyle = profile.core;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha * .74;
  ctx.beginPath();
  ctx.arc(source.x, source.y, radius - 1, start, end, end < start);
  ctx.stroke();
  ctx.restore();
}

function warriorCue(ctx, source, profile, p, heavy = false) {
  if (!source) return;
  const fade = 1 - clamp01(p);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = profile.steel;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = heavy ? 10 : 6;
  ctx.lineWidth = heavy ? 2.4 : 1.6;
  ctx.globalAlpha = fade * (heavy ? .58 : .38);
  for (let i = 0; i < (heavy ? 5 : 3); i += 1) {
    const a = -.95 + i * (heavy ? .48 : .72);
    const inner = source.radius + 5;
    const outer = source.radius + 13 + i * 2 + p * 8;
    ctx.beginPath();
    ctx.moveTo(source.x + Math.cos(a) * inner, source.y + Math.sin(a) * inner);
    ctx.lineTo(source.x + Math.cos(a) * outer, source.y + Math.sin(a) * outer);
    ctx.stroke();
  }
  ctx.restore();
}

function rogueCue(ctx, source, profile, p) {
  if (!source) return;
  const fade = 1 - clamp01(p);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = profile.shadow;
  ctx.shadowColor = profile.shadow;
  ctx.shadowBlur = 7;
  ctx.lineWidth = 1.4;
  ctx.globalAlpha = fade * .38;
  for (let i = 0; i < 3; i += 1) {
    const a = i * TAU / 3 - p * 1.8;
    const r = source.radius + 7 + i * 3;
    ctx.beginPath();
    ctx.arc(source.x, source.y, r, a, a + .72);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRend(ctx, source, target, profile, p, seed, missed) {
  warriorCue(ctx, source, profile, Math.min(1, p / .14));
  const facing = Math.atan2(target.y - source.y, target.x - source.x);
  const motion = smooth(clamp01((p - .03) / .54));
  const fade = 1 - smooth((p - .70) / .24);
  const a0 = facing - 1.18;
  const angle = a0 + 1.42 * motion;
  const strength = easeOut(p / .10) * fade;

  drawWarriorSweepArc(ctx, source, source.radius + 35, a0, angle, profile, strength, 4.3);
  const rendDistance = Math.hypot(target.x - source.x, target.y - source.y);
  const rendAxeLength = Math.max(48, Math.min(62, rendDistance + 3));
  drawWarriorDoubleAxe(
    ctx, source, angle, rendAxeLength, 13.5, profile, strength
  );

  if (!missed) {
    for (let i = 0; i < 4; i += 1) {
      const a = -.4 + i * .28;
      dot(ctx, target.x + Math.cos(a) * (11 + p * 15), target.y + Math.sin(a) * (9 + p * 12), 1.2 + (i % 2) * .5, profile.main, fade * .42);
    }
  }
}

function drawMortalStrike(ctx, source, target, profile, p, seed, missed) {
  warriorCue(ctx, source, profile, Math.min(1, p / .14), true);

  // VFX 3.0+: Mortal Strike keeps the approved 180° signature sweep, but the
  // Warrior now carries one spectral double-sided axe. Misses still aim at the
  // actor; combat text remains the authority for MISS/DODGE.
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const facing = Math.atan2(dy, dx);
  const rawSwing = clamp01((p - .05) / .52);
  let swing;
  if (rawSwing < .48) {
    swing = smooth(rawSwing / .48) * .58;
  } else if (rawSwing < .68) {
    swing = .58;
  } else {
    swing = .58 + smooth((rawSwing - .68) / .32) * .42;
  }
  const reveal = smooth(p / .10);
  const swingFade = 1 - clamp01((p - .62) / .28);
  const startAngle = facing - Math.PI * .58;
  const endAngle = facing + Math.PI * .42;
  const swordAngle = startAngle + (endAngle - startAngle) * swing;
  const swordLength = Math.max(66, Math.min(96, distance + 24));
  const arcRadius = Math.max(source.radius + 32, Math.min(swordLength * .86, distance * .86 + 18));
  const swordAlpha = reveal * swingFade;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(source.x, source.y);

  // Wide completed sweep trail: blurred warm metal outside, white-hot edge inside.
  ctx.lineCap = "round";
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 14;
  ctx.strokeStyle = profile.main;
  ctx.lineWidth = 24;
  ctx.globalAlpha = swordAlpha * .15;
  ctx.beginPath();
  ctx.arc(0, 0, arcRadius, startAngle, swordAngle);
  ctx.stroke();

  ctx.shadowBlur = 7;
  ctx.lineWidth = 7;
  ctx.globalAlpha = swordAlpha * .72;
  ctx.beginPath();
  ctx.arc(0, 0, arcRadius, startAngle, swordAngle);
  ctx.stroke();

  ctx.strokeStyle = profile.core;
  ctx.lineWidth = 4.2;
  ctx.globalAlpha = Math.min(1, swordAlpha * 1.20);
  ctx.beginPath();
  ctx.arc(0, 0, arcRadius - 2, Math.max(startAngle, swordAngle - 1.02), swordAngle);
  ctx.stroke();

  ctx.restore();

  const axeLength = Math.max(50, Math.min(70, distance + 3));
  drawWarriorDoubleAxe(
    ctx,
    source,
    swordAngle - .11,
    axeLength,
    14.5,
    profile,
    swordAlpha * .12,
  );
  drawWarriorDoubleAxe(
    ctx,
    source,
    swordAngle,
    axeLength,
    15,
    profile,
    swordAlpha,
  );

  if (p > .30) {
    const t = clamp01((p - .30) / .50);
    const hitFade = 1 - smooth((t - .68) / .32);
    const expand = smooth(t);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.translate(target.x, target.y);

    // Impact flash and broken wound seal sell the Mortal Strike healing debuff.
    ctx.fillStyle = profile.core;
    ctx.globalAlpha = hitFade * Math.exp(-t * 11) * .30;
    ctx.beginPath();
    ctx.arc(0, 0, 11 + (1 - t) * 9, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.6;
    ctx.globalAlpha = hitFade * .66;
    for (let i = 0; i < 3; i += 1) {
      const a = i * TAU / 3 + .2 - t * .18;
      ctx.beginPath();
      ctx.arc(0, 0, 20 + expand * 31, a, a + 1.02);
      ctx.stroke();
    }

    const hitAngle = Math.atan2(dy, dx);
    ctx.strokeStyle = profile.core;
    ctx.lineWidth = 4.2;
    ctx.globalAlpha = hitFade * .86;
    ctx.beginPath();
    ctx.arc(0, 0, 30 + expand * 28, hitAngle - .78, hitAngle + .78);
    ctx.stroke();

    ctx.strokeStyle = profile.core;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = hitFade * .58;
    for (let i = 0; i < 5; i += 1) {
      const a = i * TAU / 5 + seed * .006;
      const inner = 8;
      const outer = 22 + expand * (10 + (i % 3) * 4);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
      ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawSlam(ctx, source, target, profile, p, seed, missed) {
  warriorCue(ctx, source, profile, Math.min(1, p / .18), true);
  const side = missed ? (seeded(seed, 2) > .5 ? 47 : -47) : 0;
  const to = { x: target.x + side, y: target.y };
  const impact = smooth(p / .36);
  const fade = 1 - clamp01((p - .72) / .28);

  const facing = Math.atan2(target.y - source.y, target.x - source.x);
  const drop = smooth(clamp01((p - .20) / .42));
  const angle = facing - 1.48 + 1.48 * drop;
  const strength = easeOut(p / .11) * fade;

  drawWarriorSweepArc(
    ctx,
    source,
    source.radius + 40,
    facing - 1.48,
    angle,
    profile,
    strength,
    4.8,
  );
  const slamDistance = Math.hypot(target.x - source.x, target.y - source.y);
  const slamAxeLength = Math.max(50, Math.min(66, slamDistance + 3));
  drawWarriorDoubleAxe(
    ctx, source, angle, slamAxeLength, 15, profile, strength
  );

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (!missed && p > .20) {
    const shock = clamp01((p - .20) / .58);
    ctx.globalAlpha = (1 - shock) * .65;
    ctx.strokeStyle = profile.main;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(target.x, target.y + 13, 10 + easeOut(shock) * 38, 4 + easeOut(shock) * 10, 0, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 6; i += 1) {
      const a = -.15 + i * (Math.PI / 5);
      const len = 10 + shock * (15 + seeded(seed, i) * 17);
      ctx.beginPath();
      ctx.moveTo(target.x + Math.cos(a) * 7, target.y + 12 + Math.sin(a) * 3);
      ctx.lineTo(target.x + Math.cos(a) * len, target.y + 12 + Math.sin(a) * len * .38);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawCharge(ctx, source, effect, target, profile, p, seed) {
  const from = { x: effect.sourceX ?? source?.x ?? 0, y: effect.sourceY ?? source?.y ?? 0 };
  const live = source || from;
  const b = basis(from, live);
  const moved = Math.hypot(live.x - from.x, live.y - from.y) > 5;
  const fade = 1 - clamp01((p - .72) / .28);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  if (moved) {
    const tailLen = Math.min(42, b.len);
    const tail = { x: live.x - b.tx * tailLen, y: live.y - b.ty * tailLen };
    for (let i = 0; i < 4; i += 1) {
      const off = (i - 1.5) * 4;
      ctx.globalAlpha = fade * (.16 + i * .05);
      ctx.strokeStyle = i % 2 ? profile.core : profile.main;
      ctx.lineWidth = 1.2 + i * .35;
      ctx.beginPath();
      ctx.moveTo(tail.x + b.nx * off, tail.y + b.ny * off);
      ctx.lineTo(live.x - b.tx * 7 + b.nx * off * .5, live.y - b.ty * 7 + b.ny * off * .5);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i += 1) {
      const lag = 5 + i * 7;
      dot(ctx, live.x - b.tx * lag + b.nx * (seeded(seed, i) - .5) * 10, live.y - b.ty * lag + b.ny * (seeded(seed, i) - .5) * 10, 1.3 + (i % 2) * .5, profile.main, fade * (.44 - i * .05));
    }
  } else {
    warriorCue(ctx, source, profile, Math.min(1, p / .4), true);
  }

  if (target && p > .44) {
    const hit = clamp01((p - .44) / .44);
    ctx.globalAlpha = (1 - hit) * .42;
    ctx.strokeStyle = profile.core;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(live.x, live.y + (source?.radius || 20) * .65, 10 + hit * 24, 4 + hit * 7, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

function interruptSucceeded(target, spellId, kind) {
  return Boolean(target?.effects?.some(effect =>
    effect.remainingMs > 0 && effect.spellId === spellId && effect.kind === kind
  ));
}

function drawPummel(ctx, source, target, profile, p, successful) {
  warriorCue(ctx, source, profile, Math.min(1, p / .12));
  const fade = 1 - clamp01((p - .62) / .38);
  const center = successful ? target : source;
  if (!center) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(center.x, center.y);
  ctx.strokeStyle = profile.core;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 3.4;
  ctx.globalAlpha = fade * .78;
  const close = successful ? 1 - easeOut(p) : 1;
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sign * (27 + close * 5), -11);
    ctx.lineTo(sign * (10 + close * 3), 0);
    ctx.lineTo(sign * (27 + close * 5), 11);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOverpower(ctx, source, target, profile, p, seed, missed) {
  warriorCue(ctx, source, profile, Math.min(1, p / .12));
  const facing = Math.atan2(target.y - source.y, target.x - source.x);
  const motion = smooth(clamp01((p - .02) / .46));
  const fade = 1 - smooth((p - .62) / .26);
  const a0 = facing + .96;
  const angle = a0 - 1.38 * motion;
  const strength = easeOut(p / .08) * fade;

  drawWarriorSweepArc(ctx, source, source.radius + 31, a0, angle, profile, strength, 3.2);
  const overpowerDistance = Math.hypot(target.x - source.x, target.y - source.y);
  const overpowerAxeLength = Math.max(46, Math.min(58, overpowerDistance + 3));
  drawWarriorDoubleAxe(
    ctx, source, angle, overpowerAxeLength, 12.5, profile, strength
  );

  if (!missed && p > .22) {
    const hit = clamp01((p - .22) / .48);
    for (let i = 0; i < 4; i += 1) {
      const a = -.75 + i * .31;
      dot(ctx, target.x + Math.cos(a) * (13 + hit * 18), target.y + Math.sin(a) * (13 + hit * 18), 1.3, profile.main, (1 - hit) * .42);
    }
  }
}

function drawBloodthirst(ctx, source, target, profile, p, seed, missed) {
  warriorCue(ctx, source, profile, Math.min(1, p / .12));
  const facing = Math.atan2(target.y - source.y, target.x - source.x);
  const raw = clamp01((p - .03) / .86);
  const start = facing - 1.43;
  const far = facing + 1.43;
  let angle;
  let segmentStart;

  if (raw < .47) {
    const motion = smooth(raw / .47);
    angle = start + (far - start) * motion;
    segmentStart = start;
  } else if (raw < .56) {
    angle = far;
    segmentStart = start;
  } else {
    const motion = smooth((raw - .56) / .44);
    angle = far + (start - far) * motion;
    segmentStart = far;
  }

  const fade = 1 - smooth((p - .91) / .09);
  const strength = easeOut(p / .08) * fade;

  drawWarriorSweepArc(
    ctx,
    source,
    source.radius + 34,
    segmentStart,
    angle,
    profile,
    strength,
    4.5,
  );
  const bloodthirstDistance = Math.hypot(
    target.x - source.x,
    target.y - source.y,
  );
  const bloodthirstAxeLength = Math.max(
    48,
    Math.min(60, bloodthirstDistance + 3),
  );
  drawWarriorDoubleAxe(
    ctx,
    source,
    angle,
    bloodthirstAxeLength,
    13.5,
    profile,
    strength,
  );

  if (!missed && source && p > .28) {
    const t = clamp01((p - .28) / .48);
    const b = basis(target, source);
    for (let i = 0; i < 5; i += 1) {
      const local = clamp01(t - i * .08);
      const q = along(target, source, easeOut(local));
      dot(ctx, q.x + b.nx * Math.sin(i + p * 10) * 4, q.y + b.ny * Math.sin(i + p * 10) * 4, 1.5 + (i % 2) * .4, profile.main, fade * .48);
    }
  }
}

function drawGarrote(ctx, source, target, profile, p, seed, missed) {
  rogueCue(ctx, source, profile, Math.min(1, p / .10));
  const to = missed
    ? { x: target.x + (seeded(seed, 6) > .5 ? 34 : -34), y: target.y - 7 }
    : target;
  const fade = 1 - clamp01((p - .60) / .40);
  const cut = smooth(p / .18);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = profile.core;
  ctx.shadowColor = profile.shadow;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = fade * cut * .76;
  ctx.beginPath();
  ctx.moveTo(to.x - 15, to.y - 5);
  ctx.quadraticCurveTo(to.x, to.y - 10, to.x + 16, to.y - 4);
  ctx.stroke();
  ctx.restore();

  if (!missed) {
    for (let i = 0; i < 4; i += 1) {
      dot(ctx, target.x - 8 + i * 5, target.y + 5 + p * (5 + i), 1.0 + (i % 2) * .3, "#915852", fade * .34);
    }
  }
}

function drawSinister(ctx, source, target, profile, p, seed, missed) {
  rogueCue(ctx, source, profile, Math.min(1, p / .08));
  const to = missed
    ? { x: target.x + (seeded(seed, 7) > .5 ? 35 : -35), y: target.y - 6 }
    : target;
  const fade = 1 - clamp01((p - .56) / .44);
  const contact = smooth(p / .17);
  const facing = Math.atan2(target.y - source.y, target.x - source.x);
  const b = basis(source, target);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = profile.core;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 6;
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = fade * contact * .78;
  ctx.beginPath();
  ctx.moveTo(to.x - Math.cos(facing) * 10 - b.nx * 3, to.y - Math.sin(facing) * 10 - b.ny * 3);
  ctx.lineTo(to.x + Math.cos(facing) * 9 + b.nx * 2, to.y + Math.sin(facing) * 9 + b.ny * 2);
  ctx.stroke();
  ctx.restore();

  if (!missed && p > .12) {
    const hit = clamp01((p - .12) / .35);
    dot(ctx, target.x, target.y, 2.7, profile.core, (1 - hit) * .48);
  }
}

function drawEviscerate(ctx, source, target, profile, p, seed, missed) {
  rogueCue(ctx, source, profile, Math.min(1, p / .10));
  const to = missed
    ? { x: target.x + (seeded(seed, 8) > .5 ? 38 : -38), y: target.y - 5 }
    : target;
  const fade = 1 - clamp01((p - .68) / .32);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.shadowColor = profile.shadow;
  ctx.shadowBlur = 6;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i += 1) {
    const local = smooth((p - i * .055) / .20);
    if (local <= 0) continue;
    const angle = -.78 + i * .78;
    const half = 9 + i * 2;
    ctx.strokeStyle = i === 1 ? profile.core : profile.main;
    ctx.lineWidth = i === 1 ? 2.4 : 1.7;
    ctx.globalAlpha = fade * local * (i === 1 ? .84 : .66);
    ctx.beginPath();
    ctx.moveTo(to.x - Math.cos(angle) * half, to.y - Math.sin(angle) * half);
    ctx.lineTo(to.x + Math.cos(angle) * half, to.y + Math.sin(angle) * half);
    ctx.stroke();
  }
  ctx.restore();

  if (!missed && p > .20) {
    const hit = clamp01((p - .20) / .38);
    ring(ctx, target.x, target.y, 7 + easeOut(hit) * 12, profile.shadow, (1 - hit) * .22, 1.2);
    dot(ctx, target.x, target.y, 3.5, profile.core, (1 - hit) * .55);
  }
}

function drawKidney(ctx, source, target, profile, p, successful) {
  rogueCue(ctx, source, profile, Math.min(1, p / .09));
  const fade = 1 - clamp01((p - .66) / .34);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(target.x, target.y);
  ctx.strokeStyle = successful ? profile.core : profile.main;
  ctx.shadowColor = profile.shadow;
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = fade * .68;
  // Compact three-point jab, not a large stun explosion.
  for (let i = 0; i < 3; i += 1) {
    const a = -.45 + i * .45;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 25, Math.sin(a) * 25);
    ctx.lineTo(Math.cos(a) * 7, Math.sin(a) * 7);
    ctx.stroke();
  }
  if (successful) ring(ctx, 0, 0, 10 + easeOut(p) * 15, profile.shadow, fade * .36, 1.4);
  ctx.restore();
}

function drawKick(ctx, source, target, profile, p, successful) {
  rogueCue(ctx, source, profile, Math.min(1, p / .08));
  const fade = 1 - clamp01((p - .58) / .42);
  const center = successful ? target : source;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(center.x, center.y);
  ctx.rotate(-.52);
  ctx.strokeStyle = profile.core;
  ctx.shadowColor = profile.shadow;
  ctx.shadowBlur = 7;
  ctx.lineWidth = 2.8;
  ctx.globalAlpha = fade * .75;
  ctx.beginPath();
  ctx.moveTo(-24, 9);
  ctx.lineTo(8, -5);
  ctx.lineTo(23, -13);
  ctx.stroke();
  if (successful) {
    ctx.strokeStyle = profile.shadow;
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(7 + i * 5, -3 - i * 3);
      ctx.lineTo(15 + i * 6, 3 - i * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawMutilate(ctx, source, target, profile, p, seed, missed) {
  rogueCue(ctx, source, profile, Math.min(1, p / .09));
  const to = missed
    ? { x: target.x + (seeded(seed, 9) > .5 ? 38 : -38), y: target.y - 7 }
    : target;
  const fade = 1 - clamp01((p - .66) / .34);
  const left = smooth(p / .22);
  const right = smooth((p - .045) / .22);
  const poison = "#79d36f";

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.shadowColor = profile.shadow;
  ctx.shadowBlur = 7;

  for (const [angle, strength, side] of [
    [-.68, left, -1],
    [.68, right, 1],
  ]) {
    const half = 12;
    ctx.strokeStyle = side < 0 ? profile.core : profile.main;
    ctx.lineWidth = 2.2;
    ctx.globalAlpha = fade * strength * .78;
    ctx.beginPath();
    ctx.moveTo(to.x - Math.cos(angle) * half, to.y - Math.sin(angle) * half);
    ctx.lineTo(to.x + Math.cos(angle) * half, to.y + Math.sin(angle) * half);
    ctx.stroke();

    ctx.strokeStyle = poison;
    ctx.lineWidth = 1;
    ctx.globalAlpha = fade * strength * .62;
    ctx.beginPath();
    ctx.moveTo(to.x - Math.cos(angle) * 5, to.y - Math.sin(angle) * 5);
    ctx.lineTo(to.x + Math.cos(angle) * 7, to.y + Math.sin(angle) * 7);
    ctx.stroke();
  }
  ctx.restore();

  if (!missed && p > .18) {
    const hit = clamp01((p - .18) / .42);
    dot(ctx, target.x, target.y, 4.2 * (1 - hit * .45), poison, (1 - hit) * .48);
    for (let i = 0; i < 4; i += 1) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      dot(ctx, target.x + Math.cos(a) * (7 + hit * 8), target.y + Math.sin(a) * (7 + hit * 8), 1.1, i % 2 ? profile.core : poison, (1 - hit) * .40);
    }
  }
}

function drawShadowstep(ctx, source, effect, profile, p, seed) {
  const origin = { x: effect.sourceX ?? source?.x ?? 0, y: effect.sourceY ?? source?.y ?? 0 };
  const live = source || origin;
  const moved = Math.hypot(live.x - origin.x, live.y - origin.y) > 12;
  const fadeOut = 1 - clamp01(p / .52);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  // No connecting line: Shadowstep should read as disappear -> reappear.
  ring(ctx, origin.x, origin.y, 9 + p * 22, profile.shadow, fadeOut * .45, 1.5);
  for (let i = 0; i < 6; i += 1) {
    const a = seeded(seed, i) * TAU + p * 2.4;
    const rr = 5 + p * (15 + seeded(seed + 20, i) * 16);
    dot(ctx, origin.x + Math.cos(a) * rr, origin.y + Math.sin(a) * rr, 1.4 + (i % 2) * .5, profile.shadow, fadeOut * .46);
  }

  if (moved && p > .08) {
    const arrive = clamp01((p - .08) / .55);
    const fade = 1 - clamp01((p - .70) / .30);
    for (let i = 0; i < 7; i += 1) {
      const a = i * TAU / 7 - arrive * 1.7;
      const rr = 29 * (1 - arrive * .62) + (i % 2) * 4;
      dot(ctx, live.x + Math.cos(a) * rr, live.y + Math.sin(a) * rr, 1.3 + (i % 3) * .45, i % 3 === 0 ? profile.core : profile.main, fade * .52);
    }
    ring(ctx, live.x, live.y, 25 - arrive * 11, profile.main, fade * .30, 1.3);
  }
  ctx.restore();
}

export function drawWarriorRogueCastVfx(ctx, actor, spell, progress, nowMs = performance.now()) {
  if (!spell || !usesWarriorRogueVfx2(spell.id)) return false;
  const profile = PROFILE[spell.id];
  if (!profile) return false;
  const p = clamp01(progress);

  // Slam is the only current cast-time melee attack. Its wind-up reads like
  // weapon weight rather than caster magic.
  if (profile.family === "warrior") {
    warriorCue(ctx, actor, profile, Math.max(0, 1 - p), spell.id === "warrior-slam");
    if (spell.id === "warrior-slam") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(actor.x, actor.y);
      ctx.strokeStyle = profile.core;
      ctx.shadowColor = profile.main;
      ctx.shadowBlur = 8 + p * 8;
      ctx.lineWidth = 2 + p * 1.6;
      ctx.globalAlpha = .25 + p * .45;
      ctx.beginPath();
      ctx.arc(0, 0, actor.radius + 11 + p * 8, -2.5, -.5);
      ctx.stroke();
      ctx.restore();
    }
  } else {
    rogueCue(ctx, actor, profile, Math.max(0, 1 - p));
  }
  return true;
}

export function drawWarriorRogueSpellVfx(ctx, effect, game, progress, alpha) {
  const id = effect?.spellId || "";
  if (!usesWarriorRogueVfx2(id)) return false;
  const profile = PROFILE[id];
  if (!profile) return false;

  const source = game.getActor(effect.sourceId);
  const target = game.getActor(effect.targetId) || {
    x: effect.targetX ?? effect.sourceX ?? 0,
    y: effect.targetY ?? effect.sourceY ?? 0,
    radius: 20,
    effects: [],
  };
  const p = clamp01(progress);
  const seed = effect.seed || effect.id || 1;

  ctx.save();
  ctx.globalAlpha *= Math.min(1, alpha * 1.3);

  switch (profile.kind) {
    case "rend": drawRend(ctx, source, target, profile, p, seed, Boolean(effect.missed)); break;
    case "mortal": drawMortalStrike(ctx, source, target, profile, p, seed, Boolean(effect.missed)); break;
    case "slam": drawSlam(ctx, source, target, profile, p, seed, Boolean(effect.missed)); break;
    case "charge": drawCharge(ctx, source, effect, target, profile, p, seed); break;
    case "pummel":
      drawPummel(ctx, source, target, profile, p, interruptSucceeded(target, id, "schoolLock"));
      break;
    case "overpower": drawOverpower(ctx, source, target, profile, p, seed, Boolean(effect.missed)); break;
    case "bloodthirst": drawBloodthirst(ctx, source, target, profile, p, seed, Boolean(effect.missed)); break;

    case "garrote": drawGarrote(ctx, source, target, profile, p, seed, Boolean(effect.missed)); break;
    case "sinister": drawSinister(ctx, source, target, profile, p, seed, Boolean(effect.missed)); break;
    case "eviscerate": drawEviscerate(ctx, source, target, profile, p, seed, Boolean(effect.missed)); break;
    case "kidney":
      drawKidney(ctx, source, target, profile, p, interruptSucceeded(target, id, "stun"));
      break;
    case "kick":
      drawKick(ctx, source, target, profile, p, interruptSucceeded(target, id, "schoolLock"));
      break;
    case "mutilate": drawMutilate(ctx, source, target, profile, p, seed, Boolean(effect.missed)); break;
    case "shadowstep": drawShadowstep(ctx, source, effect, profile, p, seed); break;
    default: break;
  }

  ctx.restore();
  return true;
}
