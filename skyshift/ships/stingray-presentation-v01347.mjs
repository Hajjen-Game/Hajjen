// SKYSHIFT 0.13.4.7 — standard wing-span parity with IDENTICAL Manta and Stingray visual handling.
// No Stingray-only visual bank limit, road-clearance lift, or physics changes.
// This is presentation only; preserve the original 120 Hz physics and camera.
export const STINGRAY_PRESENTATION_01347=Object.freeze({
 version:"stingray-standard-geometry-and-shared-handling-01347",
 shipId:"stingray",
 mantaBeamMeters:5.80,
 rawStingrayBeamMeters:8.08,
 // Use the observed camera-view ratio: equal world metres was still visually too wide.
 // Measured from the provided 1536px screenshots: Manta ~170px, Stingray ~210px.
 // Correct the CHASE-VIEW silhouette rather than equalizing world-space metres.
 screenshotMantaWidthPixels:170,
 screenshotStingrayWidthPixels:210,
 // The 170/210 workaround was compensating for engine FX resetting scale
 // to 1.0. With real baseline ownership fixed, use exact Manta span parity.
 screenSpaceCorrection:1,
 visualWingScale:5.80/8.08,
 // Reduce the apparent bulk and the nine-link tail length independently.
 visualVerticalScale:.68,
 visualLengthScale:.68,
 // Explicitly remove 0.13.4.2–0.13.4.6's avoidance pose alterations.
 // Stingray now uses the same hover height and unconstrained roll as Manta.
 visualRoadNormalLiftMeters:0,
 tailJoints:9,
 tailStyle:"nine-faceted-blades-with-exposed-joint-gaps",
 useDynamicWingClearance:false,
 modifyVisualRoll:false,
 modifyPhysicalRoll:false,
 modifyPhysicalHover:false,
 modifyGrip:false,
 modifySteering:false,
 modifyCamera:false,
 modifyRoad:false,
 otherShipsUnaffected:true,
 addedDrawCalls:0,
 addedCPUPerFrame:"none: identical shared rendering path"
});
export function visualSettingsForShip(shipId){
 const s=STINGRAY_PRESENTATION_01347;
 return shipId===s.shipId?
  {scaleX:s.visualWingScale,scaleY:s.visualVerticalScale,
   scaleZ:s.visualLengthScale,lift:s.visualRoadNormalLiftMeters}:
  {scaleX:1,scaleY:1,scaleZ:1,lift:0};
}
