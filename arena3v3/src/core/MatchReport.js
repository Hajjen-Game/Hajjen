function n(value) {
  return Math.round(value || 0);
}

function pct(value, digits = 1) {
  return (Math.max(0, Number(value) || 0) * 100).toFixed(digits) + "%";
}

function formatResource(resource) {
  if (!resource || resource.max <= 0) return "None";
  return (
    String(resource.type || "resource").toUpperCase()
    + " " + n(resource.max)
    + " max · " + Number(resource.regenPerSecond || 0).toFixed(2) + "/s regen"
  );
}

function playerLoadout(game) {
  return game.matchLoadoutSnapshot
    || game.capturePlayerLoadoutSnapshot?.()
    || null;
}

function appendTalentSection(lines, game, loadout) {
  lines.push("", "=== TALENT BUILD ===");

  if (!loadout?.talents) {
    lines.push("No talent snapshot available.");
    return;
  }

  lines.push(
    "Talent Points: "
    + loadout.talents.spentPoints + " spent"
    + " | " + loadout.talents.availablePoints + " available"
    + " | " + (loadout.honor?.talentPoints ?? 0) + " earned",
  );

  const branches = game.talents?.tree?.branches || [];
  if (branches.length > 0) {
    lines.push(
      "Branch points: "
      + branches.map(branch =>
        branch.name + " " + (loadout.talents.branchPoints?.[branch.id] || 0)
      ).join(" | "),
    );
  }

  if (!loadout.talents.entries?.length) {
    lines.push("Allocated talents: None");
    return;
  }

  for (const branch of branches) {
    const entries = loadout.talents.entries.filter(entry => entry.branchId === branch.id);
    if (entries.length === 0) continue;

    lines.push(
      branch.name + ": "
      + entries.map(entry =>
        entry.name + " " + entry.rank + "/" + entry.maxRank
      ).join(", "),
    );
  }
}

function appendGearSection(lines, loadout) {
  lines.push("", "=== GEAR LOADOUT ===");

  if (!loadout?.gear) {
    lines.push("No gear snapshot available.");
    return;
  }

  if (loadout.gear.setName) {
    lines.push(
      "Set: " + loadout.gear.setName
      + " · " + loadout.gear.setPieces + "/6 set pieces",
    );
  } else {
    lines.push("Set: None");
  }

  if (loadout.gear.activeSetBonuses?.length) {
    lines.push(
      "Active set bonuses: "
      + loadout.gear.activeSetBonuses
        .map(bonus => bonus.pieces + "pc " + bonus.description)
        .join(" | "),
    );
  } else {
    lines.push("Active set bonuses: None");
  }

  if (loadout.gear.equipped?.length) {
    lines.push(
      "Equipped: "
      + loadout.gear.equipped
        .map(item => item.slotLabel + ": " + item.name)
        .join(" | "),
    );
  } else {
    lines.push("Equipped: None");
  }
}

function appendPlayerStats(lines, loadout) {
  lines.push("", "=== PLAYER STATS AT MATCH START ===");

  if (!loadout?.stats) {
    lines.push("No player stat snapshot available.");
    return;
  }

  lines.push(
    "Health " + n(loadout.stats.maxHealth)
    + " | Move " + n(loadout.stats.moveSpeed)
    + " | Hit " + pct(loadout.stats.hitChance)
    + " | Crit " + pct(loadout.stats.critChance)
    + " | Dodge " + pct(loadout.stats.dodgeChance)
    + " | Resolve " + pct(loadout.stats.baseDamageReduction),
  );

  lines.push("Resource: " + formatResource(loadout.resource));

  if (loadout.spells?.length) {
    lines.push("Abilities: " + loadout.spells.map(spell => spell.name).join(", "));
  }
}

