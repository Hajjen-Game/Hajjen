import { VIEWPORT } from "../config.js";

export function fitStage(stage) {
  const scale = Math.min(innerWidth / VIEWPORT.width, innerHeight / VIEWPORT.height);
  stage.style.transform = `scale(${scale})`;
}
