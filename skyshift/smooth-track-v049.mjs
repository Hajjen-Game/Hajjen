// SKYSHIFT 0.4.9 – extended circuit continuous indexed ribbon surface.
// Deliberately NO detached 0.8m road quads with independent face normals.
// Geometry and bank still come from the authoritative trial model.
import {TRIAL,positionAt,widthAt} from "./trial-v049.mjs";

export const MESH_SPEC=Object.freeze({
  sampleStep:.38,
  lateralColumns:7,
  sharedLongitudinalVertices:true,
  flatShadedSegments:0,
  topSurfaceCount:1
});

import {createSmoothDeckBuilder} from "./tracks/shared/smooth-deck.mjs";
export const {sampleDeckRows,createSmoothDeckData,createSmoothDeckGeometry}=createSmoothDeckBuilder({TRIAL,positionAt,widthAt,gapAt:()=>false,meshSpec:MESH_SPEC});
