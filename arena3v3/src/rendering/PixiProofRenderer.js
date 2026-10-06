import { GAME_HEIGHT, GAME_WIDTH } from "../core/constants.js";
import { classColorFor } from "../content/classes/classColors.js";
import { classIconUrlFor } from "./ClassIconRegistry.js";
import { castBarPaletteFor } from "./CastPalette.js?v=20260928-focusrestyle1";
import { TALENT_TREE_REGISTRY } from "../content/talents/registry.js?v=20260928-healinghp1";
import { drawGrandRingEnvironment } from "./GrandRingEnvironment.js?v=20261001-grandring7";
import { drawWindscarEnvironment } from "./WindscarEnvironment.js?v=20261001-windscar2";

const PIXI_MODULE_URL = "https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.mjs";
// A/B test: keep world movement, but disable the Living Ring's walk bob/squash.
// Cast, melee, hit, CC and spell reactions remain enabled.
const LIVING_RING_WALK_MOTION_ENABLED = false;
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

function boostRingColor(color, saturation = 1.18, brightness = 1.10) {
  const value = Number(color) || 0xffffff;
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;
  const gray = (r + g + b) / 3;

  const channel = input => Math.max(
    0,
    Math.min(
      255,
      Math.round((gray + (input - gray) * saturation) * brightness + 4),
    ),
  );

  return (channel(r) << 16) | (channel(g) << 8) | channel(b);
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
  const teamColor = actor.team === "friendly" ? 0x60e58c : 0xef6868;
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
    // Melee should feel like the ring itself commits to the strike: a much
    // stronger forward spear/stretch, compressed rear edge and tighter sides.
    forwardStretch = .14 + intensity * .16;
    rearCompress = .045 + intensity * .020;
    sideCompress = .050 + intensity * .040;
  } else if (mode === "charge" || mode === "shadowstep") {
    forwardStretch = .11 + intensity * .11;
    rearCompress = .04;
    sideCompress = .045;
  } else if (mode === "heal") {
    // Healer 2.0: the ring visibly opens/blooms when a heal is released.
    radialWave = .030 + intensity * .045;
    sideCompress = .006;
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
      const classWave =
        actor.classId === "priest" ? 6
        : actor.classId === "paladin" ? 4
        : 5;
      const speed =
        actor.classId === "druid" ? .014
        : actor.classId === "paladin" ? .009
        : .011;
      localRadius *=
        1
        + Math.sin(a * classWave + nowMs * speed) * radialWave * .62
        + Math.cos(a * 2 - nowMs * speed * .45) * radialWave * .16;
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
    width: glow ? 9.2 : 2.35,
    alpha: glow ? .42 : .94,
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

function talentAllocationSnapshot(actor, game, tree) {
  const ranks = {};
  let branchPoints = null;

  if (actor?.control === "player" && typeof game?.talentStatus === "function") {
    const status = game.talentStatus();
    branchPoints = status?.branchPoints || null;
    Object.assign(ranks, status?.allocations || {});
  }

  if (!branchPoints) {
    const progression =
      actor?.config?.aiProgression
      || actor?.config?.enemyProgression
      || null;

    branchPoints = progression?.branchPoints || {};

    for (const entry of progression?.entries || []) {
      if (!entry?.id) continue;
      ranks[entry.id] = Math.max(0, Number(entry.rank) || 0);
    }
  }

  if (!branchPoints) branchPoints = {};

  // Reconstruct branch totals if a future progression snapshot contains
  // allocations but omits branchPoints.
  if (tree?.branches?.length && Object.keys(branchPoints).length === 0) {
    branchPoints = {};
    for (const branch of tree.branches) {
      branchPoints[branch.id] = (branch.talents || []).reduce(
        (sum, talent) => sum + Math.max(0, Number(ranks[talent.id]) || 0),
        0,
      );
    }
  }

  return { branchPoints, ranks };
}

function mageFrostfireTalentColor(ranks, fallback) {
  const fireWeight =
    (Number(ranks["mage-burning-ice"]) || 0)
    + (Number(ranks["mage-hot-streak"]) || 0) * 1.6
    + (Number(ranks["mage-elemental-fusion"]) || 0) * 1.35;

  const frostWeight =
    (Number(ranks["mage-shatter"]) || 0)
    + (Number(ranks["mage-frostbite"]) || 0)
    + (Number(ranks["mage-piercing-cold"]) || 0);

  if (fireWeight >= Math.max(2.5, frostWeight * .72)) return 0xf1845f;
  return fallback;
}

function talentBranchVisuals(actor, game) {
  const tree = TALENT_TREE_REGISTRY[actor?.classId];
  if (!tree?.branches?.length) return [];

  const { branchPoints, ranks } = talentAllocationSnapshot(actor, game, tree);

  const spent = tree.branches.reduce(
    (sum, branch) => sum + Math.max(0, Number(branchPoints?.[branch.id]) || 0),
    0,
  );

  return tree.branches.map((branch, index) => {
    const points = Math.max(0, Number(branchPoints?.[branch.id]) || 0);
    const fallback = hexNumber(
      branch.accent,
      hexNumber(classColorFor(actor), 0xffffff),
    );

    let color = fallback;
    if (actor?.classId === "mage" && branch.id === "frostfire") {
      color = mageFrostfireTalentColor(ranks, fallback);
    }
    color = boostRingColor(color, 1.24, 1.12);

    return {
      id: branch.id,
      name: branch.name,
      index,
      points,
      share: spent > 0 ? points / spent : 0,
      development: Math.max(0, Math.min(1, points / 10)),
      color,
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

function drawIdentityNode(graphics, angle, radius, size, color, alpha) {
  graphics.circle(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    size,
  ).fill({ color, alpha });
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
  const base = boostRingColor(hexNumber(classColorFor(actor), 0xffffff), 1.20, 1.12);
  const mode = state?.mode || "idle";
  const intensity = Math.max(0, Math.min(1, Number(state?.intensity) || 0));
  const progress = Math.max(0, Math.min(1, Number(state?.progress) || 0));
  const t = (Number(nowMs) || 0) * .001;
  const seed = String(actor.id || "")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const phase = seed * .021;

  const ringRadius = Math.max(8, Number(actor.radius) || 18) + 3;
  const motifR = Math.max(9, ringRadius - 5.0);
  const innerR = Math.max(7, motifR - 3.4);
  const breathe = .5 + .5 * Math.sin(t * 1.35 + phase);

  const actionMode = [
    "projectile",
    "spell",
    "melee",
    "charge",
    "shadowstep",
    "hit",
  ].includes(mode);
  const softActionMode = ["heal", "defensive", "control"].includes(mode);
  const combatFade = actionMode ? .46 : softActionMode ? .62 : 1;

  const idleAlpha = .50 + breathe * .10;
  const moveAlpha = .54 + intensity * .10;
  const castAlpha = .62 + progress * .18;
  const rawAlpha =
    mode === "cast"
      ? castAlpha
      : mode === "idle"
        ? idleAlpha
        : moveAlpha;
  const alpha = Math.min(.88, rawAlpha * combatFade);

  graphics.visible = true;

  // Every class now has a real orbit instead of static decorations.
  // The direction is deterministic per actor so a team does not look like one
  // synchronized HUD animation.
  const orbitDirection = seed % 2 === 0 ? 1 : -1;
  // Deliberately fast enough to read as an active magical orbit at gameplay
  // scale. Previous values were so slow that the pattern still looked static.
  const universalOrbit =
    orbitDirection * t * (.82 + (seed % 4) * .045)
    + phase * .20;

  let motifAngle = universalOrbit;
  if (classId === "mage") {
    motifAngle = universalOrbit * 1.16;
  } else if (classId === "warlock") {
    motifAngle = universalOrbit * .94 + Math.sin(t * .72 + phase) * .07;
  } else if (classId === "druid") {
    motifAngle = universalOrbit * .86 + Math.sin(t * .58 + phase) * .09;
  } else if (classId === "shaman") {
    motifAngle = universalOrbit * 1.02;
  } else if (classId === "paladin") {
    motifAngle = universalOrbit * .84;
  } else if (classId === "rogue") {
    motifAngle = universalOrbit * 1.24;
  } else if (classId === "death-knight") {
    motifAngle = universalOrbit * .90;
  } else if (classId === "priest") {
    motifAngle = universalOrbit * .88;
  } else if (classId === "warrior") {
    motifAngle = universalOrbit * .92;
  }

  const arc = (
    radius,
    center,
    halfWidth,
    width = 1.8,
    a = alpha,
    color = base,
    segments = 8,
  ) => {
    strokeLivingArc(
      graphics,
      radius,
      center - halfWidth,
      center + halfWidth,
      { color, width, alpha: a },
      segments,
    );
  };

  // Fewer, larger shapes make the class readable at actual arena scale.
  // Everything stays in the inner band so the center is still available for
  // melee swings, impact flashes and spell travel.
  if (classId === "priest") {
    const haloPulse = 1 + (breathe - .5) * .025;
    for (let i = 0; i < 3; i += 1) {
      const a = motifAngle - Math.PI / 2 + i * Math.PI * 2 / 3;
      arc(
        motifR * haloPulse,
        a,
        .44,
        2.0,
        alpha,
        base,
        9,
      );
      drawIdentityNode(
        graphics,
        a + .48,
        innerR,
        .95,
        base,
        alpha * .78,
      );
    }
  } else if (classId === "mage") {
    for (let i = 0; i < 4; i += 1) {
      const a = motifAngle + Math.PI / 4 + i * Math.PI / 2;
      arc(motifR, a, .34, 1.9, alpha, base, 8);
      arc(
        innerR,
        a + .14,
        .16,
        1.15,
        alpha * .62,
        base,
        5,
      );
    }
  } else if (classId === "warlock") {
    for (let i = 0; i < 3; i += 1) {
      const a = motifAngle - .35 + i * Math.PI * 2 / 3;
      arc(
        motifR - (i === 1 ? .7 : 0),
        a,
        .43,
        2.05,
        alpha,
        base,
        8,
      );
      drawIdentityTick(
        graphics,
        a + .37,
        innerR - .3,
        motifR - .6,
        { color: base, width: 1.35, alpha: alpha * .62 },
      );
    }
  } else if (classId === "druid") {
    const growth = 1 + (breathe - .5) * .055;
    arc(
      motifR * growth,
      motifAngle + .18,
      .88,
      2.0,
      alpha,
      base,
      12,
    );
    arc(
      motifR * growth,
      motifAngle + Math.PI + .18,
      .88,
      2.0,
      alpha * .88,
      base,
      12,
    );
    arc(
      innerR,
      motifAngle + 1.15,
      .52,
      1.15,
      alpha * .58,
      base,
      8,
    );
  } else if (classId === "shaman") {
    const activeNode = Math.floor(t * 1.45 + phase) % 4;
    for (let i = 0; i < 4; i += 1) {
      const a = motifAngle - Math.PI / 2 + i * Math.PI / 2;
      const nodeBoost = i === activeNode ? 1 : .72;
      arc(
        motifR,
        a,
        .31,
        1.9,
        alpha * (.84 + nodeBoost * .16),
        base,
        7,
      );
      drawIdentityNode(
        graphics,
        a,
        innerR,
        i === activeNode ? 1.25 : .88,
        base,
        alpha * nodeBoost,
      );
    }
  } else if (classId === "paladin") {
    for (let i = 0; i < 4; i += 1) {
      const a = motifAngle + i * Math.PI / 2;
      arc(motifR, a, .39, 2.15, alpha, base, 8);
      arc(
        innerR,
        a + Math.PI / 4,
        .18,
        1.05,
        alpha * .50,
        base,
        5,
      );
    }
  } else if (classId === "warrior") {
    const facing = Math.atan2(
      Number(state?.dirY) || Math.sin(actor.facing || 0),
      Number(state?.dirX) || Math.cos(actor.facing || 0),
    ) + motifAngle;
    arc(motifR, facing, .72, 2.5, alpha, base, 11);
    arc(
      motifR - 1.7,
      facing + Math.PI,
      .38,
      1.65,
      alpha * .58,
      base,
      7,
    );
    for (const offset of [-.48, .48]) {
      drawIdentityTick(
        graphics,
        facing + offset,
        innerR,
        motifR - .4,
        { color: base, width: 1.45, alpha: alpha * .64 },
      );
    }
  } else if (classId === "rogue") {
    const facing = Math.atan2(
      Number(state?.dirY) || Math.sin(actor.facing || 0),
      Number(state?.dirX) || Math.cos(actor.facing || 0),
    );
    const spin = motifAngle + facing;
    arc(motifR, spin + .46, .66, 2.0, alpha, base, 10);
    arc(
      motifR - 1.8,
      spin + Math.PI - .46,
      .66,
      1.65,
      alpha * .76,
      base,
      10,
    );
    drawIdentityNode(
      graphics,
      spin + .46,
      innerR,
      .82,
      base,
      alpha * .66,
    );
  } else if (classId === "death-knight") {
    for (let i = 0; i < 3; i += 1) {
      const a = motifAngle - Math.PI / 2 + i * Math.PI * 2 / 3;
      arc(
        motifR - (i % 2) * .65,
        a,
        .43,
        2.05,
        alpha,
        base,
        8,
      );
      for (const offset of [-.18, .18]) {
        drawIdentityTick(
          graphics,
          a + offset,
          innerR - .5,
          motifR - .7,
          { color: base, width: 1.1, alpha: alpha * .54 },
        );
      }
    }
  } else {
    for (let i = 0; i < 3; i += 1) {
      arc(motifR, motifAngle + i * Math.PI * 2 / 3, .38, 1.8, alpha);
    }
  }

  // Talent identity is now a real visual layer rather than tiny decorative
  // pips. Each invested branch occupies roughly 20-35% of the inner ring.
  // A hybrid build therefore reads as two distinct colors immediately.
  const branches = talentBranchVisuals(actor, game);
  const activeBranches = branches.filter(branch => branch.points > 0);

  const talentOrbit =
    -orbitDirection * t * (.56 + (seed % 3) * .038)
    + phase * .10;

  for (const branch of activeBranches) {
    const branchIndex = branch.index % 2;
    const baseAngle = (branchIndex === 0 ? -2.72 : .34) + talentOrbit;
    const drift = Math.sin(t * .18 + phase + branchIndex * 1.9) * .025;
    const span =
      1.05
      + branch.share * .80
      + branch.development * .25;
    const rr = ringRadius - 1.85 - branchIndex * 2.25;
    const branchAlpha = Math.min(
      .72,
      (
        .46
        + branch.development * .34
        + (mode === "cast" ? progress * .12 : 0)
      ) * combatFade,
    );
    const width = 2.05 + branch.development * .95;
    const from = baseAngle + drift;
    const to = from + span;

    // Soft under-stroke gives the build color presence without turning it
    // into a neon HUD element.
    strokeLivingArc(
      graphics,
      rr,
      from,
      to,
      {
        color: branch.color,
        width: width + 2.8,
        alpha: branchAlpha * .26,
      },
      12,
    );
    strokeLivingArc(
      graphics,
      rr,
      from,
      to,
      {
        color: branch.color,
        width,
        alpha: branchAlpha,
      },
      12,
    );

    drawIdentityNode(
      graphics,
      to,
      rr,
      .95 + branch.development * .35,
      branch.color,
      Math.min(.78, branchAlpha + .12),
    );
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
  const teamColor = actor.team === "friendly" ? 0x60e58c : 0xef6868;
  const brightTeam = actor.team === "friendly" ? 0xb2ffd0 : 0xffb0aa;
  const main = boostRingColor(profile?.main ?? teamColor, 1.18, 1.10);
  const core = boostRingColor(profile?.core ?? brightTeam, 1.16, 1.12);
  const accent = boostRingColor(profile?.accent ?? main, 1.20, 1.10);
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
    // Keep team ownership readable, but let the class/talent layer do the
    // interesting work. One restrained glint is enough outside the body.
    const idPhase = String(actor.id || "")
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) * .017;
    const breathe = .5 + .5 * Math.sin(t * 1.55 + idPhase);
    const a = t * .36 + idPhase;

    strokeLivingArc(
      graphics,
      radius + 1.25,
      a - .28,
      a + .28,
      {
        color: brightTeam,
        width: 1.65,
        alpha: .22 + .14 * breathe,
      },
      7,
    );
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
    // Melee 2.0: the living circle becomes part of the attack. Layered
    // crescents travel around the striking side while a rear wake peels away.
    const swing = Math.sin(progress*Math.PI);
    const snap = 1-Math.min(1,progress/.58);
    const sweep = angle + (progress-.5) * 1.05;

    strokeLivingArc(graphics,radius+2.4,sweep-1.12,sweep+.96,{
      color:core,width:3.25,alpha:.34+.46*swing,
    },12);
    strokeLivingArc(graphics,radius+7.0,sweep-.82,sweep+.70,{
      color:main,width:2.10,alpha:.20+.38*swing,
    },10);
    strokeLivingArc(graphics,radius+11.0,sweep-.48,sweep+.42,{
      color:accent,width:1.35,alpha:.12+.28*swing,
    },8);

    const rear=sweep+Math.PI;
    strokeLivingArc(graphics,radius+5.0+progress*5,rear-.66,rear+.66,{
      color:teamColor,width:1.35,alpha:snap*.24,
    },8);

    if (state?.heavy) {
      strokeLivingArc(graphics,radius+14.0,sweep-.58,sweep+.52,{
        color:core,width:1.45,alpha:.10+.26*swing,
      },8);
    }
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
    const classId=actor.classId || "";
    const release=Math.sin(progress*Math.PI);
    const bloom=1-Math.min(1,progress/.88);

    if(classId==="priest"){
      const spin=t*.95;
      for(let i=0;i<3;i++){
        const a=spin+i*Math.PI*2/3;
        strokeLivingArc(
          graphics,
          radius+4+i*2+release*3,
          a-.58,
          a+.58,
          {
            color:i===1?core:(i===2?accent:main),
            width:i===1?2.35:1.75,
            alpha:.28+release*(i===1?.42:.30),
          },
          9,
        );
      }
      graphics.circle(0,0,radius+10+release*5).stroke({
        color:core,width:1.25,alpha:bloom*.18,
      });
      return;
    }

    if(classId==="druid"){
      const spin=t*1.18;
      for(let i=0;i<5;i++){
        const a=spin+i*Math.PI*2/5+(i%2?progress*.55:-progress*.35);
        strokeLivingArc(
          graphics,
          radius+4+(i%2)*4+release*4,
          a-.34,
          a+.34,
          {
            color:i%3===0?core:(i%2?main:accent),
            width:1.55+(i%3===0?.55:0),
            alpha:.24+release*.34,
          },
          7,
        );
      }
      return;
    }

    if(classId==="paladin"){
      const spin=t*.48+progress*.18;
      for(let i=0;i<4;i++){
        const a=spin+i*Math.PI/2;
        strokeLivingArc(
          graphics,
          radius+4+release*3,
          a-.30,
          a+.30,
          {
            color:i%2?core:main,
            width:2.2,
            alpha:.30+release*.42,
          },
          6,
        );
        const inner=radius+1;
        const outer=radius+10+release*7;
        graphics
          .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
          .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
          .stroke({
            color:i%2?main:core,
            width:1.45,
            alpha:.22+release*.34,
          });
      }
      graphics.circle(0,0,radius+12+release*4).stroke({
        color:accent,width:1.2,alpha:bloom*.16,
      });
      return;
    }

    const a=t*.75;
    strokeLivingArc(graphics,radius+4,a-.82,a+.82,{
      color:main,width:1.8,alpha:.24+.24*intensity,
    },9);
    strokeLivingArc(graphics,radius+7,a+Math.PI-.58,a+Math.PI+.58,{
      color:core,width:1.35,alpha:.18+.18*intensity,
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
    "priest-renew": [0xffdf73, 0xfffff2, 0xcaa2f3],
    "priest-flash-heal": [0xffdc68, 0xffffff, 0xd7adff],
    "priest-greater-heal": [0xffe07a, 0xffffff, 0xe0bbff],
  };
  return colors[spellId] || colors["priest-flash-heal"];
}

function priestDruidSpellProfile(spellId) {
  const profiles = {
    "priest-pain-suppression": {
      kind: "holy-shield",
      main: 0xe6cc82,
      core: 0xffffe8,
      accent: 0x9b7ac5,
    },
    "priest-psychic-scream": {
      kind: "shadow-wave",
      main: 0x9a63d0,
      core: 0xead7ff,
      accent: 0x3d224f,
    },
    "priest-smite": {
      kind: "mind-implosion",
      main: 0xa05bd6,
      core: 0xf0ddff,
      accent: 0x4b245f,
    },
    "priest-holy-fire": {
      kind: "holy-sky",
      main: 0xf2bf57,
      core: 0xffffdd,
      accent: 0xe8753c,
    },

    "druid-rejuvenation": {
      kind: "leaf-hot",
      main: 0x66d97d,
      core: 0xefffc1,
      accent: 0x3e9d65,
    },
    "druid-swiftmend": {
      kind: "leaf-burst",
      main: 0x72e58a,
      core: 0xf7ffc6,
      accent: 0x45a76c,
    },
    "druid-regrowth": {
      kind: "regrowth",
      main: 0x65d77a,
      core: 0xf0ffb8,
      accent: 0x3d9a61,
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
      main: 0x73e28a,
      core: 0xf7ffc4,
      accent: 0x4aa96b,
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
      main: 0xffd14f, core: 0xffffff, accent: 0xff9b32,
    },
    "paladin-flash-light": {
      family: "paladin", kind: "flash-light",
      main: 0xffd866, core: 0xffffff, accent: 0xf6a13a,
    },
    "paladin-holy-light": {
      family: "paladin", kind: "holy-light",
      main: 0xffcf4d, core: 0xffffff, accent: 0xf08d2f,
    },
    "paladin-blessing": {
      family: "paladin", kind: "blessing",
      main: 0xe9c65e, core: 0xffffdc, accent: 0xa86c24,
    },
    "paladin-hammer": {
      family: "paladin", kind: "hammer",
      main: 0xf0bd43, core: 0xffffd0, accent: 0xc87524,
    },
    "paladin-word-of-glory": {
      family: "paladin", kind: "word-glory",
      main: 0xffdc5b, core: 0xffffff, accent: 0xffa23b,
    },
    "paladin-judgment": {
      family: "paladin", kind: "judgment",
      main: 0xf2b83f, core: 0xffffcf, accent: 0xd56f25,
    },

    "dk-fever": {
      family: "dk", kind: "fever",
      main: 0x63d8f4, core: 0xf0fdff, accent: 0x45618d,
    },
    "dk-death-strike": {
      family: "dk", kind: "death-strike",
      main: 0xe05b67, core: 0xffd7dc, accent: 0x6e2030,
    },
    "dk-obliterate": {
      family: "dk", kind: "obliterate",
      main: 0x55e2ff, core: 0xffffff, accent: 0x5877c9,
    },
    "dk-chains": {
      family: "dk", kind: "chains",
      main: 0x65d5f2, core: 0xf2fdff, accent: 0x466783,
    },
    "dk-mind-freeze": {
      family: "dk", kind: "mind-freeze",
      main: 0x59d4f2, core: 0xffffff, accent: 0x3e5777,
    },
    "dk-frost-strike": {
      family: "dk", kind: "frost-strike",
      main: 0x58e0ff, core: 0xffffff, accent: 0x5579c9,
    },
    "dk-rune-tap": {
      family: "dk", kind: "rune-tap",
      main: 0xc24350, core: 0xffccd2, accent: 0x591b28,
    },
  };
  return profiles[spellId] || null;
}

function warriorRogueSpellProfile(spellId) {
  const profiles = {
    "warrior-rend": {
      family: "warrior", kind: "rend",
      main: 0xd04f45, core: 0xffc8ad, accent: 0x6f2428,
    },
    "warrior-mortal-strike": {
      family: "warrior", kind: "mortal",
      main: 0xd7794f, core: 0xffefd0, accent: 0x8c4536,
    },
    "warrior-slam": {
      family: "warrior", kind: "slam",
      main: 0xc99863, core: 0xffefd0, accent: 0x6d6256,
    },
    "warrior-charge": {
      family: "warrior", kind: "charge",
      main: 0xd5a66c, core: 0xffecc7, accent: 0x75695d,
    },
    "warrior-pummel": {
      family: "warrior", kind: "pummel",
      main: 0xc98b61, core: 0xffead1, accent: 0x795640,
    },
    "warrior-overpower": {
      family: "warrior", kind: "overpower",
      main: 0xe0a465, core: 0xfff2d4, accent: 0x9a633d,
    },
    "warrior-bloodthirst": {
      family: "warrior", kind: "bloodthirst",
      main: 0xd64b45, core: 0xffc2ae, accent: 0x721f25,
    },

    "rogue-garrote": {
      family: "rogue", kind: "garrote",
      main: 0xc65d58, core: 0xffcfc0, accent: 0x5d384f,
    },
    "rogue-sinister": {
      family: "rogue", kind: "sinister",
      main: 0xd2c36f, core: 0xfff3bd, accent: 0x5d4b71,
    },
    "rogue-eviscerate": {
      family: "rogue", kind: "eviscerate",
      main: 0xe1ca63, core: 0xfff6c8, accent: 0x65497a,
    },
    "rogue-kidney": {
      family: "rogue", kind: "kidney",
      main: 0xc39a62, core: 0xffe7b8, accent: 0x72538a,
    },
    "rogue-kick": {
      family: "rogue", kind: "kick",
      main: 0xcdb66a, core: 0xffefba, accent: 0x665177,
    },
    "rogue-mutilate": {
      family: "rogue", kind: "mutilate",
      main: 0xd2be67, core: 0xfff1b9, accent: 0x76518b,
    },
    "rogue-shadowstep": {
      family: "rogue", kind: "shadowstep",
      main: 0xa583c0, core: 0xe8d7f8, accent: 0x3c2d4a,
    },
  };
  return profiles[spellId] || null;
}

function commonCasterSpellProfile(spellId) {
  const profiles = {
    "mage-living-bomb": {
      kind: "mage-bomb",
      main: 0xff6a2a,
      core: 0xffffdc,
      accent: 0xb72820,
    },
    "mage-frostbolt": {
      kind: "frost",
      main: 0x54d9ff,
      core: 0xffffff,
      accent: 0x5b8dff,
      travelEnd: .55,
      size: 10,
    },
    "mage-pyroblast": {
      kind: "fire",
      main: 0xff6a22,
      core: 0xffffe8,
      accent: 0xff3426,
      travelEnd: .58,
      size: 13,
      heavy: true,
    },
    "mage-frost-nova": {
      kind: "frost-nova",
      main: 0x54d9ff,
      core: 0xffffff,
      accent: 0x5b8dff,
    },
    "mage-polymorph": {
      kind: "arcane-control",
      main: 0xb174ff,
      core: 0xfff5ff,
      accent: 0x6b3dca,
    },
    "mage-frostfire-bolt": {
      kind: "frostfire",
      main: 0x56dcff,
      core: 0xfffff0,
      accent: 0xff5b2e,
      travelEnd: .58,
      size: 13,
      heavy: true,
    },
    "mage-arcane-barrage": {
      kind: "arcane",
      main: 0xb36cff,
      core: 0xffffff,
      accent: 0x6d34d6,
      travelEnd: .50,
      size: 10,
    },

    "shaman-flame-shock": {
      kind: "flame-shock",
      main: 0xff6a32,
      core: 0xffffd8,
      accent: 0xb82e24,
    },
    "shaman-chain-lightning": {
      kind: "lightning-release",
      main: 0x4fdcff,
      core: 0xffffff,
      accent: 0x367fc7,
    },
    "shaman-lava-burst": {
      kind: "lava",
      main: 0xff6330,
      core: 0xffffcf,
      accent: 0x9b241d,
      travelEnd: .52,
      size: 14,
      heavy: true,
    },
    "shaman-hex": {
      kind: "nature-control",
      main: 0x6fcf9b,
      core: 0xf2ffe0,
      accent: 0x376b55,
    },
    "shaman-astral-shift": {
      kind: "astral",
      main: 0x63d8ef,
      core: 0xffffff,
      accent: 0x8b68d4,
    },
    "shaman-elemental-blast": {
      kind: "elemental",
      main: 0x55d9ff,
      core: 0xffffe8,
      accent: 0xff7a3c,
      travelEnd: .50,
      size: 12,
      heavy: true,
    },
    "shaman-stormstrike": {
      kind: "stormstrike",
      main: 0x4ddcff,
      core: 0xffffff,
      accent: 0xb88cff,
    },

    "warlock-corruption": {
      kind: "corruption",
      main: 0xa855d6,
      core: 0xefd7ff,
      accent: 0x32153f,
    },
    "warlock-shadow-bolt": {
      kind: "shadow",
      main: 0x9854d8,
      core: 0xf1ddff,
      accent: 0x24102f,
      travelEnd: .56,
      size: 11,
    },
    "warlock-chaos-bolt": {
      kind: "chaos",
      main: 0x66e05e,
      core: 0xf1ff9a,
      accent: 0x173521,
      travelEnd: .62,
      size: 16,
      heavy: true,
    },
    "warlock-resolve": {
      kind: "shadow-ward",
      main: 0x8558bd,
      core: 0xe5c9ff,
      accent: 0x251331,
    },
    "warlock-fear": {
      kind: "shadow-control",
      main: 0xa45cce,
      core: 0xf0d6ff,
      accent: 0x2a1236,
    },
    "warlock-drain-life": {
      kind: "drain",
      main: 0x9857c8,
      core: 0xefd6ff,
      accent: 0x25122f,
    },
    "warlock-conflagrate": {
      kind: "conflagrate",
      main: 0xff6a35,
      core: 0xffffc7,
      accent: 0x9d2b20,
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

const GROUND_LIGHT_PROJECTILES = new Set([
  ...PROJECTILE_VFX2_SPELLS,
  // Priest's current damage spell is presented as the Mind Blast-style
  // psychic release in the VFX layer even though the content id is "smite".
  "priest-smite",
]);

const GROUND_LIGHT_SKY_SPELLS = new Set([
  "priest-holy-fire",
  "druid-moonfire",
  "paladin-judgment",
]);

function projectileVfx2Spec(spellId) {
  const profile = spellPolishProfile(spellId);
  const specs = {
    "mage-frostbolt": {
      shape: "frost-spear",
      trailStyle: "snow",
      travelEnd: .48,
      size: 15,
      tail: 132,
      trailReach: .95,
      showcase: true,
    },
    "mage-pyroblast": {
      shape: "pyro",
      trailStyle: "fire",
      travelEnd: .52,
      size: 18,
      tail: 158,
      trailReach: .97,
      heavy: true,
      showcase: true,
    },
    "mage-frostfire-bolt": {
      shape: "frostfire",
      trailStyle: "frostfire",
      travelEnd: .49,
      size: 15,
      tail: 148,
      trailReach: .96,
      heavy: true,
      showcase: true,
    },
    "mage-arcane-barrage": {
      shape: "arcane",
      trailStyle: "arcane",
      travelEnd: .44,
      size: 12,
      tail: 118,
      trailReach: .94,
      showcase: true,
    },
    "shaman-lava-burst": {
      shape: "lava-rock",
      trailStyle: "magma",
      travelEnd: .52,
      size: 17,
      tail: 132,
      trailReach: .94,
      heavy: true,
      arc: 24,
      showcase: true,
    },
    "shaman-elemental-blast": {
      shape: "elemental",
      trailStyle: "elemental",
      travelEnd: .50,
      size: 14,
      tail: 138,
      trailReach: .96,
      heavy: true,
      showcase: true,
    },
    "warlock-shadow-bolt": {
      shape: "shadow",
      trailStyle: "void",
      travelEnd: .48,
      size: 13,
      tail: 122,
      trailReach: .94,
      showcase: true,
    },
    "warlock-chaos-bolt": {
      shape: "chaos",
      trailStyle: "fel",
      travelEnd: .52,
      size: 18,
      tail: 154,
      trailReach: .97,
      heavy: true,
      showcase: true,
    },
    "paladin-hammer": {
      shape: "hammer",
      trailStyle: "holy",
      travelEnd: .44,
      size: 15,
      tail: 78,
      trailReach: .80,
      showcase: true,
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

  // Clean Living Ring presentation pass:
  // preserve every arena/pillar coordinate exactly. Test a near-black arena
  // floor so Living Rings and spell colors carry more of the visual identity.
  const floor = ctx.createRadialGradient(640, 350, 90, 640, 350, 760);
  floor.addColorStop(0, "#11100f");
  floor.addColorStop(.58, "#0c0b0b");
  floor.addColorStop(1, "#070707");

  ctx.fillStyle = floor;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Very restrained neutral vignette/depth so the floor stays almost black
  // without becoming a completely flat void.
  const vignette = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  vignette.addColorStop(0, "rgba(255,255,255,.018)");
  vignette.addColorStop(.42, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,.16)");
  ctx.fillStyle = vignette;
  ctx.fillRect(
    arena.bounds.x,
    arena.bounds.y,
    arena.bounds.w,
    arena.bounds.h,
  );

  // Clean arena frame: same exact bounds, just thinner and less debug-like.
  ctx.save();
  ctx.strokeStyle = "rgba(122,82,52,.72)";
  ctx.lineWidth = 2;
  ctx.strokeRect(
    arena.bounds.x,
    arena.bounds.y,
    arena.bounds.w,
    arena.bounds.h,
  );

  ctx.strokeStyle = "rgba(198,139,84,.12)";
  ctx.lineWidth = 1;
  ctx.strokeRect(
    arena.bounds.x + 6,
    arena.bounds.y + 6,
    arena.bounds.w - 12,
    arena.bounds.h - 12,
  );
  ctx.restore();

  // Pillar geometry is intentionally untouched. Only materials/line weight are
  // cleaned up to match the new dark arena and brighter Living Ring VFX.
  for (const rect of arena.obstacles) {
    ctx.save();

    ctx.shadowColor = "rgba(0,0,0,.40)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    const pillarFill = ctx.createLinearGradient(
      rect.x,
      rect.y,
      rect.x,
      rect.y + rect.h,
    );
    pillarFill.addColorStop(0, "#3a291d");
    pillarFill.addColorStop(1, "#302219");

    roundedArenaRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    ctx.fillStyle = pillarFill;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(133,94,62,.82)";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    roundedArenaRect(
      ctx,
      rect.x + 9,
      rect.y + 9,
      rect.w - 18,
      rect.h - 18,
      10,
    );
    ctx.strokeStyle = "rgba(207,153,101,.13)";
    ctx.lineWidth = 1.25;
    ctx.stroke();

    // One subtle upper edge catches just enough light to define the obstacle
    // without bringing back the chunky old bevel.
    ctx.beginPath();
    ctx.moveTo(rect.x + 18, rect.y + 8);
    ctx.lineTo(rect.x + rect.w - 18, rect.y + 8);
    ctx.strokeStyle = "rgba(229,178,124,.08)";
    ctx.lineWidth = 1;
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

    // Spell ground-light projection sits underneath characters/rings so it
    // reads as illumination of the arena floor rather than another projectile
    // sprite. Each actor owns the lights cast by spells it launches.
    const projectileGroundGlowFx = new Graphics();
    projectileGroundGlowFx.visible = false;
    projectileGroundGlowFx.blendMode = "screen";
    projectileGroundGlowFx.filters = [
      new this.PIXI.BlurFilter({ strength: 15.0, quality: 1 }),
    ];
    root.addChild(projectileGroundGlowFx);

    const projectileGroundCoreFx = new Graphics();
    projectileGroundCoreFx.visible = false;
    projectileGroundCoreFx.blendMode = "screen";
    projectileGroundCoreFx.filters = [
      new this.PIXI.BlurFilter({ strength: 4.4, quality: 1 }),
    ];
    root.addChild(projectileGroundCoreFx);

    const shadow = new Graphics()
      .ellipse(0, actor.radius * .58, actor.radius * .92, actor.radius * .34)
      .fill({ color: 0x000000, alpha: .28 });
    root.addChild(shadow);

    const teamColor = actor.team === "friendly" ? 0x60e58c : 0xef6868;

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
        new this.PIXI.BlurFilter({ strength: 6.3, quality: 2 }),
      ];
    } else {
      ringGlow.visible = false;
    }
    root.addChild(ringGlow);

    const ring = new Graphics()
      .circle(0, 0, actor.radius + 3)
      .stroke({ color: teamColor, width: 2.35, alpha: .94 });
    root.addChild(ring);

    const classIdentityGlowFx = new Graphics();
    classIdentityGlowFx.visible = false;
    classIdentityGlowFx.blendMode = "screen";
    classIdentityGlowFx.alpha = .72;
    classIdentityGlowFx.filters = [
      new this.PIXI.BlurFilter({ strength: 4.6, quality: 1 }),
    ];
    root.addChild(classIdentityGlowFx);

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

    const castWindupGlowFx = new Graphics();
    castWindupGlowFx.visible = false;
    root.addChild(castWindupGlowFx);

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

    castWindupGlowFx.blendMode = "screen";
    castWindupGlowFx.filters = [
      new BlurFilter({ strength: 6.2, quality: 1 }),
    ];

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
      projectileGroundGlowFx,
      projectileGroundCoreFx,
      shadow,
      ringGlow,
      ring,
      classIdentityGlowFx,
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
      castWindupGlowFx,
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
          glow.ellipse(0,actor.radius*.56,actor.radius+17,8+pulse*3).stroke({
            color:profile.main,width:9,alpha:.10+.025*pulse
          });
          for(let i=0;i<7;i++){
            const a=-.42+i*Math.PI/6;
            const outer=actor.radius+16+(i%3)*5;
            glow
              .moveTo(Math.cos(a)*(actor.radius+3),actor.radius*.55)
              .lineTo(Math.cos(a)*outer,actor.radius*.55+Math.sin(a)*9)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:6,
                alpha:.055+.02*pulse
              });
            core
              .moveTo(Math.cos(a)*(actor.radius+3),actor.radius*.55)
              .lineTo(Math.cos(a)*outer,actor.radius*.55+Math.sin(a)*9)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:1.8+(i===3?.5:0),alpha:.50,
              });
          }
          core.ellipse(0,actor.radius*.56,actor.radius+10,5.5).stroke({
            color:profile.core,width:1.25,alpha:.30+.10*pulse
          });
        } else if(burst.spellId==="rogue-eviscerate"){
          for(let i=0;i<4;i++){
            const a=-1.02+i*.70+Math.sin(time*2.4+i)*.07;
            const rr=actor.radius+10+i*3;
            arc(glow,0,0,rr,a,a+.62,{
              color:i%2?profile.core:profile.main,
              width:7,alpha:.055+.018*pulse
            },7);
            arc(core,0,0,rr,a,a+.62,{
              color:i%2?profile.core:profile.main,
              width:1.7+(i===2?.4:0),alpha:.52,
            },7);
          }
          core.circle(0,0,actor.radius+6).stroke({
            color:profile.core,width:1.1,alpha:.26+.09*pulse
          });
        } else if(burst.spellId==="dk-obliterate"){
          glow.circle(0,0,actor.radius+17+pulse*4).stroke({
            color:profile.main,width:11,alpha:.11+.03*pulse
          });
          for(let i=0;i<10;i++){
            const a=i/10*Math.PI*2-time*.18;
            const inner=actor.radius+4;
            const outer=actor.radius+17+(i%3)*5+pulse*3;
            glow
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a+.07)*outer,Math.sin(a+.07)*outer)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:7,alpha:.055+.02*pulse
              });
            core
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a+.07)*outer,Math.sin(a+.07)*outer)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:1.7+(i%3===0?.55:0),alpha:.56,
              });
          }
          core.circle(0,0,actor.radius+8).stroke({
            color:profile.core,width:1.4,alpha:.34+.10*pulse
          });
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
          glow.circle(0,0,r+13).fill({
            color:profile.main,alpha:.045+.018*pulse
          });
          glow.circle(0,0,r+10).stroke({
            color:profile.main,width:8,alpha:.075
          });
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+time*.10;
            const rr=r+5;
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr;
            glow
              .moveTo(x,y-7)
              .lineTo(x+6,y)
              .lineTo(x,y+8)
              .lineTo(x-6,y)
              .lineTo(x,y-7)
              .stroke({
                color:profile.main,width:6,alpha:.06
              });
            core
              .moveTo(x,y-7)
              .lineTo(x+6,y)
              .lineTo(x,y+8)
              .lineTo(x-6,y)
              .lineTo(x,y-7)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:2.2,alpha:.62+.05*pulse
              });
          }
          core.circle(0,0,r+2).stroke({
            color:profile.core,width:1.15,alpha:.30+.08*pulse
          });
        } else if(defensive.spellId==="shaman-astral-shift"){
          const colors=[profile.main,profile.core,profile.accent];
          glow.circle(0,0,r+13).fill({
            color:profile.main,alpha:.045+.018*pulse
          });
          for(let i=0;i<3;i++){
            const a=time*(i%2?.75:-.65)+i*Math.PI*2/3;
            const rr=r+4+i*5;
            arc(core,0,0,rr,a-.50,a+.50,{
              color:colors[i],width:1.35+(i===1?.3:0),alpha:.36+.06*pulse
            },6);
            core.circle(Math.cos(a)*rr,Math.sin(a)*rr,2.3+(i===1?.5:0)).fill({
              color:colors[i],alpha:.68
            });
          }
          core.circle(0,0,r+3).stroke({
            color:profile.core,width:1.15,alpha:.28+.10*pulse
          });
        } else if(defensive.spellId==="warlock-resolve"){
          glow.circle(0,0,r+14).fill({
            color:profile.accent,alpha:.045+.018*pulse
          });
          glow.circle(0,0,r+11).stroke({
            color:profile.main,width:8,alpha:.075
          });
          for(let i=0;i<5;i++){
            const a=i/5*Math.PI*2-time*.12;
            const outer=r+10+(i%2)*2;
            const inner=r-1;
            core
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(a+.24)*(r+4),Math.sin(a+.24)*(r+4))
              .lineTo(Math.cos(a+.48)*inner,Math.sin(a+.48)*inner)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:2.0,alpha:.58+.05*pulse,
              });
          }
          core.circle(0,0,r+2).stroke({
            color:profile.core,width:1.1,alpha:.28+.08*pulse
          });
        } else if(defensive.spellId==="dk-rune-tap"){
          const rot=-time*.15;
          glow.circle(0,0,r+14).fill({
            color:profile.accent,alpha:.05+.02*pulse
          });
          glow.circle(0,0,r+11).stroke({
            color:profile.main,width:9,alpha:.085
          });
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+rot;
            const outer=r+10, mid=r+4, inner=r-2;
            glow
              .moveTo(Math.cos(a-.20)*inner,Math.sin(a-.20)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(a+.20)*inner,Math.sin(a+.20)*inner)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:7,alpha:.07
              });
            core
              .moveTo(Math.cos(a-.20)*inner,Math.sin(a-.20)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(a+.20)*inner,Math.sin(a+.20)*inner)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:2.1,alpha:.62+.05*pulse,
              });
            core.circle(Math.cos(a)*mid,Math.sin(a)*mid,1.5).fill({
              color:profile.core,alpha:.50
            });
          }
          core.circle(0,0,r+2).stroke({
            color:profile.core,width:1.2,alpha:.30+.08*pulse
          });
        } else {
          // Pain Suppression / fallback: layered segmented holy ward.
          glow.circle(0,0,r+12).fill({
            color:profile.accent,alpha:.038+.014*pulse
          });
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+.18+time*.08;
            arc(glow,0,0,r+7,a,a+.95,{
              color:i%2?profile.core:profile.main,
              width:7,alpha:.06
            },7);
            arc(core,0,0,r+4,a,a+.95,{
              color:i%2?profile.core:profile.main,
              width:2.1,alpha:.60+.04*pulse,
            },7);
          }
          core
            .moveTo(0,-r+2).lineTo(0,r-2)
            .moveTo(-r*.55,0).lineTo(r*.55,0)
            .stroke({
              color:profile.core,width:1.15,alpha:.24+.07*pulse
            });
        }

        glow.circle(0,0,r+7).stroke({
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
        const pull=easeOut(p);
        const pulse=Math.exp(-p*4.8);
        glow.circle(0,0,actor.radius+12+pull*10).fill({
          color:0xb52f32,alpha:fade*(.045+.035*pulse)
        });

        for(let i=0;i<10;i++){
          const a=i/10*Math.PI*2+seed*.007-p*.45;
          const start=actor.radius+26+(i%3)*6;
          const rr=start*(1-pull*.80);
          const x=Math.cos(a)*rr;
          const y=Math.sin(a)*rr;
          const color=i%3===0?0xffc2ae:0xd64b45;

          glow.circle(x,y,4+(i%2)).fill({
            color,alpha:fade*.07
          });
          core.circle(x,y,1.5+(i%3)*.45).fill({
            color,alpha:fade*(.46+(i%2)*.14),
          });
          if(i<7){
            core
              .moveTo(Math.cos(a)*start,Math.sin(a)*start)
              .lineTo(x,y)
              .stroke({
                color:i%3===0?0xffc2ae:0xc84c48,
                width:1.15+(i%3===0?.35:0),
                alpha:fade*.34
              });
          }
        }

        core.circle(0,0,actor.radius+5+pull*7).stroke({
          color:0xffc2ae,width:1.8,alpha:fade*.58
        });
        core.circle(0,0,4+pulse*4).fill({
          color:0xffdfc8,alpha:fade*(.42+.28*pulse)
        });
        glow.circle(0,0,actor.radius+10+pull*9).stroke({
          color:0xd64b45,width:9,alpha:fade*.11
        });
      } else {
        // Death Strike VFX 3.0 secondary: blood/frost soul fragments collapse
        // into the DK to sell the self-heal without a healer-like beam.
        const pull=easeOut(p);
        const rot=-p*1.25;
        glow.circle(0,0,actor.radius+12+pull*8).fill({
          color:0x8d2635,alpha:fade*.055
        });
        for(let i=0;i<8;i++){
          const a=i/8*Math.PI*2+rot;
          const start=actor.radius+28+(i%3)*5;
          const rr=start*(1-pull*.78);
          const x=Math.cos(a)*rr;
          const y=Math.sin(a)*rr;
          const color=i%3===0?0xe8fbff:(i%2?0xdf6972:0x7fd2ea);

          glow.circle(x,y,4+(i%2)).fill({
            color,alpha:fade*.07
          });
          core.circle(x,y,1.4+(i%3)*.45).fill({
            color,alpha:fade*.52
          });
          core
            .moveTo(Math.cos(a)*start,Math.sin(a)*start)
            .lineTo(x,y)
            .stroke({
              color,width:1.15+(i%3===0?.35:0),alpha:fade*.34
            });
        }
        for(let i=0;i<4;i++){
          const a=i*Math.PI/2+rot;
          const r=actor.radius+7+pull*3;
          core
            .moveTo(Math.cos(a-.18)*r,Math.sin(a-.18)*r)
            .lineTo(Math.cos(a)*(r+8),Math.sin(a)*(r+8))
            .lineTo(Math.cos(a+.18)*r,Math.sin(a+.18)*r)
            .stroke({
              color:i%2?0xe8fbff:0xe56a74,
              width:1.7,alpha:fade*.60,
            });
        }
        core.circle(0,0,4+(1-pull)*4).fill({
          color:0xffd7dc,alpha:fade*.58
        });
        glow.circle(0,0,actor.radius+11+pull*7).stroke({
          color:0xc24350,width:9,alpha:fade*.10
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

      // Polymorph: restrained orbiting arcane loops remain while the target is
      // incapacitated, separate from the CC badge above the actor.
      if (effect.kind === "incapacitate" && effect.spellId === "mage-polymorph") {
        glow.circle(0,2,radius+13).fill({
          color:palette.main,alpha:.055+pulse*.018
        });
        for(let ring=0;ring<3;ring++){
          const rr=actor.radius+7+ring*5;
          const phase=time*(ring%2?.52:-.44)+ring*.7;
          for(let seg=0;seg<4;seg++){
            const a0=phase+seg*Math.PI/2+.16;
            const a1=a0+.58;
            const steps=5;
            for(let j=0;j<=steps;j++){
              const a=a0+(a1-a0)*j/steps;
              const x=Math.cos(a)*rr;
              const y=3+Math.sin(a)*rr*.36-ring*2;
              if(j===0) core.moveTo(x,y); else core.lineTo(x,y);
            }
            core.stroke({
              color:ring===1?palette.core:palette.main,
              width:ring===1?1.55:1.15,
              alpha:.34-ring*.05,
            });
          }
        }
        for(let i=0;i<4;i++){
          const a=time*.72+i*Math.PI/2;
          const rr=actor.radius+15+(i%2)*4;
          const x=Math.cos(a)*rr;
          const y=-5+Math.sin(a)*rr*.45;
          core
            .moveTo(x-2.8,y).lineTo(x+2.8,y)
            .moveTo(x,y-2.8).lineTo(x,y+2.8)
            .stroke({color:palette.core,width:1,alpha:.48});
        }
        continue;
      }

      // Chains of Ice VFX 3.0: heavier linked chain plus frozen anchor teeth.
      if (effect.kind === "root" && effect.spellId === "dk-chains") {
        glow.ellipse(0,actor.radius*.42,radius+11,12).stroke({
          color:palette.main,width:9,alpha:.13
        });
        const links=10;
        for(let i=0;i<links;i++){
          const a=i/links*Math.PI*2+time*.22;
          const rr=actor.radius+5+(i%2)*2;
          const x=Math.cos(a)*rr;
          const y=actor.radius*.32+Math.sin(a)*6.5;
          core.ellipse(x,y,6.1,2.9).stroke({
            color:i%2?palette.main:palette.core,
            width:1.9,alpha:.78
          });
        }
        for(let i=0;i<6;i++){
          const a=i/6*Math.PI*2+.14;
          const inner=actor.radius+6;
          const outer=actor.radius+15+(i%2)*4;
          core
            .moveTo(Math.cos(a)*inner,actor.radius*.42+Math.sin(a)*4)
            .lineTo(Math.cos(a)*outer,actor.radius*.42+Math.sin(a)*8)
            .stroke({
              color:i%2?palette.core:palette.main,
              width:1.45,alpha:.54
            });
        }
        core.ellipse(0,actor.radius*.42,radius+6,7.5).stroke({
          color:palette.core,width:1.35,alpha:.48
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

      // Hex: layered nature seal stays readable for the full incap duration.
      if (
        effect.kind === "incapacitate"
        && effect.spellId === "shaman-hex"
      ) {
        const sealR=actor.radius+11;
        const pts=[];
        for(let i=0;i<6;i++){
          const a=-Math.PI/2+i*Math.PI/3;
          pts.push({x:Math.cos(a)*sealR,y:Math.sin(a)*sealR});
        }
        core.moveTo(pts[0].x,pts[0].y);
        for(let i=1;i<pts.length;i++) core.lineTo(pts[i].x,pts[i].y);
        core.lineTo(pts[0].x,pts[0].y).stroke({
          color:palette.main,width:2.0,alpha:.66
        });

        const inner=[];
        for(let i=0;i<6;i++){
          const a=Math.PI/6+i*Math.PI/3;
          inner.push({x:Math.cos(a)*(actor.radius+3),y:Math.sin(a)*(actor.radius+3)});
        }
        core.moveTo(inner[0].x,inner[0].y);
        for(let i=1;i<inner.length;i++) core.lineTo(inner[i].x,inner[i].y);
        core.lineTo(inner[0].x,inner[0].y).stroke({
          color:palette.core,width:1.1,alpha:.34
        });

        for(let i=0;i<6;i++){
          const a=time*.42+i*Math.PI/3;
          const rr=actor.radius+18+(i%2)*3;
          const x=Math.cos(a)*rr;
          const y=Math.sin(a)*rr;
          core.circle(x,y,1.6+(i%3===0?.5:0)).fill({
            color:i%3===0?palette.core:palette.main,alpha:.52
          });
        }
        glow.circle(0,0,actor.radius+16).stroke({
          color:palette.main,width:9,alpha:.10+.025*pulse
        });
        glow.circle(0,0,actor.radius+6).fill({
          color:palette.main,alpha:.035+.012*pulse
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
        if (view.classIdentityGlowFx) {
          view.classIdentityGlowFx.clear();
          view.classIdentityGlowFx.visible = false;
          view.classIdentityGlowFx.position.set(0,0);
          view.classIdentityGlowFx.rotation = 0;
          view.classIdentityGlowFx.scale.set(1,1);
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
        if (view.classIdentityGlowFx) view.classIdentityGlowFx.visible = false;
        if (view.classIdentityFx) view.classIdentityFx.visible = false;
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
      // Use real world displacement, not actor.lastMove intent. AI can deliberately
      // stop inside its range band while lastMove still contains the previous
      // steering direction; treating that stale intent as movement made a stationary
      // caster visibly "shake" in place.
      // -------------------------------------------------------------------
      const worldDx = actor.x - (Number(motion.previousX) || actor.x);
      const worldDy = actor.y - (Number(motion.previousY) || actor.y);
      const worldStep = Math.hypot(worldDx, worldDy);
      const moving = worldStep > .16 && !actor.cast;
      const moveX = moving ? worldDx / worldStep : 0;
      const moveY = moving ? worldDy / worldStep : 0;
      const walkMotion = moving && LIVING_RING_WALK_MOTION_ENABLED;
      const phaseSeed = String(actor.id || "").length * .73;
      const moveWave = walkMotion
        ? Math.sin(nowMs * .0105 + phaseSeed)
        : 0;

      // Requested glide test: actual world movement is untouched, but the ring
      // no longer bobs, rotates, stretches or squashes merely because it moves.
      let offsetX = walkMotion ? moveX * 1.25 : 0;
      let offsetY = walkMotion ? moveWave * 1.05 + Math.abs(moveY) * .30 : 0;
      let rotation = walkMotion ? moveX * .020 + moveWave * .004 : 0;
      let scaleX = walkMotion ? 1 + Math.abs(moveWave) * .012 : 1;
      let scaleY = walkMotion ? 1 - Math.abs(moveWave) * .009 : 1;

      let livingMode = walkMotion ? "move" : "idle";
      let livingIntensity = walkMotion ? .72 : .12;
      let livingDirX = moving ? moveX : Math.cos(actor.facing || 0);
      let livingDirY = moving ? moveY : Math.sin(actor.facing || 0);
      let livingProgress = walkMotion ? .5 : 0;
      let livingSpellId = "";
      let livingHeavy = false;

      view.shadow.scale.set(
        walkMotion ? 1 + Math.abs(moveWave) * .035 : 1,
        walkMotion ? 1 - Math.abs(moveWave) * .025 : 1,
      );
      view.shadow.alpha = walkMotion ? .88 : 1;

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
              ? (
                  action.spellId?.startsWith?.("rogue-")
                    ? (action.heavy ? 330 : 270)
                    : action.spellId === "shaman-stormstrike"
                      ? 340
                      : (action.heavy ? 410 : 330)
                )
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
          const warrior=action.spellId?.startsWith?.("warrior-");
          const rogue=action.spellId?.startsWith?.("rogue-");
          const dk=action.spellId?.startsWith?.("dk-");
          const storm=action.spellId==="shaman-stormstrike";
          const sideX=-dirY;
          const sideY=dirX;

          // A quick "coil -> commit -> recover" curve reads much more like an
          // attack than a symmetric bob. It is visual-only: gameplay position,
          // hitboxes, LOS and collision stay untouched.
          const commit=smooth((q-.035)/.24) * (1-smooth((q-.56)/.40));
          const recoil=(1-smooth(q/.14))*(action.heavy?3.2:2.0);
          const lungeBase=
            rogue ? (action.heavy?12.5:10.5)
            : warrior ? (action.heavy?17.5:13.5)
            : dk ? (action.heavy?18.5:15.0)
            : storm ? 13.5
            : (action.heavy?14.0:11.0);
          const lunge=commit*lungeBase;

          // Rogue slices across the target; Warrior drives straight through;
          // DK feels heavy; Stormstrike gets a small electrical side snap.
          let lateral=0;
          if(rogue) lateral=Math.sin(q*Math.PI*2.15)*commit*(action.heavy?6.2:4.8);
          else if(storm) lateral=Math.sin(q*Math.PI*4.2)*commit*2.4;
          else if(dk) lateral=Math.sin(q*Math.PI)*commit*1.8;

          offsetX += dirX*(lunge-recoil) + sideX*lateral;
          offsetY += dirY*(lunge-recoil) + sideY*lateral;

          const turn=
            rogue ? .080
            : warrior ? (action.heavy?.058:.042)
            : dk ? .036
            : storm ? .052
            : .038;
          rotation += (dirX*sideY-dirY*sideX)*0 + (rogue?-1:1)*commit*turn;

          const stretch=
            rogue ? .105
            : warrior ? (action.heavy?.145:.105)
            : dk ? (action.heavy?.145:.120)
            : storm ? .120
            : .095;
          scaleX *= 1 + commit*stretch;
          scaleY *= 1 - commit*(stretch*.58);

          // The shadow stays grounded while the ring lunges, selling the
          // movement as force rather than teleportation.
          view.shadow.position.set(
            dirX*commit*(rogue?2.2:3.0),
            dirY*commit*(rogue?1.4:2.0),
          );
          view.shadow.scale.set(
            1+commit*(action.heavy?.16:.10),
            1-commit*(action.heavy?.10:.07),
          );

          const ghostBoost=rogue?1.18:(action.heavy?1.0:.88);
          setGhost(
            ghostA,
            -dirX*(9+commit*9)-sideX*lateral*.35,
            -dirY*(9+commit*9)-sideY*lateral*.35,
            (1-q)*(action.heavy?.34:.25)*ghostBoost,
            .99+commit*.03,
            rotation*.72,
          );
          setGhost(
            ghostB,
            -dirX*(18+commit*13)-sideX*lateral*.55,
            -dirY*(18+commit*13)-sideY*lateral*.55,
            (1-q)*(action.heavy?.22:.16)*ghostBoost,
            .96,
            rotation*.46,
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
          const priest=action.spellId?.startsWith?.("priest-");
          const druid=action.spellId?.startsWith?.("druid-");
          const paladin=action.spellId?.startsWith?.("paladin-");
          const commit=smooth((q-.02)/.36)*(1-smooth((q-.72)/.28));

          if(priest){
            offsetY -= hitPulse*(action.heavy?5.6:3.8);
            scaleX *= 1+commit*(action.heavy?.075:.052);
            scaleY *= 1+commit*(action.heavy?.075:.052);
            rotation += Math.sin(q*Math.PI*2)*.010*(1-q);
          }else if(druid){
            const sway=Math.sin(q*Math.PI*2.2)*commit*(action.heavy?3.0:2.2);
            const sideX=-dirY, sideY=dirX;
            offsetX += sideX*sway-dirX*commit*.7;
            offsetY += sideY*sway-hitPulse*(action.heavy?3.8:2.8);
            rotation += Math.sin(q*Math.PI*2.4)*commit*.035;
            scaleX *= 1+commit*(action.heavy?.060:.043);
            scaleY *= 1+commit*(action.heavy?.045:.034);
          }else if(paladin){
            offsetX -= dirX*(1-q)*1.5;
            offsetY -= hitPulse*(action.heavy?3.2:2.3);
            scaleX *= 1+commit*(action.heavy?.090:.062);
            scaleY *= 1+commit*(action.heavy?.090:.062);
            rotation += Math.sin(q*Math.PI)*.012;
          }else{
            offsetY -= hitPulse*(action.heavy?3.2:2.1);
            scaleX *= 1+hitPulse*.035;
            scaleY *= 1+hitPulse*.035;
          }
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
            const rogue=action.spellId?.startsWith?.("rogue-");
            const warrior=action.spellId?.startsWith?.("warrior-");
            const dk=action.spellId?.startsWith?.("dk-");
            const storm=action.spellId==="shaman-stormstrike";
            const strands=dk?(action.heavy?10:8):(action.heavy?7:5);

            for (let i = 0; i < strands; i += 1) {
              const spread=(i-(strands-1)/2)*(rogue?4.4:3.7);
              const rear=actor.radius+4+(i%3)*3;
              const front=actor.radius+18+hitPulse*(action.heavy?19:14)+(i%2)*4;
              motionFx
                .moveTo(
                  -dirX*rear + sideX*spread,
                  -dirY*rear + sideY*spread,
                )
                .lineTo(
                  dirX*front + sideX*spread*(rogue?.25:.55),
                  dirY*front + sideY*spread*(rogue?.25:.55),
                )
                .stroke({
                  color:
                    storm && i%2 ? 0x78e6ff
                    : i%3===0 ? profile.core
                    : i%2 ? profile.main
                    : profile.accent,
                  width:action.heavy?(2.25+i*.05):(1.35+i*.04),
                  alpha:release*(action.heavy?.44:.31)*(1-i*.055),
                });
            }

            // Expanding broken aura around the attacker at the commitment
            // moment gives the hit a readable "beat" even in a melee pile.
            const ringP=Math.min(1,q/.62);
            const auraR=actor.radius+5+ringP*(action.heavy?19:13);
            const segs=rogue?4:(warrior?3:(dk?5:4));
            for(let i=0;i<segs;i++){
              const a=i*Math.PI*2/segs + (rogue?-q*.9:q*.55);
              strokeLivingArc(
                motionFx,
                auraR,
                a-.34,
                a+.34,
                {
                  color:i%2?profile.main:profile.core,
                  width:action.heavy?1.85:1.35,
                  alpha:(1-ringP)*(action.heavy?.38:.27),
                },
                5,
              );
            }
          } else if (action.kind === "heal") {
            const priest=action.spellId?.startsWith?.("priest-");
            const druid=action.spellId?.startsWith?.("druid-");
            const paladin=action.spellId?.startsWith?.("paladin-");
            const beat=Math.sin(Math.min(1,q/.88)*Math.PI);
            const fade=1-smooth((q-.62)/.38);

            if(priest){
              for(let i=0;i<3;i++){
                const a=q*1.6+i*Math.PI*2/3;
                strokeLivingArc(
                  motionFx,
                  actor.radius+8+i*4+beat*5,
                  a-.52,
                  a+.52,
                  {
                    color:i===1?profile.core:(i===2?profile.accent:profile.main),
                    width:i===1?2.4:1.7,
                    alpha:fade*(.30+beat*.35),
                  },
                  8,
                );
              }
              for(let i=0;i<6;i++){
                const a=i*Math.PI*2/6+q*.5;
                const inner=actor.radius+4;
                const outer=actor.radius+15+beat*(7+(i%2)*3);
                motionFx
                  .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
                  .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
                  .stroke({
                    color:i%2?profile.main:profile.core,
                    width:1.35,
                    alpha:fade*(.22+beat*.28),
                  });
              }
            }else if(druid){
              for(let i=0;i<7;i++){
                const a=i*Math.PI*2/7+q*(i%2?2.1:-1.7);
                const rr=actor.radius+8+beat*(8+(i%3)*3);
                const x=Math.cos(a)*rr, y=Math.sin(a)*rr;
                const tangent=a+Math.PI/2;
                motionFx
                  .moveTo(x-Math.cos(tangent)*4,y-Math.sin(tangent)*4)
                  .lineTo(x+Math.cos(tangent)*4,y+Math.sin(tangent)*4)
                  .stroke({
                    color:i%3===0?profile.core:(i%2?profile.main:profile.accent),
                    width:1.6+(i%3===0?.5:0),
                    alpha:fade*(.26+beat*.30),
                  });
              }
            }else if(paladin){
              for(let i=0;i<8;i++){
                const a=i*Math.PI/4+q*.28;
                const inner=actor.radius+3;
                const outer=actor.radius+16+beat*(action.heavy?13:9);
                motionFx
                  .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
                  .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
                  .stroke({
                    color:i%2?profile.core:profile.main,
                    width:i%2?1.9:1.5,
                    alpha:fade*(.28+beat*.36),
                  });
              }
              motionFx.circle(0,0,actor.radius+9+beat*8).stroke({
                color:profile.accent,width:1.5,alpha:fade*.26,
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
        if (view.classIdentityGlowFx) {
          drawClassIdentitySigil(
            view.classIdentityGlowFx,
            actor,
            livingState,
            nowMs,
            game,
          );
          view.classIdentityGlowFx.position.set(offsetX,offsetY);
          view.classIdentityGlowFx.rotation = rotation;
          view.classIdentityGlowFx.scale.set(scaleX,scaleY);
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
      view.castWindupGlowFx.clear();
      view.castWindupGlowFx.visible = false;
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
      const glow = view.castWindupGlowFx;
      g.visible = true;

      // Mage VFX 3.0 build-ups keep the established motion language, but split
      // soft bloom from crisp rune/crystal geometry for better depth and punch.
      if (classId === "mage" && profile) {
        glow.visible = true;

        // Frostbolt: same compact lattice/collapse motion, now with a cold aura
        // layer and a brighter compressed core in the final part of the cast.
        if (spellId === "mage-frostbolt") {
          const charge=smooth(p);
          const pulse=.5+.5*Math.sin(time*18);
          const finalP=smooth((p-.82)/.18);
          const cageR=actor.radius+26-charge*9;

          glow.circle(0,0,cageR+8).stroke({
            color:profile.main,
            width:10+charge*3,
            alpha:.055+charge*.085,
          });
          glow.circle(0,0,10+charge*7-finalP*3).fill({
            color:profile.main,
            alpha:.045+charge*.095+finalP*.07,
          });

          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+.18;
            const x=Math.cos(a)*cageR;
            const y=Math.sin(a)*cageR;
            const size=2.8+(i%2)*.7+charge*.8;

            drawDiamond(
              glow,x,y,size*2.15,a,
              i%2?profile.core:profile.main,
              .07+charge*.11,
            );
            glow
              .moveTo(Math.cos(a)*(actor.radius+7),Math.sin(a)*(actor.radius+7))
              .lineTo(x,y)
              .stroke({
                color:profile.main,
                width:5.2+charge*1.8,
                alpha:.045+charge*.075,
              });

            drawDiamond(
              g,x,y,size,a,
              i%2?profile.core:profile.main,
              .30+charge*.54,
            );
            g
              .moveTo(Math.cos(a)*(actor.radius+7),Math.sin(a)*(actor.radius+7))
              .lineTo(x,y)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:1.1+charge*.6,
                alpha:.18+charge*.34,
              });
          }

          for(const sign of [-1,1]){
            const r=actor.radius+15-charge*3;
            const a0=sign>0?-.95:2.19;
            const a1=sign>0?.95:4.09;
            strokeArc(glow,r,a0,a1,{
              color:sign>0?profile.core:profile.main,
              width:8+charge*2.5,
              alpha:.06+charge*.08,
            },8);
            strokeArc(g,r,a0,a1,{
              color:sign>0?profile.core:profile.main,
              width:1.8+charge*.7,
              alpha:.28+charge*.48,
            },8);
          }

          if(finalP>0){
            glow.circle(0,0,actor.radius+8-finalP*3).stroke({
              color:profile.core,
              width:11,
              alpha:finalP*.14,
            });
            g.circle(0,0,actor.radius+5-finalP*2).stroke({
              color:profile.core,
              width:1.4+finalP*.8,
              alpha:finalP*.46,
            });
          }

          glow.circle(0,0,7+charge*7+pulse*1.8).fill({
            color:profile.main,
            alpha:.07+charge*.11+finalP*.08,
          });
          g.circle(0,0,3+charge*5+pulse).fill({
            color:profile.core,
            alpha:.24+charge*.56,
          });
          continue;
        }

        // Pyroblast: keep the orbiting embers/furnace motion but add temperature
        // layering from deep red through orange to a near-white final core.
        if (spellId === "mage-pyroblast") {
          const charge=smooth(p);
          const pulse=.5+.5*Math.sin(time*13);
          const finalP=smooth((p-.80)/.20);
          const furnaceR=actor.radius+11+charge*5;

          glow.circle(0,0,furnaceR+13+pulse*3).fill({
            color:profile.accent,
            alpha:.045+charge*.075,
          });
          glow.circle(0,0,furnaceR+7+pulse*2).stroke({
            color:profile.main,
            width:13+charge*4,
            alpha:.07+charge*.10,
          });

          g.circle(0,0,furnaceR+7+pulse*2).fill({
            color:profile.main,
            alpha:.07+charge*.10,
          });
          g.circle(0,0,furnaceR).stroke({
            color:profile.main,
            width:2.4+charge*1.3,
            alpha:.30+charge*.50,
          });
          g.circle(0,0,Math.max(5,furnaceR-7)).stroke({
            color:0xffb52f,
            width:1.25+charge*.55,
            alpha:.16+charge*.32+finalP*.16,
          });

          for(let i=0;i<10;i++){
            const a=i/10*Math.PI*2+time*(i%2?1.65:-1.3);
            const startR=actor.radius+48+(i%3)*6;
            const rr=startR*(1-charge*.63);
            const emberX=Math.cos(a)*rr;
            const emberY=Math.sin(a)*rr-charge*(i%2?2:5);
            const emberColor=i%3===0?profile.core:(i%2?profile.main:profile.accent);
            const emberSize=1.7+(i%3)*.6+charge;

            glow.circle(emberX,emberY,emberSize*3.2).fill({
              color:emberColor,
              alpha:.055+charge*.10,
            });
            g.circle(emberX,emberY,emberSize).fill({
              color:emberColor,
              alpha:.24+charge*.58,
            });
          }

          for(let i=0;i<3;i++){
            const x=(i-1)*8;
            const rise=12+charge*(18+i*4);
            const midX=x+Math.sin(time*7+i)*4;
            const tipX=x+Math.sin(time*8.5+i*1.8)*3;
            const baseY=actor.radius+5;

            glow
              .moveTo(x,baseY)
              .lineTo(midX,baseY-rise*.55)
              .lineTo(tipX,baseY-rise)
              .stroke({
                color:i===1?profile.core:profile.main,
                width:7+charge*2,
                alpha:.055+charge*.075,
              });
            g
              .moveTo(x,baseY)
              .lineTo(midX,baseY-rise*.55)
              .lineTo(tipX,baseY-rise)
              .stroke({
                color:i===1?profile.core:profile.main,
                width:1.8+charge*.8,
                alpha:.24+charge*.46,
              });
          }

          if(finalP>0){
            glow.circle(0,0,8+finalP*8).fill({
              color:profile.core,
              alpha:finalP*.17,
            });
            glow.circle(0,0,furnaceR+3).stroke({
              color:0xffb52f,
              width:10,
              alpha:finalP*.10,
            });
            g.circle(0,0,4+finalP*7).fill({
              color:profile.core,
              alpha:finalP*.78,
            });
          }
          continue;
        }

        // Frostfire Bolt: retain the left/right elemental split and convergence,
        // while giving each half its own bloom and a cleaner white fusion core.
        if (spellId === "mage-frostfire-bolt") {
          const charge=smooth(p);
          const pulse=.5+.5*Math.sin(time*15);
          const finalP=smooth((p-.80)/.20);
          const rr=actor.radius+19-charge*3;

          strokeArc(glow,rr+2,-Math.PI/2+.12,Math.PI/2-.12,{
            color:profile.main,
            width:10+charge*3,
            alpha:.06+charge*.085,
          },10);
          strokeArc(glow,rr+2,Math.PI/2+.12,Math.PI*1.5-.12,{
            color:profile.accent,
            width:10+charge*3,
            alpha:.06+charge*.085,
          },10);

          strokeArc(g,rr,-Math.PI/2+.12,Math.PI/2-.12,{
            color:profile.main,width:2.6+charge*.8,alpha:.30+charge*.48,
          },10);
          strokeArc(g,rr,Math.PI/2+.12,Math.PI*1.5-.12,{
            color:profile.accent,width:2.6+charge*.8,alpha:.30+charge*.48,
          },10);

          for(let i=0;i<8;i++){
            const ice=i%2===0;
            const side=ice?1:-1;
            const a=(i/8*Math.PI*2)+time*(ice?.9:-1.1);
            const startR=actor.radius+42+(i%3)*5;
            const r=startR*(1-charge*.62);
            const x=Math.abs(Math.cos(a)*r)*side;
            const y=Math.sin(a)*r;
            const color=ice?profile.main:(i%3===0?profile.core:profile.accent);

            if(ice){
              drawDiamond(glow,x,y,(2.3+(i%3)*.5)*2.2,a,profile.main,.06+charge*.10);
              drawDiamond(g,x,y,2.3+(i%3)*.5,a,profile.main,.28+charge*.50);
            }else{
              glow.circle(x,y,(1.8+(i%3)*.55)*3.4).fill({
                color,
                alpha:.06+charge*.10,
              });
              g.circle(x,y,1.8+(i%3)*.55).fill({
                color,
                alpha:.28+charge*.50,
              });
            }
          }

          // Final fusion doesn't alter the established convergence; it simply
          // makes the already-converged centre read hotter and denser.
          if(finalP>0){
            glow.circle(0,0,10+finalP*8).fill({
              color:profile.core,
              alpha:finalP*.16,
            });
            glow.circle(0,0,actor.radius+7-finalP*2).stroke({
              color:profile.core,
              width:10,
              alpha:finalP*.08,
            });
            g.circle(0,0,actor.radius+4-finalP*2).stroke({
              color:profile.core,
              width:1.45+finalP*.55,
              alpha:finalP*.40,
            });
          }

          glow.circle(0,0,8+charge*7+pulse*1.7).fill({
            color:profile.core,
            alpha:.055+charge*.10+finalP*.06,
          });
          g.circle(0,0,3.4+charge*5.6+pulse).fill({
            color:profile.core,
            alpha:.24+charge*.58,
          });
          continue;
        }

        // Polymorph: preserve the playful diamond assembly/tilted sigil motion,
        // but separate violet bloom, sharp glyphs and the final lock-in flash.
        if (spellId === "mage-polymorph") {
          const charge=smooth(p);
          const finalP=smooth((p-.82)/.18);
          const rotation=time*.45;
          const sigilR=actor.radius+18-charge*4;

          glow.circle(0,0,sigilR+10).stroke({
            color:profile.main,
            width:10+charge*2,
            alpha:.045+charge*.075,
          });

          for(let i=0;i<5;i++){
            const a=i/5*Math.PI*2+rotation;
            const startR=actor.radius+43+(i%2)*7;
            const rr=startR*(1-charge*.58);
            const size=2.6+(i%2)*.8;

            drawDiamond(
              glow,
              Math.cos(a)*rr,
              Math.sin(a)*rr,
              size*2.3,
              a+rotation,
              i%2?profile.core:profile.main,
              .055+charge*.10,
            );
            drawDiamond(
              g,
              Math.cos(a)*rr,
              Math.sin(a)*rr,
              size,
              a+rotation,
              i%2?profile.core:profile.main,
              .26+charge*.52,
            );
          }

          for(let i=0;i<4;i++){
            const a=rotation+i*Math.PI/2;
            const x=Math.cos(a)*sigilR;
            const y=Math.sin(a)*sigilR;
            const b=rotation+(i+1)*Math.PI/2;
            const bx=Math.cos(b)*sigilR;
            const by=Math.sin(b)*sigilR;

            glow.moveTo(x,y).lineTo(bx,by).stroke({
              color:i%2?profile.core:profile.main,
              width:6.5+charge*2,
              alpha:.05+charge*.075,
            });
            g.moveTo(x,y).lineTo(bx,by).stroke({
              color:i%2?profile.core:profile.main,
              width:1.5+charge*.6,
              alpha:.24+charge*.46,
            });
          }

          if(finalP>0){
            const lockR=sigilR*(1-finalP*.10);
            glow.circle(0,0,lockR+5).stroke({
              color:profile.core,
              width:11,
              alpha:finalP*.12,
            });
            for(let i=0;i<4;i++){
              const a=rotation+i*Math.PI/2;
              g.circle(Math.cos(a)*lockR,Math.sin(a)*lockR,1.8+finalP*.8).fill({
                color:profile.core,
                alpha:finalP*.66,
              });
            }
          }

          glow.circle(0,0,8+charge*6).fill({
            color:profile.main,
            alpha:.055+charge*.10+finalP*.05,
          });
          g.circle(0,0,3+charge*4.5).fill({
            color:profile.core,
            alpha:.22+charge*.56,
          });
          continue;
        }

        // Any future Mage cast keeps the original motion, with a restrained
        // two-layer VFX 3.0 treatment instead of falling back to flat geometry.
        const swell=smooth(p);
        const pulse=.5+.5*Math.sin(time*12+actor.x*.01);
        const finalP=smooth((p-.82)/.18);
        const radius=actor.radius+10+swell*(profile.heavy?16:10);
        const ringAlpha=.32+p*.48;

        glow.circle(0,0,radius+pulse*2+5).stroke({
          color:profile.main,
          width:9+p*3,
          alpha:.05+p*.08,
        });
        g.circle(0,0,radius+pulse*2).stroke({
          color:profile.main,
          width:2+p*1.1,
          alpha:ringAlpha,
        });

        const runeRadius=radius+6;
        const runePhase=time*1.7*.55;
        for(let i=0;i<4;i++){
          const a0=i*Math.PI/2+.16+runePhase;
          strokeArc(glow,runeRadius,a0,a0+.62,{
            color:profile.core,
            width:7,
            alpha:.045+p*.07,
          },6);
          strokeArc(g,runeRadius,a0,a0+.62,{
            color:profile.core,
            width:1.8,
            alpha:.30+p*.48,
          },6);
        }

        const count=profile.heavy?9:7;
        const fireLike=profile.kind?.includes?.("fire")||profile.kind==="lava";
        for(let i=0;i<count;i++){
          const base=i/count*Math.PI*2;
          const spin=time*(fireLike?2.1:1.5);
          const angle=base+spin*(i%2?1:-1);
          const startRadius=actor.radius+34+(i%3)*7;
          const rr=startRadius*(1-p*.58);
          const x=Math.cos(angle)*rr;
          const y=Math.sin(angle)*rr;
          const size=1.6+(i%3)*.55+p*.8;
          const moteAlpha=.22+p*.52;
          const color=i%3===0?profile.core:profile.main;

          if(profile.kind==="frost"||profile.kind==="frost-nova"){
            drawDiamond(glow,x,y,size*2.2,angle,color,.05+p*.08);
            drawDiamond(g,x,y,size,angle,color,moteAlpha);
          }else{
            glow.circle(x,y,size*3.2).fill({color,alpha:.05+p*.08});
            g.circle(x,y,size).fill({color,alpha:moteAlpha});
          }
        }

        if(finalP>0){
          glow.circle(0,0,8+finalP*8).fill({
            color:profile.core,
            alpha:finalP*.14,
          });
          g.circle(0,0,5+finalP*10).fill({
            color:profile.core,
            alpha:clamp01(finalP*.72),
          });
        }
        continue;
      }

      // Shaman VFX 3.0 build-ups preserve the existing motion language while
      // splitting soft elemental bloom from crisp runes, motes and charge cores.
      if (classId === "shaman" && profile) {
        glow.visible = true;
        const pulse=.5+.5*Math.sin(time*15);

        // Chain Lightning: same stable storm-sigil geometry, now with layered
        // electric bloom and a denser final charge before the bolt releases.
        if (spellId === "shaman-chain-lightning") {
          const settle=smooth(p);
          const finalP=smooth((p-.74)/.26);
          const ringRadius=actor.radius+18-settle*3;
          const outerRadius=ringRadius+8;
          const phase=actor.id?.length?actor.id.length*.17:.4;

          glow.circle(0,0,ringRadius+7).stroke({
            color:profile.main,
            width:10+p*2.5,
            alpha:.05+p*.085,
          });

          for(let i=0;i<6;i++){
            const center=phase+i*Math.PI/3;
            strokeArc(glow,ringRadius,center-.30,center+.30,{
              color:i%2?profile.main:profile.core,
              width:7+p*2,
              alpha:.045+p*.075,
            },5);
            strokeArc(g,ringRadius,center-.30,center+.30,{
              color:i%2?profile.main:profile.core,
              width:1.55+p*.70,
              alpha:.28+p*.48,
            },5);

            const nodeX=Math.cos(center)*outerRadius;
            const nodeY=Math.sin(center)*outerRadius;
            glow.circle(nodeX,nodeY,6+p*2).fill({
              color:i%2?profile.core:profile.main,
              alpha:.055+p*.10,
            });
            g.circle(nodeX,nodeY,1.8+p*1.1).fill({
              color:i%2?profile.core:profile.main,
              alpha:.38+p*.52,
            });
          }

          for(let i=0;i<3;i++){
            const a=phase+i*Math.PI*2/3;
            const outer=actor.radius+24;
            const inner=actor.radius+5;
            const kink=Math.sin(time*22+i*2.4)*(1.2+p*1.8);
            const x1=Math.cos(a)*outer;
            const y1=Math.sin(a)*outer;
            const xm=Math.cos(a)*(outer*.58+inner*.42)+Math.cos(a+Math.PI/2)*kink;
            const ym=Math.sin(a)*(outer*.58+inner*.42)+Math.sin(a+Math.PI/2)*kink;
            const x2=Math.cos(a)*inner;
            const y2=Math.sin(a)*inner;

            glow.moveTo(x1,y1).lineTo(xm,ym).lineTo(x2,y2).stroke({
              color:profile.main,
              width:7+p*2,
              alpha:(.045+p*.075)*(.86+pulse*.14),
            });
            g.moveTo(x1,y1).lineTo(xm,ym).lineTo(x2,y2).stroke({
              color:profile.core,
              width:1.3+p*.65,
              alpha:(.20+p*.52)*(.86+pulse*.14),
            });
          }

          if(finalP>0){
            glow.circle(0,0,actor.radius+10-finalP*4).stroke({
              color:profile.core,
              width:12,
              alpha:finalP*.14,
            });
            glow.circle(0,0,8+finalP*7).fill({
              color:profile.main,
              alpha:finalP*.12,
            });
            g.circle(0,0,actor.radius+8-finalP*3).stroke({
              color:profile.core,
              width:1.4+finalP*1.2,
              alpha:.22+finalP*.54,
            });
            g.circle(0,0,3+finalP*5).fill({
              color:profile.core,
              alpha:finalP*.62,
            });
          }
          continue;
        }

        // Lava Burst: retain the rising molten stones and tightening volcanic
        // ring, but add heat bloom, molten cores and a white-hot final furnace.
        if (spellId === "shaman-lava-burst") {
          const charge=smooth(p);
          const finalP=smooth((p-.80)/.20);
          const rr=actor.radius+20-charge*4;

          glow.circle(0,0,rr+10).stroke({
            color:profile.main,width:12+charge*3,alpha:.055+charge*.085
          });

          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+.17;
            const inner=actor.radius+7;
            const outer=rr+(i%2)*5;
            const bend=a+.12*(i%2?1:-1);
            glow
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(bend)*outer,Math.sin(bend)*outer)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:7+charge*2,
                alpha:.05+charge*.07,
              });
            g
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(bend)*outer,Math.sin(bend)*outer)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:1.6+charge*.7,
                alpha:.22+charge*.48,
              });
          }

          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+time*(i%2?.75:-.55);
            const startR=actor.radius+45+(i%3)*6;
            const r=startR*(1-charge*.64);
            const x=Math.cos(a)*r;
            const y=Math.sin(a)*r-charge*(5+(i%3)*3);
            const color=i%3===0?profile.core:(i%2?profile.main:profile.accent);
            const size=2+(i%3)*.65;

            glow.circle(x,y,size*3.4).fill({
              color,alpha:.055+charge*.095
            });
            g.circle(x,y,size).fill({
              color,alpha:.24+charge*.54,
            });
          }

          if(finalP>0){
            glow.circle(0,0,10+finalP*9).fill({
              color:profile.core,alpha:finalP*.17
            });
            glow.circle(0,0,rr+3).stroke({
              color:0xff9a3f,width:11,alpha:finalP*.10
            });
            g.circle(0,0,rr).stroke({
              color:profile.core,width:1.4+finalP*.7,alpha:finalP*.42
            });
          }

          glow.circle(0,0,8+charge*7+pulse*1.7).fill({
            color:profile.main,alpha:.06+charge*.10+finalP*.05
          });
          g.circle(0,0,4+charge*6+pulse).fill({
            color:profile.core,alpha:.22+charge*.60,
          });
          continue;
        }

        // Elemental Blast: keep the three satellites and their merge path, but
        // let lightning/fire/nature each carry a soft halo around the sharp core.
        if (spellId === "shaman-elemental-blast") {
          const charge=smooth(p);
          const finalP=smooth((p-.80)/.20);
          const colors=[profile.main,profile.accent,0x80d889];

          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+time*(i%2?-.75:.85);
            const startR=actor.radius+42;
            const r=startR*(1-charge*.58);
            const x=Math.cos(a)*r;
            const y=Math.sin(a)*r;

            glow.circle(x,y,10+charge*3).fill({
              color:colors[i],alpha:.055+charge*.10
            });
            g.circle(x,y,4.2+charge*1.8).fill({
              color:colors[i],alpha:.28+charge*.50,
            });
            glow.moveTo(x,y).lineTo(0,0).stroke({
              color:colors[i],width:7+charge*2,alpha:.04+charge*.065
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
              const color=colors[(seg+ring)%3];
              strokeArc(glow,rr,a0,a0+.68,{
                color,width:7+charge*1.5,alpha:.045+charge*.07
              },6);
              strokeArc(g,rr,a0,a0+.68,{
                color,width:1.6+charge*.5,alpha:.20+charge*.42,
              },6);
            }
          }

          if(finalP>0){
            glow.circle(0,0,9+finalP*9).fill({
              color:profile.core,alpha:finalP*.17
            });
            glow.circle(0,0,actor.radius+9-finalP*3).stroke({
              color:profile.core,width:11,alpha:finalP*.10
            });
            g.circle(0,0,actor.radius+5-finalP*2).stroke({
              color:profile.core,width:1.5+finalP*.6,alpha:finalP*.44
            });
          }

          g.circle(0,0,3.5+charge*6).fill({
            color:profile.core,alpha:.24+charge*.64,
          });
          continue;
        }

        // Hex: preserve the green diamond seal and inward nature channels; a
        // restrained bloom makes the runes read clearly over arena art.
        if (spellId === "shaman-hex") {
          const charge=smooth(p);
          const finalP=smooth((p-.82)/.18);
          const rr=actor.radius+20-charge*5;
          const phase=time*.32;

          glow.ellipse(0,0,actor.radius+12-charge*2,11-charge).stroke({
            color:profile.main,width:9,alpha:.045+charge*.075
          });

          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+phase;
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr;
            const color=i%2?profile.core:profile.main;
            drawDiamond(glow,x,y,(2.2+(i%2)*.6)*2.3,a,color,.05+charge*.09);
            drawDiamond(g,x,y,2.2+(i%2)*.6,a,color,.25+charge*.48);
          }

          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+phase*.4;
            const inner=actor.radius+7;
            const outer=actor.radius+27-charge*7;
            glow
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:i===1?profile.core:profile.main,
                width:7+charge*2,
                alpha:.045+charge*.07,
              });
            g
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:i===1?profile.core:profile.main,
                width:1.5+charge*.5,
                alpha:.22+charge*.44,
              });
          }

          g.ellipse(0,0,actor.radius+5-charge*2,7-charge).stroke({
            color:profile.core,width:1.7+charge*.6,alpha:.24+charge*.50,
          });

          if(finalP>0){
            glow.circle(0,0,9+finalP*7).fill({
              color:profile.core,alpha:finalP*.13
            });
            g.circle(0,0,3+finalP*4).fill({
              color:profile.core,alpha:finalP*.60
            });
          }
          continue;
        }

        // Any future casted Shaman spell keeps the old inward elemental gather,
        // but gets the same soft-halo/sharp-core separation.
        const count=profile.heavy?7:5;
        for(let i=0;i<count;i++){
          const base=i/count*Math.PI*2+time*.55*(i%2?1:-1);
          const startR=actor.radius+27+(i%3)*6;
          const endR=Math.max(actor.radius+7,startR*(1-p*.58));
          const x1=Math.cos(base)*startR;
          const y1=Math.sin(base)*startR;
          const x2=Math.cos(base)*endR;
          const y2=Math.sin(base)*endR;

          glow.moveTo(x1,y1).lineTo(x2,y2).stroke({
            color:i%3===0?profile.core:profile.main,
            width:6+(i%2)*2,
            alpha:.04+p*.07,
          });
          g.moveTo(x1,y1).lineTo(x2,y2).stroke({
            color:i%3===0?profile.core:profile.main,
            width:1.2+(i%2)*.55,
            alpha:.16+p*.40,
          });
        }

        if(p>.68){
          const flicker=(p-.68)/.32;
          for(let i=0;i<4;i++){
            const a=i/4*Math.PI*2;
            const x=Math.cos(a)*(actor.radius+5);
            const y=Math.sin(a)*(actor.radius+5);
            glow.circle(x,y,5+pulse*1.2).fill({
              color:i%2?profile.core:profile.main,alpha:flicker*.08
            });
            g.circle(x,y,1.5+pulse*.7).fill({
              color:i%2?profile.core:profile.main,alpha:flicker*.60,
            });
          }
        }
        continue;
      }

      // Warlock VFX 3.0 build-ups preserve the existing motion language while
      // separating soft void/fel bloom from the sharp spell geometry.
      if (classId === "warlock" && profile) {
        glow.visible = true;
        const pulse=.5+.5*Math.sin(time*12);

        // Shadow Bolt: keep the collapsing crescents and inward motes, but give
        // the void mass a deeper halo and a denser final compression.
        if (spellId === "warlock-shadow-bolt") {
          const charge=smooth(p);
          const finalP=smooth((p-.80)/.20);

          for(let ring=0;ring<3;ring++){
            const rr=actor.radius+27+ring*7-charge*(9+ring*2);
            const phase=(ring%2?-.42:.36)*p;
            for(let seg=0;seg<2;seg++){
              const a0=seg*Math.PI+phase+ring*.23;
              strokeArc(glow,rr,a0,a0+1.12,{
                color:ring===1?profile.core:profile.main,
                width:8+charge*2,
                alpha:.045+charge*.075,
              },7);
              strokeArc(g,rr,a0,a0+1.12,{
                color:ring===1?profile.core:profile.main,
                width:1.8+charge*.55,
                alpha:.24+charge*.46,
              },7);
            }
          }

          for(let i=0;i<9;i++){
            const a=i/9*Math.PI*2+time*(i%2?.65:-.58);
            const startR=actor.radius+46+(i%3)*5;
            const rr=startR*(1-charge*.68);
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr;
            const color=i%3===0?profile.core:profile.main;
            const size=1.7+(i%3)*.5;

            glow.circle(x,y,size*3.3).fill({
              color,alpha:.05+charge*.09
            });
            g.circle(x,y,size).fill({
              color,alpha:.24+charge*.54,
            });
          }

          glow.circle(0,0,8+charge*7+pulse*1.5).fill({
            color:profile.main,alpha:.055+charge*.10+finalP*.05
          });
          g.circle(0,0,4+charge*5.5).fill({
            color:profile.core,alpha:.20+charge*.60,
          });

          if(finalP>0){
            glow.circle(0,0,11+finalP*8).fill({
              color:profile.core,alpha:finalP*.15
            });
            glow.circle(0,0,actor.radius+9-finalP*3).stroke({
              color:profile.main,width:10,alpha:finalP*.09
            });
            g.circle(0,0,actor.radius+5-finalP*2).stroke({
              color:profile.core,width:1.4+finalP*.6,alpha:finalP*.42
            });
          }
          continue;
        }

        // Chaos Bolt: preserve the two fel jaws and inward fractures. The VFX
        // 3.0 lift adds wider fel bloom and a white-green pressure core.
        if (spellId === "warlock-chaos-bolt") {
          const charge=smooth(p);
          const finalP=smooth((p-.80)/.20);
          const jawR=actor.radius+24-charge*5;

          for(const sign of [-1,1]){
            const center=sign>0?0:Math.PI;
            strokeArc(glow,jawR,center-.82,center+.82,{
              color:sign>0?profile.core:profile.main,
              width:12+charge*3,
              alpha:.06+charge*.09,
            },9);
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
            const mx=Math.cos(kink)*(outer*.58+inner*.42);
            const my=Math.sin(kink)*(outer*.58+inner*.42);
            const ex=Math.cos(a)*inner;
            const ey=Math.sin(a)*inner;

            glow
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(mx,my)
              .lineTo(ex,ey)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:7+charge*2,
                alpha:.045+charge*.075,
              });
            g
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(mx,my)
              .lineTo(ex,ey)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:1.5+charge*.65,
                alpha:.20+charge*.48,
              });
          }

          glow.circle(0,0,10+charge*8+pulse*2).fill({
            color:profile.main,alpha:.07+charge*.12
          });
          g.circle(0,0,5+charge*6+pulse).fill({
            color:profile.core,alpha:.24+charge*.66,
          });

          if(finalP>0){
            glow.circle(0,0,12+finalP*10).fill({
              color:profile.core,alpha:finalP*.18
            });
            glow.circle(0,0,jawR+5).stroke({
              color:profile.main,width:13,alpha:finalP*.11
            });
            g.circle(0,0,jawR).stroke({
              color:profile.core,width:1.6+finalP*.7,alpha:finalP*.48
            });
          }
          continue;
        }

        // Fear: keep the narrowing eye and inward thorn marks. The upgrade
        // deepens the shadow halo and creates a brief lock-in at cast finish.
        if (spellId === "warlock-fear") {
          const charge=smooth(p);
          const finalP=smooth((p-.82)/.18);
          const eyeW=actor.radius+15-charge*5;
          const eyeH=10-charge*3+pulse;

          glow.ellipse(0,0,eyeW+7,eyeH+6).stroke({
            color:profile.main,width:10,alpha:.05+charge*.08
          });
          g.ellipse(0,0,eyeW,eyeH).stroke({
            color:profile.core,width:2+charge*.7,alpha:.28+charge*.50,
          });
          glow.circle(0,0,7+charge*6).fill({
            color:profile.main,alpha:.05+charge*.09
          });
          g.circle(0,0,3+charge*4).fill({
            color:profile.main,alpha:.24+charge*.58,
          });

          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+.18;
            const outer=actor.radius+39-(i%2)*3;
            const inner=actor.radius+13-charge*5;
            const bend=a+(i%2?.16:-.16);

            glow
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(bend)*inner,Math.sin(bend)*inner)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:6.5+charge*2,
                alpha:.04+charge*.07,
              });
            g
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(bend)*inner,Math.sin(bend)*inner)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:1.3+charge*.55,
                alpha:.18+charge*.42,
              });
          }

          if(finalP>0){
            glow.ellipse(0,0,eyeW+3,eyeH+2).stroke({
              color:profile.core,width:11,alpha:finalP*.12
            });
            g.circle(0,0,3+finalP*4).fill({
              color:profile.core,alpha:finalP*.68
            });
          }
          continue;
        }

        // Drain Life: retain the three siphon channels and hollow soul ring,
        // adding glow around the same paths and a final intake pulse.
        if (spellId === "warlock-drain-life") {
          const charge=smooth(p);
          const finalP=smooth((p-.80)/.20);
          const rr=actor.radius+24-charge*5;

          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+time*(i%2?.38:-.42);
            const outer=actor.radius+45;
            const x1=Math.cos(a)*outer, y1=Math.sin(a)*outer;
            const x2=Math.cos(a+.32)*rr, y2=Math.sin(a+.32)*rr;
            const color=i===1?profile.core:profile.main;

            glow.moveTo(x1,y1).lineTo(x2,y2).stroke({
              color,width:8+charge*2,alpha:.05+charge*.08
            });
            g.moveTo(x1,y1).lineTo(x2,y2).stroke({
              color,width:1.7+charge*.6,alpha:.22+charge*.46,
            });
          }

          glow.circle(0,0,rr+7).stroke({
            color:profile.main,width:10,alpha:.05+charge*.075
          });
          g.circle(0,0,rr).stroke({
            color:profile.main,width:1.9+charge*.6,alpha:.24+charge*.46,
          });
          g.circle(0,0,Math.max(4,9-charge*3)).stroke({
            color:profile.core,width:1.5,alpha:.30+charge*.42,
          });

          if(finalP>0){
            glow.circle(0,0,9+finalP*8).fill({
              color:profile.core,alpha:finalP*.15
            });
            g.circle(0,0,4+finalP*4).fill({
              color:profile.core,alpha:finalP*.62
            });
          }
          continue;
        }

        // Future Warlock casts retain the existing inward smoky gather, with a
        // restrained halo added underneath rather than a new motion pattern.
        for(let i=0;i<8;i++){
          const base=
            i/8*Math.PI*2
            + Math.sin((actor.id?.length||1)*.7+i*3.1)*.45;
          const angle=base+time*1.3*(i%2?1:-1);
          const radius=actor.radius+38+(i%4)*5;
          const inward=radius*(1-p*.68);
          const x=Math.cos(angle)*inward;
          const y=Math.sin(angle)*inward;
          const color=i%3===0?profile.core:profile.main;
          const size=1.5+(i%3)*.55;

          glow.circle(x,y,size*3.2).fill({
            color,alpha:.045+p*.075
          });
          g.circle(x,y,size).fill({
            color,alpha:.25+p*.5,
          });
        }

        for(let i=0;i<3;i++){
          const radius=actor.radius+11+i*5+pulse*2;
          const start=-1.4+i*2.1+time*(i%2?-1:1);
          strokeArc(glow,radius,start,start+.9,{
            color:profile.main,width:7,alpha:.045+p*.07
          },6);
          strokeArc(g,radius,start,start+.9,{
            color:profile.main,width:2,alpha:.25+p*.45,
          },6);
        }

        if(p>.74){
          const finalP=smooth((p-.74)/.26);
          glow.circle(0,0,8+finalP*8).fill({
            color:profile.core,alpha:finalP*.13
          });
          g.circle(0,0,4+finalP*5).fill({
            color:profile.core,alpha:finalP*.62
          });
        }
        continue;
      }

      // Priest VFX 3.0 build-ups preserve the existing spell motions while
      // splitting soft holy/psychic bloom from crisp spell geometry.
      if (classId === "priest" && profile) {
        glow.visible = true;

        if (spellId === "priest-smite") {
          const pulse=.5+.5*Math.sin(time*17);
          const squeeze=smooth(p);
          const finalP=smooth((p-.72)/.28);

          for(let ring=0;ring<3;ring++){
            const rr=actor.radius+28+ring*8-squeeze*(12+ring*3);
            const phase=(ring%2?-1:1)*p*.52;
            for(let seg=0;seg<3;seg++){
              const a0=seg*Math.PI*2/3+.22+phase;
              strokeArc(glow,rr,a0,a0+.72,{
                color:ring===1?profile.core:profile.main,
                width:8+ring,
                alpha:.045+p*.075,
              },7);
              strokeArc(g,rr,a0,a0+.72,{
                color:ring===1?profile.core:profile.main,
                width:1.7+p*.65,
                alpha:.28+p*(.30+ring*.06),
              },7);
            }
          }

          for(let i=0;i<9;i++){
            const a=
              i/9*Math.PI*2
              +(i%2?-.34:.28)*time
              +i*.13;
            const startR=actor.radius+42+(i%3)*7;
            const rr=startR*(1-squeeze*.66);
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr;
            const color=i%3===0?profile.core:profile.main;
            const size=1.7+(i%3)*.55;

            glow.circle(x,y,size*3.4).fill({
              color,alpha:.05+p*.09
            });
            g.circle(x,y,size).fill({
              color,alpha:.28+p*.54,
            });
          }

          const eyeW=actor.radius+13-squeeze*5;
          const eyeH=8+pulse*2-squeeze*2;
          glow.ellipse(0,0,eyeW+7,eyeH+6).stroke({
            color:profile.main,width:10,alpha:.055+p*.085
          });
          g.ellipse(0,0,eyeW,eyeH).stroke({
            color:profile.core,width:1.9+p*.8,alpha:.32+p*.50,
          });
          glow.circle(0,0,7+p*7).fill({
            color:profile.main,alpha:.05+p*.09
          });
          g.circle(0,0,2.8+p*4.8).fill({
            color:profile.core,alpha:.24+p*.58,
          });

          if(finalP>0){
            for(let i=0;i<6;i++){
              const a=i/6*Math.PI*2;
              glow
                .moveTo(
                  Math.cos(a)*(actor.radius+15),
                  Math.sin(a)*(actor.radius+15)
                )
                .lineTo(
                  Math.cos(a)*(actor.radius+5),
                  Math.sin(a)*(actor.radius+5)
                )
                .stroke({
                  color:i%2?profile.core:profile.main,
                  width:7,
                  alpha:finalP*.08,
                });
              g
                .moveTo(
                  Math.cos(a)*(actor.radius+14),
                  Math.sin(a)*(actor.radius+14)
                )
                .lineTo(
                  Math.cos(a)*(actor.radius+5),
                  Math.sin(a)*(actor.radius+5)
                )
                .stroke({
                  color:i%2?profile.core:profile.main,
                  width:1.45,
                  alpha:finalP*.62,
                });
            }
            glow.circle(0,0,10+finalP*8).fill({
              color:profile.core,alpha:finalP*.16
            });
            g.circle(0,0,3+finalP*5).fill({
              color:profile.core,alpha:finalP*.70
            });
          }
          continue;
        }

        // Holy Fire keeps its miniature sun seal, now with broad warm bloom and
        // a stronger white-gold ignition just before the sky strike releases.
        if (spellId === "priest-holy-fire") {
          const charge=smooth(p);
          const pulse=.5+.5*Math.sin(time*15);
          const finalP=smooth((p-.78)/.22);
          const rr=actor.radius+18-charge*3;

          glow.circle(0,0,rr+9+pulse*2).stroke({
            color:profile.main,width:11+charge*3,alpha:.055+charge*.085
          });
          g.circle(0,0,rr+6+pulse*2).stroke({
            color:profile.main,width:2.3+charge*.8,alpha:.28+charge*.52,
          });

          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2;
            const inner=rr*.62;
            const outer=rr+(i%2?8:14)+charge*4;

            glow
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:7+charge*2,
                alpha:.045+charge*.07,
              });
            g
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:i%2?1.5:2.0,
                alpha:.22+charge*.48,
              });
          }

          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+time*(i%2?.65:-.55);
            const startR=actor.radius+44+(i%3)*5;
            const r=startR*(1-charge*.64);
            const x=Math.cos(a)*r;
            const y=Math.sin(a)*r;
            const color=i%3===0?profile.core:profile.main;
            const size=1.5+(i%3)*.5;

            glow.circle(x,y,size*3.5).fill({
              color,alpha:.05+charge*.09
            });
            g.circle(x,y,size).fill({
              color,alpha:.24+charge*.52,
            });
          }

          glow.circle(0,0,8+charge*7).fill({
            color:profile.main,alpha:.055+charge*.10
          });
          g.circle(0,0,4+charge*5).fill({
            color:profile.core,alpha:.24+charge*.64,
          });

          if(finalP>0){
            glow.circle(0,0,11+finalP*10).fill({
              color:profile.core,alpha:finalP*.18
            });
            glow.circle(0,0,rr+3).stroke({
              color:profile.core,width:11,alpha:finalP*.10
            });
            g.circle(0,0,rr).stroke({
              color:profile.core,width:1.6+finalP*.7,alpha:finalP*.46
            });
          }
          continue;
        }

        // Flash Heal stays compact and fast: four holy points collapse inward
        // with just enough glow to read cleanly over the arena floor.
        if (spellId === "priest-flash-heal") {
          const charge=smooth(p);
          const finalP=smooth((p-.76)/.24);
          const rr=actor.radius+26-charge*10;

          glow.circle(0,0,actor.radius+10+charge*4).stroke({
            color:profile.main,width:9,alpha:.045+charge*.07
          });

          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+Math.PI/4;
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr;
            const color=i%2?profile.core:profile.main;

            glow.circle(x,y,7+charge*2).fill({
              color,alpha:.055+charge*.09
            });
            g.circle(x,y,2.2+charge*.8).fill({
              color,alpha:.30+charge*.54,
            });

            glow
              .moveTo(x,y)
              .lineTo(Math.cos(a)*(actor.radius+6),Math.sin(a)*(actor.radius+6))
              .stroke({
                color,width:7+charge*2,alpha:.045+charge*.065
              });
            g
              .moveTo(x,y)
              .lineTo(Math.cos(a)*(actor.radius+6),Math.sin(a)*(actor.radius+6))
              .stroke({
                color,width:1.4+charge*.5,alpha:.20+charge*.42,
              });
          }

          g.circle(0,0,3+charge*4.5).fill({
            color:profile.core,alpha:.24+charge*.62,
          });

          if(finalP>0){
            glow.circle(0,0,9+finalP*7).fill({
              color:profile.core,alpha:finalP*.14
            });
            g.circle(0,0,3+finalP*4).fill({
              color:profile.core,alpha:finalP*.68
            });
          }
          continue;
        }

        // Greater Heal is the Priest's premium healing cast: broad celestial
        // halos, outward rays and a strong compression into the release core.
        if (spellId === "priest-greater-heal") {
          const charge=smooth(p);
          const pulse=.5+.5*Math.sin(time*11);
          const finalP=smooth((p-.70)/.30);

          for(let ring=0;ring<3;ring++){
            const rr=actor.radius+14+ring*9+charge*(5-ring*1.5);
            glow.circle(0,0,rr+pulse*(ring===2?2:1)+6).stroke({
              color:ring===1?profile.core:profile.main,
              width:9+ring*2,
              alpha:.045+charge*(.055+ring*.01),
            });
            g.circle(0,0,rr+pulse*(ring===2?2:1)).stroke({
              color:ring===1?profile.core:profile.main,
              width:1.6+ring*.35+charge*.5,
              alpha:.20+charge*(.40+ring*.04),
            });
          }

          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2;
            const inner=actor.radius+5;
            const outer=actor.radius+32+charge*12+(i%2)*6;
            glow
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:8+charge*2,
                alpha:.045+charge*.07,
              });
            g
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:1.5+charge*.7,
                alpha:.18+charge*.44,
              });
          }

          // Six descending motes imply a celestial column without drawing a
          // target beam during the cast itself.
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+time*.18*(i%2?1:-1);
            const rr=actor.radius+23+(i%2)*8;
            const yBias=-8-charge*(10+(i%3)*4);
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr*.55+yBias;
            glow.circle(x,y,6+(i%2)).fill({
              color:i%2?profile.core:profile.main,
              alpha:.05+charge*.08
            });
            g.circle(x,y,1.7+(i%3)*.45).fill({
              color:i%2?profile.core:profile.main,
              alpha:.26+charge*.48
            });
          }

          if(finalP>0){
            glow.circle(0,0,12+finalP*10).fill({
              color:profile.core,alpha:finalP*.19
            });
            glow.circle(0,0,actor.radius+10-finalP*2).stroke({
              color:profile.core,width:13,alpha:finalP*.11
            });
            g.circle(0,0,actor.radius+6-finalP*2).stroke({
              color:profile.core,width:1.7+finalP*.8,alpha:finalP*.48
            });
            g.circle(0,0,4+finalP*6).fill({
              color:profile.core,alpha:finalP*.74
            });
          }
          continue;
        }

        // Future Priest casts keep the old holy/shadow gather with a restrained
        // glow layer so they inherit the class material without fake new motion.
        const shadow=
          profile.kind==="mind-implosion"
          || profile.kind==="shadow-wave";
        const count=shadow?5:7;
        const pulse=.5+.5*Math.sin(time*14);

        for(let i=0;i<count;i++){
          const a=i/count*Math.PI*2+time*1.2*(i%2?1:-1);
          const rr=actor.radius+28-p*14+(i%2)*5;
          const x=Math.cos(a)*rr;
          const y=Math.sin(a)*rr;
          const color=i%3===0?profile.core:profile.main;

          glow.circle(x,y,5+p*2).fill({
            color,alpha:.045+p*.07
          });
          g.circle(x,y,1.5+p*1.1).fill({
            color,alpha:.24+p*.48,
          });
        }

        glow.circle(0,0,actor.radius+13+p*8+pulse*2).stroke({
          color:profile.main,width:8,alpha:.045+p*.07
        });
        g.circle(0,0,actor.radius+10+p*8+pulse*2).stroke({
          color:profile.main,width:1.8,alpha:.28+p*.36,
        });

        if(p>.74){
          const finalP=smooth((p-.74)/.26);
          glow.circle(0,0,8+finalP*8).fill({
            color:profile.core,alpha:finalP*.13
          });
          g.circle(0,0,4+finalP*5).fill({
            color:profile.core,alpha:finalP*.64
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

      // Paladin VFX 3.0 build-ups: angular solar seals rather than Priest-like
      // celestial halos. Flash of Light stays compact; Holy Light feels heavier.
      if (classId === "paladin" && profile) {
        glow.visible = true;
        const pulse=.5+.5*Math.sin(time*15);
        const rotation=p*.35;

        if(spellId==="paladin-flash-light"){
          const charge=smooth(p);
          const finalP=smooth((p-.76)/.24);
          const r=actor.radius+12+charge*7+pulse*1.5;
          const half=r*.58;
          const corners=[
            [-half,-half],[half,-half],[half,half],[-half,half],
          ].map(([x,y])=>{
            const ca=Math.cos(rotation), sa=Math.sin(rotation);
            return {x:x*ca-y*sa,y:x*sa+y*ca};
          });

          glow.moveTo(corners[0].x,corners[0].y);
          for(let i=1;i<corners.length;i++) glow.lineTo(corners[i].x,corners[i].y);
          glow.lineTo(corners[0].x,corners[0].y).stroke({
            color:profile.main,width:9,alpha:.05+charge*.075
          });

          g.moveTo(corners[0].x,corners[0].y);
          for(let i=1;i<corners.length;i++) g.lineTo(corners[i].x,corners[i].y);
          g.lineTo(corners[0].x,corners[0].y).stroke({
            color:profile.main,width:1.8+charge*.7,alpha:.30+charge*.48
          });

          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+rotation;
            const inner=r*.48;
            const outer=r+6+charge*5;
            const color=i%2?profile.core:profile.main;
            glow.moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({color,width:7,alpha:.045+charge*.065});
            g.moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({color,width:1.7+charge*.5,alpha:.24+charge*.42});
          }

          glow.circle(0,0,7+charge*6).fill({
            color:profile.main,alpha:.045+charge*.08
          });
          g.circle(0,0,3+charge*4).fill({
            color:profile.core,alpha:.24+charge*.60
          });

          if(finalP>0){
            glow.circle(0,0,9+finalP*8).fill({
              color:profile.core,alpha:finalP*.15
            });
            g.circle(0,0,3+finalP*4).fill({
              color:profile.core,alpha:finalP*.70
            });
          }
          continue;
        }

        if(spellId==="paladin-holy-light"){
          const charge=smooth(p);
          const finalP=smooth((p-.70)/.30);
          const outerR=actor.radius+19+charge*10+pulse*2;

          for(let layer=0;layer<3;layer++){
            const rr=outerR-layer*6;
            const half=rr*.60;
            const rot=rotation*(layer%2?-.85:1)+(layer*Math.PI/8);
            const corners=[
              [-half,-half],[half,-half],[half,half],[-half,half],
            ].map(([x,y])=>{
              const ca=Math.cos(rot), sa=Math.sin(rot);
              return {x:x*ca-y*sa,y:x*sa+y*ca};
            });

            glow.moveTo(corners[0].x,corners[0].y);
            for(let i=1;i<corners.length;i++) glow.lineTo(corners[i].x,corners[i].y);
            glow.lineTo(corners[0].x,corners[0].y).stroke({
              color:layer===1?profile.core:profile.main,
              width:10-layer,
              alpha:.045+charge*(.055+layer*.01)
            });

            g.moveTo(corners[0].x,corners[0].y);
            for(let i=1;i<corners.length;i++) g.lineTo(corners[i].x,corners[i].y);
            g.lineTo(corners[0].x,corners[0].y).stroke({
              color:layer===1?profile.core:profile.main,
              width:1.7+charge*.6,
              alpha:.22+charge*(.38+layer*.04)
            });
          }

          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+rotation*.55;
            const inner=actor.radius+6;
            const outer=actor.radius+30+charge*(14+(i%2)*5);
            const color=i%2?profile.core:profile.main;
            glow.moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({color,width:8+charge*2,alpha:.045+charge*.07});
            g.moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({color,width:1.6+charge*.7,alpha:.18+charge*.44});
          }

          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+time*.16*(i%2?1:-1);
            const rr=actor.radius+24+(i%2)*7;
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr*.55-8-charge*(8+(i%3)*4);
            const color=i%2?profile.core:profile.main;
            glow.circle(x,y,6+(i%2)).fill({
              color,alpha:.05+charge*.08
            });
            g.circle(x,y,1.7+(i%3)*.45).fill({
              color,alpha:.26+charge*.50
            });
          }

          glow.circle(0,0,9+charge*7).fill({
            color:profile.main,alpha:.05+charge*.09
          });
          g.circle(0,0,4+charge*5).fill({
            color:profile.core,alpha:.24+charge*.64
          });

          if(finalP>0){
            glow.circle(0,0,12+finalP*10).fill({
              color:profile.core,alpha:finalP*.19
            });
            glow.circle(0,0,actor.radius+11-finalP*2).stroke({
              color:profile.core,width:13,alpha:finalP*.11
            });
            g.circle(0,0,actor.radius+7-finalP*2).stroke({
              color:profile.core,width:1.7+finalP*.8,alpha:finalP*.50
            });
            g.circle(0,0,4+finalP*6).fill({
              color:profile.core,alpha:finalP*.76
            });
          }
          continue;
        }

        const r=actor.radius+12+p*10+pulse*2;
        const half=r*.62;
        const corners=[
          [-half,-half],[half,-half],[half,half],[-half,half],
        ].map(([x,y])=>{
          const ca=Math.cos(rotation), sa=Math.sin(rotation);
          return {x:x*ca-y*sa,y:x*sa+y*ca};
        });

        glow.moveTo(corners[0].x,corners[0].y);
        for(let i=1;i<corners.length;i++) glow.lineTo(corners[i].x,corners[i].y);
        glow.lineTo(corners[0].x,corners[0].y).stroke({
          color:profile.main,width:8,alpha:.045+p*.065
        });

        g.moveTo(corners[0].x,corners[0].y);
        for(let i=1;i<corners.length;i++) g.lineTo(corners[i].x,corners[i].y);
        g.lineTo(corners[0].x,corners[0].y).stroke({
          color:profile.main,width:1.8+p*.7,alpha:.28+p*.48
        });

        for(let i=0;i<4;i++){
          const a=i*Math.PI/2+rotation;
          g.moveTo(Math.cos(a)*r*.55,Math.sin(a)*r*.55)
            .lineTo(Math.cos(a)*r,Math.sin(a)*r)
            .stroke({
              color:profile.main,width:1.8+p*.7,alpha:.28+p*.48
            });
        }
        continue;
      }

      // Death Knight VFX 3.0 build-up: Obliterate keeps its inward rotating
      // frost-rune motion, but gains layered cold bloom and a hard final lock.
      if (classId === "death-knight" && profile) {
        const rotation=-p*.65;

        if(spellId==="dk-obliterate"){
          glow.visible=true;
          const charge=smooth(p);
          const finalP=smooth((p-.72)/.28);
          const pulse=.5+.5*Math.sin(time*15);

          // Three established rune strokes remain the main movement language.
          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+rotation;
            const inner=actor.radius+7;
            const outer=actor.radius+21-charge*7;
            const p0={
              x:Math.cos(a)*inner,
              y:Math.sin(a)*inner,
            };
            const p1={
              x:Math.cos(a+.4)*outer,
              y:Math.sin(a+.4)*outer,
            };

            glow.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
              color:i===1?profile.core:profile.main,
              width:9+charge*2,
              alpha:.05+charge*.08,
            });
            g.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
              color:i===1?profile.core:profile.main,
              width:1.8+charge*.65,
              alpha:.28+charge*.50,
            });
          }

          // Frost motes still rotate inward, but now read as crystalline chunks
          // with their own bloom instead of simple dots.
          for(let i=0;i<7;i++){
            const a=i*Math.PI*2/7+rotation*.4;
            const startR=actor.radius+33+(i%3)*5;
            const rr=startR*(1-charge*.55);
            const x=Math.cos(a)*rr;
            const y=Math.sin(a)*rr;
            const size=1.8+(i%3)*.45;

            glow.circle(x,y,size*3.5).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:.055+charge*.095,
            });
            g.circle(x,y,size).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:.34+charge*.48,
            });

            if(i%2===0){
              g
                .moveTo(x-size*2.2,y)
                .lineTo(x+size*2.2,y)
                .moveTo(x,y-size*2.2)
                .lineTo(x,y+size*2.2)
                .stroke({
                  color:profile.core,
                  width:1,
                  alpha:.22+charge*.34,
                });
            }
          }

          // Crossed weapon lanes foreshadow Obliterate's two-cleave impact.
          for(const sign of [-1,1]){
            const a=sign*.72;
            const inner=actor.radius+4;
            const outer=actor.radius+23+charge*8;
            glow
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:profile.main,
                width:10+charge*2,
                alpha:.045+charge*.075,
              });
            g
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .stroke({
                color:profile.core,
                width:1.6+charge*.7,
                alpha:.20+charge*.42,
              });
          }

          glow.circle(0,0,actor.radius+10+charge*5+pulse*1.5).stroke({
            color:profile.main,
            width:10+charge*2,
            alpha:.05+charge*.08,
          });
          g.circle(0,0,actor.radius+7+charge*3).stroke({
            color:profile.core,
            width:1.4+charge*.6,
            alpha:.22+charge*.38,
          });

          // Final 28%: the runic halo contracts into a white frost core and
          // the crossed lanes brighten immediately before release.
          if(finalP>0){
            glow.circle(0,0,10+finalP*10).fill({
              color:profile.core,
              alpha:finalP*.17,
            });
            glow.circle(0,0,actor.radius+10-finalP*3).stroke({
              color:profile.core,
              width:12,
              alpha:finalP*.12,
            });
            g.circle(0,0,actor.radius+6-finalP*2).stroke({
              color:profile.core,
              width:1.7+finalP*.8,
              alpha:finalP*.50,
            });
            g.circle(0,0,3.5+finalP*5).fill({
              color:profile.core,
              alpha:finalP*.70,
            });
          }
          continue;
        }

        // Future DK casts retain the old concise rune cue.
        for(let i=0;i<3;i++){
          const a=i*Math.PI*2/3+rotation;
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
        continue;
      }

      // Warrior VFX 3.0 build-up: Slam is the one true melee wind-up.
      // Keep the existing downward weapon-weight language, but separate soft
      // force bloom from the sharp steel/gold cues and compress hard at release.
      if (classId === "warrior" && profile) {
        const heavy = spellId === "warrior-slam";
        const cueP = Math.max(0,1-p);
        const fade = 1-clamp01(cueP);

        if(heavy){
          glow.visible = true;
          const finalP=smooth((p-.72)/.28);
          const pulse=.5+.5*Math.sin(time*13);

          // Existing fan of weight lines, now with a broad blurred under-layer.
          for(let i=0;i<5;i++){
            const a=-.95+i*.48;
            const inner=actor.radius+5;
            const outer=actor.radius+13+i*2+cueP*8;
            const ix=Math.cos(a)*inner;
            const iy=Math.sin(a)*inner;
            const ox=Math.cos(a)*outer;
            const oy=Math.sin(a)*outer;

            glow
              .moveTo(ix,iy)
              .lineTo(ox,oy)
              .stroke({
                color:i===2?profile.core:profile.main,
                width:8+p*2,
                alpha:.045+p*.075,
              });
            g
              .moveTo(ix,iy)
              .lineTo(ox,oy)
              .stroke({
                color:i===2?profile.core:profile.accent,
                width:2.3+(i===2?.6:0),
                alpha:fade*(i===2?.68:.56),
              });
          }

          // Preserve the original overhead arc, but give it more mass.
          const arcR=actor.radius+11+p*8;
          strokeArc(
            glow,
            arcR,
            -2.5,
            -.5,
            {
              color:profile.main,
              width:11+p*3,
              alpha:.055+p*.085,
            },
            9,
          );
          strokeArc(
            g,
            arcR,
            -2.5,
            -.5,
            {
              color:profile.core,
              width:2.1+p*1.7,
              alpha:.25+p*.48,
            },
            9,
          );

          // Ground brace stays physical: a compressed ellipse and two short
          // stress fractures under the Warrior rather than a magic rune.
          const braceY=actor.radius*.58;
          glow.ellipse(0,braceY,actor.radius+10+p*9,6+p*3).stroke({
            color:profile.main,width:9,alpha:.045+p*.07
          });
          g.ellipse(0,braceY,actor.radius+7+p*7,4+p*2).stroke({
            color:profile.accent,width:1.5+p*.5,alpha:.20+p*.34
          });

          for(const sign of [-1,1]){
            const x0=sign*5;
            const x1=sign*(15+p*8);
            glow.moveTo(x0,braceY).lineTo(x1,braceY+5+p*3).stroke({
              color:profile.main,width:6,alpha:.04+p*.06
            });
            g.moveTo(x0,braceY).lineTo(x1,braceY+5+p*3).stroke({
              color:profile.core,width:1.2+p*.4,alpha:.18+p*.34
            });
          }

          // Last 28%: weapon energy compacts toward the front/ground contact
          // point so Slam has a clear "about to land" moment.
          if(finalP>0){
            const contactY=actor.radius*.52;
            glow.circle(0,contactY,8+finalP*9+pulse*1.5).fill({
              color:profile.core,alpha:finalP*.14
            });
            glow.ellipse(0,braceY,actor.radius+9-finalP*2,6).stroke({
              color:profile.core,width:10,alpha:finalP*.10
            });
            g.circle(0,contactY,3+finalP*4).fill({
              color:profile.core,alpha:finalP*.68
            });
            g.ellipse(0,braceY,actor.radius+5-finalP*2,3.5).stroke({
              color:profile.core,width:1.4+finalP*.7,alpha:finalP*.46
            });
          }
          continue;
        }

        // Future Warrior casts keep the old simple physical cue, without
        // inheriting Slam's heavy presentation.
        for(let i=0;i<3;i++){
          const a=-.95+i*.72;
          const inner=actor.radius+5;
          const outer=actor.radius+13+i*2+cueP*8;
          g
            .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
            .lineTo(Math.cos(a)*outer,Math.sin(a)*outer)
            .stroke({
              color:profile.accent,
              width:1.6,
              alpha:fade*.38,
            });
        }
        continue;
      }

      if (classId === "rogue" && profile) {
        // Current Rogue kit is fully instant. Keep only a minimal future-proof
        // cue here so no artificial pre-cast animation delays instant attacks.
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

        // VFX 3.0 target contact: a compact electrical corona appears as each
        // hop finishes, giving the chain a stronger victim-side snap without
        // changing the established bolt motion.
        if (reveal > .72) {
          const contact = clamp01((reveal - .72) / .28);
          const contactFade = (1 - contact) * intensity;
          const contactR = 7 + easeOut(contact) * 19;
          view.chainGlowFx.circle(to.x,to.y,contactR+6).stroke({
            color:palette.main,width:10,alpha:contactFade*.13
          });
          view.chainFx.circle(to.x,to.y,contactR).stroke({
            color:palette.core,width:1.8,alpha:contactFade*.68
          });
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+snapFrame*.07;
            const inner=6;
            const outer=13+contact*(12+(i%3)*4);
            view.chainSparkFx
              .moveTo(to.x+Math.cos(a)*inner,to.y+Math.sin(a)*inner)
              .lineTo(to.x+Math.cos(a+.06)*outer,to.y+Math.sin(a+.06)*outer)
              .stroke({
                color:i%3===0?palette.core:palette.main,
                width:i%3===0?1.25:.85,
                alpha:contactFade*.72
              });
          }
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
        const wave=1-Math.pow(1-Math.max(0,Math.min(1,p/.70)),3);
        const fade=1-Math.max(0,Math.min(1,(p-.50)/.50));
        const snap=Math.exp(-p*15);
        const radius=source.radius+7+wave*111;

        view.commonCasterSpellFx
          .circle(0,0,source.radius+8+snap*24)
          .fill({color:profile.core,alpha:alpha*fade*snap*.12})
          .circle(0,0,radius+9)
          .stroke({color:profile.main,width:8,alpha:alpha*fade*.08});

        view.commonCasterSpellFx
          .circle(0,0,radius)
          .stroke({color:profile.main,width:3.0,alpha:alpha*fade*.76})
          .circle(0,0,Math.max(source.radius+4,radius-13))
          .stroke({color:profile.core,width:1.3,alpha:alpha*fade*.34});

        for(let i=0;i<16;i++){
          const angle=i/16*Math.PI*2+Math.sin(seed*.17+i*2.1)*.10;
          const inner=source.radius+5+wave*9;
          const outer=source.radius+10+wave*(91+(i%4)*7);
          view.commonCasterSpellFx
            .moveTo(Math.cos(angle)*inner,Math.sin(angle)*inner)
            .lineTo(Math.cos(angle+(i%2?.04:-.04))*outer,Math.sin(angle+(i%2?.04:-.04))*outer)
            .stroke({
              color:i%4===0?profile.core:profile.main,
              width:i%4===0?2.3:1.35,
              alpha:alpha*fade*.58,
            });

          if(i%2===0){
            const rr=outer+5;
            const x=Math.cos(angle)*rr;
            const y=Math.sin(angle)*rr;
            view.commonCasterSpellFx
              .moveTo(x,y-5.5).lineTo(x+3.2,y)
              .lineTo(x,y+5.5).lineTo(x-3.2,y).lineTo(x,y-5.5)
              .fill({
                color:i%4===0?profile.core:profile.main,
                alpha:alpha*fade*.62,
              });
          }
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
      glowG,
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

      // Broad class-colored aura: the blur layer carries the scale, while the
      // core layer keeps the weapon path sharp enough to read in a melee pile.
      glowG.moveTo(a.x,a.y).lineTo(m.x,m.y).lineTo(b.x,b.y).stroke({
        color:profile.main,
        width:width+13,
        alpha:alpha*.20,
      });
      glowG.moveTo(a.x,a.y).lineTo(m.x,m.y).lineTo(b.x,b.y).stroke({
        color:profile.core,
        width:width+7,
        alpha:alpha*.16,
      });

      g.moveTo(a.x,a.y).lineTo(m.x,m.y).lineTo(b.x,b.y).stroke({
        color:profile.accent,
        width:width+5,
        alpha:alpha*.28,
      });
      g.moveTo(a.x,a.y).lineTo(m.x,m.y).lineTo(b.x,b.y).stroke({
        color:profile.main,
        width:Math.max(2,width+1.7),
        alpha:alpha*.78,
      });
      g.moveTo(a.x,a.y).lineTo(m.x,m.y).lineTo(b.x,b.y).stroke({
        color:profile.core,
        width:Math.max(1.4,width*.48),
        alpha:Math.min(1,alpha*1.06),
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
      // HEALING 2.0: each healer gets its own visual grammar.
      // Priest = celestial restoration, Druid = living bloom, Paladin = solar seals.
      // HoTs only animate on application; there is no persistent HOT animation.
      // ---------------------------------------------------------------------
      if (COMBAT_VFX2_HEALS.has(effect.spellId)) {
        const fade=1-smooth((p-.70)/.30);
        const strong=
          effect.spellId==="priest-greater-heal"
          || effect.spellId==="druid-regrowth"
          || effect.spellId==="paladin-holy-light"
          || effect.spellId==="paladin-word-of-glory";
        const power=strong?1.34:1;
        const eased=easeOut(p);
        const appear=easeOut(p/.22);

        if (effect.spellId.startsWith("priest-")) {
          if(effect.spellId==="priest-renew"){
            const snap=Math.exp(-p*11);
            const radius=11+eased*31;

            glow.circle(dx,dy,11+snap*18).fill({
              color:profile.core,alpha:alpha*fade*snap*.10
            });
            glow.circle(dx,dy,radius+8).stroke({
              color:profile.main,width:10,alpha:alpha*fade*.13
            });
            core.circle(dx,dy,radius).stroke({
              color:profile.main,width:2.1,alpha:alpha*fade*.68
            });
            core.circle(dx,dy,Math.max(6,radius-9)).stroke({
              color:profile.core,width:1.35,alpha:alpha*fade*.48
            });

            // Gentle holy motes orbit upward; Renew stays visually restrained.
            for(let i=0;i<8;i++){
              const a=i/8*Math.PI*2-p*1.10+seed*.004;
              const rr=10+eased*(18+(i%2)*5);
              const x=dx+Math.cos(a)*rr;
              const y=dy+Math.sin(a)*rr-p*7;
              glow.circle(x,y,4+(i%2)).fill({
                color:i%3===0?profile.accent:profile.main,
                alpha:alpha*fade*.055
              });
              core.circle(x,y,1.4+(i%3)*.5).fill({
                color:i%3===0?profile.accent:(i%2?profile.core:profile.main),
                alpha:alpha*fade*.64,
              });
            }

            for(let i=0;i<4;i++){
              const a=i*Math.PI/2+.22-p*.22;
              const inner=8;
              const outer=17+eased*11;
              core
                .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
                .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
                .stroke({
                  color:i%2?profile.core:profile.main,
                  width:1.25,alpha:alpha*fade*.42
                });
            }
            continue;
          }

          const greater=effect.spellId==="priest-greater-heal";
          const top=dy-(greater?126:84);
          const beamWidth=greater?64:40;
          const beamAlpha=alpha*fade*appear;
          const contact=Math.exp(-p*(greater?8:12));

          // Vertical celestial column. Greater Heal is broader and slower;
          // Flash Heal stays compact and immediate.
          glow.moveTo(dx,top).lineTo(dx,dy+12).stroke({
            color:profile.main,
            width:beamWidth,
            alpha:beamAlpha*(greater?.19:.14),
          });
          glow.moveTo(dx,top+5).lineTo(dx,dy+9).stroke({
            color:profile.core,
            width:beamWidth*.48,
            alpha:beamAlpha*(greater?.15:.10),
          });

          const lanes=greater?10:6;
          for(let i=0;i<lanes;i++){
            const lane=i/Math.max(1,lanes-1)-.5;
            const topX=dx+lane*beamWidth*.80;
            const bottomX=dx+lane*beamWidth*.22;
            core
              .moveTo(topX,top+(i%3)*5)
              .lineTo(bottomX,dy+8)
              .stroke({
                color:i%3===0?profile.core:(i%2?profile.main:profile.accent),
                width:i===Math.floor(lanes/2)?3.8:(greater?2.2:1.8),
                alpha:beamAlpha*(i%3===0?.76:.50),
              });
          }

          const haloR=14+eased*(greater?48:33);
          glow.circle(dx,dy,haloR+6).stroke({
            color:profile.main,width:greater?15:10,alpha:alpha*fade*(greater?.16:.12)
          });
          core.circle(dx,dy,haloR).stroke({
            color:profile.main,width:greater?3.1:2.4,alpha:alpha*fade*.80
          });
          core.circle(dx,dy,Math.max(8,haloR-11)).stroke({
            color:profile.core,width:1.55,alpha:alpha*fade*.60
          });

          const rays=greater?12:8;
          for(let i=0;i<rays;i++){
            const a=i/rays*Math.PI*2+p*.20+seed*.002;
            const inner=9+eased*5;
            const outer=22+eased*((greater?43:28)+(i%3)*7);
            glow
              .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
              .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
              .stroke({
                color:i%4===0?profile.accent:profile.main,
                width:6+(i%3===0?2:0),
                alpha:alpha*fade*.055
              });
            core
              .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
              .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
              .stroke({
                color:i%4===0?profile.accent:(i%2?profile.core:profile.main),
                width:i%3===0?2.0:1.35,
                alpha:alpha*fade*(greater?.64:.54),
              });
          }

          const motes=greater?16:10;
          for(let i=0;i<motes;i++){
            const a=i/motes*Math.PI*2-p*(i%2?.55:-.38)+seed*.006;
            const rr=16+eased*(17+(i%4)*6);
            const x=dx+Math.cos(a)*rr;
            const y=dy+Math.sin(a)*rr-p*(greater?13:8);
            glow.circle(x,y,4+(i%2)).fill({
              color:i%4===0?profile.accent:profile.main,
              alpha:alpha*fade*.06
            });
            core.circle(x,y,1.2+(i%3)*.5).fill({
              color:i%4===0?profile.accent:(i%2?profile.core:profile.main),
              alpha:alpha*fade*.64,
            });
          }

          // Strong landing beat fixes Greater Heal's previously weak target
          // contact. Flash Heal receives the same grammar at smaller scale.
          glow.circle(dx,dy,9+contact*(greater?27:18)).fill({
            color:profile.core,
            alpha:alpha*fade*contact*(greater?.18:.13)
          });
          core.circle(dx,dy,4+contact*(greater?8:5)).fill({
            color:profile.core,
            alpha:alpha*fade*(.56+contact*.34)
          });

          if(greater){
            const land=easeOut(p/.42);
            for(let i=0;i<6;i++){
              const a=i/6*Math.PI*2+.10;
              const inner=10;
              const outer=24+land*(18+(i%2)*7);
              core
                .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
                .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
                .stroke({
                  color:i%2?profile.core:profile.main,
                  width:1.7+(i%3===0?.5:0),
                  alpha:alpha*fade*.62
                });
            }
          }
          continue;
        }

        if (effect.spellId.startsWith("druid-")) {
          const swift=effect.spellId==="druid-swiftmend";
          const regrowth=effect.spellId==="druid-regrowth";
          const lifebloom=effect.spellId==="druid-lifebloom";
          const count=swift?18:(regrowth?15:(lifebloom?14:11));
          const bloomR=13+eased*(swift?40:(regrowth?36:29))*power;

          glow.circle(dx,dy,bloomR*.90).fill({
            color:profile.main,
            alpha:alpha*fade*(swift?.13:(regrowth?.11:.08)),
          });
          glow.circle(dx,dy,bloomR).stroke({
            color:profile.main,
            width:swift?13:(regrowth?11:8),
            alpha:alpha*fade*(swift?.15:.10),
          });

          if(regrowth){
            for(let i=0;i<6;i++){
              const side=(i-2.5)*8;
              const sway=Math.sin(i*1.7+p*5.5)*12;
              core
                .moveTo(dx+side,dy+20)
                .lineTo(dx+side+sway*.40,dy-4-p*20)
                .lineTo(dx+side*.28+sway,dy-35-p*16)
                .stroke({
                  color:i%2?profile.main:profile.core,
                  width:2.2+(i%3===0?.6:0),
                  alpha:alpha*fade*.62,
                });
            }
          }

          for(let i=0;i<count;i++){
            const a=i/count*Math.PI*2+p*(i%2?1.8:-1.45)+seed*.006;
            const rr=8+eased*(20+(i%4)*6)*(swift?1.25:1);
            leaf(
              core,
              dx+Math.cos(a)*rr,
              dy+Math.sin(a)*rr-p*(lifebloom?16:9),
              a+.55+p*(i%2?1:-.8),
              4.0+(i%3)*1.0+(swift?.7:0),
              i%4===0?profile.core:(i%2?profile.main:profile.accent),
              alpha*fade*(swift?.82:.72)
            );
          }

          if(lifebloom){
            const petals=8;
            for(let i=0;i<petals;i++){
              const a=i/petals*Math.PI*2+p*.38;
              const rr=8+eased*13;
              leaf(
                core,
                dx+Math.cos(a)*rr,
                dy+Math.sin(a)*rr,
                a,
                6.3+(i%2)*.8,
                i%2?profile.main:profile.core,
                alpha*fade*.84
              );
            }
            core.circle(dx,dy,4.5+eased*3.5).fill({
              color:profile.core,alpha:alpha*fade*.82
            });
          }

          if(swift){
            for(let i=0;i<10;i++){
              const a=i/10*Math.PI*2+seed*.009;
              const inner=10;
              const outer=24+eased*(25+(i%3)*6);
              core
                .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
                .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
                .stroke({
                  color:i%3===0?profile.core:profile.main,
                  width:1.8+(i%3===0?.7:0),
                  alpha:alpha*fade*.68,
                });
            }
          }

          core.circle(dx,dy,bloomR).stroke({
            color:profile.main,width:2.3+(strong?.7:0),alpha:alpha*fade*.68
          });
          core.circle(dx,dy,Math.max(7,bloomR-9)).stroke({
            color:profile.core,width:1.35,alpha:alpha*fade*.48
          });
          continue;
        }

        const holyShock=effect.spellId==="paladin-holy-shock";
        const holyLight=effect.spellId==="paladin-holy-light";
        const flashLight=effect.spellId==="paladin-flash-light";
        const word=effect.spellId==="paladin-word-of-glory";
        const contact=Math.exp(-p*(holyShock?14:(holyLight?8:11)));
        const radius=13+eased*(holyShock?40:(holyLight?50:(word?47:35)));

        // Paladin VFX 3.0 healing = solar seals and angular holy plates,
        // deliberately different from Priest's soft celestial restoration.
        glow.circle(dx,dy,radius*.90).fill({
          color:profile.main,
          alpha:alpha*fade*(holyShock?.17:(holyLight?.14:.11)),
        });
        glow.circle(dx,dy,radius+5).stroke({
          color:profile.main,
          width:holyLight?15:(word?13:11),
          alpha:alpha*fade*(holyLight?.17:.13),
        });

        const spokes=holyShock?12:(holyLight?10:8);
        for(let i=0;i<spokes;i++){
          const a=i/spokes*Math.PI*2+(holyShock?-p*2.2:p*.36);
          const inner=radius*(holyShock?.26:.34);
          const outer=radius*(holyShock?1.38:(holyLight?1.30:1.16));

          glow
            .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
            .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
            .stroke({
              color:i%2?profile.main:profile.core,
              width:holyShock?8:7,
              alpha:alpha*fade*.06,
            });
          core
            .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
            .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
            .stroke({
              color:i%2?profile.main:profile.core,
              width:holyShock?(i%3===0?2.9:1.9):(holyLight?2.6:1.9),
              alpha:alpha*fade*(holyShock?.82:.70),
            });
        }

        // Counter-rotating angular seals are the class signature.
        for(let layer=0;layer<2;layer++){
          const rot=Math.PI/4+(layer?-.38:.34)*p;
          const rr=radius*(layer?.47:.62);
          const square=[
            point(dx,dy,-rr,-rr,rot),
            point(dx,dy,rr,-rr,rot),
            point(dx,dy,rr,rr,rot),
            point(dx,dy,-rr,rr,rot),
          ];
          polygon(glow,square,{
            color:layer?profile.core:profile.main,
            width:7,
            alpha:alpha*fade*.055,
          });
          polygon(core,square,{
            color:layer?profile.core:profile.main,
            width:layer?1.55:2.0,
            alpha:alpha*fade*(layer?.50:.66),
          });
        }

        if(holyShock){
          // Instant emergency heal: very fast sunburst with a white center.
          glow.circle(dx,dy,10+contact*25).fill({
            color:profile.core,alpha:alpha*fade*contact*.18
          });
          core.circle(dx,dy,4+contact*8).fill({
            color:profile.core,alpha:alpha*fade*(.62+contact*.32)
          });
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2-p*.55;
            const rr=17+eased*(18+(i%2)*5);
            core.circle(
              dx+Math.cos(a)*rr,
              dy+Math.sin(a)*rr,
              1.4+(i%2)*.45
            ).fill({
              color:i%2?profile.core:profile.accent,
              alpha:alpha*fade*.62
            });
          }
        }

        if(holyLight){
          // Heavy heal: a straight solar pillar lands inside the angular seal.
          const top=dy-108;
          glow.moveTo(dx,top).lineTo(dx,dy+12).stroke({
            color:profile.main,width:54,alpha:alpha*fade*appear*.16
          });
          glow.moveTo(dx,top+4).lineTo(dx,dy+8).stroke({
            color:profile.core,width:24,alpha:alpha*fade*appear*.11
          });
          core.moveTo(dx,top).lineTo(dx,dy+9).stroke({
            color:profile.core,width:4.4,alpha:alpha*fade*appear*.78
          });
          for(let i=0;i<5;i++){
            const side=(i-2)*10;
            core
              .moveTo(dx+side,top+8+(i%2)*4)
              .lineTo(dx+side*.26,dy+7)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:1.8+(i===2?.5:0),
                alpha:alpha*fade*.56,
              });
          }

          // Strong target landing for the large heal.
          glow.circle(dx,dy,10+contact*29).fill({
            color:profile.core,alpha:alpha*fade*contact*.18
          });
          core.circle(dx,dy,5+contact*9).fill({
            color:profile.core,alpha:alpha*fade*(.58+contact*.34)
          });
        }

        if(flashLight){
          // Quick cast: one compact four-point seal, no oversized beam.
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+Math.PI/4;
            const inner=8;
            const outer=20+eased*13;
            core
              .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
              .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:1.7,alpha:alpha*fade*.60
              });
          }
          glow.circle(dx,dy,8+contact*17).fill({
            color:profile.core,alpha:alpha*fade*contact*.12
          });
        }

        if(word){
          // Word of Glory = instant radiant crown / banner shape above target.
          const rise=24+eased*20;
          glow
            .moveTo(dx-31,dy-rise)
            .lineTo(dx-15,dy-rise-19)
            .lineTo(dx,dy-rise-6)
            .lineTo(dx+15,dy-rise-19)
            .lineTo(dx+31,dy-rise)
            .stroke({
              color:profile.main,width:12,alpha:alpha*fade*.16
            });
          core
            .moveTo(dx-31,dy-rise)
            .lineTo(dx-15,dy-rise-19)
            .lineTo(dx,dy-rise-6)
            .lineTo(dx+15,dy-rise-19)
            .lineTo(dx+31,dy-rise)
            .stroke({
              color:profile.core,width:3.0,alpha:alpha*fade*.88
            });

          for(const sign of [-1,1]){
            core
              .moveTo(dx+sign*15,dy-rise-19)
              .lineTo(dx+sign*15,dy-rise+4)
              .stroke({
                color:profile.accent,width:1.5,alpha:alpha*fade*.54
              });
          }
          glow.circle(dx,dy,11+contact*23).fill({
            color:profile.core,alpha:alpha*fade*contact*.15
          });
        }

        core.circle(dx,dy,radius).stroke({
          color:profile.main,width:2.7+(strong?.6:0),alpha:alpha*fade*.78
        });
        core.circle(dx,dy,Math.max(8,radius-11)).stroke({
          color:profile.core,width:1.5,alpha:alpha*fade*.60
        });
        core.circle(dx,dy,strong?7.2:5.6).fill({
          color:profile.core,alpha:alpha*fade*.88
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
          const snap=Math.exp(-p*10);
          const wardR=28+appear*5;

          glow.circle(dx,dy,wardR+10).fill({
            color:profile.accent,alpha:a*(.055+snap*.04)
          });
          glow.circle(dx,dy,wardR+7).stroke({
            color:profile.main,width:11,alpha:a*.11
          });

          for(let i=0;i<4;i++){
            const start=i*Math.PI/2+.16+p*.32;
            arc(glow,dx,dy,wardR+(i%2)*4,start,start+.92,{
              color:i===2?profile.core:profile.main,
              width:8,alpha:a*.07
            },8);
            arc(core,dx,dy,wardR+(i%2)*4,start,start+.92,{
              color:i===2?profile.core:profile.main,
              width:2.5+(i===2?.4:0),
              alpha:a*(.58+i*.04),
            },8);
          }

          const shield=[
            {x:dx,y:dy-27},{x:dx+16,y:dy-8},{x:dx+12,y:dy+19},
            {x:dx,y:dy+28},{x:dx-12,y:dy+19},{x:dx-16,y:dy-8},
          ];
          polygon(glow,shield,{color:profile.main,alpha:a*.08},true);
          polygon(core,shield,{
            color:profile.accent,width:2.0,alpha:a*.82
          });

          // Inner cross/ward motif makes the defensive readable at a glance.
          core
            .moveTo(dx,dy-15).lineTo(dx,dy+15)
            .moveTo(dx-10,dy).lineTo(dx+10,dy)
            .stroke({color:profile.core,width:1.7,alpha:a*.58});
          core.circle(dx,dy,4+snap*3).fill({
            color:profile.core,alpha:a*(.42+snap*.28)
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
          const snap=Math.exp(-p*10);
          const rr=22+easeOut(p)*9;

          glow.circle(dx,dy,rr+12).fill({
            color:profile.main,alpha:a*(.055+snap*.045)
          });
          glow.circle(dx,dy,rr+8).stroke({
            color:profile.main,width:11,alpha:a*.10
          });

          for(let i=0;i<4;i++){
            const ang=i*Math.PI/2+p*.30;
            const cx=dx+Math.cos(ang)*rr;
            const cy=dy+Math.sin(ang)*rr;
            const plate=[
              point(cx,cy,-8,-8,ang),
              point(cx,cy,8,-8,ang),
              point(cx,cy,11,3,ang),
              point(cx,cy,0,11,ang),
              point(cx,cy,-11,3,ang),
            ];
            polygon(glow,plate,{color:profile.main,alpha:a*.08},true);
            polygon(core,plate,{
              color:i%2?profile.core:profile.main,
              width:2.8,alpha:a*.84
            });
            core.circle(cx,cy,1.8).fill({
              color:profile.core,alpha:a*.68
            });
          }

          // Central diamond seal locks the four plates together.
          const seal=[
            point(dx,dy,0,-14,p*.12),
            point(dx,dy,14,0,p*.12),
            point(dx,dy,0,14,p*.12),
            point(dx,dy,-14,0,p*.12),
          ];
          polygon(glow,seal,{color:profile.core,alpha:a*.08},true);
          polygon(core,seal,{color:profile.core,width:1.8,alpha:a*.68});
          core.circle(dx,dy,4+snap*3).fill({
            color:profile.core,alpha:a*(.42+snap*.28)
          });
          continue;
        }

        if(effect.spellId==="shaman-astral-shift"){
          const colors=[profile.main,profile.core,profile.accent];
          const appear=easeOut(p/.20);
          const snap=Math.exp(-p*10);

          glow.circle(dx,dy,25+appear*12).fill({
            color:profile.main,alpha:a*(.07+snap*.08)
          });
          glow.circle(dx,dy,31+appear*10).stroke({
            color:profile.accent,width:11,alpha:a*.08
          });

          // Three offset astral bands phase around the caster, each with a
          // bright anchor node and a dim trailing afterimage.
          for(let i=0;i<3;i++){
            const ang=p*(i%2?4.2:-3.7)+i*Math.PI*2/3;
            const rr=18+i*7+appear*3;
            arc(glow,dx,dy,rr,ang-.72,ang+.72,{
              color:colors[i],width:8,alpha:a*.08
            },8);
            arc(core,dx,dy,rr,ang-.62,ang+.62,{
              color:colors[i],width:1.8,alpha:a*.60
            },8);
            core.circle(dx+Math.cos(ang)*rr,dy+Math.sin(ang)*rr,3.0+(i===1?.7:0)).fill({
              color:colors[i],alpha:a*.82
            });
            core.circle(
              dx+Math.cos(ang-.48)*(rr+2),
              dy+Math.sin(ang-.48)*(rr+2),
              1.4
            ).fill({color:profile.core,alpha:a*.42});
          }

          core.circle(dx,dy,8+snap*5).stroke({
            color:profile.core,width:1.4,alpha:a*(.42+snap*.25)
          });
          continue;
        }

        if(effect.spellId==="warlock-resolve"){
          const appear=easeOut(p/.20);
          const snap=Math.exp(-p*10);
          const wardR=22+appear*10;

          glow.circle(dx,dy,wardR+11).fill({
            color:profile.accent,alpha:a*(.08+snap*.06)
          });
          glow.circle(dx,dy,wardR+7).stroke({
            color:profile.main,width:11,alpha:a*.10
          });

          for(let i=0;i<5;i++){
            const ang=i/5*Math.PI*2-p*.42;
            const outer=wardR+7+(i%2)*3;
            const mid=wardR;
            const inner=wardR-10;
            glow
              .moveTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer)
              .lineTo(dx+Math.cos(ang+.26)*mid,dy+Math.sin(ang+.26)*mid)
              .lineTo(dx+Math.cos(ang+.50)*inner,dy+Math.sin(ang+.50)*inner)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:8,
                alpha:a*.08,
              });
            core
              .moveTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer)
              .lineTo(dx+Math.cos(ang+.26)*mid,dy+Math.sin(ang+.26)*mid)
              .lineTo(dx+Math.cos(ang+.50)*inner,dy+Math.sin(ang+.50)*inner)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:2.2,
                alpha:a*.72,
              });
          }

          core.circle(dx,dy,wardR-4).stroke({
            color:profile.core,width:1.35,alpha:a*.44
          });
          core.circle(dx,dy,5+snap*4).fill({
            color:profile.core,alpha:a*(.42+snap*.30)
          });
          continue;
        }

        // DK Rune Tap VFX 3.0: blood-rune plates lock into a short defensive ward.
        const rot=-p*.7;
        const snap=Math.exp(-p*10);
        const wardR=source.radius+15+appear*4;
        glow.circle(dx,dy,wardR+11).fill({
          color:profile.accent,alpha:a*(.07+snap*.05)
        });
        glow.circle(dx,dy,wardR+7).stroke({
          color:profile.main,width:10,alpha:a*.10
        });

        for(let i=0;i<4;i++){
          const ang=i*Math.PI/2+rot;
          const inner=source.radius+4;
          const outer=source.radius+20;
          const p0=point(dx,dy,-8,-inner,ang);
          const p1=point(dx,dy,0,-outer,ang);
          const p2=point(dx,dy,8,-inner,ang);

          glow.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).lineTo(p2.x,p2.y).stroke({
            color:i%2?profile.core:profile.main,width:8,alpha:a*.08
          });
          core.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).lineTo(p2.x,p2.y).stroke({
            color:i%2?profile.core:profile.main,width:2.6,alpha:a*.76
          });
          core.circle(p1.x,p1.y,1.8).fill({
            color:profile.core,alpha:a*.68
          });
        }

        const rune=[
          point(dx,dy,-12,-12,rot),
          point(dx,dy,12,-12,rot),
          point(dx,dy,12,12,rot),
          point(dx,dy,-12,12,rot),
        ];
        polygon(glow,rune,{color:profile.main,alpha:a*.08},true);
        polygon(core,rune,{color:profile.core,width:1.7,alpha:a*.72});
        core.circle(dx,dy,4+snap*3).fill({
          color:profile.core,alpha:a*(.46+snap*.26)
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
          const snap=Math.exp(-p*12);

          glow.circle(0,0,source.radius+13+wave*58).fill({
            color:profile.accent,alpha:alpha*fade*.045
          });
          glow.circle(0,0,source.radius+10+snap*18).fill({
            color:profile.core,alpha:alpha*fade*snap*.09
          });

          for(let layer=0;layer<3;layer++){
            const radius=source.radius+12+wave*(82+layer*17);
            for(let i=0;i<=32;i++){
              const ang=i/32*Math.PI*2;
              const wobble=Math.sin(ang*5+p*10+layer)*(3.5+layer);
              const rr=radius+wobble;
              const x=Math.cos(ang)*rr;
              const y=Math.sin(ang)*rr;
              if(i===0) glow.moveTo(x,y); else glow.lineTo(x,y);
            }
            glow.stroke({
              color:layer===1?profile.core:profile.main,
              width:9-layer,
              alpha:alpha*fade*(.06-layer*.01),
            });

            for(let i=0;i<=32;i++){
              const ang=i/32*Math.PI*2;
              const wobble=Math.sin(ang*5+p*10+layer)*(3.5+layer);
              const rr=radius+wobble;
              const x=Math.cos(ang)*rr;
              const y=Math.sin(ang)*rr;
              if(i===0) core.moveTo(x,y); else core.lineTo(x,y);
            }
            core.stroke({
              color:layer===1?profile.core:profile.main,
              width:2.7-layer*.45,
              alpha:alpha*fade*(.56-layer*.10),
            });
          }

          // Brief psychic thorns around the Priest sell the violent fear pulse.
          for(let i=0;i<8;i++){
            const ang=i/8*Math.PI*2+.16;
            const inner=source.radius+5;
            const outer=source.radius+18+wave*(15+(i%3)*5);
            core
              .moveTo(Math.cos(ang)*inner,Math.sin(ang)*inner)
              .lineTo(Math.cos(ang+.10)*outer,Math.sin(ang+.10)*outer)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:1.5+(i%3===0?.4:0),
                alpha:alpha*fade*.50
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
          const snap=Math.exp(-p*16);
          const ringFade=Math.exp(-p*2.9);
          const radius=12+burst*48;

          glow.circle(dx,dy,13+snap*24).fill({
            color:profile.core,
            alpha:alpha*fade*snap*.22,
          });
          glow.circle(dx,dy,radius+12).stroke({
            color:profile.main,
            width:11,
            alpha:alpha*fade*ringFade*.12,
          });
          core.circle(dx,dy,radius).stroke({
            color:profile.main,
            width:2.7,
            alpha:alpha*fade*ringFade*.72,
          });
          core.circle(dx,dy,Math.max(9,radius-13)).stroke({
            color:profile.core,
            width:1.25,
            alpha:alpha*fade*ringFade*.38,
          });

          // Jagged frozen-floor fractures shoot out first; taller crystals sit
          // on every other branch so the burst has a clear physical silhouette.
          for(let i=0;i<16;i++){
            const ang=i/16*Math.PI*2+seed*.007;
            const branch=18+burst*(29+(i%4)*7);
            const inner=7+burst*7;
            const bend=ang+(i%2?.055:-.055);
            const sx=dx+Math.cos(ang)*inner;
            const sy=dy+Math.sin(ang)*inner;
            const ex=dx+Math.cos(bend)*branch;
            const ey=dy+Math.sin(bend)*branch;

            glow
              .moveTo(sx,sy)
              .lineTo(ex,ey)
              .stroke({
                color:profile.main,
                width:i%4===0?5.5:3,
                alpha:alpha*fade*.08,
              });
            core
              .moveTo(sx,sy)
              .lineTo(ex,ey)
              .stroke({
                color:i%4===0?profile.core:profile.main,
                width:i%4===0?2.4:1.35,
                alpha:alpha*fade*.64,
              });

            if(i%2===0){
              const shardR=branch+4;
              const cx=dx+Math.cos(ang)*shardR;
              const cy=dy+Math.sin(ang)*shardR;
              const h=5+(i%4)*1.8;
              core
                .moveTo(cx,cy-h)
                .lineTo(cx+3.2,cy)
                .lineTo(cx,cy+h)
                .lineTo(cx-3.2,cy)
                .lineTo(cx,cy-h)
                .fill({
                  color:i%4===0?profile.core:profile.main,
                  alpha:alpha*fade*.68,
                });
            }
          }
          continue;
        }

        if(effect.spellId==="mage-polymorph"){
          const build=easeOut(p/.32);
          const snap=Math.exp(-p*11);
          const spin=p*5.4+seed*.008;
          const rr=14+build*23;

          glow.circle(dx,dy,12+snap*18).fill({
            color:profile.main,
            alpha:alpha*fade*(.05+snap*.18),
          });

          // Broken counter-rotating rings create an unmistakable arcane
          // transformation moment without relying on a literal sheep sprite.
          for(let ring=0;ring<3;ring++){
            const radius=rr+ring*7;
            const phase=spin*(ring%2?-.62:.48)+ring*.37;
            for(let seg=0;seg<4;seg++){
              const a0=phase+seg*Math.PI/2+.12;
              arc(core,dx,dy,radius,a0,a0+.62,{
                color:ring===1?profile.core:(ring===2?profile.accent:profile.main),
                width:ring===1?2.1:1.55,
                alpha:alpha*fade*(.66-ring*.09),
              },7);
            }
          }

          // Central tilted transmutation diamond snaps into place on impact.
          const diamondR=9+build*7+snap*4;
          const phase=spin*.32+Math.PI/4;
          const pts=[];
          for(let i=0;i<4;i++){
            const a=phase+i*Math.PI/2;
            pts.push({x:dx+Math.cos(a)*diamondR,y:dy+Math.sin(a)*diamondR});
          }
          pts.push(pts[0]);
          core.moveTo(pts[0].x,pts[0].y);
          for(let i=1;i<pts.length;i++) core.lineTo(pts[i].x,pts[i].y);
          core.stroke({
            color:profile.core,
            width:2,
            alpha:alpha*fade*.80,
          });

          // Small arcane "puffs" and four-point sparkles keep Polymorph lighter
          // and more playful than the aggressive Arcane Barrage language.
          for(let i=0;i<8;i++){
            const ang=i/8*Math.PI*2-spin*.42;
            const orbit=19+build*(10+(i%3)*4);
            const x=dx+Math.cos(ang)*orbit;
            const y=dy+Math.sin(ang)*orbit-(i%2)*2;
            glow.circle(x,y,4+(i%2)).fill({
              color:profile.main,
              alpha:alpha*fade*.09,
            });
            core.circle(x,y,1.5+(i%3)*.35).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:alpha*fade*.60,
            });
            if(i%2===0){
              core
                .moveTo(x-3,y).lineTo(x+3,y)
                .moveTo(x,y-3).lineTo(x,y+3)
                .stroke({
                  color:profile.core,width:1,alpha:alpha*fade*.55
                });
            }
          }
          continue;
        }

        if(effect.spellId==="shaman-hex"){
          const build=easeOut(p/.34);
          const snap=Math.exp(-p*12);
          const radius=14+build*25;
          const spin=p*2.4+seed*.006;

          glow.circle(dx,dy,radius+9).stroke({
            color:profile.main,width:10,alpha:alpha*fade*.10
          });
          glow.circle(dx,dy,11+snap*17).fill({
            color:profile.core,alpha:alpha*fade*snap*.10
          });

          // Six broken nature runes lock into a hexagonal seal.
          for(let i=0;i<6;i++){
            const center=i/6*Math.PI*2+spin*(i%2?.28:-.22);
            arc(core,dx,dy,radius+(i%2)*4,center-.34,center+.34,{
              color:i%3===0?profile.core:profile.main,
              width:i%3===0?2.2:1.6,
              alpha:alpha*fade*.64
            },6);
            const rr=radius+8+(i%2)*3;
            core.circle(dx+Math.cos(center)*rr,dy+Math.sin(center)*rr,1.7+(i%3===0?.6:0)).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:alpha*fade*.66
            });
          }

          const hex=[];
          for(let i=0;i<6;i++){
            const a=-Math.PI/2+i*Math.PI/3;
            hex.push({x:dx+Math.cos(a)*15,y:dy+Math.sin(a)*15});
          }
          polygon(core,hex,{
            color:profile.accent,width:1.9,alpha:alpha*fade*.72
          });
          core.circle(dx,dy,3.4+snap*2).fill({
            color:profile.core,alpha:alpha*fade*.82
          });
          continue;
        }

        if(effect.spellId==="warlock-fear"){
          const burst=easeOut(p/.72);
          const snap=Math.exp(-p*11);
          const radius=13+burst*40;

          glow.circle(dx,dy,radius+10).stroke({
            color:profile.main,width:10,alpha:alpha*fade*.10
          });
          glow.circle(dx,dy,11+snap*18).fill({
            color:profile.accent,alpha:alpha*fade*snap*.12
          });

          for(let i=0;i<3;i++){
            const start=Math.PI*(1.02+i*.47)+p*(i%2?1.25:-1.0);
            arc(glow,dx,dy,radius+i*5,start,start+1.05,{
              color:i===1?profile.core:profile.main,
              width:8,
              alpha:alpha*fade*.07,
            },8);
            arc(core,dx,dy,radius+i*5,start,start+1.05,{
              color:i===1?profile.core:profile.main,
              width:2.2+(i===1?.35:0),
              alpha:alpha*fade*(.70-i*.08),
            },8);
          }

          const eyeW=18*(1-p*.40), eyeH=7.5*(1-p*.58);
          const eye=[
            {x:dx-eyeW,y:dy},
            {x:dx,y:dy-eyeH},
            {x:dx+eyeW,y:dy},
            {x:dx,y:dy+eyeH},
          ];
          polygon(glow,eye,{
            color:profile.main,alpha:alpha*fade*.09
          },true);
          polygon(core,eye,{
            color:profile.core,width:2.0,alpha:alpha*fade*.72
          });
          core.circle(dx,dy,3.0+snap*1.5).fill({
            color:profile.core,alpha:alpha*fade*.84
          });
          continue;
        }

        if(effect.spellId==="dk-chains"){
          const clamp=easeOut(p/.48);
          const snap=Math.exp(-p*12);
          const links=10;
          const ringR=22+clamp*5;

          glow.circle(dx,dy,12+snap*22).fill({
            color:profile.main,alpha:alpha*fade*snap*.12
          });
          glow.ellipse(dx,dy+8,ringR+10,11).stroke({
            color:profile.main,width:10,alpha:alpha*fade*.10
          });

          for(let i=0;i<links;i++){
            const ang=i/links*Math.PI*2+p*.68;
            const rr=20+(i%2)*4+clamp*2;
            const yOff=20-clamp*(9+(i%3)*5);
            const cx=dx+Math.cos(ang)*rr;
            const cy=dy+yOff+Math.sin(ang)*rr*.34;

            glow.ellipse(cx,cy,8,4).stroke({
              color:i%2?profile.main:profile.core,
              width:6,alpha:alpha*fade*.07
            });
            core.ellipse(cx,cy,6.2,3.1).stroke({
              color:i%2?profile.main:profile.core,
              width:2.3,alpha:alpha*fade*.80
            });

            if(i>0){
              const prevAng=(i-1)/links*Math.PI*2+p*.68;
              const prevR=20+((i-1)%2)*4+clamp*2;
              const px0=dx+Math.cos(prevAng)*prevR;
              const py0=dy+20-clamp*(9+((i-1)%3)*5)
                +Math.sin(prevAng)*prevR*.34;
              core.moveTo(px0,py0).lineTo(cx,cy).stroke({
                color:profile.main,width:1.2,alpha:alpha*fade*.38
              });
            }
          }

          // Frost anchors bite outward as the chain closes.
          for(let i=0;i<6;i++){
            const ang=i/6*Math.PI*2+.2;
            const inner=14+clamp*4;
            const outer=27+clamp*(11+(i%3)*4);
            core
              .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner+8)
              .lineTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer+8)
              .stroke({
                color:i%2?profile.core:profile.main,
                width:1.5+(i%3===0?.5:0),
                alpha:alpha*fade*.58,
              });
          }
          core.ellipse(dx,dy+8,ringR,8).stroke({
            color:profile.core,width:1.6,alpha:alpha*fade*.48
          });
          continue;
        }

        if(effect.spellId==="dk-mind-freeze"){
          const snap=easeOut(p/.34);
          const out=1-smooth((p-.55)/.45);
          const close=1-snap;
          const flash=Math.exp(-p*14);

          // Two frost jaws close on the target, then a compact rune shatters.
          for(const sign of [-1,1]){
            const outerX=dx+sign*(31+close*14);
            const innerX=dx+sign*(9+close*5);

            glow
              .moveTo(outerX,dy-20)
              .lineTo(innerX,dy)
              .lineTo(outerX,dy+20)
              .stroke({
                color:profile.main,width:10,alpha:alpha*out*.10
              });
            core
              .moveTo(outerX,dy-20)
              .lineTo(innerX,dy)
              .lineTo(outerX,dy+20)
              .stroke({
                color:sign>0?profile.core:profile.main,
                width:3.0,
                alpha:alpha*out*.86,
              });

            for(let tooth=0;tooth<3;tooth++){
              const yy=dy-11+tooth*11;
              core
                .moveTo(outerX,yy)
                .lineTo(dx+sign*(15+close*4),yy+(tooth-1)*2)
                .stroke({
                  color:profile.core,width:1.2,alpha:alpha*out*.58
                });
            }
          }

          glow.circle(dx,dy,10+flash*20).fill({
            color:profile.core,alpha:alpha*out*flash*.15
          });
          core.circle(dx,dy,7+snap*12).stroke({
            color:profile.core,width:2.0,alpha:alpha*out*.72
          });
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+.18;
            const r0=7;
            const r1=19+snap*(10+(i%2)*5);
            core
              .moveTo(dx+Math.cos(a)*r0,dy+Math.sin(a)*r0)
              .lineTo(dx+Math.cos(a+.08)*r1,dy+Math.sin(a+.08)*r1)
              .stroke({
                color:i%2?profile.main:profile.core,
                width:1.3+(i%3===0?.4:0),
                alpha:alpha*out*.62
              });
          }
          continue;
        }

        if(effect.spellId==="warrior-pummel"){
          const snap=easeOut(p/.34);
          const out=1-smooth((p-.54)/.46);
          const close=1-snap;
          const contact=Math.exp(-p*12);

          // Two blunt steel/gold plates slam together around the interrupted
          // target. Short and compact: this is a punch, not a weapon cleave.
          for(const sign of [-1,1]){
            const outerX=dx+sign*(34+close*13);
            const innerX=dx+sign*(9+close*5);
            glow
              .moveTo(outerX,dy-18)
              .lineTo(innerX,dy)
              .lineTo(outerX,dy+18)
              .stroke({
                color:profile.main,width:10,alpha:alpha*out*.10
              });
            core
              .moveTo(outerX,dy-18)
              .lineTo(innerX,dy)
              .lineTo(outerX,dy+18)
              .stroke({
                color:sign>0?profile.core:profile.main,
                width:3.2,
                alpha:alpha*out*.84,
              });
          }

          glow.circle(dx,dy,11+contact*18).fill({
            color:profile.core,alpha:alpha*out*contact*.16
          });
          core.circle(dx,dy,6+snap*11).stroke({
            color:profile.core,width:2.1,alpha:alpha*out*.72
          });

          for(let i=0;i<5;i++){
            const a=-.82+i*.41;
            const inner=8;
            const outer=19+snap*(11+(i%2)*5);
            core
              .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
              .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
              .stroke({
                color:i===2?profile.core:profile.accent,
                width:i===2?2.0:1.2,
                alpha:alpha*out*.62,
              });
          }
          continue;
        }

        if(effect.spellId==="rogue-kidney"){
          const snap=easeOut(p/.30);
          const out=1-smooth((p-.54)/.46);
          const contact=Math.exp(-p*14);

          glow.circle(dx,dy,9+contact*19).fill({
            color:profile.core,alpha:alpha*out*contact*.14
          });
          glow.circle(dx,dy,11+snap*25).stroke({
            color:profile.accent,width:9,alpha:alpha*out*.10
          });

          // Three short body-shot lanes collapse into the target, followed by
          // a tight stun snap. No oversized explosion: this is control.
          for(let i=0;i<3;i++){
            const ang=-.48+i*.48;
            const outer=31+(i===1?5:0);
            const inner=6+snap*2;
            glow
              .moveTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer)
              .lineTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
              .stroke({
                color:i===1?profile.core:profile.main,
                width:7,alpha:alpha*out*.07
              });
            core
              .moveTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer)
              .lineTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
              .stroke({
                color:i===1?profile.core:profile.main,
                width:2.2+(i===1?.5:0),
                alpha:alpha*out*.76
              });
          }

          core.circle(dx,dy,8+snap*15).stroke({
            color:profile.core,width:1.7,alpha:alpha*out*.56
          });
          for(let i=0;i<5;i++){
            const a=i/5*Math.PI*2+.22;
            const r0=8;
            const r1=19+snap*(8+(i%2)*4);
            core
              .moveTo(dx+Math.cos(a)*r0,dy+Math.sin(a)*r0)
              .lineTo(dx+Math.cos(a)*r1,dy+Math.sin(a)*r1)
              .stroke({
                color:i%2?profile.accent:profile.core,
                width:1.2+(i===2?.4:0),
                alpha:alpha*out*.52
              });
          }
          continue;
        }

        // Rogue Kick VFX 3.0: one fast diagonal interrupt lane with a compact
        // heel-snap and three tiny follow-through cuts.
        const kickAngle=-.52;
        const snap=easeOut(p/.32);
        const out=1-smooth((p-.54)/.46);
        const contact=Math.exp(-p*14);
        const ka=point(dx,dy,-29,11,kickAngle);
        const km=point(dx,dy,8,-5,kickAngle);
        const kb=point(dx,dy,29,-15,kickAngle);

        glow.moveTo(ka.x,ka.y).lineTo(km.x,km.y).lineTo(kb.x,kb.y).stroke({
          color:profile.main,width:10,alpha:alpha*out*.09
        });
        core.moveTo(ka.x,ka.y).lineTo(km.x,km.y).lineTo(kb.x,kb.y).stroke({
          color:profile.core,width:3.1,alpha:alpha*out*.84
        });

        glow.circle(dx,dy,8+contact*16).fill({
          color:profile.core,alpha:alpha*out*contact*.13
        });
        core.circle(dx,dy,5+snap*9).stroke({
          color:profile.accent,width:1.5,alpha:alpha*out*.50
        });

        for(let i=0;i<3;i++){
          const s=point(dx,dy,8+i*5,-4-i*3,kickAngle);
          const e=point(dx,dy,18+i*6,4-i*2,kickAngle);
          core.moveTo(s.x,s.y).lineTo(e.x,e.y).stroke({
            color:i===1?profile.core:profile.accent,
            width:1.35+(i===1?.3:0),
            alpha:alpha*out*.56
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
            const trailLen=Math.min(64,ll);

            // Broad dust/force lane under the existing sharp speed streaks.
            glow
              .moveTo(-mx*trailLen,-my*trailLen)
              .lineTo(-mx*4,-my*4)
              .stroke({
                color:profile.main,width:19,alpha:alpha*fade*.10
              });

            for(let i=0;i<7;i++){
              const off=(i-3)*4.2;
              const tail=trailLen-(i%3)*5;
              glow
                .moveTo(-mx*tail+sx*off,-my*tail+sy*off)
                .lineTo(-mx*5+sx*off*.35,-my*5+sy*off*.35)
                .stroke({
                  color:i%3===0?profile.core:profile.main,
                  width:6+(i%2)*2,
                  alpha:alpha*fade*.055,
                });
              core
                .moveTo(-mx*tail+sx*off,-my*tail+sy*off)
                .lineTo(-mx*5+sx*off*.35,-my*5+sy*off*.35)
                .stroke({
                  color:i%3===0?profile.core:profile.main,
                  width:1.4+(i%3)*.28,
                  alpha:alpha*fade*(.24+(i%3)*.05),
                });
            }

            // Small forward wedge sells shoulder-first momentum.
            for(const sign of [-1,1]){
              core
                .moveTo(mx*(source.radius+4),my*(source.radius+4))
                .lineTo(
                  mx*(source.radius+22)+sx*sign*11,
                  my*(source.radius+22)+sy*sign*11
                )
                .stroke({
                  color:sign>0?profile.core:profile.main,
                  width:2.0,
                  alpha:alpha*fade*.62,
                });
            }
          }

          glow.ellipse(0,source.radius*.65,15+p*34,5+p*9).stroke({
            color:profile.main,width:9,alpha:alpha*fade*.11
          });
          core.ellipse(0,source.radius*.65,11+p*29,3.5+p*6).stroke({
            color:profile.core,width:1.5,alpha:alpha*fade*.42
          });

          if(!missed){
            const hit=clamp01((p-.12)/.62);
            const hf=1-smooth((hit-.70)/.30);
            const ex=easeOut(hit);
            const flash=Math.exp(-hit*10);

            glow.circle(dx0,dy0,15+ex*43).stroke({
              color:profile.main,width:15,alpha:alpha*hf*.20
            });
            glow.circle(dx0,dy0,10+flash*18).fill({
              color:profile.core,alpha:alpha*hf*flash*.13
            });
            core.circle(dx0,dy0,8+ex*20).stroke({
              color:profile.core,width:2.7,alpha:alpha*hf*.80
            });

            // Directional shock cone continues the charge path through target.
            for(let i=0;i<5;i++){
              const spread=(i-2)*.18;
              const a=Math.atan2(dy0,dx0)+spread;
              const inner=9;
              const outer=28+ex*(18+(i===2?9:0));
              core
                .moveTo(dx0+Math.cos(a)*inner,dy0+Math.sin(a)*inner)
                .lineTo(dx0+Math.cos(a)*outer,dy0+Math.sin(a)*outer)
                .stroke({
                  color:i===2?profile.core:profile.main,
                  width:i===2?2.6:1.6,
                  alpha:alpha*hf*.68,
                });
            }

            for(let i=0;i<8;i++){
              const a=i*Math.PI*2/8+seed*.007;
              const inner=8+(i%2)*2;
              const outer=21+ex*(13+(i%3)*5);
              core
                .moveTo(dx0+Math.cos(a)*inner,dy0+Math.sin(a)*inner)
                .lineTo(dx0+Math.cos(a)*outer,dy0+Math.sin(a)*outer)
                .stroke({
                  color:i%3===0?profile.core:profile.accent,
                  width:1.4+(i%3===0?.5:0),
                  alpha:alpha*hf*.56,
                });
            }
          }
          continue;
        }

        if(effect.spellId==="rogue-shadowstep"){
          const ox=Number.isFinite(effect.sourceX)?effect.sourceX-source.x:0;
          const oy=Number.isFinite(effect.sourceY)?effect.sourceY-source.y:0;
          const out=1-clamp01(p/.50);
          const arrive=clamp01((p-.06)/.54);
          const vanishFlash=Math.exp(-p*13);

          // Vanish point: narrow shadow aperture and fragments pulled away.
          glow.circle(ox,oy,10+p*25).stroke({
            color:profile.accent,width:10,alpha:alpha*out*.09
          });
          core.circle(ox,oy,8+p*21).stroke({
            color:profile.accent,width:1.6,alpha:alpha*out*.50
          });
          glow.circle(ox,oy,7+vanishFlash*13).fill({
            color:profile.core,alpha:alpha*out*vanishFlash*.10
          });
          for(let i=0;i<9;i++){
            const ang=i/9*Math.PI*2+p*2.35+seed*.01;
            const rr=7+p*(17+(i%4)*5);
            const x=ox+Math.cos(ang)*rr;
            const y=oy+Math.sin(ang)*rr;
            core.circle(x,y,1.1+(i%3)*.4).fill({
              color:i%3===0?profile.core:profile.accent,
              alpha:alpha*out*.50
            });
          }

          // Arrival: fragments collapse inward around the new position and two
          // narrow dagger echoes point toward the target.
          for(let i=0;i<10;i++){
            const ang=i/10*Math.PI*2-arrive*1.65;
            const rr=34*(1-arrive*.70)+(i%2)*4;
            const x=Math.cos(ang)*rr;
            const y=Math.sin(ang)*rr;
            glow.circle(x,y,4+(i%2)).fill({
              color:profile.main,alpha:alpha*fade*.06
            });
            core.circle(x,y,1.2+(i%3)*.4).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:alpha*fade*.58
            });
          }

          for(const a of [-.62,.62]){
            const p0=point(0,0,-18,0,a);
            const p1=point(0,0,24,0,a);
            core.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
              color:a<0?profile.main:profile.core,
              width:1.7,
              alpha:alpha*fade*arrive*.58
            });
          }
          continue;
        }

        if(effect.spellId==="warrior-slam"){
          const impact=smooth(p/.34);

          glow
            .moveTo(dx-15,dy-58+impact*20)
            .lineTo(dx+6,dy+15)
            .stroke({
              color:profile.main,width:18,alpha:alpha*fade*impact*.18
            });
          glow
            .moveTo(dx-12,dy-54+impact*20)
            .lineTo(dx+6,dy+15)
            .stroke({
              color:profile.core,width:10,alpha:alpha*fade*impact*.14
            });
          core
            .moveTo(dx-13,dy-56+impact*20)
            .lineTo(dx+6,dy+15)
            .stroke({
              color:profile.main,width:8.2,alpha:alpha*fade*impact*.72
            });
          core
            .moveTo(dx-11,dy-53+impact*20)
            .lineTo(dx+6,dy+15)
            .stroke({
              color:profile.core,width:3.4,alpha:alpha*fade*impact*.98
            });

          const shock=clamp01((p-.18)/.62);
          if(shock>0 && !missed){
            const shockFade=(1-shock);
            const expand=easeOut(shock);
            const contact=Math.exp(-shock*14);

            glow.circle(dx,dy+8,10+contact*22).fill({
              color:profile.core,alpha:alpha*shockFade*contact*.16
            });
            core.circle(dx,dy+8,4+contact*7).fill({
              color:profile.core,alpha:alpha*shockFade*(.58+contact*.34)
            });

            glow.ellipse(
              dx,dy+14,
              19+expand*64,
              7+expand*20
            ).stroke({
              color:profile.main,width:13,alpha:alpha*shockFade*.18
            });
            core.ellipse(
              dx,dy+14,
              14+expand*56,
              5+expand*16
            ).stroke({
              color:profile.main,width:3.4,alpha:alpha*shockFade*.82
            });
            core.ellipse(
              dx,dy+14,
              9+expand*39,
              3+expand*10
            ).stroke({
              color:profile.core,width:1.8,alpha:alpha*shockFade*.70
            });

            glow.circle(dx,dy,14+expand*32).fill({
              color:profile.main,alpha:alpha*shockFade*.10
            });
            core.circle(dx,dy,6+expand*13).stroke({
              color:profile.core,width:2.3,alpha:alpha*shockFade*.72
            });

            for(let i=0;i<12;i++){
              const ang=-.35+i*Math.PI/11;
              const len=14+shock*(25+(i%4)*8);
              core
                .moveTo(dx+Math.cos(ang)*8,dy+13+Math.sin(ang)*4)
                .lineTo(dx+Math.cos(ang)*len,dy+13+Math.sin(ang)*len*.44)
                .stroke({
                  color:i%3===0?profile.core:profile.main,
                  width:1.7+(i%3===0?.7:0),
                  alpha:alpha*shockFade*.64
                });
            }

            for(let i=0;i<9;i++){
              const a=-2.65+i*.66+seed*.004;
              const rr=12+expand*(17+(i%3)*7);
              const x=dx+Math.cos(a)*rr;
              const y=dy+12+Math.sin(a)*rr*.42-shock*(i%2?5:2);
              glow.circle(x,y,4+(i%2)).fill({
                color:profile.main,alpha:alpha*shockFade*.07
              });
              core.circle(x,y,1.2+(i%3)*.45).fill({
                color:i%3===0?profile.core:profile.accent,
                alpha:alpha*shockFade*.62
              });
            }
          }
          continue;
        }

        // Death Knight VFX 3.0: attacker-side runic pressure stays compact,
        // but now has a blurred aura beneath crisp frost/blood rune strokes.
        if(dk){
          const death=effect.spellId==="dk-death-strike";
          const obliterate=effect.spellId==="dk-obliterate";
          const frostStrike=effect.spellId==="dk-frost-strike";
          const frost=obliterate || frostStrike;
          const build=easeOut(clamp01(p/.28));
          const release=1-smooth((p-.52)/.34);
          const spin=(death?-1:1)*(p*1.35+seed*.003);
          const auraR=source.radius+11+build*(obliterate?16:12);

          glow.circle(0,0,auraR+6).stroke({
            color:profile.main,
            width:obliterate?14:11,
            alpha:alpha*release*(obliterate?.17:.13),
          });
          core.circle(0,0,auraR).stroke({
            color:profile.main,
            width:obliterate?2.4:2.0,
            alpha:alpha*release*.64,
          });

          const runeCount=death?5:(obliterate?8:6);
          for(let i=0;i<runeCount;i++){
            const a=i/runeCount*Math.PI*2+spin;
            const inner=source.radius+5;
            const outer=source.radius+17+build*((obliterate?11:8)+(i%3)*4);
            const bend=a+(i%2?.13:-.13);
            glow
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(bend)*outer,Math.sin(bend)*outer)
              .stroke({
                color:i%3===0?profile.core:profile.main,
                width:6.5+(obliterate?1.5:0),
                alpha:alpha*release*.07
              });
            core
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(bend)*outer,Math.sin(bend)*outer)
              .stroke({
                color:i%3===0?profile.core:(i%2?profile.main:profile.accent),
                width:1.6+(i%3===0?.7:0),
                alpha:alpha*release*(.46+(i%3)*.08),
              });
          }

          if(frost){
            const cuts=obliterate?7:5;
            for(let i=0;i<cuts;i++){
              const a=-.92+i*(obliterate?.31:.44)+spin*.16;
              const r0=source.radius+8;
              const r1=r0+(obliterate?21:16)+build*(obliterate?11:8);
              glow
                .moveTo(Math.cos(a)*r0,Math.sin(a)*r0)
                .lineTo(Math.cos(a)*r1,Math.sin(a)*r1)
                .stroke({
                  color:profile.main,
                  width:obliterate?9:7,
                  alpha:alpha*release*.10,
                });
              core
                .moveTo(Math.cos(a)*r0,Math.sin(a)*r0)
                .lineTo(Math.cos(a)*r1,Math.sin(a)*r1)
                .stroke({
                  color:profile.core,
                  width:obliterate?1.8:1.45,
                  alpha:alpha*release*.62,
                });
            }
          }else if(death){
            const pulse=.5+.5*Math.sin(p*18+seed*.01);
            glow.circle(0,0,source.radius+4+build*8).fill({
              color:profile.main,
              alpha:alpha*release*(.07+.04*pulse),
            });
            core.circle(0,0,4+build*3).fill({
              color:profile.core,alpha:alpha*release*(.34+.18*pulse)
            });
          }
        }

        let slashCount=1;
        let slashLength=48;
        let slashWidth=3.8;
        if(effect.spellId==="warrior-rend"){slashCount=3;slashLength=62;slashWidth=3.4;}
        if(effect.spellId==="warrior-mortal-strike"){slashLength=92;slashWidth=7.8;}
        if(effect.spellId==="warrior-overpower"){slashCount=1;slashLength=78;slashWidth=4.8;}
        if(effect.spellId==="warrior-bloodthirst"){slashCount=3;slashLength=60;slashWidth=4.1;}
        if(effect.spellId==="rogue-garrote"){slashCount=1;slashLength=58;slashWidth=2.6;}
        if(effect.spellId==="rogue-sinister"){slashCount=1;slashLength=72;slashWidth=3.2;}
        if(effect.spellId==="rogue-eviscerate"){slashCount=4;slashLength=74;slashWidth=3.0;}
        if(effect.spellId==="rogue-mutilate"){slashCount=2;slashLength=76;slashWidth=3.8;}
        if(effect.spellId==="dk-obliterate"){slashCount=2;slashLength=102;slashWidth=7.6;}
        if(effect.spellId==="dk-death-strike"){slashCount=2;slashLength=90;slashWidth=6.5;}
        if(effect.spellId==="dk-frost-strike"){slashCount=2;slashLength=86;slashWidth=5.6;}
        if(effect.spellId==="shaman-stormstrike"){slashCount=2;slashLength=78;slashWidth=5.5;}

        for(let i=0;i<slashCount;i++){
          const delay=i*(slashCount>1?.055:0);
          const local=smooth((p-delay)/.28);
          if(local<=0) continue;
          const baseAngle=
            rogue
              ? (
                  effect.spellId==="rogue-garrote"
                    ? -.16
                    : effect.spellId==="rogue-sinister"
                      ? -.66
                      : effect.spellId==="rogue-mutilate"
                        ? (-.88+i*1.76)
                        : (-1.02+i*.68)
                )
              : dk
                ? (-.70+i*.92)
                : effect.spellId==="shaman-stormstrike"
                  ? (-.72+i*1.44)
                  : effect.spellId==="warrior-overpower"
                    ? -.18
                    : (-.72+i*.48);
          weaponSlash(
            core,
            glow,
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

        if(dk){
          const sweepFade=1-smooth((p-.64)/.36);
          const sweep=easeOut(clamp01(p/.40));
          const death=effect.spellId==="dk-death-strike";
          const baseR=death?34:39;

          for(let i=0;i<2;i++){
            const dir=i?1:-1;
            const a0=(death?-.92:-.78)+i*1.10-dir*sweep*.30;
            arc(
              glow,
              dx,
              dy,
              baseR+sweep*(18+i*7),
              a0,
              a0+dir*(1.22+i*.16),
              {
                color:i?profile.core:profile.main,
                width:11-i*2,
                alpha:alpha*sweepFade*(death?.12:.15),
              },
              10,
            );
            arc(
              core,
              dx,
              dy,
              baseR-4+sweep*(15+i*6),
              a0,
              a0+dir*(1.18+i*.14),
              {
                color:i?profile.core:profile.main,
                width:2.5+i*.45,
                alpha:alpha*sweepFade*.70,
              },
              10,
            );
          }
        }

        if(!missed){
          const hit=clamp01((p-.18)/.54);
          const hitFade=1-smooth((hit-.72)/.28);
          const expand=easeOut(hit);
          const heavyImpact=
            effect.spellId==="warrior-mortal-strike"
            || effect.spellId==="dk-obliterate"
            || effect.spellId==="shaman-stormstrike";
          const rogueImpact=
            effect.spellId==="rogue-eviscerate"
            || effect.spellId==="rogue-mutilate";

          // Shared impact flash: large enough to be felt, but tinted entirely
          // by the attack profile so Warrior, Rogue, DK and Shaman stay distinct.
          glow.circle(dx,dy,15+expand*(heavyImpact?47:36)).stroke({
            color:profile.main,
            width:heavyImpact?15:11,
            alpha:alpha*hitFade*(heavyImpact?.21:.17),
          });
          glow.circle(dx,dy,9+expand*(heavyImpact?29:23)).fill({
            color:profile.accent,
            alpha:alpha*hitFade*(heavyImpact?.13:.10),
          });
          core.circle(dx,dy,7+expand*(heavyImpact?19:15)).stroke({
            color:profile.core,
            width:heavyImpact?2.8:2.2,
            alpha:alpha*hitFade*.82,
          });

          const shards=
            effect.spellId==="dk-obliterate"
              || effect.spellId==="shaman-stormstrike"
              ? 16
              : rogueImpact ? 13 : 11;
          for(let i=0;i<shards;i++){
            const ang=i/shards*Math.PI*2+seed*.009;
            const inner=8+(i%2)*3;
            const outer=
              18+expand*
              (
                heavyImpact
                  ? 34+(i%4)*9
                  : rogueImpact
                    ? 28+(i%4)*7
                    : 27+(i%4)*7
              );
            core
              .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
              .lineTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer)
              .stroke({
                color:
                  effect.spellId==="shaman-stormstrike" && i%2
                    ? 0x78e6ff
                    : (i%3===0?profile.core:(i%2?profile.main:profile.accent)),
                width:1.8+(i%3===0?1.15:.25),
                alpha:alpha*hitFade*.76,
              });
          }

          // Warrior: broad red/gold cleave rings that feel like the target was
          // struck by force, not merely decorated by sparks.
          if(effect.spellId==="warrior-mortal-strike"){
            const flash=Math.exp(-hit*11);
            for(let i=0;i<3;i++){
              const a0=i*Math.PI*2/3+.2-hit*.18;
              arc(glow,dx,dy,25+expand*27,a0,a0+.90,{
                color:i===1?profile.core:profile.main,
                width:9,
                alpha:alpha*hitFade*.08
              },8);
              arc(core,dx,dy,23+expand*24,a0,a0+.90,{
                color:i===1?profile.core:profile.main,
                width:2.8,
                alpha:alpha*hitFade*.72
              },8);
            }
            glow.circle(dx,dy,19+expand*36).stroke({
              color:profile.main,width:12,alpha:alpha*hitFade*.15
            });
            // One massive diagonal weapon echo keeps Mortal Strike readable
            // above the shared melee sparks.
            const p0=point(dx,dy,-38,-7,-.72);
            const p1=point(dx,dy,39,7,-.72);
            glow.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
              color:profile.main,width:15,alpha:alpha*hitFade*.13
            });
            core.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
              color:profile.core,width:3.4,alpha:alpha*hitFade*.80
            });
            glow.circle(dx,dy,9+flash*17).fill({
              color:profile.core,alpha:alpha*hitFade*flash*.14
            });
          }

          if(effect.spellId==="warrior-rend"){
            // Three offset lacerations tear across the target, then leave a
            // restrained crimson wound burst rather than a generic explosion.
            for(let i=0;i<3;i++){
              const a=-.95+i*.22;
              const shift=(i-1)*6;
              const p0=point(dx+shift,dy,-28,0,a);
              const pm=point(dx+shift,dy,0,(i-1)*3,a);
              const p1=point(dx+shift,dy,30,0,a);
              glow.moveTo(p0.x,p0.y).lineTo(pm.x,pm.y).lineTo(p1.x,p1.y).stroke({
                color:profile.main,width:8,alpha:alpha*hitFade*.09
              });
              core.moveTo(p0.x,p0.y).lineTo(pm.x,pm.y).lineTo(p1.x,p1.y).stroke({
                color:i===1?profile.core:profile.main,
                width:2.0+(i===1?.5:0),
                alpha:alpha*hitFade*.78
              });
            }
            for(let i=0;i<6;i++){
              const a=i/6*Math.PI*2+seed*.014;
              const rr=16+expand*(13+(i%3)*4);
              core.circle(
                dx+Math.cos(a)*rr,
                dy+Math.sin(a)*rr-hit*(i%2?4:1),
                1.1+(i%2)*.4
              ).fill({
                color:i%2?profile.main:profile.core,
                alpha:alpha*hitFade*.58
              });
            }
          }

          if(effect.spellId==="warrior-overpower"){
            // Overpower is precision, not mass: one fast gold/steel crescent
            // and a narrow cross-snap on contact.
            const sweep=easeOut(hit);
            const a0=-1.22+sweep*.22;
            arc(glow,dx,dy,26+sweep*24,a0,a0+1.35,{
              color:profile.main,width:9,alpha:alpha*hitFade*.10
            },10);
            arc(core,dx,dy,24+sweep*21,a0,a0+1.35,{
              color:profile.core,width:2.5,alpha:alpha*hitFade*.78
            },10);
            for(const a of [-.22,.22]){
              const p0=point(dx,dy,-22,0,a);
              const p1=point(dx,dy,22,0,a);
              core.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
                color:a<0?profile.main:profile.core,
                width:1.8,
                alpha:alpha*hitFade*.64
              });
            }
          }

          if(effect.spellId==="warrior-bloodthirst"){
            // Bloodthirst pulls red fragments inward, then snaps outward: it
            // should feel savage and self-sustaining rather than just "three slashes".
            const thirst=easeOut(hit);
            for(let i=0;i<8;i++){
              const a=i/8*Math.PI*2+seed*.012-hit*.55;
              const outer=35+(i%3)*5;
              const inner=10+thirst*5;
              core
                .moveTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
                .lineTo(dx+Math.cos(a+.18)*inner,dy+Math.sin(a+.18)*inner)
                .stroke({
                  color:i%3===0?profile.core:profile.main,
                  width:1.7+(i%3===0?.5:0),
                  alpha:alpha*hitFade*.66,
                });
            }
            glow.circle(dx,dy,11+expand*29).fill({
              color:profile.main,alpha:alpha*hitFade*.12
            });
            core.circle(dx,dy,7+expand*14).stroke({
              color:profile.core,width:2.2,alpha:alpha*hitFade*.70
            });
          }

          // Rogue VFX 3.0: speed and precision over mass. Each strike has a
          // distinct cut pattern instead of sharing the same spark burst.
          if(effect.spellId==="rogue-garrote"){
            const snap=Math.exp(-hit*11);
            // One near-horizontal throat cut plus three restrained bleed flecks.
            const p0=point(dx,dy,-31,0,-.14);
            const p1=point(dx,dy,33,0,-.14);
            glow.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
              color:profile.main,width:9,alpha:alpha*hitFade*.10
            });
            core.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
              color:profile.core,width:2.4,alpha:alpha*hitFade*.82
            });
            for(let i=0;i<5;i++){
              const a=-.55+i*.28;
              const rr=13+expand*(10+(i%2)*4);
              core.circle(
                dx+Math.cos(a)*rr,
                dy+Math.sin(a)*rr+hit*(i%2?3:1),
                1.0+(i%2)*.35
              ).fill({
                color:i===2?profile.core:profile.main,
                alpha:alpha*hitFade*.58
              });
            }
            glow.circle(dx,dy,7+snap*12).fill({
              color:profile.main,alpha:alpha*hitFade*snap*.10
            });
          }

          if(effect.spellId==="rogue-sinister"){
            // Sinister Strike is the clean filler: one fast cut with a small
            // opposite afterimage and almost no radial clutter.
            for(let layer=0;layer<2;layer++){
              const a=layer===0?-.66:.46;
              const len=layer===0?38:24;
              const p0=point(dx,dy,-len,0,a);
              const p1=point(dx,dy,len,0,a);
              if(layer===0){
                glow.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
                  color:profile.main,width:8,alpha:alpha*hitFade*.08
                });
              }
              core.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
                color:layer===0?profile.core:profile.accent,
                width:layer===0?2.2:1.35,
                alpha:alpha*hitFade*(layer===0?.78:.48)
              });
            }
          }

          if(effect.spellId==="rogue-eviscerate"){
            // Eviscerate is the finisher: four long sequential razor lanes and
            // a tight violet/gold closing crescent.
            for(let i=0;i<6;i++){
              const a=-1.18+i*.43+hit*.08;
              const inner=8+(i%2)*2;
              const outer=32+expand*(17+(i%3)*6);
              glow
                .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
                .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
                .stroke({
                  color:i%2?profile.core:profile.main,
                  width:6,alpha:alpha*hitFade*.07
                });
              core
                .moveTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
                .lineTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
                .stroke({
                  color:i%2?profile.core:profile.accent,
                  width:1.55+(i%3===0?.45:0),
                  alpha:alpha*hitFade*.80,
                });
            }
            arc(glow,dx,dy,28+expand*20,-1.48,.35,{
              color:profile.accent,width:9,alpha:alpha*hitFade*.10
            },10);
            arc(core,dx,dy,26+expand*18,-1.48,.35,{
              color:profile.core,width:2.2,alpha:alpha*hitFade*.70
            },10);
          }

          if(effect.spellId==="rogue-mutilate"){
            // Mutilate: unmistakable dual-dagger X, followed by small puncture
            // splinters instead of Eviscerate's sweeping finisher pattern.
            for(const a of [-.78,.78]){
              const p0=point(dx,dy,-36,0,a);
              const p1=point(dx,dy,36,0,a);
              glow.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
                color:profile.main,width:10,alpha:alpha*hitFade*.10
              });
              core.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
                color:a<0?profile.core:profile.main,
                width:2.8,alpha:alpha*hitFade*.84
              });
            }
            for(let i=0;i<6;i++){
              const a=i/6*Math.PI*2+.18;
              const r0=7;
              const r1=19+expand*(9+(i%2)*4);
              core
                .moveTo(dx+Math.cos(a)*r0,dy+Math.sin(a)*r0)
                .lineTo(dx+Math.cos(a)*r1,dy+Math.sin(a)*r1)
                .stroke({
                  color:i%2?profile.core:profile.accent,
                  width:1.35+(i%3===0?.4:0),
                  alpha:alpha*hitFade*.58
                });
            }
          }

          // Death Knight VFX 3.0: each melee strike has its own victim language.
          if(
            effect.spellId==="dk-obliterate"
            || effect.spellId==="dk-frost-strike"
            || effect.spellId==="dk-death-strike"
          ){
            const death=effect.spellId==="dk-death-strike";
            const obliterate=effect.spellId==="dk-obliterate";
            const frost=effect.spellId==="dk-frost-strike";
            const outerBoost=obliterate?58:(death?46:45);
            const contact=Math.exp(-hit*(obliterate?9:11));

            glow.circle(dx,dy,10+contact*(obliterate?27:20)).fill({
              color:profile.core,
              alpha:alpha*hitFade*contact*(obliterate?.18:.14),
            });
            glow.circle(dx,dy,17+expand*outerBoost).stroke({
              color:profile.main,
              width:obliterate?16:(death?14:13),
              alpha:alpha*hitFade*(obliterate?.24:(death?.21:.20)),
            });
            core.circle(dx,dy,7+expand*(obliterate?24:19)).stroke({
              color:profile.core,
              width:obliterate?3.2:2.6,
              alpha:alpha*hitFade*.88,
            });

            const fractures=obliterate?14:(death?10:9);
            for(let i=0;i<fractures;i++){
              const a=i*Math.PI*2/fractures+(death?-hit*.34:hit*.46);
              const r0=9+(i%2)*3;
              const r1=30+expand*(
                obliterate
                  ? 29+(i%4)*8
                  : death
                    ? 20+(i%3)*7
                    : 20+(i%3)*6
              );
              const bend=a+(i%2?.11:-.11)*(death?-1:1);

              glow
                .moveTo(dx+Math.cos(a)*r0,dy+Math.sin(a)*r0)
                .lineTo(dx+Math.cos(bend)*r1,dy+Math.sin(bend)*r1)
                .stroke({
                  color:i%3===0?profile.core:profile.main,
                  width:obliterate?7:6,
                  alpha:alpha*hitFade*.07,
                });
              core
                .moveTo(dx+Math.cos(a)*r0,dy+Math.sin(a)*r0)
                .lineTo(dx+Math.cos(bend)*r1,dy+Math.sin(bend)*r1)
                .stroke({
                  color:i%3===0?profile.core:(i%2?profile.main:profile.accent),
                  width:2.0+(i%3===0?.9:.2),
                  alpha:alpha*hitFade*.76,
                });
            }

            if(obliterate){
              // Massive crossed frost cleaves plus a short inner ice-star.
              for(const a of [-.72,.72]){
                const p0=point(dx,dy,-39,0,a);
                const p1=point(dx,dy,39,0,a);
                glow.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
                  color:profile.main,width:15,alpha:alpha*hitFade*.17
                });
                core.moveTo(p0.x,p0.y).lineTo(p1.x,p1.y).stroke({
                  color:profile.core,width:3.4,alpha:alpha*hitFade*.90
                });
              }
              for(let i=0;i<6;i++){
                const a=i/6*Math.PI*2+.12;
                core
                  .moveTo(dx+Math.cos(a)*7,dy+Math.sin(a)*7)
                  .lineTo(dx+Math.cos(a)*27,dy+Math.sin(a)*27)
                  .stroke({
                    color:i%2?profile.main:profile.core,
                    width:1.8,alpha:alpha*hitFade*.66
                  });
              }
            }else if(death){
              // Death Strike implodes blood runes, then returns a thin red soul trace.
              for(let i=0;i<5;i++){
                const a=i*Math.PI*2/5-hit*.55;
                const outer=40+expand*18;
                const inner=12+expand*4;
                glow
                  .moveTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
                  .lineTo(dx+Math.cos(a+.28)*inner,dy+Math.sin(a+.28)*inner)
                  .stroke({
                    color:profile.main,width:8,alpha:alpha*hitFade*.08
                  });
                core
                  .moveTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
                  .lineTo(dx+Math.cos(a+.28)*inner,dy+Math.sin(a+.28)*inner)
                  .stroke({
                    color:i%2?profile.core:profile.main,
                    width:2.5,
                    alpha:alpha*hitFade*.82,
                  });
              }
              glow.circle(dx,dy,9+expand*26).fill({
                color:profile.main,alpha:alpha*hitFade*.14
              });
              const returnP=clamp01((hit-.18)/.72);
              if(returnP>0){
                const q=1-easeOut(returnP);
                const qx=dx*q;
                const qy=dy*q;
                core
                  .moveTo(dx,dy)
                  .lineTo(dx*.56+nx*8,dy*.56+ny*8)
                  .lineTo(qx,qy)
                  .stroke({
                    color:profile.core,width:1.4,alpha:alpha*hitFade*.48
                  });
              }
            }else if(frost){
              // Frost Strike is faster and narrower: five forward ice blades,
              // not the radial devastation of Obliterate.
              for(let i=0;i<5;i++){
                const a=-1.12+i*.54+hit*.08;
                const r0=9;
                const r1=35+expand*(14+(i%2)*6);
                glow
                  .moveTo(dx+Math.cos(a)*r0,dy+Math.sin(a)*r0)
                  .lineTo(dx+Math.cos(a)*r1,dy+Math.sin(a)*r1)
                  .stroke({
                    color:profile.main,width:8,alpha:alpha*hitFade*.09
                  });
                core
                  .moveTo(dx+Math.cos(a)*r0,dy+Math.sin(a)*r0)
                  .lineTo(dx+Math.cos(a)*r1,dy+Math.sin(a)*r1)
                  .stroke({
                    color:i%2?profile.core:profile.main,
                    width:2.2,
                    alpha:alpha*hitFade*.78,
                  });
              }
              core.circle(dx,dy,5+expand*10).fill({
                color:profile.core,alpha:alpha*hitFade*.64
              });
            }
          }

          // Stormstrike VFX 3.0: crossed weapon energy plus a compact thunder
          // detonation and branching forks on the victim.
          if(effect.spellId==="shaman-stormstrike"){
            const thunder=Math.exp(-hit*5.4);
            glow.circle(dx,dy,18+expand*42).stroke({
              color:profile.main,width:15,alpha:alpha*hitFade*.22
            });
            glow.circle(dx,dy,10+thunder*21).fill({
              color:profile.core,alpha:alpha*hitFade*thunder*.16
            });
            core.circle(dx,dy,9+expand*25).stroke({
              color:profile.core,width:2.2,alpha:alpha*hitFade*.72
            });

            for(let i=0;i<8;i++){
              const sign=i%2?1:-1;
              const lane=(i-3.5)*4.5;
              const topX=dx+sign*(24+Math.abs(lane)*.75);
              const topY=dy-34+lane*.22;
              const midX=dx-sign*(4+Math.abs(lane)*.12);
              const midY=dy-7+(i%3)*2;
              const endX=dx+sign*(14+Math.abs(lane)*.22);
              const endY=dy+17+lane*.16;

              glow.moveTo(topX,topY).lineTo(midX,midY).lineTo(endX,endY).stroke({
                color:profile.main,width:7,alpha:alpha*hitFade*.10
              });
              core.moveTo(topX,topY).lineTo(midX,midY).lineTo(endX,endY).stroke({
                color:i%3===0?profile.core:profile.main,
                width:1.8+(i%3)*.35,
                alpha:alpha*hitFade*.84,
              });

              if(i%2===0){
                core
                  .moveTo(midX,midY)
                  .lineTo(midX-sign*(8+(i%3)*2),midY+8+(i%3)*2)
                  .stroke({
                    color:profile.accent,width:1.15,alpha:alpha*hitFade*.58
                  });
              }
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
          const arm=easeOut(p/.24);
          const snap=Math.exp(-p*13);
          const pulse=.5+.5*Math.sin(p*24+seed*.021);
          const radius=11+arm*23;
          const spin=p*3.4+seed*.006;

          // Brief ignition flash tells the player that the mark has armed.
          glow.circle(dx,dy,10+snap*20).fill({
            color:profile.main,
            alpha:alpha*fade*(.06+snap*.24),
          });
          core.circle(dx,dy,3.5+snap*5.5).fill({
            color:profile.core,
            alpha:alpha*fade*(.44+snap*.42),
          });

          // Two counter-rotating diamond seals make Living Bomb read as a
          // deliberate magical explosive rather than another generic DoT ring.
          for(let layer=0;layer<2;layer++){
            const rr=radius-layer*7;
            const phase=spin*(layer===0?1:-1.35)+(layer?Math.PI/4:0);
            const pts=[];
            for(let i=0;i<4;i++){
              const a=phase+i*Math.PI/2;
              pts.push({x:dx+Math.cos(a)*rr,y:dy+Math.sin(a)*rr});
            }
            pts.push(pts[0]);
            core.moveTo(pts[0].x,pts[0].y);
            for(let i=1;i<pts.length;i++) core.lineTo(pts[i].x,pts[i].y);
            core.stroke({
              color:layer===0?profile.main:profile.core,
              width:layer===0?2.4:1.45,
              alpha:alpha*fade*(layer===0?.72:.52),
            });
          }

          // Four inward heat channels feed a pulsing ember heart.
          for(let i=0;i<4;i++){
            const a=spin*.35+i*Math.PI/2+Math.PI/4;
            const outer=radius+7+(i%2)*4;
            const inner=8+pulse*2;
            core
              .moveTo(dx+Math.cos(a)*outer,dy+Math.sin(a)*outer)
              .lineTo(dx+Math.cos(a)*inner,dy+Math.sin(a)*inner)
              .stroke({
                color:i%2?profile.core:profile.accent,
                width:i%2?1.5:2.0,
                alpha:alpha*fade*.62,
              });
          }

          glow.circle(dx,dy,8+pulse*4).fill({
            color:profile.accent,
            alpha:alpha*fade*.16,
          });
          core.circle(dx,dy,4.2+pulse*1.5).fill({
            color:profile.core,
            alpha:alpha*fade*.76,
          });

          // A single moving fuse spark keeps the "bomb" identity obvious.
          const fuseA=-Math.PI*.72+p*1.25;
          const fuseR=radius+8;
          const fx=dx+Math.cos(fuseA)*fuseR;
          const fy=dy+Math.sin(fuseA)*fuseR;
          glow.circle(fx,fy,6+pulse*2).fill({
            color:profile.main,
            alpha:alpha*fade*.14,
          });
          core.circle(fx,fy,2.2+pulse*.8).fill({
            color:profile.core,
            alpha:alpha*fade*.90,
          });
          for(let i=0;i<3;i++){
            const a=fuseA+Math.PI+(i-1)*.42;
            core
              .moveTo(fx,fy)
              .lineTo(fx+Math.cos(a)*(6+i*2),fy+Math.sin(a)*(6+i*2))
              .stroke({
                color:i===1?profile.core:profile.main,
                width:i===1?1.3:1,
                alpha:alpha*fade*.58,
              });
          }
          continue;
        }

        if(effect.spellId==="shaman-flame-shock"){
          const ignite=easeOut(p/.24);
          const snap=Math.exp(-p*13);
          const ring=11+ignite*27;

          glow.circle(dx,dy,12+snap*20).fill({
            color:profile.main,alpha:alpha*fade*(.06+snap*.20)
          });
          glow.circle(dx,dy,ring+8).stroke({
            color:profile.main,width:10,alpha:alpha*fade*.11
          });
          core.circle(dx,dy,ring).stroke({
            color:profile.accent,width:1.8,alpha:alpha*fade*.55
          });

          // Jagged fire tongues rise from a scorched elemental seal.
          for(let i=0;i<10;i++){
            const ang=i/10*Math.PI*2+seed*.009;
            const baseR=8+(i%2)*3;
            const outer=18+ignite*(18+(i%4)*6);
            const bx=dx+Math.cos(ang)*baseR;
            const by=dy+Math.sin(ang)*baseR+10;
            const mx=dx+Math.cos(ang+.10)*(outer*.65);
            const my=dy+Math.sin(ang+.10)*(outer*.45)-ignite*(8+(i%3)*3);
            const ex=dx+Math.cos(ang-.06)*outer;
            const ey=dy+Math.sin(ang-.06)*outer-ignite*(14+(i%4)*4);

            glow.moveTo(bx,by).lineTo(mx,my).lineTo(ex,ey).stroke({
              color:i%3===0?profile.core:profile.main,
              width:6+(i%3),
              alpha:alpha*fade*.08,
            });
            core.moveTo(bx,by).lineTo(mx,my).lineTo(ex,ey).stroke({
              color:i%3===0?profile.core:profile.main,
              width:1.5+(i%3)*.45,
              alpha:alpha*fade*(.52+(i%2)*.12),
            });
          }

          // Hot center + ember chips make the application read immediately.
          glow.circle(dx,dy,7+snap*8).fill({
            color:profile.accent,alpha:alpha*fade*.15
          });
          core.circle(dx,dy,3.5+snap*3.5).fill({
            color:profile.core,alpha:alpha*fade*.82
          });
          for(let i=0;i<7;i++){
            const a=i/7*Math.PI*2+p*2.3+seed*.013;
            const rr=13+ignite*(13+(i%3)*4);
            core.circle(
              dx+Math.cos(a)*rr,
              dy+Math.sin(a)*rr-ignite*(i%2?5:2),
              1.1+(i%3)*.35
            ).fill({
              color:i%3===0?profile.core:profile.main,
              alpha:alpha*fade*.62
            });
          }
          continue;
        }

        if(effect.spellId==="warlock-corruption"){
          const appear=easeOut(p/.22);
          const snap=Math.exp(-p*12);
          const sealR=12+appear*22;

          glow.circle(dx,dy,13+snap*20).fill({
            color:profile.main,alpha:alpha*fade*(.05+snap*.18)
          });
          glow.circle(dx,dy,sealR+10).stroke({
            color:profile.main,width:10,alpha:alpha*fade*.10
          });

          // Eight hooked shadow tendrils close inward like an infection taking
          // hold, keeping Corruption distinct from Fear's eye language.
          for(let i=0;i<8;i++){
            const ang=i/8*Math.PI*2+p*(i%2?1.25:-1.05)+seed*.011;
            const outer=33+(i%3)*6;
            const inner=8+(1-appear)*19;
            const sx=dx+Math.cos(ang)*outer;
            const sy=dy+Math.sin(ang)*outer;
            const mx=dx+Math.cos(ang+.38)*(outer*.56);
            const my=dy+Math.sin(ang+.38)*(outer*.56);
            const ex=dx+Math.cos(ang+.78)*inner;
            const ey=dy+Math.sin(ang+.78)*inner;

            glow.moveTo(sx,sy).lineTo(mx,my).lineTo(ex,ey).stroke({
              color:profile.main,width:6+(i%3),alpha:alpha*fade*.07
            });
            core.moveTo(sx,sy).lineTo(mx,my).lineTo(ex,ey).stroke({
              color:i%3===0?profile.core:profile.main,
              width:1.5+(i%3)*.45,
              alpha:alpha*fade*(.46+(i%3)*.08),
            });
          }

          for(let seg=0;seg<4;seg++){
            const a0=seg*Math.PI/2+.18-p*.55;
            arc(core,dx,dy,sealR,a0,a0+.72,{
              color:seg%2?profile.core:profile.main,
              width:1.55,
              alpha:alpha*fade*.55,
            },6);
          }

          glow.circle(dx,dy,8+snap*7).fill({
            color:profile.accent,alpha:alpha*fade*.15
          });
          core.circle(dx,dy,3.4+snap*3).fill({
            color:profile.core,alpha:alpha*fade*.78
          });
          continue;
        }

        // Frost Fever VFX 3.0: a cold disease seal blooms once on application.
        const spread=easeOut(p/.48);
        const snap=Math.exp(-p*13);
        const rr=10+spread*27;

        glow.circle(dx,dy,11+snap*21).fill({
          color:profile.main,alpha:alpha*fade*snap*.13
        });
        glow.circle(dx,dy,rr+9).stroke({
          color:profile.main,width:10,alpha:alpha*fade*.09
        });

        for(let i=0;i<8;i++){
          const ang=i/8*Math.PI*2+p*.30;
          const inner=rr*.32;
          const outer=rr+(i%3)*4;
          glow
            .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
            .lineTo(dx+Math.cos(ang+.12)*outer,dy+Math.sin(ang+.12)*outer)
            .stroke({
              color:i%3===0?profile.core:profile.main,
              width:6,alpha:alpha*fade*.06
            });
          core
            .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
            .lineTo(dx+Math.cos(ang+.12)*outer,dy+Math.sin(ang+.12)*outer)
            .stroke({
              color:i%3===0?profile.core:profile.main,
              width:1.55+(i%3===0?.45:0),
              alpha:alpha*fade*.66
            });
        }

        for(let i=0;i<8;i++){
          const ang=i/8*Math.PI*2+seed*.017;
          const q=9+spread*(17+(i%4)*4);
          const x=dx+Math.cos(ang)*q;
          const y=dy+Math.sin(ang)*q-p*(7+(i%3)*2);
          glow.circle(x,y,4+(i%2)).fill({
            color:profile.main,alpha:alpha*fade*.06
          });
          core.circle(x,y,1.4+(i%2)*.35).fill({
            color:i%3===0?profile.core:profile.main,
            alpha:alpha*fade*.50
          });
        }

        core.circle(dx,dy,6+snap*4).stroke({
          color:profile.core,width:1.5,alpha:alpha*fade*.58
        });
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
            width:28,
            alpha:visibility*.19,
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
            width:5.8,
            alpha:visibility*.96,
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
            const contact=Math.exp(-hit*14);
            // Two broad concentric impact rings plus a four-point holy seal.
            glow.circle(dx,dy,10+contact*23).fill({
              color:profile.core,
              alpha:hitFade*contact*.18,
            });
            core.circle(dx,dy,4+contact*7).fill({
              color:profile.core,
              alpha:hitFade*(.60+contact*.32),
            });
            glow.circle(dx,dy,14+easeOut(hit)*48).fill({
              color:profile.main,
              alpha:hitFade*.13,
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
            color:profile.main,width:20,alpha:alpha*fade*.16
          });
          glow.moveTo(dx,top+6).lineTo(dx,headY).stroke({
            color:profile.core,width:9,alpha:alpha*fade*.10
          });
          core.moveTo(dx,top).lineTo(dx,headY).stroke({
            color:profile.core,width:4.2,alpha:alpha*fade*.82
          });

          const hAngle=.18;
          const handle=[
            point(dx,headY,-4.5,-22,hAngle),point(dx,headY,4.5,-22,hAngle),
            point(dx,headY,4.5,8,hAngle),point(dx,headY,-4.5,8,hAngle),
          ];
          const head=[
            point(dx,headY,-17,-27,hAngle),point(dx,headY,17,-27,hAngle),
            point(dx,headY,17,-15,hAngle),point(dx,headY,-17,-15,hAngle),
          ];
          const inset=[
            point(dx,headY,-10,-24,hAngle),point(dx,headY,10,-24,hAngle),
            point(dx,headY,10,-18,hAngle),point(dx,headY,-10,-18,hAngle),
          ];
          polygon(glow,handle,{color:profile.main,alpha:alpha*fade*.16},true);
          polygon(glow,head,{color:profile.main,alpha:alpha*fade*.18},true);
          polygon(core,handle,{color:profile.main,alpha:alpha*fade*.88},true);
          polygon(core,head,{color:profile.main,alpha:alpha*fade*.90},true);
          polygon(core,inset,{color:profile.core,alpha:alpha*fade*.86},true);
          polygon(core,head,{color:profile.core,width:1.6,alpha:alpha*fade*.78});
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
          const hitFade=1-smooth(hit);
          const contact=Math.exp(-hit*13);
          const burst=easeOut(hit);

          if(effect.spellId==="paladin-judgment"){
            glow.circle(dx,dy,10+contact*26).fill({
              color:profile.core,alpha:alpha*hitFade*contact*.18
            });
            glow.circle(dx,dy,15+burst*49).stroke({
              color:profile.main,width:12,alpha:alpha*hitFade*.16
            });
            core.circle(dx,dy,10+burst*43).stroke({
              color:profile.main,width:2.8,alpha:alpha*hitFade*.76
            });
            core.circle(dx,dy,5+contact*7).fill({
              color:profile.core,alpha:alpha*hitFade*(.62+contact*.28)
            });

            for(let i=0;i<8;i++){
              const ang=i/8*Math.PI*2+.10;
              const inner=8;
              const outer=24+burst*(28+(i%2)*7);
              core
                .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
                .lineTo(dx+Math.cos(ang)*outer,dy+Math.sin(ang)*outer)
                .stroke({
                  color:i%2?profile.core:profile.main,
                  width:1.8+(i%4===0?.5:0),
                  alpha:alpha*hitFade*.68
                });
            }

            const sealR=14+burst*15;
            for(let layer=0;layer<2;layer++){
              const rot=Math.PI/4+(layer?-.22:.18)*hit;
              const rr=sealR*(layer?.58:.82);
              const seal=[
                point(dx,dy,-rr,-rr,rot),
                point(dx,dy,rr,-rr,rot),
                point(dx,dy,rr,rr,rot),
                point(dx,dy,-rr,rr,rot),
              ];
              polygon(core,seal,{
                color:layer?profile.core:profile.accent,
                width:layer?1.4:1.8,
                alpha:alpha*hitFade*(layer?.48:.58)
              });
            }
          } else {
            core.circle(dx,dy,9+burst*42).stroke({
              color:profile.main,width:2.3,alpha:alpha*hitFade*.68
            });
            for(let i=0;i<10;i++){
              const ang=i/10*Math.PI*2+seed*.009;
              const rr=8+burst*(24+(i%4)*5);
              core.circle(dx+Math.cos(ang)*rr,dy+Math.sin(ang)*rr,1.4+(i%3)*.4).fill({
                color:i%3===0?profile.core:profile.main,
                alpha:alpha*hitFade*.62,
              });
            }
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
              glow,
              dx,
              dy,
              rr,
              a0,
              a0+.78,
              {
                color:ring===1?profile.core:profile.main,
                width:8+ring,
                alpha:visibility*(.05+gather*.05),
              },
              7,
            );
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
                alpha:visibility*(.36+gather*.26-ring*.03),
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
          const mx=dx+Math.cos(ang)*rr;
          const my=dy+Math.sin(ang)*rr;
          glow.circle(mx,my,4+(i%3)).fill({
            color:i%4===0?profile.core:profile.main,
            alpha:visibility*(.045+gather*.065),
          });
          core.circle(
            mx,
            my,
            1.5+(i%4)*.48
          ).fill({
            color:i%4===0?profile.core:(i%3===0?profile.accent:profile.main),
            alpha:visibility*(.34+gather*.50),
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
          const contact=Math.exp(-blast*13);
          glow.circle(dx,dy,9+contact*22).fill({
            color:profile.core,
            alpha:contact*.17,
          });
          core.circle(dx,dy,4+contact*6).fill({
            color:profile.core,
            alpha:.54+contact*.34,
          });
          glow.circle(dx,dy,12+easeOut(blast)*48).fill({
            color:profile.main,
            alpha:(1-blast)*.15+ruptureFade*.06,
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
        const fade=1-smooth((p-.80)/.20);
        const pulses=10;

        glow.moveTo(dx,dy).lineTo(0,0).stroke({
          color:profile.main,width:13,alpha:alpha*fade*.09
        });
        core.moveTo(dx,dy).lineTo(0,0).stroke({
          color:profile.main,width:1.5,alpha:alpha*fade*.24
        });

        for(let i=0;i<pulses;i++){
          const q=((p*1.85+i/pulses)%1);
          const eased=smooth(q);
          const cx=dx*(1-eased);
          const cy=dy*(1-eased);
          const wobble=Math.sin(seed*.05+i*1.7+p*10)*10*(1-q*.35);
          const x=cx+nx*wobble;
          const y=cy+ny*wobble;
          const radius=1.5+(i%3)*.55;

          glow.circle(x,y,radius*3.8).fill({
            color:i%3===0?profile.core:profile.main,
            alpha:alpha*fade*(.06+(1-q)*.08)
          });
          core.circle(x,y,radius).fill({
            color:i%3===0?profile.core:profile.main,
            alpha:alpha*fade*(.42+(1-q)*.34),
          });

          if(i%3===0){
            const ahead=Math.min(1,q+.08);
            const ax=dx*(1-smooth(ahead));
            const ay=dy*(1-smooth(ahead));
            core.moveTo(x,y).lineTo(ax,ay).stroke({
              color:profile.core,width:1,alpha:alpha*fade*.42
            });
          }
        }

        const victimPulse=.5+.5*Math.sin(p*18+seed*.01);
        glow.circle(dx,dy,14+victimPulse*4).stroke({
          color:profile.main,width:8,alpha:alpha*fade*.09
        });
        core.circle(dx,dy,11+victimPulse*3).stroke({
          color:profile.core,width:1.5,alpha:alpha*fade*.46
        });
        glow.circle(0,0,10+(1-victimPulse)*4).fill({
          color:profile.main,alpha:alpha*fade*.10
        });
        core.circle(0,0,3.5+(1-victimPulse)*2).fill({
          color:profile.core,alpha:alpha*fade*.66
        });
        continue;
      }

      // Conflagrate VFX 3.0: instant, compact and violent.
      const hit=easeOut(p/.52);
      const fade=1-smooth((p-.58)/.42);
      const flash=Math.exp(-p*14);

      glow.circle(dx,dy,10+flash*22).fill({
        color:profile.core,alpha:alpha*fade*flash*.18
      });
      glow.circle(dx,dy,10+hit*39).stroke({
        color:profile.main,width:13,alpha:alpha*fade*.14
      });
      core.circle(dx,dy,8+hit*28).stroke({
        color:0xff9b3d,width:2.4,alpha:alpha*fade*.68
      });

      for(let i=0;i<12;i++){
        const ang=i/12*Math.PI*2+seed*.013;
        const inner=5+(i%2)*2;
        const outer=15+hit*(27+(i%4)*6);
        const bend=ang+.10*Math.sin(i);
        glow
          .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
          .lineTo(dx+Math.cos(bend)*outer,dy+Math.sin(bend)*outer)
          .stroke({
            color:i%3===0?profile.core:profile.main,
            width:6+(i%3),
            alpha:alpha*fade*.08,
          });
        core
          .moveTo(dx+Math.cos(ang)*inner,dy+Math.sin(ang)*inner)
          .lineTo(dx+Math.cos(bend)*outer,dy+Math.sin(bend)*outer)
          .stroke({
            color:i%3===0?profile.core:(i%2?profile.main:profile.accent),
            width:1.55+(i%3===0?.75:0),
            alpha:alpha*fade*.68,
          });
      }

      for(let i=0;i<8;i++){
        const a=i/8*Math.PI*2+seed*.021+p*.7;
        const rr=12+hit*(18+(i%3)*6);
        core.circle(
          dx+Math.cos(a)*rr,
          dy+Math.sin(a)*rr-hit*(i%2?6:3),
          1.2+(i%3)*.4
        ).fill({
          color:i%3===0?profile.core:(i%2?0xff9b3d:profile.main),
          alpha:alpha*fade*.66
        });
      }

      core.circle(dx,dy,5+flash*7).fill({
        color:profile.core,alpha:alpha*fade*.86
      });
    }
  }

  updateProjectileGroundLights(game) {
    const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
    const easeOut = value => {
      const t = clamp01(value);
      return 1 - Math.pow(1 - t, 3);
    };
    const smooth = value => {
      const t = clamp01(value);
      return t * t * (3 - 2 * t);
    };

    const drawPool = (
      view,
      x,
      y,
      color,
      coreColor,
      radius,
      alpha,
      dirX = 0,
      dirY = 0,
      heavy = false,
    ) => {
      if (!view || alpha <= .002) return;

      const glow = view.projectileGroundGlowFx;
      const core = view.projectileGroundCoreFx;
      glow.visible = true;
      core.visible = true;

      const length = Math.max(.0001, Math.hypot(dirX, dirY));
      const tx = dirX / length;
      const ty = dirY / length;

      // A few overlapping soft pools stretch the reflection slightly opposite
      // travel direction without needing a rotated texture/decal.
      const trailCount = heavy ? 5 : 4;
      for (let i = 0; i < trailCount; i += 1) {
        const q = i / Math.max(1, trailCount - 1);
        const back = q * (heavy ? 22 : 15);
        const px = x - tx * back;
        const py = y - ty * back;
        const fade = 1 - q * .48;
        glow.ellipse(
          px,
          py + 2,
          radius * (1.12 + q * .26),
          radius * (.58 + q * .08),
        ).fill({
          color,
          alpha: Math.min(1, alpha * fade * .57),
        });
      }

      core.ellipse(
        x,
        y + 2,
        radius * .88,
        radius * .37,
      ).fill({
        color: coreColor,
        alpha: Math.min(1, alpha * .36),
      });

      core.ellipse(
        x,
        y + 2,
        radius * .40,
        radius * .15,
      ).fill({
        color: coreColor,
        alpha: Math.min(1, alpha * .24),
      });
    };

    for (const view of this.actorViews.values()) {
      view.projectileGroundGlowFx?.clear();
      if (view.projectileGroundGlowFx) {
        view.projectileGroundGlowFx.visible = false;
        view.projectileGroundGlowFx.position.set(0,0);
      }
      view.projectileGroundCoreFx?.clear();
      if (view.projectileGroundCoreFx) {
        view.projectileGroundCoreFx.visible = false;
        view.projectileGroundCoreFx.position.set(0,0);
      }
    }

    for (const effect of game.vfx?.effects || []) {
      if (effect.type === "spell" && GROUND_LIGHT_PROJECTILES.has(effect.spellId)) {
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

        const profile = spellPolishProfile(effect.spellId, effect.style);
        const spec = projectileVfx2Spec(effect.spellId);
        const total = Math.max(1, Number(effect.totalMs) || 1);
        const remaining = Math.max(0, Number(effect.remainingMs) || 0);
        const p = clamp01(1 - remaining / total);
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
        view.projectileGroundGlowFx.position.set(sourceOffsetX,sourceOffsetY);
        view.projectileGroundCoreFx.position.set(sourceOffsetX,sourceOffsetY);

        const dx0 = targetX - sourceCenter.x;
        const dy0 = targetY - sourceCenter.y;
        const length0 = Math.max(1, Math.hypot(dx0,dy0));
        const tx0 = dx0 / length0;
        const ty0 = dy0 / length0;
        const nx0 = -ty0;
        const ny0 = tx0;
        const missSign = Math.sin(seed * .89) >= 0 ? 1 : -1;

        const heavy = Boolean(spec?.heavy || POLISH_HEAVY_SPELLS.has(effect.spellId));
        const endX =
          dx0
          + (missed ? nx0 * missSign * (heavy ? 52 : 42) + tx0 * 14 : 0);
        const endY =
          dy0
          + (missed ? ny0 * missSign * (heavy ? 52 : 42) + ty0 * 14 - 5 : 0);

        const endLen = Math.max(1,Math.hypot(endX,endY));
        const dirX = endX / endLen;
        const dirY = endY / endLen;
        const travelEnd = spec?.travelEnd
          || (effect.spellId === "priest-smite" ? .42 : .50);

        const travelT = easeOut(
          (p - .025) / Math.max(.08, travelEnd - .025),
        );
        const gx = endX * travelT;
        const gy = endY * travelT;

        const fadeIn = smooth(p / .07);
        const fadeOut = p <= travelEnd
          ? 1
          : 1 - smooth((p - travelEnd) / .09);
        const travelAlpha = fadeIn * fadeOut;
        const size = Number(spec?.size) || (heavy ? 12 : 8);
        const poolRadius = (10 + size * (heavy ? 1.22 : 1.05)) * (heavy ? 1.40 : 1.28);

        if (travelAlpha > .002) {
          drawPool(
            view,
            gx,
            gy,
            profile.main,
            profile.core,
            poolRadius,
            travelAlpha * (heavy ? .57 : .46),
            dirX,
            dirY,
            heavy,
          );
        }

        // The moving light expands into a short floor flash at impact.
        if (p >= travelEnd) {
          const impactP = clamp01((p - travelEnd) / .18);
          const impactFade = 1 - smooth(impactP);
          if (impactFade > .002) {
            drawPool(
              view,
              endX,
              endY,
              profile.main,
              profile.core,
              poolRadius * (1.12 + impactP * .82),
              impactFade * (heavy ? .67 : .53),
              0,
              0,
              heavy,
            );
          }
        }
        continue;
      }

      // Sky-strike spells do not travel across the floor, but the descending
      // spell should still illuminate the target area as it approaches/lands.
      if (effect.type === "spell" && GROUND_LIGHT_SKY_SPELLS.has(effect.spellId)) {
        const source = game.getActor(effect.sourceId);
        const target = game.getActor(effect.targetId);
        const view = this.actorViews.get(effect.sourceId);
        if (!source || !view || !view.root.visible) continue;

        const targetCenter = target
          ? visualActorCenter(this.actorViews, target, effect.targetX, effect.targetY)
          : null;
        const tx = targetCenter?.x ?? effect.targetX;
        const ty = targetCenter?.y ?? effect.targetY;
        if (!Number.isFinite(tx) || !Number.isFinite(ty)) continue;

        const profile = spellPolishProfile(effect.spellId, effect.style);
        const total = Math.max(1, Number(effect.totalMs) || 1);
        const remaining = Math.max(0, Number(effect.remainingMs) || 0);
        const p = clamp01(1 - remaining / total);
        const sourceCenter = visualActorCenter(
          this.actorViews,
          source,
          source.x,
          source.y,
        );
        view.projectileGroundGlowFx.position.set(
          sourceCenter.x - source.x,
          sourceCenter.y - source.y,
        );
        view.projectileGroundCoreFx.position.set(
          sourceCenter.x - source.x,
          sourceCenter.y - source.y,
        );

        const localX = tx - sourceCenter.x;
        const localY = ty - sourceCenter.y;
        const build = smooth(p / .52);
        const fade = 1 - smooth((p - .72) / .28);
        const pulse = .82 + Math.sin(p * 24 + Number(effect.seed || 1)) * .18;
        drawPool(
          view,
          localX,
          localY,
          profile.main,
          profile.core,
          23 + build * 13,
          build * fade * pulse * .50,
          0,
          0,
          true,
        );
      }

      // Chain Lightning gets a moving floor reflection under the reveal head
      // of each hop rather than one giant static glow.
      if (effect.type === "chain" && effect.spellId === "shaman-chain-lightning") {
        const actors = (effect.actorIds || [])
          .map(id => game.getActor(id))
          .filter(Boolean);
        if (actors.length < 2) continue;

        const source = actors[0];
        const view = this.actorViews.get(source.id);
        if (!view || !view.root.visible) continue;

        const sourceCenter = visualActorCenter(
          this.actorViews,
          source,
          source.x,
          source.y,
        );
        view.projectileGroundGlowFx.position.set(
          sourceCenter.x - source.x,
          sourceCenter.y - source.y,
        );
        view.projectileGroundCoreFx.position.set(
          sourceCenter.x - source.x,
          sourceCenter.y - source.y,
        );

        const total = Math.max(1, Number(effect.totalMs) || 1);
        const remaining = Math.max(0, Number(effect.remainingMs) || 0);
        const progress = clamp01(1 - remaining / total);

        for (let i = 0; i < actors.length - 1; i += 1) {
          const fromCenter = visualActorCenter(
            this.actorViews,
            actors[i],
            actors[i].x,
            actors[i].y,
          );
          const toCenter = visualActorCenter(
            this.actorViews,
            actors[i+1],
            actors[i+1].x,
            actors[i+1].y,
          );

          const localP = clamp01((progress - i * .10) / .66);
          if (localP <= 0) continue;
          const reveal = clamp01(localP / .34);
          const head = easeOut(reveal);
          const fx = fromCenter.x + (toCenter.x - fromCenter.x) * head - sourceCenter.x;
          const fy = fromCenter.y + (toCenter.y - fromCenter.y) * head - sourceCenter.y;
          const dx = toCenter.x - fromCenter.x;
          const dy = toCenter.y - fromCenter.y;
          const fade = 1 - smooth((localP - .54) / .46);
          const flicker = .78 + .22 * Math.sin(
            (Number(effect.seed || 1) + i * 17) * .11 + progress * 45,
          );

          drawPool(
            view,
            fx,
            fy,
            0x59ccef,
            0xf5ffff,
            19,
            fade * flicker * .43,
            dx,
            dy,
            false,
          );
        }
      }
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

    const taperedRibbon = (
      g,
      ax,
      ay,
      bx,
      by,
      seed,
      phase,
      {
        startWidth = 2,
        endWidth = 10,
        wobble = 4,
        segments = 14,
        color = 0xffffff,
        alpha = .5,
      } = {},
    ) => {
      if (alpha <= 0) return;

      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.max(1, Math.hypot(dx,dy));
      const tx = dx / len;
      const ty = dy / len;
      const nx = -ty;
      const ny = tx;
      const left = [];
      const right = [];

      for (let i = 0; i <= segments; i += 1) {
        const t = i / segments;
        const flameNoise =
          (
            Math.sin(seed*.031+i*1.77+phase*10.7)
            + Math.sin(seed*.013+i*.83-phase*6.2)*.48
          )
          * wobble
          * Math.sin(t*Math.PI);
        const cx = ax + dx*t + nx*flameNoise;
        const cy = ay + dy*t + ny*flameNoise;
        const width =
          startWidth
          + (endWidth-startWidth)*Math.pow(t,.78)
          + Math.sin(i*1.9+phase*8+seed*.02)*.8*Math.sin(t*Math.PI);

        left.push({x:cx+nx*width,y:cy+ny*width});
        right.push({x:cx-nx*width,y:cy-ny*width});
      }

      poly(
        g,
        [...left,...right.reverse()],
        {color,alpha},
        true,
      );
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
          const chargeR=source.radius+10+releaseP*17;

          glow.circle(0,0,chargeR+6).stroke({
            color:spec.main,
            width:10,
            alpha:releaseFade*.15,
          });
          core.circle(0,0,chargeR).stroke({
            color:spec.core,
            width:2.0,
            alpha:releaseFade*.62,
          });

          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+p*(i%2?1.8:-1.45);
            const inner=source.radius+3;
            const outer=source.radius+17+releaseP*(13+(i%3)*4);

            core
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(
                Math.cos(a+.05*Math.sin(p*12+i))*inner,
                Math.sin(a+.05*Math.sin(p*12+i))*inner
              )
              .stroke({
                color:i%3===0?spec.core:(i%2?spec.main:spec.accent),
                width:i%3===0?1.9:1.35,
                alpha:releaseFade*.66,
              });

            if(i%2===0){
              const crystalR=outer+3;
              const cx=Math.cos(a)*crystalR;
              const cy=Math.sin(a)*crystalR;
              core
                .moveTo(cx-Math.cos(a)*4,cy-Math.sin(a)*4)
                .lineTo(cx+Math.cos(a)*4,cy+Math.sin(a)*4)
                .stroke({
                  color:spec.core,
                  width:1.15,
                  alpha:releaseFade*.70,
                });
            }
          }

          // A directional ice-lance flash gives Frostbolt a visible release
          // snap without making the common spell feel as heavy as Pyroblast.
          glow
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+31),ty*(source.radius+31))
            .stroke({
              color:spec.main,width:15,alpha:releaseFade*.16
            });
          core
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+31),ty*(source.radius+31))
            .stroke({
              color:spec.core,width:2.8,alpha:releaseFade*.84
            });
        } else if (spec.shape === "pyro") {
          const bloomR=source.radius+10+releaseP*22;
          glow.circle(0,0,bloomR+8).stroke({
            color:spec.main,
            width:12,
            alpha:releaseFade*.18,
          });
          core.circle(0,0,bloomR).stroke({
            color:0xffb52f,
            width:2.6,
            alpha:releaseFade*.72,
          });

          for(let i=0;i<10;i++){
            const a=i/10*Math.PI*2+seed*.01+p*(i%2?2.1:-1.7);
            const outer=source.radius+22+releaseP*(18+(i%3)*6);
            const inner=source.radius+7+releaseP*5;
            core
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(
                Math.cos(a+.08*Math.sin(p*9+i))*inner,
                Math.sin(a+.08*Math.sin(p*9+i))*inner,
              )
              .stroke({
                color:i%3===0?spec.core:(i%2?0xffb52f:spec.main),
                width:i%3===0?2.1:1.5,
                alpha:releaseFade*.66,
              });

            core.circle(
              Math.cos(a)*outer,
              Math.sin(a)*outer-releaseP*(i%3)*2,
              1.5+(i%3)*.5
            ).fill({
              color:i%3===0?spec.core:(i%2?spec.main:spec.accent),
              alpha:releaseFade*.72,
            });
          }

          // Directional launch flare makes the spell feel fired rather than
          // merely spawned on top of the caster.
          glow
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+36),ty*(source.radius+36))
            .stroke({
              color:spec.main,width:18,alpha:releaseFade*.18
            });
          core
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+34),ty*(source.radius+34))
            .stroke({
              color:spec.core,width:3.2,alpha:releaseFade*.82
            });
        } else if (spec.shape === "frostfire") {
          const rr=source.radius+14+releaseP*9;
          // Opposed half-runes visually establish the hybrid spell before the
          // projectile leaves the caster.
          strokeArc(core,rr,-Math.PI/2+.10,Math.PI/2-.10,{
            color:spec.main,width:2.8,alpha:releaseFade*.72,
          },10);
          strokeArc(core,rr,Math.PI/2+.10,Math.PI*1.5-.10,{
            color:spec.accent,width:2.8,alpha:releaseFade*.72,
          },10);
          glow.circle(0,0,rr+7).stroke({
            color:spec.core,width:9,alpha:releaseFade*.08
          });

          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+p*(i%2?1.4:-1.25);
            const cold=i%2===0;
            const outer=source.radius+22+releaseP*(9+(i%3)*4);
            const inner=source.radius+5;
            core
              .moveTo(Math.cos(a)*outer,Math.sin(a)*outer)
              .lineTo(Math.cos(a+.05*(cold?1:-1))*inner,Math.sin(a+.05*(cold?1:-1))*inner)
              .stroke({
                color:cold?spec.main:spec.accent,
                width:cold?1.7:1.9,
                alpha:releaseFade*.64,
              });
          }

          // Ice and fire launch on opposite sides of a white fusion core.
          glow
            .moveTo(tx*source.radius+nx*5,ty*source.radius+ny*5)
            .lineTo(tx*(source.radius+35)+nx*7,ty*(source.radius+35)+ny*7)
            .stroke({color:spec.main,width:13,alpha:releaseFade*.15});
          glow
            .moveTo(tx*source.radius-nx*5,ty*source.radius-ny*5)
            .lineTo(tx*(source.radius+35)-nx*7,ty*(source.radius+35)-ny*7)
            .stroke({color:spec.accent,width:13,alpha:releaseFade*.15});
          core
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+38),ty*(source.radius+38))
            .stroke({color:spec.core,width:3.0,alpha:releaseFade*.88});
        } else if (spec.shape === "arcane") {
          const baseR=source.radius+12+releaseP*10;
          // Three collapsing triangles and bright rune nodes give the instant
          // Barrage release a precise, high-magic snap.
          for(let ring=0;ring<2;ring++){
            const r=baseR+ring*7;
            const phase=p*(ring? -5.2:4.4)+seed*.004;
            const pts=[];
            for(let i=0;i<3;i++){
              const a=phase+i*Math.PI*2/3-Math.PI/2;
              pts.push({x:Math.cos(a)*r,y:Math.sin(a)*r});
            }
            pts.push(pts[0]);
            core.moveTo(pts[0].x,pts[0].y);
            for(let i=1;i<pts.length;i++) core.lineTo(pts[i].x,pts[i].y);
            core.stroke({
              color:ring?spec.core:spec.main,
              width:ring?1.3:2.0,
              alpha:releaseFade*(ring?.46:.68),
            });
          }
          for(let i=0;i<3;i++){
            const a=p*4.4+seed*.004+i*Math.PI*2/3-Math.PI/2;
            core.circle(Math.cos(a)*baseR,Math.sin(a)*baseR,2.2).fill({
              color:i===0?spec.core:spec.main,
              alpha:releaseFade*.78,
            });
          }

          glow
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+31),ty*(source.radius+31))
            .stroke({color:spec.main,width:16,alpha:releaseFade*.14});
          core
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+33),ty*(source.radius+33))
            .stroke({color:spec.core,width:2.8,alpha:releaseFade*.86});
        } else if (spec.shape === "lava-rock") {
          const rr=source.radius+13+releaseP*12;
          glow.circle(0,0,rr+8).stroke({
            color:spec.main,width:12,alpha:releaseFade*.15
          });
          core.circle(0,0,rr).stroke({
            color:0xff9a3f,width:2.4,alpha:releaseFade*.68
          });
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+.2+p*(i%2?1.6:-1.25);
            const inner=source.radius+4;
            const outer=source.radius+20+releaseP*(14+(i%3)*5);
            glow
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a+.10)*outer,Math.sin(a+.10)*outer)
              .stroke({color:spec.main,width:7,alpha:releaseFade*.08});
            core
              .moveTo(Math.cos(a)*inner,Math.sin(a)*inner)
              .lineTo(Math.cos(a+.10)*outer,Math.sin(a+.10)*outer)
              .stroke({
                color:i%3===0?spec.core:(i%2?0xffa33f:spec.main),
                width:i%3===0?2.0:1.35,
                alpha:releaseFade*.66,
              });
          }
          glow
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+37),ty*(source.radius+37))
            .stroke({color:spec.main,width:18,alpha:releaseFade*.18});
          core
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+35),ty*(source.radius+35))
            .stroke({color:spec.core,width:3.0,alpha:releaseFade*.84});
        } else if (spec.shape === "elemental") {
          const colors=[spec.main,spec.accent,0x80d889];
          const r=source.radius+14+releaseP*10;
          glow.circle(0,0,r+7).stroke({
            color:spec.core,width:10,alpha:releaseFade*.09
          });
          for(let i=0;i<3;i++){
            const a=i*Math.PI*2/3+p*5;
            const x=Math.cos(a)*r;
            const y=Math.sin(a)*r;
            glow.circle(x,y,8).fill({
              color:colors[i],alpha:releaseFade*.12
            });
            core.circle(x,y,3.0).fill({
              color:colors[i],alpha:releaseFade*.78,
            });
            core
              .moveTo(x,y)
              .lineTo(tx*(source.radius+5),ty*(source.radius+5))
              .stroke({
                color:i===0?spec.core:colors[i],
                width:1.45,
                alpha:releaseFade*.54,
              });
          }
          core.circle(tx*(source.radius+5),ty*(source.radius+5),3.2).fill({
            color:spec.core,alpha:releaseFade*.90
          });
        } else if (spec.shape === "shadow") {
          const baseR=source.radius+10+releaseP*7;
          for(let ring=0;ring<3;ring++){
            const r=baseR+ring*6;
            const phase=(ring%2?-.55:.45)*p+ring*.55;
            strokeArc(glow,r,.20+phase,2.65+phase,{
              color:ring===1?spec.core:spec.main,width:8,alpha:releaseFade*.07,
            },8);
            strokeArc(core,r,.25+phase,2.60+phase,{
              color:ring===1?spec.core:spec.main,
              width:ring===1?2.0:1.55,
              alpha:releaseFade*(ring===1?.66:.52),
            },8);
          }
          glow
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+30),ty*(source.radius+30))
            .stroke({color:spec.main,width:14,alpha:releaseFade*.13});
          core
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+31),ty*(source.radius+31))
            .stroke({color:spec.core,width:2.5,alpha:releaseFade*.78});
        } else if (spec.shape === "chaos") {
          const jawR=source.radius+13+releaseP*8;
          for(const sign of [-1,1]){
            const center=sign>0?0:Math.PI;
            strokeArc(glow,jawR,center-.76,center+.76,{
              color:sign>0?spec.core:spec.main,width:10,alpha:releaseFade*.10
            },8);
            strokeArc(core,jawR,center-.72,center+.72,{
              color:sign>0?spec.core:spec.main,width:2.5,alpha:releaseFade*.72
            },8);

            const a=sign*.62;
            glow
              .moveTo(Math.cos(a)*(source.radius+4),Math.sin(a)*(source.radius+4))
              .lineTo(Math.cos(a)*(source.radius+28+releaseP*10),Math.sin(a)*(source.radius+28+releaseP*10))
              .stroke({color:spec.main,width:9,alpha:releaseFade*.09});
            core
              .moveTo(Math.cos(a)*(source.radius+4),Math.sin(a)*(source.radius+4))
              .lineTo(Math.cos(a)*(source.radius+28+releaseP*10),Math.sin(a)*(source.radius+28+releaseP*10))
              .stroke({
                color:sign>0?spec.core:spec.main,width:2.1,alpha:releaseFade*.68,
              });
          }

          glow
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+40),ty*(source.radius+40))
            .stroke({color:spec.main,width:20,alpha:releaseFade*.17});
          core
            .moveTo(tx*source.radius,ty*source.radius)
            .lineTo(tx*(source.radius+38),ty*(source.radius+38))
            .stroke({color:spec.core,width:3.2,alpha:releaseFade*.86});
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

        if (spec.shape === "frost-spear") {
          // VFX 3.0 Frostbolt: a narrow white-hot ice core wrapped in two
          // translucent blue ribbons. Wobble stays restrained so the bolt
          // reads as a fast crystalline projectile rather than liquid energy.
          taperedRibbon(
            glow,tailX,tailY,px,py,seed+5,p*.92,
            {
              startWidth:4.5,
              endWidth:13.5,
              wobble:3.8,
              segments:15,
              color:spec.accent,
              alpha:alpha*travelFade*.12,
            },
          );
          taperedRibbon(
            glow,tailX,tailY,px,py,seed+13,p*1.13,
            {
              startWidth:3.2,
              endWidth:10.5,
              wobble:2.8,
              segments:15,
              color:spec.main,
              alpha:alpha*travelFade*.22,
            },
          );
          taperedRibbon(
            core,tailX,tailY,px,py,seed+29,p,
            {
              startWidth:1.4,
              endWidth:5.0,
              wobble:1.25,
              segments:15,
              color:spec.main,
              alpha:alpha*travelFade*.72,
            },
          );
          core.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:spec.core,
            width:1.45,
            alpha:alpha*travelFade*.98,
          });
        } else if (spec.shape === "pyro") {
          // VFX 3.0 showcase: three nested procedural ribbons create the
          // flowing, almost-liquid fire trail from the reference rather than a
          // single blurred line.
          taperedRibbon(
            glow,tailX,tailY,px,py,seed+3,p,
            {
              startWidth:7,
              endWidth:19,
              wobble:7.5,
              segments:18,
              color:spec.accent,
              alpha:alpha*travelFade*.13,
            },
          );
          taperedRibbon(
            glow,tailX,tailY,px,py,seed+11,p*1.12,
            {
              startWidth:5,
              endWidth:15,
              wobble:5.5,
              segments:18,
              color:spec.main,
              alpha:alpha*travelFade*.23,
            },
          );
          taperedRibbon(
            core,tailX,tailY,px,py,seed+23,p*.94,
            {
              startWidth:2.2,
              endWidth:8.0,
              wobble:3.2,
              segments:18,
              color:0xffa62a,
              alpha:alpha*travelFade*.76,
            },
          );
          taperedRibbon(
            core,tailX,tailY,px,py,seed+37,p*1.25,
            {
              startWidth:.8,
              endWidth:3.5,
              wobble:1.7,
              segments:18,
              color:spec.core,
              alpha:alpha*travelFade*.92,
            },
          );
        } else if (spec.shape === "shadow" || spec.shape === "chaos") {
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

        if (spec.shape === "frost-spear") {
          taperedRibbon(
            glow,tailX,tailY,px,py,seed+109,p*1.45,
            {
              startWidth:6,
              endWidth:17,
              wobble:4.2,
              segments:14,
              color:spec.main,
              alpha:alpha*travelFade*.10*travelPulse,
            },
          );
          core.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:0x80eaff,
            width:5.2,
            alpha:alpha*travelFade*.48,
          });
          core.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:spec.core,
            width:1.45,
            alpha:alpha*travelFade*.98,
          });
        } else if (spec.shape === "pyro") {
          taperedRibbon(
            glow,tailX,tailY,px,py,seed+101,p*1.7,
            {
              startWidth:9,
              endWidth:24,
              wobble:8.5,
              segments:16,
              color:spec.main,
              alpha:alpha*travelFade*.10*travelPulse,
            },
          );
          core.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:0xffb633,
            width:6.8,
            alpha:alpha*travelFade*.56,
          });
          core.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:spec.core,
            width:1.8,
            alpha:alpha*travelFade*.98,
          });
        } else if (spec.shape === "shadow" || spec.shape === "chaos") {
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
        } else {
          glow.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color: spec.main,
            width: spec.heavy ? 24 : 19,
            alpha: alpha * travelFade * .15 * travelPulse,
          });
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
        }

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
          const flakes = 15;
          for (let i = 0; i < flakes; i += 1) {
            const f = (i + .45) / flakes;
            const drift =
              Math.sin(seed*.031+i*2.17+p*14.5)
              * (5+(i%4)*2.2);
            const point = trailPoint(f,drift);
            const r = 1.8+(i%4)*.55;
            const spin = p*(6.8+(i%3)*.7)+i*.83;

            glow.circle(point.x,point.y,r*3.0).fill({
              color:i%4===0?spec.core:spec.main,
              alpha:alpha*travelFade*.10,
            });

            for(let arm=0;arm<3;arm++){
              const a=spin+arm*Math.PI/3;
              const ax=Math.cos(a)*r;
              const ay=Math.sin(a)*r;
              core
                .moveTo(point.x-ax,point.y-ay)
                .lineTo(point.x+ax,point.y+ay)
                .stroke({
                  color:
                    arm===0?spec.core
                    :i%2?spec.main:spec.accent,
                  width:arm===0?1.0:.8,
                  alpha:alpha*travelFade*.76,
                });
            }
          }

          // Long crystal splinters peel off the ribbon and make the trail read
          // at arena scale even when Frostbolt is cast repeatedly.
          for(let i=0;i<10;i++){
            const f=(i+.30)/10;
            const sideSign=i%2?1:-1;
            const side=
              sideSign*(7+(i%4)*3)
              +Math.sin(i*1.8+p*10+seed*.04)*3;
            const point=trailPoint(f,side);
            const shardLen=5+(i%4)*2.3;
            const shardAngle=
              angle+Math.PI+(sideSign*.34)+Math.sin(p*8+i)*.10;
            const ex=point.x+Math.cos(shardAngle)*shardLen;
            const ey=point.y+Math.sin(shardAngle)*shardLen;

            glow
              .moveTo(point.x,point.y)
              .lineTo(ex,ey)
              .stroke({
                color:spec.main,
                width:3.2,
                alpha:alpha*travelFade*.10,
              });
            core
              .moveTo(point.x,point.y)
              .lineTo(ex,ey)
              .stroke({
                color:i%3===0?spec.core:(i%2?spec.main:spec.accent),
                width:i%3===0?1.45:1.05,
                alpha:alpha*travelFade*.66,
              });
          }

          // Two thin helix filaments wrap the central ice beam.
          for(const sign of [-1,1]){
            for(let i=0;i<=12;i++){
              const f=i/12;
              const side=
                sign*Math.sin(f*Math.PI*3+p*11+seed*.012)
                * 6.5*Math.sin(f*Math.PI);
              const point=trailPoint(f,side);
              if(i===0) core.moveTo(point.x,point.y);
              else core.lineTo(point.x,point.y);
            }
            core.stroke({
              color:sign>0?spec.core:spec.accent,
              width:1.05,
              alpha:alpha*travelFade*.42,
            });
          }
        } else if (spec.trailStyle === "fire") {
          const embers = 24;
          for (let i = 0; i < embers; i += 1) {
            const f = (i + .35) / embers;
            const side =
              Math.sin(i * 1.71 + p * 20 + seed * .025)
              * (6 + (i % 5) * 2.4);
            const point = trailPoint(f, side);
            const emberR = 1.1 + (i % 4) * .43;
            const lift =
              (1-f) * 8
              + Math.sin(p*12+i*1.3) * 3
              - Math.pow(1-f,1.6)*7;

            glow.circle(point.x,point.y+lift,emberR*4.2).fill({
              color: i%4===0 ? 0xffb52f : spec.main,
              alpha: alpha * travelFade * .15,
            });
            core.circle(point.x,point.y+lift,emberR).fill({
              color:
                i % 5 === 0 ? spec.core
                : i % 2 ? 0xffaa25
                : spec.accent,
              alpha: alpha * travelFade * .84,
            });

            if (i % 3 === 0) {
              core
                .moveTo(point.x,point.y+lift)
                .lineTo(
                  point.x-tx*(10+(i%3)*5)+nx*side*.20,
                  point.y+lift-ty*(10+(i%3)*5)-3,
                )
                .stroke({
                  color: i%2 ? spec.core : 0xffa62a,
                  width: 1.2+(i%4===0?.5:0),
                  alpha: alpha * travelFade * .56,
                });
            }
          }

          // Wavy flame tongues weave around the hot center ribbon.
          for(let lane=0;lane<4;lane++){
            const sign=lane%2?1:-1;
            const lanePhase=p*(13+lane*1.8)+seed*.017+lane*1.7;
            const segments=11;
            for(let i=0;i<=segments;i++){
              const f=i/segments;
              const center=trailPoint(
                f,
                sign*Math.sin(f*Math.PI*3+lanePhase)*(5+lane*2.2)*Math.sin(f*Math.PI)
              );
              const backPull=(1-f)*(lane*2.5);
              const x=center.x-tx*backPull;
              const y=center.y-ty*backPull;
              if(i===0) core.moveTo(x,y); else core.lineTo(x,y);
            }
            core.stroke({
              color:lane===0?spec.core:(lane===1?0xffd04a:(lane===2?spec.main:spec.accent)),
              width:lane===0?2.1:1.35,
              alpha:alpha*travelFade*(lane===0?.66:.46),
            });
          }

          // Rotating heat rings provide the "coiled energy" silhouette visible
          // in the reference projectiles without requiring a 3D renderer.
          for(let i=0;i<6;i++){
            const f=.18+i*.13;
            const center=trailPoint(f,0);
            const spin=p*12+i*.9+seed*.009;
            const along=4+Math.sin(spin)*2;
            const across=8+(i%3)*2.5;
            const pts=[];
            for(let j=0;j<=10;j++){
              const a=j/10*Math.PI*2;
              pts.push({
                x:center.x+tx*Math.cos(a)*along+nx*Math.sin(a)*across,
                y:center.y+ty*Math.cos(a)*along+ny*Math.sin(a)*across,
              });
            }
            for(let j=0;j<pts.length;j++){
              if(j===0) core.moveTo(pts[j].x,pts[j].y);
              else core.lineTo(pts[j].x,pts[j].y);
            }
            core.stroke({
              color:i%2?0xffa52a:spec.main,
              width:1.15,
              alpha:alpha*travelFade*.32,
            });
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
          const beads=16;
          let prevCold=null;
          let prevHot=null;
          for(let i=0;i<beads;i++){
            const f=(i+.35)/beads;
            const phase=f*Math.PI*5.5+p*17+seed*.021;
            const radius=6.5+(i%3)*1.5;
            const cold=trailPoint(f,Math.sin(phase)*radius);
            const hot=trailPoint(f,-Math.sin(phase)*radius);

            if(prevCold){
              glow.moveTo(prevCold.x,prevCold.y).lineTo(cold.x,cold.y).stroke({
                color:spec.main,width:7,alpha:alpha*travelFade*.07,
              });
              core.moveTo(prevCold.x,prevCold.y).lineTo(cold.x,cold.y).stroke({
                color:spec.main,width:1.45,alpha:alpha*travelFade*.56,
              });
              glow.moveTo(prevHot.x,prevHot.y).lineTo(hot.x,hot.y).stroke({
                color:spec.accent,width:7,alpha:alpha*travelFade*.07,
              });
              core.moveTo(prevHot.x,prevHot.y).lineTo(hot.x,hot.y).stroke({
                color:spec.accent,width:1.55,alpha:alpha*travelFade*.58,
              });
            }
            prevCold=cold;
            prevHot=hot;

            glow.circle(cold.x,cold.y,4.6).fill({
              color:spec.main,alpha:alpha*travelFade*.10,
            });
            glow.circle(hot.x,hot.y,4.6).fill({
              color:spec.accent,alpha:alpha*travelFade*.10,
            });
            core.circle(cold.x,cold.y,1.35).fill({
              color:i%4===0?spec.core:spec.main,
              alpha:alpha*travelFade*.76,
            });
            core.circle(hot.x,hot.y,1.35).fill({
              color:i%4===0?spec.core:spec.accent,
              alpha:alpha*travelFade*.76,
            });

            if(i%4===0){
              // cold side fractures like ice
              const a=phase*.55;
              const len=5+(i%3)*2;
              core
                .moveTo(cold.x,cold.y)
                .lineTo(cold.x+Math.cos(a)*len,cold.y+Math.sin(a)*len)
                .stroke({color:spec.core,width:1,alpha:alpha*travelFade*.62});
              // hot side throws a tiny rising ember
              core.circle(hot.x-tx*2,hot.y-3-(i%2)*2,1.2+(i%3)*.25).fill({
                color:i%8===0?spec.core:spec.accent,
                alpha:alpha*travelFade*.66,
              });
            }
          }

          // White fusion filament through the centre prevents the two halves
          // from reading as unrelated projectiles.
          core.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:spec.core,
            width:1.35,
            alpha:alpha*travelFade*.70,
          });
        } else if (spec.trailStyle === "arcane") {
          const sigils=10;
          for(let i=0;i<sigils;i++){
            const f=(i+.42)/sigils;
            const phase=p*11*(i%2?-1:1)+i*.83+seed*.015;
            const side=Math.sin(phase)*(6+(i%3)*2.4);
            const point=trailPoint(f,side);
            const r=3.3+(i%3)*.75;

            glow.circle(point.x,point.y,r*2.8).fill({
              color:spec.main,
              alpha:alpha*travelFade*.10,
            });

            // Each trail mark is an angular broken rune rather than a dot.
            for(let seg=0;seg<3;seg++){
              const a0=phase+seg*Math.PI*2/3;
              const a1=a0+.72;
              core
                .moveTo(point.x+Math.cos(a0)*r,point.y+Math.sin(a0)*r)
                .lineTo(point.x+Math.cos(a1)*r,point.y+Math.sin(a1)*r)
                .stroke({
                  color:i%3===0?spec.core:spec.main,
                  width:i%3===0?1.25:1.0,
                  alpha:alpha*travelFade*.70,
                });
            }

            if(i%2===0){
              const back=5+(i%3)*2;
              core
                .moveTo(point.x-tx*back+nx*3,point.y-ty*back+ny*3)
                .lineTo(point.x+tx*4,point.y+ty*4)
                .stroke({
                  color:spec.core,
                  width:1,
                  alpha:alpha*travelFade*.50,
                });
            }
          }

          // A narrow violet-white energy spine makes Barrage feel faster than
          // Frostfire while the runes supply its arcane identity.
          glow.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:spec.main,width:10,alpha:alpha*travelFade*.07
          });
          core.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:spec.core,width:1.25,alpha:alpha*travelFade*.72
          });
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
          const wisps=11;
          for(let i=0;i<wisps;i++){
            const f=(i+.40)/wisps;
            const wave=Math.sin(f*Math.PI*4+p*8+seed*.029)*(7+(i%2)*4);
            const point=trailPoint(f,wave);
            const radius=3.4+(i%3)*1.15;
            const phase=p*3+i*.7;

            strokeArc(glow,radius*2.2,phase,phase+Math.PI*1.32,{
              color:spec.main,width:6,alpha:alpha*travelFade*.09
            },6,point.x,point.y);
            strokeArc(core,radius,phase,phase+Math.PI*1.28,{
              color:i%3===0?spec.core:spec.main,
              width:i%3===0?1.45:1.15,
              alpha:alpha*travelFade*.66
            },6,point.x,point.y);

            if(i%3===0){
              core.circle(point.x,point.y,1.5+(i%2)*.4).fill({
                color:spec.core,alpha:alpha*travelFade*.60
              });
            }
          }
          glow.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:spec.main,width:9,alpha:alpha*travelFade*.055
          });
        } else if (spec.trailStyle === "fel") {
          glow.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:spec.main,width:12,alpha:alpha*travelFade*.075
          });
          core.moveTo(tailX,tailY).lineTo(px,py).stroke({
            color:spec.core,width:1.4,alpha:alpha*travelFade*.58
          });
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
          // Final weight pass: Frostbolt keeps its fast spear identity, but the
          // head now has a broader shoulder, asymmetrical facets and a denser
          // white core so it reads as a chunk of ice instead of an Ice Lance.
          const pulse=.92+.08*Math.sin(p*36+seed*.07);
          const shoulder=11.8*pulse;
          const outer=[
            transformed(px,py,31,0,angle),
            transformed(px,py,9,-7.2,angle),
            transformed(px,py,2,-shoulder,angle),
            transformed(px,py,-10,-9.2,angle),
            transformed(px,py,-25,-4.4,angle),
            transformed(px,py,-34,0,angle),
            transformed(px,py,-24,4.0,angle),
            transformed(px,py,-7,8.2,angle),
            transformed(px,py,6,10.7*pulse,angle),
          ];
          const inner=[
            transformed(px,py,26,0,angle),
            transformed(px,py,7,-5.7,angle),
            transformed(px,py,-3,-6.5,angle),
            transformed(px,py,-22,-1.8,angle),
            transformed(px,py,-25,0,angle),
            transformed(px,py,-18,2.7,angle),
            transformed(px,py,-1,6.0,angle),
            transformed(px,py,8,4.8,angle),
          ];
          const frontFacet=[
            transformed(px,py,27,0,angle),
            transformed(px,py,8,-6.0,angle),
            transformed(px,py,-3,-1.8,angle),
            transformed(px,py,8,4.4,angle),
          ];

          poly(glow,outer,{color:spec.main,alpha:alpha*travelFade*.34},true);
          poly(core,outer,{color:0x75dfff,alpha:alpha*travelFade*.90},true);
          poly(core,inner,{color:spec.core,alpha:alpha*travelFade*.98},true);
          poly(core,frontFacet,{color:0xcdf7ff,alpha:alpha*travelFade*.90},true);
          poly(core,outer,{color:spec.core,width:1.75,alpha:alpha*travelFade*.90});

          glow.circle(px+tx*6,py+ty*6,spec.size+9).fill({
            color:spec.main,
            alpha:alpha*travelFade*.20,
          });
          core.circle(px+tx*10,py+ty*10,3.3).fill({
            color:spec.core,
            alpha:alpha*travelFade*.92,
          });

          // Uneven shoulder crystals make the silhouette less perfectly
          // symmetrical and give the projectile more physical ice mass.
          const upperShoulder=[
            transformed(px,py,1,-7,angle),
            transformed(px,py,-8,-16,angle),
            transformed(px,py,-13,-5.2,angle),
          ];
          const lowerShoulder=[
            transformed(px,py,-2,6,angle),
            transformed(px,py,-8,13,angle),
            transformed(px,py,-15,4.2,angle),
          ];
          poly(core,upperShoulder,{
            color:spec.accent,
            alpha:alpha*travelFade*.66,
          },true);
          poly(core,lowerShoulder,{
            color:spec.main,
            alpha:alpha*travelFade*.58,
          },true);

          // Crystal fins and trailing splinters preserve the established
          // Frostbolt motion language while the head carries more weight.
          for(const sign of [-1,1]){
            const finScale=sign>0?1:.88;
            const fin=[
              transformed(px,py,-7,sign*5,angle),
              transformed(px,py,-17,sign*14*finScale,angle),
              transformed(px,py,-21,sign*4,angle),
            ];
            poly(core,fin,{
              color:sign>0?spec.main:spec.accent,
              alpha:alpha*travelFade*.62,
            },true);
          }

          for(let i=0;i<7;i++){
            const side=(i-3)*.22;
            const a=angle+Math.PI+side+Math.sin(p*11+i)*.05;
            const len=20+(i%4)*6;
            core
              .moveTo(px-tx*8,py-ty*8)
              .lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len)
              .stroke({
                color:i%3===0?spec.core:(i%2?spec.main:spec.accent),
                width:i%3===0?1.65:1.1,
                alpha:alpha*travelFade*.58,
              });
          }
        } else if (spec.shape === "pyro") {
          const flicker=.86+.14*Math.sin(p*42+seed*.09);
          const outer=[
            transformed(px,py,28,0,angle),
            transformed(px,py,8,-12*flicker,angle),
            transformed(px,py,-8,-13,angle),
            transformed(px,py,-26,-7,angle),
            transformed(px,py,-37,0,angle),
            transformed(px,py,-25,7,angle),
            transformed(px,py,-8,13,angle),
            transformed(px,py,8,12*flicker,angle),
          ];
          const inner=[
            transformed(px,py,22,0,angle),
            transformed(px,py,5,-7,angle),
            transformed(px,py,-12,-7.5,angle),
            transformed(px,py,-24,0,angle),
            transformed(px,py,-12,7.5,angle),
            transformed(px,py,5,7,angle),
          ];
          const hot=[
            transformed(px,py,15,0,angle),
            transformed(px,py,1,-3.8,angle),
            transformed(px,py,-13,0,angle),
            transformed(px,py,1,3.8,angle),
          ];

          poly(glow,outer,{color:spec.accent,alpha:alpha*travelFade*.26},true);
          poly(glow,inner,{color:spec.main,alpha:alpha*travelFade*.34},true);
          poly(core,outer,{color:spec.main,alpha:alpha*travelFade*.82},true);
          poly(core,inner,{color:0xffb32d,alpha:alpha*travelFade*.94},true);
          poly(core,hot,{color:spec.core,alpha:alpha*travelFade*.98},true);

          glow.circle(px+tx*6,py+ty*6,spec.size+8).fill({
            color:spec.main,alpha:alpha*travelFade*.20
          });
          core.circle(px+tx*7,py+ty*7,4.8).fill({
            color:spec.core,alpha:alpha*travelFade*.98
          });

          for(let i=0;i<8;i++){
            const side=(i-3.5)*.15;
            const a=angle+Math.PI+side+Math.sin(p*12+i)*.07;
            const len=24+(i%4)*7;
            core
              .moveTo(px-tx*10+nx*side*10,py-ty*10+ny*side*10)
              .lineTo(px+Math.cos(a)*len,py+Math.sin(a)*len)
              .stroke({
                color:i%4===0?spec.core:(i%2?0xffb52f:spec.accent),
                width:i%4===0?1.8:1.25,
                alpha:alpha*travelFade*.62,
              });
          }
        } else if (spec.shape === "frostfire") {
          const pulse=.90+.10*Math.sin(p*31+seed*.07);
          const cold=[
            transformed(px,py,27,0,angle),
            transformed(px,py,4,-11*pulse,angle),
            transformed(px,py,-17,-7,angle),
            transformed(px,py,-28,-1.5,angle),
            transformed(px,py,-10,0,angle),
          ];
          const hot=[
            transformed(px,py,27,0,angle),
            transformed(px,py,5,10*pulse,angle),
            transformed(px,py,-15,8,angle),
            transformed(px,py,-29,1.5,angle),
            transformed(px,py,-10,0,angle),
          ];
          const coreDiamond=[
            transformed(px,py,23,0,angle),
            transformed(px,py,1,-4.8,angle),
            transformed(px,py,-17,0,angle),
            transformed(px,py,1,4.8,angle),
          ];

          poly(glow,cold,{color:spec.main,alpha:alpha*travelFade*.27},true);
          poly(glow,hot,{color:spec.accent,alpha:alpha*travelFade*.24},true);
          poly(core,cold,{color:spec.main,alpha:alpha*travelFade*.86},true);
          poly(core,hot,{color:spec.accent,alpha:alpha*travelFade*.84},true);
          poly(core,coreDiamond,{color:spec.core,alpha:alpha*travelFade*.98},true);
          poly(core,cold,{color:spec.core,width:1.15,alpha:alpha*travelFade*.70});
          poly(core,hot,{color:0xffd3a8,width:1.15,alpha:alpha*travelFade*.70});

          glow.circle(px+tx*6,py+ty*6,spec.size+8).fill({
            color:spec.core,alpha:alpha*travelFade*.12
          });

          // Ice splinters peel from the cold flank; short flame tongues peel
          // from the hot flank, keeping the hybrid readable at arena scale.
          for(let i=0;i<6;i++){
            const coldSide=(i%2?1:-1);
            const base=-6-i*2.4;
            const len=12+(i%3)*5;
            const ca=angle+Math.PI+(coldSide*.22);
            core
              .moveTo(px+tx*base+nx*5,py+ty*base+ny*5)
              .lineTo(px+Math.cos(ca)*len,py+Math.sin(ca)*len)
              .stroke({
                color:i%3===0?spec.core:spec.main,
                width:i%3===0?1.5:1.0,
                alpha:alpha*travelFade*.56,
              });

            const ha=angle+Math.PI-(coldSide*.18);
            core
              .moveTo(px+tx*(base-2)-nx*5,py+ty*(base-2)-ny*5)
              .lineTo(px+Math.cos(ha)*(len*.82),py+Math.sin(ha)*(len*.82)-2)
              .stroke({
                color:i%3===0?spec.core:spec.accent,
                width:i%3===0?1.45:1.1,
                alpha:alpha*travelFade*.54,
              });
          }
        } else if (spec.shape === "arcane") {
          const spin=p*10.5+seed*.009;
          const outer=[
            transformed(px,py,25,0,angle),
            transformed(px,py,2,-8,angle),
            transformed(px,py,-18,-5,angle),
            transformed(px,py,-27,0,angle),
            transformed(px,py,-18,5,angle),
            transformed(px,py,2,8,angle),
          ];
          const inner=[
            transformed(px,py,19,0,angle),
            transformed(px,py,-1,-3.8,angle),
            transformed(px,py,-15,0,angle),
            transformed(px,py,-1,3.8,angle),
          ];

          poly(glow,outer,{color:spec.main,alpha:alpha*travelFade*.28},true);
          poly(core,outer,{color:spec.main,alpha:alpha*travelFade*.86},true);
          poly(core,inner,{color:spec.core,alpha:alpha*travelFade*.98},true);
          poly(core,outer,{color:spec.core,width:1.35,alpha:alpha*travelFade*.72});

          // Three rotating broken crescents orbit a fast central arcane blade.
          for(let ring=0;ring<3;ring++){
            const r=10+ring*4.5;
            const a0=spin*(ring%2?-.72:.58)+ring*.78;
            strokeArc(core,r,a0,a0+Math.PI*1.05,{
              color:ring===1?spec.core:spec.main,
              width:ring===1?1.45:1.1,
              alpha:alpha*travelFade*(.68-ring*.08),
            },7,px-tx*(2+ring*2),py-ty*(2+ring*2));
          }

          for(let i=0;i<3;i++){
            const a=spin+i*Math.PI*2/3;
            const rr=spec.size+8+(i%2)*3;
            core.circle(
              px-tx*4+Math.cos(a)*rr,
              py-ty*4+Math.sin(a)*rr,
              1.6+(i===0?.5:0)
            ).fill({
              color:i===0?spec.core:spec.accent,
              alpha:alpha*travelFade*.68,
            });
          }
        } else if (spec.shape === "lava-rock") {
          const spin=p*10.5+seed*.01;
          const pts=[];
          for(let i=0;i<12;i++){
            const a=i/12*Math.PI*2+spin;
            const rr=i%2?11:17;
            pts.push({x:px+Math.cos(a)*rr,y:py+Math.sin(a)*rr});
          }
          poly(glow,pts,{color:spec.main,alpha:alpha*travelFade*.34},true);
          glow.circle(px,py,spec.size+8).fill({
            color:spec.main,alpha:alpha*travelFade*.18
          });
          poly(core,pts,{color:0x56251f,alpha:alpha*travelFade*.98},true);
          poly(core,pts,{color:spec.main,width:2.8,alpha:alpha*travelFade*.90});

          // Bright molten fractures move across a darker rock shell.
          for(let i=0;i<5;i++){
            const a=i*Math.PI*2/5+spin*.42;
            const inner=3+(i%2)*2;
            const outer=11+(i%3)*2.2;
            core
              .moveTo(px+Math.cos(a)*inner,py+Math.sin(a)*inner)
              .lineTo(px+Math.cos(a+.34)*outer,py+Math.sin(a+.34)*outer)
              .stroke({
                color:i%2?0xffa33f:spec.core,
                width:i%2?1.6:2.0,
                alpha:alpha*travelFade*.88
              });
          }
          core.circle(px+tx*4,py+ty*4,3.6).fill({
            color:spec.core,alpha:alpha*travelFade*.88
          });
        } else if (spec.shape === "elemental") {
          const colors=[spec.main,spec.accent,0x80d889];
          glow.circle(px,py,spec.size+9).fill({
            color:spec.core,alpha:alpha*travelFade*.20
          });
          core.circle(px,py,7.5).fill({
            color:spec.core,alpha:alpha*travelFade*.98
          });

          // Three elemental satellites stay visually distinct while feeding one
          // white-hot combined core.
          for(let i=0;i<3;i++){
            const a=p*14.5*(i%2?-1:1)+i*Math.PI*2/3;
            const rr=13+(i%2)*4;
            const sx=px+Math.cos(a)*rr;
            const sy=py+Math.sin(a)*rr;
            glow.circle(sx,sy,7).fill({
              color:colors[i],alpha:alpha*travelFade*.20
            });
            core.circle(sx,sy,3.4).fill({
              color:colors[i],alpha:alpha*travelFade*.88
            });
            core.moveTo(px,py).lineTo(sx,sy).stroke({
              color:i===0?spec.core:colors[i],
              width:1.4,alpha:alpha*travelFade*.48
            });

            // Short elemental wake from each satellite.
            const bx=sx-tx*(9+i*2);
            const by=sy-ty*(9+i*2);
            core.moveTo(bx,by).lineTo(sx,sy).stroke({
              color:colors[i],width:1.0,alpha:alpha*travelFade*.48
            });
          }
          const backX=px-tx*31;
          const backY=py-ty*31;
          jaggedLine(
            glow,backX,backY,px,py,seed+71,4.5,6,
            {color:spec.main,width:8,alpha:alpha*travelFade*.08},p*4
          );
          jaggedLine(
            core,backX,backY,px,py,seed+71,4.5,6,
            {color:spec.core,width:1.8,alpha:alpha*travelFade*.72},p*4
          );
        } else if (spec.shape === "shadow") {
          const pulse=.88+.12*Math.sin(p*24+seed*.07);
          const shell=[
            transformed(px,py,20,0,angle),
            transformed(px,py,7,-9*pulse,angle),
            transformed(px,py,-9,-10,angle),
            transformed(px,py,-22,-4,angle),
            transformed(px,py,-28,0,angle),
            transformed(px,py,-20,6,angle),
            transformed(px,py,-7,10,angle),
            transformed(px,py,7,8*pulse,angle),
          ];
          const inner=[
            transformed(px,py,15,0,angle),
            transformed(px,py,2,-5,angle),
            transformed(px,py,-15,0,angle),
            transformed(px,py,2,5,angle),
          ];

          poly(glow,shell,{color:spec.main,alpha:alpha*travelFade*.25},true);
          poly(core,shell,{color:spec.accent,alpha:alpha*travelFade*.96},true);
          poly(core,inner,{color:spec.main,alpha:alpha*travelFade*.92},true);
          poly(core,shell,{color:spec.main,width:1.8,alpha:alpha*travelFade*.74});
          core.circle(px+tx*6,py+ty*6,3.7).fill({
            color:spec.core,alpha:alpha*travelFade*.90
          });

          for(let i=0;i<6;i++){
            const a=p*6+i*Math.PI*2/6+seed*.013;
            const rr=spec.size+5+(i%2)*4;
            glow.circle(px+Math.cos(a)*rr,py+Math.sin(a)*rr,4).fill({
              color:spec.main,alpha:alpha*travelFade*.10
            });
            core.circle(
              px+Math.cos(a)*rr,
              py+Math.sin(a)*rr,
              1.3+(i%2)*.45
            ).fill({
              color:i%3===0?spec.core:spec.main,
              alpha:alpha*travelFade*.58,
            });
          }
        } else if (spec.shape === "chaos") {
          const pulse=.90+.10*Math.sin(p*31+seed*.05);
          const outer=[
            transformed(px,py,29,0,angle),
            transformed(px,py,10,-13*pulse,angle),
            transformed(px,py,-8,-15,angle),
            transformed(px,py,-27,-9,angle),
            transformed(px,py,-39,0,angle),
            transformed(px,py,-27,9,angle),
            transformed(px,py,-8,15,angle),
            transformed(px,py,10,13*pulse,angle),
          ];
          const inner=[
            transformed(px,py,22,0,angle),
            transformed(px,py,4,-7,angle),
            transformed(px,py,-18,-7,angle),
            transformed(px,py,-29,0,angle),
            transformed(px,py,-18,7,angle),
            transformed(px,py,4,7,angle),
          ];

          poly(glow,outer,{color:spec.main,alpha:alpha*travelFade*.28},true);
          poly(core,outer,{color:0x244027,alpha:alpha*travelFade*.98},true);
          poly(core,inner,{color:spec.main,alpha:alpha*travelFade*.92},true);
          poly(core,outer,{color:spec.core,width:1.6,alpha:alpha*travelFade*.76});
          core.circle(px+tx*8,py+ty*8,5).fill({
            color:spec.core,alpha:alpha*travelFade*.98
          });

          const backX=px-tx*35;
          const backY=py-ty*35;
          for(const sign of [-1,1]){
            const midX=px-tx*18+nx*sign*17;
            const midY=py-ty*18+ny*sign*17;
            const endForkX=px-tx*32+nx*sign*25;
            const endForkY=py-ty*32+ny*sign*25;
            glow
              .moveTo(px-tx*5,py-ty*5)
              .lineTo(midX,midY)
              .lineTo(endForkX,endForkY)
              .stroke({
                color:spec.main,width:10,alpha:alpha*travelFade*.13
              });
            core
              .moveTo(px-tx*5,py-ty*5)
              .lineTo(midX,midY)
              .lineTo(endForkX,endForkY)
              .stroke({
                color:sign>0?spec.core:spec.main,
                width:2.2,
                alpha:alpha*travelFade*.82,
              });
          }
          jaggedLine(
            glow,backX,backY,px,py,seed+19,6.5,7,
            {color:spec.main,width:10,alpha:alpha*travelFade*.09},p*12
          );
          jaggedLine(
            core,backX,backY,px,py,seed+19,6,7,
            {color:spec.core,width:2.6,alpha:alpha*travelFade*.88},p*12
          );
        } else if (spec.shape === "hammer") {
          const hammerAngle=angle+p*3.1;
          const handle=[
            transformed(px,py,-4.5,-16,hammerAngle),
            transformed(px,py,4.5,-16,hammerAngle),
            transformed(px,py,4.5,13,hammerAngle),
            transformed(px,py,-4.5,13,hammerAngle),
          ];
          const head=[
            transformed(px,py,-17,-22,hammerAngle),
            transformed(px,py,17,-22,hammerAngle),
            transformed(px,py,17,-11,hammerAngle),
            transformed(px,py,-17,-11,hammerAngle),
          ];
          const inset=[
            transformed(px,py,-10,-20,hammerAngle),
            transformed(px,py,10,-20,hammerAngle),
            transformed(px,py,10,-14,hammerAngle),
            transformed(px,py,-10,-14,hammerAngle),
          ];

          glow.circle(px,py,spec.size+10).fill({
            color:spec.main,alpha:alpha*travelFade*.16
          });
          poly(glow,handle,{color:spec.main,alpha:alpha*travelFade*.28},true);
          poly(glow,head,{color:spec.main,alpha:alpha*travelFade*.30},true);
          poly(core,handle,{color:spec.main,alpha:alpha*travelFade*.94},true);
          poly(core,head,{color:spec.main,alpha:alpha*travelFade*.95},true);
          poly(core,inset,{color:spec.core,alpha:alpha*travelFade*.88},true);
          poly(core,head,{color:spec.core,width:1.8,alpha:alpha*travelFade*.90});
          core.circle(px,py-16,2.8).fill({
            color:spec.core,alpha:alpha*travelFade*.92
          });
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

        const showcaseSparks =
          spec.shape === "frost-spear" ? 4
          : spec.shape === "frostfire" ? 6
          : spec.shape === "arcane" ? 5
          : spec.shape === "shadow" ? 5
          : spec.shape === "chaos" ? 7
          : (spec.heavy ? 14 : 10);
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
          const burst=easeOut(hit);
          const flash=Math.exp(-hit*18);
          const crack=Math.exp(-hit*7.5);
          const after=Math.exp(-hit*4.6);

          // Tight contact flash: bright and extremely short so repeated
          // Frostbolts feel crisp without washing out the arena.
          glow.circle(ix,iy,11+flash*19).fill({
            color:spec.main,
            alpha:alpha*(.05+flash*.31)*fade,
          });
          core.circle(ix,iy,6+flash*9).fill({
            color:spec.core,
            alpha:alpha*Math.min(1,.72+flash*.35),
          });

          const flashDiamond=[
            transformed(ix,iy,19+flash*10,0,angle),
            transformed(ix,iy,0,-7-flash*3.5,angle),
            transformed(ix,iy,-13,0,angle),
            transformed(ix,iy,0,7+flash*3.5,angle),
          ];
          poly(core,flashDiamond,{
            color:spec.core,
            alpha:alpha*flash*.82,
          },true);

          // A compact crack ring gives the hit a readable "snap" rather than
          // another large generic explosion.
          glow.circle(ix,iy,9+burst*38).stroke({
            color:spec.main,
            width:8,
            alpha:alpha*after*.13,
          });
          core.circle(ix,iy,10+burst*29).stroke({
            color:0x9cf0ff,
            width:2.4,
            alpha:alpha*crack*.72,
          });

          // Six large shards are deliberately readable. The previous dense
          // shard halo looked energetic but lost the physical ice-break beat.
          const shards=6;
          for(let i=0;i<shards;i++){
            const a=i/shards*Math.PI*2+seed*.013+hit*(i%2?.20:-.17);
            const inner=6+(i%2)*2;
            const outer=20+burst*(33+(i%3)*8);
            const bend=a+(i%2?.045:-.045)*Math.sin(hit*Math.PI);
            const sx=ix+Math.cos(a)*inner;
            const sy=iy+Math.sin(a)*inner;
            const ex=ix+Math.cos(bend)*outer;
            const ey=iy+Math.sin(bend)*outer;

            glow
              .moveTo(sx,sy)
              .lineTo(ex,ey)
              .stroke({
                color:spec.main,
                width:i%3===0?6.0:4.0,
                alpha:alpha*after*.12,
              });
            core
              .moveTo(sx,sy)
              .lineTo(ex,ey)
              .stroke({
                color:i%3===0?spec.core:(i%2?spec.main:spec.accent),
                width:i%3===0?2.8:1.8,
                alpha:alpha*after*(i%3===0?.84:.68),
              });

            if(i%2===0){
              const side=i%4===0?1:-1;
              const branchA=bend+side*.38;
              const branchLen=7+(i%3)*2.5;
              core
                .moveTo(ex,ey)
                .lineTo(
                  ex+Math.cos(branchA)*branchLen,
                  ey+Math.sin(branchA)*branchLen
                )
                .stroke({
                  color:spec.core,
                  width:1.05,
                  alpha:alpha*after*.50,
                });
            }
          }

          // Small chips carry the cold texture for a fraction longer than the
          // white flash, without creating a persistent particle cloud.
          const chips=8;
          for(let i=0;i<chips;i++){
            const a=i/chips*Math.PI*2+seed*.027-hit*(i%2?.55:-.43);
            const rr=11+burst*(19+(i%4)*5);
            const cx=ix+Math.cos(a)*rr;
            const cy=iy+Math.sin(a)*rr-hit*(i%3)*2.5;
            const len=3.5+(i%3)*1.8;
            const ca=a+(i%2?.55:-.48);

            glow.circle(cx,cy,2.4+(i%2)).fill({
              color:spec.main,
              alpha:alpha*after*.07,
            });
            core
              .moveTo(cx-Math.cos(ca)*len*.45,cy-Math.sin(ca)*len*.45)
              .lineTo(cx+Math.cos(ca)*len,cy+Math.sin(ca)*len)
              .stroke({
                color:i%3===0?spec.core:(i%2?spec.main:spec.accent),
                width:i%3===0?1.35:1.0,
                alpha:alpha*after*.58,
              });
          }

          // The central fracture continues Frostbolt's momentum through the
          // target and makes a successful hit feel heavier than the trail.
          for(let i=0;i<3;i++){
            const spread=(i-1)*.13;
            const a=angle+spread;
            const outer=27+burst*(30+(i===1?8:0));
            core
              .moveTo(ix-tx*4,iy-ty*4)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i===1?spec.core:(i===0?spec.main:spec.accent),
                width:i===1?2.9:1.7,
                alpha:alpha*after*(i===1?.78:.62),
              });
          }
        } else if (spec.shape === "pyro") {
          const boom=easeOut(hit);
          const flash=Math.exp(-hit*11);
          const after=Math.exp(-hit*3.0);

          glow.circle(ix,iy,18+boom*54).fill({
            color:spec.main,
            alpha:alpha*(.09+flash*.24)*fade,
          });
          glow.circle(ix,iy,15+boom*66).stroke({
            color:spec.accent,
            width:16,
            alpha:alpha*after*.18,
          });
          glow.circle(ix,iy,10+boom*42).stroke({
            color:0xffb52f,
            width:12,
            alpha:alpha*after*.20,
          });

          core.circle(ix,iy,10+flash*11).fill({
            color:spec.core,
            alpha:alpha*Math.min(1,.76+flash*.26),
          });
          core.circle(ix,iy,14+boom*42).stroke({
            color:0xffc23b,
            width:3.4,
            alpha:alpha*after*.82,
          });
          core.circle(ix,iy,8+boom*27).stroke({
            color:spec.core,
            width:2.1,
            alpha:alpha*after*.72,
          });

          const rays=18;
          for(let i=0;i<rays;i++){
            const a=i/rays*Math.PI*2+seed*.019+hit*(i%2?.40:-.32);
            const inner=7+(i%3)*2;
            const outer=24+boom*(36+(i%5)*8);
            const bend=a+(i%2?.08:-.08)*Math.sin(hit*Math.PI);
            core
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(
                ix+Math.cos(bend)*outer,
                iy+Math.sin(bend)*outer-hit*(i%3)*4
              )
              .stroke({
                color:
                  i%5===0?spec.core
                  :i%2?0xffb52f:spec.accent,
                width:i%5===0?2.5:1.55,
                alpha:alpha*after*(i%5===0?.80:.62),
              });
          }

          for(let i=0;i<22;i++){
            const a=i/22*Math.PI*2+seed*.031+i*.17;
            const rr=14+boom*(26+(i%6)*8);
            const rise=hit*(6+(i%4)*5);
            const r=1.2+(i%4)*.55;
            glow.circle(
              ix+Math.cos(a)*rr,
              iy+Math.sin(a)*rr-rise,
              r*3.2,
            ).fill({
              color:i%3===0?0xffc13a:spec.main,
              alpha:alpha*after*.12,
            });
            core.circle(
              ix+Math.cos(a)*rr,
              iy+Math.sin(a)*rr-rise,
              r,
            ).fill({
              color:i%5===0?spec.core:(i%2?0xffb52f:spec.accent),
              alpha:alpha*after*.72,
            });
          }

          // A short forward cone preserves the projectile's direction through
          // the detonation and makes the impact feel like momentum, not a
          // generic circular explosion.
          for(let i=0;i<5;i++){
            const spread=(i-2)*.16;
            const a=angle+spread;
            const outer=30+boom*(30+(i%2)*10);
            core
              .moveTo(ix-tx*3,iy-ty*3)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i===2?spec.core:(i%2?0xffb52f:spec.main),
                width:i===2?2.8:1.7,
                alpha:alpha*after*.68,
              });
          }
        } else if (spec.shape === "frostfire") {
          const burst=easeOut(hit);
          const flash=Math.exp(-hit*15);
          const after=Math.exp(-hit*4.1);

          glow.circle(ix,iy,12+flash*22).fill({
            color:spec.core,alpha:alpha*flash*.20
          });
          core.circle(ix,iy,5+flash*7).fill({
            color:spec.core,alpha:alpha*Math.min(1,.72+flash*.30)
          });

          // Two concentric elemental rings separate before fading: cold outside,
          // hot inside, with the white fusion core between them.
          glow.circle(ix,iy,12+burst*43).stroke({
            color:spec.main,width:10,alpha:alpha*after*.11
          });
          core.circle(ix,iy,10+burst*34).stroke({
            color:spec.main,width:2.0,alpha:alpha*after*.58
          });
          core.circle(ix,iy,7+burst*25).stroke({
            color:spec.accent,width:2.0,alpha:alpha*after*.58
          });

          for(let i=0;i<10;i++){
            const a=i/10*Math.PI*2+seed*.01+hit*(i%2?.17:-.14);
            const cold=i%2===0;
            const inner=6+(i%3);
            const outer=19+burst*(31+(i%4)*7);
            const ex=ix+Math.cos(a)*outer;
            const ey=iy+Math.sin(a)*outer;

            glow
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ex,ey)
              .stroke({
                color:cold?spec.main:spec.accent,
                width:cold?4.5:5.0,
                alpha:alpha*after*.09,
              });
            core
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ex,ey)
              .stroke({
                color:i%5===0?spec.core:(cold?spec.main:spec.accent),
                width:i%5===0?2.4:1.5,
                alpha:alpha*after*.66,
              });

            if(cold && i%4===0){
              const branch=a+.38;
              core
                .moveTo(ex,ey)
                .lineTo(ex+Math.cos(branch)*8,ey+Math.sin(branch)*8)
                .stroke({color:spec.core,width:1,alpha:alpha*after*.48});
            }else if(!cold){
              core.circle(ex,ey-hit*4,1.5+(i%3)*.35).fill({
                color:i%3===0?spec.core:spec.accent,
                alpha:alpha*after*.66,
              });
            }
          }

          // Forward fusion fracture preserves projectile momentum.
          for(let i=0;i<3;i++){
            const a=angle+(i-1)*.13;
            const outer=28+burst*(27+(i===1?8:0));
            core
              .moveTo(ix-tx*3,iy-ty*3)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i===1?spec.core:(i===0?spec.main:spec.accent),
                width:i===1?2.7:1.7,
                alpha:alpha*after*(i===1?.76:.60),
              });
          }
        } else if (spec.shape === "arcane") {
          const burst=easeOut(hit);
          const flash=Math.exp(-hit*17);
          const after=Math.exp(-hit*4.8);
          const collapse=1-burst;

          glow.circle(ix,iy,10+flash*20).fill({
            color:spec.main,alpha:alpha*flash*.20
          });
          core.circle(ix,iy,4+flash*6).fill({
            color:spec.core,alpha:alpha*Math.min(1,.72+flash*.34)
          });

          // The runes briefly collapse inward, then snap outward as broken
          // concentric glyphs. This keeps Barrage precise rather than explosive.
          for(let ring=0;ring<3;ring++){
            const r=8+collapse*7+burst*(17+ring*8);
            const offset=hit*(ring%2?3.4:-2.9)+seed*.004;
            for(let seg=0;seg<4;seg++){
              const a0=seg*Math.PI/2+.15+offset;
              const a1=a0+.58;
              strokeArc(core,r,a0,a1,{
                color:ring===1?spec.core:(ring===2?spec.accent:spec.main),
                width:ring===1?1.9:1.35,
                alpha:alpha*after*(.68-ring*.09),
              },6,ix,iy);
            }
          }

          // Six angular shards form a star-like punctuation mark at the hit.
          for(let i=0;i<6;i++){
            const a=i/6*Math.PI*2+seed*.013-hit*.22;
            const inner=7+(i%2)*2;
            const outer=17+burst*(25+(i%3)*7);
            const mx=ix+Math.cos(a)*inner;
            const my=iy+Math.sin(a)*inner;
            const ex=ix+Math.cos(a)*outer;
            const ey=iy+Math.sin(a)*outer;
            core
              .moveTo(mx,my)
              .lineTo(ex,ey)
              .lineTo(
                ex+Math.cos(a+.72)*(5+(i%2)*2),
                ey+Math.sin(a+.72)*(5+(i%2)*2)
              )
              .stroke({
                color:i%3===0?spec.core:(i%2?spec.main:spec.accent),
                width:i%3===0?2.0:1.35,
                alpha:alpha*after*.64,
              });
          }

          // One short forward blade gives the instant spell a decisive finish.
          core
            .moveTo(ix-tx*4,iy-ty*4)
            .lineTo(ix+tx*(31+burst*20),iy+ty*(31+burst*20))
            .stroke({
              color:spec.core,width:2.5,alpha:alpha*after*.72
            });
        } else if (spec.shape === "lava-rock") {
          const burst=easeOut(hit);
          const flash=Math.exp(-hit*14);
          const after=Math.exp(-hit*4.0);

          glow.circle(ix,iy,12+flash*25).fill({
            color:spec.core,alpha:alpha*flash*.16
          });
          glow.circle(ix,iy,15+burst*43).stroke({
            color:spec.main,width:13,alpha:alpha*after*.14
          });
          core.circle(ix,iy,10+burst*31).stroke({
            color:0xff8a35,width:2.3,alpha:alpha*after*.62
          });

          // Molten fragments and darker rock chunks separate on impact.
          for(let i=0;i<12;i++){
            const a=i/12*Math.PI*2+seed*.017;
            const rr=9+burst*(24+(i%4)*8);
            const rise=hit*(4+(i%3)*3);
            glow.circle(ix+Math.cos(a)*rr,iy+Math.sin(a)*rr-rise,4+(i%2)).fill({
              color:i%3===0?spec.core:spec.main,
              alpha:alpha*after*.08
            });
            core.circle(
              ix+Math.cos(a)*rr,
              iy+Math.sin(a)*rr-rise,
              1.6+(i%3)*.65
            ).fill({
              color:i%4===0?spec.core:(i%2?spec.main:0x6b2b20),
              alpha:alpha*after*.72,
            });
          }

          // Short ground-like fracture spokes sell weight without leaving a
          // persistent decal.
          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2+seed*.011;
            core
              .moveTo(ix+Math.cos(a)*7,iy+Math.sin(a)*7)
              .lineTo(
                ix+Math.cos(a)*(20+burst*(24+(i%3)*7)),
                iy+Math.sin(a)*(20+burst*(24+(i%3)*7))
              )
              .stroke({
                color:i%3===0?spec.core:0x8b3b28,
                width:i%3===0?2.1:1.5,
                alpha:alpha*after*.62
              });
          }
        } else if (spec.shape === "elemental") {
          const colors=[spec.main,spec.accent,0x80d889];
          const burst=easeOut(hit);
          const flash=Math.exp(-hit*15);
          const after=Math.exp(-hit*4.4);

          glow.circle(ix,iy,11+flash*24).fill({
            color:spec.core,alpha:alpha*flash*.18
          });
          core.circle(ix,iy,5+flash*7).fill({
            color:spec.core,alpha:alpha*Math.min(1,.70+flash*.28)
          });

          // Three elemental sectors burst apart from the fused center.
          for(let element=0;element<3;element++){
            const base=element*Math.PI*2/3+seed*.006;
            for(let lane=-1;lane<=1;lane++){
              const a=base+lane*.18+hit*(element%2?.18:-.14);
              const inner=7+Math.abs(lane)*2;
              const outer=22+burst*(31+(element*4)+Math.abs(lane)*6);
              glow
                .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
                .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
                .stroke({
                  color:colors[element],width:7,alpha:alpha*after*.08
                });
              core
                .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
                .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
                .stroke({
                  color:lane===0?spec.core:colors[element],
                  width:lane===0?2.2:1.4,
                  alpha:alpha*after*.68
                });
            }
          }

          glow.circle(ix,iy,13+burst*35).stroke({
            color:spec.core,width:10,alpha:alpha*after*.08
          });
          core.circle(ix,iy,10+burst*25).stroke({
            color:spec.core,width:1.5,alpha:alpha*after*.46
          });
        } else if (spec.shape === "shadow") {
          const burst=easeOut(hit);
          const flash=Math.exp(-hit*16);
          const after=Math.exp(-hit*4.7);

          glow.circle(ix,iy,11+flash*22).fill({
            color:spec.main,alpha:alpha*flash*.18
          });
          core.circle(ix,iy,5+flash*6).fill({
            color:spec.core,alpha:alpha*Math.min(1,.70+flash*.28)
          });

          for(let ring=0;ring<3;ring++){
            const r=9+burst*(17+ring*8);
            const phase=hit*(ring%2?-2.0:1.65)+seed*.006;
            for(let seg=0;seg<3;seg++){
              const a0=seg*Math.PI*2/3+.18+phase;
              strokeArc(core,r,a0,a0+.58,{
                color:ring===1?spec.core:spec.main,
                width:ring===1?1.8:1.3,
                alpha:alpha*after*(.64-ring*.08)
              },6,ix,iy);
            }
          }

          for(let i=0;i<7;i++){
            const a=i/7*Math.PI*2+seed*.01-hit*(i%2?1.1:-.9);
            const inner=7+(i%2)*2;
            const outer=18+burst*(26+(i%3)*7);
            const mid=outer*.62;
            core
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ix+Math.cos(a+.28)*mid,iy+Math.sin(a+.28)*mid)
              .lineTo(ix+Math.cos(a+.54)*outer,iy+Math.sin(a+.54)*outer)
              .stroke({
                color:i%3===0?spec.core:spec.main,
                width:i%3===0?1.9:1.3,
                alpha:alpha*after*.62,
              });
          }
        } else if (spec.shape === "chaos") {
          const burst=easeOut(hit);
          const flash=Math.exp(-hit*13);
          const after=Math.exp(-hit*3.9);

          glow.circle(ix,iy,15+flash*27).fill({
            color:spec.core,alpha:alpha*flash*.18
          });
          glow.circle(ix,iy,16+burst*50).stroke({
            color:spec.main,width:15,alpha:alpha*after*.16
          });
          core.circle(ix,iy,11+burst*36).stroke({
            color:spec.main,width:2.5,alpha:alpha*after*.68
          });

          for(let i=0;i<11;i++){
            const a=i/11*Math.PI*2+seed*.013;
            const inner=7+(i%2)*2;
            const mid=18+burst*(10+(i%3)*3);
            const outer=24+burst*(35+(i%4)*8);
            const bend=a+(i%2?.24:-.24);
            glow
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ix+Math.cos(bend)*mid,iy+Math.sin(bend)*mid)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:spec.main,width:7,alpha:alpha*after*.08
              });
            core
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ix+Math.cos(bend)*mid,iy+Math.sin(bend)*mid)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i%3===0?spec.core:spec.main,
                width:i%3===0?2.4:1.65,
                alpha:alpha*after*.70,
              });
          }

          for(let i=0;i<3;i++){
            const a=angle+(i-1)*.15;
            const outer=34+burst*(34+(i===1?12:0));
            core
              .moveTo(ix-tx*5,iy-ty*5)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i===1?spec.core:spec.main,
                width:i===1?3.0:1.8,
                alpha:alpha*after*(i===1?.80:.64),
              });
          }
        } else if (spec.shape === "hammer") {
          const contact=Math.exp(-hit*13);
          const burst=easeOut(hit);

          glow.circle(ix,iy,10+contact*23).fill({
            color:spec.core,alpha:alpha*fade*contact*.17
          });
          glow.circle(ix,iy,12+burst*38).stroke({
            color:spec.main,width:10,alpha:alpha*fade*.15
          });
          core.circle(ix,iy,10+burst*36).stroke({
            color:spec.main,width:2.3,alpha:alpha*fade*.58
          });
          core.circle(ix,iy,5+contact*6).fill({
            color:spec.core,alpha:alpha*fade*(.60+contact*.30)
          });

          for(let i=0;i<8;i++){
            const a=i/8*Math.PI*2;
            const inner=8;
            const outer=20+burst*(30+(i%2)*5);
            glow
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i%2?spec.main:spec.core,
                width:6,alpha:alpha*fade*.06
              });
            core
              .moveTo(ix+Math.cos(a)*inner,iy+Math.sin(a)*inner)
              .lineTo(ix+Math.cos(a)*outer,iy+Math.sin(a)*outer)
              .stroke({
                color:i%2?spec.main:spec.core,
                width:1.6+(i%4===0?.4:0),
                alpha:alpha*fade*.62,
              });
          }

          // Four short angular stun plates close around the victim.
          for(let i=0;i<4;i++){
            const a=i*Math.PI/2+.18;
            const rr=18+burst*9;
            const x=ix+Math.cos(a)*rr;
            const y=iy+Math.sin(a)*rr;
            const plate=[
              transformed(x,y,-6,-4,a),
              transformed(x,y,6,-4,a),
              transformed(x,y,8,3,a),
              transformed(x,y,0,8,a),
              transformed(x,y,-8,3,a),
            ];
            poly(core,plate,{
              color:i%2?spec.core:spec.main,
              width:1.4,
              alpha:alpha*fade*.54
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
    this.updateProjectileGroundLights(game);
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
