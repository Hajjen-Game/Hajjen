const TAU = Math.PI * 2;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function baseSpellId(spellId = "") {
  return String(spellId).split(":chain:")[0];
}

function pulse01(value) {
  return .5 + Math.sin(value) * .5;
}

function hash01(seed, index = 0) {
  const value = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function actorPoint(game, actorId, fallbackX = 0, fallbackY = 0) {
  const actor = actorId ? game.getActor(actorId) : null;
  return {
    actor,
    x: actor?.x ?? fallbackX,
    y: actor?.y ?? fallbackY,
  };
}

const HEALING_IDS = new Set([
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

const DEFENSIVE_IDS = new Set([
  "priest-pain-suppression",
  "druid-ironbark",
  "paladin-blessing",
  "dk-rune-tap",
  "warlock-resolve",
  "shaman-astral-shift",
]);

const CONTROL_IDS = new Set([
  "mage-frost-nova",
  "mage-polymorph",
  "shaman-hex",
  "warlock-fear",
  "priest-psychic-scream",
  "druid-cyclone",
  "paladin-hammer",
  "dk-chains",
  "rogue-kidney",
]);

const MELEE_IDS = new Set([
  "warrior-rend",
  "warrior-mortal-strike",
  "warrior-slam",
  "warrior-charge",
  "warrior-pummel",
  "warrior-overpower",
  "warrior-bloodthirst",
  "rogue-garrote",
  "rogue-sinister",
  "rogue-eviscerate",
  "rogue-kidney",
  "rogue-kick",
  "rogue-mutilate",
  "rogue-shadowstep",
  "dk-death-strike",
  "dk-obliterate",
  "dk-mind-freeze",
  "dk-frost-strike",
  "shaman-stormstrike",
]);

function paletteFor(spellId = "", style = "damage") {
  const id = baseSpellId(spellId);

  if (id.startsWith("mage-")) {
    if (id.includes("frost") || id.includes("nova")) {
      return { main: 0x65cfff, core: 0xf0fbff, accent: 0x4e79ff, dark: 0x244f7d };
    }
    if (id.includes("pyro") || id.includes("bomb")) {
      return { main: 0xff7138, core: 0xffe0a3, accent: 0xe43a24, dark: 0x7b241b };
    }
    return { main: 0xb478ff, core: 0xf5e6ff, accent: 0x6f4cff, dark: 0x4b2b72 };
  }

  if (id.startsWith("shaman-")) {
    if (id.includes("lava") || id.includes("flame")) {
      return { main: 0xff7334, core: 0xffe39d, accent: 0xd83d25, dark: 0x7a2f1f };
    }
    if (id.includes("hex") || id.includes("astral")) {
      return { main: 0x63d99b, core: 0xe5fff0, accent: 0x3a9c72, dark: 0x285d4a };
    }
    return { main: 0x62d9ff, core: 0xf1fdff, accent: 0x3d7fff, dark: 0x285a7d };
  }

  if (id.startsWith("warlock-")) {
    if (id.includes("chaos") || id.includes("conflagrate")) {
      return { main: 0x72ff79, core: 0xe0ffc0, accent: 0x8b4fff, dark: 0x3c2869 };
    }
    return { main: 0xa45dff, core: 0xf0dcff, accent: 0x6540b8, dark: 0x33204e };
  }

  if (id.startsWith("priest-")) {
    if (id.includes("psychic") || id.includes("smite")) {
      return { main: 0xa45bff, core: 0xead8ff, accent: 0x6c38bd, dark: 0x382154 };
    }
    if (id.includes("holy-fire")) {
      return { main: 0xffbc55, core: 0xfff4c8, accent: 0xff7740, dark: 0x7d4b2c };
    }
    return { main: 0xffd45d, core: 0xfff9d9, accent: 0xf0a84b, dark: 0x7e6330 };
  }

  if (id.startsWith("druid-")) {
    if (id.includes("moonfire")) {
      return { main: 0x8ba9ff, core: 0xf1f0ff, accent: 0x9b62db, dark: 0x4e416e };
    }
    if (id.includes("cyclone")) {
      return { main: 0xcfe4b2, core: 0xf8ffe8, accent: 0x79ad6b, dark: 0x455b3c };
    }
    return { main: 0x69dd7b, core: 0xe9ffd9, accent: 0x47a85b, dark: 0x31583a };
  }

  if (id.startsWith("paladin-")) {
    return { main: 0xffca45, core: 0xfff4bd, accent: 0xf28b37, dark: 0x74572b };
  }

  if (id.startsWith("dk-")) {
    if (id.includes("chains") || id.includes("mind-freeze") || id.includes("frost")) {
      return { main: 0x72cfff, core: 0xf0fbff, accent: 0x4e87d9, dark: 0x304f6d };
    }
    if (id.includes("fever")) {
      return { main: 0x7acb62, core: 0xe8ffd5, accent: 0x4a8340, dark: 0x354d32 };
    }
    return { main: 0xd95b56, core: 0xffddd1, accent: 0x8f353c, dark: 0x51292c };
  }

  if (id.startsWith("warrior-")) {
    return { main: 0xd86b5c, core: 0xffd9c9, accent: 0x9da7b3, dark: 0x4f3b39 };
  }

  if (id.startsWith("rogue-")) {
    return { main: 0xe9c85c, core: 0xfff2bc, accent: 0xd77937, dark: 0x66532f };
  }

  const styles = {
    heal: { main: 0x65db78, core: 0xedffe7, accent: 0x4aa65a, dark: 0x31533a },
    priest: { main: 0xffd45d, core: 0xfff9d9, accent: 0xf0a84b, dark: 0x7e6330 },
    druid: { main: 0x69dd7b, core: 0xe9ffd9, accent: 0x47a85b, dark: 0x31583a },
    paladin: { main: 0xffca45, core: 0xfff4bd, accent: 0xf28b37, dark: 0x74572b },
    mage: { main: 0x65cfff, core: 0xf0fbff, accent: 0x4e79ff, dark: 0x244f7d },
    shaman: { main: 0x62d9ff, core: 0xf1fdff, accent: 0x3d7fff, dark: 0x285a7d },
    lightning: { main: 0x62d9ff, core: 0xf1fdff, accent: 0x3d7fff, dark: 0x285a7d },
    warlock: { main: 0xa45dff, core: 0xf0dcff, accent: 0x6540b8, dark: 0x33204e },
    warrior: { main: 0xd86b5c, core: 0xffd9c9, accent: 0x9da7b3, dark: 0x4f3b39 },
    rogue: { main: 0xe9c85c, core: 0xfff2bc, accent: 0xd77937, dark: 0x66532f },
    "death-knight": { main: 0xd95b56, core: 0xffddd1, accent: 0x72cfff, dark: 0x51292c },
    fear: { main: 0xa45dff, core: 0xf0dcff, accent: 0x6540b8, dark: 0x33204e },
    interrupt: { main: 0xf0c35b, core: 0xfff1c6, accent: 0xcf5b42, dark: 0x62402d },
    damage: { main: 0xe56b5c, core: 0xffe0d4, accent: 0xd04238, dark: 0x642f2c },
  };

  return styles[style] || styles.damage;
}

function isHealingSpell(id) {
  return HEALING_IDS.has(baseSpellId(id));
}

function isDefensiveSpell(id) {
  return DEFENSIVE_IDS.has(baseSpellId(id));
}

function isControlSpell(id) {
  return CONTROL_IDS.has(baseSpellId(id));
}

function isMeleeSpell(id) {
  return MELEE_IDS.has(baseSpellId(id));
}

function isProjectileSpell(id) {
  const base = baseSpellId(id);
  if (isHealingSpell(base) || isDefensiveSpell(base) || isControlSpell(base) || isMeleeSpell(base)) {
    return false;
  }

  return ![
    "mage-frost-nova",
    "shaman-astral-shift",
    "warlock-resolve",
    "priest-psychic-scream",
    "druid-ironbark",
    "dk-rune-tap",
  ].includes(base);
}

export class PixiSpellVfxLayer {
  constructor(PIXI, stage) {
    this.PIXI = PIXI;
    this.stage = stage;

    const { BlurFilter, Container, Graphics } = PIXI;
    this.container = new Container();
    this.container.label = "pixi-native-spell-vfx";
    this.container.eventMode = "none";

    this.glow = new Graphics();
    this.core = new Graphics();
    this.accent = new Graphics();

    this.glow.blendMode = "add";
    this.core.blendMode = "screen";
    this.accent.blendMode = "screen";
    this.glow.filters = [new BlurFilter({ strength: 7, quality: 2 })];

    this.container.addChild(this.glow, this.core, this.accent);
    stage.addChild(this.container);
  }

  bringToFront() {
    if (!this.container?.parent) return;
    const parent = this.container.parent;
    parent.setChildIndex(this.container, parent.children.length - 1);
  }

  clear() {
    this.glow.clear();
    this.core.clear();
    this.accent.clear();
  }

  destroy() {
    if (this.container?.parent) this.container.parent.removeChild(this.container);
    this.container?.destroy?.({ children: true });
    this.container = null;
  }

  update(game) {
    this.clear();
    const effects = game?.vfx?.effects || [];

    for (const effect of effects) {
      const total = Math.max(1, Number(effect.totalMs) || 1);
      const remaining = Math.max(0, Number(effect.remainingMs) || 0);
      const progress = clamp01(1 - remaining / total);
      const alpha = clamp01(remaining / total);

      if (effect.type === "beam") {
        this.drawBeam(game, effect, progress, alpha);
      } else if (effect.type === "burst") {
        this.drawBurst(game, effect, progress, alpha);
      } else if (effect.type === "ring") {
        this.drawRing(game, effect, progress, alpha);
      } else if (effect.type === "slash") {
        this.drawSlash(game, effect, progress, alpha);
      } else if (effect.type === "chain") {
        this.drawChain(game, effect, progress, alpha);
      } else if (effect.type === "spell") {
        this.drawSpell(game, effect, progress, alpha);
      }
    }
  }

  drawBeam(game, effect, progress, alpha) {
    const from = actorPoint(game, effect.sourceId);
    const to = actorPoint(game, effect.targetId);
    if (!from.actor || !to.actor) return;

    const palette = paletteFor("", effect.style);
    const healing = ["heal", "priest", "druid", "paladin"].includes(effect.style);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;

    if (healing) {
      const bendSign = effect.id % 2 === 0 ? 1 : -1;
      const bend = Math.min(42, Math.max(15, length * .09)) * bendSign;
      const cx = (from.x + to.x) * .5 + nx * bend;
      const cy = (from.y + to.y) * .5 + ny * bend;

      this.glow
        .moveTo(from.x, from.y)
        .quadraticCurveTo(cx, cy, to.x, to.y)
        .stroke({ color: palette.main, width: 12, alpha: alpha * .28 });

      this.core
        .moveTo(from.x, from.y)
        .quadraticCurveTo(cx, cy, to.x, to.y)
        .stroke({ color: palette.main, width: 4.8, alpha: alpha * .88 });

      this.accent
        .moveTo(from.x, from.y)
        .quadraticCurveTo(cx, cy, to.x, to.y)
        .stroke({ color: palette.core, width: 1.6, alpha: alpha * .9 });

      for (let i = 0; i < 6; i += 1) {
        const t = (progress * 1.45 + i / 6) % 1;
        const inv = 1 - t;
        const x = inv * inv * from.x + 2 * inv * t * cx + t * t * to.x;
        const y = inv * inv * from.y + 2 * inv * t * cy + t * t * to.y;
        const wobble = Math.sin(effect.id * 1.7 + i * 2.3 + progress * 9) * 6;
        this.core
          .circle(x + nx * wobble, y + ny * wobble, 1.8 + (i % 2) * .5)
          .fill({ color: palette.core, alpha: alpha * (.35 + (1 - t) * .38) });
      }
      return;
    }

    this.glow
      .moveTo(from.x, from.y)
      .lineTo(to.x, to.y)
      .stroke({ color: palette.main, width: 8, alpha: alpha * .24 });
    this.core
      .moveTo(from.x, from.y)
      .lineTo(to.x, to.y)
      .stroke({ color: palette.main, width: 2.7, alpha: alpha * .84 });
    this.accent
      .moveTo(from.x, from.y)
      .lineTo(to.x, to.y)
      .stroke({ color: palette.core, width: .9, alpha: alpha * .9 });
  }

  drawBurst(game, effect, progress, alpha) {
    const target = actorPoint(game, effect.targetId, effect.x, effect.y);
    const palette = paletteFor("", effect.style);
    const healing = ["heal", "priest", "druid", "paladin"].includes(effect.style);
    const outer = lerp(10, healing ? 42 : 32, progress);
    const inner = lerp(6, healing ? 27 : 20, progress);

    this.glow
      .circle(target.x, target.y, outer)
      .stroke({ color: palette.main, width: healing ? 7 : 5, alpha: alpha * .28 });
    this.core
      .circle(target.x, target.y, outer)
      .stroke({ color: palette.main, width: healing ? 3.2 : 2.5, alpha: alpha * .82 });
    this.accent
      .circle(target.x, target.y, inner)
      .stroke({ color: palette.core, width: 1.3, alpha: alpha * .72 });

    const rays = healing ? 8 : 6;
    for (let i = 0; i < rays; i += 1) {
      const angle = i / rays * TAU + progress * (healing ? .9 : 1.7);
      const radius = lerp(8, healing ? 32 : 26, progress);
      const x = target.x + Math.cos(angle) * radius;
      const y = target.y + Math.sin(angle) * radius;
      this.core
        .circle(x, y, healing ? 2.2 : 1.7)
        .fill({ color: i % 2 ? palette.accent : palette.core, alpha: alpha * .72 });
    }
  }

  drawRing(game, effect, progress, alpha) {
    const source = actorPoint(game, effect.sourceId, effect.x, effect.y);
    const palette = paletteFor("", effect.style);
    const radius = lerp(effect.radiusStart || 20, effect.radiusEnd || 80, progress);
    const healing = ["heal", "priest", "druid", "paladin"].includes(effect.style);

    this.glow
      .circle(source.x, source.y, radius)
      .stroke({ color: palette.main, width: healing ? 8 : 6, alpha: alpha * .22 });
    this.core
      .circle(source.x, source.y, radius)
      .stroke({ color: palette.main, width: healing ? 3.3 : 2.7, alpha: alpha * .82 });
    this.accent
      .circle(source.x, source.y, Math.max(4, radius - 6))
      .stroke({ color: palette.core, width: 1.1, alpha: alpha * .56 });
  }

  drawSlash(game, effect, progress, alpha) {
    const target = actorPoint(game, effect.targetId, effect.x, effect.y);
    const palette = paletteFor("", effect.style);
    const spread = lerp(8, 27, progress);

    this.glow
      .moveTo(target.x - spread, target.y - spread)
      .lineTo(target.x + spread, target.y + spread)
      .moveTo(target.x + spread, target.y - spread)
      .lineTo(target.x - spread, target.y + spread)
      .stroke({ color: palette.main, width: 9, alpha: alpha * .24 });

    this.core
      .moveTo(target.x - spread, target.y - spread)
      .lineTo(target.x + spread, target.y + spread)
      .moveTo(target.x + spread, target.y - spread)
      .lineTo(target.x - spread, target.y + spread)
      .stroke({ color: palette.core, width: 2.3, alpha: alpha * .9 });
  }

  drawChain(game, effect, progress, alpha) {
    const actors = (effect.actorIds || []).map(id => game.getActor(id)).filter(Boolean);
    if (actors.length < 2) return;
    const palette = paletteFor(effect.spellId || "", effect.style);

    for (let i = 0; i < actors.length - 1; i += 1) {
      this.drawJaggedSegment(
        actors[i],
        actors[i + 1],
        Number(effect.seed || 1) + i * 23,
        progress,
        palette,
        alpha,
      );
    }
  }

  drawJaggedSegment(from, to, seed, progress, palette, alpha) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const segments = Math.max(5, Math.min(9, Math.round(length / 36)));
    const points = [{ x: from.x, y: from.y }];

    for (let i = 1; i < segments; i += 1) {
      const t = i / segments;
      const envelope = Math.sin(Math.PI * t);
      const jitter = (hash01(seed + Math.floor(progress * 16), i) - .5) * 24 * envelope;
      points.push({
        x: lerp(from.x, to.x, t) + nx * jitter,
        y: lerp(from.y, to.y, t) + ny * jitter,
      });
    }
    points.push({ x: to.x, y: to.y });

    this.glow.moveTo(points[0].x, points[0].y);
    this.core.moveTo(points[0].x, points[0].y);
    this.accent.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i += 1) {
      this.glow.lineTo(points[i].x, points[i].y);
      this.core.lineTo(points[i].x, points[i].y);
      this.accent.lineTo(points[i].x, points[i].y);
    }

    this.glow.stroke({ color: palette.main, width: 10, alpha: alpha * .27 });
    this.core.stroke({ color: palette.main, width: 3.2, alpha: alpha * .92 });
    this.accent.stroke({ color: palette.core, width: 1.05, alpha: alpha });
  }

  drawSpell(game, effect, progress, alpha) {
    const id = baseSpellId(effect.spellId);
    const palette = paletteFor(id, effect.style);
    const from = actorPoint(game, effect.sourceId, effect.sourceX, effect.sourceY);
    const to = actorPoint(game, effect.targetId, effect.targetX, effect.targetY);
    const missedAlpha = effect.missed ? .7 : 1;
    const visibleAlpha = alpha * missedAlpha;

    if (isHealingSpell(id)) {
      this.drawHealingSpell(effect, from, to, progress, visibleAlpha, palette);
      return;
    }

    if (isDefensiveSpell(id)) {
      this.drawDefensiveSpell(effect, to, progress, visibleAlpha, palette);
      return;
    }

    if (isControlSpell(id)) {
      this.drawControlSpell(effect, from, to, progress, visibleAlpha, palette);
      return;
    }

    if (isMeleeSpell(id)) {
      this.drawMeleeSpell(effect, from, to, progress, visibleAlpha, palette);
      return;
    }

    if (isProjectileSpell(id)) {
      this.drawProjectileSpell(effect, from, to, progress, visibleAlpha, palette);
      return;
    }

    this.drawImpactSpell(effect, to, progress, visibleAlpha, palette);
  }

  drawHealingSpell(effect, from, to, progress, alpha, palette) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const bend = Math.min(34, Math.max(12, length * .08)) * (effect.id % 2 ? 1 : -1);
    const cx = (from.x + to.x) * .5 + nx * bend;
    const cy = (from.y + to.y) * .5 + ny * bend;
    const reveal = clamp01(progress * 1.45);

    const pointAt = t => {
      const inv = 1 - t;
      return {
        x: inv * inv * from.x + 2 * inv * t * cx + t * t * to.x,
        y: inv * inv * from.y + 2 * inv * t * cy + t * t * to.y,
      };
    };

    let previous = pointAt(0);
    const segments = 12;
    for (let i = 1; i <= segments; i += 1) {
      const t = i / segments;
      if (t > reveal) break;
      const p = pointAt(t);

      this.glow
        .moveTo(previous.x, previous.y)
        .lineTo(p.x, p.y)
        .stroke({ color: palette.main, width: 9, alpha: alpha * .18 });
      this.core
        .moveTo(previous.x, previous.y)
        .lineTo(p.x, p.y)
        .stroke({ color: palette.main, width: 3.4, alpha: alpha * .75 });
      this.accent
        .moveTo(previous.x, previous.y)
        .lineTo(p.x, p.y)
        .stroke({ color: palette.core, width: 1.1, alpha: alpha * .88 });

      previous = p;
    }

    const impact = clamp01((progress - .42) / .58);
    const radius = 10 + impact * 30;
    const impactAlpha = alpha * (.42 + impact * .45);

    this.glow
      .circle(to.x, to.y, radius)
      .stroke({ color: palette.main, width: 7, alpha: impactAlpha * .22 });
    this.core
      .circle(to.x, to.y, radius)
      .stroke({ color: palette.main, width: 2.8, alpha: impactAlpha });
    this.accent
      .circle(to.x, to.y, Math.max(5, radius - 7))
      .stroke({ color: palette.core, width: 1.1, alpha: impactAlpha * .72 });

    for (let i = 0; i < 7; i += 1) {
      const a = i / 7 * TAU + progress * 1.7;
      const rr = 12 + impact * 22;
      const lift = impact * (8 + (i % 3) * 3);
      this.core
        .circle(
          to.x + Math.cos(a) * rr,
          to.y + Math.sin(a) * rr - lift,
          1.7 + (i % 2) * .45,
        )
        .fill({ color: i % 2 ? palette.core : palette.main, alpha: impactAlpha * .72 });
    }
  }

  drawDefensiveSpell(effect, to, progress, alpha, palette) {
    const pulse = pulse01(progress * Math.PI * 4 + effect.id);
    const radius = 25 + progress * 10;

    this.glow
      .circle(to.x, to.y, radius)
      .stroke({ color: palette.main, width: 11, alpha: alpha * .22 });
    this.core
      .circle(to.x, to.y, radius)
      .stroke({ color: palette.main, width: 3.5, alpha: alpha * .82 });
    this.accent
      .circle(to.x, to.y, Math.max(8, radius - 7))
      .stroke({ color: palette.core, width: 1.4, alpha: alpha * (.55 + pulse * .3) });

    for (let i = 0; i < 6; i += 1) {
      const angle = i / 6 * TAU - progress * .8;
      const rr = radius + 4;
      this.core
        .circle(to.x + Math.cos(angle) * rr, to.y + Math.sin(angle) * rr, 1.7)
        .fill({ color: palette.core, alpha: alpha * .58 });
    }
  }

  drawControlSpell(effect, from, to, progress, alpha, palette) {
    const id = baseSpellId(effect.spellId);
    const center = id === "mage-frost-nova" || id === "priest-psychic-scream" ? from : to;
    const areaLike = id === "mage-frost-nova" || id === "priest-psychic-scream";
    const maxRadius = areaLike ? 76 : 42;
    const radius = 12 + progress * maxRadius;

    this.glow
      .circle(center.x, center.y, radius)
      .stroke({ color: palette.main, width: 9, alpha: alpha * .22 });
    this.core
      .circle(center.x, center.y, radius)
      .stroke({ color: palette.main, width: 3.1, alpha: alpha * .88 });
    this.accent
      .circle(center.x, center.y, Math.max(5, radius - 7))
      .stroke({ color: palette.core, width: 1.05, alpha: alpha * .7 });

    const spokes = areaLike ? 10 : 7;
    for (let i = 0; i < spokes; i += 1) {
      const angle = i / spokes * TAU + progress * .7;
      const r1 = Math.max(8, radius - 10);
      const r2 = radius + 4;
      this.core
        .moveTo(center.x + Math.cos(angle) * r1, center.y + Math.sin(angle) * r1)
        .lineTo(center.x + Math.cos(angle) * r2, center.y + Math.sin(angle) * r2)
        .stroke({ color: palette.core, width: 1.25, alpha: alpha * .62 });
    }
  }

  drawMeleeSpell(effect, from, to, progress, alpha, palette) {
    const id = baseSpellId(effect.spellId);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const perpendicular = angle + Math.PI * .5;
    const sweep = 20 + progress * 18;
    const offset = id.includes("shadowstep") ? 0 : 7;

    if (id.includes("charge")) {
      const travel = clamp01(progress * 1.4);
      const x = lerp(from.x, to.x, travel);
      const y = lerp(from.y, to.y, travel);
      const trail = 34;

      this.glow
        .moveTo(x - Math.cos(angle) * trail, y - Math.sin(angle) * trail)
        .lineTo(x, y)
        .stroke({ color: palette.main, width: 12, alpha: alpha * .24 });
      this.core
        .moveTo(x - Math.cos(angle) * trail, y - Math.sin(angle) * trail)
        .lineTo(x, y)
        .stroke({ color: palette.core, width: 2.6, alpha: alpha * .86 });
    }

    if (id.includes("shadowstep")) {
      const vanish = Math.sin(Math.min(1, progress * 2) * Math.PI);
      for (let i = 0; i < 8; i += 1) {
        const a = i / 8 * TAU + progress * 2.4;
        const rr = 8 + progress * 24;
        this.core
          .circle(from.x + Math.cos(a) * rr, from.y + Math.sin(a) * rr, 1.6)
          .fill({ color: palette.main, alpha: alpha * vanish * .55 });
        this.core
          .circle(to.x + Math.cos(-a) * rr * .7, to.y + Math.sin(-a) * rr * .7, 1.5)
          .fill({ color: palette.core, alpha: alpha * .58 });
      }
    }

    for (let i = -1; i <= 1; i += 1) {
      const local = perpendicular + i * .16;
      const startX = to.x - Math.cos(local) * sweep * .82 + Math.cos(angle) * (i * 2 + offset);
      const startY = to.y - Math.sin(local) * sweep * .82 + Math.sin(angle) * (i * 2 + offset);
      const endX = to.x + Math.cos(local) * sweep * .82 + Math.cos(angle) * (i * 2 + offset);
      const endY = to.y + Math.sin(local) * sweep * .82 + Math.sin(angle) * (i * 2 + offset);

      this.glow
        .moveTo(startX, startY)
        .lineTo(endX, endY)
        .stroke({ color: palette.main, width: 7, alpha: alpha * .18 });
      this.core
        .moveTo(startX, startY)
        .lineTo(endX, endY)
        .stroke({
          color: i === 0 ? palette.core : palette.main,
          width: i === 0 ? 2.6 : 1.8,
          alpha: alpha * (.7 + (i === 0 ? .2 : 0)),
        });
    }

    const ring = 10 + progress * 24;
    this.accent
      .circle(to.x, to.y, ring)
      .stroke({ color: palette.accent, width: 1.2, alpha: alpha * .58 });
  }

  drawProjectileSpell(effect, from, to, progress, alpha, palette) {
    const id = baseSpellId(effect.spellId);
    let travel = clamp01(progress * 1.34);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / length;
    const ny = dx / length;
    const curve = Math.sin(travel * Math.PI) * Math.min(18, length * .04) * (effect.id % 2 ? 1 : -1);

    let x = lerp(from.x, to.x, travel) + nx * curve;
    let y = lerp(from.y, to.y, travel) + ny * curve;

    if (effect.missed && progress > .70) {
      const missT = clamp01((progress - .70) / .30);
      x += nx * missT * 44;
      y += ny * missT * 44 - missT * 8;
    }

    const isFire = id.includes("pyro") || id.includes("lava") || id.includes("flame") || id.includes("holy-fire");
    const isChaos = id.includes("chaos");
    const isFrost = id.includes("frost");
    const orb = isChaos ? 8.5 : isFire ? 7.2 : isFrost ? 6.5 : 6.2;

    for (let i = 1; i <= 6; i += 1) {
      const t = Math.max(0, travel - i * .035);
      const bend = Math.sin(t * Math.PI) * Math.min(18, length * .04) * (effect.id % 2 ? 1 : -1);
      const tx = lerp(from.x, to.x, t) + nx * bend;
      const ty = lerp(from.y, to.y, t) + ny * bend;
      const size = Math.max(.8, orb * (1 - i / 7) * .48);

      this.glow
        .circle(tx, ty, size * 2.3)
        .fill({ color: palette.main, alpha: alpha * (.18 - i * .018) });
      this.core
        .circle(tx, ty, size)
        .fill({ color: i % 2 ? palette.accent : palette.main, alpha: alpha * (.58 - i * .055) });
    }

    this.glow
      .circle(x, y, orb * 2.35)
      .fill({ color: palette.main, alpha: alpha * .38 });
    this.core
      .circle(x, y, orb)
      .fill({ color: palette.main, alpha: alpha * .96 });
    this.accent
      .circle(x - dx / length * 1.3, y - dy / length * 1.3, Math.max(1.8, orb * .42))
      .fill({ color: palette.core, alpha: alpha });

    const impact = clamp01((progress - .70) / .30);
    if (impact > 0 && !effect.missed) {
      const radius = 9 + impact * (isChaos ? 36 : 29);
      this.glow
        .circle(to.x, to.y, radius)
        .stroke({ color: palette.main, width: 9, alpha: alpha * impact * .25 });
      this.core
        .circle(to.x, to.y, radius)
        .stroke({ color: palette.main, width: 2.8, alpha: alpha * impact * .85 });
      this.accent
        .circle(to.x, to.y, Math.max(5, radius - 7))
        .stroke({ color: palette.core, width: 1.05, alpha: alpha * impact * .72 });

      for (let i = 0; i < 7; i += 1) {
        const a = i / 7 * TAU + effect.id * .31;
        const rr = 11 + impact * 24;
        this.core
          .circle(to.x + Math.cos(a) * rr, to.y + Math.sin(a) * rr, 1.5 + (i % 2) * .4)
          .fill({ color: i % 2 ? palette.accent : palette.core, alpha: alpha * impact * .72 });
      }
    }
  }

  drawImpactSpell(effect, to, progress, alpha, palette) {
    const radius = 9 + progress * 30;
    this.glow
      .circle(to.x, to.y, radius)
      .stroke({ color: palette.main, width: 8, alpha: alpha * .24 });
    this.core
      .circle(to.x, to.y, radius)
      .stroke({ color: palette.main, width: 2.7, alpha: alpha * .82 });
    this.accent
      .circle(to.x, to.y, Math.max(4, radius - 7))
      .stroke({ color: palette.core, width: 1.1, alpha: alpha * .68 });
  }
}
