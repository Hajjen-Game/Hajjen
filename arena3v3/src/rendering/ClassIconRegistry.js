const CLASS_ICON_PATHS = Object.freeze({
  priest: "../content/classes/priest/assets/Priest-icon.png",
  druid: "../content/classes/druid/assets/Druid-icon.png",
  paladin: "../content/classes/paladin/assets/Paladin-icon.png",
  warrior: "../content/classes/warrior/assets/Warrior-icon.png",
  rogue: "../content/classes/rogue/assets/Rogue-icon.png",
  "death-knight": "../content/classes/death-knight/assets/Death-Knight-icon.png",
  mage: "../content/classes/mage/assets/Mage-icon.png",
  warlock: "../content/classes/warlock/assets/Warlock-icon.png",
  shaman: "../content/classes/shaman/assets/Shaman-icon.png",
});

const classIconCache = new Map();

export function getClassIcon(classId) {
  const path = CLASS_ICON_PATHS[classId];
  if (!path || typeof Image === "undefined") return null;

  if (!classIconCache.has(classId)) {
    const image = new Image();
    image.decoding = "async";
    image.src = new URL(path, import.meta.url).href;
    classIconCache.set(classId, image);
  }

  return classIconCache.get(classId);
}

export function classIconReady(image) {
  return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0);
}
