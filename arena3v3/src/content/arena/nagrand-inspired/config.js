export const arenaConfig = {
  id: "four-pillar-ring",
  name: "The Grand Ring",
  width: 1280,
  height: 720,

  // Open four-pillar layout with wide center and side lanes.
  // Obstacles are shared by collision and line-of-sight systems.
  bounds: { x: 58, y: 58, w: 1164, h: 604 },

  obstacles: [
    { id: "nw-pillar", x: 250, y: 145, w: 100, h: 140 },
    { id: "sw-pillar", x: 250, y: 435, w: 100, h: 140 },
    { id: "ne-pillar", x: 930, y: 145, w: 100, h: 140 },
    { id: "se-pillar", x: 930, y: 435, w: 100, h: 140 },
  ],

  spawns: {
    "player-healer": { x: 135, y: 360, facing: 0 },
    "ally-healer": { x: 175, y: 300, facing: 0 },
    "ally-melee": { x: 175, y: 300, facing: 0 },
    "ally-caster": { x: 175, y: 420, facing: 0 },

    "enemy-healer": { x: 1145, y: 360, facing: Math.PI },
    "enemy-melee": { x: 1105, y: 300, facing: Math.PI },
    "enemy-caster": { x: 1105, y: 420, facing: Math.PI },
  },
};
