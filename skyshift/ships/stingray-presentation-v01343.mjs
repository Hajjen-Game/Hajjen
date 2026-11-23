// SKYSHIFT 0.13.4.3 — Stingray visual size parity with Manta Blade.
// This deliberately REPLACES the 0.13.4.1 sampled-wing clearance solver.
// No per-frame raycasts, sample rescans, hysteresis, roll clamps, or
// relative wing lift that could introduce a stepping/knocking sensation.
export const STINGRAY_PRESENTATION_01343=Object.freeze({
 version:"stingray-size-parity-01343",
 shipId:"stingray",
 // Manta Blade span is ±2.90 m; Stingray V4 is ±4.04 m.
 // Scale 0.72 => Stingray rendered span ±2.9088 m, within 0.31% of Manta.
 // This is independent of the camera and does not modify flight physics.
 mantaBeamMeters:5.80,
 rawStingrayBeamMeters:8.08,
 visualUniformScale:.72,
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
 return shipId===STINGRAY_PRESENTATION_01343.shipId?
  {scale:STINGRAY_PRESENTATION_01343.visualUniformScale,
   lift:STINGRAY_PRESENTATION_01343.visualRoadNormalLiftMeters}:
  {scale:1,lift:0};
}
