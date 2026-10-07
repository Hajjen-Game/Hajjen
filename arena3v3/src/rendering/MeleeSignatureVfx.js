const SPECS = Object.freeze({
  "warrior-rend": Object.freeze({
    family: "warrior",
    shape: "greatsword",
    length: 72,
    width: 6.2,
    main: 0xd04f45,
    core: 0xffd5bd,
    accent: 0x7a2830,
    trail: 1.00,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-1.12, end:.46, delay:.00, span:.58 }),
    ]),
  }),
  "warrior-slam": Object.freeze({
    family: "warrior",
    shape: "greatsword",
    length: 86,
    width: 8.0,
    main: 0xc99863,
    core: 0xfff0d4,
    accent: 0x756356,
    trail: 1.14,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-1.50, end:.06, delay:.00, span:.66 }),
    ]),
  }),
  "warrior-overpower": Object.freeze({
    family: "warrior",
    shape: "greatsword",
    length: 73,
    width: 5.5,
    main: 0xe0a465,
    core: 0xfff4d8,
    accent: 0x9a633d,
    trail: .92,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:.92, end:-.55, delay:.00, span:.54 }),
    ]),
  }),
  "warrior-bloodthirst": Object.freeze({
    family: "warrior",
    shape: "cleaver",
    length: 66,
    width: 6.0,
    main: 0xd64b45,
    core: 0xffc8b4,
    accent: 0x721f25,
    trail: .94,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-1.02, end:.34, delay:.00, span:.48, sideOffset:-3 }),
      Object.freeze({ mode:"swing", start:.92, end:-.30, delay:.10, span:.48, sideOffset:3 }),
    ]),
  }),

  "rogue-garrote": Object.freeze({
    family: "rogue",
    shape: "dagger",
    length: 45,
    width: 3.0,
    main: 0xc65d58,
    core: 0xffddd0,
    accent: 0x5d384f,
    trail: .72,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-.68, end:.18, delay:.00, span:.44, sideOffset:-4 }),
      Object.freeze({ mode:"swing", start:.58, end:-.12, delay:.07, span:.42, sideOffset:4 }),
    ]),
  }),
  "rogue-sinister": Object.freeze({
    family: "rogue",
    shape: "dagger",
    length: 52,
    width: 3.2,
    main: 0xd2c36f,
    core: 0xfff5c7,
    accent: 0x5d4b71,
    trail: .82,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-.86, end:.32, delay:.00, span:.48 }),
    ]),
  }),
  "rogue-eviscerate": Object.freeze({
    family: "rogue",
    shape: "dagger",
    length: 62,
    width: 3.7,
    main: 0xe1ca63,
    core: 0xfff8cf,
    accent: 0x65497a,
    trail: 1.00,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-1.08, end:.48, delay:.00, span:.54, sideOffset:-4 }),
      Object.freeze({ mode:"swing", start:1.08, end:-.48, delay:.08, span:.54, sideOffset:4 }),
    ]),
  }),
  "rogue-mutilate": Object.freeze({
    family: "rogue",
    shape: "dagger",
    length: 53,
    width: 3.5,
    main: 0xd2be67,
    core: 0xfff4c4,
    accent: 0x76518b,
    trail: .88,
    weapons: Object.freeze([
      Object.freeze({ mode:"thrust", angle:-.24, delay:.00, span:.50, sideOffset:-7 }),
      Object.freeze({ mode:"thrust", angle:.24, delay:.05, span:.50, sideOffset:7 }),
    ]),
  }),

  "dk-death-strike": Object.freeze({
    family: "dk",
    shape: "runeblade",
    length: 80,
    width: 7.1,
    main: 0xe05b67,
    core: 0xffdce0,
    accent: 0x6e2030,
    trail: 1.10,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-1.26, end:.56, delay:.00, span:.62 }),
    ]),
  }),
  "dk-obliterate": Object.freeze({
    family: "dk",
    shape: "runeblade",
    length: 89,
    width: 7.8,
    main: 0x55e2ff,
    core: 0xffffff,
    accent: 0x5877c9,
    trail: 1.18,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-1.08, end:.52, delay:.00, span:.60, sideOffset:-4 }),
      Object.freeze({ mode:"swing", start:1.08, end:-.52, delay:.09, span:.60, sideOffset:4 }),
    ]),
  }),
  "dk-frost-strike": Object.freeze({
    family: "dk",
    shape: "runeblade",
    length: 80,
    width: 6.4,
    main: 0x58e0ff,
    core: 0xffffff,
    accent: 0x5579c9,
    trail: 1.00,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-1.10, end:.42, delay:.00, span:.56 }),
    ]),
  }),

  "shaman-stormstrike": Object.freeze({
    family: "shaman",
    shape: "stormblade",
    length: 72,
    width: 6.0,
    main: 0x65dff3,
    core: 0xf7ffff,
    accent: 0x537bd0,
    trail: 1.02,
    weapons: Object.freeze([
      Object.freeze({ mode:"swing", start:-.96, end:.40, delay:.00, span:.52, sideOffset:-4 }),
      Object.freeze({ mode:"swing", start:.96, end:-.40, delay:.07, span:.52, sideOffset:4 }),
    ]),
  }),
});

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const smooth = value => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const easeOut = value => {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
};

