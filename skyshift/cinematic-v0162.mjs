import {heightAt,bankAt,CORKSCREW} from "./trial-v0162.mjs";
import { followAngle } from "./flight-motion-v044.mjs";
import {createCameraFraming} from "./flight/cinematic-camera.mjs";
export {CINEMATIC_DEFAULTS,createCinematicState,headingDelta,turnPreview,stepCinematic,cinematicFov,engineLightFactor} from "./flight/cinematic-camera.mjs";
export const {cameraBankAt,chasePose}=createCameraFraming({heightAt,bankAt,CORKSCREW});