function appendAiProgression(lines, game, team, title) {
  lines.push("", "=== " + title + " ===");

  const actors = game.actors.filter(actor =>
    actor.team === team && actor.control !== "player"
  );

  if (actors.length === 0) {
    lines.push("No AI progression snapshot available.");
    return;
  }

  for (const actor of actors) {
    const progression = actor.config?.aiProgression
      || actor.config?.enemyProgression;

    if (!progression) {
      lines.push(actor.name + " [" + actor.className + "] — progression unavailable");
      continue;
    }

    lines.push(
      actor.name + " [" + actor.className + "]"
      + " — Rank " + progression.rank
      + " | Rating " + (progression.rating ?? "—")
      + (
        Number.isFinite(progression.decisionRating)
        && progression.decisionRating !== progression.rating
          ? " | AI Difficulty " + progression.decisionRating
          : ""
      )
      + " | Talent Points " + progression.spentPoints + "/" + progression.talentPoints,
    );

    const gear = actor.config?.aiGearProgression;
    const gearItems = gear?.equippedItems || [];
    if (gear) {
      lines.push(
        "  Gear: "
        + (gearItems.length > 0
          ? gearItems.map(item => item.name).join(" | ")
          : "None")
        + (gear.setPieces > 0 ? " · " + gear.setPieces + "/6 set pieces" : ""),
      );
    }

    const grouped = new Map();
    for (const entry of progression.entries || []) {
      if (!grouped.has(entry.branchName)) grouped.set(entry.branchName, []);
      grouped.get(entry.branchName).push(entry);
    }

    if (grouped.size === 0) {
      lines.push("  Talents: None");
      continue;
    }

    for (const [branchName, entries] of grouped.entries()) {
      lines.push(
        "  " + branchName + ": "
        + entries.map(entry =>
          entry.name + " " + entry.rank + "/" + entry.maxRank
        ).join(", "),
      );
    }
  }
}

function trait(value) {
  return (Math.max(0, Math.min(1, Number(value) || 0)) * 100).toFixed(0) + "%";
}

function formatMemoryEvent(event) {
  const subject = event.subjectName ? " " + event.subjectName : "";
  const source = event.sourceName ? " from " + event.sourceName : "";
  const spell = event.spellName ? " · " + event.spellName : "";
  const value = Number.isFinite(event.value)
    ? " · " + Math.round(event.value * 100) + "%"
    : "";

  return event.at.toFixed(1) + "s " + event.type.toUpperCase()
    + subject + source + spell + value;
}

function modelPct(value) {
  return (Math.max(0, Math.min(1, Number(value) || 0)) * 100).toFixed(0) + "%";
}

function opponentModelSummary(actor, model, game) {
  const skill = Math.max(
    0,
    Math.min(1, Number(actor.config?.aiBehaviorProfile?.skill) || 0),
  );
  const sampleProgress = Math.max(
    0,
    Math.min(1, (Number(model.observations) || 0) / 70),
  );
  const confidence = Math.max(
    0,
    Math.min(1, sampleProgress * (0.38 + skill * 0.54)),
  );

  const activeHold = model.currentTargetId && Number.isFinite(model.currentTargetSince)
    ? Math.min(12, Math.max(0, game.elapsedSeconds - model.currentTargetSince))
    : 0;
  const holdCount = (model.completedTargetHolds || 0) + (activeHold > 0 ? 1 : 0);
  const averageHold = holdCount > 0
    ? ((model.totalTargetHoldSeconds || 0) + activeHold) / holdCount
    : 0;
  const samples = Math.max(1, Number(model.targetSamples) || 0);
  const roleSamples = model.roleSamples || {};

  return {
    confidence,
    averageHold,
    healerFocus: (roleSamples.healer || 0) / samples,
    meleeFocus: (roleSamples.melee || 0) / samples,
    casterFocus: (roleSamples.caster || 0) / samples,
    averageDefensiveHealth: (model.defensiveUses || 0) > 0
      ? (model.defensiveHealthTotal || 0) / model.defensiveUses
      : null,
  };
}

