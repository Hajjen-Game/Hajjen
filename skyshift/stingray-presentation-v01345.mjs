// SKYSHIFT 0.13.4.5 — screen-calibrated wing span and smooth, fixed-envelope GRIP roll.
// No per-frame wing probes, road casts, reactive height changes or flight-state writes.
// This is presentation only; preserve the original 120 Hz physics and camera.
export const STINGRAY_PRESENTATION_01345=Object.freeze({
 version:"stingray-camera-space-span-01345",
 shipId:"stingray",
 mantaBeamMeters:5.80,
 rawStingrayBeamMeters:8.08,
 // Use the observed camera-view ratio: equal world metres was still visually too wide.
 // Measured from the provided 1536px screenshots: Manta ~170px, Stingray ~210px.
 // Correct the CHASE-VIEW silhouette rather than equalizing world-space metres.
 screenshotMantaWidthPixels:170,
 screenshotStingrayWidthPixels:210,
 screenSpaceCorrection:170/210,
 visualWingScale:(5.80/8.08)*(170/210),
 // Reduce the apparent bulk and the nine-link tail length independently.
 visualVerticalScale:.68,
 visualLengthScale:.68,
 // Fixed, road-normal offset; only +8 cm over 0.13.4.3. Never reactive.
 visualRoadNormalLiftMeters:.26,
 // Smooth saturation of TOTAL cosmetic bank, relative to the road.
 // At most 14.32 degrees of relative lean for Stingray, with no hard edge.
 maxRelativeVisualRollRadians:.25,
 tailJoints:9,
 tailStyle:"nine-faceted-blades-with-exposed-joint-gaps",
 useDynamicWingClearance:false,
 modifyVisualRoll:true,
 modifyPhysicalRoll:false,
 modifyPhysicalHover:false,
 modifyGrip:false,
 modifySteering:false,
 modifyCamera:false,
 modifyRoad:false,
 otherShipsUnaffected:true,
 addedDrawCalls:0,
 addedCPUPerFrame:"three scalar additions and one smooth tanh; no allocations"
});
export function visualSettingsForShip(shipId){
 const s=STINGRAY_PRESENTATION_01345;
 return shipId===s.shipId?
  {scaleX:s.visualWingScale,scaleY:s.visualVerticalScale,
   scaleZ:s.visualLengthScale,lift:s.visualRoadNormalLiftMeters}:
  {scaleX:1,scaleY:1,scaleZ:1,lift:0};
}
// The incoming render angle ALREADY contains -roadBank and -trickRoll.
// Isolate cosmetic lean, saturate it continuously, then restore the real road
// bank and full air trick. This keeps the 360-degree corkscrew and barrel roll.
// Pure deterministic transform: no state, threshold snaps or springs.
export function stableStingrayVisualRoll(renderRoll,roadBank,trickRoll=0){
 if(!Number.isFinite(renderRoll)||!Number.isFinite(roadBank)||
    !Number.isFinite(trickRoll))return renderRoll;
 const limit=STINGRAY_PRESENTATION_01345.maxRelativeVisualRollRadians;
 const relative=renderRoll+roadBank+trickRoll;
 return -roadBank-trickRoll+limit*Math.tanh(relative/limit);
}
