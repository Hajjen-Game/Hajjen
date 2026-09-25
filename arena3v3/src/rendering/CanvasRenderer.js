import { GAME_HEIGHT, GAME_WIDTH } from "../core/constants.js";
import { clamp, lerp } from "../core/utils.js";
import { classColorFor } from "../content/classes/classColors.js";
import { drawClassGlyph } from "./ClassGlyphs.js";

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}

export class CanvasRenderer {
  constructor(canvas, arena) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.arena = arena;
    this.theme = this.readTheme();
  }

  readTheme() {
    return {
      floor: cssVar("--arena-floor"),
      floor2: cssVar("--arena-floor-2"),
      arenaLine: cssVar("--arena-line"),
      pillar: cssVar("--pillar"),
      pillarEdge: cssVar("--pillar-edge"),
      friendly: cssVar("--friendly"),
      friendlyBright: cssVar("--friendly-bright"),
      enemy: cssVar("--enemy"),
      enemyBright: cssVar("--enemy-bright"),
      enemyName: cssVar("--enemy-name"),
      health: cssVar("--health"),
      low: cssVar("--health-low"),
      cream: cssVar("--cream"),
      creamDim: cssVar("--cream-dim"),
      gold: cssVar("--gold"),
      goldBright: cssVar("--gold-bright"),
      cast: cssVar("--cast"),
      hot: cssVar("--hot"),
      dot: cssVar("--dot"),
      mana: cssVar("--mana"),
      energy: cssVar("--energy"),
      rage: cssVar("--rage"),
      runic: cssVar("--runic"),
      priest: cssVar("--vfx-priest"),
      druid: cssVar("--vfx-druid"),
      paladin: cssVar("--vfx-paladin"),
      warrior: cssVar("--vfx-warrior"),
      rogue: cssVar("--vfx-rogue"),
      deathKnight: cssVar("--vfx-death-knight"),
      mage: cssVar("--vfx-mage"),
      warlock: cssVar("--vfx-warlock"),
      shaman: cssVar("--vfx-shaman"),
      lightning: cssVar("--vfx-lightning"),
      lightningCore: cssVar("--vfx-lightning-core"),
      healVfx: cssVar("--vfx-heal"),
      damageVfx: cssVar("--vfx-damage"),
      fearVfx: cssVar("--vfx-fear"),
      interruptVfx: cssVar("--vfx-interrupt"),
      ccFear: cssVar("--cc-fear"),
      ccIncap: cssVar("--cc-incap"),
      ccStun: cssVar("--cc-stun"),
      ccRoot: cssVar("--cc-root"),
      burst: cssVar("--vfx-burst"),
    };
  }

  render(game) {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.drawArena(ctx);
    this.drawEffectRings(ctx, game);

    const livingActors = game.actors.filter(actor => actor.alive);
    const otherActors = livingActors.filter(actor => actor.id !== game.player?.id);
    const playerActor = livingActors.find(actor => actor.id === game.player?.id);

    // Always render the player after every other actor so their body, glyph
    // and world UI stay readable when several units overlap.
    for (const actor of otherActors) {
      this.drawActor(ctx, actor, game);
    }
    if (playerActor) this.drawActor(ctx, playerActor, game);

    this.drawOverlapReadability(ctx, game, livingActors);
    this.drawVfx(ctx, game);
    this.drawFloatingTexts(ctx, game.floatingTexts);
  }

  drawArena(ctx) {
    const gradient = ctx.createRadialGradient(640, 360, 80, 640, 360, 680);
    gradient.addColorStop(0, this.theme.floor2);
    gradient.addColorStop(1, this.theme.floor);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    ctx.strokeStyle = this.theme.arenaLine;
    ctx.lineWidth = 3;
    ctx.strokeRect(
      this.arena.bounds.x,
      this.arena.bounds.y,
      this.arena.bounds.w,
      this.arena.bounds.h,
    );

    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.strokeStyle = this.theme.gold;
    ctx.lineWidth = 1;

    for (let x = 120; x < GAME_WIDTH; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, this.arena.bounds.y);
      ctx.lineTo(x, this.arena.bounds.y + this.arena.bounds.h);
      ctx.stroke();
    }

    for (let y = 90; y < GAME_HEIGHT; y += 80) {
      ctx.beginPath();
      ctx.moveTo(this.arena.bounds.x, y);
      ctx.lineTo(this.arena.bounds.x + this.arena.bounds.w, y);
      ctx.stroke();
    }

    ctx.restore();

    for (const obstacle of this.arena.obstacles) {
      this.drawPillar(ctx, obstacle);
    }
  }

  drawPillar(ctx, rect) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.45)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;

    roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 16);
    ctx.fillStyle = this.theme.pillar;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = this.theme.pillarEdge;
    ctx.lineWidth = 5;
    ctx.stroke();

    roundedRect(ctx, rect.x + 12, rect.y + 12, rect.w - 24, rect.h - 24, 10);
    ctx.strokeStyle = "rgba(230,189,127,.16)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }

  drawEffectRings(ctx, game) {
    for (const actor of game.actors.filter(actor => actor.alive)) {
      const hasHot = actor.effects.some(effect => effect.kind === "hot");
      const hasDot = actor.effects.some(effect => effect.kind === "dot");
      const hasLock = actor.effects.some(effect => effect.kind === "schoolLock");

      if (!hasHot && !hasDot && !hasLock) continue;

      ctx.save();
      ctx.globalAlpha = 0.62;
      ctx.lineWidth = 3;

      if (hasHot) {
        ctx.strokeStyle = this.theme.hot;
        ctx.beginPath();
        ctx.arc(actor.x, actor.y, actor.radius + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (hasDot) {
        ctx.strokeStyle = this.theme.dot;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(actor.x, actor.y, actor.radius + 13, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (hasLock) {
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = this.theme.interruptVfx;
        ctx.beginPath();
        ctx.arc(actor.x, actor.y, actor.radius + 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  drawActor(ctx, actor, game) {
    const selected = game.player.targetId === actor.id;
    const teamColor = actor.team === "friendly" ? this.theme.friendly : this.theme.enemy;
    const teamBright = actor.team === "friendly" ? this.theme.friendlyBright : this.theme.enemyBright;

    ctx.save();

    if (actor.cast) {
      const progress = 1 - actor.cast.remainingMs / actor.cast.totalMs;
      ctx.globalAlpha = 0.35 + progress * 0.35;
      ctx.strokeStyle = this.vfxColor(actor.visualStyle);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(actor.x, actor.y, actor.radius + 14 + progress * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (actor.id === game.player?.id) {
      this.drawPlayerHighlight(ctx, actor, game);
    }

    ctx.shadowColor = "rgba(0,0,0,.42)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    ctx.beginPath();
    ctx.arc(actor.x, actor.y, actor.radius, 0, Math.PI * 2);
    ctx.fillStyle = teamColor;
    ctx.fill();

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = teamBright;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (!drawClassGlyph(ctx, actor)) this.drawRoleGlyph(ctx, actor);
    this.drawWorldHealth(ctx, actor, game);
    this.drawWorldResource(ctx, actor, game);
    this.drawName(ctx, actor, game);
    this.drawEffectIcons(ctx, actor, game);
    this.drawCombatState(ctx, actor, game);

    if (actor.cast) this.drawWorldCast(ctx, actor, game);
    if (selected && actor.team === "enemy") {
      this.drawTargetMarker(ctx, actor, game);
    }

    ctx.restore();
  }

  drawPlayerHighlight(ctx, actor, game) {
    const pulse = 0.5 + 0.5 * Math.sin(game.elapsedSeconds * 5.5);
    const outerRadius = actor.radius + 17 + pulse * 2;
    const innerRadius = actor.radius + 8;

    ctx.save();
    ctx.shadowColor = this.theme.friendlyBright;
    ctx.shadowBlur = 14 + pulse * 7;

    ctx.globalAlpha = 0.38 + pulse * 0.12;
    ctx.fillStyle = this.theme.friendlyBright;
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, actor.radius + 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = this.theme.cream;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, innerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.72 + pulse * 0.2;
    ctx.strokeStyle = this.theme.friendlyBright;
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 5]);
    ctx.lineDashOffset = -game.elapsedSeconds * 24;
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, outerRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  drawTargetMarker(ctx, actor, game) {
    const ccKinds = new Set(["stun", "fear", "incapacitate", "root"]);
    const hasCrowdControl = actor.effects.some(effect =>
      effect.remainingMs > 0 && ccKinds.has(effect.kind)
    );

    // Normal world UI ends around the name at radius + 31.
    // CC badges occupy roughly radius + 51 through radius + 88.
    // Shift the target sigil above that entire block while CC is active.
    const markerY = Math.max(
      18,
      actor.y - actor.radius - (hasCrowdControl ? 118 : 72),
    );
    const markerX = this.worldUiX(actor, game);
    const pulse = 0.5 + 0.5 * Math.sin(game.elapsedSeconds * 7);
    const size = 12.5 + pulse * 1.8;
    const markerColor = "#ff2b2b";
    const markerGlow = "#ff0000";

    ctx.save();

    ctx.translate(markerX, markerY);

    // Dark backing separates the red mark from orange burst VFX,
    // class colors and bright cast/nameplate elements.
    ctx.shadowColor = "transparent";
    ctx.globalAlpha = 0.76;
    ctx.fillStyle = "rgba(30, 0, 0, .82)";
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.18, 0, Math.PI * 2);
    ctx.fill();

    // Strong outer red aura remains visible even in crowded melee stacks.
    ctx.globalAlpha = 0.62 + pulse * 0.18;
    ctx.strokeStyle = markerGlow;
    ctx.shadowColor = markerGlow;
    ctx.shadowBlur = 18 + pulse * 10;
    ctx.lineWidth = 3.2 + pulse * 0.5;
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.12, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowColor = markerGlow;
    ctx.shadowBlur = 15 + pulse * 9;
    ctx.strokeStyle = markerColor;
    ctx.fillStyle = markerColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.96;

    // Hunter's-Mark-inspired floating angular sigil:
    // central diamond with four outward tracking prongs.
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.55);
    ctx.lineTo(size * 0.45, 0);
    ctx.lineTo(0, size * 0.55);
    ctx.lineTo(-size * 0.45, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-size * 0.95, -size * 0.75);
    ctx.lineTo(-size * 0.55, -size * 0.75);
    ctx.lineTo(-size * 0.55, -size * 0.35);

    ctx.moveTo(size * 0.95, -size * 0.75);
    ctx.lineTo(size * 0.55, -size * 0.75);
    ctx.lineTo(size * 0.55, -size * 0.35);

    ctx.moveTo(-size * 0.95, size * 0.75);
    ctx.lineTo(-size * 0.55, size * 0.75);
    ctx.lineTo(-size * 0.55, size * 0.35);

    ctx.moveTo(size * 0.95, size * 0.75);
    ctx.lineTo(size * 0.55, size * 0.75);
    ctx.lineTo(size * 0.55, size * 0.35);
    ctx.stroke();

    ctx.globalAlpha = 0.42 + pulse * 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawRoleGlyph(ctx, actor) {
    ctx.save();
    ctx.translate(actor.x, actor.y);

    ctx.strokeStyle = "#f3dfbd";
    ctx.fillStyle = "#f3dfbd";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (actor.role === "healer") {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
    } else if (actor.role === "melee") {
      ctx.rotate(-Math.PI / 4);

      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(0, 6);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-4, 3);
      ctx.lineTo(4, 3);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-2.6, -6);
      ctx.lineTo(2.6, -6);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(0, 8, 1.7, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 2.2;

      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(2.2, -2.2);
      ctx.lineTo(9, 0);
      ctx.lineTo(2.2, 2.2);
      ctx.lineTo(0, 9);
      ctx.lineTo(-2.2, 2.2);
      ctx.lineTo(-9, 0);
      ctx.lineTo(-2.2, -2.2);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.arc(0, 0, 6, -0.7, 1.75);
      ctx.stroke();
    }

    ctx.restore();
  }

  overlappingActors(actor, game) {
    const living = game.actors.filter(candidate => candidate.alive);
    const nearby = living.filter(candidate => {
      if (candidate.id === actor.id) return false;

      const dx = candidate.x - actor.x;
      const dy = candidate.y - actor.y;
      const distanceSq = dx * dx + dy * dy;
      const visualRadius = actor.radius + candidate.radius + 18;

      // Include units whose bodies or immediate nameplate area collide.
      return distanceSq < visualRadius * visualRadius
        || (Math.abs(dx) < 58 && Math.abs(dy) < 44);
    });

    return nearby;
  }

  worldUiX(actor, game) {
    const nearby = this.overlappingActors(actor, game);
    if (nearby.length === 0) return actor.x;

    const group = [actor, ...nearby]
      .filter((candidate, index, list) =>
        list.findIndex(item => item.id === candidate.id) === index
      )
      .sort((a, b) => {
        if (a.id === game.player?.id) return 1;
        if (b.id === game.player?.id) return -1;
        return String(a.id).localeCompare(String(b.id));
      });

    const index = group.findIndex(candidate => candidate.id === actor.id);
    const spacing = group.length >= 4 ? 34 : 42;
    const centeredIndex = index - (group.length - 1) / 2;
    return actor.x + centeredIndex * spacing;
  }

  drawOverlapReadability(ctx, game, livingActors) {
    const crowded = livingActors.filter(actor =>
      this.overlappingActors(actor, game).length > 0
    );
    if (crowded.length === 0) return;

    const stable = [...crowded].sort((a, b) =>
      String(a.id).localeCompare(String(b.id))
    );

    ctx.save();
    ctx.lineCap = "round";

    for (const actor of stable) {
      const localGroup = [actor, ...this.overlappingActors(actor, game)]
        .filter((candidate, index, list) =>
          list.findIndex(item => item.id === candidate.id) === index
        )
        .sort((a, b) => String(a.id).localeCompare(String(b.id)));

      const layer = Math.max(
        0,
        localGroup.findIndex(candidate => candidate.id === actor.id),
      );
      const radius = actor.radius + 6 + layer * 4;
      const color = classColorFor(actor);

      ctx.globalAlpha = actor.team === "friendly" ? 0.9 : 0.72;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = actor.team === "friendly" ? 8 : 5;
      ctx.lineWidth = actor.team === "friendly" ? 2.8 : 2.2;
      ctx.setLineDash(actor.team === "friendly" ? [] : [5, 4]);

      ctx.beginPath();
      ctx.arc(actor.x, actor.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      // A small top tick makes concentric rings readable even at identical centers.
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(actor.x, actor.y - radius - 2);
      ctx.lineTo(actor.x, actor.y - radius - 8);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawWorldHealth(ctx, actor, game) {
    const width = 80;
    const height = 9;
    const centerX = this.worldUiX(actor, game);
    const x = centerX - width / 2;
    const y = actor.y - actor.radius - 24;
    const lowHealth = actor.healthPct < 0.20;
    const pulse = lowHealth
      ? 0.5 + 0.5 * Math.sin(game.elapsedSeconds * 11)
      : 0;

    ctx.fillStyle = "rgba(11,8,6,.92)";
    ctx.fillRect(x, y, width, height);

    ctx.save();
    ctx.fillStyle = lowHealth
      ? `rgba(229, 67, 58, ${0.72 + pulse * 0.28})`
      : classColorFor(actor);

    if (lowHealth) {
      ctx.shadowColor = "#ff5148";
      ctx.shadowBlur = 3 + pulse * 8;
    }

    ctx.fillRect(
      x + 1,
      y + 1,
      (width - 2) * clamp(actor.healthPct, 0, 1),
      height - 2,
    );
    ctx.restore();

    ctx.strokeStyle = lowHealth
      ? `rgba(255, 92, 82, ${0.55 + pulse * 0.4})`
      : "rgba(220,180,120,.42)";
    ctx.lineWidth = lowHealth ? 1.5 : 1;
    ctx.strokeRect(x, y, width, height);
  }

  drawWorldResource(ctx, actor, game) {
    const width = 74;
    const height = 5;
    const centerX = this.worldUiX(actor, game);
    const x = centerX - width / 2;
    const y = actor.y - actor.radius - 13;

    ctx.fillStyle = "rgba(11,8,6,.92)";
    ctx.fillRect(x, y, width, height);

    const resourceColors = {
      mana: this.theme.mana,
      energy: this.theme.energy,
      rage: this.theme.rage,
      runic: this.theme.runic,
    };
    ctx.fillStyle = resourceColors[actor.resource.type] || this.theme.mana;
    ctx.fillRect(
      x + 1,
      y + 1,
      (width - 2) * clamp(actor.resourcePct, 0, 1),
      height - 2,
    );
  }

  castBarPalette(actor) {
    const spell = actor.cast ? actor.getSpell(actor.cast.spellId) : null;
    const spellId = spell?.id || "";
    const school = spell?.school || "";
    const style = spell?.visualStyle || actor.visualStyle || "";

    // Spell-specific identity overrides where one school alone is too broad.
    if (spellId === "mage-frostfire-bolt") {
      return {
        start: "#78d8ff",
        end: "#ff7048",
        glow: "#b898ff",
        border: "#e6f6ff",
      };
    }

    if (spellId === "shaman-chain-lightning") {
      return {
        start: "#76e4ff",
        end: "#7da8ff",
        glow: "#82dfff",
        border: "#d9f8ff",
      };
    }

    if (spellId === "shaman-flame-shock" || spellId === "shaman-lava-burst") {
      return {
        start: "#ffb24a",
        end: "#e94f37",
        glow: "#ff7848",
        border: "#ffd6a0",
      };
    }

    // Class identities that should remain recognizable regardless of school.
    if (style === "death-knight" || spellId.startsWith("dk-")) {
      return {
        start: "#7b1720",
        end: "#e84f58",
        glow: "#ff5963",
        border: "#ffb0b5",
      };
    }

    if (style === "warrior") {
      return {
        start: "#707983",
        end: "#c2c8cf",
        glow: "#b7c0c9",
        border: "#e3e7eb",
      };
    }

    if (style === "druid") {
      return {
        start: "#4d9f62",
        end: "#8bd07a",
        glow: "#75d58b",
        border: "#c8f0c8",
      };
    }

    if (style === "paladin") {
      return {
        start: "#d9a93d",
        end: "#ffe083",
        glow: "#f6cf63",
        border: "#fff0b5",
      };
    }

    if (style === "priest" && school === "holy") {
      return {
        start: "#dfbd58",
        end: "#fff1a6",
        glow: "#ffe48a",
        border: "#fff8cf",
      };
    }

    if (style === "shaman" && spell?.target === "ally") {
      return {
        start: "#42a978",
        end: "#82d6a1",
        glow: "#69cf9a",
        border: "#ccf4de",
      };
    }

    // School defaults handle Mage, Warlock, Priest Shadow and future spells.
    if (school === "frost") {
      return {
        start: "#4aa7e8",
        end: "#a7e7ff",
        glow: "#7fd8ff",
        border: "#dbf6ff",
      };
    }

    if (school === "fire") {
      return {
        start: "#e84b32",
        end: "#ffb23f",
        glow: "#ff7045",
        border: "#ffd5a1",
      };
    }

    if (school === "arcane") {
      return {
        start: "#6955d6",
        end: "#b49cff",
        glow: "#9c82ff",
        border: "#ded3ff",
      };
    }

    if (school === "shadow" || school === "shadowfrost") {
      return {
        start: "#56317f",
        end: "#a86cdb",
        glow: "#9360cf",
        border: "#d9b7f0",
      };
    }

    if (school === "holy") {
      return {
        start: "#d8b64f",
        end: "#ffe895",
        glow: "#f5d66e",
        border: "#fff3bd",
      };
    }

    if (school === "nature") {
      return {
        start: "#3f9f83",
        end: "#71c9a9",
        glow: "#65c7aa",
        border: "#c5eee2",
      };
    }

    if (school === "physical") {
      return {
        start: "#707983",
        end: "#c2c8cf",
        glow: "#b7c0c9",
        border: "#e3e7eb",
      };
    }

    return {
      start: this.theme.cast,
      end: this.theme.cream,
      glow: this.theme.cast,
      border: "rgba(245,224,190,.6)",
    };
  }

  drawWorldCast(ctx, actor, game) {
    const width = 86;
    const height = 8;
    const centerX = this.worldUiX(actor, game);
    const x = centerX - width / 2;
    const y = actor.y - actor.radius - 49;
    const progress = 1 - actor.cast.remainingMs / actor.cast.totalMs;
    const palette = this.castBarPalette(actor);
    const fillWidth = (width - 2) * clamp(progress, 0, 1);

    ctx.save();
    ctx.fillStyle = "rgba(11,8,6,.95)";
    ctx.fillRect(x, y, width, height);

    if (fillWidth > 0) {
      const gradient = ctx.createLinearGradient(x + 1, y, x + width - 1, y);
      gradient.addColorStop(0, palette.start);
      gradient.addColorStop(1, palette.end);

      ctx.fillStyle = gradient;
      ctx.shadowColor = palette.glow;
      ctx.shadowBlur = 6;
      ctx.fillRect(
        x + 1,
        y + 1,
        fillWidth,
        height - 2,
      );
    }

    ctx.shadowColor = "transparent";
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
  }

  drawName(ctx, actor, game) {
    const centerX = this.worldUiX(actor, game);
    ctx.font = "800 12px system-ui";
    ctx.textAlign = "center";
    ctx.fillStyle = actor.team === "enemy"
      ? this.theme.enemyName
      : this.theme.cream;
    ctx.fillText(actor.name, centerX, actor.y - actor.radius - 31);
  }

  drawEffectIcons(ctx, actor, game) {
    const effects = actor.effects
      .filter(effect => effect.remainingMs > 0)
      .filter(effect =>
        ["hot", "dot", "damageReduction", "healingReduction", "offensiveCooldown", "schoolLock"].includes(effect.kind),
      )
      .slice(0, 5);

    if (effects.length === 0) return;

    const size = 18;
    const gap = 3;
    const totalWidth = effects.length * size + (effects.length - 1) * gap;
    const centerX = this.worldUiX(actor, game);
    let x = centerX - totalWidth / 2;
    const y = actor.y + actor.radius + 8;

    for (const effect of effects) {
      let fill = this.theme.cast;
      let label = "B";

      if (effect.kind === "hot") {
        fill = this.theme.hot;
        label = "H";
      } else if (effect.kind === "dot") {
        fill = this.theme.dot;
        label = "D";
      } else if (effect.kind === "fear") {
        fill = this.theme.goldBright;
        label = "F";
      } else if (effect.kind === "incapacitate") {
        fill = this.theme.goldBright;
        label = "C";
      } else if (effect.kind === "stun") {
        fill = this.theme.goldBright;
        label = "S";
      } else if (effect.kind === "root") {
        fill = this.theme.mage;
        label = "R";
      } else if (effect.kind === "healingReduction") {
        fill = this.theme.enemyBright;
        label = "M";
      } else if (effect.kind === "offensiveCooldown") {
        fill = this.theme.burst;
        label = "!";
      } else if (effect.kind === "schoolLock") {
        fill = this.theme.interruptVfx;
        label = "X";
      }

      ctx.fillStyle = "rgba(12,8,6,.92)";
      roundedRect(ctx, x, y, size, size, 5);
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = fill;
      roundedRect(ctx, x + 2, y + 2, size - 4, size - 4, 4);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = "#160d09";
      ctx.font = "900 9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + size / 2, y + size / 2);

      const seconds = Math.max(0, effect.remainingMs / 1000);
      ctx.fillStyle = this.theme.cream;
      ctx.font = "900 8px system-ui";
      ctx.textAlign = "right";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(seconds < 10 ? seconds.toFixed(1) : Math.ceil(seconds), x + size, y + size + 8);

      x += size + gap;
    }
  }

  drawCombatState(ctx, actor, game) {
    const ccKinds = ["stun", "fear", "incapacitate", "root"];
    const cc = actor.effects
      .filter(effect => effect.remainingMs > 0 && ccKinds.includes(effect.kind))
      .sort((a, b) => {
        const priority = { stun: 0, fear: 1, incapacitate: 2, root: 3 };
        return priority[a.kind] - priority[b.kind];
      })[0];

    const burst = actor.effects.find(effect =>
      effect.kind === "offensiveCooldown" && effect.remainingMs > 0
    );

    if (!cc && !burst) return;

    const pulse = 0.5 + 0.5 * Math.sin(game.elapsedSeconds * 8);

    if (burst) {
      const radius = actor.radius + 28 + pulse * 4;
      const spokes = 10;
      const rotation = game.elapsedSeconds * 2.8;

      ctx.save();
      ctx.globalAlpha = 0.52 + pulse * 0.22;
      ctx.strokeStyle = this.vfxColor(burst.visualStyle || actor.visualStyle);
      ctx.lineWidth = 3;
      ctx.shadowColor = this.theme.burst;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(actor.x, actor.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < spokes; i += 1) {
        const angle = rotation + (i / spokes) * Math.PI * 2;
        const inner = radius + 3;
        const outer = radius + 10 + (i % 2) * 4;
        ctx.beginPath();
        ctx.moveTo(actor.x + Math.cos(angle) * inner, actor.y + Math.sin(angle) * inner);
        ctx.lineTo(actor.x + Math.cos(angle) * outer, actor.y + Math.sin(angle) * outer);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (!cc) return;

    const colors = {
      fear: this.theme.ccFear,
      incapacitate: this.theme.ccIncap,
      stun: this.theme.ccStun,
      root: this.theme.ccRoot,
    };
    const color = colors[cc.kind] || this.theme.goldBright;
    const ringRadius = actor.radius + 12 + pulse * 2;

    ctx.save();
    ctx.globalAlpha = 0.76;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 + pulse;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.10 + pulse * 0.04;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(actor.x, actor.y, actor.radius + 3, 0, Math.PI * 2);
    ctx.fill();

    const seconds = Math.max(0, cc.remainingMs / 1000).toFixed(1);
    const badgeW = 30;
    const badgeH = 37;
    const badgeCenterX = this.worldUiX(actor, game);
    const badgeX = badgeCenterX - badgeW / 2;
    const badgeY = actor.y - actor.radius - 92;

    ctx.shadowBlur = 7;
    ctx.globalAlpha = 0.96;
    roundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 7);
    ctx.fillStyle = "rgba(14, 9, 7, .94)";
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // drawActor leaves a 4px shadow offset behind for the actor body.
    // With blur set to 0 that became a crisp duplicate of the CC icon/timer.
    // Fully disable the inherited shadow before drawing badge contents.
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    this.drawCcIcon(ctx, cc.kind, badgeCenterX, badgeY + 11, 12, color);

    ctx.fillStyle = this.theme.cream;
    ctx.font = "900 10px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(seconds, badgeCenterX, badgeY + 27);
    ctx.restore();
  }

  drawCcIcon(ctx, kind, x, y, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (kind === "stun") {
      const points = 8;
      ctx.beginPath();
      for (let i = 0; i < points * 2; i += 1) {
        const angle = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
        const radius = i % 2 === 0 ? size * 0.5 : size * 0.22;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (kind === "fear") {
      ctx.beginPath();
      ctx.arc(-size * 0.22, -size * 0.12, size * 0.08, 0, Math.PI * 2);
      ctx.arc(size * 0.22, -size * 0.12, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, size * 0.16, size * 0.22, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.47, Math.PI * 0.12, Math.PI * 0.88, true);
      ctx.stroke();
    } else if (kind === "incapacitate") {
      ctx.beginPath();
      const turns = 2.25;
      const steps = 28;
      for (let i = 0; i <= steps; i += 1) {
        const t = i / steps;
        const angle = t * Math.PI * 2 * turns;
        const radius = size * 0.06 + t * size * 0.42;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    } else if (kind === "root") {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.48);
      ctx.lineTo(0, size * 0.12);
      ctx.moveTo(0, -size * 0.08);
      ctx.lineTo(-size * 0.28, -size * 0.28);
      ctx.moveTo(0, 0);
      ctx.lineTo(size * 0.3, -size * 0.2);
      ctx.moveTo(0, size * 0.1);
      ctx.lineTo(-size * 0.34, size * 0.42);
      ctx.moveTo(0, size * 0.1);
      ctx.lineTo(size * 0.34, size * 0.42);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawVfx(ctx, game) {
    for (const effect of game.vfx.effects) {
      const progress = 1 - effect.remainingMs / effect.totalMs;
      const alpha = clamp(effect.remainingMs / effect.totalMs, 0, 1);

      if (effect.type === "beam") {
        const source = game.getActor(effect.sourceId);
        const target = game.getActor(effect.targetId);
        if (!source || !target) continue;

        ctx.save();
        const healingBeam = ["heal", "priest", "druid", "paladin"].includes(effect.style);
        const beamColor = this.vfxColor(effect.style);
        ctx.globalAlpha = alpha * (healingBeam ? 0.96 : 0.9);
        ctx.strokeStyle = beamColor;
        ctx.shadowColor = beamColor;
        ctx.shadowBlur = healingBeam ? 14 : 8;
        ctx.lineWidth = healingBeam ? 6 : 3.5;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();

        if (healingBeam) {
          ctx.globalAlpha = alpha * 0.48;
          ctx.strokeStyle = "#fff4cf";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(source.x, source.y);
          ctx.lineTo(target.x, target.y);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (effect.type === "burst") {
        const target = game.getActor(effect.targetId);
        const x = target?.x ?? effect.x;
        const y = target?.y ?? effect.y;
        const radius = lerp(8, 30, progress);

        ctx.save();
        ctx.globalAlpha = alpha * 0.8;
        ctx.strokeStyle = this.vfxColor(effect.style);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = alpha * 0.35;
        ctx.fillStyle = this.vfxColor(effect.style);
        ctx.beginPath();
        ctx.arc(x, y, Math.max(3, 13 * (1 - progress)), 0, Math.PI * 2);
        ctx.fill();

        this.drawVfxGlyph(ctx, effect.style, x, y, 14 + progress * 8, alpha);
        ctx.restore();
      }

      if (effect.type === "ring") {
        const source = game.getActor(effect.sourceId);
        const x = source?.x ?? effect.x;
        const y = source?.y ?? effect.y;
        const radius = lerp(effect.radiusStart, effect.radiusEnd, progress);

        ctx.save();
        const ringColor = this.vfxColor(effect.style);
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = ringColor;
        ctx.shadowColor = ringColor;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 5 - progress * 1.8;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = alpha * 0.34;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(4, radius - 7), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (effect.type === "slash") {
        const target = game.getActor(effect.targetId);
        const x = target?.x ?? effect.x;
        const y = target?.y ?? effect.y;
        const spread = lerp(8, 25, progress);

        ctx.save();
        const slashColor = this.vfxColor(effect.style);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = slashColor;
        ctx.shadowColor = slashColor;
        ctx.shadowBlur = 14;
        ctx.lineWidth = 5.5;
        ctx.beginPath();
        ctx.moveTo(x - spread, y - spread);
        ctx.lineTo(x + spread, y + spread);
        ctx.moveTo(x + spread, y - spread);
        ctx.lineTo(x - spread, y + spread);
        ctx.stroke();

        ctx.globalAlpha = alpha * .45;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, spread * .72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (effect.type === "spell") {
        this.drawSpellVfx(ctx, effect, game, progress, alpha);
      }

      if (effect.type === "chain") {
        const actors = effect.actorIds.map(id => game.getActor(id)).filter(Boolean);
        if (actors.length < 2) continue;

        ctx.save();
        ctx.globalAlpha = 0.45 + alpha * 0.55;
        ctx.shadowColor = this.vfxColor(effect.style);
        ctx.shadowBlur = 12;

        for (let i = 0; i < actors.length - 1; i += 1) {
          this.drawLightningSegment(
            ctx,
            actors[i],
            actors[i + 1],
            effect.seed + i * 23,
            progress,
            this.vfxColor(effect.style),
          );
        }

        ctx.restore();
      }
    }
  }

  drawSpellVfx(ctx, effect, game, progress, alpha) {
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

    const spellId = effect.spellId || "";
    const color = this.spellVfxColor(spellId, effect.style);
    const accent = this.spellVfxAccent(spellId, color);
    const travel = Math.min(1, progress * 1.35);
    const x = lerp(from.x, to.x, travel);
    const y = lerp(from.y, to.y, travel);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const angle = Math.atan2(dy, dx);
    const distanceToTarget = Math.hypot(dx, dy);
    const missedAlpha = effect.missed ? 0.72 : 1;

    ctx.save();
    ctx.globalAlpha = alpha * missedAlpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const projectileIds = new Set([
      "mage-frostbolt", "mage-pyroblast",
      "warlock-shadow-bolt", "warlock-chaos-bolt",
      "shaman-lava-burst", "paladin-holy-shock",
      "priest-smite", "priest-holy-fire",
    ]);

    const healIds = new Set([
      "priest-renew", "priest-flash-heal", "priest-greater-heal",
      "druid-rejuvenation", "druid-swiftmend", "druid-regrowth",
      "paladin-flash-light", "paladin-holy-light",
    ]);

    const shieldIds = new Set([
      "priest-pain-suppression", "druid-ironbark",
      "paladin-blessing", "warlock-resolve",
    ]);

    const meleeIds = new Set([
      "warrior-rend", "warrior-mortal-strike", "warrior-slam",
      "warrior-overpower", "warrior-bloodthirst",
      "rogue-garrote", "rogue-sinister", "rogue-eviscerate", "rogue-kidney",
      "rogue-mutilate",
      "dk-death-strike", "dk-obliterate",
    ]);

    const controlIds = new Set([
      "priest-psychic-scream", "druid-cyclone", "paladin-hammer",
      "mage-frost-nova", "mage-polymorph", "warlock-fear",
      "shaman-hex", "dk-chains",
    ]);

    if (projectileIds.has(spellId)) {
      const tail = Math.max(20, Math.min(56, distanceToTarget * 0.16));
      const tailX = x - Math.cos(angle) * tail;
      const tailY = y - Math.sin(angle) * tail;

      ctx.shadowColor = color;
      ctx.shadowBlur = spellId.includes("pyroblast") || spellId.includes("chaos-bolt") ? 26 : 18;
      ctx.strokeStyle = color;
      ctx.lineWidth = spellId.includes("chaos-bolt") ? 9 : 6;
      ctx.globalAlpha = alpha * 0.65 * missedAlpha;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(x, y);
      ctx.stroke();

      ctx.globalAlpha = alpha * missedAlpha;
      ctx.fillStyle = color;

      if (spellId === "mage-frostbolt") {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, -7);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, 7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = accent;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      } else if (spellId === "warlock-chaos-bolt") {
        ctx.fillStyle = accent;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, 15, progress * 7, progress * 7 + Math.PI * 1.3);
        ctx.stroke();
      } else {
        const radius = spellId === "mage-pyroblast" ? 14 : spellId === "shaman-lava-burst" ? 12 : 10;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = accent;
        ctx.globalAlpha = alpha * 0.8 * missedAlpha;
        ctx.beginPath();
        ctx.arc(x - radius * .22, y - radius * .22, radius * .38, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < 5; i += 1) {
        const t = Math.max(0, travel - 0.055 * (i + 1));
        const px = lerp(from.x, to.x, t) + Math.sin(effect.seed + i * 2.1) * 7;
        const py = lerp(from.y, to.y, t) + Math.cos(effect.seed + i * 1.7) * 7;
        ctx.globalAlpha = alpha * Math.max(.16, .62 - i * .09) * missedAlpha;
        ctx.fillStyle = i % 2 === 0 ? accent : color;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1.8, 4.2 - i * .55), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (healIds.has(spellId)) {
      const radius = 22 + progress * 23;
      ctx.translate(to.x, to.y);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.globalAlpha = alpha * 0.9;
      ctx.lineWidth = spellId.includes("greater") || spellId.includes("holy-light") ? 5 : 3.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * .28;
      ctx.lineWidth = 2;
      ctx.strokeStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(8, radius - 9), 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * .11;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(7, radius * .65), 0, Math.PI * 2);
      ctx.fill();

      const motes = spellId.startsWith("druid") ? 8 : 7;
      for (let i = 0; i < motes; i += 1) {
        const a = progress * 3.2 + (i / motes) * Math.PI * 2;
        const r = 12 + progress * 24;
        const mx = Math.cos(a) * r;
        const my = Math.sin(a) * r - progress * 12;
        ctx.globalAlpha = alpha * 0.78;
        ctx.beginPath();
        if (spellId.startsWith("druid")) {
          ctx.ellipse(mx, my, 3.2, 6.5, a, 0, Math.PI * 2);
        } else {
          ctx.arc(mx, my, 3.2, 0, Math.PI * 2);
        }
        ctx.fill();
      }

      if (!spellId.startsWith("druid")) {
        ctx.globalAlpha = alpha * 0.95;
        ctx.strokeStyle = accent;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(9, 0);
        ctx.moveTo(0, -9);
        ctx.lineTo(0, 9);
        ctx.stroke();
      }
    } else if (shieldIds.has(spellId)) {
      ctx.translate(to.x, to.y);
      const radius = 31 + Math.sin(progress * Math.PI) * 8;
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.lineWidth = 4;
      ctx.globalAlpha = alpha * 0.94;

      for (let i = 0; i < 4; i += 1) {
        const start = -Math.PI * .92 + i * Math.PI * .48 + progress * .3;
        ctx.beginPath();
        ctx.arc(0, 0, radius + i * 3.2, start, start + Math.PI * .38);
        ctx.stroke();
      }

      ctx.globalAlpha = alpha * .12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, radius - 6, 0, Math.PI * 2);
      ctx.fill();

      if (spellId === "druid-ironbark") {
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i += 1) {
          const a = (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 13, Math.sin(a) * 13);
          ctx.lineTo(Math.cos(a) * 28, Math.sin(a) * 28);
          ctx.stroke();
        }
      }
    } else if (meleeIds.has(spellId)) {
      ctx.translate(to.x, to.y);
      ctx.rotate(angle + Math.PI / 4);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      const heavyMelee = spellId.includes("eviscerate") || spellId.includes("slam") || spellId.includes("obliterate");
      ctx.lineWidth = heavyMelee ? 7 : 4.5;
      const spread = 21 + progress * 26;

      ctx.beginPath();
      ctx.arc(0, 0, spread, -Math.PI * .82, Math.PI * .16);
      ctx.stroke();

      if (heavyMelee) {
        ctx.rotate(-Math.PI / 2.6);
        ctx.globalAlpha = alpha * .82;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(0, 0, spread - 6, -Math.PI * .72, Math.PI * .08);
        ctx.stroke();
      }

      ctx.rotate(-angle - Math.PI / 4);
      ctx.globalAlpha = alpha * .75;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 5; i += 1) {
        const sparkAngle = (i / 5) * Math.PI * 2 + progress * 2.2;
        const inner = 11 + progress * 4;
        const outer = 20 + progress * 11;
        ctx.beginPath();
        ctx.moveTo(Math.cos(sparkAngle) * inner, Math.sin(sparkAngle) * inner);
        ctx.lineTo(Math.cos(sparkAngle) * outer, Math.sin(sparkAngle) * outer);
        ctx.stroke();
      }
    } else if (spellId === "warrior-charge" || spellId === "rogue-shadowstep") {
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 7;
      ctx.globalAlpha = alpha * .9;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.globalAlpha = alpha * .62;
      const nx = distanceToTarget > 0 ? -dy / distanceToTarget : 0;
      const ny = distanceToTarget > 0 ? dx / distanceToTarget : 0;
      ctx.beginPath();
      ctx.moveTo(from.x + nx * 8, from.y + ny * 8);
      ctx.lineTo(to.x + nx * 8, to.y + ny * 8);
      ctx.moveTo(from.x - nx * 8, from.y - ny * 8);
      ctx.lineTo(to.x - nx * 8, to.y - ny * 8);
      ctx.stroke();
    } else if (controlIds.has(spellId)) {
      ctx.translate(to.x, to.y);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.lineWidth = 3.5;

      if (spellId === "paladin-hammer") {
        ctx.globalAlpha = alpha * .9;
        ctx.rotate(-0.35 + progress * .7);
        ctx.strokeRect(-4, -19, 8, 23);
        ctx.fillRect(-12, -22, 24, 8);
      } else if (spellId === "mage-frost-nova" || spellId === "dk-chains") {
        const spikes = 8;
        const radius = 22 + progress * 31;
        for (let i = 0; i < spikes; i += 1) {
          const a = (i / spikes) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * (radius - 8), Math.sin(a) * (radius - 8));
          ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
          ctx.stroke();
        }
      } else {
        const turns = spellId === "druid-cyclone" ? 2.4 : 1.6;
        ctx.globalAlpha = alpha * .78;
        ctx.beginPath();
        for (let i = 0; i <= 24; i += 1) {
          const t = i / 24;
          const a = t * Math.PI * 2 * turns + progress * 4;
          const rr = 5 + t * 27;
          const sx = Math.cos(a) * rr;
          const sy = Math.sin(a) * rr * .58;
          if (i === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
    } else if (spellId === "mage-living-bomb" || spellId === "warlock-corruption"
      || spellId === "shaman-flame-shock" || spellId === "dk-fever") {
      ctx.translate(to.x, to.y);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;

      for (let i = 0; i < 6; i += 1) {
        const a = progress * 5.5 + (i / 6) * Math.PI * 2 + effect.seed * .01;
        const rr = 15 + progress * 16;
        ctx.globalAlpha = alpha * Math.max(.28, .82 - i * .07);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, 3.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = alpha * .88;
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(0, 0, 18 + progress * 17, 0, Math.PI * 2);
      ctx.stroke();
    } else if (spellId === "shaman-wind-shear" || spellId === "warrior-pummel"
      || spellId === "rogue-kick" || spellId === "dk-mind-freeze") {
      ctx.translate(to.x, to.y);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      ctx.lineWidth = 5.5;
      ctx.rotate(progress * .9);
      const rr = 18 + progress * 22;
      ctx.beginPath();
      ctx.arc(0, 0, rr, -Math.PI * .85, Math.PI * .18);
      ctx.stroke();

      ctx.globalAlpha = alpha * .55;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, rr - 7, -Math.PI * .72, Math.PI * .05);
      ctx.stroke();
    } else if (spellId === "shaman-chain-lightning") {
      ctx.translate(from.x, from.y);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 4; i += 1) {
        const a = (i / 4) * Math.PI * 2 + progress * 5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 7, Math.sin(a) * 7);
        ctx.lineTo(Math.cos(a) * (18 + progress * 8), Math.sin(a) * (18 + progress * 8));
        ctx.stroke();
      }
    } else {
      ctx.translate(to.x, to.y);
      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 13;
      ctx.lineWidth = 4;
      ctx.globalAlpha = alpha * .88;
      ctx.beginPath();
      ctx.arc(0, 0, 14 + progress * 24, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = alpha * .32;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 8 + progress * 10, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  spellVfxColor(spellId, fallbackStyle) {
    if (["mage-pyroblast", "mage-living-bomb", "shaman-lava-burst", "shaman-flame-shock"].includes(spellId)) {
      return "#f28a4f";
    }
    if (["mage-frostbolt", "mage-frost-nova", "dk-fever", "dk-chains", "dk-mind-freeze"].includes(spellId)) {
      return "#83d8ef";
    }
    if (["warlock-shadow-bolt", "warlock-corruption", "warlock-fear", "warlock-resolve"].includes(spellId)) {
      return "#b07bd8";
    }
    if (spellId === "warlock-chaos-bolt") return "#72d36d";
    if (spellId.startsWith("paladin-") || spellId.startsWith("priest-")) return "#efd477";
    if (spellId.startsWith("druid-")) return "#88c879";
    if (spellId.startsWith("shaman-")) return "#73c8de";
    if (spellId.startsWith("rogue-")) return "#e7cb68";
    if (spellId.startsWith("warrior-")) return "#c98d69";
    if (spellId.startsWith("dk-")) return "#82c5d6";
    return this.vfxColor(fallbackStyle);
  }

  spellVfxAccent(spellId, fallback) {
    if (spellId === "mage-pyroblast" || spellId === "shaman-lava-burst") return "#ffd37a";
    if (spellId === "warlock-chaos-bolt") return "#d5ff9e";
    if (spellId === "mage-frostbolt") return "#e8fbff";
    if (spellId.startsWith("paladin-") || spellId.startsWith("priest-")) return "#fff4bf";
    return fallback;
  }

  drawLightningSegment(ctx, from, to, seed, progress, outerColor = this.theme.lightning) {
    const segments = 8;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const px = -dy / length;
    const py = dx / length;

    const drawPath = (strokeStyle, width, amplitude) => {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);

      for (let i = 1; i < segments; i += 1) {
        const t = i / segments;
        const baseX = lerp(from.x, to.x, t);
        const baseY = lerp(from.y, to.y, t);
        const wave = Math.sin(seed * 0.37 + i * 2.31 + progress * 9) * amplitude;
        ctx.lineTo(baseX + px * wave, baseY + py * wave);
      }

      ctx.lineTo(to.x, to.y);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = width;
      ctx.stroke();
    };

    drawPath(outerColor, 7, 8);
    drawPath(this.theme.lightningCore, 2, 6);
  }

  drawVfxGlyph(ctx, style, x, y, size, alpha) {
    const color = this.vfxColor(style);
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = Math.min(1, alpha * 0.9);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (style === "priest") {
      ctx.beginPath();
      ctx.moveTo(-size * .45, 0);
      ctx.lineTo(size * .45, 0);
      ctx.moveTo(0, -size * .45);
      ctx.lineTo(0, size * .45);
      ctx.stroke();
    } else if (style === "druid") {
      ctx.beginPath();
      ctx.ellipse(0, 0, size * .28, size * .5, Math.PI / 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * .25, size * .25);
      ctx.lineTo(size * .28, -size * .28);
      ctx.stroke();
    } else if (style === "paladin") {
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-size * .3, -size * .3, size * .6, size * .6);
    } else if (style === "warrior") {
      ctx.beginPath();
      ctx.moveTo(-size * .4, size * .35);
      ctx.lineTo(size * .4, -size * .35);
      ctx.moveTo(-size * .1, size * .15);
      ctx.lineTo(size * .12, size * .37);
      ctx.stroke();
    } else if (style === "rogue") {
      ctx.beginPath();
      ctx.moveTo(-size * .35, size * .38);
      ctx.lineTo(size * .05, -size * .4);
      ctx.moveTo(size * .02, size * .4);
      ctx.lineTo(size * .38, -size * .35);
      ctx.stroke();
    } else if (style === "deathKnight") {
      for (let i = 0; i < 6; i += 1) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -size * .45);
        ctx.stroke();
      }
    } else if (style === "mage") {
      ctx.beginPath();
      ctx.moveTo(0, -size * .5);
      ctx.lineTo(size * .22, -size * .12);
      ctx.lineTo(size * .48, 0);
      ctx.lineTo(size * .22, size * .12);
      ctx.lineTo(0, size * .5);
      ctx.lineTo(-size * .22, size * .12);
      ctx.lineTo(-size * .48, 0);
      ctx.lineTo(-size * .22, -size * .12);
      ctx.closePath();
      ctx.stroke();
    } else if (style === "warlock") {
      ctx.beginPath();
      ctx.arc(0, 0, size * .38, 0, Math.PI * 1.65);
      ctx.arc(0, 0, size * .2, Math.PI * 1.65, Math.PI * .2, true);
      ctx.stroke();
    } else if (style === "shaman") {
      ctx.beginPath();
      ctx.moveTo(size * .08, -size * .5);
      ctx.lineTo(-size * .2, 0);
      ctx.lineTo(size * .05, 0);
      ctx.lineTo(-size * .08, size * .5);
      ctx.lineTo(size * .3, -size * .08);
      ctx.lineTo(size * .05, -size * .08);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size * .3, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  vfxColor(style) {
    const colors = {
      heal: this.theme.healVfx,
      hot: this.theme.hot,
      dot: this.theme.dot,
      damage: this.theme.damageVfx,
      fear: this.theme.fearVfx,
      buff: this.theme.cast,
      control: this.theme.goldBright,
      interrupt: this.theme.interruptVfx,
      lightning: this.theme.lightning,
      priest: this.theme.priest,
      druid: this.theme.druid,
      paladin: this.theme.paladin,
      warrior: this.theme.warrior,
      rogue: this.theme.rogue,
      deathKnight: this.theme.deathKnight,
      mage: this.theme.mage,
      warlock: this.theme.warlock,
      shaman: this.theme.shaman,
    };
    return colors[style] || this.theme.cream;
  }

  drawFloatingTexts(ctx, floatingTexts) {
    ctx.textAlign = "center";
    ctx.font = "800 15px system-ui";

    for (const item of floatingTexts) {
      const alpha = clamp(item.remainingMs / item.totalMs, 0, 1);
      ctx.globalAlpha = alpha;

      const colors = {
        damage: "#d98a75",
        "crit-damage": "#ffd08a",
        heal: "#9fc28d",
        "crit-heal": "#d8efad",
        avoid: "#d8c6a7",
        buff: "#d9b4e8",
        cc: "#ffd18a",
        debuff: "#e18f7e",
        burst: "#ffc06b",
      };

      ctx.fillStyle = colors[item.type] || this.theme.cream;
      ctx.fillText(item.text, item.x, item.y - (1 - alpha) * 22);
    }

    ctx.globalAlpha = 1;
  }
}
