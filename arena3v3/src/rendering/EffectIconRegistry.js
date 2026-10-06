const SPELL_ICON_KEYS = Object.freeze({
  "priest-renew": "holy-leaf",
  "priest-pain-suppression": "shield",
  "priest-power-word-shield": "shield",
  "priest-psychic-scream": "fear",
  "druid-rejuvenation": "leaf",
  "druid-regrowth": "leaf",
  "druid-ironbark": "shield-leaf",
  "druid-cyclone": "spiral",
  "paladin-blessing": "holy-shield",
  "paladin-hammer": "hammer",
  "warrior-rend": "slashes",
  "warrior-mortal-strike": "mortal",
  "warrior-charge": "root",
  "rogue-garrote": "slashes",
  "mage-living-bomb": "flame",
  "mage-frost-nova": "frost",
  "mage-polymorph": "spiral",
  "warlock-corruption": "shadow",
  "warlock-resolve": "shield",
  "warlock-fear": "fear",
  "shaman-flame-shock": "flame",
  "shaman-hex": "spiral",
  "shaman-astral-shift": "shield-bolt",
  "dk-fever": "frost",
  "dk-rune-tap": "shield",
  "powerup-power-damage": "power",
  "powerup-power-defense": "shield",
  "powerup-haste": "haste",
  "powerup-speed": "speed",
});

const PALETTES = Object.freeze({
  hot: { color: "#bcefc2", background: "#376e45", border: "#74c982" },
  dot: { color: "#ffe0d5", background: "#763f34", border: "#d06a55" },
  damageReduction: { color: "#e6ecff", background: "#504f77", border: "#a79fdb" },
  absorb: { color: "#fff0bd", background: "#67582d", border: "#efd477" },
  healingReduction: { color: "#ffe2dc", background: "#7c342f", border: "#e35e55" },
  offensiveCooldown: { color: "#ffe0b2", background: "#6f3e19", border: "#efa04a" },
  schoolLock: { color: "#efe2ff", background: "#4d3d66", border: "#b29ad1" },
  slow: { color: "#d9f5ff", background: "#315b68", border: "#79c4dd" },
  powerUpDamage: { color: "#ffe0c8", background: "#6d2d22", border: "#ff7848" },
  powerUpHaste: { color: "#f0dcff", background: "#4d3568", border: "#c98cff" },
  powerUpSpeed: { color: "#d8f8ff", background: "#245a69", border: "#5ddcff" },
  stun: { color: "#ffe2dd", background: "#73372f", border: "#e46f5e" },
  fear: { color: "#ffe6bd", background: "#73522d", border: "#e2a85f" },
  incapacitate: { color: "#eee3ff", background: "#55456f", border: "#b89be8" },
  root: { color: "#dcf6ff", background: "#315c6a", border: "#78c6df" },
  generic: { color: "#f2e6d2", background: "#4f3c2b", border: "#a77a4e" },
});

