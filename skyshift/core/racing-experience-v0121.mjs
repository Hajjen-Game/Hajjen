import {createPowerCarveAPI} from "../flight/power-carve.mjs";
// SKYSHIFT 0.12.1 — Power Carve & Racing Experience Refinement.
// Unlike 0.12.0, tangible motion starts DURING pilot-held GRIP + STEER, not
// only following a rare clean-window event. All outputs are presentation only.
export const RACING_0121=Object.freeze({
 version:"power-carve-racing-experience-0121",
 precisionWindows:Object.freeze([
  Object.freeze({id:"precision-apex",name:"PRECISION APEX",start:785,end:990,minGripSeconds:.18}),
  Object.freeze({id:"s-complex",name:"S-COMPLEX",start:1145,end:1638,minGripSeconds:.22}),
  Object.freeze({id:"back-sweeper",name:"BACK SWEEPER",start:1915,end:2159,minGripSeconds:.20}),
  Object.freeze({id:"final-corner",name:"FINAL CARVE",start:2520,end:2740,minGripSeconds:.20})
 ]),
 lapLength:3400,releaseSeconds:1.65,
 maxFovAdditionDegrees:3.25,
 maxCameraLeanRadians:.038,
 maxCameraShiftMeters:.62,
 maxCameraPullbackMeters:.45,
 maxHullCarveRadians:.099,
 extraDrawCalls:0,extraTriangles:0,extraTextures:0,
 extraRenderPasses:0,extraLights:0,autoSteer:false,
 physicalFlightUnchanged:true,originalTrackGeometryUnchanged:true,
 noNewPillars:true,noCameraShakes:true
});

export const {
 raceWindowAt,
 raceRhythmAt,
 createRacingExperience,
 resetRacingExperience,
 observeRacingStep,
 stepRacingExperience,
 racingExperienceAudit
}=createPowerCarveAPI(RACING_0121);
