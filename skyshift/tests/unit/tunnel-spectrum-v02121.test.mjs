import test from "node:test";
import assert from "node:assert/strict";
import {ZONE_PALETTES,ZONE_WAVE,newZoneWaveState,updateZoneWave,frontPaletteBlend} from "../../zone-wave-v060.mjs";
import {TUNNEL_SPECTRUM_02121,tunnelColorAt,createTunnelSpectrumUniforms,
 updateTunnelSpectrumUniforms,bindTunnelSpectrumMaterial} from "../../tunnel/tunnel-spectrum-v02121.mjs";
import {installNeonDrivenInterior} from "../../tunnel/neon-interior-v0212.mjs";
class Color{
 constructor(hex){this.setHex(hex)}
 setHex(hex){this.hex=hex;return this}
}
class Group{
 name="";children=[];parent=null;
 add(x){this.children.push(x);x.parent=this}
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
class Attr{constructor(a,n){this.array=a;this.itemSize=n;this.count=a.length/n}}
class Mesh{
 name="";parent=null;
 constructor(g,m){this.geometry=g;this.material=m}
 traverse(f){f(this)}
 removeFromParent(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this)}
}
class Mat{
 constructor(o){Object.assign(this,o)}
 onBeforeCompile(){}
 customProgramCacheKey(){return "base"}
 dispose(){}
}
const THREE={Color,Group,BufferGeometry:Geo,Float32BufferAttribute:Attr,
 Mesh,MeshBasicMaterial:Mat,MeshStandardMaterial:Mat,
 DoubleSide:2,AdditiveBlending:2};
const positionAt=(s,x,y)=>({x,y,z:s});
test("all nine palettes come from exact 0.6 active zone-wave definition",()=>{
 assert.equal(TUNNEL_SPECTRUM_02121.paletteCount,ZONE_PALETTES.length);
 assert.equal(ZONE_PALETTES.length,9);
 assert.equal(TUNNEL_SPECTRUM_02121.waveFeatherMeters,ZONE_WAVE.atmosphereTransitionMeters);
 for(let j=1;j<ZONE_PALETTES.length;j++){
  const wave=newZoneWaveState();
  wave.waves=[{index:j}];wave.shaderBaseStage=j-1;wave.activeCount=1;
  wave.fronts[0]=175;
  for(const s of [80,120,150,175,200,250,368]){
   const actual=tunnelColorAt(wave,s),expected=frontPaletteBlend(wave,s);
   assert.deepEqual([actual.from,actual.to,actual.mix],
    [expected.from,expected.to,expected.mix]);
   assert.equal(actual.colorFrom,ZONE_PALETTES[j-1].light);
   assert.equal(actual.colorTo,ZONE_PALETTES[j].light);
  }
 }
});
test("shared uniforms switch from cyan to violet, gold, jade with the actual front",()=>{
 const u=createTunnelSpectrumUniforms(THREE);
 assert.equal(u.uTunnelOld.value.hex,ZONE_PALETTES[0].light);
 assert.equal(u.uTunnelActive.value,0);
 const wave=newZoneWaveState();
 for(let stage=1;stage<=3;stage++){
  wave.shaderBaseStage=stage-1;wave.activeCount=1;wave.fronts[0]=140+stage*3;
  const status=updateTunnelSpectrumUniforms(u,wave);
  assert.equal(status.stage,stage-1);
  assert.equal(u.uTunnelOld.value.hex,ZONE_PALETTES[stage-1].light);
  assert.equal(u.uTunnelNext.value.hex,ZONE_PALETTES[stage].light);
  assert.equal(u.uTunnelFront.value,140+stage*3);
  assert.equal(u.uTunnelActive.value,1);
 }
});
test("GPU material compiles spatial transition + moving white crest without a new clock",()=>{
 const uniforms=createTunnelSpectrumUniforms(THREE);
 for(const mode of ["shell","rib","emitter","halo","reflection"]){
  const m=bindTunnelSpectrumMaterial(new Mat({}),uniforms,mode);
  const shader={uniforms:{},
   vertexShader:"#include <common>\n#include <begin_vertex>",
   fragmentShader:"#include <common>\n#include <color_fragment>"};
  m.onBeforeCompile(shader,{});
  assert.match(shader.vertexShader,/attribute float trackS/);
  assert.match(shader.vertexShader,/attribute float glowWeight/);
  assert.match(shader.fragmentShader,/tunnelSpectrumTint/);
  assert.match(shader.fragmentShader,/smoothstep/);
  assert.match(shader.fragmentShader,/whiteCore/);
  assert.equal(shader.uniforms.uTunnelFront,uniforms.uTunnelFront);
  assert.match(m.customProgramCacheKey(),/skyshift-tunnel-spectrum-02121/);
 }
});
test("all wall roof arch neon halo and bounce share one wave without geometry change",()=>{
 const world=new Group();
 const i=installNeonDrivenInterior(THREE,world,{positionAt});
 assert.equal(i.stats().status,"active",JSON.stringify(i.stats()));
 assert.equal(i.stats().drawBatches,5);
 const group=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 assert.ok(group);
 for(const m of group.children){
  assert.equal(m.geometry.getAttribute("trackS").count,
   m.geometry.getAttribute("position").count,m.name);
  assert.equal(m.geometry.getAttribute("glowWeight").count,
   m.geometry.getAttribute("position").count,m.name);
  const shader={uniforms:{},
   vertexShader:"#include <common>\n#include <begin_vertex>",
   fragmentShader:"#include <common>\n#include <color_fragment>"};
  m.material.onBeforeCompile(shader,{});
  assert.ok(shader.uniforms.uTunnelFront,m.name);
 }
 const wave=newZoneWaveState();wave.activeCount=1;wave.shaderBaseStage=1;wave.fronts[0]=195;
 i.updateWave(wave);
 assert.equal(i.stats().currentSpectrumStage,1);
 assert.equal(i.stats().currentSpectrumTo,2);
 assert.equal(i.stats().currentWaveFront,195);
 assert.equal(i.stats().waveSynchronized,true);
 assert.equal(i.stats().globalLightsChanged,0);
 assert.equal(i.stats().originalGRIPUntouched,true);
});
test("low memory keeps all neon synchronized with no extra light batch",()=>{
 const world=new Group();
 const i=installNeonDrivenInterior(THREE,world,{positionAt,lowMemory:true});
 assert.equal(i.stats().status,"active",JSON.stringify(i.stats()));
 assert.equal(i.stats().drawBatches,3);
 const g=world.getObjectByName("SKYSHIFT · Tunnel Megastructure 0.21.1");
 assert.equal(g.children.length,3);
 for(const m of g.children)assert.ok(m.geometry.getAttribute("trackS"));
});
