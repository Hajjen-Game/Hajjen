// Compare all fidelity adapters against pinned original material/shader behavior.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const [reference,track]=process.argv.slice(2);
assert.ok(reference&&['vault','skyline','aurora'].includes(track));
globalThis.location={search:'?track='+track+'&v=0.28.9.7'};
const root=fileURLToPath(new URL('../../',import.meta.url));
const load=(dir,name)=>import(pathToFileURL(resolve(dir,'core',name)));
class Color{constructor(value){this.value=value;}set(value){this.value=value;return this;}}
class MeshStandardMaterial{constructor(options){this.options=options;this.needsUpdate=false;}}
const THREE={Color,MeshStandardMaterial,DoubleSide:2};
const vert='#include <common>\nvoid main(){#include <begin_vertex>}';
const frag='#include <common>\nvoid main(){#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <emissivemap_fragment>}';
function output(mod,lowMemory,preset){
 const profile=mod.selectFidelityProfile({lowMemory,preset}),state=mod.createFidelityDirector(profile);
 const surface=mod.createSmartPremiumTrackMaterial(THREE,profile),mat=surface.material;
 const compile=()=>{const shader={vertexShader:vert,fragmentShader:frag,uniforms:{}};mat.onBeforeCompile(shader,null);return shader;};
 const initial=structuredClone(compile());
 for(let i=0;i<120;i++)mod.advanceFidelityDirector(state,1/120,{s:i*29,speed:44+i*.5,boostMultiplier:1.2,wave:.7});
 surface.setFidelitySignal(state);
 surface.setDetailMode('low');surface.setVelocityFlow(.7,82);
 surface.setWaveState({activeCount:1,lastStepSeconds:25,playerStage:1,shaderBaseStage:0,fronts:[100,200,300]});
 const shader=compile(),audit=mod.fidelityAudit(state);
 mod.resetFidelityDirector(state);
 return {profile,initial,shader,audit,reset:state,options:mat.options,key:mat.customProgramCacheKey(),variant:surface.fidelityShaderVariant,enabled:surface.fidelityShaderEnabled,needsUpdate:mat.needsUpdate};
}
for(const v of ['0160']){
 const name='visual-fidelity-v'+v+'.mjs';
 const old=await load(resolve(reference,'skyshift'),name),now=await load(root,name);
 assert.deepEqual(Object.keys(old).sort(),Object.keys(now).sort());
 assert.deepEqual(old.FIDELITY_0114,now.FIDELITY_0114);
 for(const lowMemory of [false,true])for(const preset of ['baseline','fidelity-on','fidelity-off','fidelity-legacy'])
  assert.deepEqual(output(now,lowMemory,preset),output(old,lowMemory,preset));
 console.log('SKYSHIFT_EF02_FIDELITY_PARITY '+JSON.stringify({track,version:v,profiles:8}));
}
console.log('SKYSHIFT_EF08_CURRENT_FIDELITY_PARITY '+JSON.stringify({track,adapters:1}));
