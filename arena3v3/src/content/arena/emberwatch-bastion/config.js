export const emberwatchBastionArena = {
  id: "emberwatch-bastion",
  name: "Emberwatch Bastion",
  description: "A fortress courtyard with two high spires and two low ramparts creating diagonal LOS rotations and open kill lanes.",
  previewOnly: true,
  width: 1280,
  height: 720,

  bounds: { x: 58, y: 58, w: 1164, h: 604 },

  // New Babylon-first 3v3 layout. 180-degree rotational symmetry keeps the
  // competitive geometry fair while diagonal object types create different
  // rotation choices than Windscar or The Grand Ring.
  obstacles: [
    { id: "northwest-spire", x: 318, y: 145, w: 108, h: 122 },
    { id: "northeast-rampart", x: 744, y: 205, w: 182, h: 72 },
    { id: "southwest-rampart", x: 354, y: 443, w: 182, h: 72 },
    { id: "southeast-spire", x: 854, y: 453, w: 108, h: 122 },
  ],

  spawns: {
    "friendly-healer": { x: 135, y: 360, facing: 0 },
    "friendly-melee": { x: 185, y: 300, facing: 0 },
    "friendly-caster": { x: 185, y: 420, facing: 0 },

    "enemy-healer": { x: 1145, y: 360, facing: Math.PI },
    "enemy-melee": { x: 1095, y: 300, facing: Math.PI },
    "enemy-caster": { x: 1095, y: 420, facing: Math.PI },

    "player-healer": { x: 135, y: 360, facing: 0 },
    "ally-healer": { x: 135, y: 360, facing: 0 },
    "ally-melee": { x: 185, y: 300, facing: 0 },
    "ally-caster": { x: 185, y: 420, facing: 0 },
  },
};