function appendTeamCoordination(lines, game) {
  lines.push("", "=== TEAM PLAN / PLAYER INTENT MODEL ===");

  const ai = game.ai;
  const playerModel = ai?.playerIntentModel || null;

  if (!ai) {
    lines.push("Team coordination unavailable.");
    return;
  }

  if (playerModel) {
    lines.push(
      "Player intent model:"
      + " inferred target "
      + (playerModel.targetName || "None")
      + " | confidence " + modelPct(playerModel.confidence)
      + " | offensive signals " + (playerModel.signals?.offensive || 0)
      + " | setup signals " + (playerModel.signals?.setup || 0)
      + " | defensive signals " + (playerModel.signals?.defensive || 0),
    );

    const playerHistory = (playerModel.history || []).slice(-10);
    if (playerHistory.length > 0) {
      lines.push("  Player intent history:");
      playerHistory.forEach(entry => {
        lines.push(
          "    " + entry.at.toFixed(1) + "s"
          + " -> " + entry.targetName
          + " · confidence " + modelPct(entry.confidence)
          + " · " + entry.reason,
        );
      });
    }
  }

  for (const team of ["friendly", "enemy"]) {
    const plan = ai.teamPlans?.[team];
    if (!plan) continue;

    lines.push(
      (team === "friendly" ? "Friendly" : "Enemy")
      + " team plan:"
      + " " + plan.state
      + " | primary " + (plan.primaryTargetName || "None")
      + " | confidence " + modelPct(plan.confidence)
      + " | source " + plan.source
      + " | revision " + plan.revision
      + " | " + plan.reason,
    );

    const history = (plan.history || []).slice(-12);
    if (history.length > 0) {
      lines.push("  Recent plan changes:");
      history.forEach(entry => {
        lines.push(
          "    " + entry.at.toFixed(1) + "s"
          + " #" + entry.revision
          + " " + entry.state
          + (entry.targetName ? " -> " + entry.targetName : "")
          + " · confidence " + modelPct(entry.confidence)
          + " · " + entry.source
          + " · " + entry.reason,
        );
      });
    }

    const members = game.actors.filter(actor =>
      actor.team === team && actor.control !== "player"
    );
    if (members.length > 0) {
      lines.push(
        "  AI plan response: "
        + members.map(actor => {
          const usage = actor.aiTeamPlanUsage || {};
          return actor.name
            + " follows " + (usage.follows || 0)
            + " / divergences " + (usage.divergences || 0);
        }).join(" | "),
      );
    }
  }
}

