import { Actor } from "../entities/Actor.js";
import { MovementSystem } from "../systems/MovementSystem.js";
import { ResourceSystem } from "../systems/ResourceSystem.js";
import { CrowdControlSystem } from "../systems/CrowdControlSystem.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { AISystem } from "../systems/AISystem.js";
import { CanvasRenderer } from "../rendering/CanvasRenderer.js";
import { UIManager } from "../ui/UIManager.js";
import { buildMatchReport } from "./MatchReport.js";

export class Game {
  constructor({ canvas, input, arena, characterConfigs }) {
    this.canvas = canvas;
    this.input = input;
    this.arena = arena;
    this.characterConfigs = characterConfigs;

    this.movement = new MovementSystem();
    this.resources = new ResourceSystem();

    this.actors = this.createActors();
    this.player = this.actors.find(actor => actor.control === "player");
    this.player.targetId = this.player.id;

    this.cc = new CrowdControlSystem(this);
    this.combat = new CombatSystem(this);
    this.ai = new AISystem(this, this.movement);
    this.renderer = new CanvasRenderer(canvas, arena);

    this.elapsedSeconds = 0;
    this.ended = false;
    this.resultText = "IN PROGRESS";
    this.floatingTexts = [];
    this.lastFrame = performance.now();

    this.resetMatchTracking();
    this.ui = new UIManager(this, input);

    this.input.setActionHandler(action => {
      if (action.startsWith("spell")) {
        this.castPlayerSpell(Number(action.slice(-1)) - 1);
        return;
      }

      if (action.startsWith("party")) {
        this.targetPartyMember(Number(action.slice(-1)) - 1);
      }
    });

    this.canvas.addEventListener("click", event => this.onCanvasClick(event));
  }

  createActors() {
    return this.characterConfigs.map(config =>
      new Actor(config, this.arena.spawns[config.id]),
    );
  }

  resetMatchTracking() {
    this.matchStats = new Map(
      this.actors.map(actor => [
        actor.id,
        {
          damage: 0,
          healing: 0,
          damageTaken: 0,
          healingReceived: 0,
          casts: 0,
          crits: 0,
          misses: 0,
          dodges: 0,
          interrupts: 0,
          ccApplied: 0,
          ccSeconds: 0,
        },
      ]),
    );

    this.runLog = [];
    this.deathEvents = [];
  }

  getActor(id) {
    return this.actors.find(actor => actor.id === id);
  }

  selectTarget(id) {
    const target = this.getActor(id);
    if (target) this.player.targetId = target.id;
  }

  targetPartyMember(index) {
    const friendly = this.actors.filter(actor => actor.team === "friendly");
    const target = friendly[index];
    if (target?.alive) this.selectTarget(target.id);
  }

  castPlayerSpell(index) {
    if (!this.player.alive || this.ended) return false;

    const spell = this.player.spells[index];
    if (!spell) return false;

    const target = spell.target === "self"
      ? this.player
      : this.getActor(this.player.targetId);

    const success = this.combat.tryCast(this.player, spell, target);
    this.ui?.pulseAction(index, success);
    return success;
  }

  onCanvasClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (this.canvas.height / rect.height);

    const candidates = this.actors
      .filter(actor => actor.alive)
      .map(actor => ({ actor, d: Math.hypot(actor.x - x, actor.y - y) }))
      .filter(item => item.d <= item.actor.radius + 12)
      .sort((a, b) => a.d - b.d);

