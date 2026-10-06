import { Actor } from "../entities/Actor.js";
import { MovementSystem } from "../systems/MovementSystem.js?v=20261005-openfielddebug1";
import { ResourceSystem } from "../systems/ResourceSystem.js";
import { CrowdControlSystem } from "../systems/CrowdControlSystem.js?v=20260930-vfx2d1";
import { PlayerAbilityQueue } from "../systems/PlayerAbilityQueue.js";
import { VisualEffectSystem } from "../systems/VisualEffectSystem.js?v=20261002-secondary1";
import { DampeningSystem } from "../systems/DampeningSystem.js";
import { CombatSystem } from "../systems/CombatSystem.js?v=20261002-secondary2";
import { AISystem } from "../systems/AISystem.js?v=20261006-supportstable2";
import { createAiBehaviorProfile, enemyAiRatingForPlayerRating } from "../systems/AIBehaviorProfiles.js?v=20260928-onboarding1";
import { RendererBridge } from "../rendering/RendererBridge.js?v=20261006-frostweight2";
import { UIManager } from "../ui/UIManager.js?v=20261005-honorcurve1";
import { buildMatchReport } from "./MatchReport.js?v=20261001-wallfollow1";
import { buildAiMovementReport } from "./AiMovementReport.js?v=20261005-deadtargetfix1";
import { HonorSystem, talentPointsForRank } from "./HonorSystem.js?v=20261005-honorcurve1";
import { RatingSystem } from "./RatingSystem.js?v=20260927-rank20rating2";
import { TalentSystem } from "./TalentSystem.js?v=20260928-healinghp1";
import { GearSystem } from "./GearSystem.js?v=20261005-astralgear1";

const PIXI_FIXED_STEP_MS = 1000 / 60;
const PIXI_MAX_CATCHUP_MS = 200;
const PIXI_MAX_STEPS_PER_FRAME = Math.ceil(
  PIXI_MAX_CATCHUP_MS / PIXI_FIXED_STEP_MS,
);


export class Game {
  constructor({ canvas, input, arena, characterConfigs }) {
    this.canvas = canvas;
    this.input = input;
    this.arena = arena;
    this.characterConfigs = characterConfigs;
    this.waitingForStart = true;

    this.movement = new MovementSystem((actor, event) => {
      this.recordAiMovementEvent(actor, event);
    });
    this.resources = new ResourceSystem();
    this.vfx = new VisualEffectSystem();
    this.activeCharacterId = null;
    this.activeCharacterName = "Player";
    this.honor = new HonorSystem();
    this.rating = new RatingSystem();
    this.talents = new TalentSystem();
    this.gear = new GearSystem();
    this.lastHonorAward = null;
    this.lastRatingAward = null;
    this.matchLoadoutSnapshot = null;

    this.actors = this.createActors();
    this.player = this.actors.find(actor => actor.control === "player");
    this.player.targetId = null;

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
    this.renderer = new RendererBridge(canvas, arena);

    this.elapsedSeconds = 0;
    this.ended = false;
    this.resultText = "IN PROGRESS";
    this.lastHonorAward = null;
    this.lastRatingAward = null;
    this.floatingTexts = [];
    this.lastFrame = performance.now();

    // Pixi test path: gameplay advances on a fixed 60 Hz clock instead of
    // inheriting the render frame rate. Canvas stays unchanged as the A/B baseline.
    this.simulationAccumulatorMs = 0;
    this.simulationTiming = {
      rawElapsedMs: 0,
      simulatedMs: 0,
      droppedMs: 0,
      lastStepCount: 0,
      maxRawFrameMs: 0,
    };

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
    const aiGearProfile = this.gear?.progressionProfile?.() || null;

    return this.characterConfigs.map(config => {
      let actorConfig = config;

      if (config.control === "player") {
        actorConfig = this.talents.applyToConfig(config);
        actorConfig = this.gear.applyToConfig(actorConfig);
      } else if (aiGearProfile) {
        const aiGear = new GearSystem(null, config.classId);
        actorConfig = aiGear.applyProgressionProfileToConfig(actorConfig, aiGearProfile);
        actorConfig.aiGearProgression = {
          mirroredFromPlayer: true,
          profile: aiGearProfile,
          equippedItems: actorConfig.gearSummary?.equippedItems || [],
          setPieces: actorConfig.gearSummary?.setPieces || 0,
        };
      }

      const spawnId = config.spawnId || config.id;
      const spawn = this.arena.spawns[spawnId];

      if (!spawn) {
        throw new Error("Missing arena spawn: " + spawnId + " for " + config.id);
      }

      return new Actor(actorConfig, spawn);
    });
  }

