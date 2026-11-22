import test from "node:test";
import assert from "node:assert/strict";
import {ZONE_PALETTES} from "./zone-wave-v060.mjs";
import {vaultStraightMask02891} from "./shared-straight-edge-parity-v02891.mjs";
import {ROAD_SPILL_COVE_02895,roadSpillEnabled02895,coveWaveEnabled02895,
 smoothPulse02895,sampleEdgeSpill02895,patchRoadSpill02895,
 patchWallCoveWave02895,installWaveCoupledCove02895,installRoadSpill02895}
 from "./road-spill-wave-coves-v02895.mjs";

class Color{
 constructor(value){this.value=value;}
 setHex(v){this.value=v;return this;}
 getHex(){return this.value;}
}
const THREE={Color};
const frag=[
 "#include <common>",
 "varying vec2 vTrackCoord;",
 "varying float vEdgeStraight02891;",
 "float r263Side=abs(vTrackCoord.x);",
 "float r263CoveBand=1.0;",
 "vec3 r263Convolved=vec3(0.045,0.54,0.90)*",
 " (r263Source.x*r263CoveBand*0.38);",
 "float r263Fresnel=0.24;",
 "reflectedLight.directSpecular+=u94Tint*u94Cool*0.065;",
 "}"
].join("\n");
const basic="#include <common>\nvarying float vRebirthTrack;\n"+
 "vec3 d26Ice=vec3(0.050,0.69,0.88)*d26ColdPower;";
const physical="#include <common>\nvarying float vPbrTrack0260;\n"+
 "pbrFixture0260.color=vec3(0.07,0.64,0.97)*(2.80*pbrColdFalloff0260);\n"+
 "l261Cool.color=vec3(0.07,0.64,0.97);\n"+
 "l261Cool.color=vec3(0.07,0.64,0.97);";
const v="#include <common>\n#include <project_vertex>";

