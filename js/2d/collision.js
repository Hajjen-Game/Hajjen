import { WORLD, PLAYER } from "./config.js";

function ellipseHit(px, py, item) {
  let rx = 0, ry = 0;
  if (item.decorative || item.type === "flower" || item.type === "branch") return false;
  if (item.type === "tree") { rx = 34; ry = 24; }
  else if (item.type === "rock") { rx = 32; ry = 24; }
  else if (item.type === "bush") { rx = 28; ry = 20; }
  else return false;

  const dx = px - item.x;
  const dy = py - item.y;
  const combinedX = rx + PLAYER.radiusX;
  const combinedY = ry + PLAYER.radiusY;
  return (dx * dx) / (combinedX * combinedX) + (dy * dy) / (combinedY * combinedY) < 1;
}

export function collides(x, y, objects) {
  if (x < PLAYER.radiusX || y < PLAYER.radiusY || x > WORLD.width - PLAYER.radiusX || y > WORLD.height - PLAYER.radiusY) return true;
  return objects.some(item => ellipseHit(x, y, item));
}

export function moveWithCollision(player, dx, dy, dt, objects) {
  const step = player.speed * dt;
  const nx = player.x + dx * step;
  const ny = player.y + dy * step;

  if (!collides(nx, ny, objects)) {
    player.x = nx; player.y = ny; return;
  }
  if (!collides(nx, player.y, objects)) player.x = nx;
  if (!collides(player.x, ny, objects)) player.y = ny;
}

export function collisionShape(item) {
  if (item.type === "tree") return { rx: 34, ry: 24 };
  if (item.type === "rock") return { rx: 32, ry: 24 };
  if (item.type === "bush") return { rx: 28, ry: 20 };
  return null;
}
