/* Japanese Harmony — mobile performance 4.3
 * Local-only on-device measurements (no analytics, storage, network or timers).
 * Sample requestAnimationFrame solely during a move. Report actual frame times
 * rather than invented FPS. Conservatively reduce decorative extras after
 * repeated slow turns, retaining essential swap, evolution and score feedback.
 */
(function(root){
"use strict";
function create(host=root){
 const raf=host.requestAnimationFrame?.bind(host),cancel=host.cancelAnimationFrame?.bind(host);
 let running=false,handle=0,lastFrame=0,frames=[],peakFx=0,animations=0,slowTurns=0,goodTurns=0,constrained=false;
 let last=null,turns=0;
 function step(now){
  if(!running)return;
  if(lastFrame){
   const dt=now-lastFrame;
   if(dt>0&&dt<250)frames.push(dt);
  }
  lastFrame=now;
  handle=raf(step);
 }
 function begin(){
  if(running||!raf||!cancel||host.document?.hidden)return;
  frames=[];peakFx=0;animations=0;lastFrame=0;running=true;
  handle=raf(step);
 }
 function stop(){
  if(!running)return last;
  running=false;
  if(handle)cancel(handle);
  handle=0;
  const sorted=frames.slice().sort((a,b)=>a-b);
  const count=sorted.length;
  const mean=count?frames.reduce((s,n)=>s+n,0)/count:0;
  const p95=count?sorted[Math.max(0,Math.ceil(count*.95)-1)]:0;
  const over34=frames.filter(n=>n>34).length;
  const slowRate=count?over34/count:0;
  last={frames:count,averageMs:+mean.toFixed(1),p95Ms:+p95.toFixed(1),
   approxFps:count?Math.round(1000/mean):null,slowPct:count?Math.round(slowRate*100):0,
   peakFx,animations};
  turns++;
  // Only tune after a statistically useful sample. A short/tiny swap should
  // not force quality down on an otherwise capable device.
  if(count>=12){
   if(p95>42||slowRate>.27){slowTurns++;goodTurns=0;}
   else if(p95<25&&slowRate<.09){goodTurns++;slowTurns=0;}
   else{slowTurns=0;goodTurns=0;}
   if(slowTurns>=2)constrained=true;
   if(goodTurns>=3)constrained=false;
  }
  frames=[];lastFrame=0;
  return last;
 }
 function fx(active){
  if(running)peakFx=Math.max(peakFx,active);
 }
 function animated(){
  if(running)animations++;
 }
 function summary(){
  return {turns,constrained,latest:last?{...last}:null,running};
 }
 return Object.freeze({begin,stop,fx,animated,summary,get constrained(){return constrained}});
}
root.HarmonyPerf=Object.freeze({create});
})(typeof window!=="undefined"?window:globalThis);
