import test from "node:test";
import assert from "node:assert/strict";
import {TUNNEL_PORTALS_0211,TUNNEL_PROFILE_0211}
 from "./tunnel-megastructure-v0211.mjs";
import {ZONE_PALETTES} from "./zone-wave-v060.mjs";
import {ARCH_OPTICS_02893,archOpticsEnabled02893,archRoadEnabled02893,
 archCoreVertices02893,buildArchCoreMask02893,buildArchHaloFeather02893,
 patchArchSource02893,patchArchRoadShader02893,
 buildArchRoadSources02893,installArchSourceOptics02893,
 installArchRoadReflection02893,diagnosticLegacyRoadOverlay02893}
 from "./premium-arch-optics-v02893.mjs";

class Attribute{
 constructor(array,itemSize){this.array=new Float32Array(array);this.itemSize=itemSize;
  this.count=this.array.length/itemSize;}
 getX(i){return this.array[i*this.itemSize]}
 getY(i){return this.array[i*this.itemSize+1]}
 getZ(i){return this.array[i*this.itemSize+2]}
}
class Geometry{
 constructor(){this.attributes={};this.disposed=false;}
 setAttribute(k,v){this.attributes[k]=v;}
 getAttribute(k){return this.attributes[k]}
 deleteAttribute(k){delete this.attributes[k];}
 computeBoundingSphere(){}
 dispose(){this.disposed=true;}
}
class Color{
 constructor(x){this.x=x;}
 setHex(v){this.x=v;return this;}
 getHex(){return this.x;}
}
const THREE={Float32BufferAttribute:Attribute,BufferGeometry:Geometry,Color};
const positionAt=(s,x,y)=>({x,y,z:s});
const fragment=()=>[
 "#include <common>",
 "varying vec2 vTrackCoord;",
 "float roadSolarMask=1.0;",
 "float r263Guides=1.0;",
 "float r263Keep=1.0;",
 "float guided=0.0;",
 "float whiteCore=0.0;",
 "float padCoverage=0.0;",
 " reflectedLight.directSpecular+=r263Convolved*",
 "  (r263Keep*r263Fresnel*r263Surface);"
].join("\n");
const vertex=()=>"#include <common>\n#include <project_vertex>";

