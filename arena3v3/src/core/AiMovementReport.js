function fixed(value, digits = 1) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "—";
}

function vectorText(vector) {
  if (!vector) return "—";
  return "(" + fixed(vector.x, 2) + "," + fixed(vector.y, 2) + ")";
}

function positionText(position) {
  if (!position) return "—";
  return "(" + fixed(position.x, 1) + "," + fixed(position.y, 1) + ")";
}

function rectText(rect) {
  if (!rect) return "";
  return " [" + fixed(rect.x, 0) + "," + fixed(rect.y, 0)
    + " " + fixed(rect.w, 0) + "x" + fixed(rect.h, 0) + "]";
}

function blockerText(blocker) {
  if (!blocker) return "none";
  return (blocker.type || "geometry") + ":" + (blocker.id || "unknown")
    + rectText(blocker.rect);
}

function eventLabel(type) {
  return String(type || "event").toUpperCase().replaceAll("-", "_");
}

function actorLabel(event) {
  return (event.actorName || event.actorId || "AI")
    + " [" + (event.className || "Unknown")
    + " / " + (event.role || "unknown")
    + " / " + (event.team || "unknown") + "]";
}

function intentText(event) {
  if (!event.intentType) return "intent —";

  let text = "intent " + event.intentType;
  if (event.intentTargetName) text += " -> " + event.intentTargetName;
  if (event.intentReason) text += " (" + event.intentReason + ")";
  return text;
}

function planText(event) {
  if (!event.teamPlanState) return "";
  let text = " | plan " + event.teamPlanState;
  if (event.teamPlanTargetName) text += " -> " + event.teamPlanTargetName;
  return text;
}

function eventDetails(event) {
  const details = [];

  if (event.blocker) details.push("blocker " + blockerText(event.blocker));
  if (event.desired) details.push("desired " + vectorText(event.desired));
  if (event.chosen) details.push("chosen " + vectorText(event.chosen));
  if (Number.isFinite(event.chosenAngleDeg)) {
    details.push("turn " + fixed(event.chosenAngleDeg, 0) + "deg");
  }
  if (Number.isFinite(event.avoidanceSign)) {
    details.push("side " + (event.avoidanceSign > 0 ? "+" : "-"));
  }
  if (Number.isFinite(event.previousAvoidanceSign)) {
    details.push(
      "side "
      + (event.previousAvoidanceSign > 0 ? "+" : "-")
      + "->"
      + (event.nextAvoidanceSign > 0 ? "+" : "-"),
    );
  }
  if (Number.isFinite(event.contactMs)) {
    details.push("contact " + fixed(event.contactMs, 0) + "ms");
  }
  if (Number.isFinite(event.stuckMs)) {
    details.push("stuck " + fixed(event.stuckMs, 0) + "ms");
  }
  if (Number.isFinite(event.switchGapMs)) {
    details.push("flip-gap " + fixed(event.switchGapMs, 0) + "ms");
  }
  if (Number.isFinite(event.progressDistance)) {
    details.push(
      "progress " + fixed(event.progressDistance, 1)
      + "/" + fixed(event.progressThreshold, 1),
    );
  }
  if (Number.isFinite(event.pathDistance)) {
    details.push("path " + fixed(event.pathDistance, 1));
  }
  if (Number.isFinite(event.netDistance)) {
    details.push("net " + fixed(event.netDistance, 1));
  }
  if (Number.isFinite(event.reversals)) {
    details.push("reversals " + fixed(event.reversals, 0));
  }
  if (event.movementMode) details.push("move-mode " + event.movementMode);
  if (event.lastMove) details.push("lastMove " + vectorText(event.lastMove));
  if (event.separation) details.push("separation " + vectorText(event.separation));
  if (event.targetName) {
    details.push(
      "target " + event.targetName
      + (event.targetAlive === false ? " [DEAD]" : "")
      + (Number.isFinite(event.targetDistance)
        ? " @" + fixed(event.targetDistance, 1)
        : ""),
    );
  }
  if (event.healerName) {
    details.push(
      "healer " + event.healerName
      + (Number.isFinite(event.healerDistance)
        ? " @" + fixed(event.healerDistance, 1)
        : "")
      + (Number.isFinite(event.healerSupportRange)
        ? "/range " + fixed(event.healerSupportRange, 0)
        : "")
      + (event.healerSupported === true
        ? " supported"
        : event.healerSupported === false
          ? " UNSUPPORTED"
          : "")
      + (event.healerSupportRecovery ? " recovery-latched" : ""),
    );
  }
  if (event.castSpellId) details.push("cast " + event.castSpellId);
  if (event.safeTurret) details.push("safe-turret");
  if (event.manaRecovery) details.push("mana-recovery");
  if (event.collisionActive === false) details.push("open-field");
  if (event.forcedDetour) details.push("forced-detour");
  if (event.from || event.to) {
    details.push("recover " + positionText(event.from) + " -> " + positionText(event.to));
  }

  return details.length > 0 ? " | " + details.join(" | ") : "";
}