function cssColor(value) {
  return "#" + Number(value || 0xffffff).toString(16).padStart(6, "0");
}

function rotatedPoint(cx, cy, x, y, angle) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  return {
    x: cx + x * ca - y * sa,
    y: cy + x * sa + y * ca,
  };
}

function bladePoints(cx, cy, angle, root, length, width, shape) {
  const tipWidth = shape === "dagger" ? width * .20 : width * .12;
  const shoulder = shape === "cleaver" ? length * .68 : length - Math.max(9, width * 1.7);
  const half = width;
  const shoulderHalf =
    shape === "cleaver"
      ? width * 1.28
      : shape === "runeblade"
        ? width * 1.06
        : width * .74;

  return [
    rotatedPoint(cx,cy,root,-half,angle),
    rotatedPoint(cx,cy,shoulder,-shoulderHalf,angle),
    rotatedPoint(cx,cy,length,-tipWidth,angle),
    rotatedPoint(cx,cy,length+Math.max(5,width*.8),0,angle),
    rotatedPoint(cx,cy,length,tipWidth,angle),
    rotatedPoint(cx,cy,shoulder,shoulderHalf,angle),
    rotatedPoint(cx,cy,root,half,angle),
  ];
}

function strokeArc(ctx,cx,cy,radius,start,end,color,width,alpha) {
  if (alpha <= 0) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(cx,cy,radius,start,end,end<start);
  ctx.stroke();
}

export function meleeSignatureSpecFor(spellId) {
  return SPECS[spellId] || null;
}

export function hasMeleeSignatureVfx(spellId) {
  return Boolean(SPECS[spellId]);
}

