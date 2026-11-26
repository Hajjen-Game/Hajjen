// SKYSHIFT 0.16.3 — deterministic 120Hz real pilot-on-rail reproduction.
// No game play path imports this file. Both node and real WebGL smoke use it.
import {TRIAL,GUARDRAIL,newFlightState,stepFlight,headingAt,positionAt,
 surfaceHeightAt,surfaceNormalAt,guardrailLateralLimit,speedAt}
 from "../trial-v0163.mjs";
import {createTimeTrialState,startTimeTrial,captureTimeTrialSample}
 from "../time-trial-v0160.mjs";
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export const RAIL_SCENARIOS_0163=Object.freeze([
 Object.freeze({id:"lap1-north-right",s:1402,side:1}),
 Object.freeze({id:"lap2-north-left",s:5776,side:1}),
 Object.freeze({id:"lap3-east-glass",s:7299,side:1}),
 Object.freeze({id:"lap3-mid-reverse-contact",s:8817,side:1}),
 Object.freeze({id:"lap3-mid-left-contact",s:8898,side:-1}),
 Object.freeze({id:"lap1-south-grip",s:3139,side:-1}),
 Object.freeze({id:"lap3-ridge-grip",s:8141,side:-1}),
 Object.freeze({id:"lap3-south-rail",s:9301,side:1}),
 Object.freeze({id:"lap3-south-finish-left",s:9852,side:-1}),
 Object.freeze({id:"lap3-final-switchback-right",s:9940,side:1})
]);
export function runRailContactScenario({s=9852,side=-1,seconds=3,controlGrip=true}={}){
 if(!Number.isFinite(s)||s<=5||s>=TRIAL.raceLength-100)
  throw Error("Invalid test arc");
 if(Math.abs(side)!==1)throw Error("Need rail side ±1");
 const dt=1/120,limit=guardrailLateralLimit(s),lateral=side*(limit-.12),
  p=positionAt(s,lateral),normal=surfaceNormalAt(s);
 const st=newFlightState();
 Object.assign(st,{s,lateral,worldX:p.x,worldZ:p.z,
  heading:headingAt(s)+side*.15,
  y:surfaceHeightAt(s,lateral)+TRIAL.hoverHeight*normal.y,
  zoneSpeedStage:8,zoneCruiseSpeed:speedAt(s,8),
  currentSpeed:speedAt(s,8),lap:Math.min(3,Math.floor(s/3400)+1),
  grounded:true,vy:0});
 const ghost=startTimeTrial(createTimeTrialState(),{mode:"time-trial",ship:"manta"});
 let previousS=st.s,maxWorldStep=0,minArcDelta=Infinity,maxArcDelta=0,
  backwards=0,nearRail=0,maxOutwardOnContact=0,firstClampedAt=null,
  lastSampleS=st.s;
 const count=Math.ceil(seconds/dt);
 const last=Math.min(count,1200);
 for(let i=0;i<last;i++){
  if(st.s>=TRIAL.raceLength-15)break;
  const oldX=st.worldX,oldZ=st.worldZ;
  // Press into the rail, then deliberately countersteer back toward road.
  const steer=i<count*.7?side:-side;
  const r=stepFlight(st,dt,{steer,grip:controlGrip});
  const diff=st.s-previousS;
  minArcDelta=Math.min(minArcDelta,diff);
  maxArcDelta=Math.max(maxArcDelta,diff);
  if(diff<-.000001)backwards++;
  previousS=st.s;
  const actualStep=Math.hypot(st.worldX-oldX,st.worldZ-oldZ);
  maxWorldStep=Math.max(maxWorldStep,actualStep);
  if(st.railContacting){
   nearRail++;
   const outward=side*angleDelta(st.heading,headingAt(st.s));
   maxOutwardOnContact=Math.max(maxOutwardOnContact,outward);
  }
  if(st.railHeadingCorrections>0&&firstClampedAt===null)
   firstClampedAt=st.s;
  if(i%12===0){
   captureTimeTrialSample(ghost,{
    elapsed:st.elapsed,s:st.s,worldX:st.worldX,y:st.y,
    worldZ:st.worldZ,heading:st.heading,roll:0,pitch:0
   },{force:true});
   lastSampleS=st.s;
  }
 }
 return {scenario:{s,side,seconds},endS:st.s,
  travelledMeters:st.s-s,
  maxHeadingErrorDegrees:st.maxHeadingErrorDeg,
  railContacts:st.railContactStarts,railContactTicks:nearRail,
  railHeadingCorrections:st.railHeadingCorrections,
  peakBlockedDegrees:st.railPeakBlockedAngle*180/Math.PI,
  maxOutwardOnContactDegrees:maxOutwardOnContact*180/Math.PI,
  backwards,reverseProjectionTicks:st.reverseProjectionTicks,
  minArcDelta,maxArcDelta,maxWorldStep,
  maxSingleStepYawDegrees:st.railMaxSingleStepYaw*180/Math.PI,
  maxInstantCorrectionDegrees:st.railMaxInstantCorrection*180/Math.PI,
  blockedGripTicks:st.railGripBlockedTicks,
  railImpactDebug:st.railContactDiagnostics,
  invalidGhostSamples:ghost.invalidSamples,
  validGhostSamples:ghost.samplesWritten,
  finalLateral:st.lateral,physicalRailLimit:guardrailLateralLimit(st.s),
  lastSampleS,failed:st.failed,finished:st.finished};
}