  randomEnemyTalentBuild(classId, earnedPoints) {
    const system = new TalentSystem(null, classId);
    const branches = system.tree?.branches || [];
    const primaryBranch = branches.length > 0
      ? branches[Math.floor(Math.random() * branches.length)]?.id
      : null;

    let guard = 0;
    while (system.spentPoints() < earnedPoints && guard < 100) {
      guard += 1;

      const spendable = [];
      for (const branch of branches) {
        for (const talent of branch.talents || []) {
          if (system.canSpend(talent.id, earnedPoints).ok) {
            spendable.push({ branch, talent });
          }
        }
      }

      if (spendable.length === 0) break;

      // AI builds tend to form a recognizable main branch instead of spreading
      // every point evenly, while still allowing hybrid allocations.
      const preferred = spendable.filter(entry => entry.branch.id === primaryBranch);
      const pool = preferred.length > 0 && Math.random() < 0.72
        ? preferred
        : spendable;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      system.spend(pick.talent.id, earnedPoints);
    }

    const status = system.status(earnedPoints);
    const entries = [];

    for (const branch of branches) {
      for (const talent of branch.talents || []) {
        const rank = Number(status.allocations?.[talent.id] || 0);
        if (rank <= 0) continue;

        entries.push({
          id: talent.id,
          name: talent.name,
          branchId: branch.id,
          branchName: branch.name,
          rank,
          maxRank: talent.maxRank,
        });
      }
    }

    return {
      system,
      snapshot: {
        earnedPoints,
        spentPoints: status.spentPoints,
        availablePoints: status.availablePoints,
        branchPoints: { ...(status.branchPoints || {}) },
        primaryBranch,
        entries,
      },
    };
  }

  prepareAiProgressionConfigs(characterConfigs) {
    const playerRank = Math.max(1, Math.min(20, Number(this.honor.status().rank) || 1));
    const playerRating = Math.max(0, Math.round(Number(this.rating.status().rating) || 0));

    return characterConfigs.map(config => {
      if (config.control === "player") return config;

      // Singleplayer fairness: every combatant mirrors the player's character
      // progression Rank, while PvP Rating independently controls AI decision
      // quality. Builds still vary through legal random talent allocations.
      const rank = playerRank;
      const talentPoints = talentPointsForRank(rank);
      const build = this.randomEnemyTalentBuild(config.classId, talentPoints);
      const progressed = build.system.applyToConfig(config);

      const decisionRating = config.team === "enemy"
        ? enemyAiRatingForPlayerRating(playerRating)
        : playerRating;

      progressed.aiProgression = {
        rank,
        rating: playerRating,
        decisionRating,
        talentPoints,
        ...build.snapshot,
      };

      // Friendly AI stays at the player's real Rating. Enemy decision quality
      // gets an onboarding handicap at low Rating, which fades smoothly and is
      // completely gone by 2200. Stats, Rank, talents and gear remain mirrored.
      progressed.aiBehaviorProfile = createAiBehaviorProfile(config.role, decisionRating);

      // Keep the old field for enemy reports / compatibility with any
      // existing tooling that still reads enemyProgression.
      if (config.team === "enemy") {
        progressed.enemyProgression = progressed.aiProgression;
      }

      return progressed;
    });
  }

