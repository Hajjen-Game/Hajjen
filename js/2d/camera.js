import { WORLD, VIEW } from "./config.js";

export function createCamera(x, y) {
  return { x, y, targetX: x, targetY: y };
}

export function updateCamera(camera, targetX, targetY, dt, viewportWidth, viewportHeight) {
  camera.targetX = targetX;
  camera.targetY = targetY;
  const t = 1 - Math.exp(-VIEW.cameraSmoothing * dt);
  camera.x += (targetX - camera.x) * t;
  camera.y += (targetY - camera.y) * t;

  const halfW = viewportWidth / 2;
  const halfH = viewportHeight / 2;
  camera.x = Math.max(halfW, Math.min(WORLD.width - halfW, camera.x));
  camera.y = Math.max(halfH, Math.min(WORLD.height - halfH, camera.y));
}
