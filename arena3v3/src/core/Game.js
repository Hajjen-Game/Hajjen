import { Actor } from "../entities/Actor.js";
import { MovementSystem } from "../systems/MovementSystem.js";
import { ResourceSystem } from "../systems/ResourceSystem.js";
import { CrowdControlSystem } from "../systems/CrowdControlSystem.js";
import { PlayerAbilityQueue } from "../systems/PlayerAbilityQueue.js";
import { VisualEffectSystem } from "../systems/VisualEffectSystem.js";
import { DampeningSystem } from "../systems/DampeningSystem.js";
import { CombatSystem } from "../systems/CombatSystem.js";
import { AISystem } from "../systems/AISystem.js";
import { CanvasRenderer } from "../rendering/CanvasRenderer.js";
import { UIManager } from "../ui/UIManager.js";
import { buildMatchReport } from "./MatchReport.js";
import { HonorSystem } from "./HonorSystem.js";
import { TalentSystem } from "./TalentSystem.js";
import { GearSystem } from "./GearSystem.js";

export class Game {
  constructor({ canvas, input, arena, characterConfigs }) {
    this.canvas = canvas;
    this.input = input;
    this.arena = arena;
    this.characterConfigs = characterConfigs;
    this.waitingForStart = true;

    this.movement = new MovementSystem();
    this.resources = new ResourceSystem();
    this.vfx = new VisualEffectSystem();
    this.activeCharacterId = null;
    this.activeCharacterName = "Player";
    this.honor = new HonorSystem();
    this.talents = new TalentSystem();
    this.gear = new GearSystem();
    this.lastHonorAward = null;

    this.actors = this.createActors();
    this.player = this.actors.find(actor => actor.control === "player");
    this.player.targetId = this.player.id;

    this.cc = new CrowdControlSystem(this);
    this.dampening = new DampeningSystem(this, {
      startSeconds: 45,
      startPercent: 10,
      stepSeconds: 10,
      stepPercent: 2,
      maxPercent: 100,
    });
    this.combat = new CombatSystem(this);
    this.abilityQueue = new PlayerAbilityQueue(this, 400);
    this.ai = new AISystem(this, this.movement);
    this.renderer = new CanvasRenderer(canvas, arena);

    this.elapsedSeconds = 0;
    this.ended = false;
    this.resultText = "IN PROGRESS";
    this.lastHonorAward = null;
    this.floatingTexts = [];
    this.lastFrame = performance.now();

    this.mouseSteering = {
      active: false,
      leftDown: false,
      rightDown: false,
      x: 0,
      y: 0,
      pointerId: null,
      suppressClickUntil: 0,
    };

    this.runSessionKey = "arena3v3-active-run-v1";
    this.resetDiagnostics = [];
    this.lastHeartbeatSecond = -1;
    this.restorePreviousRunDiagnostic();

    this.resetMatchTracking();
    this.markRunInactive();
    this.ui = new UIManager(this, input);

    this.input.setActionHandler(action => {
      if (action.startsWith("slot")) {
        this.ui?.castActionSlot(Number(action.slice(4)) - 1);
        return;
      }

      if (action.startsWith("party")) {
        this.targetPartyMember(Number(action.slice(-1)) - 1);
        return;
      }

      if (action === "targetNearest") {
        this.targetNearestRelevant();
      }
    });

    this.canvas.addEventListener("click", event => this.onCanvasClick(event));
    this.canvas.addEventListener("contextmenu", event => event.preventDefault());
    this.canvas.addEventListener("pointerdown", event => this.onCanvasPointerDown(event));
    this.canvas.addEventListener("pointermove", event => this.onCanvasPointerMove(event));
    this.canvas.addEventListener("pointerup", event => this.onCanvasPointerUp(event));
    this.canvas.addEventListener("pointercancel", () => this.stopMouseSteering());
    window.addEventListener("pointerup", event => this.onWindowPointerUp(event));
    window.addEventListener("blur", () => this.stopMouseSteering());
  }

  createActors() {
    return this.characterConfigs.map(config => {
      let actorConfig = config;

      if (config.control === "player") {
        actorConfig = this.talents.applyToConfig(config);
        actorConfig = this.gear.applyToConfig(actorConfig);
      }

      return new Actor(actorConfig, this.arena.spawns[config.id]);
    });
  }

  talentStatus() {
    return this.talents.status(this.honor.status().talentPoints);
  }