  capturePlayerLoadoutSnapshot() {
    const player = this.player;
    if (!player) return null;

    const honor = this.honor.status();
    const rating = this.rating.status();
    const talentStatus = this.talentStatus();
    const gearStatus = this.gearStatus();

    const talents = [];
    for (const branch of talentStatus.tree?.branches || []) {
      for (const talent of branch.talents || []) {
        const rank = Number(talentStatus.allocations?.[talent.id] || 0);
        if (rank <= 0) continue;

        talents.push({
          id: talent.id,
          name: talent.name,
          branchId: branch.id,
          branchName: branch.name,
          rank,
          maxRank: talent.maxRank,
        });
      }
    }

    const equippedGear = this.gear.equippedItems().map(item => ({
      id: item.id,
      name: item.name,
      slot: item.slot,
      slotLabel: item.slotLabel || item.slot,
      rankRequired: item.rankRequired,
    }));

    return {
      characterId: this.activeCharacterId,
      characterName: this.activeCharacterName,
      classId: player.classId,
      className: player.className,
      role: player.role,
      honor: {
        rank: honor.rank,
        lifetimeHonor: honor.lifetimeHonor,
        honorPoints: honor.honorPoints,
        talentPoints: honor.talentPoints,
      },
      rating: {
        rating: rating.rating,
        peakRating: rating.peakRating,
        matches: rating.matches,
      },
      talents: {
        spentPoints: talentStatus.spentPoints,
        availablePoints: talentStatus.availablePoints,
        branchPoints: { ...(talentStatus.branchPoints || {}) },
        entries: talents,
      },
      gear: {
        setName: gearStatus.set?.name || null,
        setPieces: gearStatus.setPieces || 0,
        activeSetBonuses: (gearStatus.activeSetBonuses || []).map(bonus => ({
          pieces: bonus.pieces,
          description: bonus.description,
        })),
        equipped: equippedGear,
      },
      stats: {
        maxHealth: player.maxHealth,
        moveSpeed: player.moveSpeed,
        hitChance: player.hitChance,
        critChance: player.critChance,
        dodgeChance: player.dodgeChance,
        baseDamageReduction: player.baseDamageReduction,
      },
      resource: {
        type: player.resource.type,
        max: player.resource.max,
        regenPerSecond: player.resource.regenPerSecond,
      },
      spells: player.spells.map(spell => ({
        id: spell.id,
        name: spell.name,
        resourceCost: spell.resourceCost || 0,
        castMs: spell.castMs || 0,
        cooldownMs: spell.cooldownMs || 0,
        range: spell.range || 0,
      })),
    };
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
    this.player.targetId = null;

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
    this.aiMovementEvents = [];
    this.aiMovementEventsDropped = 0;
    this.aiMovementSamples = [];
    this.aiMovementSamplesDropped = 0;
    this.aiMovementTraceState = new Map();
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

    // Tab always cycles living enemies, regardless of the player's role.
    // F1/F2/F3 remain the dedicated party-target controls for healers.
    const candidates = this.actors
      .filter(actor =>
        actor.alive
        && actor.team !== this.player.team
      )
      .map(actor => ({
        actor,
        distance: Math.hypot(actor.x - this.player.x, actor.y - this.player.y),
      }))
      .sort((a, b) => a.distance - b.distance);

    if (candidates.length === 0) return;

    const currentIndex = candidates.findIndex(item =>
      item.actor.id === this.player.targetId
    );

    const nextIndex = currentIndex >= 0
      ? (currentIndex + 1) % candidates.length
      : 0;

    this.selectTarget(candidates[nextIndex].actor.id);
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
      .map(actor => ({
        actor,
        score: this.renderer.targetHitScore(actor, this, x, y),
      }))
      .filter(item => item.score !== null)
      .sort((a, b) => a.score - b.score);

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
    this.simulationAccumulatorMs = 0;
    requestAnimationFrame(time => this.loop(time));
  }

