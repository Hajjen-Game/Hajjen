export function castBarPaletteFor(actor, fallback = {}) {
  const spell = actor?.cast ? actor.getSpell(actor.cast.spellId) : null;
  const spellId = spell?.id || "";
  const school = spell?.school || "";
  const style = spell?.visualStyle || actor?.visualStyle || "";

  if (spellId === "mage-frostfire-bolt") {
    return { start: "#78d8ff", end: "#ff7048", glow: "#b898ff", border: "#e6f6ff" };
  }

  if (spellId === "shaman-chain-lightning") {
    return { start: "#76e4ff", end: "#7da8ff", glow: "#82dfff", border: "#d9f8ff" };
  }

  if (spellId === "shaman-flame-shock" || spellId === "shaman-lava-burst") {
    return { start: "#ffb24a", end: "#e94f37", glow: "#ff7848", border: "#ffd6a0" };
  }

  if (style === "death-knight" || spellId.startsWith("dk-")) {
    return { start: "#7b1720", end: "#e84f58", glow: "#ff5963", border: "#ffb0b5" };
  }

  if (style === "warrior") {
    return { start: "#707983", end: "#c2c8cf", glow: "#b7c0c9", border: "#e3e7eb" };
  }

  if (style === "druid") {
    return { start: "#4d9f62", end: "#8bd07a", glow: "#75d58b", border: "#c8f0c8" };
  }

  if (style === "paladin") {
    return { start: "#d9a93d", end: "#ffe083", glow: "#f6cf63", border: "#fff0b5" };
  }

  if (style === "priest" && school === "holy") {
    return { start: "#dfbd58", end: "#fff1a6", glow: "#ffe48a", border: "#fff8cf" };
  }

  if (style === "shaman" && spell?.target === "ally") {
    return { start: "#42a978", end: "#82d6a1", glow: "#69cf9a", border: "#ccf4de" };
  }

  if (school === "frost") {
    return { start: "#4aa7e8", end: "#a7e7ff", glow: "#7fd8ff", border: "#dbf6ff" };
  }

  if (school === "fire") {
    return { start: "#e84b32", end: "#ffb23f", glow: "#ff7045", border: "#ffd5a1" };
  }

  if (school === "arcane") {
    return { start: "#6955d6", end: "#b49cff", glow: "#9c82ff", border: "#ded3ff" };
  }

  if (school === "chaos") {
    return { start: "#3f9b58", end: "#9be86f", glow: "#72d36d", border: "#d5ff9e" };
  }

  if (school === "shadow" || school === "shadowfrost") {
    return { start: "#56317f", end: "#a86cdb", glow: "#9360cf", border: "#d9b7f0" };
  }

  if (school === "holy") {
    return { start: "#d8b64f", end: "#ffe895", glow: "#f5d66e", border: "#fff3bd" };
  }

  if (school === "nature") {
    return { start: "#3f9f83", end: "#71c9a9", glow: "#65c7aa", border: "#c5eee2" };
  }

  if (school === "physical") {
    return { start: "#707983", end: "#c2c8cf", glow: "#b7c0c9", border: "#e3e7eb" };
  }

  return {
    start: fallback.cast || "#8877a6",
    end: fallback.cream || "#e7d6b7",
    glow: fallback.cast || "#8877a6",
    border: fallback.border || "rgba(245,224,190,.6)",
  };
}
