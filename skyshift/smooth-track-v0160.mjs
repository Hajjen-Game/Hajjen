// Compatibility entrypoint: preserve the original trial sampler and public API.
import {TRIAL,positionAt,widthAt,gapAt} from "./trial-v0160.mjs";
import {createSmoothDeckBuilder} from "./tracks/shared/smooth-deck.mjs";
export {MESH_SPEC} from "./tracks/shared/smooth-deck.mjs";
export const {sampleDeckRows,createSmoothDeckData,createSmoothDeckGeometry}=
 createSmoothDeckBuilder({TRIAL,positionAt,widthAt,gapAt});
