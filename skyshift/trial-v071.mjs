// SKYSHIFT 0.7.1 — Magnetic Wall Ride Skyline Circuit: actual elevation, ramp and flight
import {BOOST_PADS,BOOST_CONFIG,initBoostState,stepBoostState,boostedSpeedAt} from "./flight/boost/boost-v060.mjs";
import {GRIP_SPEC,initGripState,stepGripState} from "./precision-grip-v061.mjs";
import {TRACK_3D,SKYLINE_LEAP,elevationAt,gradeAt,pitchAt,groundNormalAt,jumpAt,upcomingJump,elevationAudit,MAGNETIC_WALL,magneticBankAt,magneticWallAt} from "./tracks/shared/track-3d-v071.mjs";
import {CIRCUIT,CIRCUIT_LENGTH,COURSE_SEGMENTS as LOOP_SEGMENTS,
 lapPosition,sectionAt,circuitPlanSummary} from "./tracks/shared/circuit-layout-v060.mjs";
export {BOOST_PADS,BOOST_CONFIG,CIRCUIT,circuitPlanSummary,TRACK_3D,SKYLINE_LEAP,MAGNETIC_WALL,pitchAt,gradeAt,elevationAudit};
// Intentionally small handling lab: geometric straights, circular arcs and
// quintic-curvature transitions. No incidental heading changes, no jump hazards.
// This trial supersedes 0.4.1 ONLY in the active page; the old course is kept.
export const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};

export const TRIAL=Object.freeze({
 id:"skyline-wall-v071",name:"MAGNETIC SKYLINE",length:CIRCUIT.lapLength,
 raceLength:CIRCUIT.totalDistance,laps:CIRCUIT.laps,
 hoverHeight:1.05,gravity:24,fallDepth:8.5,shieldPenalty:20,
 startSpeed:44,endSpeed:44*1.11**8,
 zoneSpeedStep:1.11,zoneAccelerationSeconds:.85,targetDurationSeconds:155,
 // Yaw rate is in radians/s. No steering auto-assist or heading snap.
 // Angular authority scales with speed to preserve corner radius and feel.
 maxYawRate:1.24,turnResponse:24,turnRelease:36,steerDeadzone:.055,
 sideSpeed:0
});
// Authored as true constant-curvature arcs, not smoothstep heading gestures.
// Each transition eases curvature to zero with C2 joins.
// The core of each bend has EXACTLY constant radius, and every straight has
// EXACTLY zero curvature and a constant mathematical heading.
// Each plan segment has its own purposeful radius and a genuine straight
// before the next sweep. A common scale normalizes the route to 10,400m.
// Distinct visual rhythms: majestic sweeps, fast hooks, a flowing S-link and
// long breathing straights. The sharper arcs are still constant-radius
// with generous C2 easing — never sketchy short hand-drawn wiggles.
export const SHOWCASE_PLAN=LOOP_SEGMENTS;
export const COURSE_SEGMENTS=LOOP_SEGMENTS;
export const MAX_BANK_RAD=MAGNETIC_WALL.maxBankDegrees*Math.PI/180;
export const GAPS=Object.freeze([SKYLINE_LEAP]);
export const ISLANDS=Object.freeze([]);
export const SPLITS=Object.freeze([]);
export const RISK_CUTS=Object.freeze([]);
export const CHECKPOINTS=Object.freeze(
 Array.from({length:CIRCUIT.laps*10+1},(_,i)=>i*CIRCUIT.lapLength/10));
export const SECTORS=Object.freeze(
 CIRCUIT.sectors.map(s=>({s:s.start,name:s.name,tint:0x43ddf0})));
export const ROAD_CUES=Object.freeze([{s:SKYLINE_LEAP.approachStart,label:"LEAP AHEAD",kind:"jump"},
 {s:MAGNETIC_WALL.start-30,label:"MAGNETIC WALL AHEAD",kind:"magnetic"}]);
// A single start/finish gantry lives at the seam; every lap crosses it.
export const ARCHES=Object.freeze([
 {s:CIRCUIT.lapLength-13,label:"FINISH",color:0xffd6a2}
]);
export const GEOMETRY_BREAKS=Object.freeze([
 ...new Set([...COURSE_SEGMENTS.flatMap(c=>c.type==="turn"?
   [c.start,c.start+c.entry,c.end-c.exit,c.end]:[c.start,c.end]),SKYLINE_LEAP.start,SKYLINE_LEAP.end,
    MAGNETIC_WALL.start,MAGNETIC_WALL.riseEnd,MAGNETIC_WALL.fallStart,MAGNETIC_WALL.end])
].sort((a,b)=>a-b));
export const SPEED_SECTIONS=Object.freeze([
 {start:0,end:CIRCUIT.lapLength,id:"skyline-lap"}
]);

