import {ACTIVE_TRACK_0160,isAurora,isVault} from "./tracks/shared/track-selection-v0160.mjs";
const isFlowTrack=()=>isAurora()||isVault();
// SKYSHIFT 0.16.4 — SAME physics for all circuits; geometry only changes course.
import {BOOST_PADS,BOOST_CONFIG,initBoostState,stepBoostState,boostedSpeedAt} from "./boost-v0160.mjs";
import {GRIP_SPEC,initGripState,stepGripState} from "./precision-grip-v084.mjs";
import {STEERING_AUTHORITY,normalYawFactorAt,yawAuthorityAt,steeringBalanceAt} from "./steering-authority-v01348.mjs";
import {AIR_TRICKS,initAirTrickState,beginAirTrick,advanceAirTrick,
 finalizeAirTrick,stepLandingBoost,settleTrickVisual} from "./air-tricks-v083.mjs";
import {TRACK_3D,SKYLINE_LEAP,elevationAt,gradeAt,pitchAt,groundNormalAt,jumpAt,upcomingJump,elevationAudit,MAGNETIC_WALL,magneticBankAt,magneticWallAt,CORKSCREW,corkscrewBankAt,corkscrewAt,corkscrewProgressAt} from "./tracks/shared/track-3d-v0160.mjs";
import {CIRCUIT,CIRCUIT_LENGTH,COURSE_SEGMENTS as LOOP_SEGMENTS,
 lapPosition,sectionAt,circuitPlanSummary as baseCircuitPlanSummary} from "./tracks/shared/circuit-layout-v0160.mjs";
export {BOOST_PADS,BOOST_CONFIG,CIRCUIT,TRACK_3D,SKYLINE_LEAP,MAGNETIC_WALL,CORKSCREW,pitchAt,gradeAt,elevationAudit,AIR_TRICKS,STEERING_AUTHORITY,normalYawFactorAt,yawAuthorityAt,steeringBalanceAt};
// Intentionally small handling lab: geometric straights, circular arcs and
// quintic-curvature transitions. No incidental heading changes, no jump hazards.
// This trial supersedes 0.4.1 ONLY in the active page; the old course is kept.
export const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};