const SPELL_PALETTES = Object.freeze({
  "priest-pain-suppression": { color: "#f1d4ff", background: "#603874", border: "#c56cff" },
  "priest-power-word-shield": { color: "#fff0bd", background: "#6f5d2d", border: "#f0cf70" },
  "druid-ironbark": { color: "#dcf5c4", background: "#386343", border: "#66df76" },
  "paladin-blessing": { color: "#fff2a8", background: "#706027", border: "#ffd447" },
  "warlock-resolve": { color: "#ead4ff", background: "#563870", border: "#b76cff" },
  "shaman-astral-shift": { color: "#d4fbff", background: "#27616b", border: "#53ddf2" },
  "dk-rune-tap": { color: "#d6f8ff", background: "#315d68", border: "#68d6ee" },
  "warlock-corruption": { color: "#eadbff", background: "#4e3567", border: "#a86ee8" },
  "shaman-flame-shock": { color: "#ffe0c2", background: "#71391f", border: "#e77b40" },
  "mage-living-bomb": { color: "#ffe5c7", background: "#70401f", border: "#ef8a43" },
  "dk-fever": { color: "#e0f6ff", background: "#315c72", border: "#6fc8ee" },
  "powerup-power-damage": { color: "#fff0dd", background: "#7a3424", border: "#ff7b4a" },
  "powerup-power-defense": { color: "#fff0dd", background: "#684328", border: "#f2b467" },
  "powerup-haste": { color: "#f3e5ff", background: "#50366b", border: "#c98cff" },
  "powerup-speed": { color: "#ddf9ff", background: "#285e6d", border: "#61dfff" },
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function effectIconKey(effect) {
  if (!effect) return "generic";
  if (SPELL_ICON_KEYS[effect.spellId]) return SPELL_ICON_KEYS[effect.spellId];

  if (effect.kind === "stun") return "stun";
  if (effect.kind === "fear") return "fear";
  if (effect.kind === "incapacitate") return "spiral";
  if (effect.kind === "root") return "root";
  if (effect.kind === "schoolLock") return "lock";
  if (effect.kind === "damageReduction") return "shield";
  if (effect.kind === "absorb") return "shield";
  if (effect.kind === "healingReduction") return "mortal";
  if (effect.kind === "offensiveCooldown") return "burst";
  if (effect.kind === "hot") return "leaf";
  if (effect.kind === "dot") return "flame";
  if (effect.kind === "slow") return "frost";
  if (effect.kind === "powerUpDamage") return "power";
  if (effect.kind === "powerUpHaste") return "haste";
  if (effect.kind === "powerUpSpeed") return "speed";
  return "generic";
}

export function effectPalette(effect) {
  return SPELL_PALETTES[effect?.spellId]
    || PALETTES[effect?.kind]
    || PALETTES.generic;
}

export function effectPriority(effect) {
  const priorities = {
    stun: 100,
    fear: 98,
    incapacitate: 96,
    root: 92,
    schoolLock: 88,
    damageReduction: 82,
    absorb: 84,
    offensiveCooldown: 78,
    healingReduction: 74,
    dot: 62,
    hot: 58,
    slow: 48,
    powerUpDamage: 86,
    powerUpHaste: 86,
    powerUpSpeed: 86,
  };
  return priorities[effect?.kind] || 30;
}

export function effectIsImportant(effect) {
  return [
    "damageReduction",
    "absorb",
    "offensiveCooldown",
    "healingReduction",
    "schoolLock",
    "powerUpDamage",
    "powerUpHaste",
    "powerUpSpeed",
  ].includes(effect?.kind);
}

function glyphMarkup(key) {
  switch (key) {
    case "leaf":
      return '<path d="M26 7C16 9 9 16 8 27c8 2 17-1 22-9 2-3 3-7 3-11-3 0-5 0-7 0Z"/><path d="M10 28c6-7 11-11 19-16"/>';
    case "holy-leaf":
      return '<path d="M25 8c-9 2-15 8-16 18 7 2 15-1 20-8 2-3 3-6 3-10-3 0-5 0-7 0Z"/><path d="M11 27c5-6 10-10 17-14"/><path d="M31 22v11M25.5 27.5h11"/>';
    case "shield":
      return '<path d="M20 5 32 10v9c0 8-5 14-12 17C13 33 8 27 8 19v-9L20 5Z"/><path d="m14 20 4 4 8-9"/>';
    case "shield-leaf":
      return '<path d="M20 5 32 10v9c0 8-5 14-12 17C13 33 8 27 8 19v-9L20 5Z"/><path d="M25 13c-7 1-11 5-11 12 6 1 11-2 13-8 1-1 1-3 1-4h-3Z"/>';
    case "holy-shield":
      return '<path d="M20 5 32 10v9c0 8-5 14-12 17C13 33 8 27 8 19v-9L20 5Z"/><path d="M20 12v14M14 19h12"/>';
    case "shield-bolt":
      return '<path d="M20 5 32 10v9c0 8-5 14-12 17C13 33 8 27 8 19v-9L20 5Z"/><path d="m23 11-7 10h5l-4 8 8-11h-5l3-7Z"/>';
    case "fear":
      return '<path d="M10 16c2-7 7-10 10-10s8 3 10 10v9c0 4-3 8-7 9l-3-4-3 4c-4-1-7-5-7-9v-9Z"/><circle cx="15" cy="19" r="2.2"/><circle cx="25" cy="19" r="2.2"/><path d="M15 28c2-3 8-3 10 0"/>';
    case "spiral":
      return '<path d="M20 20c0-4 6-5 8-2 3 4 0 10-5 12-7 3-15-2-16-10C6 10 15 4 24 7c10 3 14 15 8 24"/>';
    case "hammer":
      return '<path d="m11 9 10-4 5 6-9 7-6-9Z"/><path d="m18 18 13 15"/><path d="m15 21 4-4"/>';
    case "stun":
      return '<path d="m20 4 3 9 9-4-5 8 9 3-9 3 5 8-9-4-3 9-3-9-9 4 5-8-9-3 9-3-5-8 9 4 3-9Z"/>';
    case "root":
      return '<path d="M20 5v17M20 12l-7-5M20 16l7-6M20 22l-8 11M20 22l8 11M20 26l-3 8M20 26l4 8"/>';
    case "frost":
      return '<path d="M20 5v30M7 12l26 16M33 12 7 28M20 5l-4 5M20 5l4 5M20 35l-4-5M20 35l4-5"/>';
    case "flame":
      return '<path d="M21 5c2 7-4 8-1 13 2 3 5 1 6-2 5 5 6 10 3 15-2 4-6 6-10 6-7 0-12-5-11-12 1-7 7-10 9-15 1 5 3 5 4-5Z"/>';
    case "shadow":
      return '<path d="M20 5c8 0 14 7 14 15s-6 15-14 15S6 28 6 20 12 5 20 5Z"/><path d="M13 17c4-5 10-6 16-2-5 0-8 3-8 7 0 4 3 7 7 8-7 2-14-3-15-13Z"/>';
    case "slashes":
      return '<path d="M10 31 19 8M19 33 28 10M28 31l4-11"/>';
    case "mortal":
      return '<path d="M20 34 8 22c-6-7 4-16 12-8 8-8 18 1 12 8L20 34Z"/><path d="m22 11-4 8 5 3-6 9"/>';
    case "burst":
      return '<path d="m20 4 4 10 10-5-5 10 9 4-10 3 4 10-9-5-5 9-2-11-11 3 7-8-9-6 11-1-1-11 7 8 6-9Z"/>';
    case "power":
      return '<path d="M20 5 31 20 20 35 9 20 20 5Z"/><path d="M20 10v20M13 20h14"/>';
    case "haste":
      return '<path d="m23 5-9 16h7l-5 14 11-18h-7l3-12Z"/><path d="M7 11h7M5 20h7M8 29h7"/>';
    case "speed":
      return '<path d="m8 12 10 8-10 8M20 12l10 8-10 8"/><path d="M6 34h26"/>';
    case "lock":
      return '<path d="M11 16h18v17H11V16Z"/><path d="M15 16v-4c0-7 10-7 10 0v4"/><path d="m9 8 22 25"/>';
    default:
      return '<circle cx="20" cy="20" r="12"/><path d="M20 12v9M20 27h.01"/>';
  }
}

function effectClassFamily(effect) {
  const spellId = String(effect?.spellId || "");
  if (spellId.startsWith("dk-")) return "death-knight";
  const family = spellId.split("-")[0];
  return [
    "priest",
    "warrior",
    "mage",
    "shaman",
    "warlock",
    "paladin",
    "druid",
    "rogue",
  ].includes(family) ? family : "";
}

function effectFamilyMarkMarkup(family) {
  switch (family) {
    case "priest":
      return '<g class="effect-family-mark"><circle cx="20" cy="20" r="17"/><path d="M20 4v8M20 28v8M4 20h8M28 20h8"/></g>';
    case "warrior":
      return '<g class="effect-family-mark"><path d="M5 11l9-6M5 20l12-8M6 30l13-9M35 11l-9-6M35 20l-12-8M34 30l-13-9"/></g>';
    case "mage":
      return '<g class="effect-family-mark"><circle cx="20" cy="20" r="17"/><circle cx="20" cy="20" r="12"/><path d="m20 4 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g>';
    case "shaman":
      return '<g class="effect-family-mark"><path d="m20 4 4 10 9-4-6 9 9 3-10 3 4 10-10-6-10 6 4-10-10-3 9-3-6-9 9 4Z"/></g>';
    case "death-knight":
      return '<g class="effect-family-mark"><path d="M20 3v34M4 10l32 20M36 10 4 30"/><circle cx="20" cy="20" r="14"/></g>';
    case "warlock":
      return '<g class="effect-family-mark"><circle cx="20" cy="20" r="17"/><path d="M11 8c13-4 23 5 21 17-2 9-11 13-19 9 8-1 13-6 13-13 0-7-5-11-15-13Z"/></g>';
    case "paladin":
      return '<g class="effect-family-mark"><circle cx="20" cy="20" r="16"/><path d="M20 4v32M4 20h32M8 8l24 24M32 8 8 32"/></g>';
    case "druid":
      return '<g class="effect-family-mark"><path d="M7 31C9 17 20 6 34 5c0 14-7 27-21 31Z"/><path d="M9 33c8-8 16-17 24-26"/></g>';
    case "rogue":
      return '<g class="effect-family-mark"><path d="M6 34 18 5M15 36 27 8M25 35 35 12"/></g>';
    default:
      return "";
  }
}

export function effectIconMarkup(effect, extraClass = "") {
  const key = effectIconKey(effect);
  const palette = effectPalette(effect);
  const family = effectClassFamily(effect);
  const familyClass = family ? " effect-family-" + family : "";
  return '<svg class="effect-svg ' + escapeHtml(extraClass) + familyClass
    + '" viewBox="0 0 40 40" aria-hidden="true"'
    + ' style="--effect-icon-color:' + palette.color + '">'
    + effectFamilyMarkMarkup(family)
    + '<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">'
    + glyphMarkup(key)
    + '</g></svg>';
}

export function drawEffectGlyph(ctx, effect, x, y, size, color = null) {
  const key = effectIconKey(effect);
  const c = color || effectPalette(effect).color;
  const s = size / 40;

  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(s, s);
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  ctx.lineWidth = 2.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Canvas mirrors the same pictograms used by the DOM SVG icons.
  if (["leaf", "holy-leaf", "shield-leaf"].includes(key)) {
    ctx.beginPath();
    ctx.moveTo(10, 30); ctx.quadraticCurveTo(13, 10, 31, 8);
    ctx.quadraticCurveTo(32, 25, 16, 30); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(11, 29); ctx.lineTo(28, 12); ctx.stroke();
    if (key === "holy-leaf") {
      ctx.beginPath(); ctx.moveTo(30, 23); ctx.lineTo(30, 34); ctx.moveTo(24.5, 28.5); ctx.lineTo(35.5, 28.5); ctx.stroke();
    }
  } else if (["shield", "holy-shield", "shield-bolt"].includes(key)) {
    ctx.beginPath(); ctx.moveTo(20,5); ctx.lineTo(32,10); ctx.lineTo(32,19);
    ctx.quadraticCurveTo(32,31,20,36); ctx.quadraticCurveTo(8,31,8,19); ctx.lineTo(8,10); ctx.closePath(); ctx.stroke();
    if (key === "holy-shield") {
      ctx.beginPath(); ctx.moveTo(20,12); ctx.lineTo(20,27); ctx.moveTo(14,19.5); ctx.lineTo(26,19.5); ctx.stroke();
    } else if (key === "shield-bolt") {
      ctx.beginPath(); ctx.moveTo(23,11); ctx.lineTo(16,21); ctx.lineTo(21,21); ctx.lineTo(17,30); ctx.lineTo(25,18); ctx.lineTo(20,18); ctx.closePath(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(14,20); ctx.lineTo(18,24); ctx.lineTo(26,15); ctx.stroke();
    }
  } else if (key === "fear") {
    ctx.beginPath(); ctx.arc(15,19,2.2,0,Math.PI*2); ctx.arc(25,19,2.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20,21,12,0.15*Math.PI,0.85*Math.PI,true); ctx.stroke();
    ctx.beginPath(); ctx.arc(20,30,6,Math.PI,Math.PI*2); ctx.stroke();
  } else if (key === "spiral") {
    ctx.beginPath();
    for(let i=0;i<=34;i++){
      const t=i/34, a=t*Math.PI*4.7, r=1+t*14;
      const px=20+Math.cos(a)*r, py=20+Math.sin(a)*r;
      if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.stroke();
  } else if (key === "hammer") {
    ctx.beginPath(); ctx.moveTo(10,10); ctx.lineTo(21,5); ctx.lineTo(27,11); ctx.lineTo(17,18); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(18,18); ctx.lineTo(31,33); ctx.stroke();
  } else if (key === "power") {
    ctx.beginPath();ctx.moveTo(20,5);ctx.lineTo(31,20);ctx.lineTo(20,35);ctx.lineTo(9,20);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(20,10);ctx.lineTo(20,30);ctx.moveTo(13,20);ctx.lineTo(27,20);ctx.stroke();
  } else if (key === "haste") {
    ctx.beginPath();ctx.moveTo(23,5);ctx.lineTo(14,21);ctx.lineTo(21,21);ctx.lineTo(16,35);ctx.lineTo(27,17);ctx.lineTo(20,17);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(7,11);ctx.lineTo(14,11);ctx.moveTo(5,20);ctx.lineTo(12,20);ctx.moveTo(8,29);ctx.lineTo(15,29);ctx.stroke();
  } else if (key === "speed") {
    ctx.beginPath();ctx.moveTo(8,12);ctx.lineTo(18,20);ctx.lineTo(8,28);ctx.moveTo(20,12);ctx.lineTo(30,20);ctx.lineTo(20,28);ctx.moveTo(6,34);ctx.lineTo(32,34);ctx.stroke();
  } else if (key === "stun" || key === "burst") {
    const points=key==="stun"?8:10;
    ctx.beginPath();
    for(let i=0;i<points*2;i++){
      const a=-Math.PI/2+i/(points*2)*Math.PI*2;
      const r=i%2===0?15:6;
      const px=20+Math.cos(a)*r, py=20+Math.sin(a)*r;
      if(i===0)ctx.moveTo(px,py); else ctx.lineTo(px,py);
    }
    ctx.closePath(); ctx.stroke();
  } else if (key === "root") {
    ctx.beginPath(); ctx.moveTo(20,5); ctx.lineTo(20,23);
    ctx.moveTo(20,12);ctx.lineTo(13,7);ctx.moveTo(20,16);ctx.lineTo(27,10);
    ctx.moveTo(20,23);ctx.lineTo(12,34);ctx.moveTo(20,23);ctx.lineTo(28,34);
    ctx.moveTo(20,27);ctx.lineTo(17,35);ctx.moveTo(20,27);ctx.lineTo(24,35);ctx.stroke();
  } else if (key === "frost") {
    ctx.beginPath(); ctx.moveTo(20,5);ctx.lineTo(20,35);ctx.moveTo(7,12);ctx.lineTo(33,28);ctx.moveTo(33,12);ctx.lineTo(7,28);ctx.stroke();
  } else if (key === "flame") {
    ctx.beginPath(); ctx.moveTo(21,5); ctx.bezierCurveTo(25,13,17,15,20,20);
    ctx.bezierCurveTo(23,24,28,19,27,15); ctx.bezierCurveTo(34,22,31,35,20,36);
    ctx.bezierCurveTo(9,36,5,27,11,20); ctx.bezierCurveTo(15,15,17,12,17,9);
    ctx.bezierCurveTo(18,13,20,11,21,5); ctx.closePath(); ctx.stroke();
  } else if (key === "shadow") {
    ctx.beginPath();ctx.arc(20,20,14,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(25,18,10,Math.PI*.45,Math.PI*1.55);ctx.stroke();
  } else if (key === "slashes") {
    ctx.beginPath();ctx.moveTo(10,31);ctx.lineTo(19,8);ctx.moveTo(19,33);ctx.lineTo(28,10);ctx.moveTo(28,31);ctx.lineTo(33,18);ctx.stroke();
  } else if (key === "mortal") {
    ctx.beginPath();ctx.moveTo(20,34);ctx.lineTo(8,22);ctx.bezierCurveTo(2,15,10,7,20,15);ctx.bezierCurveTo(30,7,38,15,32,22);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(22,11);ctx.lineTo(18,19);ctx.lineTo(23,22);ctx.lineTo(17,31);ctx.stroke();
  } else if (key === "lock") {
    ctx.strokeRect(11,16,18,17);ctx.beginPath();ctx.moveTo(15,16);ctx.lineTo(15,12);ctx.quadraticCurveTo(20,4,25,12);ctx.lineTo(25,16);ctx.moveTo(9,8);ctx.lineTo(31,33);ctx.stroke();
  } else {
    ctx.beginPath();ctx.arc(20,20,12,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(20,12);ctx.lineTo(20,23);ctx.stroke();
  }

  ctx.restore();
}
