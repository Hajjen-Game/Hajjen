const backgroundImageUrl = new URL(
  "../../../../assets/arenas/sunscar-canyon/background.png",
  import.meta.url,
).href;

export const sunscarCanyonArena = {
  id: "sunscar-canyon-test",
  name: "Sunscar Canyon",
  description: "Pixi image-background collision test.",
  width: 1280,
  height: 720,
  previewOnly: true,
  pixiOnly: true,
  pixiBackgroundImage: backgroundImageUrl,

  // First-pass collision follows the inner canyon edge rather than the full
  // decorative rock mass, preserving as much usable combat space as possible.
  bounds: { x: 135, y: 70, w: 1010, h: 580 },

  // LOS/collision footprints for the four visible cover formations.
  obstacles: [
    { id: "northwest-rock", x: 390, y: 120, w: 110, h: 145 },
    { id: "northeast-wall", x: 700, y: 165, w: 220, h: 100 },
    { id: "southwest-wall", x: 400, y: 395, w: 200, h: 100 },
    { id: "southeast-rock", x: 825, y: 410, w: 135, h: 150 },

    // The four brazier / faux-pillar structures are visibly solid in the
    // background art. Keep their footprints out of the playable corner space
    // so actors cannot stand inside the fire/pillar artwork.
    { id: "northwest-brazier", x: 145, y: 70, w: 82, h: 58 },
    { id: "northeast-brazier", x: 1055, y: 70, w: 82, h: 58 },
    { id: "southwest-brazier", x: 140, y: 570, w: 88, h: 80 },
    { id: "southeast-brazier", x: 1052, y: 565, w: 93, h: 85 },
  ],

  spawns: {
    "friendly-healer": { x: 180, y: 360 },
    "friendly-melee": { x: 225, y: 300 },
    "friendly-caster": { x: 225, y: 420 },
    "enemy-healer": { x: 1100, y: 360 },
    "enemy-melee": { x: 1055, y: 300 },
    "enemy-caster": { x: 1055, y: 420 },

    // Legacy aliases retained for older roster/test paths.
    self: { x: 180, y: 360 },
    "ally-melee": { x: 225, y: 300 },
    "ally-caster": { x: 225, y: 420 },
  },
};
