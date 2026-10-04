import { clamp, normalize } from "../core/utils.js";

const AI_COLLISION_GRACE_MS = 220;
const AI_ROUTE_RELEASE_MS = 180;
const AI_ROUTE_SIGN_MEMORY_MS = 1200;

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

function obstacleRouteGeometry(actor, blocker) {
  if (blocker?.type !== "obstacle" || !blocker.rect) return null;

  const rect = blocker.rect;
  const collisionMargin = actor.radius + 3;
  const clearance = clamp(actor.radius * 0.35, 6, 10);
  const collision = {
    left: rect.x - collisionMargin,
    right: rect.x + rect.w + collisionMargin,
    top: rect.y - collisionMargin,
    bottom: rect.y + rect.h + collisionMargin,
  };
  const route = {
    left: collision.left - clearance,
    right: collision.right + clearance,
    top: collision.top - clearance,
    bottom: collision.bottom + clearance,
  };

  const faceDistances = [
    { face: "left", distance: Math.abs(actor.x - collision.left) },
    { face: "right", distance: Math.abs(actor.x - collision.right) },
    { face: "top", distance: Math.abs(actor.y - collision.top) },
    { face: "bottom", distance: Math.abs(actor.y - collision.bottom) },
  ].sort((a, b) => a.distance - b.distance);

  return {
    face: faceDistances[0]?.face || null,
    collision,
    route,
    clearance,
  };
}

function collisionTangent(actor, blocker, sign) {
  if (!blocker) return null;

  // Keep one stable clockwise/counter-clockwise route for the whole contact.
  const routeSign = sign === -1 ? -1 : 1;

  if (blocker.type === "boundary") {
    const sides = blocker.sides || [];
    const hasLeft = sides.includes("left");
    const hasRight = sides.includes("right");
    const hasTop = sides.includes("top");
    const hasBottom = sides.includes("bottom");

    if (hasTop && hasLeft) {
      return routeSign === 1 ? { x: 1, y: 0 } : { x: 0, y: 1 };
    }
    if (hasTop && hasRight) {
      return routeSign === 1 ? { x: 0, y: 1 } : { x: -1, y: 0 };
    }
    if (hasBottom && hasRight) {
      return routeSign === 1 ? { x: -1, y: 0 } : { x: 0, y: -1 };
    }
    if (hasBottom && hasLeft) {
      return routeSign === 1 ? { x: 0, y: -1 } : { x: 1, y: 0 };
    }

    if (hasTop) return { x: routeSign, y: 0 };
    if (hasRight) return { x: 0, y: routeSign };
    if (hasBottom) return { x: -routeSign, y: 0 };
    if (hasLeft) return { x: 0, y: -routeSign };
    return null;
  }

  const geometry = obstacleRouteGeometry(actor, blocker);
  if (!geometry?.face) return null;

  // routeSign +1 follows the expanded rectangle clockwise:
  // top -> right -> bottom -> left. -1 follows it counter-clockwise.
  switch (geometry.face) {
    case "top":
      return { x: routeSign, y: 0 };
    case "right":
      return { x: 0, y: routeSign };
    case "bottom":
      return { x: -routeSign, y: 0 };
    case "left":
      return { x: 0, y: -routeSign };
    default:
      return null;
  }
}

function nextObstacleRouteFace(face, sign) {
  const clockwise = {
    top: "right",
    right: "bottom",
    bottom: "left",
    left: "top",
  };
  const counterClockwise = {
    top: "left",
    left: "bottom",
    bottom: "right",
    right: "top",
  };

  return (sign === -1 ? counterClockwise : clockwise)[face] || face;
}

function obstacleRouteWaypoint(face, sign, route) {
  const routeSign = sign === -1 ? -1 : 1;

  if (routeSign === 1) {
    if (face === "top") return { x: route.right, y: route.top };
    if (face === "right") return { x: route.right, y: route.bottom };
    if (face === "bottom") return { x: route.left, y: route.bottom };
    if (face === "left") return { x: route.left, y: route.top };
  } else {
    if (face === "top") return { x: route.left, y: route.top };
    if (face === "left") return { x: route.left, y: route.bottom };
    if (face === "bottom") return { x: route.right, y: route.bottom };
    if (face === "right") return { x: route.right, y: route.top };
  }

  return null;
}

