import test from "node:test";
import assert from "node:assert/strict";
import {createSourceFrameSampler02897,startupSamplerEnabled02897,
 adaptSourcePosition0281,planTrueSharedTunnel0281}
 from "../../true-shared-tunnel-renderer-v0281.mjs";
import {positionAt} from "../../trial-v0165.mjs";
test("same original 368m shared source, no old release switched",()=>{
 for(const v of ["0.28.1","0.28.9.3","0.28.9.5","0.28.9.6"])
  assert.equal(startupSamplerEnabled02897("?track=vault&v="+v),false);
 assert.equal(startupSamplerEnabled02897("?track=vault&v=0.28.9.7"),true);
 assert.equal(startupSamplerEnabled02897("?track=vault&v=0.28.10"),true);
 assert.equal(startupSamplerEnabled02897("?track=vault&v=0.28.9.7&startupSampler=classic"),false);
 assert.equal(startupSamplerEnabled02897("?track=skyline&v=0.28.9.7"),false);
 assert.equal(startupSamplerEnabled02897("?track=aurora&v=0.28.9.7"),false);
});
test("real Skyline banked track positions are retained within original Float32 precision",()=>{
 for(const module of [planTrueSharedTunnel0281(3400)[0],
  planTrueSharedTunnel0281(3400)[3],planTrueSharedTunnel0281(3400)[7]]){
  const direct=adaptSourcePosition0281(positionAt,module);
  const fast=createSourceFrameSampler02897(direct,{maxFrames:1024});
  const xs=[-26,-21.8,-20,-11,0,11,20,21.8,26];
  const ys=[-1.018,-.91,0,12,14.5,18.7,26.8,32];
  for(let j=0;j<120;j++){
   const s=0.15+j*3.03;
   for(const [k,x] of xs.entries()){
    const h=ys[(j+k)%ys.length];
    const a=direct(s,x,h),b=fast(s,x,h);
    const dx=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
    assert.ok(dx<1e-5,"same physical local arch/metal position "+dx);
   }
  }
  // Each longitudinal row has nine different, exact banked cross-section
  // positions, so three genuine evaluations replace nine heavy route calls.
  const stats=fast.stats();
  assert.ok(stats.frameHits>stats.poseCalculations/3);
  assert.ok(stats.substitutedEvaluations>0);
  fast.clear();assert.equal(fast.stats().framesResident,0);
 }
});
test("cache bounded; duplicate source frames never outlive their module",()=>{
 let evaluations=0;
 const direct=(s,x,h)=>{
  evaluations++;
  return {x:s+2*x+3*h,y:s-4*x+h,z:s*.25+x+h};
 };
 const fast=createSourceFrameSampler02897(direct,{maxFrames:16});
 for(let s=0;s<100;s++){
  for(const x of [0,1,12,-22,9]){
   const a=fast(s,x,30);
   assert.equal(a.x,s+2*x+90);
   assert.equal(a.y,s-4*x+30);
  }
 }
 assert.ok(evaluations<500);
 assert.ok(fast.stats().framesResident<=16);
 assert.ok(fast.stats().clears>=4);
 fast.clear();
 assert.equal(fast.stats().framesResident,0);
 assert.throws(()=>createSourceFrameSampler02897(null),/original source/);
 assert.throws(()=>createSourceFrameSampler02897(direct,{maxFrames:2}),/invalid/);
});
