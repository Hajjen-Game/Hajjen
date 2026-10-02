import { hasLineOfSight } from "../../../../arena3v3/src/core/LineOfSight.js";
import { distance, normalize, stableHash } from "../../../../arena3v3/src/core/utils.js";
import { buildArenaState, arenaStateSignature } from "../../../../arena3v3/src/systems/ArenaState.js";

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export class AISystem {
  constructor(game, movementSystem) {
    this.game = game;
    this.movement = movementSystem;
    this.thinkTimers = new Map();
    this.teamPlanTimer = 0;
    this.teamPlans = {
      friendly: this.createTeamPlan("friendly"),
      enemy: this.createTeamPlan("enemy"),
    };
    this.teamBurstReads = {
      friendly: null,
      enemy: null,
    };
    this.arenaStates = {
      friendly: null,
      enemy: null,
    };
    this.arenaStateHistory = {
      friendly: [],
      enemy: [],
    };
    this.playerIntentModel = {
      targetScores: {},
      targetId: null,
      targetName: null,
      confidence: 0,
      lastTargetId: null,
      targetHoldSeconds: 0,
      lastActionAt: -Infinity,
      burstUntil: 0,
      setupUntil: 0,
      recoverUntil: 0,
      signals: {
        offensive: 0,
        setup: 0,
        defensive: 0,
      },
      history: [],
    };
  }

  createTeamPlan(team) {
    return {
      team,
      state: "PRESSURE",
      primaryTargetId: null,
      primaryTargetName: null,
      confidence: 0,
      coordinationStrength: 1,
      source: "forming",
      reason: "forming initial read",
      changedAt: 0,
      minHoldUntil: 0,
      revision: 0,
      history: [],
    };
  }

  teamPlan(team) {
    return this.teamPlans?.[team] || null;
  }

  teamCoordinationStrength(team) {
    if (team === this.game.player?.team) return 1;

    const ratingState = this.game.rating?.status?.();
    const rawRating = Number(ratingState?.rating);
    if (!Number.isFinite(rawRating)) return 1;

    const rating = Math.max(0, rawRating);

    if (rating <= 1200) return 0;
    if (rating < 1500) return ((rating - 1200) / 300) * 0.20;
    if (rating < 1750) return 0.20 + ((rating - 1500) / 250) * 0.25;
    if (rating < 2000) return 0.45 + ((rating - 1750) / 250) * 0.35;
    if (rating < 2200) return 0.80 + ((rating - 2000) / 200) * 0.20;
    return 1;
  }

  individualCognitionStrength(actor) {
    if (!actor || actor.team === this.game.player?.team) return 1;

    const ratingState = this.game.rating?.status?.();
    const rawRating = Number(ratingState?.rating);
    if (!Number.isFinite(rawRating)) return 1;

    const rating = Math.max(0, rawRating);

    // Advanced individual arena reads are intentionally almost absent at the
    // beginner floor. Basic rotations, movement, simple peels and defensives
    // stay intact; smarter target swaps, finishing reads, OOM hunting,
    // interrupts and opponent modelling ramp in with Rating.
    if (rating <= 1200) return 0.08;
    if (rating < 1500) return 0.08 + ((rating - 1200) / 300) * 0.27;
    if (rating < 1750) return 0.35 + ((rating - 1500) / 250) * 0.25;
    if (rating < 2000) return 0.60 + ((rating - 1750) / 250) * 0.30;
    if (rating < 2200) return 0.90 + ((rating - 2000) / 200) * 0.10;
    return 1;
  }

  beginnerTargetDispersionStrength(actor) {
    if (!actor || actor.team === this.game.player?.team) return 0;

    const ratingState = this.game.rating?.status?.();
    const rawRating = Number(ratingState?.rating);
    if (!Number.isFinite(rawRating)) return 0;

    const rating = Math.max(0, rawRating);

    // At the beginner floor, enemy DPS should feel like individuals rather
    // than accidentally acting like a premade just because their deterministic
    // target priorities point at the same unit. The protection fades smoothly:
    // 1000-1200 = strong split pressure, 1500 = partial, 2000+ = none.
    if (rating <= 1200) return 1;
    if (rating < 1500) return 1 - ((rating - 1200) / 300) * 0.45;
    if (rating < 1750) return 0.55 - ((rating - 1500) / 250) * 0.30;
    if (rating < 2000) return 0.25 - ((rating - 1750) / 250) * 0.25;
    return 0;
  }

  arenaState(teamOrActor) {
    const team = typeof teamOrActor === "string"
      ? teamOrActor
      : teamOrActor?.team;
    if (!team) return null;

    const next = buildArenaState(this.game, team);
    this.arenaStates[team] = next;
    return next;
  }

  updateArenaStateAwareness() {
    for (const team of ["friendly", "enemy"]) {
      const previous = this.arenaStates[team];
      const previousSignature = arenaStateSignature(previous);
      const next = buildArenaState(this.game, team);
      const nextSignature = arenaStateSignature(next);

      if (!previous) {
        this.arenaStates[team] = next;
        this.arenaStateHistory[team].push({
          at: this.game.elapsedSeconds,
          label: next.label,
          mode: next.mode,
          rolePattern: next.rolePattern,
          reason: "initial state",
        });
        continue;
      }

      if (previousSignature === nextSignature) {
        this.arenaStates[team] = next;
        continue;
      }

      this.arenaStates[team] = next;
      this.arenaStateHistory[team].push({
        at: this.game.elapsedSeconds,
        label: next.label,
        mode: next.mode,
        rolePattern: next.rolePattern,
        reason: previous.label + " -> " + next.label,
      });
      this.arenaStateHistory[team] = this.arenaStateHistory[team].slice(-12);

      // A death changes the arena win condition immediately. Do not let old
      // pressure/recovery intents linger for several seconds after the matchup
      // has become 3v2, 2v2, 2v1, 1v2, etc.
      this.teamPlanTimer = 0;
      this.teamBurstReads[team] = null;

      for (const actor of this.game.actors) {
        if (!actor.alive || actor.team !== team || actor.control === "player") continue;

        if (actor.aiIntent) {
          this.closeIntent(
            actor,
            "arena state changed " + previous.label + " -> " + next.label,
          );
        }

        this.thinkTimers.set(actor.id, 0);
        actor.aiManaRecoveryActive = false;
        actor.aiManaRecoveryPhaseMode = null;
        actor.aiSafeTurretActive = false;
        actor.aiArenaStateTransitions = (actor.aiArenaStateTransitions || 0) + 1;
      }
    }
  }

  recordPlayerIntentSignal(type, target = null, weight = 0) {
    const model = this.playerIntentModel;
    if (!model) return;

    const now = this.game.elapsedSeconds;

    if (target?.alive && target.team !== this.game.player.team && weight > 0) {
      const entry = model.targetScores[target.id] || {
        score: 0,
        lastEvidenceAt: now,
      };
      entry.score = Math.min(4, entry.score + weight);
      entry.lastEvidenceAt = now;
      model.targetScores[target.id] = entry;
      model.lastActionAt = now;
    }

    if (type === "offensive") model.signals.offensive += 1;
    if (type === "setup") model.signals.setup += 1;
    if (type === "defensive") model.signals.defensive += 1;
  }

  observePlayerSpell(caster, target, spell) {
    if (caster?.control !== "player" || !spell) return;

    const effects = spell.effects || [];
    const kinds = new Set(effects.map(effect => effect.kind));
    const targetIsEnemy = Boolean(
      target?.alive && target.team !== caster.team
    );
    const offensiveKinds = new Set([
      "damage",
      "chainDamage",
      "dot",
      "healingReduction",
      "gapClose",
    ]);

    const offensive = targetIsEnemy
      && (
        spell.offensiveCooldown
        || [...kinds].some(kind => offensiveKinds.has(kind))
      );

    if (offensive) {
      const roleWeight = caster.role === "healer" ? 0.50 : 0.95;
      const burstWeight = spell.offensiveCooldown ? 0.55 : 0;
      this.recordPlayerIntentSignal(
        "offensive",
        target,
        roleWeight + burstWeight,
      );

      if (spell.offensiveCooldown) {
        this.playerIntentModel.burstUntil = Math.max(
          this.playerIntentModel.burstUntil,
          this.game.elapsedSeconds + 3.2,
        );
      }
    }

    const defensive = kinds.has("damageReduction")
      && target?.team === caster.team;

    if (defensive) {
      this.recordPlayerIntentSignal("defensive", null, 0);
      this.playerIntentModel.recoverUntil = Math.max(
        this.playerIntentModel.recoverUntil,
        this.game.elapsedSeconds + 2.6,
      );
    }
  }

  observePlayerCc(source, target, kind) {
    if (
      source?.control !== "player"
      || !target?.alive
      || target.team === source.team
    ) return;

    const hardSetup = ["fear", "incapacitate", "stun"].includes(kind);
    if (!hardSetup) return;

    if (target.role === "healer") {
      this.recordPlayerIntentSignal("setup", null, 0);
      this.playerIntentModel.setupUntil = Math.max(
        this.playerIntentModel.setupUntil,
        this.game.elapsedSeconds + 4.0,
      );
    }
  }

  updatePlayerIntentModel(deltaSeconds) {
    const player = this.game.player;
    const model = this.playerIntentModel;
    if (!player || !model) return;

    const now = this.game.elapsedSeconds;

    for (const [targetId, entry] of Object.entries(model.targetScores)) {
      entry.score = Math.max(0, entry.score - deltaSeconds * 0.12);
      if (entry.score <= 0.02 || now - entry.lastEvidenceAt > 12) {
        delete model.targetScores[targetId];
      }
    }

    const selected = this.game.getActor(player.targetId);
    const selectedEnemy = selected?.alive && selected.team !== player.team
      ? selected
      : null;

    if (player.role !== "healer" && selectedEnemy) {
      if (model.lastTargetId === selectedEnemy.id) {
        model.targetHoldSeconds += deltaSeconds;
      } else {
        model.lastTargetId = selectedEnemy.id;
        model.targetHoldSeconds = 0;
      }

      if (model.targetHoldSeconds > 1.25) {
        const entry = model.targetScores[selectedEnemy.id] || {
          score: 0,
          lastEvidenceAt: now,
        };
        entry.score = Math.min(4, entry.score + deltaSeconds * 0.075);
        entry.lastEvidenceAt = now;
        model.targetScores[selectedEnemy.id] = entry;
      }
    } else {
      model.lastTargetId = null;
      model.targetHoldSeconds = 0;
    }

    const candidates = Object.entries(model.targetScores)
      .map(([targetId, entry]) => ({
        target: this.game.getActor(targetId),
        score: entry.score,
      }))
      .filter(item =>
        item.target?.alive && item.target.team !== player.team
      )
      .sort((a, b) => b.score - a.score);

    const top = candidates[0] || null;
    const previousTargetId = model.targetId;
    const previousConfidence = model.confidence;

    if (top && top.score >= 0.45) {
      model.targetId = top.target.id;
      model.targetName = this.game.combatantLabel(top.target);
      model.confidence = clamp01((top.score - 0.35) / 1.85);
    } else {
      model.targetId = null;
      model.targetName = null;
      model.confidence = 0;
    }

    if (
      model.targetId
      && (
        model.targetId !== previousTargetId
        || (
          previousConfidence < 0.55
          && model.confidence >= 0.55
        )
      )
    ) {
      model.history.push({
        at: now,
        targetId: model.targetId,
        targetName: model.targetName,
        confidence: model.confidence,
        reason: player.role === "healer"
          ? "repeated offensive support"
          : "sustained target pressure",
      });
      model.history = model.history.slice(-18);
    }
  }

  teamConsensus(team) {
    const enemies = this.game.actors.filter(actor =>
      actor.alive && actor.team !== team
    );
    const members = this.game.actors.filter(actor =>
      actor.alive && actor.team === team
    );
    const scores = new Map();

    const add = (target, amount) => {
      if (!target?.alive || target.team === team) return;
      scores.set(target.id, (scores.get(target.id) || 0) + amount);
    };

    for (const member of members) {
      if (member.role === "healer" || member.control === "player") continue;

      const target = this.game.getActor(
        member.aiIntent?.targetId || member.aiTargetId
      );

      let weight = 1;
      if (member.aiIntent?.type === "FINISH") weight += 0.45;
      if (member.aiIntent?.type === "PRESSURE_HEALER") weight += 0.25;
      if (member.aiIntent?.type === "TEAM_BURST") weight += 0.35;
      add(target, weight);
    }

    if (team === this.game.player?.team && this.game.player?.alive) {
      const model = this.playerIntentModel;
      const playerTarget = this.game.getActor(model.targetId);

      if (playerTarget?.alive && model.confidence > 0) {
        const playerWeight = this.game.player.role === "healer"
          ? 0.35 + model.confidence * 0.35
          : 1.10 + model.confidence * 0.85;
        add(playerTarget, playerWeight);
      }
    }

    for (const enemy of enemies) {
      add(enemy, Math.max(0, 0.34 - enemy.healthPct * 0.22));
    }

    const ranked = [...scores.entries()]
      .map(([id, score]) => ({
        target: this.game.getActor(id),
        score,
      }))
      .filter(item => item.target?.alive)
      .sort((a, b) => b.score - a.score);

    const top = ranked[0] || null;
    const total = ranked.reduce((sum, item) => sum + item.score, 0);

    return {
      target: top?.target || null,
      confidence: top
        ? clamp01(0.32 + (top.score / Math.max(0.01, total)) * 0.58)
        : 0,
      scores: ranked,
    };
  }

  setTeamPlan(team, state, target, confidence, source, reason) {
    const plan = this.teamPlan(team);
    if (!plan) return;

    const now = this.game.elapsedSeconds;
    const targetId = target?.id || null;
    const samePlan = plan.state === state && plan.primaryTargetId === targetId;

    if (samePlan) {
      plan.confidence = confidence;
      plan.source = source;
      plan.reason = reason;
      plan.primaryTargetName = target
        ? this.game.combatantLabel(target)
        : null;
      return;
    }

    const currentTarget = this.game.getActor(plan.primaryTargetId);
    const urgent = ["RECOVER", "PEEL"].includes(state)
      || state === "BURST"
      || !currentTarget?.alive;

    if (now < plan.minHoldUntil && !urgent) return;

    plan.state = state;
    plan.primaryTargetId = targetId;
    plan.primaryTargetName = target
      ? this.game.combatantLabel(target)
      : null;
    plan.confidence = confidence;
    plan.source = source;
    plan.reason = reason;
    plan.changedAt = now;
    plan.minHoldUntil = now + (
      ["RECOVER", "PEEL"].includes(state) ? 1.8 : 2.2
    );
    plan.revision += 1;
    plan.history.push({
      at: now,
      revision: plan.revision,
      state,
      targetId,
      targetName: plan.primaryTargetName,
      confidence,
      source,
      reason,
    });
    plan.history = plan.history.slice(-30);
  }

  updateTeamPlan(team) {
    const plan = this.teamPlans?.[team] || null;
    const coordinationStrength = this.teamCoordinationStrength(team);

    if (plan) plan.coordinationStrength = coordinationStrength;

    if (team !== this.game.player?.team && coordinationStrength <= 0) {
      if (plan) {
        plan.state = "INDIVIDUAL";
        plan.primaryTargetId = null;
        plan.primaryTargetName = null;
        plan.confidence = 0;
        plan.source = "difficulty";
        plan.reason = "enemy Team Plan disabled at low Rating";
      }
      this.teamBurstReads[team] = null;
      return;
    }

    const members = this.game.actors.filter(actor =>
      actor.alive && actor.team === team
    );
    const enemies = this.game.actors.filter(actor =>
      actor.alive && actor.team !== team
    );
    if (!members.length || !enemies.length) return;

    const arenaState = this.arenaState(team);
    const consensus = this.teamConsensus(team);
    const healer = members.find(actor => actor.role === "healer") || null;
    const enemyHealer = enemies.find(actor => actor.role === "healer") || null;
    const playerLed = team === this.game.player?.team
      && this.game.player?.alive
      && this.playerIntentModel.targetId === consensus.target?.id
      && this.playerIntentModel.confidence >= 0.45;

    const healerThreat = healer
      ? this.meleeThreatTo(healer, healer.config.ai.peelThreatRange ?? 135)
      : null;
    const healerHealthLow = Boolean(healer && healer.healthPct < 0.40);
    const healerResourceLow = Boolean(
      healer
      && healer.resource.type === "mana"
      && healer.resourcePct < 0.14
    );
    const safeCleanup = Boolean(
      arenaState?.cleanup
      && arenaState.enemyAlive === 1
      && !healerThreat
      && members.every(member => member.healthPct > 0.34)
    );
    const healerLow = healerHealthLow || (healerResourceLow && !safeCleanup);

    const now = this.game.elapsedSeconds;

    let state = "PRESSURE";
    let reason = playerLed
      ? "player intent suggests focus"
      : "team pressure consensus";
    let source = playerLed ? "player-led" : "ai-consensus";

    const friendlyPlayerSignal = team === this.game.player?.team;
    const playerSetup = friendlyPlayerSignal
      && this.playerIntentModel.setupUntil > this.game.elapsedSeconds;
    const playerBurst = friendlyPlayerSignal
      && this.playerIntentModel.burstUntil > this.game.elapsedSeconds;
    const playerRecover = friendlyPlayerSignal
      && this.playerIntentModel.recoverUntil > this.game.elapsedSeconds;

    if (safeCleanup && consensus.target) {
      state = "BURST";
      reason = arenaState.label + " cleanup: close out isolated "
        + (consensus.target.role || "target");
      source = "arena-state";
    } else if (healerLow || (playerRecover && !safeCleanup)) {
      state = "RECOVER";
      reason = healerLow
        ? "team healer under survival/resource pressure"
        : "player defensive signals stabilization";
      source = playerRecover ? "player-signal" : "team-read";
    } else if (healerThreat && healer.healthPct < 0.72) {
      state = "PEEL";
      reason = "melee pressure on team healer";
      source = "team-read";
    } else if (
      playerSetup
      || playerBurst
      || (enemyHealer && this.game.cc.isHardControlled(enemyHealer))
      || consensus.target?.healthPct < 0.38
    ) {
      state = "BURST";
      if (playerSetup) {
        reason = "player controlled enemy healer";
        source = "player-signal";
      } else if (playerBurst) {
        reason = "player offensive cooldown signal";
        source = "player-signal";
      } else if (enemyHealer && this.game.cc.isHardControlled(enemyHealer)) {
        reason = "enemy healer controlled";
        source = "team-read";
      } else {
        reason = "primary target in finishing range";
        source = playerLed ? "player-led" : "team-read";
      }
    } else if (arenaState?.disadvantage) {
      state = "PRESSURE";
      reason = arenaState.label + " underdog: create a kill or control window";
      source = "arena-state";
    } else if (arenaState?.advantage) {
      state = "PRESSURE";
      reason = arenaState.label + " advantage: maintain pressure";
      source = "arena-state";
    }

    const burstCandidate = (
      team !== this.game.player?.team
      && state === "BURST"
      && source === "team-read"
    );

    if (burstCandidate) {
      const burstKey = reason + ":" + (consensus.target?.id || "none");
      const existingRead = this.teamBurstReads[team];

      if (!existingRead || existingRead.key !== burstKey) {
        this.teamBurstReads[team] = { key: burstKey, firstSeenAt: now };
      }

      const read = this.teamBurstReads[team];
      const reactionDelay = (1 - coordinationStrength) * 2.4;

      if (now - read.firstSeenAt < reactionDelay) {
        state = "PRESSURE";
        source = "ai-consensus";
        reason = "team still reading burst window";
      }
    } else if (team !== this.game.player?.team) {
      this.teamBurstReads[team] = null;
    }

    const effectiveConfidence = team === this.game.player?.team
      ? consensus.confidence
      : consensus.confidence * coordinationStrength;

    this.setTeamPlan(
      team,
      state,
      consensus.target,
      effectiveConfidence,
      source,
      reason,
    );
  }

  updateTeamCoordination(deltaSeconds) {
    this.updatePlayerIntentModel(deltaSeconds);
    this.teamPlanTimer -= deltaSeconds;
    if (this.teamPlanTimer > 0) return;

    this.teamPlanTimer = 0.45;
    this.updateTeamPlan("friendly");
    this.updateTeamPlan("enemy");
  }

  considerTeamPlanTarget(actor, enemies, currentIntent = null) {
    const plan = this.teamPlan(actor.team);
    if (
      !plan
      || !["PRESSURE", "BURST"].includes(plan.state)
      || plan.confidence < 0.38
    ) return null;

    const target = enemies.find(enemy =>
      enemy.id === plan.primaryTargetId
      && enemy.alive
      && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, enemy)
    );
    if (!target) return null;

    if (currentIntent?.targetId === target.id) return target;

    if (
      currentIntent
      && ["FINISH", "PRESSURE_HEALER"].includes(currentIntent.type)
      && this.game.elapsedSeconds - currentIntent.startedAt < 2.0
    ) return null;

    if (
      currentIntent
      && this.game.elapsedSeconds - currentIntent.startedAt < 1.45
    ) return null;

    const stickiness = this.behavior(actor, "targetStickiness", 0.58);
    const skill = this.skill(actor);
    const playerLedBonus = plan.source === "player-led" ? 0.08 : 0;
    const burstBonus = plan.state === "BURST" ? 0.12 : 0;
    const coordinationStrength = plan.coordinationStrength ?? 1;
    const followChance = clamp01((
      0.10
      + skill * 0.30
      + plan.confidence * 0.28
      + (1 - stickiness) * 0.20
      + playerLedBonus
      + burstBonus
    ) * coordinationStrength);

    const follows = this.shouldAttempt(
      actor,
      "team-plan:" + plan.revision + ":" + target.id,
      followChance,
      1.8,
    );

    actor.aiTeamPlanUsage = actor.aiTeamPlanUsage || {
      follows: 0,
      divergences: 0,
    };

    if (!follows) {
      if (actor.aiTeamPlanLastDivergenceRevision !== plan.revision) {
        actor.aiTeamPlanUsage.divergences += 1;
        actor.aiTeamPlanLastDivergenceRevision = plan.revision;
      }
      return null;
    }

    if (actor.aiTeamPlanLastFollowRevision !== plan.revision) {
      actor.aiTeamPlanUsage.follows += 1;
      actor.aiTeamPlanLastFollowRevision = plan.revision;
    }

    this.setIntent(
      actor,
      plan.state === "BURST" ? "TEAM_BURST" : "TEAM_PRESSURE",
      target,
      "team plan · " + plan.reason,
      2.6 + stickiness * 2.2,
    );
    return target;
  }

  behaviorProfile(actor) {
    return actor?.config?.aiBehaviorProfile || null;
  }

  skill(actor) {
    return clamp01(this.behaviorProfile(actor)?.skill ?? 0.65);
  }

  behavior(actor, key, fallback = 0.5) {
    const profile = this.behaviorProfile(actor);
    if (!profile || !Number.isFinite(profile[key])) return fallback;

    const base = clamp01(profile[key]);
    const volatility = clamp01(profile.volatility ?? 0.35);
    const seed = Number(profile.seed) || stableHash(actor.id + ":behavior");
    const driftSeconds = 7 + (Math.abs(seed) % 5);
    const bucket = Math.floor(this.game.elapsedSeconds / driftSeconds);
    const raw = (stableHash(seed + ":" + key + ":" + bucket) % 10001) / 10000;
    const drift = (raw - 0.5) * 0.28 * volatility;

    return clamp01(base + drift);
  }

  decisionRoll(actor, key, bucketSeconds = 2.5) {
    const profile = this.behaviorProfile(actor);
    const seed = Number(profile?.seed) || stableHash(actor.id + ":decision");
    const bucket = Math.floor(this.game.elapsedSeconds / Math.max(0.35, bucketSeconds));
    return (stableHash(seed + ":" + key + ":" + bucket) % 10001) / 10000;
  }

  shouldAttempt(actor, key, chance, bucketSeconds = 2.5) {
    return this.decisionRoll(actor, key, bucketSeconds) < clamp01(chance);
  }

  thinkDelay(actor) {
    const skill = this.skill(actor);
    const base = 0.225 - skill * 0.105;
    const jitter = (stableHash(actor.id + ":think") % 31) / 1000;
    return Math.max(0.095, base + jitter);
  }

  ensureCognition(actor) {
    if (!actor.aiMemory) {
      actor.aiMemory = {
        observations: 0,
        targetSwaps: 0,
        previousTargetId: null,
        events: [],
        totals: {
          lowHealthSeen: 0,
          lowManaHealerSeen: 0,
          defensivesSeen: 0,
          burstsSeen: 0,
          pressureSeen: 0,
          healerCcSeen: 0,
          deathsSeen: 0,
        },
        seen: {
          lowHealth: {},
          lowMana: {},
          activeEffects: {},
          pressure: {},
          deaths: {},
          healerCc: false,
        },
      };
    }

    if (!Array.isArray(actor.aiIntentHistory)) actor.aiIntentHistory = [];
    if (!actor.aiOpponentModels) actor.aiOpponentModels = {};
    if (!actor.aiOpponentModelProcessedEvents) {
      actor.aiOpponentModelProcessedEvents = new Set();
    }
    if (!actor.aiOpponentModelUsage) {
      actor.aiOpponentModelUsage = {
        triageTargetSelections: 0,
        peelAssists: 0,
        defensiveAnticipations: 0,
      };
      actor.aiOpponentModelTriageChoiceKey = null;
    }
    if (!actor.aiTeamPlanUsage) {
      actor.aiTeamPlanUsage = {
        follows: 0,
        divergences: 0,
      };
    }
    if (!actor.aiSlowUsage) {
      actor.aiSlowUsage = {
        casts: 0,
        meleeAssists: 0,
        teammatePeels: 0,
        selfPeels: 0,
        modelAssisted: 0,
        teamAssisted: 0,
      };
    }
    return actor.aiMemory;
  }

  ensureOpponentModel(actor, enemy) {
    this.ensureCognition(actor);

    if (!actor.aiOpponentModels[enemy.id]) {
      actor.aiOpponentModels[enemy.id] = {
        enemyId: enemy.id,
        enemyName: this.game.combatantLabel(enemy),
        className: enemy.className,
        role: enemy.role,
        observations: 0,
        targetSamples: 0,
        roleSamples: {
          healer: 0,
          melee: 0,
          caster: 0,
        },
        targetSwitches: 0,
        currentTargetId: null,
        currentTargetSince: null,
        completedTargetHolds: 0,
        totalTargetHoldSeconds: 0,
        defensiveUses: 0,
        defensiveHealthTotal: 0,
        burstUses: 0,
        pressureEvents: 0,
      };
    }

    return actor.aiOpponentModels[enemy.id];
  }

  opponentModelConfidence(actor, model) {
    if (!model) return 0;

    const skill = this.skill(actor);
    const sampleProgress = clamp01(model.observations / 70);
    const skillCeiling = 0.38 + skill * 0.54;
    const cognition = this.individualCognitionStrength(actor);
    return clamp01(sampleProgress * skillCeiling * cognition);
  }

  opponentModelRead(actor, enemy) {
    const model = actor.aiOpponentModels?.[enemy?.id];
    if (!model) return null;

    const now = this.game.elapsedSeconds;
    const activeHold = model.currentTargetId && Number.isFinite(model.currentTargetSince)
      ? Math.min(12, Math.max(0, now - model.currentTargetSince))
      : 0;
    const holdCount = model.completedTargetHolds + (activeHold > 0 ? 1 : 0);
    const avgHoldSeconds = holdCount > 0
      ? (model.totalTargetHoldSeconds + activeHold) / holdCount
      : 0;
    const samples = Math.max(1, model.targetSamples);
    const confidence = this.opponentModelConfidence(actor, model);
    const trust = confidence * (0.38 + this.skill(actor) * 0.62);

    return {
      ...model,
      confidence,
      trust,
      avgHoldSeconds,
      healerFocus: model.roleSamples.healer / samples,
      meleeFocus: model.roleSamples.melee / samples,
      casterFocus: model.roleSamples.caster / samples,
      averageDefensiveHealth: model.defensiveUses > 0
        ? model.defensiveHealthTotal / model.defensiveUses
        : null,
    };
  }

  observeOpponentModels(actor) {
    const memory = this.ensureCognition(actor);
    const now = this.game.elapsedSeconds;
    const enemies = this.game.actors.filter(unit =>
      unit.alive && unit.team !== actor.team
    );

    for (const enemy of enemies) {
      const model = this.ensureOpponentModel(actor, enemy);
      model.observations += 1;

      const targetId = this.combatTargetId(enemy);
      const target = targetId ? this.game.getActor(targetId) : null;
      const observedTarget = target?.alive && target.team === actor.team
        ? target
        : null;

      if (observedTarget) {
        model.targetSamples += 1;
        if (Object.prototype.hasOwnProperty.call(model.roleSamples, observedTarget.role)) {
          model.roleSamples[observedTarget.role] += 1;
        }

        if (model.currentTargetId !== observedTarget.id) {
          if (
            model.currentTargetId
            && Number.isFinite(model.currentTargetSince)
          ) {
            model.totalTargetHoldSeconds += Math.min(
              12,
              Math.max(0, now - model.currentTargetSince),
            );
            model.completedTargetHolds += 1;
            model.targetSwitches += 1;
          }
          model.currentTargetId = observedTarget.id;
          model.currentTargetSince = now;
        }
      } else if (
        model.currentTargetId
        && Number.isFinite(model.currentTargetSince)
      ) {
        model.totalTargetHoldSeconds += Math.min(
          12,
          Math.max(0, now - model.currentTargetSince),
        );
        model.completedTargetHolds += 1;
        model.currentTargetId = null;
        model.currentTargetSince = null;
      }
    }

    // Opponent models are interpretations of remembered events, not a second
    // omniscient event stream. Process each Memory event once.
    for (const event of memory.events) {
      const key = [
        event.at,
        event.type,
        event.subjectId || "",
        event.sourceId || "",
        event.spellId || "",
      ].join(":");

      if (actor.aiOpponentModelProcessedEvents.has(key)) continue;
      actor.aiOpponentModelProcessedEvents.add(key);

      if (event.type === "enemy-defensive" || event.type === "enemy-burst") {
        const enemy = this.game.getActor(event.subjectId);
        if (!enemy || enemy.team === actor.team) continue;

        const model = this.ensureOpponentModel(actor, enemy);
        if (event.type === "enemy-defensive") {
          model.defensiveUses += 1;
          model.defensiveHealthTotal += Number.isFinite(event.value)
            ? event.value
            : enemy.healthPct;
        } else {
          model.burstUses += 1;
        }
      }

      if (event.type === "ally-pressured" && event.sourceId) {
        const enemy = this.game.getActor(event.sourceId);
        if (!enemy || enemy.team === actor.team) continue;
        this.ensureOpponentModel(actor, enemy).pressureEvents += 1;
      }
    }

    // The memory list is intentionally short. Keep the de-dupe set bounded too.
    if (actor.aiOpponentModelProcessedEvents.size > 96) {
      const recentKeys = new Set(
        memory.events.map(event => [
          event.at,
          event.type,
          event.subjectId || "",
          event.sourceId || "",
          event.spellId || "",
        ].join(":"))
      );
      actor.aiOpponentModelProcessedEvents = recentKeys;
    }
  }

  opponentPressureRead(actor, enemy, ally) {
    const read = this.opponentModelRead(actor, enemy);
    if (!read || read.targetSamples < 8) return 0;

    const roleFocus = ally.role === "healer"
      ? read.healerFocus
      : ally.role === "caster"
        ? read.casterFocus
        : read.meleeFocus;
    const persistence = clamp01((read.avgHoldSeconds - 1.5) / 5.5);

    return clamp01(
      read.trust
      * (0.35 + roleFocus * 0.65)
      * (0.45 + persistence * 0.55)
    );
  }

  rememberEvent(actor, type, data = {}) {
    const memory = this.ensureCognition(actor);
    memory.events.push({
      at: this.game.elapsedSeconds,
      type,
      ...data,
    });
    memory.events = memory.events.slice(-24);
  }

  latestMemoryEvent(actor, type, subjectId = null) {
    const events = this.ensureCognition(actor).events;
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.type !== type) continue;
      if (subjectId !== null && event.subjectId !== subjectId) continue;
      return event;
    }
    return null;
  }

  observeMemory(actor) {
    const memory = this.ensureCognition(actor);
    const now = this.game.elapsedSeconds;
    memory.observations += 1;

    const targetId = actor.aiTargetId || null;
    if (
      targetId
      && memory.previousTargetId
      && targetId !== memory.previousTargetId
    ) {
      memory.targetSwaps += 1;
    }
    if (targetId) memory.previousTargetId = targetId;

    for (const unit of this.game.actors) {
      if (unit.alive || memory.seen.deaths[unit.id]) continue;
      memory.seen.deaths[unit.id] = true;
      memory.totals.deathsSeen += 1;
      this.rememberEvent(actor, "death", {
        subjectId: unit.id,
        subjectName: this.game.combatantLabel(unit),
      });
    }

    const enemies = this.game.actors.filter(unit =>
      unit.alive && unit.team !== actor.team
    );

    const nextLowHealth = {};
    const nextLowMana = {};
    const nextEffects = {};

    for (const enemy of enemies) {
      if (enemy.healthPct <= 0.35) {
        nextLowHealth[enemy.id] = true;
        if (!memory.seen.lowHealth[enemy.id]) {
          memory.totals.lowHealthSeen += 1;
          this.rememberEvent(actor, "enemy-low-health", {
            subjectId: enemy.id,
            subjectName: this.game.combatantLabel(enemy),
            value: enemy.healthPct,
          });
        }
      }

      if (
        enemy.role === "healer"
        && enemy.resource.type === "mana"
        && enemy.resourcePct <= 0.25
      ) {
        nextLowMana[enemy.id] = true;
        if (!memory.seen.lowMana[enemy.id]) {
          memory.totals.lowManaHealerSeen += 1;
          this.rememberEvent(actor, "healer-low-mana", {
            subjectId: enemy.id,
            subjectName: this.game.combatantLabel(enemy),
            value: enemy.resourcePct,
          });
        }
      }

      for (const effect of enemy.effects || []) {
        if (!["damageReduction", "offensiveCooldown"].includes(effect.kind)) continue;

        const key = enemy.id + ":" + effect.kind + ":" + effect.spellId;
        nextEffects[key] = true;

        if (memory.seen.activeEffects[key]) continue;

        const defensive = effect.kind === "damageReduction";
        if (defensive) memory.totals.defensivesSeen += 1;
        else memory.totals.burstsSeen += 1;

        const source = this.game.getActor(effect.sourceId);
        const spell = source?.getSpell(effect.spellId) || enemy.getSpell(effect.spellId);
        this.rememberEvent(actor, defensive ? "enemy-defensive" : "enemy-burst", {
          subjectId: enemy.id,
          subjectName: this.game.combatantLabel(enemy),
          spellId: effect.spellId,
          spellName: spell?.name || effect.spellId,
          value: enemy.healthPct,
        });
      }
    }

    memory.seen.lowHealth = nextLowHealth;
    memory.seen.lowMana = nextLowMana;
    memory.seen.activeEffects = nextEffects;

    const nextPressure = {};
    const allies = this.game.actors.filter(unit =>
      unit.alive
      && unit.team === actor.team
      && ["healer", "caster"].includes(unit.role)
    );

    for (const enemy of enemies) {
      const pressureTargetId = this.combatTargetId(enemy);
      const ally = allies.find(unit => unit.id === pressureTargetId);
      if (!ally) continue;

      const key = enemy.id + ">" + ally.id;
      nextPressure[key] = true;
      if (memory.seen.pressure[key]) continue;

      memory.totals.pressureSeen += 1;
      this.rememberEvent(actor, "ally-pressured", {
        subjectId: ally.id,
        subjectName: this.game.combatantLabel(ally),
        sourceId: enemy.id,
        sourceName: this.game.combatantLabel(enemy),
      });
    }
    memory.seen.pressure = nextPressure;

    const healer = this.game.actors.find(unit =>
      unit.alive && unit.team === actor.team && unit.role === "healer"
    );
    const healerControlled = Boolean(healer && this.game.cc.isHardControlled(healer));

    if (healerControlled && !memory.seen.healerCc) {
      memory.totals.healerCcSeen += 1;
      this.rememberEvent(actor, "healer-controlled", {
        subjectId: healer.id,
        subjectName: this.game.combatantLabel(healer),
      });
    }
    memory.seen.healerCc = healerControlled;

    memory.lastObservedAt = now;
  }

  closeIntent(actor, reason = "expired") {
    const intent = actor.aiIntent;
    if (!intent) return;

    const history = actor.aiIntentHistory || [];
    const entry = history[history.length - 1];
    if (entry && entry.endedAt == null) {
      entry.endedAt = this.game.elapsedSeconds;
      entry.endReason = reason;
    }

    actor.aiIntent = null;
  }

  setIntent(actor, type, target = null, reason = "", durationSeconds = 3) {
    this.ensureCognition(actor);
    const now = this.game.elapsedSeconds;
    const targetId = target?.id || null;
    const current = actor.aiIntent;

    if (
      current
      && current.type === type
      && current.targetId === targetId
      && current.expiresAt > now
    ) {
      return current;
    }

    if (current) this.closeIntent(actor, "replanned");

    const intent = {
      type,
      targetId,
      targetName: target ? this.game.combatantLabel(target) : null,
      reason,
      startedAt: now,
      expiresAt: now + Math.max(0.8, durationSeconds),
    };

    actor.aiIntent = intent;
    actor.aiIntentHistory.push({
      ...intent,
      endedAt: null,
      endReason: null,
    });
    actor.aiIntentHistory = actor.aiIntentHistory.slice(-30);
    return intent;
  }

  currentIntent(actor) {
    const intent = actor.aiIntent;
    if (!intent) return null;

    if (intent.expiresAt <= this.game.elapsedSeconds) {
      this.closeIntent(actor, "expired");
      return null;
    }

    if (intent.targetId) {
      const target = this.game.getActor(intent.targetId);
      if (!target?.alive) {
        this.closeIntent(actor, "target unavailable");
        return null;
      }
    }

    return intent;
  }

  healerIntentTarget(actor, bestTarget, allies) {
    const now = this.game.elapsedSeconds;
    const triage = this.behavior(actor, "healerTriage", 0.70);
    const manaConservation = this.behavior(actor, "manaConservation", 0.50);
    const selfPreservation = this.behavior(actor, "healerSelfPreservation", 0.68);
    const volatility = this.behavior(actor, "volatility", 0.45);
    const selfThreat = this.meleeThreatTo(
      actor,
      actor.config.ai.peelThreatRange ?? 135,
    );

    // Pick exactly one desired plan per think. Previously SURVIVE could be set
    // first and then immediately overwritten by STABILIZE later in this same
    // function, creating sub-second intent ping-pong.
    const allyEmergency = Boolean(
      bestTarget
      && bestTarget.id !== actor.id
      && bestTarget.healthPct < 0.34
      && bestTarget.healthPct < actor.healthPct - 0.12
    );

    let desiredType = "SUPPORT";
    let desiredTarget = bestTarget;
    let desiredReason = "maintain team stability";
    let desiredDuration = 2.0 + triage * 1.6;

    if (selfThreat && actor.healthPct < 0.62 && !allyEmergency) {
      desiredType = "SURVIVE";
      desiredTarget = actor;
      desiredReason = "melee pressure on self";
      desiredDuration = 2.2 + selfPreservation * 1.8;
    } else if (bestTarget?.healthPct < 0.58) {
      desiredType = "STABILIZE";
      desiredTarget = bestTarget;
      desiredReason = allyEmergency
        ? "new higher-priority emergency"
        : "ally under dangerous pressure";
      desiredDuration = 2.0 + triage * 2.2;
    } else if (
      actor.resource.type === "mana"
      && actor.resourcePct < 0.28
      && manaConservation > 0.42
    ) {
      desiredType = "CONSERVE";
      desiredTarget = bestTarget;
      desiredReason = "low mana";
      desiredDuration = 3.0 + manaConservation * 2.0;
    }

    const current = this.currentIntent(actor);
    const committed = current?.targetId
      ? allies.find(ally => ally.id === current.targetId)
      : null;

    const samePlan = Boolean(
      current
      && current.type === desiredType
      && current.targetId === (desiredTarget?.id || null)
    );

    if (samePlan) {
      return committed?.alive ? committed : bestTarget;
    }

    if (current) {
      // Human-like hysteresis: once a healer commits to a plan, comparable
      // priorities do not replace it every think tick. More volatile healers
      // are allowed to reconsider slightly sooner.
      const minimumCommitment = 1.45 + (1 - volatility) * 0.75;
      const intentAge = Math.max(0, now - current.startedAt);
      const desiredIsCareIntent = ["SURVIVE", "STABILIZE"].includes(desiredType);
      const currentIsCareIntent = ["SURVIVE", "STABILIZE"].includes(current.type);
      const desiredHealth = desiredTarget?.healthPct ?? 1;
      const committedHealth = committed?.healthPct ?? 1;

      // Real emergencies may still break the commitment immediately. SUPPORT
      // and CONSERVE yield earlier to dangerous HP; SURVIVE/STABILIZE require a
      // more severe or clearly higher-priority emergency to be interrupted.
      const emergencyThreshold = currentIsCareIntent ? 0.32 : 0.42;
      const emergencyBreak = Boolean(
        desiredIsCareIntent
        && desiredTarget?.alive
        && desiredHealth < emergencyThreshold
        && (
          !currentIsCareIntent
          || !committed?.alive
          || committedHealth - desiredHealth > 0.08
        )
      );

      if (intentAge < minimumCommitment && !emergencyBreak) {
        actor.aiHealerIntentHolds = (actor.aiHealerIntentHolds || 0) + 1;
        return committed?.alive ? committed : bestTarget;
      }
    }

    this.setIntent(
      actor,
      desiredType,
      desiredTarget,
      desiredReason,
      desiredDuration,
    );

    const active = this.currentIntent(actor);
    const activeTarget = active?.targetId
      ? allies.find(ally => ally.id === active.targetId)
      : null;

    return activeTarget?.alive ? activeTarget : bestTarget;
  }

  damageIntentTarget(actor, enemies) {
    if (!enemies.length) return null;

    const currentIntent = this.currentIntent(actor);
    const teamTarget = this.considerTeamPlanTarget(
      actor,
      enemies,
      currentIntent,
    );

    if (teamTarget) return teamTarget;

    if (currentIntent?.targetId) {
      const committed = enemies.find(enemy => enemy.id === currentIntent.targetId);
      if (
        committed
        && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, committed)
      ) {
        return committed;
      }
      this.closeIntent(actor, "target no longer damageable");
    }

    const now = this.game.elapsedSeconds;
    const skill = this.skill(actor);
    const stickiness = this.behavior(actor, "targetStickiness", 0.58);
    const healerSwapBias = this.behavior(actor, "healerSwapBias", 0.42);
    const cognition = this.individualCognitionStrength(actor);
    const arenaState = this.arenaState(actor.team);
    const situationalFinishBoost = arenaState?.disadvantage
      ? 0.07
      : arenaState?.cleanup
        ? 0.04
        : 0;

    const finishThreshold = 0.18 + cognition * 0.16 + situationalFinishBoost;
    const finish = [...enemies]
      .filter(enemy => enemy.healthPct <= finishThreshold)
      .sort((a, b) => a.healthPct - b.healthPct)[0];

    if (
      finish
      && this.shouldAttempt(
        actor,
        "intent-finish:" + finish.id,
        clamp01(
          0.15
          + cognition * 0.85
          + (arenaState?.disadvantage ? 0.22 : 0)
          + (arenaState?.cleanup ? 0.12 : 0)
        ),
        2.2,
      )
    ) {
      this.setIntent(
        actor,
        "FINISH",
        finish,
        "enemy seen at killable health",
        3.0 + stickiness * 2.4,
      );
      return finish;
    }

    const rememberedHealer = enemies.find(enemy => {
      if (enemy.role !== "healer") return false;
      const event = this.latestMemoryEvent(actor, "healer-low-mana", enemy.id);
      return event && now - event.at <= 7.0;
    });

    if (
      cognition >= 0.25
      && rememberedHealer
      && rememberedHealer.resourcePct <= 0.34
      && this.shouldAttempt(
        actor,
        "intent-low-mana-healer",
        (0.12 + healerSwapBias * 0.42 + skill * 0.32) * cognition,
        2.8,
      )
    ) {
      this.setIntent(
        actor,
        "PRESSURE_HEALER",
        rememberedHealer,
        "remembered healer low mana",
        3.0 + healerSwapBias * 2.4,
      );
      return rememberedHealer;
    }

    const current = this.game.getActor(actor.aiTargetId);
    const currentDamageable = current?.alive
      && enemies.some(enemy => enemy.id === current.id)
      ? current
      : null;

    const dispersedTarget = this.beginnerDispersedPressureTarget(
      actor,
      enemies,
      currentDamageable,
    );
    if (dispersedTarget) {
      this.setIntent(
        actor,
        "PRESSURE",
        dispersedTarget,
        currentDamageable
          ? "beginner target spread"
          : "establish independent pressure",
        2.8 + stickiness * 4.2,
      );
      return dispersedTarget;
    }

    if (currentDamageable) {
      const defensiveActive = (currentDamageable.effects || []).some(effect =>
        effect.kind === "damageReduction" && effect.remainingMs > 0
      );

      if (defensiveActive && enemies.length > 1) {
        const alternate = [...enemies]
          .filter(enemy => enemy.id !== currentDamageable.id)
          .sort((a, b) => a.healthPct - b.healthPct)[0];
        const swapChance = (
          0.14 + (1 - stickiness) * 0.42 + skill * 0.26
        ) * (0.15 + cognition * 0.85);

        if (
          alternate
          && this.shouldAttempt(actor, "intent-swap-defensive", swapChance, 2.4)
        ) {
          this.setIntent(
            actor,
            "SWAP_DEFENSIVE",
            alternate,
            "current target used a defensive",
            2.4 + (1 - stickiness) * 1.8,
          );
          return alternate;
        }
      }

      // With repeated observations, a stronger AI can form a rough expectation
      // for when this opponent tends to press a defensive. It is deliberately
      // probabilistic and requires at least two observed uses, so this never
      // becomes perfect cooldown knowledge.
      if (!defensiveActive && enemies.length > 1) {
        const model = this.opponentModelRead(actor, currentDamageable);
        const expectedHp = model?.averageDefensiveHealth;

        if (
          cognition >= 0.55
          && model
          && model.defensiveUses >= 2
          && model.confidence >= 0.28
          && Number.isFinite(expectedHp)
          && currentDamageable.healthPct <= Math.min(0.72, expectedHp + 0.08)
          && currentDamageable.healthPct >= Math.max(0.18, expectedHp - 0.14)
        ) {
          const alternate = [...enemies]
            .filter(enemy =>
              enemy.id !== currentDamageable.id
              && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, enemy)
            )
            .sort((a, b) => a.healthPct - b.healthPct)[0];

          const anticipationChance = model.trust * cognition * (
            0.10
            + (1 - stickiness) * 0.22
            + skill * 0.18
          );

          if (
            alternate
            && this.shouldAttempt(
              actor,
              "intent-anticipate-defensive:" + currentDamageable.id,
              anticipationChance,
              3.6,
            )
          ) {
            actor.aiOpponentModelUsage.defensiveAnticipations += 1;
            this.setIntent(
              actor,
              "ANTICIPATE_DEFENSIVE",
              alternate,
              "opponent model expects defensive near "
                + Math.round(expectedHp * 100) + "% HP",
              2.2 + (1 - stickiness) * 1.5,
            );
            return alternate;
          }
        }
      }
    }

    const target = currentDamageable || this.pickPriorityTarget(actor, enemies);
    if (!target) return null;

    this.setIntent(
      actor,
      "PRESSURE",
      target,
      currentDamageable ? "continue current pressure" : "establish pressure",
      2.8 + stickiness * 4.2,
    );
    return target;
  }

  update(deltaSeconds) {
    this.updateArenaStateAwareness();
    this.updateTeamCoordination(deltaSeconds);

    for (const actor of this.game.actors) {
      if (!actor.alive || actor.control === "player") continue;
      if (this.game.cc.isHardControlled(actor)) continue;

      const remaining = (this.thinkTimers.get(actor.id) || 0) - deltaSeconds;
      this.thinkTimers.set(actor.id, remaining);

      if (actor.role === "caster" && actor.cast && this.casterMustRecoverHealerSupport(actor)) {
        const spell = actor.getSpell(actor.cast.spellId);
        this.game.combat.cancelCast(actor, "recover healer LOS");
        this.game.log(
          this.game.combatantLabel(actor)
          + " cancels " + (spell?.name || "cast") + " to recover healer line of sight.",
        );
      }

      if (actor.role === "healer" && actor.cast) {
        this.reconsiderHealerCast(actor);
      }

      if (remaining <= 0) {
        this.thinkTimers.set(actor.id, this.thinkDelay(actor));
        this.think(actor);
      }

      if (actor.cast || this.game.cc.isRooted(actor)) continue;

      const target = this.game.getActor(actor.aiTargetId);
      if (target?.alive) this.moveForRole(actor, target, deltaSeconds);
    }
  }

  think(actor) {
    this.observeMemory(actor);
    this.observeOpponentModels(actor);

    if (actor.role === "healer") this.healerThink(actor);
    else this.damageThink(actor);
  }

  spells(actor, aiRole) {
    return actor.spells.filter(spell => spell.aiRole === aiRole);
  }

  spell(actor, aiRole, target = null) {
    const matches = this.spells(actor, aiRole);
    if (matches.length <= 1) return matches[0] || null;

    let candidates = matches.filter(spell => this.ready(actor, spell));

    if (target && ["periodic", "sustainHot"].includes(aiRole)) {
      const missingEffects = candidates.filter(spell =>
        !target.hasEffect(spell.id, actor.id)
      );
      if (missingEffects.length > 0) candidates = missingEffects;
    }

    if (candidates.length === 0) candidates = matches;

    // A stable short rotation lets talent-unlocked abilities compete with
    // baseline abilities instead of always losing to the first matching role.
    const bucket = Math.floor(this.game.elapsedSeconds / 1.25);
    const index = stableHash(actor.id + ":" + aiRole + ":" + bucket) % candidates.length;
    return candidates[index];
  }

  healingUrgencyScore(actor, ally, includeOpponentModel = true) {
    if (!ally?.alive || ally.team !== actor.team) return -Infinity;

    const healthPct = ally.healthPct;
    const enemies = this.game.actors.filter(candidate =>
      candidate.alive
      && candidate.team !== actor.team
      && !this.game.cc.isHardControlled(candidate)
    );

    const activeAttackers = enemies.filter(candidate =>
      this.combatTargetId(candidate) === ally.id
    ).length;

    const hasDot = ally.effects.some(effect =>
      effect.kind === "dot" && effect.remainingMs > 0
    );
    const hasHealingReduction = ally.effects.some(effect =>
      effect.kind === "healingReduction" && effect.remainingMs > 0
    );

    // Healers do not all read pressure the same way. Higher triage values
    // react earlier to incoming pressure; lower values lean more heavily on
    // the raw health bar. Rating improves the quality of that read without
    // removing the hidden playstyle.
    const triage = this.behavior(actor, "healerTriage", 0.70);
    const pressureRead = 0.72 + triage * 0.48;
    let score = (1 - healthPct) * (90 + triage * 20);
    score += activeAttackers * (healthPct < 0.70 ? 10 : 6) * pressureRead;

    if (includeOpponentModel) {
      let learnedPressure = 0;
      for (const enemy of enemies) {
        if (this.combatTargetId(enemy) !== ally.id) continue;
        learnedPressure += this.opponentPressureRead(actor, enemy, ally);
      }
      if (learnedPressure > 0.08) {
        score += learnedPressure * (4 + triage * 4);
      }
    }

    if (hasDot) score += 3 + triage * 2;
    if (hasHealingReduction) score += 4 + triage * 2;

    const recentPressure = this.latestMemoryEvent(actor, "ally-pressured", ally.id);
    if (
      recentPressure
      && this.game.elapsedSeconds - recentPressure.at <= 4.0
    ) {
      score += 2 + this.skill(actor) * 5;
    }

    if (healthPct < 0.45) score += 10 + triage * 4;
    if (healthPct < 0.30) score += 15 + triage * 6;

    return score;
  }

  pickHealTarget(actor, allies, recordModelInfluence = false) {
    const rankTargets = includeOpponentModel =>
      [...allies].sort((a, b) => {
        const scoreDiff = this.healingUrgencyScore(
          actor,
          b,
          includeOpponentModel,
        ) - this.healingUrgencyScore(
          actor,
          a,
          includeOpponentModel,
        );
        if (Math.abs(scoreDiff) > 0.001) return scoreDiff;
        return a.healthPct - b.healthPct;
      });

    const best = rankTargets(true)[0] || null;
    if (!recordModelInfluence) return best;

    const baseline = rankTargets(false)[0] || null;
    const modelChangedChoice = Boolean(
      best
      && baseline
      && best.id !== baseline.id
    );

    const choiceKey = modelChangedChoice
      ? baseline.id + "->" + best.id
      : null;

    if (
      choiceKey
      && actor.aiOpponentModelTriageChoiceKey !== choiceKey
    ) {
      actor.aiOpponentModelUsage.triageTargetSelections += 1;
    }

    actor.aiOpponentModelTriageChoiceKey = choiceKey;
    return best;
  }

  reconsiderHealerCast(actor) {
    const cast = actor.cast;
    if (!cast) return false;

    const spell = actor.getSpell(cast.spellId);
    if (
      !spell
      || spell.target !== "ally"
      || !spell.effects.some(effect => ["heal", "hot"].includes(effect.kind))
    ) {
      return false;
    }

    const allies = this.game.actors.filter(candidate =>
      candidate.alive && candidate.team === actor.team
    );
    const best = this.pickHealTarget(actor, allies);
    const current = this.game.getActor(cast.targetId);

    if (!best || best.id === current?.id) return false;

    const bestScore = this.healingUrgencyScore(actor, best);
    const currentScore = current
      ? this.healingUrgencyScore(actor, current)
      : -Infinity;
    const hpGap = current ? current.healthPct - best.healthPct : 1;
    const scoreGap = bestScore - currentScore;

    const bestReachable = this.game.combat.spellInRange(actor, best, spell)
      && this.game.combat.hasLos(actor, best);

    const triage = this.behavior(actor, "healerTriage", 0.70);
    const castGreed = this.behavior(actor, "healerCastGreed", 0.38);
    const reactivity = clamp01(
      triage * 0.50
      + this.skill(actor) * 0.38
      + (1 - castGreed) * 0.12
    );
    const criticalSwap = best.healthPct < 0.30
      && (hpGap >= 0.06 - reactivity * 0.03 || scoreGap >= 12 - reactivity * 5);
    const emergencySwap = best.healthPct < 0.50
      && (hpGap >= 0.11 - reactivity * 0.05 || scoreGap >= 20 - reactivity * 8);
    const pressureSwap = best.healthPct < 0.62 + reactivity * 0.08
      && hpGap >= 0.18 - reactivity * 0.07
      && scoreGap >= 16 - reactivity * 6;

    if (
      !criticalSwap
      && !emergencySwap
      && !pressureSwap
    ) {
      return false;
    }

    // Do not throw away a useful heal for a merely preferable target hidden
    // behind LOS. A truly critical ally is the exception: cancel and move.
    if (!bestReachable && best.healthPct >= 0.30) return false;

    this.game.combat.cancelCast(actor, "emergency triage");
    actor.aiTargetId = best.id;
    this.thinkTimers.set(actor.id, 0);

    this.game.log(
      this.game.combatantLabel(actor)
      + " cancels " + spell.name
      + " to triage " + this.game.combatantLabel(best) + ".",
    );

    return true;
  }

  healerThink(actor) {
    const enemies = this.game.actors.filter(candidate =>
      candidate.alive && candidate.team !== actor.team
    );
    const allies = this.game.actors
      .filter(candidate => candidate.alive && candidate.team === actor.team);

    const bestTarget = this.pickHealTarget(actor, allies, true);
    if (!bestTarget) return;

    const target = this.healerIntentTarget(actor, bestTarget, allies);
    if (!target) return;

    actor.aiTargetId = target.id;

    const skill = this.skill(actor);
    const triage = this.behavior(actor, "healerTriage", 0.70);
    const manaConservation = this.behavior(actor, "manaConservation", 0.50);
    const defensiveGreed = this.behavior(actor, "defensiveGreed", 0.42);
    const ccBias = this.behavior(actor, "ccBias", 0.58);
    const offenseBias = this.behavior(actor, "healerOffenseBias", 0.42);
    const arenaState = this.arenaState(actor.team);

    const defensiveThreshold = 0.50 - defensiveGreed * 0.16 + skill * 0.02;
    const emergencyThreshold = 0.66 + triage * 0.10 - manaConservation * 0.04;
    const bigHealThreshold = 0.64 + triage * 0.09 - manaConservation * 0.05;
    const instantThreshold = 0.78 + triage * 0.08 - manaConservation * 0.03;
    const sustainThreshold = 0.87 + triage * 0.06 - manaConservation * 0.05;
    const quickThreshold = 0.91 + triage * 0.05 - manaConservation * 0.05;

    const panicCc = this.spell(actor, "panicCc");
    if (panicCc && this.ready(actor, panicCc)) {
      const effect = panicCc.effects.find(item => ["fearAoE", "rootAoE"].includes(item.kind));
      const radius = effect?.radius || 0;
      const closeEnemy = enemies.find(candidate =>
        distance(actor, candidate) <= radius + actor.radius + candidate.radius
        && !this.game.cc.wouldBeImmune(candidate, panicCc)
      );
      const selfThreat = this.meleeThreatTo(actor, actor.config.ai.peelThreatRange ?? 135);

      // Do not spend the healer's next global on panic CC while a teammate is
      // in real danger, unless the healer is personally being trained and
      // needs the CC to stay alive / keep casting.
      const panicSafePct = 0.66 - ccBias * 0.16;
      const panicChance = 0.30 + ccBias * 0.55 + skill * 0.10;

      if (
        closeEnemy
        && (selfThreat || (
          target.healthPct >= panicSafePct
          && this.shouldAttempt(actor, "healer-panic-cc", panicChance, 2.0)
        ))
        && this.castIfPossible(actor, panicCc, actor)
      ) return;
    }

    const defensive = this.spell(actor, "defensive");
    const big = this.spell(actor, "bigHeal");
    const quick = this.spell(actor, "quickHeal");
    const instant = this.spell(actor, "instantHeal");
    const sustain = this.spell(actor, "sustainHot", target);

    if (
      target.healthPct < defensiveThreshold
      && defensive
      && this.ready(actor, defensive)
      && this.castIfPossible(actor, defensive, target)
    ) return;

    // Under heavy pressure, prefer a true instant heal before committing to a
    // long big-heal cast. This catches Paladin Holy Shock and Druid Swiftmend,
    // while casted quick heals such as Priest Flash Heal keep their normal role.
    const emergencyInstant = [instant, quick]
      .filter(Boolean)
      .find(spell => (spell.castMs || 0) <= 0);

    if (
      target.healthPct < emergencyThreshold
      && emergencyInstant
      && this.ready(actor, emergencyInstant)
      && this.castIfPossible(actor, emergencyInstant, target)
    ) return;

    if (target.healthPct < bigHealThreshold && big && this.ready(actor, big) && this.castIfPossible(actor, big, target)) return;
    if (target.healthPct < instantThreshold && instant && this.ready(actor, instant) && this.castIfPossible(actor, instant, target)) return;

    if (target.healthPct < sustainThreshold && sustain && this.ready(actor, sustain)) {
      const hot = sustain.effects.find(effect => effect.kind === "hot");
      const shouldApply = !hot || !target.hasEffect(sustain.id, actor.id);
      if (shouldApply && this.castIfPossible(actor, sustain, target)) return;
    }

    if (target.healthPct < quickThreshold && quick && this.ready(actor, quick) && this.castIfPossible(actor, quick, target)) return;

    const control = this.spell(actor, "control");
    const controlStablePct = 0.68 - ccBias * 0.14;
    const cognition = this.individualCognitionStrength(actor);
    const controlChance = (
      0.24 + ccBias * 0.58 + skill * 0.10
    ) * (0.20 + cognition * 0.80);
    if (
      control
      && this.ready(actor, control)
      && allies.every(ally => ally.healthPct > controlStablePct)
      && this.shouldAttempt(actor, "healer-control", controlChance, 3.0)
    ) {
      const controlTarget = this.pickCcTarget(actor, enemies, control);
      if (controlTarget && this.castIfPossible(actor, control, controlTarget)) return;
    }

    // Aggressive healers create pressure more readily; conservative healers
    // wait for a cleaner window. The profile drifts during the match, so the
    // tendency is readable without becoming completely deterministic.
    let offenseStablePct = 0.97 - offenseBias * 0.13;
    let offenseChance = 0.20 + offenseBias * 0.65 + skill * 0.10;

    if (arenaState?.cleanup) {
      offenseStablePct = Math.max(0.72, offenseStablePct - 0.16);
      offenseChance = clamp01(offenseChance + 0.35);
    } else if (arenaState?.advantage) {
      offenseStablePct = Math.max(0.78, offenseStablePct - 0.06);
      offenseChance = clamp01(offenseChance + 0.15);
    } else if (arenaState?.disadvantage) {
      offenseStablePct = Math.min(0.98, offenseStablePct + 0.02);
      offenseChance = clamp01(offenseChance * 0.68);
    }
    const teamPlan = this.teamPlan(actor.team);
    const teamPlanTarget = enemies.find(enemy =>
      enemy.id === teamPlan?.primaryTargetId
    );
    const teamRecovering = ["RECOVER", "PEEL"].includes(teamPlan?.state);

    if (
      !teamRecovering
      && allies.every(ally => ally.healthPct > offenseStablePct)
      && enemies.length > 0
      && this.shouldAttempt(actor, "healer-offense", offenseChance, 2.4)
    ) {
      const offensiveTarget = teamPlanTarget
        || [...enemies].sort((a, b) => a.healthPct - b.healthPct)[0];
      const periodic = this.spell(actor, "periodic", offensiveTarget);
      const bigDamage = this.spell(actor, "bigDamage");
      const filler = this.spell(actor, "filler");

      if (
        periodic
        && this.ready(actor, periodic)
        && !offensiveTarget.hasEffect(periodic.id, actor.id)
        && this.castIfPossible(actor, periodic, offensiveTarget)
      ) return;

      if (
        bigDamage
        && this.ready(actor, bigDamage)
        && this.castIfPossible(actor, bigDamage, offensiveTarget)
      ) return;

      if (
        filler
        && this.ready(actor, filler)
        && this.castIfPossible(actor, filler, offensiveTarget)
      ) return;
    }
  }

  slowDamageSpell(actor) {
    if (actor.role !== "caster") return null;

    return actor.spells.find(spell =>
      spell.target === "enemy"
      && spell.effects.some(effect =>
        effect.kind === "slow"
        || (effect.kind === "chainDamage" && effect.primarySlow)
      )
    ) || null;
  }

  tacticalSlowDecision(actor, currentTarget, enemies) {
    const spell = this.slowDamageSpell(actor);
    if (!spell || !this.ready(actor, spell) || enemies.length === 0) return null;

    const allies = this.game.actors.filter(unit =>
      unit.alive && unit.team === actor.team
    );
    const friendlyMelee = allies.filter(unit => unit.role === "melee");
    const plan = this.teamPlan(actor.team);
    const currentIntent = actor.aiIntent?.expiresAt > this.game.elapsedSeconds
      ? actor.aiIntent
      : null;

    const supportDiscipline = this.behavior(actor, "supportDiscipline", 0.68);
    const peelBias = this.behavior(actor, "peelBias", 0.55);
    const kiteBias = this.behavior(actor, "casterKiteBias", 0.68);
    const skill = this.skill(actor);

    let best = null;

    for (const enemy of enemies) {
      if (!enemy?.alive) continue;
      if (!this.game.combat.spellInRange(actor, enemy, spell)) continue;
      if (!this.game.combat.hasLos(actor, enemy)) continue;

      // Slow is a bonus on a normal damage spell. Never penalize a target for
      // already being slowed, rooted or stunned: the cast still deals damage,
      // and refreshing the slow can be valuable when the harder control ends.
      let score = enemy.id === currentTarget?.id ? 8 : 0;
      let kind = null;
      let reason = "";
      let modelAssisted = false;
      let teamAssisted = false;

      const enemyTargetId = this.combatTargetId(enemy);
      const pressuredAlly = enemyTargetId
        ? allies.find(ally => ally.id === enemyTargetId)
        : null;

      if (enemy.role === "melee" && pressuredAlly) {
        if (pressuredAlly.id === actor.id) {
          const threatDistance = distance(enemy, actor);
          score += 42 + clamp01((180 - threatDistance) / 130) * 14;
          kind = "selfPeel";
          reason = "self-peel";
        } else if (pressuredAlly.role === "healer") {
          score += 38 + Math.max(0, 0.78 - pressuredAlly.healthPct) * 22;
          kind = "teammatePeel";
          reason = "peel " + this.game.combatantLabel(pressuredAlly);
        } else if (
          pressuredAlly.role === "caster"
          && pressuredAlly.healthPct <= 0.78
        ) {
          score += 24 + Math.max(0, 0.72 - pressuredAlly.healthPct) * 18;
          kind = "teammatePeel";
          reason = "peel " + this.game.combatantLabel(pressuredAlly);
        }

        if (kind) {
          const modelRead = this.opponentPressureRead(actor, enemy, pressuredAlly);
          if (modelRead > 0.08) {
            score += modelRead * 12;
            modelAssisted = true;
          }

          const recentPressure = this.latestMemoryEvent(
            actor,
            "ally-pressured",
            pressuredAlly.id,
          );
          if (
            recentPressure
            && this.game.elapsedSeconds - recentPressure.at <= 4.0
          ) {
            score += 4 + skill * 3;
          }
        }
      }

      let bestMeleeAssist = null;
      for (const melee of friendlyMelee) {
        if (this.combatTargetId(melee) !== enemy.id) continue;

        const meleeRange = melee.config.ai.preferredRange || 55;
        const gap = distance(melee, enemy);
        const helpThreshold = meleeRange * 1.35;
        if (gap <= helpThreshold) continue;

        const need = clamp01((gap - helpThreshold) / 150);
        const assistScore = 18 + need * 18;

        if (!bestMeleeAssist || assistScore > bestMeleeAssist.score) {
          bestMeleeAssist = { melee, score: assistScore };
        }
      }

      if (bestMeleeAssist) {
        score += bestMeleeAssist.score;
        if (!kind || kind === "meleeAssist") {
          kind = "meleeAssist";
          reason = "help "
            + this.game.combatantLabel(bestMeleeAssist.melee)
            + " connect";
        }
      }

      if (
        plan?.primaryTargetId === enemy.id
        && plan.confidence >= 0.38
        && (plan.coordinationStrength ?? 1) >= 0.35
        && ["PRESSURE", "BURST"].includes(plan.state)
      ) {
        score += 5 + (plan.confidence || 0) * 5;
        teamAssisted = true;
      }

      if (
        plan
        && plan.confidence >= 0.38
        && (plan.coordinationStrength ?? 1) >= 0.35
        && ["PEEL", "RECOVER"].includes(plan.state)
        && pressuredAlly?.role === "healer"
      ) {
        score += 7 + (plan.confidence || 0) * 5;
        teamAssisted = true;
      }

      if (currentIntent?.targetId === enemy.id) {
        score += 4;
      }

      if (!kind || score < 20) continue;

      let chance = 0.35;
      if (kind === "selfPeel") {
        chance = 0.52 + kiteBias * 0.28 + skill * 0.16;
        if (actor.healthPct < 0.42) chance = 1;
      } else if (kind === "teammatePeel") {
        chance = 0.44 + peelBias * 0.28 + skill * 0.18;
      } else if (kind === "meleeAssist") {
        chance = 0.30 + supportDiscipline * 0.36 + skill * 0.18;
      }

      if (teamAssisted) chance += 0.06;
      if (modelAssisted) chance += 0.04;

      const decision = {
        spell,
        target: enemy,
        kind,
        reason,
        score,
        chance: clamp01(chance),
        modelAssisted,
        teamAssisted,
      };

      if (!best || decision.score > best.score) best = decision;
    }

    if (!best) return null;

    const key = "tactical-slow:" + best.kind + ":" + best.target.id;
    return this.shouldAttempt(actor, key, best.chance, 1.6)
      ? best
      : null;
  }

  recordTacticalSlow(actor, decision) {
    this.ensureCognition(actor);
    const usage = actor.aiSlowUsage;

    usage.casts += 1;
    if (decision.kind === "meleeAssist") usage.meleeAssists += 1;
    if (decision.kind === "teammatePeel") usage.teammatePeels += 1;
    if (decision.kind === "selfPeel") usage.selfPeels += 1;
    if (decision.modelAssisted) usage.modelAssisted += 1;
    if (decision.teamAssisted) usage.teamAssisted += 1;

    actor.aiLastSlowDecision = {
      at: this.game.elapsedSeconds,
      targetId: decision.target.id,
      targetName: this.game.combatantLabel(decision.target),
      spellId: decision.spell.id,
      spellName: decision.spell.name,
      kind: decision.kind,
      reason: decision.reason,
    };
  }

  damageThink(actor) {
    const enemies = this.game.actors.filter(candidate =>
      candidate.alive && candidate.team !== actor.team,
    );
    if (enemies.length === 0) return;

    if (actor.role === "caster" && this.casterMustRecoverHealerSupport(actor)) {
      return;
    }

    const damageableEnemies = enemies.filter(candidate =>
      !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, candidate)
    );

    const skill = this.skill(actor);
    const defensiveGreed = this.behavior(actor, "defensiveGreed", 0.48);
    const arenaState = this.arenaState(actor.team);
    let defensiveThreshold = 0.52 - defensiveGreed * 0.20 + skill * 0.02;

    if (arenaState?.lastStand) defensiveThreshold += 0.14;
    else if (arenaState?.disadvantage) defensiveThreshold += 0.08;
    else if (arenaState?.cleanup) defensiveThreshold -= 0.05;
    defensiveThreshold = Math.max(0.24, Math.min(0.78, defensiveThreshold));

    const defensive = this.spell(actor, "defensiveSelf") || this.spell(actor, "defensive");
    if (defensive && actor.healthPct < defensiveThreshold && this.ready(actor, defensive)) {
      if (this.castIfPossible(actor, defensive, actor)) return;
    }

    const interrupt = this.spell(actor, "interrupt");
    const interruptDiscipline = this.behavior(actor, "interruptDiscipline", 0.65);
    const cognition = this.individualCognitionStrength(actor);
    const interruptChance = (
      0.32 + skill * 0.45 + interruptDiscipline * 0.28
    ) * (0.12 + cognition * 0.88);
    if (
      interrupt
      && this.ready(actor, interrupt)
      && this.shouldAttempt(actor, "interrupt", interruptChance, 0.75)
    ) {
      const interruptTarget = damageableEnemies
        .filter(candidate => {
          if (!candidate.cast) return false;
          const castingSpell = candidate.getSpell(candidate.cast.spellId);
          if (castingSpell?.interruptible === false) return false;

          return this.game.combat.spellInRange(actor, candidate, interrupt)
            && this.game.combat.hasLos(actor, candidate);
        })
        .sort((a, b) => {
          const score = role => role === "healer" ? 0 : role === "caster" ? 1 : 2;
          return score(a.role) - score(b.role);
        })[0];

      if (interruptTarget && this.castIfPossible(actor, interrupt, interruptTarget)) return;
    }

    const panicRoot = this.spell(actor, "panicRoot");
    if (panicRoot && this.ready(actor, panicRoot)) {
      const effect = panicRoot.effects.find(item => item.kind === "rootAoE");
      const radius = effect?.radius || 0;
      const closeMelee = damageableEnemies.find(candidate =>
        candidate.role === "melee"
        && distance(actor, candidate) <= radius + actor.radius + candidate.radius
        && !this.game.cc.wouldBeImmune(candidate, panicRoot)
      );
      const rootChance = 0.32
        + this.behavior(actor, "ccBias", 0.58) * 0.48
        + skill * 0.15;
      if (
        closeMelee
        && (actor.healthPct < 0.52 || this.shouldAttempt(actor, "panic-root", rootChance, 2.0))
        && this.castIfPossible(actor, panicRoot, actor)
      ) return;
    }

    if (damageableEnemies.length === 0) return;

    const recoveryTarget = this.game.getActor(actor.aiTargetId)
      || damageableEnemies[0];
    if (
      actor.role === "caster"
      && this.casterShouldHoldManaRecovery(actor, recoveryTarget, arenaState)
    ) {
      return;
    }

    const peel = this.findPeelSituation(actor, damageableEnemies);
    const oomHealer = this.findOomHealerTarget(actor, damageableEnemies);
    const healerPressure = this.findHealerPressureTarget(actor, damageableEnemies);
    const intentTarget = !peel && !oomHealer && !healerPressure
      ? this.damageIntentTarget(actor, damageableEnemies)
      : null;

    let target = null;

    if (peel) {
      target = peel.attacker;
      this.setIntent(
        actor,
        "PEEL",
        peel.attacker,
        "protect " + this.game.combatantLabel(peel.ally)
          + (peel.modelAssisted
            ? " · opponent model expects sustained pressure"
            : "")
          + (peel.teamAssisted
            ? " · team plan calls for peel"
            : ""),
        actor.config.ai.peelDurationSeconds ?? 4.5,
      );
      this.beginPeel(actor, peel);
    } else if (oomHealer) {
      target = oomHealer;
      this.setIntent(
        actor,
        "PRESSURE_HEALER",
        oomHealer,
        "healer is out of mana",
        4.0 + this.behavior(actor, "healerSwapBias", 0.42) * 2.0,
      );
      if (actor.aiTargetId !== oomHealer.id) {
        this.game.log(
          this.game.combatantLabel(actor)
          + " switches pressure to " + this.game.combatantLabel(oomHealer)
          + " — healer is out of mana.",
        );
      }
      actor.aiTargetId = oomHealer.id;
      actor.aiPeelTargetId = null;
      actor.aiPeelUntil = 0;
    } else if (healerPressure) {
      target = healerPressure;
      this.setIntent(
        actor,
        "TEST_HEALER",
        healerPressure,
        "temporary healer pressure window",
        2.0 + this.behavior(actor, "healerSwapBias", 0.42) * 2.0,
      );
      if (actor.aiTargetId !== healerPressure.id) {
        this.game.log(
          this.game.combatantLabel(actor)
          + " tests pressure on " + this.game.combatantLabel(healerPressure)
          + ".",
        );
      }
      actor.aiTargetId = healerPressure.id;
      actor.aiPeelTargetId = null;
      actor.aiPeelUntil = 0;
    } else {
      if (intentTarget) {
        target = intentTarget;
        actor.aiTargetId = intentTarget.id;
      }

      const current = this.game.getActor(actor.aiTargetId);
      const currentProtected = current?.alive
        && this.game.cc.shouldAvoidBreakingFriendlyCc(actor, current);

      if (!target && currentProtected) {
        const alternate = this.pickPriorityTarget(actor, damageableEnemies);
        if (alternate && alternate.id !== current.id) {
          this.game.log(
            this.game.combatantLabel(actor)
            + " swaps off " + this.game.combatantLabel(current)
            + " to preserve friendly crowd control.",
          );
          target = alternate;
          actor.aiTargetId = alternate.id;
        }
      }

      if (!target) {
        const currentDamageable = current?.alive
          && damageableEnemies.some(candidate => candidate.id === current.id)
          ? current
          : null;
        const lowest = [...damageableEnemies].sort((a, b) => a.healthPct - b.healthPct)[0];

        // A short healer-pressure test should end cleanly instead of turning
        // into a permanent healer tunnel. Once the window closes, return to
        // the normal role priority unless the healer is actually OOM or is
        // now the lowest kill target.
        if (currentDamageable?.role === "healer" && lowest.id !== currentDamageable.id) {
          const nonHealers = damageableEnemies.filter(candidate => candidate.role !== "healer");
          const resetTarget = this.pickPriorityTarget(actor, nonHealers);

          if (resetTarget) {
            target = resetTarget;
            actor.aiTargetId = resetTarget.id;
            this.game.log(
              this.game.combatantLabel(actor)
              + " returns pressure to " + this.game.combatantLabel(resetTarget)
              + ".",
            );
          }
        }

        if (!target && currentDamageable) {
          const voluntarySwap = this.pickVoluntarySwapTarget(
            actor,
            currentDamageable,
            damageableEnemies,
          );

          if (voluntarySwap) {
            target = voluntarySwap;
            actor.aiTargetId = voluntarySwap.id;
            this.game.log(
              this.game.combatantLabel(actor)
              + " swaps pressure to " + this.game.combatantLabel(voluntarySwap) + ".",
            );
          }
        }

        if (!target) {
          const cognition = this.individualCognitionStrength(actor);
          const snapFinishPct = 0.14 + cognition * 0.10;
          if (!currentDamageable || lowest.healthPct < snapFinishPct) {
            target = lowest.healthPct < snapFinishPct
              ? lowest
              : this.pickPriorityTarget(actor, damageableEnemies);
            actor.aiTargetId = target.id;
          } else {
            target = currentDamageable;
          }
        }
      }
    }

    if (!target?.alive) return;

    const gapClose = this.spell(actor, "gapClose");
    if (
      gapClose
      && this.ready(actor, gapClose)
      && distance(actor, target) > (actor.config.ai.preferredRange || 55) * 1.8
      && this.game.combat.spellInRange(actor, target, gapClose)
      && this.game.combat.hasLos(actor, target)
    ) {
      if (this.castIfPossible(actor, gapClose, target)) return;
    }

    const control = this.spell(actor, "control");
    if (control && this.ready(actor, control)) {
      let controlTarget = null;

      if (
        peel
        && this.canControlTarget(actor, peel.attacker, control)
      ) {
        controlTarget = peel.attacker;
      } else {
        const ccBias = this.behavior(actor, "ccBias", 0.58);
        const cognition = this.individualCognitionStrength(actor);
        let ccChance = (
          0.22 + ccBias * 0.58 + skill * 0.12
        ) * (0.25 + cognition * 0.75);

        if (arenaState?.disadvantage) {
          ccChance = clamp01(ccChance + 0.18);
        }

        const breakableControl = control.effects.some(effect => effect.breakOnDamage);
        if (
          arenaState?.cleanup
          && arenaState.enemyAlive === 1
          && breakableControl
        ) {
          ccChance *= 0.15;
        }

        if (this.shouldAttempt(actor, "damage-control", ccChance, 2.8)) {
          controlTarget = this.pickCcTarget(actor, enemies, control);
        }
      }

      if (controlTarget && this.castIfPossible(actor, control, controlTarget)) return;
    }

    const tacticalSlow = this.tacticalSlowDecision(
      actor,
      target,
      damageableEnemies,
    );

    if (
      tacticalSlow
      && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, tacticalSlow.target)
      && this.castIfPossible(actor, tacticalSlow.spell, tacticalSlow.target)
    ) {
      this.recordTacticalSlow(actor, tacticalSlow);
      return;
    }

    const periodic = this.spell(actor, "periodic", target);
    const big = this.spell(actor, "bigDamage");
    const filler = this.spell(actor, "filler");

    if (
      periodic
      && this.ready(actor, periodic)
      && !target.hasEffect(periodic.id, actor.id)
      && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, target)
      && this.castIfPossible(actor, periodic, target)
    ) return;

    if (
      big
      && this.ready(actor, big)
      && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, target)
      && this.castIfPossible(actor, big, target)
    ) return;

    if (
      filler
      && this.ready(actor, filler)
      && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, target)
    ) {
      this.castIfPossible(actor, filler, target);
    }
  }

  combatTargetId(actor) {
    return actor?.control === "player" ? actor.targetId : actor?.aiTargetId;
  }

  meleeThreatTo(actor, threatRange = null) {
    if (!actor?.alive) return null;

    const range = threatRange
      ?? actor.config.ai.peelThreatRange
      ?? 125;

    return this.game.actors
      .filter(candidate =>
        candidate.alive
        && candidate.team !== actor.team
        && candidate.role === "melee"
        && this.combatTargetId(candidate) === actor.id
        && distance(candidate, actor) <= range
        && !this.game.cc.isHardControlled(candidate)
        && !this.game.cc.isRooted(candidate)
      )
      .sort((a, b) => distance(a, actor) - distance(b, actor))[0] || null;
  }

  allyNeedsPeel(actor, ally) {
    if (!ally?.alive || ally.team !== actor.team) return false;

    // Healers should receive help as soon as a melee is actively tunnelling
    // them; waiting until they are already low makes peel arrive too late.
    if (ally.role === "healer") return Boolean(this.meleeThreatTo(ally));

    // Casters still require meaningful pressure before teammates abandon
    // their current offensive plan to peel for them.
    if (ally.role === "caster") {
      const threshold = actor.config.ai.peelHealthPct ?? 0.62;
      return ally.healthPct <= threshold && Boolean(this.meleeThreatTo(ally));
    }

    return false;
  }

  findPeelSituation(actor, enemies) {
    const now = this.game.elapsedSeconds;
    const stickyTarget = this.game.getActor(actor.aiPeelTargetId);

    if (
      actor.aiPeelUntil > now
      && stickyTarget?.alive
      && enemies.some(candidate => candidate.id === stickyTarget.id)
    ) {
      const threatened = this.findThreatenedAlly(actor, stickyTarget);
      if (threatened) return { attacker: stickyTarget, ally: threatened };
    }

    const allies = this.game.actors
      .filter(candidate =>
        candidate.alive
        && candidate.team === actor.team
        && ["healer", "caster"].includes(candidate.role)
        && this.allyNeedsPeel(actor, candidate)
      )
      .sort((a, b) => {
        if (a.role !== b.role) return a.role === "healer" ? -1 : 1;
        return a.healthPct - b.healthPct;
      });

    for (const ally of allies) {
      const attacker = this.meleeThreatTo(
        ally,
        actor.config.ai.peelThreatRange ?? 125,
      );

      if (
        attacker
        && enemies.some(candidate => candidate.id === attacker.id)
      ) {
        const peelBias = this.behavior(actor, "peelBias", 0.55);
        const urgency = ally.role === "healer"
          ? 0.12 + Math.max(0, 0.72 - ally.healthPct) * 0.55
          : Math.max(0, 0.68 - ally.healthPct) * 0.45;
        const basePeelChance =
          0.14 + peelBias * 0.62 + this.skill(actor) * 0.16 + urgency;
        const modelRead = this.opponentPressureRead(actor, attacker, ally);
        const modelBonus = modelRead * 0.16;
        const teamPlan = this.teamPlan(actor.team);
        const teamPeelBonus = (
          ally.role === "healer"
          && (teamPlan?.confidence || 0) >= 0.38
          && (teamPlan?.coordinationStrength ?? 1) >= 0.35
          && ["PEEL", "RECOVER"].includes(teamPlan?.state)
        )
          ? (
            0.08 + (teamPlan?.confidence || 0) * 0.12
          ) * (teamPlan?.coordinationStrength ?? 1)
          : 0;
        const peelChance = basePeelChance + modelBonus + teamPeelBonus;
        const peelRoll = this.decisionRoll(actor, "peel:" + ally.id, 2.2);

        if (
          ally.healthPct < 0.32
          || peelRoll < clamp01(peelChance)
        ) {
          const modelAssisted = Boolean(
            modelBonus > 0
            && peelRoll >= clamp01(basePeelChance)
          );
          const teamAssisted = Boolean(
            teamPeelBonus > 0
            && peelRoll >= clamp01(basePeelChance + modelBonus)
          );
          if (modelAssisted) {
            actor.aiOpponentModelUsage.peelAssists += 1;
          }
          if (teamAssisted) {
            actor.aiTeamPlanUsage.follows += 1;
          }
          return { attacker, ally, modelAssisted, teamAssisted };
        }
      }
    }

    actor.aiPeelTargetId = null;
    actor.aiPeelUntil = 0;
    return null;
  }

  findThreatenedAlly(actor, attacker) {
    const targetId = this.combatTargetId(attacker);
    if (!targetId) return null;

    const ally = this.game.getActor(targetId);
    if (
      !ally?.alive
      || ally.team !== actor.team
      || !["healer", "caster"].includes(ally.role)
      || distance(attacker, ally) > (actor.config.ai.peelThreatRange ?? 125)
    ) {
      return null;
    }

    if (ally.role === "healer") return ally;

    return ally.healthPct <= (actor.config.ai.peelHealthPct ?? 0.62)
      ? ally
      : null;
  }

  beginPeel(actor, peel) {
    const now = this.game.elapsedSeconds;
    const isNewPeel = actor.aiPeelTargetId !== peel.attacker.id || actor.aiPeelUntil <= now;

    actor.aiPeelTargetId = peel.attacker.id;
    actor.aiPeelUntil = now + (actor.config.ai.peelDurationSeconds ?? 4.5);
    actor.aiTargetId = peel.attacker.id;

    if (isNewPeel) {
      if (peel.ally.id === actor.id) {
        this.game.log(
          this.game.combatantLabel(actor)
          + " self-peels " + this.game.combatantLabel(peel.attacker) + ".",
        );
      } else {
        this.game.log(
          this.game.combatantLabel(actor)
          + " peels " + this.game.combatantLabel(peel.attacker)
          + " off " + this.game.combatantLabel(peel.ally) + ".",
        );
      }
    }
  }

  canControlTarget(actor, target, spell) {
    if (!target?.alive) return false;
    if (this.game.cc.isHardControlled(target) || this.game.cc.isRooted(target)) return false;
    if (this.game.cc.wouldBeImmune(target, spell)) return false;
    if (!this.game.combat.spellInRange(actor, target, spell)) return false;
    if (!this.game.combat.hasLos(actor, target)) return false;

    if (this.isBreakableControlSpell(spell) && this.hasFriendlyDotPressure(actor, target)) {
      return false;
    }

    return true;
  }

  pickCcTarget(actor, enemies, spell) {
    const priorityRoles = actor.config.ai.ccTargetRoles || ["healer", "caster"];

    for (const role of priorityRoles) {
      const target = enemies.find(candidate =>
        candidate.role === role
        && this.canControlTarget(actor, candidate, spell)
      );
      if (target) return target;
    }

    return null;
  }

  isBreakableControlSpell(spell) {
    return spell.effects.some(effect =>
      ["fear", "incapacitate", "root"].includes(effect.kind)
      && effect.breakOnDamage !== false
    );
  }

  hasFriendlyDotPressure(actor, target) {
    return target.effects.some(effect => {
      if (effect.kind !== "dot" || effect.remainingMs <= 0) return false;
      const source = this.game.getActor(effect.sourceId);
      return source?.team === actor.team;
    });
  }

  findOomHealerTarget(actor, enemies) {
    const cognition = this.individualCognitionStrength(actor);
    if (cognition < 0.25) return null;

    const threshold = actor.config.ai.oomHealerFocusPct ?? 0.1;
    const healer = enemies.find(candidate =>
      candidate.role === "healer"
      && candidate.resource.type === "mana"
      && candidate.resourcePct <= threshold
    ) || null;

    if (!healer) return null;

    // OOM awareness is a decision, not perfect information. Lower-rated AI
    // may need several observation windows before it capitalizes on an empty
    // healer mana bar; stronger AI reacts more reliably.
    const skill = this.skill(actor);
    const healerSwapBias = this.behavior(actor, "healerSwapBias", 0.42);
    const noticeChance = (
      0.12 + skill * 0.58 + healerSwapBias * 0.18
    ) * cognition;

    return this.shouldAttempt(
      actor,
      "notice-oom-healer:" + healer.id,
      noticeChance,
      2.8,
    ) ? healer : null;
  }

  findHealerPressureTarget(actor, enemies) {
    const cognition = this.individualCognitionStrength(actor);
    if (cognition < 0.30) return null;

    const healer = enemies.find(candidate => candidate.role === "healer");
    if (!healer) return null;

    const nonHealers = enemies.filter(candidate => candidate.id !== healer.id);
    const lowestNonHealer = [...nonHealers]
      .sort((a, b) => a.healthPct - b.healthPct)[0];

    // Swap-heavy players test the healer more often, while sticky players
    // may spend most of the match tunnelling a DPS. An obvious kill still
    // overrides personality.
    const healerSwapBias = this.behavior(actor, "healerSwapBias", 0.45);
    const killStopPct = actor.config.ai.healerPressureKillStopPct
      ?? (0.29 + this.skill(actor) * 0.04);
    if (lowestNonHealer?.healthPct <= killStopPct) return null;

    const cycleSeconds = actor.config.ai.healerPressureCycleSeconds
      ?? (24 - healerSwapBias * 11);
    const windowSeconds = actor.config.ai.healerPressureWindowSeconds
      ?? (2.1 + healerSwapBias * 3.8);
    const cycleMs = Math.max(1000, Math.round(cycleSeconds * 1000));
    const profileSeed = this.behaviorProfile(actor)?.seed ?? actor.id;
    const phaseOffset = (stableHash(profileSeed + ":healer-pressure") % cycleMs) / 1000;
    const phase = (this.game.elapsedSeconds + phaseOffset) % cycleSeconds;

    if (phase >= windowSeconds) return null;

    const castSpell = healer.cast
      ? healer.getSpell(healer.cast.spellId)
      : null;
    const activelyHealing = Boolean(
      castSpell
      && castSpell.target === "ally"
      && castSpell.effects.some(effect => ["heal", "hot"].includes(effect.kind))
    );

    const manaThreshold = actor.config.ai.healerPressureManaPct
      ?? (0.54 + healerSwapBias * 0.32);
    const manaExposed = healer.resource.type === "mana"
      && healer.resourcePct <= manaThreshold;
    const healthExposed = healer.healthPct <= 0.70 + healerSwapBias * 0.18;

    // Pressure windows are opportunities, not mandatory swaps. The healer
    // must expose something worth reacting to, and personality still decides
    // whether this particular window is taken.
    if (!activelyHealing && !manaExposed && !healthExposed) return null;

    const swapChance = (
      0.16 + healerSwapBias * 0.62 + this.skill(actor) * 0.12
    ) * cognition;
    return this.shouldAttempt(actor, "healer-pressure", swapChance, 2.6)
      ? healer
      : null;
  }

  beginnerDispersedPressureTarget(actor, enemies, currentTarget = null) {
    const dispersion = this.beginnerTargetDispersionStrength(actor);
    if (
      dispersion <= 0
      || actor.role === "healer"
      || enemies.length < 2
    ) return null;

    const offensiveIntentTypes = new Set([
      "PRESSURE",
      "FINISH",
      "PRESSURE_HEALER",
      "TEST_HEALER",
      "SWAP_DEFENSIVE",
      "ANTICIPATE_DEFENSIVE",
    ]);
    const focusCounts = new Map(enemies.map(enemy => [enemy.id, 0]));

    for (const teammate of this.game.actors) {
      if (
        !teammate.alive
        || teammate.id === actor.id
        || teammate.team !== actor.team
        || teammate.role === "healer"
      ) continue;

      const intent = teammate.aiIntent;
      const activeOffensiveIntent = Boolean(
        intent
        && intent.expiresAt > this.game.elapsedSeconds
        && offensiveIntentTypes.has(intent.type)
        && intent.targetId
      );
      const targetId = activeOffensiveIntent
        ? intent.targetId
        : (!intent ? teammate.aiTargetId : null);

      if (focusCounts.has(targetId)) {
        focusCounts.set(targetId, focusCounts.get(targetId) + 1);
      }
    }

    const counts = enemies.map(enemy => focusCounts.get(enemy.id) || 0);
    const minFocus = Math.min(...counts);
    const maxFocus = Math.max(...counts);

    // No accidental convergence exists yet, so normal class target priorities
    // may establish the first pressure target.
    if (maxFocus <= minFocus) return null;

    const currentFocus = currentTarget
      ? (focusCounts.get(currentTarget.id) || 0)
      : null;

    if (currentTarget && currentFocus <= minFocus) return null;

    // Even beginner opponents may help close an obvious near-death target.
    const cognition = this.individualCognitionStrength(actor);
    const naturalFinishPct = 0.14 + cognition * 0.10;
    if (currentTarget?.healthPct <= naturalFinishPct) return null;

    if (!this.shouldAttempt(
      actor,
      "beginner-target-dispersion:" + (currentTarget?.id || "new"),
      dispersion,
      4.8,
    )) return null;

    const priorityRoles = actor.config.ai.targetPriorityRoles
      || ["caster", "melee", "healer"];
    const roleRank = candidate => {
      const index = priorityRoles.indexOf(candidate.role);
      return index >= 0 ? index : priorityRoles.length;
    };

    const candidates = enemies
      .filter(enemy =>
        (focusCounts.get(enemy.id) || 0) === minFocus
        && !this.game.cc.shouldAvoidBreakingFriendlyCc(actor, enemy)
      )
      .sort((a, b) => {
        const roleDiff = roleRank(a) - roleRank(b);
        if (roleDiff !== 0) return roleDiff;

        const healthDiff = a.healthPct - b.healthPct;
        if (Math.abs(healthDiff) > 0.02) return healthDiff;

        return stableHash(actor.id + ":target-affinity:" + a.id)
          - stableHash(actor.id + ":target-affinity:" + b.id);
      });

    const target = candidates[0] || null;
    if (!target || target.id === currentTarget?.id) return null;

    actor.aiBeginnerTargetDispersionSwitches =
      (actor.aiBeginnerTargetDispersionSwitches || 0) + 1;

    return target;
  }

  pickVoluntarySwapTarget(actor, current, enemies) {
    if (!current?.alive || enemies.length < 2) return null;

    const alternatives = enemies
      .filter(candidate => candidate.id !== current.id)
      .sort((a, b) => a.healthPct - b.healthPct);
    const candidate = alternatives[0];
    if (!candidate) return null;

    const stickiness = this.behavior(actor, "targetStickiness", 0.58);
    const healerSwapBias = this.behavior(actor, "healerSwapBias", 0.42);
    const aggression = this.behavior(actor, "aggression", 0.65);
    const healthAdvantage = current.healthPct - candidate.healthPct;

    if (candidate.role === "healer" && healerSwapBias < 0.52) return null;
    if (candidate.role !== "healer" && healthAdvantage < -0.08) return null;

    const minInterval = 2.8 + stickiness * 5.2;
    const lastSwap = Number(actor.aiLastVoluntarySwapAt) || -99;
    if (this.game.elapsedSeconds - lastSwap < minInterval) return null;

    const killOpportunity = candidate.healthPct < 0.45 ? 0.18 : 0;
    const cognition = this.individualCognitionStrength(actor);
    const chance = (
      (1 - stickiness) * 0.46
      + Math.max(0, healthAdvantage) * 1.15
      + aggression * 0.08
      + killOpportunity
    ) * (0.20 + cognition * 0.80);

    if (!this.shouldAttempt(actor, "voluntary-swap", chance, 3.2)) return null;

    actor.aiLastVoluntarySwapAt = this.game.elapsedSeconds;
    return candidate;
  }

  pickPriorityTarget(actor, enemies) {
    const priorityRoles = actor.config.ai.targetPriorityRoles || ["caster", "melee", "healer"];

    for (const role of priorityRoles) {
      const candidates = enemies.filter(candidate => candidate.role === role);

      if (candidates.length > 0) {
        return candidates.sort((a, b) => a.healthPct - b.healthPct)[0];
      }
    }

    return enemies[0];
  }

  ready(actor, spell) {
    return (spell.ignoreGcd || actor.gcdRemaining <= 0)
      && actor.cooldownFor(spell.id) <= 0
      && !actor.cast
      && !this.game.cc.isHardControlled(actor)
      && !this.game.cc.isSchoolLocked(actor, spell)
      && this.game.resources.canPay(actor, spell);
  }

  castIfPossible(actor, spell, target) {
    if (
      Number.isFinite(spell?.aiStartRange)
      && spell.castMs > 0
      && spell.target === "enemy"
      && target?.alive
    ) {
      const maxStartDistance = spell.aiStartRange + actor.radius + target.radius;
      if (distance(actor, target) > maxStartDistance) return false;
      if (!this.game.combat.hasLos(actor, target)) return false;
    }

    return this.game.combat.tryCast(actor, spell, target, { silent: true });
  }

  casterManaRecoveryExitPct(actor, arenaState = null) {
    const configured = actor.config.ai.manaRecoveryExitPct;
    if (Number.isFinite(configured)) return configured;
    if (arenaState?.cleanup) return 0.34;
    if (arenaState?.disadvantage) return 0.20;
    return 0.30;
  }

  casterPressureSpells(actor, target) {
    return actor.spells.filter(spell =>
      spell.target === "enemy"
      && ["periodic", "bigDamage", "filler"].includes(spell.aiRole)
      && actor.cooldownFor(spell.id) <= 0
      && !this.game.cc.isSchoolLocked(actor, spell)
      && !(spell.aiRole === "periodic" && target.hasEffect(spell.id, actor.id))
    );
  }

  casterNeedsManaRecovery(actor, target, arenaState = null) {
    if (
      actor.role !== "caster"
      || actor.resource.type !== "mana"
      || !target?.alive
    ) {
      actor.aiManaRecoveryActive = false;
      actor.aiManaRecoveryPhaseMode = null;
      return false;
    }

    const state = arenaState || this.arenaState(actor.team);
    const exitPct = this.casterManaRecoveryExitPct(actor, state);

    // Hysteresis: once a caster has genuinely run dry, do not bounce back into
    // a single filler the instant 17 mana appears. Build a small resource bank
    // first unless the target is already in a natural finishing window.
    if (actor.aiManaRecoveryActive) {
      if (actor.resourcePct >= exitPct || target.healthPct <= 0.18) {
        actor.aiManaRecoveryActive = false;
        actor.aiManaRecoveryPhaseMode = null;
        return false;
      }
      return true;
    }

    if (actor.resourcePct > 0.35) return false;

    const pressureSpells = this.casterPressureSpells(actor, target);
    if (pressureSpells.length === 0) return false;

    const canAffordPressure = pressureSpells.some(spell =>
      this.game.resources.canPay(actor, spell)
    );
    if (canAffordPressure) return false;

    actor.aiManaRecoveryActive = true;
    actor.aiManaRecoveryPhaseMode = null;
    actor.aiManaRecoveryPhases = (actor.aiManaRecoveryPhases || 0) + 1;
    return true;
  }

  casterShouldHoldManaRecovery(actor, target, arenaState = null) {
    if (!this.casterNeedsManaRecovery(actor, target, arenaState)) return false;

    // Survival and peel trump mana banking. Under melee pressure the caster
    // should act/kite rather than becoming a stationary resource bot.
    if (this.findCasterMeleeThreat(actor)) return false;
    if (actor.healthPct < 0.42) return false;
    return true;
  }

  markManaRecoveryMode(actor, mode) {
    if (actor.aiManaRecoveryPhaseMode === mode) return;
    actor.aiManaRecoveryPhaseMode = mode;

    if (mode === "stationary") {
      actor.aiStationaryManaRecoveryPhases =
        (actor.aiStationaryManaRecoveryPhases || 0) + 1;
    } else if (mode === "mobile") {
      actor.aiMobileManaRecoveryPhases =
        (actor.aiMobileManaRecoveryPhases || 0) + 1;
    }
  }

  casterShouldSafeTurret(actor, target, healer, meleeThreat, arenaState = null) {
    const state = arenaState || this.arenaState(actor.team);
    if (
      actor.role !== "caster"
      || !target?.alive
      || meleeThreat
      || !state?.cleanup
      || state.enemyAlive !== 1
    ) return false;

    const preferred = actor.config.ai.preferredRange || 305;
    const dist = distance(actor, target);
    if (dist < preferred * 0.58 || dist > preferred * 1.10) return false;
    if (!hasLineOfSight(actor, target, this.game.arena.obstacles)) return false;

    // If the caster is actually in danger and cut off from the healer, recovering
    // support is still more important than turret uptime.
    if (
      healer?.alive
      && actor.healthPct < 0.68
      && !this.hasHealerSupport(actor, healer)
    ) return false;

    return true;
  }

  casterManaRecoveryVector(actor, target, healer = null) {
    const preferred = actor.config.ai.preferredRange || 305;
    const dist = distance(actor, target);
    const toward = normalize(target.x - actor.x, target.y - actor.y);
    const away = normalize(actor.x - target.x, actor.y - target.y);
    const sign = stableHash(actor.id + ":mana-recovery") % 2 === 0 ? 1 : -1;
    const side = { x: -toward.y * sign, y: toward.x * sign };

    let x = side.x;
    let y = side.y;

    if (dist < preferred * 0.82) {
      x += away.x * 1.15;
      y += away.y * 1.15;
    } else if (
      !hasLineOfSight(actor, target, this.game.arena.obstacles)
      || dist > preferred * 1.12
    ) {
      x += toward.x * 0.75;
      y += toward.y * 0.75;
    }

    if (healer?.alive && !this.hasHealerSupport(actor, healer)) {
      const toHealer = normalize(healer.x - actor.x, healer.y - actor.y);
      x += toHealer.x * 1.15;
      y += toHealer.y * 1.15;
    }

    const primary = normalize(x, y);
    const alternate = normalize(-side.x + away.x * 0.65, -side.y + away.y * 0.65);
    const candidates = [primary, alternate, away, toward];

    for (const candidate of candidates) {
      if (
        (candidate.x !== 0 || candidate.y !== 0)
        && !this.movement.wouldCollide(
          actor,
          candidate,
          Math.max(42, actor.radius * 2),
          this.game.arena,
        )
      ) return candidate;
    }

    return this.steer(actor, target, dist > preferred ? 1 : -1);
  }

  moveForRole(actor, target, deltaSeconds) {
    if (!target?.alive || this.game.cc.isRooted(actor)) return;

    if (actor.role === "healer") {
      const meleeThreat = this.meleeThreatTo(
        actor,
        actor.config.ai.peelThreatRange ?? 135,
      );

      if (meleeThreat) {
        const kiteBias = this.behavior(actor, "healerKiteBias", 0.62);
        const selfPreservation = this.behavior(actor, "healerSelfPreservation", 0.68);
        const kiteChance = 0.24 + kiteBias * 0.48 + this.skill(actor) * 0.18
          + (actor.healthPct < 0.55 ? selfPreservation * 0.22 : 0);

        if (
          actor.healthPct < 0.38
          || this.shouldAttempt(actor, "healer-kite", kiteChance, 1.7)
        ) {
          const escapeVector = this.kiteVector(actor, meleeThreat, null);

          if (escapeVector.x !== 0 || escapeVector.y !== 0) {
            this.movement.moveAI(actor, escapeVector, deltaSeconds, this.game.arena);
            return;
          }
        }
      }
    }

    if (actor.role === "caster") {
      const healer = this.getTeamHealer(actor);
      const meleeThreat = this.findCasterMeleeThreat(actor);
      const arenaState = this.arenaState(actor.team);

      if (
        healer
        && this.casterMustRecoverHealerSupport(actor)
      ) {
        const recoveryVector = this.healerSupportVector(actor, healer, meleeThreat);

        if (recoveryVector.x !== 0 || recoveryVector.y !== 0) {
          if (actor.aiManaRecoveryActive) {
            this.markManaRecoveryMode(actor, "mobile");
          }
          this.movement.moveAI(actor, recoveryVector, deltaSeconds, this.game.arena);
          return;
        }
      }

      if (meleeThreat) {
        const kiteBias = this.behavior(actor, "casterKiteBias", 0.68);
        const kiteChance = 0.25 + kiteBias * 0.50 + this.skill(actor) * 0.18;

        if (
          actor.healthPct < 0.42
          || this.shouldAttempt(actor, "caster-kite", kiteChance, 1.6)
        ) {
          const kiteVector = this.kiteVector(actor, meleeThreat, healer);

          if (kiteVector.x !== 0 || kiteVector.y !== 0) {
            if (actor.aiManaRecoveryActive) {
              this.markManaRecoveryMode(actor, "mobile");
            }
            actor.aiSafeTurretActive = false;
            this.movement.moveAI(actor, kiteVector, deltaSeconds, this.game.arena);
            return;
          }
        }
      }

      const recoveringMana = this.casterNeedsManaRecovery(
        actor,
        target,
        arenaState,
      );
      const safeTurret = this.casterShouldSafeTurret(
        actor,
        target,
        healer,
        meleeThreat,
        arenaState,
      );

      if (safeTurret) {
        if (!actor.aiSafeTurretActive) {
          actor.aiSafeTurretEntries = (actor.aiSafeTurretEntries || 0) + 1;
        }
        actor.aiSafeTurretActive = true;

        if (recoveringMana) {
          this.markManaRecoveryMode(actor, "stationary");
        }
        return;
      }

      actor.aiSafeTurretActive = false;

      if (recoveringMana) {
        this.markManaRecoveryMode(actor, "mobile");
        const recoveryVector = this.casterManaRecoveryVector(actor, target, healer);

        if (recoveryVector.x !== 0 || recoveryVector.y !== 0) {
          this.movement.moveAI(actor, recoveryVector, deltaSeconds, this.game.arena);
          return;
        }
      } else {
        actor.aiManaRecoveryPhaseMode = null;
      }
    }

    if (actor.role !== "healer" && this.shouldPullForControlledHealer(actor, target)) {
      const pullVector = this.healerLosPullVector(actor, target);

      if (pullVector.x !== 0 || pullVector.y !== 0) {
        this.movement.moveAI(actor, pullVector, deltaSeconds, this.game.arena);
        return;
      }
    }

    const preferred = actor.config.ai.preferredRange;
    const los = hasLineOfSight(actor, target, this.game.arena.obstacles);
    const dist = distance(actor, target);
    let vector = { x: 0, y: 0 };

    if (!los || dist > preferred * 1.08) {
      vector = this.steer(actor, target, 1);
    } else if (actor.role === "caster" && dist < preferred * 0.5) {
      vector = this.steer(actor, target, -1);
    } else if (actor.role === "healer") {
      const selfPreservation = this.behavior(actor, "healerSelfPreservation", 0.68);
      const comfortDistance = 92 + selfPreservation * 58;
      if (dist < comfortDistance) {
        vector = this.steer(actor, target, -0.35);
      }
    }

    if (vector.x !== 0 || vector.y !== 0) {
      this.movement.moveAI(actor, vector, deltaSeconds, this.game.arena);
    }
  }

  casterMustRecoverHealerSupport(actor) {
    if (actor.role !== "caster") return false;

    const healer = this.getTeamHealer(actor);
    if (!healer?.alive) return false;

    const meleeThreat = this.findCasterMeleeThreat(actor);
    const discipline = this.behavior(actor, "supportDiscipline", 0.68);
    const castGreed = this.behavior(actor, "casterCastGreed", 0.42);
    const skill = this.skill(actor);
    const healerLosHealthPct = actor.config.ai.healerLosHealthPct
      ?? (0.70 + discipline * 0.17 - castGreed * 0.05);
    const emergencyHealthPct = actor.config.ai.healerLosEmergencyPct
      ?? (0.50 + discipline * 0.14);
    const pressured = Boolean(meleeThreat);
    const low = actor.healthPct <= healerLosHealthPct;
    const emergency = actor.healthPct <= emergencyHealthPct;

    if (!pressured && !low) return false;

    const supported = this.hasHealerSupport(actor, healer);
    if (supported) return false;
    if (emergency) return true;

    const recoverChance = 0.24
      + discipline * 0.48
      + skill * 0.22
      - castGreed * 0.20;

    // Greedy casters occasionally finish pressure from a bad position; more
    // disciplined and higher-rated casters recover healer support sooner.
    return this.shouldAttempt(actor, "recover-healer-support", recoverChance, 1.5);
  }

  findCasterMeleeThreat(actor) {
    const threatRange = actor.config.ai.kiteThreatRange ?? 150;

    return this.game.actors
      .filter(candidate =>
        candidate.alive
        && candidate.team !== actor.team
        && candidate.role === "melee"
        && candidate.aiTargetId === actor.id
        && !this.game.cc.isHardControlled(candidate)
        && !this.game.cc.isRooted(candidate)
        && distance(candidate, actor) <= threatRange
      )
      .sort((a, b) => distance(a, actor) - distance(b, actor))[0] || null;
  }

  kiteVector(actor, threat, healer = null) {
    const arena = this.game.arena;
    const bounds = arena.bounds;
    const directAway = normalize(actor.x - threat.x, actor.y - threat.y);
    const sign = stableHash(actor.id + ":kite") % 2 === 0 ? 1 : -1;
    const side = {
      x: -directAway.y * sign,
      y: directAway.x * sign,
    };
    const arenaCenter = {
      x: bounds.x + bounds.w * 0.5,
      y: bounds.y + bounds.h * 0.5,
    };
    const towardCenter = normalize(
      arenaCenter.x - actor.x,
      arenaCenter.y - actor.y,
    );

    const edgeClearanceAt = point => Math.min(
      point.x - actor.radius - bounds.x,
      bounds.x + bounds.w - actor.radius - point.x,
      point.y - actor.radius - bounds.y,
      bounds.y + bounds.h - actor.radius - point.y,
    );

    const currentEdgeClearance = edgeClearanceAt(actor);
    const nearBoundary = currentEdgeClearance < 96;

    const rawCandidates = [
      directAway,
      normalize(directAway.x * 0.75 + side.x * 0.65, directAway.y * 0.75 + side.y * 0.65),
      normalize(directAway.x * 0.75 - side.x * 0.65, directAway.y * 0.75 - side.y * 0.65),
      side,
      { x: -side.x, y: -side.y },
    ];

    // When a healer is being chased against the outer wall, "away from melee"
    // can keep pointing out of the arena and eventually feed the actor into a
    // corner. Add inward escape lanes only when the healer is already close to
    // the boundary so normal pillar kiting remains unchanged.
    if (actor.role === "healer" && nearBoundary) {
      rawCandidates.push(
        towardCenter,
        normalize(
          directAway.x * 0.45 + towardCenter.x * 0.95,
          directAway.y * 0.45 + towardCenter.y * 0.95,
        ),
        normalize(
          side.x * 0.50 + towardCenter.x * 0.92,
          side.y * 0.50 + towardCenter.y * 0.92,
        ),
        normalize(
          -side.x * 0.50 + towardCenter.x * 0.92,
          -side.y * 0.50 + towardCenter.y * 0.92,
        ),
      );
    }

    const immediateProbe = Math.max(18, actor.radius);
    const candidates = rawCandidates.filter(candidate =>
      !this.movement.wouldCollide(actor, candidate, immediateProbe, arena)
    );

    // If every normal escape direction is blocked, prefer an inward step for a
    // boundary-pinned healer before falling back to the direct-away vector.
    if (candidates.length === 0) {
      if (
        actor.role === "healer"
        && nearBoundary
        && !this.movement.wouldCollide(actor, towardCenter, immediateProbe, arena)
      ) {
        if (!actor.aiBoundaryEscapeActive) {
          actor.aiBoundaryEscapeSelections = (actor.aiBoundaryEscapeSelections || 0) + 1;
        }
        actor.aiBoundaryEscapeActive = true;
        return towardCenter;
      }

      return directAway;
    }

    const probeDistance = 54;
    const laneProbeDistances = [32, 58, 86];

    const scored = candidates.map(candidate => {
      const probe = {
        x: actor.x + candidate.x * probeDistance,
        y: actor.y + candidate.y * probeDistance,
      };

      let score = distance(probe, threat);
      const futureEdgeClearance = edgeClearanceAt(probe);

      // Avoid choosing a vector that is legal for one tiny step but runs into
      // an outer wall or pillar immediately afterwards.
      let blockedLaneSamples = 0;
      for (const laneDistance of laneProbeDistances) {
        if (this.movement.wouldCollide(actor, candidate, laneDistance, arena)) {
          blockedLaneSamples += 1;
        }
      }
      score -= blockedLaneSamples * 210;

      // Preserve breathing room from the outer walls. This is deliberately
      // mild in open space and becomes strong only near the boundary/corners.
      const boundedClearance = Math.max(-80, Math.min(130, futureEdgeClearance));
      score += boundedClearance * 0.65;

      if (futureEdgeClearance < 58) {
        score -= (58 - futureEdgeClearance) * 4.2;
      }

      if (actor.role === "healer" && nearBoundary) {
        const inwardProgress =
          candidate.x * towardCenter.x + candidate.y * towardCenter.y;
        score += inwardProgress * 190;
      }

      if (healer?.alive) {
        if (this.hasHealerSupport(probe, healer, actor.radius)) {
          score += 260;
        } else {
          score -= 220;
        }

        const supportRange = this.healerSupportRange(healer);
        const healerDistance = distance(probe, healer);
        if (healerDistance > supportRange * 0.92) {
          score -= (healerDistance - supportRange * 0.92) * 1.6;
        }
      }

      return {
        candidate,
        score,
        futureEdgeClearance,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    const selected = scored[0];

    if (actor.role === "healer") {
      const escapingBoundary =
        nearBoundary
        && selected.futureEdgeClearance > currentEdgeClearance + 6;

      if (escapingBoundary) {
        if (!actor.aiBoundaryEscapeActive) {
          actor.aiBoundaryEscapeSelections = (actor.aiBoundaryEscapeSelections || 0) + 1;
        }
        actor.aiBoundaryEscapeActive = true;
      } else if (currentEdgeClearance > 126) {
        actor.aiBoundaryEscapeActive = false;
      }
    }

    return selected.candidate;
  }

  hasHealerSupport(actorOrPoint, healer, actorRadius = null) {
    if (!healer?.alive) return true;

    const radius = actorRadius ?? actorOrPoint.radius ?? 0;
    const supportRange = this.healerSupportRange(healer);
    const inRange = distance(actorOrPoint, healer) <= supportRange + radius + healer.radius;
    const los = hasLineOfSight(actorOrPoint, healer, this.game.arena.obstacles);

    return inRange && los;
  }

  healerSupportRange(healer) {
    const allyRanges = healer.spells
      .filter(spell => spell.target === "ally")
      .map(spell => spell.range || 0);

    return allyRanges.length > 0 ? Math.max(...allyRanges) : 330;
  }

  healerSupportVector(actor, healer, threat = null) {
    const towardHealer = this.steer(actor, healer, 1);
    if (!threat) return towardHealer;

    const awayFromThreat = normalize(actor.x - threat.x, actor.y - threat.y);
    const combined = normalize(
      towardHealer.x * 1.15 + awayFromThreat.x * 0.55,
      towardHealer.y * 1.15 + awayFromThreat.y * 0.55,
    );

    if (
      (combined.x !== 0 || combined.y !== 0)
      && !this.movement.wouldCollide(actor, combined, Math.max(16, actor.radius * 0.9), this.game.arena)
    ) {
      return combined;
    }

    return towardHealer;
  }

  shouldPullForControlledHealer(actor, target) {
    if (actor.config.ai.repositionWhenHealerControlled === false) return false;

    const healer = this.getTeamHealer(actor);
    if (!healer || !this.game.cc.isHardControlled(healer)) return false;
    if (hasLineOfSight(healer, target, this.game.arena.obstacles)) return false;

    const chaseGreed = this.behavior(actor, "chaseGreed", 0.48);
    const discipline = 0.40 + this.skill(actor) * 0.46 - chaseGreed * 0.24;

    // A greedy player can overchase while the healer is controlled. High-rating
    // AI does this less often, but personality never disappears entirely.
    return this.shouldAttempt(actor, "controlled-healer-pull", discipline, 2.0);
  }

  healerLosPullVector(actor, target) {
    const healer = this.getTeamHealer(actor);
    if (!healer) return { x: 0, y: 0 };

    const pullDistance = actor.config.ai.healerLosPullDistance ?? 115;
    const healerToTarget = normalize(target.x - healer.x, target.y - healer.y);

    const pullPoint = {
      x: healer.x + healerToTarget.x * pullDistance,
      y: healer.y + healerToTarget.y * pullDistance,
    };

    const distToPullPoint = distance(actor, pullPoint);

    if (distToPullPoint > 52) {
      return this.steer(actor, pullPoint, 1);
    }

    const sign = stableHash(actor.id + ":healer-pull") % 2 === 0 ? 1 : -1;
    const side = {
      x: -healerToTarget.y * sign,
      y: healerToTarget.x * sign,
    };

    if (!this.movement.wouldCollide(actor, side, Math.max(16, actor.radius * 0.9), this.game.arena)) {
      return side;
    }

    return this.steer(actor, healer, 1);
  }

  getTeamHealer(actor) {
    return this.game.actors.find(candidate =>
      candidate.alive
      && candidate.team === actor.team
      && candidate.role === "healer"
    );
  }

  steer(actor, target, toward = 1) {
    const direct = normalize((target.x - actor.x) * toward, (target.y - actor.y) * toward);
    const arena = this.game.arena;

    // Look farther ahead than a single movement frame. Previously an AI could
    // choose a direction that was clear for ~15px, walk right up to a pillar,
    // then spend several route flips hugging the same corner. Starting the
    // detour before contact makes caster/healer repositioning much smoother.
    const directProbe = Math.max(56, actor.radius * 2.8);
    if (!this.movement.wouldCollide(actor, direct, directProbe, arena)) {
      return direct;
    }

    const sign = actor.aiAvoidanceSign === 1 || actor.aiAvoidanceSign === -1
      ? actor.aiAvoidanceSign
      : (stableHash(actor.id) % 2 === 0 ? 1 : -1);
    const side = { x: -direct.y * sign, y: direct.x * sign };

    const candidates = [
      normalize(direct.x * 0.55 + side.x * 0.85, direct.y * 0.55 + side.y * 0.85),
      normalize(direct.x * 0.55 - side.x * 0.85, direct.y * 0.55 - side.y * 0.85),
      normalize(direct.x * 0.20 + side.x, direct.y * 0.20 + side.y),
      normalize(direct.x * 0.20 - side.x, direct.y * 0.20 - side.y),
      side,
      { x: -side.x, y: -side.y },
    ];

    const lookahead = [32, 58, 86];
    const scored = candidates.map((candidate, index) => {
      let clearSamples = 0;
      let firstBlockedAt = 110;

      for (const probe of lookahead) {
        if (this.movement.wouldCollide(actor, candidate, probe, arena)) {
          firstBlockedAt = probe;
          break;
        }
        clearSamples += 1;
      }

      // Prefer a route that stays clear for several actor diameters. The tiny
      // index bias preserves the actor's stable avoidance side when routes are
      // otherwise equivalent, preventing left/right jitter at pillar corners.
      return {
        candidate,
        score: clearSamples * 100 + firstBlockedAt - index * 0.25,
      };
    });

    scored.sort((a, b) => b.score - a.score);

    if (scored[0]?.score >= 132) {
      return scored[0].candidate;
    }

    // Do not give up here. A zero vector means moveAI never runs, so its
    // alternate-angle and stuck-recovery logic cannot help at a pillar corner.
    return direct;
  }
}
