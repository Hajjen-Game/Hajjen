// SKYSHIFT 0.13.5 — read-only, deterministic course feasibility audit.
// Tests the REAL active 0.13.4.8 physics. Does not alter player controls,
// auto-steer, collision, laps, or the zone schedule.
import {TRIAL,COURSE_SEGMENTS,CIRCUIT,headingAt,curvatureAt,widthAt,
 guardrailLateralLimit,positionAt,speedAt,yawAuthorityAt,normalYawFactorAt,
 newFlightState,stepFlight} from "../trial-v01348.mjs";
import {BOOST_CONFIG} from "../flight/boost/boost-v082.mjs";
export const FAIRNESS_0135=Object.freeze({
 version:"handling-track-fairness-0135",
 auditedPhysics:"grip-bonus-half-power-01348",
 arcSampleMeters:1,gripSpeedScale:.935,
 stressZones:Object.freeze([0,4,6,7,8]),
 stressBoosts:Object.freeze([1,BOOST_CONFIG.multiplier]),
 physicallySimulated:true,autopilotAddedToGame:false,
 purpose:"conservative yaw feasibility; not a claim of human-playtest success"
});
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const angularDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function inverseShapedInput(rateFraction){
 const f=clamp(Math.abs(rateFraction),0,1);
 const x=(-.32+Math.sqrt(.32**2+4*.68*f))/(2*.68);
 return Math.sign(rateFraction)*(TRIAL.steerDeadzone+(1-TRIAL.steerDeadzone)*x);
}
export function sectionCurvature(section,step=1){
 let max=0,at=section.start,minWidth=Infinity,opening=0;
 for(let s=section.start;s<=section.end;s+=step){
  const k=Math.abs(curvatureAt(s));
  if(k>max){max=k;at=s;}
  minWidth=Math.min(minWidth,widthAt(s));
  if(k>.0001)opening++;
 }
 return {id:section.id,type:section.type,start:+section.start.toFixed(1),
  end:+section.end.toFixed(1),peakCurvature:+max.toFixed(7),
  peakAtMeters:+at.toFixed(1),radiusMeters:max?+(1/max).toFixed(1):null,
  minRoadWidthMeters:+minWidth.toFixed(2),
  minSteeringRoomMeters:+(minWidth/2-(23.2/2-guardrailLateralLimit(0))).toFixed(2),
  turningSamples:opening};
}
export function yawFeasibility({zone=0,boost=1,section}){
 const peak=sectionCurvature(section);
 const speed=speedAt(peak.peakAtMeters,zone)*boost*FAIRNESS_0135.gripSpeedScale;
 const required=Math.abs(peak.peakCurvature*speed);
 const available=TRIAL.maxYawRate*yawAuthorityAt(speed,1);
 const normal=TRIAL.maxYawRate*normalYawFactorAt(speed);
 const ratio=required?available/required:null;
 return {section:section.id,zone,boost,
  physicalSpeedMetersPerSecond:+speed.toFixed(3),
  requiredYawRadiansPerSecond:+required.toFixed(4),
  maxGripYawRadiansPerSecond:+available.toFixed(4),
  maxNormalYawRadiansPerSecond:+normal.toFixed(4),
  authorityMargin:ratio===null?null:+ratio.toFixed(3),
  centerlineDemandAboveGrip:ratio!==null&&ratio<1,
  limitedWidthMeters:peak.minRoadWidthMeters};
}
// A deliberately explicit "idealized controller" stress probe. This is NOT
// available in gameplay: it only calls the same stepFlight pilot API as a
// human, with steering computed in advance from the known course spline.
// Never use a successful trace as proof that a human can steer this corner.
export function simulateApproach({id="precision-apex",zone=0,grip=true}={}){
 const section=COURSE_SEGMENTS.find(s=>s.id===id);
 if(!section)throw Error("Unknown fairness section "+id);
 const start=Math.max(5,section.start-48),finish=Math.min(TRIAL.length-1,section.end+32);
 const p=positionAt(start,0,0),st=newFlightState();
 Object.assign(st,{s:start,lateral:0,worldX:p.x,worldZ:p.z,
  heading:headingAt(start),currentSpeed:speedAt(start,zone),
  zoneCruiseSpeed:speedAt(start,zone),zoneSpeedStage:zone,
  checkpoint:0,checkpointsPassed:0,gripIntensity:grip?1:0});
 let frames=0,peakError=0,peakLateral=0,rail=0;
 for(;frames<3600&&st.s<finish&&!st.failed;frames++){
  const v=Math.max(TRIAL.startSpeed,st.currentSpeed),lookahead=clamp(v*.15,5,18);
  const desiredYaw=v*curvatureAt(st.s+lookahead)+
   2.4*angularDiff(headingAt(st.s+lookahead),st.heading)-
   st.lateral*.038;
  const authority=TRIAL.maxYawRate*yawAuthorityAt(v,grip?1:0);
  const steer=inverseShapedInput(desiredYaw/authority);
  const event=stepFlight(st,1/120,{steer,grip});
  if(event.railContactStarted)rail++;
  peakError=Math.max(peakError,Math.abs(angularDiff(headingAt(st.s),st.heading)));
  peakLateral=Math.max(peakLateral,Math.abs(st.lateral));
 }
 return {section:id,zone,grip,controller:"bounded lookahead / no player autopilot",
  reachedExit:st.s>=finish&&!st.failed,frames,
  railContacts:rail,railSeconds:+st.railSeconds.toFixed(2),
  peakHeadingErrorDeg:+(peakError*180/Math.PI).toFixed(2),
  peakLateralMeters:+peakLateral.toFixed(2),
  failed:st.failed,finishMeters:+st.s.toFixed(1),
  warning:"This test is an idealized driver, not a human-playability guarantee"};
}
export function auditHandlingFairness(){
 const sections=COURSE_SEGMENTS.filter(x=>x.type==="turn");
 const geometry=sections.map(x=>sectionCurvature(x));
 const envelopes=[];
 for(const zone of FAIRNESS_0135.stressZones)
  for(const boost of FAIRNESS_0135.stressBoosts)
   for(const section of sections)envelopes.push(yawFeasibility({zone,boost,section}));
 const simulations=[];
 for(const id of ["high-speed-sweep","precision-apex","s-hook-switch","back-sweeper","final-corner"])
  for(const zone of [0,4,8])
   for(const grip of [false,true])
    simulations.push(simulateApproach({id,zone,grip}));
 const risky=envelopes.filter(x=>x.centerlineDemandAboveGrip);
 return {version:FAIRNESS_0135.version,
  basePhysicsUnchanged:true,geometry,stressEnvelope:envelopes,
  simulatedDriver:simulations,
  warnings:{centerlineAuthorityCases:risky.length,
   highSpeedGripDeficits:risky.filter(x=>x.zone>=6).length,
   referenceIsNotHumanPlaytest:true,
   oldGhostPhysicsMayDiffer:true},
  thresholds:{minimumNoBoostGripMargin:1,
   note:"Sub-1 theoretical centerline margins are flagged, NOT altered silently"}};
}
