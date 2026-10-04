import { GAME_HEIGHT, GAME_WIDTH } from "../core/constants.js";
import { classColorFor } from "../content/classes/classColors.js";
import { classIconUrlFor } from "./ClassIconRegistry.js";
import { castBarPaletteFor } from "./CastPalette.js?v=20260928-focusrestyle1";
import { TALENT_TREE_REGISTRY } from "../content/talents/registry.js?v=20260928-healinghp1";
import { drawGrandRingEnvironment } from "./GrandRingEnvironment.js?v=20261001-grandring7";
import { drawWindscarEnvironment } from "./WindscarEnvironment.js?v=20261001-windscar2";

const PIXI_MODULE_URL = "https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
const CLASS_IDS = Object.freeze([
  "priest",
  "druid",
  "paladin",
  "warrior",
  "rogue",
  "death-knight",
  "mage",
  "warlock",
  "shaman",
]);

function hexNumber(cssColor, fallback = 0xffffff) {
  if (typeof cssColor !== "string") return fallback;
  const match = cssColor.trim().match(/^#([0-9a-f]{6})$/i);
  return match ? Number.parseInt(match[1], 16) : fallback;
}


function drawLivingBodyShape(
  graphics,
  actor,
  state,
  nowMs,
  { glow = false } = {},
) {
  // Living-circle mode deliberately preserves the old battlefield silhouette:
  // a hollow friendly/enemy ring. Only the ring contour deforms.
  const radius = Math.max(8, Number(actor.radius) || 18) + 3;
  const teamColor = actor.team === "friendly" ? 0x55c878 : 0xd45a5a;
  const mode = state?.mode || "idle";
  const intensity = Math.max(0, Math.min(1, Number(state?.intensity) || 0));
  let dx = Number(state?.dirX) || Math.cos(actor.facing || 0);
  let dy = Number(state?.dirY) || Math.sin(actor.facing || 0);
  const len = Math.max(.0001, Math.hypot(dx,dy));
  dx /= len;
  dy /= len;
  const sx = -dy;
  const sy = dx;
  const breathe = .5 + .5 * Math.sin(
    (nowMs || 0) * .0043 + String(actor.id || "").length
  );
  const points = [];
  const count = 32;

  let forwardStretch = 0;
  let sideCompress = 0;
  let radialWave = 0;
  let rearCompress = 0;

  if (mode === "move") {
    forwardStretch = .045 + intensity * .045;
    sideCompress = .018 + intensity * .020;
  } else if (mode === "cast") {
    radialWave = .020 + intensity * .035;
    sideCompress = .008;
  } else if (mode === "projectile" || mode === "spell") {
    forwardStretch = .065 + intensity * .075;
    rearCompress = .028 + intensity * .035;
    sideCompress = .018;
  } else if (mode === "melee") {
    forwardStretch = .085 + intensity * .095;
    rearCompress = .025;
    sideCompress = .035 + intensity * .025;
  } else if (mode === "charge" || mode === "shadowstep") {
    forwardStretch = .11 + intensity * .11;
    rearCompress = .04;
    sideCompress = .045;
  } else if (mode === "heal") {
    radialWave = .016 + intensity * .022;
  } else if (mode === "defensive") {
    radialWave = .025 + intensity * .022;
  } else if (mode === "hit") {
    forwardStretch = -.07 * intensity;
    rearCompress = -.018;
    sideCompress = .045 * intensity;
  } else if (mode === "fear") {
    radialWave = .030 + intensity * .030;
  } else if (mode === "stun") {
    radialWave = .038;
    sideCompress = .020;
  } else if (mode === "root") {
    sideCompress = .050;
    forwardStretch = .018;
  } else if (mode === "incapacitate") {
    radialWave = .018;
  }

  for (let i=0;i<count;i+=1) {
    const a = i / count * Math.PI * 2;
    const alongDir = Math.cos(a);
    const sideDir = Math.sin(a);
    const alongScale =
      1
      + forwardStretch * Math.max(0,alongDir)
      - rearCompress * Math.max(0,-alongDir);
    let sideScale = 1 - sideCompress;

    let localRadius = radius * (1 + (breathe-.5) * .010);
    if (mode === "cast") {
      localRadius *= 1 + Math.cos(a * 6) * radialWave;
    } else if (mode === "fear") {
      localRadius *= 1 + Math.sin(a * 7 + nowMs * .026) * radialWave;
    } else if (mode === "stun") {
      localRadius *= 1 + Math.cos(a * 4) * radialWave;
    } else if (mode === "defensive") {
      localRadius *= 1 + Math.cos(a * 8) * radialWave * .55;
    } else if (mode === "heal") {
      localRadius *= 1 + Math.sin(a * 5 + nowMs * .008) * radialWave * .45;
    }

    if (mode === "root" && sideDir > .15) sideScale *= .96;

    const along = alongDir * localRadius * alongScale;
    const side = sideDir * localRadius * sideScale;
    points.push({
      x: dx * along + sx * side,
      y: dy * along + sy * side,
    });
  }

  graphics.clear();
  if (!points.length) return;
  graphics.moveTo(points[0].x,points[0].y);
  for (let i=1;i<points.length;i+=1) {
    graphics.lineTo(points[i].x,points[i].y);
  }
  graphics.lineTo(points[0].x,points[0].y);
  graphics.stroke({
    color: teamColor,
    width: glow ? 6.8 : 2.0,
    alpha: glow ? .27 : .80,
  });
}

function strokeLivingArc(
  graphics,
  radius,
  start,
  end,
  style,
  segments = 10,
) {
  if (!graphics || style?.alpha <= 0) return;
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const a = start + (end - start) * t;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) graphics.moveTo(x,y);
    else graphics.lineTo(x,y);
  }
  graphics.stroke(style);
}

function talentBranchVisuals(actor, game) {
  const tree = TALENT_TREE_REGISTRY[actor?.classId];
  if (!tree?.branches?.length) return [];

  let branchPoints = null;

  if (actor?.control === "player" && typeof game?.talentStatus === "function") {
    branchPoints = game.talentStatus()?.branchPoints || null;
  }

  if (!branchPoints) {
    branchPoints =
      actor?.config?.aiProgression?.branchPoints
      || actor?.config?.enemyProgression?.branchPoints
      || {};
  }

  const spent = tree.branches.reduce(
    (sum, branch) => sum + Math.max(0, Number(branchPoints?.[branch.id]) || 0),
    0,
  );

  return tree.branches.map((branch, index) => {
    const points = Math.max(0, Number(branchPoints?.[branch.id]) || 0);
    return {
      id: branch.id,
      name: branch.name,
      index,
      points,
      share: spent > 0 ? points / spent : 0,
      development: Math.max(0, Math.min(1, points / 10)),
      color: hexNumber(branch.accent, classColorFor(actor)),
    };
  });
}

function drawIdentityTick(graphics, angle, inner, outer, style) {
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  graphics
    .moveTo(ca * inner, sa * inner)
    .lineTo(ca * outer, sa * outer)
    .stroke(style);
}

function drawClassIdentitySigil(
  graphics,
  actor,
  state,
  nowMs,
  game,
) {
  graphics.clear();
  graphics.visible = false;
  if (!actor?.alive) return;

  const classId = actor.classId || "";
  const base = hexNumber(classColorFor(actor), 0xffffff);
  const mode = state?.mode || "idle";
  const intensity = Math.max(0, Math.min(1, Number(state?.intensity) || 0));
  const progress = Math.max(0, Math.min(1, Number(state?.progress) || 0));
  const t = (Number(nowMs) || 0) * .001;
  const seed = String(actor.id || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const phase = seed * .021;

  const ringRadius = Math.max(8, Number(actor.radius) || 18) + 3;
  const innerR = Math.max(9, ringRadius - 4.4);
  const deepR = Math.max(7, innerR - 3.5);
  const breathe = .5 + .5 * Math.sin(t * 1.45 + phase);
  const active =
    mode === "idle"
      ? .26 + breathe * .06
      : .32 + intensity * .22;
  const castBoost = mode === "cast" ? .10 + progress * .12 : 0;
  const alpha = Math.min(.64, active + castBoost);

  graphics.visible = true;

  const arc = (radius, center, halfWidth, width = 1.25, a = alpha) => {
    strokeLivingArc(
      graphics,
      radius,
      center - halfWidth,
      center + halfWidth,
      { color: base, width, alpha: a },
      7,
    );
  };

  // Class identity lives only in the band just inside the team ring.
  // No line is allowed to cross the center; melee/spell impacts remain readable.
  if (classId === "priest") {
    for (let i = 0; i < 3; i += 1) {
      const a = -Math.PI / 2 + i * Math.PI * 2 / 3;
      arc(innerR, a, .31, 1.35, alpha);
      graphics.circle(
        Math.cos(a) * deepR,
        Math.sin(a) * deepR,
        .8,
      ).fill({ color: base, alpha: alpha * .72 });
    }
  } else if (classId === "mage") {
    for (let i = 0; i < 6; i += 1) {
      const a = -Math.PI / 2 + i * Math.PI / 3;
      arc(innerR, a, .19, 1.3, alpha);
      drawIdentityTick(
        graphics,
        a,
        innerR - 3.2,
        innerR - .7,
        { color: base, width: 1.05, alpha: alpha * .62 },
      );
    }
  } else if (classId === "warlock") {
    for (let i = 0; i < 5; i += 1) {
      const a = -.55 + i * Math.PI * 2 / 5 + Math.sin(i * 2.1) * .06;
      arc(innerR - (i % 2) * .8, a, .22, 1.35, alpha);
      const hookA = a + .23;
      drawIdentityTick(
        graphics,
        hookA,
        innerR - 4.0,
        innerR - 1.3,
        { color: base, width: 1.05, alpha: alpha * .58 },
      );
    }
  } else if (classId === "druid") {
    for (let i = 0; i < 3; i += 1) {
      const a = .25 + i * Math.PI * 2 / 3;
      arc(innerR, a, .38, 1.25, alpha);
      strokeLivingArc(
        graphics,
        deepR,
        a + .05,
        a + .48,
        { color: base, width: .95, alpha: alpha * .55 },
        5,
      );
    }
  } else if (classId === "shaman") {
    for (let i = 0; i < 4; i += 1) {
      const a = -Math.PI / 2 + i * Math.PI / 2;
      arc(innerR, a, .25, 1.4, alpha);
      drawIdentityTick(
        graphics,
        a - .13,
        innerR - 3.4,
        innerR - .9,
        { color: base, width: 1.0, alpha: alpha * .60 },
      );
      drawIdentityTick(
        graphics,
        a + .13,
        innerR - 3.4,
        innerR - .9,
        { color: base, width: 1.0, alpha: alpha * .60 },
      );
    }
  } else if (classId === "paladin") {
    for (let i = 0; i < 4; i += 1) {
      const a = i * Math.PI / 2;
      arc(innerR, a, .27, 1.45, alpha);
      graphics.circle(
        Math.cos(a + Math.PI / 4) * deepR,
        Math.sin(a + Math.PI / 4) * deepR,
        .72,
      ).fill({ color: base, alpha: alpha * .60 });
    }
  } else if (classId === "warrior") {
    const facing = Math.atan2(
      Number(state?.dirY) || Math.sin(actor.facing || 0),
      Number(state?.dirX) || Math.cos(actor.facing || 0),
    );
    for (let i = -1; i <= 1; i += 1) {
      const a = facing + i * .46;
      arc(innerR, a, .22, 1.6, alpha);
      drawIdentityTick(
        graphics,
        a,
        innerR - 3.1,
        innerR - .5,
        { color: base, width: 1.25, alpha: alpha * .66 },
      );
    }
  } else if (classId === "rogue") {
    const facing = Math.atan2(
      Number(state?.dirY) || Math.sin(actor.facing || 0),
      Number(state?.dirX) || Math.cos(actor.facing || 0),
    );
    arc(innerR, facing + .50, .42, 1.25, alpha);
    arc(innerR, facing - .50 + Math.PI, .42, 1.25, alpha);
    for (const offset of [-.24, .24]) {
      drawIdentityTick(
        graphics,
        facing + offset,
        innerR - 3.4,
        innerR - .6,
        { color: base, width: 1.05, alpha: alpha * .62 },
      );
    }
  } else if (classId === "death-knight") {
    for (let i = 0; i < 6; i += 1) {
      const a = -.18 + i * Math.PI / 3;
      arc(innerR - (i % 2) * 1.0, a, .16, 1.35, alpha);
      drawIdentityTick(
        graphics,
        a + .08,
        innerR - 3.9,
        innerR - 1.1,
        { color: base, width: 1.05, alpha: alpha * .58 },
      );
    }
  } else {
    for (let i = 0; i < 4; i += 1) {
      arc(innerR, i * Math.PI / 2, .22, 1.2, alpha);
    }
  }

  // Real talent allocation is encoded as up to two colored inner arcs.
  // More points = a longer, brighter segment; hybrid builds show both colors.
  const branches = talentBranchVisuals(actor, game);
  const activeBranches = branches.filter(branch => branch.points > 0);

  for (const branch of activeBranches) {
    const branchIndex = branch.index % 2;
    const baseAngle = branchIndex === 0 ? -2.55 : .58;
    const drift = Math.sin(t * .22 + phase + branchIndex * 1.7) * .035;
    const span = .34 + branch.share * .72 + branch.development * .16;
    const rr = innerR - 2.0 - branchIndex * 1.8;
    const branchAlpha =
      .20
      + branch.development * .28
      + (mode === "cast" ? progress * .10 : 0);

    strokeLivingArc(
      graphics,
      rr,
      baseAngle + drift,
      baseAngle + drift + span,
      {
        color: branch.color,
        width: 1.15 + branch.development * .65,
        alpha: Math.min(.62, branchAlpha),
      },
      8,
    );

    const endA = baseAngle + drift + span;
    graphics.circle(
      Math.cos(endA) * rr,
      Math.sin(endA) * rr,
      .78 + branch.development * .35,
    ).fill({
      color: branch.color,
      alpha: Math.min(.72, branchAlpha + .10),
    });
  }
}

function drawLivingRingAccent(
  graphics,
  actor,
  state,
  nowMs,
  profile = null,
) {
  graphics.clear();
  graphics.visible = false;
  if (!actor?.alive) return;

  const mode = state?.mode || "idle";
  const intensity = Math.max(0, Math.min(1, Number(state?.intensity) || 0));
  const progress = Math.max(0, Math.min(1, Number(state?.progress) || 0));
  const teamColor = actor.team === "friendly" ? 0x55c878 : 0xd45a5a;
  const brightTeam = actor.team === "friendly" ? 0x9bd9aa : 0xe8a09a;
  const main = profile?.main ?? teamColor;
  const core = profile?.core ?? brightTeam;
  const accent = profile?.accent ?? main;
  const radius = Math.max(8, Number(actor.radius) || 18) + 3;
  const t = (Number(nowMs) || 0) * .001;

  let dx = Number(state?.dirX) || Math.cos(actor.facing || 0);
  let dy = Number(state?.dirY) || Math.sin(actor.facing || 0);
  const len = Math.max(.0001,Math.hypot(dx,dy));
  dx /= len;
  dy /= len;
  const angle = Math.atan2(dy,dx);

  graphics.visible = true;

  if (mode === "idle") {
    // Idle should still feel alive: a slow asymmetric orbit, breathing echo
    // and two tiny travelling motes. The center remains completely empty.
    const idPhase = String(actor.id || "")
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) * .017;
    const breathe = .5 + .5 * Math.sin(t * 1.65 + idPhase);
    const a = t * .46 + idPhase;

    strokeLivingArc(graphics,radius+1.15,a-.34,a+.34,{
      color:brightTeam,width:1.65,alpha:.18+.11*breathe,
    },7);
    strokeLivingArc(
      graphics,
      radius+4.1,
      a+Math.PI-.27,
      a+Math.PI+.27,
      { color:teamColor,width:1.15,alpha:.08+.07*(1-breathe) },
      6,
    );

    graphics.circle(0,0,radius+3.1+breathe*1.25).stroke({
      color:teamColor,
      width:.9,
      alpha:.045+.04*breathe,
    });

    for (let i=0;i<2;i+=1) {
      const moteA = a + (i ? Math.PI * 1.18 : -.18);
      const moteR = radius + 5.3 + (i ? 1.2 : 0);
      graphics.circle(
        Math.cos(moteA)*moteR,
        Math.sin(moteA)*moteR,
        i ? .75 : 1.05,
      ).fill({
        color:i ? teamColor : brightTeam,
        alpha:(i ? .11 : .18)+breathe*(i ? .04 : .08),
      });
    }
    return;
  }

  if (mode === "move") {
    // Strong leading edge + a faint open rear arc gives clear direction without
    // putting anything inside the unit.
    strokeLivingArc(graphics,radius+1.1,angle-.72,angle+.72,{
      color:brightTeam,width:2.15,alpha:.32+.18*intensity,
    },9);
    strokeLivingArc(graphics,radius+4.0,angle+Math.PI-.66,angle+Math.PI+.66,{
      color:teamColor,width:1.35,alpha:.12+.12*intensity,
    },8);
    return;
  }

  if (mode === "cast") {
    // Spell-school arcs orbit outside the permanent team ring. They tighten
    // toward release but leave the center fully transparent.
    const spin = t * (1.15 + intensity*.55);
    const tighten = progress * 2.4;
    for (let i=0;i<3;i+=1) {
      const a = spin + i * (Math.PI * 2 / 3);
      const rr = radius + 7.5 - tighten + i*.8;
      strokeLivingArc(graphics,rr,a-.42,a+.42,{
        color:i===1 ? core : (i===2 ? accent : main),
        width:i===1 ? 1.9 : 1.45,
        alpha:.24 + intensity*(i===1 ? .34 : .24),
      },7);
    }
    strokeLivingArc(
      graphics,
      Math.max(radius+2.5,radius+5.5-progress*2.2),
      angle-.50,
      angle+.50,
      { color:core,width:2.1,alpha:.20+intensity*.34 },
      8,
    );
    return;
  }

  if (mode === "projectile" || mode === "spell") {
    // A muzzle-like front wedge makes the projectile visibly leave the ring.
    const release = 1-progress;
    const tipR = radius + 6 + release * 5;
    const sideA = .34;
    const x1 = Math.cos(angle-sideA)*(radius+.5);
    const y1 = Math.sin(angle-sideA)*(radius+.5);
    const x2 = Math.cos(angle+sideA)*(radius+.5);
    const y2 = Math.sin(angle+sideA)*(radius+.5);
    const tx = Math.cos(angle)*tipR;
    const ty = Math.sin(angle)*tipR;

    strokeLivingArc(graphics,radius+1.2,angle-.66,angle+.66,{
      color:core,width:2.35,alpha:.30+.34*release,
    },8);
    graphics
      .moveTo(x1,y1).lineTo(tx,ty).lineTo(x2,y2)
      .stroke({
        color:main,
        width:1.45,
        alpha:.22+.42*release,
      });

    if (progress < .55) {
      strokeLivingArc(
        graphics,
        radius+5+progress*7,
        angle-.82,
        angle+.82,
        { color:core,width:1.1,alpha:(1-progress/.55)*.24 },
        8,
      );
    }
    return;
  }

  if (mode === "melee") {
    // A bright outer crescent follows the attack side. It frames the existing
    // melee VFX rather than drawing over the transparent center.
    const swing = Math.sin(progress*Math.PI);
    strokeLivingArc(graphics,radius+2.2,angle-1.0,angle+.88,{
      color:core,width:2.6,alpha:.28+.36*swing,
    },10);
    strokeLivingArc(graphics,radius+6.2,angle-.72,angle+.58,{
      color:main,width:1.55,alpha:.14+.28*swing,
    },8);
    return;
  }

  if (mode === "charge" || mode === "shadowstep") {
    const rear = angle + Math.PI;
    for (let i=0;i<2;i+=1) {
      strokeLivingArc(
        graphics,
        radius+3+i*4,
        rear-.72-i*.08,
        rear+.72+i*.08,
        {
          color:mode === "shadowstep" ? accent : teamColor,
          width:1.55-i*.25,
          alpha:(.30-i*.08)*(1-progress*.55),
        },
        8,
      );
    }
    strokeLivingArc(graphics,radius+1.2,angle-.48,angle+.48,{
      color:brightTeam,width:2.25,alpha:.38,
    },7);
    return;
  }

  if (mode === "hit") {
    // Brief impact notch/ripple on the incoming side.
    const hitPulse = Math.sin(progress*Math.PI);
    strokeLivingArc(graphics,radius+1,angle-.52,angle+.52,{
      color:0xffd5cc,width:2.6,alpha:.26+.34*intensity,
    },7);
    strokeLivingArc(graphics,radius+4+hitPulse*5,angle-.72,angle+.72,{
      color:teamColor,width:1.35,alpha:(1-progress)*.30,
    },8);
    return;
  }

  if (mode === "defensive") {
    const pulse = .5+.5*Math.sin(t*7.5);
    graphics.circle(0,0,radius+4.2).stroke({
      color:main,width:1.55,alpha:.25+.18*pulse,
    });
    graphics.circle(0,0,radius+8.0).stroke({
      color:core,width:1.15,alpha:.14+.13*pulse,
    });
    return;
  }

  if (mode === "heal") {
    const a=t*.75;
    strokeLivingArc(graphics,radius+4,a-.82,a+.82,{
      color:main,width:1.65,alpha:.22+.20*intensity,
    },9);
    strokeLivingArc(graphics,radius+7,a+Math.PI-.58,a+Math.PI+.58,{
      color:core,width:1.25,alpha:.16+.16*intensity,
    },8);
    return;
  }

  if (mode === "control") {
    const a=t*1.2;
    strokeLivingArc(graphics,radius+5,a-.62,a+.62,{
      color:main,width:1.7,alpha:.28,
    },8);
    strokeLivingArc(graphics,radius+5,a+Math.PI-.62,a+Math.PI+.62,{
      color:core,width:1.35,alpha:.22,
    },8);
    return;
  }

  // CC body states already have dedicated world VFX. Keep this layer restrained.
  if (["fear","stun","root","incapacitate"].includes(mode)) {
    const sections = mode === "stun" ? 4 : 3;
    for (let i=0;i<sections;i+=1) {
      const a=t*.45+i*Math.PI*2/sections;
      strokeLivingArc(graphics,radius+3.5,a-.24,a+.24,{
        color:brightTeam,width:1.4,alpha:.18+.12*intensity,
      },5);
    }
    return;
  }

  graphics.visible = false;
}

function resourceColor(type) {
  if (type === "mana") return 0x7464b8;
  if (type === "energy") return 0xc5a34a;
  if (type === "rage") return 0xa94f45;
  if (type === "runic") return 0x4ca7b3;
  return 0x777777;
}

function burstColors(style = "damage") {
  const colors = {
    heal: [0x65db78, 0xedffe7],
    priest: [0xffd45d, 0xfff9d9],
    druid: [0x69dd7b, 0xe9ffd9],
    paladin: [0xffca45, 0xfff4bd],
    mage: [0x65cfff, 0xf0fbff],
    shaman: [0x62d9ff, 0xf1fdff],
    lightning: [0x62d9ff, 0xf1fdff],
    warlock: [0xa45dff, 0xf0dcff],
    warrior: [0xd86b5c, 0xffd9c9],
    rogue: [0xe9c85c, 0xfff2bc],
    "death-knight": [0xd95b56, 0xffddd1],
    damage: [0xe56b5c, 0xffe0d4],
  };
  return colors[style] || colors.damage;
}

function priestHealSpellColors(spellId) {
  const colors = {
    "priest-renew": [0xe7cf8d, 0xfff7cf, 0xc9a95e],
    "priest-flash-heal": [0xead38f, 0xfff9dc, 0xc8aa61],
    "priest-greater-heal": [0xe8d39a, 0xfffce7, 0xc9aa6a],
  };
  return colors[spellId] || colors["priest-flash-heal"];
}

function priestDruidSpellProfile(spellId) {
  const profiles = {
    "priest-pain-suppression": {
      kind: "holy-shield",
      main: 0xd9c78f,
      core: 0xfff8d6,
      accent: 0x8d78b4,
    },
    "priest-psychic-scream": {
      kind: "shadow-wave",
      main: 0x8865b4,
      core: 0xceb5e8,
      accent: 0x473158,
    },
    "priest-smite": {
      kind: "mind-implosion",
      main: 0x8d64bd,
      core: 0xd8b8ef,
      accent: 0x4d315e,
    },
    "priest-holy-fire": {
      kind: "holy-sky",
      main: 0xe3b95e,
      core: 0xfff5c2,
      accent: 0xcc7440,
    },

    "druid-rejuvenation": {
      kind: "leaf-hot",
      main: 0x72b978,
      core: 0xdff4a8,
      accent: 0x4d8255,
    },
    "druid-swiftmend": {
      kind: "leaf-burst",
      main: 0x79bd74,
      core: 0xeef7b1,
      accent: 0x4f8b55,
    },
    "druid-regrowth": {
      kind: "regrowth",
      main: 0x6eb06f,
      core: 0xe2f2a6,
      accent: 0x4c7951,
    },
    "druid-ironbark": {
      kind: "bark-shield",
      main: 0x7ea46a,
      core: 0xd6e6a2,
      accent: 0x70563a,
    },
    "druid-cyclone": {
      kind: "cyclone",
      main: 0x91b98a,
      core: 0xeaf1ca,
      accent: 0x6d8c72,
    },
    "druid-lifebloom": {
      kind: "lifebloom",
      main: 0x7bc082,
      core: 0xf0f5b3,
      accent: 0x5d9264,
    },
    "druid-moonfire": {
      kind: "moon-sky",
      main: 0x8aa8d8,
      core: 0xeef3ff,
      accent: 0x7690ba,
    },
  };
  return profiles[spellId] || null;
}

function paladinDkSpellProfile(spellId) {
  const profiles = {
    "paladin-holy-shock": {
      family: "paladin", kind: "holy-shock",
      main: 0xe7c760, core: 0xfff7c7, accent: 0xc8913d,
    },
    "paladin-flash-light": {
      family: "paladin", kind: "flash-light",
      main: 0xe9cf76, core: 0xfffbe0, accent: 0xc99b48,
    },
    "paladin-holy-light": {
      family: "paladin", kind: "holy-light",
      main: 0xe5c76f, core: 0xfffce3, accent: 0xc18e3f,
    },
    "paladin-blessing": {
      family: "paladin", kind: "blessing",
      main: 0xe7cd79, core: 0xfff8cf, accent: 0xa97835,
    },
    "paladin-hammer": {
      family: "paladin", kind: "hammer",
      main: 0xe5bd58, core: 0xfff2ad, accent: 0xb97b2e,
    },
    "paladin-word-of-glory": {
      family: "paladin", kind: "word-glory",
      main: 0xf0d57e, core: 0xfffbe0, accent: 0xc69745,
    },
    "paladin-judgment": {
      family: "paladin", kind: "judgment",
      main: 0xe1b84f, core: 0xfff4ae, accent: 0xb7772d,
    },

    "dk-fever": {
      family: "dk", kind: "fever",
      main: 0x6fb9d5, core: 0xd9f5ff, accent: 0x486c8d,
    },
    "dk-death-strike": {
      family: "dk", kind: "death-strike",
      main: 0x9f454b, core: 0xe8a4aa, accent: 0x4e2329,
    },
    "dk-obliterate": {
      family: "dk", kind: "obliterate",
      main: 0x74bad8, core: 0xe3f8ff, accent: 0x4f7291,
    },
    "dk-chains": {
      family: "dk", kind: "chains",
      main: 0x75bcd8, core: 0xe3f8ff, accent: 0x536e86,
    },
    "dk-mind-freeze": {
      family: "dk", kind: "mind-freeze",
      main: 0x6fb6d4, core: 0xe4f9ff, accent: 0x445f7c,
    },
    "dk-frost-strike": {
      family: "dk", kind: "frost-strike",
      main: 0x75bcd8, core: 0xe8fbff, accent: 0x54728f,
    },
    "dk-rune-tap": {
      family: "dk", kind: "rune-tap",
      main: 0xa34b51, core: 0xddb0b4, accent: 0x513039,
    },
  };
  return profiles[spellId] || null;
}

function warriorRogueSpellProfile(spellId) {
  const profiles = {
    "warrior-rend": {
      family: "warrior", kind: "rend",
      main: 0xb76955, core: 0xe0b69b, accent: 0x9a9b98,
    },
    "warrior-mortal-strike": {
      family: "warrior", kind: "mortal",
      main: 0xbf755b, core: 0xeee0c8, accent: 0xa7a6a1,
    },
    "warrior-slam": {
      family: "warrior", kind: "slam",
      main: 0xba815d, core: 0xe9d7ba, accent: 0x9b9b96,
    },
    "warrior-charge": {
      family: "warrior", kind: "charge",
      main: 0xaa8a68, core: 0xd7c7a7, accent: 0x8c8a84,
    },
    "warrior-pummel": {
      family: "warrior", kind: "pummel",
      main: 0xa9795c, core: 0xe1d1b5, accent: 0x999894,
    },
    "warrior-overpower": {
      family: "warrior", kind: "overpower",
      main: 0xc48a61, core: 0xefe1c6, accent: 0xa5a49f,
    },
    "warrior-bloodthirst": {
      family: "warrior", kind: "bloodthirst",
      main: 0xa94d48, core: 0xdf9a89, accent: 0x8e8e89,
    },

    "rogue-garrote": {
      family: "rogue", kind: "garrote",
      main: 0xa5a35c, core: 0xe2dda0, accent: 0x514666,
    },
    "rogue-sinister": {
      family: "rogue", kind: "sinister",
      main: 0xc2b867, core: 0xeee4aa, accent: 0x594c6c,
    },
    "rogue-eviscerate": {
      family: "rogue", kind: "eviscerate",
      main: 0xc6b95e, core: 0xf4e6a4, accent: 0x5a4a69,
    },
    "rogue-kidney": {
      family: "rogue", kind: "kidney",
      main: 0xa18a64, core: 0xe1d29b, accent: 0x6a537b,
    },
    "rogue-kick": {
      family: "rogue", kind: "kick",
      main: 0xaaa067, core: 0xeee1a3, accent: 0x5d4e70,
    },
    "rogue-mutilate": {
      family: "rogue", kind: "mutilate",
      main: 0xb7ad61, core: 0xf0e2a0, accent: 0x684f78,
    },
    "rogue-shadowstep": {
      family: "rogue", kind: "shadowstep",
      main: 0x8f76a8, core: 0xcbb5df, accent: 0x43384f,
    },
  };
  return profiles[spellId] || null;
}

function commonCasterSpellProfile(spellId) {
  const profiles = {
    "mage-living-bomb": {
      kind: "mage-bomb",
      main: 0xd86b3f,
      core: 0xffe0a8,
      accent: 0x9f342b,
    },
    "mage-frostbolt": {
      kind: "frost",
      main: 0x63c9e7,
      core: 0xeffcff,
      accent: 0x77a9dc,
      travelEnd: .55,
      size: 7,
    },
    "mage-pyroblast": {
      kind: "fire",
      main: 0xd96839,
      core: 0xffe2aa,
      accent: 0xa73d2d,
      travelEnd: .58,
      size: 11,
      heavy: true,
    },
    "mage-frost-nova": {
      kind: "frost-nova",
      main: 0x67cee8,
      core: 0xf1fdff,
      accent: 0x6f9fd7,
    },
    "mage-polymorph": {
      kind: "arcane-control",
      main: 0xa38ada,
      core: 0xf4e7ff,
      accent: 0x6e5aa9,
    },
    "mage-frostfire-bolt": {
      kind: "frostfire",
      main: 0x75d4e7,
      core: 0xfff1d1,
      accent: 0xdd7540,
      travelEnd: .58,
      size: 10,
      heavy: true,
    },
    "mage-arcane-barrage": {
      kind: "arcane",
      main: 0xa389db,
      core: 0xf3e5ff,
      accent: 0x6e5db7,
      travelEnd: .50,
      size: 8,
    },

    "shaman-flame-shock": {
      kind: "flame-shock",
      main: 0xd96d3e,
      core: 0xffe0a1,
      accent: 0x9e3e2d,
    },
    "shaman-chain-lightning": {
      kind: "lightning-release",
      main: 0x63c7dd,
      core: 0xecfeff,
      accent: 0x4c91bd,
    },
    "shaman-lava-burst": {
      kind: "lava",
      main: 0xd66a38,
      core: 0xffe7a4,
      accent: 0x9d3527,
      travelEnd: .52,
      size: 10,
      heavy: true,
    },
    "shaman-hex": {
      kind: "nature-control",
      main: 0x78b89e,
      core: 0xeaffdf,
      accent: 0x4d7f68,
    },
    "shaman-astral-shift": {
      kind: "astral",
      main: 0x78c4d6,
      core: 0xeffeff,
      accent: 0x846cb7,
    },
    "shaman-elemental-blast": {
      kind: "elemental",
      main: 0x66c5dc,
      core: 0xfff0bc,
      accent: 0xd97843,
      travelEnd: .50,
      size: 9,
      heavy: true,
    },
    "shaman-stormstrike": {
      kind: "stormstrike",
      main: 0x65cce0,
      core: 0xefffff,
      accent: 0xd19b58,
    },

    "warlock-corruption": {
      kind: "corruption",
      main: 0x9d63c7,
      core: 0xd9b6f0,
      accent: 0x38213f,
    },
    "warlock-shadow-bolt": {
      kind: "shadow",
      main: 0x8a56bd,
      core: 0xd5b4ee,
      accent: 0x2b1838,
      travelEnd: .56,
      size: 8,
    },
    "warlock-chaos-bolt": {
      kind: "chaos",
      main: 0x66d45f,
      core: 0xdcff8a,
      accent: 0x233629,
      travelEnd: .62,
      size: 12,
      heavy: true,
    },
    "warlock-resolve": {
      kind: "shadow-ward",
      main: 0x7654a7,
      core: 0xc7a8ea,
      accent: 0x251a33,
    },
    "warlock-fear": {
      kind: "shadow-control",
      main: 0x9a61bf,
      core: 0xe3c4f3,
      accent: 0x301b3b,
    },
    "warlock-drain-life": {
      kind: "drain",
      main: 0x8f5bc1,
      core: 0xd7b7ee,
      accent: 0x261730,
    },
    "warlock-conflagrate": {
      kind: "conflagrate",
      main: 0xd56d43,
      core: 0xffd59a,
      accent: 0x512519,
    },
  };
  return profiles[spellId] || null;
}

const PROJECTILE_VFX2_SPELLS = new Set([
  "mage-frostbolt",
  "mage-pyroblast",
  "mage-frostfire-bolt",
  "mage-arcane-barrage",
  "shaman-lava-burst",
  "shaman-elemental-blast",
  "warlock-shadow-bolt",
  "warlock-chaos-bolt",
  "paladin-hammer",
]);

function projectileVfx2Spec(spellId) {
  const profile = spellPolishProfile(spellId);
  const specs = {
    "mage-frostbolt": {
      shape: "frost-spear",
      trailStyle: "snow",
      travelEnd: .46,
      size: 9,
      tail: 96,
      trailReach: .90,
    },
    "mage-pyroblast": {
      shape: "pyro",
      trailStyle: "fire",
      travelEnd: .49,
      size: 14,
      tail: 118,
      trailReach: .94,
      heavy: true,
    },
    "mage-frostfire-bolt": {
      shape: "frostfire",
      trailStyle: "frostfire",
      travelEnd: .49,
      size: 13,
      tail: 122,
      trailReach: .95,
      heavy: true,
    },
    "mage-arcane-barrage": {
      shape: "arcane",
      trailStyle: "arcane",
      travelEnd: .44,
      size: 10,
      tail: 106,
      trailReach: .92,
    },
    "shaman-lava-burst": {
      shape: "lava-rock",
      trailStyle: "magma",
      travelEnd: .52,
      size: 14,
      tail: 110,
      trailReach: .91,
      heavy: true,
      arc: 24,
    },
    "shaman-elemental-blast": {
      shape: "elemental",
      trailStyle: "elemental",
      travelEnd: .50,
      size: 11,
      tail: 118,
      trailReach: .94,
      heavy: true,
    },
    "warlock-shadow-bolt": {
      shape: "shadow",
      trailStyle: "void",
      travelEnd: .48,
      size: 10,
      tail: 100,
      trailReach: .90,
    },
    "warlock-chaos-bolt": {
      shape: "chaos",
      trailStyle: "fel",
      travelEnd: .52,
      size: 13,
      tail: 124,
      trailReach: .95,
      heavy: true,
    },
    "paladin-hammer": {
      shape: "hammer",
      trailStyle: "holy",
      travelEnd: .44,
      size: 13,
      tail: 62,
      trailReach: .72,
    },
  };
  const spec = specs[spellId];
  return spec ? { ...profile, ...spec } : null;
}

const COMBAT_VFX2_HEALS = new Set([
  "priest-renew",
  "priest-flash-heal",
  "priest-greater-heal",
  "druid-rejuvenation",
  "druid-swiftmend",
  "druid-regrowth",
  "druid-lifebloom",
  "paladin-holy-shock",
  "paladin-flash-light",
  "paladin-holy-light",
  "paladin-word-of-glory",
]);

const COMBAT_VFX2_DEFENSIVES = new Set([
  "priest-pain-suppression",
  "druid-ironbark",
  "paladin-blessing",
  "shaman-astral-shift",
  "warlock-resolve",
  "dk-rune-tap",
]);

const COMBAT_VFX2_CC = new Set([
  "priest-psychic-scream",
  "druid-cyclone",
  "mage-frost-nova",
  "mage-polymorph",
  "shaman-hex",
  "warlock-fear",
  "dk-chains",
  "dk-mind-freeze",
  "warrior-pummel",
  "rogue-kidney",
  "rogue-kick",
]);

const COMBAT_VFX2_MELEE = new Set([
  "warrior-rend",
  "warrior-mortal-strike",
  "warrior-slam",
  "warrior-charge",
  "warrior-overpower",
  "warrior-bloodthirst",
  "rogue-garrote",
  "rogue-sinister",
  "rogue-eviscerate",
  "rogue-mutilate",
  "rogue-shadowstep",
  "dk-death-strike",
  "dk-obliterate",
  "dk-frost-strike",
  "shaman-stormstrike",
]);

const COMBAT_VFX2_DOTS = new Set([
  "mage-living-bomb",
  "shaman-flame-shock",
  "warlock-corruption",
  "dk-fever",
]);

const COMBAT_VFX2_SKY = new Set([
  "priest-holy-fire",
  "druid-moonfire",
  "paladin-judgment",
]);

const COMBAT_VFX2_SPECIAL = new Set([
  "priest-smite",
  "warlock-drain-life",
  "warlock-conflagrate",
]);

const COMBAT_VFX2_SPELLS = new Set([
  ...COMBAT_VFX2_HEALS,
  ...COMBAT_VFX2_DEFENSIVES,
  ...COMBAT_VFX2_CC,
  ...COMBAT_VFX2_MELEE,
  ...COMBAT_VFX2_DOTS,
  ...COMBAT_VFX2_SKY,
  ...COMBAT_VFX2_SPECIAL,
]);

const POLISH_PROJECTILE_SPELLS = new Set([
  "priest-smite",
  "priest-holy-fire",
  "druid-moonfire",
  "paladin-hammer",
  "paladin-judgment",
  "mage-frostbolt",
  "mage-pyroblast",
  "mage-frostfire-bolt",
  "mage-arcane-barrage",
  "shaman-lava-burst",
  "shaman-elemental-blast",
  "warlock-shadow-bolt",
  "warlock-chaos-bolt",
]);

const POLISH_HEAL_SPELLS = new Set([
  "priest-renew",
  "priest-flash-heal",
  "priest-greater-heal",
  "druid-rejuvenation",
  "druid-swiftmend",
  "druid-regrowth",
  "druid-lifebloom",
  "paladin-holy-shock",
  "paladin-flash-light",
  "paladin-holy-light",
  "paladin-word-of-glory",
]);

const POLISH_CONTROL_SPELLS = new Set([
  "priest-psychic-scream",
  "druid-cyclone",
  "mage-frost-nova",
  "mage-polymorph",
  "shaman-hex",
  "warlock-fear",
  "dk-chains",
  "dk-mind-freeze",
  "warrior-pummel",
  "rogue-kidney",
  "rogue-kick",
]);

const POLISH_MELEE_SPELLS = new Set([
  "warrior-rend",
  "warrior-mortal-strike",
  "warrior-slam",
  "warrior-charge",
  "warrior-overpower",
  "warrior-bloodthirst",
  "rogue-garrote",
  "rogue-sinister",
  "rogue-eviscerate",
  "rogue-mutilate",
  "rogue-shadowstep",
  "dk-death-strike",
  "dk-obliterate",
  "dk-frost-strike",
  "shaman-stormstrike",
]);

const POLISH_HEAVY_SPELLS = new Set([
  "priest-greater-heal",
  "druid-regrowth",
  "paladin-holy-light",
  "paladin-word-of-glory",
  "warrior-mortal-strike",
  "warrior-slam",
  "rogue-eviscerate",
  "rogue-mutilate",
  "dk-death-strike",
  "dk-obliterate",
  "mage-pyroblast",
  "mage-frostfire-bolt",
  "shaman-lava-burst",
  "shaman-elemental-blast",
  "warlock-chaos-bolt",
]);

const POLISH_ALREADY_FINAL = new Set([
  // Chain Lightning already has its bespoke 2.0 multi-hop presentation.
  "shaman-chain-lightning",
]);

function spellPolishProfile(spellId, style = "damage") {
  const existing =
    commonCasterSpellProfile(spellId)
    || priestDruidSpellProfile(spellId)
    || paladinDkSpellProfile(spellId)
    || warriorRogueSpellProfile(spellId);

  if (existing) {
    return {
      ...existing,
      family: existing.family || String(spellId || "").split("-")[0] || "magic",
    };
  }

  if (
    spellId === "priest-renew"
    || spellId === "priest-flash-heal"
    || spellId === "priest-greater-heal"
  ) {
    const [main, core, accent] = priestHealSpellColors(spellId);
    return {
      family: "priest",
      kind: "heal",
      main,
      core,
      accent,
    };
  }

  const [main, core] = burstColors(style);
  return {
    family: String(spellId || "").split("-")[0] || "magic",
    kind: "generic",
    main,
    core,
    accent: main,
  };
}

function actorVisualSignature(actor) {
  return [
    actor?.classId || "",
    actor?.team || "",
    actor?.resource?.type || "",
    Number(actor?.radius) || 0,
  ].join("|");
}

function visualActorCenter(actorViews, actor, fallbackX = 0, fallbackY = 0) {
  if (!actor) return { x: fallbackX, y: fallbackY };

  const view = actorViews?.get?.(actor.id);
  const position = view?.body?.position;
  const offsetX = Number(position?.x) || 0;
  const offsetY = Number(position?.y) || 0;

  return {
    x: (Number(actor.x) || 0) + offsetX,
    y: (Number(actor.y) || 0) + offsetY,
  };
}

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function roundedArenaRect(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function paintLegacyGrandRing(ctx, arena) {
  if (arena?.id !== "four-pillar-ring") return false;

  // Exact pre-environment Grand Ring look from the old Canvas renderer:
  // dark brown radial floor, subtle gold grid and four rounded LOS pillars.
  const gradient = ctx.createRadialGradient(640, 360, 80, 640, 360, 680);
  gradient.addColorStop(0, "#433224");
  gradient.addColorStop(1, "#3a2c20");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.strokeStyle = "#6b4b2b";
  ctx.lineWidth = 3;
  ctx.strokeRect(
    arena.bounds.x,
    arena.bounds.y,
    arena.bounds.w,
    arena.bounds.h,
  );

  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = "#c58a43";
  ctx.lineWidth = 1;

  for (let x = 120; x < GAME_WIDTH; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, arena.bounds.y);
    ctx.lineTo(x, arena.bounds.y + arena.bounds.h);
    ctx.stroke();
  }

  for (let y = 90; y < GAME_HEIGHT; y += 80) {
    ctx.beginPath();
    ctx.moveTo(arena.bounds.x, y);
    ctx.lineTo(arena.bounds.x + arena.bounds.w, y);
    ctx.stroke();
  }

  ctx.restore();

  for (const rect of arena.obstacles) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    roundedArenaRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    ctx.fillStyle = "#5a4532";
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#8a6847";
    ctx.lineWidth = 5;
    ctx.stroke();

    roundedArenaRect(
      ctx,
      rect.x + 12,
      rect.y + 12,
      rect.w - 24,
      rect.h - 24,
      10,
    );
    ctx.strokeStyle = "rgba(230,189,127,.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  return true;
}

function paintFallbackArena(ctx, arena) {
  ctx.fillStyle = "#33281f";
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = "#51402e";
  ctx.fillRect(arena.bounds.x, arena.bounds.y, arena.bounds.w, arena.bounds.h);

  ctx.strokeStyle = "#806240";
  ctx.lineWidth = 4;
  ctx.strokeRect(arena.bounds.x, arena.bounds.y, arena.bounds.w, arena.bounds.h);

  for (const rect of arena.obstacles) {
    ctx.fillStyle = "#5d5548";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }
}

function makeSharpIconTexture(PIXI, sourceTexture, size = 128) {
  const resource = sourceTexture?.source?.resource;
  if (!resource || typeof document === "undefined") return sourceTexture;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return sourceTexture;

  ctx.clearRect(0, 0, size, size);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(resource, 0, 0, size, size);

  const texture = PIXI.Texture.from(canvas);
  texture.source.scaleMode = "linear";
  texture.source.autoGenerateMipmaps = false;
  return texture;
}

const WIND_SCAR_HEAT_VERTEX = `
in vec2 aPosition;

out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void)
{
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;

  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;

  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void)
{
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const WIND_SCAR_HEAT_FRAGMENT = `
in vec2 vTextureCoord;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uStrength;

float ellipseMask(vec2 uv, vec2 center, vec2 radius)
{
  vec2 d = (uv - center) / radius;
  float q = dot(d, d);
  return 1.0 - smoothstep(0.40, 1.0, q);
}

void main(void)
{
  vec2 uv = vTextureCoord;

  float heat = 0.0;
  heat = max(heat, ellipseMask(uv, vec2(0.168, 0.178), vec2(0.078, 0.060)));
  heat = max(heat, ellipseMask(uv, vec2(0.570, 0.253), vec2(0.072, 0.054)));
  heat = max(heat, ellipseMask(uv, vec2(0.832, 0.701), vec2(0.082, 0.063)));
  heat = max(heat, ellipseMask(uv, vec2(0.383, 0.771), vec2(0.076, 0.055)));

  float waveA = sin(uv.y * 122.0 + uTime * 2.4 + sin(uv.x * 47.0) * 1.6);
  float waveB = cos(uv.x * 93.0 - uTime * 1.7 + uv.y * 29.0);
  float shimmer = waveA * 0.62 + waveB * 0.38;

  vec2 offset = vec2(
    shimmer * 0.00125,
    (waveB - waveA * 0.35) * 0.00105
  ) * heat * uStrength;

  vec4 baseColor = texture2D(uTexture, uv);
  vec4 shiftedColor = texture2D(uTexture, uv + offset);
  float distortionMix = clamp(heat * uStrength, 0.0, 1.0);

  // Replace the ground sample instead of alpha-blending a second copy of the
  // terrain over itself. The old overlay path could double dark baked terrain
  // features and make them read as large detached shadows.
  gl_FragColor = mix(baseColor, shiftedColor, distortionMix);
}
`;

function makeArenaCanvas(arena) {
  const canvas = document.createElement("canvas");
  canvas.width = GAME_WIDTH;
  canvas.height = GAME_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) return canvas;

  const handled =
    paintLegacyGrandRing(ctx, arena)
    || drawGrandRingEnvironment(ctx, arena, GAME_WIDTH, GAME_HEIGHT)
    || drawWindscarEnvironment(ctx, arena, GAME_WIDTH, GAME_HEIGHT);

  if (!handled) paintFallbackArena(ctx, arena);
  return canvas;
}

export class PixiProofRenderer {
  constructor(inputCanvas, arena, options = {}) {
    this.inputCanvas = inputCanvas;
    this._arena = arena;
    this.renderEnvironment = options.renderEnvironment !== false;
    this.showBadge = options.showBadge !== false;
    this.livingCircleUnits = options.livingCircleUnits !== false;
    this.badgeText = options.badgeText || "PIXIJS 8.21 · GPU FX PREVIEW";
    this.ready = false;
    this.failed = false;
    this.PIXI = null;
    this.app = null;
    this.view = null;
    this.badge = null;
    this.terrainSprite = null;
    this.terrainTexture = null;
    this.heatShimmer = null;
    this.renderedArenaId = "";
    this.iconTextures = new Map();
    this.ownedIconTextures = new Set();
    this.actorViews = new Map();
    this.combatTextLayer = null;
    this.combatTextViews = new Map();
    this.environmentOcclusionPolygons = [];
    this.arenaBuildPromise = null;
    this.atmosphere = null;
  }

  async init() {
    const PIXI = await import(PIXI_MODULE_URL);
    this.PIXI = PIXI;

    const view = document.createElement("canvas");
    view.className = "pixi-arena-canvas";
    view.width = GAME_WIDTH;
    view.height = GAME_HEIGHT;
    view.setAttribute("aria-hidden", "true");
    Object.assign(view.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      display: "block",
      pointerEvents: "none",
      zIndex: "1",
    });

    this.inputCanvas.parentElement?.insertBefore(view, this.inputCanvas);
    this.view = view;

    const app = new PIXI.Application();
    await app.init({
      canvas: view,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      backgroundAlpha: 0,
      antialias: true,
      autoStart: false,
      preference: "webgl",
      resolution: Math.min(2, Math.max(1.5, Number(window.devicePixelRatio) || 1)),
    });
    this.app = app;

    this.inputCanvas.style.zIndex = "2";
    this.inputCanvas.style.background = "transparent";

    await this.loadClassIcons();
    await this.rebuildArena(this._arena);

    const combatTextLayer = new PIXI.Container();
    combatTextLayer.label = "floating-combat-text";
    this.app.stage.addChild(combatTextLayer);
    this.combatTextLayer = combatTextLayer;

    if (this.showBadge) this.installBadge();
    this.ready = true;
  }

  installBadge() {
    const host = this.inputCanvas.parentElement;
    if (!host) return;

    const badge = document.createElement("div");
    badge.textContent = this.badgeText;
    badge.setAttribute("aria-hidden", "true");
    Object.assign(badge.style, {
      position: "absolute",
      left: "8px",
      top: "8px",
      zIndex: "7",
      padding: "4px 7px",
      borderRadius: "5px",
      border: "1px solid rgba(110,190,255,.34)",
      background: "rgba(6,12,17,.76)",
      color: "#9edcff",
      font: "700 9px system-ui",
      letterSpacing: ".06em",
      pointerEvents: "none",
    });
    host.appendChild(badge);
    this.badge = badge;
  }

  async loadClassIcons() {
    const { Assets } = this.PIXI;
    await Promise.all(CLASS_IDS.map(async classId => {
      const url = classIconUrlFor(classId);
      if (!url) return;

      try {
        const sourceTexture = await Assets.load(url);
        const texture = makeSharpIconTexture(this.PIXI, sourceTexture, 128);

        if (texture !== sourceTexture) this.ownedIconTextures.add(texture);
        this.iconTextures.set(classId, texture);
      } catch (error) {
        console.warn("[Pixi preview] icon failed to load", classId, error);
      }
    }));
  }

  setArena(arena) {
    this._arena = arena;
    if (this.ready && arena?.id !== this.renderedArenaId) {
      this.rebuildArena(arena).catch(error => {
        console.error("[Pixi preview] arena rebuild failed", error);
      });
    }
  }

  async rebuildArena(arena) {
    if (!arena || !this.PIXI || !this.app) return;

    this.destroyHeatShimmer();
    this.destroyAtmosphere();

    if (this.terrainSprite) {
      this.app.stage.removeChild(this.terrainSprite);
      this.terrainSprite.destroy();
      this.terrainSprite = null;
    }
    if (this.terrainTexture) {
      this.terrainTexture.destroy(true);
      this.terrainTexture = null;
    }

    // Babylon mode keeps every Pixi actor/VFX layer but deliberately removes
    // Pixi's arena art so the 3D environment can sit underneath it.
    if (!this.renderEnvironment) {
      this.renderedArenaId = arena.id;
      return;
    }

    const { Sprite, Texture } = this.PIXI;
    const arenaCanvas = makeArenaCanvas(arena);
    const texture = Texture.from(arenaCanvas);
    const sprite = new Sprite(texture);
    sprite.width = GAME_WIDTH;
    sprite.height = GAME_HEIGHT;

    this.terrainTexture = texture;
    this.terrainSprite = sprite;
    this.app.stage.addChildAt(sprite, 0);
    this.createHeatShimmer(arena, texture);
    this.createAtmosphere(arena);
    this.renderedArenaId = arena.id;
  }

  destroyHeatShimmer() {
    if (!this.heatShimmer) return;

    const { container, heatTexture } = this.heatShimmer;
    if (container?.parent) container.parent.removeChild(container);
    container?.destroy?.({ children: true, texture: false });
    heatTexture?.destroy?.(true);
    this.heatShimmer = null;
  }

  createHeatShimmer(arena, terrainTexture) {
    this.destroyHeatShimmer();

    if (
      arena?.id !== "windscar-proving-grounds"
      || !terrainTexture
      || !this.PIXI
      || !this.app
      || typeof document === "undefined"
    ) return;

    const { Container, Filter, GlProgram, Sprite, Texture } = this.PIXI;
    const source = terrainTexture?.source?.resource;
    if (!source) return;

    const b = arena.bounds;
    const heatCanvas = document.createElement("canvas");
    heatCanvas.width = Math.max(1, Math.round(b.w));
    heatCanvas.height = Math.max(1, Math.round(b.h));

    const heatCtx = heatCanvas.getContext("2d");
    if (!heatCtx) return;

    // Work on an arena-local copy so the shader's 0..1 UV coordinates map
    // exactly to Windscar's authored heat zones. This also keeps the normal
    // Canvas link untouched and prevents filter-frame sampling artifacts.
    heatCtx.imageSmoothingEnabled = true;
    heatCtx.imageSmoothingQuality = "high";
    heatCtx.drawImage(
      source,
      b.x,
      b.y,
      b.w,
      b.h,
      0,
      0,
      heatCanvas.width,
      heatCanvas.height,
    );

    const heatTexture = Texture.from(heatCanvas);
    const heatSprite = new Sprite(heatTexture);
    heatSprite.position.set(b.x, b.y);
    heatSprite.width = b.w;
    heatSprite.height = b.h;
    heatSprite.alpha = 1;

    const container = new Container();
    container.label = "windscar-heat-shimmer";
    container.eventMode = "none";

    const glProgram = GlProgram.from({
      vertex: WIND_SCAR_HEAT_VERTEX,
      fragment: WIND_SCAR_HEAT_FRAGMENT,
    });

    const heatFilter = new Filter({
      glProgram,
      resources: {
        heatUniforms: {
          uTime: { value: 0, type: "f32" },
          uStrength: { value: 1, type: "f32" },
        },
      },
    });

    heatFilter.padding = 3;
    heatSprite.filters = [heatFilter];

    container.addChild(heatSprite);
    this.app.stage.addChildAt(container, Math.min(1, this.app.stage.children.length));

    this.heatShimmer = {
      container,
      heatSprite,
      heatTexture,
      heatFilter,
    };
  }

  updateHeatShimmer(game) {
    const heat = this.heatShimmer;
    if (!heat || game.arena?.id !== "windscar-proving-grounds") return;

    const t = Number(game.elapsedSeconds) || 0;
    const uniforms = heat.heatFilter.resources.heatUniforms.uniforms;

    uniforms.uTime = t;
    uniforms.uStrength = .78 + Math.sin(t * .74) * .08;
    heat.heatSprite.alpha = 1;
  }

  destroyAtmosphere() {
    if (!this.atmosphere) return;

    const container = this.atmosphere.container;
    if (container?.parent) container.parent.removeChild(container);
    container?.destroy?.({ children: true });
    this.atmosphere = null;
  }

  createAtmosphere(arena) {
    this.destroyAtmosphere();
    if (!arena || !this.PIXI || !this.app) return;

    const { BlurFilter, Container, Graphics } = this.PIXI;
    const container = new Container();
    container.label = "pixi-atmosphere:" + arena.id;
    container.eventMode = "none";

    const softLight = new Graphics();
    const heatCore = new Graphics();
    const hazeVeil = new Graphics();
    const groundDetail = new Graphics();
    const obstacleContact = new Graphics();
    const obstacleBounce = new Graphics();
    const ashDust = new Graphics();
    const particleGlow = new Graphics();
    const particleCore = new Graphics();

    particleGlow.blendMode = "add";
    particleCore.blendMode = "screen";
    particleGlow.filters = [
      new BlurFilter({ strength: arena.id === "windscar-proving-grounds" ? 5 : 3, quality: 2 }),
    ];

    const particles = [];
    const ashParticles = [];
    const random = seededRandom(
      arena.id === "windscar-proving-grounds" ? 0x7a11ce : 0x47a6d,
    );
    const b = arena.bounds;

    if (arena.id === "windscar-proving-grounds") {
      softLight
        .ellipse(215, 128, 82, 42)
        .fill({ color: 0xd75422, alpha: .085 })
        .ellipse(730, 182, 72, 38)
        .fill({ color: 0xc94b20, alpha: .072 })
        .ellipse(1065, 505, 86, 44)
        .fill({ color: 0xe06425, alpha: .085 })
        .ellipse(490, 555, 78, 38)
        .fill({ color: 0xbc431e, alpha: .064 });
      softLight.blendMode = "screen";
      softLight.filters = [new BlurFilter({ strength: 18, quality: 3 })];

      // A tighter warm core gives the hot ground actual depth instead of one
      // broad orange blur. It remains subtle enough not to compete with units.
      heatCore
        .ellipse(215, 128, 45, 20)
        .fill({ color: 0xff7b35, alpha: .105 })
        .ellipse(730, 182, 39, 18)
        .fill({ color: 0xff7130, alpha: .090 })
        .ellipse(1065, 505, 48, 21)
        .fill({ color: 0xff8438, alpha: .110 })
        .ellipse(490, 555, 42, 18)
        .fill({ color: 0xee6c30, alpha: .082 });
      heatCore.blendMode = "add";
      heatCore.filters = [new BlurFilter({ strength: 8, quality: 2 })];

      // A very low-contrast drifting haze gives the arena depth without
      // lowering combat readability. It sits under units and world bars.
      hazeVeil
        .ellipse(b.x + b.w * .28, b.y + b.h * .36, 210, 72)
        .fill({ color: 0x8a624a, alpha: .018 })
        .ellipse(b.x + b.w * .67, b.y + b.h * .58, 245, 82)
        .fill({ color: 0x6f594b, alpha: .015 })
        .ellipse(b.x + b.w * .48, b.y + b.h * .78, 185, 58)
        .fill({ color: 0x9b694c, alpha: .012 });
      hazeVeil.filters = [new BlurFilter({ strength: 26, quality: 2 })];

      // Tiny clinker flecks around the authored hot areas add close-up terrain
      // detail in Pixi only. They are deterministic and never affect collision.
      const heatZones = [
        { x: 215, y: 128, rx: 80, ry: 38 },
        { x: 730, y: 182, rx: 70, ry: 35 },
        { x: 1065, y: 505, rx: 83, ry: 40 },
        { x: 490, y: 555, rx: 74, ry: 34 },
      ];
      for (let i = 0; i < 38; i += 1) {
        const zone = heatZones[i % heatZones.length];
        const angle = random() * Math.PI * 2;
        const distance = Math.sqrt(random());
        const x = zone.x + Math.cos(angle) * zone.rx * distance;
        const y = zone.y + Math.sin(angle) * zone.ry * distance;
        const blocked = arena.obstacles.some(rect =>
          x >= rect.x - 5
          && x <= rect.x + rect.w + 5
          && y >= rect.y - 5
          && y <= rect.y + rect.h + 5
        );
        if (blocked) continue;

        const size = .55 + random() * 1.05;
        const warm = random() > .48;
        groundDetail
          .circle(x, y, size)
          .fill({
            color: warm ? 0xd97838 : 0x2b2825,
            alpha: warm ? .10 + random() * .08 : .085 + random() * .055,
          });
      }

      // Keep obstacle grounding extremely tight. This is contact occlusion,
      // not a second cast shadow, so it cannot recreate the old black clouds.
      for (const rect of arena.obstacles) {
        obstacleContact
          .ellipse(
            rect.x + rect.w * .51,
            rect.y + rect.h + 1.5,
            Math.max(15, rect.w * .24),
            4.5,
          )
          .fill({ color: 0x151210, alpha: .042 });

        obstacleBounce
          .ellipse(
            rect.x + rect.w * .52,
            rect.y + rect.h + 2,
            Math.max(18, rect.w * .36),
            8,
          )
          .fill({ color: 0xd06a38, alpha: .030 });
      }
      obstacleContact.filters = [new BlurFilter({ strength: 4, quality: 2 })];
      obstacleBounce.blendMode = "screen";
      obstacleBounce.filters = [new BlurFilter({ strength: 9, quality: 2 })];

      // Bright embers stay sparse and readable; ash uses its own slower,
      // darker layer so the arena gains atmosphere rather than visual noise.
      for (let i = 0; i < 28; i += 1) {
        particles.push({
          x: b.x + 26 + random() * (b.w - 52),
          y: b.y + 18 + random() * (b.h - 36),
          speed: 4 + random() * 8,
          drift: 5 + random() * 13,
          phase: random() * Math.PI * 2,
          size: .65 + random() * 1.20,
          alpha: .16 + random() * .28,
          color: random() > .30 ? 0xff7a32 : 0xe2a05e,
        });
      }

      for (let i = 0; i < 18; i += 1) {
        ashParticles.push({
          x: b.x + 24 + random() * (b.w - 48),
          y: b.y + 20 + random() * (b.h - 40),
          speed: 1.1 + random() * 2.5,
          drift: 2 + random() * 5,
          phase: random() * Math.PI * 2,
          size: .55 + random() * .85,
          alpha: .035 + random() * .065,
          color: random() > .42 ? 0x9b8d80 : 0x665d56,
        });
      }
    } else if (arena.id === "four-pillar-ring") {
      softLight
        .ellipse(250, 170, 155, 58)
        .fill({ color: 0xd6d29a, alpha: .045 })
        .ellipse(670, 155, 175, 62)
        .fill({ color: 0xe2d7a0, alpha: .038 })
        .ellipse(980, 470, 145, 54)
        .fill({ color: 0xc7d49a, alpha: .042 })
        .ellipse(520, 520, 165, 56)
        .fill({ color: 0xd8cc8d, alpha: .034 });
      softLight.blendMode = "screen";
      softLight.filters = [new BlurFilter({ strength: 28, quality: 3 })];

      for (let i = 0; i < 24; i += 1) {
        particles.push({
          x: b.x + 28 + random() * (b.w - 56),
          y: b.y + 24 + random() * (b.h - 48),
          speed: 1.6 + random() * 3.5,
          drift: 6 + random() * 16,
          phase: random() * Math.PI * 2,
          size: .55 + random() * .9,
          alpha: .10 + random() * .18,
          color: random() > .48 ? 0xd7c982 : 0xbfc78c,
        });
      }
    }

    container.addChild(
      softLight,
      heatCore,
      hazeVeil,
      groundDetail,
      obstacleContact,
      obstacleBounce,
      ashDust,
      particleGlow,
      particleCore,
    );
    this.app.stage.addChildAt(container, Math.min(2, this.app.stage.children.length));

    this.atmosphere = {
      arenaId: arena.id,
      bounds: arena.bounds,
      container,
      softLight,
      heatCore,
      hazeVeil,
      groundDetail,
      obstacleContact,
      obstacleBounce,
      ashDust,
      particleGlow,
      particleCore,
      particles,
      ashParticles,
    };
  }

  updateAtmosphere(game) {
    const atmosphere = this.atmosphere;
    if (!atmosphere || atmosphere.arenaId !== game.arena?.id) return;

    const t = Number(game.elapsedSeconds) || 0;
    const b = atmosphere.bounds;
    const spanY = Math.max(1, b.h - 28);
    const glow = atmosphere.particleGlow;
    const core = atmosphere.particleCore;
    const ash = atmosphere.ashDust;

    glow.clear();
    core.clear();
    ash.clear();

    if (atmosphere.arenaId === "windscar-proving-grounds") {
      atmosphere.softLight.alpha = .76 + Math.sin(t * 1.15) * .055;
      atmosphere.heatCore.alpha = .82 + Math.sin(t * 1.55) * .075;
      atmosphere.obstacleBounce.alpha = .88 + Math.sin(t * .72) * .035;
      atmosphere.hazeVeil.position.set(
        Math.sin(t * .055) * 3.2,
        Math.cos(t * .043) * 1.6,
      );

      for (const dust of atmosphere.ashParticles) {
        const x = b.x + 14 + (
          ((dust.x - b.x - 14 + t * dust.speed) % (b.w - 28) + (b.w - 28))
          % (b.w - 28)
        );
        const y = dust.y + Math.sin(t * .24 + dust.phase) * dust.drift;
        const fade = .72 + Math.sin(t * .48 + dust.phase) * .28;

        ash
          .ellipse(x, y, dust.size * 1.45, dust.size * .58)
          .fill({
            color: dust.color,
            alpha: dust.alpha * fade,
          });
      }

      for (const particle of atmosphere.particles) {
        const wrapped = ((particle.y - b.y - 14 - t * particle.speed) % spanY + spanY) % spanY;
        const y = b.y + 14 + wrapped;
        const x = particle.x
          + Math.sin(t * .75 + particle.phase) * particle.drift;
        const pulse = .72 + Math.sin(t * 2.2 + particle.phase) * .28;
        const alpha = particle.alpha * pulse;

        glow
          .circle(x, y, particle.size * 3.1)
          .fill({ color: particle.color, alpha: alpha * .26 });
        core
          .circle(x, y, particle.size)
          .fill({ color: particle.color, alpha });
      }
      return;
    }

    if (atmosphere.arenaId === "four-pillar-ring") {
      atmosphere.softLight.alpha = .78 + Math.sin(t * .28) * .07;

      for (const particle of atmosphere.particles) {
        const x = b.x + 18 + (
          ((particle.x - b.x - 18 + t * particle.speed) % (b.w - 36) + (b.w - 36))
          % (b.w - 36)
        );
        const y = particle.y
          + Math.sin(t * .42 + particle.phase) * particle.drift;
        const pulse = .70 + Math.sin(t * 1.1 + particle.phase) * .30;
        const alpha = particle.alpha * pulse;

        glow
          .circle(x, y, particle.size * 2.7)
          .fill({ color: particle.color, alpha: alpha * .18 });
        core
          .circle(x, y, particle.size)
          .fill({ color: particle.color, alpha });
      }
    }
  }

  createActorView(actor) {
    const { Container, Graphics, Sprite, Text } = this.PIXI;
    const root = new Container();
    root.label = "actor:" + actor.id;

    const shadow = new Graphics()
      .ellipse(0, actor.radius * .58, actor.radius * .92, actor.radius * .34)
      .fill({ color: 0x000000, alpha: .28 });
    root.addChild(shadow);

    const teamColor = actor.team === "friendly" ? 0x55c878 : 0xd45a5a;

    const ringGlow = new Graphics();
    if (this.livingCircleUnits) {
      drawLivingBodyShape(
        ringGlow,
        actor,
        {
          mode:"idle",
          dirX:Math.cos(actor.facing || 0),
          dirY:Math.sin(actor.facing || 0),
          intensity:0,
        },
        0,
        { glow:true },
      );
      ringGlow.blendMode = "screen";
      ringGlow.filters = [
        new this.PIXI.BlurFilter({ strength: 4.2, quality: 1 }),
      ];
    } else {
      ringGlow.visible = false;
    }
    root.addChild(ringGlow);

    const ring = new Graphics()
      .circle(0, 0, actor.radius + 3)
      .stroke({ color: teamColor, width: 2, alpha: .72 });
    root.addChild(ring);

    const classIdentityFx = new Graphics();
    classIdentityFx.visible = false;
    classIdentityFx.blendMode = "screen";
    root.addChild(classIdentityFx);

    const livingRingAccentFx = new Graphics();
    livingRingAccentFx.visible = false;
    livingRingAccentFx.blendMode = "screen";
    root.addChild(livingRingAccentFx);

    const texture = this.iconTextures.get(actor.classId);
    let body;
    let motionGhostA = null;
    let motionGhostB = null;

    if (this.livingCircleUnits) {
      // No replacement "body": the old team ring itself is the living unit.
      // The center stays fully transparent.
      body = ring;

      motionGhostB = new Graphics()
        .circle(0,0,actor.radius+3)
        .stroke({ color:teamColor, width:1.4, alpha:.28 });
      motionGhostB.alpha = 0;
      motionGhostB.visible = false;
      motionGhostB.blendMode = "screen";
      root.addChild(motionGhostB);

      motionGhostA = new Graphics()
        .circle(0,0,actor.radius+3)
        .stroke({ color:teamColor, width:1.6, alpha:.38 });
      motionGhostA.alpha = 0;
      motionGhostA.visible = false;
      motionGhostA.blendMode = "screen";
      root.addChild(motionGhostA);
    } else if (texture) {
      motionGhostB = new Sprite(texture);
      motionGhostB.anchor.set(.5);
      motionGhostB.width = actor.radius * 2.18;
      motionGhostB.height = actor.radius * 2.18;
      motionGhostB.alpha = 0;
      motionGhostB.visible = false;
      motionGhostB.blendMode = "screen";
      root.addChild(motionGhostB);

      motionGhostA = new Sprite(texture);
      motionGhostA.anchor.set(.5);
      motionGhostA.width = actor.radius * 2.18;
      motionGhostA.height = actor.radius * 2.18;
      motionGhostA.alpha = 0;
      motionGhostA.visible = false;
      motionGhostA.blendMode = "screen";
      root.addChild(motionGhostA);

      body = new Sprite(texture);
      body.anchor.set(.5);
      body.width = actor.radius * 2.18;
      body.height = actor.radius * 2.18;
    } else {
      body = new Graphics()
        .circle(0, 0, actor.radius)
        .fill(hexNumber(classColorFor(actor), 0x888888));
    }
    if (body !== ring) root.addChild(body);

    const actorMotionFx = new Graphics();
    actorMotionFx.visible = false;
    actorMotionFx.blendMode = "screen";
    root.addChild(actorMotionFx);

    const stateWorldGlowFx = new Graphics();
    stateWorldGlowFx.visible = false;
    root.addChild(stateWorldGlowFx);

    const stateWorldFx = new Graphics();
    stateWorldFx.visible = false;
    root.addChild(stateWorldFx);

    const secondaryGlowFx = new Graphics();
    secondaryGlowFx.visible = false;
    root.addChild(secondaryGlowFx);

    const secondaryFx = new Graphics();
    secondaryFx.visible = false;
    root.addChild(secondaryFx);

    const ccWorldGlowFx = new Graphics();
    ccWorldGlowFx.visible = false;
    root.addChild(ccWorldGlowFx);

    const ccWorldFx = new Graphics();
    ccWorldFx.visible = false;
    root.addChild(ccWorldFx);

    const castWindupFx = new Graphics();
    castWindupFx.visible = false;
    castWindupFx.blendMode = "screen";
    root.addChild(castWindupFx);

    // Native Pixi burst preview lives inside the already-stable actor tree.
    // No extra stage container or filter is used in this migration step.
    const burstFx = new Graphics();
    burstFx.visible = false;
    burstFx.blendMode = "screen";
    root.addChild(burstFx);

    const slashFx = new Graphics();
    slashFx.visible = false;
    slashFx.blendMode = "screen";
    root.addChild(slashFx);

    const ringFx = new Graphics();
    ringFx.visible = false;
    ringFx.blendMode = "screen";
    root.addChild(ringFx);

    const beamFx = new Graphics();
    beamFx.visible = false;
    beamFx.blendMode = "screen";
    root.addChild(beamFx);

    const chainGlowFx = new Graphics();
    chainGlowFx.visible = false;
    root.addChild(chainGlowFx);

    const chainFx = new Graphics();
    chainFx.visible = false;
    root.addChild(chainFx);

    const chainSparkFx = new Graphics();
    chainSparkFx.visible = false;
    root.addChild(chainSparkFx);

    const priestHealSpellFx = new Graphics();
    priestHealSpellFx.visible = false;
    priestHealSpellFx.blendMode = "screen";
    root.addChild(priestHealSpellFx);

    const priestDruidSpellFx = new Graphics();
    priestDruidSpellFx.visible = false;
    priestDruidSpellFx.blendMode = "screen";
    root.addChild(priestDruidSpellFx);

    const paladinDkSpellFx = new Graphics();
    paladinDkSpellFx.visible = false;
    paladinDkSpellFx.blendMode = "screen";
    root.addChild(paladinDkSpellFx);

    const warriorRogueSpellFx = new Graphics();
    warriorRogueSpellFx.visible = false;
    warriorRogueSpellFx.blendMode = "screen";
    root.addChild(warriorRogueSpellFx);

    const commonCasterSpellFx = new Graphics();
    commonCasterSpellFx.visible = false;
    commonCasterSpellFx.blendMode = "screen";
    root.addChild(commonCasterSpellFx);

    const combatVfx2GlowFx = new Graphics();
    combatVfx2GlowFx.visible = false;
    root.addChild(combatVfx2GlowFx);

    const combatVfx2CoreFx = new Graphics();
    combatVfx2CoreFx.visible = false;
    root.addChild(combatVfx2CoreFx);

    const projectileVfx2GlowFx = new Graphics();
    projectileVfx2GlowFx.visible = false;
    root.addChild(projectileVfx2GlowFx);

    const projectileVfx2CoreFx = new Graphics();
    projectileVfx2CoreFx.visible = false;
    root.addChild(projectileVfx2CoreFx);

    const spellPolishGlowFx = new Graphics();
    spellPolishGlowFx.visible = false;
    root.addChild(spellPolishGlowFx);

    const spellPolishCoreFx = new Graphics();
    spellPolishCoreFx.visible = false;
    root.addChild(spellPolishCoreFx);

    // Babylon-only 2.5D cover. This sits above the actor body/world VFX but
    // below selection rings and UI, so geometry can hide the character without
    // sacrificing targeting, names, bars or CC readability.
    const depthOcclusionFx = new Graphics();
    depthOcclusionFx.visible = false;
    root.addChild(depthOcclusionFx);

    const { BlurFilter } = this.PIXI;

    stateWorldGlowFx.blendMode = "screen";
    stateWorldGlowFx.filters = [
      new BlurFilter({ strength: 5.2, quality: 1 }),
    ];
    stateWorldFx.blendMode = "screen";

    secondaryGlowFx.blendMode = "screen";
    secondaryGlowFx.filters = [
      new BlurFilter({ strength: 5.8, quality: 1 }),
    ];
    secondaryFx.blendMode = "screen";

    ccWorldGlowFx.blendMode = "screen";
    ccWorldGlowFx.filters = [
      new BlurFilter({ strength: 5.4, quality: 1 }),
    ];
    ccWorldFx.blendMode = "screen";

    combatVfx2GlowFx.blendMode = "screen";
    combatVfx2GlowFx.filters = [
      new BlurFilter({ strength: 6.4, quality: 1 }),
    ];
    combatVfx2CoreFx.blendMode = "screen";

    projectileVfx2GlowFx.blendMode = "screen";
    projectileVfx2GlowFx.filters = [
      new BlurFilter({ strength: 7.0, quality: 1 }),
    ];
    projectileVfx2CoreFx.blendMode = "screen";

    // Broad, soft halos keep spell silhouettes visible over detailed arena art.
    // Quality stays at 1 so the extra punch does not undo Pixi's performance win.
    spellPolishGlowFx.blendMode = "screen";
    spellPolishGlowFx.filters = [
      new BlurFilter({ strength: 5.8, quality: 1 }),
    ];
    spellPolishCoreFx.blendMode = "screen";

    // Chain Lightning keeps its bespoke geometry; only the surrounding energy
    // halo is widened by this global combat-pop pass.
    chainGlowFx.blendMode = "screen";
    chainGlowFx.filters = [new BlurFilter({ strength: 6.6, quality: 1 })];
    chainFx.blendMode = "screen";
    chainSparkFx.blendMode = "screen";

    const playerGlow = new Graphics()
      .circle(0, 0, actor.radius + 8)
      .stroke({ color: 0x78dce8, width: 7, alpha: .26 });
    playerGlow.blendMode = "screen";
    playerGlow.filters = [new BlurFilter({ strength: 5, quality: 2 })];
    playerGlow.visible = false;
    root.addChild(playerGlow);

    const playerRing = new Graphics()
      .circle(0, 0, actor.radius + 7)
      .stroke({ color: 0x92e9ef, width: 2.2, alpha: .82 });
    playerRing.visible = false;
    root.addChild(playerRing);

    const targetGlow = new Graphics()
      .circle(0, 0, actor.radius + 9)
      .stroke({ color: 0xff0000, width: 8, alpha: .28 });
    targetGlow.blendMode = "screen";
    targetGlow.filters = [new BlurFilter({ strength: 6, quality: 2 })];
    targetGlow.visible = false;
    root.addChild(targetGlow);

    const targetRing = new Graphics()
      .circle(0, 0, actor.radius + 8)
      .stroke({ color: 0xff2b2b, width: 3, alpha: .92 });
    targetRing.visible = false;
    root.addChild(targetRing);

    const targetMarkerGlow = new Graphics();
    targetMarkerGlow.visible = false;
    targetMarkerGlow.blendMode = "screen";
    targetMarkerGlow.filters = [new BlurFilter({ strength: 5, quality: 1 })];
    root.addChild(targetMarkerGlow);

    const targetMarker = new Graphics();
    targetMarker.visible = false;
    root.addChild(targetMarker);

    const name = new Text({
      text: actor.name,
      style: {
        fontFamily: "system-ui",
        fontSize: 12,
        fontWeight: "800",
        fill: actor.team === "friendly" ? "#f1e8d8" : "#ff786d",
        stroke: { color: "#120e0b", width: 3 },
      },
    });
    name.anchor.set(.5);
    name.position.set(0, -actor.radius - 36);
    root.addChild(name);

    const healthBg = new Graphics()
      .rect(0, 0, 80, 9)
      .fill({ color: 0x0b0806, alpha: .95 });
    healthBg.position.set(-40, -actor.radius - 24);
    root.addChild(healthBg);

    const healthFill = new Graphics()
      .rect(0, 0, 78, 7)
      .fill(hexNumber(classColorFor(actor), 0x8da66c));
    healthFill.position.set(-39, -actor.radius - 23);
    root.addChild(healthFill);

    const resourceBg = new Graphics()
      .rect(0, 0, 80, 6)
      .fill({ color: 0x090807, alpha: .92 });
    resourceBg.position.set(-40, -actor.radius - 12);
    root.addChild(resourceBg);

    const resourceFill = new Graphics()
      .rect(0, 0, 78, 4)
      .fill(resourceColor(actor.resource?.type));
    resourceFill.position.set(-39, -actor.radius - 11);
    root.addChild(resourceFill);

    const castBg = new Graphics()
      .rect(0, 0, 86, 8)
      .fill({ color: 0x0b0806, alpha: .95 });
    castBg.position.set(-43, -actor.radius - 49);
    castBg.visible = false;
    root.addChild(castBg);

    const castFill = new Graphics()
      .rect(0, 0, 84, 6)
      .fill(0xc9a36a);
    castFill.position.set(-42, -actor.radius - 48);
    castFill.visible = false;
    root.addChild(castFill);

    const castBorder = new Graphics()
      .rect(0, 0, 86, 8)
      .stroke({ color: 0xd6c69e, width: 1, alpha: 1 });
    castBorder.position.set(-43, -actor.radius - 49);
    castBorder.visible = false;
    root.addChild(castBorder);

    const ccBadge = new Container();
    ccBadge.label = "cc-badge:" + actor.id;
    ccBadge.visible = false;

    const ccBadgeGlow = new Graphics();
    ccBadgeGlow.blendMode = "screen";
    ccBadgeGlow.filters = [new BlurFilter({ strength: 4.5, quality: 1 })];
    ccBadge.addChild(ccBadgeGlow);

    const ccBadgeBg = new Graphics();
    ccBadge.addChild(ccBadgeBg);

    const ccBadgeGlyph = new Graphics();
    ccBadge.addChild(ccBadgeGlyph);

    const ccBadgeTimer = new Text({
      text: "",
      style: {
        fontFamily: "system-ui",
        fontSize: 10,
        fontWeight: "900",
        fill: "#f4eadc",
        stroke: { color: "#080605", width: 3 },
      },
    });
    ccBadgeTimer.anchor.set(.5);
    ccBadgeTimer.position.set(0, 10.5);
    ccBadge.addChild(ccBadgeTimer);

    // Added last so it always sits above spells, actor motion and target rings.
    root.addChild(ccBadge);

    this.app.stage.addChild(root);

    const view = {
      root,
      shadow,
      ringGlow,
      ring,
      classIdentityFx,
      livingRingAccentFx,
      body,
      livingCircleUnits: this.livingCircleUnits,
      bodyBaseScaleX: body.scale.x,
      bodyBaseScaleY: body.scale.y,
      motionGhostA,
      motionGhostB,
      ghostBaseScaleX: motionGhostA?.scale.x || 1,
      ghostBaseScaleY: motionGhostA?.scale.y || 1,
      actorMotionFx,
      stateWorldGlowFx,
      stateWorldFx,
      secondaryGlowFx,
      secondaryFx,
      ccWorldGlowFx,
      ccWorldFx,
      ccBadge,
      ccBadgeGlow,
      ccBadgeBg,
      ccBadgeGlyph,
      ccBadgeTimer,
      ccBadgeKind: null,
      ccBadgeSpellId: null,
      ccTransition: {
        lastKind: null,
        lastSpellId: null,
        exit: null,
      },
      motion: {
        previousAlive: actor.alive,
        previousHealth: actor.health,
        previousX: actor.x,
        previousY: actor.y,
        lastActionEffectId: null,
        action: null,
        hitStartMs: -1,
        hitDurationMs: 0,
        hitPower: 0,
        hitDirX: 0,
        hitDirY: 0,
        hitCrit: false,
        deathStartedMs: null,
      },
      name,
      castWindupFx,
      burstFx,
      slashFx,
      ringFx,
      beamFx,
      chainGlowFx,
      chainFx,
      chainSparkFx,
      priestHealSpellFx,
      priestDruidSpellFx,
      paladinDkSpellFx,
      warriorRogueSpellFx,
      commonCasterSpellFx,
      combatVfx2GlowFx,
      combatVfx2CoreFx,
      projectileVfx2GlowFx,
      projectileVfx2CoreFx,
      spellPolishGlowFx,
      spellPolishCoreFx,
      depthOcclusionFx,
      playerGlow,
      playerRing,
      targetGlow,
      targetRing,
      targetMarkerGlow,
      targetMarker,
      targetVariant: null,
      healthBg,
      healthFill,
      resourceBg,
      resourceFill,
      castBg,
      castFill,
      castBorder,
      castSpellId: null,
      visualSignature: actorVisualSignature(actor),
    };
    this.actorViews.set(actor.id, view);
    return view;
  }

  updateActorView(view, actor, game) {
    view.root.visible = actor.alive;
    if (!actor.alive) return;

    view.root.position.set(actor.x, actor.y);
    if (view.name.text !== actor.name) view.name.text = actor.name;

    const isPlayer = actor.id === game.player?.id;
    const selected = game.player?.targetId === actor.id;

    const targetFriendly = actor.team === game.player?.team;
    const targetVariant = targetFriendly ? "friendly" : "enemy";

    if (view.targetVariant !== targetVariant) {
      const ringColor = targetFriendly ? 0x4dff88 : 0xff2b2b;
      const glowColor = targetFriendly ? 0x00e866 : 0xff0000;

      view.targetGlow.clear()
        .circle(0, 0, actor.radius + 9)
        .stroke({ color: glowColor, width: 8, alpha: .28 });

      view.targetRing.clear()
        .circle(0, 0, actor.radius + 8)
        .stroke({ color: ringColor, width: 3, alpha: .92 });

      const markerColor = ringColor;
      const markerGlow = glowColor;
      const markerBacking = targetFriendly ? 0x001e0c : 0x1e0000;
      const markerSize = 12.5;

      view.targetMarkerGlow.clear()
        .circle(0, 0, markerSize * 1.12)
        .stroke({
          color: markerGlow,
          width: 6.5,
          alpha: .42,
        });

      view.targetMarker.clear()
        .circle(0, 0, markerSize * 1.18)
        .fill({
          color: markerBacking,
          alpha: .82,
        })
        .circle(0, 0, markerSize * 1.12)
        .stroke({
          color: markerGlow,
          width: 3.2,
          alpha: .74,
        })
        .moveTo(0, -markerSize * .55)
        .lineTo(markerSize * .45, 0)
        .lineTo(0, markerSize * .55)
        .lineTo(-markerSize * .45, 0)
        .lineTo(0, -markerSize * .55)
        .stroke({
          color: markerColor,
          width: 3,
          alpha: .96,
        })
        .moveTo(-markerSize * .95, -markerSize * .75)
        .lineTo(-markerSize * .55, -markerSize * .75)
        .lineTo(-markerSize * .55, -markerSize * .35)
        .moveTo(markerSize * .95, -markerSize * .75)
        .lineTo(markerSize * .55, -markerSize * .75)
        .lineTo(markerSize * .55, -markerSize * .35)
        .moveTo(-markerSize * .95, markerSize * .75)
        .lineTo(-markerSize * .55, markerSize * .75)
        .lineTo(-markerSize * .55, markerSize * .35)
        .moveTo(markerSize * .95, markerSize * .75)
        .lineTo(markerSize * .55, markerSize * .75)
        .lineTo(markerSize * .55, markerSize * .35)
        .stroke({
          color: markerColor,
          width: 3,
          alpha: .96,
        })
        .circle(0, 0, markerSize * .24)
        .fill({
          color: markerColor,
          alpha: .54,
        });

      view.targetVariant = targetVariant;
    }

    view.playerGlow.visible = isPlayer;
    view.playerRing.visible = isPlayer;
    view.targetGlow.visible = selected && !isPlayer;
    view.targetRing.visible = selected && !isPlayer;
    view.targetMarkerGlow.visible = selected && !isPlayer;
    view.targetMarker.visible = selected && !isPlayer;

    if (isPlayer) {
      const playerPulse = 1 + Math.sin(game.elapsedSeconds * 3.4) * .025;
      view.playerGlow.scale.set(playerPulse);
    } else {
      view.playerGlow.scale.set(1);
    }

    if (selected && !isPlayer) {
      const pulse = 1 + Math.sin(game.elapsedSeconds * 8) * .045;
      const glowPulse = 1 + Math.sin(game.elapsedSeconds * 5.6) * .075;
      const markerPulse = .5 + .5 * Math.sin(game.elapsedSeconds * 7);
      const markerScale = 1 + markerPulse * .144;

      view.targetRing.scale.set(pulse);
      view.targetGlow.scale.set(glowPulse);
      view.targetMarker.scale.set(markerScale);
      view.targetMarkerGlow.scale.set(markerScale);

      const ccKinds = new Set(["stun", "fear", "incapacitate", "root", "schoolLock"]);
      const hasCrowdControl = actor.effects.some(effect =>
        effect.remainingMs > 0 && ccKinds.has(effect.kind)
      );
      const markerWorldY = Math.max(
        18,
        actor.y - actor.radius - (hasCrowdControl ? 118 : 72),
      );
      const markerLocalY = markerWorldY - actor.y;

      view.targetMarker.position.set(0, markerLocalY);
      view.targetMarkerGlow.position.set(0, markerLocalY);
      view.targetMarkerGlow.alpha = .78 + markerPulse * .18;
      view.targetMarker.alpha = .94 + markerPulse * .06;
    } else {
      view.targetRing.scale.set(1);
      view.targetGlow.scale.set(1);
      view.targetMarker.scale.set(1);
      view.targetMarkerGlow.scale.set(1);
      view.targetMarkerGlow.alpha = 1;
      view.targetMarker.alpha = 1;
    }

    // Match current Canvas behavior: the player's own world bars stay hidden.
    const showBars = !isPlayer;
    view.name.visible = true;
    view.healthBg.visible = showBars;
    view.healthFill.visible = showBars;
    view.resourceBg.visible = showBars && actor.resource?.max > 0;
    view.resourceFill.visible = showBars && actor.resource?.max > 0;

    view.healthFill.scale.x = Math.max(0, Math.min(1, actor.healthPct));
    view.resourceFill.scale.x = Math.max(0, Math.min(1, actor.resourcePct));

    const casting = Boolean(actor.cast) && !isPlayer;
    view.castBg.visible = casting;
    view.castFill.visible = casting;
    view.castBorder.visible = casting;

    if (casting) {
      const progress = 1 - actor.cast.remainingMs / Math.max(1, actor.cast.totalMs);
      view.castFill.scale.x = Math.max(0, Math.min(1, progress));

      const spellId = actor.cast.spellId;
      if (view.castSpellId !== spellId) {
        const palette = castBarPaletteFor(actor, {
          start: "#c9a36a",
          end: "#d8ba80",
          glow: "#c9a36a",
          border: "#d6c69e",
        });
        const spell = actor.getSpell(spellId);
        const uninterruptible = spell?.interruptible === false;

        view.castFill.clear()
          .rect(0, 0, 84, 6)
          .fill(hexNumber(palette.start, 0xc9a36a));

        view.castBorder.clear()
          .rect(0, 0, 86, 8)
          .stroke({
            color: hexNumber(
              uninterruptible ? "#e7bd63" : palette.border,
              0xd6c69e,
            ),
            width: uninterruptible ? 1.8 : 1,
            alpha: 1,
          });

        view.castSpellId = spellId;
      }
    } else {
      view.castSpellId = null;
    }
  }

  updatePersistentCombatStateVfx(game) {
    const time = Number(game.elapsedSeconds) || 0;

    const arc = (g,cx,cy,radius,start,end,style,segments=7) => {
      for(let i=0;i<=segments;i++){
        const t=i/segments;
        const a=start+(end-start)*t;
        const x=cx+Math.cos(a)*radius;
        const y=cy+Math.sin(a)*radius;
        if(i===0) g.moveTo(x,y); else g.lineTo(x,y);
      }
      g.stroke(style);
    };


    for (const actor of game.actors || []) {
      const view=this.actorViews.get(actor.id);
      if(!view) continue;

      const glow=view.stateWorldGlowFx;
      const core=view.stateWorldFx;
      glow.clear();
      core.clear();
      glow.visible=false;
      core.visible=false;

      if(!actor.alive) continue;

      const active=(actor.effects || []).filter(effect=>effect.remainingMs>0);
      const burst=active.find(effect=>effect.kind==="offensiveCooldown");
      const defensive=active.find(effect=>effect.kind==="damageReduction");
      const slow=active.find(effect=>effect.kind==="slow");
      const mortal=active.find(effect=>effect.kind==="healingReduction");

      if(!burst && !defensive && !slow && !mortal) continue;
      glow.visible=true;
      core.visible=true;

      if(burst){
        const profile=spellPolishProfile(burst.spellId,burst.visualStyle);
        const life=Math.max(0,Math.min(1,burst.remainingMs/Math.max(1,burst.durationMs||2400)));
        const pulse=.5+.5*Math.sin(time*9.2+actor.x*.01);
        const r=actor.radius+11+pulse*2;

        glow.circle(0,0,r+5).stroke({
          color:profile.main,width:8,alpha:.10+.04*pulse
        });

        if(burst.spellId==="mage-pyroblast"){
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+time*.35;
            const inner=actor.radius+5;
            const outer=actor.radius+15+(i%3)*4+pulse*3;
            core
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a+.12)*outer,Math.sin(a+.12)*outer-3)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:1.7+(i%2)*.4,
                alpha:.42+.16*pulse,
              });
          }
        } else if(burst.spellId==="warlock-chaos-bolt"){
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2-time*.22;
            const outer=actor.radius+18+(i%2)*5;
            const mid=actor.radius+10;
            const inner=actor.radius+4;
            core
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(a+.30)*mid,Math.sin(a+.30)*mid)
              .lineTo(Math.cos(a+.62)*inner,Math.sin(a+.62)*inner)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:1.8,alpha:.52,
              });
          }
        } else if(burst.spellId==="shaman-lava-burst"){
          for(let i=0;i<9;i++){
            const a=i/9*Math.PI*2+time*.50;
            const rr=actor.radius+9+(i%4)*4;
            core.circle(
              Math.cos(a)*rr,
              Math.sin(a)*rr-pulse*2,
              1.4+(i%3)*.45
            ).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:.52,
            });
          }
        } else if(burst.spellId==="warrior-slam"){
          for(let i=0;i<6;i++){
            const a=-.35+i*Math.PI/5;
            core
              .moveTo(Math.cos(a)*(actor.radius+3),actor.radius*.55)
              .lineTo(
                Math.cos(a)*(actor.radius+15+(i%3)*4),
                actor.radius*.55+Math.sin(a)*8
              )
              .stroke({
                color:i%2?profile.core:profile.main,
                width:1.8,alpha:.48,
              });
          }
        } else if(burst.spellId==="rogue-eviscerate"){
          for(let i=0;i<3;i++){
            const a=-.85+i*.85+Math.sin(time*2+i)*.08;
            arc(core,0,0,actor.radius+10+i*4,a,a+.72,{
              color:i===1?profile.core:profile.main,
              width:2,alpha:.50,
            },6);
          }
        } else if(burst.spellId==="dk-obliterate"){
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2;
            core
              .moveTo(
                Math.cos(a)*(actor.radius+4),
                Math.sin(a)*(actor.radius+4)
              )
              .lineTo(
                Math.cos(a)*(actor.radius+15+(i%3)*4),
                Math.sin(a)*(actor.radius+15+(i%3)*4)
              )
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:1.7,alpha:.54,
              });
          }
        } else {
          core.circle(0,0,r).stroke({
            color:profile.main,width:2,alpha:.50
          });
        }

        core.circle(0,0,actor.radius+7).stroke({
          color:profile.core,width:1.2,alpha:.28+.14*(1-life)
        });
      }

      if(defensive){
        const profile=spellPolishProfile(defensive.spellId,defensive.visualStyle);
        const pulse=.5+.5*Math.sin(time*5.4+actor.y*.015);
        const r=actor.radius+8;

        if(defensive.spellId==="druid-ironbark"){
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2;
            const rr=r+3+(i%2)*3;
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr;
            core
              .moveTo(x-4,y-7)
              .lineTo(x+5,y-5)
              .lineTo(x+6,y+6)
              .lineTo(x-4,y+8)
              .lineTo(x-4,y-7)
              .stroke({
                color:profile.accent,width:2.8,alpha:.54+.08*pulse
              });
          }
        } else if(defensive.spellId==="paladin-blessing"){
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+time*.10;
            const rr=r+4;
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr;
            core
              .moveTo(x,y-6)
              .lineTo(x+5,y)
              .lineTo(x,y+7)
              .lineTo(x-5,y)
              .lineTo(x,y-6)
              .stroke({
                color:profile.main,width:2.2,alpha:.60
              });
          }
        } else if(defensive.spellId==="shaman-astral-shift"){
          const colors=[profile.main,profile.core,profile.accent];
          for(let i=0;i<3;i++){
            const a=time*(i%2?.75:-.65)+i*Math.PI*2/3;
            const rr=r+4+i*4;
            core.circle(Math.cos(a)*rr,Math.sin(a)*rr,2.5).fill({
              color:colors[i],alpha:.62
            });
          }
        } else if(defensive.spellId==="warlock-resolve"){
          for(let i=0;i<5;i++){
            const a=i/5*Math.PI*2-time*.12;
            core
              .moveTo(Math.cos(a)*(r+8),Math.sin(a)*(r+8))
              .lineTo(Math.cos(a+.44)*r,Math.sin(a+.44)*r)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:2.1,alpha:.55,
              });
          }
        } else if(defensive.spellId==="dk-rune-tap"){
          const rot=-time*.15;
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+rot;
            const outer=r+8, inner=r-1;
            core
              .moveTo(Math.cos(a-.18)*inner,Math.sin(a-.18)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(a+.18)*inner,Math.sin(a+.18)*inner)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:2,alpha:.56,
              });
          }
        } else {
          // Pain Suppression / fallback: segmented ward shield.
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+.18;
            arc(core,0,0,r+4,a,a+.95,{
              color:i%2?profile.core:profile.main,
              width:2.2,alpha:.58,
            },6);
          }
        }

        glow.circle(0,0,r+6).stroke({
          color:profile.main,width:8,alpha:.09+.025*pulse
        });
      }

      if(slow){
        const spellId=slow.spellId || "";
        let main=0x76c5df, coreColor=0xe4f8ff;
        if(spellId==="warlock-shadow-bolt"){
          main=0x9669c8; coreColor=0xe0c9f4;
        } else if(spellId==="shaman-chain-lightning"){
          main=0x63c7dd; coreColor=0xecfeff;
        }

        const pulse=.5+.5*Math.sin(time*6.2);
        core.ellipse(0,actor.radius*.63,actor.radius+7,5.2).stroke({
          color:main,width:1.6,alpha:.42
        });

        if(spellId==="mage-frostbolt"){
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2;
            core
              .moveTo(
                Math.cos(a)*(actor.radius-1),
                actor.radius*.58+Math.sin(a)*3
              )
              .lineTo(
                Math.cos(a)*(actor.radius+7+pulse*2),
                actor.radius*.58+Math.sin(a)*6
              )
              .stroke({
                color:i%2?coreColor:main,width:1.3,alpha:.45
              });
          }
        } else if(spellId==="warlock-shadow-bolt"){
          for(let i=0;i<4;i++){
            const a=i/4*Math.PI*2+time*.22;
            arc(core,0,actor.radius*.44,actor.radius+6+(i%2)*3,a,a+.62,{
              color:i%2?coreColor:main,width:1.3,alpha:.38
            },5);
          }
        } else {
          for(let i=0;i<4;i++){
            const a=i/4*Math.PI*2+time*.45;
            const rr=actor.radius+6;
            core.circle(Math.cos(a)*rr,actor.radius*.50+Math.sin(a)*4,1.3).fill({
              color:i%2?coreColor:main,alpha:.48
            });
          }
        }

        glow.ellipse(0,actor.radius*.63,actor.radius+9,7).stroke({
          color:main,width:6,alpha:.07
        });
      }

      if(mortal){
        const pulse=.5+.5*Math.sin(time*4.8+actor.x*.01);
        const main=0xc6544e, coreColor=0xf0b1a6;
        const r=actor.radius+10;

        // Broken crimson wound-ring: readable as a debuff without looking like CC.
        for(let seg=0;seg<4;seg++){
          const a0=seg*Math.PI/2+.12;
          arc(core,0,0,r,a0,a0+.78,{
            color:seg%2?coreColor:main,width:2,alpha:.48+.10*pulse
          },6);
        }
        core
          .moveTo(-7,-4)
          .lineTo(-1,2)
          .lineTo(-5,7)
          .lineTo(5,1)
          .lineTo(1,-5)
          .lineTo(7,-9)
          .stroke({
            color:coreColor,width:1.6,alpha:.48
          });
        glow.circle(0,0,r+3).stroke({
          color:main,width:7,alpha:.08
        });
      }
    }
  }

  updateNativeSecondaryCombatVfx(game) {
    const clamp01=value=>Math.max(0,Math.min(1,Number(value)||0));
    const easeOut=value=>{
      const t=clamp01(value);
      return 1-Math.pow(1-t,3);
    };

    for(const view of this.actorViews.values()){
      view.secondaryGlowFx.clear();
      view.secondaryGlowFx.visible=false;
      view.secondaryFx.clear();
      view.secondaryFx.visible=false;
    }

    for(const effect of game.vfx?.effects || []){
      if(effect.type!=="secondary") continue;
      if(!["warrior-bloodthirst","dk-death-strike"].includes(effect.spellId)) continue;

      const actor=game.getActor(effect.targetId);
      const view=this.actorViews.get(effect.targetId);
      if(!actor?.alive || !view) continue;

      const total=Math.max(1,Number(effect.totalMs)||1);
      const remaining=Math.max(0,Number(effect.remainingMs)||0);
      const p=clamp01(1-remaining/total);
      const fade=1-clamp01((p-.56)/.44);
      const seed=Number(effect.seed||effect.id||1);
      const glow=view.secondaryGlowFx;
      const core=view.secondaryFx;
      glow.visible=true;
      core.visible=true;

      if(effect.spellId==="warrior-bloodthirst"){
        for(let i=0;i<8;i++){
          const a=i/8*Math.PI*2+seed*.007;
          const start=actor.radius+22+(i%3)*5;
          const rr=start*(1-easeOut(p)*.78);
          const x=Math.cos(a)*rr;
          const y=Math.sin(a)*rr;
          core.circle(x,y,1.5+(i%3)*.45).fill({
            color:i%3===0?0xf0b0a1:0xb84d48,
            alpha:fade*(.42+(i%2)*.14),
          });
          if(i<5){
            core
              .moveTo(Math.cos(a)*start,Math.sin(a)*start)
              .lineTo(x,y)
              .stroke({
                color:0xc85c55,width:1.2,alpha:fade*.28
              });
          }
        }
        core.circle(0,0,actor.radius+5+easeOut(p)*7).stroke({
          color:0xe09a89,width:1.7,alpha:fade*.52
        });
        glow.circle(0,0,actor.radius+9+easeOut(p)*8).stroke({
          color:0xb84d48,width:8,alpha:fade*.10
        });
      } else {
        const rot=-p*1.4;
        for(let i=0;i<6;i++){
          const a=i/6*Math.PI*2+rot;
          const start=actor.radius+24+(i%2)*5;
          const rr=start*(1-easeOut(p)*.72);
          core
            .moveTo(Math.cos(a)*start,Math.sin(a)*start)
            .lineTo(Math.cos(a+.12)*rr,Math.sin(a+.12)*rr)
            .stroke({
              color:i%2?0xe5b3b5:0x82c8df,
              width:1.6,alpha:fade*.48,
            });
        }
        for(let i=0;i<4;i++){
          const a=i*Math.PI/2+rot;
          const r=actor.radius+6+easeOut(p)*3;
          core
            .moveTo(Math.cos(a-.18)*r,Math.sin(a-.18)*r)
            .lineTo(Math.cos(a)*(r+7),Math.sin(a)*(r+7))
            .lineTo(Math.cos(a+.18)*r,Math.sin(a+.18)*r)
            .stroke({
              color:i%2?0xe3f8ff:0xe8a4aa,
              width:1.7,alpha:fade*.56,
            });
        }
        glow.circle(0,0,actor.radius+10+easeOut(p)*6).stroke({
          color:0x9f454b,width:8,alpha:fade*.09
        });
      }
    }
  }

  updatePersistentCrowdControlVfx(game) {
    const priority = {
      stun: 0,
      fear: 1,
      incapacitate: 2,
      root: 3,
      schoolLock: 4,
    };
    const time = Number(game.elapsedSeconds) || 0;

    const activeControlFor = actor => (actor.effects || [])
      .filter(effect =>
        effect.remainingMs > 0
        && Object.prototype.hasOwnProperty.call(priority, effect.kind)
      )
      .sort((a,b) => priority[a.kind] - priority[b.kind])[0] || null;

    const paletteFor = effect => {
      if (!effect) return { main:0xd6c69e, core:0xffffff };
      if (effect.kind === "stun") return { main:0xe46f5e, core:0xffe2dd };
      if (effect.kind === "fear") return { main:0xa86ee8, core:0xeadbff };
      if (effect.kind === "incapacitate") {
        if (effect.spellId === "druid-cyclone") return { main:0x71c88a, core:0xd9f2d4 };
        if (effect.spellId === "shaman-hex") return { main:0x66b88a, core:0xd6f3c9 };
        return { main:0x9b79d1, core:0xeee3ff };
      }
      if (effect.kind === "root") {
        if (effect.spellId === "dk-chains") return { main:0x75b9d8, core:0xe1f8ff };
        return { main:0x62bfe9, core:0xe5f9ff };
      }
      return { main:0x9d86bf, core:0xf1e8ff };
    };

    const arc = (g,cx,cy,radius,start,end,style,segments=7) => {
      for(let i=0;i<=segments;i++){
        const t=i/segments;
        const a=start+(end-start)*t;
        const x=cx+Math.cos(a)*radius;
        const y=cy+Math.sin(a)*radius;
        if(i===0) g.moveTo(x,y); else g.lineTo(x,y);
      }
      g.stroke(style);
    };

    const nowMs=typeof performance!=="undefined"?performance.now():Date.now();

    const drawExit=(view,actor,exit)=>{
      const duration=280;
      const q=Math.max(0,Math.min(1,(nowMs-exit.startMs)/duration));
      if(q>=1) return false;

      const glow=view.ccWorldGlowFx;
      const core=view.ccWorldFx;
      const palette=paletteFor(exit);
      const fade=1-q;
      glow.visible=true;
      core.visible=true;

      if(exit.spellId==="mage-frost-nova"){
        for(let i=0;i<10;i++){
          const a=i/10*Math.PI*2;
          const inner=actor.radius+4+q*4;
          const outer=actor.radius+12+q*(20+(i%3)*4);
          core
            .moveTo(
              Math.cos(a)*inner,
              actor.radius*.55+Math.sin(a)*4
            )
            .lineTo(
              Math.cos(a)*outer,
              actor.radius*.55+Math.sin(a)*9-q*7
            )
            .stroke({
              color:i%3===0?palette.core:palette.main,
              width:1.4+(i%3===0?.6:0),
              alpha:fade*.62,
            });
        }
        glow.ellipse(0,actor.radius*.56,actor.radius+10+q*16,7+q*3).stroke({
          color:palette.main,width:7,alpha:fade*.10
        });
        return true;
      }

      if(exit.spellId==="druid-cyclone"){
        for(let layer=0;layer<4;layer++){
          const rr=actor.radius+8+layer*5+q*(15+layer*2);
          core.ellipse(0,8-layer*6-q*7,rr,5+layer).stroke({
            color:layer%2?palette.core:palette.main,
            width:1.4,
            alpha:fade*(.46-layer*.06),
          });
        }
        return true;
      }

      for(let i=0;i<7;i++){
        const a=i/7*Math.PI*2+(exit.kind==="fear"?.25:0);
        const inner=actor.radius+5;
        const outer=actor.radius+10+q*(17+(i%3)*5);
        core.circle(
          Math.cos(a)*outer,
          Math.sin(a)*outer-q*5,
          1.2+(i%2)*.35
        ).fill({
          color:i%2?palette.core:palette.main,
          alpha:fade*.46,
        });
        core
          .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
          .lineTo(Math.cos(a)*outer,Math.sin(a)*outer-q*5)
          .stroke({
            color:palette.main,width:1,alpha:fade*.24
          });
      }
      glow.circle(0,0,actor.radius+10+q*14).stroke({
        color:palette.main,width:6,alpha:fade*.07
      });
      return true;
    };


    for (const actor of game.actors || []) {
      const view = this.actorViews.get(actor.id);
      if (!view) continue;

      const glow = view.ccWorldGlowFx;
      const core = view.ccWorldFx;
      glow.clear();
      core.clear();
      glow.visible = false;
      core.visible = false;

      const effect = activeControlFor(actor);
      const transition=view.ccTransition;

      if(!actor.alive){
        transition.lastKind=null;
        transition.lastSpellId=null;
        transition.exit=null;
        continue;
      }

      if(effect){
        transition.lastKind=effect.kind;
        transition.lastSpellId=effect.spellId || "";
        transition.exit=null;
      } else {
        if(!transition.exit && transition.lastKind){
          transition.exit={
            kind:transition.lastKind,
            spellId:transition.lastSpellId,
            startMs:nowMs,
          };
          transition.lastKind=null;
          transition.lastSpellId=null;
        }

        if(transition.exit){
          if(!drawExit(view,actor,transition.exit)){
            transition.exit=null;
          }
        }
        continue;
      }

      const palette = paletteFor(effect);
      const pulse = .5 + .5 * Math.sin(time * 7.2 + actor.x * .012);
      const radius = actor.radius + 7;
      glow.visible = true;
      core.visible = true;

      // Frost Nova: obvious frozen floor ring + crystalline ice shards.
      if (effect.kind === "root" && effect.spellId === "mage-frost-nova") {
        glow.ellipse(0,actor.radius*.58,radius+10,7.5).stroke({
          color:palette.main,width:8,alpha:.16+pulse*.035
        });
        core.ellipse(0,actor.radius*.58,radius+8,6).stroke({
          color:palette.main,width:2.2,alpha:.72
        });

        for(let i=0;i<10;i++){
          const a=i/10*Math.PI*2;
          const baseX=Math.cos(a)*(actor.radius+3);
          const baseY=actor.radius*.58+Math.sin(a)*4.2;
          const tipR=actor.radius+12+(i%3)*4+pulse*2;
          const tipX=Math.cos(a)*tipR;
          const tipY=actor.radius*.58+Math.sin(a)*7.5-(i%2)*2;
          core
            .moveTo(baseX,baseY)
            .lineTo(tipX,tipY)
            .stroke({
              color:i%3===0?palette.core:palette.main,
              width:i%3===0?2.3:1.5,
              alpha:.68,
            });
        }

        for(let i=0;i<5;i++){
          const x=(i-2)*8;
          core
            .moveTo(x-3,actor.radius*.40)
            .lineTo(x,actor.radius*.18-(i%2)*4)
            .lineTo(x+3,actor.radius*.40)
            .stroke({
              color:palette.core,width:1.3,alpha:.48
            });
        }
        continue;
      }

      // Chains of Ice: persistent linked chain wrapping the lower body.
      if (effect.kind === "root" && effect.spellId === "dk-chains") {
        glow.ellipse(0,actor.radius*.42,radius+9,10).stroke({
          color:palette.main,width:7,alpha:.12
        });
        const links=9;
        for(let i=0;i<links;i++){
          const a=i/links*Math.PI*2+time*.28;
          const rr=actor.radius+4+(i%2)*2;
          const x=Math.cos(a)*rr;
          const y=actor.radius*.32+Math.sin(a)*6;
          core.ellipse(x,y,5.8,2.7).stroke({
            color:i%2?palette.main:palette.core,
            width:1.8,alpha:.74
          });
        }
        core.ellipse(0,actor.radius*.42,radius+5,7).stroke({
          color:palette.main,width:1.3,alpha:.44
        });
        continue;
      }

      // Cyclone persists as layered wind bands around the controlled player.
      if (
        effect.kind === "incapacitate"
        && effect.spellId === "druid-cyclone"
      ) {
        for(let layer=0;layer<5;layer++){
          const y=14-layer*7.5;
          const rx=actor.radius+5+layer*3+pulse*1.5;
          const ry=4.5+layer*.9;
          core.ellipse(0,y,rx,ry).stroke({
            color:layer%2?palette.core:palette.main,
            width:1.4+layer*.12,
            alpha:.30+layer*.075,
          });
        }
        for(let i=0;i<6;i++){
          const a=i/6*Math.PI*2+time*(i%2?.9:-.75);
          const rr=actor.radius+8+(i%3)*4;
          core.circle(
            Math.cos(a)*rr,
            Math.sin(a)*rr*.45-5,
            1.1+(i%2)*.35
          ).fill({
            color:palette.core,alpha:.40
          });
        }
        glow.ellipse(0,2,actor.radius+15,actor.radius+5).stroke({
          color:palette.main,width:8,alpha:.09
        });
        continue;
      }

      // Polymorph: arcane spiral/runes remain around the target while incapacitated.
      if (
        effect.kind === "incapacitate"
        && effect.spellId === "mage-polymorph"
      ) {
        for(let ring=0;ring<3;ring++){
          const rr=actor.radius+6+ring*7;
          for(let seg=0;seg<4;seg++){
            const a0=seg*Math.PI/2+.15+time*(ring%2?-.28:.22);
            arc(core,0,0,rr,a0,a0+.65,{
              color:ring===1?palette.core:palette.main,
              width:1.5,
              alpha:.48-ring*.07,
            },5);
          }
        }
        for(let i=0;i<5;i++){
          const a=i/5*Math.PI*2+time*.8;
          const rr=actor.radius+13+(i%2)*4;
          core.circle(Math.cos(a)*rr,Math.sin(a)*rr,1.5).fill({
            color:palette.core,alpha:.48
          });
        }
        glow.circle(0,0,actor.radius+15).stroke({
          color:palette.main,width:7,alpha:.08
        });
        continue;
      }

      // Hex: stable green hex seal with small rotating nature runes.
      if (
        effect.kind === "incapacitate"
        && effect.spellId === "shaman-hex"
      ) {
        const pts=[];
        for(let i=0;i<6;i++){
          const a=-Math.PI/2+i*Math.PI/3;
          pts.push({
            x:Math.cos(a)*(actor.radius+11),
            y:Math.sin(a)*(actor.radius+11)
          });
        }
        core.moveTo(pts[0].x,pts[0].y);
        for(let i=1;i<pts.length;i++) core.lineTo(pts[i].x,pts[i].y);
        core.lineTo(pts[0].x,pts[0].y).stroke({
          color:palette.main,width:2,alpha:.62
        });

        for(let i=0;i<3;i++){
          const a=time*.65+i*Math.PI*2/3;
          const rr=actor.radius+17;
          core.circle(Math.cos(a)*rr,Math.sin(a)*rr,2).fill({
            color:palette.core,alpha:.54
          });
        }
        glow.circle(0,0,actor.radius+13).stroke({
          color:palette.main,width:7,alpha:.09
        });
        continue;
      }

      // Fear: distinguish Warlock's shadow hooks from Priest's psychic waves.
      if (effect.kind === "fear") {
        if (effect.spellId === "priest-psychic-scream") {
          for(let layer=0;layer<3;layer++){
            const rr=actor.radius+8+layer*7+pulse*2;
            for(let seg=0;seg<3;seg++){
              const a0=seg*Math.PI*2/3+time*(layer%2?.22:-.18);
              arc(core,0,0,rr,a0,a0+.78,{
                color:layer===1?palette.core:palette.main,
                width:1.6,
                alpha:.42-layer*.06,
              },5);
            }
          }
        } else {
          for(let i=0;i<5;i++){
            const a=i/5*Math.PI*2+time*(i%2?.48:-.38);
            const outer=actor.radius+18+(i%2)*4;
            const inner=actor.radius+5;
            const midA=a+.34;
            core
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(midA)*(outer*.72),Math.sin(midA)*(outer*.72))
              .lineTo(Math.cos(a+.70)*inner,Math.sin(a+.70)*inner)
              .stroke({
                color:i%2?palette.core:palette.main,
                width:1.7,
                alpha:.46,
              });
          }
        }
        glow.circle(0,0,actor.radius+13+pulse*2).stroke({
          color:palette.main,width:7,alpha:.10
        });
        continue;
      }

      // Stun: hard angular sparks around the head/body.
      if (effect.kind === "stun") {
        for(let i=0;i<7;i++){
          const a=i/7*Math.PI*2+time*.42;
          const inner=actor.radius+5;
          const outer=actor.radius+13+(i%3)*3+pulse*2;
          core
            .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
            .lineTo(Math.cos(a+.08)*outer,Math.sin(a+.08)*outer)
            .stroke({
              color:i%2?palette.core:palette.main,
              width:i%2?1.5:2,
              alpha:.56,
            });
        }
        core.circle(0,0,actor.radius+8).stroke({
          color:palette.main,width:1.5,alpha:.42
        });
        glow.circle(0,0,actor.radius+11).stroke({
          color:palette.main,width:7,alpha:.10
        });
        continue;
      }

      // Generic root fallback.
      if (effect.kind === "root") {
        core.ellipse(0,actor.radius*.55,radius+7,6).stroke({
          color:palette.main,width:2,alpha:.62
        });
        for(let i=0;i<7;i++){
          const a=i/7*Math.PI*2;
          core
            .moveTo(Math.cos(a)*(actor.radius+1),actor.radius*.50+Math.sin(a)*3)
            .lineTo(Math.cos(a)*(actor.radius+10),actor.radius*.50+Math.sin(a)*6)
            .stroke({
              color:i%2?palette.core:palette.main,
              width:1.5,alpha:.50
            });
        }
        continue;
      }

      // School lock / interrupt: restrained purple lock-cross effect.
      if (effect.kind === "schoolLock") {
        const r=actor.radius+9;
        for(const sign of [-1,1]){
          core
            .moveTo(-r*sign,-r*.60)
            .lineTo(r*sign,r*.60)
            .stroke({
              color:palette.core,width:2,alpha:.48
            });
        }
        glow.circle(0,0,r+4).stroke({
          color:palette.main,width:6,alpha:.08
        });
      }
    }
  }

  updateCrowdControlBadges(game) {
    const priority = {
      stun: 0,
      fear: 1,
      incapacitate: 2,
      root: 3,
      schoolLock: 4,
    };

    const colorFor = effect => {
      if (effect?.kind === "stun") return 0xe46f5e;
      if (effect?.kind === "fear") return 0xe2a85f;
      if (effect?.kind === "incapacitate") return 0xb89be8;
      if (effect?.kind === "root") return 0x78c6df;
      return 0xb29ad1;
    };

    const drawGlyph = (g,effect,color) => {
      const kind=effect.kind;
      const spellId=effect.spellId || "";

      if(kind==="stun"){
        g.circle(0,-6,2.4).fill({color,alpha:.96});
        for(let i=0;i<4;i++){
          const a=i*Math.PI/2+.15;
          g.moveTo(Math.cos(a)*5, -6+Math.sin(a)*5)
            .lineTo(Math.cos(a)*9,-6+Math.sin(a)*9)
            .stroke({color,width:1.8,alpha:.94});
        }
        return;
      }

      if(kind==="fear"){
        g.circle(-4,-7,1.4).fill({color,alpha:.96});
        g.circle(4,-7,1.4).fill({color,alpha:.96});
        g.moveTo(-6,-1).lineTo(0,-4).lineTo(6,-1).stroke({
          color,width:1.6,alpha:.94
        });
        return;
      }

      if(kind==="incapacitate"){
        const spiralColor=color;
        const steps=18;
        for(let i=0;i<=steps;i++){
          const t=i/steps;
          const a=t*Math.PI*4.2;
          const rr=1+t*7;
          const x=Math.cos(a)*rr;
          const y=-6+Math.sin(a)*rr;
          if(i===0) g.moveTo(x,y); else g.lineTo(x,y);
        }
        g.stroke({color:spiralColor,width:1.5,alpha:.94});
        return;
      }

      if(kind==="root"){
        if(spellId==="mage-frost-nova"){
          for(let i=0;i<6;i++){
            const a=i*Math.PI/3;
            g.moveTo(0,-6).lineTo(Math.cos(a)*7,-6+Math.sin(a)*7).stroke({
              color,width:1.5,alpha:.94
            });
          }
          return;
        }
        g.moveTo(0,-13).lineTo(0,0)
          .moveTo(0,-8).lineTo(-6,-12)
          .moveTo(0,-5).lineTo(6,-10)
          .moveTo(0,-1).lineTo(-6,3)
          .moveTo(0,-1).lineTo(6,3)
          .stroke({color,width:1.6,alpha:.94});
        return;
      }

      // School lock icon.
      g.rect(-5,-8,10,9).stroke({color,width:1.6,alpha:.94});
      g.moveTo(-4,-8).lineTo(-4,-12).lineTo(4,-12).lineTo(4,-8).stroke({
        color,width:1.6,alpha:.94
      });
      g.moveTo(-7,-14).lineTo(7,1)
        .moveTo(7,-14).lineTo(-7,1)
        .stroke({color,width:1.2,alpha:.72});
    };

    for(const actor of game.actors || []){
      const view=this.actorViews.get(actor.id);
      if(!view) continue;

      const badge=view.ccBadge;
      const bg=view.ccBadgeBg;
      const glow=view.ccBadgeGlow;
      const glyph=view.ccBadgeGlyph;

      const effect=(actor.effects || [])
        .filter(item =>
          item.remainingMs>0
          && Object.prototype.hasOwnProperty.call(priority,item.kind)
        )
        .sort((a,b)=>priority[a.kind]-priority[b.kind])[0];

      if(!actor.alive || !effect){
        badge.visible=false;
        view.ccBadgeKind=null;
        view.ccBadgeSpellId=null;
        continue;
      }

      badge.visible=true;
      badge.position.set(0,-actor.radius-73.5);

      const color=colorFor(effect);
      if(
        view.ccBadgeKind!==effect.kind
        || view.ccBadgeSpellId!==effect.spellId
      ){
        bg.clear()
          .rect(-16,-19,32,38)
          .fill({color:0x0e0907,alpha:.95})
          .rect(-16,-19,32,38)
          .stroke({color,width:2,alpha:.96});

        glow.clear()
          .rect(-16,-19,32,38)
          .stroke({color,width:5.5,alpha:.22});

        glyph.clear();
        drawGlyph(glyph,effect,color);

        view.ccBadgeKind=effect.kind;
        view.ccBadgeSpellId=effect.spellId;
      }

      const seconds=Math.max(0,effect.remainingMs/1000).toFixed(1);
      view.ccBadgeTimer.text=seconds;
      const badgePulse=1+Math.sin(game.elapsedSeconds*7.5+actor.x*.01)*.025;
      badge.scale.set(badgePulse);
      glow.alpha=.78+.16*(.5+.5*Math.sin(game.elapsedSeconds*6.2));
    }
  }

  updateActorMotionV2(game) {
    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };
    const pulse = value => Math.sin(clamp01(value) * Math.PI);

    const latestSpellBySource = new Map();
    const latestHitSourceByTarget = new Map();

    for (const effect of game.vfx?.effects || []) {
      if (effect.type === "spell" && effect.sourceId) {
        const previous = latestSpellBySource.get(effect.sourceId);
        if (!previous || Number(effect.id) > Number(previous.id)) {
          latestSpellBySource.set(effect.sourceId, effect);
        }

        if (effect.targetId) {
          const hitPrevious = latestHitSourceByTarget.get(effect.targetId);
          if (!hitPrevious || Number(effect.id) > Number(hitPrevious.id)) {
            latestHitSourceByTarget.set(effect.targetId, effect);
          }
        }
      }

      if (
        effect.type === "chain"
        && Array.isArray(effect.actorIds)
        && effect.actorIds.length > 1
      ) {
        const sourceId = effect.actorIds[0];
        for (const targetId of effect.actorIds.slice(1)) {
          latestHitSourceByTarget.set(targetId, {
            id: effect.id,
            sourceId,
            targetId,
            spellId: effect.spellId || "shaman-chain-lightning",
          });
        }
      }
    }

    const actorById = new Map(game.actors.map(actor => [actor.id, actor]));
    const ccKinds = new Set(["stun", "fear", "incapacitate", "root"]);

    for (const actor of game.actors) {
      const view = this.actorViews.get(actor.id);
      if (!view) continue;

      const motion = view.motion;
      const body = view.body;
      const motionFx = view.actorMotionFx;
      const ghostA = view.motionGhostA;
      const ghostB = view.motionGhostB;

      motionFx.clear();
      motionFx.visible = false;

      if (ghostA) {
        ghostA.visible = false;
        ghostA.alpha = 0;
      }
      if (ghostB) {
        ghostB.visible = false;
        ghostB.alpha = 0;
      }

      const setBodyScale = (x = 1, y = x) => {
        body.scale.set(
          view.bodyBaseScaleX * x,
          view.bodyBaseScaleY * y,
        );
      };

      const setGhost = (ghost, x, y, alpha, scale = 1, rotation = 0) => {
        if (!ghost || alpha <= .001) return;
        ghost.visible = true;
        ghost.position.set(x, y);
        ghost.alpha = alpha;
        ghost.rotation = rotation;
        ghost.scale.set(
          view.ghostBaseScaleX * scale,
          view.ghostBaseScaleY * scale,
        );
      };

      const resetLivingVisuals = () => {
        body.visible = true;
        body.alpha = 1;
        body.position.set(0, 0);
        body.rotation = 0;
        if ("tint" in body) body.tint = 0xffffff;
        setBodyScale(1, 1);

        view.shadow.visible = true;
        view.shadow.alpha = 1;
        view.shadow.position.set(0, 0);
        view.shadow.scale.set(1, 1);
        view.ring.visible = true;
        view.ring.alpha = 1;
        if (view.ringGlow) {
          view.ringGlow.visible = view.livingCircleUnits;
          view.ringGlow.alpha = 1;
          view.ringGlow.position.set(0,0);
          view.ringGlow.rotation = 0;
          view.ringGlow.scale.set(1,1);
        }
        if (view.classIdentityFx) {
          view.classIdentityFx.clear();
          view.classIdentityFx.visible = false;
          view.classIdentityFx.position.set(0,0);
          view.classIdentityFx.rotation = 0;
          view.classIdentityFx.scale.set(1,1);
        }
        if (view.livingRingAccentFx) {
          view.livingRingAccentFx.clear();
          view.livingRingAccentFx.visible = false;
          view.livingRingAccentFx.position.set(0,0);
          view.livingRingAccentFx.rotation = 0;
          view.livingRingAccentFx.scale.set(1,1);
        }

        view.name.alpha = 1;
      };

      // Detect death transition before the normal body reset.
      if (motion.previousAlive && !actor.alive) {
        motion.deathStartedMs = nowMs;
      }

      // Death has its own visual clock so the animation completes even when
      // the match simulation has already stopped.
      if (!actor.alive) {
        const start = Number(motion.deathStartedMs);
        const duration = 560;

        if (!Number.isFinite(start)) {
          motion.deathStartedMs = nowMs;
        }

        const deathP = clamp01(
          (nowMs - Number(motion.deathStartedMs || nowMs)) / duration,
        );

        view.root.visible = deathP < 1;
        view.name.visible = false;
        view.healthBg.visible = false;
        view.healthFill.visible = false;
        view.resourceBg.visible = false;
        view.resourceFill.visible = false;
        view.castBg.visible = false;
        view.castFill.visible = false;
        view.castBorder.visible = false;
        view.playerGlow.visible = false;
        view.playerRing.visible = false;
        view.targetGlow.visible = false;
        view.targetRing.visible = false;
        view.targetMarker.visible = false;
        view.targetMarkerGlow.visible = false;
        view.ccBadge.visible = false;
        view.stateWorldGlowFx.visible = false;
        view.stateWorldFx.visible = false;
        view.secondaryGlowFx.visible = false;
        view.secondaryFx.visible = false;
        view.ccWorldGlowFx.visible = false;
        view.ccWorldFx.visible = false;
        view.ring.visible = false;
        if (view.ringGlow) view.ringGlow.visible = false;
        if (view.livingRingAccentFx) view.livingRingAccentFx.visible = false;

        if (deathP < 1) {
          body.visible = true;

          const collapse = easeOut(deathP);
          const fade = 1 - smooth((deathP - .18) / .82);
          const fallSign = Math.abs(motion.hitDirX) > .05
            ? Math.sign(motion.hitDirX)
            : (String(actor.id).length % 2 ? 1 : -1);

          body.position.set(
            fallSign * collapse * 7,
            collapse * 13,
          );
          body.rotation = fallSign * collapse * .17;
          body.alpha = fade;
          setBodyScale(
            1 + collapse * .08,
            1 - collapse * .30,
          );

          view.shadow.visible = true;
          view.shadow.alpha = (1 - collapse) * .62;
          view.shadow.scale.set(
            1 + collapse * .20,
            Math.max(.35, 1 - collapse * .52),
          );

          if (deathP < .54) {
            motionFx.visible = true;
            const burst = 1 - clamp01(deathP / .54);
            const radius = actor.radius + 7 + deathP * 24;

            motionFx.circle(0, 0, radius).stroke({
              color: actor.team === "friendly" ? 0xb7d5c0 : 0xd9aaa4,
              width: 1.5,
              alpha: burst * .28,
            });

            for (let i = 0; i < 5; i += 1) {
              const a = i / 5 * Math.PI * 2 + deathP * 2.1;
              const rr = actor.radius + 5 + deathP * (15 + i * 2);
              motionFx.circle(
                Math.cos(a) * rr,
                Math.sin(a) * rr - deathP * 8,
                1.2 + (i % 2) * .4,
              ).fill({
                color: 0xd7c9bd,
                alpha: burst * .30,
              });
            }
          }
        }

        motion.previousAlive = false;
        motion.previousHealth = actor.health;
        motion.previousX = actor.x;
        motion.previousY = actor.y;
        continue;
      }

      // Alive again (new round/reused actor slot).
      if (!motion.previousAlive && actor.alive) {
        motion.deathStartedMs = null;
        motion.action = null;
        motion.hitStartMs = -1;
        motion.lastActionEffectId = null;
      }

      view.root.visible = true;
      resetLivingVisuals();

      // -------------------------------------------------------------------
      // Detect new spell release / instant action.
      // -------------------------------------------------------------------
      const latestAction = latestSpellBySource.get(actor.id);
      if (
        latestAction
        && latestAction.id !== motion.lastActionEffectId
      ) {
        motion.lastActionEffectId = latestAction.id;

        const target = actorById.get(latestAction.targetId);
        const rawDx = (target?.x ?? latestAction.targetX ?? actor.x) - actor.x;
        const rawDy = (target?.y ?? latestAction.targetY ?? actor.y) - actor.y;
        const len = Math.max(1, Math.hypot(rawDx, rawDy));
        const dirX = rawDx / len;
        const dirY = rawDy / len;
        const spellId = latestAction.spellId || "";
        const heavy =
          POLISH_HEAVY_SPELLS.has(spellId)
          || ["warrior-mortal-strike","warrior-slam","dk-obliterate"].includes(spellId);

        let kind = "spell";
        if (spellId === "warrior-charge") kind = "charge";
        else if (spellId === "rogue-shadowstep") kind = "shadowstep";
        else if (COMBAT_VFX2_MELEE.has(spellId)) kind = "melee";
        else if (PROJECTILE_VFX2_SPELLS.has(spellId)) kind = "projectile";
        else if (COMBAT_VFX2_HEALS.has(spellId)) kind = "heal";
        else if (COMBAT_VFX2_CC.has(spellId)) kind = "control";
        else if (COMBAT_VFX2_DEFENSIVES.has(spellId)) kind = "defensive";

        motion.action = {
          id: latestAction.id,
          spellId,
          kind,
          heavy,
          startMs: nowMs,
          dirX,
          dirY,
        };
      }

      // -------------------------------------------------------------------
      // Detect actual damage taken from HP delta.
      // -------------------------------------------------------------------
      const previousHealth = Number(motion.previousHealth);
      if (
        Number.isFinite(previousHealth)
        && actor.health < previousHealth - .01
      ) {
        const damage = previousHealth - actor.health;
        const fraction = damage / Math.max(1, actor.maxHealth);
        const sourceEffect = latestHitSourceByTarget.get(actor.id);
        const sourceActor = sourceEffect
          ? actorById.get(sourceEffect.sourceId)
          : null;

        let hitDx = sourceActor ? actor.x - sourceActor.x : -Math.cos(actor.facing || 0);
        let hitDy = sourceActor ? actor.y - sourceActor.y : -Math.sin(actor.facing || 0);
        const hitLen = Math.max(1, Math.hypot(hitDx, hitDy));
        hitDx /= hitLen;
        hitDy /= hitLen;

        const recentCrit = (game.floatingTexts || []).some(item =>
          item.actorId === actor.id
          && item.type === "crit-damage"
          && item.remainingMs > 650
        );

        motion.hitStartMs = nowMs;
        motion.hitCrit = recentCrit || fraction >= .18;
        motion.hitPower = clamp01(.30 + fraction / .18);
        motion.hitDurationMs = motion.hitCrit ? 230 : 160;
        motion.hitDirX = hitDx;
        motion.hitDirY = hitDy;
      }

      // -------------------------------------------------------------------
      // Movement: tiny body-only weight. World position remains exact.
      // -------------------------------------------------------------------
      const moveX = Number(actor.lastMove?.x) || 0;
      const moveY = Number(actor.lastMove?.y) || 0;
      const moving = Math.hypot(moveX, moveY) > .15 && !actor.cast;
      const phaseSeed = String(actor.id || "").length * .73;
      const moveWave = moving
        ? Math.sin(nowMs * .0105 + phaseSeed)
        : 0;

      let offsetX = moving ? moveX * 1.25 : 0;
      let offsetY = moving ? moveWave * 1.05 + Math.abs(moveY) * .30 : 0;
      let rotation = moving ? moveX * .020 + moveWave * .004 : 0;
      let scaleX = moving ? 1 + Math.abs(moveWave) * .012 : 1;
      let scaleY = moving ? 1 - Math.abs(moveWave) * .009 : 1;

      let livingMode = moving ? "move" : "idle";
      let livingIntensity = moving ? .72 : .12;
      let livingDirX = moving ? moveX : Math.cos(actor.facing || 0);
      let livingDirY = moving ? moveY : Math.sin(actor.facing || 0);
      let livingProgress = moving ? .5 : 0;
      let livingSpellId = "";
      let livingHeavy = false;

      view.shadow.scale.set(
        moving ? 1 + Math.abs(moveWave) * .035 : 1,
        moving ? 1 - Math.abs(moveWave) * .025 : 1,
      );
      view.shadow.alpha = moving ? .88 : 1;

      // -------------------------------------------------------------------
      // Cast anticipation: body braces as power gathers.
      // -------------------------------------------------------------------
      if (actor.cast) {
        const total = Math.max(1, Number(actor.cast.totalMs) || 1);
        const castP = clamp01(1 - actor.cast.remainingMs / total);
        const target = actorById.get(actor.cast.targetId);
        const tdx = target ? target.x - actor.x : Math.cos(actor.facing || 0);
        const tdy = target ? target.y - actor.y : Math.sin(actor.facing || 0);
        const tlen = Math.max(1, Math.hypot(tdx,tdy));
        const ctx = tdx / tlen;
        const cty = tdy / tlen;
        const gather = smooth(castP);
        const finalBrace = smooth((castP - .72) / .28);

        livingMode = "cast";
        livingIntensity = .35 + gather * .65;
        livingDirX = ctx;
        livingDirY = cty;
        livingProgress = castP;
        livingSpellId = actor.cast.spellId || "";

        offsetX -= ctx * (gather * .75 + finalBrace * 1.3);
        offsetY -= cty * (gather * .45 + finalBrace * .75);
        scaleX *= 1 + gather * .018 + finalBrace * .018;
        scaleY *= 1 - gather * .020 - finalBrace * .018;
        rotation += ctx * .010 * gather;

        if (finalBrace > 0) {
          motionFx.visible = true;
          const profile = spellPolishProfile(actor.cast.spellId);
          const radius = actor.radius + 5 + (1 - finalBrace) * 10;
          motionFx.circle(0,0,radius).stroke({
            color: profile.core,
            width: 1.2 + finalBrace * .8,
            alpha: finalBrace * .22,
          });
        }
      }

      // -------------------------------------------------------------------
      // Release / attack choreography.
      // -------------------------------------------------------------------
      const action = motion.action;
      if (action) {
        const duration =
          action.kind === "charge" || action.kind === "shadowstep"
            ? 390
            : action.kind === "melee"
              ? (action.heavy ? 340 : 270)
              : action.kind === "projectile"
                ? (action.heavy ? 290 : 230)
                : 240;

        const q = clamp01((nowMs - action.startMs) / duration);
        const hitPulse = pulse(q);
        const snap = 1 - easeOut(q);
        const dirX = action.dirX;
        const dirY = action.dirY;

        livingMode = action.kind;
        livingIntensity = Math.max(.25, hitPulse);
        livingDirX = dirX;
        livingDirY = dirY;
        livingProgress = q;
        livingSpellId = action.spellId || "";
        livingHeavy = Boolean(action.heavy);

        if (action.kind === "melee") {
          const lunge = hitPulse * (action.heavy ? 8.5 : 6);
          offsetX += dirX * lunge;
          offsetY += dirY * lunge;
          rotation += dirY * dirX * (action.heavy ? .035 : .022);
          scaleX *= 1 + hitPulse * (action.heavy ? .055 : .035);
          scaleY *= 1 - hitPulse * (action.heavy ? .035 : .022);

          setGhost(
            ghostA,
            -dirX * (5 + hitPulse * 4),
            -dirY * (5 + hitPulse * 4),
            (1-q) * (action.heavy ? .22 : .15),
            .98,
            rotation * .55,
          );
          setGhost(
            ghostB,
            -dirX * (10 + hitPulse * 6),
            -dirY * (10 + hitPulse * 6),
            (1-q) * (action.heavy ? .13 : .09),
            .96,
            rotation * .35,
          );
        } else if (action.kind === "charge" || action.kind === "shadowstep") {
          const speedKick = hitPulse * (action.kind === "charge" ? 5 : 3.5);
          offsetX += dirX * speedKick;
          offsetY += dirY * speedKick;
          scaleX *= 1 + hitPulse * .05;
          scaleY *= 1 - hitPulse * .025;

          const ghostAlpha = action.kind === "shadowstep" ? .25 : .18;
          setGhost(
            ghostA,
            -dirX * (10 + hitPulse * 8),
            -dirY * (10 + hitPulse * 8),
            (1-q) * ghostAlpha,
            .97,
            -dirX * .025,
          );
          setGhost(
            ghostB,
            -dirX * (18 + hitPulse * 10),
            -dirY * (18 + hitPulse * 10),
            (1-q) * ghostAlpha * .58,
            .94,
            -dirX * .018,
          );
        } else if (action.kind === "projectile") {
          const recoil = snap * (action.heavy ? 5 : 3.2);
          offsetX -= dirX * recoil;
          offsetY -= dirY * recoil;
          scaleX *= 1 + snap * (action.heavy ? .045 : .025);
          scaleY *= 1 - snap * (action.heavy ? .038 : .022);
          rotation -= dirX * snap * (action.heavy ? .025 : .015);
        } else if (action.kind === "heal") {
          offsetY -= hitPulse * (action.heavy ? 2.6 : 1.7);
          scaleX *= 1 + hitPulse * .025;
          scaleY *= 1 + hitPulse * .025;
        } else if (action.kind === "control") {
          rotation += Math.sin(q * Math.PI * 2) * .016 * (1-q);
          scaleX *= 1 + hitPulse * .022;
          scaleY *= 1 - hitPulse * .014;
        } else if (action.kind === "defensive") {
          scaleX *= 1 + hitPulse * .030;
          scaleY *= 1 + hitPulse * .030;
        } else {
          const recoil = snap * 2.2;
          offsetX -= dirX * recoil;
          offsetY -= dirY * recoil;
          scaleX *= 1 + hitPulse * .018;
          scaleY *= 1 + hitPulse * .018;
        }

        if (q < 1) {
          motionFx.visible = true;
          const profile = spellPolishProfile(action.spellId);
          const release = 1 - q;

          if (action.kind === "melee") {
            const sideX = -dirY;
            const sideY = dirX;
            for (let i = 0; i < (action.heavy ? 4 : 3); i += 1) {
              const spread = (i - 1.5) * 4;
              motionFx
                .moveTo(
                  dirX * (actor.radius - 2) + sideX * spread,
                  dirY * (actor.radius - 2) + sideY * spread,
                )
                .lineTo(
                  dirX * (actor.radius + 11 + hitPulse * 8) + sideX * spread,
                  dirY * (actor.radius + 11 + hitPulse * 8) + sideY * spread,
                )
                .stroke({
                  color: i % 2 ? profile.core : profile.main,
                  width: action.heavy ? 1.6 : 1.1,
                  alpha: release * (action.heavy ? .34 : .24),
                });
            }
          } else if (q < .42) {
            const radius = actor.radius + 6 + q * (action.heavy ? 18 : 12);
            motionFx.circle(0,0,radius).stroke({
              color: profile.core,
              width: action.heavy ? 2 : 1.3,
              alpha: (1-q/.42) * (action.heavy ? .34 : .24),
            });
          }
        } else {
          motion.action = null;
        }
      }

      // -------------------------------------------------------------------
      // Damage reaction: directional kick + squash, stronger on crit/heavy hit.
      // -------------------------------------------------------------------
      if (motion.hitStartMs >= 0) {
        const hitP = clamp01(
          (nowMs - motion.hitStartMs) / Math.max(1, motion.hitDurationMs),
        );

        if (hitP < 1) {
          const kickPulse = Math.sin(hitP * Math.PI);
          const power = motion.hitPower * (motion.hitCrit ? 1.24 : 1);
          const kick = kickPulse * (motion.hitCrit ? 5.5 : 3.4) * power;

          livingMode = "hit";
          livingIntensity = Math.max(.35,kickPulse * power);
          livingDirX = -motion.hitDirX;
          livingDirY = -motion.hitDirY;
          livingProgress = hitP;
          livingSpellId = "";

          offsetX += motion.hitDirX * kick;
          offsetY += motion.hitDirY * kick;
          rotation += motion.hitDirX * kickPulse * (motion.hitCrit ? .045 : .026);
          scaleX *= 1 + kickPulse * .045 * power;
          scaleY *= 1 - kickPulse * .050 * power;

          if ("tint" in body) {
            body.tint = hitP < .28
              ? (motion.hitCrit ? 0xfff1d6 : 0xffd8d2)
              : 0xffffff;
          }

          motionFx.visible = true;
          const fade = 1 - hitP;
          const incomingAngle = Math.atan2(motion.hitDirY,motion.hitDirX) + Math.PI;
          const ticks = motion.hitCrit ? 5 : 3;

          for (let i = 0; i < ticks; i += 1) {
            const a = incomingAngle + (i-(ticks-1)/2) * .22;
            const inner = actor.radius + 2;
            const outer = inner + (motion.hitCrit ? 14 : 9) * (1+kickPulse*.25);
            motionFx
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color: motion.hitCrit ? 0xffefd1 : 0xffb0a7,
                width: motion.hitCrit ? 1.8 : 1.3,
                alpha: fade * (motion.hitCrit ? .62 : .40),
              });
          }

          if (motion.hitCrit) {
            motionFx.circle(0,0,actor.radius+5+hitP*10).stroke({
              color:0xffe0bd,
              width:1.4,
              alpha:fade*.35,
            });
          }
        } else {
          motion.hitStartMs = -1;
          motion.hitCrit = false;
        }
      }

      // -------------------------------------------------------------------
      // Physical CC feedback. Deliberately subtle: icon remains readable and
      // the existing CC marker still carries the gameplay information.
      // -------------------------------------------------------------------
      const activeCc = (actor.effects || []).find(effect =>
        effect.remainingMs > 0 && ccKinds.has(effect.kind)
      );
      const schoolLocked = (actor.effects || []).some(effect =>
        effect.remainingMs > 0 && effect.kind === "schoolLock"
      );

      if (activeCc?.kind === "fear") {
        livingMode = "fear";
        livingIntensity = .9;
        livingSpellId = activeCc.spellId || "";
        const shake = Math.sin(nowMs * .038 + phaseSeed);
        offsetX += shake * 1.55;
        rotation += shake * .020;
      } else if (activeCc?.kind === "stun") {
        livingMode = "stun";
        livingIntensity = .9;
        livingSpellId = activeCc.spellId || "";
        const throb = .5 + .5 * Math.sin(nowMs * .026 + phaseSeed);
        scaleX *= 1 + throb * .018;
        scaleY *= 1 - throb * .022;
        rotation += Math.sin(nowMs * .045 + phaseSeed) * .008;
      } else if (activeCc?.kind === "root") {
        livingMode = "root";
        livingIntensity = .85;
        livingSpellId = activeCc.spellId || "";
        const compression = .5 + .5 * Math.sin(nowMs * .016 + phaseSeed);
        scaleX *= 1 + compression * .014;
        scaleY *= 1 - compression * .018;
      } else if (activeCc?.kind === "incapacitate") {
        livingMode = "incapacitate";
        livingIntensity = .72;
        livingSpellId = activeCc.spellId || "";
        rotation += Math.sin(nowMs * .010 + phaseSeed) * .014;
        offsetY += Math.sin(nowMs * .012 + phaseSeed) * .45;
      }

      if (schoolLocked) {
        const lockPulse = .5 + .5 * Math.sin(nowMs * .022 + phaseSeed);
        scaleX *= 1 - lockPulse * .010;
        scaleY *= 1 - lockPulse * .010;
      }

      if (view.livingCircleUnits && typeof body.clear === "function") {
        const livingState = {
          mode:livingMode,
          intensity:livingIntensity,
          dirX:livingDirX,
          dirY:livingDirY,
          progress:livingProgress,
          spellId:livingSpellId,
          heavy:livingHeavy,
        };
        drawLivingBodyShape(body,actor,livingState,nowMs);
        if (view.ringGlow) {
          drawLivingBodyShape(
            view.ringGlow,
            actor,
            livingState,
            nowMs,
            { glow:true },
          );
          view.ringGlow.position.set(offsetX,offsetY);
          view.ringGlow.rotation = rotation;
          view.ringGlow.scale.set(scaleX,scaleY);
        }
        if (view.classIdentityFx) {
          drawClassIdentitySigil(
            view.classIdentityFx,
            actor,
            livingState,
            nowMs,
            game,
          );
          view.classIdentityFx.position.set(offsetX,offsetY);
          view.classIdentityFx.rotation = rotation;
          view.classIdentityFx.scale.set(scaleX,scaleY);
        }
        if (view.livingRingAccentFx) {
          const accentProfile = livingSpellId
            ? spellPolishProfile(livingSpellId)
            : null;
          drawLivingRingAccent(
            view.livingRingAccentFx,
            actor,
            livingState,
            nowMs,
            accentProfile,
          );
          view.livingRingAccentFx.position.set(offsetX,offsetY);
          view.livingRingAccentFx.rotation = rotation;
          view.livingRingAccentFx.scale.set(scaleX,scaleY);
        }
      }

      body.position.set(offsetX,offsetY);
      body.rotation = rotation;
      setBodyScale(scaleX,scaleY);

      motion.previousAlive = actor.alive;
      motion.previousHealth = actor.health;
      motion.previousX = actor.x;
      motion.previousY = actor.y;
    }
  }

  updateNativeCastWindupVfx(game) {
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };

    const strokeArc = (
      graphics,
      radius,
      start,
      end,
      style,
      segments = 7,
      cx = 0,
      cy = 0,
    ) => {
      if (style.alpha <= 0) return;
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const a = start + (end - start) * t;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
      }
      graphics.stroke(style);
    };

    const drawLeaf = (graphics, x, y, angle, size, color, alpha) => {
      if (alpha <= 0) return;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const pts = [
        [size, 0],
        [0, size * .46],
        [-size, 0],
        [0, -size * .46],
      ].map(([px, py]) => ({
        x: x + px * ca - py * sa,
        y: y + px * sa + py * ca,
      }));
      graphics
        .moveTo(pts[0].x, pts[0].y)
        .lineTo(pts[1].x, pts[1].y)
        .lineTo(pts[2].x, pts[2].y)
        .lineTo(pts[3].x, pts[3].y)
        .lineTo(pts[0].x, pts[0].y)
        .fill({ color, alpha });
    };

    const drawDiamond = (graphics, x, y, size, angle, color, alpha) => {
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const pts = [
        [0, -size * 1.7],
        [size, 0],
        [0, size * 1.7],
        [-size, 0],
      ].map(([px,py]) => ({
        x: x + px * ca - py * sa,
        y: y + px * sa + py * ca,
      }));
      graphics
        .moveTo(pts[0].x,pts[0].y)
        .lineTo(pts[1].x,pts[1].y)
        .lineTo(pts[2].x,pts[2].y)
        .lineTo(pts[3].x,pts[3].y)
        .lineTo(pts[0].x,pts[0].y)
        .fill({ color, alpha });
    };

    const profileFor = spellId =>
      commonCasterSpellProfile(spellId)
      || priestDruidSpellProfile(spellId)
      || paladinDkSpellProfile(spellId)
      || warriorRogueSpellProfile(spellId);

    for (const view of this.actorViews.values()) {
      view.castWindupFx.clear();
      view.castWindupFx.visible = false;
    }

    const time = Number(game.elapsedSeconds) || 0;

    for (const actor of game.actors) {
      if (!actor.alive || !actor.cast) continue;

      const view = this.actorViews.get(actor.id);
      if (!view || !view.root.visible) continue;

      const spell = actor.getSpell(actor.cast.spellId);
      const spellId = spell?.id || actor.cast.spellId;
      const total = Math.max(1, Number(actor.cast.totalMs) || 1);
      const remaining = Math.max(0, Number(actor.cast.remainingMs) || 0);
      const p = clamp01(1 - remaining / total);
      const profile = profileFor(spellId);
      const classId = actor.classId;
      const g = view.castWindupFx;
      g.visible = true;

      // Mage: tightening elemental motes around a segmented rune ring.
      if (classId === "mage" && profile) {
        // Frostbolt: a compact ice lattice forms, then collapses into a spear.
        if (spellId === "mage-frostbolt") {
          const charge = smooth(p);
          const pulse = .5 + .5 * Math.sin(time * 18);
          const cageR = actor.radius + 26 - charge * 9;

          for (let i = 0; i < 6; i += 1) {
            const a = i / 6 * Math.PI * 2 + .18;
            const x = Math.cos(a) * cageR;
            const y = Math.sin(a) * cageR;
            drawDiamond(
              g, x, y, 2.8 + (i % 2) * .7 + charge * .8,
              a, i % 2 ? profile.core : profile.main, .30 + charge * .54,
            );
            g
              .moveTo(Math.cos(a) * (actor.radius + 7), Math.sin(a) * (actor.radius + 7))
              .lineTo(x, y)
              .stroke({
                color: i % 2 ? profile.core : profile.main,
                width: 1.1 + charge * .6,
                alpha: .18 + charge * .34,
              });
          }

          // Two opposing crescents squeeze the frost into a narrow launch point.
          for (const sign of [-1, 1]) {
            strokeArc(
              g,
              actor.radius + 15 - charge * 3,
              sign > 0 ? -.95 : 2.19,
              sign > 0 ? .95 : 4.09,
              {
                color: sign > 0 ? profile.core : profile.main,
                width: 1.8 + charge * .7,
                alpha: .28 + charge * .48,
              },
              8,
            );
          }

          g.circle(0,0,3 + charge * 5 + pulse).fill({
            color: profile.core,
            alpha: .24 + charge * .56,
          });
          continue;
        }

        // Pyroblast: embers orbit a growing furnace core before the heavy release.
        if (spellId === "mage-pyroblast") {
          const charge = smooth(p);
          const pulse = .5 + .5 * Math.sin(time * 13);
          const furnaceR = actor.radius + 11 + charge * 5;

          g.circle(0,0,furnaceR + 7 + pulse * 2).fill({
            color: profile.main,
            alpha: .07 + charge * .10,
          });
          g.circle(0,0,furnaceR).stroke({
            color: profile.main,
            width: 2.4 + charge * 1.3,
            alpha: .30 + charge * .50,
          });

          for (let i = 0; i < 10; i += 1) {
            const a = i / 10 * Math.PI * 2 + time * (i % 2 ? 1.65 : -1.3);
            const start = actor.radius + 48 + (i % 3) * 6;
            const rr = start * (1 - charge * .63);
            const emberX = Math.cos(a) * rr;
            const emberY = Math.sin(a) * rr - charge * (i % 2 ? 2 : 5);
            g.circle(emberX,emberY,1.7 + (i % 3) * .6 + charge).fill({
              color: i % 3 === 0 ? profile.core : (i % 2 ? profile.main : profile.accent),
              alpha: .24 + charge * .58,
            });
          }

          // Three flame tongues make the charge feel tall and volatile.
          for (let i = 0; i < 3; i += 1) {
            const x = (i - 1) * 8;
            const rise = 12 + charge * (18 + i * 4);
            g
              .moveTo(x,actor.radius + 5)
              .lineTo(x + Math.sin(time * 7 + i) * 4, actor.radius + 5 - rise * .55)
              .lineTo(x + Math.sin(time * 8.5 + i * 1.8) * 3, actor.radius + 5 - rise)
              .stroke({
                color: i === 1 ? profile.core : profile.main,
                width: 1.8 + charge * .8,
                alpha: .24 + charge * .46,
              });
          }

          if (p > .68) {
            const finalP = smooth((p - .68) / .32);
            g.circle(0,0,4 + finalP * 7).fill({
              color: profile.core,
              alpha: finalP * .72,
            });
          }
          continue;
        }

        // Frostfire Bolt: blue ice and orange fire occupy opposite halves, then
        // lock into one bright hybrid core right before release.
        if (spellId === "mage-frostfire-bolt") {
          const charge = smooth(p);
          const pulse = .5 + .5 * Math.sin(time * 15);
          const rr = actor.radius + 19 - charge * 3;

          strokeArc(g,rr,-Math.PI/2+.12,Math.PI/2-.12,{
            color:profile.main,width:2.6 + charge*.8,alpha:.30 + charge*.48,
          },10);
          strokeArc(g,rr,Math.PI/2+.12,Math.PI*1.5-.12,{
            color:profile.accent,width:2.6 + charge*.8,alpha:.30 + charge*.48,
          },10);

          for(let i=0;i<8;i++){
            const ice=i%2===0;
            const side=ice?1:-1;
            const a=(i/8*Math.PI*2)+time * (ice ? .9 : -1.1);
            const start=actor.radius+42+(i%3)*5;
            const r=start*(1-charge*.62);
            const x=Math.abs(Math.cos(a)*r)*side;
            const y=Math.sin(a)*r;
            if(ice){
              drawDiamond(g,x,y,2.3+(i%3)*.5,a,profile.main,.28+charge*.50);
            }else{
              g.circle(x,y,1.8+(i%3)*.55).fill({
                color:i%3===0?profile.core:profile.accent,
                alpha:.28+charge*.50,
              });
            }
          }

          g.circle(0,0,3.4+charge*5.6+pulse).fill({
            color:profile.core,alpha:.24+charge*.58,
          });
          continue;
        }

        // Polymorph: playful arcane diamonds assemble into a tilted control sigil.
        if (spellId === "mage-polymorph") {
          const charge=smooth(p);
          const rotation=time*.45;
          const sigilR=actor.radius+18-charge*4;
          for(let i=0;i<5;i++){
            const a=i/5*Math.PI*2+rotation;
            const start=actor.radius+43+(i%2)*7;
            const rr=start*(1-charge*.58);
            drawDiamond(
              g,
              Math.cos(a)*rr,
              Math.sin(a)*rr,
              2.6+(i%2)*.8,
              a+rotation,
              i%2?profile.core:profile.main,
              .26+charge*.52,
            );
          }
          for(let i=0;i<4;i++){
            const a=rotation+i*Math.PI/2;
            const x=Math.cos(a)*sigilR, y=Math.sin(a)*sigilR;
            const b=rotation+(i+1)*Math.PI/2;
            g.moveTo(x,y).lineTo(Math.cos(b)*sigilR,Math.sin(b)*sigilR).stroke({
              color:i%2?profile.core:profile.main,
              width:1.5+charge*.6,
              alpha:.24+charge*.46,
            });
          }
          g.circle(0,0,3+charge*4.5).fill({
            color:profile.core,alpha:.22+charge*.56,
          });
          continue;
        }

        const swell = smooth(p);
        const pulse = .5 + .5 * Math.sin(time * 12 + actor.x * .01);
        const radius =
          actor.radius + 10 + swell * (profile.heavy ? 16 : 10);
        const ringAlpha = .32 + p * .48;

        g.circle(0,0,radius + pulse * 2).stroke({
          color: profile.main,
          width: 2 + p * 1.1,
          alpha: ringAlpha,
        });

        const runeRadius = radius + 6;
        const runePhase = time * 1.7 * .55;
        for (let i = 0; i < 4; i += 1) {
          const start = i * Math.PI / 2 + .16 + runePhase;
          strokeArc(g,runeRadius,start,start + .62,{
            color: profile.core,
            width: 1.8,
            alpha: .30 + p * .48,
          },6);
        }

        const count = profile.heavy ? 9 : 7;
        const fireLike =
          profile.kind?.includes?.("fire")
          || profile.kind === "lava";
        for (let i = 0; i < count; i += 1) {
          const base = i / count * Math.PI * 2;
          const spin = time * (fireLike ? 2.1 : 1.5);
          const angle = base + spin * (i % 2 ? 1 : -1);
          const startRadius = actor.radius + 34 + (i % 3) * 7;
          const rr = startRadius * (1 - p * .58);
          const x = Math.cos(angle) * rr;
          const y = Math.sin(angle) * rr;
          const size = 1.6 + (i % 3) * .55 + p * .8;
          const moteAlpha = .22 + p * .52;
          const color = i % 3 === 0 ? profile.core : profile.main;

          if (profile.kind === "frost" || profile.kind === "frost-nova") {
            drawDiamond(g,x,y,size,angle,color,moteAlpha);
          } else {
            g.circle(x,y,size).fill({ color, alpha:moteAlpha });
          }
        }

        if (p > .72) {
          g.circle(0,0,5 + (p - .72) * 15).fill({
            color: profile.core,
            alpha: clamp01((p - .72) * 1.7),
          });
        }
        continue;
      }

      // Shaman: Chain Lightning gets a stable storm-sigil buildup instead of
      // orbiting random strands. Other shaman casts keep the elemental gather.
      if (classId === "shaman" && profile) {
        const pulse = .5 + .5 * Math.sin(time * 15);

        if (spellId === "shaman-chain-lightning") {
          const settle = smooth(p);
          const ringRadius = actor.radius + 18 - settle * 3;
          const outerRadius = ringRadius + 8;
          const phase = actor.id?.length ? actor.id.length * .17 : .4;

          // Six fixed storm-rune segments: shape stays readable while intensity
          // builds, rather than lines visibly orbiting the character.
          for (let i = 0; i < 6; i += 1) {
            const center = phase + i * Math.PI / 3;
            strokeArc(
              g,
              ringRadius,
              center - .30,
              center + .30,
              {
                color: i % 2 ? profile.main : profile.core,
                width: 1.55 + p * .70,
                alpha: .28 + p * .48,
              },
              5,
            );

            const nodeX = Math.cos(center) * outerRadius;
            const nodeY = Math.sin(center) * outerRadius;
            g.circle(nodeX,nodeY,1.8 + p * 1.1).fill({
              color: i % 2 ? profile.core : profile.main,
              alpha: .38 + p * .52,
            });
          }

          // Three stationary fork channels point inward. Only their brightness
          // and tiny electrical kink change, so the buildup feels charged rather
          // than like loose strokes moving around the icon.
          for (let i = 0; i < 3; i += 1) {
            const a = phase + i * Math.PI * 2 / 3;
            const outer = actor.radius + 24;
            const inner = actor.radius + 5;
            const kink = Math.sin(time * 22 + i * 2.4) * (1.2 + p * 1.8);
            const x1 = Math.cos(a) * outer;
            const y1 = Math.sin(a) * outer;
            const xm = Math.cos(a) * (outer * .58 + inner * .42)
              + Math.cos(a + Math.PI/2) * kink;
            const ym = Math.sin(a) * (outer * .58 + inner * .42)
              + Math.sin(a + Math.PI/2) * kink;
            const x2 = Math.cos(a) * inner;
            const y2 = Math.sin(a) * inner;

            g.moveTo(x1,y1).lineTo(xm,ym).lineTo(x2,y2).stroke({
              color: profile.core,
              width: 1.3 + p * .65,
              alpha: (.20 + p * .52) * (.86 + pulse * .14),
            });
          }

          // Final charge compresses into the caster just before release.
          if (p > .72) {
            const finalP = smooth((p - .72) / .28);
            g.circle(0,0,actor.radius + 8 - finalP * 3).stroke({
              color: profile.core,
              width: 1.4 + finalP * 1.2,
              alpha: .22 + finalP * .54,
            });
            g.circle(0,0,3 + finalP * 5).fill({
              color: profile.core,
              alpha: finalP * .55,
            });
          }
          continue;
        }

        // Lava Burst: molten stones rise around a tightening volcanic ring.
        if (spellId === "shaman-lava-burst") {
          const charge=smooth(p);
          const pulse=.5+.5*Math.sin(time*14);
          const rr=actor.radius+20-charge*4;

          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+.17;
            const inner=actor.radius+7;
            const outer=rr+(i%2)*5;
            g
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a+.12*(i%2?1:-1))*outer,Math.sin(a+.12*(i%2?1:-1))*outer)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:1.6+charge*.7,
                alpha:.22+charge*.48,
              });
          }

          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+time*(i%2?.75:-.55);
            const start=actor.radius+45+(i%3)*6;
            const r=start*(1-charge*.64);
            const x=Math.cos(a)*r;
            const y=Math.sin(a)*r-charge*(5+(i%3)*3);
            g.circle(x,y,2+(i%3)*.65).fill({
              color:i%3===0?profile.core:(i%2?profile.main:profile.accent),
              alpha:.24+charge*.54,
            });
          }

          g.circle(0,0,4+charge*6+pulse).fill({
            color:profile.core,alpha:.22+charge*.60,
          });
          continue;
        }

        // Elemental Blast: lightning, fire and nature satellites visibly merge.
        if (spellId === "shaman-elemental-blast") {
          const charge=smooth(p);
          const colors=[profile.main,profile.accent,0x86bd78];
          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+time*(i%2?-.75:.85);
            const start=actor.radius+42;
            const r=start*(1-charge*.58);
            const x=Math.cos(a)*r;
            const y=Math.sin(a)*r;
            g.circle(x,y,4.2+charge*1.8).fill({
              color:colors[i],alpha:.28+charge*.50,
            });
            g.moveTo(x,y).lineTo(0,0).stroke({
              color:colors[i],width:1.3+charge*.6,alpha:.18+charge*.34,
            });
          }

          for(let ring=0;ring<2;ring++){
            const rr=actor.radius+16+ring*7-charge*(2+ring*2);
            const phase=(ring?-.35:.4)*p;
            for(let seg=0;seg<3;seg++){
              const a0=seg*Math.PI*2/3+.2+phase;
              strokeArc(g,rr,a0,a0+.68,{
                color:colors[(seg+ring)%3],
                width:1.6+charge*.5,
                alpha:.20+charge*.42,
              },6);
            }
          }

          g.circle(0,0,3.5+charge*6).fill({
            color:profile.core,alpha:.24+charge*.64,
          });
          continue;
        }

        // Hex: a green nature seal closes around the Shaman instead of using
        // generic elemental streaks.
        if (spellId === "shaman-hex") {
          const charge=smooth(p);
          const rr=actor.radius+20-charge*5;
          const phase=time*.32;

          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+phase;
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr;
            drawDiamond(g,x,y,2.2+(i%2)*.6,a, i%2?profile.core:profile.main,.25+charge*.48);
          }
          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+phase*.4;
            g
              .moveTo(Math.cos(a)*(actor.radius+7),Math.sin(a)*(actor.radius+7))
              .lineTo(Math.cos(a)*(actor.radius+27-charge*7),Math.sin(a)*(actor.radius+27-charge*7))
              .stroke({
                color:i===1?profile.core:profile.main,
                width:1.5+charge*.5,
                alpha:.22+charge*.44,
              });
          }
          g.ellipse(0,0,actor.radius+5-charge*2,7-charge).stroke({
            color:profile.core,width:1.7+charge*.6,alpha:.24+charge*.50,
          });
          continue;
        }

        const count = profile.heavy ? 7 : 5;
        for (let i = 0; i < count; i += 1) {
          const base =
            i / count * Math.PI * 2
            + time * .55 * (i % 2 ? 1 : -1);
          const start = actor.radius + 27 + (i % 3) * 6;
          const end = Math.max(actor.radius + 7,start * (1 - p * .58));
          const x1 = Math.cos(base) * start;
          const y1 = Math.sin(base) * start;
          const x2 = Math.cos(base) * end;
          const y2 = Math.sin(base) * end;

          g.moveTo(x1,y1).lineTo(x2,y2).stroke({
            color: i % 3 === 0 ? profile.core : profile.main,
            width: 1.2 + (i % 2) * .55,
            alpha: .16 + p * .40,
          });
        }

        if (p > .68) {
          const flicker = (p - .68) / .32;
          for (let i = 0; i < 4; i += 1) {
            const a = i / 4 * Math.PI * 2;
            g.circle(
              Math.cos(a) * (actor.radius + 5),
              Math.sin(a) * (actor.radius + 5),
              1.5 + pulse * .7,
            ).fill({
              color: i % 2 ? profile.core : profile.main,
              alpha: flicker * .60,
            });
          }
        }
        continue;
      }

      // Warlock: smoky motes spiral inward with three broken shadow arcs.
      if (classId === "warlock" && profile) {
        const pulse = .5 + .5 * Math.sin(time * 12);

        // Shadow Bolt: broken shadow crescents collapse into a dense dark core.
        if (spellId === "warlock-shadow-bolt") {
          const charge=smooth(p);
          for(let ring=0;ring<3;ring++){
            const rr=actor.radius+27+ring*7-charge*(9+ring*2);
            const phase=(ring%2?-.42:.36)*p;
            for(let seg=0;seg<2;seg++){
              const a0=seg*Math.PI+phase+ring*.23;
              strokeArc(g,rr,a0,a0+1.12,{
                color:ring===1?profile.core:profile.main,
                width:1.8+charge*.55,
                alpha:.24+charge*.46,
              },7);
            }
          }
          for(let i=0;i<9;i++){
            const a=i/9*Math.PI*2+time*(i%2?.65:-.58);
            const start=actor.radius+46+(i%3)*5;
            const r=start*(1-charge*.68);
            g.circle(Math.cos(a)*r,Math.sin(a)*r,1.7+(i%3)*.5).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:.24+charge*.54,
            });
          }
          g.circle(0,0,4+charge*5.5).fill({
            color:profile.core,alpha:.20+charge*.60,
          });
          continue;
        }

        // Chaos Bolt: two fel jaws clamp inward while green fractures charge.
        if (spellId === "warlock-chaos-bolt") {
          const charge=smooth(p);
          const jawR=actor.radius+24-charge*5;
          for(const sign of [-1,1]){
            const center=sign>0?0:Math.PI;
            strokeArc(g,jawR,center-.82,center+.82,{
              color:sign>0?profile.core:profile.main,
              width:2.8+charge*1.0,
              alpha:.30+charge*.52,
            },9);
          }
          for(let i=0;i<7;i++){
            const a=i/7*Math.PI*2+.2;
            const outer=actor.radius+43+(i%2)*7;
            const inner=actor.radius+8+charge*3;
            const kink=a+(i%2?.18:-.16);
            g
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(kink)*(outer*.58+inner*.42),Math.sin(kink)*(outer*.58+inner*.42))
              .lineTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:1.5+charge*.65,
                alpha:.20+charge*.48,
              });
          }
          g.circle(0,0,5+charge*6+pulse).fill({
            color:profile.core,alpha:.24+charge*.66,
          });
          continue;
        }

        // Fear: an ominous eye narrows while thorn-like shadow marks close in.
        if (spellId === "warlock-fear") {
          const charge=smooth(p);
          const eyeW=actor.radius+15-charge*5;
          const eyeH=10-charge*3+pulse;
          g.ellipse(0,0,eyeW,eyeH).stroke({
            color:profile.core,width:2+charge*.7,alpha:.28+charge*.50,
          });
          g.circle(0,0,3+charge*4).fill({
            color:profile.main,alpha:.24+charge*.58,
          });
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+.18;
            const outer=actor.radius+39-(i%2)*3;
            const inner=actor.radius+13-charge*5;
            g
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(a+(i%2?.16:-.16))*inner,Math.sin(a+(i%2?.16:-.16))*inner)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:1.3+charge*.55,
                alpha:.18+charge*.42,
              });
          }
          continue;
        }

        // Drain Life: three siphon channels tighten around a hollow soul ring.
        if (spellId === "warlock-drain-life") {
          const charge=smooth(p);
          const rr=actor.radius+24-charge*5;
          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+time*(i%2?.38:-.42);
            const outer=actor.radius+45;
            const x1=Math.cos(a)*outer, y1=Math.sin(a)*outer;
            const x2=Math.cos(a+.32)*rr, y2=Math.sin(a+.32)*rr;
            g.moveTo(x1,y1).lineTo(x2,y2).stroke({
              color:i===1?profile.core:profile.main,
              width:1.7+charge*.6,
              alpha:.22+charge*.46,
            });
          }
          g.circle(0,0,rr).stroke({
            color:profile.main,width:1.9+charge*.6,alpha:.24+charge*.46,
          });
          g.circle(0,0,Math.max(4,9-charge*3)).stroke({
            color:profile.core,width:1.5,alpha:.30+charge*.42,
          });
          continue;
        }
        for (let i = 0; i < 8; i += 1) {
          const base =
            (i / 8) * Math.PI * 2
            + Math.sin((actor.id?.length || 1) * .7 + i * 3.1) * .45;
          const angle = base + time * 1.3 * (i % 2 ? 1 : -1);
          const radius = actor.radius + 38 + (i % 4) * 5;
          const inward = radius * (1 - p * .68);
          g.circle(
            Math.cos(angle) * inward,
            Math.sin(angle) * inward,
            1.5 + (i % 3) * .55,
          ).fill({
            color: i % 3 === 0 ? profile.core : profile.main,
            alpha: .25 + p * .5,
          });
        }

        for (let i = 0; i < 3; i += 1) {
          const radius = actor.radius + 11 + i * 5 + pulse * 2;
          const start =
            -1.4 + i * 2.1 + time * (i % 2 ? -1 : 1);
          strokeArc(g,radius,start,start + .9,{
            color: profile.main,
            width:2,
            alpha:.25 + p * .45,
          },6);
        }

        if (p > .74) {
          g.circle(0,0,4 + (p - .74) * 16).fill({
            color:profile.core,
            alpha:clamp01((p - .74) * 1.8),
          });
        }
        continue;
      }

      // Priest: Mind Blast gets a dedicated psychic aperture. Other Priest
      // casts keep the holy/shadow gather language.
      if (classId === "priest" && profile) {
        if (spellId === "priest-smite") {
          const pulse = .5 + .5 * Math.sin(time * 17);
          const squeeze = smooth(p);

          // Broken psychic halos collapse toward the caster.
          for (let ring = 0; ring < 3; ring += 1) {
            const rr = actor.radius + 28 + ring * 8 - squeeze * (12 + ring * 3);
            const phase = (ring % 2 ? -1 : 1) * p * .52;
            for (let seg = 0; seg < 3; seg += 1) {
              const a0 = seg * Math.PI * 2 / 3 + .22 + phase;
              strokeArc(
                g,
                rr,
                a0,
                a0 + .72,
                {
                  color: ring === 1 ? profile.core : profile.main,
                  width: 1.7 + p * .65,
                  alpha: .28 + p * (.28 + ring * .06),
                },
                6,
              );
            }
          }

          // Purple shards are visibly sucked inward as the cast completes.
          for (let i = 0; i < 9; i += 1) {
            const a =
              i / 9 * Math.PI * 2
              + (i % 2 ? -.34 : .28) * time
              + i * .13;
            const start = actor.radius + 42 + (i % 3) * 7;
            const rr = start * (1 - squeeze * .66);
            g.circle(
              Math.cos(a) * rr,
              Math.sin(a) * rr,
              1.7 + (i % 3) * .55,
            ).fill({
              color: i % 3 === 0 ? profile.core : profile.main,
              alpha: .28 + p * .52,
            });
          }

          // A narrow "mind eye" closes around the Priest before the snap.
          const eyeW = actor.radius + 13 - squeeze * 5;
          const eyeH = 8 + pulse * 2 - squeeze * 2;
          g.ellipse(0, 0, eyeW, eyeH).stroke({
            color: profile.core,
            width: 1.8 + p * .8,
            alpha: .30 + p * .48,
          });
          g.circle(0,0,2.8 + p * 4.8).fill({
            color: profile.core,
            alpha: .22 + p * .56,
          });

          if (p > .72) {
            const finalP = smooth((p - .72) / .28);
            for (let i = 0; i < 6; i += 1) {
              const a = i / 6 * Math.PI * 2;
              g
                .moveTo(
                  Math.cos(a) * (actor.radius + 14),
                  Math.sin(a) * (actor.radius + 14),
                )
                .lineTo(
                  Math.cos(a) * (actor.radius + 5),
                  Math.sin(a) * (actor.radius + 5),
                )
                .stroke({
                  color: i % 2 ? profile.core : profile.main,
                  width: 1.4,
                  alpha: finalP * .58,
                });
            }
          }
          continue;
        }

        // Holy Fire: a miniature sun seal ignites around the Priest before
        // the sky-strike lands on the target.
        if (spellId === "priest-holy-fire") {
          const charge=smooth(p);
          const pulse=.5+.5*Math.sin(time*15);
          const rr=actor.radius+18-charge*3;

          g.circle(0,0,rr+6+pulse*2).stroke({
            color:profile.main,width:2.3+charge*.8,alpha:.28+charge*.50,
          });
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2;
            const inner=rr*.62;
            const outer=rr+(i%2?8:14)+charge*4;
            g
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:i%2?1.5:2.0,
                alpha:.22+charge*.46,
              });
          }
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+time*(i%2?.65:-.55);
            const start=actor.radius+44+(i%3)*5;
            const r=start*(1-charge*.64);
            g.circle(Math.cos(a)*r,Math.sin(a)*r,1.5+(i%3)*.5).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:.24+charge*.50,
            });
          }
          g.circle(0,0,4+charge*5).fill({
            color:profile.core,alpha:.24+charge*.62,
          });
          continue;
        }

        // Flash Heal: quick four-point convergence, intentionally compact.
        if (spellId === "priest-flash-heal") {
          const charge=smooth(p);
          const rr=actor.radius+26-charge*10;
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+Math.PI/4;
            const x=Math.cos(a)*rr, y=Math.sin(a)*rr;
            g.circle(x,y,2.2+charge*.8).fill({
              color:i%2?profile.core:profile.main,
              alpha:.28+charge*.52,
            });
            g.moveTo(x,y).lineTo(Math.cos(a)*(actor.radius+6),Math.sin(a)*(actor.radius+6)).stroke({
              color:i%2?profile.core:profile.main,
              width:1.4+charge*.5,
              alpha:.20+charge*.40,
            });
          }
          g.circle(0,0,3+charge*4.5).fill({
            color:profile.core,alpha:.24+charge*.60,
          });
          continue;
        }

        // Greater Heal: broad layered holy halos make the long cast feel weighty.
        if (spellId === "priest-greater-heal") {
          const charge=smooth(p);
          const pulse=.5+.5*Math.sin(time*11);
          for(let ring=0;ring<3;ring++){
            const rr=actor.radius+14+ring*9+charge*(5-ring*1.5);
            g.circle(0,0,rr+pulse*(ring===2?2:1)).stroke({
              color:ring===1?profile.core:profile.main,
              width:1.6+ring*.35+charge*.5,
              alpha:.20+charge*(.38+ring*.04),
            });
          }
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2;
            const inner=actor.radius+5;
            const outer=actor.radius+32+charge*12+(i%2)*6;
            g
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:1.5+charge*.7,
                alpha:.18+charge*.42,
              });
          }
          if(p>.62){
            const finalP=smooth((p-.62)/.38);
            g.circle(0,0,4+finalP*8).fill({
              color:profile.core,alpha:finalP*.66,
            });
          }
          continue;
        }

        const shadow =
          profile.kind === "mind-implosion"
          || profile.kind === "shadow-wave";
        const count = shadow ? 5 : 7;
        const pulse = .5 + .5 * Math.sin(time * 14);

        for (let i = 0; i < count; i += 1) {
          const a =
            i / count * Math.PI * 2
            + time * 1.2 * (i % 2 ? 1 : -1);
          const rr = actor.radius + 28 - p * 14 + (i % 2) * 5;
          g.circle(
            Math.cos(a) * rr,
            Math.sin(a) * rr,
            1.5 + p * 1.1,
          ).fill({
            color:i % 3 === 0 ? profile.core : profile.main,
            alpha:.24 + p * .48,
          });
        }

        g.circle(0,0,actor.radius + 10 + p * 8 + pulse * 2).stroke({
          color:profile.main,
          width:1.8,
          alpha:.28 + p * .36,
        });

        if (p > .74) {
          g.circle(0,0,4 + (p - .74) * 15).fill({
            color:profile.core,
            alpha:clamp01((p - .74) * 1.7),
          });
        }
        continue;
      }

      // Druid: leaf motes spiral inward, avoiding a mage-like rune ring.
      if (classId === "druid" && profile) {
        for (let i = 0; i < 8; i += 1) {
          const base =
            i / 8 * Math.PI * 2
            + Math.sin(actor.x * .011 + actor.y * .019 + i * 2.7) * .38;
          const a = base + time * (i % 2 ? 1 : -1);
          const rr = actor.radius + 34 - p * 18 + (i % 3) * 4;
          drawLeaf(
            g,
            Math.cos(a) * rr,
            Math.sin(a) * rr,
            a + p,
            2.8 + (i % 3) * .6,
            i % 3 === 0 ? profile.core : profile.main,
            .24 + p * .48,
          );
        }

        if (p > .74) {
          g.circle(0,0,4 + (p - .74) * 15).fill({
            color:profile.core,
            alpha:clamp01((p - .74) * 1.7),
          });
        }
        continue;
      }

      // Paladin: rotating angular seal and four holy rays.
      if (classId === "paladin" && profile) {
        const pulse = .5 + .5 * Math.sin(time * 15);
        const rotation = p * .35;
        const r = actor.radius + 12 + p * 10 + pulse * 2;
        const half = r * .62;
        const corners = [
          [-half,-half],[half,-half],[half,half],[-half,half],
        ].map(([x,y]) => {
          const ca=Math.cos(rotation), sa=Math.sin(rotation);
          return {x:x*ca-y*sa,y:x*sa+y*ca};
        });

        g.moveTo(corners[0].x,corners[0].y);
        for(let i=1;i<corners.length;i++) g.lineTo(corners[i].x,corners[i].y);
        g.lineTo(corners[0].x,corners[0].y).stroke({
          color:profile.main,
          width:1.8 + p * .7,
          alpha:.28 + p * .48,
        });

        for(let i=0;i<4;i++){
          const a=i*Math.PI/2 + rotation;
          g
            .moveTo(Math.cos(a)*r*.55,Math.sin(a)*r*.55)
            .lineTo(Math.cos(a)*r,Math.sin(a)*r)
            .stroke({
              color:profile.main,
              width:1.8 + p*.7,
              alpha:.28 + p*.48,
            });
        }
        continue;
      }

      // Death Knight: three cold rune strokes rotate inward. Obliterate adds
      // five frost motes, matching its heavier windup.
      if (classId === "death-knight" && profile) {
        const rotation = -p * .65;
        for(let i=0;i<3;i++){
          const a=i*Math.PI*2/3 + rotation;
          const p0={
            x:Math.cos(a)*(actor.radius+7),
            y:Math.sin(a)*(actor.radius+7),
          };
          const p1={
            x:Math.cos(a+.4)*(actor.radius+20-p*6),
            y:Math.sin(a+.4)*(actor.radius+20-p*6),
          };
          g.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
            color:profile.main,
            width:1.7,
            alpha:.28+p*.48,
          });
        }

        if(profile.kind==="obliterate"){
          for(let i=0;i<5;i++){
            const a=i*Math.PI*2/5 + rotation*.4;
            g.circle(
              Math.cos(a)*(actor.radius+14),
              Math.sin(a)*(actor.radius+14),
              1.7,
            ).fill({
              color:profile.core,
              alpha:.35+p*.4,
            });
          }
        }
        continue;
      }

      // Warrior/Rogue are mostly instant. Slam is the current visible melee
      // cast and should feel like weapon weight rather than caster magic.
      if (classId === "warrior" && profile) {
        const heavy = spellId === "warrior-slam";
        const cueP = Math.max(0,1-p);
        const fade = 1-clamp01(cueP);
        const count = heavy ? 5 : 3;
        for(let i=0;i<count;i++){
          const a=-.95+i*(heavy?.48:.72);
          const inner=actor.radius+5;
          const outer=actor.radius+13+i*2+cueP*8;
          g
            .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
            .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
            .stroke({
              color:profile.accent,
              width:heavy?2.4:1.6,
              alpha:fade*(heavy?.58:.38),
            });
        }

        if(heavy){
          strokeArc(
            g,
            actor.radius+11+p*8,
            -2.5,
            -.5,
            {
              color:profile.core,
              width:2+p*1.6,
              alpha:.25+p*.45,
            },
            7,
          );
        }
        continue;
      }

      if (classId === "rogue" && profile) {
        const cueP=Math.max(0,1-p);
        const fade=1-clamp01(cueP);
        for(let i=0;i<3;i++){
          const a=i*Math.PI*2/3-cueP*1.8;
          strokeArc(g,actor.radius+7+i*3,a,a+.72,{
            color:profile.accent,
            width:1.4,
            alpha:fade*.38,
          },5);
        }
        continue;
      }

      // Generic future-proof fallback for any cast without a class VFX profile.
      const [main,core]=burstColors(spell?.visualStyle || actor.visualStyle || "damage");
      const pulse=.5+.5*Math.sin(time*10+actor.x*.01);
      g.circle(0,0,actor.radius+14+p*6+pulse*1.5).stroke({
        color:main,
        width:3,
        alpha:.35+p*.35,
      });
      if(p>.78){
        g.circle(0,0,4+(p-.78)*10).fill({
          color:core,
          alpha:clamp01((p-.78)*2.2)*.55,
        });
      }
    }
  }

  updateNativeBurstVfx(game) {
    for (const view of this.actorViews.values()) {
      view.burstFx.clear();
      view.burstFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "burst") continue;

      const view = this.actorViews.get(effect.targetId);
      if (!view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core] = burstColors(effect.style);
      const healing = ["heal", "priest", "druid", "paladin"].includes(effect.style);
      const outer = 9 + progress * (healing ? 43 : 35);
      const inner = 5 + progress * (healing ? 27 : 21);

      view.burstFx.visible = true;
      view.burstFx
        .circle(0, 0, outer)
        .stroke({
          color: main,
          width: healing ? 4.2 : 3.4,
          alpha: alpha * .96,
        })
        .circle(0, 0, inner)
        .stroke({
          color: core,
          width: 1.6,
          alpha: alpha * .86,
        });

      const motes = healing ? 9 : 7;
      for (let i = 0; i < motes; i += 1) {
        const angle = (i / motes) * Math.PI * 2 + progress * 1.25;
        const radius = 8 + progress * (healing ? 27 : 21);
        view.burstFx
          .circle(
            Math.cos(angle) * radius,
            Math.sin(angle) * radius,
            healing ? 2 : 1.6,
          )
          .fill({
            color: i % 2 ? core : main,
            alpha: alpha * .76,
          });
      }
    }
  }

  updateNativeSlashVfx(game) {
    for (const view of this.actorViews.values()) {
      view.slashFx.clear();
      view.slashFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "slash") continue;

      const view = this.actorViews.get(effect.targetId);
      if (!view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core] = burstColors(effect.style);
      const spread = 8 + progress * 18;

      view.slashFx.visible = true;

      view.slashFx
        .moveTo(-spread, -spread)
        .lineTo(spread, spread)
        .moveTo(spread, -spread)
        .lineTo(-spread, spread)
        .stroke({
          color: main,
          width: 5.6,
          alpha: alpha * .90,
        });

      view.slashFx
        .moveTo(-spread * .9, -spread * .9)
        .lineTo(spread * .9, spread * .9)
        .moveTo(spread * .9, -spread * .9)
        .lineTo(-spread * .9, spread * .9)
        .stroke({
          color: core,
          width: 1.7,
          alpha: alpha * .98,
        });

      view.slashFx
        .circle(0, 0, Math.max(6, spread * .72))
        .stroke({
          color: main,
          width: 1.5,
          alpha: alpha * .48,
        });
    }
  }

  updateNativeRingVfx(game) {
    for (const view of this.actorViews.values()) {
      view.ringFx.clear();
      view.ringFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "ring") continue;

      const view = this.actorViews.get(effect.sourceId);
      if (!view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core] = burstColors(effect.style);
      const healing = ["heal", "priest", "druid", "paladin"].includes(effect.style);
      const start = Number(effect.radiusStart) || 20;
      const end = Number(effect.radiusEnd) || 80;
      const radius = start + (end - start) * progress;

      view.ringFx.visible = true;
      view.ringFx
        .circle(0, 0, radius)
        .stroke({
          color: main,
          width: healing ? 4.3 - progress * .8 : 4.6 - progress * 1.0,
          alpha: alpha * .95,
        });

      view.ringFx
        .circle(0, 0, Math.max(4, radius - 7))
        .stroke({
          color: core,
          width: 1.5,
          alpha: alpha * (healing ? .70 : .55),
        });

      if (healing) {
        const motes = effect.style === "druid" ? 7 : 6;
        for (let i = 0; i < motes; i += 1) {
          const angle = (i / motes) * Math.PI * 2 + progress * 2.1;
          const rr = Math.max(8, radius - 3);
          view.ringFx
            .circle(
              Math.cos(angle) * rr,
              Math.sin(angle) * rr - progress * 6,
              effect.style === "druid" ? 1.8 : 1.6,
            )
            .fill({
              color: i % 2 ? core : main,
              alpha: alpha * .76,
            });
        }
      }
    }
  }

  updateNativeBeamVfx(game) {
    for (const view of this.actorViews.values()) {
      view.beamFx.clear();
      view.beamFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "beam") continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !target || !view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core] = burstColors(effect.style);
      const healing = ["heal", "priest", "druid", "paladin"].includes(effect.style);

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length;
      const ny = dx / length;

      view.beamFx.visible = true;

      if (healing) {
        const bendSign = effect.id % 2 === 0 ? 1 : -1;
        const bend = Math.min(42, Math.max(16, length * .09)) * bendSign;
        const cx = dx * .5 + nx * bend;
        const cy = dy * .5 + ny * bend;
        const segments = 12;

        const curvePoint = t => {
          const inv = 1 - t;
          return {
            x: 2 * inv * t * cx + t * t * dx,
            y: 2 * inv * t * cy + t * t * dy,
          };
        };

        let previous = { x: 0, y: 0 };
        for (let i = 1; i <= segments; i += 1) {
          const point = curvePoint(i / segments);
          view.beamFx
            .moveTo(previous.x, previous.y)
            .lineTo(point.x, point.y)
            .stroke({
              color: main,
              width: effect.style === "paladin" ? 6.2 : 5.3,
              alpha: alpha * .92,
            });
          view.beamFx
            .moveTo(previous.x, previous.y)
            .lineTo(point.x, point.y)
            .stroke({
              color: core,
              width: 1.55,
              alpha: alpha * .96,
            });
          previous = point;
        }

        const motes = effect.style === "druid" ? 7 : 6;
        for (let i = 0; i < motes; i += 1) {
          const t = (progress * 1.45 + i / motes) % 1;
          const point = curvePoint(t);
          const wobble = Math.sin(effect.id * 1.7 + i * 2.3 + progress * 9) * 6;
          view.beamFx
            .circle(
              point.x + nx * wobble,
              point.y + ny * wobble,
              effect.style === "druid" ? 2.1 : 1.8,
            )
            .fill({
              color: i % 2 ? core : main,
              alpha: alpha * (.34 + (1 - t) * .34),
            });
        }

        const impactRadius = 14 + progress * 14;
        view.beamFx
          .circle(dx, dy, impactRadius)
          .stroke({
            color: core,
            width: 2.1,
            alpha: alpha * .80,
          });
      } else {
        view.beamFx
          .moveTo(0, 0)
          .lineTo(dx, dy)
          .stroke({
            color: main,
            width: 4.0,
            alpha: alpha * .92,
          });

        view.beamFx
          .moveTo(0, 0)
          .lineTo(dx, dy)
          .stroke({
            color: core,
            width: 1.4,
            alpha: alpha * .88,
          });
      }
    }
  }

  updateNativeChainVfx(game) {
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };

    const strokePath = (graphics, points, style) => {
      if (!points || points.length < 2 || style.alpha <= 0) return;
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        graphics.lineTo(points[i].x, points[i].y);
      }
      graphics.stroke(style);
    };

    for (const view of this.actorViews.values()) {
      view.chainGlowFx.clear();
      view.chainFx.clear();
      view.chainSparkFx.clear();
      view.chainGlowFx.visible = false;
      view.chainFx.visible = false;
      view.chainSparkFx.visible = false;
      view.chainGlowFx.position.set(0,0);
      view.chainFx.position.set(0,0);
      view.chainSparkFx.position.set(0,0);
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "chain") continue;

      const actors = (effect.actorIds || [])
        .map(id => game.getActor(id))
        .filter(Boolean);
      if (actors.length < 2) continue;

      const source = actors[0];
      const view = this.actorViews.get(source.id);
      if (!view || !view.root.visible) continue;

      const sourceCenter = visualActorCenter(this.actorViews, source, source.x, source.y);
      const sourceOffsetX = sourceCenter.x - source.x;
      const sourceOffsetY = sourceCenter.y - source.y;
      view.chainGlowFx.position.set(sourceOffsetX,sourceOffsetY);
      view.chainFx.position.set(sourceOffsetX,sourceOffsetY);
      view.chainSparkFx.position.set(sourceOffsetX,sourceOffsetY);

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = clamp01(1 - remaining / total);
      const alpha = clamp01(remaining / total);
      const specialChainLightning = effect.spellId === "shaman-chain-lightning";
      const palette = specialChainLightning
        ? { main: 0x59ccef, core: 0xf5ffff, accent: 0x3f91c9 }
        : (() => {
            const [main, core] = burstColors(effect.style || "lightning");
            return { main, core, accent: main };
          })();

      view.chainGlowFx.visible = true;
      view.chainFx.visible = true;
      view.chainSparkFx.visible = true;

      for (let segmentIndex = 0; segmentIndex < actors.length - 1; segmentIndex += 1) {
        const fromActor = actors[segmentIndex];
        const toActor = actors[segmentIndex + 1];

        const localProgress = specialChainLightning
          ? clamp01((progress - segmentIndex * .10) / .66)
          : progress;
        if (localProgress <= 0) continue;

        const fade = specialChainLightning
          ? 1 - clamp01((localProgress - .54) / .46)
          : alpha;

        const reveal = specialChainLightning
          ? clamp01(localProgress / .34)
          : 1;
        const easedReveal = easeOut(reveal);

        const fromCenter = visualActorCenter(
          this.actorViews,
          fromActor,
          fromActor.x,
          fromActor.y,
        );
        const toCenter = visualActorCenter(
          this.actorViews,
          toActor,
          toActor.x,
          toActor.y,
        );
        const from = {
          x: fromCenter.x - sourceCenter.x,
          y: fromCenter.y - sourceCenter.y,
        };
        const fullTo = {
          x: toCenter.x - sourceCenter.x,
          y: toCenter.y - sourceCenter.y,
        };
        const to = {
          x: from.x + (fullTo.x - from.x) * easedReveal,
          y: from.y + (fullTo.y - from.y) * easedReveal,
        };

        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const px = -dy / length;
        const py = dx / length;
        const tx = dx / length;
        const ty = dy / length;
        const seed = Number(effect.seed || 1) + segmentIndex * 47;

        // Chain Lightning should "snap" between electrical shapes instead of
        // smoothly wobbling like a ribbon. Quantizing the geometry phase gives
        // the bolt a harsher, more electrical cadence while remaining deterministic.
        const snapFrame = Math.floor(game.elapsedSeconds * 34 + segmentIndex * 3);
        const microPhase = game.elapsedSeconds * 71 + seed * .031;
        const flicker =
          .84
          + (.5 + .5 * Math.sin(microPhase)) * .16;
        const hotFlash =
          Math.pow(Math.max(0, Math.sin(microPhase * .63 + 1.1)), 7) * .24;
        const baseAmplitude = Math.min(22, Math.max(10, length * .072));

        const buildArc = (seedOffset, amplitude, phaseOffset = 0) => {
          const segments = Math.max(7, Math.min(13, Math.round(length / 25)));
          const points = [{ x: from.x, y: from.y }];

          for (let i = 1; i < segments; i += 1) {
            const t = i / segments;
            const envelope = Math.sin(t * Math.PI);
            const phaseSeed = snapFrame * .91 + phaseOffset;
            const waveA = Math.sin(
              (seed + seedOffset) * .37 + i * 2.31 + phaseSeed * 1.71,
            );
            const waveB = Math.sin(
              (seed + seedOffset) * .17 + i * 4.19 - phaseSeed * 2.13,
            );
            const tooth = Math.sin(
              (seed + seedOffset) * .071 + i * 7.13 + snapFrame * 1.37,
            );
            const jitter =
              (waveA * .66 + waveB * .31 + tooth * .23)
              * amplitude
              * envelope;

            points.push({
              x: from.x + dx * t + px * jitter,
              y: from.y + dy * t + py * jitter,
            });
          }

          points.push({ x: to.x, y: to.y });
          return points;
        };

        const mainArc = buildArc(0, baseAmplitude);
        const sideArcA = buildArc(19, baseAmplitude * 1.36, .9);
        const sideArcB = buildArc(37, baseAmplitude * 1.22, -1.1);
        const sideArcC = buildArc(61, baseAmplitude * 1.52, 2.2);
        const secondaryEnvelope =
          clamp01(reveal / .72)
          * (1 - clamp01((localProgress - .58) / .26));
        const afterimageStrength =
          clamp01((reveal - .18) / .42)
          * (1 - clamp01((localProgress - .62) / .20));
        const afterimageArc = mainArc.map((point, index) => {
          const t = index / Math.max(1, mainArc.length - 1);
          const trail = 5.5 * Math.sin(t * Math.PI);
          return {
            x: point.x - tx * trail + px * 1.6,
            y: point.y - ty * trail + py * 1.6,
          };
        });

        if (!specialChainLightning) {
          strokePath(view.chainGlowFx, mainArc, {
            color: palette.main,
            width: 10,
            alpha: alpha * fade * .28,
          });
          strokePath(view.chainFx, mainArc, {
            color: palette.main,
            width: 5.2,
            alpha: alpha * fade * .72,
          });
          strokePath(view.chainFx, mainArc, {
            color: palette.core,
            width: 1.8,
            alpha: alpha * fade * .98,
          });
          continue;
        }

        const hopEnergy = specialChainLightning
          ? Math.min(1, .96 + segmentIndex * .02)
          : alpha;
        const intensity = hopEnergy * fade * flicker;

        // A short offset afterimage helps the bolt read as a fast electrical snap
        // rather than a bundle of equally persistent lines.
        strokePath(view.chainGlowFx, afterimageArc, {
          color: palette.accent,
          width: 8,
          alpha: intensity * afterimageStrength * .075,
        });
        strokePath(view.chainFx, afterimageArc, {
          color: palette.main,
          width: 1.35,
          alpha: intensity * afterimageStrength * .18,
        });

        // A wider halo gives the bolt actual luminous volume instead of reading
        // as a cyan line. The hot flash occasionally overdrives it for a frame.
        strokePath(view.chainGlowFx, mainArc, {
          color: palette.main,
          width: 22,
          alpha: intensity * (.20 + hotFlash),
        });
        strokePath(view.chainGlowFx, mainArc, {
          color: palette.core,
          width: 11,
          alpha: intensity * (.075 + hotFlash * .42),
        });
        strokePath(view.chainGlowFx, sideArcA, {
          color: palette.main,
          width: 11,
          alpha: intensity * .105,
        });
        strokePath(view.chainGlowFx, sideArcB, {
          color: palette.accent,
          width: 9,
          alpha: intensity * .085,
        });

        // Dense cyan body + white core + razor-thin hot center.
        strokePath(view.chainFx, mainArc, {
          color: palette.accent,
          width: 8.4,
          alpha: intensity * .34,
        });
        strokePath(view.chainFx, mainArc, {
          color: palette.main,
          width: 6.2,
          alpha: intensity * .88,
        });
        strokePath(view.chainFx, mainArc, {
          color: palette.core,
          width: 2.55,
          alpha: Math.min(1, intensity * (1.02 + hotFlash)),
        });
        strokePath(view.chainSparkFx, mainArc, {
          color: 0xffffff,
          width: .72,
          alpha: Math.min(1, intensity * (.72 + hotFlash * 1.4)),
        });

        // Secondary arcs are deliberately intermittent. Electricity should
        // appear/disappear rather than keep three perfectly stable parallel lines.
        const secondaryVisibilityA =
          Math.sin(snapFrame * 1.17 + seed * .13) > -.38 ? 1 : 0;
        const secondaryVisibilityB =
          Math.sin(snapFrame * .93 + seed * .27 + 1.4) > -.18 ? 1 : 0;
        const secondaryVisibilityC =
          Math.sin(snapFrame * 1.41 + seed * .19 + 2.1) > .16 ? 1 : 0;

        strokePath(view.chainGlowFx, sideArcA, {
          color: palette.main,
          width: 6.5,
          alpha: intensity * secondaryEnvelope * .10 * secondaryVisibilityA,
        });
        strokePath(view.chainFx, sideArcA, {
          color: palette.main,
          width: 1.85,
          alpha: intensity * secondaryEnvelope * .58 * secondaryVisibilityA,
        });
        strokePath(view.chainFx, sideArcB, {
          color: palette.core,
          width: 1.15,
          alpha: intensity * secondaryEnvelope * .68 * secondaryVisibilityB,
        });
        strokePath(view.chainFx, sideArcC, {
          color: palette.main,
          width: 1.05,
          alpha: intensity * secondaryEnvelope * .42 * secondaryVisibilityC,
        });

        // Four short branches jump away from the main channel. Their visibility
        // also changes on the snapped electrical cadence.
        const branchFractions = [.20, .39, .61, .79];
        for (let branchIndex = 0; branchIndex < branchFractions.length; branchIndex += 1) {
          const active =
            Math.sin(
              snapFrame * (1.03 + branchIndex * .11)
              + seed * .17
              + branchIndex * 1.8,
            ) > -.26;
          if (!active || localProgress > .70) continue;

          const t = branchFractions[branchIndex];
          const pathIndex = Math.max(
            1,
            Math.min(mainArc.length - 2, Math.round(t * (mainArc.length - 1))),
          );
          const anchor = mainArc[pathIndex];
          const sign =
            Math.sin(seed * .31 + branchIndex * 4.7 + snapFrame * .71) >= 0
              ? 1
              : -1;
          const branchLength =
            18
            + branchIndex * 3
            + (.5 + .5 * Math.sin(seed * .23 + branchIndex * 2.4 + snapFrame)) * 13;
          const forward = 3 + branchIndex * 1.7;
          const kink = {
            x: anchor.x + tx * forward + px * sign * branchLength * .44,
            y: anchor.y + ty * forward + py * sign * branchLength * .44,
          };
          const tip = {
            x: anchor.x + tx * (forward + 7) + px * sign * branchLength,
            y: anchor.y + ty * (forward + 7) + py * sign * branchLength,
          };
          const branch = [anchor, kink, tip];

          strokePath(view.chainGlowFx, branch, {
            color: palette.main,
            width: 7,
            alpha: intensity * .13,
          });
          strokePath(view.chainFx, branch, {
            color: palette.main,
            width: 2.15,
            alpha: intensity * .52,
          });
          strokePath(view.chainSparkFx, branch, {
            color: palette.core,
            width: .78,
            alpha: intensity * .74,
          });

          view.chainSparkFx
            .circle(tip.x, tip.y, 1.45)
            .fill({
              color: palette.core,
              alpha: intensity * .70,
            });
        }

        // A bright travelling front sells the initial discharge into each hop.
        if (reveal < .995) {
          const tipPulse = .65 + (.5 + .5 * Math.sin(microPhase * 1.3)) * .35;
          view.chainGlowFx
            .circle(to.x, to.y, 13 + tipPulse * 4)
            .fill({
              color: palette.main,
              alpha: intensity * .16,
            });
          view.chainSparkFx
            .circle(to.x, to.y, 3.2 + tipPulse)
            .fill({
              color: palette.core,
              alpha: intensity * .94,
            });
        }

        // Directional sparks flow along the main channel.
        const sparkCount = localProgress < .58 ? 9 : 6;
        for (let i = 0; i < sparkCount; i += 1) {
          const sparkT =
            (progress * 2.8 + i / sparkCount + segmentIndex * .11) % 1;
          const pathPos = sparkT * (mainArc.length - 1);
          const leftIndex = Math.floor(pathPos);
          const rightIndex = Math.min(mainArc.length - 1, leftIndex + 1);
          const localT = pathPos - leftIndex;
          const a = mainArc[leftIndex];
          const b = mainArc[rightIndex];
          const wobble =
            Math.sin(microPhase * .72 + i * 2.6 + seed * .09) * 5;
          const sx = a.x + (b.x - a.x) * localT + px * wobble;
          const sy = a.y + (b.y - a.y) * localT + py * wobble;

          view.chainGlowFx
            .circle(sx, sy, 4.6)
            .fill({
              color: palette.main,
              alpha: intensity * .16,
            });
          view.chainSparkFx
            .circle(sx, sy, i % 3 === 0 ? 2.15 : 1.35)
            .fill({
              color: i % 2 ? palette.core : palette.main,
              alpha: intensity * (.62 + (i % 3) * .09),
            });
        }

        // Stronger source discharge on the first hop: an expanding ring, central
        // white flash, radial fingers and tiny orbiting sparks.
        if (segmentIndex === 0 && localProgress < .48) {
          const sourcePulse = clamp01(localProgress / .48);
          const sourceFade = 1 - sourcePulse;
          const sourceRadius = source.radius + 5 + easeOut(sourcePulse) * 23;
          const sourceIntensity = intensity * sourceFade;

          view.chainGlowFx
            .circle(from.x, from.y, sourceRadius + 8)
            .stroke({
              color: palette.main,
              width: 10,
              alpha: sourceIntensity * .13,
            });
          view.chainFx
            .circle(from.x, from.y, sourceRadius)
            .stroke({
              color: palette.main,
              width: 2.3,
              alpha: sourceIntensity * .64,
            })
            .circle(from.x, from.y, Math.max(5, sourceRadius - 7))
            .stroke({
              color: palette.core,
              width: 1.0,
              alpha: sourceIntensity * .52,
            });

          view.chainGlowFx
            .circle(from.x, from.y, 12 + (1 - sourcePulse) * 8)
            .fill({
              color: palette.main,
              alpha: sourceIntensity * .12,
            });
          view.chainSparkFx
            .circle(from.x, from.y, 3.5 + (1 - sourcePulse) * 2.2)
            .fill({
              color: palette.core,
              alpha: sourceIntensity * .88,
            });

          for (let i = 0; i < 8; i += 1) {
            const angle =
              i / 8 * Math.PI * 2
              + snapFrame * .09 * (i % 2 ? 1 : -1);
            const inner = source.radius + 2;
            const outer =
              source.radius
              + 13
              + sourcePulse * 18
              + (i % 3) * 3;

            view.chainSparkFx
              .moveTo(
                from.x + Math.cos(angle) * inner,
                from.y + Math.sin(angle) * inner,
              )
              .lineTo(
                from.x + Math.cos(angle + .06 * (i % 2 ? 1 : -1)) * outer,
                from.y + Math.sin(angle + .06 * (i % 2 ? 1 : -1)) * outer,
              )
              .stroke({
                color: i % 3 === 0 ? palette.core : palette.main,
                width: i % 3 === 0 ? 1.5 : .9,
                alpha: sourceIntensity * (.42 + (i % 2) * .18),
              });
          }

          for (let i = 0; i < 5; i += 1) {
            const angle = i / 5 * Math.PI * 2 + microPhase * .035;
            const rr = source.radius + 13 + (i % 2) * 5;
            view.chainSparkFx
              .circle(
                from.x + Math.cos(angle) * rr,
                from.y + Math.sin(angle) * rr,
                1.25 + (i % 2) * .45,
              )
              .fill({
                color: i % 2 ? palette.core : palette.main,
                alpha: sourceIntensity * .62,
              });
          }
        }

        // Chain Lightning 2.0 pass 2: every hop gets a compact electrical
        // detonation, local ground response, particle spray and a short afterglow.
        if (localProgress > .28) {
          const impactProgress = clamp01((localProgress - .28) / .62);
          const easedImpact = easeOut(impactProgress);
          const impactFlash = Math.exp(-impactProgress * 10.5);
          const afterglow = Math.exp(-impactProgress * 3.35);
          const impactEnvelope =
            hopEnergy * Math.max(impactFlash, afterglow * .60);
          const bodyRadius = Math.max(12, Number(toActor.radius) || 18);
          const hitPulse = Math.sin(Math.min(1, impactProgress * 1.55) * Math.PI);
          const outer = 9 + easedImpact * 44;

          // A very short near-white center flash makes the exact hit frame obvious.
          view.chainGlowFx
            .circle(fullTo.x, fullTo.y, 22 + hitPulse * 16)
            .fill({
              color: palette.core,
              alpha: impactEnvelope * (.10 + impactFlash * .24),
            })
            .circle(fullTo.x, fullTo.y, 38 + hitPulse * 17)
            .fill({
              color: palette.main,
              alpha: impactEnvelope * (.055 + impactFlash * .10),
            });

          view.chainSparkFx
            .circle(fullTo.x, fullTo.y, 4.2 + impactFlash * 6.5)
            .fill({
              color: 0xffffff,
              alpha: Math.min(1, impactEnvelope * (.70 + impactFlash * .55)),
            });

          // Flattened light on the floor beneath the target. Kept subtle so it
          // reads as illumination, not a gameplay targeting marker.
          const groundY = fullTo.y + bodyRadius * .58;
          const groundWidth = bodyRadius * 1.55 + hitPulse * 17;
          const groundHeight = bodyRadius * .34 + hitPulse * 4.5;

          view.chainGlowFx
            .ellipse(fullTo.x, groundY, groundWidth, groundHeight)
            .fill({
              color: palette.main,
              alpha: impactEnvelope * (.07 + impactFlash * .12),
            });

          view.chainFx
            .ellipse(fullTo.x, groundY, groundWidth * .78, groundHeight * .72)
            .stroke({
              color: palette.core,
              width: 1.05,
              alpha: impactEnvelope * impactFlash * .36,
            });

          // Double expanding shock ring: bright inner edge followed by a wider
          // cyan afterglow that hangs around for a few extra frames.
          view.chainGlowFx
            .circle(fullTo.x, fullTo.y, outer + 8)
            .stroke({
              color: palette.main,
              width: 9,
              alpha: impactEnvelope * afterglow * .10,
            });

          view.chainFx
            .circle(fullTo.x, fullTo.y, outer)
            .stroke({
              color: palette.main,
              width: 2.9,
              alpha: impactEnvelope * afterglow * .74,
            })
            .circle(fullTo.x, fullTo.y, 7 + easedImpact * 30)
            .stroke({
              color: palette.core,
              width: 1.35,
              alpha: impactEnvelope * afterglow * .78,
            });

          // Electrical fragments get short trails so they read as fast particles.
          const particleCount = 12;
          for (let i = 0; i < particleCount; i += 1) {
            const angle =
              i / particleCount * Math.PI * 2
              + Math.sin(seed * .19 + i * 2.73) * .24;
            const speed =
              24
              + (i % 5) * 7
              + (Math.sin(seed * .11 + i * 1.91) * .5 + .5) * 13;
            const radial = 7 + easedImpact * speed;
            const lift =
              impactProgress * (4 + (i % 4) * 2)
              + Math.sin(angle * 2.3 + seed) * 2.5;
            const sx = fullTo.x + Math.cos(angle) * radial;
            const sy = fullTo.y + Math.sin(angle) * radial - lift;
            const trailBack = 5 + (i % 4) * 2.4;
            const tx0 = sx - Math.cos(angle) * trailBack;
            const ty0 = sy - Math.sin(angle) * trailBack + 1.5;

            view.chainSparkFx
              .moveTo(tx0, ty0)
              .lineTo(sx, sy)
              .stroke({
                color: i % 4 === 0 ? palette.core : palette.main,
                width: i % 4 === 0 ? 1.65 : 1.0,
                alpha: impactEnvelope * afterglow * (.38 + (i % 3) * .12),
              });

            view.chainSparkFx
              .circle(sx, sy, i % 4 === 0 ? 1.8 : 1.2 + (i % 2) * .3)
              .fill({
                color: i % 4 === 0 ? palette.core : palette.main,
                alpha: impactEnvelope * afterglow * (.52 + (i % 3) * .10),
              });
          }

          // Brief broken arcs cling to the target after the hit.
          const clingCount = 5;
          const clingRadius = bodyRadius + 5 + hitPulse * 3;
          for (let i = 0; i < clingCount; i += 1) {
            const angle =
              i / clingCount * Math.PI * 2
              + snapFrame * .17 * (i % 2 ? 1 : -1);
            const arcLength = .20 + (i % 3) * .055;
            const a0 = angle - arcLength;
            const a1 = angle + arcLength;
            const middleAngle =
              angle + Math.sin(seed * .23 + i * 3.1 + snapFrame) * .12;
            const r0 = clingRadius;
            const r1 = clingRadius + 4 + (i % 2) * 3;

            view.chainSparkFx
              .moveTo(
                fullTo.x + Math.cos(a0) * r0,
                fullTo.y + Math.sin(a0) * r0,
              )
              .lineTo(
                fullTo.x + Math.cos(middleAngle) * r1,
                fullTo.y + Math.sin(middleAngle) * r1,
              )
              .lineTo(
                fullTo.x + Math.cos(a1) * r0,
                fullTo.y + Math.sin(a1) * r0,
              )
              .stroke({
                color: i % 3 === 0 ? palette.core : palette.main,
                width: i % 3 === 0 ? 1.45 : .9,
                alpha:
                  impactEnvelope
                  * afterglow
                  * (.32 + impactFlash * .36),
              });
          }

          // Radial hit spikes retain the crisp readability of the old impact.
          const rayCount = 8;
          for (let i = 0; i < rayCount; i += 1) {
            const angle =
              i / rayCount * Math.PI * 2
              + Math.sin(seed * .17 + i * 2.47) * .18;
            const inner = 8 + impactProgress * 5;
            const outerRay = 20 + easedImpact * (26 + (i % 4) * 7);

            view.chainSparkFx
              .moveTo(
                fullTo.x + Math.cos(angle) * inner,
                fullTo.y + Math.sin(angle) * inner,
              )
              .lineTo(
                fullTo.x + Math.cos(angle) * outerRay,
                fullTo.y + Math.sin(angle) * outerRay,
              )
              .stroke({
                color: i % 3 === 0 ? palette.core : palette.main,
                width: i % 3 === 0 ? 1.8 : 1.1,
                alpha:
                  impactEnvelope
                  * afterglow
                  * (.30 + (i % 2) * .13),
              });
          }

          // Small lingering motes survive the initial flash for a short afterglow.
          const emberCount = 5;
          for (let i = 0; i < emberCount; i += 1) {
            const angle =
              i / emberCount * Math.PI * 2
              - impactProgress * (i % 2 ? 1.15 : -.9)
              + seed * .013;
            const rr = bodyRadius + 9 + impactProgress * (11 + (i % 3) * 4);
            view.chainSparkFx
              .circle(
                fullTo.x + Math.cos(angle) * rr,
                fullTo.y + Math.sin(angle) * rr - impactProgress * 5,
                1.1 + (i % 2) * .45,
              )
              .fill({
                color: i % 2 ? palette.core : palette.main,
                alpha: impactEnvelope * afterglow * .42,
              });
          }
        }
      }
    }
  }

  updateNativePriestHealSpellVfx(game) {
    const supported = new Set([
      "priest-renew",
      "priest-flash-heal",
      "priest-greater-heal",
    ]);

    for (const view of this.actorViews.values()) {
      view.priestHealSpellFx.clear();
      view.priestHealSpellFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell" || !supported.has(effect.spellId)) continue;
      if (COMBAT_VFX2_SPELLS.has(effect.spellId)) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !target || !view || !view.root.visible) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const [main, core, accent] = priestHealSpellColors(effect.spellId);
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const seed = Number(effect.seed || effect.id || 1);
      const random = seededRandom(seed);

      view.priestHealSpellFx.visible = true;

      // Small source release cue, matching the Canvas spell layer.
      const cueWindow = effect.spellId === "priest-greater-heal" ? .22 : .18;
      const cueP = Math.max(0, Math.min(1, p / cueWindow));
      const cueFade = 1 - cueP;
      if (cueFade > 0) {
        const cueRadius = source.radius + 9 + cueP * 11;
        view.priestHealSpellFx
          .circle(0, 0, cueRadius)
          .stroke({
            color: main,
            width: 2,
            alpha: alpha * cueFade * .50,
          });

        for (let i = 0; i < 6; i += 1) {
          const a = i / 6 * Math.PI * 2;
          const inner = source.radius + 4;
          const outer = source.radius + 16 + cueP * 14;
          view.priestHealSpellFx
            .moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
            .lineTo(Math.cos(a) * outer, Math.sin(a) * outer)
            .stroke({
              color: i % 2 ? core : main,
              width: 1.35,
              alpha: alpha * cueFade * .46,
            });
        }
      }

      if (effect.spellId === "priest-renew") {
        const fade = 1 - Math.max(0, Math.min(1, (p - .62) / .38));
        const eased = 1 - Math.pow(1 - p, 3);
        const radius = 12 + eased * 24;

        view.priestHealSpellFx
          .circle(dx, dy, 11 + p * 24)
          .stroke({
            color: main,
            width: 1.5,
            alpha: alpha * fade * .42,
          });

        for (let i = 0; i < 6; i += 1) {
          const a = i / 6 * Math.PI * 2 - p * 1.2;
          view.priestHealSpellFx
            .circle(
              dx + Math.cos(a) * radius,
              dy + Math.sin(a) * radius - p * 5,
              1.8 + (i % 2) * .7,
            )
            .fill({
              color: i % 2 ? main : core,
              alpha: alpha * fade * .66,
            });
        }
        continue;
      }

      const strong = effect.spellId === "priest-greater-heal";
      const appearRaw = Math.max(0, Math.min(1, p / .18));
      const appear = appearRaw * appearRaw * (3 - 2 * appearRaw);
      const fade = 1 - Math.max(0, Math.min(1, (p - .58) / .42));
      const height = strong ? 118 : 88;
      const width = strong ? 34 : 24;
      const topY = dy - height;
      const rayAlpha = alpha * appear * fade * (strong ? .38 : .30);

      // A visible holy column built only from safe Graphics line primitives.
      const rays = strong ? 6 : 4;
      for (let i = 0; i < rays; i += 1) {
        const lane = rays === 1 ? 0 : i / (rays - 1) - .5;
        const topX = dx + lane * width;
        const bottomX = dx + lane * width * 1.35;
        view.priestHealSpellFx
          .moveTo(topX, topY)
          .lineTo(bottomX, dy + 10)
          .stroke({
            color: i % 2 ? core : main,
            width: strong ? 3.2 : 2.5,
            alpha: rayAlpha * (i % 2 ? .85 : .58),
          });
      }

      const eased = 1 - Math.pow(1 - p, 3);
      const ringRadius = 10 + eased * (strong ? 30 : 22);
      view.priestHealSpellFx
        .circle(dx, dy, ringRadius)
        .stroke({
          color: main,
          width: strong ? 2.8 : 2.1,
          alpha: alpha * fade * .74,
        })
        .circle(dx, dy, Math.max(5, ringRadius - 6))
        .stroke({
          color: core,
          width: 1.05,
          alpha: alpha * fade * .44,
        });

      const motes = strong ? 9 : 6;
      for (let i = 0; i < motes; i += 1) {
        const rx = random();
        const ry = random();
        const rr = random();
        view.priestHealSpellFx
          .circle(
            dx + (rx - .5) * width * 1.5,
            topY + ry * height * .78 + p * 12,
            1.4 + rr * 1.8,
          )
          .fill({
            color: i % 3 === 0 ? core : (i % 2 ? main : accent),
            alpha: alpha * fade * .62,
          });
      }

      // Stronger landing flash for Greater Heal, deliberately obvious for testing.
      if (strong && p > .08 && p < .52) {
        const flashP = Math.max(0, Math.min(1, (p - .08) / .44));
        const flashFade = 1 - flashP;
        view.priestHealSpellFx
          .circle(dx, dy, 5 + flashP * 18)
          .fill({
            color: core,
            alpha: alpha * flashFade * .22,
          });
      }
    }
  }

  updateNativePriestDruidSpellVfx(game) {
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };
    const smoothstep = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };

    const drawLeaf = (graphics, x, y, angle, size, color, alpha) => {
      if (alpha <= 0) return;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const points = [
        { x: size, y: 0 },
        { x: 0, y: size * .48 },
        { x: -size, y: 0 },
        { x: 0, y: -size * .48 },
      ].map(point => ({
        x: x + point.x * ca - point.y * sa,
        y: y + point.x * sa + point.y * ca,
      }));

      graphics
        .moveTo(points[0].x, points[0].y)
        .lineTo(points[1].x, points[1].y)
        .lineTo(points[2].x, points[2].y)
        .lineTo(points[3].x, points[3].y)
        .lineTo(points[0].x, points[0].y)
        .fill({ color, alpha });
    };

    const drawSourceCue = (graphics, source, profile, phase, shape) => {
      if (!source) return;
      const p = clamp01(phase);
      const fade = 1 - p;
      if (fade <= 0) return;

      if (shape === "nature") {
        for (let i = 0; i < 5; i += 1) {
          const a = i / 5 * Math.PI * 2 + p * 1.2;
          const rr = source.radius + 10 + p * 13;
          drawLeaf(
            graphics,
            Math.cos(a) * rr,
            Math.sin(a) * rr,
            a + p,
            4.3,
            i % 2 ? profile.main : profile.core,
            fade * .55,
          );
        }
        graphics
          .circle(0, 0, source.radius + 8 + p * 10)
          .stroke({
            color: profile.main,
            width: 1.4,
            alpha: fade * .33,
          });
        return;
      }

      if (shape === "shadow") {
        for (let i = 0; i < 4; i += 1) {
          const rr = source.radius + 8 + i * 4 + p * 7;
          const a0 = i * 1.5 - p * (i % 2 ? 1.4 : -1.2);
          const a1 = a0 + .9;
          const segments = 4;
          for (let s = 0; s < segments; s += 1) {
            const t0 = s / segments;
            const t1 = (s + 1) / segments;
            const q0 = a0 + (a1 - a0) * t0;
            const q1 = a0 + (a1 - a0) * t1;
            graphics
              .moveTo(Math.cos(q0) * rr, Math.sin(q0) * rr)
              .lineTo(Math.cos(q1) * rr, Math.sin(q1) * rr)
              .stroke({
                color: i % 2 ? profile.core : profile.main,
                width: 1.7,
                alpha: fade * (.35 + i * .08),
              });
          }
        }
        return;
      }

      graphics
        .circle(0, 0, source.radius + 9 + p * 11)
        .stroke({
          color: profile.main,
          width: 2,
          alpha: fade * .46,
        });

      for (let i = 0; i < 6; i += 1) {
        const a = i / 6 * Math.PI * 2;
        const inner = source.radius + 4;
        const outer = source.radius + 16 + p * 14;
        graphics
          .moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
          .lineTo(Math.cos(a) * outer, Math.sin(a) * outer)
          .stroke({
            color: i % 2 ? profile.core : profile.main,
            width: 1.5,
            alpha: fade * .45,
          });
      }
    };

    for (const view of this.actorViews.values()) {
      view.priestDruidSpellFx.clear();
      view.priestDruidSpellFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell") continue;
      if (
        COMBAT_VFX2_SPELLS.has(effect.spellId)
        || PROJECTILE_VFX2_SPELLS.has(effect.spellId)
      ) continue;
      const profile = priestDruidSpellProfile(effect.spellId);
      if (!profile) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !view || !view.root.visible) continue;

      const targetCenter = target
        ? visualActorCenter(this.actorViews, target, effect.targetX, effect.targetY)
        : null;
      const targetX = targetCenter?.x ?? effect.targetX ?? source.x;
      const targetY = targetCenter?.y ?? effect.targetY ?? source.y;
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = clamp01(1 - remaining / total);
      const alpha = clamp01(remaining / total);
      const seed = Number(effect.seed || effect.id || 1);
      const random = seededRandom(seed);
      const dx = targetX - source.x;
      const dy = targetY - source.y;
      const missed = Boolean(effect.missed);
      const g = view.priestDruidSpellFx;

      g.visible = true;

      if (profile.kind === "holy-shield") {
        drawSourceCue(g, source, profile, p / .20, "holy");
        const appear = easeOut(p / .25);
        const fade = 1 - clamp01((p - .72) / .28);
        const a = appear * fade * alpha;

        g
          .circle(dx, dy, 29)
          .stroke({
            color: profile.main,
            width: 2.7,
            alpha: a * .62,
          })
          .circle(dx, dy, 23)
          .stroke({
            color: profile.core,
            width: 1.1,
            alpha: a * .34,
          });

        const shield = [
          [0, -24],
          [15, -7],
          [11, 18],
          [0, 25],
          [-11, 18],
          [-15, -7],
          [0, -24],
        ];
        g.moveTo(dx + shield[0][0], dy + shield[0][1]);
        for (let i = 1; i < shield.length; i += 1) {
          g.lineTo(dx + shield[i][0], dy + shield[i][1]);
        }
        g.stroke({
          color: profile.accent,
          width: 1.7,
          alpha: a * .76,
        });
        continue;
      }

      if (profile.kind === "shadow-wave") {
        const wave = easeOut(p / .72);
        const fade = 1 - clamp01((p - .55) / .45);

        for (let layer = 0; layer < 3; layer += 1) {
          const radius = source.radius + 12 + wave * (80 + layer * 16);
          g.circle(0, 0, radius).stroke({
            color: layer === 1 ? profile.core : profile.main,
            width: 2.6 - layer * .45,
            alpha: alpha * fade * (.50 - layer * .10),
          });
        }

        for (let i = 0; i < 8; i += 1) {
          const a = i / 8 * Math.PI * 2 + p * (i % 2 ? 1.2 : -1.0);
          const rr = source.radius + 18 + wave * (45 + (i % 3) * 11);
          g.circle(
            Math.cos(a) * rr,
            Math.sin(a) * rr,
            1.4 + (i % 2) * .4,
          ).fill({
            color: i % 3 === 0 ? profile.core : profile.main,
            alpha: alpha * fade * .38,
          });
        }
        continue;
      }

      if (profile.kind === "mind-implosion") {
        drawSourceCue(g, source, profile, p / .28, "shadow");
        const missSign = Math.sin(seed * .91) > 0 ? 1 : -1;
        const vx = dx + (missed ? missSign * 46 : 0);
        const vy = dy - (missed ? 19 : 0);
        const gather = smoothstep(p / .44);
        const burst = clamp01((p - .34) / .54);
        const fade = 1 - clamp01((p - .70) / .30);

        for (let i = 0; i < 8; i += 1) {
          const a = random() * Math.PI * 2 + p * (i % 2 ? 1.7 : -1.4);
          const start = 38 + random() * 20;
          const rr = start * (1 - gather * .80);
          g.circle(
            vx + Math.cos(a) * rr,
            vy + Math.sin(a) * rr,
            1.7 + random() * 1.8,
          ).fill({
            color: i % 3 === 0 ? profile.core : profile.main,
            alpha: alpha * (.25 + gather * .50),
          });
        }

        if (p > .30 && !missed) {
          for (let i = 0; i < 5; i += 1) {
            const a = i / 5 * Math.PI * 2 + Math.sin(seed * .17 + i) * .20;
            const inner = 7 + burst * 3;
            const outer = 13 + easeOut(burst) * (28 + (i % 3) * 7);
            g
              .moveTo(vx + Math.cos(a) * inner, vy + Math.sin(a) * inner)
              .lineTo(
                vx + Math.cos(a + .18) * outer * .62,
                vy + Math.sin(a + .18) * outer * .62,
              )
              .lineTo(vx + Math.cos(a) * outer, vy + Math.sin(a) * outer)
              .stroke({
                color: profile.main,
                width: 2.1,
                alpha: alpha * fade * .70,
              });
          }
          g.circle(vx, vy, Math.max(3, 7 * (1 - burst * .35))).fill({
            color: profile.core,
            alpha: alpha * fade * .76,
          });
        }
        continue;
      }

      if (profile.kind === "holy-sky" || profile.kind === "moon-sky") {
        const nature = profile.kind === "moon-sky";
        drawSourceCue(g, source, profile, p / (nature ? .20 : .22), nature ? "nature" : "holy");

        const missSign = Math.sin(seed * .73) > 0 ? 1 : -1;
        const vx = dx + (missed ? missSign * (nature ? 45 : 43) : 0);
        const vy = dy - (missed ? 14 : 0);
        const strike = clamp01((p - (nature ? .10 : .12)) / (nature ? .56 : .58));
        const fade = 1 - clamp01((p - (nature ? .70 : .72)) / (nature ? .30 : .28));
        const topY = vy - (nature ? 142 : 126);
        const headY = topY + easeOut(strike) * (nature ? 138 : 124);

        if (nature && p < .32) {
          const crescentY = -source.radius - 13;
          g
            .circle(0, crescentY, 9)
            .stroke({
              color: profile.core,
              width: 2.0,
              alpha: alpha * (1 - p / .32) * .44,
            })
            .circle(3.2, crescentY - .4, 7.4)
            .stroke({
              color: profile.main,
              width: 1,
              alpha: alpha * (1 - p / .32) * .18,
            });
        }

        g
          .moveTo(vx + (nature ? 0 : 3), topY)
          .lineTo(vx, headY)
          .stroke({
            color: profile.accent,
            width: nature ? 8 : 10,
            alpha: alpha * fade * (nature ? .20 : .28),
          })
          .moveTo(vx, topY)
          .lineTo(vx, headY)
          .stroke({
            color: profile.core,
            width: nature ? 3 : 4.2,
            alpha: alpha * fade * .74,
          });

        const threshold = nature ? .62 : .58;
        if (strike > threshold && !missed) {
          const hit = (strike - threshold) / (1 - threshold);
          g.circle(vx, vy, 8 + easeOut(hit) * 40).stroke({
            color: profile.main,
            width: nature ? 2 : 2.6,
            alpha: alpha * (1 - hit) * .72,
          });

          const count = nature ? 6 : 8;
          for (let i = 0; i < count; i += 1) {
            const a = i / count * Math.PI * 2 + Math.sin(seed * .11 + i * 2.3) * .16;
            const rr = 8 + easeOut(hit) * (24 + (i % 4) * 5);
            g.circle(
              vx + Math.cos(a) * rr,
              vy + Math.sin(a) * rr,
              1.6 + (i % 2) * .3,
            ).fill({
              color: i % 3 === 0 ? profile.core : profile.main,
              alpha: alpha * (1 - hit) * .66,
            });
          }
        }
        continue;
      }

      if (
        profile.kind === "leaf-hot"
        || profile.kind === "leaf-burst"
        || profile.kind === "regrowth"
        || profile.kind === "lifebloom"
      ) {
        const swift = profile.kind === "leaf-burst";
        const regrowth = profile.kind === "regrowth";
        const lifebloom = profile.kind === "lifebloom";
        drawSourceCue(g, source, profile, p / (swift ? .15 : .20), "nature");
        const fade = 1 - clamp01((p - (swift ? .55 : .68)) / (swift ? .45 : .32));
        const count = regrowth ? 10 : lifebloom ? 8 : swift ? 10 : 7;

        if (regrowth) {
          for (let i = 0; i < 4; i += 1) {
            const side = (i - 1.5) * 8;
            const sway = Math.sin(i + p * 5) * 12;
            g
              .moveTo(dx + side, dy + 18)
              .lineTo(dx + side + sway * .55, dy - p * 12)
              .lineTo(dx + side * .35, dy - 30 - p * 12)
              .stroke({
                color: profile.main,
                width: 2,
                alpha: alpha * fade * .46,
              });
          }
        }

        for (let i = 0; i < count; i += 1) {
          const base = i / count * Math.PI * 2;
          const angle =
            swift
              ? base + Math.sin(seed * .13 + i * 1.9) * .55
              : base + p * (i % 2 ? .9 : -.7);
          const rr =
            swift
              ? 5 + easeOut(p) * (22 + (i % 4) * 6)
              : 7 + easeOut(p) * (18 + (i % 3) * 6);
          const yLift = p * (lifebloom ? 12 : 7);
          drawLeaf(
            g,
            dx + Math.cos(angle) * rr,
            dy + Math.sin(angle) * rr - yLift,
            angle + (swift ? p * 2 : .4),
            3.2 + (i % 3) * .65,
            i % 3 === 0 ? profile.core : profile.main,
            alpha * fade * (swift ? .78 : .70),
          );
        }

        if (lifebloom) {
          for (let i = 0; i < 6; i += 1) {
            const a = i / 6 * Math.PI * 2 + p * .45;
            const rr = 6 + easeOut(p) * 9;
            drawLeaf(
              g,
              dx + Math.cos(a) * rr,
              dy + Math.sin(a) * rr,
              a,
              5.2,
              i % 2 ? profile.main : profile.core,
              alpha * fade * .70,
            );
          }
        }

        if (swift) {
          g.circle(dx, dy, 6 + (1 - p) * 5).fill({
            color: profile.core,
            alpha: alpha * fade * .66,
          });
        } else {
          g.circle(dx, dy, 8 + p * 23).stroke({
            color: profile.main,
            width: 1.4,
            alpha: alpha * fade * .28,
          });
        }
        continue;
      }

      if (profile.kind === "bark-shield") {
        drawSourceCue(g, source, profile, p / .18, "nature");
        const appear = easeOut(p / .26);
        const fade = 1 - clamp01((p - .72) / .28);

        for (let i = 0; i < 6; i += 1) {
          const a = i / 6 * Math.PI * 2 + .18 * Math.sin(i + p * 3);
          const radius = 25 + (i % 2) * 4;
          const cx = dx + Math.cos(a) * radius;
          const cy = dy + Math.sin(a) * radius;
          const ca = Math.cos(a + Math.PI / 2);
          const sa = Math.sin(a + Math.PI / 2);
          const local = [
            [-5, -10],
            [6, -8],
            [8, 8],
            [-6, 10],
            [-5, -10],
          ].map(([x,y]) => ({
            x: cx + x * ca - y * sa,
            y: cy + x * sa + y * ca,
          }));

          g.moveTo(local[0].x, local[0].y);
          for (let j = 1; j < local.length; j += 1) {
            g.lineTo(local[j].x, local[j].y);
          }
          g.stroke({
            color: profile.accent,
            width: 4,
            alpha: alpha * appear * fade * (.58 + (i % 2) * .12),
          });
        }
        continue;
      }

      if (profile.kind === "cyclone") {
        drawSourceCue(g, source, profile, p / .22, "nature");
        const build = easeOut((p - .08) / .68);
        const fade = 1 - clamp01((p - .78) / .22);

        for (let layer = 0; layer < 5; layer += 1) {
          const yOff = 18 - layer * 9;
          const radius = 12 + layer * 5 + build * 10;
          g.ellipse(dx, dy + yOff, radius, 5 + layer * 1.5).stroke({
            color: layer % 2 ? profile.core : profile.main,
            width: 1.8 + layer * .18,
            alpha: alpha * fade * (.28 + layer * .09),
          });
        }

        for (let i = 0; i < 7; i += 1) {
          const a = i / 7 * Math.PI * 2 + p * (i % 2 ? 8 : -7) + seed * .013;
          const rr = 13 + (i % 4) * 6;
          g.circle(
            dx + Math.cos(a) * rr,
            dy + Math.sin(a) * rr * .42 - p * 8,
            1.2 + (i % 3) * .45,
          ).fill({
            color: profile.core,
            alpha: alpha * fade * .38,
          });
        }
        continue;
      }
    }
  }

  updateNativePaladinDkSpellVfx(game) {
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };

    const transformPoint = (cx, cy, x, y, angle) => {
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      return {
        x: cx + x * ca - y * sa,
        y: cy + x * sa + y * ca,
      };
    };

    const drawPolygon = (graphics, points, style, fill = false) => {
      if (!points?.length || style.alpha <= 0) return;
      graphics.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        graphics.lineTo(points[i].x, points[i].y);
      }
      graphics.lineTo(points[0].x, points[0].y);
      if (fill) graphics.fill(style);
      else graphics.stroke(style);
    };

    const paladinSourceCue = (graphics, source, profile, phase) => {
      const p = clamp01(phase);
      const fade = 1 - p;
      if (!source || fade <= 0) return;
      const rotation = p * .45;

      for (let i = 0; i < 4; i += 1) {
        const a = i * Math.PI / 2 + rotation;
        const inner = source.radius + 7;
        const outer = source.radius + 20;
        graphics
          .moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
          .lineTo(Math.cos(a) * outer, Math.sin(a) * outer)
          .stroke({
            color: profile.main,
            width: 1.8,
            alpha: fade * .64,
          });
      }

      const r = 8;
      const diamond = [];
      for (let i = 0; i < 4; i += 1) {
        const a = Math.PI / 4 + i * Math.PI / 2 + rotation;
        diamond.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
      }
      drawPolygon(graphics, diamond, {
        color: profile.core,
        width: 1.4,
        alpha: fade * .44,
      });
    };

    const dkSourceCue = (graphics, source, profile, phase) => {
      const p = clamp01(phase);
      const fade = 1 - p;
      if (!source || fade <= 0) return;
      const rotation = -p * .8;

      for (let i = 0; i < 3; i += 1) {
        const a = i * Math.PI * 2 / 3 + rotation;
        const p0 = {
          x: Math.cos(a) * (source.radius + 6),
          y: Math.sin(a) * (source.radius + 6),
        };
        const p1 = {
          x: Math.cos(a + .36) * (source.radius + 18),
          y: Math.sin(a + .36) * (source.radius + 18),
        };
        const p2 = {
          x: Math.cos(a + .72) * (source.radius + 9),
          y: Math.sin(a + .72) * (source.radius + 9),
        };
        graphics
          .moveTo(p0.x, p0.y)
          .lineTo(p1.x, p1.y)
          .lineTo(p2.x, p2.y)
          .stroke({
            color: profile.main,
            width: 1.7,
            alpha: fade * .60,
          });
      }
    };

    const drawSlash = (
      graphics,
      cx,
      cy,
      profile,
      p,
      seed,
      doubleSlash = false,
      frost = false,
    ) => {
      const fade = 1 - clamp01((p - .68) / .32);
      const count = doubleSlash ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const angle =
          (i ? -.72 : .72)
          + Math.sin(seed * .17 + i * 2.3) * .06;
        const a = transformPoint(cx, cy, -34 + easeOut(p) * 8, -6, angle);
        const m = transformPoint(cx, cy, 0, -2, angle);
        const b = transformPoint(cx, cy, 34, 6, angle);
        graphics
          .moveTo(a.x, a.y)
          .lineTo(m.x, m.y)
          .lineTo(b.x, b.y)
          .stroke({
            color: i ? profile.core : profile.main,
            width: i ? 3.2 : 5,
            alpha: fade * (.72 + i * .10),
          });
      }

      if (frost) {
        for (let i = 0; i < 7; i += 1) {
          const a = i / 7 * Math.PI * 2 + seed * .019;
          const rr = 9 + easeOut(p) * (18 + (i % 3) * 7);
          graphics
            .circle(
              cx + Math.cos(a) * rr,
              cy + Math.sin(a) * rr,
              1.4 + (i % 2) * .45,
            )
            .fill({
              color: profile.core,
              alpha: fade * .56,
            });
        }
      }
    };

    for (const view of this.actorViews.values()) {
      view.paladinDkSpellFx.clear();
      view.paladinDkSpellFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell") continue;
      if (
        COMBAT_VFX2_SPELLS.has(effect.spellId)
        || PROJECTILE_VFX2_SPELLS.has(effect.spellId)
      ) continue;

      const profile = paladinDkSpellProfile(effect.spellId);
      if (!profile) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !view || !view.root.visible) continue;

      const targetCenter = target
        ? visualActorCenter(this.actorViews, target, effect.targetX, effect.targetY)
        : null;
      const targetX = targetCenter?.x ?? effect.targetX ?? source.x;
      const targetY = targetCenter?.y ?? effect.targetY ?? source.y;
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = clamp01(1 - remaining / total);
      const alpha = clamp01(remaining / total);
      const seed = Number(effect.seed || effect.id || 1);
      const missed = Boolean(effect.missed);
      const dx = targetX - source.x;
      const dy = targetY - source.y;
      const g = view.paladinDkSpellFx;
      const missSign = Math.sin(seed * .91) >= 0 ? 1 : -1;
      const missX = dx + missSign * 44;
      const missY = dy - 10;

      g.visible = true;

      if (
        profile.kind === "holy-shock"
        || profile.kind === "flash-light"
        || profile.kind === "holy-light"
      ) {
        const strong = profile.kind === "holy-light";
        const burst = profile.kind === "holy-shock";
        const fade = 1 - clamp01((p - .68) / .32);
        paladinSourceCue(g, source, profile, p / .18);
        const radius = 10 + easeOut(p) * (burst ? 28 : strong ? 34 : 25);
        const scale = burst ? 1.15 : strong ? 1.32 : 1;

        for (let i = 0; i < 8; i += 1) {
          const a = i / 8 * Math.PI * 2 + (burst ? -p * 1.5 : p * .45);
          g
            .moveTo(
              dx + Math.cos(a) * radius * .48,
              dy + Math.sin(a) * radius * .48,
            )
            .lineTo(
              dx + Math.cos(a) * radius * scale,
              dy + Math.sin(a) * radius * scale,
            )
            .stroke({
              color: profile.main,
              width: strong ? 2.7 : 2,
              alpha: alpha * fade * .72,
            });
        }

        const diamond = [];
        const spin = Math.PI / 4 + p * .2;
        for (let i = 0; i < 4; i += 1) {
          const a = i * Math.PI / 2 + spin;
          diamond.push({
            x: dx + Math.cos(a) * radius * .58,
            y: dy + Math.sin(a) * radius * .58,
          });
        }
        drawPolygon(g, diamond, {
          color: profile.core,
          width: 1.6,
          alpha: alpha * fade * .52,
        });

        g.circle(dx, dy, strong ? 6.5 : 5).fill({
          color: profile.core,
          alpha: alpha * fade * .68,
        });
        continue;
      }

      if (profile.kind === "blessing") {
        paladinSourceCue(g, source, profile, p / .18);
        const fade = 1 - clamp01((p - .72) / .28);
        const radius = 22 + easeOut(p) * 8;

        for (let i = 0; i < 4; i += 1) {
          const a = i * Math.PI / 2 + p * .28;
          const cx = dx + Math.cos(a) * radius;
          const cy = dy + Math.sin(a) * radius;
          const plate = [
            [-7, -7],
            [7, -7],
            [10, 3],
            [0, 10],
            [-10, 3],
          ].map(([x, y]) => transformPoint(cx, cy, x, y, a));
          drawPolygon(g, plate, {
            color: profile.main,
            width: 3,
            alpha: alpha * fade * .80,
          });
        }
        continue;
      }

      if (profile.kind === "hammer") {
        paladinSourceCue(g, source, profile, p / .16);
        const fade = 1 - clamp01((p - .72) / .28);
        const travel = easeOut(p / .44);
        const hx = dx * travel;
        const hy = dy * travel;
        const angle = Math.atan2(dy, dx) + p * 2.8;
        const handleA = transformPoint(hx, hy, 0, -15, angle);
        const handleB = transformPoint(hx, hy, 0, 9, angle);
        g
          .moveTo(handleA.x, handleA.y)
          .lineTo(handleB.x, handleB.y)
          .stroke({
            color: profile.main,
            width: 6.5,
            alpha: alpha * fade * .80,
          });

        const head = [
          [-13, -19],
          [13, -19],
          [13, -10],
          [-13, -10],
        ].map(([x,y]) => transformPoint(hx, hy, x, y, angle));
        drawPolygon(g, head, {
          color: profile.core,
          width: 2,
          alpha: alpha * fade * .84,
        });

        if (p > .38) {
          const hit = clamp01((p - .38) / .45);
          g.circle(dx, dy, 10 + hit * 36).stroke({
            color: profile.main,
            width: 2.4,
            alpha: alpha * (1 - hit) * .70,
          });
        }
        continue;
      }

      if (profile.kind === "word-glory") {
        paladinSourceCue(g, source, profile, p / .16);
        const fade = 1 - clamp01((p - .70) / .30);
        const rise = 18 + easeOut(p) * 12;
        g
          .moveTo(dx - 20, dy - rise)
          .lineTo(dx - 11, dy - rise - 13)
          .lineTo(dx, dy - rise - 4)
          .lineTo(dx + 11, dy - rise - 13)
          .lineTo(dx + 20, dy - rise)
          .stroke({
            color: profile.main,
            width: 2.2,
            alpha: alpha * fade * .74,
          })
          .moveTo(dx - 17, dy - rise + 4)
          .lineTo(dx + 17, dy - rise + 4)
          .stroke({
            color: profile.core,
            width: 1.5,
            alpha: alpha * fade * .68,
          });

        for (let i = 0; i < 5; i += 1) {
          g.circle(
            dx + (i - 2) * 7,
            dy - rise + 8 + p * 9,
            1.8,
          ).fill({
            color: i === 2 ? profile.core : profile.main,
            alpha: alpha * fade * .60,
          });
        }
        continue;
      }

      if (profile.kind === "judgment") {
        paladinSourceCue(g, source, profile, p / .20);
        const vx = missed ? missX + (Math.abs(missX - dx) < 1 ? missSign * 4 : 0) : dx;
        const vy = missed ? dy - 10 : dy;
        const strike = clamp01((p - .10) / .55);
        const fade = 1 - clamp01((p - .72) / .28);
        const topY = vy - 128;
        const headY = topY + easeOut(strike) * 122;

        g
          .moveTo(vx, topY)
          .lineTo(vx, headY)
          .stroke({
            color: profile.core,
            width: 4,
            alpha: alpha * fade * .72,
          });

        const angle = .18;
        g
          .moveTo(...Object.values(transformPoint(vx, headY, 0, -20, angle)))
          .lineTo(...Object.values(transformPoint(vx, headY, 0, 7, angle)))
          .stroke({
            color: profile.main,
            width: 7,
            alpha: alpha * fade * .80,
          });

        const h0 = transformPoint(vx, headY, -15, -24, angle);
        const h1 = transformPoint(vx, headY, 15, -24, angle);
        g.moveTo(h0.x,h0.y).lineTo(h1.x,h1.y).stroke({
          color: profile.main,
          width: 7,
          alpha: alpha * fade * .80,
        });

        if (!missed && strike > .58) {
          const hit = (strike - .58) / .42;
          for (let i = 0; i < 8; i += 1) {
            const a = i / 8 * Math.PI * 2;
            const rr = 9 + easeOut(hit) * (25 + (i % 2) * 9);
            g.circle(
              dx + Math.cos(a) * rr,
              dy + Math.sin(a) * rr,
              1.8,
            ).fill({
              color: i % 2 ? profile.main : profile.core,
              alpha: alpha * (1 - hit) * .70,
            });
          }
        }
        continue;
      }

      if (profile.kind === "fever") {
        dkSourceCue(g, source, profile, p / .18);
        const vx = missed ? missX : dx;
        const vy = missed ? dy - 12 : dy;
        const fade = 1 - clamp01((p - .62) / .38);
        const radius = 9 + easeOut(p) * 24;

        for (let i = 0; i < 6; i += 1) {
          const a = i / 6 * Math.PI * 2 + p * .35;
          g
            .moveTo(
              vx + Math.cos(a) * radius * .35,
              vy + Math.sin(a) * radius * .35,
            )
            .lineTo(
              vx + Math.cos(a + .14) * radius,
              vy + Math.sin(a + .14) * radius,
            )
            .stroke({
              color: profile.main,
              width: 1.8,
              alpha: alpha * fade * .72,
            });
        }

        for (let i = 0; i < 7; i += 1) {
          const a = i / 7 * Math.PI * 2 + seed * .014;
          const rr = 8 + p * (15 + (i % 4) * 4);
          g.circle(
            vx + Math.cos(a) * rr,
            vy + Math.sin(a) * rr - p * 9,
            1.5,
          ).fill({
            color: profile.core,
            alpha: alpha * fade * .44,
          });
        }
        continue;
      }

      if (profile.kind === "death-strike") {
        dkSourceCue(g, source, profile, p / .15);
        const vx = missed ? missX : dx;
        const vy = missed ? missY : dy;
        drawSlash(g, vx, vy, profile, p, seed, true, false);

        if (!missed && p > .28) {
          const t = clamp01((p - .28) / .48);
          const fade = 1 - clamp01((p - .75) / .25);
          const q = 1 - easeOut(t);
          const qx = dx * q;
          const qy = dy * q;
          const length = Math.max(1, Math.hypot(dx,dy));
          const nx = -dy / length;
          const ny = dx / length;
          g
            .moveTo(dx,dy)
            .lineTo(dx * .52 + nx * 12, dy * .52 + ny * 12)
            .lineTo(qx,qy)
            .stroke({
              color: profile.main,
              width: 2,
              alpha: alpha * fade * .54,
            })
            .circle(qx,qy,3.2)
            .fill({
              color: profile.core,
              alpha: alpha * fade * .68,
            });
        }
        continue;
      }

      if (profile.kind === "obliterate") {
        dkSourceCue(g, source, profile, p / .20);
        const vx = missed ? missX : dx;
        const vy = missed ? missY : dy;
        drawSlash(g, vx, vy, profile, p, seed, true, !missed);
        if (missed) continue;

        const hit = clamp01((p - .22) / .62);
        const fade = 1 - clamp01((p - .72) / .28);
        for (let i = 0; i < 8; i += 1) {
          const a = i / 8 * Math.PI * 2 + Math.sin(seed * .09 + i) * .20;
          g
            .moveTo(dx + Math.cos(a) * 8, dy + Math.sin(a) * 8)
            .lineTo(
              dx + Math.cos(a) * (18 + hit * 28),
              dy + Math.sin(a) * (18 + hit * 28),
            )
            .stroke({
              color: profile.main,
              width: 1.8,
              alpha: alpha * fade * .66,
            });
        }
        continue;
      }

      if (profile.kind === "chains") {
        dkSourceCue(g, source, profile, p / .16);
        const fade = 1 - clamp01((p - .72) / .28);
        for (let i = 0; i < 7; i += 1) {
          const a = i / 7 * Math.PI * 2 + p * .8;
          const rr = 19 + (i % 2) * 4;
          const yOff = 18 - easeOut(p) * (8 + (i % 3) * 6);
          const cx = dx + Math.cos(a) * rr;
          const cy = dy + yOff + Math.sin(a) * rr * .35;
          g.ellipse(cx,cy,6,3).stroke({
            color: profile.main,
            width: 2.2,
            alpha: alpha * fade * .78,
          });
        }
        g.circle(dx,dy,16 + easeOut(p) * 13).stroke({
          color: profile.core,
          width: 1.4,
          alpha: alpha * fade * .40,
        });
        continue;
      }

      if (profile.kind === "mind-freeze") {
        dkSourceCue(g, source, profile, p / .12);
        const fade = 1 - clamp01((p - .58) / .42);
        const close = 1 - easeOut(p);
        for (const sign of [-1,1]) {
          g
            .moveTo(dx + sign * (28 + close * 12), dy - 16)
            .lineTo(dx + sign * (11 + close * 5), dy)
            .lineTo(dx + sign * (28 + close * 12), dy + 16)
            .stroke({
              color: profile.core,
              width: 2.7,
              alpha: alpha * fade * .84,
            });
        }
        continue;
      }

      if (profile.kind === "frost-strike") {
        dkSourceCue(g, source, profile, p / .12);
        const vx = missed ? missX : dx;
        const vy = missed ? missY : dy;
        drawSlash(g, vx, vy, profile, p, seed, false, !missed);
        if (!missed) {
          const fade = 1 - clamp01((p - .68) / .32);
          g.circle(dx,dy,10 + easeOut(p) * 27).stroke({
            color: profile.main,
            width: 1.5,
            alpha: alpha * fade * .34,
          });
        }
        continue;
      }

      if (profile.kind === "rune-tap") {
        dkSourceCue(g, source, profile, p / .12);
        const fade = 1 - clamp01((p - .74) / .26);
        const rotation = -p * .7;

        for (let i = 0; i < 4; i += 1) {
          const a = i * Math.PI / 2 + rotation;
          const p0 = transformPoint(0,0,-7,-source.radius-9,a);
          const p1 = transformPoint(0,0,0,-source.radius-18,a);
          const p2 = transformPoint(0,0,7,-source.radius-9,a);
          g.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).lineTo(p2.x,p2.y).stroke({
            color: profile.main,
            width: 2.8,
            alpha: alpha * fade * .72,
          });
        }

        const rune = [
          [-10,-10],[10,-10],[10,10],[-10,10],
        ].map(([x,y]) => transformPoint(0,0,x,y,rotation));
        drawPolygon(g,rune,{
          color: profile.core,
          width: 1.4,
          alpha: alpha * fade * .62,
        });
        continue;
      }
    }
  }

  updateNativeWarriorRogueSpellVfx(game) {
    const clamp01 = value => Math.max(0, Math.min(1, value));
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };

    const transformPoint = (cx, cy, x, y, angle) => {
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      return {
        x: cx + x * ca - y * sa,
        y: cy + x * sa + y * ca,
      };
    };

    const strokeArc = (graphics, cx, cy, radius, start, end, style, segments = 6) => {
      if (style.alpha <= 0) return;
      let first = true;
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const a = start + (end - start) * t;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        if (first) {
          graphics.moveTo(x, y);
          first = false;
        } else {
          graphics.lineTo(x, y);
        }
      }
      graphics.stroke(style);
    };

    const weaponSlash = (
      graphics,
      cx,
      cy,
      angle,
      length,
      profile,
      alpha,
      width = 4,
      bend = 0,
      rogue = false,
    ) => {
      if (alpha <= 0) return;
      const a = transformPoint(cx, cy, -length * .52, -bend, angle);
      const m = transformPoint(cx, cy, 0, bend, angle);
      const b = transformPoint(cx, cy, length * .52, bend * .15, angle);

      graphics
        .moveTo(a.x, a.y)
        .lineTo(m.x, m.y)
        .lineTo(b.x, b.y)
        .stroke({
          color: profile.core,
          width,
          alpha,
        });

      graphics
        .moveTo(a.x, a.y)
        .lineTo(m.x, m.y)
        .lineTo(b.x, b.y)
        .stroke({
          color: rogue ? profile.accent : profile.accent,
          width: Math.max(1, width + 3.5),
          alpha: alpha * .18,
        });
    };

    const warriorCue = (graphics, source, profile, phase, heavy = false) => {
      const p = clamp01(phase);
      const fade = 1 - p;
      if (!source || fade <= 0) return;
      const count = heavy ? 5 : 3;

      for (let i = 0; i < count; i += 1) {
        const a = -.95 + i * (heavy ? .48 : .72);
        const inner = source.radius + 5;
        const outer = source.radius + 13 + i * 2 + p * 8;
        graphics
          .moveTo(Math.cos(a) * inner, Math.sin(a) * inner)
          .lineTo(Math.cos(a) * outer, Math.sin(a) * outer)
          .stroke({
            color: profile.accent,
            width: heavy ? 2.4 : 1.6,
            alpha: fade * (heavy ? .56 : .38),
          });
      }
    };

    const rogueCue = (graphics, source, profile, phase) => {
      const p = clamp01(phase);
      const fade = 1 - p;
      if (!source || fade <= 0) return;

      for (let i = 0; i < 3; i += 1) {
        const a = i * Math.PI * 2 / 3 - p * 1.8;
        const radius = source.radius + 7 + i * 3;
        strokeArc(
          graphics,
          0,
          0,
          radius,
          a,
          a + .72,
          {
            color: profile.accent,
            width: 1.4,
            alpha: fade * .38,
          },
          5,
        );
      }
    };

    const effectApplied = (target, spellId, kind) =>
      Boolean(target?.effects?.some(active =>
        active.remainingMs > 0
        && active.spellId === spellId
        && active.kind === kind
      ));

    for (const view of this.actorViews.values()) {
      view.warriorRogueSpellFx.clear();
      view.warriorRogueSpellFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell") continue;
      if (
        COMBAT_VFX2_SPELLS.has(effect.spellId)
        || PROJECTILE_VFX2_SPELLS.has(effect.spellId)
      ) continue;

      const profile = warriorRogueSpellProfile(effect.spellId);
      if (!profile) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !view || !view.root.visible) continue;

      const targetCenter = target
        ? visualActorCenter(this.actorViews, target, effect.targetX, effect.targetY)
        : null;
      const targetX = targetCenter?.x ?? effect.targetX ?? source.x;
      const targetY = targetCenter?.y ?? effect.targetY ?? source.y;
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = clamp01(1 - remaining / total);
      const alpha = clamp01(remaining / total);
      const seed = Number(effect.seed || effect.id || 1);
      const missed = Boolean(effect.missed);
      const dx = targetX - source.x;
      const dy = targetY - source.y;
      const missSign = Math.sin(seed * .83) >= 0 ? 1 : -1;
      const missX = dx + missSign * 43;
      const missY = dy - 8;
      const g = view.warriorRogueSpellFx;
      g.visible = true;

      if (profile.kind === "rend") {
        warriorCue(g, source, profile, p / .14);
        const vx = missed ? missX : dx;
        const vy = missed ? missY : dy;
        const fade = 1 - clamp01((p - .62) / .38);

        for (let i = 0; i < 3; i += 1) {
          const local = smooth((p - i * .055) / .30);
          if (local <= 0) continue;
          weaponSlash(
            g,
            vx + (i - 1) * 5,
            vy + (i - 1) * 2,
            -.84 + i * .07,
            37 + i * 4,
            profile,
            alpha * fade * local * .68,
            2.2,
            5,
          );
        }

        if (!missed) {
          for (let i = 0; i < 4; i += 1) {
            const a = -.4 + i * .28;
            g.circle(
              dx + Math.cos(a) * (11 + p * 15),
              dy + Math.sin(a) * (9 + p * 12),
              1.2 + (i % 2) * .5,
            ).fill({
              color: profile.main,
              alpha: alpha * fade * .42,
            });
          }
        }
        continue;
      }

      if (profile.kind === "mortal") {
        warriorCue(g, source, profile, p / .14, true);
        const vx = missed ? dx + missSign * 45 : dx;
        const vy = missed ? dy - 9 : dy;
        const fade = 1 - clamp01((p - .68) / .32);
        weaponSlash(
          g,
          vx,
          vy,
          -.66,
          58,
          profile,
          alpha * fade * smooth(p / .34) * .90,
          5.5,
          11,
        );

        if (!missed && p > .23) {
          const t = clamp01((p - .23) / .52);
          for (let i = 0; i < 3; i += 1) {
            const a = i * Math.PI * 2 / 3 + .2;
            strokeArc(
              g,
              dx,
              dy,
              17 + t * 14,
              a,
              a + .72,
              {
                color: profile.main,
                width: 2,
                alpha: alpha * (1 - t) * .50,
              },
              5,
            );
          }
        }
        continue;
      }

      if (profile.kind === "slam") {
        warriorCue(g, source, profile, p / .18, true);
        const vx = missed ? dx + missSign * 47 : dx;
        const vy = dy;
        const impact = smooth(p / .36);
        const fade = 1 - clamp01((p - .72) / .28);

        g
          .moveTo(vx - 10, vy - 42 + impact * 18)
          .lineTo(vx + 5, vy + 12)
          .stroke({
            color: profile.core,
            width: 5,
            alpha: alpha * fade * impact * .82,
          });

        if (!missed && p > .20) {
          const shock = clamp01((p - .20) / .58);
          g.ellipse(
            dx,
            dy + 13,
            10 + easeOut(shock) * 38,
            4 + easeOut(shock) * 10,
          ).stroke({
            color: profile.main,
            width: 2.4,
            alpha: alpha * (1 - shock) * .62,
          });

          for (let i = 0; i < 6; i += 1) {
            const a = -.15 + i * Math.PI / 5;
            const len = 10 + shock * (15 + (i % 3) * 6);
            g
              .moveTo(dx + Math.cos(a) * 7, dy + 12 + Math.sin(a) * 3)
              .lineTo(
                dx + Math.cos(a) * len,
                dy + 12 + Math.sin(a) * len * .38,
              )
              .stroke({
                color: profile.main,
                width: 1.4,
                alpha: alpha * (1 - shock) * .48,
              });
          }
        }
        continue;
      }

      if (profile.kind === "charge") {
        const originX = Number.isFinite(effect.sourceX) ? effect.sourceX - source.x : 0;
        const originY = Number.isFinite(effect.sourceY) ? effect.sourceY - source.y : 0;
        const moved = Math.hypot(originX, originY) > 5;
        const fade = 1 - clamp01((p - .72) / .28);

        if (moved) {
          const length = Math.max(1, Math.hypot(originX, originY));
          const tx = -originX / length;
          const ty = -originY / length;
          const nx = -ty;
          const ny = tx;
          const tailLen = Math.min(42, length);
          const tailX = -tx * tailLen;
          const tailY = -ty * tailLen;

          for (let i = 0; i < 4; i += 1) {
            const off = (i - 1.5) * 4;
            g
              .moveTo(tailX + nx * off, tailY + ny * off)
              .lineTo(-tx * 7 + nx * off * .5, -ty * 7 + ny * off * .5)
              .stroke({
                color: i % 2 ? profile.core : profile.main,
                width: 1.2 + i * .35,
                alpha: alpha * fade * (.16 + i * .05),
              });
          }

          for (let i = 0; i < 5; i += 1) {
            const lag = 5 + i * 7;
            g.circle(
              -tx * lag + nx * Math.sin(seed * .13 + i * 2.1) * 5,
              -ty * lag + ny * Math.sin(seed * .13 + i * 2.1) * 5,
              1.3 + (i % 2) * .5,
            ).fill({
              color: profile.main,
              alpha: alpha * fade * (.44 - i * .05),
            });
          }
        } else {
          warriorCue(g, source, profile, p / .40, true);
        }

        if (target && p > .44) {
          const hit = clamp01((p - .44) / .44);
          g.ellipse(
            0,
            source.radius * .65,
            10 + hit * 24,
            4 + hit * 7,
          ).stroke({
            color: profile.core,
            width: 2,
            alpha: alpha * (1 - hit) * .40,
          });
        }
        continue;
      }

      if (profile.kind === "pummel") {
        warriorCue(g, source, profile, p / .12);
        const successful = effectApplied(target, effect.spellId, "schoolLock");
        const cx = successful ? dx : 0;
        const cy = successful ? dy : 0;
        const fade = 1 - clamp01((p - .62) / .38);
        const close = successful ? 1 - easeOut(p) : 1;

        for (const sign of [-1, 1]) {
          g
            .moveTo(cx + sign * (27 + close * 5), cy - 11)
            .lineTo(cx + sign * (10 + close * 3), cy)
            .lineTo(cx + sign * (27 + close * 5), cy + 11)
            .stroke({
              color: profile.core,
              width: 3.4,
              alpha: alpha * fade * .76,
            });
        }
        continue;
      }

      if (profile.kind === "overpower") {
        warriorCue(g, source, profile, p / .12);
        const vx = missed ? missX : dx;
        const vy = missed ? missY : dy;
        const fade = 1 - clamp01((p - .66) / .34);

        weaponSlash(
          g,
          vx,
          vy,
          .78,
          52,
          profile,
          alpha * fade * smooth(p / .30) * .86,
          4.3,
          -12,
        );

        if (!missed && p > .22) {
          const hit = clamp01((p - .22) / .48);
          for (let i = 0; i < 5; i += 1) {
            const a = -.9 + i * .28;
            g.circle(
              dx + Math.cos(a) * (13 + hit * 20),
              dy + Math.sin(a) * (13 + hit * 20),
              1.4,
            ).fill({
              color: profile.main,
              alpha: alpha * (1 - hit) * .46,
            });
          }
        }
        continue;
      }

      if (profile.kind === "bloodthirst") {
        warriorCue(g, source, profile, p / .12);
        const vx = missed ? missX : dx;
        const vy = missed ? dy : dy;
        const fade = 1 - clamp01((p - .66) / .34);

        for (let i = 0; i < 3; i += 1) {
          const local = smooth((p - i * .045) / .28);
          weaponSlash(
            g,
            vx + (i - 1) * 3,
            vy,
            -.5 + i * .5,
            36 + i * 3,
            profile,
            alpha * fade * local * .62,
            2.8,
            5,
          );
        }

        if (!missed && p > .28) {
          const t = clamp01((p - .28) / .48);
          const length = Math.max(1, Math.hypot(dx,dy));
          const nx = -dy / length;
          const ny = dx / length;
          for (let i = 0; i < 5; i += 1) {
            const local = clamp01(t - i * .08);
            const travel = easeOut(local);
            const qx = dx * (1 - travel);
            const qy = dy * (1 - travel);
            const wobble = Math.sin(i + p * 10) * 4;
            g.circle(
              qx + nx * wobble,
              qy + ny * wobble,
              1.5 + (i % 2) * .4,
            ).fill({
              color: profile.main,
              alpha: alpha * fade * .46,
            });
          }
        }
        continue;
      }

      if (profile.kind === "garrote") {
        rogueCue(g, source, profile, p / .10);
        const vx = missed ? dx + missSign * 39 : dx;
        const vy = missed ? dy - 7 : dy;
        const fade = 1 - clamp01((p - .62) / .38);

        for (let i = 0; i < 2; i += 1) {
          const y = vy - 5 + i * 9;
          g
            .moveTo(vx - 18, y - 5)
            .lineTo(vx, y + (i ? -6 : 6))
            .lineTo(vx + 18, y + 4)
            .stroke({
              color: profile.core,
              width: 1.8,
              alpha: alpha * fade * .70,
            });
        }

        if (!missed) {
          for (let i = 0; i < 3; i += 1) {
            g.circle(dx - 9 + i * 9, dy + 9 + p * 8, 1.2).fill({
              color: 0x8e5b55,
              alpha: alpha * fade * .34,
            });
          }
        }
        continue;
      }

      if (profile.kind === "sinister") {
        rogueCue(g, source, profile, p / .08);
        const vx = missed ? dx + missSign * 40 : dx;
        const vy = missed ? dy - 7 : dy;
        const fade = 1 - clamp01((p - .58) / .42);

        weaponSlash(
          g,
          vx,
          vy,
          -.72,
          42,
          profile,
          alpha * fade * smooth(p / .22) * .72,
          2.2,
          8,
          true,
        );

        if (!missed) {
          strokeArc(
            g,
            dx,
            dy,
            15 + p * 17,
            -.7,
            .45,
            {
              color: profile.accent,
              width: 1.4,
              alpha: alpha * fade * .26,
            },
            6,
          );
        }
        continue;
      }

      if (profile.kind === "eviscerate") {
        rogueCue(g, source, profile, p / .10);
        const vx = missed ? dx + missSign * 43 : dx;
        const vy = missed ? dy - 6 : dy;
        const fade = 1 - clamp01((p - .70) / .30);

        for (let i = 0; i < 3; i += 1) {
          const local = smooth((p - i * .07) / .22);
          weaponSlash(
            g,
            vx + (i - 1) * 4,
            vy + (1 - i) * 4,
            -.95 + i * .88,
            43,
            profile,
            alpha * fade * local * .76,
            2,
            4,
            true,
          );
        }

        if (!missed && p > .25) {
          const hit = clamp01((p - .25) / .40);
          g.circle(dx,dy,Math.max(1.5,4 * (1 - hit * .5))).fill({
            color: profile.core,
            alpha: alpha * (1 - hit) * .56,
          });
        }
        continue;
      }

      if (profile.kind === "kidney") {
        rogueCue(g, source, profile, p / .09);
        const successful = effectApplied(target, effect.spellId, "stun");
        const fade = 1 - clamp01((p - .66) / .34);

        for (let i = 0; i < 3; i += 1) {
          const a = -.45 + i * .45;
          g
            .moveTo(dx + Math.cos(a) * 25, dy + Math.sin(a) * 25)
            .lineTo(dx + Math.cos(a) * 7, dy + Math.sin(a) * 7)
            .stroke({
              color: successful ? profile.core : profile.main,
              width: 2.2,
              alpha: alpha * fade * .66,
            });
        }

        if (successful) {
          g.circle(dx,dy,10 + easeOut(p) * 15).stroke({
            color: profile.accent,
            width: 1.4,
            alpha: alpha * fade * .34,
          });
        }
        continue;
      }

      if (profile.kind === "kick") {
        rogueCue(g, source, profile, p / .08);
        const successful = effectApplied(target, effect.spellId, "schoolLock");
        const cx = successful ? dx : 0;
        const cy = successful ? dy : 0;
        const fade = 1 - clamp01((p - .58) / .42);
        const angle = -.52;

        const p0 = transformPoint(cx,cy,-24,9,angle);
        const p1 = transformPoint(cx,cy,8,-5,angle);
        const p2 = transformPoint(cx,cy,23,-13,angle);
        g
          .moveTo(p0.x,p0.y)
          .lineTo(p1.x,p1.y)
          .lineTo(p2.x,p2.y)
          .stroke({
            color: profile.core,
            width: 2.8,
            alpha: alpha * fade * .74,
          });

        if (successful) {
          for (let i = 0; i < 3; i += 1) {
            const a = transformPoint(cx,cy,7 + i * 5,-3 - i * 3,angle);
            const b = transformPoint(cx,cy,15 + i * 6,3 - i * 2,angle);
            g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({
              color: profile.accent,
              width: 1.3,
              alpha: alpha * fade * .52,
            });
          }
        }
        continue;
      }

      if (profile.kind === "mutilate") {
        rogueCue(g, source, profile, p / .09);
        const vx = missed ? missX : dx;
        const vy = missed ? missY : dy;
        const fade = 1 - clamp01((p - .68) / .32);
        const left = smooth(p / .25);
        const right = smooth((p - .075) / .25);

        weaponSlash(
          g,vx - 3,vy,.72,44,profile,
          alpha * fade * left * .78,2.2,-5,true,
        );
        weaponSlash(
          g,vx + 3,vy,-.72,44,profile,
          alpha * fade * right * .78,2.2,5,true,
        );

        if (!missed && p > .25) {
          const hit = clamp01((p - .25) / .42);
          for (let i = 0; i < 4; i += 1) {
            const a = Math.PI / 4 + i * Math.PI / 2;
            g.circle(
              dx + Math.cos(a) * (8 + hit * 14),
              dy + Math.sin(a) * (8 + hit * 14),
              1.4,
            ).fill({
              color: i % 2 ? profile.main : profile.accent,
              alpha: alpha * (1 - hit) * .46,
            });
          }
        }
        continue;
      }

      if (profile.kind === "shadowstep") {
        const originX = Number.isFinite(effect.sourceX) ? effect.sourceX - source.x : 0;
        const originY = Number.isFinite(effect.sourceY) ? effect.sourceY - source.y : 0;
        const moved = Math.hypot(originX,originY) > 12;
        const fadeOut = 1 - clamp01(p / .52);

        g.circle(originX,originY,9 + p * 22).stroke({
          color: profile.accent,
          width: 1.5,
          alpha: alpha * fadeOut * .44,
        });

        for (let i = 0; i < 6; i += 1) {
          const a = i / 6 * Math.PI * 2 + p * 2.4 + seed * .017;
          const rr = 5 + p * (15 + (i % 3) * 6);
          g.circle(
            originX + Math.cos(a) * rr,
            originY + Math.sin(a) * rr,
            1.4 + (i % 2) * .5,
          ).fill({
            color: profile.accent,
            alpha: alpha * fadeOut * .44,
          });
        }

        if (moved && p > .08) {
          const arrive = clamp01((p - .08) / .55);
          const fade = 1 - clamp01((p - .70) / .30);
          for (let i = 0; i < 7; i += 1) {
            const a = i / 7 * Math.PI * 2 - arrive * 1.7;
            const rr = 29 * (1 - arrive * .62) + (i % 2) * 4;
            g.circle(
              Math.cos(a) * rr,
              Math.sin(a) * rr,
              1.3 + (i % 3) * .45,
            ).fill({
              color: i % 3 === 0 ? profile.core : profile.main,
              alpha: alpha * fade * .50,
            });
          }
          g.circle(0,0,25 - arrive * 11).stroke({
            color: profile.main,
            width: 1.3,
            alpha: alpha * fade * .28,
          });
        }
        continue;
      }
    }
  }

  updateNativeCommonCasterSpellVfx(game) {
    for (const view of this.actorViews.values()) {
      view.commonCasterSpellFx.clear();
      view.commonCasterSpellFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell") continue;
      if (
        PROJECTILE_VFX2_SPELLS.has(effect.spellId)
        || COMBAT_VFX2_SPELLS.has(effect.spellId)
      ) continue;

      const profile = commonCasterSpellProfile(effect.spellId);
      if (!profile) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !view || !view.root.visible) continue;

      const targetCenter = target
        ? visualActorCenter(this.actorViews, target, effect.targetX, effect.targetY)
        : null;
      const targetX = targetCenter?.x ?? effect.targetX;
      const targetY = targetCenter?.y ?? effect.targetY;
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = Math.max(0, Math.min(1, 1 - remaining / total));
      const alpha = Math.max(0, Math.min(1, remaining / total));
      const seed = Number(effect.seed || effect.id || 1);
      const dxFull = targetX - source.x;
      const dyFull = targetY - source.y;
      const distance = Math.max(1, Math.hypot(dxFull, dyFull));
      const tx = dxFull / distance;
      const ty = dyFull / distance;
      const nx = -ty;
      const ny = tx;
      const missed = Boolean(effect.missed);

      view.commonCasterSpellFx.visible = true;

      if (profile.kind === "flame-shock") {
        const fade = 1 - Math.max(0, Math.min(1, (p - .55) / .45));
        for (let i = 0; i < 8; i += 1) {
          const side = Math.sin(seed * .41 + i * 1.91) * 19;
          const baseX = dxFull + side;
          const baseY = dyFull + 15 - (i % 3) * 2.5;
          const rise = (18 + (i % 4) * 8) * (1 - Math.pow(1 - p, 3));
          const sway = Math.sin(i * 2.2 + p * 10) * 8;

          view.commonCasterSpellFx
            .moveTo(baseX, baseY)
            .lineTo(baseX + sway * .45, baseY - rise * .55)
            .lineTo(baseX + sway, baseY - rise)
            .stroke({
              color: i % 3 === 0 ? profile.core : profile.main,
              width: 1.6 + (i % 3) * .55,
              alpha: alpha * fade * (.45 + (i % 2) * .18),
            });
        }

        view.commonCasterSpellFx
          .circle(dxFull, dyFull, 8 + p * 22)
          .stroke({
            color: profile.accent,
            width: 1.2,
            alpha: alpha * fade * .36,
          });
        continue;
      }

      if (profile.kind === "corruption") {
        const fade = 1 - Math.max(0, Math.min(1, (p - .68) / .32));
        const outer = 12 + p * 24;

        view.commonCasterSpellFx
          .circle(dxFull, dyFull, outer)
          .stroke({
            color: profile.main,
            width: 2,
            alpha: alpha * fade * .46,
          })
          .circle(dxFull, dyFull, Math.max(5, outer - 8))
          .stroke({
            color: profile.core,
            width: 1,
            alpha: alpha * fade * .34,
          });

        for (let i = 0; i < 7; i += 1) {
          const a = (i / 7) * Math.PI * 2 + p * (i % 2 ? 1.7 : -1.35);
          const rr = 8 + p * (18 + (i % 3) * 6);
          view.commonCasterSpellFx
            .circle(
              dxFull + Math.cos(a) * rr,
              dyFull + Math.sin(a) * rr - p * 7,
              1.5 + (i % 3) * .5,
            )
            .fill({
              color: i % 3 === 0 ? profile.core : profile.main,
              alpha: alpha * fade * .58,
            });
        }
        continue;
      }

      if (profile.kind === "mage-bomb") {
        const popRaw = Math.max(0, Math.min(1, p / .18));
        const pop = popRaw * popRaw * (3 - 2 * popRaw);
        const fade = 1 - Math.max(0, Math.min(1, (p - .58) / .42));
        const radius = 12 + pop * 20;
        const spin = p * 2.8;
        const corners = [];

        for (let i = 0; i < 4; i += 1) {
          const a = i * Math.PI / 2 + spin;
          corners.push({
            x: dxFull + Math.cos(a) * radius,
            y: dyFull + Math.sin(a) * radius,
          });
        }
        corners.push(corners[0]);

        view.commonCasterSpellFx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i += 1) {
          view.commonCasterSpellFx.lineTo(corners[i].x, corners[i].y);
        }
        view.commonCasterSpellFx.stroke({
          color: profile.main,
          width: 2.2,
          alpha: alpha * fade * .82,
        });

        view.commonCasterSpellFx
          .circle(dxFull, dyFull, radius * .62)
          .stroke({
            color: profile.main,
            width: 1.5,
            alpha: alpha * fade * .52,
          })
          .circle(dxFull, dyFull, 5 + pop * 3)
          .fill({
            color: profile.core,
            alpha: alpha * fade * .52,
          });

        for (let i = 0; i < 4; i += 1) {
          const a = i * Math.PI / 2 + Math.PI / 4 - spin * 1.4;
          view.commonCasterSpellFx
            .circle(
              dxFull + Math.cos(a) * radius * .72,
              dyFull + Math.sin(a) * radius * .72,
              2.1,
            )
            .fill({
              color: profile.core,
              alpha: alpha * fade * .68,
            });
        }
        continue;
      }

      if (
        profile.kind === "arcane-control"
        || profile.kind === "nature-control"
        || profile.kind === "shadow-control"
      ) {
        const travelEnd = .30;
        const travelRaw = Math.max(0, Math.min(1, p / travelEnd));
        const travel = 1 - Math.pow(1 - travelRaw, 3);
        const missOffset = missed ? 30 : 0;
        const destinationX = dxFull + nx * missOffset;
        const destinationY = dyFull + ny * missOffset - (missed ? 18 : 0);
        const qx = destinationX * travel;
        const qy = destinationY * travel;
        const runeColor =
          profile.kind === "nature-control" ? profile.core : profile.main;

        view.commonCasterSpellFx
          .circle(qx, qy, 8 + travel * 6)
          .stroke({
            color: runeColor,
            width: 1.8,
            alpha: alpha * .66,
          })
          .circle(qx, qy, 4.2)
          .fill({
            color: profile.core,
            alpha: alpha * .76,
          });

        for (let i = 0; i < 5; i += 1) {
          const lag = Math.max(0, travel - .055 * (i + 1));
          const wobble = Math.sin(seed * .11 + i * 2.2 + p * 13) * 6;
          view.commonCasterSpellFx
            .circle(
              destinationX * lag + nx * wobble,
              destinationY * lag + ny * wobble,
              1.45,
            )
            .fill({
              color: i % 2 ? profile.main : profile.core,
              alpha: alpha * .36,
            });
        }

        if (!missed && p >= travelEnd) {
          const phase = Math.max(0, Math.min(1, (p - travelEnd) / .55));
          const fade = 1 - phase;
          const radius = 12 + phase * 32;

          view.commonCasterSpellFx
            .circle(dxFull, dyFull, radius)
            .stroke({
              color: profile.main,
              width: 2,
              alpha: alpha * fade * .58,
            })
            .circle(dxFull, dyFull, Math.max(6, radius - 7))
            .stroke({
              color: profile.core,
              width: 1,
              alpha: alpha * fade * .38,
            });

          for (let i = 0; i < 6; i += 1) {
            const a =
              i / 6 * Math.PI * 2
              + phase * (profile.kind === "nature-control" ? 1.2 : -1.1);
            const rr = 11 + phase * 24;
            view.commonCasterSpellFx
              .circle(
                dxFull + Math.cos(a) * rr,
                dyFull + Math.sin(a) * rr,
                1.8,
              )
              .fill({
                color: i % 2 ? profile.main : profile.core,
                alpha: alpha * fade * .52,
              });
          }
        }
        continue;
      }

      if (profile.kind === "frost-nova") {
        const wave = 1 - Math.pow(1 - Math.max(0, Math.min(1, p / .72)), 3);
        const fade = 1 - Math.max(0, Math.min(1, (p - .50) / .50));
        const radius = source.radius + 8 + wave * 108;

        view.commonCasterSpellFx
          .circle(0, 0, radius)
          .stroke({
            color: profile.main,
            width: 3.2,
            alpha: alpha * fade * .78,
          })
          .circle(0, 0, Math.max(source.radius + 4, radius - 12))
          .stroke({
            color: profile.core,
            width: 1.4,
            alpha: alpha * fade * .36,
          });

        for (let i = 0; i < 12; i += 1) {
          const angle =
            i / 12 * Math.PI * 2 + Math.sin(seed * .17 + i * 2.1) * .13;
          const rr = source.radius + 4 + wave * (88 + (i % 4) * 7);
          const x = Math.cos(angle) * rr;
          const y = Math.sin(angle) * rr;
          view.commonCasterSpellFx
            .moveTo(x, y - 5)
            .lineTo(x + 3.1, y)
            .lineTo(x, y + 5)
            .lineTo(x - 3.1, y)
            .lineTo(x, y - 5)
            .fill({
              color: profile.core,
              alpha: alpha * fade * .64,
            });
        }
        continue;
      }

      if (profile.kind === "astral" || profile.kind === "shadow-ward") {
        const appearRaw = Math.max(0, Math.min(1, p / .18));
        const appear = appearRaw * appearRaw * (3 - 2 * appearRaw);
        const fade = 1 - Math.max(0, Math.min(1, (p - .68) / .32));
        const base = source.radius + 10;
        const ward = profile.kind === "shadow-ward";

        view.commonCasterSpellFx
          .circle(0, 0, base + 22)
          .fill({
            color: ward ? profile.accent : profile.main,
            alpha: alpha * appear * fade * .08,
          });

        for (let i = 0; i < 4; i += 1) {
          const radius = base + i * 5;
          const start = p * (i % 2 ? -2.3 : 2.1) + i * 1.2;
          const end = start + 1.15;
          const segments = 5;
          for (let s = 0; s < segments; s += 1) {
            const a0 = start + (end - start) * (s / segments);
            const a1 = start + (end - start) * ((s + 1) / segments);
            view.commonCasterSpellFx
              .moveTo(Math.cos(a0) * radius, Math.sin(a0) * radius)
              .lineTo(Math.cos(a1) * radius, Math.sin(a1) * radius)
              .stroke({
                color: i % 2 ? profile.accent : profile.main,
                width: 2,
                alpha: alpha * appear * fade * (.40 + i * .07),
              });
          }
        }

        for (let i = 0; i < 7; i += 1) {
          const angle =
            i / 7 * Math.PI * 2 + p * (i % 2 ? 2 : -1.5) + seed * .01;
          const rr = base + 7 + (i % 3) * 6;
          view.commonCasterSpellFx
            .circle(Math.cos(angle) * rr, Math.sin(angle) * rr, 1.5)
            .fill({
              color: i % 2 ? profile.main : profile.core,
              alpha: alpha * appear * fade * .50,
            });
        }
        continue;
      }

      if (profile.kind === "stormstrike") {
        const slashRaw = Math.max(0, Math.min(1, p / .26));
        const slash = slashRaw * slashRaw * (3 - 2 * slashRaw);
        const fade = 1 - Math.max(0, Math.min(1, (p - .42) / .58));
        const reach = 24 + slash * 26;
        const angle = Math.atan2(dyFull, dxFull);
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);

        const transform = (x, y) => ({
          x: dxFull + x * ca - y * sa,
          y: dyFull + x * sa + y * ca,
        });

        for (const sign of [-1, 1]) {
          const a = transform(-reach * .75, -reach * .6 * sign);
          const m = transform(0, 0);
          const b = transform(reach * .75, reach * .58 * sign);
          view.commonCasterSpellFx
            .moveTo(a.x, a.y)
            .lineTo(m.x, m.y)
            .lineTo(b.x, b.y)
            .stroke({
              color: sign < 0 ? profile.main : profile.core,
              width: sign < 0 ? 5 : 2.4,
              alpha: alpha * fade * .82,
            });
        }

        const hit = Math.max(0, Math.min(1, (p - .10) / .52));
        const hitFade = 1 - hit;
        view.commonCasterSpellFx
          .circle(dxFull, dyFull, 9 + hit * 30)
          .stroke({
            color: profile.main,
            width: 2.2,
            alpha: alpha * hitFade * .58,
          });
        continue;
      }

      if (profile.kind === "lightning-release") {
        const pulse = 1 - Math.max(0, Math.min(1, (p - .34) / .32));
        const radius = 12 + p * 24;
        view.commonCasterSpellFx
          .circle(0, 0, radius)
          .stroke({
            color: profile.main,
            width: 2,
            alpha: alpha * pulse * .50,
          });

        for (let i = 0; i < 5; i += 1) {
          const a = i / 5 * Math.PI * 2 + p * 4;
          const qx = Math.cos(a) * (15 + p * 18);
          const qy = Math.sin(a) * (15 + p * 18);
          const mx = qx * .52 + Math.sin(seed * .13 + i * 2.2 + p * 9) * 5;
          const my = qy * .52 + Math.cos(seed * .11 + i * 1.8 + p * 8) * 5;
          view.commonCasterSpellFx
            .moveTo(0, 0)
            .lineTo(mx, my)
            .lineTo(qx, qy)
            .stroke({
              color: profile.core,
              width: 1.4,
              alpha: alpha * pulse * .52,
            });
        }
        continue;
      }

      if (profile.kind === "drain") {
        const fade = 1 - Math.max(0, Math.min(1, (p - .72) / .28));
        const waves = 2;
        for (let line = 0; line < waves; line += 1) {
          const segments = 10;
          view.commonCasterSpellFx.moveTo(0, 0);
          for (let i = 1; i <= segments; i += 1) {
            const t = i / segments;
            const bx = dxFull * t;
            const by = dyFull * t;
            const wave =
              Math.sin(t * 10 + p * 13 + line * 2.3 + seed * .03)
              * 7
              * Math.sin(t * Math.PI);
            view.commonCasterSpellFx.lineTo(
              bx + nx * wave * (line ? -1 : 1),
              by + ny * wave * (line ? -1 : 1),
            );
          }
          view.commonCasterSpellFx.stroke({
            color: line ? profile.core : profile.main,
            width: line ? 1.25 : 3.4,
            alpha: alpha * fade * (line ? .72 : .52),
          });
        }

        for (let i = 0; i < 6; i += 1) {
          const t = (p * 1.7 + i / 6) % 1;
          const wobble = Math.sin(i * 2.4 + p * 11) * 5;
          view.commonCasterSpellFx
            .circle(
              dxFull * t + nx * wobble,
              dyFull * t + ny * wobble,
              1.5 + (i % 2) * .4,
            )
            .fill({
              color: i % 2 ? profile.core : profile.main,
              alpha: alpha * fade * .52,
            });
        }
        continue;
      }

      if (profile.kind === "conflagrate") {
        const fade = 1 - Math.max(0, Math.min(1, (p - .62) / .38));
        const eased = 1 - Math.pow(1 - p, 3);
        for (let i = 0; i < 9; i += 1) {
          const a = i / 9 * Math.PI * 2 + seed * .021;
          const rr = 6 + eased * (18 + (i % 4) * 7);
          view.commonCasterSpellFx
            .circle(
              dxFull + Math.cos(a) * rr,
              dyFull + Math.sin(a) * rr - p * (4 + (i % 3) * 2),
              1.6 + (i % 3) * .6,
            )
            .fill({
              color: i % 3 === 0 ? profile.core : profile.main,
              alpha: alpha * fade * .68,
            });
        }

        view.commonCasterSpellFx
          .circle(dxFull, dyFull, 9 + eased * 29)
          .stroke({
            color: profile.main,
            width: 2.5,
            alpha: alpha * fade * .62,
          });
        continue;
      }

      const travelEnd = profile.travelEnd || .56;
      const rawTravel = Math.max(0, Math.min(1, p / travelEnd));
      const travel = 1 - Math.pow(1 - rawTravel, 3);
      const missOffset = missed ? 38 : 0;
      const destinationX = dxFull + nx * missOffset + tx * (missed ? 10 : 0);
      const destinationY = dyFull + ny * missOffset + ty * (missed ? 10 : 0);

      const size = profile.size || 8;
      let projectileX = destinationX * travel;
      let projectileY = destinationY * travel;
      if (profile.kind === "lava") {
        projectileY -= Math.sin(travel * Math.PI) * 24;
      } else if (profile.kind === "arcane" || profile.kind === "elemental") {
        view.commonCasterSpellFx
          .circle(projectileX, projectileY, size + 2)
          .fill({ color: profile.main, alpha: alpha * .68 })
          .circle(projectileX, projectileY, size * .48)
          .fill({ color: profile.core, alpha: alpha * .94 });

        const satellites = profile.kind === "elemental" ? 3 : 4;
        for (let i = 0; i < satellites; i += 1) {
          const a =
            p * (profile.kind === "elemental" ? 15 : 10) * (i % 2 ? -1 : 1)
            + i * Math.PI * 2 / satellites;
          const rr = size + 6 + (i % 2) * 3;
          view.commonCasterSpellFx
            .circle(
              projectileX + Math.cos(a) * rr,
              projectileY + Math.sin(a) * rr,
              2.2,
            )
            .fill({
              color:
                profile.kind === "elemental" && i === 2
                  ? profile.accent
                  : (i % 2 ? profile.core : profile.main),
              alpha: alpha * .62,
            });
        }
      } else if (profile.kind === "shadow") {
        projectileX += nx * Math.sin(p * 13 + seed * .07) * 8;
        projectileY += ny * Math.sin(p * 13 + seed * .07) * 8;
      } else if (profile.kind === "chaos") {
        projectileX += nx * Math.sin(p * 17 + seed * .05) * 5;
        projectileY += ny * Math.sin(p * 17 + seed * .05) * 5;
      }

      // Tail first so the projectile core reads clearly on top.
      const tailCount = profile.heavy ? 6 : 4;
      for (let i = 0; i < tailCount; i += 1) {
        const lag = Math.max(0, travel - .045 * (i + 1));
        let qx = destinationX * lag;
        let qy = destinationY * lag;
        if (profile.kind === "lava") qy -= Math.sin(lag * Math.PI) * 24;
        const wobble = Math.sin(seed * .13 + i * 2.2 + p * 8) * 4;

        view.commonCasterSpellFx
          .circle(
            qx + nx * wobble,
            qy + ny * wobble,
            Math.max(1.2, size * .28 - i * .12),
          )
          .fill({
            color: i % 2 ? profile.main : profile.core,
            alpha: alpha * Math.max(.18, .52 - i * .065),
          });
      }

      if (profile.kind === "frost") {
        view.commonCasterSpellFx
          .circle(projectileX, projectileY, size)
          .fill({ color: profile.main, alpha: alpha * .82 })
          .circle(projectileX, projectileY, size * .48)
          .fill({ color: profile.core, alpha: alpha * .94 });

        for (let i = 0; i < 4; i += 1) {
          const a = i / 4 * Math.PI * 2 + p * 7;
          view.commonCasterSpellFx
            .moveTo(projectileX, projectileY)
            .lineTo(
              projectileX + Math.cos(a) * (size + 5),
              projectileY + Math.sin(a) * (size + 5),
            )
            .stroke({
              color: profile.accent,
              width: 1.2,
              alpha: alpha * .58,
            });
        }
      } else if (
        profile.kind === "fire"
        || profile.kind === "lava"
        || profile.kind === "frostfire"
      ) {
        view.commonCasterSpellFx
          .circle(projectileX, projectileY, size + 2)
          .fill({ color: profile.accent, alpha: alpha * .72 })
          .circle(projectileX, projectileY, size)
          .fill({ color: profile.main, alpha: alpha * .92 })
          .circle(projectileX, projectileY, size * .42)
          .fill({ color: profile.core, alpha: alpha * .95 });

        for (let i = 0; i < 5; i += 1) {
          const a = i / 5 * Math.PI * 2 + p * 9;
          view.commonCasterSpellFx
            .moveTo(
              projectileX + Math.cos(a) * size * .45,
              projectileY + Math.sin(a) * size * .45,
            )
            .lineTo(
              projectileX + Math.cos(a + .22) * (size + 5),
              projectileY + Math.sin(a + .22) * (size + 5),
            )
            .stroke({
              color: i % 2 ? profile.core : profile.main,
              width: 1.3,
              alpha: alpha * .64,
            });
        }
      } else if (profile.kind === "shadow") {
        view.commonCasterSpellFx
          .circle(projectileX, projectileY, size + 3)
          .fill({ color: profile.accent, alpha: alpha * .52 })
          .circle(projectileX, projectileY, size)
          .fill({ color: profile.main, alpha: alpha * .86 })
          .circle(projectileX, projectileY, size * .4)
          .fill({ color: profile.core, alpha: alpha * .82 });

        for (let i = 0; i < 4; i += 1) {
          const a = p * 8 + i * Math.PI / 2;
          const rr = size + 6;
          view.commonCasterSpellFx
            .circle(
              projectileX + Math.cos(a) * rr,
              projectileY + Math.sin(a) * rr,
              1.7,
            )
            .fill({
              color: i % 2 ? profile.core : profile.main,
              alpha: alpha * .52,
            });
        }
      } else if (profile.kind === "chaos") {
        view.commonCasterSpellFx
          .circle(projectileX, projectileY, size + 5)
          .fill({ color: profile.accent, alpha: alpha * .46 })
          .circle(projectileX, projectileY, size + 1)
          .fill({ color: profile.main, alpha: alpha * .88 })
          .circle(projectileX, projectileY, size * .46)
          .fill({ color: profile.core, alpha: alpha * .98 });

        for (const sign of [-1, 1]) {
          const a = p * 12 * sign + seed * .03;
          view.commonCasterSpellFx
            .circle(
              projectileX + Math.cos(a) * (size + 7),
              projectileY + Math.sin(a) * (size + 7),
              2.4,
            )
            .fill({
              color: sign > 0 ? profile.core : profile.main,
              alpha: alpha * .72,
            });
        }
      }

      if (!missed && p >= travelEnd) {
        const hit = Math.max(0, Math.min(1, (p - travelEnd) / .38));
        const fade = 1 - hit;
        const impactRadius = 9 + hit * (profile.heavy ? 36 : 26);

        view.commonCasterSpellFx
          .circle(dxFull, dyFull, impactRadius)
          .stroke({
            color: profile.main,
            width: profile.heavy ? 3.2 : 2.3,
            alpha: alpha * fade * .72,
          })
          .circle(dxFull, dyFull, Math.max(5, impactRadius - 7))
          .stroke({
            color: profile.core,
            width: 1.15,
            alpha: alpha * fade * .68,
          });

        const sparks = profile.heavy ? 9 : 6;
        for (let i = 0; i < sparks; i += 1) {
          const a = i / sparks * Math.PI * 2 + seed * .11;
          const rr = 7 + hit * (18 + (i % 4) * 5);
          view.commonCasterSpellFx
            .circle(
              dxFull + Math.cos(a) * rr,
              dyFull + Math.sin(a) * rr - hit * 5,
              1.6 + (i % 3) * .55,
            )
            .fill({
              color: i % 3 === 0 ? profile.core : profile.main,
              alpha: alpha * fade * .68,
            });
        }
      }
    }
  }

  updateNativeCombatVfx2(game) {
    const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };

    const point = (cx, cy, x, y, angle) => {
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      return {
        x: cx + x * ca - y * sa,
        y: cy + x * sa + y * ca,
      };
    };

    const polygon = (g, pts, style, fill = false) => {
      if (!pts?.length || style.alpha <= 0) return;
      g.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        g.lineTo(pts[i].x, pts[i].y);
      }
      g.lineTo(pts[0].x, pts[0].y);
      if (fill) g.fill(style);
      else g.stroke(style);
    };

    const arc = (g, cx, cy, radius, start, end, style, segments = 8) => {
      if (style.alpha <= 0) return;
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const a = start + (end - start) * t;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke(style);
    };

    const leaf = (g, cx, cy, angle, size, color, alpha) => {
      const pts = [
        point(cx,cy,size,0,angle),
        point(cx,cy,0,size*.48,angle),
        point(cx,cy,-size,0,angle),
        point(cx,cy,0,-size*.48,angle),
      ];
      polygon(g,pts,{color,alpha},true);
    };

    const weaponSlash = (
      g,
      cx,
      cy,
      angle,
      length,
      profile,
      alpha,
      width,
      bend = 0,
    ) => {
      if (alpha <= 0) return;
      const a=point(cx,cy,-length*.52,-bend,angle);
      const m=point(cx,cy,0,bend,angle);
      const b=point(cx,cy,length*.52,bend*.15,angle);
      g.moveTo(a.x,a.y).lineTo(m.x,m.y).lineTo(b.x,b.y).stroke({
        color:profile.core,width,alpha
      });
      g.moveTo(a.x,a.y).lineTo(m.x,m.y).lineTo(b.x,b.y).stroke({
        color:profile.accent,width:width+4,alpha:alpha*.16
      });
    };

    for (const view of this.actorViews.values()) {
      view.combatVfx2GlowFx.clear();
      view.combatVfx2GlowFx.visible = false;
      view.combatVfx2CoreFx.clear();
      view.combatVfx2CoreFx.visible = false;
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell") continue;
      if (!COMBAT_VFX2_SPELLS.has(effect.spellId)) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !view || !view.root.visible) continue;

      const targetCenter = target
        ? visualActorCenter(this.actorViews, target, effect.targetX, effect.targetY)
        : null;
      const targetX = targetCenter?.x ?? effect.targetX ?? source.x;
      const targetY = targetCenter?.y ?? effect.targetY ?? source.y;
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) continue;

      const profile = spellPolishProfile(effect.spellId, effect.style);
      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = clamp01(1 - remaining / total);
      const alpha = clamp01(remaining / total);
      const seed = Number(effect.seed || effect.id || 1);
      const missed = Boolean(effect.missed);
      const glow = view.combatVfx2GlowFx;
      const core = view.combatVfx2CoreFx;

      const dx0 = targetX - source.x;
      const dy0 = targetY - source.y;
      const len0 = Math.max(1, Math.hypot(dx0,dy0));
      const tx = dx0 / len0;
      const ty = dy0 / len0;
      const nx = -ty;
      const ny = tx;
      const missSign = Math.sin(seed*.83) >= 0 ? 1 : -1;
      const dx = missed ? dx0 + nx*missSign*44 : dx0;
      const dy = missed ? dy0 + ny*missSign*44 - 8 : dy0;

      glow.visible = true;
      core.visible = true;

      // ---------------------------------------------------------------------
      // HEALING: Priest = restorative seals/convergence, Druid = living foliage,
      // Paladin = angular sun seals/crown. Same purpose, distinct language.
      // ---------------------------------------------------------------------
      if (COMBAT_VFX2_HEALS.has(effect.spellId)) {
        const fade=1-smooth((p-.62)/.38);
        const strong=
          effect.spellId==="priest-greater-heal"
          || effect.spellId==="druid-regrowth"
          || effect.spellId==="paladin-holy-light"
          || effect.spellId==="paladin-word-of-glory";
        const power=strong?1.28:1;

        if (effect.spellId.startsWith("priest-")) {
          const eased=easeOut(p);
          const appear=easeOut(p/.24);

          // Priest healing deliberately avoids the tall descending beam used by
          // Holy Fire. Heals read as target-centered restoration: soft halos,
          // converging light and upward motes.
          if(effect.spellId==="priest-renew"){
            const radius=8+eased*22;
            glow.circle(dx,dy,radius*.82).fill({
              color:profile.main,alpha:alpha*fade*.07
            });
            core.circle(dx,dy,radius).stroke({
              color:profile.main,width:1.6,alpha:alpha*fade*.48
            });
            for(let i=0;i<6;i++){
              const a=i/6*Math.PI*2-p*.8+seed*.004;
              const rr=9+eased*(13+(i%2)*4);
              core.circle(
                dx+Math.cos(a)*rr,
                dy+Math.sin(a)*rr-p*5,
                1.2+(i%2)*.45
              ).fill({
                color:i%2?profile.core:profile.main,
                alpha:alpha*fade*.52,
              });
            }
            continue;
          }

          if(effect.spellId==="priest-flash-heal"){
            const top=dy-58;
            const beamFade=alpha*fade*appear;

            // Flash Heal lands as a short, broad blessing of light. It is much
            // softer and shorter than Holy Fire, but still has the clear
            // "light comes down and healing happens" read the old version had.
            glow
              .moveTo(dx,top)
              .lineTo(dx,dy+8)
              .stroke({
                color:profile.main,
                width:28,
                alpha:beamFade*.11,
              });

            for(let i=0;i<5;i++){
              const lane=i/4-.5;
              core
                .moveTo(dx+lane*24,top+(i%2)*4)
                .lineTo(dx+lane*9,dy+6)
                .stroke({
                  color:i===2?profile.core:profile.main,
                  width:i===2?2.8:1.8,
                  alpha:beamFade*(i===2?.62:.38),
                });
            }

            for(let i=0;i<8;i++){
              const side=(i-3.5)*6;
              const fall=(p*26+(i%4)*9)%54;
              core.circle(
                dx+side+Math.sin(seed*.03+i+p*6)*2.5,
                top+8+fall,
                1.2+(i%3)*.4
              ).fill({
                color:i%3===0?profile.core:profile.main,
                alpha:alpha*fade*.48,
              });
            }

            core.circle(dx,dy,9+eased*22).stroke({
              color:profile.main,width:2.1,alpha:alpha*fade*.60
            });
            core.circle(dx,dy,4+appear*3.5).fill({
              color:profile.core,alpha:alpha*fade*.66
            });
            continue;
          }

          // Greater Heal keeps the same restorative language as Flash Heal,
          // but with a broader, longer blessing and denser falling particles.
          const top=dy-84;
          const beamFade=alpha*fade*appear;

          glow
            .moveTo(dx,top)
            .lineTo(dx,dy+10)
            .stroke({
              color:profile.main,
              width:40,
              alpha:beamFade*.13,
            });

          for(let i=0;i<7;i++){
            const lane=i/6-.5;
            core
              .moveTo(dx+lane*36,top+(i%3)*4)
              .lineTo(dx+lane*12,dy+7)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:i===3?3.4:2.0,
                alpha:beamFade*(i===3?.68:.42),
              });
          }

          for(let i=0;i<13;i++){
            const lane=(i-6)*5.2;
            const fall=(p*34+(i%5)*11)%76;
            core.circle(
              dx+lane+Math.sin(seed*.037+i*1.7+p*7)*3.2,
              top+8+fall,
              1.2+(i%3)*.45
            ).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:alpha*fade*.52,
            });
          }

          const baseRadius=11+eased*31*power;
          glow.circle(dx,dy,baseRadius*.88).fill({
            color:profile.main,alpha:alpha*fade*.08
          });
          core.circle(dx,dy,baseRadius).stroke({
            color:profile.main,width:2.5,alpha:alpha*fade*.62
          });
          core.circle(dx,dy,Math.max(7,baseRadius-8)).stroke({
            color:profile.core,width:1.35,alpha:alpha*fade*.44
          });
          core.circle(dx,dy,4.5+appear*4).fill({
            color:profile.core,alpha:alpha*fade*.70
          });
          continue;
        }

        if (effect.spellId.startsWith("druid-")) {
          const count=effect.spellId==="druid-swiftmend"?12:(strong?10:8);

          if(effect.spellId==="druid-regrowth"){
            for(let i=0;i<4;i++){
              const side=(i-1.5)*8;
              core
                .moveTo(dx+side,dy+18)
                .lineTo(
                  dx+side+Math.sin(i+p*5)*10,
                  dy-8-p*17
                )
                .lineTo(dx+side*.3,dy-29-p*10)
                .stroke({
                  color:profile.main,width:2,alpha:alpha*fade*.46
                });
            }
          }

          for(let i=0;i<count;i++){
            const a=i/count*Math.PI*2+p*(i%2?.9:-.7)+seed*.006;
            const rr=7+easeOut(p)*(18+(i%4)*4);
            leaf(
              core,
              dx+Math.cos(a)*rr,
              dy+Math.sin(a)*rr-p*(effect.spellId==="druid-lifebloom"?12:7),
              a+.4+p,
              3.4+(i%3)*.7,
              i%3===0?profile.core:profile.main,
              alpha*fade*.70
            );
          }

          if(effect.spellId==="druid-lifebloom"){
            for(let i=0;i<6;i++){
              const a=i/6*Math.PI*2+p*.45;
              const rr=7+easeOut(p)*10;
              leaf(core,dx+Math.cos(a)*rr,dy+Math.sin(a)*rr,a,5.3,
                i%2?profile.main:profile.core,alpha*fade*.75);
            }
          }

          glow.circle(dx,dy,12+easeOut(p)*24*power).stroke({
            color:profile.main,width:7,alpha:alpha*fade*.09
          });
          continue;
        }

        // Paladin heal language.
        const radius=10+easeOut(p)*(strong?36:29);
        glow.circle(dx,dy,radius*.80).fill({
          color:profile.main,alpha:alpha*fade*.09
        });
        for(let i=0;i<8;i++){
          const a=i/8*Math.PI*2+(effect.spellId==="paladin-holy-shock"?-p*1.6:p*.45);
          core
            .moveTo(dx+Math.cos(a)*radius*.42,dy+Math.sin(a)*radius*.42)
            .lineTo(dx+Math.cos(a)*radius*(strong?1.24:1),dy+Math.sin(a)*radius*(strong?1.24:1))
            .stroke({
              color:i%2?profile.main:profile.core,
              width:strong?2.5:1.8,
              alpha:alpha*fade*.64,
            });
        }

        const rot=Math.PI/4+p*.2;
        const square=[
          point(dx,dy,-radius*.42,-radius*.42,rot),
          point(dx,dy,radius*.42,-radius*.42,rot),
          point(dx,dy,radius*.42,radius*.42,rot),
          point(dx,dy,-radius*.42,radius*.42,rot),
        ];
        polygon(core,square,{
          color:profile.core,width:1.6,alpha:alpha*fade*.52
        });

        if(effect.spellId==="paladin-word-of-glory"){
          const rise=21+easeOut(p)*13;
          core
            .moveTo(dx-21,dy-rise)
            .lineTo(dx-11,dy-rise-13)
            .lineTo(dx,dy-rise-4)
            .lineTo(dx+11,dy-rise-13)
            .lineTo(dx+21,dy-rise)
            .stroke({
              color:profile.main,width:2.3,alpha:alpha*fade*.74
            });
        }
        core.circle(dx,dy,strong?6.5:5).fill({
          color:profile.core,alpha:alpha*fade*.70
        });
        continue;
      }

      // ---------------------------------------------------------------------
      // DEFENSIVES: actual shield/bark/rune/ward shapes instead of generic rings.
      // ---------------------------------------------------------------------
      if (COMBAT_VFX2_DEFENSIVES.has(effect.spellId)) {
        const appear=easeOut(p/.25);
        const fade=1-smooth((p-.70)/.30);
        const a=alpha*appear*fade;

        if(effect.spellId==="priest-pain-suppression"){
          for(let i=0;i<4;i++){
            const start=i*Math.PI/2+.16+p*.38;
            arc(core,dx,dy,27+(i%2)*5,start,start+.92,{
              color:i===2?profile.core:profile.main,
              width:2.6,
              alpha:a*(.54+i*.04),
            },7);
          }
          const shield=[
            {x:dx,y:dy-25},{x:dx+15,y:dy-7},{x:dx+11,y:dy+18},
            {x:dx,y:dy+26},{x:dx-11,y:dy+18},{x:dx-15,y:dy-7},
          ];
          polygon(core,shield,{
            color:profile.accent,width:1.8,alpha:a*.78
          });
          glow.circle(dx,dy,31).stroke({
            color:profile.main,width:8,alpha:a*.10
          });
          continue;
        }

        if(effect.spellId==="druid-ironbark"){
          for(let i=0;i<6;i++){
            const ang=i/6*Math.PI*2+.18*Math.sin(i+p*3);
            const rr=25+(i%2)*4;
            const cx=dx+Math.cos(ang)*rr;
            const cy=dy+Math.sin(ang)*rr;
            const plate=[
              point(cx,cy,-6,-10,ang+Math.PI/2),
              point(cx,cy,6,-8,ang+Math.PI/2),
              point(cx,cy,8,8,ang+Math.PI/2),
              point(cx,cy,-6,10,ang+Math.PI/2),
            ];
            polygon(core,plate,{
              color:profile.accent,width:3.5,alpha:a*(.58+(i%2)*.12)
            });
          }
          glow.circle(dx,dy,30).stroke({
            color:profile.main,width:7,alpha:a*.08
          });
          continue;
        }

        if(effect.spellId==="paladin-blessing"){
          const rr=22+easeOut(p)*8;
          for(let i=0;i<4;i++){
            const ang=i*Math.PI/2+p*.28;
            const cx=dx+Math.cos(ang)*rr;
            const cy=dy+Math.sin(ang)*rr;
            const plate=[
              point(cx,cy,-7,-7,ang),
              point(cx,cy,7,-7,ang),
              point(cx,cy,10,3,ang),
              point(cx,cy,0,10,ang),
              point(cx,cy,-10,3,ang),
            ];
            polygon(core,plate,{
              color:profile.main,width:2.8,alpha:a*.80
            });
          }
          glow.circle(dx,dy,rr+5).stroke({
            color:profile.main,width:7,alpha:a*.11
          });
          continue;
        }

        if(effect.spellId==="shaman-astral-shift"){
          const colors=[profile.main,profile.core,profile.accent];
          for(let i=0;i<3;i++){
            const ang=p*(i%2?4.2:-3.7)+i*Math.PI*2/3;
            const rr=18+i*6;
            core.circle(dx+Math.cos(ang)*rr,dy+Math.sin(ang)*rr,3.2).fill({
              color:colors[i],alpha:a*.72
            });
            arc(core,dx,dy,rr,ang-.55,ang+.55,{
              color:colors[i],width:1.4,alpha:a*.44
            },6);
          }
          glow.circle(dx,dy,31).fill({
            color:profile.main,alpha:a*.07
          });
          continue;
        }

        if(effect.spellId==="warlock-resolve"){
          for(let i=0;i<5;i++){
            const ang=i/5*Math.PI*2-p*.65;
            const outer=31+(i%2)*4;
            const inner=18;
            core
              .moveTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer)
              .lineTo(
                dx+Math.cos(ang+.48)*inner,
                dy+Math.sin(ang+.48)*inner
              )
              .stroke({
                color:i%2?profile.main:profile.core,
                width:2.2,
                alpha:a*.66,
              });
          }
          glow.circle(dx,dy,28).fill({
            color:profile.accent,alpha:a*.12
          });
          continue;
        }

        // DK Rune Tap.
        const rot=-p*.7;
        for(let i=0;i<4;i++){
          const ang=i*Math.PI/2+rot;
          const p0=point(dx,dy,-7,-source.radius-9,ang);
          const p1=point(dx,dy,0,-source.radius-19,ang);
          const p2=point(dx,dy,7,-source.radius-9,ang);
          core.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).lineTo(p2.x,p2.y).stroke({
            color:profile.main,width:2.8,alpha:a*.72
          });
        }
        const rune=[
          point(dx,dy,-11,-11,rot),
          point(dx,dy,11,-11,rot),
          point(dx,dy,11,11,rot),
          point(dx,dy,-11,11,rot),
        ];
        polygon(core,rune,{
          color:profile.core,width:1.5,alpha:a*.66
        });
        glow.circle(dx,dy,26).stroke({
          color:profile.main,width:7,alpha:a*.10
        });
        continue;
      }

      // ---------------------------------------------------------------------
      // CC / INTERRUPTS
      // ---------------------------------------------------------------------
      if (COMBAT_VFX2_CC.has(effect.spellId)) {
        const fade=1-smooth((p-.60)/.40);

        if(effect.spellId==="priest-psychic-scream"){
          const wave=easeOut(p/.72);
          for(let layer=0;layer<3;layer++){
            const radius=source.radius+12+wave*(80+layer*16);
            for(let i=0;i<=28;i++){
              const ang=i/28*Math.PI*2;
              const wobble=Math.sin(ang*5+p*10+layer)*(3+layer);
              const rr=radius+wobble;
              const x=Math.cos(ang)*rr;
              const y=Math.sin(ang)*rr;
              if(i===0) core.moveTo(x,y); else core.lineTo(x,y);
            }
            core.stroke({
              color:layer===1?profile.core:profile.main,
              width:2.7-layer*.45,
              alpha:alpha*fade*(.52-layer*.10),
            });
          }
          continue;
        }

        if(effect.spellId==="druid-cyclone"){
          const build=easeOut((p-.08)/.68);
          for(let layer=0;layer<6;layer++){
            const yOff=20-layer*8.5;
            const rx=12+layer*5+build*11;
            const ry=5+layer*1.55;
            core.ellipse(dx,dy+yOff,rx,ry).stroke({
              color:layer%2?profile.core:profile.main,
              width:1.8+layer*.16,
              alpha:alpha*fade*(.25+layer*.075),
            });
          }
          for(let i=0;i<9;i++){
            const ang=i/9*Math.PI*2+p*(i%2?8:-7)+seed*.01;
            const rr=13+(i%4)*7;
            core.circle(
              dx+Math.cos(ang)*rr,
              dy+Math.sin(ang)*rr*.42-p*8,
              1.1+(i%3)*.45
            ).fill({
              color:profile.core,alpha:alpha*fade*.40
            });
          }
          glow.ellipse(dx,dy+2,29+build*15,20+build*11).stroke({
            color:profile.main,width:8,alpha:alpha*fade*.08
          });
          continue;
        }

        if(effect.spellId==="mage-frost-nova"){
          const burst=easeOut(p/.46);
          const radius=10+burst*42;
          for(let i=0;i<12;i++){
            const ang=i/12*Math.PI*2+seed*.007;
            const inner=8+burst*8;
            const outer=18+burst*(29+(i%3)*5);
            core
              .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
              .lineTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:i%3===0?2.7:1.7,
                alpha:alpha*fade*.66,
              });
          }
          core.circle(dx,dy,radius).stroke({
            color:profile.main,width:1.8,alpha:alpha*fade*.44
          });
          glow.circle(dx,dy,radius*.72).fill({
            color:profile.main,alpha:alpha*fade*.08
          });
          continue;
        }

        if(effect.spellId==="mage-polymorph"){
          const spin=p*4.5;
          for(let ring=0;ring<3;ring++){
            const rr=13+ring*8+easeOut(p)*4;
            for(let seg=0;seg<4;seg++){
              const a0=seg*Math.PI/2+.22+spin*(ring%2?-.35:.28);
              arc(core,dx,dy,rr,a0,a0+.66,{
                color:ring===1?profile.core:profile.main,
                width:1.7,
                alpha:alpha*fade*(.56-ring*.08),
              },6);
            }
          }
          for(let i=0;i<7;i++){
            const ang=i/7*Math.PI*2+p*3+seed*.01;
            const rr=18+(i%3)*5;
            core.circle(dx+Math.cos(ang)*rr,dy+Math.sin(ang)*rr,1.4+(i%2)*.4).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:alpha*fade*.50
            });
          }
          continue;
        }

        if(effect.spellId==="shaman-hex"){
          const radius=13+easeOut(p)*24;
          for(let i=0;i<6;i++){
            const ang=i/6*Math.PI*2+p*(i%2?2.7:-2.2);
            arc(core,dx,dy,radius+(i%2)*4,ang,ang+.72,{
              color:i%3===0?profile.core:profile.main,
              width:1.8,alpha:alpha*fade*.55
            },5);
          }
          // Narrow eye/diamond at center.
          const diamond=[
            {x:dx,y:dy-10},{x:dx+15,y:dy},{x:dx,y:dy+10},{x:dx-15,y:dy},
          ];
          polygon(core,diamond,{
            color:profile.accent,width:1.7,alpha:alpha*fade*.62
          });
          core.circle(dx,dy,3.2).fill({
            color:profile.core,alpha:alpha*fade*.75
          });
          continue;
        }

        if(effect.spellId==="warlock-fear"){
          const radius=12+easeOut(p)*39;
          for(let i=0;i<3;i++){
            const start=Math.PI*(1.02+i*.47)+p*(i%2?1.4:-1.1);
            arc(core,dx,dy,radius+i*5,start,start+1.05,{
              color:i===1?profile.core:profile.main,
              width:2.4,
              alpha:alpha*fade*(.68-i*.09),
            },7);
          }
          // Collapsing eye.
          const eyeW=17*(1-p*.38), eyeH=7*(1-p*.55);
          const eye=[
            {x:dx-eyeW,y:dy},
            {x:dx,y:dy-eyeH},
            {x:dx+eyeW,y:dy},
            {x:dx,y:dy+eyeH},
          ];
          polygon(core,eye,{
            color:profile.core,width:1.8,alpha:alpha*fade*.60
          });
          core.circle(dx,dy,2.8).fill({
            color:profile.core,alpha:alpha*fade*.72
          });
          continue;
        }

        if(effect.spellId==="dk-chains"){
          const links=8;
          for(let i=0;i<links;i++){
            const ang=i/links*Math.PI*2+p*.8;
            const rr=19+(i%2)*4;
            const yOff=18-easeOut(p)*(8+(i%3)*6);
            const cx=dx+Math.cos(ang)*rr;
            const cy=dy+yOff+Math.sin(ang)*rr*.35;
            // Pixi ellipse has no rotation, so cross-paired links imply wrapping.
            core.ellipse(cx,cy,6,3).stroke({
              color:i%2?profile.main:profile.core,
              width:2.2,alpha:alpha*fade*.76
            });
            if(i>0){
              const prevAng=(i-1)/links*Math.PI*2+p*.8;
              const px0=dx+Math.cos(prevAng)*(19+((i-1)%2)*4);
              const py0=dy+18-easeOut(p)*(8+((i-1)%3)*6)
                +Math.sin(prevAng)*(19+((i-1)%2)*4)*.35;
              core.moveTo(px0,py0).lineTo(cx,cy).stroke({
                color:profile.main,width:1.1,alpha:alpha*fade*.34
              });
            }
          }
          core.circle(dx,dy,16+easeOut(p)*13).stroke({
            color:profile.core,width:1.5,alpha:alpha*fade*.42
          });
          continue;
        }

        if(
          effect.spellId==="dk-mind-freeze"
          || effect.spellId==="warrior-pummel"
        ){
          const close=1-easeOut(p);
          for(const sign of [-1,1]){
            core
              .moveTo(dx+sign*(29+close*11),dy-16)
              .lineTo(dx+sign*(11+close*5),dy)
              .lineTo(dx+sign*(29+close*11),dy+16)
              .stroke({
                color:effect.spellId==="dk-mind-freeze"?profile.core:profile.core,
                width:effect.spellId==="dk-mind-freeze"?2.8:3.5,
                alpha:alpha*fade*.82,
              });
          }
          glow.circle(dx,dy,18+easeOut(p)*9).stroke({
            color:profile.main,width:6,alpha:alpha*fade*.09
          });
          continue;
        }

        if(effect.spellId==="rogue-kidney"){
          for(let i=0;i<3;i++){
            const ang=-.45+i*.45;
            core
              .moveTo(dx+Math.cos(ang)*27,dy+Math.sin(ang)*27)
              .lineTo(dx+Math.cos(ang)*6,dy+Math.sin(ang)*6)
              .stroke({
                color:profile.core,width:2.4,alpha:alpha*fade*.72
              });
          }
          core.circle(dx,dy,10+easeOut(p)*16).stroke({
            color:profile.accent,width:1.4,alpha:alpha*fade*.38
          });
          continue;
        }

        // Rogue Kick.
        const kickAngle=-.52;
        const ka=point(dx,dy,-25,9,kickAngle);
        const km=point(dx,dy,8,-5,kickAngle);
        const kb=point(dx,dy,24,-13,kickAngle);
        core.moveTo(ka.x,ka.y).lineTo(km.x,km.y).lineTo(kb.x,kb.y).stroke({
          color:profile.core,width:3,alpha:alpha*fade*.78
        });
        for(let i=0;i<3;i++){
          const s=point(dx,dy,7+i*5,-3-i*3,kickAngle);
          const e=point(dx,dy,15+i*6,3-i*2,kickAngle);
          core.moveTo(s.x,s.y).lineTo(e.x,e.y).stroke({
            color:profile.accent,width:1.4,alpha:alpha*fade*.50
          });
        }
        continue;
      }

      // ---------------------------------------------------------------------
      // MELEE: stronger weapon silhouette, afterimage and ground reaction.
      // ---------------------------------------------------------------------
      if (COMBAT_VFX2_MELEE.has(effect.spellId)) {
        const fade=1-smooth((p-.66)/.34);
        const warrior=effect.spellId.startsWith("warrior-");
        const rogue=effect.spellId.startsWith("rogue-");
        const dk=effect.spellId.startsWith("dk-");

        if(effect.spellId==="warrior-charge"){
          const originX=Number.isFinite(effect.sourceX)?effect.sourceX-source.x:0;
          const originY=Number.isFinite(effect.sourceY)?effect.sourceY-source.y:0;
          const moved=Math.hypot(originX,originY)>5;
          if(moved){
            const ll=Math.max(1,Math.hypot(originX,originY));
            const mx=-originX/ll, my=-originY/ll, sx=-my, sy=mx;
            for(let i=0;i<5;i++){
              const off=(i-2)*4;
              core
                .moveTo(-mx*Math.min(52,ll)+sx*off,-my*Math.min(52,ll)+sy*off)
                .lineTo(-mx*6+sx*off*.4,-my*6+sy*off*.4)
                .stroke({
                  color:i%2?profile.core:profile.main,
                  width:1.4+i*.25,
                  alpha:alpha*fade*(.18+i*.05),
                });
            }
          }
          glow.ellipse(0,source.radius*.65,14+p*30,5+p*8).stroke({
            color:profile.main,width:7,alpha:alpha*fade*.10
          });
          continue;
        }

        if(effect.spellId==="rogue-shadowstep"){
          const ox=Number.isFinite(effect.sourceX)?effect.sourceX-source.x:0;
          const oy=Number.isFinite(effect.sourceY)?effect.sourceY-source.y:0;
          const out=1-clamp01(p/.52);
          core.circle(ox,oy,9+p*23).stroke({
            color:profile.accent,width:1.7,alpha:alpha*out*.48
          });
          for(let i=0;i<8;i++){
            const ang=i/8*Math.PI*2+p*2.5+seed*.01;
            const rr=6+p*(15+(i%4)*5);
            core.circle(ox+Math.cos(ang)*rr,oy+Math.sin(ang)*rr,1.2+(i%3)*.4).fill({
              color:i%3===0?profile.core:profile.accent,
              alpha:alpha*out*.46
            });
          }
          const arrive=clamp01((p-.08)/.55);
          for(let i=0;i<8;i++){
            const ang=i/8*Math.PI*2-arrive*1.8;
            const rr=31*(1-arrive*.65)+(i%2)*4;
            core.circle(Math.cos(ang)*rr,Math.sin(ang)*rr,1.3+(i%3)*.4).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:alpha*fade*.54
            });
          }
          continue;
        }

        if(effect.spellId==="warrior-slam"){
          const impact=smooth(p/.34);
          core
            .moveTo(dx-11,dy-45+impact*18)
            .lineTo(dx+5,dy+13)
            .stroke({
              color:profile.core,width:6,alpha:alpha*fade*impact*.88
            });
          const shock=clamp01((p-.20)/.58);
          if(shock>0 && !missed){
            core.ellipse(dx,dy+13,10+easeOut(shock)*42,4+easeOut(shock)*11).stroke({
              color:profile.main,width:2.6,alpha:alpha*(1-shock)*.66
            });
            for(let i=0;i<8;i++){
              const ang=-.25+i*Math.PI/7;
              const len=11+shock*(17+(i%3)*6);
              core
                .moveTo(dx+Math.cos(ang)*7,dy+13+Math.sin(ang)*3)
                .lineTo(dx+Math.cos(ang)*len,dy+13+Math.sin(ang)*len*.40)
                .stroke({
                  color:i%3===0?profile.core:profile.main,
                  width:1.5,alpha:alpha*(1-shock)*.50
                });
            }
          }
          continue;
        }

        let slashCount=1;
        let slashLength=48;
        let slashWidth=3.8;
        if(effect.spellId==="warrior-rend"){slashCount=3;slashLength=42;slashWidth=2.4;}
        if(effect.spellId==="warrior-mortal-strike"){slashLength=62;slashWidth=5.8;}
        if(effect.spellId==="warrior-bloodthirst"){slashCount=3;slashLength=40;slashWidth=3;}
        if(effect.spellId==="rogue-eviscerate"){slashCount=3;slashLength=46;slashWidth=2.3;}
        if(effect.spellId==="rogue-mutilate"){slashCount=2;slashLength=48;slashWidth=2.6;}
        if(effect.spellId==="dk-obliterate"){slashCount=2;slashLength=60;slashWidth=4.8;}
        if(effect.spellId==="dk-death-strike"){slashLength=57;slashWidth=4.4;}
        if(effect.spellId==="dk-frost-strike"){slashLength=51;slashWidth=4;}
        if(effect.spellId==="shaman-stormstrike"){slashCount=2;slashLength=54;slashWidth=4.2;}

        for(let i=0;i<slashCount;i++){
          const delay=i*(slashCount>1?.055:0);
          const local=smooth((p-delay)/.28);
          if(local<=0) continue;
          const baseAngle=
            rogue
              ? (-.92+i*(slashCount===2?1.55:.86))
              : dk
                ? (-.70+i*.92)
                : effect.spellId==="shaman-stormstrike"
                  ? (-.72+i*1.44)
                  : (-.72+i*.48);
          weaponSlash(
            core,
            dx+(i-(slashCount-1)/2)*4,
            dy+(i-(slashCount-1)/2)*2,
            baseAngle,
            slashLength,
            profile,
            alpha*fade*local*(warrior?.88:.80),
            slashWidth,
            (i%2?7:-7)
          );
        }

        if(!missed){
          const hit=clamp01((p-.20)/.50);
          const shards=
            effect.spellId==="dk-obliterate"
              || effect.spellId==="shaman-stormstrike"
              ? 10 : 7;
          for(let i=0;i<shards;i++){
            const ang=i/shards*Math.PI*2+seed*.009;
            const inner=7+(i%2)*2;
            const outer=14+easeOut(hit)*(18+(i%4)*5);
            core
              .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
              .lineTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer)
              .stroke({
                color:
                  effect.spellId==="shaman-stormstrike" && i%2
                    ? 0x65cce0
                    : (i%3===0?profile.core:profile.main),
                width:1.4+(i%3===0?.8:0),
                alpha:alpha*(1-hit)*.50,
              });
          }

          if(effect.spellId==="warrior-mortal-strike"){
            for(let i=0;i<3;i++){
              const a0=i*Math.PI*2/3+.2;
              arc(core,dx,dy,18+hit*15,a0,a0+.72,{
                color:profile.main,width:2,alpha:alpha*(1-hit)*.52
              },6);
            }
          }

          if(effect.spellId==="dk-obliterate" || effect.spellId==="dk-frost-strike"){
            glow.circle(dx,dy,11+hit*29).stroke({
              color:profile.main,width:7,alpha:alpha*(1-hit)*.12
            });
          }

          if(effect.spellId==="shaman-stormstrike"){
            for(let i=0;i<4;i++){
              const sign=i%2?1:-1;
              const bx=dx+sign*(7+i*3);
              core
                .moveTo(bx,dy-24)
                .lineTo(dx-sign*5,dy-5)
                .lineTo(dx+sign*11,dy+11)
                .stroke({
                  color:i%2?profile.core:profile.main,
                  width:1.8,
                  alpha:alpha*(1-hit)*.62,
                });
            }
          }
        }
        continue;
      }

      // ---------------------------------------------------------------------
      // DOT / MARK APPLICATIONS
      // ---------------------------------------------------------------------
      if (COMBAT_VFX2_DOTS.has(effect.spellId)) {
        const fade=1-smooth((p-.58)/.42);

        if(effect.spellId==="mage-living-bomb"){
          const radius=12+easeOut(p)*20;
          core.circle(dx,dy,radius).stroke({
            color:profile.main,width:2.2,alpha:alpha*fade*.58
          });
          for(let i=0;i<6;i++){
            const ang=i/6*Math.PI*2+p*2.2;
            core
              .moveTo(dx+Math.cos(ang)*radius*.55,dy+Math.sin(ang)*radius*.55)
              .lineTo(dx+Math.cos(ang)*radius*1.15,dy+Math.sin(ang)*radius*1.15)
              .stroke({
                color:i%2?profile.core:profile.accent,
                width:1.5,alpha:alpha*fade*.54
              });
          }
          const fuseA=-Math.PI*.72+p*.8;
          core
            .moveTo(dx+Math.cos(fuseA)*radius*.72,dy+Math.sin(fuseA)*radius*.72)
            .lineTo(dx+Math.cos(fuseA)*radius*1.32,dy+Math.sin(fuseA)*radius*1.32)
            .stroke({
              color:profile.core,width:1.8,alpha:alpha*fade*.72
            });
          core.circle(
            dx+Math.cos(fuseA)*radius*1.38,
            dy+Math.sin(fuseA)*radius*1.38,
            2.2
          ).fill({color:profile.core,alpha:alpha*fade*.82});
          continue;
        }

        if(effect.spellId==="shaman-flame-shock"){
          for(let i=0;i<9;i++){
            const side=Math.sin(seed*.41+i*1.91)*19;
            const baseX=dx+side;
            const baseY=dy+16-(i%3)*2;
            const rise=(18+(i%4)*8)*easeOut(p);
            const sway=Math.sin(i*2.2+p*10)*8;
            core
              .moveTo(baseX,baseY)
              .lineTo(baseX+sway*.45,baseY-rise*.55)
              .lineTo(baseX+sway,baseY-rise)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:1.7+(i%3)*.5,
                alpha:alpha*fade*(.46+(i%2)*.16),
              });
          }
          glow.circle(dx,dy,9+p*24).stroke({
            color:profile.accent,width:7,alpha:alpha*fade*.09
          });
          continue;
        }

        if(effect.spellId==="warlock-corruption"){
          const appear=easeOut(p/.22);
          for(let i=0;i<8;i++){
            const ang=i/8*Math.PI*2+p*(i%2?1.5:-1.2)+seed*.011;
            const outer=31+(i%3)*6;
            const inner=9+(1-appear)*18;
            const sx=dx+Math.cos(ang)*outer;
            const sy=dy+Math.sin(ang)*outer;
            const ex=dx+Math.cos(ang+.8)*inner;
            const ey=dy+Math.sin(ang+.8)*inner;
            const mx=dx+Math.cos(ang+.42)*outer*.48;
            const my=dy+Math.sin(ang+.42)*outer*.48;
            core.moveTo(sx,sy).lineTo(mx,my).lineTo(ex,ey).stroke({
              color:i%3===0?profile.core:profile.main,
              width:1.5+(i%3)*.4,
              alpha:alpha*fade*(.40+(i%3)*.10),
            });
          }
          glow.circle(dx,dy,15+appear*5).fill({
            color:profile.accent,alpha:alpha*fade*.12
          });
          continue;
        }

        // DK Fever.
        const rr=9+easeOut(p)*24;
        for(let i=0;i<7;i++){
          const ang=i/7*Math.PI*2+p*.35;
          core
            .moveTo(dx+Math.cos(ang)*rr*.35,dy+Math.sin(ang)*rr*.35)
            .lineTo(dx+Math.cos(ang+.14)*rr,dy+Math.sin(ang+.14)*rr)
            .stroke({
              color:i%3===0?profile.core:profile.main,
              width:1.8,alpha:alpha*fade*.72
            });
        }
        for(let i=0;i<7;i++){
          const ang=i/7*Math.PI*2+seed*.017;
          const q=8+p*(15+(i%4)*4);
          core.circle(dx+Math.cos(ang)*q,dy+Math.sin(ang)*q-p*9,1.4+(i%2)*.3).fill({
            color:profile.core,alpha:alpha*fade*.44
          });
        }
        continue;
      }

      // ---------------------------------------------------------------------
      // SKY STRIKES: Holy Fire, Moonfire, Judgment.
      // ---------------------------------------------------------------------
      if (COMBAT_VFX2_SKY.has(effect.spellId)) {
        if (effect.spellId === "priest-holy-fire") {
          const strike = clamp01((p - .035) / .50);
          const visibility = 1 - smooth((p - .86) / .14);
          const top = dy - 166;
          const headY = top + easeOut(strike) * 160;
          const hit = clamp01((strike - .53) / .47);
          const hitFade = 1 - smooth((hit - .62) / .38);
          const pulse = .5 + .5 * Math.sin(seed * .019 + p * 18);

          // Wide warm column gives Holy Fire the screen presence Canvas had.
          glow.moveTo(dx,top).lineTo(dx,headY).stroke({
            color:profile.main,
            width:24,
            alpha:visibility*.17,
          });
          glow.moveTo(dx-7,top+12).lineTo(dx-2,headY).stroke({
            color:profile.accent,
            width:12,
            alpha:visibility*.12,
          });
          glow.moveTo(dx+7,top+5).lineTo(dx+2,headY).stroke({
            color:profile.main,
            width:10,
            alpha:visibility*.10,
          });

          core.moveTo(dx,top).lineTo(dx,headY).stroke({
            color:profile.core,
            width:5.2,
            alpha:visibility*.92,
          });
          core.moveTo(dx-8,top+28).lineTo(dx-3,headY-4).stroke({
            color:profile.main,
            width:2.3,
            alpha:visibility*.65,
          });
          core.moveTo(dx+9,top+18).lineTo(dx+3,headY-7).stroke({
            color:profile.accent,
            width:2.0,
            alpha:visibility*.58,
          });

          // Small descending holy motes make the pillar feel volumetric.
          for(let i=0;i<8;i++){
            const lane=(i-3.5)*3.8;
            const travel=((p*1.65+i/8)%1);
            const y=top+travel*150;
            const sway=Math.sin(seed*.021+i*1.7+p*8)*3;
            core.circle(
              dx+lane+sway,
              y,
              1.3+(i%3)*.45
            ).fill({
              color:i%3===0?profile.core:(i%2?profile.main:profile.accent),
              alpha:visibility*(.36+(i%2)*.16),
            });
          }

          if (!missed && hit > 0) {
            // Two broad concentric impact rings plus a four-point holy seal.
            glow.circle(dx,dy,14+easeOut(hit)*48).fill({
              color:profile.main,
              alpha:hitFade*.12,
            });
            glow.circle(dx,dy,18+easeOut(hit)*51).stroke({
              color:profile.main,
              width:10,
              alpha:hitFade*.12,
            });

            core.circle(dx,dy,12+easeOut(hit)*48).stroke({
              color:profile.main,
              width:3.0,
              alpha:hitFade*.78,
            });
            core.circle(dx,dy,7+easeOut(hit)*29).stroke({
              color:profile.core,
              width:1.6,
              alpha:hitFade*.64,
            });

            const sealR=11+easeOut(hit)*17;
            for(let i=0;i<8;i++){
              const a=i/8*Math.PI*2;
              const inner=sealR*.45;
              const outer=sealR*(i%2?1.18:1.46);
              core
                .moveTo(
                  dx+Math.cos(a)*inner,
                  dy+Math.sin(a)*inner
                )
                .lineTo(
                  dx+Math.cos(a)*outer,
                  dy+Math.sin(a)*outer
                )
                .stroke({
                  color:i%2?profile.main:profile.core,
                  width:i%2?1.7:2.3,
                  alpha:hitFade*(.56+.14*pulse),
                });
            }

            // Fire tongues and embers rise from the holy impact.
            for(let i=0;i<12;i++){
              const a=i/12*Math.PI*2+seed*.011;
              const rr=8+easeOut(hit)*(27+(i%4)*7);
              const ex=dx+Math.cos(a)*rr;
              const ey=dy+Math.sin(a)*rr-hit*(8+(i%3)*4);
              core.circle(ex,ey,1.5+(i%3)*.55).fill({
                color:i%3===0?profile.core:(i%2?profile.main:profile.accent),
                alpha:hitFade*.70,
              });
            }

            for(let i=0;i<5;i++){
              const x=dx+(i-2)*8;
              const rise=16+hit*(18+(i%3)*5);
              core
                .moveTo(x,dy+8)
                .lineTo(x+Math.sin(i+p*8)*5,dy+8-rise*.52)
                .lineTo(x+Math.sin(i*1.7+p*9)*3,dy+8-rise)
                .stroke({
                  color:i%2?profile.main:profile.accent,
                  width:1.8,
                  alpha:hitFade*.58,
                });
            }
          } else if (missed && strike > .58) {
            const missP=clamp01((strike-.58)/.42);
            for(let i=0;i<8;i++){
              const a=i/8*Math.PI*2;
              const rr=10+missP*(20+(i%3)*5);
              core.circle(
                dx+Math.cos(a)*rr,
                dy+Math.sin(a)*rr-missP*7,
                1.3+(i%2)*.4
              ).fill({
                color:i%2?profile.main:profile.core,
                alpha:(1-missP)*.48,
              });
            }
          }
          continue;
        }

        const strike=clamp01((p-.08)/.58);
        const fade=1-smooth((p-.70)/.30);
        const top=dy-(effect.spellId==="druid-moonfire"?145:130);
        const headY=top+easeOut(strike)*(effect.spellId==="druid-moonfire"?140:126);

        if(effect.spellId==="paladin-judgment"){
          glow.moveTo(dx,top).lineTo(dx,headY).stroke({
            color:profile.main,width:12,alpha:alpha*fade*.13
          });
          core.moveTo(dx,top).lineTo(dx,headY).stroke({
            color:profile.core,width:3.8,alpha:alpha*fade*.72
          });
          const hAngle=.18;
          const handle=[
            point(dx,headY,-4,-20,hAngle),point(dx,headY,4,-20,hAngle),
            point(dx,headY,4,7,hAngle),point(dx,headY,-4,7,hAngle),
          ];
          const head=[
            point(dx,headY,-15,-24,hAngle),point(dx,headY,15,-24,hAngle),
            point(dx,headY,15,-15,hAngle),point(dx,headY,-15,-15,hAngle),
          ];
          polygon(core,handle,{color:profile.main,alpha:alpha*fade*.82},true);
          polygon(core,head,{color:profile.main,alpha:alpha*fade*.82},true);
        } else {
          const beamWidth=effect.spellId==="druid-moonfire"?15:11;
          glow.moveTo(dx,top).lineTo(dx,headY).stroke({
            color:profile.main,width:beamWidth,alpha:alpha*fade*.12
          });
          core.moveTo(dx,top).lineTo(dx,headY).stroke({
            color:profile.core,width:effect.spellId==="druid-moonfire"?3.2:4.2,
            alpha:alpha*fade*.76
          });

          if(effect.spellId==="druid-moonfire" && p<.35){
            arc(core,0,-source.radius-14,10,-.95,1.20,{
              color:profile.core,width:2.2,alpha:alpha*(1-p/.35)*.62
            },7);
          }
        }

        if(!missed && strike>.56){
          const hit=clamp01((strike-.56)/.44);
          core.circle(dx,dy,9+easeOut(hit)*42).stroke({
            color:profile.main,width:2.3,alpha:alpha*(1-hit)*.68
          });
          for(let i=0;i<10;i++){
            const ang=i/10*Math.PI*2+seed*.009;
            const rr=8+easeOut(hit)*(24+(i%4)*5);
            core.circle(dx+Math.cos(ang)*rr,dy+Math.sin(ang)*rr,1.4+(i%3)*.4).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:alpha*(1-hit)*.62,
            });
          }
        }
        continue;
      }

      // ---------------------------------------------------------------------
      // SPECIALS: Smite mind implosion, Drain Life, Conflagrate.
      // ---------------------------------------------------------------------
      if (effect.spellId==="priest-smite") {
        const gather=smooth(p/.38);
        const snap=clamp01((p-.08)/.30);
        const rupture=clamp01((p-.34)/.52);
        const visibility=1-smooth((p-.88)/.12);
        const ruptureFade=1-smooth((rupture-.68)/.32);
        const pulse=.5+.5*Math.sin(seed*.031+p*20);

        // Brief psychic connection: not a projectile, more like the caster and
        // target are snapped together for a fraction of a second.
        if(p<.42){
          const tetherFade=1-smooth(p/.42);
          const length=Math.max(1,Math.hypot(dx,dy));
          const dirX=dx/length, dirY=dy/length;
          const normalX=-dirY, normalY=dirX;

          for(let lane=-1;lane<=1;lane++){
            const laneOffset=lane*4.5;
            const segments=7;
            for(let i=0;i<=segments;i++){
              const q=i/segments;
              const wave=Math.sin(q*Math.PI*3+seed*.017+lane*1.7+p*14)
                * (4.5+Math.abs(lane)*1.5)
                * Math.sin(q*Math.PI);
              const x=dx*q+normalX*(laneOffset+wave);
              const y=dy*q+normalY*(laneOffset+wave);
              if(i===0) core.moveTo(x,y); else core.lineTo(x,y);
            }
            core.stroke({
              color:lane===0?profile.core:profile.main,
              width:lane===0?2.0:1.15,
              alpha:tetherFade*(lane===0?.52:.30),
            });
          }
        }

        // Large broken psychic aperture collapses around the target.
        for(let ring=0;ring<3;ring++){
          const base=54+ring*10;
          const rr=base*(1-gather*.68);
          const phase=(ring%2?-.58:.48)*p+seed*.003;
          for(let seg=0;seg<3;seg++){
            const a0=seg*Math.PI*2/3+.18+phase;
            arc(
              core,
              dx,
              dy,
              rr,
              a0,
              a0+.78,
              {
                color:ring===1?profile.core:profile.main,
                width:1.7+ring*.35,
                alpha:visibility*(.34+gather*.24-ring*.03),
              },
              7,
            );
          }
        }

        // Dense motes spiral inward so the target is impossible to miss.
        for(let i=0;i<14;i++){
          const ang=
            i/14*Math.PI*2
            +p*(i%2?2.2:-1.8)
            +seed*.009;
          const start=50+(i%5)*7;
          const rr=start*(1-gather*.78);
          core.circle(
            dx+Math.cos(ang)*rr,
            dy+Math.sin(ang)*rr,
            1.5+(i%4)*.48
          ).fill({
            color:i%4===0?profile.core:(i%3===0?profile.accent:profile.main),
            alpha:visibility*(.32+gather*.48),
          });
        }

        // The eye closes into a compact psychic implosion.
        const eyeW=24*(1-gather*.46)+pulse*2;
        const eyeH=10*(1-gather*.58)+pulse;
        glow.ellipse(dx,dy,eyeW+9,eyeH+7).stroke({
          color:profile.main,
          width:9,
          alpha:visibility*(.10+.06*gather),
        });
        core.ellipse(dx,dy,eyeW,eyeH).stroke({
          color:profile.core,
          width:2.1,
          alpha:visibility*(.48+.30*gather),
        });
        core.circle(dx,dy,4.2+gather*3.8).fill({
          color:profile.accent,
          alpha:visibility*(.45+.28*gather),
        });
        core.circle(dx,dy,2.4+gather*2.6).fill({
          color:profile.core,
          alpha:visibility*(.58+.32*gather),
        });

        if(!missed && snap>.34){
          const blast=clamp01((snap-.34)/.66);
          glow.circle(dx,dy,12+easeOut(blast)*46).fill({
            color:profile.main,
            alpha:(1-blast)*.14+ruptureFade*.06,
          });
          glow.circle(dx,dy,14+easeOut(rupture)*52).stroke({
            color:profile.main,
            width:10,
            alpha:ruptureFade*.12,
          });

        } else if(missed && p>.34){
          const dissipate=clamp01((p-.34)/.50);
          for(let i=0;i<9;i++){
            const a=i/9*Math.PI*2+seed*.011;
            const rr=14+dissipate*(24+(i%3)*6);
            core.circle(
              dx+Math.cos(a)*rr,
              dy+Math.sin(a)*rr-dissipate*7,
              1.3+(i%2)*.5
            ).fill({
              color:i%2?profile.main:profile.core,
              alpha:(1-dissipate)*.45,
            });
          }
        }
        continue;
      }

      if (effect.spellId==="warlock-drain-life") {
        // Reverse-flow wisps from target back to caster.
        const fade=1-smooth((p-.78)/.22);
        const pulses=8;
        for(let i=0;i<pulses;i++){
          const q=((p*1.75+i/pulses)%1);
          const eased=smooth(q);
          const cx=dx*(1-eased);
          const cy=dy*(1-eased);
          const wobble=Math.sin(seed*.05+i*1.7+p*10)*9;
          core.circle(cx+nx*wobble,cy+ny*wobble,1.4+(i%3)*.55).fill({
            color:i%3===0?profile.core:profile.main,
            alpha:alpha*fade*(.36+(1-q)*.32),
          });
        }
        core.moveTo(dx,dy).lineTo(0,0).stroke({
          color:profile.main,width:1.6,alpha:alpha*fade*.22
        });
        glow.moveTo(dx,dy).lineTo(0,0).stroke({
          color:profile.main,width:8,alpha:alpha*fade*.07
        });
        continue;
      }

      // Conflagrate: compact violent burst, no traveling orb.
      const hit=easeOut(p/.52);
      const fade=1-smooth((p-.58)/.42);
      glow.circle(dx,dy,8+hit*35).fill({
        color:profile.main,alpha:alpha*fade*.12
      });
      for(let i=0;i<12;i++){
        const ang=i/12*Math.PI*2+seed*.013;
        const inner=5+(i%2)*2;
        const outer=14+hit*(24+(i%4)*5);
        core
          .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
          .lineTo(dx+Math.cos(ang+.10*Math.sin(i))*outer,dy+Math.sin(ang+.10*Math.sin(i))*outer)
          .stroke({
            color:i%3===0?profile.core:(i%2?profile.main:profile.accent),
            width:1.5+(i%3===0?.7:0),
            alpha:alpha*fade*.62,
          });
      }
      core.circle(dx,dy,6+hit*8).fill({
        color:profile.core,alpha:alpha*fade*.72
      });
    }
  }

  updateNativeProjectileVfx2(game) {
    const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };

    const strokeArc = (
      graphics,
      radius,
      start,
      end,
      style,
      segments = 7,
      cx = 0,
      cy = 0,
    ) => {
      if (style.alpha <= 0) return;
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const a = start + (end - start) * t;
        const x = cx + Math.cos(a) * radius;
        const y = cy + Math.sin(a) * radius;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
      }
      graphics.stroke(style);
    };

    const poly = (g, points, style, fill = false) => {
      if (!points.length || style.alpha <= 0) return;
      g.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i += 1) {
        g.lineTo(points[i].x, points[i].y);
      }
      g.lineTo(points[0].x, points[0].y);
      if (fill) g.fill(style);
      else g.stroke(style);
    };

    const transformed = (cx, cy, x, y, angle) => {
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      return {
        x: cx + x * ca - y * sa,
        y: cy + x * sa + y * ca,
      };
    };

    const jaggedLine = (
      g,
      ax,
      ay,
      bx,
      by,
      seed,
      wobble,
      segments,
      style,
      phase = 0,
    ) => {
      const dx = bx - ax;
      const dy = by - ay;
      const length = Math.max(1, Math.hypot(dx, dy));
      const nx = -dy / length;
      const ny = dx / length;
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const edgeFade = Math.sin(t * Math.PI);
        const noise =
          Math.sin(seed * .073 + i * 2.731 + phase * 7.1)
          * wobble
          * edgeFade;
        const x = ax + dx * t + nx * noise;
        const y = ay + dy * t + ny * noise;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke(style);
    };

    for (const view of this.actorViews.values()) {
      view.projectileVfx2GlowFx.clear();
      view.projectileVfx2GlowFx.visible = false;
      view.projectileVfx2GlowFx.position.set(0,0);
      view.projectileVfx2CoreFx.clear();
      view.projectileVfx2CoreFx.visible = false;
      view.projectileVfx2CoreFx.position.set(0,0);
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell") continue;
      if (!PROJECTILE_VFX2_SPELLS.has(effect.spellId)) continue;

      const spec = projectileVfx2Spec(effect.spellId);
      if (!spec) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !view || !view.root.visible) continue;

      const targetCenter = target
        ? visualActorCenter(this.actorViews, target, effect.targetX, effect.targetY)
        : null;
      const targetX = targetCenter?.x ?? effect.targetX;
      const targetY = targetCenter?.y ?? effect.targetY;
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) continue;

      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = clamp01(1 - remaining / total);
      const alpha = clamp01(remaining / total);
      const seed = Number(effect.seed || effect.id || 1);
      const missed = Boolean(effect.missed);

      const sourceCenter = visualActorCenter(
        this.actorViews,
        source,
        source.x,
        source.y,
      );
      const sourceOffsetX = sourceCenter.x - source.x;
      const sourceOffsetY = sourceCenter.y - source.y;
      view.projectileVfx2GlowFx.position.set(sourceOffsetX,sourceOffsetY);
      view.projectileVfx2CoreFx.position.set(sourceOffsetX,sourceOffsetY);

      const dx0 = targetX - sourceCenter.x;
      const dy0 = targetY - sourceCenter.y;
      const length0 = Math.max(1, Math.hypot(dx0, dy0));
      const tx0 = dx0 / length0;
      const ty0 = dy0 / length0;
      const nx0 = -ty0;
      const ny0 = tx0;
      const missSign = Math.sin(seed * .89) >= 0 ? 1 : -1;

      const endX =
        dx0
        + (missed ? nx0 * missSign * (spec.heavy ? 52 : 42) + tx0 * 14 : 0);
      const endY =
        dy0
        + (missed ? ny0 * missSign * (spec.heavy ? 52 : 42) + ty0 * 14 - 5 : 0);

      const endLen = Math.max(1, Math.hypot(endX, endY));
      const tx = endX / endLen;
      const ty = endY / endLen;
      const nx = -ty;
      const ny = tx;
      const angle = Math.atan2(endY, endX);

      const travelT = easeOut((p - .035) / Math.max(.08, spec.travelEnd - .035));
      const travelFade =
        p > spec.travelEnd
          ? clamp01(1 - (p - spec.travelEnd) / .085)
          : 1;

      let px = endX * travelT;
      let py = endY * travelT;

      if (spec.arc) {
        py -= Math.sin(travelT * Math.PI) * spec.arc;
      }

      // Keep the projectile head itself on a clean trajectory. Shadow/chaos
      // character now lives in their animated trails instead of making the
      // whole bolt wobble side-to-side on the way to the target.

      const glow = view.projectileVfx2GlowFx;
      const core = view.projectileVfx2CoreFx;
      glow.visible = true;
      core.visible = true;

      // Release snap: short, bright and directional.
      const releaseP = clamp01(p / .14);
      const releaseFade = 1 - releaseP;
      if (releaseFade > 0) {
        glow.circle(0,0,source.radius + 11 + releaseP * 13).stroke({
          color: spec.main,
          width: spec.heavy ? 8 : 6,
          alpha: alpha * releaseFade * .20,
        });
        core.circle(0,0,source.radius + 9 + releaseP * 11).stroke({
          color: spec.core,
          width: spec.heavy ? 2.2 : 1.6,
          alpha: alpha * releaseFade * .50,
        });
        for (let i = 0; i < (spec.heavy ? 7 : 5); i += 1) {
          const a = i / (spec.heavy ? 7 : 5) * Math.PI * 2 + seed * .011;
          core
            .moveTo(Math.cos(a) * (source.radius + 4), Math.sin(a) * (source.radius + 4))
            .lineTo(
              Math.cos(a) * (source.radius + 16 + releaseP * 10),
              Math.sin(a) * (source.radius + 16 + releaseP * 10),
            )
            .stroke({
              color: i % 3 === 0 ? spec.core : spec.main,
              width: 1.2,
              alpha: alpha * releaseFade * .42,
            });
        }
      }

      // Spell-specific release signatures. Travel and impact were already
      // bespoke; these cues stop the launch itself from feeling generic.
      if (releaseFade > 0) {
        if (spec.shape === "frost-spear") {
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2;
            core
              .moveTo(Math.cos(a)*(source.radius+3),Math.sin(a)*(source.radius+3))
              .lineTo(Math.cos(a)*(source.radius+13+releaseP*10),Math.sin(a)*(source.radius+13+releaseP*10))
              .stroke({
                color:i%2?spec.core:spec.main,width:1.3,alpha:releaseFade*.52,
              });
          }
        } else if (spec.shape === "pyro") {
          for(let i=0;i<7;i++){
            const a=i/7*Math.PI*2+seed*.01;
            const rr=source.radius+10+releaseP*(15+(i%3)*5);
            core.circle(Math.cos(a)*rr,Math.sin(a)*rr-releaseP*4,1.7+(i%2)*.5).fill({
              color:i%3===0?spec.core:spec.main,alpha:releaseFade*.55,
            });
          }
        } else if (spec.shape === "frostfire") {
          strokeArc(core,source.radius+14,-1.2,1.2,{
            color:spec.main,width:2.2,alpha:releaseFade*.58,
          },8);
          strokeArc(core,source.radius+14,Math.PI-1.2,Math.PI+1.2,{
            color:spec.accent,width:2.2,alpha:releaseFade*.58,
          },8);
        } else if (spec.shape === "arcane") {
          const r=source.radius+12+releaseP*8;
          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+p*4;
            const b=(i+1)*Math.PI*2/3+p*4;
            core.moveTo(Math.cos(a)*r,Math.sin(a)*r).lineTo(Math.cos(b)*r,Math.sin(b)*r).stroke({
              color:i===1?spec.core:spec.main,width:1.7,alpha:releaseFade*.56,
            });
          }
        } else if (spec.shape === "lava-rock") {
          for(let i=0;i<5;i++){
            const a=i/5*Math.PI*2+.2;
            core
              .moveTo(Math.cos(a)*(source.radius+4),Math.sin(a)*(source.radius+4))
              .lineTo(Math.cos(a+.15)*(source.radius+16+releaseP*9),Math.sin(a+.15)*(source.radius+16+releaseP*9))
              .stroke({
                color:i%2?spec.main:spec.core,width:1.7,alpha:releaseFade*.54,
              });
          }
        } else if (spec.shape === "elemental") {
          const colors=[spec.main,spec.accent,0x87b978];
          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+p*5;
            const r=source.radius+12+releaseP*8;
            core.circle(Math.cos(a)*r,Math.sin(a)*r,2.5).fill({
              color:colors[i],alpha:releaseFade*.62,
            });
          }
        } else if (spec.shape === "shadow") {
          for(let ring=0;ring<2;ring++){
            const r=source.radius+9+ring*7+releaseP*6;
            strokeArc(core,r,.25+ring,2.6+ring,{
              color:ring?spec.core:spec.main,width:1.8,alpha:releaseFade*.52,
            },7);
          }
        } else if (spec.shape === "chaos") {
          for(const sign of [-1,1]){
            const a=sign*.65;
            core
              .moveTo(Math.cos(a)*(source.radius+5),Math.sin(a)*(source.radius+5))
              .lineTo(Math.cos(a)*(source.radius+22+releaseP*9),Math.sin(a)*(source.radius+22+releaseP*9))
              .stroke({
                color:sign>0?spec.core:spec.main,width:2.1,alpha:releaseFade*.62,
              });
          }
        }
      }

      if (travelFade > 0 && travelT > 0) {
        // Projectile trails are detached from the caster. Keep only a recent
        // slice of the travelled path alive behind the projectile; otherwise
        // bolts read like harpoons/tethers instead of released projectiles.
        const travelledDistance = Math.max(1, Math.hypot(px,py));
        const desiredTailLen = Math.min(
          spec.tail,
          travelledDistance * (spec.heavy ? .78 : .72),
        );
        const minimumSourceGap = source.radius + 14;
        const rawTailStartDistance = travelledDistance - desiredTailLen;
        const tailStartDistance = Math.min(
          Math.max(minimumSourceGap, rawTailStartDistance),
          Math.max(0, travelledDistance - 7),
        );
        const tailStartT = Math.max(
          0,
          Math.min(travelT, tailStartDistance / endLen),
        );
        let tailX = endX * tailStartT;
        let tailY = endY * tailStartT;

        if (spec.arc) {
          tailY -= Math.sin(tailStartT * Math.PI) * spec.arc;
        }

        const trailPoint = (fraction, lateral = 0) => ({
          x: tailX + (px - tailX) * fraction + nx * lateral,
          y: tailY + (py - tailY) * fraction + ny * lateral,
        });

        if (spec.shape === "shadow" || spec.shape === "chaos") {
          jaggedLine(
            glow, tailX, tailY, px, py, seed,
            spec.shape === "chaos" ? 8 : 6,
            spec.shape === "chaos" ? 8 : 7,
            {
              color: spec.main,
              width: spec.shape === "chaos" ? 13 : 10,
              alpha: alpha * travelFade * .24,
            },
            p,
          );
          jaggedLine(
            core, tailX, tailY, px, py, seed + 19,
            spec.shape === "chaos" ? 6 : 5,
            7,
            {
              color: spec.core,
              width: spec.shape === "chaos" ? 3.5 : 2.8,
              alpha: alpha * travelFade * .82,
            },
            p * 1.2,
          );
        } else {
          glow.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color: spec.main,
            width: spec.heavy ? 14 : 10,
            alpha: alpha * travelFade * .22,
          });
          core.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color: spec.core,
            width: spec.heavy ? 4.2 : 3,
            alpha: alpha * travelFade * .76,
          });
        }

        // Showcase energy envelope: every ranged projectile gets the same
        // multi-layer readability standard as Chain Lightning — a broad aura,
        // saturated body and razor-hot center — while keeping its own shape.
        const travelPulse =
          .82 + (.5 + .5 * Math.sin(p * 34 + seed * .071)) * .18;

        if (spec.shape === "shadow" || spec.shape === "chaos") {
          jaggedLine(
            glow, tailX, tailY, px, py, seed + 101,
            spec.shape === "chaos" ? 9 : 7,
            spec.shape === "chaos" ? 8 : 7,
            {
              color: spec.main,
              width: spec.heavy ? 24 : 19,
              alpha: alpha * travelFade * .16 * travelPulse,
            },
            p * 1.7,
          );
        } else {
          glow.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color: spec.main,
            width: spec.heavy ? 24 : 19,
            alpha: alpha * travelFade * .15 * travelPulse,
          });
        }

        core.moveTo(tailX,tailY).lineTo(px,py).stroke({
          color: spec.main,
          width: spec.heavy ? 6.4 : 5.0,
          alpha: alpha * travelFade * .62,
        });
        core.moveTo(tailX,tailY).lineTo(px,py).stroke({
          color: spec.core,
          width: spec.heavy ? 1.65 : 1.25,
          alpha: alpha * travelFade * .96,
        });

        const satelliteCount = spec.heavy ? 4 : 3;
        for (let i = 0; i < satelliteCount; i += 1) {
          const orbit =
            p * (spec.heavy ? 17 : 14) * (i % 2 ? -1 : 1)
            + i * Math.PI * 2 / satelliteCount
            + seed * .013;
          const rr = (spec.size || 9) + 7 + (i % 2) * 4;
          const sx = px + nx * Math.cos(orbit) * rr - tx * (i * 2.2);
          const sy = py + ny * Math.cos(orbit) * rr - ty * (i * 2.2)
            + Math.sin(orbit) * 2.5;

          glow.circle(sx,sy,spec.heavy ? 5.2 : 4.1).fill({
            color: i % 2 ? spec.core : spec.main,
            alpha: alpha * travelFade * .18,
          });
          core.circle(sx,sy,spec.heavy ? 2.0 : 1.55).fill({
            color: i % 2 ? spec.core : spec.accent,
            alpha: alpha * travelFade * .72,
          });
        }

        // Motes live only inside the detached trail. They no longer sample
        // absolute travel history, so none can remain parked on the caster.
        const moteCount = spec.heavy ? 13 : 10;
        for (let i = 0; i < moteCount; i += 1) {
          const f = 1 - (i + .65) / (moteCount + 1);
          const wobble =
            Math.sin(seed * .17 + i * 1.93 + p * 10)
            * (4 + i * .55);
          const point = trailPoint(Math.max(.03,f),wobble);
          core.circle(
            point.x,
            point.y,
            Math.max(1.1, (spec.heavy ? 3.4 : 2.8) - i * .24),
          ).fill({
            color: i % 3 === 0 ? spec.accent : spec.main,
            alpha: alpha * travelFade * Math.max(.10,.55 - i * .05),
          });
        }

        // Spell-specific trail language. The base ribbon above gives every
        // projectile continuity; these details make each class readable at a
        // glance instead of recoloring the same effect.
        if (spec.trailStyle === "snow") {
          const flakes = 9;
          for (let i = 0; i < flakes; i += 1) {
            const f = (i + .55) / flakes;
            const drift =
              Math.sin(seed * .031 + i * 2.17 + p * 13) * (5 + (i % 3) * 2);
            const point = trailPoint(f, drift);
            const r = 2.2 + (i % 3) * .55;
            const spin = p * 5.5 + i * .83;

            glow.circle(point.x,point.y,r * 2.4).fill({
              color: spec.main,
              alpha: alpha * travelFade * .09,
            });

            for (let arm = 0; arm < 3; arm += 1) {
              const a = spin + arm * Math.PI / 3;
              const ax = Math.cos(a) * r;
              const ay = Math.sin(a) * r;
              core
                .moveTo(point.x-ax,point.y-ay)
                .lineTo(point.x+ax,point.y+ay)
                .stroke({
                  color: arm === 0 ? spec.core : spec.main,
                  width: .9,
                  alpha: alpha * travelFade * .72,
                });
            }
          }

          for (let i = 0; i < 6; i += 1) {
            const f = (i + .35) / 6;
            const point = trailPoint(
              f,
              Math.sin(i * 2.4 + p * 9 + seed * .04) * 9,
            );
            core
              .moveTo(point.x-tx*2.5,point.y-ty*2.5)
              .lineTo(point.x+tx*4.5,point.y+ty*4.5)
              .stroke({
                color: i % 2 ? spec.core : spec.accent,
                width: 1.15,
                alpha: alpha * travelFade * .48,
              });
          }
        } else if (spec.trailStyle === "fire") {
          const embers = 14;
          for (let i = 0; i < embers; i += 1) {
            const f = (i + .4) / embers;
            const side =
              Math.sin(i * 1.71 + p * 18 + seed * .025) * (5 + (i % 4) * 2.2);
            const point = trailPoint(f, side);
            const emberR = 1.2 + (i % 3) * .45;
            const lift = (1-f) * 5 + Math.sin(p*10+i) * 2;

            glow.circle(point.x,point.y-lift,emberR*3.2).fill({
              color: spec.main,
              alpha: alpha * travelFade * .13,
            });
            core.circle(point.x,point.y-lift,emberR).fill({
              color: i % 3 === 0 ? spec.core : spec.accent,
              alpha: alpha * travelFade * .78,
            });

            if (i % 3 === 0) {
              core
                .moveTo(point.x,point.y)
                .lineTo(
                  point.x-tx*(8+(i%2)*4)+nx*side*.18,
                  point.y-ty*(8+(i%2)*4)+ny*side*.18-3,
                )
                .stroke({
                  color: spec.core,
                  width: 1.2,
                  alpha: alpha * travelFade * .50,
                });
            }
          }
        } else if (spec.trailStyle === "magma") {
          const chunks = 11;
          for (let i = 0; i < chunks; i += 1) {
            const f = (i + .5) / chunks;
            const side =
              Math.sin(seed*.043+i*2.3+p*12) * (6+(i%3)*2.5);
            const point = trailPoint(f,side);
            const rr = 1.7 + (i % 3) * .65;

            glow.circle(point.x,point.y,rr*3.1).fill({
              color: spec.main,
              alpha: alpha * travelFade * .12,
            });
            core.circle(point.x,point.y,rr).fill({
              color: i % 4 === 0 ? spec.core : 0x8a3f27,
              alpha: alpha * travelFade * .88,
            });
            if (i % 2 === 0) {
              core
                .moveTo(point.x-tx*3,point.y-ty*3)
                .lineTo(point.x+tx*5,point.y+ty*5)
                .stroke({
                  color: spec.core,
                  width: 1,
                  alpha: alpha * travelFade * .58,
                });
            }
          }
        } else if (spec.trailStyle === "frostfire") {
          const beads = 12;
          for (let i = 0; i < beads; i += 1) {
            const f = (i + .45) / beads;
            const phase = f * Math.PI * 5 + p * 15 + seed * .021;
            const radius = 5 + (i % 3) * 1.6;
            const cold = trailPoint(f, Math.sin(phase) * radius);
            const hot = trailPoint(f, -Math.sin(phase) * radius);

            glow.circle(cold.x,cold.y,4.4).fill({
              color: spec.main,
              alpha: alpha * travelFade * .11,
            });
            glow.circle(hot.x,hot.y,4.4).fill({
              color: spec.accent,
              alpha: alpha * travelFade * .11,
            });
            core.circle(cold.x,cold.y,1.45).fill({
              color: i % 3 === 0 ? spec.core : spec.main,
              alpha: alpha * travelFade * .74,
            });
            core.circle(hot.x,hot.y,1.45).fill({
              color: i % 3 === 0 ? spec.core : spec.accent,
              alpha: alpha * travelFade * .74,
            });

            if (i % 3 === 0) {
              const r = 1.8 + (i % 2) * .5;
              for (let arm = 0; arm < 3; arm += 1) {
                const a = phase + arm * Math.PI / 3;
                const ax = Math.cos(a) * r;
                const ay = Math.sin(a) * r;
                core
                  .moveTo(cold.x-ax,cold.y-ay)
                  .lineTo(cold.x+ax,cold.y+ay)
                  .stroke({
                    color: spec.core,
                    width: .8,
                    alpha: alpha * travelFade * .62,
                  });
              }
            }
          }
        } else if (spec.trailStyle === "arcane") {
          const sigils = 8;
          for (let i = 0; i < sigils; i += 1) {
            const f = (i + .5) / sigils;
            const phase = p * 10 * (i % 2 ? -1 : 1) + i * .91 + seed * .015;
            const point = trailPoint(
              f,
              Math.sin(phase) * (6 + (i % 2) * 3),
            );
            const r = 3.2 + (i % 3) * .8;

            glow.circle(point.x,point.y,r*2.5).fill({
              color: spec.main,
              alpha: alpha * travelFade * .10,
            });
            strokeArc(core,r,phase,phase+Math.PI*1.45,{
              color: i%3===0 ? spec.core : spec.main,
              width: 1.2,
              alpha: alpha * travelFade * .72,
            },5,point.x,point.y);

            if (i % 2 === 0) {
              const a = phase + .6;
              core
                .moveTo(point.x+Math.cos(a)*2,point.y+Math.sin(a)*2)
                .lineTo(point.x+Math.cos(a)*7,point.y+Math.sin(a)*7)
                .stroke({
                  color: spec.core,
                  width: .9,
                  alpha: alpha * travelFade * .55,
                });
            }
          }
        } else if (spec.trailStyle === "elemental") {
          const colors = [spec.main, spec.accent, 0x8bcf8b];
          const motes = 12;
          for (let i = 0; i < motes; i += 1) {
            const f = (i + .5) / motes;
            const phase = p * 14 + i * 1.17 + seed * .018;
            const side = Math.sin(phase) * (6 + (i % 3) * 2);
            const point = trailPoint(f,side);
            const color = colors[i % colors.length];

            glow.circle(point.x,point.y,4.2+(i%2)).fill({
              color,
              alpha: alpha * travelFade * .10,
            });
            core.circle(point.x,point.y,1.4+(i%3)*.25).fill({
              color: i%4===0 ? spec.core : color,
              alpha: alpha * travelFade * .78,
            });

            if (i % 3 === 0) {
              core
                .moveTo(point.x-tx*4,point.y-ty*4)
                .lineTo(
                  point.x+tx*5+nx*(i%2?5:-5),
                  point.y+ty*5+ny*(i%2?5:-5),
                )
                .stroke({
                  color: spec.core,
                  width: 1,
                  alpha: alpha * travelFade * .55,
                });
            }
          }
        } else if (spec.trailStyle === "void") {
          const wisps = 9;
          for (let i = 0; i < wisps; i += 1) {
            const f = (i + .45) / wisps;
            const wave =
              Math.sin(f * Math.PI * 4 + p * 8 + seed * .029) * (7+(i%2)*4);
            const point = trailPoint(f,wave);
            const radius = 3.4 + (i % 3) * 1.2;
            const phase = p*3 + i*.7;

            strokeArc(glow,radius*1.8,phase,phase+Math.PI*1.25,{
              color: spec.main,
              width: 5,
              alpha: alpha * travelFade * .08,
            },5,point.x,point.y);
            strokeArc(core,radius,phase,phase+Math.PI*1.25,{
              color: i%3===0 ? spec.core : spec.main,
              width: 1.25,
              alpha: alpha * travelFade * .62,
            },5,point.x,point.y);
          }
        } else if (spec.trailStyle === "fel") {
          const forks = 8;
          for (let i = 0; i < forks; i += 1) {
            const f = (i + .5) / forks;
            const sideSign = i % 2 ? -1 : 1;
            const point = trailPoint(
              f,
              Math.sin(i*2.1+p*15+seed*.02) * 5,
            );
            const sideLen = 9 + (i % 3) * 5;
            const ex = point.x + nx * sideSign * sideLen - tx * 4;
            const ey = point.y + ny * sideSign * sideLen - ty * 4;

            glow
              .moveTo(point.x,point.y)
              .lineTo(ex,ey)
              .stroke({
                color: spec.main,
                width: 6,
                alpha: alpha * travelFade * .10,
              });
            core
              .moveTo(point.x,point.y)
              .lineTo(
                point.x + nx*sideSign*(sideLen*.52) - tx*2,
                point.y + ny*sideSign*(sideLen*.52) - ty*2,
              )
              .lineTo(ex,ey)
              .stroke({
                color: i%3===0 ? spec.core : spec.main,
                width: 1.65,
                alpha: alpha * travelFade * .72,
              });
            core.circle(ex,ey,1.4+(i%2)*.4).fill({
              color: spec.core,
              alpha: alpha * travelFade * .68,
            });
          }
        } else if (spec.trailStyle === "holy") {
          const sparks = 7;
          for (let i = 0; i < sparks; i += 1) {
            const f = (i + .5) / sparks;
            const point = trailPoint(
              f,
              Math.sin(i*1.8+p*8+seed*.03) * 5,
            );
            const r = 2.2 + (i%2)*.7;

            glow.circle(point.x,point.y,r*2.8).fill({
              color: spec.main,
              alpha: alpha * travelFade * .10,
            });
            core
              .moveTo(point.x-r*1.8,point.y)
              .lineTo(point.x+r*1.8,point.y)
              .moveTo(point.x,point.y-r*1.8)
              .lineTo(point.x,point.y+r*1.8)
              .stroke({
                color: i%3===0 ? spec.core : spec.main,
                width: 1,
                alpha: alpha * travelFade * .68,
              });
          }
        }

        // Spell-specific moving silhouette.
        if (spec.shape === "frost-spear") {
          const pts=[
            transformed(px,py,19,0,angle),
            transformed(px,py,-4,-8,angle),
            transformed(px,py,-1,-2.5,angle),
            transformed(px,py,-14,0,angle),
            transformed(px,py,-1,2.5,angle),
            transformed(px,py,-4,8,angle),
          ];
          poly(glow,pts,{color:spec.main,alpha:alpha*travelFade*.26},true);
          poly(core,pts,{color:spec.main,alpha:alpha*travelFade*.92},true);
          poly(core,pts,{color:spec.core,width:1.6,alpha:alpha*travelFade*.94});
          for(let i=0;i<4;i++){
            const a=angle+Math.PI+(i-1.5)*.32;
            core
              .moveTo(px-tx*4,py-ty*4)
              .lineTo(px+Math.cos(a)*17,py+Math.sin(a)*17)
              .stroke({
                color:i%2?spec.core:spec.accent,
                width:1.2,
                alpha:alpha*travelFade*.55,
              });
          }
        } else if (spec.shape === "pyro") {
          const flamePts=[];
          for(let i=0;i<12;i++){
            const a=i/12*Math.PI*2+p*4.5;
            const rr=i%2?spec.size*.72:spec.size*1.18;
            flamePts.push({x:px+Math.cos(a)*rr,y:py+Math.sin(a)*rr});
          }
          poly(glow,flamePts,{color:spec.main,alpha:alpha*travelFade*.32},true);
          poly(core,flamePts,{color:spec.main,alpha:alpha*travelFade*.95},true);
          core.circle(px,py,spec.size*.52).fill({
            color:spec.core,alpha:alpha*travelFade*.98
          });
          for(let i=0;i<6;i++){
            const a=angle+Math.PI+(i-2.5)*.20+Math.sin(p*9+i)*.08;
            core
              .moveTo(px-tx*5,py-ty*5)
              .lineTo(px+Math.cos(a)*(18+(i%3)*5),py+Math.sin(a)*(18+(i%3)*5))
              .stroke({
                color:i%2?spec.core:spec.accent,
                width:1.4,
                alpha:alpha*travelFade*.60,
              });
          }
        } else if (spec.shape === "frostfire") {
          const diamond=[
            transformed(px,py,20,0,angle),
            transformed(px,py,-4,-10,angle),
            transformed(px,py,-15,0,angle),
            transformed(px,py,-4,10,angle),
          ];
          poly(glow,diamond,{color:spec.main,alpha:alpha*travelFade*.30},true);
          poly(core,diamond,{color:spec.main,alpha:alpha*travelFade*.90},true);
          poly(core,diamond,{color:spec.core,width:2,alpha:alpha*travelFade*.90});
          core.circle(px-tx*2,py-ty*2,6).fill({
            color:spec.accent,alpha:alpha*travelFade*.72
          });
          for(const sign of [-1,1]){
            core
              .moveTo(px-tx*4,py-ty*4)
              .lineTo(
                px-tx*22+nx*sign*12,
                py-ty*22+ny*sign*12
              )
              .stroke({
                color:sign>0?spec.core:spec.accent,
                width:1.8,
                alpha:alpha*travelFade*.62,
              });
          }
        } else if (spec.shape === "arcane") {
          glow.circle(px,py,spec.size+6).fill({
            color:spec.main,alpha:alpha*travelFade*.24
          });
          core.circle(px,py,spec.size*.55).fill({
            color:spec.core,alpha:alpha*travelFade*.94
          });
          for(let i=0;i<3;i++){
            const r=8+i*4;
            const a0=-1.1+i*.75+p*7*(i%2?1:-1);
            const segs=6;
            for(let j=0;j<=segs;j++){
              const q=a0+j/segs*2.2;
              const x=px+Math.cos(q)*r;
              const y=py+Math.sin(q)*r;
              if(j===0) core.moveTo(x,y); else core.lineTo(x,y);
            }
            core.stroke({
              color:i===1?spec.core:spec.main,
              width:1.8,
              alpha:alpha*travelFade*.74,
            });
          }
        } else if (spec.shape === "lava-rock") {
          const pts=[];
          for(let i=0;i<10;i++){
            const a=i/10*Math.PI*2+p*11+seed*.01;
            const rr=i%2?9:14;
            pts.push({x:px+Math.cos(a)*rr,y:py+Math.sin(a)*rr});
          }
          poly(glow,pts,{color:spec.main,alpha:alpha*travelFade*.32},true);
          poly(core,pts,{color:0x6b3426,alpha:alpha*travelFade*.98},true);
          poly(core,pts,{color:spec.main,width:2.6,alpha:alpha*travelFade*.88});
          for(let i=0;i<3;i++){
            const a=i*2.1+p*4;
            core
              .moveTo(px+Math.cos(a)*3,py+Math.sin(a)*3)
              .lineTo(px+Math.cos(a+.45)*10,py+Math.sin(a+.45)*10)
              .stroke({
                color:spec.core,width:1.6,alpha:alpha*travelFade*.84
              });
          }
        } else if (spec.shape === "elemental") {
          glow.circle(px,py,13).fill({
            color:spec.core,alpha:alpha*travelFade*.22
          });
          core.circle(px,py,7).fill({
            color:spec.core,alpha:alpha*travelFade*.96
          });
          const colors=[spec.main,spec.accent,0x87b978];
          for(let i=0;i<3;i++){
            const a=p*15*(i%2?-1:1)+i*Math.PI*2/3;
            const rr=11+(i%2)*4;
            const sx=px+Math.cos(a)*rr;
            const sy=py+Math.sin(a)*rr;
            glow.circle(sx,sy,5).fill({
              color:colors[i],alpha:alpha*travelFade*.25
            });
            core.circle(sx,sy,3.1).fill({
              color:colors[i],alpha:alpha*travelFade*.82
            });
            core.moveTo(px,py).lineTo(sx,sy).stroke({
              color:colors[i],width:1.2,alpha:alpha*travelFade*.38
            });
          }
          const backX=px-tx*28;
          const backY=py-ty*28;
          jaggedLine(
            core,backX,backY,px,py,seed+71,4.5,6,
            {color:spec.main,width:2,alpha:alpha*travelFade*.70},p*4
          );
        } else if (spec.shape === "shadow") {
          glow.circle(px,py,spec.size+7).fill({
            color:spec.main,alpha:alpha*travelFade*.18
          });
          core.circle(px,py,8.5).fill({
            color:spec.main,alpha:alpha*travelFade*.88
          });
          core.circle(px-tx*2,py-ty*2,4).fill({
            color:spec.core,alpha:alpha*travelFade*.75
          });
          for(let i=0;i<5;i++){
            const a=p*6+i*Math.PI*2/5+seed*.013;
            const rr=10+(i%2)*5;
            core.circle(
              px+Math.cos(a)*rr,
              py+Math.sin(a)*rr,
              1.5+(i%2)*.5
            ).fill({
              color:i%2?spec.core:spec.main,
              alpha:alpha*travelFade*.50,
            });
          }
        } else if (spec.shape === "chaos") {
          glow.circle(px,py,spec.size+8).fill({
            color:spec.main,alpha:alpha*travelFade*.20
          });
          core.circle(px,py,7).fill({
            color:spec.core,alpha:alpha*travelFade*.96
          });

          const backX=px-tx*31;
          const backY=py-ty*31;
          for(const sign of [-1,1]){
            const midX=px-tx*18+nx*sign*15;
            const midY=py-ty*18+ny*sign*15;
            const endForkX=px-tx*29+nx*sign*23;
            const endForkY=py-ty*29+ny*sign*23;
            core
              .moveTo(px-tx*6,py-ty*6)
              .lineTo(midX,midY)
              .lineTo(endForkX,endForkY)
              .stroke({
                color:spec.main,
                width:2.3,
                alpha:alpha*travelFade*.84,
              });
            glow
              .moveTo(px-tx*6,py-ty*6)
              .lineTo(midX,midY)
              .lineTo(endForkX,endForkY)
              .stroke({
                color:spec.main,
                width:7,
                alpha:alpha*travelFade*.15,
              });
          }
          jaggedLine(
            core,backX,backY,px,py,seed+19,6,7,
            {color:spec.core,width:3.2,alpha:alpha*travelFade*.88},p*12
          );
        } else if (spec.shape === "hammer") {
          const hammerAngle=angle+p*2.8;
          const handle=[
            transformed(px,py,-4,-14,hammerAngle),
            transformed(px,py,4,-14,hammerAngle),
            transformed(px,py,4,11,hammerAngle),
            transformed(px,py,-4,11,hammerAngle),
          ];
          const head=[
            transformed(px,py,-14,-19,hammerAngle),
            transformed(px,py,14,-19,hammerAngle),
            transformed(px,py,14,-10,hammerAngle),
            transformed(px,py,-14,-10,hammerAngle),
          ];
          poly(glow,handle,{color:spec.main,alpha:alpha*travelFade*.25},true);
          poly(glow,head,{color:spec.main,alpha:alpha*travelFade*.25},true);
          poly(core,handle,{color:spec.main,alpha:alpha*travelFade*.92},true);
          poly(core,head,{color:spec.main,alpha:alpha*travelFade*.92},true);
          poly(core,head,{color:spec.core,width:1.6,alpha:alpha*travelFade*.86});
        }
      }

      // Impact language stays spell-specific instead of reverting to the generic
      // "one expanding circle" look.
      if (p >= spec.travelEnd) {
        const hit = clamp01((p - spec.travelEnd) / .36);
        const fade = 1 - smooth(hit);
        const ix = endX;
        const iy = endY;

        if (missed) {
          for(let i=0;i<6;i++){
            const a=angle+(i-2.5)*.36;
            const rr=8+easeOut(hit)*(18+(i%3)*6);
            core.circle(
              ix+Math.cos(a)*rr,
              iy+Math.sin(a)*rr,
              1.2+(i%2)*.5
            ).fill({
              color:i%2?spec.main:spec.core,
              alpha:alpha*fade*.40,
            });
          }
          continue;
        }

        // Shared premium hit beat. Chain Lightning feels strong because the
        // connection and the detonation are separate events; projectiles now
        // get that same two-stage payoff before their bespoke impact geometry.
        const impactFlash = Math.exp(-hit * 10.5);
        const impactAfterglow = Math.exp(-hit * 3.2);
        const impactPulse = Math.sin(Math.min(1, hit * 1.65) * Math.PI);
        const showcaseRadius =
          14 + easeOut(hit) * (spec.heavy ? 48 : 37);

        glow
          .circle(ix,iy,22 + impactPulse * (spec.heavy ? 22 : 16))
          .fill({
            color: spec.core,
            alpha: alpha * (.09 + impactFlash * (spec.heavy ? .28 : .22)),
          })
          .circle(ix,iy,showcaseRadius)
          .stroke({
            color: spec.main,
            width: spec.heavy ? 12 : 9,
            alpha: alpha * impactAfterglow * .18,
          });

        core
          .circle(ix,iy,4 + (1-hit) * (spec.heavy ? 6 : 4))
          .fill({
            color: spec.core,
            alpha: alpha * Math.min(1, .70 + impactFlash * .35),
          })
          .circle(ix,iy,showcaseRadius * .72)
          .stroke({
            color: spec.core,
            width: spec.heavy ? 2.3 : 1.8,
            alpha: alpha * impactAfterglow * .52,
          });

        const showcaseSparks = spec.heavy ? 14 : 10;
        for (let i = 0; i < showcaseSparks; i += 1) {
          const a =
            i / showcaseSparks * Math.PI * 2
            + seed * .017
            + hit * (i % 2 ? 1.4 : -1.2);
          const inner = 7 + (i % 3);
          const outer =
            18 + easeOut(hit) * (spec.heavy ? 38 : 28) + (i % 4) * 3;
          core
            .moveTo(ix + Math.cos(a) * inner, iy + Math.sin(a) * inner)
            .lineTo(ix + Math.cos(a) * outer, iy + Math.sin(a) * outer)
            .stroke({
              color: i % 4 === 0 ? spec.core : (i % 2 ? spec.main : spec.accent),
              width: spec.heavy ? 1.8 : 1.35,
              alpha: alpha * impactAfterglow * (spec.heavy ? .68 : .54),
            });
        }

        if (spec.shape === "frost-spear") {
          for(let i=0;i<9;i++){
            const a=i/9*Math.PI*2+seed*.013;
            const inner=7;
            const outer=14+easeOut(hit)*(22+(i%3)*7);
            core
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i%3===0?spec.core:spec.main,
                width:i%3===0?2.2:1.4,
                alpha:alpha*fade*.62,
              });
          }
          glow.circle(ix,iy,10+hit*28).stroke({
            color:spec.main,width:7,alpha:alpha*fade*.16
          });
        } else if (spec.shape === "pyro") {
          glow.circle(ix,iy,12+hit*40).fill({
            color:spec.main,alpha:alpha*fade*.14
          });
          core.circle(ix,iy,7+hit*26).stroke({
            color:spec.core,width:2.2,alpha:alpha*fade*.52
          });
          for(let i=0;i<12;i++){
            const a=i/12*Math.PI*2+seed*.019;
            const rr=9+easeOut(hit)*(28+(i%4)*6);
            core.circle(
              ix+Math.cos(a)*rr,
              iy+Math.sin(a)*rr-hit*8,
              1.5+(i%3)*.65
            ).fill({
              color:i%3===0?spec.core:(i%2?spec.main:spec.accent),
              alpha:alpha*fade*.66,
            });
          }
        } else if (spec.shape === "frostfire") {
          for(let i=0;i<10;i++){
            const a=i/10*Math.PI*2+seed*.01;
            const outer=15+easeOut(hit)*(24+(i%3)*7);
            core
              .moveTo(ix+Math.cos(a)*6,iy+Math.sin(a)*6)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i%2?spec.main:spec.accent,
                width:1.7,
                alpha:alpha*fade*.56,
              });
          }
          core.circle(ix,iy,8+hit*20).stroke({
            color:spec.core,width:2,alpha:alpha*fade*.46
          });
        } else if (spec.shape === "arcane") {
          for(let ring=0;ring<3;ring++){
            const r=10+hit*(17+ring*7);
            const offset=hit*(ring%2?2.8:-2.4);
            for(let seg=0;seg<4;seg++){
              const a0=seg*Math.PI/2+.15+offset;
              const a1=a0+.62;
              for(let j=0;j<=5;j++){
                const a=a0+(a1-a0)*j/5;
                const x=ix+Math.cos(a)*r;
                const y=iy+Math.sin(a)*r;
                if(j===0) core.moveTo(x,y); else core.lineTo(x,y);
              }
              core.stroke({
                color:ring===1?spec.core:spec.main,
                width:1.5,
                alpha:alpha*fade*(.52-ring*.08),
              });
            }
          }
        } else if (spec.shape === "lava-rock") {
          for(let i=0;i<10;i++){
            const a=i/10*Math.PI*2+seed*.017;
            const rr=8+easeOut(hit)*(22+(i%4)*7);
            core.circle(
              ix+Math.cos(a)*rr,
              iy+Math.sin(a)*rr-hit*8,
              1.5+(i%3)*.7
            ).fill({
              color:i%3===0?spec.core:spec.main,
              alpha:alpha*fade*.68,
            });
          }
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+seed*.011;
            core
              .moveTo(ix+Math.cos(a)*6,iy+Math.sin(a)*6)
              .lineTo(
                ix+Math.cos(a)*(18+hit*26),
                iy+Math.sin(a)*(18+hit*26)
              )
              .stroke({
                color:0x8b4b31,width:1.8,alpha:alpha*fade*.56
              });
          }
        } else if (spec.shape === "elemental") {
          const colors=[spec.main,spec.accent,0x87b978];
          for(let i=0;i<12;i++){
            const a=i/12*Math.PI*2+seed*.015;
            const inner=6+hit*3;
            const outer=17+easeOut(hit)*(28+(i%4)*5);
            core
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:colors[i%3],
                width:1.8,
                alpha:alpha*fade*.62,
              });
          }
          glow.circle(ix,iy,9+hit*30).fill({
            color:spec.core,alpha:alpha*fade*.11
          });
        } else if (spec.shape === "shadow") {
          const collapse=1-easeOut(hit);
          glow.circle(ix,iy,9+collapse*17).fill({
            color:spec.main,alpha:alpha*fade*.14
          });
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2-hit*(i%2?1.7:-1.4)+seed*.01;
            const rr=7+easeOut(hit)*(24+(i%3)*7);
            core.circle(
              ix+Math.cos(a)*rr,
              iy+Math.sin(a)*rr,
              1.4+(i%2)*.5
            ).fill({
              color:i%3===0?spec.core:spec.main,
              alpha:alpha*fade*.54,
            });
          }
          core.circle(ix,iy,5+collapse*4).fill({
            color:spec.core,alpha:alpha*fade*.70
          });
        } else if (spec.shape === "chaos") {
          for(let i=0;i<9;i++){
            const a=i/9*Math.PI*2+seed*.013;
            const inner=7;
            const mid=16+hit*10;
            const outer=22+easeOut(hit)*(24+(i%3)*8);
            const bend=a+(i%2?.22:-.22);
            core
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ix+Math.cos(bend)*mid,iy+Math.sin(bend)*mid)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i%3===0?spec.core:spec.main,
                width:2,
                alpha:alpha*fade*.66,
              });
          }
          glow.circle(ix,iy,10+hit*33).stroke({
            color:spec.main,width:8,alpha:alpha*fade*.14
          });
          core.circle(ix,iy,7*(1-hit*.35)).fill({
            color:spec.core,alpha:alpha*fade*.74
          });
        } else if (spec.shape === "hammer") {
          glow.circle(ix,iy,10+hit*34).stroke({
            color:spec.main,width:7,alpha:alpha*fade*.14
          });
          core.circle(ix,iy,10+hit*36).stroke({
            color:spec.main,width:2.2,alpha:alpha*fade*.52
          });
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2;
            core
              .moveTo(ix+Math.cos(a)*8,iy+Math.sin(a)*8)
              .lineTo(
                ix+Math.cos(a)*(18+hit*28),
                iy+Math.sin(a)*(18+hit*28)
              )
              .stroke({
                color:i%2?spec.main:spec.core,
                width:1.6,
                alpha:alpha*fade*.58,
              });
          }
        }
      }
    }
  }

  updateNativeSpellAnimationPolish(game) {
    const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };

    const strokeArc = (
      graphics,
      cx,
      cy,
      radius,
      start,
      end,
      style,
      segments = 7,
    ) => {
      if (style.alpha <= 0) return;
      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const angle = start + (end - start) * t;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
      }
      graphics.stroke(style);
    };

    for (const view of this.actorViews.values()) {
      view.spellPolishGlowFx.clear();
      view.spellPolishGlowFx.visible = false;
      view.spellPolishGlowFx.position.set(0,0);
      view.spellPolishCoreFx.clear();
      view.spellPolishCoreFx.visible = false;
      view.spellPolishCoreFx.position.set(0,0);
    }

    const time = Number(game.elapsedSeconds) || 0;

    // CAST COMPRESSION / RELEASE
    // Existing class windups keep their identity. This final 35% adds a shared
    // anticipation beat so the actual release reads clearly at game scale.
    for (const actor of game.actors) {
      if (!actor.alive || !actor.cast) continue;
      const view = this.actorViews.get(actor.id);
      if (!view || !view.root.visible) continue;

      const spell = actor.getSpell(actor.cast.spellId);
      const spellId = spell?.id || actor.cast.spellId;
      if (POLISH_ALREADY_FINAL.has(spellId)) continue;

      // The old shared compression overlay drew the same radial spokes/center
      // point on every class. In living-circle mode that read as a cheap cross.
      // Class/talent identity now provides the anticipation instead.
      if (this.livingCircleUnits) continue;

      const profile = spellPolishProfile(spellId, spell?.visualStyle);
      const total = Math.max(1, Number(actor.cast.totalMs) || 1);
      const remaining = Math.max(0, Number(actor.cast.remainingMs) || 0);
      const p = clamp01(1 - remaining / total);
      const anticipation = smooth((p - .62) / .38);
      if (anticipation <= 0) continue;

      const heavy = POLISH_HEAVY_SPELLS.has(spellId) || total >= 1800;
      const glow = view.spellPolishGlowFx;
      const core = view.spellPolishCoreFx;
      glow.visible = true;
      core.visible = true;

      const pulse = .5 + .5 * Math.sin(time * 15 + actor.x * .017);
      const outer = actor.radius + (heavy ? 27 : 21) - anticipation * (heavy ? 10 : 7);

      glow.circle(0, 0, outer).stroke({
        color: profile.main,
        width: heavy ? 7 : 5,
        alpha: (.09 + anticipation * .18) * (.82 + pulse * .18),
      });

      core.circle(0, 0, outer).stroke({
        color: profile.main,
        width: heavy ? 2.3 : 1.7,
        alpha: .18 + anticipation * .40,
      });

      const rays = heavy ? 8 : 6;
      for (let i = 0; i < rays; i += 1) {
        const angle =
          i / rays * Math.PI * 2
          + time * (i % 2 ? -.35 : .32);
        const startR = outer + 10 - anticipation * 4;
        const endR = actor.radius + 5 + anticipation * 3;
        core
          .moveTo(Math.cos(angle) * startR, Math.sin(angle) * startR)
          .lineTo(Math.cos(angle) * endR, Math.sin(angle) * endR)
          .stroke({
            color: i % 3 === 0 ? profile.core : profile.main,
            width: heavy ? 1.7 : 1.25,
            alpha: anticipation * (heavy ? .48 : .34),
          });
      }

      if (p > .88) {
        const release = smooth((p - .88) / .12);
        const flashFade = 1 - release;
        glow.circle(0, 0, 6 + release * (heavy ? 18 : 13)).fill({
          color: profile.core,
          alpha: flashFade * (heavy ? .24 : .16),
        });
        core.circle(0, 0, 3.2 + release * 3).fill({
          color: profile.core,
          alpha: flashFade * (heavy ? .72 : .55),
        });
      }
    }

    // SPELL RELEASE / TRAVEL / IMPACT
    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell") continue;
      if (POLISH_ALREADY_FINAL.has(effect.spellId)) continue;
      if (PROJECTILE_VFX2_SPELLS.has(effect.spellId)) continue;
      if (COMBAT_VFX2_SPELLS.has(effect.spellId)) continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !view || !view.root.visible) continue;

      const targetCenter = target
        ? visualActorCenter(this.actorViews, target, effect.targetX, effect.targetY)
        : null;
      const targetX = targetCenter?.x ?? effect.targetX ?? source.x;
      const targetY = targetCenter?.y ?? effect.targetY ?? source.y;
      if (!Number.isFinite(targetX) || !Number.isFinite(targetY)) continue;

      const profile = spellPolishProfile(effect.spellId, effect.style);
      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = clamp01(1 - remaining / total);
      const alpha = clamp01(remaining / total);
      const seed = Number(effect.seed || effect.id || 1);
      const random = seededRandom(seed * 13 + 7);
      const heavy = POLISH_HEAVY_SPELLS.has(effect.spellId);
      const isHeal = POLISH_HEAL_SPELLS.has(effect.spellId);
      const isControl = POLISH_CONTROL_SPELLS.has(effect.spellId);
      const isMelee = POLISH_MELEE_SPELLS.has(effect.spellId);
      const isProjectile = POLISH_PROJECTILE_SPELLS.has(effect.spellId);
      const missed = Boolean(effect.missed);

      const sourceCenter = isProjectile
        ? visualActorCenter(this.actorViews, source, source.x, source.y)
        : { x: source.x, y: source.y };
      const sourceOffsetX = sourceCenter.x - source.x;
      const sourceOffsetY = sourceCenter.y - source.y;
      if (isProjectile) {
        view.spellPolishGlowFx.position.set(sourceOffsetX,sourceOffsetY);
        view.spellPolishCoreFx.position.set(sourceOffsetX,sourceOffsetY);
      }

      let dx = targetX - sourceCenter.x;
      let dy = targetY - sourceCenter.y;
      const baseDistance = Math.max(1, Math.hypot(dx, dy));
      const tx = dx / baseDistance;
      const ty = dy / baseDistance;
      const nx = -ty;
      const ny = tx;

      if (missed) {
        const sign = Math.sin(seed * .91) >= 0 ? 1 : -1;
        dx += nx * sign * (heavy ? 50 : 38);
        dy += ny * sign * (heavy ? 50 : 38) - 8;
      }

      const glow = view.spellPolishGlowFx;
      const core = view.spellPolishCoreFx;
      glow.visible = true;
      core.visible = true;

      // A crisp release snap at the source. It is intentionally short so it
      // doesn't bury each class's bespoke cast art.
      const releaseP = clamp01(p / .18);
      const releaseFade = 1 - releaseP;
      if (releaseFade > 0) {
        const radius = source.radius + 8 + easeOut(releaseP) * (heavy ? 20 : 13);

        glow.circle(0, 0, radius).stroke({
          color: profile.main,
          width: heavy ? 7 : 5,
          alpha: alpha * releaseFade * (heavy ? .20 : .13),
        });
        core.circle(0, 0, radius).stroke({
          color: profile.core,
          width: heavy ? 2.1 : 1.5,
          alpha: alpha * releaseFade * (heavy ? .55 : .38),
        });

        const sparkCount = heavy ? 7 : 4;
        for (let i = 0; i < sparkCount; i += 1) {
          const angle =
            i / sparkCount * Math.PI * 2
            + seed * .019
            + releaseP * .5;
          const inner = source.radius + 4;
          const outer = inner + 9 + releaseP * (heavy ? 18 : 11);
          core
            .moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
            .lineTo(Math.cos(angle) * outer, Math.sin(angle) * outer)
            .stroke({
              color: i % 3 === 0 ? profile.core : profile.main,
              width: heavy ? 1.8 : 1.2,
              alpha: alpha * releaseFade * (heavy ? .52 : .34),
            });
        }
      }

      const selfEffect = baseDistance < Math.max(8, source.radius * .35);
      if (selfEffect) {
        const expand = easeOut(p);
        const fade = 1 - smooth((p - .55) / .45);
        const radius = source.radius + 10 + expand * (heavy ? 30 : 20);

        glow.circle(0, 0, radius).stroke({
          color: profile.main,
          width: heavy ? 7 : 5,
          alpha: alpha * fade * .14,
        });
        core.circle(0, 0, radius).stroke({
          color: profile.core,
          width: heavy ? 2.2 : 1.5,
          alpha: alpha * fade * .35,
        });

        const motes = heavy ? 8 : 6;
        for (let i = 0; i < motes; i += 1) {
          const angle =
            i / motes * Math.PI * 2
            + p * (i % 2 ? 2.4 : -2.0)
            + seed * .013;
          const rr = source.radius + 12 + (i % 3) * 5 + p * 5;
          core.circle(
            Math.cos(angle) * rr,
            Math.sin(angle) * rr,
            1.2 + (i % 3) * .35,
          ).fill({
            color: i % 3 === 0 ? profile.core : profile.main,
            alpha: alpha * fade * .42,
          });
        }
        continue;
      }

      let impactStart = .10;

      if (isProjectile) {
        const travelEnd = clamp01(profile.travelEnd || (heavy ? .58 : .52));
        const travelQ = smooth(p / Math.max(.1, travelEnd));
        impactStart = travelEnd * .90;

        const arcHeight = Math.sin(travelQ * Math.PI) * (heavy ? -12 : -7);
        const px = dx * travelQ;
        const py = dy * travelQ + arcHeight;

        const trailCount = heavy ? 5 : 4;
        for (let i = trailCount; i >= 1; i -= 1) {
          const lagQ = Math.max(0, travelQ - i * (heavy ? .055 : .065));
          const lagArc = Math.sin(lagQ * Math.PI) * (heavy ? -12 : -7);
          const lx = dx * lagQ;
          const ly = dy * lagQ + lagArc;
          const trailAlpha = alpha * (1 - i / (trailCount + 1)) * (heavy ? .22 : .16);

          glow.circle(
            lx,
            ly,
            (profile.size || (heavy ? 10 : 7)) * (1.05 - i * .08),
          ).fill({
            color: profile.main,
            alpha: trailAlpha * .42,
          });
          core.circle(
            lx,
            ly,
            Math.max(1.4, (profile.size || 7) * (.42 - i * .035)),
          ).fill({
            color: profile.main,
            alpha: trailAlpha,
          });
        }

        const orbSize = profile.size || (heavy ? 10 : 7);
        glow.circle(px, py, orbSize * (heavy ? 1.8 : 1.55)).fill({
          color: profile.main,
          alpha: alpha * (heavy ? .24 : .18),
        });
        core.circle(px, py, orbSize).fill({
          color: profile.main,
          alpha: alpha * .82,
        });
        core.circle(px - tx * 1.5, py - ty * 1.5, orbSize * .42).fill({
          color: profile.core,
          alpha: alpha * .92,
        });

        const jitterCount = heavy ? 6 : 4;
        for (let i = 0; i < jitterCount; i += 1) {
          const phase = random() * Math.PI * 2 + p * 8;
          const side = (4 + random() * (heavy ? 9 : 6)) * (i % 2 ? 1 : -1);
          const behind = 4 + random() * (heavy ? 17 : 11);
          core.circle(
            px - tx * behind + nx * side + Math.cos(phase) * 2,
            py - ty * behind + ny * side + Math.sin(phase) * 2,
            .9 + random() * 1.2,
          ).fill({
            color: i % 3 === 0 ? profile.core : profile.accent,
            alpha: alpha * (heavy ? .52 : .36),
          });
        }
      }

      const impactP = clamp01((p - impactStart) / Math.max(.12, 1 - impactStart));
      if (impactP <= 0) continue;

      // Misses get a readable dissipating ghost instead of a successful hit pop.
      if (missed) {
        const fade = 1 - smooth(impactP);
        const radius = 8 + easeOut(impactP) * (heavy ? 24 : 17);
        core.circle(dx, dy, radius).stroke({
          color: profile.main,
          width: 1.4,
          alpha: alpha * fade * .28,
        });
        for (let i = 0; i < 4; i += 1) {
          const angle = seed * .03 + i * Math.PI / 2;
          core
            .moveTo(dx + Math.cos(angle) * 6, dy + Math.sin(angle) * 6)
            .lineTo(
              dx + Math.cos(angle) * (13 + impactP * 12),
              dy + Math.sin(angle) * (13 + impactP * 12),
            )
            .stroke({
              color: profile.accent,
              width: 1,
              alpha: alpha * fade * .25,
            });
        }
        continue;
      }

      const hitEase = easeOut(impactP);
      const hitFade = 1 - smooth((impactP - .20) / .80);
      const weight = heavy ? 1.34 : 1;

      if (isHeal) {
        const radius = 10 + hitEase * 30 * weight;
        glow.circle(dx, dy, radius * .82).fill({
          color: profile.main,
          alpha: alpha * hitFade * (heavy ? .10 : .07),
        });
        core.circle(dx, dy, radius).stroke({
          color: profile.main,
          width: heavy ? 2.2 : 1.5,
          alpha: alpha * hitFade * .38,
        });
        core.circle(dx, dy, radius * .66).stroke({
          color: profile.core,
          width: 1.1,
          alpha: alpha * hitFade * .28,
        });

        const motes = heavy ? 9 : 6;
        for (let i = 0; i < motes; i += 1) {
          const spread = (i - (motes - 1) / 2) * (heavy ? 5 : 4);
          const wobble = Math.sin(seed * .07 + i * 2.1 + impactP * 8) * 4;
          core.circle(
            dx + spread + wobble,
            dy + 11 - impactP * (heavy ? 42 : 31) - (i % 2) * 4,
            1.1 + (i % 3) * .4,
          ).fill({
            color: i % 3 === 0 ? profile.core : profile.main,
            alpha: alpha * hitFade * .48,
          });
        }
        continue;
      }

      if (isControl) {
        const radius = 14 + hitEase * (heavy ? 31 : 24);
        const segments = heavy ? 5 : 4;
        for (let i = 0; i < segments; i += 1) {
          const angle =
            i / segments * Math.PI * 2
            + impactP * (i % 2 ? -1.5 : 1.25)
            + seed * .009;
          strokeArc(
            core,
            dx,
            dy,
            radius + (i % 2) * 4,
            angle,
            angle + .72,
            {
              color: i % 2 ? profile.core : profile.main,
              width: heavy ? 2 : 1.5,
              alpha: alpha * hitFade * .45,
            },
            5,
          );
        }

        glow.circle(dx, dy, radius * .82).stroke({
          color: profile.main,
          width: 6,
          alpha: alpha * hitFade * .11,
        });

        for (let i = 0; i < 5; i += 1) {
          const angle = i / 5 * Math.PI * 2 + seed * .021;
          const outer = radius + 10;
          const inner = radius - 4 - impactP * 5;
          core
            .moveTo(dx + Math.cos(angle) * outer, dy + Math.sin(angle) * outer)
            .lineTo(dx + Math.cos(angle) * inner, dy + Math.sin(angle) * inner)
            .stroke({
              color: profile.accent,
              width: 1.2,
              alpha: alpha * hitFade * .34,
            });
        }
        continue;
      }

      if (isMelee) {
        const burstRadius = 9 + hitEase * (heavy ? 30 : 21);
        glow.ellipse(
          dx,
          dy + 8,
          burstRadius * 1.15,
          burstRadius * .34,
        ).stroke({
          color: profile.main,
          width: heavy ? 7 : 5,
          alpha: alpha * hitFade * .12,
        });

        const shards = heavy ? 9 : 6;
        for (let i = 0; i < shards; i += 1) {
          const angle =
            -2.65 + i / Math.max(1, shards - 1) * 2.15
            + Math.sin(seed * .03 + i) * .16;
          const inner = 5 + (i % 2) * 2;
          const outer = 15 + hitEase * (heavy ? 27 : 18) + (i % 3) * 3;
          core
            .moveTo(
              dx + Math.cos(angle) * inner,
              dy + Math.sin(angle) * inner,
            )
            .lineTo(
              dx + Math.cos(angle) * outer,
              dy + Math.sin(angle) * outer,
            )
            .stroke({
              color: i % 3 === 0 ? profile.core : profile.main,
              width: heavy ? 2.2 : 1.5,
              alpha: alpha * hitFade * (heavy ? .58 : .42),
            });
        }

        core.circle(dx, dy, 3 + (1 - impactP) * (heavy ? 5 : 3)).fill({
          color: profile.core,
          alpha: alpha * hitFade * (heavy ? .72 : .52),
        });
        continue;
      }

      // General magical impact: concentric snap + irregular radial fragments.
      const radius = 8 + hitEase * (heavy ? 39 : 27);
      glow.circle(dx, dy, radius * .72).fill({
        color: profile.main,
        alpha: alpha * hitFade * (heavy ? .12 : .08),
      });
      core.circle(dx, dy, radius).stroke({
        color: profile.main,
        width: heavy ? 2.4 : 1.6,
        alpha: alpha * hitFade * .42,
      });
      core.circle(dx, dy, radius * .56).stroke({
        color: profile.core,
        width: 1,
        alpha: alpha * hitFade * .28,
      });

      const fragments = heavy ? 10 : 7;
      for (let i = 0; i < fragments; i += 1) {
        const angle =
          i / fragments * Math.PI * 2
          + seed * .011
          + Math.sin(i * 4.7 + seed) * .12;
        const inner = 6 + (i % 2) * 2;
        const outer =
          14 + hitEase * (heavy ? 32 : 21) + (i % 3) * 4;
        core
          .moveTo(
            dx + Math.cos(angle) * inner,
            dy + Math.sin(angle) * inner,
          )
          .lineTo(
            dx + Math.cos(angle) * outer,
            dy + Math.sin(angle) * outer,
          )
          .stroke({
            color: i % 3 === 0 ? profile.core : profile.accent,
            width: heavy ? 1.8 : 1.2,
            alpha: alpha * hitFade * (heavy ? .50 : .34),
          });
      }

      core.circle(dx, dy, 3.5 + (1 - impactP) * (heavy ? 6 : 4)).fill({
        color: profile.core,
        alpha: alpha * hitFade * (heavy ? .72 : .55),
      });
    }
  }

  updateNativeRangedShowcaseVfx(game) {
    const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };

    for (const effect of game.vfx?.effects || []) {
      if (effect.type !== "spell") continue;
      if (effect.spellId === "shaman-chain-lightning") continue;

      const source = game.getActor(effect.sourceId);
      const target = game.getActor(effect.targetId);
      const view = this.actorViews.get(effect.sourceId);
      if (!source || !target || !view || !view.root.visible) continue;

      const spell = source.getSpell?.(effect.spellId);
      const range = Number(spell?.range) || 0;
      if (range < 250 || spell?.target === "self") continue;

      // Keep pure DoT/HoT applications visually quiet. Their combat readability
      // already comes from icons/combat text, and the user explicitly does not
      // want periodic effects turned into projectile spam.
      const spellEffects = Array.isArray(spell?.effects) ? spell.effects : [];
      const periodicOnly =
        spellEffects.length > 0
        && spellEffects.every(item =>
          item?.kind === "dot" || item?.kind === "hot"
        );
      if (periodicOnly) continue;

      // Holy Fire, Moonfire and Judgment already have authored vertical
      // sky-strikes. Do not add caster-to-target ribbons to those spells.
      if (COMBAT_VFX2_SKY.has(effect.spellId)) continue;

      const profile = spellPolishProfile(effect.spellId, effect.style);
      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const p = clamp01(1 - remaining / total);
      const alpha = clamp01(remaining / total);
      const seed = Number(effect.seed || effect.id || 1);
      const heavy =
        POLISH_HEAVY_SPELLS.has(effect.spellId)
        || spell?.aiRole === "bigDamage"
        || spell?.aiRole === "bigHeal";
      const allyTarget = spell?.target === "ally";
      const utility = Boolean(spell?.utility);
      const strength = allyTarget ? .76 : utility ? .88 : 1;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.max(1, Math.hypot(dx,dy));
      const tx = dx / distance;
      const ty = dy / distance;
      const nx = -ty;
      const ny = tx;
      const glow = view.secondaryGlowFx;
      const core = view.secondaryFx;
      const pulse =
        .82 + (.5 + .5 * Math.sin(game.elapsedSeconds * 24 + seed * .11)) * .18;

      glow.visible = true;
      core.visible = true;

      // All ranged spells get a compact source discharge. The shape/color still
      // comes from the class-specific profile underneath this polish layer.
      const releaseP = clamp01(p / .16);
      const releaseFade = 1 - smooth(releaseP);
      if (releaseFade > 0) {
        const rr = source.radius + 7 + easeOut(releaseP) * (heavy ? 25 : 18);

        glow.circle(0,0,rr + 5).stroke({
          color: profile.main,
          width: heavy ? 11 : 8,
          alpha: alpha * releaseFade * .18 * strength,
        });
        core.circle(0,0,rr).stroke({
          color: profile.core,
          width: heavy ? 2.5 : 1.9,
          alpha: alpha * releaseFade * .72 * strength,
        });
        core.circle(0,0,3.4 + (1-releaseP) * (heavy ? 4.5 : 3)).fill({
          color: profile.core,
          alpha: alpha * releaseFade * .92 * strength,
        });

        const fingers = heavy ? 10 : 7;
        for (let i = 0; i < fingers; i += 1) {
          const a =
            i / fingers * Math.PI * 2
            + seed * .013
            + releaseP * (i % 2 ? -.55 : .48);
          const inner = source.radius + 3;
          const outer = inner + 10 + releaseP * (heavy ? 22 : 15) + (i % 3) * 3;
          core
            .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
            .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
            .stroke({
              color: i % 3 === 0 ? profile.core : profile.main,
              width: heavy ? 1.7 : 1.2,
              alpha: alpha * releaseFade * .54 * strength,
            });
        }
      }

      const projectileSpec = PROJECTILE_VFX2_SPELLS.has(effect.spellId)
        ? projectileVfx2Spec(effect.spellId)
        : null;
      const talentTrail =
        effect.spellId === "priest-smite" ? "psionic"
        : effect.spellId === "warlock-drain-life" ? "drain"
        : effect.spellId === "warlock-conflagrate" ? "conflagrate"
        : effect.spellId === "paladin-word-of-glory" ? "word-glory"
        : null;
      const travelEnd = projectileSpec?.travelEnd
        || (talentTrail === "drain" ? .58 : talentTrail ? .42 : .27);

      // Non-projectile ranged spells still get a visible moving release segment,
      // but only Drain Life is allowed to remain tethered caster-to-target.
      // Every other ranged effect must travel detached from the caster.
      if (!projectileSpec && p < travelEnd + .08) {
        const q = easeOut(p / Math.max(.08,travelEnd));
        const qPrev = Math.max(0,q - .18);
        const px = dx * q;
        const py = dy * q;
        const bx = dx * qPrev;
        const by = dy * qPrev;

        glow
          .moveTo(bx,by)
          .lineTo(px,py)
          .stroke({
            color: profile.main,
            width: heavy ? 18 : 14,
            alpha: alpha * .16 * strength,
          });
        core
          .moveTo(bx,by)
          .lineTo(px,py)
          .stroke({
            color: profile.main,
            width: heavy ? 5.4 : 4.0,
            alpha: alpha * .66 * strength,
          })
          .moveTo(bx,by)
          .lineTo(px,py)
          .stroke({
            color: profile.core,
            width: heavy ? 1.5 : 1.05,
            alpha: alpha * .94 * strength,
          });

        for (let i = 0; i < (heavy ? 5 : 3); i += 1) {
          const orbit = p * 16 + i * 2.1 + seed * .021;
          const rr = 7 + (i % 2) * 4;
          core.circle(
            px + nx * Math.cos(orbit) * rr - tx * i * 2,
            py + ny * Math.cos(orbit) * rr - ty * i * 2,
            1.2 + (i % 2) * .45,
          ).fill({
            color: i % 2 ? profile.core : profile.main,
            alpha: alpha * .68 * strength,
          });
        }

        if (talentTrail === "psionic") {
          const strands = 3;
          for (let strand = 0; strand < strands; strand += 1) {
            const offset = (strand - 1) * 7;
            const phase = p * 11 + strand * 2.1 + seed * .017;
            const mx = (bx + px) * .5 + nx * (offset + Math.sin(phase)*7);
            const my = (by + py) * .5 + ny * (offset + Math.sin(phase)*7);

            glow
              .moveTo(bx,by)
              .lineTo(mx,my)
              .lineTo(px,py)
              .stroke({
                color: profile.main,
                width: 5,
                alpha: alpha * .09,
              });
            core
              .moveTo(bx,by)
              .lineTo(mx,my)
              .lineTo(px,py)
              .stroke({
                color: strand === 1 ? profile.core : profile.main,
                width: strand === 1 ? 1.5 : 1.0,
                alpha: alpha * .65,
              });
          }
        } else if (talentTrail === "drain") {
          // Drain Life is intentionally a tether/channel, like Chain Lightning:
          // the visual connection itself communicates the ongoing drain.
          const drainSegments = 12;
          for (let i = 0; i < drainSegments; i += 1) {
            const f0 = i / drainSegments;
            const f1 = (i + 1) / drainSegments;
            const wobble0 =
              Math.sin(f0 * Math.PI * 5 + p * 9 + seed * .031) * 6;
            const wobble1 =
              Math.sin(f1 * Math.PI * 5 + p * 9 + seed * .031) * 6;
            const x0 = dx * f0 + nx * wobble0;
            const y0 = dy * f0 + ny * wobble0;
            const x1 = dx * f1 + nx * wobble1;
            const y1 = dy * f1 + ny * wobble1;

            glow
              .moveTo(x0,y0)
              .lineTo(x1,y1)
              .stroke({
                color: profile.main,
                width: 11,
                alpha: alpha * .09,
              });
            core
              .moveTo(x0,y0)
              .lineTo(x1,y1)
              .stroke({
                color: i % 3 === 0 ? profile.core : profile.main,
                width: i % 3 === 0 ? 2.0 : 1.45,
                alpha: alpha * .66,
              });
          }

          const soulCount = 9;
          for (let i = 0; i < soulCount; i += 1) {
            const f = (p * 2.5 + i / soulCount) % 1;
            const sx = dx * (1-f) + nx * Math.sin(f*12+seed*.03+i)*7;
            const sy = dy * (1-f) + ny * Math.sin(f*12+seed*.03+i)*7;
            glow.circle(sx,sy,5.2).fill({
              color: profile.main,
              alpha: alpha * .10,
            });
            core.circle(sx,sy,1.7+(i%2)*.45).fill({
              color: i%3===0 ? profile.core : profile.main,
              alpha: alpha * .72,
            });
          }
        } else if (talentTrail === "conflagrate") {
          const emberCount = 10;
          for (let i = 0; i < emberCount; i += 1) {
            const localF = (i+.5)/emberCount;
            const side = Math.sin(i*1.8+p*15+seed*.02)*(5+(i%3)*2);
            const ex = bx + (px-bx)*localF + nx*side;
            const ey = by + (py-by)*localF + ny*side - Math.sin(localF*Math.PI)*5;
            glow.circle(ex,ey,4.2).fill({
              color: profile.main,
              alpha: alpha * .11,
            });
            core.circle(ex,ey,1.35+(i%3)*.35).fill({
              color: i%3===0 ? profile.core : profile.accent,
              alpha: alpha * .76,
            });
          }
        } else if (talentTrail === "word-glory") {
          const motes = 8;
          for (let i = 0; i < motes; i += 1) {
            const localF = (i+.5)/motes;
            const a = p*8+i*.9+seed*.014;
            const ex = bx + (px-bx)*localF + nx*Math.sin(a)*6;
            const ey = by + (py-by)*localF + ny*Math.sin(a)*6
              - Math.sin(localF*Math.PI)*7;
            core
              .moveTo(ex-2.5,ey)
              .lineTo(ex+2.5,ey)
              .moveTo(ex,ey-2.5)
              .lineTo(ex,ey+2.5)
              .stroke({
                color: i%3===0 ? profile.core : profile.main,
                width: .95,
                alpha: alpha * .66,
              });
          }
        }
      }

      const impactStart = projectileSpec?.travelEnd || (talentTrail ? .20 : .16);
      const hit = clamp01((p - impactStart) / Math.max(.18,1-impactStart));
      if (hit <= 0 || effect.missed) continue;

      const hitFade = 1 - smooth((hit - .18) / .82);
      const hitFlash = Math.exp(-hit * 9.5);
      const hitPulse = Math.sin(Math.min(1,hit * 1.6) * Math.PI);
      const radius =
        14 + easeOut(hit) * (heavy ? 47 : utility ? 34 : 39);
      const glowPower = strength * (heavy ? 1.08 : 1);

      glow
        .circle(dx,dy,20 + hitPulse * (heavy ? 22 : 16))
        .fill({
          color: profile.main,
          alpha: alpha * hitFade * .13 * glowPower,
        })
        .circle(dx,dy,radius)
        .stroke({
          color: profile.main,
          width: heavy ? 11 : 8,
          alpha: alpha * hitFade * .17 * glowPower,
        });

      core
        .circle(dx,dy,4 + (1-hit) * (heavy ? 6 : 4))
        .fill({
          color: profile.core,
          alpha: alpha * Math.min(1,.66 + hitFlash * .42) * strength,
        })
        .circle(dx,dy,radius * .70)
        .stroke({
          color: profile.core,
          width: heavy ? 2.2 : 1.65,
          alpha: alpha * hitFade * .50 * strength,
        });

      const particles = heavy ? 13 : utility ? 8 : 10;
      for (let i = 0; i < particles; i += 1) {
        const a =
          i / particles * Math.PI * 2
          + seed * .019
          + hit * (i % 2 ? 1.5 : -1.25);
        const inner = 7 + (i % 2) * 2;
        const outer =
          17 + easeOut(hit) * (heavy ? 37 : 28) + (i % 4) * 3;

        if (allyTarget) {
          core.circle(
            dx + Math.cos(a)*outer*.62,
            dy + Math.sin(a)*outer*.40 - hit*(heavy?28:21),
            1.2 + (i%3)*.35,
          ).fill({
            color: i % 3 === 0 ? profile.core : profile.main,
            alpha: alpha * hitFade * .58 * strength,
          });
        } else {
          core
            .moveTo(dx + Math.cos(a)*inner,dy + Math.sin(a)*inner)
            .lineTo(dx + Math.cos(a)*outer,dy + Math.sin(a)*outer)
            .stroke({
              color: i % 4 === 0 ? profile.core : (i % 2 ? profile.main : profile.accent),
              width: heavy ? 1.75 : 1.25,
              alpha: alpha * hitFade * .60 * strength * pulse,
            });
        }
      }
    }
  }

  updateCombatReadability(game) {
    const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
    const effects = game.vfx?.effects || [];

    const activeVisuals = effects.filter(effect =>
      ["spell", "chain", "beam", "burst", "ring", "slash", "secondary"].includes(effect.type)
    );
    const activeCasts = (game.actors || []).filter(actor =>
      actor.alive && actor.cast
    ).length;

    // A few simultaneous effects are normal in 3v3. Compression begins only
    // once the screen is genuinely busy.
    const globalLoad = activeVisuals.length + activeCasts * .65;
    const globalDensity = clamp01((globalLoad - 3.2) / 7.2);

    // Quiet ambient haze/particles during burst windows so combat silhouettes
    // gain contrast without dimming the spell cores themselves.
    if (this.atmosphere) {
      const quiet = 1 - globalDensity * .28;
      if (this.atmosphere.particleGlow) {
        this.atmosphere.particleGlow.alpha *= quiet;
      }
      if (this.atmosphere.particleCore) {
        this.atmosphere.particleCore.alpha *= 1 - globalDensity * .14;
      }
      if (this.atmosphere.ashDust) {
        this.atmosphere.ashDust.alpha *= 1 - globalDensity * .20;
      }
      if (this.atmosphere.hazeVeil) {
        this.atmosphere.hazeVeil.alpha *= 1 - globalDensity * .18;
      }
    }

    for (const actor of game.actors || []) {
      const view = this.actorViews.get(actor.id);
      if (!view) continue;

      let localLoad = 0;
      let actorHasChain = false;

      for (const effect of activeVisuals) {
        if (effect.sourceId === actor.id || effect.targetId === actor.id) {
          localLoad += 1;
          continue;
        }

        if (
          effect.type === "chain"
          && Array.isArray(effect.actorIds)
          && effect.actorIds.includes(actor.id)
        ) {
          localLoad += 1;
          actorHasChain = true;
        }
      }

      const localDensity = clamp01((localLoad - 1.5) / 4.5);
      const isPlayer = actor.id === game.player?.id;
      const selected = actor.id === game.player?.targetId;
      const hasCc = (actor.effects || []).some(effect =>
        effect.remainingMs > 0
        && ["stun", "fear", "incapacitate", "root", "schoolLock"].includes(effect.kind)
      );

      const focusLift = isPlayer || selected ? .055 : 0;
      const ccLift = hasCc ? .035 : 0;

      // Glow is what turns into visual fog first. Preserve sharp geometry.
      view.combatVfx2GlowFx.alpha = Math.max(
        .72,
        .98 - globalDensity * .13 - localDensity * .06 + focusLift,
      );
      view.projectileVfx2GlowFx.alpha = Math.max(
        .78,
        1 - globalDensity * .11 - localDensity * .05 + focusLift,
      );
      view.spellPolishGlowFx.alpha = Math.max(
        .66,
        .90 - globalDensity * .13 - localDensity * .055 + focusLift,
      );
      view.chainGlowFx.alpha = Math.max(
        .78,
        1 - globalDensity * .09 - localDensity * .04
          + (actorHasChain ? .04 : 0)
          + focusLift,
      );

      const coreCompression = globalDensity * .025 + localDensity * .015;
      const coreAlpha = Math.min(
        1,
        Math.max(.95, 1 - coreCompression + focusLift + ccLift),
      );

      view.combatVfx2CoreFx.alpha = coreAlpha;
      view.projectileVfx2CoreFx.alpha = coreAlpha;
      view.spellPolishCoreFx.alpha = Math.max(.94, coreAlpha - .015);
      view.chainFx.alpha = Math.max(.96, coreAlpha);
      view.chainSparkFx.alpha = Math.max(.95, coreAlpha - .01);

      // Generic primitives are a little hotter too, but still yield first when
      // a full 3v3 burst window fills the screen.
      const primitiveAlpha = Math.max(
        .78,
        1 - globalDensity * .11 - localDensity * .05,
      );
      view.burstFx.alpha = primitiveAlpha;
      view.slashFx.alpha = primitiveAlpha;
      view.ringFx.alpha = primitiveAlpha;
      view.beamFx.alpha = Math.max(.74, primitiveAlpha);

      // Gameplay readability stays strong regardless of effect density.
      view.castWindupFx.alpha = Math.min(1, .96 + focusLift + ccLift);
      view.actorMotionFx.alpha = Math.min(1, .95 + focusLift);
      view.stateWorldGlowFx.alpha = 1;
      view.stateWorldFx.alpha = 1;
      view.secondaryGlowFx.alpha = 1;
      view.secondaryFx.alpha = 1;
      view.ccWorldGlowFx.alpha = 1;
      view.ccWorldFx.alpha = 1;
      view.ccBadge.alpha = 1;

      view.name.alpha = 1;
      view.healthBg.alpha = 1;
      view.healthFill.alpha = 1;
      view.resourceBg.alpha = 1;
      view.resourceFill.alpha = 1;
      view.castBg.alpha = 1;
      view.castFill.alpha = 1;
      view.castBorder.alpha = 1;
    }
  }

  setEnvironmentOcclusion(polygons = []) {
    this.environmentOcclusionPolygons = Array.isArray(polygons)
      ? polygons
      : [];
  }

  updateEnvironmentOcclusion(game) {
    const polygons = this.environmentOcclusionPolygons || [];

    const pointInPolygon = (point, points) => {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].x;
        const yi = points[i].y;
        const xj = points[j].x;
        const yj = points[j].y;

        const intersects =
          ((yi > point.y) !== (yj > point.y))
          && (
            point.x
            < (xj - xi) * (point.y - yi) / Math.max(.0001, yj - yi) + xi
          );

        if (intersects) inside = !inside;
      }
      return inside;
    };

    const bodySamplesFor = actor => {
      const r = Math.max(8, actor.radius * .78);
      return [
        { x: actor.x, y: actor.y },
        { x: actor.x - r, y: actor.y },
        { x: actor.x + r, y: actor.y },
        { x: actor.x, y: actor.y - r },
        { x: actor.x, y: actor.y + r },
      ];
    };

    for (const actor of game.actors || []) {
      const view = this.actorViews.get(actor.id);
      if (!view) continue;

      // The old prototype painted a clipped brown obstacle polygon over the
      // actor. It proved the depth ordering, but read like a rectangular patch.
      // Keep that layer disabled and use a soft body fade instead.
      if (view.depthOcclusionFx) {
        view.depthOcclusionFx.clear();
        view.depthOcclusionFx.visible = false;
      }

      if (!actor.alive || !polygons.length) {
        view.body.alpha = 1;
        if (view.motionGhostA) view.motionGhostA.alpha *= 1;
        if (view.motionGhostB) view.motionGhostB.alpha *= 1;
        view.ring.alpha = 1;
        continue;
      }

      const samples = bodySamplesFor(actor);
      let strongestCover = 0;

      for (const polygon of polygons) {
        if (
          Number.isFinite(polygon?.depthY)
          && actor.y >= polygon.depthY
        ) continue;

        const points = (polygon?.points || []).filter(point =>
          Number.isFinite(point?.x) && Number.isFinite(point?.y)
        );
        if (points.length < 3) continue;

        let covered = 0;
        for (const sample of samples) {
          if (pointInPolygon(sample, points)) covered += 1;
        }
        strongestCover = Math.max(strongestCover, covered / samples.length);
      }

      if (strongestCover <= 0) {
        view.body.alpha = 1;
        view.ring.alpha = 1;
        continue;
      }

      // Keep the unit visible enough to read position/class, but clearly behind
      // stone. More of the body covered => slightly stronger fade.
      const bodyAlpha = 0.62 - strongestCover * 0.16;
      view.body.alpha = Math.max(.42, bodyAlpha);
      view.ring.alpha = Math.max(.46, .72 - strongestCover * .18);

      // World-space spell/body effects should also recede a little while
      // gameplay UI (name, bars, cast, CC, target indicators) stays untouched.
      const worldFxAlpha = 1;
      view.actorMotionFx.alpha *= worldFxAlpha;
      view.stateWorldGlowFx.alpha *= worldFxAlpha;
      view.stateWorldFx.alpha *= worldFxAlpha;
      view.secondaryGlowFx.alpha *= worldFxAlpha;
      view.secondaryFx.alpha *= worldFxAlpha;
      view.ccWorldGlowFx.alpha *= worldFxAlpha;
      view.ccWorldFx.alpha *= worldFxAlpha;
      view.castWindupFx.alpha *= worldFxAlpha;
      view.burstFx.alpha *= worldFxAlpha;
      view.slashFx.alpha *= worldFxAlpha;
      view.ringFx.alpha *= worldFxAlpha;
      view.beamFx.alpha *= worldFxAlpha;
      view.chainGlowFx.alpha *= worldFxAlpha;
      view.chainFx.alpha *= worldFxAlpha;
      view.chainSparkFx.alpha *= worldFxAlpha;
      view.priestHealSpellFx.alpha *= worldFxAlpha;
      view.priestDruidSpellFx.alpha *= worldFxAlpha;
      view.paladinDkSpellFx.alpha *= worldFxAlpha;
      view.warriorRogueSpellFx.alpha *= worldFxAlpha;
      view.commonCasterSpellFx.alpha *= worldFxAlpha;
      view.combatVfx2GlowFx.alpha *= worldFxAlpha;
      view.combatVfx2CoreFx.alpha *= worldFxAlpha;
      view.projectileVfx2GlowFx.alpha *= worldFxAlpha;
      view.projectileVfx2CoreFx.alpha *= worldFxAlpha;
      view.spellPolishGlowFx.alpha *= worldFxAlpha;
      view.spellPolishCoreFx.alpha *= worldFxAlpha;
    }
  }

  updateNativeFloatingCombatText(game) {
    const layer = this.combatTextLayer;
    const { Container, Text } = this.PIXI || {};
    if (!layer || !Container || !Text) return;

    const clamp01 = value => Math.max(0, Math.min(1, value));
    const activeItems = new Set(game.floatingTexts || []);

    for (const [item, view] of this.combatTextViews) {
      if (activeItems.has(item)) continue;
      if (view.parent === layer) layer.removeChild(view);
      view.destroy({ children: true });
      this.combatTextViews.delete(item);
    }

    const colors = {
      damage: "#f05a50",
      "crit-damage": "#ff6b5d",
      heal: "#62d77a",
      "crit-heal": "#86eb91",
      avoid: "#d8c6a7",
      buff: "#d9b4e8",
      cc: "#ffd18a",
      debuff: "#e18f7e",
      burst: "#ffc06b",
    };

    for (const item of game.floatingTexts || []) {
      const total = Math.max(1, Number(item.totalMs) || 1);
      const remaining = Math.max(0, Number(item.remainingMs) || 0);
      const progress = clamp01(1 - remaining / total);
      const fadeIn = clamp01(progress / .08);
      const fadeOut = clamp01(remaining / 220);
      const alpha = Math.min(fadeIn, fadeOut);
      const isCrit =
        item.type === "crit-damage"
        || item.type === "crit-heal";
      const isDamage =
        item.type === "damage"
        || item.type === "crit-damage";
      const isHeal =
        item.type === "heal"
        || item.type === "crit-heal";

      let view = this.combatTextViews.get(item);
      if (!view) {
        const container = new Container();
        container.label = "combat-text:" + (item.type || "text");

        const fill = colors[item.type] || "#f1e8d8";
        const baseText = new Text({
          text: String(item.text ?? ""),
          style: {
            fontFamily: "system-ui",
            fontSize: isCrit ? 21 : 17,
            fontWeight: isCrit ? "950" : "850",
            fill,
            stroke: {
              color: "#130a08",
              width: isCrit ? 4.5 : 3.5,
            },
          },
        });
        baseText.anchor.set(.5);
        container.addChild(baseText);

        // Canvas had a very thin white inner edge on damage/heal crits.
        // Keep that extra snap without adding glow or blur.
        if (isCrit && (isDamage || isHeal)) {
          const accentText = new Text({
            text: String(item.text ?? ""),
            style: {
              fontFamily: "system-ui",
              fontSize: 21,
              fontWeight: "950",
              fill,
              stroke: {
                color: "#ffffff",
                width: 1,
              },
            },
          });
          accentText.anchor.set(.5);
          accentText.alpha = .36;
          container.addChild(accentText);
        }

        layer.addChild(container);
        view = container;
        this.combatTextViews.set(item,view);
      }

      let scale = 1;
      if (isCrit) {
        const popProgress = clamp01(progress / .22);
        scale = popProgress < .42
          ? 1 + (popProgress / .42) * .42
          : 1.42 - ((popProgress - .42) / .58) * .42;
      }

      const rise = isCrit ? 34 : 28;
      view.position.set(
        Number(item.x) || 0,
        (Number(item.y) || 0) - progress * rise,
      );
      view.scale.set(scale);
      view.alpha = alpha;
      view.visible = alpha > .001;
    }

    // Actor roots can be created after this layer. Keep combat text on top
    // without stage filters or z-index sorting.
    const children = this.app?.stage?.children || [];
    if (
      this.app?.stage
      && children[children.length - 1] !== layer
    ) {
      this.app.stage.addChild(layer);
    }
  }

  render(game) {
    if (!this.ready || !this.app) return;

    if (game.arena?.id !== this.renderedArenaId && !this.arenaBuildPromise) {
      this.arenaBuildPromise = this.rebuildArena(game.arena)
        .catch(error => console.error("[Pixi preview] arena rebuild failed", error))
        .finally(() => {
          this.arenaBuildPromise = null;
        });
    }

    this.updateHeatShimmer(game);
    this.updateAtmosphere(game);

    const livingIds = new Set(game.actors.map(actor => actor.id));

    for (const [id, view] of this.actorViews) {
      if (livingIds.has(id)) continue;
      this.app.stage.removeChild(view.root);
      view.root.destroy({ children: true });
      this.actorViews.delete(id);
    }

    for (const actor of game.actors) {
      let view = this.actorViews.get(actor.id);
      const nextSignature = actorVisualSignature(actor);

      // Actor ids are role/slot based and survive roster rerolls. If a slot
      // changes from Mage to Shaman (or any other visual identity change),
      // the old Pixi sprite must not be reused.
      if (view && view.visualSignature !== nextSignature) {
        this.app.stage.removeChild(view.root);
        view.root.destroy({ children: true });
        this.actorViews.delete(actor.id);
        view = null;
      }

      view = view || this.createActorView(actor);
      this.updateActorView(view, actor, game);
    }

    this.updateActorMotionV2(game);
    this.updatePersistentCombatStateVfx(game);
    this.updateNativeSecondaryCombatVfx(game);
    this.updatePersistentCrowdControlVfx(game);
    this.updateCrowdControlBadges(game);
    this.updateNativeCastWindupVfx(game);
    this.updateNativeBurstVfx(game);
    this.updateNativeSlashVfx(game);
    this.updateNativeRingVfx(game);
    this.updateNativeBeamVfx(game);
    this.updateNativeChainVfx(game);
    this.updateNativePriestHealSpellVfx(game);
    this.updateNativePriestDruidSpellVfx(game);
    this.updateNativePaladinDkSpellVfx(game);
    this.updateNativeWarriorRogueSpellVfx(game);
    this.updateNativeCommonCasterSpellVfx(game);
    this.updateNativeCombatVfx2(game);
    this.updateNativeProjectileVfx2(game);
    this.updateNativeSpellAnimationPolish(game);
    this.updateNativeRangedShowcaseVfx(game);
    this.updateCombatReadability(game);
    this.updateEnvironmentOcclusion(game);
    this.updateNativeFloatingCombatText(game);

    this.app.render();
  }

  destroy() {
    this.ready = false;
    this.destroyHeatShimmer();
    this.destroyAtmosphere();

    this.combatTextViews.clear();
    this.combatTextLayer = null;
    this.environmentOcclusionPolygons = [];
    this.badge?.remove();
    this.badge = null;

    if (this.inputCanvas) {
      this.inputCanvas.style.background = "";
      this.inputCanvas.style.zIndex = "";
    }

    for (const texture of this.ownedIconTextures) {
      texture.destroy?.(true);
    }
    this.ownedIconTextures.clear();
    this.iconTextures.clear();

    if (this.app?.renderer) {
      try {
        this.app.destroy({ removeView: true }, { children: true, texture: false });
      } catch (error) {
        console.warn("[Pixi preview] cleanup after failed init was partial", error);
        this.view?.remove();
      }
      this.app = null;
    } else {
      this.view?.remove();
      this.app = null;
    }

    this.view = null;
  }
}
