import test from "node:test";
import assert from "node:assert/strict";
import {PMREM_0284,readPmremRelease0284,planPmrem0284,
 installPmremReflectionPipeline0284,planConfiguredPmremEF05}
 from "../../tunnel/pmrem-reflection-pipeline-v0284.mjs";

test("0.28.4 is Vault-only and historical versions remain byte-identical",()=>{
 for(const track of ["skyline","aurora"])
  assert.equal(readPmremRelease0284("?track="+track+"&v=0.28.4"),false);
 for(const v of ["0.27.4","0.28.0","0.28.1","0.28.2","0.28.3"])
  assert.equal(readPmremRelease0284("?track=vault&v="+v),false);
 assert.equal(readPmremRelease0284("?track=vault&v=0.28.4"),true);
 assert.equal(readPmremRelease0284("?track=vault&v=0.28.5"),true);
 assert.equal(readPmremRelease0284("?track=vault"),false);
});
test("true environment filtering is one-time and mobile affordable",()=>{
 const high=planPmrem0284({versionActive:true,track:"vault"});
 const low=planPmrem0284({versionActive:true,track:"vault",
  lowMemory:true});
 const off=planPmrem0284({versionActive:true,track:"vault",
  mode:"off"});
 assert.equal(high.enabled,true);assert.equal(high.faceSize,256);
 assert.equal(low.faceSize,128);assert.ok(low.shipStrength<high.shipStrength);
 assert.equal(off.enabled,false);assert.equal(off.captureCount,0);
 assert.equal(PMREM_0284.newFramePasses,0);
 assert.equal(PMREM_0284.changesGrip,false);
 assert.equal(PMREM_0284.changesRoad,false);
 assert.equal(PMREM_0284.changesBoost,false);
});
test("PMREM binds ONLY real native physical metal and hull, restores lights/environment, and disposes",()=>{
 const memory={captures:0,disposed:0,generatorDispose:0};
 const physical=()=>({isMesh:true,name:"SKYSHIFT 0.26.0 P2 / true physical panel",
   material:{isMeshPhysicalMaterial:true,metalness:.88,roughness:.34,
    transparent:false,opacity:1,envMap:null,envMapIntensity:1}});
 const nodes=Array.from({length:13},physical);
 const road={isMesh:true,name:"Zone Ribbon",material:{
  isMeshStandardMaterial:true,metalness:.25,envMap:null}};
 nodes.push({isMesh:true,name:"NEON / glow",material:{
  isMeshBasicMaterial:true,metalness:0,envMap:null}});
 const source={traverse:fn=>nodes.forEach(fn)};
 const world={getObjectByName:name=>
  name==="SKYSHIFT · TRUE shared Skyline tunnel 0.28.1"?source:null};
 const shipMat={isMeshPhysicalMaterial:true,metalness:.48,
  roughness:.4,envMap:null,envMapIntensity:1,color:{}};
 const ship={visible:true,traverse:fn=>fn({
  isMesh:true,name:"MANTA HULL",material:shipMat})};
 const bg={old:true},fog={old:true},key={
  isDirectionalLight:true,intensity:12},ambient={
  isHemisphereLight:true,intensity:5};
 const scene={background:bg,fog,
  traverse:fn=>{fn(key);fn(ambient);}};
 class PMREMGenerator {
  constructor(renderer){assert.ok(renderer.render)}
  fromScene(scene,sigma,near,far,options){
   memory.captures++;
   assert.equal(scene.background.value,0);
   assert.equal(scene.fog,null);
   assert.equal(ship.visible,false);
   assert.equal(key.intensity,0);
   assert.equal(ambient.intensity,0);
   assert.equal(options.size,256);
   assert.equal(options.position.x,110);
   return {texture:{kind:"REAL PMREM radiance"},
    dispose(){memory.disposed++}};
  }
  dispose(){memory.generatorDispose++}
 }
 class Color {constructor(value){this.value=value}}
 class Vector3 {constructor(x,y,z){this.x=x;this.y=y;this.z=z}}
 const THREE={PMREMGenerator,Color,Vector3};
 const obj=installPmremReflectionPipeline0284(THREE,{render(){}},
  scene,world,{enabled:true,track:"vault",trackLength:3400,
   positionAt:(s,x,y)=>({x:s,y,z:x}),ship});
 assert.equal(obj.active,true);
 assert.equal(obj.stats().genuinePmrem,true);
 assert.equal(obj.stats().tunnelMaterials,13);
 assert.equal(obj.stats().shipMaterials,1);
 assert.equal(obj.stats().roadTouched,false);
 assert.equal(scene.background,bg);
 assert.equal(scene.fog,fog);
 assert.equal(ship.visible,true);
 assert.equal(key.intensity,12);
 assert.equal(ambient.intensity,5);
 assert.equal(road.material.envMap,null);
 assert.equal(memory.captures,1);
 assert.equal(memory.generatorDispose,1);
 assert.equal(nodes[0].material.envMap.kind,"REAL PMREM radiance");
 obj.setComparison(0);
 assert.equal(nodes[0].material.envMapIntensity,0);
 assert.equal(shipMat.envMapIntensity,0);
 obj.setComparison(1);
 assert.equal(nodes[0].material.envMapIntensity,.40);
 assert.equal(shipMat.envMapIntensity,.38);
 obj.dispose();obj.dispose();
 assert.equal(memory.disposed,1);
 assert.equal(nodes[0].material.envMap,null);
 assert.equal(nodes[0].material.envMapIntensity,1);
 assert.equal(shipMat.envMap,null);
 assert.equal(shipMat.envMapIntensity,1);
});
test("no renderer, source or other track means zero PMREM work",()=>{
 assert.equal(installPmremReflectionPipeline0284(null,null,null,null,
  {enabled:false}).active,false);
 assert.equal(installPmremReflectionPipeline0284(null,null,null,null,
  {enabled:true,track:"skyline"}).active,false);
 assert.equal(installPmremReflectionPipeline0284(null,null,null,null,
  {enabled:true,track:"vault"}).active,false);
});

