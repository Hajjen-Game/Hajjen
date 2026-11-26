import test from "node:test";
import assert from "node:assert/strict";
import {ZONE_PALETTES} from "../../zone-wave-v060.mjs";
import {panelSeamPoint02892}
 from "../../tunnel/ceiling-fixture-cohesion-v02892.mjs";
import {buildArchRoadSources02893,patchArchRoadShader02893,
 installArchRoadReflection02893}
 from "../../tunnel/premium-arch-optics-v02893.mjs";
import {vaultStraightMask02891}
 from "../../tunnel/shared-straight-edge-parity-v02891.mjs";
import {UNIFIED_SOURCES_02894,unifiedSourcesEnabled02894,
 cleanLegacyRoadEnabled02894,ceilingRoadEnabled02894,
 sharedWaveColors02894,sharedPanelSeamPoint02894,
 createUnifiedSourceRegistry02894,installLegacyRoadCleanup02894,
 buildUnifiedCeilingRoadData02894,patchUnifiedCeilingRoad02894,
 installUnifiedCeilingRoad02894}
 from "../../tunnel/unified-tunnel-light-sources-v02894.mjs";

class Attribute {
 constructor(values,itemSize){this.array=new Float32Array(values);
  this.itemSize=itemSize;this.count=this.array.length/itemSize;}
 getX(i){return this.array[i*this.itemSize];}
 getY(i){return this.array[i*this.itemSize+1];}
 getZ(i){return this.array[i*this.itemSize+2];}
}
class Geometry{
 constructor(){this.attributes={};}
 getAttribute(k){return this.attributes[k];}
 setAttribute(k,v){this.attributes[k]=v;return this;}
 deleteAttribute(k){delete this.attributes[k];}
}
class Color{
 constructor(hex){this.hex=hex;}setHex(x){this.hex=x;return this;}
 getHex(){return this.hex;}
}
const THREE={Float32BufferAttribute:Attribute,Color};
const at=(s,x,y)=>({x,y,z:s});
const road=()=>{
 const g=new Geometry();const distances=[36,80,110,118,126,292,521,955,1192,1840,2300,3391];
 const lateral=distances.flatMap((s,i)=>[s,i%2?9.7:-9.4]);
 g.setAttribute("aTrackCoord",new Attribute(lateral,2));
 g.setAttribute("position",new Attribute(distances.flatMap((s,i)=>[i%2?9.7:-9.4,0,s]),3));
 return g;
};
const vertex="#include <common>\n#include <project_vertex>";
const fragment=[
 "#include <common>",
 "varying vec2 vTrackCoord;",
 "float roadSolarMask=1.0;",
 "float guided=0.0;float whiteCore=0.0;float padCoverage=0.0;",
 "float a93Safe=1.0;",
 "void dummy(){RE_Direct(a93Lamp,geometryPosition,geometryNormal,geometryViewDir,geometryClearcoatNormal,material,reflectedLight);}",
 " (a93Energy*(0.036+0.062*a93Fresnel));",
 "}"
].join("\n");

