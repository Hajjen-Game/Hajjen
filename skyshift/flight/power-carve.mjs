// Shared Power Carve presentation and observation; explicit track configuration and rhythm selector.
export function createPowerCarveAPI(config,isAurora=()=>false){
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:0));
 const local=s=>((s%config.lapLength)+config.lapLength)%config.lapLength;
 function raceWindowAt(s){
  const d=local(s);
  for(let i=0;i<config.precisionWindows.length;i++){
   const w=config.precisionWindows[i];
   if(d>=w.start&&d<w.end)return i;
  }
  return -1;
 }
 function raceRhythmAt(s){
  const d=local(s);
  // Explicit route-provided rhythm takes precedence; historical adapters retain their defaults.
  if(typeof config.rhythmAt==='function')return config.rhythmAt(d);
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
 function createRacingExperience(){
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
 function resetRacingExperience(st){
  const clean=createRacingExperience();
  for(const key of Object.keys(clean)){
   if(key==="completedWindowKeys")st.completedWindowKeys.clear();
   else st[key]=clean[key];
  }
  return st;
 }
 function observeRacingStep(st,flight,dt,result={}){
  const s=Number.isFinite(flight.s)?flight.s:0;
  const lap=Math.max(1,Math.min(config.laps??3,Math.floor(Math.max(0,s-1e-7)/config.lapLength)+1));
  const widx=result.crashed||result.finished||flight.grounded===false?-1:raceWindowAt(s);
  const current=st.activeWindow,delta=clamp(dt,0,.05);
  st.physicsSamples++;
  let earned=null;
  if(current>=0&&(current!==widx||st.entryLap!==lap)){
   const window=config.precisionWindows[current];
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
     st.releaseTime=config.releaseSeconds;
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
 function stepRacingExperience(st,dt,{
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
  st.fovAddition=clamp(st.fovAddition,0,config.maxFovAdditionDegrees);
  const leanTarget=-turnDirection*(.014*intent+
   .030*energy+.010*st.flow)*safe;
  st.cameraLean+=(leanTarget-st.cameraLean)*(1-Math.exp(-13*h));
  st.cameraLean=clamp(st.cameraLean,
   -config.maxCameraLeanRadians,config.maxCameraLeanRadians);
  const shiftTarget=-turnDirection*(.61*energy+.17*st.flow)*safe;
  st.cameraShiftMeters+=(shiftTarget-st.cameraShiftMeters)*
   (1-Math.exp(-12*h));
  st.cameraShiftMeters=clamp(st.cameraShiftMeters,
   -config.maxCameraShiftMeters,config.maxCameraShiftMeters);
  const pullTarget=(-.40*energy-.13*st.flow)*safe;
  st.cameraPullbackMeters+=(pullTarget-st.cameraPullbackMeters)*
   (1-Math.exp(-11*h));
  st.cameraPullbackMeters=clamp(st.cameraPullbackMeters,
   -config.maxCameraPullbackMeters,0);
  const hullTarget=-turnDirection*(.092*energy+.022*st.flow)*safe;
  st.hullCarve+=(hullTarget-st.hullCarve)*(1-Math.exp(-17*h));
  st.hullCarve=clamp(st.hullCarve,
   -config.maxHullCarveRadians,config.maxHullCarveRadians);
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
 function racingExperienceAudit(st){
  return {version:config.version,cleanCarves:st.cleanCarves,
   missedCarves:st.missedCarves,maxFlowChain:st.maxFlowChain,
   lastCleanId:st.lastCleanId,activeWindow:st.activeWindow>=0?
    config.precisionWindows[st.activeWindow].id:null,
   peakFlow:+st.peakFlow.toFixed(3),
   peakActiveGripEnergy:+st.peakGripEnergy.toFixed(3),
   peakHullCarveDegrees:+(st.peakHullCarve*180/Math.PI).toFixed(2),
   peakAdditionalFovDegrees:+st.peakFovAddition.toFixed(3),
   peakAdditionalLeanDegrees:+(st.peakCameraLean*180/Math.PI).toFixed(3),
   peakCameraShiftMeters:+st.peakCameraShift.toFixed(3),
   protectedFrames:st.protectedFrames,physicsSamples:st.physicsSamples,
   presentationFrames:st.presentationFrames,
   physicalFlightUnchanged:true,autoSteer:false,
   extraDrawCalls:config.extraDrawCalls,extraRenderPasses:0};
 }

 return {raceWindowAt,raceRhythmAt,createRacingExperience,resetRacingExperience,observeRacingStep,stepRacingExperience,racingExperienceAudit};
}
