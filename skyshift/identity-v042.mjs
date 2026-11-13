// SKYSHIFT 0.4.2 — Handling Lab surface language.
// Deliberately no tile pattern, obstacle chips, extra landing cues or fake voids.
// The track mesh itself (sidewall, narrow precision neon, clean centreline)
// establishes the visual language in this steering-calibration version.
export const SURFACE_DESIGN=Object.freeze({
 decorativePanels:0,paintedAccents:0,roadOnly:true
});
export function createSurfacePlan(){return [];}
export function validateSurfacePlan(plan=createSurfacePlan()){
 return plan.length===0?[]:["Handling Lab must not paint decorative track tiles"];
}
export function installCleanTrack(THREE,world){
 return {plan:[],drawBatches:0,removedPanelDraws:true};
}
