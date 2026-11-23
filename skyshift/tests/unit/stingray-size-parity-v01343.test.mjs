// SKYSHIFT 0.13.4.3 — stable scale and faceted tail rollback regression.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {STINGRAY_PRESENTATION_01343,visualSettingsForShip}
 from "../../stingray-presentation-v01343.mjs";
import {MANTA_WING_OUTLINE} from "../../manta-blade-v0484.mjs";
import {STINGRAY_EVO,createTailState,tailPoseStep}
 from "../../ships/stingray-evo-v01342.mjs";
import {buildStingrayHeroV4GLTF,HERO_V4_SPEC}
 from "../../blender/stingray-hero-v4-source-v01342.mjs";
import {SHIP_ART_01342,assessHeroAsset,requestedShipArt}
 from "../../ship-art-pipeline-v01342.mjs";

const source=readFileSync(new URL("../../"+"./assets/ships/stingray-evo-hero-v4.gltf",import.meta.url),"utf8");
const model=JSON.parse(source),buffer=Buffer.from(model.buffers[0].uri.split(",")[1],"base64");
const mesh=n=>model.meshes.find(m=>m.name===n);
function range(name){
 const m=mesh(name);assert.ok(m,"missing part "+name);
 const p=m.primitives[0],a=model.accessors[p.attributes.POSITION];
 return {min:a.min,max:a.max,count:a.count};
}
function sampleTail(data,frames=300){
 const st=createTailState();
 for(let k=0;k<frames;k++)tailPoseStep(st,1/60,data);
 return st;
}
test("the patch is a TRUE rollback of dynamic wing compensation",()=>{
 const game=readFileSync(new URL("../../"+"./game-v01343.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(game,/wing-clearance-v01341|stingrayClearance|clampVisualRoll/);
 assert.match(game,/ship\.rotation\.z=motion\.roll-bankAt\(view\.s\)-/);
 assert.match(game,/const result=stepFlight\(flight,dt,\{steer,grip:gripHeld\}\)/);
 assert.match(game,/visualRoadNormalLiftMeters/);
 assert.match(game,/ship\.scale\.setScalar/);
 assert.doesNotMatch(game,/flight\.y\s*\+=\s*STINGRAY_PRESENTATION/);
 assert.equal(STINGRAY_PRESENTATION_01343.useDynamicWingClearance,false);
 assert.equal(STINGRAY_PRESENTATION_01343.modifyRoll,false);
 assert.equal(STINGRAY_PRESENTATION_01343.modifyGrip,false);
 assert.equal(STINGRAY_PRESENTATION_01343.modifySteering,false);
 assert.equal(STINGRAY_PRESENTATION_01343.modifyCamera,false);
});
test("Stingray matches Manta Blade screen-space beam with constant +18cm road-normal lift",()=>{
 assert.deepEqual(visualSettingsForShip("stingray"),{scale:.72,lift:.18});
 for(const id of ["manta","",null])
  assert.deepEqual(visualSettingsForShip(id),{scale:1,lift:0});
 assert.equal(STINGRAY_PRESENTATION_01343.modifyPhysicalHover,false);
 assert.equal(STINGRAY_PRESENTATION_01343.otherShipsUnaffected,true);
});
test("REAL V4 wing half-span at scale .72 matches REAL Manta Blade within 1%",()=>{
 const mantaHalf=Math.max(...MANTA_WING_OUTLINE.map(([x])=>Math.abs(x)));
 const stingrayHalf=range("Hero_Wing_R").max[0];
 const mantaBeam=mantaHalf*2;
 const stingrayBeam=stingrayHalf*2*STINGRAY_PRESENTATION_01343.visualUniformScale;
 assert.equal(mantaBeam,5.8);
 assert.ok(stingrayBeam>mantaBeam*.99&&stingrayBeam<mantaBeam*1.01,
  "screen-space beam should match standard Manta within 1%");
 assert.ok(Math.abs(stingrayBeam-mantaBeam)<.03);
 assert.equal(STINGRAY_PRESENTATION_01343.visualUniformScale,.72);
 assert.equal(STINGRAY_PRESENTATION_01343.visualRoadNormalLiftMeters,.18);
});
test("published external V4 GLTF exactly equals its reproducible source",()=>{
 const generated=buildStingrayHeroV4GLTF();
 assert.equal(source,generated.content);
 assert.equal(model.meshes.length,34);
 assert.equal(model.materials.length,9);
 assert.equal(buffer.length,model.buffers[0].byteLength);
 assert.equal(model.asset.version,"2.0");
 assert.ok(!model.images&&!model.skins&&!model.animations);
 assert.ok(source.length<HERO_V4_SPEC.maxBytes);
 assert.equal(HERO_V4_SPEC.physicsChanged,false);
 const triangles=model.meshes.reduce((n,m)=>
   n+model.accessors[m.primitives[0].indices].count/3,0);
 assert.ok(triangles<=8000);
});
test("9 REAL mechanical plates have smaller slim, sharp-sided hard surfaces",()=>{
 const widths=[];
 for(let i=1;i<=9;i++){
  const r=range("Hero_Tail_Plate_"+String(i).padStart(2,"0"));
  assert.ok(r.min[2]>=.019&&r.max[2]<=.569);
  assert.ok(r.max[2]-r.min[2]<.56,"visible hinge gap at every joint");
  assert.ok(r.min[1]<0&&r.max[1]>.03);
  widths.push(r.max[0]-r.min[0]);
  assert.ok(r.count>=200,"per-face vertices required for hard edges");
 }
 assert.ok(widths[0]<.7&&widths[0]>.5);
 assert.ok(widths[8]<.2);
 for(let i=1;i<widths.length;i++)
  assert.ok(widths[i]<widths[i-1]);
 assert.equal(STINGRAY_EVO.segmentCount,9);
 assert.equal(STINGRAY_EVO.tailSegmentMeters,.68);
 assert.equal(STINGRAY_PRESENTATION_01343.tailJoints,9);
});
test("V4 art remains a validated real glTF with all legacy rig sockets",()=>{
 const materials=model.materials.map(m=>({name:m.name}));
 const children=model.nodes.map(node=>{
  const p=model.meshes[node.mesh].primitives[0];
  return {name:node.name,isMesh:true,material:materials[p.material],
   geometry:{attributes:{position:{count:model.accessors[p.attributes.POSITION].count}},
    index:{count:model.accessors[p.indices].count}},traverse(f){f(this)}};
 });
 const root={traverse(f){for(const x of children)x.traverse(f)}};
 const score=assessHeroAsset(root);
 assert.equal(score.valid,true,score.errors.join(" | "));
 assert.equal(score.meshes,34);
 assert.equal(score.requiredNodes,17);
 assert.equal(score.skinned,0);
 assert.equal(score.lights,0);
 assert.equal(score.textureImages,0);
});
test("default gameplay loads V4 on Stingray, old model remains optional",()=>{
 assert.equal(requestedShipArt(""),"hero");
 assert.equal(requestedShipArt("?shipArt=classic"),"procedural");
 assert.equal(SHIP_ART_01342.assetPath,"./assets/ships/stingray-evo-hero-v4.gltf");
 assert.equal(SHIP_ART_01342.defaultMode,"hero");
 assert.equal(SHIP_ART_01342.hasCollision,false);
});
test("the living tail still reacts naturally to RIGHT and LEFT steering",()=>{
 const drive=steering=>sampleTail({
  steering,yawRate:steering*.9,gripIntensity:.9,
  speed:110,grounded:true,boostMultiplier:1},240);
 const right=drive(.94),left=drive(-.94);
 assert.ok(right.tipX>.3,"right steering still bends tail right");
 assert.ok(left.tipX<-.3,"left steering still bends tail left");
 assert.ok(Math.abs(right.tipX)<1.2,"no extreme worm-like curling");
 assert.ok(right.peakTipDeflectionDegrees>8);
});
test("tail idle remains alive but is less snake-like than GRIP response",()=>{
 const idle=sampleTail({steering:0,yawRate:0,gripIntensity:0,
  speed:112,grounded:true,boostMultiplier:1},360);
 assert.ok(idle.peakIdleTipMeters>.025);
 assert.ok(idle.peakIdleTipMeters<.16);
 assert.ok(idle.peakJointDegrees<.7);
 assert.equal(idle.neutralSamples,360);
 assert.ok(STINGRAY_EVO.maxYawJointRadians<=.072);
 assert.ok(STINGRAY_EVO.dampingRatio>=.84);
});
test("actual visible tail guides are distinct ticks instead of continuous strips",()=>{
 const source=readFileSync(new URL("../../"+"./ships/stingray-evo-v01342.mjs",import.meta.url),"utf8");
 assert.match(source,/length\*\.30\),neon\)/);
 assert.match(source,/neon\.opacity=\.30\+\.24\*state\.ribbonEnergy/);
 assert.equal(STINGRAY_EVO.additionalTailDrawCalls,20);
});
test("live entrypoint targets rollback version and preserves settings/Ghost",()=>{
 const index=readFileSync(new URL("../../"+"./index.html",import.meta.url),"utf8");
 const boot=readFileSync(new URL("../../"+"./boot-v01343.js",import.meta.url),"utf8");
 assert.match(index,/boot-v01343\.js\?v=0\.13\.4\.3/);
 assert.match(index,/data-game-module="game-v01343\.mjs"/);
 assert.match(index,/id="pause-ghost-toggle"/);
 assert.match(index,/id="menu-settings-btn"/);
 assert.match(boot,/game-v01343\.mjs\?v=0\.13\.4\.3/);
});
