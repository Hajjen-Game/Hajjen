export const windscarProvingGroundsArena = {
  id: "windscar-proving-grounds",
  name: "Windscar Proving Grounds",
  description: "A longer center wall and two wide-set offset pillars create open cross-lanes and stronger LOS rotations.",
  width: 1280,
  height: 720,

  bounds: { x: 58, y: 58, w: 1164, h: 604 },

  // Nokhudon-inspired 2D layout:
  // - one short central LOS wall
  // - two offset flank pillars
  // - broad routes around every obstacle
  // The layout is 180-degree rotationally symmetric so both teams get the
  // same geometry while still feeling less rigid than The Grand Ring.
  obstacles: [
    { id: "northwest-pillar", x: 340, y: 130, w: 120, h: 120 },
    { id: "center-wall", x: 505, y: 325, w: 270, h: 70 },
    { id: "southeast-pillar", x: 820, y: 470, w: 120, h: 120 },
  ],

  spawns: {
    "friendly-healer": { x: 135, y: 360, facing: 0 },
    "friendly-melee": { x: 185, y: 300, facing: 0 },
    "friendly-caster": { x: 185, y: 420, facing: 0 },

    "enemy-healer": { x: 1145, y: 360, facing: Math.PI },
    "enemy-melee": { x: 1095, y: 300, facing: Math.PI },
    "enemy-caster": { x: 1095, y: 420, facing: Math.PI },

    // Legacy aliases retained for older diagnostics/bookmarks.
    "player-healer": { x: 135, y: 360, facing: 0 },
    "ally-healer": { x: 135, y: 360, facing: 0 },
    "ally-melee": { x: 185, y: 300, facing: 0 },
    "ally-caster": { x: 185, y: 420, facing: 0 },
  },
};
