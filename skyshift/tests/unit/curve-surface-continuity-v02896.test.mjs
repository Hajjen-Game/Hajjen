import test from "node:test";
import assert from "node:assert/strict";
import {CURVE_CONTINUITY_02896,surfaceContinuityEnabled02896,
 curveRoadMask02896,periodicColorBlend02896,patchCurveColorSeam02896,
 installCurveSurfaceContinuity02896} from "../../curve-surface-continuity-v02896.mjs";
import {vaultStraightMask02891,vaultStraightRanges02891} from "../../shared-straight-edge-parity-v02891.mjs";

test("only Vault >= 0.28.9.6 opts in, older Skyline and Vault preserved",()=>{
 for(const old of ["0.28.9.1","0.28.9.4","0.28.9.5"])
  assert.equal(surfaceContinuityEnabled02896("?track=vault&v="+old),false);
 assert.equal(surfaceContinuityEnabled02896("?track=vault&v=0.28.9.6"),true);
 assert.equal(surfaceContinuityEnabled02896("?track=vault&v=0.28.10"),true);
 assert.equal(surfaceContinuityEnabled02896("?track=vault&v=0.28.9.6&surfaceContinuity=classic"),false);
 assert.equal(surfaceContinuityEnabled02896("?track=skyline&v=0.28.9.6"),false);
 assert.equal(surfaceContinuityEnabled02896("?track=aurora&v=0.28.9.6"),false);
 assert.equal(CURVE_CONTINUITY_02896.addedRoadAttributes,0);
});
test("curve blend only reduces existing road lighting inside safe straights",()=>{
 const ranges=[{from:100,to:230},{from:270,to:310}];
 for(const s of [0,99,100,230,230.1,250,269,310.1,410]){
  assert.equal(vaultStraightMask02891(s,ranges),0);
  assert.equal(curveRoadMask02896(s,{ranges}),0);
 }
 for(let s=0;s<=340;s+=.125){
  const old=vaultStraightMask02891(s,ranges);
  const next=curveRoadMask02896(s,{ranges});
  assert.ok(next>=0&&next<=old+.000001,"must never create glow past a bend");
 }
 assert.ok(curveRoadMask02896(102,{ranges})<vaultStraightMask02891(102,ranges));
 assert.ok(curveRoadMask02896(228,{ranges})<vaultStraightMask02891(228,ranges));
 assert.ok(Math.abs(curveRoadMask02896(104,{ranges})-0.5)<.001);
 assert.equal(curveRoadMask02896(130,{ranges}),1);
 assert.throws(()=>curveRoadMask02896(Infinity,{ranges}),/invalid/);
});
test("periodic chromatic mix is continuous at both antipodal ends",()=>{
 const L=3400,epsilon=.001;
 const neg=periodicColorBlend02896(-L/2+epsilon,L),
  pos=periodicColorBlend02896(L/2-epsilon,L);
 assert.ok(Math.abs(neg-pos)<.00001,"no opposite-lap color slab");
 assert.ok(Math.abs(neg-.5)<.00001);
 assert.ok(Math.abs(periodicColorBlend02896(0,L)-.5)<.000001);
 assert.ok(periodicColorBlend02896(-100,L)>.99);
 assert.ok(periodicColorBlend02896(100,L)<.01);
 // Test differentiability/continuity at the modulo boundary.
 for(let s=-1800;s<=1800;s+=.4){
  const v=periodicColorBlend02896(s,L);
  const next=periodicColorBlend02896(s+.4,L);
  assert.ok(Math.abs(v-next)<.01,"no sudden color jump at "+s);
 }
 assert.throws(()=>periodicColorBlend02896(1,0),/invalid/);
});
const originalFragment=[
 "#include <common>","varying vec2 vTrackCoord;",
 "float wave1D=1.0,wave2D=2.0,wave3D=3.0;",
 "float wave1Color = wave1On * (1.0-smoothstep(-66.0,66.0,wave1D));",
 "float wave2Color = wave2On * (1.0-smoothstep(-66.0,66.0,wave2D));",
 "float wave3Color = wave3On * (1.0-smoothstep(-66.0,66.0,wave3D));",
 "float a93Signed=0.0;float a93Mix=a93Active*(1.0-smoothstep(-66.0,66.0,a93Signed));",
 "float u94Signed=0.0;float u94Mix=u94Active*(1.0-smoothstep(-66.0,66.0,u94Signed));",
 "float s95Signed=0.0;float s95Mix=uS95Active*(1.0-smoothstep(-66.0,66.0,s95Signed));",
 "float whiteCore=0.0;float whiteBloom=0.0;",
 "float r263Fresnel=0.24;"
].join("\n");
test("only original chromatic color source weights are changed; white core remains",()=>{
 const p=patchCurveColorSeam02896("#include <common>",originalFragment);
 assert.equal(p.correctedSources,6);
 for(const name of ["wave1D","wave2D","wave3D","a93Signed",
  "u94Signed","s95Signed"])
  assert.match(p.fragmentShader,new RegExp("curve96Color\\("+name+","));
 assert.match(p.fragmentShader,/wave1On \* \(curve96Color/);
 assert.match(p.fragmentShader,/uCurveWaveSeam02896/);
 assert.match(p.fragmentShader,/halfLap-180\.0/);
 assert.match(p.fragmentShader,/float whiteCore=0.0;float whiteBloom=0.0/);
 assert.match(p.fragmentShader,/float r263Fresnel=0.24/);
 assert.doesNotMatch(p.fragmentShader,/attribute .*02896/);
 assert.throws(()=>patchCurveColorSeam02896("",originalFragment),/requires/);
});
test("old indexed attribute and material are restored exactly on disposal",()=>{
 const first=vaultStraightRanges02891()[0];
 const ss=[first.from-1,first.from,first.from+.2,first.from+2,
  first.from+4,first.from+8,(first.from+first.to)*.5,
  first.to-8,first.to-4,first.to-.2,first.to,first.to+1];
 const ranges=vaultStraightRanges02891();
 const attr={
  count:ss.length,array:new Float32Array(ss.map(s=>vaultStraightMask02891(s,ranges))),
  needsUpdate:false
 };
 const aTrack={count:ss.length,getX(i){return ss[i]}};
 const normal={array:new Float32Array(ss.length*3)};
 const g={getAttribute(name){
  return name==="aTrackCoord"?aTrack:name==="edgeStraightMask02891"?attr:
   name==="normal"?normal:undefined;
 }};
 const old=Float32Array.from(attr.array);
 const mat={isMeshStandardMaterial:true,needsUpdate:false,
  onBeforeCompile(){},customProgramCacheKey(){return "original";}};
 const prior=mat.onBeforeCompile,priorKey=mat.customProgramCacheKey;
 const c=installCurveSurfaceContinuity02896({},{
  material:mat,geometry:g},{enabled:true,curveEnabled:true,waveEnabled:true});
 // The installer uses the real course's default ranges, which may differ
 // from the fixture test ranges. Its only legal modification is attenuation.
 for(let i=0;i<attr.count;i++)
  assert.ok(attr.array[i]>=0&&attr.array[i]<=old[i]+.00001);
 assert.equal(c.active,true);
 const shader={vertexShader:"#include <common>",
  fragmentShader:originalFragment,uniforms:{}};
 mat.onBeforeCompile(shader);
 assert.equal(shader.fragmentShader.includes("curve96Color"),true);
 assert.equal(shader.uniforms.uCurveWaveSeam02896.value,1);
 c.setComparison({curve:0,wave:0});
 for(let i=0;i<attr.count;i++)assert.equal(attr.array[i],old[i]);
 assert.equal(shader.uniforms.uCurveWaveSeam02896.value,0);
 c.setComparison({curve:1,wave:1});
 c.dispose();c.dispose();
 for(let i=0;i<attr.count;i++)assert.equal(attr.array[i],old[i]);
 assert.equal(mat.onBeforeCompile,prior);
 assert.equal(mat.customProgramCacheKey,priorKey);
 assert.equal(g.getAttribute("normal"),normal);
});
