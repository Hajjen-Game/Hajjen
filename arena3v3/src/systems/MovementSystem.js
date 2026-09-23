import { clamp, normalize } from "../core/utils.js";

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

export class MovementSystem {
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

  move(actor, vector, deltaSeconds, arena) {
    if (!actor.alive) return false;

    const direction = normalize(vector.x, vector.y);
    if (direction.x === 0 && direction.y === 0) {
      actor.lastMove = { x: 0, y: 0 };
      return false;
    }

    const step = actor.moveSpeed * deltaSeconds;
    return this.tryDirection(actor, direction, step, arena);
  }

  moveAI(actor, vector, deltaSeconds, arena) {
    if (!actor.alive) return false;

    const desired = normalize(vector.x, vector.y);
    if (desired.x === 0 && desired.y === 0) {
      actor.lastMove = { x: 0, y: 0 };
      return false;
    }

    const step = actor.moveSpeed * deltaSeconds;
    const sign = avoidanceSign(actor);
    const degrees = [0, 24, 45, 68, 90, 118, 150];
    const directions = [];

    for (const degreesAway of degrees) {
      if (degreesAway === 0) {
        directions.push(desired);
        continue;
      }

      const radians = degreesAway * Math.PI / 180;
      // Keep a stable preferred side first, then try the opposite side.
      directions.push(rotate(desired, radians * sign));
      directions.push(rotate(desired, -radians * sign));
    }

    // If an AI has been blocked for a while, allow a short retreat to escape
    // pillar corners and then swap its preferred navigation side.
    if ((actor.aiStuckMs || 0) >= 360) {
      directions.push(rotate(desired, Math.PI));
    }

    for (const candidate of directions) {
      const direction = normalize(candidate.x, candidate.y);
      if (this.tryDirection(actor, direction, step, arena)) {
        actor.aiStuckMs = 0;
        return true;
      }
    }

    actor.aiStuckMs = (actor.aiStuckMs || 0) + deltaSeconds * 1000;

    if (actor.aiStuckMs >= 520) {
      actor.aiAvoidanceSign = -sign;
      actor.aiStuckMs = 300;
    }

    actor.lastMove = { x: 0, y: 0 };
    return false;
  }

  dashToRange(actor, target, stopDistance, arena) {
    if (!actor.alive || !target?.alive) return false;

    const dx = target.x - actor.x;
    const dy = target.y - actor.y;
    const distance = Math.hypot(dx, dy);
    if (distance <= stopDistance) return false;

    const direction = normalize(dx, dy);
    const travel = Math.max(0, distance - stopDistance);
    const stepSize = 10;
    let remaining = travel;
    let moved = false;

    while (remaining > 0) {
      const step = Math.min(stepSize, remaining);
      const nextX = actor.x + direction.x * step;
      const nextY = actor.y + direction.y * step;

      if (collides(actor, nextX, nextY, arena)) break;

      actor.x = nextX;
      actor.y = nextY;
      remaining -= step;
      moved = true;
    }

    if (moved) {
      actor.lastMove = direction;
      actor.facing = Math.atan2(direction.y, direction.x);
    }

    return moved;
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
