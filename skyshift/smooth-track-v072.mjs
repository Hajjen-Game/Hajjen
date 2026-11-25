// Compatibility entrypoint: preserve original track geometry and public API.
import {TRIAL,positionAt,widthAt,gapAt} from "./trial-v072.mjs";
import {createSmoothDeckBuilder} from "./tracks/shared/smooth-deck.mjs";
export {MESH_SPEC} from "./tracks/shared/smooth-deck.mjs";
export const {sampleDeckRows,createSmoothDeckData,createSmoothDeckGeometry}=
 createSmoothDeckBuilder({TRIAL,positionAt,widthAt,gapAt});
