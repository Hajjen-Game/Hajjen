// Chase camera controller owns its scratch vectors and peak FOV. Inputs are
// read-only flight signals; the only mutable outputs are presentation state.
export function createChaseCameraController({
 Vector3,chasePose,cameraBankAt,cinematicFov,kineticFovAt,stepBoostSpring,
 boostFovTarget,boostFovResponse,cinematicTuning,CAMERA_GAIN,TRIAL,
 BOOST_CONFIG,CLASSIC_BOOST_FOV,BOOST_SPRING,clamp,lerp
}){
 const CAMERA_INFO={},CAMERA_VIEW={worldX:0,worldZ:0,y:0,s:0,
  steering:0,clearance:0,kineticSideMeters:0,kineticDistanceMeters:0,
  kineticEyeLiftMeters:0,kineticLandingMeters:0,kineticLookLiftMeters:0};
 const CAMERA_BASE_POSITION=new Vector3();
 const CAMERA_TARGET_POSITION=new Vector3();
 const CAMERA_TARGET_LOOK=new Vector3();
 const cameraLook=new Vector3();
 let maxKineticFov=65.4;
 function resetPeak(value){maxKineticFov=value;}
 function spawn(camera,flight,motion,cinematic){
  const home=chasePose(flight,motion,cinematic,cinematicTuning,CAMERA_INFO);
  camera.position.set(home.x,home.y,home.z);
  CAMERA_BASE_POSITION.copy(camera.position);
  camera.fov=cinematicFov(TRIAL.startSpeed,TRIAL.startSpeed,cinematicTuning);
  camera.updateProjectionMatrix();
  cameraLook.set(home.lookX,home.lookY,home.lookZ);
  camera.lookAt(cameraLook);
 }
 // Explicit QA snap; no physics tick or change to normal damping.
 function snap(flight,motion,cinematic,copyLookTarget=false){
  const frame=chasePose(flight,motion,cinematic,cinematicTuning,CAMERA_INFO);
  CAMERA_BASE_POSITION.set(frame.x,frame.y,frame.z);
  CAMERA_TARGET_POSITION.copy(CAMERA_BASE_POSITION);
  cameraLook.set(frame.lookX,frame.lookY,frame.lookZ);
  if(copyLookTarget)CAMERA_TARGET_LOOK.copy(cameraLook);
 }
 function apply(camera,dt,view,flight,motion,cinematic,motionRig,kineticCamera,
  racingExperience,velocityPresence,boostSpring,playing){
 const clearance=motionRig.clearance;
 // Low/close chase camera with bounded future curvature preview.
 // Camera POSITION follows pilot heading; only LOOK target anticipates a corner.
 CAMERA_VIEW.worldX=view.worldX;CAMERA_VIEW.worldZ=view.worldZ;
 CAMERA_VIEW.y=view.y;CAMERA_VIEW.s=view.s;CAMERA_VIEW.steering=view.steering;
 CAMERA_VIEW.clearance=clearance;
 // Kinetic springs have already advanced on this exact flight pose in
 // advanceUnifiedFlightRig: this method only applies the shared outputs.
 const speedRigSafety=motionRig.corkscrew?0:motionRig.wall?.20:1;
 CAMERA_VIEW.kineticSideMeters=kineticCamera.sideMeters*CAMERA_GAIN+
  racingExperience.cameraShiftMeters*speedRigSafety;
 CAMERA_VIEW.kineticDistanceMeters=kineticCamera.distanceMeters*CAMERA_GAIN+
  (velocityPresence.cameraDistance+
   racingExperience.cameraPullbackMeters)*speedRigSafety;
 CAMERA_VIEW.kineticEyeLiftMeters=kineticCamera.eyeLiftMeters*CAMERA_GAIN+
  velocityPresence.cameraAirLift*speedRigSafety;
 CAMERA_VIEW.kineticLandingMeters=kineticCamera.landingMeters*CAMERA_GAIN;
 CAMERA_VIEW.kineticLookLiftMeters=kineticCamera.lookLiftMeters*CAMERA_GAIN+
  velocityPresence.cameraLookLift*speedRigSafety;
 const framing=chasePose(CAMERA_VIEW,motion,cinematic,cinematicTuning,CAMERA_INFO);
 CAMERA_TARGET_POSITION.set(framing.x,framing.y,framing.z);
 CAMERA_TARGET_LOOK.set(framing.lookX,framing.lookY,framing.lookZ);
 // The underlying chase camera stays responsive in curves. The boost
 // contributes only a separate critically-damped forward-axis offset.
 // This avoids the old slow/fast response switch and the 10m position snap.
 const follow=1-Math.exp(-dt*cinematicTuning.cameraFollowResponse);
 CAMERA_BASE_POSITION.lerp(CAMERA_TARGET_POSITION,follow);
 cameraLook.lerp(CAMERA_TARGET_LOOK,follow);
 const physicalExtraSpeed=Math.max(0,flight.currentSpeed-flight.zoneCruiseSpeed);
 const lag=stepBoostSpring(boostSpring,
  playing?dt:0,physicalExtraSpeed);
 camera.position.copy(CAMERA_BASE_POSITION);
 camera.position.x-=Math.sin(motion.cameraHeading)*lag;
 camera.position.z+=Math.cos(motion.cameraHeading)*lag;
 camera.lookAt(cameraLook);
 // Partial camera roll holds a legible horizon while the track goes vertical.
  // Roll is 100% through the full revolution: 46% would hard-snap the
 // horizon at -360° -> 0°. The 70° wall retains its gentler partial roll.
 // Full track roll is retained for the inverted 360° corkscrew; kinetic
 // lean is mechanically suppressed inside banks rather than subtracting
 // from the real corkscrew or snapping the horizon on the 360° seam.
 const protectedRoll=motionRig.corkscrew||motionRig.wall?0:1;
 camera.rotateZ(motion.cameraRoll-cameraBankAt(view.s)+
  kineticCamera.rollRadians*CAMERA_GAIN+
  racingExperience.cameraLean*protectedRoll);
 const oldFov=cinematicFov(flight.currentSpeed,TRIAL.startSpeed,cinematicTuning);
 const kineticFov=kineticFovAt(flight.currentSpeed);
 const baseFov=clamp(oldFov+(kineticFov-oldFov)*CAMERA_GAIN,65.4,78);
 const fovConfig=CAMERA_GAIN===0?CLASSIC_BOOST_FOV:BOOST_SPRING;
 const targetFov=boostFovTarget(baseFov,Math.max(flight.boostMultiplier,
  flight.landingBoostMultiplier),BOOST_CONFIG.multiplier,fovConfig);
 const fovResponse=boostFovResponse(camera.fov,targetFov,fovConfig);
 const presenceFov=CAMERA_GAIN===0?0:velocityPresence.fovBonus*speedRigSafety;
 camera.fov=lerp(camera.fov,Math.min(80.5,targetFov+presenceFov+
  racingExperience.fovAddition*protectedRoll),
  1-Math.exp(-dt*fovResponse));
 boostSpring.peakFovBonusDegrees=Math.max(boostSpring.peakFovBonusDegrees,
  camera.fov-baseFov);
 maxKineticFov=Math.max(maxKineticFov,camera.fov);
 cinematic.maxCameraLateralMeters=Math.max(cinematic.maxCameraLateralMeters,Math.abs(framing.sideOffsetMeters));
 camera.updateProjectionMatrix();
 }
 return Object.freeze({spawn,snap,apply,resetPeak,get maxKineticFov(){return maxKineticFov}});
}
