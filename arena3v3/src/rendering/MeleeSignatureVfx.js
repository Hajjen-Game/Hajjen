const ROGUE_SIGNATURES = Object.freeze({
  "rogue-garrote": Object.freeze({
    shape: "dagger",
    length: 42,
    width: 5.2,
    trail: .42,
    main: 0xb8ad61,
    core: 0xf2e5aa,
    accent: 0x69567a,
    weapons: Object.freeze([
      Object.freeze({ mode: "sweep", start: -.92, end: .18, delay: 0, span: .42, sideOffset: -2 }),
    ]),
  }),
  "rogue-sinister": Object.freeze({
    shape: "dagger",
    length: 43,
    width: 5.4,
    trail: .34,
    main: 0xc2b867,
    core: 0xf4e8af,
    accent: 0x665578,
    weapons: Object.freeze([
      Object.freeze({ mode: "thrust", angle: .06, delay: 0, span: .34, sideOffset: -3.5 }),
    ]),
  }),
  "rogue-eviscerate": Object.freeze({
    shape: "dagger",
    length: 45,
    width: 5.6,
    trail: .44,
    main: 0xc8bb63,
    core: 0xffedaf,
    accent: 0x745987,
    weapons: Object.freeze([
      Object.freeze({ mode: "sweep", start: -.96, end: .12, delay: 0, span: .38, sideOffset: -5 }),
      Object.freeze({ mode: "sweep", start: .88, end: -.16, delay: .075, span: .38, sideOffset: 5 }),
    ]),
  }),
  "rogue-mutilate": Object.freeze({
    shape: "dagger",
    length: 46,
    width: 5.8,
    trail: .32,
    main: 0xbdb263,
    core: 0xffe9a8,
    accent: 0x715982,
    poison: 0x79d36f,
    weapons: Object.freeze([
      Object.freeze({ mode: "thrust", angle: -.12, delay: 0, span: .34, sideOffset: -7 }),
      Object.freeze({ mode: "thrust", angle: .12, delay: .045, span: .34, sideOffset: 7 }),
    ]),
  }),
});

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function easeOut(value) {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
}

function smooth(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function cssColor(value) {
  return "#" + Number(value || 0).toString(16).padStart(6, "0");
}

function localPoint(cx, cy, x, y, angle) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return {
    x: cx + x * ca - y * sa,
    y: cy + x * sa + y * ca,
  };
}

function drawDagger(ctx, source, offsetX, offsetY, angle, length, spec, alpha) {
  if (!source || alpha <= 0) return;

  const cx = source.x + offsetX;
  const cy = source.y + offsetY;
  const root = source.radius + 2;
  const width = spec.width;
  const guardX = root + 1;
  const shoulder = Math.max(guardX + 5, length - 9);
  const tip = length + 6;
  const main = cssColor(spec.main);
  const core = cssColor(spec.core);
  const accent = cssColor(spec.accent);
  const steel = "#b8bfbd";
  const steelDark = "#707a79";
  const handle = "#342b3a";
  const handleLight = "#62536a";

  // Broad at the guard, quickly tapering into a short spear point.
  // This intentionally exaggerates the silhouette for top-down readability.
  const blade = [
    localPoint(cx, cy, guardX, -width, angle),
    localPoint(cx, cy, shoulder, -width * .68, angle),
    localPoint(cx, cy, tip, 0, angle),
    localPoint(cx, cy, shoulder, width * .68, angle),
    localPoint(cx, cy, guardX, width, angle),
  ];

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Keep the glow outside the weapon instead of turning the whole blade neon.
  ctx.shadowColor = main;
  ctx.shadowBlur = 9;
  ctx.fillStyle = main;
  ctx.globalAlpha = alpha * .075;
  ctx.beginPath();
  ctx.moveTo(blade[0].x, blade[0].y);
  for (let i = 1; i < blade.length; i += 1) ctx.lineTo(blade[i].x, blade[i].y);
  ctx.closePath();
  ctx.fill();

  ctx.shadowBlur = 2;
  ctx.fillStyle = steel;
  ctx.globalAlpha = alpha * .96;
  ctx.fill();

  ctx.strokeStyle = core;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = alpha * .94;
  ctx.stroke();

  // Dark, chunky grip with a lighter center and a visible pommel.
  const handleA = localPoint(cx, cy, root - 10, 0, angle);
  const handleB = localPoint(cx, cy, guardX + 1, 0, angle);
  ctx.strokeStyle = handle;
  ctx.lineWidth = 5.6;
  ctx.globalAlpha = alpha * .96;
  ctx.beginPath();
  ctx.moveTo(handleA.x, handleA.y);
  ctx.lineTo(handleB.x, handleB.y);
  ctx.stroke();

  ctx.strokeStyle = handleLight;
  ctx.lineWidth = 1.35;
  ctx.globalAlpha = alpha * .72;
  ctx.stroke();

  const pommel = localPoint(cx, cy, root - 11, 0, angle);
  ctx.fillStyle = steelDark;
  ctx.globalAlpha = alpha * .96;
  ctx.beginPath();
  ctx.arc(pommel.x, pommel.y, 2.9, 0, Math.PI * 2);
  ctx.fill();

  // Oversized guard is deliberate: at arena zoom it makes the weapon read as
  // a dagger instead of another bright melee streak.
  const guardA = localPoint(cx, cy, guardX, -width * 2.05, angle);
  const guardB = localPoint(cx, cy, guardX, width * 2.05, angle);
  ctx.strokeStyle = steelDark;
  ctx.lineWidth = 3.3;
  ctx.globalAlpha = alpha * .96;
  ctx.beginPath();
  ctx.moveTo(guardA.x, guardA.y);
  ctx.lineTo(guardB.x, guardB.y);
  ctx.stroke();

  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.25;
  ctx.globalAlpha = alpha * .82;
  ctx.stroke();

  const ridgeA = localPoint(cx, cy, guardX + 3, 0, angle);
  const ridgeB = localPoint(cx, cy, length - 4, 0, angle);
  ctx.strokeStyle = spec.poison ? cssColor(spec.poison) : core;
  ctx.lineWidth = spec.poison ? 1.55 : 1.05;
  ctx.globalAlpha = alpha * (spec.poison ? .88 : .72);
  ctx.beginPath();
  ctx.moveTo(ridgeA.x, ridgeA.y);
  ctx.lineTo(ridgeB.x, ridgeB.y);
  ctx.stroke();

  ctx.restore();
}

