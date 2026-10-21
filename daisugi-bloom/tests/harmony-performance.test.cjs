"use strict";
// Japanese Harmony 4.3 — deterministic per-turn performance metering.
// No data storage, no network, no device-specific results invented.
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
const assert=require("node:assert/strict");
const js=fs.readFileSync(path.join(__dirname,"../harmony/performance.js"),"utf8");
const host={document:{hidden:false}};
let now=0,seq=0,frames=new Map();
host.requestAnimationFrame=(cb)=>{const id=++seq;frames.set(id,cb);return id};
host.cancelAnimationFrame=(id)=>frames.delete(id);
vm.runInNewContext(js,{window:host,globalThis:host});
const meter=host.HarmonyPerf.create(host);
function sample(dt,count=36){
 meter.begin();
 meter.animated();
 meter.fx(24);
 for(let i=0;i<count;i++){
  now+=dt;
  const current=[...frames.values()];
  frames.clear();
  for(const frame of current)frame(now);
 }
 const result=meter.stop();
 assert.equal(frames.size,0,"No lingering rAF callbacks after a turn");
 return result;
}
const good=sample(16.7);
assert(good.frames>=30&&good.approxFps>=55&&good.approxFps<=62);
assert.equal(good.peakFx,24);
assert.equal(good.animations,1);
assert.equal(meter.summary().turns,1);
assert.equal(meter.constrained,false);
const slow1=sample(51),slow2=sample(53);
assert(slow1.p95Ms>42&&slow2.slowPct===100);
assert.equal(meter.constrained,true,"Repeated bad turns should trim extras");
assert.equal(meter.summary().constrained,true);
sample(16.6);sample(16.6);sample(16.6);
assert.equal(meter.constrained,false,"Recovery should restore normal decorative FX");
assert.equal(meter.summary().turns,7);
host.document.hidden=true;
meter.begin();
assert.equal(meter.summary().running,false,"Hidden pages should not start frame metering");
host.document.hidden=false;
meter.begin();meter.begin();
assert.equal(frames.size,1,"Only one RAF sampler may run at a time");
meter.stop();
assert.equal(frames.size,0);
console.log("PASS Harmony 4.3 – frame stats, bounded sampler, adaptive FX and recovery");
