// SKYSHIFT 0.4.3 – render-state interpolation and transparent frame pacing.
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
export function capturePose(f){
  return {
    worldX:f.worldX,worldZ:f.worldZ,y:f.y,
    heading:f.heading,s:f.s,lateral:f.lateral,
    steering:f.steering,vy:f.vy,grounded:f.grounded
  };
}
export function interpolateAngle(a,b,t){
  const delta=Math.atan2(Math.sin(b-a),Math.cos(b-a));
  return a+delta*clamp01(t);
}
export function interpolatePose(previous,current,alpha){
  if(!previous)return current;
  if(!current)return previous;
  const t=clamp01(alpha),result={};
  for(const key of ["worldX","worldZ","y","s","lateral","steering","vy"])
    result[key]=previous[key]+(current[key]-previous[key])*t;
  result.heading=interpolateAngle(previous.heading,current.heading,t);
  result.grounded=t<.5?previous.grounded:current.grounded;
  return result;
}
export function shouldSnapPose(a,b){
  // A checkpoint respawn must never interpolate across world-space void.
  return !a||!b||Math.hypot(b.worldX-a.worldX,b.worldZ-a.worldZ)>8;
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
  if(p95>PACING.lowerAtP95Ms&&q.level<PACING.dprCaps.length-1)q.level++;
  else if(p95<PACING.raiseAtP95Ms&&q.level>0)q.level--;
  if(before===q.level)return null;
  const oldRatio=Math.min(nativeDpr,PACING.dprCaps[before]);
  const newRatio=Math.min(nativeDpr,PACING.dprCaps[q.level]);
  q.lastChangeMs=nowMs;q.samples=[];q.changes++;
  return newRatio===oldRatio?null:newRatio;
}
