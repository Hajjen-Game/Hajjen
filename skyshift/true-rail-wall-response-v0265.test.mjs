import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {TRUE_RAIL_WALL_0265,railFixtureIntervals0265,
 buildRailLocalSourceData0265,patchRailBody0265,patchPhysicalWall0265,
 patchSubstrateWall0265,installTrueRailWallResponse0265}
 from "./true-rail-wall-response-v0265.mjs";

const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const vert=[
 "#include <common>","#include <project_vertex>"
].join("\n");
const rail=[
 "#include <common>","uniform float uRailBodyContainment;",
 "float railBodyTunnelMask(){return 1.0;}",
 "roughnessFactor=mix(roughnessFactor,0.98,railBodyTunnelMask());",
 "#include <lights_fragment_end>",
 "reflectedLight.indirectSpecular*=mix(1.0,0.10,railBodyTunnelMask());"
].join("\n");
const wall=[
 "#include <common>","#include <metalnessmap_fragment>",
 "uniform float uFixtureTransport02643;",
 "varying vec2 vPbrSection0260;","varying vec2 vLocalMask0261;",
 "float f42Near=clamp(max(vLocalMask0261.x*0.85,vLocalMask0261.y),0.0,1.0);",
 "RE_Direct(l261Cool,geometryPosition",
 "RE_Direct(l261Warm,geometryPosition"
].join("\n");
const substrate=[
 "#include <common>","float t43Cove=0.5;","float t43Warm=0.3;",
 "float t43Face=1.0;",
 "vec3 t43Bounce=vec3(0.028,0.138,0.187)*t43Cove+",
 "vec3(0.205,0.077,0.018)*t43Warm;"
].join("\n");
class Attribute{
 constructor(arr,size){this.array=arr;this.itemSize=size;this.count=arr.length/size;}
 getX(i){return this.array[i*this.itemSize];}
}
class Material{
 constructor(type){this[type]=true;this.onBeforeCompile=function(){};
  this.customProgramCacheKey=function(){return "existing";};}
}
function geometry(s=[6,30,80,101,129,350]){
 const arcs=s.concat(s).flatMap(x=>Array(8).fill(x));
 const store={aBarrierArc:new Attribute(arcs,1),position:new Attribute(
  new Float32Array(arcs.length*3),3)};
 return {getAttribute(n){return store[n];},
  setAttribute(n,a){store[n]=a;},
  deleteAttribute(n){delete store[n];},attributes:store};
}
const positionAt=(s,x,h)=>({x,y:h,z:s});
const ranges=[{from:0,to:68},{from:96,to:140}];
test("0.26.5 scopes physically based response, not the old road brightness multiplier",()=>{
 const v=TRUE_RAIL_WALL_0265;
 assert.equal(v.version,"0.26.5");
 assert.equal(v.comparison,"?railWallResponse=classic");
 assert.equal(v.railSamplesHigh,2);assert.equal(v.railSamples4GB,1);
 assert.equal(v.wallExtraSamples,0);
 for(const x of ["originalCyanInlaysUnchanged","roofLightUnchanged",
  "straightOnly","noNewLights","noNewGeometry","noNewDrawCalls",
  "noNewTextures","noNewRenderPasses","noSSR","noPMREM",
  "solarSealUnchanged","roadUnchanged","shipUnchanged",
  "gameplayUnchanged","gripUnchanged","collisionUnchanged"])
  assert.equal(v[x],true,x);
});
test("source list follows EXACT 0.26.3.3 6.5m bays and authored straight zones",()=>{
 const p=railFixtureIntervals0265(ranges);
 assert.ok(p.length>=3);
 assert.ok(p.every(x=>x.to-x.from>=2.8));
 assert.ok(p.every(x=>ranges.some(r=>x.from>=r.from&&x.to<=r.to)));
 assert.ok(p.every(x=>x.to<=367.65));
 assert.ok(!p.some(x=>x.from<=80&&x.to>=80));
});
test("indexed original rail source attributes: two real GGX taps, no curves",()=>{
 const geo=geometry();
 for(const mobile of [false,true]){
  const d=buildRailLocalSourceData0265(geo,positionAt,{ranges,mobile});
  assert.equal(d.vertices,geo.getAttribute("position").count);
  assert.equal(d.a.length,d.vertices*3);
  assert.equal(d.b===null,mobile);
  assert.ok(d.litVertices>1);
  // [s=6,30,80,101,129,350] x eight profile verts x two sides.
  const at=(row,column=2)=>d.mask[row*8+column];
  assert.ok(at(0)>.15,"first 6.5m straight lamp should light near rail");
  assert.equal(at(2),0,"s=80 is outside every authored straight");
  assert.equal(at(5),0,"s=350 is outside valid straight-safe sources");
  assert.equal(d.mask[7],0,"outer/under-deck profile not lit");
  assert.ok(d.mask[2]>0,"visible front bevel must reflect adjacent real LED");
 }
 assert.throws(()=>buildRailLocalSourceData0265(null,positionAt));
});
test("rail shader restores bounded native GGX ONLY after legacy white-sun seal",()=>{
 for(const mobile of [false,true]){
  const p=patchRailBody0265(vert,rail,{mobile});
  assert.match(p.vertexShader,/aRailSourceA0265/);
  assert.match(p.fragmentShader,/r65MetalResponse/);
  assert.match(p.fragmentShader,/uTrueRailWall0265\*railBodyTunnelMask/);
  assert.match(p.fragmentShader,/RE_Direct\(r65A,geometryPosition/);
  assert.match(p.fragmentShader,/reflectedLight\.directDiffuse=r65ADiffuse/);
  assert.ok(p.fragmentShader.indexOf("RE_Direct(r65A")>
    p.fragmentShader.indexOf("reflectedLight.indirectSpecular*=mix"));
  assert.equal((p.fragmentShader.match(/RE_Direct\(r65/g)||[]).length,mobile?1:2);
  assert.equal(p.vertexShader.includes("aRailSourceB0265"),!mobile);
  assert.match(p.fragmentShader,/roughnessFactor=mix\(roughnessFactor,0\.98/);
 }
 assert.throws(()=>patchRailBody0265(vert,rail.replace("roughnessFactor=mix(roughnessFactor,0.98,railBodyTunnelMask());","BAD")));
});
test("wall retains existing 0.26.1 BRDF taps and hard-roof height cutout",()=>{
 for(const mobile of [false,true]){
  const p=patchPhysicalWall0265("",wall,{mobile});
  assert.match(p.fragmentShader,/r65Face=1\.0-smoothstep\(23\.0,27\.0/);
  assert.match(p.fragmentShader,/r65WallC=clamp\(vLocalMask0261\.x/);
  assert.match(p.fragmentShader,/l261Cool\.color\*=mix/);
  assert.match(p.fragmentShader,/l261Warm\.color\*=mix/);
  // The masks are declared after the atlas if-block, not inside it.
  assert.ok(p.fragmentShader.indexOf("float r65WallC")>
   p.fragmentShader.indexOf("#include <metalnessmap_fragment>"));
  assert.equal((p.fragmentShader.match(/RE_Direct\(l261/g)||[]).length,2);
  const s=patchSubstrateWall0265("",substrate,{role:"panel",mobile});
  assert.match(s.fragmentShader,/t43Bounce=vec3\(0\.028,0\.138,0\.187\)\*mix/);
  assert.match(s.fragmentShader,/t43Warm;/);
  assert.equal((s.fragmentShader.match(/float t43Cove/g)||[]).length,1);
 }
 assert.throws(()=>patchPhysicalWall0265("",wall.replace("f42Near","lost")));
});
function mock(lowMemory=false){
 const g=geometry(),railM=new Material("isMeshStandardMaterial");
 const railObj={name:TRUE_RAIL_WALL_0265.railBody,geometry:g,material:railM};
 const children=[],all=[railM];
 for(const role of Object.keys({panel:1,rib:1,shell:1,conduit:1})){
  if(lowMemory&&role==="conduit")continue;
  const n={panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS",
   shell:"CLOSED_SHELL",conduit:"STRUCTURAL_CONDUITS"}[role];
  const m=new Material("isMeshBasicMaterial");
  children.push({name:"Tunnel / "+n,material:m});all.push(m);
 }
 for(const role of ["panel","rib"]){
  if(lowMemory&&role==="rib")continue;
  const m=new Material("isMeshPhysicalMaterial");
  children.push({name:"SKYSHIFT 0.26.0 P2 / true physical "+role,material:m});
  all.push(m);
 }
 const world={getObjectByName(s){
  return s===railObj.name?railObj:
   s==="SKYSHIFT · Tunnel Megastructure 0.21.1"?{children}:null;
 }};
 const ready=key=>({stats:()=>({[key]:true})});
 return {world,railObj,g,all,options:{
  lowMemory,positionAt,identitySurface:{getRailBodyContainment:()=>1},
  fixtureTransport:ready("fixtureTransport02643Active"),
  straightEdges:ready("straightEdges02633Active"),
  stationWorld:ready("localReflections0261Enabled")}};
}
test("live installer wraps original rail and wall materials; classic and dispose work",()=>{
 for(const mobile of [false,true]){
  const m=mock(mobile),before=m.all.map(x=>x.onBeforeCompile);
  const result=installTrueRailWallResponse0265({Float32BufferAttribute:Attribute},m.world,m.options);
  const q=result.stats();
  assert.equal(q.railWall0265Active,true,JSON.stringify(q));
  assert.equal(q.railWall0265WallPhysicalCount,mobile?1:2);
  assert.equal(q.railWall0265WallSubstrateCount,mobile?3:4);
  assert.equal(q.railWall0265NativeGGXSamples,mobile?1:2);
  assert.equal(q.railWall0265OriginalContainment,1);
  assert.ok(m.all.every((v,i)=>v.onBeforeCompile!==before[i]));
  assert.ok(m.g.getAttribute("aRailSourceA0265"));
  assert.equal(!!m.g.getAttribute("aRailSourceB0265"),!mobile);
  result.setComparison(0);
  assert.equal(result.stats().railWall0265Strength,0);
  result.setComparison(1);
  assert.equal(result.stats().railWall0265Strength,1);
  result.dispose();
  assert.equal(m.g.getAttribute("aRailSourceA0265"),undefined);
  assert.ok(m.all.every((v,i)=>v.onBeforeCompile===before[i]));
 }
 const m=mock();
 assert.equal(installTrueRailWallResponse0265({},m.world,
  {...m.options,enabled:false}).stats().railWall0265Active,false);
});
test("published 0.26.5 versions and QA hooks are integrated without touching flight",()=>{
 const g=read("./game-v0210.mjs"),boot=read("./boot-v0210.js"),html=read("./index.html");
 assert.match(g,/installTrueRailWallResponse0265/);
 assert.match(g,/railWallResponseEnabled=fixtureTransportEnabled/);
 assert.match(g,/__skyshiftRailWallFrameProof/);
 assert.match(g,/compareBeforeRailWallResponse:"\?railWallResponse=classic"/);
 assert.match(boot,/game-v0210\.mjs\?v=0\.26\.5/);
 assert.match(html,/True Rail & Wall Local Light Response/);
});