export function meleeSignatureSpecFor(spellId) {
  return ROGUE_SIGNATURES[spellId] || null;
}

export function hasMeleeSignatureVfx(spellId) {
  return Boolean(meleeSignatureSpecFor(spellId));
}

export function drawCanvasMeleeSignatureVfx(ctx, effect, game, progress, alpha) {
  const spec = meleeSignatureSpecFor(effect?.spellId);
  if (!spec) return false;

  const source = game?.getActor?.(effect.sourceId);
  const target = game?.getActor?.(effect.targetId);
  if (!source || !target) return false;

  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const facing = Math.atan2(dy, dx);
  const nx = -dy / distance;
  const ny = dx / distance;
  const p = clamp01(progress);
  const baseAlpha = clamp01(alpha);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (const weapon of spec.weapons) {
    const local = clamp01(
      (p - (weapon.delay || 0)) / Math.max(.01, weapon.span || .42)
    );
    if (local <= 0) continue;

    const motion = smooth(local);
    const appear = easeOut(local / .14);
    const out = 1 - smooth((local - .80) / .20);
    const weaponAlpha = baseAlpha * appear * out;
    const side = Number(weapon.sideOffset || 0);
    const ox = nx * side;
    const oy = ny * side;
    let angle;
    let length = spec.length;

    if (weapon.mode === "thrust") {
      angle = facing + Number(weapon.angle || 0);
      length *= .56 + easeOut(local) * .44;

      const root = source.radius + 3;
      const a = localPoint(source.x + ox, source.y + oy, root, 0, angle);
      const b = localPoint(source.x + ox, source.y + oy, length * .82, 0, angle);
      ctx.strokeStyle = cssColor(spec.main);
      ctx.shadowColor = cssColor(spec.main);
      ctx.shadowBlur = 7;
      ctx.lineWidth = 5;
      ctx.globalAlpha = weaponAlpha * .09;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    } else {
      const start = facing + weapon.start;
      angle = start + (weapon.end - weapon.start) * motion;
      const radius = Math.max(
        source.radius + 24,
        Math.min(spec.length * .72, distance * .78 + 14)
      );

      ctx.strokeStyle = cssColor(spec.main);
      ctx.shadowColor = cssColor(spec.main);
      ctx.shadowBlur = 8;
      ctx.lineWidth = 7 * spec.trail;
      ctx.globalAlpha = weaponAlpha * .12;
      ctx.beginPath();
      ctx.arc(
        source.x + ox,
        source.y + oy,
        radius,
        start,
        angle,
        angle < start
      );
      ctx.stroke();

      ctx.strokeStyle = cssColor(spec.core);
      ctx.shadowBlur = 2;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = weaponAlpha * .56;
      ctx.beginPath();
      ctx.arc(
        source.x + ox,
        source.y + oy,
        radius - 2,
        start,
        angle,
        angle < start
      );
      ctx.stroke();
    }

    drawDagger(ctx, source, ox, oy, angle, length, spec, weaponAlpha);
  }

  ctx.restore();
  return true;
}
