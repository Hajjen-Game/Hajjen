// SKYSHIFT 0.7.1 — terrain-following rails with a real missing launch-gap span
// Material layers and inlaid graphics share the 0.4.6 track geometry/collider.
// A faceted safety wall replaces the round-looking continuous neon tube.
import {
 TRIAL,GUARDRAIL,COURSE_SEGMENTS,positionAt,widthAt,curvatureAt,gapAt,GAPS
} from "../../trial-v071.mjs";
import {ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL} from "../../zone-wave-v060.mjs";
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
}=createAeroBarrierAPI({TRIAL,GUARDRAIL,COURSE_SEGMENTS,positionAt,widthAt,curvatureAt,gapAt,GAPS,ZONE_WAVE,ZONE_PALETTES,SPECTRAL_FRONT_GLSL,classicChevrons:true});
