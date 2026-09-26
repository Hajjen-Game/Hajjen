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
      + " | Talent Points " + progression.spentPoints + "/" + progression.talentPoints,
    );

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
  const currentHonor = game.honor?.status?.() || null;
  const award = game.lastHonorAward || null;

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
    "Report schema: stress-v2",
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
      "Rank: " + startHonor.rank + " · " + startHonor.title
      + " | Lifetime Honor " + n(startHonor.lifetimeHonor)
      + " | Spendable Honor " + n(startHonor.honorPoints),
    );
  } else {
    lines.push("Progression snapshot unavailable.");
  }

  if (award) {
    lines.push(
      "Match reward: +" + award.honor + " Honor"
      + " | Rank after match " + award.rankAfter + " · " + award.rankTitle
      + (award.rankedUp ? " | RANK UP +" + award.talentPointsGained + " Talent Point" + (award.talentPointsGained === 1 ? "" : "s") : ""),
    );
  } else if (currentHonor && game.ended) {
    lines.push(
      "Progression after match: Rank " + currentHonor.rank + " · " + currentHonor.title
      + " | Lifetime Honor " + n(currentHonor.lifetimeHonor)
      + " | Spendable Honor " + n(currentHonor.honorPoints),
    );
  }

  appendTalentSection(lines, game, loadout);
  appendGearSection(lines, loadout);
  appendPlayerStats(lines, loadout);
  appendAiProgression(lines, game, "friendly", "FRIENDLY AI PROGRESSION / TALENT BUILDS");
  appendAiProgression(lines, game, "enemy", "ENEMY PROGRESSION / TALENT BUILDS");

  lines.push(
    "",
    "=== MATCH RULES / CONTEXT ===",
    "Ability queue: 400ms",
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
    }))
    .filter(item => item.reroutes > 0 || item.overlapRecoveries > 0);

  if (movementDiagnostics.length === 0) {
    lines.push("No path recovery events recorded.");
  } else {
    movementDiagnostics.forEach(item => {
      lines.push(
        item.name + " [" + item.className + "]"
        + " — route flips " + item.reroutes
        + " | collider recoveries " + item.overlapRecoveries,
      );
    });
  }

  lines.push("", "=== AI CAST DIAGNOSTICS ===");
  const castDiagnostics = game.actors
    .filter(actor => actor.control !== "player")
    .flatMap(actor =>
      Object.entries(actor.aiGuardedCastStarts || {}).map(([spellId, starts]) => ({
        name: actor.name,
        className: actor.className,
        spellName: actor.getSpell(spellId)?.name || spellId,
        starts,
        failures: actor.aiRangeLosCastFailures?.[spellId] || 0,
      }))
    );

  if (castDiagnostics.length === 0) {
    lines.push("No guarded AI casts recorded.");
  } else {
    castDiagnostics.forEach(item => {
      lines.push(
        item.name + " [" + item.className + "]"
        + " — " + item.spellName
        + " starts " + item.starts
        + " | range/LOS failures " + item.failures,
      );
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
