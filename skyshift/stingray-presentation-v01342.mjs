// SKYSHIFT 0.13.4.2 — stable visual-only Stingray presentation.
// This deliberately REPLACES the 0.13.4.1 sampled-wing clearance solver.
// No per-frame raycasts, sample rescans, hysteresis, roll clamps, or
// relative wing lift that could introduce a stepping/knocking sensation.
export const STINGRAY_PRESENTATION_01342=Object.freeze({
 version:"stingray-static-scale-hover-01342",
 shipId:"stingray",
 visualUniformScale:.90,
 visualRoadNormalLiftMeters:.18,
 tailStyle:"nine-faceted-blades-with-exposed-joint-gaps",
 addedCPUPerFrame:"one constant branch and three scalar additions",
 tailJoints:9,
 useDynamicWingClearance:false,
 modifyPhysicalHover:false,
 modifyRoll:false,
 modifyGrip:false,
 modifySteering:false,
 modifyCamera:false,
 modifyRoad:false,
 otherShipsUnaffected:true
});
export function visualSettingsForShip(shipId){
 return shipId===STINGRAY_PRESENTATION_01342.shipId?
  {scale:STINGRAY_PRESENTATION_01342.visualUniformScale,
   lift:STINGRAY_PRESENTATION_01342.visualRoadNormalLiftMeters}:
  {scale:1,lift:0};
}