test("0.28.9.3 exactly gated: Vault only, classic restores 0.28.9.2",()=>{
 const q=v=>"?track=vault&v="+v;
 assert.equal(archOpticsEnabled02893(q("0.28.9.2")),false);
 assert.equal(archOpticsEnabled02893(q("0.28.9.3")),true);
 assert.equal(archOpticsEnabled02893(q("0.28.10")),true);
 assert.equal(archOpticsEnabled02893(q("0.28.9.3")+"&archOptics=classic"),false);
 assert.equal(archOpticsEnabled02893("?track=skyline&v=0.28.9.3"),false);
 assert.equal(archOpticsEnabled02893("?track=aurora&v=0.28.9.3"),false);
 assert.equal(archRoadEnabled02893(q("0.28.9.3")+"&archRoad=classic"),false);
 assert.equal(archRoadEnabled02893(q("0.28.9.3")),true);
 assert.equal(ARCH_OPTICS_02893.sourceDrawCallsAdded,0);
});
test("original arch quad inventory excludes later continuous wall-guide quads",()=>{
 const count=archCoreVertices02893();
 assert.equal(count,TUNNEL_PORTALS_0211.length*(TUNNEL_PROFILE_0211.length-12)*6);
 const g=new Geometry(),n=count+150;
 g.setAttribute("position",new Attribute(new Float32Array(n*3),3));
 g.setAttribute("trackS",new Attribute(new Float32Array(n),1));
 const m=buildArchCoreMask02893(g,THREE);
 assert.equal(m.count,n);
 assert.ok([...m.array.slice(0,count)].every(x=>x===1));
 assert.ok([...m.array.slice(count)].every(x=>x===0));
 assert.throws(()=>buildArchCoreMask02893(new Geometry(),THREE),/original/);
});
test("halo original quad subdivided into soft feather without an extra draw batch",()=>{
 const g=new Geometry();
 g.setAttribute("position",new Attribute([
  0,0,0, 0,10,0, 0,10,1, 0,0,0, 0,10,1, 0,0,1],3));
 g.setAttribute("trackS",new Attribute([10,10,10.6,10,10.6,10.6],1));
 g.setAttribute("color",new Attribute(Array.from({length:6},()=>[.2,.8,1]).flat(),3));
 g.setAttribute("glowWeight",new Attribute([.62,.62,.62,.62,.62,.62],1));
 const r=buildArchHaloFeather02893(THREE,g);
 assert.equal(r.quads,1);
 assert.equal(r.triangles,6);
 assert.equal(r.geometry.getAttribute("archFeather02893").count,18);
 assert.ok([...r.geometry.getAttribute("archFeather02893").array].some(x=>x<.1));
 assert.ok([...r.geometry.getAttribute("archFeather02893").array].some(x=>x===1));
 assert.ok([...r.geometry.getAttribute("position").array].every(Number.isFinite));
 assert.ok([...r.geometry.getAttribute("trackS").array].every(Number.isFinite));
});
test("source shader only upgrades original arch and never 0.21.1 wall guides",()=>{
 const vs="#include <common>\n#include <begin_vertex>";
 const fs="#include <common>\ndiffuseColor.rgb = tunnelSpectrumTint()*vTunnelGlow;";
 for(const kind of ["core","halo"]){
  const x=patchArchSource02893(vs,fs,{kind});
  assert.match(x.vertexShader,/vA93Shape/);
  assert.match(x.fragmentShader,/uArchOptics02893/);
  assert.match(x.fragmentShader,/tunnelSpectrumTint/);
  if(kind==="core")assert.match(x.fragmentShader,/0.34\*vA93Shape/);
  else assert.match(x.fragmentShader,/diffuseColor.a\*=mix/);
 }
 assert.throws(()=>patchArchSource02893("bad",fs),/shader/);
});
test("same physical source 3400m arc, actual j6 banked arch, High+4GB sampler",()=>{
 const g=new Geometry();
 const s=[108,292,340,1190,1840,3395];
 g.setAttribute("aTrackCoord",new Attribute(s.flatMap(x=>[x,9.2]),2));
 g.setAttribute("position",new Attribute(s.flatMap(x=>[9.2,0,x]),3));
 const data=buildArchRoadSources02893(g,positionAt,3400);
 assert.equal(data.vertices,s.length);
 assert.equal(data.sourceModules,10);
 assert.equal(data.left.length,s.length*3);
 assert.ok(data.arc.every(x=>x>=0&&x<=3400));
 assert.ok(data.left.every(Number.isFinite));
 assert.ok(data.right.every(Number.isFinite));
 assert.ok(data.sourcePositions>2);
 assert.ok(data.nearArchVertices>=0);
});
test("road shader uses original solar-sealed GGX and true 9-stage wave colors",()=>{
 const source=patchArchRoadShader02893(vertex(),fragment(),{mobile:false});
 assert.match(source.vertexShader,/archArc02893/);
 assert.match(source.fragmentShader,/uA93Old/);
 assert.match(source.fragmentShader,/uA93Next/);
 assert.match(source.fragmentShader,/mod\(vTrackCoord.x-uA93Front/);
 assert.match(source.fragmentShader,/smoothstep\(-66.0,66.0/);
 assert.match(source.fragmentShader,/RE_Direct\(a93Lamp/);
 assert.match(source.fragmentShader,/reflectedLight.directDiffuse=a93DiffuseBefore/);
 assert.match(source.fragmentShader,/a93Shoulder/);
 assert.match(source.fragmentShader,/whiteCore/);
 assert.match(source.fragmentShader,/padCoverage/);
 assert.match(source.fragmentShader,/guided/);
 const m=patchArchRoadShader02893(vertex(),fragment(),{mobile:true});
 assert.match(m.fragmentShader,/vec3 a93Pos=mix/);
 assert.doesNotMatch(m.fragmentShader,/for\(int a93Side/);
 assert.throws(()=>patchArchRoadShader02893(vertex(),"missing"),/GGX/);
});
test("road material is decorated in place, changes no geometry or physics, rollbacks",()=>{
 const g=new Geometry();
 const s=[40,112,182,292,850];
 g.setAttribute("aTrackCoord",new Attribute(s.flatMap(x=>[x,9]),2));
 g.setAttribute("position",new Attribute(s.flatMap(x=>[9,0,x]),3));
 const material={isMeshStandardMaterial:true,needsUpdate:false,
  onBeforeCompile(){},customProgramCacheKey(){return "original";}};
 const old=material.onBeforeCompile,key=material.customProgramCacheKey;
 const mesh={name:"Zone Ribbon · integrated PBR racing deck",geometry:g,material};
 const world={getObjectByName(n){return n===mesh.name?mesh:null;}};
 const ctrl=installArchRoadReflection02893(THREE,world,positionAt,{
  enabled:true,lowMemory:false,trackLength:3400});
 assert.equal(ctrl.active,true);
 assert.equal(ctrl.stats().drawCallsAdded,0);
 assert.equal(ctrl.stats().sourceModules,10);
 ctrl.updateWave({shaderBaseStage:4,fronts:[950],activeCount:1});
 assert.equal(ctrl.stats().colorFrom,ZONE_PALETTES[4].light);
 assert.equal(ctrl.stats().colorTo,ZONE_PALETTES[5].light);
 assert.equal(ctrl.stats().waveFront,950);
 ctrl.setComparison(0);
 assert.equal(ctrl.stats().strength,0);
 const shader={vertexShader:vertex(),fragmentShader:fragment(),uniforms:{}};
 material.onBeforeCompile(shader,null);
 assert.ok(shader.uniforms.uA93Front);
 assert.ok(material.customProgramCacheKey().includes("arch-wave-ggx-02893"));
 ctrl.dispose();ctrl.dispose();
 assert.equal(material.onBeforeCompile,old);
 assert.equal(material.customProgramCacheKey,key);
 assert.equal(g.getAttribute("archLeft02893"),undefined);
 assert.equal(g.getAttribute("archRight02893"),undefined);
 assert.equal(g.getAttribute("archArc02893"),undefined);
});
test("old additive overlay only toggles for explicit diagnostic",()=>{
 const mesh={isMesh:true,name:"Tunnel / NEON_ROAD_RESPONSE",visible:true};
 const world={traverse(fn){fn(mesh);}};
 let d=diagnosticLegacyRoadOverlay02893(world,{enabled:false});
 assert.equal(d.count,1);assert.equal(mesh.visible,true);
 d.dispose();
 d=diagnosticLegacyRoadOverlay02893(world,{enabled:true});
 assert.equal(d.count,1);assert.equal(mesh.visible,false);
 d.dispose();assert.equal(mesh.visible,true);
});
