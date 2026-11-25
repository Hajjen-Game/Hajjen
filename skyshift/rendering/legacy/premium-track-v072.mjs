// SKYSHIFT 0.7.2 — terrain-following Skyline Circuit spectral road in the SAME PBR road shader, zero extra meshes.
// Replaces 0.4.8's floating violet overlays and orange rectangle meshes.
// The same indexed physical road drives shader coordinates; NO new colliders,
// no new draw calls, no per-frame geometry, and no flashing textures.
import {TRIAL,widthAt} from "../../trial-v072.mjs";
import {ZONE_PALETTES,ZONE_WAVE,SPECTRAL_FRONT_GLSL} from "../../zone-wave-v060.mjs";
import {BOOST_PADS} from "../../flight/boost/boost-v060.mjs";
import {createSmoothDeckData,MESH_SPEC} from "../../smooth-track-v072.mjs";

import {createPremiumTrackAPI} from "./shared-premium-track.mjs";
export const {
 PREMIUM_TRACK,
 premiumTrackCoordinates,
 createPremiumDeckGeometry,
 GLSL_BOOST_PADS,
 SURFACE_FRAGMENT_GLSL,
 SURFACE_FRAGMENT_HELPERS,
 patchPremiumShaders,
 createPremiumTrackMaterial
}=createPremiumTrackAPI({TRIAL,widthAt,ZONE_PALETTES,ZONE_WAVE,SPECTRAL_FRONT_GLSL,BOOST_PADS,createSmoothDeckData,MESH_SPEC,version:"corkscrew-spectrum-072"});