function appendAiIdentityMemoryIntent(lines, game) {
  lines.push("", "=== AI IDENTITY / MEMORY / OPPONENT MODEL / INTENT ===");

  const actors = game.actors.filter(actor => actor.control !== "player");
  if (actors.length === 0) {
    lines.push("No AI cognition data available.");
    return;
  }

  for (const actor of actors) {
    const profile = actor.config?.aiBehaviorProfile || {};
    const memory = actor.aiMemory || null;
    const history = actor.aiIntentHistory || [];
    const currentIntent = actor.aiIntent || null;
    const deathEvent = game.deathEvents.find(event => event.id === actor.id) || null;

    lines.push(
      actor.name + " [" + actor.className + " / " + actor.team + "]"
      + " — Rating " + (profile.rating ?? "—")
      + " | Skill " + trait(profile.skill)
      + " | Seed " + (profile.seed ?? "—"),
    );

    lines.push(
      "  Identity shared:"
      + " volatility " + trait(profile.volatility)
      + " | aggression " + trait(profile.aggression)
      + " | stickiness " + trait(profile.targetStickiness)
      + " | healerSwap " + trait(profile.healerSwapBias)
      + " | peel " + trait(profile.peelBias)
      + " | CC " + trait(profile.ccBias)
      + " | defensiveGreed " + trait(profile.defensiveGreed)
      + " | interruptDiscipline " + trait(profile.interruptDiscipline)
      + " | chaseGreed " + trait(profile.chaseGreed),
    );

    if (actor.role === "healer") {
      lines.push(
        "  Identity healer:"
        + " offense " + trait(profile.healerOffenseBias)
        + " | triage " + trait(profile.healerTriage)
        + " | manaConservation " + trait(profile.manaConservation)
        + " | kite " + trait(profile.healerKiteBias)
        + " | selfPreservation " + trait(profile.healerSelfPreservation)
        + " | castGreed " + trait(profile.healerCastGreed),
      );
      lines.push(
        "  Healer intent hysteresis: "
        + (actor.aiHealerIntentHolds || 0)
        + " replan attempts held by minimum commitment",
      );
    }

    if (actor.role === "caster") {
      lines.push(
        "  Identity caster:"
        + " kite " + trait(profile.casterKiteBias)
        + " | supportDiscipline " + trait(profile.supportDiscipline)
        + " | castGreed " + trait(profile.casterCastGreed),
      );
    }

    if (!memory) {
      lines.push("  Memory: no observations recorded.");
    } else {
      const totals = memory.totals || {};
      lines.push(
        "  Memory:"
        + " observations " + (memory.observations || 0)
        + " | target swaps " + (memory.targetSwaps || 0)
        + " | low-health sightings " + (totals.lowHealthSeen || 0)
        + " | low-mana healer sightings " + (totals.lowManaHealerSeen || 0)
        + " | defensives seen " + (totals.defensivesSeen || 0)
        + " | bursts seen " + (totals.burstsSeen || 0)
        + " | pressure sightings " + (totals.pressureSeen || 0)
        + " | healer CC seen " + (totals.healerCcSeen || 0)
        + " | deaths seen " + (totals.deathsSeen || 0),
      );

      const events = (memory.events || []).slice(-10);
      if (events.length > 0) {
        lines.push("  Recent memory events:");
        events.forEach(event => lines.push("    " + formatMemoryEvent(event)));
      }
    }

    const models = Object.values(actor.aiOpponentModels || {});
    const usage = actor.aiOpponentModelUsage || {};
    lines.push(
      "  Opponent model usage:"
      + " triage target selections " + (usage.triageTargetSelections || 0)
      + " | peel assists " + (usage.peelAssists || 0)
      + " | defensive anticipations " + (usage.defensiveAnticipations || 0),
    );
    const teamUsage = actor.aiTeamPlanUsage || {};
    lines.push(
      "  Team plan usage:"
      + " follows " + (teamUsage.follows || 0)
      + " | divergences " + (teamUsage.divergences || 0),
    );

    const hasSlowDamageSpell = (actor.spells || []).some(spell =>
      spell.effects?.some(effect =>
        effect.kind === "slow"
        || (effect.kind === "chainDamage" && effect.primarySlow)
      )
    );
    if (hasSlowDamageSpell) {
      const slowUsage = actor.aiSlowUsage || {};
      lines.push(
        "  Tactical slow usage:"
        + " casts " + (slowUsage.casts || 0)
        + " | melee assists " + (slowUsage.meleeAssists || 0)
        + " | teammate peels " + (slowUsage.teammatePeels || 0)
        + " | self-peels " + (slowUsage.selfPeels || 0)
        + " | model-assisted " + (slowUsage.modelAssisted || 0)
        + " | team-assisted " + (slowUsage.teamAssisted || 0),
      );
    }

    if (models.length === 0) {
      lines.push("  Opponent models: none formed.");
    } else {
      lines.push("  Opponent models:");
      for (const model of models) {
        const summary = opponentModelSummary(actor, model, game);
        const defensiveText = (model.defensiveUses || 0) > 0
          ? (model.defensiveUses || 0)
            + " @ avg " + modelPct(summary.averageDefensiveHealth) + " HP"
          : "0";

        lines.push(
          "    " + model.enemyName
          + " [" + model.className + " / " + model.role + "]"
          + " — confidence " + modelPct(summary.confidence)
          + " | target samples " + (model.targetSamples || 0)
          + " | focus H/M/C "
            + modelPct(summary.healerFocus) + "/"
            + modelPct(summary.meleeFocus) + "/"
            + modelPct(summary.casterFocus)
          + " | avg hold " + summary.averageHold.toFixed(1) + "s"
          + " | switches " + (model.targetSwitches || 0)
          + " | pressure events " + (model.pressureEvents || 0)
          + " | defensives " + defensiveText
          + " | bursts " + (model.burstUses || 0),
        );
      }
    }

    const intentCounts = {};
    for (const intent of history) {
      intentCounts[intent.type] = (intentCounts[intent.type] || 0) + 1;
    }

    const countText = Object.entries(intentCounts)
      .map(([type, count]) => type + " " + count)
      .join(" | ");

    lines.push(
      "  Intents: " + history.length
      + (countText ? " · " + countText : ""),
    );

    for (const intent of history) {
      const isCurrentIntent = Boolean(
        currentIntent
        && currentIntent.startedAt === intent.startedAt
        && currentIntent.type === intent.type
      );
      const diedDuringIntent = Boolean(
        deathEvent
        && deathEvent.time >= intent.startedAt
        && intent.endedAt == null
        && isCurrentIntent
      );
      const endAt = intent.endedAt ?? (
        diedDuringIntent
          ? deathEvent.time
          : isCurrentIntent
            ? game.elapsedSeconds
            : intent.expiresAt
      );
      const target = intent.targetName ? " -> " + intent.targetName : "";
      const reason = intent.reason ? " · " + intent.reason : "";
      const effectiveEndReason = intent.endReason || (diedDuringIntent ? "death" : "");
      const endReason = effectiveEndReason ? " · end " + effectiveEndReason : "";

      lines.push(
        "    " + intent.startedAt.toFixed(1)
        + "-" + Math.max(intent.startedAt, endAt).toFixed(1) + "s"
        + " " + intent.type + target + reason + endReason,
      );
    }
  }
}

