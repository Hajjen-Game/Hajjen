// Signature melee weapon overlays are intentionally staged class-by-class.
// Mortal Strike is bespoke in the renderer. Warrior's remaining strikes are
// now bespoke as well. Rogue / DK / Shaman temporarily fall back to their
// previous VFX 3.0 presentation until their individual passes are rebuilt.
export function meleeSignatureSpecFor() {
  return null;
}

export function hasMeleeSignatureVfx() {
  return false;
}

export function drawCanvasMeleeSignatureVfx() {
  return false;
}
