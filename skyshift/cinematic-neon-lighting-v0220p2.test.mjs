// SKYSHIFT 0.22.0 Pass 2 — banked-neon placement and material lighting regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {CINEMATIC_NEON_0220_P2,buildTunnelNeonLocalData,
 patchCinematicNeonShader} from "./cinematic-neon-lighting-v0220p2.mjs";
import {patchPremiumMaterialShader} from "./premium-material-rebirth-v0220.mjs";
import {TUNNEL_PORTALS_0211} from "./tunnel-megastructure-v0211.mjs";
const read=p=>readFileSync(new URL(p,import.meta.url),"utf8");
const near=(a,b,tol=.008)=>assert.ok(Math.abs(a-b)<=tol,
 "local reference mismatch "+a+" vs "+b);
const coord=(s,l,y)=>({
 x:s*.46+l*.77-y*.23, y:y*.87+l*.26,
 z:s*.86+l*.57+y*.12
});
function geometryFor(points,positionAt=coord){
 const packed=[],ss=[];
 for(const [s,l,y] of points){
  const p=positionAt(s,l,y);
  packed.push(p.x,p.y,p.z);ss.push(s);
 }
 const mk=(arr,stride)=>({count:arr.length/stride,
  getX:i=>arr[i*stride],getY:i=>arr[i*stride+1],getZ:i=>arr[i*stride+2]});
 return {getAttribute(k){return k==="position"?mk(packed,3):
  k==="trackS"?mk(ss,1):null}};
}
const vBasic=[
 "#include <common>",
 "attribute float trackS;",
 "attribute float glowWeight;",
 "#include <begin_vertex>"
].join("\n");
const fBasic=[
 "#include <common>",
 "#include <color_fragment>",
 "diffuseColor.rgb += tunnelSpectrumTint()*vTunnelGlow;"
].join("\n");
const vStandard="#include <common>\n#include <begin_vertex>";
const fStandard=[
 "#include <common>","#include <color_fragment>",
 "#include <roughnessmap_fragment>","#include <metalnessmap_fragment>",
 "#include <emissivemap_fragment>","#include <lights_fragment_end>"
].join("\n");
test("actual world-to-track inversion works in banked curved tunnel, including repeated frames",()=>{
 const points=[
  [0,-25.2,15.3],[0,0,29.4],[42,25.2,15.6],
  [165,-23.5,20.2],[165,20.2,27.5],
  [282,-12.9,28.2],[368,25.2,8.3]
 ];
 const data=buildTunnelNeonLocalData(geometryFor(points),coord);
 assert.equal(data.vertices,points.length);
 assert.equal(data.frames,new Set(points.map(x=>x[0])).size);
 for(let i=0;i<points.length;i++){
  near(data.coordinates[i*2],points[i][1]);
  near(data.coordinates[i*2+1],points[i][2]);
 }
});
test("degenerate/non-finite geometry cannot silently corrupt road or shader",()=>{
 assert.throws(()=>buildTunnelNeonLocalData({getAttribute(){return null}},coord));
 const g=geometryFor([[42,25,15]]);
 assert.throws(()=>buildTunnelNeonLocalData(g,()=>({x:0,y:0,z:0})));
});
test("neon bounce composes after original Pass 1 material for real MeshBasic vault",()=>{
 const base=patchPremiumMaterialShader(vBasic,fBasic,{role:"shell"});
 const lit=patchCinematicNeonShader(base.vertexShader,base.fragmentShader);
 assert.equal((lit.vertexShader.match(/attribute vec2 neonLocalSection;/g)||[]).length,1);
 assert.match(lit.vertexShader,/vNeonLocalSection=neonLocalSection/);
 assert.match(lit.fragmentShader,/cinemaSide=abs\(vNeonLocalSection\.x\)/);
 assert.match(lit.fragmentShader,/cinemaHeight=vNeonLocalSection\.y/);
 assert.match(lit.fragmentShader,/cinemaWall=/);
 assert.match(lit.fragmentShader,/cinemaRoof=/);
 assert.match(lit.fragmentShader,/cinemaArch=/);
 assert.match(lit.fragmentShader,/cinemaEdgePower=/);
 assert.match(lit.fragmentShader,/uCinematicNeonMix\*uRebirthMaterial\*cinemaBounce/);
 assert.equal((lit.fragmentShader.match(/cinemaPortalD=min/g)||[]).length,
  TUNNEL_PORTALS_0211.length);
 assert.equal((lit.fragmentShader.match(/exp\(-0\.5\*pow\(cinemaPortalD/g)||[]).length,1);
 assert.ok(lit.fragmentShader.indexOf("cinemaBounce=")>
  lit.fragmentShader.indexOf("diffuseColor.rgb=mix(rbOriginal,rbFinish"));
 assert.match(lit.fragmentShader,/vec3 cinemaSpectral=min\(max\(rbTint,vec3\(0\.0\)\),vec3\(0\.78\)\)/);
 assert.doesNotMatch(lit.fragmentShader,/reflectedLight|new THREE\.DirectionalLight/);
 assert.throws(()=>patchCinematicNeonShader(vBasic,fBasic));
});
test("tunnel PBR lighting remains isolated when actual standard material is used",()=>{
 const base=patchPremiumMaterialShader(vStandard,fStandard,{role:"rib"});
 const lit=patchCinematicNeonShader(base.vertexShader,base.fragmentShader);
 assert.match(lit.fragmentShader,/reflectedLight\.directSpecular\*=mix\(1\.0,0\.025,uRebirthMaterial\)/);
 assert.match(lit.fragmentShader,/cinemaSpectral/);
 assert.match(lit.fragmentShader,/roughnessFactor=mix/);
});
test("mobile preserves all wall/roof zones at reduced effect intensity",()=>{
 const base=patchPremiumMaterialShader(vBasic,fBasic,{role:"panel",mobile:true});
 const lit=patchCinematicNeonShader(base.vertexShader,base.fragmentShader,{mobile:true});
 assert.match(lit.fragmentShader,/cinemaStrip\*0\.205/);
 assert.match(lit.fragmentShader,/cinemaArch\*cinemaVault\*0\.125/);
 assert.match(lit.fragmentShader,/cinemaStrip\*rbBevel\*0\.055/);
 assert.ok(!lit.fragmentShader.includes("cinemaStrip*0.285"));
});
test("no new 3D geometry, gameplay mutation, neutral sun or postprocessing",()=>{
 const p=CINEMATIC_NEON_0220_P2;
 assert.equal(p.source,"existing-four-flow-lines-and-ten-neon-portals");
 assert.equal(p.additionalMeshes,0);
 assert.equal(p.additionalDrawCalls,0);
 assert.equal(p.dynamicLights,0);
 assert.equal(p.postprocessPasses,0);
 assert.equal(p.addedTextures,0);
 assert.equal(p.newColliders,0);
 assert.equal(p.noWhiteSolarSpill,true);
 for(const f of ["changesRoad","changesRail","changesShip","changesCamera",
  "changesPhysics","changesGrip"])assert.equal(p[f],false);
 assert.equal(p.targetMeshes.length,4);
});
test("new version uses exact Pass 1 / previous stable shaders as A/B",()=>{
 const game=read("./game-v0210.mjs");
 assert.match(game,/cinematicNeonEnabled=premiumMaterialRebirthEnabled/);
 assert.match(game,/get\("cinematicNeon"\)!=="classic"/);
 assert.match(game,/installCinematicNeonLighting/);
 assert.match(game,/__skyshiftCinematicNeonProbe/);
 assert.match(game,/__skyshiftCinematicNeonFrameProof/);
 assert.match(game,/compareBeforeCinematicNeon:"\?cinematicNeon=classic"/);
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.22\.0\.2/);
 assert.match(read("./index.html"),/0\.22\.0\.2/);
 assert.match(read("./neon-interior-v0212.mjs"),/shell\.material=bindTunnelSpectrumMaterial\(new THREE\.MeshBasicMaterial/);
});