test("EF05 configured reflection capture uses actual mounted sections, not track name",()=>{
 const modules=[{start:25,end:325},{start:325,end:625},{start:800,end:1120}];
 const p=planConfiguredPmremEF05({track:"new",enabled:true,trackLength:1200,modules});
 assert.equal(p.enabled,true);assert.equal(p.captureAtMeters,110);
 assert.equal(p.fullCourse,false);assert.equal(p.captureCount,1);
 assert.deepEqual(p.intervals,[{start:25,end:625},{start:800,end:1120}]);
 const shifted=planConfiguredPmremEF05({track:"new",enabled:true,trackLength:1200,modules:[{start:800,end:1120}],lowMemory:true});
 assert.equal(shifted.captureAtMeters,960);assert.equal(shifted.faceSize,128);
 const full=planConfiguredPmremEF05({track:"vault",enabled:true,trackLength:3400,modules:Array.from({length:10},(_,i)=>({start:340*i,end:340*(i+1)}))});
 const legacy=planPmrem0284({versionActive:true});
 for(const k of ["faceSize","captureAtMeters","nearMeters","farMeters","tunnelStrength","shipStrength","captureCount"])assert.equal(full[k],legacy[k]);
 assert.equal(full.fullCourse,true);
 assert.equal(planConfiguredPmremEF05({enabled:true,trackLength:1200,modules:[]}).enabled,false);
 assert.throws(()=>planConfiguredPmremEF05({enabled:true,trackLength:1200,modules:[{start:25,end:400},{start:390,end:500}]}),/valid mounted/);
});
test("EF05 native PMREM binds explicit root and fades only hull in open track, no recapture",()=>{
 const mat=()=>({isMeshStandardMaterial:true,metalness:.6,opacity:1,envMap:null,envMapIntensity:1});
 const coats=[mat(),mat(),mat()],hull=mat(),road=mat();let captures=0,disposed=0;
 const root={traverse:fn=>coats.forEach(material=>fn({isMesh:true,material}))};
 const ship={visible:true,traverse:fn=>fn({isMesh:true,name:"fixture hull",material:hull})};
 const scene={background:null,fog:null,traverse(){}};
 const world={getObjectByName(){throw Error("configured route must not look up named root")}};
 const THREE={Color:class{},Vector3:class{constructor(x,y,z){Object.assign(this,{x,y,z})}},PMREMGenerator:class{
  fromScene(scene,sigma,near,far,opts){captures++;assert.equal(opts.position.x,110);assert.equal(ship.visible,false);
   return {texture:{},dispose(){disposed++}}}dispose(){}
 }};
 const ctl=installPmremReflectionPipeline0284(THREE,{render(){}},scene,world,{
  enabled:true,track:"new",trackLength:1200,positionAt:(s,l,h)=>({x:s,y:h,z:l}),ship,
  tunnel:{active:true,root,modules:[{start:25,end:325},{start:325,end:625},{start:800,end:1120}]}
 });
 assert.equal(ctl.active,true);assert.equal(captures,1);assert.equal(hull.envMapIntensity,.38);
 ctl.updateStation(700);assert.equal(hull.envMapIntensity,0);assert.equal(coats[0].envMapIntensity,.4);
 ctl.setComparison(.5);assert.equal(hull.envMapIntensity,0);assert.equal(coats[0].envMapIntensity,.2);
 ctl.updateStation(806);assert.equal(hull.envMapIntensity,.095);
 ctl.updateStation(900);assert.equal(hull.envMapIntensity,.19);
 assert.equal(road.envMap,null);assert.equal(captures,1);
 ctl.dispose();assert.equal(disposed,1);assert.equal(hull.envMap,null);assert.equal(hull.envMapIntensity,1);
});
