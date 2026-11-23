// SKYSHIFT 0.11.3 — optical fidelity A/B presets plus bounded 0.11.1 frame profiler.
export const PRESETS=Object.freeze(["baseline","bloom-full","no-bloom","no-smaa","low-dpr","no-wake-sparks","fidelity-off","fidelity-on"]);
const valid=n=>Number.isFinite(n)&&n>=0;
const round=n=>n==null?null:+n.toFixed(3);
const percentile=(a,p)=>a.length?a[Math.max(0,Math.ceil(p*a.length)-1)]:null;
export function perfConfig(search=""){
 const q=new URLSearchParams(search),enabled=q.get("perf")==="1";
 const requested=q.get("perfPreset")||"baseline";
 const preset=enabled&&PRESETS.includes(requested)?requested:"baseline";
 return {enabled,preset,fixedQuality:enabled,validPreset:!enabled||preset===requested};
}
export function newPerfMonitor(capacity=1200){
 const size=Math.max(8,Math.floor(capacity));
 return {size,buffer:new Float32Array(size*8),index:0,count:0,total:0,
  elapsedMs:0,spikeCount:0,slowCount:0,maxFrameMs:0,spikes:[],droppedSimulationMs:0};
}
export function resetPerfMonitor(p){
 p.index=p.count=p.total=p.elapsedMs=p.spikeCount=p.slowCount=p.maxFrameMs=0;
 p.spikes.length=0;p.droppedSimulationMs=0;
}
export function recordPerfFrame(p,d){
 const ms=d.frameMs;
 if(!valid(ms)||ms<=0||ms>250)return false;
 // Direct typed-array stores: avoid allocating a short JS array each frame.
 const off=p.index*8,b=p.buffer;
 b[off]=ms;
 b[off+1]=valid(d.physicsMs)?d.physicsMs:0;
 b[off+2]=valid(d.hudMs)?d.hudMs:0;
 b[off+3]=valid(d.presentationMs)?d.presentationMs:0;
 b[off+4]=valid(d.renderCpuMs)?d.renderCpuMs:0;
 b[off+5]=valid(d.steps)?d.steps:0;
 b[off+6]=valid(d.drawCalls)?d.drawCalls:0;
 b[off+7]=valid(d.triangles)?d.triangles:0;
 p.index=(p.index+1)%p.size;p.count=Math.min(p.size,p.count+1);
 p.total++;p.elapsedMs+=ms;
 p.maxFrameMs=Math.max(p.maxFrameMs,ms);
 if(ms>18)p.slowCount++;
 if(ms>=33.34){
  p.spikeCount++;
  p.spikes.push({runSeconds:round(p.elapsedMs/1000),frameMs:round(ms),
   physicsMs:round(d.physicsMs??0),hudMs:round(d.hudMs??0),
   presentationMs:round(d.presentationMs??0),
   renderCpuMs:round(d.renderCpuMs??0),steps:d.steps??0});
  if(p.spikes.length>24)p.spikes.shift();
 }
 if(valid(d.droppedSimulationMs))p.droppedSimulationMs=d.droppedSimulationMs;
 return true;
}
export function perfSummary(p){
 const keys=["frameMs","physicsMs","hudMs","presentationMs","renderCpuMs",
  "steps","drawCalls","triangles"];
 const breakdown={};
 for(let j=0;j<keys.length;j++){
  const a=[];for(let k=0;k<p.count;k++)a.push(p.buffer[k*8+j]);
  a.sort((x,y)=>x-y);
  breakdown[keys[j]]={p50:round(percentile(a,.5)),
   p95:round(percentile(a,.95)),p99:round(percentile(a,.99)),
   mean:round(a.length?a.reduce((x,y)=>x+y,0)/a.length:null)};
 }
 return {frames:p.total,rollingFrames:p.count,observedFps:round(p.elapsedMs?p.total*1000/p.elapsedMs:null),
  longestFrameMs:round(p.total?p.maxFrameMs:null),spikesOver33ms:p.spikeCount,
  slowerThan18msFraction:round(p.total?p.slowCount/p.total:null),
  droppedSimulationMs:round(p.droppedSimulationMs),
  recentSpikes:[...p.spikes],breakdown,
  note:"JS renderCpuMs does not measure GPU execution time"};
}
// Never block the GPU; a query is read only after QUERY_RESULT_AVAILABLE.
export function gpuTimer(gl,enabled=false){
 const unavailable=reason=>({available:false,begin(){},end(){},reset(){},
  summary(){return {available:false,reason,samples:0,p95Ms:null}}});
 if(!enabled)return unavailable("disabled");
 if(!gl||typeof gl.createQuery!=="function")return unavailable("WebGL2 query unsupported");
 const ext=gl.getExtension?.("EXT_disjoint_timer_query_webgl2");
 if(!ext||!ext.TIME_ELAPSED_EXT)return unavailable("timer extension unsupported");
 const pending=[],samples=[];let active=null,frames=0,disjoint=0,skipped=0;
 function poll(){
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){
   disjoint++;for(const q of pending)gl.deleteQuery(q);
   pending.length=0;samples.length=0;return;
  }
  while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
   const q=pending.shift(),ns=gl.getQueryParameter(q,gl.QUERY_RESULT);
   gl.deleteQuery(q);if(valid(ns)){samples.push(ns/1e6);if(samples.length>450)samples.shift()}
  }
 }
 function reset(){
  if(active){try{gl.endQuery(ext.TIME_ELAPSED_EXT)}catch(_){}gl.deleteQuery(active);active=null}
  for(const q of pending)gl.deleteQuery(q);
  pending.length=0;samples.length=0;frames=0;skipped=0;disjoint=0;
 }
 return {available:true,begin(){
   poll();if(++frames%10!==0||active)return;
   if(pending.length>=3){skipped++;return}
   try{active=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,active)}
   catch(_){if(active)gl.deleteQuery(active);active=null;skipped++}
  },end(){
   if(!active)return;
   try{gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(active)}
   catch(_){gl.deleteQuery(active);skipped++}active=null;
  },reset,summary(){
   poll();const a=[...samples].sort((x,y)=>x-y);
   return {available:true,samples:a.length,p50Ms:round(percentile(a,.5)),
    p95Ms:round(percentile(a,.95)),p99Ms:round(percentile(a,.99)),
    inFlight:pending.length,skipped,disjoint,sampleEveryFrames:10,nonBlocking:true};
  }};
}