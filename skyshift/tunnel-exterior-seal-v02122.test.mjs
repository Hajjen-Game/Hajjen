// SKYSHIFT 0.21.2.2 — isolate fog on actual tunnel materials, not the world.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {EXTERIOR_SEAL_02122,installExteriorLightSeal,sealPremiumRoadGlare} from "./tunnel-exterior-seal-v02122.mjs";
import {installNeonDrivenInterior} from "./neon-interior-v0212.mjs";
import {newZoneWaveState,ZONE_PALETTES} from "./zone-wave-v060.mjs";
import {patchRailShaders} from "./aero-barrier-v0165.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
class Color{constructor(hex){this.setHex(hex)}setHex(hex){this.hex=hex;return this}}
class Group{
 name="";children=[];parent=null;
 add(x){x.parent=this;this.children.push(x)}
 removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
 traverse(f){f(this);for(const c of this.children)c.traverse?.(f)}
 getObjectByName(n){if(this.name===n)return this;for(const c of this.children){const x=c.getObjectByName?.(n);if(x)return x}return null}
}
class Geo{
 attributes={};index=null;
 setAttribute(k,v){this.attributes[k]=v}
 getAttribute(k){return this.attributes[k]}
 setIndex(a){this.index={array:a,count:a.length}}
 computeVertexNormals(){}computeBoundingSphere(){}dispose(){}
}
class Attr{constructor(a,n){this.array=a;this.itemSize=n;this.count=a.length/n}getX(i){return this.array[i*this.itemSize]}}
class Mesh{
 name="";parent=null;constructor(g,m){this.geometry=g;this.material=m}
 traverse(f){f(this)}
 removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
}
class Mat{
 constructor(p){Object.assign(this,p);this.fog=p.fog??true}
 onBeforeCompile(){}customProgramCacheKey(){return "base"}dispose(){}
}
const THREE={Color,Group,BufferGeometry:Geo,Float32BufferAttribute:Attr,
 Mesh,MeshBasicMaterial:Mat,MeshStandardMaterial:Mat,DoubleSide:2,AdditiveBlending:2};