function appendTeam(lines, game, team) {
  for (const actor of game.actors.filter(unit => unit.team === team)) {
    const stats = game.matchStats.get(actor.id);

    lines.push(
      actor.name
      + " [" + actor.className + " / " + actor.role
      + (actor.control === "player" ? " / PLAYER" : " / AI") + "]"
      + " — HP " + n(actor.health) + "/" + actor.maxHealth
      + " | " + actor.resource.type.toUpperCase() + " " + n(actor.resource.value) + "/" + actor.resource.max
      + " | Damage " + n(stats?.damage)
      + " | Healing " + n(stats?.healing)
      + " | Taken " + n(stats?.damageTaken)
      + " | Healing Received " + n(stats?.healingReceived)
      + " | Casts " + n(stats?.casts)
      + " | Crits " + n(stats?.crits)
      + " | Misses " + n(stats?.misses)
      + " | Dodges " + n(stats?.dodges)
      + " | Interrupts " + n(stats?.interrupts)
      + " | CC " + n(stats?.ccApplied)
      + " (" + (stats?.ccSeconds || 0).toFixed(1) + "s)",
    );
  }
}

export function buildMatchReport(game) {
  const result = game.resultText || (game.ended ? "ENDED" : "IN PROGRESS");
  const loadout = playerLoadout(game);
  const startHonor = loadout?.honor || null;
  const startRating = loadout?.rating || null;
  const currentHonor = game.honor?.status?.() || null;
  const currentRating = game.rating?.status?.() || null;
  const award = game.lastHonorAward || null;
  const ratingAward = game.lastRatingAward || null;

  const friendlyComposition = game.actors
    .filter(actor => actor.team === "friendly")
    .map(actor => actor.className)
    .join(" / ");
  const enemyComposition = game.actors
    .filter(actor => actor.team === "enemy")
    .map(actor => actor.className)
    .join(" / ");

  const lines = [
    "3V3 ARENA — STRESS TEST RUN REPORT",
    "Report schema: stress-v5-ai-team-plan",
    "Arena: " + game.arena.name,
    "Result: " + result,
    "Duration: " + game.elapsedSeconds.toFixed(1) + "s",
    "Final Dampening: " + game.dampening.percent + "%",
    "Friendly composition: " + friendlyComposition,
    "Enemy composition: " + enemyComposition,
    "",
    "=== CHARACTER / PROGRESSION AT MATCH START ===",
    "Character: "
      + (loadout?.characterName || game.activeCharacterName || game.player?.name || "Player")
      + " [" + (loadout?.className || game.player?.className || "Unknown")
      + " / " + (loadout?.role || game.player?.role || "unknown") + "]",
  ];

  if (startHonor) {
    lines.push(
      "Rank: " + startHonor.rank
      + " | Rating: " + n(startRating?.rating)
      + " | Lifetime Honor " + n(startHonor.lifetimeHonor)
      + " | Spendable Honor " + n(startHonor.honorPoints),
    );
  } else {
    lines.push("Progression snapshot unavailable.");
  }

  if (award) {
    lines.push(
      "Match reward: +" + award.honor + " Honor"
      + (ratingAward
        ? " | Rating "
          + (ratingAward.change >= 0 ? "+" : "")
          + ratingAward.change
          + " → " + ratingAward.after
        : "")
      + " | Rank after match " + award.rankAfter
      + (award.rankedUp ? " | RANK UP +" + award.talentPointsGained + " Talent Point" + (award.talentPointsGained === 1 ? "" : "s") : ""),
    );
  } else if (currentHonor && game.ended) {
    lines.push(
      "Progression after match: Rank " + currentHonor.rank
      + " | Rating " + n(currentRating?.rating)
      + " | Lifetime Honor " + n(currentHonor.lifetimeHonor)
      + " | Spendable Honor " + n(currentHonor.honorPoints),
    );
  }

  appendTalentSection(lines, game, loadout);
  appendGearSection(lines, loadout);
  appendPlayerStats(lines, loadout);
  appendAiProgression(lines, game, "friendly", "FRIENDLY AI PROGRESSION / TALENT BUILDS");
  appendAiProgression(lines, game, "enemy", "ENEMY PROGRESSION / TALENT BUILDS");
  appendTeamCoordination(lines, game);
  appendAiIdentityMemoryIntent(lines, game);

  lines.push(
    "",
    "=== MATCH RULES / CONTEXT ===",
    "Ability queue: 400ms",
    "AI decision difficulty: friendly "
      + (
        game.actors.find(actor => actor.team === "friendly" && actor.control !== "player")
          ?.config?.aiProgression?.decisionRating
        ?? n(startRating?.rating)
      )
      + " | enemy "
      + (
        game.actors.find(actor => actor.team === "enemy" && actor.control !== "player")
          ?.config?.aiProgression?.decisionRating
        ?? n(startRating?.rating)
      )
      + " (player Rating " + n(startRating?.rating)
      + "; enemy onboarding handicap fades out by 2200; Rank still controls talents/gear)",
    "AI cognition: Memory + individual Intent + Opponent Modelling + Team Plan enabled; friendly AI infers player intent from observable actions; healer intents use short commitment hysteresis; identity/cognition exposed in run report only",
    "Cast completion grace: +20 units for targeted ranged casts (start range and LOS unchanged)",
    "Dampening: 0% until 45s, then 10%, +2% every 10s",
    "CC DR: full duration -> 50% -> immune; category resets 20s after control ends",
    "Player death: friendly AI can continue; player may spectate or forfeit",
    "",
    "=== FRIENDLY TEAM — FINAL COMBAT STATS ===",
  );

  appendTeam(lines, game, "friendly");
  lines.push("", "=== ENEMY TEAM — FINAL COMBAT STATS ===");
  appendTeam(lines, game, "enemy");

  lines.push("", "=== DEATH ORDER ===");
  if (game.deathEvents.length === 0) {
    lines.push("None");
  } else {
    game.deathEvents.forEach(event => {
      lines.push(event.time.toFixed(1) + "s — " + event.name);
    });
  }

  lines.push("", "=== AI MOVEMENT DIAGNOSTICS ===");
  const movementDiagnostics = game.actors
    .filter(actor => actor.control !== "player")
    .map(actor => ({
      name: actor.name,
      className: actor.className,
      reroutes: actor.aiPathReroutes || 0,
      overlapRecoveries: actor.aiOverlapRecoveries || 0,
      boundaryEscapes: actor.aiBoundaryEscapeSelections || 0,
    }))
    .filter(item =>
      item.reroutes > 0
      || item.overlapRecoveries > 0
      || item.boundaryEscapes > 0
    );

  if (movementDiagnostics.length === 0) {
    lines.push("No path recovery events recorded.");
  } else {
    movementDiagnostics.forEach(item => {
      lines.push(
        item.name + " [" + item.className + "]"
        + " — route flips " + item.reroutes
        + " | collider recoveries " + item.overlapRecoveries
        + " | boundary escapes " + item.boundaryEscapes,
      );
    });
  }

  lines.push("", "=== CAST RANGE / LOS DIAGNOSTICS ===");
  const castDiagnostics = game.actors.flatMap(actor =>
    Object.entries(actor.castRangeDiagnostics || {}).map(([spellId, diagnostic]) => ({
      label: actor.control === "player"
        ? "Player [" + actor.className + "]"
        : actor.name + " [" + actor.className + "]",
      spellName: actor.getSpell(spellId)?.name || spellId,
      starts: diagnostic.starts || 0,
      graceSaves: diagnostic.graceSaves || 0,
      outOfRangeFailures: diagnostic.outOfRangeFailures || 0,
      losFailures: diagnostic.losFailures || 0,
      bothFailures: diagnostic.bothFailures || 0,
      samples: diagnostic.samples || [],
    }))
  );

  if (castDiagnostics.length === 0) {
    lines.push("No casted spells recorded.");
  } else {
    castDiagnostics.forEach(item => {
      lines.push(
        item.label
        + " — " + item.spellName
        + " starts " + item.starts
        + " | GRACE SAVES " + item.graceSaves
        + " | OUT OF RANGE " + item.outOfRangeFailures
        + " | LOS " + item.losFailures
        + " | BOTH " + item.bothFailures,
      );

      item.samples.forEach(sample => {
        lines.push(
          "  " + sample.reason
          + " · start " + sample.startDistance
          + " -> end " + sample.endDistance
          + " · range " + sample.range
          + (sample.completionRange > sample.range
            ? " · completion limit " + sample.completionRange
            : ""),
        );
      });
    });
  }

  lines.push("", "=== UNEXPECTED RESET / RELOAD DIAGNOSTICS ===");
  const resetDiagnostics = (game.resetDiagnostics || []).filter(event => {
    if (event.kind === "reload") return true;

    const normalReasons = new Set(["character select", "arena lobby", "match start"]);
    return Number(event.previousElapsedSeconds || 0) > 1
      && !normalReasons.has(event.reason);
  });

  if (resetDiagnostics.length === 0) {
    lines.push("None detected.");
  } else {
    resetDiagnostics.forEach(event => {
      const at = Number(event.previousElapsedSeconds || 0).toFixed(1);
      lines.push(
        event.kind.toUpperCase()
        + " — previous match " + at + "s"
        + " — " + event.reason
        + (event.recordedAt ? " — " + event.recordedAt : ""),
      );
    });
  }

  lines.push("", "=== COMBAT LOG ===");
  if (game.runLog.length === 0) {
    lines.push("No combat events yet.");
  } else {
    game.runLog.forEach(entry => {
      lines.push(entry.time.toFixed(1) + "s — " + entry.text);
    });
  }

  return lines.join("\n");
}
