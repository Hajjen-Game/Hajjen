const CLASS_ICON_PALETTES = Object.freeze({
  priest: { primary: "#FFF1C4", secondary: "#D7AA55", accent: "#FFFFFF" },
  druid: { primary: "#A7C94B", secondary: "#D8A94B", accent: "#DCEB8A" },
  paladin: { primary: "#F3B6CE", secondary: "#E6B55E", accent: "#FFF0C8" },
  warrior: { primary: "#E4DED0", secondary: "#9B302D", accent: "#C69B6D" },
  rogue: { primary: "#FFF08A", secondary: "#D7A633", accent: "#FFF8C9" },
  "death-knight": { primary: "#9FD8FF", secondary: "#B52A3D", accent: "#DDF1FF" },
  mage: { primary: "#65CEFF", secondary: "#8A72DD", accent: "#CDEEFF" },
  warlock: { primary: "#A679DD", secondary: "#9BD65A", accent: "#DCC2FF" },
  shaman: { primary: "#4AB7F1", secondary: "#D8B05D", accent: "#8DEBFF" },
});

function circle(ctx, x, y, radius, fill = null, stroke = null, width = 1) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
}

function drawPriest(ctx, p) {
  ctx.strokeStyle = p.primary;
  ctx.fillStyle = p.primary;
  ctx.lineWidth = 2.1;

  circle(ctx, 0, -1, 4.4, null, p.secondary, 1.7);

  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(0, 10);
  ctx.moveTo(-7.5, -1);
  ctx.lineTo(7.5, -1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-4, 3);
  ctx.quadraticCurveTo(-9, 4, -11, 8);
  ctx.quadraticCurveTo(-5, 8, -2, 6);
  ctx.moveTo(4, 3);
  ctx.quadraticCurveTo(9, 4, 11, 8);
  ctx.quadraticCurveTo(5, 8, 2, 6);
  ctx.stroke();

  ctx.fillStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(1.8, -9.3);
  ctx.lineTo(5.2, -8);
  ctx.lineTo(1.8, -6.7);
  ctx.lineTo(0, -3);
  ctx.lineTo(-1.8, -6.7);
  ctx.lineTo(-5.2, -8);
  ctx.lineTo(-1.8, -9.3);
  ctx.closePath();
  ctx.fill();
}

function drawDruid(ctx, p) {
  ctx.strokeStyle = p.secondary;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(2, 10);
  ctx.bezierCurveTo(-7, 8, -8, -3, -1, -6);
  ctx.bezierCurveTo(6, -9, 10, -2, 6, 2);
  ctx.bezierCurveTo(2, 6, -3, 3, -1, 0);
  ctx.stroke();

  ctx.fillStyle = p.primary;
  const leaves = [
    [-7, -5, -0.8],
    [-2, -10, -0.15],
    [5, -8, 0.4],
    [9, -3, 0.9],
  ];
  for (const [x, y, rotation] of leaves) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.quadraticCurveTo(0, -4, 5, 0);
    ctx.quadraticCurveTo(0, 4, -4, 0);
    ctx.fill();
    ctx.restore();
  }
}

function drawPaladin(ctx, p) {
  ctx.fillStyle = "rgba(91,35,45,.66)";
  ctx.strokeStyle = p.secondary;
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.lineTo(10, -7);
  ctx.lineTo(8, 5);
  ctx.quadraticCurveTo(5, 10, 0, 13);
  ctx.quadraticCurveTo(-5, 10, -8, 5);
  ctx.lineTo(-10, -7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = p.accent;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(0, 8);
  ctx.moveTo(-6, -1);
  ctx.lineTo(6, -1);
  ctx.stroke();

  circle(ctx, 0, -1, 3.7, null, p.primary, 1.4);
}

function drawWarrior(ctx, p) {
  ctx.strokeStyle = p.secondary;
  ctx.lineWidth = 2.3;
  ctx.save();
  ctx.rotate(-0.72);
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(0, 10);
  ctx.moveTo(-3.5, 6);
  ctx.lineTo(3.5, 6);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(0.72);
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(0, 10);
  ctx.moveTo(-3.5, 6);
  ctx.lineTo(3.5, 6);
  ctx.stroke();
  ctx.restore();

  ctx.fillStyle = p.primary;
  ctx.strokeStyle = "#6E6253";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-7, -7);
  ctx.lineTo(0, -11);
  ctx.lineTo(7, -7);
  ctx.lineTo(6, 7);
  ctx.lineTo(2, 11);
  ctx.lineTo(0, 5);
  ctx.lineTo(-2, 11);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#201511";
  ctx.beginPath();
  ctx.moveTo(-5, -1);
  ctx.lineTo(-1, 0);
  ctx.lineTo(-5, 2);
  ctx.closePath();
  ctx.moveTo(5, -1);
  ctx.lineTo(1, 0);
  ctx.lineTo(5, 2);
  ctx.closePath();
  ctx.fill();
}