export function buildAiMovementReport(game) {
  const events = Array.isArray(game.aiMovementEvents)
    ? game.aiMovementEvents
    : [];
  const aiActors = game.actors.filter(actor => actor.control !== "player");

  const lines = [
    "3V3 ARENA — AI MOVEMENT / COLLISION LOG",
    "Report schema: ai-movement-v2",
    "Arena: " + (game.arena?.name || "Unknown")
      + " [" + (game.arena?.id || "unknown") + "]",
    "Duration: " + fixed(game.elapsedSeconds, 1) + "s",
    "Events captured: " + events.length
      + (game.aiMovementEventsDropped
        ? " | oldest dropped: " + game.aiMovementEventsDropped
        : ""),
    "",
    "=== COLLISION GEOMETRY ===",
  ];

  const bounds = game.arena?.bounds;
  if (bounds) {
    lines.push(
      "Arena bounds: x " + fixed(bounds.x, 0)
      + " y " + fixed(bounds.y, 0)
      + " w " + fixed(bounds.w, 0)
      + " h " + fixed(bounds.h, 0),
    );
  }

  for (const [index, obstacle] of (game.arena?.obstacles || []).entries()) {
    lines.push(
      "Obstacle " + index + ": "
      + (obstacle.id || ("obstacle-" + index))
      + rectText(obstacle),
    );
  }

  lines.push("", "=== AI MOVEMENT SUMMARY ===");

  for (const actor of aiActors) {
    const actorEvents = events.filter(event => event.actorId === actor.id);
    const counts = {};
    for (const event of actorEvents) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }

    lines.push(
      actor.name + " [" + actor.className + " / " + actor.role + " / " + actor.team + "]"
      + " | collision starts " + (counts["collision-start"] || 0)
      + " | nav samples " + (counts["collision-nav"] || 0)
      + " | progress reroutes " + (counts["progress-reroute"] || 0)
      + " | stuck side flips " + (counts["stuck-side-flip"] || 0)
      + " | rapid direction flips " + (counts["rapid-direction-flip"] || 0)
      + " | open-field jitter " + (counts["open-field-jitter"] || 0)
      + " | open-field stalls " + (counts["open-field-stall"] || 0)
      + " | movement jitter " + (counts["movement-jitter"] || 0)
      + " | movement stalls " + (counts["movement-stall"] || 0)
      + " | dead-target idle " + (counts["dead-target-idle"] || 0)
      + " | no-route " + (counts["no-route"] || 0)
      + " | embedded recoveries " + (counts["embedded-recovery"] || 0)
      + " | engine route flips " + (actor.aiPathReroutes || 0)
      + " | engine wall detours " + (actor.aiObstacleDetours || 0),
    );
  }

  lines.push("", "=== COLLISION HOTSPOTS ===");

  const hotspots = new Map();
  for (const event of events) {
    const id = event.blocker?.id;
    if (!id) continue;

    const key = (event.blocker.type || "geometry") + ":" + id;
    const current = hotspots.get(key) || {
      key,
      blocker: event.blocker,
      total: 0,
      starts: 0,
      nav: 0,
      reroutes: 0,
      flips: 0,
      rapidFlips: 0,
      noRoute: 0,
      recoveries: 0,
      actors: new Set(),
    };

    current.total += 1;
    current.actors.add(event.actorName || event.actorId);
    if (event.type === "collision-start") current.starts += 1;
    if (event.type === "collision-nav") current.nav += 1;
    if (event.type === "progress-reroute") current.reroutes += 1;
    if (event.type === "stuck-side-flip") current.flips += 1;
    if (event.type === "rapid-direction-flip") current.rapidFlips += 1;
    if (event.type === "no-route") current.noRoute += 1;
    if (event.type === "embedded-recovery") current.recoveries += 1;
    hotspots.set(key, current);
  }

  const rankedHotspots = [...hotspots.values()]
    .sort((a, b) =>
      (b.rapidFlips * 10 + b.flips * 8 + b.noRoute * 6 + b.reroutes * 4 + b.starts * 2 + b.nav)
      - (a.rapidFlips * 10 + a.flips * 8 + a.noRoute * 6 + a.reroutes * 4 + a.starts * 2 + a.nav)
    );

  if (rankedHotspots.length === 0) {
    lines.push("No collider contacts recorded.");
  } else {
    for (const hotspot of rankedHotspots) {
      lines.push(
        hotspot.key + rectText(hotspot.blocker?.rect)
        + " | starts " + hotspot.starts
        + " | nav samples " + hotspot.nav
        + " | reroutes " + hotspot.reroutes
        + " | side flips " + hotspot.flips
        + " | RAPID flips " + hotspot.rapidFlips
        + " | no-route " + hotspot.noRoute
        + " | embedded recoveries " + hotspot.recoveries
        + " | actors " + [...hotspot.actors].join(", "),
      );
    }
  }

  lines.push("", "=== AI INTENT TIMELINE ===");

  for (const actor of aiActors) {
    const history = actor.aiIntentHistory || [];
    lines.push(actor.name + " [" + actor.className + "]");

    if (history.length === 0) {
      lines.push("  no recorded intents");
      continue;
    }

    for (const intent of history) {
      const endAt = intent.endedAt ?? game.elapsedSeconds;
      lines.push(
        "  " + fixed(intent.startedAt, 2) + "-" + fixed(endAt, 2) + "s"
        + " | " + (intent.type || "UNKNOWN")
        + (intent.targetName ? " -> " + intent.targetName : "")
        + (intent.reason ? " | " + intent.reason : "")
        + (intent.endReason ? " | end " + intent.endReason : ""),
      );
    }
  }

  lines.push("", "=== DETAILED MOVEMENT TRACE — LAST 8 SECONDS ===");

  const samples = Array.isArray(game.aiMovementSamples)
    ? game.aiMovementSamples
    : [];
  const traceStart = Math.max(0, (Number(game.elapsedSeconds) || 0) - 8);
  const recentSamples = samples.filter(sample => sample.time >= traceStart);

  if (recentSamples.length === 0) {
    lines.push("No detailed movement samples recorded.");
  } else {
    for (const sample of recentSamples) {
      const state = [];
      if (sample.castSpellId) state.push("cast=" + sample.castSpellId);
      if (sample.hardControlled) state.push("hard-CC");
      if (sample.rooted) state.push("rooted");
      if (sample.safeTurret) state.push("safe-turret");
      if (sample.manaRecovery) state.push("mana-recovery");
      if (sample.activeDash) state.push("dash");
      if (sample.collisionActive) state.push("collision");
      if (sample.intentType) state.push("intent=" + sample.intentType);
      if (sample.movementMode) state.push("move=" + sample.movementMode);

      lines.push(
        fixed(sample.time, 3) + "s"
        + " | " + (sample.actorName || sample.actorId || "AI")
        + " [" + (sample.className || "Unknown") + "]"
        + " | pos " + positionText(sample.position)
        + " | Δ " + vectorText(sample.delta)
        + " | speed " + fixed(sample.speed, 1) + "px/s"
        + " | lastMove " + vectorText(sample.lastMove)
        + " | separation " + vectorText(sample.separation)
        + (sample.targetName
          ? " | target " + sample.targetName
            + (sample.targetAlive === false ? " [DEAD]" : "")
            + (Number.isFinite(sample.targetDistance)
              ? " @" + fixed(sample.targetDistance, 1)
              : "")
          : "")
        + (sample.healerName
          ? " | healer " + sample.healerName
            + (Number.isFinite(sample.healerDistance)
              ? " @" + fixed(sample.healerDistance, 1)
              : "")
            + (Number.isFinite(sample.healerSupportRange)
              ? "/range " + fixed(sample.healerSupportRange, 0)
              : "")
            + (sample.healerSupported === true
              ? " supported"
              : sample.healerSupported === false
                ? " UNSUPPORTED"
                : "")
            + (sample.healerSupportRecovery ? " recovery-latched" : "")
          : "")
        + (state.length ? " | " + state.join(", ") : ""),
      );
    }
  }

  lines.push(
    "Samples stored: " + samples.length
    + (game.aiMovementSamplesDropped
      ? " | oldest dropped: " + game.aiMovementSamplesDropped
      : ""),
  );

  lines.push("", "=== COLLISION / MOVEMENT EVENT TIMELINE ===");

  if (events.length === 0) {
    lines.push("No collision movement events recorded.");
  } else {
    for (const event of events) {
      lines.push(
        fixed(event.time, 3) + "s"
        + " | " + actorLabel(event)
        + " | " + eventLabel(event.type)
        + " | pos " + positionText(event.position)
        + " | " + intentText(event)
        + planText(event)
        + eventDetails(event),
      );
    }
  }

  lines.push(
    "",
    "Reading guide:",
    "COLLISION_START = intended movement first touched arena geometry.",
    "COLLISION_NAV = sampled steering choice while direct movement remained blocked.",
    "PROGRESS_REROUTE = 1.1s progress watchdog changed preferred wall side.",
    "STUCK_SIDE_FLIP = no candidate route succeeded long enough to flip wall side.",
    "RAPID_DIRECTION_FLIP = AI alternated detour direction within 280ms while touching collision.",
    "OPEN_FIELD_JITTER = actor repeatedly reversed real movement while making little net progress away from collision.",
    "OPEN_FIELD_STALL = actor reported movement intent but made almost no real movement away from collision.",
    "MOVEMENT_JITTER / MOVEMENT_STALL = same detectors while collision contact was active.",
    "DEAD_TARGET_IDLE = live enemies remain, but the AI is standing still while still pointing at a dead/unavailable target.",
    "DETAILED MOVEMENT TRACE = 200ms samples of real position, lastMove, separation push, target distance and AI state for the final 8 seconds.",
    "Caster samples also show healer distance/range plus whether healer-support recovery is latched.",
    "NO_ROUTE = every tested steering direction was blocked for that movement tick.",
    "EMBEDDED_RECOVERY = actor was already overlapping collision and was moved to nearest valid point.",
  );

  return lines.join("\n");
}
