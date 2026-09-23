export const arenaConfig = {
  id: "four-pillar-ring",
  name: "The Grand Ring",
  width: 1280,
  height: 720,

  // Symmetric, open-field 4-pillar layout inspired by classic MMO arena geometry.
  // These rectangles are both collision and line-of-sight blockers.
  bounds: { x: 42, y: 42, w: 1196, h: 636 },
  obstacles: [
    { id: "nw-pillar", x: 300, y: 175, w: 112, h: 154 },
    { id: "sw-pillar", x: 300, y: 391, w: 112, h: 154 },
    { id: "ne-pillar", x: 868, y: 175, w: 112, h: 154 },
    { id: "se-pillar", x: 868, y: 391, w: 112, h: 154 },
  ],

  spawns: {
    "player-healer": { x: 145, y: 360, facing: 0 },
    "ally-melee": { x: 185, y: 300, facing: 0 },
    "ally-caster": { x: 185, y: 420, facing: 0 },
    "enemy-healer": { x: 1135, y: 360, facing: Math.PI },
    "enemy-melee": { x: 1095, y: 300, facing: Math.PI },
    "enemy-caster": { x: 1095, y: 420, facing: Math.PI },
  },
};
