import { clamp, normalize } from "../core/utils.js";

function circleHitsRect(x, y, radius, rect) {
  const closestX = clamp(x, rect.x, rect.x + rect.w);
  const closestY = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
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
  move(actor, vector, deltaSeconds, arena) {
    if (!actor.alive) return false;

    const direction = normalize(vector.x, vector.y);
    if (direction.x === 0 && direction.y === 0) {
      actor.lastMove = { x: 0, y: 0 };
      return false;
    }

    const step = actor.moveSpeed * deltaSeconds;
    const dx = direction.x * step;
    const dy = direction.y * step;
    let moved = false;

    if (!collides(actor, actor.x + dx, actor.y, arena)) {
      actor.x += dx;
      moved = true;
    }
    if (!collides(actor, actor.x, actor.y + dy, arena)) {
      actor.y += dy;
      moved = true;
    }

    if (moved) {
      actor.lastMove = direction;
      actor.facing = Math.atan2(direction.y, direction.x);
    }

    return moved;
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
