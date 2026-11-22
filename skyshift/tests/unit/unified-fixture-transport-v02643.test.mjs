import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {FIXTURE_TRANSPORT_02643,LOWER_CYAN_NAME_02643,JOINED_AMBER_NAME_02643,
 patchWallTransport02643,patchMetalTransport02643,
 patchRailTransport02643,patchFootTransport02643,
 installUnifiedFixtureTransport02643} from "./unified-fixture-transport-v02643.mjs";
const read=p=>readFileSync(new URL("../../"+p,import.meta.url),"utf8");
const metal=[
 "#include <common>","uniform float uReflectionFinish02642;",
 "uniform float uMetalLightResponse02641;",
 "varying vec2 vPbrSection0260;",
 "float pbrColdFalloff0260=exp(-pow(pbrColdDistance0260/8.6,2.0));",
 "float pbrWarmFalloff0260=exp(-pow(pbrWarmDistance0260/8.0,2.0));",
 "pbrFixture0260.color=vec3(0.11,0.68,0.94)*x;",
 "pbrFixture0260.color=vec3(0.94,0.35,0.085)*y;"
].join("\n");
const wall=[
 "#include <common>","float m25Wall=0.0;","float m25Roof=0.0;",
 "float m25Portal=0.0;","float m25Cavity=0.0;",
 "varying vec2 vNeonLocalSection;",
 "m25Final*=mix(1.0,m41Preserve,uMetalLightResponse02641);"
].join("\n");
const road=[
 "#include <common>","uniform float uRoadSolarSpillSeal;",
 "float e31Power=uEdgeFloor02631*e31In*e31Bay*e31Safe*clamp(vEdgeStraight02633,0.0,1.0);",
 "vec3 e31Cool=vec3(0.018,0.48,0.76)*foo;",
 "vec3 e31Warm=vec3(0.85,0.27,0.055)*foo;",
 "float e31FootBand=0.1;","reflectedLight.directSpecular+=e31Cool+e31Warm;"
].join("\n");
const foot=[
 "#include <common>","float f42Alpha=0.5;","float f42Soft=0.5;",
 "uniform float uReflectionFinish02642;",
 "diffuseColor.a=mix(diffuseColor.a,",
 "  mix(diffuseColor.a,f42Soft,0.72),uReflectionFinish02642);"
].join("\n");
class Material{
 constructor(type){this[type]=true;this.onBeforeCompile=function(){};
  this.customProgramCacheKey=function(){return "original";};}
}
const groupName="SKYSHIFT · Tunnel Megastructure 0.21.1";
const roles={panel:"HARDSURFACE_PANELS",rib:"CURVED_RIBS",
 shell:"CLOSED_SHELL",conduit:"STRUCTURAL_CONDUITS"};
