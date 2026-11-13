// SKYSHIFT 0.4.3 — Speed, Smooth Mesh & Frame Pacing
// Intentionally small handling lab: geometric straights, circular arcs and
// linear-curvature transitions. No incidental heading changes, no jump hazards.
// This trial supersedes 0.4.1 ONLY in the active page; the old course is kept.
export const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};

export const TRIAL=Object.freeze({
 id:"handling-lab-v043",name:"HIGH SPEED HANDLING LAB",length:510,
 hoverHeight:1.05,gravity:24,fallDepth:8.5,shieldPenalty:20,
 startSpeed:44,endSpeed:47,
 // Yaw rate is in radians/s. No steering auto-assist or heading snap.
 // Angular authority scales with speed to preserve corner radius and feel.
 maxYawRate:1.24,turnResponse:24,turnRelease:36,steerDeadzone:.055,
 sideSpeed:0
});
// Authored as true constant-curvature arcs, not smoothstep heading gestures.
// Each transition is a short Euler-spiral approximation (linear curvature).
// The core of each bend has EXACTLY constant radius, and every straight has
// EXACTLY zero curvature and a constant mathematical heading.
export const COURSE_SEGMENTS=Object.freeze([
 {id:"launch",type:"straight",start:0,end:95,label:"LAUNCH STRAIGHT"},
 {id:"left",type:"turn",start:95,end:222,entry:20,hold:87,exit:20,
  curvature:-.0120,label:"LONG LEFT SWEEPER"},
 {id:"middle",type:"straight",start:222,end:292,label:"CENTRAL STRAIGHT"},
 {id:"right",type:"turn",start:292,end:424,entry:20,hold:92,exit:20,
  curvature:.0127,label:"LONG RIGHT SWEEPER"},
 {id:"finish",type:"straight",start:424,end:510,label:"FINISH STRAIGHT"}
]);
export const MAX_BANK_RAD=22*Math.PI/180;
export const GAPS=Object.freeze([]);
export const ISLANDS=Object.freeze([]);
export const SPLITS=Object.freeze([]);
export const RISK_CUTS=Object.freeze([]);
export const CHECKPOINTS=Object.freeze([0,240,438]);
export const SECTORS=Object.freeze([
 {s:0,name:"HANDLING LAB",tint:0x43ddf0}
]);
export const ROAD_CUES=Object.freeze([]);
export const ARCHES=Object.freeze([
 {s:9,label:"HANDLING LAB",color:0x55dcea},
 {s:503,label:"FINISH",color:0xffd6a2}
]);
export const GEOMETRY_BREAKS=Object.freeze([0,95,115,202,222,292,312,404,424,510]);
export const SPEED_SECTIONS=Object.freeze([{start:0,end:510,id:"handling"}]);

