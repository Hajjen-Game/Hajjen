// Color Wave 1.0: reuses existing emitter material, vertex intensity and spatial front.
import {zoneRolePair,COLOR_WAVE_ACTIVE} from "../core/zone-wave.mjs";
export function installColorWaveEmitter(THREE,mesh,module,role,lap){
 if(!COLOR_WAVE_ACTIVE||!mesh?.geometry?.getAttribute("colorWaveArc"))return null;
 const material=mesh.material,before=material.onBeforeCompile,key=material.customProgramCacheKey;
 const pair=zoneRolePair(null,role);
 const u={uCWOld:{value:new THREE.Color(pair.from)},uCWNext:{value:new THREE.Color(pair.to)},
  uCWFront:{value:-10000},uCWActive:{value:0},uCWStart:{value:module.start},uCWScale:{value:module.scale},uCWLap:{value:lap}};
 material.onBeforeCompile=function(shader,renderer){
  before.call(this,shader,renderer);
  shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nattribute float colorWaveArc; varying float vCWArc;")
   .replace("#include <begin_vertex>","#include <begin_vertex>\nvCWArc=colorWaveArc;");
  shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nvarying float vCWArc; uniform vec3 uCWOld,uCWNext; uniform float uCWFront,uCWActive,uCWStart,uCWScale,uCWLap;")
   .replace("#include <color_fragment>","#include <color_fragment>\nfloat cwD=mod(uCWStart+vCWArc*uCWScale-uCWFront+.5*uCWLap,uCWLap)-.5*uCWLap;\nfloat cwMix=uCWActive*(1.0-smoothstep(-66.0,66.0,cwD));\nfloat cwEnergy=max(diffuseColor.r,max(diffuseColor.g,diffuseColor.b));\ndiffuseColor.rgb=mix(uCWOld,uCWNext,cwMix)*cwEnergy;");
  Object.assign(shader.uniforms,u);
 };
 material.customProgramCacheKey=function(){return key.call(this)+"-color-wave-1-"+role;};
 material.needsUpdate=true;
 return {updateWave(wave){const p=zoneRolePair(wave,role);u.uCWOld.value.setHex(p.from);u.uCWNext.value.setHex(p.to);u.uCWFront.value=p.front;u.uCWActive.value=p.active;},
 stats(){return {role,from:u.uCWOld.value.getHex(),to:u.uCWNext.value.getHex(),front:u.uCWFront.value,active:u.uCWActive.value,vertices:mesh.geometry.getAttribute("colorWaveArc")?.count??0};},
 dispose(){material.onBeforeCompile=before;material.customProgramCacheKey=key;material.needsUpdate=true;}};
}