  updatePixiSimulation(rawDeltaMs) {
    const raw = Math.max(0, Number(rawDeltaMs) || 0);
    const accepted = Math.min(PIXI_MAX_CATCHUP_MS, raw);

    this.simulationTiming.rawElapsedMs += raw;
    this.simulationTiming.maxRawFrameMs = Math.max(
      this.simulationTiming.maxRawFrameMs,
      raw,
    );

    if (raw > accepted) {
      this.simulationTiming.droppedMs += raw - accepted;
    }

    this.simulationAccumulatorMs += accepted;

    // Recover short render hitches, but never allow a tab switch/debugger pause
    // to produce seconds of AI/combat updates in a single visual frame.
    if (this.simulationAccumulatorMs > PIXI_MAX_CATCHUP_MS) {
      this.simulationTiming.droppedMs +=
        this.simulationAccumulatorMs - PIXI_MAX_CATCHUP_MS;
      this.simulationAccumulatorMs = PIXI_MAX_CATCHUP_MS;
    }

    let steps = 0;
    while (
      this.simulationAccumulatorMs + 0.0001 >= PIXI_FIXED_STEP_MS
      && steps < PIXI_MAX_STEPS_PER_FRAME
    ) {
      this.update(PIXI_FIXED_STEP_MS);
      this.simulationAccumulatorMs -= PIXI_FIXED_STEP_MS;
      this.simulationTiming.simulatedMs += PIXI_FIXED_STEP_MS;
      steps += 1;
    }

    this.simulationTiming.lastStepCount = steps;
  }