  gearStatus() {
    const honor = this.honor.status();
    return this.gear.status(honor.rank, honor.honorPoints);
  }

  purchaseGear(itemId) {
    const honor = this.honor.status();
    const result = this.gear.purchase(itemId, honor.rank, this.honor);

    if (result.ok && this.waitingForStart) {
      this.refreshPreparedLoadout();
    }

    return result;
  }

  canSpendTalent(talentId) {
    return this.talents.canSpend(talentId, this.honor.status().talentPoints);
  }

  spendTalent(talentId) {
    const result = this.talents.spend(talentId, this.honor.status().talentPoints);
    if (result.ok && this.waitingForStart) this.refreshPreparedLoadout();
    return result;
  }

  resetTalents() {
    this.talents.reset();
    if (this.waitingForStart) this.refreshPreparedLoadout();
  }

  refreshPreparedLoadout() {
    if (!this.waitingForStart) return;

    this.actors = this.createActors();
    this.player = this.actors.find(actor => actor.control === "player");
    this.player.targetId = this.player.id;

    this.ui?.buildFrames();
    this.ui?.buildDamageMeter();
    this.ui?.buildActionBar();
    this.ui?.buildLoadoutBar?.();
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

  targetNearestRelevant() {
    if (!this.player?.alive || this.ended || this.waitingForStart) return;

    const wantsFriendly = this.player.role === "healer";
    const candidates = this.actors
      .filter(actor =>
        actor.alive
        && actor.id !== this.player.id
        && (wantsFriendly
          ? actor.team === this.player.team
          : actor.team !== this.player.team)
      )
      .map(actor => ({
        actor,
        distance: Math.hypot(actor.x - this.player.x, actor.y - this.player.y),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (candidates[0]) this.selectTarget(candidates[0].actor.id);
  }

  castPlayerSpell(index) {
    if (!this.player.alive || this.ended || this.waitingForStart) return false;

    const result = this.abilityQueue.request(index);

    if (result.cast) {
      this.ui?.pulseAction(index, true);
    } else if (result.queued) {
      this.ui?.pulseQueuedAction(index);
    } else {
      this.ui?.pulseAction(index, false);
    }

    return result.accepted;
  }

  tryCastPlayerSpellNow(index, targetId = null) {
    if (!this.player.alive || this.ended || this.waitingForStart) return false;

    const spell = this.player.spells[index];
    if (!spell) return false;

    const target = spell.target === "self"
      ? this.player
      : this.getActor(targetId ?? this.player.targetId);

    return this.combat.tryCast(this.player, spell, target);
  }

  onCanvasClick(event) {
    if (performance.now() <= this.mouseSteering.suppressClickUntil) return;

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

  canvasPointFromEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / Math.max(1, rect.width);
    const scaleY = this.canvas.height / Math.max(1, rect.height);

    return {
      x: Math.max(0, Math.min(this.canvas.width, (event.clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(this.canvas.height, (event.clientY - rect.top) * scaleY)),
    };
  }

  updateMouseSteeringTarget(event) {
    const point = this.canvasPointFromEvent(event);
    this.mouseSteering.x = point.x;
    this.mouseSteering.y = point.y;
  }

  syncMouseSteeringButtons(event) {
    const buttons = event.buttons ?? 0;
    this.mouseSteering.leftDown = (buttons & 1) !== 0;
    this.mouseSteering.rightDown = (buttons & 2) !== 0;

    const bothDown = this.mouseSteering.leftDown && this.mouseSteering.rightDown;
    this.mouseSteering.active = bothDown;

    if (bothDown) {
      this.mouseSteering.suppressClickUntil = performance.now() + 300;
      this.updateMouseSteeringTarget(event);
    }
  }

  onCanvasPointerDown(event) {
    if (event.button !== 0 && event.button !== 2) return;

    if (event.button === 2) event.preventDefault();

    this.mouseSteering.pointerId = event.pointerId;
    this.syncMouseSteeringButtons(event);

    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is a convenience; window pointerup still updates state.
    }
  }

  onCanvasPointerMove(event) {
    if (
      this.mouseSteering.pointerId !== null
      && event.pointerId !== this.mouseSteering.pointerId
    ) return;

    if ((event.buttons & 3) !== 0) {
      this.updateMouseSteeringTarget(event);
    }

    this.syncMouseSteeringButtons(event);
  }

  onCanvasPointerUp(event) {
    if (
      this.mouseSteering.pointerId !== null
      && event.pointerId !== this.mouseSteering.pointerId
    ) return;

    this.syncMouseSteeringButtons(event);

    if ((event.buttons & 3) === 0) {
      this.releaseMousePointer(event.pointerId);
    }
  }

  onWindowPointerUp(event) {
    if (
      this.mouseSteering.pointerId !== null
      && event.pointerId !== this.mouseSteering.pointerId
    ) return;

    this.syncMouseSteeringButtons(event);

    if ((event.buttons & 3) === 0) {
      this.releaseMousePointer(event.pointerId);
    }
  }

  releaseMousePointer(pointerId = null) {
    const capturedId = this.mouseSteering.pointerId;

    if (
      pointerId !== null
      && capturedId !== null
      && pointerId !== capturedId
    ) return;

    if (capturedId !== null) {
      try {
        this.canvas.releasePointerCapture(capturedId);
      } catch {
        // The pointer may already have been released by the browser.
      }
    }

    this.mouseSteering.pointerId = null;
  }

  stopMouseSteering() {
    this.releaseMousePointer();
    this.mouseSteering.active = false;
    this.mouseSteering.leftDown = false;
    this.mouseSteering.rightDown = false;
  }

  mouseSteeringVector() {
    if (!this.mouseSteering.active || !this.player?.alive) {
      return { x: 0, y: 0 };
    }

    const dx = this.mouseSteering.x - this.player.x;
    const dy = this.mouseSteering.y - this.player.y;
    const distance = Math.hypot(dx, dy);
    const deadZone = Math.max(10, this.player.radius * 0.65);

    if (distance <= deadZone) return { x: 0, y: 0 };

    return {
      x: dx / distance,
      y: dy / distance,
    };
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
    if (!this.ended && !this.waitingForStart) {
      this.elapsedSeconds += deltaMs / 1000;
      const deltaSeconds = deltaMs / 1000;

      this.writeRunHeartbeat();
      this.dampening.update(this.elapsedSeconds);

      for (const actor of this.actors) {
        if (!actor.alive || !this.cc.hasKind(actor, "fear")) continue;
        this.movement.move(actor, this.cc.forcedFearVector(actor), deltaSeconds, this.arena);
      }

      const keyboardMove = this.input.movementVector();
      const mouseMove = this.mouseSteeringVector();
      const move = this.mouseSteering.active ? mouseMove : keyboardMove;
      const moving = move.x !== 0 || move.y !== 0;
      const playerCanMove = this.player.alive
        && !this.cc.isHardControlled(this.player)
        && !this.cc.isRooted(this.player);

      if (moving && playerCanMove && this.player.cast) {
        this.combat.cancelCast(this.player, "movement");
        this.abilityQueue.clear();
      }

      if (moving && playerCanMove) {
        this.movement.move(this.player, move, deltaSeconds, this.arena);
      }

      this.combat.update(deltaMs);
      this.abilityQueue.update();
      this.ai.update(deltaSeconds);
      this.checkWinCondition();
    }

    this.vfx.update(deltaMs);

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

    if (actor.id === this.player.id) {
      this.stopMouseSteering();
      this.abilityQueue.clear();
      this.ui?.showDeathForfeit();
      this.log("Player has fallen. The friendly team keeps fighting.");
    }

    if (this.player.targetId === actor.id && this.player.alive) {
      const replacement = this.actors.find(candidate =>
        candidate.alive && candidate.team === actor.team,
      );
      if (replacement) this.player.targetId = replacement.id;
    }
  }

  checkWinCondition() {
    const enemyAlive = this.actors.some(actor =>
      actor.team === "enemy" && actor.alive,
    );
    const friendlyAlive = this.actors.some(actor =>
      actor.team === "friendly" && actor.alive,
    );

    if (!enemyAlive) {
      this.finishMatch("VICTORY", "Enemy team eliminated.");
      return;
    }

    if (!friendlyAlive) {
      this.finishMatch("DEFEAT", "Friendly team eliminated.");
    }
  }

  forfeitMatch() {
    if (this.ended || this.waitingForStart || this.player?.alive) return false;

    this.finishMatch("DEFEAT", "Player forfeited after falling.");
    return true;
  }

  finishMatch(result, message) {
    if (this.ended) return;

    this.ended = true;
    this.abilityQueue.clear();
    this.resultText = result;
    this.lastHonorAward = this.honor.award(result);
    this.ui.hideDeathForfeit();
    this.ui.setResult(result, this.lastHonorAward);
    this.log(message);

    if (this.lastHonorAward) {
      this.log(
        "+" + this.lastHonorAward.honor + " Honor · Rank "
        + this.lastHonorAward.rankAfter + " " + this.lastHonorAward.rankTitle
        + (this.lastHonorAward.rankedUp ? " · RANK UP" : ""),
      );
    }

    this.markRunInactive();
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

  restorePreviousRunDiagnostic() {
    try {
      const previous = JSON.parse(sessionStorage.getItem(this.runSessionKey) || "null");

      if (previous?.active && Number.isFinite(previous.elapsedSeconds)) {
        this.resetDiagnostics.push({
          kind: "reload",
          reason: "page reload / navigation / renderer restart",
          previousElapsedSeconds: previous.elapsedSeconds,
          recordedAt: previous.recordedAt || null,
        });
      }
    } catch {
      // Diagnostics must never block gameplay.
    }
  }

  writeRunHeartbeat() {
    const second = Math.floor(this.elapsedSeconds);
    if (second === this.lastHeartbeatSecond) return;
    this.lastHeartbeatSecond = second;

    try {
      sessionStorage.setItem(this.runSessionKey, JSON.stringify({
        active: !this.ended && !this.waitingForStart,
        elapsedSeconds: this.elapsedSeconds,
        recordedAt: new Date().toISOString(),
      }));
    } catch {
      // Session storage can be unavailable in hardened/private browser modes.
    }
  }

  markRunInactive() {
    try {
      sessionStorage.setItem(this.runSessionKey, JSON.stringify({
        active: false,
        elapsedSeconds: this.elapsedSeconds,
        recordedAt: new Date().toISOString(),
      }));
    } catch {
      // Diagnostics must never block gameplay.
    }
  }

  recordResetDiagnostic(reason) {
    this.resetDiagnostics.push({
      kind: "internal-reset",
      reason,
      previousElapsedSeconds: this.elapsedSeconds,
      recordedAt: new Date().toISOString(),
    });
    this.resetDiagnostics = this.resetDiagnostics.slice(-5);
  }

  selectCharacter(character, characterConfigs) {
    this.activeCharacterId = character.id;
    this.activeCharacterName = character.name;
    this.honor = new HonorSystem(character.id);
    this.talents = new TalentSystem(character.id, character.classId);
    this.gear = new GearSystem(character.id, character.classId);
    this.characterConfigs = characterConfigs;
    this.waitingForStart = true;
    this.reset("character select");
    this.waitingForStart = true;
    this.markRunInactive();
    this.ui?.updateHonorStatus();
  }

  prepareLobby() {
    this.waitingForStart = true;
    this.reset("arena lobby");
    this.waitingForStart = true;
    this.markRunInactive();
  }

  startPreparedMatch(characterConfigs) {
    this.characterConfigs = characterConfigs;
    this.waitingForStart = false;
    this.reset("match start");
  }

  setCharacterConfigs(characterConfigs) {
    this.startPreparedMatch(characterConfigs);
  }

  reset(reason = "unknown internal reset") {
    this.recordResetDiagnostic(reason);
    this.stopMouseSteering();
    this.actors = this.createActors();
    this.player = this.actors.find(actor => actor.control === "player");
    this.player.targetId = this.player.id;

    this.vfx.reset();
    this.cc = new CrowdControlSystem(this);
    this.dampening = new DampeningSystem(this, {
      startSeconds: 45,
      startPercent: 10,
      stepSeconds: 10,
      stepPercent: 2,
      maxPercent: 100,
    });
    this.combat = new CombatSystem(this);
    this.abilityQueue = new PlayerAbilityQueue(this, 400);
    this.ai = new AISystem(this, this.movement);

    this.elapsedSeconds = 0;
    this.ended = false;
    this.resultText = "IN PROGRESS";
    this.lastHonorAward = null;
    this.floatingTexts = [];
    this.lastHeartbeatSecond = -1;

    this.resetMatchTracking();
    this.writeRunHeartbeat();

    this.ui.clearResult();
    this.ui.hideDeathForfeit();
    this.ui.clearLog();
    this.ui.buildFrames();
    this.ui.buildDamageMeter();
    this.ui.buildActionBar();
    this.ui.toast("Arena reset");
  }
}
