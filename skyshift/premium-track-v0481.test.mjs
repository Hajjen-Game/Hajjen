// SKYSHIFT 0.4.8.1 — premium world-space deck material without floating overlays.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 PREMIUM_TRACK,GLSL_BOOST_PADS,SURFACE_FRAGMENT_GLSL,
 SURFACE_FRAGMENT_HELPERS,premiumTrackCoordinates,
 createPremiumDeckGeometry,patchPremiumShaders,createPremiumTrackMaterial
} from "./premium-track-v0481.mjs";
import {BOOST_PADS,BOOST_CONFIG} from "./boost-v048.mjs";
import {TRIAL,widthAt,positionAt,newFlightState,stepFlight} from "./trial-v048.mjs";
import {createSmoothDeckData,MESH_SPEC} from "./smooth-track-v046.mjs";
const source=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const near=(a,b,tolerance=1e-6)=>assert.ok(Math.abs(a-b)<tolerance,
 `expected ${a} near ${b}`);
test("premium deck uses same indexed road as 0.4.6 with arc-length and lateral coords",()=>{
 const {data,coords}=premiumTrackCoordinates();
 const old=createSmoothDeckData();
 assert.deepEqual(data.positions,old.positions);
 assert.deepEqual(data.indices,old.indices);
 assert.equal(coords.length,data.rows*data.cols*2);
 const at=(row,col)=>coords.slice((row*data.cols+col)*2,
  (row*data.cols+col)*2+2);
 for(const row of [0,95,Math.floor(data.rows/2),data.rows-1]){
  const s=row*TRIAL.length/(data.rows-1);
  near(at(row,0)[0],s);
  near(at(row,0)[1],-widthAt(s)/2);
  near(at(row,Math.floor(data.cols/2))[1],0);
  near(at(row,data.cols-1)[1],widthAt(s)/2);
 }
 assert.equal(data.cols,MESH_SPEC.lateralColumns);
 assert.equal(PREMIUM_TRACK.drawBatches,1);
 assert.equal(PREMIUM_TRACK.floatingDecalBatches,0);
});
test("premium deck geometry is one continuous indexed object with shader coordinates",()=>{
 class G{
  setAttribute(k,v){(this.attrs??={})[k]=v;}
  setIndex(ix){this.indices=ix;}
  computeVertexNormals(){this.smooth=true;}
  computeBoundingSphere(){this.hasBounds=true;}
 }
 class A{constructor(data,cols){this.data=data;this.cols=cols;}}
 const THREE={BufferGeometry:G,Float32BufferAttribute:A};
 const geo=createPremiumDeckGeometry(THREE);
 assert.ok(geo.smooth&&geo.hasBounds);
 assert.equal(geo.attrs.aTrackCoord.cols,2);
 assert.equal(geo.attrs.position.cols,3);
 assert.equal(geo.attrs.aTrackCoord.data.length,
  geo.attrs.position.data.length/3*2);
 assert.ok(geo.indices.length>10000);
 assert.equal(new Set(geo.indices).size,geo.attrs.position.data.length/3);
 assert.equal(geo.attrs.color,undefined,
  "old row-based tint should not compete with integrated palette");
});
test("shader patch retains Three.js PBR chunks and writes long lane guides to surface color",()=>{
 const vertex=`#include <common>
void main() { #include <begin_vertex> }`;
 const fragment=`#include <common>
void main() {
vec4 diffuseColor = vec4(1.0);
vec3 totalEmissiveRadiance = vec3(0.0);
#include <color_fragment>
#include <emissivemap_fragment>
}`;
 const output=patchPremiumShaders(vertex,fragment);
 assert.match(output.vertexShader,/attribute vec2 aTrackCoord/);
 assert.match(output.vertexShader,/vTrackCoord = aTrackCoord/);
 assert.match(output.fragmentShader,/trackStripe\(absL, 4\.0/);
 assert.match(output.fragmentShader,/trackStripe\(absL, 8\.8/);
 assert.match(output.fragmentShader,/diffuseColor\.rgb = road/);
 assert.match(output.fragmentShader,/totalEmissiveRadiance \+= uTrackGuide/);
 assert.ok(output.fragmentShader.includes("#include <color_fragment>"));
 assert.ok(output.fragmentShader.includes("#include <emissivemap_fragment>"));
 assert.ok(output.fragmentShader.indexOf("#include <emissivemap_fragment>") <
  output.fragmentShader.indexOf("totalEmissiveRadiance +="));
 assert.throws(()=>patchPremiumShaders("bad","bad"),/unsupported/);
});
test("embedded booster graphics use EXACT authoritative pad boundaries",()=>{
 assert.equal(BOOST_CONFIG.multiplier,1.30);
 assert.equal(GLSL_BOOST_PADS.length,BOOST_PADS.length);
 for(let i=0;i<BOOST_PADS.length;i++){
  const visual=GLSL_BOOST_PADS[i],physical=BOOST_PADS[i];
  assert.deepEqual(visual,{id:physical.id,start:physical.start,end:physical.end,
   min:physical.lateralMin,max:physical.lateralMax});
  assert.match(SURFACE_FRAGMENT_GLSL,new RegExp(physical.start.toFixed(3)));
  assert.match(SURFACE_FRAGMENT_GLSL,new RegExp(physical.end.toFixed(3)));
 }
 assert.match(SURFACE_FRAGMENT_GLSL,/boostArrows/);
 assert.doesNotMatch(SURFACE_FRAGMENT_GLSL,/max\(max\(/,
   "A shader max() must have exactly two scalar/vector arguments");
 assert.match(SURFACE_FRAGMENT_GLSL,/padCoverage \* 0\.23/);
 assert.doesNotMatch(SURFACE_FRAGMENT_GLSL,/uTime|sin\(uTime|flash/);
 assert.match(SURFACE_FRAGMENT_HELPERS,/trackChevron/);
});
test("materials use stable shader uniforms and palette can be recolored without new geometry",()=>{
 class C{
  constructor(v){this.value=v;}
  set(next){this.value=next;return this;}
 }
 class M{
  constructor(options){this.options=options;}
 }
 const THREE={Color:C,MeshStandardMaterial:M,DoubleSide:2};
 const track=createPremiumTrackMaterial(THREE);
 assert.equal(track.material.options.metalness,.52);
 assert.equal(track.material.options.roughness,.38);
 assert.equal(track.material.options.vertexColors,undefined);
 assert.equal(track.material.customProgramCacheKey(),PREMIUM_TRACK.version);
 const shader={
  vertexShader:"#include <common>\n#include <begin_vertex>",
  fragmentShader:"#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>",
  uniforms:{}
 };
 track.material.onBeforeCompile(shader);
 assert.deepEqual(Object.keys(shader.uniforms).sort(),
  ["uTrackBase","uTrackBand","uTrackGuide","uTrackAccent","uTrackBoost"].sort());
 const previous=shader.uniforms.uTrackBase.value;
 track.setPalette({base:0x993344,boost:0x55aaff});
 assert.equal(shader.uniforms.uTrackBase.value,previous);
 assert.equal(shader.uniforms.uTrackBase.value.value,0x993344);
 assert.equal(shader.uniforms.uTrackBoost.value.value,0x55aaff);
});
test("0.4.8 authoritative speed & steering remain exactly unchanged",()=>{
 const state=newFlightState();
 let count=0;
 for(let i=0;i<130;i++){
  const x=stepFlight(state,1/120,{steer:0});
  if(x.boostActivated)count++;
  if(state.finished)break;
 }
 assert.ok(count>=1);
 assert.ok(state.peakSpeed>52);
 assert.ok(state.railContacts===0);
 assert.equal(TRIAL.maxYawRate,1.24);
 assert.equal(TRIAL.startSpeed,44);
 assert.equal(TRIAL.endSpeed,47);
});
test("active 0.4.8.1 game removes all three floating neon decal batches",()=>{
 const g=source("game-v0481.mjs");
 const html=source("index.html");
 assert.match(html,/boot-v0495\.js\?v=0\.4\.9\.5/);
 assert.match(g,/createPremiumDeckGeometry\(THREE\)/);
 assert.match(g,/createPremiumTrackMaterial\(THREE\)/);
 assert.match(g,/from "\.\/trial-v048\.mjs"/);
 assert.match(g,/from "\.\/aero-barrier-v047\.mjs"/);
 assert.match(g,/from "\.\/cinematic-v045\.mjs"/);
 assert.doesNotMatch(g,/installZoneSurface\(THREE,world\)/);
 assert.doesNotMatch(g,/createSmoothDeckGeometry\(THREE,surfaceColor\)/);
 assert.doesNotMatch(g,/buildGeometry\(laneGuides\)/);
 assert.match(g,/if\(arch\.label==="FINISH"\)/);
 assert.doesNotMatch(g,/makeBillboard\("LONG LEFT"/);
 assert.doesNotMatch(g,/makeBillboard\("LONG RIGHT"/);
 assert.match(g,/version:"0\.4\.8\.1"/);
 assert.match(g,/skyshift-premium-v0481-audit\.json/);
});
