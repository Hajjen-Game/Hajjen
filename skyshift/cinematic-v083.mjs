import {heightAt,bankAt,CORKSCREW} from "./trial-v083.mjs";
import { followAngle } from "./flight-motion-v044.mjs";
import {createClassicCameraFraming} from "./flight/classic-camera.mjs";
export {CINEMATIC_DEFAULTS,createCinematicState,headingDelta,turnPreview,stepCinematic,cinematicFov,engineLightFactor} from "./flight/classic-camera.mjs";
export const {cameraBankAt,chasePose}=createClassicCameraFraming({heightAt,bankAt,CORKSCREW});
