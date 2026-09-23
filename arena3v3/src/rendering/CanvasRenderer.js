import { GAME_HEIGHT, GAME_WIDTH } from "../core/constants.js";
import { clamp, lerp } from "../core/utils.js";

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
    };
  }

  render(game) {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.drawArena(ctx);
    this.drawEffectRings(ctx, game);

    for (const actor of game.actors.filter(actor => actor.alive)) {
      this.drawActor(ctx, actor, game);
    }

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
      const hasCc = actor.effects.some(effect =>
        ["fear", "incapacitate", "stun", "root", "schoolLock"].includes(effect.kind),
      );

      if (!hasHot && !hasDot && !hasCc) continue;

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

      if (hasCc) {
        ctx.setLineDash([3, 4]);
        ctx.strokeStyle = this.theme.goldBright;
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

    if (selected) {
      ctx.beginPath();
      ctx.arc(actor.x, actor.y, actor.radius + 11, 0, Math.PI * 2);
      ctx.strokeStyle = this.theme.goldBright;
      ctx.lineWidth = 4;
      ctx.stroke();
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

    this.drawRoleGlyph(ctx, actor);
    this.drawWorldHealth(ctx, actor);
    this.drawWorldResource(ctx, actor);
    this.drawName(ctx, actor);
    this.drawEffectIcons(ctx, actor);

    if (actor.cast) this.drawWorldCast(ctx, actor);

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

  drawWorldHealth(ctx, actor) {
    const width = 70;
    const x = actor.x - width / 2;
    const y = actor.y - actor.radius - 24;

    ctx.fillStyle = "rgba(11,8,6,.9)";
    ctx.fillRect(x, y, width, 7);

    ctx.fillStyle = actor.healthPct < 0.3 ? this.theme.low : this.theme.health;
    ctx.fillRect(x + 1, y + 1, (width - 2) * clamp(actor.healthPct, 0, 1), 5);

    ctx.strokeStyle = "rgba(220,180,120,.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, 7);
  }

  drawWorldResource(ctx, actor) {
    const width = 70;
    const x = actor.x - width / 2;
    const y = actor.y - actor.radius - 15;

    ctx.fillStyle = "rgba(11,8,6,.9)";
    ctx.fillRect(x, y, width, 4);

    const resourceColors = {
      mana: this.theme.mana,
      energy: this.theme.energy,
      rage: this.theme.rage,
      runic: this.theme.runic,
    };
    ctx.fillStyle = resourceColors[actor.resource.type] || this.theme.mana;
    ctx.fillRect(x + 1, y + 1, (width - 2) * clamp(actor.resourcePct, 0, 1), 2);
  }

  drawWorldCast(ctx, actor) {
    const width = 70;
    const x = actor.x - width / 2;
    const y = actor.y + actor.radius + 31;
    const progress = 1 - actor.cast.remainingMs / actor.cast.totalMs;

    ctx.fillStyle = "rgba(11,8,6,.9)";
    ctx.fillRect(x, y, width, 5);

    ctx.fillStyle = this.theme.cast;
    ctx.fillRect(x + 1, y + 1, (width - 2) * clamp(progress, 0, 1), 3);
  }

  drawName(ctx, actor) {
    ctx.font = "700 11px system-ui";
    ctx.textAlign = "center";
    ctx.fillStyle = this.theme.cream;
    ctx.fillText(actor.name, actor.x, actor.y - actor.radius - 31);
  }

  drawEffectIcons(ctx, actor) {
    const effects = actor.effects
      .filter(effect => effect.remainingMs > 0)
      .filter(effect =>
        ["hot", "dot", "damageReduction", "healingReduction", "fear", "incapacitate", "stun", "root", "schoolLock"].includes(effect.kind),
      )
      .slice(0, 5);

    if (effects.length === 0) return;

    const size = 18;
    const gap = 3;
    const totalWidth = effects.length * size + (effects.length - 1) * gap;
    let x = actor.x - totalWidth / 2;
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
      } else if (effect.kind === "schoolLock") {
        fill = "#b29ad1";
        label = "L";
      }

      ctx.fillStyle = "rgba(14,10,8,.92)";
      ctx.fillRect(x, y, size, size);

      ctx.strokeStyle = fill;
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);

      ctx.fillStyle = this.theme.cream;
      ctx.font = "900 9px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(label, x + size / 2, y + 12);

      x += size + gap;
    }
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
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = this.vfxColor(effect.style);
        ctx.lineWidth = effect.style === "heal" ? 5 : 3;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
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
        ctx.globalAlpha = alpha * 0.75;
        ctx.strokeStyle = this.vfxColor(effect.style);
        ctx.lineWidth = 4 - progress * 2;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      if (effect.type === "slash") {
        const target = game.getActor(effect.targetId);
        const x = target?.x ?? effect.x;
        const y = target?.y ?? effect.y;
        const spread = lerp(8, 25, progress);

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = this.vfxColor(effect.style);
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - spread, y - spread);
        ctx.lineTo(x + spread, y + spread);
        ctx.moveTo(x + spread, y - spread);
        ctx.lineTo(x - spread, y + spread);
        ctx.stroke();
        ctx.restore();
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
      };

      ctx.fillStyle = colors[item.type] || this.theme.cream;
      ctx.fillText(item.text, item.x, item.y - (1 - alpha) * 22);
    }

    ctx.globalAlpha = 1;
  }
}