test("only new Vault release; rollback independent for clean old road and ceiling light",()=>{
 const q=v=>"?track=vault&v="+v;
 for(const old of ["0.28.9.1","0.28.9.2","0.28.9.3"])
  assert.equal(unifiedSourcesEnabled02894(q(old)),false);
 assert.equal(unifiedSourcesEnabled02894(q("0.28.9.4")),true);
 assert.equal(unifiedSourcesEnabled02894(q("0.28.10")),true);
 assert.equal(unifiedSourcesEnabled02894(q("0.28.9.4")+"&unifiedLights=classic"),false);
 assert.equal(unifiedSourcesEnabled02894("?track=skyline&v=0.28.9.4"),false);
 assert.equal(unifiedSourcesEnabled02894("?track=aurora&v=0.28.9.4"),false);
 assert.equal(cleanLegacyRoadEnabled02894(q("0.28.9.4")+"&roadLayers=classic"),false);
 assert.equal(ceilingRoadEnabled02894(q("0.28.9.4")+"&ceilingRoad=classic"),false);
 assert.equal(cleanLegacyRoadEnabled02894(q("0.28.9.4")),true);
 assert.equal(UNIFIED_SOURCES_02894.newWorldLights,0);
 assert.equal(UNIFIED_SOURCES_02894.newDrawCalls,0);
});
test("one identical palette from original nine-color world wave, no hardcoded pink",()=>{
 const wave={shaderBaseStage:4,fronts:[995],activeCount:1};
 const p=sharedWaveColors02894(wave);
 assert.deepEqual(p,{from:ZONE_PALETTES[4].light,to:ZONE_PALETTES[5].light,
  front:995,active:1});
 assert.equal(sharedWaveColors02894({}).from,ZONE_PALETTES[0].light);
 assert.equal(UNIFIED_SOURCES_02894.sourceKinds.length,4);
});
test("single source of truth: original j11/j9 approved physical panel placement",()=>{
 for(const s of [42,110,292,356])for(const side of [-1,1])
  for(const kind of ["upper","wall"]){
   const old=panelSeamPoint02892(at,s,side,kind),
    now=sharedPanelSeamPoint02894(at,s,side,kind);
   assert.deepEqual(now,old);
   assert.ok(Number.isFinite(now.x+now.y+now.z));
  }
 assert.throws(()=>sharedPanelSeamPoint02894(at,369,1,"wall"),/seam/);
});
test("real original 3400m source module adapters give correct arch, cove, wall and straights",()=>{
 const registry=createUnifiedSourceRegistry02894(at,3400);
 for(const s of [110,292,955,1840,3392]){
  const item=registry.at(s);
  assert.equal(item.module.index,Math.floor(s/340));
  assert.equal(item.edgeStraightMask,vaultStraightMask02891(s));
  assert.ok(item.arch.worldS>=0&&item.arch.worldS<=3400);
  assert.ok(item.ceilingCove.worldS>=0&&item.ceilingCove.worldS<=3400);
  assert.ok(item.wallPractical.worldS>=0&&item.wallPractical.worldS<=3400);
  assert.ok(item.arch.left.y<item.wallPractical.left.y);
  assert.ok(item.wallPractical.left.y<item.ceilingCove.left.y);
  assert.equal(item.arch.left.x,-item.arch.right.x);
  assert.equal(item.ceilingCove.left.x,-item.ceilingCove.right.x);
  assert.ok(item.arch.window>=0&&item.arch.window<=1);
  assert.ok(item.ceilingCove.window>=0&&item.ceilingCove.window<=1);
  assert.ok(item.straightEdge.window<=item.edgeStraightMask+.000001);
 }
 assert.equal(registry.stats().modules,10);
 assert.equal(registry.stats().sharedPalette,9);
});
test("unified v.4 arch positions and 0.28.9.3 are NUMERICALLY IDENTICAL",()=>{
 const g=road();
 const original=buildArchRoadSources02893(g,at,3400,{lowMemory:false});
 const unified=buildArchRoadSources02893(g,at,3400,{lowMemory:false,unifiedSources:true});
 assert.equal(unified.unifiedSources,true);
 assert.equal(original.vertices,unified.vertices);
 for(const k of ["left","right","arc","window"]){
  const a=original[k],b=unified[k];
  assert.equal(a.length,b.length);
  for(let i=0;i<a.length;i++)
   assert.ok(Math.abs(a[i]-b[i])<.0001,k+"["+i+"] "+a[i]+" vs "+b[i]);
 }
});
test("new release packs old arch arc/window without changing physical values",()=>{
 const g=road();
 const mat={isMeshStandardMaterial:true,needsUpdate:false,
  onBeforeCompile(){},customProgramCacheKey(){return "native";}};
 const original=mat.onBeforeCompile,key=mat.customProgramCacheKey;
 const scene={getObjectByName(name){return name==="Zone Ribbon · integrated PBR racing deck"?
  {material:mat,geometry:g}:null;}};
 const q=installArchRoadReflection02893(THREE,scene,at,{
  enabled:true,lowMemory:false,trackLength:3400,unifiedSources:true});
 assert.equal(q.active,true);
 assert.equal(q.stats().sourceAttributes,3);
 assert.equal(q.stats().packedArcWindow02894,true);
 const packed=g.getAttribute("archArcWindow02894");
 assert.ok(packed&&packed.itemSize===2);
 assert.equal(packed.count,g.getAttribute("position").count);
 assert.equal(g.getAttribute("archArc02893"),undefined);
 assert.equal(g.getAttribute("archWindow02893"),undefined);
 const base=buildArchRoadSources02893(g,at,3400,{unifiedSources:true});
 for(let i=0;i<packed.count;i++){
  assert.ok(Math.abs(packed.getX(i)-base.arc[i])<.0001);
  assert.ok(Math.abs(packed.getY(i)-base.window[i])<.0001);
 }
 const fragmentArch="#include <common>\nvarying vec2 vTrackCoord;\n"+
 "float r263Guides=1.0;\nfloat r263Keep=1.0;\n"+
 "float roadSolarMask=1.0;\n"+
 "reflectedLight.directSpecular+=r263Convolved*\n"+
 "  (r263Keep*r263Fresnel*r263Surface);";
 const shader=patchArchRoadShader02893(vertex,fragmentArch,{packed:true});
 assert.match(shader.vertexShader,/attribute vec2 archArcWindow02894/);
 assert.match(shader.vertexShader,/vA93Arc=archArcWindow02894.x/);
 assert.doesNotMatch(shader.vertexShader,/attribute float archArc02893/);
 q.dispose();assert.equal(mat.onBeforeCompile,original);
 assert.equal(mat.customProgramCacheKey,key);
 assert.equal(g.getAttribute("archArcWindow02894"),undefined);
});
test("source-matched real j11 cove source packed into ONE WebGL vec4, HIGH and 4GB",()=>{
 const g=road();
 for(const mobile of [false,true]){
  const out=buildUnifiedCeilingRoadData02894(g,at,3400,{lowMemory:mobile});
  const keys=Object.keys(out.vectors);
  assert.deepEqual(keys,["unifiedCoveSource02894"]);
  assert.equal(keys.length,1,"actual GPU must retain two free vertex slots");
  assert.equal(out.modules,10);
  assert.equal(out.vertices,g.getAttribute("position").count);
  assert.ok(out.litVertices>0);
  assert.ok(out.physicalPositions>10);
  const packed=out.vectors.unifiedCoveSource02894;
  assert.equal(packed.length,out.vertices*4);
  for(let i=0;i<out.vertices;i++)
   assert.ok(packed[i*4+3]>=0&&packed[i*4+3]<=1);
  for(const key of keys)assert.ok(out.vectors[key].every(Number.isFinite));
 }
});
test("native 0.28.9.3 road shader extension uses shared true j11/j9 physical sources",()=>{
 for(const lowMemory of [false,true]){
  const p=patchUnifiedCeilingRoad02894(vertex,fragment,{lowMemory});
  assert.match(p.vertexShader,/attribute vec4 unifiedCoveSource02894/);
  assert.match(p.fragmentShader,/varying vec4 vU94Cove/);
  assert.match(p.fragmentShader,/uniform vec3 uU94Old,uU94Next/);
  assert.match(p.fragmentShader,/u94Signed/);
  assert.match(p.fragmentShader,/smoothstep\(-66.0,66.0/);
  assert.match(p.fragmentShader,/RE_Direct\(u94Lamp/);
  assert.match(p.fragmentShader,/reflectedLight.directDiffuse=u94Diffuse/);
  assert.match(p.fragmentShader,/guided/);
  assert.match(p.fragmentShader,/whiteCore/);
  assert.match(p.fragmentShader,/padCoverage/);
  assert.doesNotMatch(p.fragmentShader,/u94DW/);
  assert.match(p.fragmentShader,/vU94Cove\.w/);
 }
 assert.throws(()=>patchUnifiedCeilingRoad02894(vertex,"missing"),/GGX/);
});
test("legacy additive road is hidden only in new release, original 10 meshes retained and restored",()=>{
 const meshes=Array.from({length:10},()=>({
  isMesh:true,name:"Tunnel / NEON_ROAD_RESPONSE",visible:true
 }));
 const world={traverse(fn){for(const m of meshes)fn(m);}};
 const clean=installLegacyRoadCleanup02894(world,{enabled:true,clean:true});
 assert.equal(clean.stats().removedBatches,10);
 assert.ok(meshes.every(m=>!m.visible));
 clean.setComparison(0);assert.ok(meshes.every(m=>m.visible));
 clean.setComparison(1);assert.ok(meshes.every(m=>!m.visible));
 clean.dispose();clean.dispose();assert.ok(meshes.every(m=>m.visible));
 const legacy=installLegacyRoadCleanup02894(world,{enabled:false,clean:false});
 assert.equal(legacy.stats().removedBatches,0);
 legacy.dispose();
});
test("native 0.28.9.4 road decor is in-place, restores original shader and every attr",()=>{
 const g=road();
 const mat={isMeshStandardMaterial:true,needsUpdate:false,
  onBeforeCompile(shader){shader.fragmentShader+="\n// original";},
  customProgramCacheKey(){return "road-original";}
 };
 const before=mat.onBeforeCompile,key=mat.customProgramCacheKey;
 const world={getObjectByName(name){return name==="Zone Ribbon · integrated PBR racing deck"?
   {material:mat,geometry:g}:null;}};
 for(const lowMemory of [false,true]){
  const q=installUnifiedCeilingRoad02894(THREE,world,at,{
   enabled:true,lowMemory,trackLength:3400});
  assert.equal(q.active,true);
  assert.equal(q.stats().additionalRoadAttributes,1);
  assert.equal(q.stats().drawCallsAdded,0);
  assert.equal(q.stats().ceilingInCurves>=0,true);
  assert.equal(q.stats().strength,1);
  const shader={vertexShader:vertex,fragmentShader:fragment,uniforms:{}};
  mat.onBeforeCompile(shader,null);
  assert.ok(shader.uniforms.uU94Front);
  assert.ok(shader.fragmentShader.includes("original"));
  q.updateWave({shaderBaseStage:4,fronts:[950],activeCount:1});
  assert.equal(q.stats().paletteFrom,ZONE_PALETTES[4].light);
  assert.equal(q.stats().paletteTo,ZONE_PALETTES[5].light);
  assert.equal(q.stats().waveFront,950);
  q.setComparison(0);
  assert.equal(q.stats().strength,0);
  q.dispose();q.dispose();
  assert.equal(mat.onBeforeCompile,before);
  assert.equal(mat.customProgramCacheKey,key);
  assert.equal(g.getAttribute("unifiedCoveSource02894"),undefined);
 }
});

import {createSharedSourceSampler0282,buildSharedRoadSourceData0282} from "../../tunnel/shared-road-ship-light-v0282.mjs";
import {planConfiguredTunnelModules0281} from "../../tunnel/true-shared-tunnel-renderer-v0281.mjs";
test("EF05 shared mounted module plan preserves all original full Vault optical coordinates",()=>{
 const modules=planConfiguredTunnelModules0281(3400,[{start:0,end:3400}]);
 const sampler=createSharedSourceSampler0282(at,3400,modules);
 const registry=createUnifiedSourceRegistry02894(at,3400,{sourceSampler:sampler});
 assert.equal(registry.modules,modules);
 for(const s of [0,110,339.9,340,955,1840,3399,3400]){
  assert.deepEqual(sampler.nearest(s).fixtures,createSharedSourceSampler0282(at,3400).nearest(s).fixtures);
  assert.deepEqual(registry.at(s),createUnifiedSourceRegistry02894(at,3400).at(s));
 }
 const g=road(),a=buildSharedRoadSourceData0282(g,at,3400,sampler),b=buildSharedRoadSourceData0282(g,at,3400);
 assert.deepEqual(a.vectors,b.vectors);
 assert.deepEqual(buildUnifiedCeilingRoadData02894(g,at,3400,{sourceRegistry:registry}).vectors,
  buildUnifiedCeilingRoadData02894(g,at,3400).vectors);
 const x=buildArchRoadSources02893(g,at,3400,{unifiedSources:true,sourceSampler:sampler,sourceRegistry:registry});
 const y=buildArchRoadSources02893(g,at,3400,{unifiedSources:true});
 for(const k of ["left","right","arc","window"])assert.deepEqual(x[k],y[k]);
});
test("EF05 independent elevated banked route uses actual module origins and no light in open gaps",()=>{
 const length=1200,modules=planConfiguredTunnelModules0281(length,[{start:25,end:625},{start:800,end:1120}]);
 const pos=(s,x,h)=>({x:x*Math.cos(s/40),y:Math.sin(s/80)*6+x*Math.sin(s/40)+h,z:s});
 const sampler=createSharedSourceSampler0282(pos,length,modules);
 const registry=createUnifiedSourceRegistry02894(pos,length,{sourceSampler:sampler,straightMask:s=>s>=40&&s<=120?1:0});
 assert.equal(registry.modules,modules);assert.equal(sampler.fullCourse,false);
 for(const s of [0,625,700,1120,1199]){
  assert.equal(sampler.localFor(s),null);assert.equal(registry.at(s),null);
  assert.equal(sampler.nearest(s).fixtures.cyanWeight,0);assert.equal(sampler.nearest(s).fixtures.amberWeight,0);
 }
 for(const s of [25,100,325,624,800,950,1119]){
  const local=sampler.localFor(s),item=registry.at(s);
  assert.equal(item.module,local.module);
  assert.ok(item.arch.worldS>=local.module.start&&item.arch.worldS<=local.module.end);
  assert.equal(item.edgeStraightMask,s>=40&&s<=120?1:0);
 }
 const distances=[100,700,950],g=new Geometry();
 g.setAttribute("aTrackCoord",new Attribute(distances.flatMap(s=>[s,-9.4]),2));
 g.setAttribute("position",new Attribute(distances.flatMap(s=>[0,0,s]),3));
 const roadData=buildSharedRoadSourceData0282(g,pos,length,sampler);
 assert.deepEqual([...roadData.vectors.roadFixtureMasks0263.slice(2,4)],[0,0]);
 const cove=buildUnifiedCeilingRoadData02894(g,pos,length,{sourceRegistry:registry});
 assert.deepEqual([...cove.vectors.unifiedCoveSource02894.slice(4,8)],[0,0,0,0]);
 const arch=buildArchRoadSources02893(g,pos,length,{unifiedSources:true,sourceSampler:sampler,sourceRegistry:registry});
 assert.equal(arch.window[1],0);
});