export function drawCanvasMeleeSignatureVfx(ctx, effect, game, progress, alpha = 1) {
  const spec = meleeSignatureSpecFor(effect?.spellId);
  if (!spec) return false;

  const source = game?.getActor?.(effect.sourceId);
  const target = game?.getActor?.(effect.targetId);
  if (!source || !target) return false;

  const p = clamp01(progress);
  const opacity = clamp01(alpha);
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const facing = Math.atan2(dy,dx);
  const main = cssColor(spec.main);
  const core = cssColor(spec.core);
  const accent = cssColor(spec.accent);
  const root = source.radius + (spec.shape === "dagger" ? 2 : 4);

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < spec.weapons.length; i += 1) {
    const weapon = spec.weapons[i];
    const local = clamp01((p - (weapon.delay || 0)) / Math.max(.01, weapon.span || .52));
    if (local <= 0) continue;

    const motion = smooth(local);
    const appear = easeOut(local / .14);
    const fade = 1 - smooth((local - .80) / .20);
    const weaponAlpha = opacity * appear * fade;
    const side = Number(weapon.sideOffset || 0);
    const nx = -Math.sin(facing);
    const ny = Math.cos(facing);
    const ox = source.x + nx * side;
    const oy = source.y + ny * side;

    let angle;
    let length = spec.length;

    if (weapon.mode === "thrust") {
      angle = facing + Number(weapon.angle || 0);
      const reach = .52 + easeOut(local) * .48;
      length *= reach;

      const trailA = rotatedPoint(ox,oy,root,0,angle);
      const trailB = rotatedPoint(ox,oy,length*.78,0,angle);
      ctx.shadowColor = main;
      ctx.shadowBlur = 12;
      ctx.strokeStyle = main;
      ctx.lineWidth = spec.width * 2.4;
      ctx.globalAlpha = weaponAlpha * .10;
      ctx.beginPath();
      ctx.moveTo(trailA.x,trailA.y);
      ctx.lineTo(trailB.x,trailB.y);
      ctx.stroke();
    } else {
      const start = facing + weapon.start;
      angle = facing + weapon.start + (weapon.end - weapon.start) * motion;
      const radius = Math.max(source.radius + 26, Math.min(spec.length * .76, Math.hypot(dx,dy) * .80 + 17));

      ctx.shadowColor = main;
      ctx.shadowBlur = 14;
      strokeArc(
        ctx,ox,oy,radius,start,angle,
        main,
        Math.max(10,spec.width*2.45*spec.trail),
        weaponAlpha*.10,
      );
      ctx.shadowBlur = 5;
      strokeArc(
        ctx,ox,oy,radius,start,angle,
        main,
        Math.max(3,spec.width*.72*spec.trail),
        weaponAlpha*.60,
      );
      strokeArc(
        ctx,ox,oy,radius-2,Math.max(Math.min(start,angle),angle-1.02),angle,
        core,
        Math.max(1.5,spec.width*.30),
        weaponAlpha*.88,
      );
    }

    const blade = bladePoints(ox,oy,angle,root,length,spec.width,spec.shape);

    // One translucent afterimage gives movement without turning the weapon into
    // a flat smear.
    if (weapon.mode !== "thrust") {
      const echoAngle =
        facing + weapon.start + (weapon.end - weapon.start) * smooth(Math.max(0, local-.09));
      const echo = bladePoints(ox,oy,echoAngle,root,length*.98,spec.width*.88,spec.shape);
      ctx.shadowColor = main;
      ctx.shadowBlur = 15;
      ctx.fillStyle = main;
      ctx.globalAlpha = weaponAlpha * .075;
      ctx.beginPath();
      ctx.moveTo(echo[0].x,echo[0].y);
      for(let j=1;j<echo.length;j++) ctx.lineTo(echo[j].x,echo[j].y);
      ctx.closePath();
      ctx.fill();
    }

    ctx.shadowColor = main;
    ctx.shadowBlur = spec.shape === "dagger" ? 10 : 17;
    ctx.fillStyle = main;
    ctx.globalAlpha = weaponAlpha * .44;
    ctx.beginPath();
    ctx.moveTo(blade[0].x,blade[0].y);
    for(let j=1;j<blade.length;j++) ctx.lineTo(blade[j].x,blade[j].y);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 4;
    ctx.strokeStyle = core;
    ctx.lineWidth = spec.shape === "dagger" ? 1.7 : 2.2;
    ctx.globalAlpha = Math.min(1,weaponAlpha*1.05);
    ctx.stroke();

    const ridgeA = rotatedPoint(ox,oy,root+4,0,angle);
    const ridgeB = rotatedPoint(ox,oy,Math.max(root+8,length-7),0,angle);
    ctx.strokeStyle = core;
    ctx.lineWidth = spec.shape === "dagger" ? 1.1 : 1.5;
    ctx.globalAlpha = Math.min(1,weaponAlpha*.96);
    ctx.beginPath();
    ctx.moveTo(ridgeA.x,ridgeA.y);
    ctx.lineTo(ridgeB.x,ridgeB.y);
    ctx.stroke();

    const guardA = rotatedPoint(ox,oy,root-1,-spec.width*1.35,angle);
    const guardB = rotatedPoint(ox,oy,root-1,spec.width*1.35,angle);
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1.6,spec.width*.38);
    ctx.globalAlpha = weaponAlpha*.78;
    ctx.beginPath();
    ctx.moveTo(guardA.x,guardA.y);
    ctx.lineTo(guardB.x,guardB.y);
    ctx.stroke();

    // Tiny contact glint only. Existing spell-specific impact VFX remains the
    // main hit payoff, preventing duplicate ring/spark clutter.
    let contactT = .78;
    if (weapon.mode !== "thrust" && Math.abs(weapon.end-weapon.start) > .001) {
      contactT = clamp01((0-weapon.start)/(weapon.end-weapon.start));
    }
    const contact = Math.exp(-Math.pow((motion-contactT)/.105,2));
    if (contact > .03) {
      ctx.fillStyle = core;
      ctx.shadowColor = main;
      ctx.shadowBlur = 12;
      ctx.globalAlpha = opacity*contact*.48;
      ctx.beginPath();
      ctx.arc(target.x,target.y,3+contact*5,0,Math.PI*2);
      ctx.fill();
    }
  }

  ctx.restore();
  return true;
}