test("0.28.9.5 gates only Vault and supports independent rollback",()=>{
 const base="?track=vault&v=";
 for(const old of ["0.28.9.1","0.28.9.2","0.28.9.3","0.28.9.4"]){
  assert.equal(roadSpillEnabled02895(base+old),false);
  assert.equal(coveWaveEnabled02895(base+old),false);
 }
 assert.equal(roadSpillEnabled02895(base+"0.28.9.5"),true);
 assert.equal(coveWaveEnabled02895(base+"0.28.9.5"),true);
 assert.equal(roadSpillEnabled02895(base+"0.28.10"),true);
 assert.equal(roadSpillEnabled02895(base+"0.28.9.5&roadSpill=classic"),false);
 assert.equal(coveWaveEnabled02895(base+"0.28.9.5&coveWave=classic"),false);
 assert.equal(roadSpillEnabled02895("?track=skyline&v=0.28.9.5"),false);
 assert.equal(coveWaveEnabled02895("?track=aurora&v=0.28.9.5"),false);
 assert.equal(ROAD_SPILL_COVE_02895.noNewAttributes,true);
});
test("pixel-continuous edge pool follows exact 6.5m / 24m reused source",()=>{
 for(const center of [4.5+3.25,4.5+3.25+24,4.5+3.25+24*4]){
  const exact=center*340/368;
  assert.ok(smoothPulse02895(exact)>.99,"real source center "+exact);
  assert.ok(smoothPulse02895(exact+(11.0*340/368))<.01,
   "the dark interval between actual lamps must stay DARK");
 }
 let previous=smoothPulse02895(8);
 for(let s=8.05;s<=32;s+=.05){
  const next=smoothPulse02895(s);
  assert.ok(Math.abs(previous-next)<.10,"analytic derivative has no shader slabs");
  previous=next;
 }
});
test("straight-only cyan reflected spill cannot escape turn clearance",()=>{
 // Node's default selected circuit is Skyline; Vault turn stations are
 // verified in browser with ?track=vault. Here prove that ANY actual
 // straight/curve clearance mask is respected without source leakage.
 for(const s of [292,540,955,1450,1995])
  for(const lateral of [-10.5,-9,-7,7,9,10.5])
   assert.equal(sampleEdgeSpill02895(s,lateral,{straightMask:()=>0}),0);
 for(const s of [110,1210,1840])
  assert.ok(sampleEdgeSpill02895(s,10)>=0);
 let lit=0;
 for(let s=12;s<250;s+=.25)
  if(sampleEdgeSpill02895(s,10.3)>.4)lit++;
 assert.ok(lit>10,"visible source pulses on straight");
 assert.ok(sampleEdgeSpill02895(52,5)<sampleEdgeSpill02895(52,10.3)+.00001);
});
test("road PBR modification is finite, no extra attribute, real wave palette",()=>{
 const p=patchRoadSpill02895(v,frag,{lowMemory:false});
 assert.equal(p.vertexShader,v);
 assert.match(p.fragmentShader,/s95Delta/);
 assert.match(p.fragmentShader,/s95BroadTrim/);
 assert.match(p.fragmentShader,/r263Source.x\*r263CoveBand\*0.38\*s95BroadTrim/);
 assert.match(p.fragmentShader,/smoothstep\(-66.0,66.0/);
 assert.match(p.fragmentShader,/clamp\(vEdgeStraight02891/);
 assert.match(p.fragmentShader,/uS95Strength/);
 assert.match(p.fragmentShader,/reflectedLight.directSpecular\+=s95Tint/);
 assert.match(p.fragmentShader,/s95Across/);
 assert.doesNotMatch(p.fragmentShader,/attribute float.*02895/);
 const mobile=patchRoadSpill02895(v,frag,{lowMemory:true});
 assert.match(mobile.fragmentShader,/s95Tint\*s95Finish\*0.13/);
 assert.throws(()=>patchRoadSpill02895(v,"bad"),/GGX chain/);
});
test("substrate cyan remains same graphite when wave is disabled, changes at wavefront",()=>{
 const x=patchWallCoveWave02895(v,basic,{kind:"substrate"});
 assert.match(x.fragmentShader,/w95Color\(vRebirthTrack\)/);
 assert.match(x.fragmentShader,/uW95Power/);
 assert.match(x.fragmentShader,/smoothstep\(-66.0,66.0/);
 assert.match(x.fragmentShader,/vec3 d26Ice=mix/);
 assert.match(x.fragmentShader,/d26ColdPower/);
 assert.throws(()=>patchWallCoveWave02895(v,"bad",{kind:"substrate"}),/metal response/);
});
test("physical 0.26.0/1 GGX AND finite strip cyan sample both follow wave, warm unchanged",()=>{
 const x=patchWallCoveWave02895(v,physical,{kind:"physical"});
 assert.match(x.fragmentShader,/pbrFixture0260.color=mix/);
 assert.equal(x.fragmentShader.match(/l261Cool.color=mix/g).length,2);
 assert.match(x.fragmentShader,/w95Color\(vPbrTrack0260\)/);
 assert.doesNotMatch(x.fragmentShader,/l261Cool.color=vec3\(0.07,0.64,0.97\)/);
 assert.throws(()=>patchWallCoveWave02895(v,"bad",{kind:"physical"}),/metal response/);
});
test("10 original source modules can be wrapped in-place with no duplicate meshes",()=>{
 const children=[
  ...["panel","rib"].map(role=>({name:"SKYSHIFT 0.26.0 P2 / true physical "+role,
   material:fakeMat(true)})),
  ...["HARDSURFACE_PANELS","CURVED_RIBS","CLOSED_SHELL","STRUCTURAL_CONDUITS"]
    .map(role=>({name:"Tunnel / "+role,material:fakeMat(false)}))
 ];
 const group={children};const section={
  getObjectByName:n=>n==="SKYSHIFT · Tunnel Megastructure 0.21.1"?group:null
 };
 const before=children.map(x=>x.material.onBeforeCompile);
 const obj=installWaveCoupledCove02895(THREE,section,
  {index:0,start:340,scale:340/368},{enabled:true,lowMemory:false,trackLength:3400});
 assert.equal(obj.active,true);assert.equal(obj.stats().materials,6);
 assert.equal(children.length,6);
 const shader={vertexShader:v,fragmentShader:physical,uniforms:{}};
 children[0].material.onBeforeCompile(shader,null);
 assert.match(shader.fragmentShader,/uW95Old/);
 obj.updateWave({shaderBaseStage:4,fronts:[500],activeCount:1});
 assert.equal(obj.stats().waveOld,ZONE_PALETTES[4].light);
 assert.equal(obj.stats().waveNext,ZONE_PALETTES[5].light);
 assert.equal(obj.stats().waveFront,500);
 assert.equal(obj.stats().moduleStart,340);
 obj.setComparison(0);assert.equal(obj.stats().enabled,0);
 obj.dispose();obj.dispose();
 children.forEach((x,i)=>assert.equal(x.material.onBeforeCompile,before[i]));
});
function fakeMat(physical){
 return {needsUpdate:false,isMeshBasicMaterial:!physical,
  isMeshPhysicalMaterial:physical,onBeforeCompile(){},
  customProgramCacheKey(){return "old";}};
}
test("native road controller updates palette and restores original program",()=>{
 const mat={...fakeMat(false),isMeshStandardMaterial:true};
 const before=mat.onBeforeCompile,key=mat.customProgramCacheKey;
 const c=installRoadSpill02895(THREE,{material:mat},{
  enabled:true,lowMemory:false,trackLength:3400});
 assert.equal(c.active,true);
 const shader={vertexShader:v,fragmentShader:frag,uniforms:{}};
 mat.onBeforeCompile(shader,null);
 assert.match(shader.fragmentShader,/s95Shape/);
 c.updateWave({shaderBaseStage:2,fronts:[990],activeCount:1});
 assert.deepEqual(c.stats().waveColors,[ZONE_PALETTES[2].light,ZONE_PALETTES[3].light]);
 c.setComparison(0);assert.equal(c.stats().strength,0);
 c.dispose();c.dispose();
 assert.equal(mat.onBeforeCompile,before);
 assert.equal(mat.customProgramCacheKey,key);
});