// Quintic smoothstep yields C2 curvature at straight/transition joins.
// Integrated analytically to avoid accumulated heading discontinuities.
export function easedCurvature(u){
 const x=clamp(u,0,1);
 return x*x*x*(10+x*(-15+6*x));
}
export function integratedEasedCurvature(u){
 const x=clamp(u,0,1);
 return x*x*x*x*(2.5+x*(-3+x));
}
function turnContribution(s,t){
 const {entry,hold,exit,curvature:k}=t;
 const d=clamp(s-t.start,0,entry+hold+exit);
 if(d<=entry)return k*entry*integratedEasedCurvature(d/entry);
 if(d<=entry+hold)return k*(entry*.5+d-entry);
 const x=(d-entry-hold)/exit;
 return k*(entry*.5+hold+exit*(x-integratedEasedCurvature(x)));
}
export function headingAt(s){
 const lap=Math.floor(s/CIRCUIT.lapLength);
 const local=lapPosition(s);
 return lap*2*Math.PI+COURSE_SEGMENTS.reduce((angle,t)=>
  angle+(t.type==="turn"?turnContribution(local,t):0),0);
}
export function curvatureAt(s){
 const local=lapPosition(s);
 for(const t of COURSE_SEGMENTS){
  if(t.type!=="turn"||local<t.start||local>=t.end)continue;
  const d=local-t.start;
  if(d<t.entry)return t.curvature*easedCurvature(d/t.entry);
  if(d<t.entry+t.hold)return t.curvature;
  return t.curvature*(1-easedCurvature((d-t.entry-t.hold)/t.exit));
 }
 return 0;
}
export function bankAt(s){return magneticBankAt(s);}
export function bankDegreesAt(s){return bankAt(s)*180/Math.PI;}
export function heightAt(s){return elevationAt(s);}
export function surfaceHeightAt(s,lateral=0){
 // The road's lateral tangent rolls about the true grade-aware forward
 // direction, so gravity and hover agree exactly with the rendered deck.
 const p=poseAt(s),ground=groundNormalAt(s,p.heading);
 return elevationAt(s)-ground.y*Math.sin(bankAt(s))*lateral;
}
export function widthAt(s){return 23.2;}
export function speedAt(s,zoneStage=0){
 // This is real physics speed (m/s), not a speedometer multiplier.
 // Every authentic color-front crossing gives +11% physical cruise speed.
 return TRIAL.startSpeed*Math.pow(TRIAL.zoneSpeedStep,
  Math.max(0,Math.min(8,Math.floor(zoneStage))));
}
export function setZoneSpeedStage(state,stage){
 const next=Math.max(0,Math.min(8,Math.floor(stage)));
 if(next<=state.zoneSpeedStage)return false;
 state.zoneSpeedStage=next;
 state.zoneSpeedEvents.push({stage:next,atSeconds:+state.elapsed.toFixed(3)});
 return true;
}
export function sectorAt(s){return sectionAt(s);}
export function gapAt(s){return s>=0&&s<TRIAL.raceLength?jumpAt(s):null;}
export function nextGap(s){return upcomingJump(s,100);}
export function roadIntervals(s){
 if(s<0||s>TRIAL.raceLength||gapAt(s))return [];
 return [[-widthAt(s)*.5,widthAt(s)*.5]];
}
export function onRoad(s,lateral,radius=.48){
 return roadIntervals(s).some(([a,b])=>lateral>=a+radius&&lateral<=b-radius);
}
// Physical rail collision is inset by the craft half-span and shoulder.
// The player remains entirely responsible for steering in free space.
export const GUARDRAIL=Object.freeze({
 height:.78,innerInset:.78,halfCraftSpan:2.95,safetyGap:.10,
 collisionMargin:3.83
});
export function guardrailLateralLimit(s){
 return Math.max(0,widthAt(s)*.5-GUARDRAIL.collisionMargin);
}
export function constrainToGuardrail(st,dt){
 if(st.s<0||st.s>TRIAL.raceLength||gapAt(st.s))return false;
 const limit=guardrailLateralLimit(st.s),old=st.lateral;
 if(Math.abs(old)<=limit)return false;
 const side=Math.sign(old),clamped=side*limit;
 const contact=positionAt(st.s,clamped,0);
 st.worldX=contact.x;st.worldZ=contact.z;st.lateral=clamped;
 // Collision clips outward displacement only, never alters steering,
 // yaw, forward speed, or cross-track position while inside the limit.
 if(st.lastRailSide!==side)st.railContacts++;
 st.lastRailSide=side;st.railSeconds+=dt;
 st.railMaxPenetration=Math.max(st.railMaxPenetration,Math.abs(old)-limit);
 return true;
}
export function checkpointFor(s){
 return Math.floor(clamp(s,0,TRIAL.raceLength)/
   (CIRCUIT.lapLength/10)+1e-7)*(CIRCUIT.lapLength/10);
}
// Preintegrate the exact periodic curvature at 25cm resolution. The small
// numerical quadrature drift is distributed over the FULL lap, leaving a
// genuinely welded road/rail seam at identical x,z and yaw.
const STEP=.25;
const positionCount=Math.round(CIRCUIT.lapLength/STEP);
const positions=[{x:0,z:0}];
for(let i=1;i<=positionCount;i++){
 const mid=(i-.5)*STEP,angle=headingAt(mid),prev=positions[i-1];
 positions.push({x:prev.x+Math.sin(angle)*STEP,
  z:prev.z-Math.cos(angle)*STEP});
}
const closingError=positions.at(-1);
for(let i=1;i<=positionCount;i++){
 const f=i/positionCount;
 positions[i].x-=closingError.x*f;
 positions[i].z-=closingError.z*f;
}
export const LOOP_CLOSURE_ERROR_METERS=Math.hypot(
 closingError.x,closingError.z);
