import {createPremiumTrackMaterial} from "../rendering/legacy/premium-track-v0150.mjs";
import {createSmartPremiumTrackMaterialWithFactory} from "./visual-fidelity.mjs";
export {FIDELITY_0114,selectFidelityProfile,createFidelityDirector,
 resetFidelityDirector,advanceFidelityDirector,fidelityAudit,patchRefinedRoadShaders}
 from "./visual-fidelity.mjs";
export function createSmartPremiumTrackMaterial(THREE,profile){
 return createSmartPremiumTrackMaterialWithFactory(createPremiumTrackMaterial,THREE,profile);
}
