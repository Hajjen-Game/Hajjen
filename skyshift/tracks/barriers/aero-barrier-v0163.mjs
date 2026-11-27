import {isAurora} from "../shared/track-selection-v0160.mjs";
// SKYSHIFT 0.8.4 — terrain-following rails with a real missing launch-gap span
// Material layers and inlaid graphics share the 0.4.6 track geometry/collider.
// A faceted safety wall replaces the round-looking continuous neon tube.
import {
 TRIAL,GUARDRAIL,COURSE_SEGMENTS,positionAt,widthAt,curvatureAt,gapAt,GAPS,CORKSCREW
} from "../trials/trial-v0163.mjs";
import {ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL} from "../../core/zone-wave-v060.mjs";
import {createAeroBarrierAPI} from "./shared-aero-barrier.mjs";
export const {
 AERO_BARRIER,
 AERO_PROFILE,
 cornerRailEmphasisAt,
 railHeightAt,
 sampleAeroProfile,
 createAeroBarrierData,
 createAeroDetailData,
 RAIL_SPECTRAL_VERTEX,
 RAIL_SPECTRAL_FRAGMENT,
 patchRailShaders,
 installAeroBarriers
}=createAeroBarrierAPI({TRIAL,GUARDRAIL,COURSE_SEGMENTS,positionAt,widthAt,curvatureAt,gapAt,GAPS,CORKSCREW,ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL,isAurora});
