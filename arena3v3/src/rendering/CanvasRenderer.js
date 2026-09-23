import { GAME_HEIGHT, GAME_WIDTH } from "../core/constants.js";
import { clamp } from "../core/utils.js";

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
        ["fear", "incapacitate", "schoolLock"].includes(effect.kind),
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
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    if (actor.role === "healer") {
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.moveTo(0, -7);
      ctx.lineTo(0, 7);
      ctx.stroke();
    } else if (actor.role === "melee") {
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-6, -6, 12, 12);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(8, 7);
      ctx.lineTo(-8, 7);
      ctx.closePath();
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

    ctx.fillStyle = actor.resource.type === "energy" ? this.theme.energy : this.theme.mana;
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
        ["hot", "dot", "damageReduction", "fear", "incapacitate", "schoolLock"].includes(effect.kind),
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
      };

      ctx.fillStyle = colors[item.type] || this.theme.cream;
      ctx.fillText(item.text, item.x, item.y - (1 - alpha) * 22);
    }

    ctx.globalAlpha = 1;
  }
}
