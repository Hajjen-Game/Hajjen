// EF02J: compare historical PBR road shaders, exact geometry and material state.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readFileSync} from 'node:fs';
const [ref,track]=process.argv.slice(2);
assert.ok(ref&&['vault','skyline','aurora'].includes(track));
globalThis.location={search:'?track='+track+'&v=0.28.9.7'};
const root=fileURLToPath(new URL('../../',import.meta.url)),old=resolve(ref,'skyshift');
const load=(dir,p)=>import(pathToFileURL(resolve(dir,p)));
const THREE={
 DoubleSide:2,
 Color:class{constructor(value){this.value=value;}set(value){this.value=value;return this;}},
 MeshStandardMaterial:class{constructor(options){this.options=options;}},
 BufferGeometry:class{constructor(){this.attributes={};}setAttribute(n,v){this.attributes[n]=v;}setIndex(v){this.index=v;}computeVertexNormals(){this.normals=true;}computeBoundingSphere(){this.bounds=true;}},
 Float32BufferAttribute:class{constructor(v,n){this.array=Float32Array.from(v);this.itemSize=n;}}
};
const vertex='#include <common>\n#include <begin_vertex>',fragment='#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>';
function material(m){
 const api=m.createPremiumTrackMaterial(THREE),mat=api.material;
 const shader={vertexShader:vertex,fragmentShader:fragment,uniforms:{}};
 mat.onBeforeCompile(shader);
 const snapshot=()=>structuredClone(shader.uniforms);
 const states=[snapshot()];
 api.setDetailMode('low');api.setVelocityFlow(1.7,123.4);
 api.setWaveState({activeCount:1,lastStepSeconds:35,fronts:[-20,3410,6800],playerStage:2,shaderBaseStage:1});
 states.push(snapshot());
 api.setDetailMode('high');api.setVelocityFlow(-1,345);
 api.setPalette({base:0x123456,accent:0x654321});states.push(snapshot());
 api.setWaveState({activeCount:0,lastStepSeconds:180,fronts:[3400,6800,10200],playerStage:8,shaderBaseStage:7});
 states.push(snapshot());
 return {shader,states,options:mat.options,key:mat.customProgramCacheKey(),palette:api.palette,api:Object.keys(api).sort()};
}
let oldBytes=0,newBytes=0;
for(const v of ["072","081","082"]){
 const p='premium-track-v'+v+'.mjs',now='rendering/legacy/'+p,a=await load(old,p),b=await load(root,now);
 oldBytes+=readFileSync(resolve(old,p)).length;newBytes+=readFileSync(resolve(root,now)).length;
 assert.deepEqual(Object.keys(a).sort(),Object.keys(b).sort());
 for(const k of ['PREMIUM_TRACK','GLSL_BOOST_PADS','SURFACE_FRAGMENT_GLSL','SURFACE_FRAGMENT_HELPERS'])assert.deepEqual(a[k],b[k]);
 assert.deepEqual(a.premiumTrackCoordinates(),b.premiumTrackCoordinates());
 assert.deepEqual(a.createPremiumDeckGeometry(THREE),b.createPremiumDeckGeometry(THREE));
 assert.deepEqual(a.patchPremiumShaders(vertex,fragment),b.patchPremiumShaders(vertex,fragment));
 assert.throws(()=>b.patchPremiumShaders('',fragment),/unsupported Three.js shader chunks/);
 assert.deepEqual(material(a),material(b));
 console.log('SKYSHIFT_EF02_PREMIUM_TRACK_PARITY '+JSON.stringify({track,version:v}));
}
newBytes+=readFileSync(resolve(root,'rendering/legacy/shared-premium-track.mjs')).length;
assert.ok(newBytes<oldBytes);
console.log('SKYSHIFT_EF02_PREMIUM_TRACK_BYTES '+JSON.stringify({oldBytes,newBytes,reduction:oldBytes-newBytes}));
