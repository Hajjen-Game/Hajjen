export const twinRuinsArena = {
  id: "twin-ruins",
  name: "Twin Ruins",
  description: "Two large central ruins create strong LOS lanes and pillar-circling fights.",
  width: 1280,
  height: 720,

  bounds: { x: 58, y: 58, w: 1164, h: 604 },

  // Two tall central ruins. The center gap is intentionally wide enough for
  // melee traffic while the top, bottom and outer lanes give casters/healers
  // multiple ways to rotate without relying on narrow corridors.
  obstacles: [
    { id: "west-ruin", x: 410, y: 190, w: 120, h: 340 },
    { id: "east-ruin", x: 750, y: 190, w: 120, h: 340 },
  ],

  spawns: {
    "friendly-healer": { x: 135, y: 360, facing: 0 },
    "friendly-melee": { x: 185, y: 300, facing: 0 },
    "friendly-caster": { x: 185, y: 420, facing: 0 },

    "enemy-healer": { x: 1145, y: 360, facing: Math.PI },
    "enemy-melee": { x: 1095, y: 300, facing: Math.PI },
    "enemy-caster": { x: 1095, y: 420, facing: Math.PI },

    // Keep legacy aliases available while older diagnostics/bookmarks exist.
    "player-healer": { x: 135, y: 360, facing: 0 },
    "ally-healer": { x: 135, y: 360, facing: 0 },
    "ally-melee": { x: 185, y: 300, facing: 0 },
    "ally-caster": { x: 185, y: 420, facing: 0 },
  },
};
