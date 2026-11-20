// SKYSHIFT 0.23.3 full-length metal continuity and sun-safe shader QA.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildStructuralTunnelData} from "./structural-tunnel-v0213.mjs";
import {patchPremiumMaterialShader} from "./premium-material-rebirth-v0220.mjs";
import {patchCinematicNeonShader} from "./cinematic-neon-lighting-v0220p2.mjs";
import {patchPhysicalMaterialShader} from "./physical-material-rebuild-v0230.mjs";
import {patchTrueMaterialDepthShader} from "./true-material-depth-v0231.mjs";
import {patchLightArchitectureShader} from "./cinematic-light-architecture-v0232.mjs";
import {UNIFIED_TUNNEL_0233,patchUnifiedTunnelShader}
 from "./unified-tunnel-materials-v0233.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const vertex="#include <common>\nattribute float trackS;\nattribute float glowWeight;\n#include <begin_vertex>";
const fragment="#include <common>\n#include <color_fragment>\ndiffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;";
function compose(role,mobile=false){
 const p1=patchPremiumMaterialShader(vertex,fragment,{role,mobile});
 const p2=patchCinematicNeonShader(p1.vertexShader,p1.fragmentShader,{mobile});
 const p23=patchPhysicalMaterialShader(p2.vertexShader,p2.fragmentShader,{role,mobile});
 const p31=patchTrueMaterialDepthShader(p23.vertexShader,p23.fragmentShader,{role,mobile});
 const p32=(role==="panel"||(!mobile&&role==="conduit"))?
  patchLightArchitectureShader(p31.vertexShader,p31.fragmentShader,{role,mobile}):p31;
 return {original:p32,unified:patchUnifiedTunnelShader(
  p32.vertexShader,p32.fragmentShader,{role})};
}
test("all genuine panel, conduit, shell and rib shaders gain continuous 0.23 lighting",()=>{
 for(const role of ["panel","conduit","shell","rib"]){
  for(const mobile of (role==="conduit"?[false]:[true,false])){
   const {original,unified}=compose(role,mobile);
   const f=unified.fragmentShader;
   assert.equal(unified.vertexShader,original.vertexShader);
   assert.match(f,/uniform float uUnifiedExtent0233/);
   assert.match(f,/float p23Gallery=mix\(smoothstep\(78\.0,98\.0,vRebirthTrack\)/);
   assert.match(f,/1\.0,uUnifiedExtent0233\);/);
   assert.match(f,/max\(p23Original,p23Result\),uUnifiedExtent0233/);
   assert.match(f,/diffuseColor.rgb=mix\(p23Original/);
   assert.match(f,/diffuseColor.rgb\+=uCinematicNeonMix/);
   assert.match(f,/tunnelSpectrumTint\(\)\*vTunnelGlow/);
   assert.doesNotMatch(f,/uniform DirectionalLight|sunPosition/);
   if(role==="panel"||role==="conduit"){
    assert.match(f,/float c32Gallery=mix\(smoothstep\(88\.0,110\.0,vRebirthTrack\)/);
    assert.match(f,/c32Contribution/);
   }else assert.doesNotMatch(f,/float c32Gallery=mix\(/);
  }
 }
});
test("unchanged 0.23.2 base shader remains independent of 0.23.3 toggling",()=>{
 const p=compose("panel");
 assert.doesNotMatch(p.original.fragmentShader,/uUnifiedExtent0233/);
 assert.match(p.original.fragmentShader,/float p23Gallery=smoothstep/);
 assert.match(p.original.fragmentShader,/diffuseColor.rgb=mix\(p23Original,p23Result,p23Mix\)/);
 assert.throws(()=>patchUnifiedTunnelShader(vertex,fragment));
 assert.throws(()=>patchUnifiedTunnelShader(vertex,fragment,{role:"road"}));
});
test("sculpted 0.58m panel cross section persists before, during and after gallery",()=>{
 const at=(s,x,y)=>({x:s,y,z:x});
 const old=buildStructuralTunnelData(at,{flowCohesion:true,depthStudy:true});
 const full=buildStructuralTunnelData(at,{flowCohesion:true,depthStudy:true,unifiedDepth:true});
 assert.equal(old.unifiedDepth,false);
 assert.equal(full.unifiedDepth,true);
 assert.equal(full.plateCount,old.plateCount);
 assert.equal(full.geometryBatches,old.geometryBatches);
 assert.ok(full.totalTriangles>old.totalTriangles+1000);
 assert.ok(full.primary.positions.every(Number.isFinite));
 for(const [start,end] of [[12,50],[115,260],[320,358]]){
  const points=full.primary.trackS.filter(s=>s>start&&s<end).length;
  assert.ok(points>80,"full true-depth panels absent at "+start);
 }
 const low=buildStructuralTunnelData(at,{lowMemory:true,flowCohesion:true,
  depthStudy:true,unifiedDepth:true});
 const baseline=buildStructuralTunnelData(at,{lowMemory:true,flowCohesion:true,
  depthStudy:true});
 assert.equal(baseline.depthStudy,false);
 assert.equal(low.depthStudy,true);
 assert.equal(low.unifiedDepth,true);
 assert.equal(low.geometryBatches,1);
 assert.equal(low.detail.triangles,0);
 assert.ok(low.totalTriangles>baseline.totalTriangles);
 assert.ok(low.totalTriangles<full.totalTriangles);
});
test("0.23.3 only changes tunnel shader and panel geometry, not lighting or physics",()=>{
 const d=UNIFIED_TUNNEL_0233;
 assert.equal(d.fullTunnelStart,0);
 assert.equal(d.fullTunnelEnd,368);
 assert.equal(d.referenceVersion,"0.23.2");
 for(const k of ["additionalMeshes","additionalDrawCalls","additionalLights",
  "additionalRenderPasses","additionalTextures","newColliders"])
  assert.equal(d[k],0);
 for(const k of ["changesShip","changesRoad","changesRail","changesGRIP",
  "changesPhysics","changesCamera","changesZoneWave","changesSolarSeal"])
  assert.equal(d[k],false);
 const game=read("./game-v0210.mjs");
 assert.match(game,/unifiedTunnelEnabled=lightArchitectureEnabled/);
 assert.match(game,/unifiedTunnelEnabled\?installUnifiedTunnelMaterials/);
 assert.match(game,/__skyshiftUnifiedTunnelProbe/);
 assert.match(game,/__skyshiftUnifiedTunnelFrameProof/);
 assert.match(game,/compareBeforeUnifiedTunnel:"\?unifiedTunnel=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.25\.0/);
 assert.match(read("./index.html"),/SKYSHIFT.*0\.25\.0/);
});