function collisionRouteDirection(actor, blocker, sign) {
  if (!blocker) return null;
  if (blocker.type !== "obstacle") return collisionTangent(actor, blocker, sign);

  const geometry = obstacleRouteGeometry(actor, blocker);
  if (!geometry?.face) return collisionTangent(actor, blocker, sign);

  let face = geometry.face;
  let waypoint = obstacleRouteWaypoint(face, sign, geometry.route);
  if (!waypoint) return collisionTangent(actor, blocker, sign);

  // Once we reach a corner, immediately aim for the next corner instead of
  // letting nearest-face ties flip the steering back along the edge we came from.
  const cornerReach = Math.max(8, geometry.clearance + 3);
  if (Math.hypot(waypoint.x - actor.x, waypoint.y - actor.y) <= cornerReach) {
    face = nextObstacleRouteFace(face, sign);
    waypoint = obstacleRouteWaypoint(face, sign, geometry.route);
  }

  if (!waypoint) return collisionTangent(actor, blocker, sign);
  return normalize(waypoint.x - actor.x, waypoint.y - actor.y);
}

function collisionEscapeDirection(actor, blocker, sign) {
  const geometry = obstacleRouteGeometry(actor, blocker);
  if (!geometry?.face) return null;

  const tangent = collisionTangent(actor, blocker, sign);
  if (!tangent) return null;

  let normal = { x: 0, y: 0 };
  if (geometry.face === "top") normal = { x: 0, y: -1 };
  if (geometry.face === "right") normal = { x: 1, y: 0 };
  if (geometry.face === "bottom") normal = { x: 0, y: 1 };
  if (geometry.face === "left") normal = { x: -1, y: 0 };

  // A small outward bias guarantees that a route candidate can leave a
  // collision-grazing tangent line instead of being rejected every frame.
  return normalize(
    tangent.x + normal.x * 0.55,
    tangent.y + normal.y * 0.55,
  );
}

function blockerKey(blocker) {
  if (!blocker) return "";
  return String(blocker.type || "") + ":" + String(blocker.id || "");
}

function collisionDescriptorAlongDirection(
  actor,
  direction,
  maxDistance,
  arena,
  expectedBlockerKey = "",
) {
  const unit = normalize(direction.x, direction.y);
  if (unit.x === 0 && unit.y === 0) return null;

  const sampleStep = 8;
  for (let distance = sampleStep; distance <= maxDistance; distance += sampleStep) {
    const blocker = collisionDescriptor(
      actor,
      actor.x + unit.x * distance,
      actor.y + unit.y * distance,
      arena,
    );

    if (!blocker) continue;
    if (!expectedBlockerKey || blockerKey(blocker) === expectedBlockerKey) {
      return blocker;
    }
  }

  return null;
}

