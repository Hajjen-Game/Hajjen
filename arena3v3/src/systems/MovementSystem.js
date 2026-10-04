import { clamp, normalize } from "../core/utils.js";

const AI_COLLISION_GRACE_MS = 160;

function circleHitsRect(x, y, radius, rect) {
  const closestX = clamp(x, rect.x, rect.x + rect.w);
  const closestY = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

function rotate(vector, radians) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos,
  };
}

function avoidanceSign(actor) {
  if (actor.aiAvoidanceSign === 1 || actor.aiAvoidanceSign === -1) {
    return actor.aiAvoidanceSign;
  }

  let hash = 0;
  const id = String(actor.id || actor.name || "");
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;

  actor.aiAvoidanceSign = (hash & 1) === 0 ? 1 : -1;
  return actor.aiAvoidanceSign;
}

function movementSpeedMultiplier(actor) {
  const strongestSlow = (actor.effects || [])
    .filter(effect => effect.kind === "slow" && effect.remainingMs > 0)
    .reduce(
      (highest, effect) => Math.max(highest, Number(effect.value) || 0),
      0,
    );

  return Math.max(0.10, 1 - Math.min(0.90, strongestSlow));
}

function collides(actor, x, y, arena) {
  const b = arena.bounds;
  if (
    x - actor.radius < b.x
    || x + actor.radius > b.x + b.w
    || y - actor.radius < b.y
    || y + actor.radius > b.y + b.h
  ) return true;

  return arena.obstacles.some(rect => circleHitsRect(x, y, actor.radius + 3, rect));
}

function collisionDescriptor(actor, x, y, arena) {
  const b = arena.bounds;
  const sides = [];

  if (x - actor.radius < b.x) sides.push("left");
  if (x + actor.radius > b.x + b.w) sides.push("right");
  if (y - actor.radius < b.y) sides.push("top");
  if (y + actor.radius > b.y + b.h) sides.push("bottom");

  if (sides.length > 0) {
    return {
      type: "boundary",
      id: "arena-" + sides.join("+"),
      sides,
      rect: { x: b.x, y: b.y, w: b.w, h: b.h },
    };
  }

  const obstacleIndex = arena.obstacles.findIndex(rect =>
    circleHitsRect(x, y, actor.radius + 3, rect)
  );

  if (obstacleIndex >= 0) {
    const rect = arena.obstacles[obstacleIndex];
    return {
      type: "obstacle",
      id: rect.id || ("obstacle-" + obstacleIndex),
      obstacleIndex,
      rect: { x: rect.x, y: rect.y, w: rect.w, h: rect.h },
    };
  }

  return null;
}

function signedAngleDegrees(from, to) {
  const cross = from.x * to.y - from.y * to.x;
  const dot = from.x * to.x + from.y * to.y;
  return Math.atan2(cross, dot) * 180 / Math.PI;
}

function collisionTangent(actor, desired, blocker, sign) {
  if (!blocker) return null;

  const fallbackSign = sign === -1 ? -1 : 1;
  const tangentialSign = value =>
    Math.abs(value) >= 0.18 ? Math.sign(value) : fallbackSign;

  if (blocker.type === "boundary") {
    const sides = blocker.sides || [];
    const horizontalWall = sides.includes("top") || sides.includes("bottom");
    const verticalWall = sides.includes("left") || sides.includes("right");

    if (verticalWall && !horizontalWall) {
      return { x: 0, y: tangentialSign(desired.y) };
    }

    if (horizontalWall && !verticalWall) {
      return { x: tangentialSign(desired.x), y: 0 };
    }

    // At an arena corner choose the inward tangent with the stronger useful
    // component instead of tracing deeper into the corner.
    if (verticalWall && horizontalWall) {
      const inwardX = sides.includes("left") ? 1 : -1;
      const inwardY = sides.includes("top") ? 1 : -1;

      return Math.abs(desired.x) >= Math.abs(desired.y)
        ? { x: inwardX, y: 0 }
        : { x: 0, y: inwardY };
    }

    return null;
  }

  if (blocker.type !== "obstacle" || !blocker.rect) return null;

  const rect = blocker.rect;
  const margin = actor.radius + 3;
  const left = rect.x - margin;
  const right = rect.x + rect.w + margin;
  const top = rect.y - margin;
  const bottom = rect.y + rect.h + margin;

  const faceDistances = [
    { face: "left", distance: Math.abs(actor.x - left) },
    { face: "right", distance: Math.abs(actor.x - right) },
    { face: "top", distance: Math.abs(actor.y - top) },
    { face: "bottom", distance: Math.abs(actor.y - bottom) },
  ].sort((a, b) => a.distance - b.distance);

  const nearestFace = faceDistances[0]?.face;

  if (nearestFace === "left" || nearestFace === "right") {
    return { x: 0, y: tangentialSign(desired.y) };
  }

  if (nearestFace === "top" || nearestFace === "bottom") {
    return { x: tangentialSign(desired.x), y: 0 };
  }

  return null;
}