export function poseAt(s){
 const local=lapPosition(s);
 const fIndex=local/STEP,i=Math.floor(fIndex),f=fIndex-i;
 const a=positions[i],b=positions[i+1],heading=headingAt(s);
 return {
  x:lerp(a.x,b.x,f),y:heightAt(s),z:lerp(a.z,b.z,f),heading,
  forwardX:Math.sin(heading),forwardZ:-Math.cos(heading),
  rightX:Math.cos(heading),rightZ:Math.sin(heading)
 };
}
export function surfaceNormalAt(s){
 const p=poseAt(s),normal=groundNormalAt(s,p.heading),b=bankAt(s);
 if(!b)return normal;
 return {x:normal.x*Math.cos(b)+p.rightX*Math.sin(b),
  y:normal.y*Math.cos(b),
  z:normal.z*Math.cos(b)+p.rightZ*Math.sin(b)};
}
export function positionAt(s,lateral=0,height=0){
 const p=poseAt(s),normal=surfaceNormalAt(s),b=bankAt(s);
 const cb=Math.cos(b),sb=Math.sin(b),base=groundNormalAt(s,p.heading);
 // Rigid orthonormal local road frame: lane-right = right*cos(bank)
 // - grade-normal*sin(bank). Height always follows the true wall normal.
 return {x:p.x+lateral*(p.rightX*cb-base.x*sb)+normal.x*height,
   y:p.y-lateral*base.y*sb+normal.y*height,
   z:p.z+lateral*(p.rightZ*cb-base.z*sb)+normal.z*height};
}
// Projection ONLY measures track-relative coordinates. It cannot move, rotate
// or recenter the ship. The search is local in arc length, not a global magnet.
// Arc-length-local projection is valid across the start/finish seam because
// poseAt() is periodic. Never globally snap to another point of the circuit.
export function projectWorldToTrack(x,z,hintS){
 const from=Math.max(0,hintS-4),to=Math.min(TRIAL.raceLength+2,hintS+10);
 const step=.5;
 let best=clamp(hintS,0,TRIAL.raceLength),bestDist=Infinity;
 for(let s=from;s<to;s+=step){
  const e=Math.min(to,s+step),a=poseAt(s),b=poseAt(e);
  const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
  if(den<1e-10)continue;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/den,0,1);
  const cx=a.x+dx*t,cz=a.z+dz*t;
  const d=(x-cx)**2+(z-cz)**2;
  if(d<bestDist){bestDist=d;best=s+(e-s)*t;}
 }
 const p=poseAt(best);
 return {s:clamp(best,0,TRIAL.raceLength),
  lateral:((x-p.x)*p.rightX+(z-p.z)*p.rightZ)/Math.max(.20,Math.cos(bankAt(best))),
  distance:Math.sqrt(bestDist)};
}
export function nearestLane(s,lateral){
 return onRoad(s,lateral,0)?lateral:clamp(lateral,-widthAt(s)*.5+.6,widthAt(s)*.5-.6);
}
export function shapeSteer(value){
 const v=clamp(value,-1,1),mag=Math.abs(v);
 if(mag<=TRIAL.steerDeadzone)return 0;
 const x=(mag-TRIAL.steerDeadzone)/(1-TRIAL.steerDeadzone);
 // More fine control in the middle of an analog touch stick, with enough
 // authority near full travel to trace each constant-radius turn.
 return Math.sign(v)*(.32*x+.68*x*x);
}
export function newFlightState(){
 const p=positionAt(5,0,0);
 return initBoostState(initGripState({
  s:5,lateral:0,sideVelocity:0,worldX:p.x,worldZ:p.z,
  heading:headingAt(5),steering:0,yawRate:0,lastInput:0,
  peakYawRateDeg:0,peakBankDeg:0,
  totalHeadingError:0,maxHeadingErrorDeg:0,headingSamples:0,
  maxLateral:0,offRoadSeconds:0,steerSeconds:0,
  railContacts:0,railSeconds:0,railMaxPenetration:0,lastRailSide:0,
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
  zoneSpeedStage:0,zoneCruiseSpeed:TRIAL.startSpeed,zoneSpeedEvents:[]
 }),TRIAL.startSpeed);
}
export function stepFlight(st,dt,control={}){
 if(st.finished||st.failed)return {kind:"idle"};
 const steer=clamp(control.steer??0,-1,1);
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
 const desired=input*TRIAL.maxYawRate*grip.authority;
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
 const ungrippedSpeed=st.currentSpeed;
 // This penalty changes the authoritative speed used for displacement.
 // Boosts remain functional; release restores normal target cruise.
 st.currentSpeed=ungrippedSpeed*grip.speedScale;
 st.gripSpeedLossMeters+=(ungrippedSpeed-st.currentSpeed)*dt;
 if(grip.active)st.gripDistanceMeters+=st.currentSpeed*dt;
 const forward=st.currentSpeed;
 // Keep the same pilot-owned lane while the bank twists under the craft.
 // The magnets rotate local lateral offset; they do not steer the pilot.
 const oldBank=bankAt(st.s),nextBank=bankAt(st.s+forward*dt);
 const rollShift=beforeLateral*(Math.cos(nextBank)-Math.cos(oldBank));
 const startPose=poseAt(st.s);
 st.worldX+=startPose.rightX*rollShift+Math.sin(st.heading)*forward*dt;
 st.worldZ+=startPose.rightZ*rollShift-Math.cos(st.heading)*forward*dt;
 const q=projectWorldToTrack(st.worldX,st.worldZ,st.s);
 st.s=q.s;st.lateral=q.lateral;
 const contacted=constrainToGuardrail(st,dt);
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
 const priorMagnetic=st.magneticActive;
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
   st.magneticActive=false;
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
   boostActivated:triggeredBoost?.id??null,lapCompleted,routeChoice:null,
   wallEntered,wallExited,cleanWallExit,wallActive:st.magneticActive,
   routeReward:false,landImpact};
}
export function validateTrial(){
 const errors=[];
 if(Math.abs(CIRCUIT_LENGTH-CIRCUIT.lapLength)>1e-5)
   errors.push("lap length does not match planned geometric loop");
 if(COURSE_SEGMENTS[0].start!==0||
    Math.abs(COURSE_SEGMENTS.at(-1).end-CIRCUIT.lapLength)>1e-5)
   errors.push("track endpoints incorrect");
 for(let i=1;i<COURSE_SEGMENTS.length;i++)
  if(Math.abs(COURSE_SEGMENTS[i-1].end-COURSE_SEGMENTS[i].start)>1e-5)
   errors.push("gap or overlap in course sections");
 for(let s=0;s<TRIAL.length;s+=1){
  const a=poseAt(s),b=poseAt(s+.5);
  if(Math.hypot(b.x-a.x,b.z-a.z)>.6)errors.push("position jump at "+s);
  if(Math.abs(bankAt(s))>MAX_BANK_RAD+1e-9)
   errors.push("magnetic bank exceeds designed envelope at "+s);
  if(Math.abs(poseAt(s).y-poseAt(s+.5).y)>.10)
   errors.push("vertical terrain spike at "+s);
 }
 const a=poseAt(0),b=poseAt(TRIAL.length);
 if(Math.hypot(a.x-b.x,a.z-b.z)>1e-8)
  errors.push("unwelded start/finish position");
 if(Math.abs(Math.sin(a.heading-b.heading))>1e-7)
  errors.push("unwelded start/finish heading");
 if(LOOP_CLOSURE_ERROR_METERS>.3)
  errors.push("excessive underlying quadrature drift");
 if(Math.abs(heightAt(0)-heightAt(TRIAL.length))>1e-9||
   Math.abs(gradeAt(0)-gradeAt(TRIAL.length))>1e-9)
  errors.push("unwelded vertical height or slope at lap seam");
 if(Math.abs(bankAt(0))+Math.abs(bankAt(TRIAL.length))>1e-9)
  errors.push("magnetic bank leaks into lap seam");
 if(GAPS.length!==1)
  errors.push("invalid number of leap gaps");
 return errors;
}