export const TRIAL=Object.freeze({
 id:isVault()?"neon-vault-full-tunnel-0270":
  ACTIVE_TRACK_0160.id==="aurora"?"aurora-flow-v0160":"skyline-grip-first-v0901",
 name:ACTIVE_TRACK_0160.name,length:CIRCUIT.lapLength,
 raceLength:CIRCUIT.totalDistance,laps:CIRCUIT.laps,
 hoverHeight:1.05,gravity:22,fallDepth:8.5,shieldPenalty:20,
 startSpeed:44,endSpeed:44*1.11**8,
 zoneSpeedStep:1.11,zoneAccelerationSeconds:.85,targetDurationSeconds:155,
 // 0.8.4: original reference yaw preserved, but ordinary steering turns
 // progressively wider as speed rises; GRIP has separate strong authority.
 // Pilot yaw and release response remain instantaneous/unchanged.
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
// 0.8.2 racecraft: one deliberate technical GRIP apex after the leap;\n// sharpen the *middle* of selected real corners,
// retaining exactly the same turn angle, entry/exit and straight sections.
// Pulse area is zero: no heading drift downstream or handwritten chicanes.
// Full-speed laps need deliberate GRIP at technical apexes, while lap one
// remains learnable without it. Never add lane magnets or steering assists.
export const TECHNICAL_APEX_PULSES=Object.freeze(isFlowTrack()?{}:{
 "high-speed-sweep":0.00857070014,
 "precision-apex":0.0145,
 "back-sweeper":0.014,
 "final-corner":0.00961940512
});
export function circuitPlanSummary(){
 const base=baseCircuitPlanSummary();
 const radii=COURSE_SEGMENTS.filter(t=>t.type==="turn").map(t=>
  +(1/Math.abs(t.curvature+(TECHNICAL_APEX_PULSES[t.id]??0)*.5)).toFixed(1));
 return {...base,
  maximumCurvature:Math.max(...COURSE_SEGMENTS.map(t=>
   Math.abs(t.curvature+(TECHNICAL_APEX_PULSES[t.id]??0)*.5))),
  uniqueTurnRadii:radii,
  gripApexes:Object.keys(TECHNICAL_APEX_PULSES)};
}
export const MAX_BANK_RAD=2*Math.PI;
export const GAPS=Object.freeze(isFlowTrack()?[]:[SKYLINE_LEAP]);
export const ISLANDS=Object.freeze([]);
export const SPLITS=Object.freeze([]);
export const RISK_CUTS=Object.freeze([]);
export const CHECKPOINTS=Object.freeze(
 Array.from({length:CIRCUIT.laps*10+1},(_,i)=>i*CIRCUIT.lapLength/10));
export const SECTORS=Object.freeze(
 CIRCUIT.sectors.map(s=>({s:s.start,name:s.name,tint:0x43ddf0})));
export const ROAD_CUES=Object.freeze(isVault()?[
 {s:228,label:"VAULT S-LINK",kind:"turn"},
 {s:870,label:"GRIP SWEEP",kind:"grip"},
 {s:1580,label:"GRAND SWEEP",kind:"turn"}
]:isAurora()?[
 {s:205,label:"GLASS SWEEP",kind:"turn"},
 {s:1140,label:"NORTH SWITCHBACK",kind:"turn"},
 {s:2840,label:"HIGHLAND RUN",kind:"turn"}
]:[{s:120,label:"SWEEP AHEAD",kind:"turn"},
 {s:SKYLINE_LEAP.approachStart,label:"LEAP AHEAD",kind:"jump"},
 {s:776,label:"GRIP APEX AHEAD",kind:"grip"},
 {s:MAGNETIC_WALL.start-30,label:"MAGNETIC WALL AHEAD",kind:"magnetic"},
 {s:CORKSCREW.start-75,label:"CORKSCREW AHEAD",kind:"corkscrew"}]);
// A single start/finish gantry lives at the seam; every lap crosses it.
export const ARCHES=Object.freeze([
 {s:CIRCUIT.lapLength-13,label:"FINISH",color:0xffd6a2}
]);
export const GEOMETRY_BREAKS=Object.freeze([
 ...new Set([...COURSE_SEGMENTS.flatMap(c=>c.type==="turn"?
  [c.start,c.start+c.entry,c.end-c.exit,c.end]:[c.start,c.end]),
  ...(isFlowTrack()?[]:[SKYLINE_LEAP.start,SKYLINE_LEAP.end,
   MAGNETIC_WALL.start,MAGNETIC_WALL.riseEnd,MAGNETIC_WALL.fallStart,
   MAGNETIC_WALL.end,CORKSCREW.start,CORKSCREW.end])])
].sort((a,b)=>a-b));
export const SPEED_SECTIONS=Object.freeze([
 {start:0,end:CIRCUIT.lapLength,id:isVault()?"vault-lap":isAurora()?"aurora-lap":"skyline-lap"}
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
 let base;
 if(d<=entry)base=k*entry*integratedEasedCurvature(d/entry);
 else if(d<=entry+hold)base=k*(entry*.5+d-entry);
 else {
  const x=(d-entry-hold)/exit;
  base=k*(entry*.5+hold+exit*(x-integratedEasedCurvature(x)));
 }
 const pulse=TECHNICAL_APEX_PULSES[t.id]??0;
 if(!pulse||d<=entry||d>=entry+hold)return base;
 // Integral of (cos(4πu)-cos(2πu))/4 is zero over [0,1].
 // Thus the *true* corner radius tightens at the apex while its final
 // heading and its C2 curvature joins stay exactly unchanged.
 const u=(d-entry)/hold;
 return base+pulse*hold*(Math.sin(4*Math.PI*u)/(16*Math.PI)-
    Math.sin(2*Math.PI*u)/(8*Math.PI));
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
  if(d<t.entry+t.hold){
   const pulse=TECHNICAL_APEX_PULSES[t.id]??0;
   const u=(d-t.entry)/t.hold;
   return t.curvature+.25*pulse*(Math.cos(4*Math.PI*u)-
      Math.cos(2*Math.PI*u));
  }
  return t.curvature*(1-easedCurvature((d-t.entry-t.hold)/t.exit));
 }
 return 0;
}
export function bankAt(s){return magneticBankAt(s)+corkscrewBankAt(s);}
export function bankDegreesAt(s){return bankAt(s)*180/Math.PI;}
export function heightAt(s){return elevationAt(s);}
export function surfaceHeightAt(s,lateral=0){
 // The road's lateral tangent rolls about the true grade-aware forward
 // direction, so gravity and hover agree exactly with the rendered deck.
 const p=poseAt(s),ground=groundNormalAt(s,p.heading);
 return elevationAt(s)-ground.y*Math.sin(bankAt(s))*lateral;
}
// Precision GRIP APEX: physically narrowing guardrails and top deck, never a
// UI-only "challenge". An early C2 funnel makes the 14m throat visible
// before the technical 90° bend; at high zone speeds the apex requires GRIP
// to avoid the rail. Low-speed laps teach the line without a forced crash.
export const GRIP_APEX=Object.freeze({
 id:isFlowTrack()?"no-narrow-apex":"precision-grip-apex",name:"GRIP APEX",
 funnelStart:isFlowTrack()?4000:777,throatStart:isFlowTrack()?4010:840,
 throatEnd:isFlowTrack()?4020:962,funnelEnd:isFlowTrack()?4030:995,
 minWidthMeters:isFlowTrack()?23.2:14,normalWidthMeters:23.2,
 peakCurvature:isFlowTrack()?0.0086:0.01649,
 fullGripRequiredAtFastestZone:!isFlowTrack()
});
export function gripApexAt(s){
 const d=lapPosition(s);
 return d>=GRIP_APEX.funnelStart&&d<GRIP_APEX.funnelEnd?GRIP_APEX:null;
}
export function widthAt(s){
 const d=lapPosition(s),g=GRIP_APEX;
 let narrow=0;
 if(d>=g.funnelStart&&d<g.throatStart)
  narrow=easedCurvature((d-g.funnelStart)/(g.throatStart-g.funnelStart));
 else if(d>=g.throatStart&&d<g.throatEnd)narrow=1;
 else if(d>=g.throatEnd&&d<g.funnelEnd)
  narrow=1-easedCurvature((d-g.throatEnd)/(g.funnelEnd-g.throatEnd));
 return g.normalWidthMeters-(g.normalWidthMeters-g.minWidthMeters)*narrow;
}
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
 // Position response remains a hard physical rail limit with no
 // artificial speed boost, camera shake or inward lane attraction.
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
// 0.8.3 FAST LOCAL PROJECTION. Exactly the same pilot-owned X/Z motion,
// no steering/position magnet. Replaces 28 line searches (per 120Hz tick)
// with four bounded tangent iterations, following the same C2 centerline.
// The derivative is a unit tangent so short local updates converge even
// on the tight 14m GRIP throat; all guesses remain within the old window.
// Unified original local tangent projection. Only track geometry differs.
export const PROJECTION_083=Object.freeze({
 version:"bounded-local-tangent-083",iterations:4,
 backwardMeters:4,forwardMeters:10,trackMagnet:false,
 forwardOnlyOnAurora:false
});
export function projectWorldToTrack(x,z,hintS,maxForward=PROJECTION_083.forwardMeters){
 const from=Math.max(0,hintS-PROJECTION_083.backwardMeters);
 const to=Math.min(TRIAL.raceLength+2,hintS+
  Math.max(0,Math.min(PROJECTION_083.forwardMeters,maxForward)));
 let best=clamp(hintS,from,to);
 for(let i=0;i<PROJECTION_083.iterations;i++){
  const p=poseAt(best);
  const ds=(x-p.x)*p.forwardX+(z-p.z)*p.forwardZ;
  best=clamp(best+ds,from,to);
  if(Math.abs(ds)<.00001)break;
 }
 const p=poseAt(best);
 const dx=x-p.x,dz=z-p.z;
 return {s:clamp(best,0,TRIAL.raceLength),
  lateral:(dx*p.rightX+dz*p.rightZ)/Math.max(.20,Math.cos(bankAt(best))),
  distance:Math.hypot(dx,dz)};
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
export function stepFlight(st,dt,control={}){
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
  errors.push("track bank leaks into lap seam");
 if(gripApexAt(SKYLINE_LEAP.start)||gripApexAt(MAGNETIC_WALL.start))
  errors.push("grip apex overlaps leap or wall");
 if(CORKSCREW.start-MAGNETIC_WALL.end<850)
  errors.push("spectacle sections are too closely spaced");
 if(widthAt(GRIP_APEX.throatStart)!==GRIP_APEX.minWidthMeters)
  errors.push("grip apex has no physical deck narrowing");
 if(corkscrewAt(SKYLINE_LEAP.start)||corkscrewAt(MAGNETIC_WALL.start))
  errors.push("corkscrew overlaps launch gap or magnetic wall");
 if(GAPS.length!==1)
  errors.push("invalid number of leap gaps");
 return errors;
}