  loop(time) {
    const rawDeltaMs = Math.max(0, time - this.lastFrame);
    this.lastFrame = time;

    if (
      this.renderer?.mode === "pixi"
      || this.renderer?.mode === "babylon"
    ) {
      this.updatePixiSimulation(rawDeltaMs);
    } else {
      // Keep the normal Canvas URL behavior untouched while GPU renderer paths
      // use the fixed simulation clock.
      const deltaMs = Math.min(50, rawDeltaMs);
      this.update(deltaMs);
    }

    try {
      this.renderer.render(this);
    } catch (error) {
      console.error("[Renderer] frame failed; attempting recovery.", error);
      this.renderer.recoverFromRenderError?.(error, this);
    }

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
      this.movement.updateActiveDashes(this.actors, deltaMs, this.arena);
      this.movement.resolveActorSeparation(
        this.actors,
        deltaSeconds,
        this.arena,
        this.player?.id,
      );
      this.recordAiMovementSample(deltaMs);
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
        name: this.combatantLabel(actor),
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
    this.lastRatingAward = this.rating.award(result);
    this.ui.hideDeathForfeit();
    this.ui.setResult(result, this.lastHonorAward, this.lastRatingAward);
    this.log(message);

    if (this.lastHonorAward) {
      const ratingText = this.lastRatingAward
        ? " · Rating "
          + (this.lastRatingAward.change >= 0 ? "+" : "")
          + this.lastRatingAward.change
          + " → " + this.lastRatingAward.after
        : "";

      this.log(
        "+" + this.lastHonorAward.honor + " Honor · Rank "
        + this.lastHonorAward.rankAfter
        + ratingText
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

    if (source?.control === "player") {
      this.ai?.observePlayerCc?.(source, target, kind);
    }
  }

  addFloatingText(actor, text, type) {
    const isHeal = type === "heal" || type === "crit-heal";
    let laneOffset = 0;

    if (isHeal) {
      const recentHealCount = this.floatingTexts.filter(item =>
        item.actorId === actor.id
        && (item.type === "heal" || item.type === "crit-heal")
        && item.remainingMs > 620
      ).length;

      // Keep the exact same green heal text, but avoid fresh heals being drawn
      // directly on top of one another during Atonement + normal-heal bursts.
      laneOffset = Math.min(2, recentHealCount) * 14;
    }

    this.floatingTexts.push({
      actorId: actor.id,
      x: actor.x,
      y: actor.y - actor.radius - 8 - laneOffset,
      text,
      type,
      totalMs: 850,
      remainingMs: 850,
    });
  }

  addActionFloatingText(source, actor, text, type) {
    if (!source || source.id !== this.player?.id) return;
    this.addFloatingText(actor, text, type);
  }

  combatantLabel(actor) {
    if (!actor) return "Unknown";

    const ambiguous = this.actors.some(candidate =>
      candidate.id !== actor.id
      && candidate.team !== actor.team
      && candidate.name === actor.name
    );

    if (!ambiguous) return actor.name;
    return (actor.team === "friendly" ? "Friendly " : "Enemy ") + actor.name;
  }

  log(text) {
    this.runLog.push({ time: this.elapsedSeconds, text });
    this.ui?.addLog(text);
  }

  buildRunReport() {
    return buildMatchReport(this);
  }

  recordAiMovementEvent(actor, event = {}) {
    if (!actor || actor.control === "player") return;

    const intent = actor.aiIntent || null;
    const intentTarget = this.getActor(intent?.targetId || actor.aiTargetId);
    const plan = this.ai?.teamPlan?.(actor.team) || null;

    const entry = {
      time: Number(this.elapsedSeconds) || 0,
      type: event.type || "movement",
      actorId: actor.id,
      actorName: actor.name,
      className: actor.className,
      classId: actor.classId,
      role: actor.role,
      team: actor.team,
      position: event.position || { x: actor.x, y: actor.y },
      intentType: intent?.type || null,
      intentTargetName: intent?.targetName
        || (intentTarget ? this.combatantLabel(intentTarget) : null),
      intentReason: intent?.reason || null,
      teamPlanState: plan?.state || null,
      teamPlanTargetName: plan?.primaryTargetName || null,
      ...event,
    };

    this.aiMovementEvents.push(entry);

    const maxEvents = 2400;
    if (this.aiMovementEvents.length > maxEvents) {
      const removeCount = this.aiMovementEvents.length - maxEvents;
      this.aiMovementEvents.splice(0, removeCount);
      this.aiMovementEventsDropped += removeCount;
    }
  }

  recordAiMovementSample(deltaMs) {
    const now = Number(this.elapsedSeconds) || 0;
    const sampleEveryMs = 200;
    const windowMs = 600;

    for (const actor of this.actors) {
      if (!actor?.alive || actor.control === "player") continue;

      let trace = this.aiMovementTraceState.get(actor.id);
      if (!trace) {
        trace = {
          lastX: actor.x,
          lastY: actor.y,
          lastDx: 0,
          lastDy: 0,
          sampleMs: 0,
          windowMs: 0,
          windowStartX: actor.x,
          windowStartY: actor.y,
          pathDistance: 0,
          reversals: 0,
          lastJitterAt: -Infinity,
          lastStallAt: -Infinity,
        };
        this.aiMovementTraceState.set(actor.id, trace);
      }

      const dx = actor.x - trace.lastX;
      const dy = actor.y - trace.lastY;
      const distanceMoved = Math.hypot(dx, dy);
      const previousDistance = Math.hypot(trace.lastDx, trace.lastDy);

      if (distanceMoved > .08 && previousDistance > .08) {
        const dot =
          (dx * trace.lastDx + dy * trace.lastDy)
          / Math.max(.0001, distanceMoved * previousDistance);
        if (dot < -.55) trace.reversals += 1;
      }

      trace.pathDistance += distanceMoved;
      trace.windowMs += deltaMs;
      trace.sampleMs += deltaMs;

      const target = this.getActor(actor.aiTargetId);
      const targetDistance = target?.alive
        ? Math.hypot(target.x - actor.x, target.y - actor.y)
        : null;
      const healer = actor.role === "caster"
        ? this.ai?.getTeamHealer?.(actor)
        : null;
      const healerDistance = healer?.alive
        ? Math.hypot(healer.x - actor.x, healer.y - actor.y)
        : null;
      const healerSupportRange = healer?.alive
        ? this.ai?.healerSupportRange?.(healer)
        : null;
      const healerSupported = healer?.alive
        ? this.ai?.hasHealerSupport?.(actor, healer)
        : null;
      const separation = actor.aiSeparationDelta || { x: 0, y: 0 };

      if (trace.sampleMs >= sampleEveryMs) {
        const elapsed = Math.max(.001, trace.sampleMs / 1000);
        this.aiMovementSamples.push({
          time: now,
          actorId: actor.id,
          actorName: actor.name,
          className: actor.className,
          classId: actor.classId,
          role: actor.role,
          team: actor.team,
          position: { x: actor.x, y: actor.y },
          delta: {
            x: actor.x - (Number.isFinite(trace.lastSampleX) ? trace.lastSampleX : trace.lastX),
            y: actor.y - (Number.isFinite(trace.lastSampleY) ? trace.lastSampleY : trace.lastY),
          },
          speed: Math.hypot(
            actor.x - (Number.isFinite(trace.lastSampleX) ? trace.lastSampleX : trace.lastX),
            actor.y - (Number.isFinite(trace.lastSampleY) ? trace.lastSampleY : trace.lastY),
          ) / elapsed,
          movementMode: actor.aiMovementMode || null,
          lastMove: actor.lastMove
            ? { x: actor.lastMove.x || 0, y: actor.lastMove.y || 0 }
            : { x: 0, y: 0 },
          separation: { x: separation.x || 0, y: separation.y || 0 },
          targetName: target ? this.combatantLabel(target) : null,
          targetAlive: Boolean(target?.alive),
          targetDistance,
          healerName: healer ? this.combatantLabel(healer) : null,
          healerDistance,
          healerSupportRange,
          healerSupported,
          healerSupportRecovery: Boolean(actor.aiHealerSupportRecoveryActive),
          castSpellId: actor.cast?.spellId || null,
          hardControlled: this.cc.isHardControlled(actor),
          rooted: this.cc.isRooted(actor),
          safeTurret: Boolean(actor.aiSafeTurretActive),
          manaRecovery: Boolean(actor.aiManaRecoveryActive),
          collisionActive: Boolean(actor.aiObstacleContactActive),
          collisionBlocker: actor.aiCollisionBlocker || null,
          avoidanceSign: actor.aiCollisionRouteSign || actor.aiAvoidanceSign || 0,
          activeDash: Boolean(actor.activeDash),
          intentType: actor.aiIntent?.type || null,
          intentReason: actor.aiIntent?.reason || null,
        });

        trace.lastSampleX = actor.x;
        trace.lastSampleY = actor.y;
        trace.sampleMs = 0;

        const maxSamples = 3600;
        if (this.aiMovementSamples.length > maxSamples) {
          const removeCount = this.aiMovementSamples.length - maxSamples;
          this.aiMovementSamples.splice(0, removeCount);
          this.aiMovementSamplesDropped += removeCount;
        }
      }

      if (trace.windowMs >= windowMs) {
        const netDistance = Math.hypot(
          actor.x - trace.windowStartX,
          actor.y - trace.windowStartY,
        );
        const lastMoveMagnitude = Math.hypot(
          Number(actor.lastMove?.x) || 0,
          Number(actor.lastMove?.y) || 0,
        );
        const separationDistance = Math.hypot(
          Number(separation.x) || 0,
          Number(separation.y) || 0,
        );

        const jittering =
          trace.reversals >= 5
          && trace.pathDistance >= 3.0
          && netDistance <= Math.max(4.0, trace.pathDistance * .34);

        if (jittering && now - trace.lastJitterAt >= .8) {
          this.recordAiMovementEvent(actor, {
            type: actor.aiObstacleContactActive
              ? "movement-jitter"
              : "open-field-jitter",
            position: { x: actor.x, y: actor.y },
            pathDistance: trace.pathDistance,
            netDistance,
            reversals: trace.reversals,
            movementMode: actor.aiMovementMode || null,
            lastMove: actor.lastMove
              ? { x: actor.lastMove.x || 0, y: actor.lastMove.y || 0 }
              : { x: 0, y: 0 },
            separation: { x: separation.x || 0, y: separation.y || 0 },
            targetName: target ? this.combatantLabel(target) : null,
            targetAlive: Boolean(target?.alive),
            targetDistance,
            healerName: healer ? this.combatantLabel(healer) : null,
            healerDistance,
            healerSupportRange,
            healerSupported,
            healerSupportRecovery: Boolean(actor.aiHealerSupportRecoveryActive),
            castSpellId: actor.cast?.spellId || null,
            safeTurret: Boolean(actor.aiSafeTurretActive),
            manaRecovery: Boolean(actor.aiManaRecoveryActive),
            collisionActive: Boolean(actor.aiObstacleContactActive),
          });
          trace.lastJitterAt = now;
        }

        const stalled =
          !actor.cast
          && !this.cc.isHardControlled(actor)
          && !this.cc.isRooted(actor)
          && !actor.activeDash
          && lastMoveMagnitude > .25
          && trace.pathDistance < 1.2;

        const liveEnemies = this.actors.some(candidate =>
          candidate?.alive && candidate.team !== actor.team
        );
        const deadTargetIdle =
          liveEnemies
          && !target?.alive
          && !actor.cast
          && !this.cc.isHardControlled(actor)
          && !this.cc.isRooted(actor)
          && !actor.activeDash
          && trace.pathDistance < 1.2;

        if (deadTargetIdle && now - trace.lastStallAt >= 1.2) {
          this.recordAiMovementEvent(actor, {
            type: "dead-target-idle",
            position: { x: actor.x, y: actor.y },
            pathDistance: trace.pathDistance,
            netDistance,
            reversals: trace.reversals,
            movementMode: actor.aiMovementMode || null,
            lastMove: actor.lastMove
              ? { x: actor.lastMove.x || 0, y: actor.lastMove.y || 0 }
              : { x: 0, y: 0 },
            targetName: target ? this.combatantLabel(target) : null,
            targetAlive: Boolean(target?.alive),
            healerName: healer ? this.combatantLabel(healer) : null,
            healerDistance,
            healerSupportRange,
            healerSupported,
            healerSupportRecovery: Boolean(actor.aiHealerSupportRecoveryActive),
          });
          trace.lastStallAt = now;
        } else if (stalled && now - trace.lastStallAt >= 1.2) {
          this.recordAiMovementEvent(actor, {
            type: actor.aiObstacleContactActive
              ? "movement-stall"
              : "open-field-stall",
            position: { x: actor.x, y: actor.y },
            pathDistance: trace.pathDistance,
            netDistance,
            reversals: trace.reversals,
            lastMove: actor.lastMove
              ? { x: actor.lastMove.x || 0, y: actor.lastMove.y || 0 }
              : { x: 0, y: 0 },
            separation: { x: separation.x || 0, y: separation.y || 0 },
            separationDistance,
            targetName: target ? this.combatantLabel(target) : null,
            targetAlive: Boolean(target?.alive),
            targetDistance,
            healerName: healer ? this.combatantLabel(healer) : null,
            healerDistance,
            healerSupportRange,
            healerSupported,
            healerSupportRecovery: Boolean(actor.aiHealerSupportRecoveryActive),
            safeTurret: Boolean(actor.aiSafeTurretActive),
            manaRecovery: Boolean(actor.aiManaRecoveryActive),
            collisionActive: Boolean(actor.aiObstacleContactActive),
          });
          trace.lastStallAt = now;
        }

        trace.windowMs = 0;
        trace.windowStartX = actor.x;
        trace.windowStartY = actor.y;
        trace.pathDistance = 0;
        trace.reversals = 0;
      }

      trace.lastX = actor.x;
      trace.lastY = actor.y;
      trace.lastDx = dx;
      trace.lastDy = dy;
    }
  }

  buildAiMovementReport() {
    return buildAiMovementReport(this);
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
    this.rating = new RatingSystem(character.id);
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

  setArena(arena) {
    if (!arena) return;

    this.arena = arena;
    if (this.renderer) this.renderer.arena = arena;
  }

  startPreparedMatch(characterConfigs, arena = null) {
    this.characterConfigs = this.prepareAiProgressionConfigs(characterConfigs);
    if (arena) this.setArena(arena);
    this.ui?.cancelBindingCapture?.();
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
    this.player.targetId = null;

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
    this.matchLoadoutSnapshot = this.waitingForStart
      ? null
      : this.capturePlayerLoadoutSnapshot();
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
