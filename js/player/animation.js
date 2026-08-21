import { ASSETS, ANCHORS, PLAYER } from "../config.js";

export function renderSharkan(state, elements) {
  const { root, sprite, shadow, dot, debug } = elements;
  root.style.left = state.x + "px";
  root.style.top = state.y + "px";
  shadow.style.left = state.x + "px";
  shadow.style.top = state.y + "px";
  dot.style.left = state.x + "px";
  dot.style.top = state.y + "px";

  let src = ASSETS.sharkan[state.dir];
  let anchor = ANCHORS[state.dir];

  if (state.dir === "down" && state.moving) {
    src = ASSETS.sharkan.walkDown[state.walkFrame];
    anchor = ANCHORS.walkDown[state.walkFrame];
  }

  const scale = PLAYER.spriteSize / PLAYER.sourceSize;
  sprite.src = src;
  sprite.style.left = (-anchor.x * scale) + "px";
  sprite.style.top = (-anchor.y * scale) + "px";

  debug.textContent = `dir: ${state.dir}  world: ${Math.round(state.x)}, ${Math.round(state.y)}  anchor: ${anchor.x}, ${anchor.y}  walk: ${state.dir==="down"&&state.moving ? state.walkFrame+1 : "-"}/4`;
}

export function updateWalkAnimation(state, dt) {
  if (state.dir !== "down") {
    state.walkClock = 0;
    state.walkFrame = 0;
    return;
  }

  state.walkClock += dt;
  const frameMs = 1000 / PLAYER.walkFps;
  while (state.walkClock >= frameMs) {
    state.walkClock -= frameMs;
    state.walkFrame = (state.walkFrame + 1) % ASSETS.sharkan.walkDown.length;
  }
}
