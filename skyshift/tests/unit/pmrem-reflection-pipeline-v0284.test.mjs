import test from "node:test";
import assert from "node:assert/strict";
import {PMREM_0284,readPmremRelease0284,planPmrem0284,
 installPmremReflectionPipeline0284}
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
