// Renderer-independent flight engine. The selected course supplies geometry,
// configured flight rules, jump descriptor and boost policy. No active-track
// selection or browser globals are imported here.
import {initGripState,stepGripState} from "./precision-grip-v084.mjs";
import {normalYawFactorAt,yawAuthorityAt} from "./steering-authority-v01348.mjs";
import {AIR_TRICKS,initAirTrickState,beginAirTrick,advanceAirTrick,
 finalizeAirTrick,stepLandingBoost,settleTrickVisual} from "./air-tricks-v083.mjs";
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const lerp=(a,b,t)=>a+(b-a)*t;

export function createFlightPhysics(track,boost){
 const {rules:TRIAL,circuit:CIRCUIT,jump:SKYLINE_LEAP,positionAt,headingAt,surfaceHeightAt,lapPosition,nextGap,speedAt,corkscrewAt,bankAt,poseAt,projectWorldToTrack,constrainToGuardrail,gripApexAt,bankDegreesAt,onRoad,surfaceNormalAt,gapAt,guardrailLateralLimit,magneticWallAt,corkscrewBankAt,shapeSteer}=track;
 const {initBoostState,stepBoostState}=boost;
function newFlightState(){
 const p=positionAt(5,0,0);
 return initAirTrickState(initBoostState(initGripState({
  s:5,lateral:0,sideVelocity:0,worldX:p.x,worldZ:p.z,
  heading:headingAt(5),steering:0,yawRate:0,lastInput:0,
  peakYawRateDeg:0,peakBankDeg:0,
  gripApexActive:false,gripApexEntries:0,gripApexExits:0,
  gripApexCleanExits:0,gripApexRailContactsAtEntry:0,
  gripApexGripSeconds:0,gripApexWarnSeconds:0,
  minNormalYawFactor:1,maxActualYawFactor:0,
  peakGripRelativeGain:0,normalSteeringSeconds:0,
  railContactStarts:0,railContacting:false,railScrubIntensity:0,
  railScrubPeak:0,
  railScrubSeconds:0,railScrubLossMeters:0,
  totalHeadingError:0,maxHeadingErrorDeg:0,headingSamples:0,
  maxLateral:0,offRoadSeconds:0,steerSeconds:0,
  railContacts:0,railSeconds:0,railMaxPenetration:0,lastRailSide:0,
  railHeadingCorrections:0,railPeakBlockedAngle:0,reverseProjectionTicks:0,
  railMaxInstantCorrection:0,railMaxSingleStepYaw:0,
  railGripBlockedTicks:0,railContactDiagnostics:[],
  gripPreArmTicks:0,gripYawSuppressedTicks:0,
  steerReversals:0,lastSteerSign:0,neutralFrames:0,
  y:surfaceHeightAt(5)+TRIAL.hoverHeight,vy:0,grounded:true,
  airborneSeconds:0,peakAirHeightMeters:0,
  autoLaunches:0,cleanLeapLandings:0,lastJumpLap:0,
  coyote:0,jumpBuffer:0,jumpHold:0,jumps:0,landings:0,
  falls:0,failedJumps:0,clearedGaps:[],shield:100,
  checkpoint:0,checkpointsPassed:0,elapsed:0,finished:false,failed:false,
  lap:1,lapsCompleted:0,lapTimes:[],lastLapAt:0,
  lastCrashS:0,landImpact:0,rightRouteArmed:false,
  routeRewarded:false,routeChoice:null,nearMisses:0,
  prevGrounded:true,
  magneticActive:false,magneticEntries:0,magneticExits:0,
  magneticSeconds:0,magneticDistanceMeters:0,magneticPeakDegrees:0,
  magneticCleanExits:0,magneticEntryRailContacts:0,
  corkscrewActive:false,corkscrewEntries:0,corkscrewExits:0,
  corkscrewCleanExits:0,corkscrewSeconds:0,corkscrewDistanceMeters:0,
  corkscrewCeilingSeconds:0,corkscrewPeakDegrees:0,
  corkscrewEntryRailContacts:0,
  zoneSpeedStage:0,zoneCruiseSpeed:TRIAL.startSpeed,zoneSpeedEvents:[]
 }),TRIAL.startSpeed));
}
function stepFlight(st,dt,control={}){
 if(st.finished||st.failed)return {kind:"idle"};
 const steer=clamp(control.steer??0,-1,1);
 const headingBeforeContact=st.heading;
 st.elapsed+=dt;
 if(Math.abs(steer)>.12){
  st.steerSeconds+=dt;
  const sign=Math.sign(steer);
  if(st.lastSteerSign&&sign!==st.lastSteerSign)st.steerReversals++;
  st.lastSteerSign=sign;
 }else st.neutralFrames++;
 // Critically damped yaw RATE, not position. No lingering sideways velocity
 // and no hidden road-following. Neutral input stabilizes yaw in ~40-60 ms.
 const input=shapeSteer(steer);
 // Add controlled, momentary authority only while steering and holding GRIP.
 // The original yaw damping, trim and road-collision logic stay unchanged.
 const grip=stepGripState(st,dt,steer,control.grip===true,st.grounded);
 // While the player deliberately holds GRIP in flight, steer controls
 // a barrel roll instead of throwing the ship off the landing island.
 // Without GRIP the original pilot-owned yaw remains unchanged.
 const lapS=lapPosition(st.s);
 // The 0.16.0 Aurora course has NO jump. Its disabled SKYLINE_LEAP start
 // sits at 4100m (beyond a 3400m lap), but approachStart was still 515m.
 // Consequently from lapS=475 onward GRIP was incorrectly treated as a
 // stunt-preparation command and yaw was multiplied by 0.065 (−93.5%).
 // Require an ACTUAL imminent gap, not just a placeholder jump descriptor.
 // This also preserves Skyline's intended ~100m pre-launch trick window.
 const preArming=control.grip===true&&st.grounded&&
  Boolean(nextGap(st.s))&&
  lapS>=SKYLINE_LEAP.approachStart-40&&lapS<SKYLINE_LEAP.start&&
  st.lastJumpLap!==st.lap;
 const tricking=control.grip===true&&
  ((!st.grounded&&st.trickLaunchLap>0)||preArming);
 if(preArming)st.gripPreArmTicks++;
 if(tricking)st.gripYawSuppressedTicks++;
 // Normal steering loses authority gradually with actual speed, including
 // temporary boosts. GRIP blends toward a separate 1.55× reference cap,
 // so the player can CARVE a curve rather than merely counteract weaker
 // steering. No heading corrections, lane locks, input delay or yaw snaps.
 // st.currentSpeed is the last 120Hz tick's authoritative speed; the
 // one-tick lookback prevents an extra boost solver pass here.
 const normalFactor=normalYawFactorAt(st.currentSpeed);
 const yawFactor=yawAuthorityAt(st.currentSpeed,grip.intensity);
 st.minNormalYawFactor=Math.min(st.minNormalYawFactor,normalFactor);
 st.maxActualYawFactor=Math.max(st.maxActualYawFactor,yawFactor);
 if(grip.active)st.peakGripRelativeGain=Math.max(
  st.peakGripRelativeGain,yawFactor/normalFactor);
 else if(Math.abs(input)>.001)st.normalSteeringSeconds+=dt;
 // Exact same original pilot-owned ordinary and GRIP steering on every
 // track, even while a rail contact is active: no per-course suppression.
 const desired=input*TRIAL.maxYawRate*yawFactor*
  (tricking?AIR_TRICKS.yawAuthorityWhileTricking:1);
 const response=Math.abs(input)>.001?TRIAL.turnResponse:TRIAL.turnRelease;
 const k=1-Math.exp(-dt*response);
 st.yawRate=lerp(st.yawRate,desired,k);
 st.steering=input;st.lastInput=steer;
 st.heading+=st.yawRate*dt;
 st.peakYawRateDeg=Math.max(st.peakYawRateDeg,Math.abs(st.yawRate)*180/Math.PI);
 if(grip.active)st.gripPeakYawDeg=Math.max(st.gripPeakYawDeg,
  Math.abs(st.yawRate)*180/Math.PI);
 const beforeS=st.s,beforeLateral=st.lateral;
 const goal=speedAt(st.s,st.zoneSpeedStage);
 st.zoneCruiseSpeed+=(goal-st.zoneCruiseSpeed)*
   (1-Math.exp(-dt/TRIAL.zoneAccelerationSeconds));
 const triggeredBoost=stepBoostState(st,dt,st.zoneCruiseSpeed,st.grounded);
 // The skill reward is a REAL extra speed envelope, independent of track
 // boost pads and not coupled to cosmetic thrust or camera animations.
 stepLandingBoost(st,dt,st.zoneCruiseSpeed);
 const ungrippedSpeed=st.currentSpeed;
 // This penalty changes the authoritative speed used for displacement.
 // Boosts remain functional; release restores normal target cruise.
 // Small continuous speed scrub while physically touching a wall.
 // This makes a clean precision line valuable without shield damage,
 // sticky steering, forced auto-braking or changes to boost-pad rewards.
 // Rail touch at the previous 120Hz step drives a bounded 8.5% reduction.
 const railScale=1-.085*st.railScrubIntensity;
 st.currentSpeed=ungrippedSpeed*grip.speedScale*railScale;
 st.railScrubLossMeters+=ungrippedSpeed*grip.speedScale*(1-railScale)*dt;
 st.gripSpeedLossMeters+=ungrippedSpeed*(1-grip.speedScale)*dt;
 if(grip.active)st.gripDistanceMeters+=st.currentSpeed*dt;
 const forward=st.currentSpeed;
 // At 90°/270° of a corkscrew the horizontal projection of the lane has
 // zero width. XZ-only lateral recovery becomes mathematically singular.
 // Integrate the pilot's own heading error in the rotating 3D track frame:
 // forward component advances along the spline, lateral component moves
 // freely across the surface. No center magnet, autopilot or rail attraction.
 const onScrew=Boolean(corkscrewAt(st.s)||corkscrewAt(st.s+forward*dt));
 if(onScrew&&st.grounded){
  const error=Math.atan2(Math.sin(st.heading-headingAt(st.s)),
    Math.cos(st.heading-headingAt(st.s)));
  const along=forward*dt*Math.max(.10,Math.cos(error));
  st.s=Math.min(TRIAL.raceLength,st.s+along);
  st.lateral+=forward*dt*Math.sin(error);
  const attached=positionAt(st.s,st.lateral,0);
  st.worldX=attached.x;st.worldZ=attached.z;
 }else{
  // Preserve 0.7.1's free-world magnetic wall and normal racing handling.
  const oldBank=bankAt(st.s),nextBank=bankAt(st.s+forward*dt);
  const rollShift=beforeLateral*(Math.cos(nextBank)-Math.cos(oldBank));
  const startPose=poseAt(st.s);
  st.worldX+=startPose.rightX*rollShift+Math.sin(st.heading)*forward*dt;
  st.worldZ+=startPose.rightZ*rollShift-Math.cos(st.heading)*forward*dt;
  const q=projectWorldToTrack(st.worldX,st.worldZ,st.s);
  if(q.s+1e-8<beforeS)st.reverseProjectionTicks++;
  st.s=q.s;st.lateral=q.lateral;
 }
 const contacted=constrainToGuardrail(st,dt);
 const railContactStarted=contacted&&!st.railContacting;
 if(railContactStarted){
  st.railContactStarts++;
   // Allocate only once per physical impact, not every 120Hz update.
   // These traces tie real user reports to rail side, grip and heading.
   const roadYaw=headingAt(st.s);
   const yawError=Math.atan2(Math.sin(st.heading-roadYaw),
    Math.cos(st.heading-roadYaw))*180/Math.PI;
   if(st.railContactDiagnostics.length>=16)
    st.railContactDiagnostics.shift();
   st.railContactDiagnostics.push({
    t:+st.elapsed.toFixed(2),s:+st.s.toFixed(1),side:st.lastRailSide,
    speed:+st.currentSpeed.toFixed(1),
    headingErrorDeg:+yawError.toFixed(1),
    gripHeld:control.grip===true,
    gripIntensity:+grip.intensity.toFixed(2),
    steer:+steer.toFixed(2)
   });
 }
 if(contacted){
  const yawChange=Math.abs(Math.atan2(
   Math.sin(st.heading-headingBeforeContact),
   Math.cos(st.heading-headingBeforeContact)));
  st.railMaxSingleStepYaw=Math.max(st.railMaxSingleStepYaw,yawChange);
 }
 st.railContacting=contacted;
 const railResponse=contacted?.10:.25;
 st.railScrubIntensity=lerp(st.railScrubIntensity,contacted?1:0,
  1-Math.exp(-dt/railResponse));
 if(contacted)st.railScrubSeconds+=dt;
 st.railScrubPeak=Math.max(st.railScrubPeak,st.railScrubIntensity);
 // Evaluate the physically narrowed GRIP funnel only on the actual track,
 // not just an instructional popup. An exit earns a clean-line result only
 // when the pilot has stayed clear of the rails throughout the apex.
 const previousGripApex=st.gripApexActive;
 st.gripApexActive=Boolean(gripApexAt(st.s));
 const gripApexEntered=!previousGripApex&&st.gripApexActive;
 const gripApexExited=previousGripApex&&!st.gripApexActive;
 let cleanGripApexExit=false;
 if(gripApexEntered){
  st.gripApexEntries++;
  st.gripApexRailContactsAtEntry=st.railContacts;
 }
 if(st.gripApexActive&&grip.active)st.gripApexGripSeconds+=dt;
 if(gripApexExited){
  st.gripApexExits++;
  cleanGripApexExit=st.railContacts===st.gripApexRailContactsAtEntry;
  if(cleanGripApexExit)st.gripApexCleanExits++;
 }
 if(!contacted)st.lastRailSide=0;
 st.sideVelocity=(st.lateral-beforeLateral)/dt;
 st.maxLateral=Math.max(st.maxLateral,Math.abs(st.lateral));
 const difference=Math.atan2(Math.sin(st.heading-headingAt(st.s)),
  Math.cos(st.heading-headingAt(st.s)))*180/Math.PI;
 st.totalHeadingError+=Math.abs(difference);st.headingSamples++;
 st.maxHeadingErrorDeg=Math.max(st.maxHeadingErrorDeg,Math.abs(difference));
 st.peakBankDeg=Math.max(st.peakBankDeg,Math.abs(bankDegreesAt(st.s)));
 const solid=onRoad(st.s,st.lateral);
 const ground=surfaceHeightAt(st.s,st.lateral);
 const groundNormalY=surfaceNormalAt(st.s).y;
 const inLeap=Boolean(gapAt(st.s));
 if(!solid&&!inLeap)st.offRoadSeconds+=dt;
 const wasGrounded=st.grounded;
 let jumped=false,landed=false,landImpact=0;
 let trickStarted=false,trickCompleted=false,landingBoostAwarded=false;
 let landingBoostRejected=false,landingBoostReason=null;
 const priorMagnetic=st.magneticActive;
 const priorCorkscrew=st.corkscrewActive;
 // Authentic road lip, rather than cosmetic jump: below the leap the
 // indexed top deck and raised barriers are both absent.
 const lipLap=Math.floor(beforeS/CIRCUIT.lapLength)+1;
 const lipS=(lipLap-1)*CIRCUIT.lapLength+SKYLINE_LEAP.start;
 const takeoff=wasGrounded&&beforeS<lipS&&st.s>=lipS&&
   st.s-beforeS<5&&st.currentSpeed>=SKYLINE_LEAP.minTakeoffSpeed&&
   Math.abs(st.lateral)<guardrailLateralLimit(st.s);
 if(takeoff){
  st.grounded=false;st.vy=SKYLINE_LEAP.launchVelocity+
   clamp((st.currentSpeed-TRIAL.startSpeed)*.013,0,.95);
  st.autoLaunches++;st.jumps++;st.lastJumpLap=lipLap;
  beginAirTrick(st,lipLap);
  jumped=true;
 }else if(wasGrounded&&!solid){st.grounded=false;st.vy=0;}
 if(st.grounded&&solid){st.y=ground+TRIAL.hoverHeight*groundNormalY;st.vy=0;}
 else {
  st.vy-=TRIAL.gravity*dt;
  st.y+=st.vy*dt;st.airborneSeconds+=dt;
  st.peakAirHeightMeters=Math.max(st.peakAirHeightMeters,
   st.y-ground-TRIAL.hoverHeight*groundNormalY);
  if(solid&&st.vy<=0&&st.y-TRIAL.hoverHeight*groundNormalY<=ground&&
      st.y-TRIAL.hoverHeight*groundNormalY>=ground-.50){
   landImpact=-st.vy;
   st.y=ground+TRIAL.hoverHeight*groundNormalY;st.vy=0;
   st.grounded=true;st.landings++;landed=true;
   if(st.lastJumpLap===Math.floor(st.s/CIRCUIT.lapLength)+1)
    st.cleanLeapLandings++;
  }
 }
 // Evaluate the roll only while physically airborne. SKYLINE LEAP launches
 // automatically; GRIP + STEER repurposes side thrusters for the roll.
 const trickStep=advanceAirTrick(st,dt,steer,
   control.grip===true&&st.lastJumpLap>0);
 trickStarted=trickStep.started;trickCompleted=trickStep.completed;
 if(landed){
  const judged=finalizeAirTrick(st,{
   lap:st.lastJumpLap,impact:landImpact,headingErrorDeg:difference,
   lateralLimit:guardrailLateralLimit(st.s),
   grounded:st.grounded,railContact:contacted});
  landingBoostAwarded=judged.awarded;
  landingBoostRejected=judged.attempted&&!judged.awarded;
  landingBoostReason=judged.reason;
 }
 // When a partially finished trick reaches the ground, the remaining
 // visual angle settles via shortest equivalent 2π, not an ugly snap.
 settleTrickVisual(st,dt);
 // Magnetically constrained to the physical surface, not a camera-only roll.
 const wallDegrees=Math.abs(bankDegreesAt(st.s));
 st.magneticActive=st.grounded&&solid&&wallDegrees>=3&&Boolean(magneticWallAt(st.s));
 const wallEntered=!priorMagnetic&&st.magneticActive;
 const wallExited=priorMagnetic&&!st.magneticActive;
 let cleanWallExit=false;
 if(wallEntered){st.magneticEntries++;st.magneticEntryRailContacts=st.railContacts;}
 if(st.magneticActive){
  st.magneticSeconds+=dt;st.magneticDistanceMeters+=forward*dt;
  st.magneticPeakDegrees=Math.max(st.magneticPeakDegrees,wallDegrees);
 }
 if(wallExited){
  st.magneticExits++;
  cleanWallExit=st.grounded&&st.railContacts===st.magneticEntryRailContacts;
  if(cleanWallExit)st.magneticCleanExits++;
 }
 // Track-corkscrew statistics use the real 360° road normal, not a UI trick.
 st.corkscrewActive=st.grounded&&solid&&Boolean(corkscrewAt(st.s));
 const corkscrewEntered=!priorCorkscrew&&st.corkscrewActive;
 const corkscrewExited=priorCorkscrew&&!st.corkscrewActive;
 let cleanCorkscrewExit=false;
 if(corkscrewEntered){
  st.corkscrewEntries++;
  st.corkscrewEntryRailContacts=st.railContacts;
 }
 if(st.corkscrewActive){
  st.corkscrewSeconds+=dt;
  st.corkscrewDistanceMeters+=forward*dt;
  st.corkscrewPeakDegrees=Math.max(st.corkscrewPeakDegrees,
    Math.abs(corkscrewBankAt(st.s))*180/Math.PI);
  if(groundNormalY<-.80)st.corkscrewCeilingSeconds+=dt;
 }
 if(corkscrewExited){
  st.corkscrewExits++;
  cleanCorkscrewExit=st.grounded&&st.railContacts===st.corkscrewEntryRailContacts;
  if(cleanCorkscrewExit)st.corkscrewCleanExits++;
 }
 // Ten ordered checkpoints per lap prevent shortcuts and duplicate laps.
 // Validate ONE physical forward crossing at a time. A fabricated jump
 // across a full lap, teleport to finish or reverse finish-line pass cannot
 // magically award all intervening checkpoints.
 const nextGate=(st.checkpointsPassed+1)*(CIRCUIT.lapLength/10);
 if(beforeS<nextGate&&st.s>=nextGate&&st.s-beforeS<5){
  st.checkpointsPassed++;
  st.checkpoint=nextGate;
 }
 let lapCompleted=0;
 const lapGate=(st.lapsCompleted+1)*CIRCUIT.lapLength;
 if(st.lapsCompleted<CIRCUIT.laps&&
    beforeS<lapGate&&st.s>=lapGate&&
    st.checkpointsPassed>=(st.lapsCompleted+1)*10){
  st.lapsCompleted++;
  st.lapTimes.push(+(st.elapsed-st.lastLapAt).toFixed(3));
  st.lastLapAt=st.elapsed;
  st.lap=Math.min(CIRCUIT.laps,st.lapsCompleted+1);
  lapCompleted=st.lapsCompleted;
 }
 let crashed=false,finished=false;
 if(st.y<ground-TRIAL.fallDepth){
  st.falls++;crashed=true;st.lastCrashS=st.s;
  st.shield=Math.max(0,st.shield-TRIAL.shieldPenalty);
  if(st.shield===0)st.failed=true;
  else {
   const recover=Math.min(TRIAL.raceLength-.5,st.checkpoint+8),
      p=positionAt(recover,0,0);
   st.s=recover;st.lateral=0;st.sideVelocity=0;st.lastRailSide=0;
   st.worldX=p.x;st.worldZ=p.z;
   st.heading=headingAt(recover);st.steering=0;st.yawRate=0;
   st.gripIntensity=0;st.gripActive=false;st.gripHeldActive=false;
   st.gripDirection=0;
   st.lastInput=0;st.y=surfaceHeightAt(recover)+
    TRIAL.hoverHeight*surfaceNormalAt(recover).y;
   st.magneticActive=false;st.corkscrewActive=false;st.gripApexActive=false;
   st.railContacting=false;st.railScrubIntensity=0;
   st.trickActive=false;st.trickReady=false;st.trickLaunchLap=0;
   st.trickVisualAngle=0;st.landingBoostTimer=0;
   st.landingBoostMultiplier=1;
   st.lastJumpLap=0;
   st.vy=0;st.grounded=true;st.lastSteerSign=0;
   st.boostTimer=0;st.boostMultiplier=1;st.currentSpeed=st.zoneCruiseSpeed;
  }
 }
 if(!st.failed&&st.lapsCompleted===CIRCUIT.laps&&
    st.s>=TRIAL.raceLength-.15&&
    onRoad(TRIAL.raceLength-.05,st.lateral)){
  st.s=TRIAL.raceLength;st.finished=true;finished=true;
 }
 return {kind:st.failed?"failed":finished?"finished":
   crashed?"crashed":"moving",crashed,finished,
   jumped,landed,cleared:false,railContact:contacted,
   gripActivated:grip.activated,gripActive:grip.active,
   gripApexEntered,gripApexExited,cleanGripApexExit,
   railContactStarted,railScrubIntensity:st.railScrubIntensity,
   trickStarted,trickCompleted,landingBoostAwarded,
   landingBoostRejected,landingBoostReason,
   boostActivated:triggeredBoost?.id??null,
   boostChoice:triggeredBoost?{
    id:triggeredBoost.id,group:triggeredBoost.group,
    kind:triggeredBoost.kind,multiplier:triggeredBoost.multiplier,
    durationSeconds:triggeredBoost.durationSeconds}:null,
   lapCompleted,routeChoice:null,
   wallEntered,wallExited,cleanWallExit,wallActive:st.magneticActive,
   corkscrewEntered,corkscrewExited,cleanCorkscrewExit,
   corkscrewActive:st.corkscrewActive,
   routeReward:false,landImpact};
}

 return Object.freeze({newFlightState,stepFlight});
}