function turnContribution(s,t){
 const entry=t.entry,hold=t.hold,exit=t.exit,k=t.curvature;
 const d=clamp(s-t.start,0,entry+hold+exit);
 if(d<=entry)return .5*k*d*d/entry;
 if(d<=entry+hold)return k*(.5*entry+d-entry);
 const u=d-entry-hold;
 return k*(.5*entry+hold+u-.5*u*u/exit);
}
export function headingAt(s){
 return COURSE_SEGMENTS.reduce((angle,t)=>
  angle+(t.type==="turn"?turnContribution(s,t):0),0);
}
export function curvatureAt(s){
 for(const t of COURSE_SEGMENTS){
  if(t.type!=="turn"||s<t.start||s>=t.end)continue;
  const d=s-t.start;
  if(d<t.entry)return t.curvature*(d/t.entry);
  if(d<t.entry+t.hold)return t.curvature;
  return t.curvature*(1-(d-t.entry-t.hold)/t.exit);
 }
 return 0;
}
export function bankAt(s){
 return clamp(curvatureAt(s)*25,-MAX_BANK_RAD,MAX_BANK_RAD);
}
export function bankDegreesAt(s){return bankAt(s)*180/Math.PI;}
export function heightAt(s){return 0;}
export function surfaceHeightAt(s,lateral=0){
 return -Math.sin(bankAt(s))*lateral;
}
export function widthAt(s){return 23.2;}
export function speedAt(s){
 return lerp(TRIAL.startSpeed,TRIAL.endSpeed,smooth(s/TRIAL.length));
}
export function sectorAt(s){return 0;}
export function gapAt(s){return null;}
export function nextGap(s){return null;}
export function roadIntervals(s){
 if(s<0||s>=TRIAL.length)return [];
 return [[-widthAt(s)*.5,widthAt(s)*.5]];
}
export function onRoad(s,lateral,radius=.48){
 return roadIntervals(s).some(([a,b])=>lateral>=a+radius&&lateral<=b-radius);
}
export function checkpointFor(s){
 let cp=0;for(const x of CHECKPOINTS)if(s>=x)cp=x;
 return cp;
}
// Preintegrate the authored curvature at fixed arc-length steps. Since heading
// is constant on straight sections, those samples are precisely collinear.
const STEP=.25;
const positions=[{x:0,z:0}];
for(let i=1;i<=Math.ceil((TRIAL.length+8)/STEP);i++){
 const mid=(i-.5)*STEP,angle=headingAt(mid),last=positions[i-1];
 positions.push({x:last.x+Math.sin(angle)*STEP,
  z:last.z-Math.cos(angle)*STEP});
}
export function poseAt(s){
 const d=clamp(s,0,TRIAL.length+6),i=Math.floor(d/STEP),f=d/STEP-i;
 const a=positions[i],b=positions[i+1],heading=headingAt(d);
 return {
  x:lerp(a.x,b.x,f),y:0,z:lerp(a.z,b.z,f),heading,
  forwardX:Math.sin(heading),forwardZ:-Math.cos(heading),
  rightX:Math.cos(heading),rightZ:Math.sin(heading)
 };
}
export function positionAt(s,lateral=0,height=0){
 const p=poseAt(s),bank=bankAt(s),cb=Math.cos(bank),sb=Math.sin(bank);
 const radial=lateral*cb+height*sb;
 return {x:p.x+p.rightX*radial,
  y:-lateral*sb+height*cb,
  z:p.z+p.rightZ*radial};
}
export function surfaceNormalAt(s){
 const p=poseAt(s),b=bankAt(s);
 return {x:p.rightX*Math.sin(b),y:Math.cos(b),z:p.rightZ*Math.sin(b)};
}
// Projection ONLY measures track-relative coordinates. It cannot move, rotate
// or recenter the ship. The search is local in arc length, not a global magnet.
export function projectWorldToTrack(x,z,hintS){
 const span=7,from=Math.max(0,hintS-3.0);
 const to=Math.min(TRIAL.length+2,hintS+span),step=.5;
 let best=clamp(hintS,0,TRIAL.length),bestDist=Infinity;
 for(let s=from;s<to;s+=step){
  const e=Math.min(to,s+step),a=poseAt(s),b=poseAt(e);
  const dx=b.x-a.x,dz=b.z-a.z,den=dx*dx+dz*dz;
  if(den<1e-9)continue;
  const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/den,0,1);
  const cx=a.x+dx*t,cz=a.z+dz*t;
  const d=(x-cx)**2+(z-cz)**2;
  if(d<bestDist){bestDist=d;best=s+(e-s)*t;}
 }
 const s=clamp(best,0,TRIAL.length),p=poseAt(s);
 return {s,lateral:((x-p.x)*p.rightX+(z-p.z)*p.rightZ)/Math.cos(bankAt(s)),
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
 return {
  s:5,lateral:0,sideVelocity:0,worldX:p.x,worldZ:p.z,
  heading:headingAt(5),steering:0,yawRate:0,lastInput:0,
  peakYawRateDeg:0,peakBankDeg:0,
  totalHeadingError:0,maxHeadingErrorDeg:0,headingSamples:0,
  maxLateral:0,offRoadSeconds:0,steerSeconds:0,
  steerReversals:0,lastSteerSign:0,neutralFrames:0,
  y:TRIAL.hoverHeight,vy:0,grounded:true,
  coyote:0,jumpBuffer:0,jumpHold:0,jumps:0,landings:0,
  falls:0,failedJumps:0,clearedGaps:[],shield:100,
  checkpoint:0,elapsed:0,finished:false,failed:false,
  lastCrashS:0,landImpact:0,rightRouteArmed:false,
  routeRewarded:false,routeChoice:null,nearMisses:0,
  prevGrounded:true
 };
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
 const desired=input*TRIAL.maxYawRate;
 const response=Math.abs(input)>.001?TRIAL.turnResponse:TRIAL.turnRelease;
 const k=1-Math.exp(-dt*response);
 st.yawRate=lerp(st.yawRate,desired,k);
 st.steering=input;st.lastInput=steer;
 st.heading+=st.yawRate*dt;
 st.peakYawRateDeg=Math.max(st.peakYawRateDeg,Math.abs(st.yawRate)*180/Math.PI);
 const beforeS=st.s,beforeLateral=st.lateral;
 const forward=speedAt(st.s);
 st.worldX+=Math.sin(st.heading)*forward*dt;
 st.worldZ-=Math.cos(st.heading)*forward*dt;
 const q=projectWorldToTrack(st.worldX,st.worldZ,st.s);
 st.s=q.s;st.lateral=q.lateral;
 st.sideVelocity=(st.lateral-beforeLateral)/dt;
 st.maxLateral=Math.max(st.maxLateral,Math.abs(st.lateral));
 const difference=Math.atan2(Math.sin(st.heading-headingAt(st.s)),
  Math.cos(st.heading-headingAt(st.s)))*180/Math.PI;
 st.totalHeadingError+=Math.abs(difference);st.headingSamples++;
 st.maxHeadingErrorDeg=Math.max(st.maxHeadingErrorDeg,Math.abs(difference));
 st.peakBankDeg=Math.max(st.peakBankDeg,Math.abs(bankDegreesAt(st.s)));
 const solid=onRoad(st.s,st.lateral);
 const ground=surfaceHeightAt(st.s,st.lateral);
 if(!solid)st.offRoadSeconds+=dt;
 const wasGrounded=st.grounded;
 if(wasGrounded&&!solid){st.grounded=false;st.vy=0;}
 if(st.grounded&&solid){st.y=ground+TRIAL.hoverHeight;st.vy=0;}
 else {
  st.vy-=TRIAL.gravity*dt;
  st.y+=st.vy*dt;
  if(solid&&st.vy<=0&&st.y-TRIAL.hoverHeight<=ground&&
     st.y-TRIAL.hoverHeight>=ground-.40){
   st.y=ground+TRIAL.hoverHeight;st.vy=0;
   st.grounded=true;st.landings++;
  }
 }
 const cp=checkpointFor(st.s);
 if(cp>st.checkpoint)st.checkpoint=cp;
 let crashed=false,finished=false;
 if(st.y<ground-TRIAL.fallDepth){
  st.falls++;crashed=true;st.lastCrashS=st.s;
  st.shield=Math.max(0,st.shield-TRIAL.shieldPenalty);
  if(st.shield===0)st.failed=true;
  else {
   const recover=st.checkpoint+8,p=positionAt(recover,0,0);
   st.s=recover;st.lateral=0;st.sideVelocity=0;
   st.worldX=p.x;st.worldZ=p.z;
   st.heading=headingAt(recover);st.steering=0;st.yawRate=0;
   st.lastInput=0;st.y=surfaceHeightAt(recover)+TRIAL.hoverHeight;
   st.vy=0;st.grounded=true;st.lastSteerSign=0;
  }
 }
 if(!st.failed&&st.s>=TRIAL.length-.15&&
    onRoad(TRIAL.length-.05,st.lateral)){
  st.s=TRIAL.length;st.finished=true;finished=true;
 }
 return {kind:st.failed?"failed":finished?"finished":
   crashed?"crashed":"moving",crashed,finished,
   jumped:false,landed:false,cleared:false,routeChoice:null,
   routeReward:false,landImpact:0};
}
export function validateTrial(){
 const errors=[];
 if(COURSE_SEGMENTS[0].start!==0||
    COURSE_SEGMENTS.at(-1).end!==TRIAL.length)
  errors.push("track endpoints incorrect");
 for(let i=1;i<COURSE_SEGMENTS.length;i++)
  if(COURSE_SEGMENTS[i-1].end!==COURSE_SEGMENTS[i].start)
   errors.push("gap or overlap in course segments");
 for(const part of COURSE_SEGMENTS)
  if(part.type==="turn"&&part.entry+part.hold+part.exit!==(part.end-part.start))
   errors.push(part.id+": segment lengths inconsistent");
 for(let s=0;s<TRIAL.length;s+=.5){
  const p=poseAt(s),q=poseAt(s+.25);
  if(Math.hypot(q.x-p.x,q.z-p.z)>.35)
   errors.push("position discontinuity "+s);
  if(Math.abs(bankAt(s))>MAX_BANK_RAD+1e-6)
   errors.push("unsafe bank "+s);
 }
 return errors;
}
