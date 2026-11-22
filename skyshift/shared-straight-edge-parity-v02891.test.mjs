// SKYSHIFT 0.28.9.1: genuine Vault course geometry source parity with
// the previously approved Skyline 0.26.3.3 straight-only correction.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
// Set the full browser-style release before trial module is first imported.
globalThis.location={search:"?track=vault&v=0.28.9.1"};
const {
 straightParityEnabled02891,vaultStraightRanges02891,
 vaultStraightMask02891,buildVaultStraightEmitters02891,
 buildVaultRoadStraightMask02891,patchVaultRoadCyanMask02891,
 installVaultStraightRoadParity02891,STRAIGHT_EDGE_PARITY_02891
}=await import("./shared-straight-edge-parity-v02891.mjs");
const {COURSE_SEGMENTS,CIRCUIT}=await import("./trial-v0165.mjs");
const {planTrueSharedTunnel0281}=await import("./true-shared-tunnel-renderer-v0281.mjs");
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
class Attr{
 constructor(data,size){this.array=new Float32Array(data);this.itemSize=size;this.count=data.length/size;}
 getX(i){return this.array[i*this.itemSize];}
}
class Geo{
 constructor(){this.attributes={};}
 setAttribute(k,v){this.attributes[k]=v;return this;}
 getAttribute(k){return this.attributes[k]??null;}
 deleteAttribute(k){delete this.attributes[k];}
 computeBoundingSphere(){}
 dispose(){}
}
const THREE={BufferGeometry:Geo,Float32BufferAttribute:Attr};
const near=(a,b,eps=1e-3)=>Math.abs(a-b)<=eps;
test("0.28.9.1 only Vault, restores 0.28.9 original via classic query",()=>{
 assert.equal(straightParityEnabled02891("?track=vault&v=0.28.9.1"),true);
 assert.equal(straightParityEnabled02891("?track=vault&v=0.28.9.2"),true);
 assert.equal(straightParityEnabled02891("?track=vault&v=0.28.10"),true);
 for(const v of ["?track=vault&v=0.28.9",
  "?track=vault&v=0.28.8","?track=skyline&v=0.28.9.1",
  "?track=aurora&v=0.28.9.1",
  "?track=vault&v=0.28.9.1&straightEdgeParity=classic",
  "?track=vault&v=0.28.9.1&straightEdgeParity=off"])
  assert.equal(straightParityEnabled02891(v),false,v);
 for(const field of ["beforeTurnMeters","afterTurnMeters"])
  assert.equal(STRAIGHT_EDGE_PARITY_02891[field],12);
 for(const prop of ["roadGeometryUnchanged","amberUnchanged",
  "physicsUnchanged","shipUnchanged","cornerChevronsUnchanged"])
  assert.equal(STRAIGHT_EDGE_PARITY_02891[prop],true,prop);
});
test("full 3400m Vault layout, not repeated 368m Skyline turn classification",()=>{
 assert.equal(CIRCUIT.lapLength,3400);
 assert.equal(COURSE_SEGMENTS.at(-1).end,3400);
 assert.equal(COURSE_SEGMENTS.filter(x=>x.type==="turn").length,8);
 const safe=vaultStraightRanges02891();
 assert.equal(safe.length,8);
 for(let i=0;i<COURSE_SEGMENTS.length;i++){
  const s=COURSE_SEGMENTS[i];
  if(s.type==="turn"){
   for(const x of [s.start-.5,s.start,s.start+12,
    (s.start+s.end)*.5,s.end-12,s.end,s.end+.5])
    if(x>=s.start&&x<=s.end)
     assert.equal(vaultStraightMask02891(x),0,
      "cyan curve in "+s.id+" at "+x);
  }
 }
 for(let i=0;i<safe.length;i++){
  const x=safe[i];
  assert.ok(vaultStraightMask02891((x.from+x.to)*.5)>0.98,x.id);
 }
 // Emission is at least 12m away from turn entry/exit.
 for(const bend of COURSE_SEGMENTS.filter(x=>x.type==="turn")){
  for(const d of [-11.999,0,11.999]){
   if(bend.start+d>=0)assert.equal(vaultStraightMask02891(bend.start+d),0,
    "turn approach "+bend.id+" d="+d);
   if(bend.end+d<=3400)assert.equal(vaultStraightMask02891(bend.end+d),0,
    "turn exit "+bend.id+" d="+d);
  }
 }
});
test("all 10 REAL shared source modules obey the same world-space safe ranges",()=>{
 const modules=planTrueSharedTunnel0281(3400);
 assert.equal(modules.length,10);
 let segments=0,quads=0,lit=0;
 for(const lowMemory of [false,true]){
  segments=0;quads=0;lit=0;
  for(const m of modules){
   const positionAt=(s,l,y)=>({x:l,y,z:m.start+s*m.scale});
   const p=buildVaultStraightEmitters02891(THREE,positionAt,m,{lowMemory});
   segments+=p.segments;quads+=p.quads;lit+=p.litMeters;
   const vertices=p.geometry.getAttribute("position");
   const colors=p.geometry.getAttribute("color");
   assert.equal(vertices.count,colors.count);
   for(let i=0;i<vertices.count;i++){
    const world=vertices.array[3*i+2];
    assert.ok(world>=m.start-0.001&&world<=m.end+0.001,
     "geometry escaped its original module");
    assert.ok(vaultStraightMask02891(world)>.0001||
     vaultStraightRanges02891().some(x=>near(world,x.from)||near(world,x.to)),
     "inlay in Vault curve at world distance "+world);
   }
  }
  assert.ok(segments>12&&segments<220,"visible lit segments "+segments);
  assert.ok(quads>100,"real quad geometry "+quads);
  assert.ok(lit>60&&lit<1200,"only source runs on straights "+lit);
 }
});
test("indexed original racing deck mask 0 in each bend, active on straights",()=>{
 const samples=[...COURSE_SEGMENTS.flatMap(x=>
  [x.start+0.1,(x.start+x.end)/2,x.end-0.1])];
 const g=new Geo();g.setAttribute("aTrackCoord",
  new Attr(samples.flatMap(s=>[s,9]),2));
 g.setAttribute("position",new Attr(samples.flatMap(()=>[0,0,0]),3));
 g.index={count:32};
 const prev=g.index.count;
 const mask=buildVaultRoadStraightMask02891(g);
 assert.equal(mask.vertices,samples.length);
 assert.ok(mask.active>0);assert.ok(mask.masked>0);
 assert.equal(g.index.count,prev);
 for(let i=0;i<samples.length;i++){
  const segment=COURSE_SEGMENTS.find(x=>samples[i]>=x.start&&samples[i]<x.end);
  if(segment.type==="turn")assert.equal(mask.values[i],0,
   segment.id+" must not receive ghost GGX cyan in bends");
 }
});
test("native 0.28.2+0.28.9 cyan source is masked, amber unchanged",()=>{
 const vert="#include <common>\n#include <project_vertex>";
 const frag=[
  "#include <common>",
  "uniform float uCinematicRoad0289;",
  "vec2 r263Source=clamp(vRoadFixtureMasks0263,0.0,1.0)*uRoadRebuild0263*0.56;",
  "vec3 r263Convolved=vec3(r263Source.x,r263Source.y,0.0);",
  "r263Convolved+=uCinematicRoad0289*vec3(r263Source.x,r263Source.y,0.0);"
 ].join("\n");
 const patched=patchVaultRoadCyanMask02891(vert,frag);
 assert.match(patched.vertexShader,/attribute float edgeStraightMask02891/);
 assert.match(patched.vertexShader,/vEdgeStraight02891=edgeStraightMask02891/);
 assert.match(patched.fragmentShader,
  /r263Source\.x\*=clamp\(vEdgeStraight02891,0\.0,1\.0\)/);
 assert.doesNotMatch(patched.fragmentShader,/r263Source\.y\*=/);
 assert.equal((patched.fragmentShader.match(/vec2 r263Source=/g)||[]).length,1);
 assert.throws(()=>patchVaultRoadCyanMask02891(vert,frag.replace("vec2 r263Source=","vec2 obsolete=")));
});
test("installed wrapper owns only 1 attribute and restores 0.28.9 program",()=>{
 const g=new Geo();
 const s=[15,110,240,300,650,905,1180,1460,1840,2550];
 g.setAttribute("aTrackCoord",new Attr(s.flatMap(x=>[x,0]),2));
 g.setAttribute("position",new Attr(s.flatMap(()=>[0,0,0]),3));
 const mat={isMeshStandardMaterial:true,onBeforeCompile(){},
  customProgramCacheKey(){return "original-0289";},needsUpdate:false};
 const old=mat.onBeforeCompile,key=mat.customProgramCacheKey;
 const a=installVaultStraightRoadParity02891(THREE,{material:mat,geometry:g},{enabled:true});
 assert.equal(a.active,true);
 assert.equal(a.stats().version,"0.28.9.1");
 assert.equal(g.getAttribute("edgeStraightMask02891").count,s.length);
 assert.equal(a.stats().addedLights,0);
 assert.equal(a.stats().amberUnchanged,true);
 a.dispose();a.dispose();
 assert.equal(g.getAttribute("edgeStraightMask02891"),null);
 assert.equal(mat.onBeforeCompile,old);
 assert.equal(mat.customProgramCacheKey,key);
});
test("legacy Skyline release functions and Vault 0.28.9 lighting remain enabled",async()=>{
 const [{vaultSpatialWaveEnabled0285},{reflectionStabilityEnabled0286},
  {archFootRelease0287},{precisionNeonEnabled0288},
  {cinematicMetalEnabled0289}]=await Promise.all([
   import("./vault-spatial-wave-parity-v0285.mjs"),
   import("./reflection-stability-strips-v0286.mjs"),
   import("./arch-foot-light-assembly-v0287.mjs"),
   import("./precision-neon-response-v0288.mjs"),
   import("./cinematic-metal-neon-v0289.mjs")
  ]);
 for(const f of [vaultSpatialWaveEnabled0285,reflectionStabilityEnabled0286,
  archFootRelease0287,precisionNeonEnabled0288,cinematicMetalEnabled0289]){
  assert.equal(f("?track=vault&v=0.28.9.1"),true,f.name+" unexpectedly downgraded");
  assert.equal(f("?track=skyline&v=0.28.9.1"),false,f.name);
 }
 const shared=read("./true-shared-tunnel-renderer-v0281.mjs");
 const game=read("./game-v0210.mjs");
 const html=read("./index.html");
 assert.match(shared,/buildVaultStraightEmitters02891/);
 assert.match(shared,/straightOnly:straightOnly02891/);
 assert.match(game,/installVaultStraightRoadParity02891/);
 assert.match(game,/straightParityReleaseEnabled\?" · 0\.28\.9\.1"/);
 assert.match(game,/selected==="vault"\?"0\.28\.9\.5"/);
 assert.match(html,/Road Light Spill Continuity & Wave-Coupled Cove Lighting · 0\.28\.9\.5/);
});