function drawRogue(ctx, p) {
  ctx.strokeStyle = p.primary;
  ctx.fillStyle = "rgba(15,11,8,.78)";
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(-9, -8, -9, 2);
  ctx.quadraticCurveTo(-6, 8, 0, 11);
  ctx.quadraticCurveTo(6, 8, 9, 2);
  ctx.quadraticCurveTo(9, -8, 0, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = p.secondary;
  ctx.lineWidth = 2.1;
  ctx.save();
  ctx.rotate(-0.62);
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(5, 0);
  ctx.moveTo(3, -2.5);
  ctx.lineTo(8, 0);
  ctx.lineTo(3, 2.5);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(0.62);
  ctx.beginPath();
  ctx.moveTo(-5, 0);
  ctx.lineTo(5, 0);
  ctx.moveTo(3, -2.5);
  ctx.lineTo(8, 0);
  ctx.lineTo(3, 2.5);
  ctx.stroke();
  ctx.restore();
}

function drawDeathKnight(ctx, p) {
  ctx.strokeStyle = p.primary;
  ctx.fillStyle = p.primary;
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.moveTo(0, -13);
  ctx.lineTo(3.2, -7);
  ctx.lineTo(2, 8);
  ctx.lineTo(0, 13);
  ctx.lineTo(-2, 8);
  ctx.lineTo(-3.2, -7);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = p.secondary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-1, -5);
  ctx.quadraticCurveTo(-9, -10, -12, -4);
  ctx.quadraticCurveTo(-7, -2, -5, 4);
  ctx.moveTo(1, -5);
  ctx.quadraticCurveTo(9, -10, 12, -4);
  ctx.quadraticCurveTo(7, -2, 5, 4);
  ctx.stroke();

  ctx.strokeStyle = p.accent;
  ctx.beginPath();
  ctx.moveTo(-6, 7);
  ctx.lineTo(0, 3);
  ctx.lineTo(6, 7);
  ctx.stroke();
}

function drawMage(ctx, p) {
  ctx.strokeStyle = p.primary;
  ctx.fillStyle = p.secondary;
  ctx.lineWidth = 2;

  ctx.beginPath();
  const points = 8;
  for (let i = 0; i < points * 2; i += 1) {
    const angle = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? 12 : 4.3;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  circle(ctx, 0, 0, 4.6, p.secondary, p.accent, 1.4);

  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(0, 0, 10, -0.25, 1.7);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawWarlock(ctx, p) {
  ctx.strokeStyle = p.primary;
  ctx.lineWidth = 2.2;

  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.quadraticCurveTo(-12, 0, -7, 6);
  ctx.moveTo(9, -8);
  ctx.quadraticCurveTo(12, 0, 7, 6);
  ctx.stroke();

  ctx.fillStyle = p.secondary;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.bezierCurveTo(8, -3, 8, 5, 1, 11);
  ctx.bezierCurveTo(-6, 7, -7, 0, -2, -4);
  ctx.bezierCurveTo(-1, 1, 3, 3, 5, 0);
  ctx.bezierCurveTo(4, -5, 1, -6, 0, -11);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = p.primary;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, 2, 4.2, 0.1, Math.PI * 1.85);
  ctx.stroke();
}

function drawShaman(ctx, p) {
  ctx.strokeStyle = p.primary;
  ctx.lineWidth = 2.3;

  ctx.beginPath();
  ctx.moveTo(-2, -12);
  ctx.lineTo(4, -5);
  ctx.lineTo(0, -5);
  ctx.lineTo(5, 1);
  ctx.lineTo(1, 1);
  ctx.lineTo(5, 7);
  ctx.stroke();

  ctx.strokeStyle = p.secondary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -1);
  ctx.lineTo(-6, -4);
  ctx.lineTo(-4, 0);
  ctx.lineTo(-9, 4);
  ctx.closePath();
  ctx.moveTo(12, -1);
  ctx.lineTo(6, -4);
  ctx.lineTo(4, 0);
  ctx.lineTo(9, 4);
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = p.accent;
  ctx.beginPath();
  ctx.arc(0, 3, 6, -0.4, Math.PI * 1.75);
  ctx.stroke();
  circle(ctx, 0, 3, 2.2, p.primary);
}

const DRAWERS = Object.freeze({
  priest: drawPriest,
  druid: drawDruid,
  paladin: drawPaladin,
  warrior: drawWarrior,
  rogue: drawRogue,
  "death-knight": drawDeathKnight,
  mage: drawMage,
  warlock: drawWarlock,
  shaman: drawShaman,
});

export function drawClassGlyph(ctx, actor) {
  const draw = DRAWERS[actor?.classId];
  const palette = CLASS_ICON_PALETTES[actor?.classId];
  if (!draw || !palette) return false;

  ctx.save();
  ctx.translate(actor.x, actor.y);

  const scale = Math.max(0.82, Math.min(1.15, actor.radius / 20));
  ctx.scale(scale, scale);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  circle(ctx, 0, 0, 14.2, "rgba(16,11,9,.72)", palette.secondary, 1.35);

  ctx.shadowColor = "rgba(0,0,0,.22)";
  ctx.shadowBlur = 2;
  draw(ctx, palette);

  ctx.restore();
  return true;
}
