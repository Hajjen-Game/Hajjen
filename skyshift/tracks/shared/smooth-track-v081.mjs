// Compatibility entrypoint: preserve original track geometry and public API.
import {TRIAL,positionAt,widthAt,gapAt} from "../trials/trial-v081.mjs";
import {createSmoothDeckBuilder} from "./smooth-deck.mjs";
export {MESH_SPEC} from "./smooth-deck.mjs";
export const {sampleDeckRows,createSmoothDeckData,createSmoothDeckGeometry}=
 createSmoothDeckBuilder({TRIAL,positionAt,widthAt,gapAt});
