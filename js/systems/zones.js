const ZONES = {
  intro: {
    name: "The Crossroads",
    sub: "Introduction Zone"
  },
  ember: {
    name: "Ember Hollow",
    sub: "Primal Force: Ember",
    spawn: { x: 360, y: 253, dir: "down" },
    enterToast: "Entered Ember Hollow"
  },
  growth: {
    name: "Growth Grove",
    sub: "Primal Force: Growth",
    spawn: { x: 960, y: 835, dir: "up" },
    enterToast: "Entered Growth Grove"
  }
};

export function createZoneSystem(state, renderSharkan, toast) {
  let transitionLockedUntil = 0;

  function canTransition() {
    return performance.now() >= transitionLockedUntil;
  }

  function goZone(zone, options = {}) {
    if (!canTransition()) return false;
    transitionLockedUntil = performance.now() + 800;

    const currentScene = document.querySelector(".scene.active");
    const nextScene = document.getElementById(zone);
    if (!nextScene) return false;

    currentScene?.classList.remove("active");
    nextScene.classList.add("active");
    state.zone = zone;

    const config = ZONES[zone];
    const spawn = options.spawn ?? config?.spawn ?? { x: 960, y: 900, dir: "up" };
    state.x = spawn.x;
    state.y = spawn.y;
    state.dir = spawn.dir ?? "up";

    document.getElementById("zoneName").textContent = config?.name ?? zone;
    document.getElementById("zoneSub").textContent = config?.sub ?? "";

    state.moving = false;
    state.walkClock = 0;
    state.walkFrame = 0;
    renderSharkan();

    if (options.toast) toast(options.toast);
    else if (config?.enterToast && zone !== "intro") toast(config.enterToast);
    else if (zone === "intro") toast("Returned to The Crossroads");

    return true;
  }

  function returnToIntro(branch) {
    const spawns = {
      ember: { x: 340, y: 702, dir: "right" },
      growth: { x: 1365, y: 695, dir: "left" }
    };
    return goZone("intro", { spawn: spawns[branch] ?? { x: 960, y: 760, dir: "up" } });
  }

  return { goZone, returnToIntro, canTransition };
}