function chooseCollisionRouteSign(actor, desired, blocker, fallbackSign) {
  const positive = collisionTangent(actor, blocker, 1);
  const negative = collisionTangent(actor, blocker, -1);

  if (!positive || !negative) return fallbackSign === -1 ? -1 : 1;

  const positiveScore = desired.x * positive.x + desired.y * positive.y;
  const negativeScore = desired.x * negative.x + desired.y * negative.y;

  // Prefer the side that already advances toward the target when that signal is
  // meaningful. If the target is almost straight through the wall, preserve the
  // actor's deterministic side so identical situations stay stable.
  if (Math.abs(positiveScore - negativeScore) >= 0.12) {
    return positiveScore > negativeScore ? 1 : -1;
  }

  return fallbackSign === -1 ? -1 : 1;
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
          actor.aiCollisionClearCandidateMs = 0;
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
    actor.aiForcedDetourMs = Math.max(
      0,
      (actor.aiForcedDetourMs || 0) - deltaSeconds * 1000,
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
    const directBlocker = collisionDescriptor(
      actor,
      actor.x + desired.x * step,
      actor.y + desired.y * step,
      arena,
    );
    const directBlocked = Boolean(directBlocker);
    const activeCollisionBlocker = actor.aiObstacleContactActive
      ? actor.aiCollisionBlocker
      : null;
    const activeCollisionKey = blockerKey(activeCollisionBlocker);
    const obstacleLookaheadDistance = Math.max(
      110,
      actor.radius * 5,
      actor.moveSpeed * 0.55,
    );
    const activeObstacleStillAhead = Boolean(
      activeCollisionBlocker?.type === "obstacle"
      && collisionDescriptorAlongDirection(
        actor,
        desired,
        obstacleLookaheadDistance,
        arena,
        activeCollisionKey,
      )
    );

    let sign = avoidanceSign(actor);

    if (directBlocked) {
      actor.aiAvoidanceMs = (actor.aiAvoidanceMs || 0) + deltaSeconds * 1000;
      actor.aiCollisionSampleMs =
        (actor.aiCollisionSampleMs || 0) + deltaSeconds * 1000;
      actor.aiCollisionGraceMs = Math.max(
        actor.aiCollisionGraceMs || 0,
        AI_COLLISION_GRACE_MS,
      );
      actor.aiCollisionClearCandidateMs = 0;

      const changedBlocker =
        actor.aiObstacleContactActive
        && blockerKey(actor.aiCollisionBlocker) !== blockerKey(directBlocker);

      if (!actor.aiObstacleContactActive || changedBlocker) {
        actor.aiObstacleDetours = (actor.aiObstacleDetours || 0) + 1;
        actor.aiCollisionSampleMs = 999;
        actor.aiCollisionBlocker = directBlocker;

        const nowMs = actor.aiMovementDebugClockMs || 0;
        const directKey = blockerKey(directBlocker);
        const reuseRecentRouteSign =
          directKey
          && directKey === actor.aiLastClearedCollisionKey
          && nowMs - (actor.aiLastClearedCollisionAtMs || -Infinity)
            <= AI_ROUTE_SIGN_MEMORY_MS
          && (
            actor.aiLastClearedCollisionSign === 1
            || actor.aiLastClearedCollisionSign === -1
          );

        actor.aiCollisionRouteSign = reuseRecentRouteSign
          ? actor.aiLastClearedCollisionSign
          : chooseCollisionRouteSign(
            actor,
            desired,
            directBlocker,
            sign,
          );
        actor.aiProgressAnchorX = actor.x;
        actor.aiProgressAnchorY = actor.y;
        actor.aiProgressWindowMs = 0;
        actor.aiLastCollisionChosenDirection = null;
        actor.aiLastCollisionChosenAtMs = 0;

        this.debug(actor, "collision-start", {
          position: { x: actor.x, y: actor.y },
          desired,
          blocker: directBlocker,
          avoidanceSign: actor.aiCollisionRouteSign,
          reusedRouteSign: reuseRecentRouteSign,
        });
      } else {
        actor.aiCollisionBlocker = directBlocker;
      }

      actor.aiObstacleContactActive = true;
    } else if (actor.aiObstacleContactActive) {
      if (activeObstacleStillAhead) {
        actor.aiCollisionClearCandidateMs = 0;
        actor.aiCollisionGraceMs = Math.max(
          actor.aiCollisionGraceMs || 0,
          AI_COLLISION_GRACE_MS,
        );
      } else {
        actor.aiCollisionClearCandidateMs =
          (actor.aiCollisionClearCandidateMs || 0) + deltaSeconds * 1000;
      }

      const canReleaseRoute =
        !activeObstacleStillAhead
        && (actor.aiCollisionGraceMs || 0) <= 0
        && (actor.aiCollisionClearCandidateMs || 0) >= AI_ROUTE_RELEASE_MS;

      if (canReleaseRoute) {
        const clearedBlocker = actor.aiCollisionBlocker || null;
        const clearedSign = actor.aiCollisionRouteSign || sign;
        const nowMs = actor.aiMovementDebugClockMs || 0;

        this.debug(actor, "collision-clear", {
          position: { x: actor.x, y: actor.y },
          contactMs: actor.aiAvoidanceMs || 0,
          avoidanceSign: clearedSign,
          blocker: clearedBlocker,
        });

        actor.aiLastClearedCollisionKey = blockerKey(clearedBlocker);
        actor.aiLastClearedCollisionSign = clearedSign;
        actor.aiLastClearedCollisionAtMs = nowMs;
        actor.aiAvoidanceMs = 0;
        actor.aiCollisionSampleMs = 0;
        actor.aiCollisionBlocker = null;
        actor.aiCollisionRouteSign = null;
        actor.aiCollisionClearCandidateMs = 0;
        actor.aiLastCollisionChosenSide = 0;
        actor.aiLastCollisionChosenDirection = null;
        actor.aiLastCollisionChosenAtMs = 0;
        actor.aiObstacleContactActive = false;
        actor.aiProgressAnchorX = actor.x;
        actor.aiProgressAnchorY = actor.y;
        actor.aiProgressWindowMs = 0;
      }
    }

    if (
      actor.aiObstacleContactActive
      && (actor.aiCollisionRouteSign === 1 || actor.aiCollisionRouteSign === -1)
    ) {
      sign = actor.aiCollisionRouteSign;
    }

    // Progress rerouting only belongs to an active collision contact. Previously
    // the watchdog ran during ordinary movement too, which could silently flip
    // the next obstacle side because an actor was casting or maintaining range.
    if (actor.aiObstacleContactActive || directBlocked) {
      if (
        !Number.isFinite(actor.aiProgressAnchorX)
        || !Number.isFinite(actor.aiProgressAnchorY)
      ) {
        actor.aiProgressAnchorX = actor.x;
        actor.aiProgressAnchorY = actor.y;
        actor.aiProgressWindowMs = 0;
      }

      actor.aiProgressWindowMs =
        (actor.aiProgressWindowMs || 0) + deltaSeconds * 1000;

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
        sign = -sign;
        actor.aiCollisionRouteSign = sign;
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
          blocker: directBlocker || actor.aiCollisionBlocker || null,
        });
      }
    } else {
      actor.aiProgressAnchorX = actor.x;
      actor.aiProgressAnchorY = actor.y;
      actor.aiProgressWindowMs = 0;
    }

    const collisionGraceActive = (actor.aiCollisionGraceMs || 0) > 0;
    const forcedDetour = (actor.aiForcedDetourMs || 0) > 0;
    const preferredAngles = forcedDetour
      ? [90, 118, 150, 68, 45, 24]
      : [24, 45, 68, 90, 118, 150];
    const directions = [];
    const steeringBlocker =
      directBlocker
      || (actor.aiObstacleContactActive ? actor.aiCollisionBlocker : null);

    // Follow a route contour just outside obstacle collision instead of trying
    // to balance exactly on the collision tangent. The corner waypoint gives the
    // AI a stable next destination, while the outward-biased escape direction is
    // a safe fallback if the actor is grazing the collider by a fraction.
    const obstacleRouteCommitted =
      actor.aiObstacleContactActive
      && steeringBlocker?.type === "obstacle";

    if (
      steeringBlocker
      && (directBlocked || collisionGraceActive || obstacleRouteCommitted)
    ) {
      if (steeringBlocker.type === "obstacle") {
        const routeDirection = collisionRouteDirection(
          actor,
          steeringBlocker,
          sign,
        );
        if (routeDirection) directions.push(routeDirection);

        const escapeDirection = collisionEscapeDirection(
          actor,
          steeringBlocker,
          sign,
        );
        if (escapeDirection) directions.push(escapeDirection);
      } else {
        const tangent = collisionTangent(actor, steeringBlocker, sign);
        if (tangent) directions.push(tangent);
      }
    }

    if (
      !forcedDetour
      && !collisionGraceActive
      && !obstacleRouteCommitted
    ) directions.push(desired);

    for (const degreesAway of preferredAngles) {
      directions.push(
        rotate(desired, degreesAway * Math.PI / 180 * sign),
      );
    }

    if (
      collisionGraceActive
      && !directBlocked
      && !obstacleRouteCommitted
    ) directions.push(desired);

    for (const degreesAway of preferredAngles) {
      directions.push(
        rotate(desired, -degreesAway * Math.PI / 180 * sign),
      );
    }

    if (
      forcedDetour
      && !collisionGraceActive
      && !obstacleRouteCommitted
    ) directions.push(desired);

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
          const nowMs = actor.aiMovementDebugClockMs || 0;
          const previousDirection = actor.aiLastCollisionChosenDirection;
          const previousAtMs = actor.aiLastCollisionChosenAtMs || 0;
          const switchGapMs = nowMs - previousAtMs;
          const actualDirectionDot = previousDirection
            ? previousDirection.x * direction.x + previousDirection.y * direction.y
            : 1;

          // Count an actual movement reversal, not a sign change relative to a
          // target vector that may itself have moved between simulation ticks.
          if (
            previousDirection
            && actualDirectionDot <= -0.35
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
              switchGapMs,
              avoidanceSign: sign,
            });
          }

          actor.aiLastCollisionChosenDirection = {
            x: direction.x,
            y: direction.y,
          };
          actor.aiLastCollisionChosenAtMs = nowMs;
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
      const nextSign = -sign;
      actor.aiAvoidanceSign = nextSign;
      if (actor.aiObstacleContactActive) {
        actor.aiCollisionRouteSign = nextSign;
      }
      this.debug(actor, "stuck-side-flip", {
        position: { x: actor.x, y: actor.y },
        previousAvoidanceSign: sign,
        nextAvoidanceSign: nextSign,
        blocker: directBlocker || actor.aiCollisionBlocker || null,
        stuckMs: actor.aiStuckMs,
      });
      actor.aiStuckMs = 300;
    }

    if (!actor.aiNoRouteActive) {
      actor.aiNoRouteActive = true;
      this.debug(actor, "no-route", {
        position: { x: actor.x, y: actor.y },
        desired,
        blocker: directBlocker || actor.aiCollisionBlocker || null,
        avoidanceSign: actor.aiCollisionRouteSign || actor.aiAvoidanceSign,
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
