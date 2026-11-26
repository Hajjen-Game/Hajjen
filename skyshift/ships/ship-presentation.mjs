// Vehicle presentation owns hull, engine and contact-shadow transforms.
 // It receives authoritative flight and interpolated pose without writing to either.
export function createShipPresentation({
 Vector3,onRoad,surfaceNormalAt,positionAt,bankAt,pitchAt,TRIAL,BOOST_CONFIG,
 NEON_TUNING,SPECTRAL_WHITE,waveResonanceStrength,spectralChargeStrength,
 engineLightFactor,clamp
}){
 const SHADOW_NORMAL=new Vector3(),SHADOW_PLANE_NORMAL=new Vector3(0,0,1);
 function frame(time,view,flight,motion,cinematic,motionRig,signatureFlight,
  velocityState,velocityPresence,racingExperience,zoneWave,ship,sideThrusters,
  engineLights,engineCore,enginePlumes,shadowMesh){
 // True world-space heading remains pilot-owned. Body pose is visual-only.
 const clearance=motionRig.clearance;
 const solid=onRoad(view.s,view.lateral);
 const surfaceNormal=surfaceNormalAt(view.s);
 const rideOffset=view.grounded?TRIAL.hoverHeight:0;
 // Identical road-normal hover pose for both ships. No Stingray-only
 // +26cm clearance lift, dynamic wing check or special compensation.
 ship.position.set(
  view.worldX+surfaceNormal.x*(rideOffset+motion.hover),
  view.y+surfaceNormal.y*motion.hover,
  view.worldZ+surfaceNormal.z*(rideOffset+motion.hover));
  // Added animation is relative to the road normal: no changed physics.
  ship.position.x+=surfaceNormal.x*signatureFlight.lift;
  ship.position.y+=surfaceNormal.y*signatureFlight.lift;
  ship.position.z+=surfaceNormal.z*signatureFlight.lift;
 // Tiny reaction of the rendered hull only; physical pilot position,
 // bank, collision and camera target remain completely unchanged.
 ship.position.x-=Math.sin(view.heading)*velocityState.recoilMeters;
 ship.position.z+=Math.cos(view.heading)*velocityState.recoilMeters;
 // Cosmetic nose alignment <2 degrees; authoritative world yaw unchanged.
 ship.rotation.y=-view.heading+cinematic.noseYaw;
 // Extra craft attitude is visual-only; heading and yaw rate are already
 // resolved by stepFlight, independent of the camera.
 // The hull matches the actual physical banked road normal.
  // The flight-motion bank convention is NEGATIVE steering:
 // left input (<0) banks toward +Z (port wing down), right toward -Z.
 // The trick physics stores direction in INPUT sign, so the rendered
 // barrel roll must negate trickVisualAngle to match both normal banking
 // and the opposite-wing GRIP jet. Without this, LEFT rolled RIGHT.
 // Visual-only: the 120Hz air-time, landing judgement and velocity remain.
 const roadBank=bankAt(view.s);
 const naturalRoll=motion.roll-roadBank-
  (view.trickVisualAngle??0)-
   Math.sign(flight.gripDirection)*flight.gripIntensity*.058+
   signatureFlight.roll+velocityPresence.hullRoll+
   racingExperience.hullCarve*
    (view.grounded&&!motionRig.wall&&!motionRig.corkscrew?1:0);
 // NO ship-specific banking/GRIP restrictions. Both hulls receive
 // exactly the same physical input-derived, cinematic presentation roll.
 ship.rotation.z=naturalRoll;
 // Same side-engine geometry that powers GRIP turns now powers air-rolls.
 // The bright white-core jet visibly fires on the correct wing in flight.
 const airThruster=flight.trickActive&&!view.grounded;
 sideThrusters?.frame(airThruster?1:flight.gripIntensity,
  airThruster?flight.trickDirection:flight.gripDirection,time);
 // Authoritative terrain slope alters hull attitude; no fake banking
 // or automatic horizontal steering is introduced.
 ship.rotation.x=motion.pitch+velocityState.pitchRadians+pitchAt(view.s)+
   signatureFlight.pitch+velocityPresence.hullPitch;
 const crossingPulse=waveResonanceStrength(zoneWave,flight.elapsed);
 const charge=spectralChargeStrength(flight.elapsed);
 // Reuse two wing engine lights for a subtle neutral-white crest crossing.
 for(const light of engineLights)
  light.color.lerp(SPECTRAL_WHITE,crossingPulse*.30);
 engineLights.forEach((light,i)=>{light.intensity=
   NEON_TUNING.enginePointIntensity*.42*engineLightFactor(cinematic)*
   (1+velocityState.engineFlow*.60+velocityState.ignition*.20)*
   (1+.22*crossingPulse+.07*charge+
   .22*Math.min(1,Math.abs(view.trickVisualAngle??0)/(2*Math.PI))+
   .16*Math.min(1,(flight.landingBoostMultiplier-1)/.22))*
    (1+.24*signatureFlight.engineEnergy+.13*signatureFlight.boostSurge)*
    (1+velocityPresence.engineLoad*.36+racingExperience.engineLift*.37)*
    (1+(i===0?-1:1)*signatureFlight.engineSplit*.16);
  });
 if(engineCore)engineCore.scale.z=1+cinematic.engineEnergy*.16+
  velocityState.engineFlow*.34+velocityState.ignition*.10+
  signatureFlight.engineEnergy*.16+velocityPresence.engineLoad*.23+
  racingExperience.engineLift*.17;
 for(let i=0;i<enginePlumes.length;i++){
   const sign=i===0?-1:1;
   const pulse=.028*Math.sin(time*21+i*1.4);
   const boost=clamp((flight.boostMultiplier-1)/(BOOST_CONFIG.multiplier-1),0,1);
   const shape=1+.065*cinematic.engineEnergy+boost*.10+
    velocityState.engineFlow*.16+velocityState.ignition*.09+pulse+
    crossingPulse*.10+charge*.035+
    signatureFlight.engineEnergy*.075+signatureFlight.boostSurge*.10+
    velocityPresence.engineLoad*.17+racingExperience.engineLift*.23;
   const bankVariation=sign*clamp(view.steering,-1,1)*.035+
    sign*signatureFlight.engineSplit*.050;
   // Exhaust cylinder axis is local Y. Animate the radius (X/Z).
   enginePlumes[i].scale.set(shape+bankVariation,
    1+boost*.10+velocityState.engineFlow*.12+
    signatureFlight.engineEnergy*.12,shape);
 }
 if(shadowMesh){
   shadowMesh.visible=solid&&clearance<4.2;
   if(shadowMesh.visible){
     const contact=positionAt(view.s,view.lateral,.032);
     shadowMesh.position.set(contact.x,contact.y,contact.z);
     const normal=surfaceNormalAt(view.s);
     SHADOW_NORMAL.set(normal.x,normal.y,normal.z);
     shadowMesh.quaternion.setFromUnitVectors(SHADOW_PLANE_NORMAL,SHADOW_NORMAL);
     shadowMesh.material.opacity=clamp(.62-Math.max(0,clearance)*.16,0,.62);
   }
 }
 }
 return Object.freeze({frame});
}
