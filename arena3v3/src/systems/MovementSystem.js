import { clamp, normalize } from "../core/utils.js";
function circleHitsRect(x, y, radius, rect) {
  const closestX = clamp(x, rect.x, rect.x + rect.w);
  const closestY = clamp(y, rect.y, rect.y + rect.h);
  const dx = x - closestX, dy = y - closestY;
  return dx * dx + dy * dy < radius * radius;
}
function collides(actor, x, y, arena) {
  const b = arena.bounds;
  if (x - actor.radius < b.x || x + actor.radius > b.x + b.w || y - actor.radius < b.y || y + actor.radius > b.y + b.h) return true;
  return arena.obstacles.some(rect => circleHitsRect(x, y, actor.radius + 3, rect));
}
export class MovementSystem {
  move(actor, vector, deltaSeconds, arena) {
    if (!actor.alive) return false;
    const direction = normalize(vector.x, vector.y);
    if (direction.x === 0 && direction.y === 0) { actor.lastMove = { x: 0, y: 0 }; return false; }
    const step = actor.moveSpeed * deltaSeconds, dx = direction.x * step, dy = direction.y * step;
    let moved = false;
    if (!collides(actor, actor.x + dx, actor.y, arena)) { actor.x += dx; moved = true; }
    if (!collides(actor, actor.x, actor.y + dy, arena)) { actor.y += dy; moved = true; }
    if (moved) { actor.lastMove = direction; actor.facing = Math.atan2(direction.y, direction.x); }
    return moved;
  }
  wouldCollide(actor, vector, step, arena) {
    const direction = normalize(vector.x, vector.y);
    return collides(actor, actor.x + direction.x * step, actor.y + direction.y * step, arena);
  }
}
