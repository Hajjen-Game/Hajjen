import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createAeroBarrierData,RAIL_BODY_CONTAINMENT_02124,
 patchAeroBodyShaders,installAeroBarriers} from "./aero-barrier-v0165.mjs";
import {TRIAL} from "./trial-v0165.mjs";
const source=p=>readFileSync(new URL(p,import.meta.url),"utf8");
test("PBR rail body has precise arc-length on BOTH sides and no geometry edits",()=>{
 const g=createAeroBarrierData(5);
 assert.equal(g.positions.length/3,g.trackS.length);
 assert.equal(g.colors.length/3,g.trackS.length);
 assert.equal(g.indices.length/3,g.triangles);
 assert.ok(g.trackS.length>2000);
 assert.ok(g.trackS[0]===0);
 assert.ok(Math.abs(g.trackS.at(-1)-TRIAL.length)<2);
 // Every row follows the exact same s, not estimated from world XYZ.
 for(let i=0;i<g.columns;i++)assert.equal(g.trackS[i],0);
 for(let row=0;row<3;row++)for(let j=1;j<g.columns;j++)
  assert.equal(g.trackS[row*g.columns+j],g.trackS[row*g.columns]);
});
test("only PBR metal shell changes, LED inlay shader stays original",()=>{
 const v="#include <common>\n#include <begin_vertex>";
 const f="#include <common>\n#include <color_fragment>\n"+
  "#include <roughnessmap_fragment>\n#include <metalnessmap_fragment>\n"+
  "#include <lights_fragment_end>";
 const p=patchAeroBodyShaders(v,f);
 assert.match(p.vertexShader,/attribute float aBarrierArc/);
 assert.match(p.vertexShader,/vBarrierArc=aBarrierArc/);
 assert.match(p.fragmentShader,/uRailBodyContainment/);
 assert.match(p.fragmentShader,/smoothstep\(340\.0,368\.0,vBarrierArc\)/);
 assert.match(p.fragmentShader,/metalnessFactor=mix\(metalnessFactor,0\.04/);
 assert.match(p.fragmentShader,/roughnessFactor=mix\(roughnessFactor,0\.98/);
 assert.match(p.fragmentShader,/reflectedLight\.directSpecular\*=mix\(1\.0,0\.055/);
 assert.match(p.fragmentShader,/reflectedLight\.indirectSpecular\*=mix\(1\.0,0\.10/);
 assert.equal(RAIL_BODY_CONTAINMENT_02124.drawBatchesAdded,0);
 assert.equal(RAIL_BODY_CONTAINMENT_02124.waveChanged,false);
 assert.equal(RAIL_BODY_CONTAINMENT_02124.collidersChanged,false);
 const rails=source("./aero-barrier-v0165.mjs");
 assert.match(rails,/railUniforms\.uRailBase/);
 assert.match(rails,/railColor=mix/);
 assert.match(rails,/setRailBodyContainment/);
 assert.match(rails,/getRailBodyContainment/);
});
test("the isolated white-hotspot fix is enabled by default with exact original A/B",()=>{
 const s=source("./game-v0210.mjs");
 assert.match(s,/railBodyContainmentEnabled=whiteCoreEnabled/);
 assert.match(s,/get\("railBody"\)!=="classic"/);
 assert.match(s,/setRailBodyContainment\?\.\(railBodyContainmentEnabled\?1:0\)/);
 assert.match(s,/compareBeforeRailBody:"\?railBody=classic"/);
 assert.match(s,/whiteCoreContainment\?\.update/);
 assert.match(source("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.23\.1/);
 const current=source("./boot-v0210.js").match(/game-v0210\.mjs\?v=(0\.23\.1)/)?.[1];
 assert.ok(current,"the corrected road/rail game must carry a version key");
 assert.ok(source("./index.html").includes(`boot-v0210.js?v=${current}`));
});
