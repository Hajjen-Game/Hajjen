// SKYSHIFT 0.12.0 — Racing Experience Evolution.
// Authored track rhythm: player-driven precision carve recognition + protected
// camera/engine resonance. No steering, boost, collision or road mutation.
// Runs in two phases: one tiny sensor call after each real 120 Hz simulation
// step; one stable exponential presentation pass on interpolated frames.
export const RACING_0120=Object.freeze({
 version:"racing-experience-evolution-0120",
 precisionWindows:Object.freeze([
  Object.freeze({id:"precision-apex",name:"PRECISION APEX",start:785,end:990,minGripSeconds:.27}),
  Object.freeze({id:"s-complex",name:"S-COMPLEX",start:1145,end:1638,minGripSeconds:.40}),
  Object.freeze({id:"back-sweeper",name:"BACK SWEEPER",start:1915,end:2159,minGripSeconds:.28}),
  Object.freeze({id:"final-corner",name:"FINAL CARVE",start:2520,end:2740,minGripSeconds:.28})
 ]),
 lapLength:3400,
 releaseSeconds:1.35,
 previewStartMeters:54,
 maxFovAdditionDegrees:1.65,
 maxCameraLeanRadians:.017,
 extraDrawCalls:2,
 extraTrianglesBudget:120,
 extraTextures:0,extraRenderPasses:0,extraLights:0,
 physicalFlightUnchanged:true,originalTrackGeometryUnchanged:true,
 autoSteer:false,automaticGrips:0,
 noFrequentBillboards:true
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
const local=s=>((s%RACING_0120.lapLength)+RACING_0120.lapLength)%RACING_0120.lapLength;
export function raceWindowAt(s){
 const d=local(s);
 for(let i=0;i<RACING_0120.precisionWindows.length;i++){
  const w=RACING_0120.precisionWindows[i];
  if(d>=w.start&&d<w.end)return i;
 }
 return -1;
}
export function createRacingExperience(){
 return {activeWindow:-1,entryLap:-1,railAtEntry:0,
  gripSeconds:0,carveSeconds:0,peakYaw:0,
  lastSampleElapsed:0,lastSampleS:-1,
  cleanCarves:0,missedCarves:0,flowChain:0,maxFlowChain:0,
  lastCleanId:"",lastCleanLap:0,releaseTime:0,flow:0,
  fovAddition:0,cameraLean:0,engineLift:0,
  peakFlow:0,peakFovAddition:0,peakCameraLean:0,
  protectedFrames:0,presentationFrames:0,physicsSamples:0,
  completedWindowKeys:new Set()};
}
export function resetRacingExperience(st){
 st.activeWindow=-1;st.entryLap=-1;st.railAtEntry=0;
 st.gripSeconds=0;st.carveSeconds=0;st.peakYaw=0;
 st.lastSampleElapsed=0;st.lastSampleS=-1;
 st.cleanCarves=0;st.missedCarves=0;st.flowChain=0;st.maxFlowChain=0;
 st.lastCleanId="";st.lastCleanLap=0;st.releaseTime=0;st.flow=0;
 st.fovAddition=0;st.cameraLean=0;st.engineLift=0;
 st.peakFlow=0;st.peakFovAddition=0;st.peakCameraLean=0;
 st.protectedFrames=0;st.presentationFrames=0;st.physicsSamples=0;
 st.completedWindowKeys.clear();
 return st;
}
export function observeRacingStep(st,flight,dt,result={}){
 const s=Number.isFinite(flight.s)?flight.s:0;
 const lap=Math.max(1,Math.min(3,Math.floor(Math.max(0,s-1e-7)/RACING_0120.lapLength)+1));
 const widx=result.crashed||result.finished||flight.grounded===false?-1:raceWindowAt(s);
 const current=st.activeWindow,delta=clamp(dt,0,.05);
 st.physicsSamples++;
 let earned=null;
 if(current>=0&&(current!==widx||st.entryLap!==lap)){
  const window=RACING_0120.precisionWindows[current];
  const key=st.entryLap+":"+window.id;
  const good=st.gripSeconds>=window.minGripSeconds &&
   st.carveSeconds>=window.minGripSeconds &&
   st.peakYaw>=.15 && flight.railContacts===st.railAtEntry &&
   !result.crashed && flight.grounded!==false;
  if(!st.completedWindowKeys.has(key)){
   st.completedWindowKeys.add(key);
   if(good){
    st.cleanCarves++;
    st.flowChain=st.lastCleanLap===st.entryLap?Math.min(4,st.flowChain+1):1;
    st.maxFlowChain=Math.max(st.maxFlowChain,st.flowChain);
    st.lastCleanLap=st.entryLap;
    st.lastCleanId=window.id;
    st.releaseTime=RACING_0120.releaseSeconds;
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
  if(grip>.22&&steer>.2){
   st.gripSeconds+=delta;
   if(yaw>.15)st.carveSeconds+=delta;
  }
  st.peakYaw=Math.max(st.peakYaw,yaw);
 }
 st.lastSampleS=s;st.lastSampleElapsed=flight.elapsed??0;
 return earned;
}
// The contextual signal is read from actual ARC LENGTH, not an arbitrary
// time animation. The camera NEVER follows a spline instead of player heading.
export function raceRhythmAt(s){
 const d=local(s);
 if(d>=785&&d<1007)return "APEX";
 if(d>=1137&&d<1647)return "LINK";
 if(d>=1662&&d<1842)return "WALL";
 if(d>=2050&&d<2810)return "SHADOW";
 if(d>=2840&&d<3005)return "FINALE";
 if(d>=3005&&d<3338)return "CORKSCREW";
 if(d>=160&&d<465)return "SWEEP";
 return "FLOW";
}
export function stepRacingExperience(st,dt,{s=0,steering=0,yawRate=0,speed=44,
 grounded=true,wall=false,corkscrew=false,playing=true}={}){
 const h=clamp(dt,0,.095);
 if(!playing||h<=0)return st;
 const phase=raceRhythmAt(s);
 const protectedSection=wall||corkscrew||grounded===false;
 const safe=protectedSection?0:1;
 if(protectedSection)st.protectedFrames++;
 const steer=clamp(steering,-1,1);
 const yaw=clamp(yawRate/1.24,-1,1);
 const speedFraction=clamp((speed-44)/(101.4-44));
 const intent=phase==="APEX"?.47:phase==="LINK"?.60:
   phase==="FINALE"?.55:phase==="SWEEP"?.25:0;
 st.releaseTime=Math.max(0,st.releaseTime-h);
 const targetFlow=st.releaseTime>0?clamp(st.releaseTime/.90)*.9:0;
 st.flow+=(targetFlow-st.flow)*(1-Math.exp(-8.2*h));
 st.flow=clamp(st.flow);
 // An open camera only on ordinary road: never alter the magnetic wall
 // and the 360-degree corkscrew's physical horizon.
 const targetFov=(.20*speedFraction+intent*.9+st.flow*.94)*safe;
 st.fovAddition+=(targetFov-st.fovAddition)*(1-Math.exp(-7.8*h));
 st.fovAddition=clamp(st.fovAddition,0,RACING_0120.maxFovAdditionDegrees);
 const targetLean=-clamp(steer*.42+yaw*.58,-1,1)*
   (intent*.017+st.flow*.011)*safe;
 st.cameraLean+=(targetLean-st.cameraLean)*(1-Math.exp(-12*h));
 st.cameraLean=clamp(st.cameraLean,-RACING_0120.maxCameraLeanRadians,
  RACING_0120.maxCameraLeanRadians);
 const targetEngine=clamp(st.flow*.42+intent*.13);
 st.engineLift+=(targetEngine-st.engineLift)*(1-Math.exp(-11*h));
 st.peakFlow=Math.max(st.peakFlow,st.flow);
 st.peakFovAddition=Math.max(st.peakFovAddition,st.fovAddition);
 st.peakCameraLean=Math.max(st.peakCameraLean,Math.abs(st.cameraLean));
 st.presentationFrames++;
 return st;
}
export function racingExperienceAudit(st){
 return {version:RACING_0120.version,cleanCarves:st.cleanCarves,
  missedCarves:st.missedCarves,maxFlowChain:st.maxFlowChain,
  lastCleanId:st.lastCleanId,activeWindow:st.activeWindow>=0?
   RACING_0120.precisionWindows[st.activeWindow].id:null,
  peakFlow:+st.peakFlow.toFixed(3),
  peakAdditionalFovDegrees:+st.peakFovAddition.toFixed(3),
  peakAdditionalLeanDegrees:+(st.peakCameraLean*180/Math.PI).toFixed(3),
  protectedFrames:st.protectedFrames,physicsSamples:st.physicsSamples,
  presentationFrames:st.presentationFrames,
  physicalFlightUnchanged:true,autoSteer:false,
  extraDrawCalls:RACING_0120.extraDrawCalls,
  extraRenderPasses:0};
}
