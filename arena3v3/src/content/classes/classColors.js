// World of Warcraft class colors used by the raid UI/addons.
// Source values match the standard WoW class-color palette.
export const WOW_CLASS_COLORS = Object.freeze({
  priest: "#FFFFFF",
  druid: "#FF7C0A",
  paladin: "#F48CBA",
  warrior: "#C69B6D",
  rogue: "#FFF468",
  "death-knight": "#C41E3A",
  mage: "#3FC7EB",
  warlock: "#8788EE",
  shaman: "#0070DD",
});

export function classColorFor(actor) {
  return WOW_CLASS_COLORS[actor?.classId] || "#7E9D70";
}
