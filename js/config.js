export const VIEWPORT = { width: 1920, height: 1080 };
export const PLAYER = {
  speed: 0.115,
  spriteSize: 185,
  sourceSize: 1254,
  jumpDuration: 560,
  walkFps: 7
};
export const ASSETS = {
  sharkan: {
    up: "assets/characters/sharkan/walk/up/sharkan_walk_up_01.png",
    down: "assets/characters/sharkan/walk/down/sharkan_walk_down_01.png",
    left: "assets/characters/sharkan/walk/left/sharkan_walk_left_01.png",
    right: "assets/characters/sharkan/walk/right/sharkan_walk_right_01.png",
    walkDown: [
      "assets/characters/sharkan/walk/down/sharkan_walk_down_01.png",
      "assets/characters/sharkan/walk/down/sharkan_walk_down_02.png",
      "assets/characters/sharkan/walk/down/sharkan_walk_down_03.png",
      "assets/characters/sharkan/walk/down/sharkan_walk_down_04.png"
    ]
  },
  portraits: {
    professor: "assets/characters/npcs/professor/professor_otter.png",
    emberKeeper: "assets/characters/npcs/primal-keepers/ember/ember_keeper.png"
  }
};
export const ANCHORS = {
  up: { x: 627, y: 905 },
  down: { x: 627, y: 1052 },
  left: { x: 535, y: 1090 },
  right: { x: 800, y: 1092 },
  walkDown: [
    { x: 627, y: 1052 },
    { x: 627, y: 1054 },
    { x: 627, y: 1063 },
    { x: 627, y: 1052 }
  ]
};
