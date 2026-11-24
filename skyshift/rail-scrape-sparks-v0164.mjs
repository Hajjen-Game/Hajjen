import {
 positionAt,poseAt,widthAt,surfaceNormalAt,GUARDRAIL
} from "./trial-v0164.mjs";
import {createRailContactSampler} from "./rendering/rail-scrape-sparks.mjs";
export {RAIL_SPARKS,sparkDemand,createSparkState,resetSparkState,advanceSparkState,createRailScrapeSparks} from "./rendering/rail-scrape-sparks.mjs";
export const railContactPoint=createRailContactSampler({positionAt,poseAt,widthAt,surfaceNormalAt});