function separationLocked(actor) {
  if (actor.activeDash) return true;

  return (actor.effects || []).some(effect =>
    effect.remainingMs > 0
    && ["stun", "incapacitate", "root"].includes(effect.kind)
  );
}

function deterministicPairDirection(a, b) {
  const key = [String(a.id || ""), String(b.id || "")].sort().join("|");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }

  const angle = ((hash >>> 0) % 360) * Math.PI / 180;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export class MovementSystem {
  constructor(debugSink = null) {
    this.debugSink = typeof debugSink === "function" ? debugSink : null;
  }

  debug(actor, type, data = {}) {
    if (!this.debugSink || actor?.control === "player") return;

    try {
      this.debugSink(actor, { type, ...data });
    } catch {
      // Movement diagnostics must never affect gameplay.
    }
  }

  recoverIfEmbedded(actor, arena) {
    if (!collides(actor, actor.x, actor.y, arena)) return false;

    const originX = actor.x;
    const originY = actor.y;
    const maxDistance = actor.radius * 3 + 24;
    const angleCount = 24;

    for (let radius = 4; radius <= maxDistance; radius += 4) {
      for (let i = 0; i < angleCount; i += 1) {
        const angle = (i / angleCount) * Math.PI * 2;
        const x = originX + Math.cos(angle) * radius;
        const y = originY + Math.sin(angle) * radius;

        if (!collides(actor, x, y, arena)) {
          actor.x = x;
          actor.y = y;
          actor.aiOverlapRecoveries = (actor.aiOverlapRecoveries || 0) + 1;
          actor.aiStuckMs = 0;
          actor.aiAvoidanceMs = 0;
          actor.aiProgressAnchorX = x;
          actor.aiProgressAnchorY = y;
          actor.aiProgressWindowMs = 0;
          actor.aiForcedDetourMs = 0;
          actor.aiCollisionGraceMs = 0;
          this.debug(actor, "embedded-recovery", {
            from: { x: originX, y: originY },
            to: { x, y },
            blocker: collisionDescriptor(actor, originX, originY, arena),
          });
          return true;
        }
      }
    }

    return false;
  }

  tryDirection(actor, direction, step, arena) {
    const dx = direction.x * step;
    const dy = direction.y * step;
    let moved = false;

    // Try the full diagonal first so movement does not "stick" to obstacle corners.
    if (!collides(actor, actor.x + dx, actor.y + dy, arena)) {
      actor.x += dx;
      actor.y += dy;
      moved = true;
    } else {
      // Fall back to axis sliding for walls/pillar faces.
      if (!collides(actor, actor.x + dx, actor.y, arena)) {
        actor.x += dx;
        moved = true;
      }
      if (!collides(actor, actor.x, actor.y + dy, arena)) {
        actor.y += dy;
        moved = true;
      }
    }

    if (moved) {
      actor.lastMove = direction;
      actor.facing = Math.atan2(direction.y, direction.x);
    }

    return moved;
  }

  tryDirectionStrict(actor, direction, step, arena) {
    const dx = direction.x * step;
    const dy = direction.y * step;

    if (collides(actor, actor.x + dx, actor.y + dy, arena)) {
      return false;
    }

    actor.x += dx;
    actor.y += dy;
    actor.lastMove = direction;
    actor.facing = Math.atan2(direction.y, direction.x);
    return true;
  }

  move(actor, vector, deltaSeconds, arena) {
    if (!actor.alive || actor.activeDash) return false;

    const direction = normalize(vector.x, vector.y);
    if (direction.x === 0 && direction.y === 0) {
      actor.lastMove = { x: 0, y: 0 };
      return false;
    }

    const step = actor.moveSpeed * movementSpeedMultiplier(actor) * deltaSeconds;
    return this.tryDirection(actor, direction, step, arena);
  }

  moveAI(actor, vector, deltaSeconds, arena) {
    if (!actor.alive || actor.activeDash) return false;

    actor.aiMovementDebugClockMs =
      (actor.aiMovementDebugClockMs || 0) + deltaSeconds * 1000;
    actor.aiCollisionGraceMs = Math.max(
      0,
      (actor.aiCollisionGraceMs || 0) - deltaSeconds * 1000,
    );

    // Safety valve for the rare case where an AI ends up microscopically inside
    // a pillar collider. Normal collision movement cannot leave an overlap
    // because every small exit step still counts as colliding.
    this.recoverIfEmbedded(actor, arena);

    const desired = normalize(vector.x, vector.y);
    if (desired.x === 0 && desired.y === 0) {
      actor.lastMove = { x: 0, y: 0 };
      return false;
    }

    const step = actor.moveSpeed * movementSpeedMultiplier(actor) * deltaSeconds;
    let sign = avoidanceSign(actor);

    // Progress watchdog: an AI can technically keep moving while oscillating
    // around the same pillar corner, which means the normal "could not move"
    // watchdog never fires. Track net displacement across a short window and
    // force a route-side change if the actor is not making real progress.
    if (!Number.isFinite(actor.aiProgressAnchorX) || !Number.isFinite(actor.aiProgressAnchorY)) {
      actor.aiProgressAnchorX = actor.x;
      actor.aiProgressAnchorY = actor.y;
      actor.aiProgressWindowMs = 0;
    }

    actor.aiProgressWindowMs = (actor.aiProgressWindowMs || 0) + deltaSeconds * 1000;
    actor.aiForcedDetourMs = Math.max(
      0,
      (actor.aiForcedDetourMs || 0) - deltaSeconds * 1000,
    );

    const progressDistance = Math.hypot(
      actor.x - actor.aiProgressAnchorX,
      actor.y - actor.aiProgressAnchorY,
    );
    const progressThreshold = Math.max(24, actor.radius * 1.3);

    if (progressDistance >= progressThreshold) {
      actor.aiProgressAnchorX = actor.x;
      actor.aiProgressAnchorY = actor.y;
      actor.aiProgressWindowMs = 0;
    } else if (actor.aiProgressWindowMs >= 1100) {
      actor.aiAvoidanceSign = -sign;
      sign = -sign;
      actor.aiForcedDetourMs = 900;
      actor.aiProgressAnchorX = actor.x;
      actor.aiProgressAnchorY = actor.y;
      actor.aiProgressWindowMs = 0;
      actor.aiPathReroutes = (actor.aiPathReroutes || 0) + 1;
      this.debug(actor, "progress-reroute", {
        position: { x: actor.x, y: actor.y },
        avoidanceSign: sign,
        forcedDetourMs: actor.aiForcedDetourMs,
        progressDistance,
        progressThreshold,
        blocker: collisionDescriptor(
          actor,
          actor.x + desired.x * step,
          actor.y + desired.y * step,
          arena,
        ),
      });
    }

    const directBlocker = collisionDescriptor(
      actor,
      actor.x + desired.x * step,
      actor.y + desired.y * step,
      arena,
    );
    const directBlocked = Boolean(directBlocker);

    if (directBlocked) {
      actor.aiAvoidanceMs = (actor.aiAvoidanceMs || 0) + deltaSeconds * 1000;
      actor.aiCollisionSampleMs = (actor.aiCollisionSampleMs || 0) + deltaSeconds * 1000;
      actor.aiCollisionGraceMs = Math.max(
        actor.aiCollisionGraceMs || 0,
        AI_COLLISION_GRACE_MS,
      );

      if (!actor.aiObstacleContactActive) {
        actor.aiObstacleDetours = (actor.aiObstacleDetours || 0) + 1;
        actor.aiCollisionSampleMs = 999;
        actor.aiCollisionBlocker = directBlocker;
        this.debug(actor, "collision-start", {
          position: { x: actor.x, y: actor.y },
          desired,
          blocker: directBlocker,
          avoidanceSign: sign,
        });
      }
      actor.aiObstacleContactActive = true;
    } else if (
      actor.aiObstacleContactActive
      && (actor.aiCollisionGraceMs || 0) <= 0
    ) {
      this.debug(actor, "collision-clear", {
        position: { x: actor.x, y: actor.y },
        contactMs: actor.aiAvoidanceMs || 0,
        avoidanceSign: sign,
        blocker: actor.aiCollisionBlocker || null,
      });

      actor.aiAvoidanceMs = 0;
      actor.aiCollisionSampleMs = 0;
      actor.aiCollisionBlocker = null;
      actor.aiLastCollisionChosenSide = 0;
      actor.aiLastCollisionChosenAtMs = 0;
      actor.aiObstacleContactActive = false;
    }

    const collisionGraceActive = (actor.aiCollisionGraceMs || 0) > 0;
    const forcedDetour = (actor.aiForcedDetourMs || 0) > 0;
    const preferredAngles = forcedDetour
      ? [90, 118, 150, 68, 45, 24]
      : [24, 45, 68, 90, 118, 150];
    const directions = [];

    // When the intended step hits a rectangular collider, first follow the
    // actual face of that collider. This is much more stable than jumping
    // between large +/- steering angles while standing on a straight wall.
    if (directBlocked) {
      const tangent = collisionTangent(actor, desired, directBlocker, sign);
      if (tangent) directions.push(tangent);
    }

    // Normal travel gets the direct target vector first only when we are not in
    // the short post-collision grace window. During grace we keep favouring the
    // same wall side, but every steering candidate is recalculated from the
    // CURRENT desired vector. Nothing is locked to an old world-space heading.
    if (!forcedDetour && !collisionGraceActive) directions.push(desired);

    // Exhaust the actor's preferred side before trying the opposite side.
    for (const degreesAway of preferredAngles) {
      directions.push(
        rotate(desired, degreesAway * Math.PI / 180 * sign),
      );
    }

    // Once the preferred wall-side candidates have been tried, direct travel is
    // allowed as a fallback after the actor has technically cleared collision.
    if (collisionGraceActive && !directBlocked) directions.push(desired);

    for (const degreesAway of preferredAngles) {
      directions.push(
        rotate(desired, -degreesAway * Math.PI / 180 * sign),
      );
    }

    if (forcedDetour && !collisionGraceActive) directions.push(desired);

    // A retreat is now a genuine stuck recovery only. Merely travelling beside
    // a wall for 620ms is not a reason to reverse direction.
    if ((actor.aiStuckMs || 0) >= 360) {
      directions.push(rotate(desired, Math.PI));
    }

    for (const candidate of directions) {
      const direction = normalize(candidate.x, candidate.y);

      // AI obstacle navigation uses full-vector collision only. Axis sliding is
      // useful for direct player controls but looks like rapid wall-bouncing
      // when an AI continuously recomputes a target on the far side of a wall.
      if (this.tryDirectionStrict(actor, direction, step, arena)) {
        const chosenAngleDeg = signedAngleDegrees(desired, direction);

        if (directBlocked) {
          const chosenSide = Math.sign(chosenAngleDeg);
          const nowMs = actor.aiMovementDebugClockMs || 0;
          const previousSide = actor.aiLastCollisionChosenSide || 0;
          const previousAtMs = actor.aiLastCollisionChosenAtMs || 0;
          const switchGapMs = nowMs - previousAtMs;

          if (
            chosenSide !== 0
            && previousSide !== 0
            && chosenSide !== previousSide
            && switchGapMs <= 280
            && nowMs - (actor.aiLastRapidDirectionFlipLogMs || -Infinity) >= 120
          ) {
            actor.aiRapidDirectionFlips = (actor.aiRapidDirectionFlips || 0) + 1;
            actor.aiLastRapidDirectionFlipLogMs = nowMs;
            this.debug(actor, "rapid-direction-flip", {
              position: { x: actor.x, y: actor.y },
              blocker: directBlocker,
              desired,
              chosen: direction,
              chosenAngleDeg,
              previousSide,
              chosenSide,
              switchGapMs,
              avoidanceSign: sign,
            });
          }

          if (chosenSide !== 0) {
            actor.aiLastCollisionChosenSide = chosenSide;
            actor.aiLastCollisionChosenAtMs = nowMs;
          }
        }

        if (
          directBlocked
          && (actor.aiCollisionSampleMs || 0) >= 400
        ) {
          this.debug(actor, "collision-nav", {
            position: { x: actor.x, y: actor.y },
            desired,
            chosen: direction,
            chosenAngleDeg,
            avoidanceSign: sign,
            forcedDetour,
            contactMs: actor.aiAvoidanceMs || 0,
            blocker: directBlocker,
          });
          actor.aiCollisionSampleMs = 0;
        }

        if (actor.aiNoRouteActive) {
          this.debug(actor, "route-recovered", {
            position: { x: actor.x, y: actor.y },
            chosen: direction,
            chosenAngleDeg,
          });
          actor.aiNoRouteActive = false;
        }

        actor.aiStuckMs = 0;
        return true;
      }
    }

    actor.aiStuckMs = (actor.aiStuckMs || 0) + deltaSeconds * 1000;

    if (actor.aiStuckMs >= 520) {
      actor.aiAvoidanceSign = -sign;
      this.debug(actor, "stuck-side-flip", {
        position: { x: actor.x, y: actor.y },
        previousAvoidanceSign: sign,
        nextAvoidanceSign: -sign,
        blocker: directBlocker,
        stuckMs: actor.aiStuckMs,
      });
      actor.aiStuckMs = 300;
    }

    if (!actor.aiNoRouteActive) {
      actor.aiNoRouteActive = true;
      this.debug(actor, "no-route", {
        position: { x: actor.x, y: actor.y },
        desired,
        blocker: collisionDescriptor(
          actor,
          actor.x + desired.x * step,
          actor.y + desired.y * step,
          arena,
        ),
        avoidanceSign: actor.aiAvoidanceSign,
      });
    }

    actor.lastMove = { x: 0, y: 0 };
    return false;
  }

  resolveActorSeparation(actors, deltaSeconds, arena, playerId = null) {
    const living = (actors || []).filter(actor => actor?.alive);
    if (living.length < 2 || deltaSeconds <= 0) return;

    // This is deliberately not hard collision. Actors may still overlap and
    // pass through one another. Separation only wakes up when their centers
    // get very close, then gently creates enough visual space to distinguish
    // individual combatants without changing normal melee ranges.
    const pushes = new Map(living.map(actor => [actor.id, { x: 0, y: 0 }]));
    const maxStep = Math.min(3.2, 68 * deltaSeconds);

    for (let i = 0; i < living.length; i += 1) {
      const a = living[i];

      for (let j = i + 1; j < living.length; j += 1) {
        const b = living[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);

        const combinedRadius = Math.max(1, a.radius + b.radius);

        // The visible class icon is clipped to actor.radius, so two icons touch
        // when their centers are one combinedRadius apart. Wake separation at
        // that full-icon boundary instead of waiting for deep visual overlap.
        const triggerDistance = combinedRadius * 1.04;
        const targetDistance = combinedRadius * 1.08;

        if (distance >= triggerDistance) continue;

        if (distance < 0.001) {
          const fallback = deterministicPairDirection(a, b);
          dx = fallback.x;
          dy = fallback.y;
          distance = 1;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const correction = Math.min(
          targetDistance - distance,
          maxStep * 2,
        );

        const aLocked = separationLocked(a);
        const bLocked = separationLocked(b);
        const aWeight = aLocked ? 0 : (a.id === playerId ? 0.18 : 1);
        const bWeight = bLocked ? 0 : (b.id === playerId ? 0.18 : 1);
        const weightTotal = aWeight + bWeight;

        if (weightTotal <= 0) continue;

        const aShare = aWeight / weightTotal;
        const bShare = bWeight / weightTotal;
        const pushA = pushes.get(a.id);
        const pushB = pushes.get(b.id);

        pushA.x -= nx * correction * aShare;
        pushA.y -= ny * correction * aShare;
        pushB.x += nx * correction * bShare;
        pushB.y += ny * correction * bShare;
      }
    }

    for (const actor of living) {
      const push = pushes.get(actor.id);
      if (!push || separationLocked(actor)) continue;

      const magnitude = Math.hypot(push.x, push.y);
      if (magnitude < 0.001) continue;

      const scale = Math.min(1, maxStep / magnitude);
      const dx = push.x * scale;
      const dy = push.y * scale;

      // Prefer the combined nudge, then allow axis-only movement near pillars
      // so separation can never push an actor into arena geometry.
      if (!collides(actor, actor.x + dx, actor.y + dy, arena)) {
        actor.x += dx;
        actor.y += dy;
        continue;
      }

      if (!collides(actor, actor.x + dx, actor.y, arena)) {
        actor.x += dx;
      }
      if (!collides(actor, actor.x, actor.y + dy, arena)) {
        actor.y += dy;
      }
    }
  }

  dashToRange(actor, target, stopDistance, arena, durationMs = 0) {
    if (!actor.alive || !target?.alive) return false;

    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= stopDistance) return false;

    const direction = normalize(dx, dy);
    const travel = Math.max(0, distance - stopDistance);
    const stepSize = 8;
    let remaining = travel;
    let endX = actor.x;
    let endY = actor.y;
    let moved = false;

    // Trace the full path first so a dash can never cross a pillar or wall.
    while (remaining > 0) {
      const step = Math.min(stepSize, remaining);
      const nextX = endX + direction.x * step;
      const nextY = endY + direction.y * step;

      if (collides(actor, nextX, nextY, arena)) break;

      endX = nextX;
      endY = nextY;
      remaining -= step;
      moved = true;
    }

    if (!moved) return false;

    actor.lastMove = direction;
    actor.facing = Math.atan2(direction.y, direction.x);

    if (durationMs > 0) {
      actor.activeDash = {
        startX: actor.x,
        startY: actor.y,
        endX,
        endY,
        totalMs: Math.max(80, durationMs),
        elapsedMs: 0,
        direction,
      };
      return true;
    }

    actor.x = endX;
    actor.y = endY;
    return true;
  }

  updateActiveDashes(actors, deltaMs, arena) {
    if (deltaMs <= 0) return;

    for (const actor of actors || []) {
      const dash = actor?.activeDash;
      if (!dash) continue;

      if (!actor.alive) {
        actor.activeDash = null;
        continue;
      }

      dash.elapsedMs = Math.min(dash.totalMs, dash.elapsedMs + deltaMs);
      const progress = clamp(dash.elapsedMs / dash.totalMs, 0, 1);

      // Fast ease-out: obvious travel at the start, then a crisp WoW-like
      // arrival instead of a teleport.
      const eased = 1 - Math.pow(1 - progress, 2.35);
      const nextX = dash.startX + (dash.endX - dash.startX) * eased;
      const nextY = dash.startY + (dash.endY - dash.startY) * eased;

      if (collides(actor, nextX, nextY, arena)) {
        actor.activeDash = null;
        continue;
      }

      actor.x = nextX;
      actor.y = nextY;
      actor.lastMove = dash.direction;
      actor.facing = Math.atan2(dash.direction.y, dash.direction.x);

      if (progress >= 1) {
        actor.x = dash.endX;
        actor.y = dash.endY;
        actor.activeDash = null;
      }
    }
  }

  wouldCollide(actor, vector, step, arena) {
    const direction = normalize(vector.x, vector.y);
    return collides(
      actor,
      actor.x + direction.x * step,
      actor.y + direction.y * step,
      arena,
    );
  }
}
