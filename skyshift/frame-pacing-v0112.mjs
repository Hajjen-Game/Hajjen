// SKYSHIFT 0.11.2 — reuse pose snapshots and interpolated presentation state.
// SKYSHIFT 0.8.0 – air trick-aware render-state interpolation and transparent frame pacing.
// Renderer-neutral helpers. 120Hz simulation remains authoritative.
export const PACING=Object.freeze({
  fixedStep:1/120,maxDelta:.095,maxStepsPerFrame:12,
  frameSampleWindow:120,
  dprCaps:Object.freeze([2,1.75,1.5]),
  lowerAtP95Ms:27,raiseAtP95Ms:17,
  minimumFramesBeforeChange:90,
  qualityCooldownMs:9000
});
export function clamp01(x){return Math.max(0,Math.min(1,x));}
// Optional output object keeps the simulation snapshots in two stable slots.
export function capturePose(f,out={}){
 out.worldX=f.worldX;out.worldZ=f.worldZ;out.y=f.y;
 out.heading=f.heading;out.s=f.s;out.lateral=f.lateral;
 out.steering=f.steering;out.vy=f.vy;out.yawRate=f.yawRate;
 out.sideVelocity=f.sideVelocity;out.grounded=f.grounded;
 out.trickVisualAngle=f.trickVisualAngle??0;
 out.trickActive=f.trickActive??false;
 return out;
}
export function interpolateAngle(a,b,t){
  const delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));
  return a+delta*clamp01(t);
}
const INTERPOLATED_FIELDS=Object.freeze([
 "worldX","worldZ","y","s","lateral","steering","vy","yawRate",
 "sideVelocity","trickVisualAngle"
]);
export function interpolatePose(previous,current,alpha,out={}){
 if(!previous)return current;
 if(!current)return previous;
 const t=clamp01(alpha);
 for(const key of INTERPOLATED_FIELDS)
  out[key]=previous[key]+(current[key]-previous[key])*t;
 out.heading=interpolateAngle(previous.heading,current.heading,t);
 out.grounded=t<.5?previous.grounded:current.grounded;
 out.trickActive=t<.5?previous.trickActive:current.trickActive;
 return out;
}
export function shouldSnapPose(a,b){
  // A checkpoint respawn must never interpolate across world-space void.
  // A completed ±2π trick eventually renormalizes to 0: same physical
 // orientation, but interpolating across a 6.28rad numeric jump would
 // render an accidental instant reverse flip.
 return !a||!b||Math.hypot(b.worldX-a.worldX,b.worldZ-a.worldZ)>8||
  Math.abs((b.trickVisualAngle??0)-(a.trickVisualAngle??0))>Math.PI;
}
export function createFrameClock(){
  return {accum:0,simulatedSeconds:0,droppedSeconds:0,totalSteps:0,
    longestFrameMs:0,stepsPeak:0,interpolationAlpha:0};
}
export function advanceFrame(clock,rawDelta,onStep){
  const delta=Math.max(0,Math.min(rawDelta,PACING.maxDelta));
  // Large tab-resume pauses must not make the ship teleport forward.
  if(rawDelta>delta)clock.droppedSeconds+=rawDelta-delta;
  clock.longestFrameMs=Math.max(clock.longestFrameMs,rawDelta*1000);
  clock.accum+=delta;
  let steps=0;
  while(clock.accum+1e-10>=PACING.fixedStep&&
    steps<PACING.maxStepsPerFrame){
    onStep(PACING.fixedStep);
    clock.accum-=PACING.fixedStep;
    steps++;clock.totalSteps++;clock.simulatedSeconds+=PACING.fixedStep;
  }
  if(clock.accum>=PACING.fixedStep){
    clock.droppedSeconds+=clock.accum-PACING.fixedStep*.5;
    clock.accum=PACING.fixedStep*.5;
  }
  clock.stepsPeak=Math.max(clock.stepsPeak,steps);
  clock.interpolationAlpha=clamp01(clock.accum/PACING.fixedStep);
  return {steps,alpha:clock.interpolationAlpha};
}
export function percentile(values,fraction){
  if(!values.length)return null;
  const sorted=[...values].sort((a,b)=>a-b);
  return sorted[Math.max(0,Math.min(sorted.length-1,Math.ceil(fraction*sorted.length)-1))];
}
export function createFrameMonitor(){
  return {frames:0,elapsedSeconds:0,lastFrameTimes:[],
    allFrameTimes:[],renderCpuTotalMs:0,renderCpuPeakMs:0};
}
export function observeFrame(monitor,rawDelta,renderCpuMs=0){
  if(rawDelta<=0||rawDelta>.25)return;
  const ms=rawDelta*1000;
  monitor.frames++;
  monitor.elapsedSeconds+=rawDelta;
  monitor.renderCpuTotalMs+=Math.max(0,renderCpuMs);
  monitor.renderCpuPeakMs=Math.max(monitor.renderCpuPeakMs,renderCpuMs);
  monitor.lastFrameTimes.push(ms);
  if(monitor.lastFrameTimes.length>PACING.frameSampleWindow)
    monitor.lastFrameTimes.shift();
  monitor.allFrameTimes.push(ms);
  // Most runs are short. Bound the log for very long open browser sessions.
  if(monitor.allFrameTimes.length>20000)monitor.allFrameTimes.shift();
}
export function monitorSummary(monitor){
  return {
    fpsAverage:monitor.elapsedSeconds?monitor.frames/monitor.elapsedSeconds:null,
    frameMsP95:percentile(monitor.allFrameTimes,.95),
    frameMsP99:percentile(monitor.allFrameTimes,.99),
    renderCpuAverageMs:monitor.frames?monitor.renderCpuTotalMs/monitor.frames:null,
    renderCpuPeakMs:monitor.renderCpuPeakMs
  };
}
export function createAdaptiveQuality(){
  return {level:0,lastChangeMs:-PACING.qualityCooldownMs,
    samples:[],changes:0};
}
export function nextAdaptiveRatio(q,frameMs,nowMs,nativeDpr){
  if(!Number.isFinite(frameMs)||frameMs<=0||frameMs>250)return null;
  q.samples.push(frameMs);
  if(q.samples.length>PACING.frameSampleWindow)q.samples.shift();
  if(q.samples.length<PACING.minimumFramesBeforeChange||
    nowMs-q.lastChangeMs<PACING.qualityCooldownMs)return null;
  const p95=percentile(q.samples,.95),before=q.level;
  // A high p95 alone can be caused by old spikes in this rolling sample.
  // Downshift only when BOTH tail latency and median indicate sustained load.
  const median=percentile(q.samples,.50);
  if(p95>PACING.lowerAtP95Ms&&median>PACING.lowerAtP95Ms*.91&&
      q.level<PACING.dprCaps.length-1)q.level++;
  else if(p95<PACING.raiseAtP95Ms&&q.level>0)q.level--;
  if(before===q.level)return null;
  const oldRatio=Math.min(nativeDpr,PACING.dprCaps[before]);
  const newRatio=Math.min(nativeDpr,PACING.dprCaps[q.level]);
  q.lastChangeMs=nowMs;q.samples=[];q.changes++;
  return newRatio===oldRatio?null:newRatio;
}
