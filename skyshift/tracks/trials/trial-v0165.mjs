import {ACTIVE_TRACK_0160,isAurora,isVault} from "../shared/track-selection-v0160.mjs";
const isFlowTrack=()=>isAurora()||isVault();
// SKYSHIFT 0.16.4 — SAME physics for all circuits; geometry only changes course.
import {BOOST_PADS,BOOST_CONFIG,initBoostState,stepBoostState} from "../../flight/boost/boost-v0160.mjs";
import {createFlightPhysics} from "../../flight/flight-physics.mjs";
import {createTrackSampler} from "../shared/track-sampler.mjs";
import {STEERING_AUTHORITY,normalYawFactorAt,yawAuthorityAt,steeringBalanceAt} from "../../flight/steering-authority-v01348.mjs";
import {AIR_TRICKS} from "../../flight/air-tricks-v083.mjs";
import {TRACK_3D,SKYLINE_LEAP,elevationAt,gradeAt,pitchAt,groundNormalAt,jumpAt,upcomingJump,elevationAudit,MAGNETIC_WALL,magneticBankAt,magneticWallAt,CORKSCREW,corkscrewBankAt,corkscrewAt,corkscrewProgressAt} from "../shared/track-3d-v0160.mjs";
import {CIRCUIT,CIRCUIT_LENGTH,COURSE_SEGMENTS as LOOP_SEGMENTS,
 lapPosition,sectionAt,circuitPlanSummary as baseCircuitPlanSummary} from "../shared/circuit-layout-v0160.mjs";
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
// Geometry is owned by the shared sampler below; authored route rules stay here.
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
export const {easedCurvature,integratedEasedCurvature,headingAt,curvatureAt,bankAt,bankDegreesAt,heightAt,surfaceHeightAt,LOOP_CLOSURE_ERROR_METERS,poseAt,surfaceNormalAt,positionAt,createStaticPositionSampler}=createTrackSampler({
 lapLength:CIRCUIT.lapLength,sections:COURSE_SEGMENTS,apexPulses:TECHNICAL_APEX_PULSES,
 lapPosition,elevationAt,groundNormalAt,magneticBankAt,corkscrewBankAt,step:STEP
});
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
// The current route is a consumer of the shared flight engine, not its owner.
export const {newFlightState,stepFlight}=createFlightPhysics({
 rules:TRIAL,circuit:CIRCUIT,jump:SKYLINE_LEAP,
 positionAt,headingAt,surfaceHeightAt,lapPosition,nextGap,speedAt,corkscrewAt,bankAt,poseAt,projectWorldToTrack,constrainToGuardrail,gripApexAt,bankDegreesAt,onRoad,surfaceNormalAt,gapAt,guardrailLateralLimit,magneticWallAt,corkscrewBankAt,shapeSteer
},{initBoostState,stepBoostState});

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
