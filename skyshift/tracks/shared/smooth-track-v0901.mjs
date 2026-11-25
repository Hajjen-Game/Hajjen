// Compatibility entrypoint: preserve the original trial sampler and public API.
import {TRIAL,positionAt,widthAt,gapAt} from "../../trial-v0901.mjs";
import {createSmoothDeckBuilder} from "./smooth-deck.mjs";
export {MESH_SPEC} from "./smooth-deck.mjs";
export const {sampleDeckRows,createSmoothDeckData,createSmoothDeckGeometry}=
 createSmoothDeckBuilder({TRIAL,positionAt,widthAt,gapAt});
