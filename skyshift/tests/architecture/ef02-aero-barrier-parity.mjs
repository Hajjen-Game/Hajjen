// EF02J: exact terrain-following rail geometry, shader and lifecycle parity.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
const [ref,track]=process.argv.slice(2);
assert.ok(ref&&['vault','skyline','aurora'].includes(track));
globalThis.location={search:'?track='+track+'&v=0.28.9.7'};
const root=fileURLToPath(new URL('../../',import.meta.url)),old=resolve(ref,'skyshift');
const load=(dir,p)=>import(pathToFileURL(resolve(dir,p)));
const vertex='#include <common>\n#include <begin_vertex>';
const fragment='#include <common>\n#include <color_fragment>';
class Material{constructor(options){this.options=options;}dispose(){this.disposed=true;}}
const THREE={
 DoubleSide:2,
 MeshStandardMaterial:Material,MeshBasicMaterial:Material,
 Color:class{constructor(v){this.value=v;}set(v){this.value=v;return this;}copy(c){this.value=c.value;return this;}},
 BufferGeometry:class{constructor(){this.attributes={};}setAttribute(n,v){this.attributes[n]=v;}setIndex(v){this.index=v;}computeVertexNormals(){this.normals=true;}computeBoundingSphere(){this.bounds=true;}dispose(){this.disposed=true;}},
 Float32BufferAttribute:class{constructor(v,n){this.array=Float32Array.from(v);this.itemSize=n;}},
 Mesh:class{constructor(g,m){this.geometry=g;this.material=m;}removeFromParent(){this.removed=true;}}
};
function install(m){
 const meshes=[],api=m.installAeroBarriers(THREE,{add:x=>meshes.push(x)});
 assert.equal(meshes.length,3);
 const shader={vertexShader:vertex,fragmentShader:fragment,uniforms:{}};
 meshes[2].material.onBeforeCompile(shader);
 const snapshot=()=>structuredClone(shader.uniforms);
 const states=[snapshot()];
 api.setDetailMode('low');api.setVelocityFlow(1.7,123.4);
 api.setWaveState({activeCount:1,lastStepSeconds:35,fronts:[-20,3410,6800],playerStage:2,shaderBaseStage:1});
 states.push(snapshot());
 api.setDetailMode('high');api.setVelocityFlow(-1,345);
 api.updateAccent(new THREE.Color(0x123456));states.push(snapshot());
 const cache=meshes[2].material.customProgramCacheKey();
 const metadata=Object.fromEntries(Object.entries(api).filter(([,v])=>typeof v!=='function'));
 const data=meshes.map(({geometry,material,name,renderOrder,frustumCulled})=>({geometry,options:material.options,name,renderOrder,frustumCulled}));
 api.dispose();
 assert.ok(meshes.every(m=>m.removed&&m.geometry.disposed&&m.material.disposed));
 return {metadata,data,shader,states,cache};
}
let oldBytes=0,newBytes=0;
for(const v of ["072","081","082","083","084","0901","0160","0161","0162","0163","0164"]){
 const p='tracks/barriers/aero-barrier-v'+v+'.mjs',a=await load(old,p),b=await load(root,p);
 oldBytes+=readFileSync(resolve(old,p)).length;newBytes+=readFileSync(resolve(root,p)).length;
 assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());
 for(const k of ['AERO_BARRIER','AERO_PROFILE','RAIL_SPECTRAL_VERTEX','RAIL_SPECTRAL_FRAGMENT'])assert.deepEqual(a[k],b[k]);
 for(const s of [-1,0,120,573,580,606.6,1662,1740,1842,3005,3180,3338,3399,3400,3410]){
  assert.equal(a.cornerRailEmphasisAt(s),b.cornerRailEmphasisAt(s));
  assert.equal(a.railHeightAt(s),b.railHeightAt(s));
  for(const side of [-1,1])assert.deepEqual(a.sampleAeroProfile(s,side),b.sampleAeroProfile(s,side));
 }
 assert.deepEqual(a.createAeroBarrierData(7.3),b.createAeroBarrierData(7.3));
 assert.deepEqual(a.createAeroDetailData(),b.createAeroDetailData());
 assert.deepEqual(a.patchRailShaders(vertex,fragment),b.patchRailShaders(vertex,fragment));
 assert.throws(()=>b.patchRailShaders('',fragment),/Unsupported rail material shader chunks/);
 assert.deepEqual(install(a),install(b));
 console.log('SKYSHIFT_EF02_AERO_BARRIER_PARITY '+JSON.stringify({track,version:v}));
}
newBytes+=readFileSync(resolve(root,'tracks/barriers/shared-aero-barrier.mjs')).length;
assert.ok(newBytes<oldBytes);
console.log('SKYSHIFT_EF02_AERO_BARRIER_BYTES '+JSON.stringify({oldBytes,newBytes,reduction:oldBytes-newBytes}));
