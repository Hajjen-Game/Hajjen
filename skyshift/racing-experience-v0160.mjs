import {isAurora} from "./tracks/shared/track-selection-v0160.mjs";
// SKYSHIFT 0.12.1 — Power Carve & Racing Experience Refinement.
// Unlike 0.12.0, tangible motion starts DURING pilot-held GRIP + STEER, not
// only following a rare clean-window event. All outputs are presentation only.
export const RACING_0121=Object.freeze({
 version:"power-carve-racing-experience-0121",
 precisionWindows:Object.freeze(isAurora()?[
  Object.freeze({id:"aurora-glass",name:"GLASS SWEEP",start:252,end:444,minGripSeconds:.15}),
  Object.freeze({id:"aurora-north",name:"NORTH SWITCHBACK",start:1245,end:1690,minGripSeconds:.24}),
  Object.freeze({id:"aurora-luminous",name:"LUMINOUS SWEEP",start:2000,end:2195,minGripSeconds:.16}),
  Object.freeze({id:"aurora-south",name:"SOUTH SWITCHBACK",start:2970,end:3390,minGripSeconds:.24})
 ]:[
  Object.freeze({id:"precision-apex",name:"PRECISION APEX",start:785,end:990,minGripSeconds:.18}),
  Object.freeze({id:"s-complex",name:"S-COMPLEX",start:1145,end:1638,minGripSeconds:.22}),
  Object.freeze({id:"back-sweeper",name:"BACK SWEEPER",start:1915,end:2159,minGripSeconds:.20}),
  Object.freeze({id:"final-corner",name:"FINAL CARVE",start:2520,end:2740,minGripSeconds:.20})
 ]),
 lapLength:3400,releaseSeconds:1.65,
 maxFovAdditionDegrees:3.25,
 maxCameraLeanRadians:.038,
 maxCameraShiftMeters:.62,
 maxCameraPullbackMeters:.45,
 maxHullCarveRadians:.099,
 extraDrawCalls:0,extraTriangles:0,extraTextures:0,
 extraRenderPasses:0,extraLights:0,autoSteer:false,
 physicalFlightUnchanged:true,originalTrackGeometryUnchanged:true,
 noNewPillars:true,noCameraShakes:true
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const local=s=>((s%RACING_0121.lapLength)+RACING_0121.lapLength)%RACING_0121.lapLength;
export function raceWindowAt(s){
 const d=local(s);
 for(let i=0;i<RACING_0121.precisionWindows.length;i++){
  const w=RACING_0121.precisionWindows[i];
  if(d>=w.start&&d<w.end)return i;
 }
 return -1;
}
export function raceRhythmAt(s){
 const d=local(s);
 if(isAurora()){
  if(d>=1240&&d<1700||d>=2950)return "SWITCHBACK";
  if(d>=910&&d<1180)return "LUMEN PASS";
  if(d>=250&&d<880||d>=1987&&d<2390)return "FLOW";
  return "OPEN SPEED";
 }
 if(d>=785&&d<1007)return "APEX";
 if(d>=1137&&d<1647)return "LINK";
 if(d>=1662&&d<1842)return "WALL";
 if(d>=2050&&d<2810)return "SHADOW";
 if(d>=2840&&d<3005)return "FINALE";
 if(d>=3005&&d<3338)return "CORKSCREW";
 if(d>=160&&d<465)return "SWEEP";
 return "FLOW";
}
export function createRacingExperience(){
 return {
  activeWindow:-1,entryLap:-1,railAtEntry:0,gripSeconds:0,
  carveSeconds:0,peakYaw:0,physicsSamples:0,
  lastSampleS:-1,lastSampleElapsed:0,
  cleanCarves:0,missedCarves:0,flowChain:0,maxFlowChain:0,
  lastCleanId:"",lastCleanLap:0,releaseTime:0,flow:0,
  gripEnergy:0,hullCarve:0,cameraLean:0,cameraShiftMeters:0,
  cameraPullbackMeters:0,fovAddition:0,engineLift:0,
  peakFlow:0,peakGripEnergy:0,peakHullCarve:0,
  peakFovAddition:0,peakCameraLean:0,peakCameraShift:0,
  protectedFrames:0,presentationFrames:0,
  completedWindowKeys:new Set()
 };
}
export function resetRacingExperience(st){
 const clean=createRacingExperience();
 for(const key of Object.keys(clean)){
  if(key==="completedWindowKeys")st.completedWindowKeys.clear();
  else st[key]=clean[key];
 }
 return st;
}
export function observeRacingStep(st,flight,dt,result={}){
 const s=Number.isFinite(flight.s)?flight.s:0;
 const lap=Math.max(1,Math.min(3,Math.floor(Math.max(0,s-1e-7)/RACING_0121.lapLength)+1));
 const widx=result.crashed||result.finished||flight.grounded===false?-1:raceWindowAt(s);
 const current=st.activeWindow,delta=clamp(dt,0,.05);
 st.physicsSamples++;
 let earned=null;
 if(current>=0&&(current!==widx||st.entryLap!==lap)){
  const window=RACING_0121.precisionWindows[current];
  const key=st.entryLap+":"+window.id;
  const clean=st.gripSeconds>=window.minGripSeconds&&
   st.carveSeconds>=window.minGripSeconds&&st.peakYaw>=.11&&
   flight.railContacts===st.railAtEntry&&!result.crashed&&
   flight.grounded!==false;
  if(!st.completedWindowKeys.has(key)){
   st.completedWindowKeys.add(key);
   if(clean){
    st.cleanCarves++;
    st.flowChain=st.lastCleanLap===st.entryLap?
     Math.min(4,st.flowChain+1):1;
    st.maxFlowChain=Math.max(st.maxFlowChain,st.flowChain);
    st.lastCleanLap=st.entryLap;st.lastCleanId=window.id;
    st.releaseTime=RACING_0121.releaseSeconds;
    st.flow=Math.max(st.flow,.35);
    earned={id:window.id,name:window.name,lap:st.entryLap,
     gripSeconds:+st.gripSeconds.toFixed(2),chain:st.flowChain};
   }else{st.missedCarves++;st.flowChain=0;}
  }
  st.activeWindow=-1;
 }
 if(widx>=0&&st.activeWindow!==widx){
  st.activeWindow=widx;st.entryLap=lap;
  st.gripSeconds=0;st.carveSeconds=0;st.peakYaw=0;
  st.railAtEntry=flight.railContacts;
 }
 if(st.activeWindow>=0){
  const grip=clamp(flight.gripIntensity);
  const steer=Math.abs(clamp(flight.steering,-1,1));
  const yaw=Math.abs(Number.isFinite(flight.yawRate)?flight.yawRate:0);
  if(grip>.19&&steer>.18){
   st.gripSeconds+=delta;
   if(yaw>.11)st.carveSeconds+=delta;
  }
  st.peakYaw=Math.max(st.peakYaw,yaw);
 }
 st.lastSampleS=s;st.lastSampleElapsed=flight.elapsed??0;
 return earned;
}
// Add only spring-smoothed, bounded READ-ONLY movement relative to the
// existing chase pose. The camera never takes over physical yaw or heading.
export function stepRacingExperience(st,dt,{
 s=0,steering=0,yawRate=0,gripIntensity=0,
 speed=44,grounded=true,wall=false,corkscrew=false,playing=true
}={}){
 const h=clamp(dt,0,.095);
 if(!playing||h<=0)return st;
 const phase=raceRhythmAt(s);
 const protectedSection=wall||corkscrew||grounded===false;
 const safe=protectedSection?0:1;
 if(protectedSection)st.protectedFrames++;
 const steer=clamp(steering,-1,1),yaw=clamp(yawRate/1.24,-1,1);
 const grip=clamp(gripIntensity);
 const actualCarve=grip*Math.min(1,Math.abs(steer)*1.3)*
  Math.min(1,.30+Math.abs(yaw)*1.2)*safe;
 const turnDirection=clamp(steer*.7+yaw*.3,-1,1);
 const speedFraction=clamp((speed-44)/(101.4-44));
 const intent=phase==="APEX"?.58:phase==="LINK"?.62:
  phase==="FINALE"?.53:phase==="SWEEP"?.31:0;
 st.releaseTime=Math.max(0,st.releaseTime-h);
 const targetFlow=st.releaseTime>0?clamp(st.releaseTime/1.05):0;
 st.flow+=(targetFlow-st.flow)*(1-Math.exp(-7.5*h));
 st.flow=clamp(st.flow);
 st.gripEnergy+=(actualCarve-st.gripEnergy)*
  (1-Math.exp(-(actualCarve>st.gripEnergy?16:9.5)*h));
 st.gripEnergy=clamp(st.gripEnergy);
 const energy=st.gripEnergy;
 // Strong feel while gripping, soft release; contextual curve grammar is
 // secondary, not a substitute for actually steering the craft.
 const fovTarget=(.22*speedFraction+.55*intent+
  2.42*energy+1.15*st.flow)*safe;
 st.fovAddition+=(fovTarget-st.fovAddition)*(1-Math.exp(-9.7*h));
 st.fovAddition=clamp(st.fovAddition,0,RACING_0121.maxFovAdditionDegrees);
 const leanTarget=-turnDirection*(.014*intent+
  .030*energy+.010*st.flow)*safe;
 st.cameraLean+=(leanTarget-st.cameraLean)*(1-Math.exp(-13*h));
 st.cameraLean=clamp(st.cameraLean,
  -RACING_0121.maxCameraLeanRadians,RACING_0121.maxCameraLeanRadians);
 const shiftTarget=-turnDirection*(.61*energy+.17*st.flow)*safe;
 st.cameraShiftMeters+=(shiftTarget-st.cameraShiftMeters)*
  (1-Math.exp(-12*h));
 st.cameraShiftMeters=clamp(st.cameraShiftMeters,
  -RACING_0121.maxCameraShiftMeters,RACING_0121.maxCameraShiftMeters);
 const pullTarget=(-.40*energy-.13*st.flow)*safe;
 st.cameraPullbackMeters+=(pullTarget-st.cameraPullbackMeters)*
  (1-Math.exp(-11*h));
 st.cameraPullbackMeters=clamp(st.cameraPullbackMeters,
  -RACING_0121.maxCameraPullbackMeters,0);
 const hullTarget=-turnDirection*(.092*energy+.022*st.flow)*safe;
 st.hullCarve+=(hullTarget-st.hullCarve)*(1-Math.exp(-17*h));
 st.hullCarve=clamp(st.hullCarve,
  -RACING_0121.maxHullCarveRadians,RACING_0121.maxHullCarveRadians);
 const engineTarget=clamp(.09*intent+.77*energy+.35*st.flow)*safe;
 st.engineLift+=(engineTarget-st.engineLift)*(1-Math.exp(-16*h));
 st.peakFlow=Math.max(st.peakFlow,st.flow);
 st.peakGripEnergy=Math.max(st.peakGripEnergy,energy);
 st.peakHullCarve=Math.max(st.peakHullCarve,Math.abs(st.hullCarve));
 st.peakFovAddition=Math.max(st.peakFovAddition,st.fovAddition);
 st.peakCameraLean=Math.max(st.peakCameraLean,Math.abs(st.cameraLean));
 st.peakCameraShift=Math.max(st.peakCameraShift,Math.abs(st.cameraShiftMeters));
 st.presentationFrames++;
 return st;
}
export function racingExperienceAudit(st){
 return {version:RACING_0121.version,cleanCarves:st.cleanCarves,
  missedCarves:st.missedCarves,maxFlowChain:st.maxFlowChain,
  lastCleanId:st.lastCleanId,activeWindow:st.activeWindow>=0?
   RACING_0121.precisionWindows[st.activeWindow].id:null,
  peakFlow:+st.peakFlow.toFixed(3),
  peakActiveGripEnergy:+st.peakGripEnergy.toFixed(3),
  peakHullCarveDegrees:+(st.peakHullCarve*180/Math.PI).toFixed(2),
  peakAdditionalFovDegrees:+st.peakFovAddition.toFixed(3),
  peakAdditionalLeanDegrees:+(st.peakCameraLean*180/Math.PI).toFixed(3),
  peakCameraShiftMeters:+st.peakCameraShift.toFixed(3),
  protectedFrames:st.protectedFrames,physicsSamples:st.physicsSamples,
  presentationFrames:st.presentationFrames,
  physicalFlightUnchanged:true,autoSteer:false,
  extraDrawCalls:RACING_0121.extraDrawCalls,extraRenderPasses:0};
}
