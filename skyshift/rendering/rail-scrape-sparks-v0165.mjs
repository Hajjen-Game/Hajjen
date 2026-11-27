import {
 positionAt,poseAt,widthAt,surfaceNormalAt,GUARDRAIL
} from "../tracks/trials/trial-v0165.mjs";
import {createRailContactSampler} from "./rail-scrape-sparks.mjs";
export {RAIL_SPARKS,sparkDemand,createSparkState,resetSparkState,advanceSparkState,createRailScrapeSparks} from "./rail-scrape-sparks.mjs";
export const railContactPoint=createRailContactSampler({positionAt,poseAt,widthAt,surfaceNormalAt});