const positionAt=(s,x,y)=>({x,y,z:s});
function load(fn=installExteriorLightSeal,opts={}){
 const world=new Group(),installed=fn(THREE,world,{positionAt,...opts});
 return {world,installed,
  group:world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1")};
}
test("all tunnel materials have fog disabled; classic interior still has global fog",()=>{
 const classic=load(installNeonDrivenInterior),newVersion=load();
 assert.equal(classic.installed.stats().status,"active");
 assert.equal(newVersion.installed.stats().status,"active");
 assert.equal(newVersion.group.children.length,5);
 assert.ok(classic.group.children.every(m=>m.material.fog===true));
 assert.ok(newVersion.group.children.every(m=>m.material.fog===false));
 assert.equal(newVersion.installed.stats().fogDisabledMaterialCount,5);
 assert.equal(newVersion.installed.stats().exteriorFogSealed,true);
 assert.equal(newVersion.installed.stats().sceneFogChanged,false);
 assert.equal(newVersion.installed.stats().globalLightsChanged,0);
 assert.equal(newVersion.installed.stats().addedRenderPasses,0);
 assert.equal(newVersion.installed.stats().drawBatches,5);
 assert.equal(newVersion.installed.stats().shellBounceReduced,true);
 assert.ok(newVersion.installed.stats().bounceSamples>5000);
 assert.equal(newVersion.installed.stats().roadMeshUntouched,true);
});
test("original tunnel geometry and GRIP survive the fog seal without any movement",()=>{
 const a=load(installNeonDrivenInterior),b=load();
 for(const type of ["Tunnel / CLOSED_SHELL","Tunnel / CURVED_RIBS",
   "Tunnel / INTEGRATED_LIGHT","Tunnel / HALO","Tunnel / NEON_ROAD_RESPONSE"]){
  const m=a.group.children.find(m=>m.name===type),
        n=b.group.children.find(m=>m.name===type);
  assert.ok(m&&n,type);
  assert.deepEqual(m.geometry.getAttribute("position").array,
   n.geometry.getAttribute("position").array,type);
  assert.equal(m.material.fog,true);
  assert.equal(n.material.fog,false);
 }
 const oldGlow=a.group.children.find(x=>x.name==="Tunnel / CLOSED_SHELL").geometry.getAttribute("glowWeight");
 const newGlow=b.group.children.find(x=>x.name==="Tunnel / CLOSED_SHELL").geometry.getAttribute("glowWeight");
 assert.ok(newGlow.getX(1000)<oldGlow.getX(1000),
  "Broad colored light must become more localized near neon arches");
 assert.equal(b.installed.stats().colliders,0);
 assert.equal(b.installed.stats().originalGRIPUntouched,true);
 const wave=newZoneWaveState();
 wave.shaderBaseStage=2;wave.activeCount=1;wave.fronts[0]=230;
 b.installed.updateWave(wave);
 assert.equal(b.installed.stats().currentSpectrumStage,2);
 assert.equal(b.installed.stats().currentSpectrumTo,3);
 assert.equal(b.installed.stats().currentWaveFront,230);
});
test("4GB tier retains sealed vaulted shell + colored arcs with no extra draw calls",()=>{
 const low=load(installExteriorLightSeal,{lowMemory:true});
 assert.equal(low.installed.stats().status,"active");
 assert.equal(low.installed.stats().drawBatches,3);
 assert.equal(low.installed.stats().fogDisabledMaterialCount,3);
 assert.ok(low.group.children.every(m=>m.material.fog===false));
 const alt=load(installExteriorLightSeal,{track:"aurora"});
 assert.equal(alt.installed.stats().active,false);
});
test("rail inlay glare reduction applies only within first 368m and is opt-in",()=>{
 assert.equal(EXTERIOR_SEAL_02122.railGlareInteriorScale,.52);
 assert.equal(EXTERIOR_SEAL_02122.railGlareFadeStart,344);
 assert.equal(EXTERIOR_SEAL_02122.railGlareFadeEnd,368);
 assert.equal(EXTERIOR_SEAL_02122.outsideRailScale,1);
 assert.equal(EXTERIOR_SEAL_02122.additionalDrawCalls,0);
 const vertex="#include <common>\n#include <begin_vertex>";
 const frag="#include <common>\n#include <color_fragment>";
 const changed=patchRailShaders(vertex,frag);
 assert.match(changed.fragmentShader,/uniform float uRailInteriorSeal/);
 assert.match(changed.fragmentShader,/smoothstep\(344\.0,368\.0,vRailCoord\.x\)/);
 assert.match(changed.fragmentShader,/railWhite/);
 const g=read("./game-v0210.mjs");
 assert.match(g,/identitySurface\?\.setTunnelGlareScale/);
 assert.match(g,/exteriorSealEnabled\?installExteriorLightSeal:installNeonDrivenInterior/);
 assert.match(g,/exteriorSeal"\)!=="classic"/);
 assert.match(g,/compareBeforeExteriorSeal:"\?exteriorSeal=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.\d+/);
});

test("only the final PBR road shoulder highlight is sealed, not lane, physics or rest of track",()=>{
 const material=new Mat({});
 const original=material.onBeforeCompile;
 sealPremiumRoadGlare(material);
 const shader={uniforms:{},
  vertexShader:"#include <common>\n#include <begin_vertex>",
  fragmentShader:"varying vec2 vTrackCoord;\n#include <opaque_fragment>"};
 material.onBeforeCompile(shader,{});
 assert.match(shader.fragmentShader,/sealAlongRoad/);
 assert.match(shader.fragmentShader,/smoothstep\(344\.0,368\.0,vTrackCoord\.x\)/);
 assert.match(shader.fragmentShader,/smoothstep\(6\.8,9\.2,abs\(vTrackCoord\.y\)\)/);
 assert.match(shader.fragmentShader,/gl_FragColor\.rgb \*= mix\(1\.0,0\.43,sealedSpecular\)/);
 assert.equal(typeof original,"function");
 assert.match(material.customProgramCacheKey(),/exterior-seal-02122/);
});
