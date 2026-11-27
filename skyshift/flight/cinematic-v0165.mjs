import {heightAt,bankAt,CORKSCREW} from "../tracks/trials/trial-v0165.mjs";
import { followAngle } from "./flight-motion-v044.mjs";
import {createCameraFraming} from "./cinematic-camera.mjs";
export {CINEMATIC_DEFAULTS,createCinematicState,headingDelta,turnPreview,stepCinematic,cinematicFov,engineLightFactor} from "./cinematic-camera.mjs";
export const {cameraBankAt,chasePose}=createCameraFraming({heightAt,bankAt,CORKSCREW});
