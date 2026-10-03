const backgroundChunkUrls = Object.freeze([
  new URL("../../../../assets/arenas/sunscar-canyon/background.part01.b64", import.meta.url).href,
  new URL("../../../../assets/arenas/sunscar-canyon/background.part02.b64", import.meta.url).href,
  new URL("../../../../assets/arenas/sunscar-canyon/background.part03.b64", import.meta.url).href,
  new URL("../../../../assets/arenas/sunscar-canyon/background.part04.b64", import.meta.url).href,
  new URL("../../../../assets/arenas/sunscar-canyon/background.part05.b64", import.meta.url).href,
  new URL("../../../../assets/arenas/sunscar-canyon/background.part06.b64", import.meta.url).href,
  new URL("../../../../assets/arenas/sunscar-canyon/background.part07.b64", import.meta.url).href,
  new URL("../../../../assets/arenas/sunscar-canyon/background.part08.b64", import.meta.url).href,
  new URL("../../../../assets/arenas/sunscar-canyon/background.part09.b64", import.meta.url).href,
]);

export const sunscarCanyonArena = {
  id: "sunscar-canyon-test",
  name: "Sunscar Canyon",
  description: "Pixi image-background collision test.",
  width: 1280,
  height: 720,
  previewOnly: true,
  pixiOnly: true,
  pixiBackgroundMime: "image/webp",
  pixiBackgroundChunks: backgroundChunkUrls,

  // First-pass collision follows the inner canyon edge rather than the full
  // decorative rock mass, preserving as much usable combat space as possible.
  bounds: { x: 135, y: 70, w: 1010, h: 580 },

  // LOS/collision footprints for the four visible cover formations.
  obstacles: [
    { id: "northwest-rock", x: 390, y: 120, w: 110, h: 145 },
    { id: "northeast-wall", x: 700, y: 165, w: 220, h: 100 },
    { id: "southwest-wall", x: 400, y: 395, w: 200, h: 100 },
    { id: "southeast-rock", x: 825, y: 410, w: 135, h: 150 },
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
