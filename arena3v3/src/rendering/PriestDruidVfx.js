import { usesPriestDruidVfx2 } from "../systems/MageShamanVfxProfile.js?v=20260930-vfx2c";

const TAU = Math.PI * 2;

const PROFILE = Object.freeze({
  "priest-renew": { family: "priest", kind: "holy-hot", main: "#e7cf8d", core: "#fff7cf", accent: "#c9a95e" },
  "priest-flash-heal": { family: "priest", kind: "holy-flash", main: "#ead38f", core: "#fff9dc", accent: "#c8aa61" },
  "priest-greater-heal": { family: "priest", kind: "holy-greater", main: "#e8d39a", core: "#fffce7", accent: "#c9aa6a" },
  "priest-pain-suppression": { family: "priest", kind: "holy-shield", main: "#d9c78f", core: "#fff8d6", accent: "#8d78b4" },
  "priest-psychic-scream": { family: "priest", kind: "shadow-wave", main: "#8865b4", core: "#ceb5e8", accent: "#473158" },
  "priest-smite": { family: "priest", kind: "mind-implosion", main: "#8d64bd", core: "#d8b8ef", accent: "#4d315e" },
  "priest-holy-fire": { family: "priest", kind: "holy-sky", main: "#e3b95e", core: "#fff5c2", accent: "#cc7440" },

  "druid-rejuvenation": { family: "druid", kind: "leaf-hot", main: "#72b978", core: "#dff4a8", accent: "#4d8255" },
  "druid-swiftmend": { family: "druid", kind: "leaf-burst", main: "#79bd74", core: "#eef7b1", accent: "#4f8b55" },
  "druid-regrowth": { family: "druid", kind: "regrowth", main: "#6eb06f", core: "#e2f2a6", accent: "#4c7951" },
  "druid-ironbark": { family: "druid", kind: "bark-shield", main: "#7ea46a", core: "#d6e6a2", accent: "#70563a" },
  "druid-cyclone": { family: "druid", kind: "cyclone", main: "#91b98a", core: "#eaf1ca", accent: "#6d8c72" },
  "druid-lifebloom": { family: "druid", kind: "lifebloom", main: "#7bc082", core: "#f0f5b3", accent: "#5d9264" },
  "druid-moonfire": { family: "druid", kind: "moon-sky", main: "#8aa8d8", core: "#eef3ff", accent: "#7690ba" },
});

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeOut(value) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function smoothstep(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function seeded(seed, index) {
  const value = Math.sin((Number(seed) || 1) * 15.713 + index * 51.127) * 43758.5453;
  return value - Math.floor(value);
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

function ring(ctx, x, y, radius, color, alpha, width = 2) {
  if (alpha <= 0 || radius <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 11;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

function sourceCue(ctx, source, profile, phase, shape = "holy") {
  if (!source) return;
  const p = clamp01(phase);
  const fade = 1 - p;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (shape === "nature") {
    for (let i = 0; i < 5; i += 1) {
      const a = i / 5 * TAU + p * 1.2;
      const rr = source.radius + 10 + p * 13;
      const x = source.x + Math.cos(a) * rr;
      const y = source.y + Math.sin(a) * rr;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a + p);
      ctx.globalAlpha = fade * .55;
      ctx.fillStyle = i % 2 ? profile.main : profile.core;
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 2.1, .35, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ring(ctx, source.x, source.y, source.radius + 8 + p * 10, profile.main, fade * .33, 1.4);
  } else if (shape === "shadow") {
    for (let i = 0; i < 4; i += 1) {
      const r = source.radius + 8 + i * 4 + p * 7;
      const start = i * 1.5 - p * (i % 2 ? 1.4 : -1.2);
      ctx.globalAlpha = fade * (.35 + i * .08);
      ctx.strokeStyle = i % 2 ? profile.core : profile.main;
      ctx.shadowColor = profile.main;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.arc(source.x, source.y, r, start, start + .9);
      ctx.stroke();
    }
  } else {
    ring(ctx, source.x, source.y, source.radius + 9 + p * 11, profile.main, fade * .46, 2);
    for (let i = 0; i < 6; i += 1) {
      const a = i / 6 * TAU;
      const inner = source.radius + 4;
      const outer = source.radius + 16 + p * 14;
      ctx.globalAlpha = fade * .45;
      ctx.strokeStyle = i % 2 ? profile.core : profile.main;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(source.x + Math.cos(a) * inner, source.y + Math.sin(a) * inner);
      ctx.lineTo(source.x + Math.cos(a) * outer, source.y + Math.sin(a) * outer);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function holyColumn(ctx, target, profile, progress, seed, strong = false) {
  const p = clamp01(progress);
  const appear = smoothstep(p / .18);
  const fade = 1 - clamp01((p - .58) / .42);
  const height = strong ? 118 : 88;
  const width = strong ? 34 : 24;
  const topY = target.y - height;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const gradient = ctx.createLinearGradient(target.x, topY, target.x, target.y + 16);
  gradient.addColorStop(0, "rgba(255,249,218,0)");
  gradient.addColorStop(.35, profile.core);
  gradient.addColorStop(1, profile.main);
  ctx.globalAlpha = appear * fade * (strong ? .30 : .22);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(target.x - width * .5, topY);
  ctx.lineTo(target.x + width * .5, topY);
  ctx.lineTo(target.x + width * .75, target.y + 10);
  ctx.lineTo(target.x - width * .75, target.y + 10);
  ctx.closePath();
  ctx.fill();

  ring(ctx, target.x, target.y, 10 + easeOut(p) * (strong ? 30 : 22), profile.main, fade * .66, strong ? 2.8 : 2.1);

  for (let i = 0; i < (strong ? 9 : 6); i += 1) {
    const x = target.x + (seeded(seed, i) - .5) * width * 1.5;
    const y = topY + seeded(seed + 17, i) * height * .78 + p * 12;
    dot(ctx, x, y, 1.4 + seeded(seed + 29, i) * 1.8, i % 3 === 0 ? profile.core : profile.main, fade * .55);
  }

  ctx.restore();
}

function drawHolyHot(ctx, target, profile, progress, seed) {
  const p = clamp01(progress);
  const fade = 1 - clamp01((p - .62) / .38);
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < 6; i += 1) {
    const a = i / 6 * TAU - p * 1.2;
    const rr = 12 + easeOut(p) * 24;
    dot(
      ctx,
      target.x + Math.cos(a) * rr,
      target.y + Math.sin(a) * rr - p * 5,
      1.8 + (i % 2) * .7,
      i % 2 ? profile.main : profile.core,
      fade * .6,
    );
  }
  ring(ctx, target.x, target.y, 11 + p * 24, profile.main, fade * .38, 1.5);
  ctx.restore();
}

function drawMindImplosion(ctx, source, target, profile, progress, seed) {
  const p = clamp01(progress);
  sourceCue(ctx, source, profile, Math.min(1, p / .28), "shadow");

  const gather = smoothstep(p / .44);
  const burst = clamp01((p - .34) / .54);
  const fade = 1 - clamp01((p - .70) / .30);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (let i = 0; i < 8; i += 1) {
    const a = seeded(seed, i) * TAU + p * (i % 2 ? 1.7 : -1.4);
    const start = 38 + seeded(seed + 9, i) * 20;
    const rr = start * (1 - gather * .80);
    const x = target.x + Math.cos(a) * rr;
    const y = target.y + Math.sin(a) * rr;
    dot(ctx, x, y, 1.7 + seeded(seed + 19, i) * 1.8, i % 3 === 0 ? profile.core : profile.main, .25 + gather * .5);
  }

  if (p > .30) {
    ctx.globalAlpha = fade * .72;
    ctx.strokeStyle = profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 2.1;
    for (let i = 0; i < 5; i += 1) {
      const a = i / 5 * TAU + seeded(seed + 40, i) * .3;
      const inner = 7 + burst * 3;
      const outer = 13 + easeOut(burst) * (28 + seeded(seed + 50, i) * 15);
      ctx.beginPath();
      ctx.moveTo(target.x + Math.cos(a) * inner, target.y + Math.sin(a) * inner);
      ctx.quadraticCurveTo(
        target.x + Math.cos(a + .35) * outer * .60,
        target.y + Math.sin(a + .35) * outer * .60,
        target.x + Math.cos(a) * outer,
        target.y + Math.sin(a) * outer,
      );
      ctx.stroke();
    }
    dot(ctx, target.x, target.y, 7 * (1 - burst * .35), profile.core, fade * .78);
  }
  ctx.restore();
}

function drawHolySky(ctx, source, target, profile, progress, seed) {
  const p = clamp01(progress);
  sourceCue(ctx, source, profile, Math.min(1, p / .22), "holy");

  const strike = clamp01((p - .12) / .58);
  const fade = 1 - clamp01((p - .72) / .28);
  const topY = target.y - 126;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const yHead = topY + easeOut(strike) * 124;

  ctx.globalAlpha = fade * .72;
  ctx.strokeStyle = profile.core;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 18;
  ctx.lineWidth = 4.2;
  ctx.beginPath();
  ctx.moveTo(target.x + 3, topY);
  ctx.lineTo(target.x, yHead);
  ctx.stroke();

  ctx.globalAlpha = fade * .35;
  ctx.strokeStyle = profile.accent;
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(target.x + 4, topY + 8);
  ctx.lineTo(target.x, yHead);
  ctx.stroke();

  if (strike > .58) {
    const hit = (strike - .58) / .42;
    ring(ctx, target.x, target.y, 8 + easeOut(hit) * 40, profile.main, (1 - hit) * .76, 2.6);
    for (let i = 0; i < 8; i += 1) {
      const a = i / 8 * TAU + seeded(seed, i) * .16;
      const rr = 8 + easeOut(hit) * (25 + seeded(seed + 14, i) * 18);
      dot(ctx, target.x + Math.cos(a) * rr, target.y + Math.sin(a) * rr, 1.8 + seeded(seed + 22, i) * 1.6, i % 3 === 0 ? profile.core : profile.main, (1 - hit) * .72);
    }
  }

  ctx.restore();
}

function drawHolyShield(ctx, source, target, profile, progress, seed) {
  const p = clamp01(progress);
  sourceCue(ctx, source, profile, Math.min(1, p / .20), "holy");
  const appear = easeOut(p / .25);
  const fade = 1 - clamp01((p - .72) / .28);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(target.x, target.y);
  ctx.rotate(p * .45);
  ctx.strokeStyle = profile.main;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 13;
  ctx.lineWidth = 2.7;
  ctx.globalAlpha = appear * fade * .76;

  for (let i = 0; i < 4; i += 1) {
    const start = i * Math.PI / 2 + .16;
    ctx.beginPath();
    ctx.arc(0, 0, 27 + i % 2 * 5, start, start + .92);
    ctx.stroke();
  }
  ctx.rotate(-p * .9);
  ctx.strokeStyle = profile.accent;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(15, -7);
  ctx.lineTo(11, 18);
  ctx.lineTo(0, 25);
  ctx.lineTo(-11, 18);
  ctx.lineTo(-15, -7);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawPsychicScream(ctx, source, profile, progress, seed) {
  const p = clamp01(progress);
  const wave = easeOut(p / .72);
  const fade = 1 - clamp01((p - .55) / .45);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let layer = 0; layer < 3; layer += 1) {
    const radius = source.radius + 12 + wave * (80 + layer * 16);
    ctx.globalAlpha = fade * (.52 - layer * .10);
    ctx.strokeStyle = layer === 1 ? profile.core : profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 12;
    ctx.lineWidth = 2.6 - layer * .45;
    ctx.beginPath();
    for (let i = 0; i <= 24; i += 1) {
      const a = i / 24 * TAU;
      const wobble = Math.sin(a * 5 + p * 10 + layer) * (3 + layer);
      const rr = radius + wobble;
      const x = source.x + Math.cos(a) * rr;
      const y = source.y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawLeaf(ctx, x, y, angle, size, color, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 5;
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size * .42, .2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawNatureBloom(ctx, source, target, profile, progress, seed, mode) {
  const p = clamp01(progress);
  sourceCue(ctx, source, profile, Math.min(1, p / .20), "nature");
  const fade = 1 - clamp01((p - .68) / .32);
  const count = mode === "regrowth" ? 10 : mode === "lifebloom" ? 8 : 7;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (mode === "regrowth") {
    ctx.strokeStyle = profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      const side = (i - 1.5) * 8;
      ctx.globalAlpha = fade * .48;
      ctx.beginPath();
      ctx.moveTo(target.x + side, target.y + 18);
      ctx.quadraticCurveTo(
        target.x + side + Math.sin(i + p * 5) * 12,
        target.y - p * 23,
        target.x + side * .35,
        target.y - 30 - p * 12,
      );
      ctx.stroke();
    }
  }

  for (let i = 0; i < count; i += 1) {
    const a = i / count * TAU + p * (i % 2 ? .9 : -.7);
    const rr = 7 + easeOut(p) * (18 + seeded(seed, i) * 14);
    const x = target.x + Math.cos(a) * rr;
    const y = target.y + Math.sin(a) * rr - p * (mode === "lifebloom" ? 12 : 7);
    drawLeaf(ctx, x, y, a + .4, 3.2 + seeded(seed + 20, i) * 2.4, i % 3 === 0 ? profile.core : profile.main, fade * .72);
  }

  if (mode === "lifebloom") {
    const petals = 6;
    for (let i = 0; i < petals; i += 1) {
      const a = i / petals * TAU + p * .45;
      const rr = 6 + easeOut(p) * 9;
      drawLeaf(ctx, target.x + Math.cos(a) * rr, target.y + Math.sin(a) * rr, a, 5.2, i % 2 ? profile.main : profile.core, fade * .72);
    }
  }

  ring(ctx, target.x, target.y, 8 + p * 23, profile.main, fade * .28, 1.4);
  ctx.restore();
}

function drawSwiftmend(ctx, source, target, profile, progress, seed) {
  const p = clamp01(progress);
  sourceCue(ctx, source, profile, Math.min(1, p / .15), "nature");
  const fade = 1 - clamp01((p - .55) / .45);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 10; i += 1) {
    const a = seeded(seed, i) * TAU;
    const rr = 5 + easeOut(p) * (22 + seeded(seed + 11, i) * 24);
    drawLeaf(
      ctx,
      target.x + Math.cos(a) * rr,
      target.y + Math.sin(a) * rr,
      a + p * 2,
      3 + seeded(seed + 31, i) * 2.5,
      i % 3 === 0 ? profile.core : profile.main,
      fade * .8,
    );
  }
  dot(ctx, target.x, target.y, 6 + (1 - p) * 5, profile.core, fade * .68);
  ctx.restore();
}

function drawIronbark(ctx, source, target, profile, progress, seed) {
  const p = clamp01(progress);
  sourceCue(ctx, source, profile, Math.min(1, p / .18), "nature");
  const appear = easeOut(p / .26);
  const fade = 1 - clamp01((p - .72) / .28);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.translate(target.x, target.y);
  ctx.strokeStyle = profile.accent;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 9;
  ctx.lineWidth = 4;

  for (let i = 0; i < 6; i += 1) {
    const a = i / 6 * TAU + .18 * Math.sin(i + p * 3);
    const radius = 25 + (i % 2) * 4;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    ctx.globalAlpha = appear * fade * (.62 + (i % 2) * .14);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a + Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-5, -10);
    ctx.lineTo(6, -8);
    ctx.lineTo(8, 8);
    ctx.lineTo(-6, 10);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function drawCyclone(ctx, source, target, profile, progress, seed) {
  const p = clamp01(progress);
  sourceCue(ctx, source, profile, Math.min(1, p / .22), "nature");
  const build = easeOut((p - .08) / .68);
  const fade = 1 - clamp01((p - .78) / .22);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (let layer = 0; layer < 5; layer += 1) {
    const yOff = 18 - layer * 9;
    const radius = 12 + layer * 5 + build * 10;
    const rot = p * (layer % 2 ? -8 : 9) + layer;
    ctx.globalAlpha = fade * (.28 + layer * .09);
    ctx.strokeStyle = layer % 2 ? profile.core : profile.main;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 7;
    ctx.lineWidth = 1.8 + layer * .18;
    ctx.beginPath();
    ctx.ellipse(target.x, target.y + yOff, radius, 5 + layer * 1.5, rot, 0, TAU);
    ctx.stroke();
  }

  for (let i = 0; i < 7; i += 1) {
    const a = seeded(seed, i) * TAU + p * (i % 2 ? 8 : -7);
    const rr = 13 + seeded(seed + 13, i) * 24;
    dot(ctx, target.x + Math.cos(a) * rr, target.y + Math.sin(a) * rr * .42 - p * 8, 1.2 + (i % 3) * .5, profile.core, fade * .40);
  }
  ctx.restore();
}

function drawMoonfire(ctx, source, target, profile, progress, seed) {
  const p = clamp01(progress);
  sourceCue(ctx, source, profile, Math.min(1, p / .20), "nature");

  const strike = clamp01((p - .10) / .56);
  const fade = 1 - clamp01((p - .70) / .30);
  const topY = target.y - 142;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  // A thin crescent cue above the Druid makes attribution readable before
  // the actual lunar strike appears over the enemy.
  if (source && p < .32) {
    ctx.globalAlpha = (1 - p / .32) * .62;
    ctx.strokeStyle = profile.core;
    ctx.shadowColor = profile.main;
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(source.x, source.y - source.radius - 13, 9, -.9, 1.2);
    ctx.stroke();
  }

  const headY = topY + easeOut(strike) * 138;
  const gradient = ctx.createLinearGradient(target.x, topY, target.x, target.y + 9);
  gradient.addColorStop(0, "rgba(230,239,255,0)");
  gradient.addColorStop(.42, profile.core);
  gradient.addColorStop(1, profile.main);
  ctx.globalAlpha = fade * .28;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(target.x - 13, topY);
  ctx.lineTo(target.x + 13, topY);
  ctx.lineTo(target.x + 20, headY);
  ctx.lineTo(target.x - 20, headY);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = fade * .78;
  ctx.strokeStyle = profile.core;
  ctx.shadowColor = profile.main;
  ctx.shadowBlur = 19;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(target.x, topY);
  ctx.lineTo(target.x, headY);
  ctx.stroke();

  if (strike > .62) {
    const hit = (strike - .62) / .38;
    ring(ctx, target.x, target.y, 9 + easeOut(hit) * 38, profile.main, (1 - hit) * .70, 2);
    for (let i = 0; i < 6; i += 1) {
      const a = i / 6 * TAU + seeded(seed, i) * .2;
      const rr = 10 + hit * (18 + seeded(seed + 8, i) * 18);
      dot(ctx, target.x + Math.cos(a) * rr, target.y + Math.sin(a) * rr, 1.7, profile.core, (1 - hit) * .6);
    }
  }

  ctx.restore();
}

export function drawPriestDruidCastVfx(ctx, actor, spell, progress, nowMs = performance.now()) {
  if (!spell || !usesPriestDruidVfx2(spell.id)) return false;
  const profile = PROFILE[spell.id];
  if (!profile) return false;

  const p = clamp01(progress);
  const pulse = .5 + .5 * Math.sin(nowMs * .014);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  if (profile.family === "priest") {
    const shadow = profile.kind === "mind-implosion" || profile.kind === "shadow-wave";
    const count = shadow ? 5 : 7;
    for (let i = 0; i < count; i += 1) {
      const a = i / count * TAU + nowMs * .0012 * (i % 2 ? 1 : -1);
      const rr = actor.radius + 28 - p * 14 + (i % 2) * 5;
      dot(ctx, actor.x + Math.cos(a) * rr, actor.y + Math.sin(a) * rr, 1.5 + p * 1.1, i % 3 === 0 ? profile.core : profile.main, .24 + p * .48);
    }
    ring(ctx, actor.x, actor.y, actor.radius + 10 + p * 8 + pulse * 2, profile.main, .28 + p * .36, 1.8);
  } else {
    for (let i = 0; i < 8; i += 1) {
      const a = seeded(actor.x + actor.y, i) * TAU + nowMs * .001 * (i % 2 ? 1 : -1);
      const rr = actor.radius + 34 - p * 18 + (i % 3) * 4;
      drawLeaf(ctx, actor.x + Math.cos(a) * rr, actor.y + Math.sin(a) * rr, a + p, 2.8 + (i % 3) * .6, i % 3 === 0 ? profile.core : profile.main, .24 + p * .48);
    }
  }

  if (p > .74) dot(ctx, actor.x, actor.y, 4 + (p - .74) * 15, profile.core, (p - .74) * 1.7);
  ctx.restore();
  return true;
}

export function drawPriestDruidSpellVfx(ctx, effect, game, progress, alpha) {
  const id = effect?.spellId || "";
  if (!usesPriestDruidVfx2(id)) return false;
  const profile = PROFILE[id];
  if (!profile) return false;

  const source = game.getActor(effect.sourceId);
  const target = game.getActor(effect.targetId);
  const to = target || { x: effect.targetX ?? effect.sourceX ?? 0, y: effect.targetY ?? effect.sourceY ?? 0 };
  const p = clamp01(progress);
  const seed = effect.seed || effect.id || 1;

  ctx.save();
  ctx.globalAlpha *= Math.min(1, alpha * 1.35);

  switch (profile.kind) {
    case "holy-hot":
      sourceCue(ctx, source, profile, Math.min(1, p / .18), "holy");
      drawHolyHot(ctx, to, profile, p, seed);
      break;
    case "holy-flash":
      sourceCue(ctx, source, profile, Math.min(1, p / .17), "holy");
      holyColumn(ctx, to, profile, p, seed, false);
      break;
    case "holy-greater":
      sourceCue(ctx, source, profile, Math.min(1, p / .22), "holy");
      holyColumn(ctx, to, profile, p, seed, true);
      break;
    case "holy-shield":
      drawHolyShield(ctx, source, to, profile, p, seed);
      break;
    case "shadow-wave":
      drawPsychicScream(ctx, source || to, profile, p, seed);
      break;
    case "mind-implosion":
      drawMindImplosion(ctx, source, to, profile, p, seed);
      break;
    case "holy-sky":
      drawHolySky(ctx, source, to, profile, p, seed);
      break;

    case "leaf-hot":
      drawNatureBloom(ctx, source, to, profile, p, seed, "hot");
      break;
    case "leaf-burst":
      drawSwiftmend(ctx, source, to, profile, p, seed);
      break;
    case "regrowth":
      drawNatureBloom(ctx, source, to, profile, p, seed, "regrowth");
      break;
    case "bark-shield":
      drawIronbark(ctx, source, to, profile, p, seed);
      break;
    case "cyclone":
      drawCyclone(ctx, source, to, profile, p, seed);
      break;
    case "lifebloom":
      drawNatureBloom(ctx, source, to, profile, p, seed, "lifebloom");
      break;
    case "moon-sky":
      drawMoonfire(ctx, source, to, profile, p, seed);
      break;
    default:
      break;
  }

  ctx.restore();
  return true;
}