    if (candidates[0]) this.selectTarget(candidates[0].actor.id);
  }

  start() {
    this.lastFrame = performance.now();
    requestAnimationFrame(time => this.loop(time));
  }

  loop(time) {
    const deltaMs = Math.min(50, Math.max(0, time - this.lastFrame));
    this.lastFrame = time;

    this.update(deltaMs);
    this.renderer.render(this);
    this.ui.update();

    requestAnimationFrame(next => this.loop(next));
  }

  update(deltaMs) {
    if (!this.ended) {
      this.elapsedSeconds += deltaMs / 1000;
      const deltaSeconds = deltaMs / 1000;

      for (const actor of this.actors) {
        if (!actor.alive || !this.cc.hasKind(actor, "fear")) continue;
        this.movement.move(actor, this.cc.forcedFearVector(actor), deltaSeconds, this.arena);
      }

      const move = this.input.movementVector();
      const moving = move.x !== 0 || move.y !== 0;
      const playerCanMove = !this.cc.isHardControlled(this.player) && !this.cc.isRooted(this.player);

      if (moving && playerCanMove && this.player.cast) {
        this.combat.cancelCast(this.player, "movement");
      }

      if (moving && playerCanMove) {
        this.movement.move(this.player, move, deltaSeconds, this.arena);
      }

      this.combat.update(deltaMs);
      this.ai.update(deltaSeconds);
      this.checkWinCondition();
    }

    for (const item of this.floatingTexts) item.remainingMs -= deltaMs;
    this.floatingTexts = this.floatingTexts.filter(item => item.remainingMs > 0);
  }

  onActorDeath(actor) {
    if (!this.deathEvents.some(event => event.id === actor.id)) {
      this.deathEvents.push({
        id: actor.id,
        name: actor.name,
        time: this.elapsedSeconds,
      });
    }

    if (this.player.targetId === actor.id && this.player.alive) {
      const replacement = this.actors.find(candidate =>
        candidate.alive && candidate.team === actor.team,
      );
      if (replacement) this.player.targetId = replacement.id;
    }
  }

  checkWinCondition() {
    if (!this.player.alive) {
      this.finishMatch("DEFEAT", "Field Mender has fallen. The match ends immediately.");
      return;
    }

    const enemyAlive = this.actors.some(actor =>
      actor.team === "enemy" && actor.alive,
    );

    if (!enemyAlive) {
      this.finishMatch("VICTORY", "Enemy team eliminated.");
    }
  }

  finishMatch(result, message) {
    if (this.ended) return;

    this.ended = true;
    this.resultText = result;
    this.ui.setResult(result);
    this.log(message);
  }

  recordDamage(source, target, amount, crit) {
    const sourceStats = this.matchStats.get(source.id);
    const targetStats = this.matchStats.get(target.id);

    if (sourceStats) {
      sourceStats.damage += amount;
      if (crit) sourceStats.crits += 1;
    }
    if (targetStats) targetStats.damageTaken += amount;
  }

  recordHealing(source, target, amount, crit) {
    const sourceStats = this.matchStats.get(source.id);
    const targetStats = this.matchStats.get(target.id);

    if (sourceStats) {
      sourceStats.healing += amount;
      if (crit) sourceStats.crits += 1;
    }
    if (targetStats) targetStats.healingReceived += amount;
  }

  recordCast(source) {
    const stats = this.matchStats.get(source.id);
    if (stats) stats.casts += 1;
  }

  recordAvoidance(source, target, outcome) {
    const sourceStats = this.matchStats.get(source.id);
    const targetStats = this.matchStats.get(target.id);

    if (outcome === "miss" && sourceStats) sourceStats.misses += 1;
    if (outcome === "dodge" && targetStats) targetStats.dodges += 1;
  }

  recordInterrupt(source) {
    const stats = this.matchStats.get(source.id);
    if (stats) stats.interrupts += 1;
  }

  recordCc(source, target, kind, durationMs) {
    const stats = this.matchStats.get(source.id);
    if (stats) {
      stats.ccApplied += 1;
      stats.ccSeconds += durationMs / 1000;
    }
  }

  addFloatingText(actor, text, type) {
    this.floatingTexts.push({
      x: actor.x,
      y: actor.y - actor.radius - 8,
      text,
      type,
      totalMs: 850,
      remainingMs: 850,
    });
  }

  log(text) {
    this.runLog.push({ time: this.elapsedSeconds, text });
    this.ui?.addLog(text);
  }

  buildRunReport() {
    return buildMatchReport(this);
  }

  reset() {
    this.actors = this.createActors();
    this.player = this.actors.find(actor => actor.control === "player");
    this.player.targetId = this.player.id;

    this.cc = new CrowdControlSystem(this);
    this.combat = new CombatSystem(this);
    this.ai = new AISystem(this, this.movement);

    this.elapsedSeconds = 0;
    this.ended = false;
    this.resultText = "IN PROGRESS";
    this.floatingTexts = [];

    this.resetMatchTracking();

    this.ui.clearResult();
    this.ui.clearLog();
    this.ui.buildFrames();
    this.ui.buildDamageMeter();
    this.ui.buildActionBar();
    this.ui.toast("Arena reset");
  }
}
