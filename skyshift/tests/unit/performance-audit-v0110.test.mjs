import test from "node:test";
import assert from "node:assert/strict";
import {perfConfig,newPerfMonitor,recordPerfFrame,perfSummary,resetPerfMonitor,gpuTimer} from "../../core/performance-audit-v0110.mjs";
test("A/B variants are opt-in",()=>{
 assert.equal(perfConfig("?perfPreset=no-bloom").preset,"baseline");
 for(const mode of ["baseline","no-bloom","no-smaa","low-dpr","no-wake-sparks"])
  assert.equal(perfConfig("?perf=1&perfPreset="+mode).preset,mode);
 assert.equal(perfConfig("?perf=1&perfPreset=invalid").validPreset,false);
});
test("bounded ring buffer stores distributions and spike details",()=>{
 const s=newPerfMonitor(8);
 for(let i=0;i<20;i++)recordPerfFrame(s,{frameMs:20,physicsMs:2,hudMs:.5,
  presentationMs:3,renderCpuMs:6,steps:2,drawCalls:24,triangles:2500});
 assert.equal(s.buffer.length,64);
 assert.equal(perfSummary(s).frames,20);
 assert.equal(perfSummary(s).rollingFrames,8);
 assert.equal(perfSummary(s).breakdown.physicsMs.p95,2);
 assert.equal(perfSummary(s).breakdown.drawCalls.mean,24);
 assert.equal(recordPerfFrame(s,{frameMs:600}),false);
 recordPerfFrame(s,{frameMs:40,steps:4,physicsMs:9});
 assert.equal(perfSummary(s).spikesOver33ms,1);
 assert.equal(perfSummary(s).recentSpikes[0].steps,4);
 resetPerfMonitor(s);assert.equal(perfSummary(s).frames,0);
});
test("unavailable GPU query does not fabricate values",()=>{
 assert.equal(gpuTimer(null).summary().available,false);
 assert.equal(gpuTimer(null,true).summary().p95Ms,null);
});
test("GPU result polled only after query available",()=>{
 let ready=false,n=0;const deleted=[];
 const gl={QUERY_RESULT_AVAILABLE:1,QUERY_RESULT:2,
  getExtension:()=>({TIME_ELAPSED_EXT:3,GPU_DISJOINT_EXT:4}),
  getParameter:()=>false,createQuery:()=>++n,beginQuery(){},endQuery(){},
  getQueryParameter:(_q,key)=>key===1?ready:21000000,
  deleteQuery:q=>deleted.push(q)};
 const timer=gpuTimer(gl,true);
 for(let i=0;i<10;i++)timer.begin();
 timer.end();assert.equal(timer.summary().samples,0);
 ready=true;assert.equal(timer.summary().p95Ms,21);
 timer.reset();assert.deepEqual(deleted,[1]);
});
import {createEnduranceAudit} from "../../core/performance-audit-v0114.mjs";
test("0.29.2 endurance sampling is bounded, interval based and never fabricates temperature",async()=>{
 let now=Date.UTC(2026,10,27),reads=0;
 const a=createEnduranceAudit({clock:()=>now,intervalMs:10000,capacity:2});
 const monitor={total:0,elapsedMs:0};
 const read=()=>({read:++reads});
 a.reset();a.sample(monitor,read);assert.equal(reads,0);
 const battery={level:.8,charging:false};
 a.attachBattery({getBattery:async()=>battery});
 await new Promise(resolve=>setImmediate(resolve));
 for(let i=0;i<3;i++){now+=10000;monitor.total+=600;monitor.elapsedMs+=10000;a.sample(monitor,read);}
 const r=a.report();assert.equal(r.samples.length,2);assert.equal(r.discarded,1);
 assert.equal(r.samples[0].intervalObservedFps,60);assert.equal(r.samples[0].battery.levelPercent,80);
 assert.equal(r.temperatureC,null);assert.equal(r.powerWatts,null);
 battery.level=.79;now+=1000;monitor.total+=60;monitor.elapsedMs+=1000;a.sample(monitor,read,true);
 assert.equal(a.report().samples.at(-1).battery.levelPercent,79);
 a.reset();assert.equal(a.report().samples.length,0);
});
