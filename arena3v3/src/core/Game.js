import { Actor } from "../entities/Actor.js";
import { MovementSystem } from "../systems/MovementSystem.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { AISystem } from "../systems/AISystem.js";
import { CanvasRenderer } from "../rendering/CanvasRenderer.js";
import { UIManager } from "../ui/UIManager.js";

export class Game {
  constructor({ canvas, input, arena, characterConfigs }) {
    this.canvas = canvas;
    this.input = input;
    this.arena = arena;
    this.characterConfigs = characterConfigs;
    this.movement = new MovementSystem();
    this.actors = this.createActors();
    this.player = this.actors.find(actor => actor.control === "player");
    this.player.targetId = this.player.id;
    this.combat = new CombatSystem(this);
    this.ai = new AISystem(this, this.movement);
    this.renderer = new CanvasRenderer(canvas, arena);
    this.ui = new UIManager(this, input);
    this.elapsedSeconds = 0;
    this.ended = false;
    this.floatingTexts = [];
    this.lastFrame = performance.now();

    this.input.setActionHandler(action => {
      if (action.startsWith("spell")) this.castPlayerSpell(Number(action.slice(-1)) - 1);
    });
    this.canvas.addEventListener("click", event => this.onCanvasClick(event));
  }

  createActors() {
    return this.characterConfigs.map(config => new Actor(config, this.arena.spawns[config.id]));
  }

  getActor(id) { return this.actors.find(actor => actor.id === id); }

  selectTarget(id) {
    const target = this.getActor(id);
    if (target) this.player.targetId = target.id;
  }

  castPlayerSpell(index) {
    if (!this.player.alive || this.ended) return;
    const spell = this.player.spells[index];
    const target = this.getActor(this.player.targetId);
    this.combat.tryCast(this.player, spell, target);
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
      const move = this.input.movementVector();
      const moving = move.x !== 0 || move.y !== 0;
      if (moving && this.player.cast) this.combat.cancelCast(this.player, "movement");
      if (moving) this.movement.move(this.player, move, deltaMs / 1000, this.arena);
      this.combat.update(deltaMs);
      this.ai.update(deltaMs / 1000);
      this.checkWinCondition();
    }
    for (const item of this.floatingTexts) item.remainingMs -= deltaMs;
    this.floatingTexts = this.floatingTexts.filter(item => item.remainingMs > 0);
  }

  onActorDeath(actor) {
    if (this.player.targetId === actor.id) {
      const replacement = this.actors.find(candidate => candidate.alive && candidate.team === actor.team);
      if (replacement) this.player.targetId = replacement.id;
    }
  }

  checkWinCondition() {
    const friendlyAlive = this.actors.some(actor => actor.team === "friendly" && actor.alive);
    const enemyAlive = this.actors.some(actor => actor.team === "enemy" && actor.alive);
    if (friendlyAlive && enemyAlive) return;
    this.ended = true;
    this.ui.setResult(enemyAlive ? "DEFEAT" : "VICTORY");
    this.log(enemyAlive ? "Your team has been eliminated." : "Enemy team eliminated.");
  }

  addFloatingText(actor, text, type) {
    this.floatingTexts.push({
      x: actor.x, y: actor.y - actor.radius - 8, text, type, totalMs: 850, remainingMs: 850,
    });
  }

  log(text) { this.ui?.addLog(text); }

  reset() {
    this.actors = this.createActors();
    this.player = this.actors.find(actor => actor.control === "player");
    this.player.targetId = this.player.id;
    this.combat.reset();
    this.ai = new AISystem(this, this.movement);
    this.elapsedSeconds = 0;
    this.ended = false;
    this.floatingTexts = [];
    this.ui.clearResult();
    this.ui.clearLog();
    this.ui.buildFrames();
    this.ui.buildActionBar();
    this.ui.toast("Arena reset");
  }
}