function harness(lowMemory){
 const children=[];
 for(const role of Object.keys(roles)){
  if(lowMemory&&role==="conduit")continue;
  children.push({name:"Tunnel / "+roles[role],
   material:new Material("isMeshBasicMaterial")});
 }
 for(const role of ["panel","rib"]){
  if(lowMemory&&role==="rib")continue;
  children.push({name:"SKYSHIFT 0.26.0 P2 / true physical "+role,
   material:new Material("isMeshPhysicalMaterial")});
 }
 const joined={name:JOINED_AMBER_NAME_02643,
  material:new Material("isMeshBasicMaterial")};
 const lower={name:LOWER_CYAN_NAME_02643,
  material:new Material("isMeshBasicMaterial")};
 const deck={material:new Material("isMeshStandardMaterial")};
 const group={children};
 const world={getObjectByName(x){
  return x===groupName?group:x===joined.name?joined:x===lower.name?lower:null;
 }};
 const ready=(key)=>({stats:()=>({[key]:true})});
 const opts={lowMemory,metalState:ready("unifiedMetal02641Active"),
  roadRebuild:ready("roadRebuild0263Active"),
  reflectionFinish:ready("reflectionFinish02642Active"),
  straightEdges:ready("straightEdges02633Active")};
 return {world,deck,opts,joined,lower,group,all:[
  ...children.map(x=>x.material),deck.material,joined.material]};
}
test("0.26.4.3 scope: all four priorities and no new lamps, SSR or global grade",()=>{
 const o=FIXTURE_TRANSPORT_02643;
 assert.equal(o.version,"0.26.4.3");
 assert.deepEqual(Object.values(o.priorities),[1,2,3,4]);
 assert.equal(o.comparison,"?fixtureTransport=classic");
 for(const k of ["noNewDynamicLights","noNewRenderPasses","noNewDrawCalls",
  "noExtraMetalGGXSamples","originalMetalRoughness","ceilingCyanProtected",
  "straightOnlyRailProtected","originalAmberGeometry","physicsUnchanged",
  "gripUnchanged","shipUnchanged","roadBlackBaseProtected",
  "solarSealProtected","nativeZoneWaveProtected"])assert.equal(o[k],true,k);
});
test("wall source bounce protects roof and black cavity, contains actual fixtures",()=>{
 for(const mobile of [false,true]){
  for(const role of Object.keys(roles).filter(x=>!mobile||x!=="conduit")){
   const p=patchWallTransport02643("",wall,{role,mobile});
   assert.match(p.fragmentShader,/t43Cove=smoothstep/);
   assert.match(p.fragmentShader,/t43Warm=pow\(clamp\(m25Portal/);
   assert.match(p.fragmentShader,/1\.0-0\.78\*clamp\(m25Roof/);
   assert.match(p.fragmentShader,/1\.0-0\.92\*clamp\(m25Cavity/);
   assert.match(p.fragmentShader,/m25Final=clamp\(m25Final\+uFixtureTransport02643/);
   assert.ok(p.fragmentShader.indexOf("m25Final=clamp(m25Final+")>
    p.fragmentShader.indexOf("m25Final*=mix(1.0,m41Preserve"));
  }
 }
 assert.throws(()=>patchWallTransport02643("",wall.replace("m25Portal","other")));
});
test("actual solar-isolated PBR cold and warm falloff change only near wall",()=>{
 const p=patchMetalTransport02643("",metal);
 assert.match(p.fragmentShader,/pbrColdFalloff0260=mix/);
 assert.match(p.fragmentShader,/pbrWarmFalloff0260=mix/);
 assert.match(p.fragmentShader,/1\.0-smoothstep\(23\.0,27\.3/);
 assert.match(p.fragmentShader,/pbrFixture0260\.color=vec3\(0\.11,0\.68,0\.94\)/);
 assert.match(p.fragmentShader,/pbrFixture0260\.color=vec3\(0\.94,0\.35,0\.085\)/);
 assert.throws(()=>patchMetalTransport02643("",metal.replace("pbrWarmFalloff0260","missing")));
});
test("lower cyan road reflectance retains mandatory STRAIGHT-only mask",()=>{
 const p=patchRailTransport02643("",road).fragmentShader;
 assert.match(p,/e31Cool\*=mix\(1\.0,1\.490,uFixtureTransport02643\)/);
 assert.match(p,/e31Warm\*=mix/);
 assert.match(p,/vEdgeStraight02633,0\.0,1\.0/);
 assert.match(p,/uRoadSolarSpillSeal/);
 assert.match(p,/reflectedLight\.directSpecular\+=e31Cool\+e31Warm/);
 assert.throws(()=>patchRailTransport02643("",road.replace("clamp(vEdgeStraight02633,0.0,1.0)","1.0")));
});
test("connected warm foot alpha is feathered without changing geometry",()=>{
 const f=patchFootTransport02643("",foot).fragmentShader;
 assert.match(f,/float t43A=clamp\(diffuseColor.a/);
 assert.match(f,/float t43Feather=pow\(t43A,1\.115\)/);
 assert.match(f,/uFixtureTransport02643\*0\.74/);
 assert.match(f,/uReflectionFinish02642/);
 assert.throws(()=>patchFootTransport02643("",foot.replaceAll("f42Soft","bad")));
});
test("high/4GB own exactly the original material chain; classic is reversible",()=>{
 for(const mobile of [false,true]){
  const h=harness(mobile),old=h.all.map(x=>x.onBeforeCompile);
  const fixture=installUnifiedFixtureTransport02643({},h.world,h.deck,h.opts);
  const report=fixture.stats();
  assert.equal(report.fixtureTransport02643Active,true,JSON.stringify(report));
  assert.equal(report.fixtureTransport02643PhysicalCount,mobile?1:2);
  assert.equal(report.fixtureTransport02643SubstrateCount,mobile?3:4);
  assert.equal(report.fixtureTransport02643RoadCount,1);
  assert.equal(report.fixtureTransport02643ConnectedAmberCount,1);
  assert.ok(h.all.every((m,i)=>old[i]!==m.onBeforeCompile));
  fixture.setComparison(0);
  assert.equal(fixture.stats().fixtureTransport02643Strength,0);
  fixture.setComparison(1);
  assert.equal(fixture.stats().fixtureTransport02643Strength,1);
  fixture.dispose();
  assert.ok(h.all.every((m,i)=>old[i]===m.onBeforeCompile));
 }
 const h=harness(false);
 assert.equal(installUnifiedFixtureTransport02643({},h.world,h.deck,
  {...h.opts,enabled:false}).stats().fixtureTransport02643Active,false);
});
test("live 0.26.4.3 inherits 0.26.4.2, 0.26.3.3 and source-preserving A/B",()=>{
 const game=read("./game-v0210.mjs");
 assert.ok(game.includes("fixtureTransportEnabled=reflectionFinishEnabled"));
 assert.ok(game.includes("installUnifiedFixtureTransport02643"));
 assert.ok(game.includes("installStraightOnlyEdgeLighting02633"));
 assert.ok(game.includes("__skyshiftFixtureTransportFrameProof"));
 assert.match(read("./boot-v0210.js"),/game-v0210\.mjs\?v=0\.26\.(?:4\.3|5)/);
 assert.match(read("./index.html"),/(?:Unified Fixture Light Transport & Surface Response|True Rail & Wall Local Light Response)/);
});
