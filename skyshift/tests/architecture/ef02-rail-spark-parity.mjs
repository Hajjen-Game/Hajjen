// EF02D: verify original track anchors and exact deterministic particle/render output.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const [ref,track]=process.argv.slice(2);
assert.ok(ref&&['skyline','vault','aurora'].includes(track));
globalThis.location={search:'?track='+track+'&v=0.28.9.7'};
const root=fileURLToPath(new URL('../../',import.meta.url)),old=resolve(ref,'skyshift');
const load=(dir,p)=>import(pathToFileURL(resolve(dir,p)));
class Attribute{
 constructor(array,itemSize){this.array=array;this.itemSize=itemSize;this.needsUpdate=false;}
 setUsage(usage){this.usage=usage;return this;}
}
class Geometry{
 constructor(){this.attributes={};this.drawRange={start:0,count:0};this.disposed=false;}
 setAttribute(name,attr){this.attributes[name]=attr;}
 setDrawRange(start,count){this.drawRange={start,count};}
 dispose(){this.disposed=true;}
}
class Material{constructor(options){Object.assign(this,options);this.disposed=false;}dispose(){this.disposed=true;}}
class Mesh{constructor(geometry,material){this.geometry=geometry;this.material=material;this.removed=false;}removeFromParent(){this.removed=true;}}
const THREE={BufferAttribute:Attribute,BufferGeometry:Geometry,MeshBasicMaterial:Material,Mesh,AdditiveBlending:3,DoubleSide:2,DynamicDrawUsage:1};
const points=[0,5,120,510,573,606.6,900,1662,1740,1842,2250,3005,3180,3338,3399,3400,3410,6580];
for(const v of ['0165']){
 const name='rail-scrape-sparks-v'+v+'.mjs',a=await load(old,name),b=await load(root,'rendering/'+name);
 assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());
 assert.deepEqual(a.RAIL_SPARKS,b.RAIL_SPARKS);
 for(const s of points)for(const side of [-1,0,1])assert.deepEqual(a.railContactPoint(s,side),b.railContactPoint(s,side));
 for(const lowMemory of [false,true]){
  const sceneA={add(m){this.mesh=m;}},sceneB={add(m){this.mesh=m;}};
  const fxA=a.createRailScrapeSparks(THREE,sceneA,{lowMemory}),fxB=b.createRailScrapeSparks(THREE,sceneB,{lowMemory});
  assert.equal(sceneA.mesh,fxA.mesh);assert.equal(sceneB.mesh,fxB.mesh);
  const camera={position:{x:10,y:7,z:15}};
  for(let i=0;i<360;i++){
   const cycle=i%120,side=cycle<30?1:-1,s=points[i%points.length],grounded=i%19!==0;
   const input={contacting:cycle<75,side,grounded,speed:44+(i%160)*.35,scrubIntensity:(i%11)/10,contactSerial:Math.floor(i/30)};
   assert.deepEqual(a.sparkDemand({...input,started:cycle===0}),b.sparkDemand({...input,started:cycle===0}));
   const dt=[1/120,1/60,.09,1/30][i%4];
   const playing=cycle!==119;
   fxA.frame(dt,{...input,playing,camera,railContact:input.contacting?a.railContactPoint(s,side):null});
   fxB.frame(dt,{...input,playing,camera,railContact:input.contacting?b.railContactPoint(s,side):null});
   assert.deepEqual(fxA.state,fxB.state);
   assert.deepEqual(fxA.stats(),fxB.stats());
   assert.deepEqual(fxA.mesh,fxB.mesh);
  }
  fxA.reset();fxB.reset();assert.deepEqual(fxA.state,fxB.state);assert.deepEqual(fxA.mesh,fxB.mesh);
  fxA.dispose();fxB.dispose();assert.deepEqual(fxA.mesh,fxB.mesh);
  assert.ok(fxB.mesh.removed&&fxB.mesh.geometry.disposed&&fxB.mesh.material.disposed);
 }
 console.log('SKYSHIFT_EF02_SPARK_PARITY '+JSON.stringify({track,version:v,anchorSamples:points.length*3,profiles:2,framesPerProfile:360}));
}
console.log('SKYSHIFT_EF08_CURRENT_SPARK_PARITY '+JSON.stringify({track,adapters:1}));
