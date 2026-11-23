// SKYSHIFT 0.26.4 — Lighting, Glow & Final Cohesion (Pass 4 of 4).
// The prior passes already placed physical cyan/amber sources and rebuilt
// real GGX metal and road reflections. This is a final optical composition
// pass, NOT a replacement lighting rig or bright global exposure.
// Keep solar-isolated graphite, protected white cores, straight-only cyan
// rails, actual arch-foot amber geometry, ship and track 100% unchanged.
export const FINAL_COHESION_0264=Object.freeze({
 version:"0.26.4",pass:4,id:"lighting-glow-final-cohesion-0264",
 base:"0.26.3.3",comparison:"?finalCohesion=classic",
 approach:"restrained HDR source response + bloom calibration + chromatic selective finish",
 bloomBefore:{strength:0.43,radius:0.21,threshold:1.40},
 bloomHigh:{strength:0.52,radius:0.25,threshold:1.28},
 bloom4GB:{strength:0.44,radius:0.21,threshold:1.38},
 finishShaderSamplesHigh:5,finishShaderSamples4GB:0,
 additionalPassesHigh:1,additionalPasses4GB:0,
 additionalTextures:0,additionalLights:0,additionalMeshes:0,
 bloomResolutionUnchanged:true,ambientLightUnchanged:true,
 exposureUnchanged:true,whiteSolarSealUnchanged:true,
 graphiteSubstrateUnchanged:true,metalGGXUnchanged:true,
 roadGGXUnchanged:true,railSourcesUnchanged:true,
 railPlacementUnchanged:true,connectedAmberFloorUnchanged:true,
 straightOnlyRailUnchanged:true,curveArrowsUnchanged:true,
 shipUnchanged:true,physicsUnchanged:true,GRIPUnchanged:true,
 cameraUnchanged:true,nativeZoneWaveUnchanged:true
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const lerp=(a,b,t)=>a+(b-a)*t;
const IDENTITY={r:1,g:1,b:1};
// Existing real fixture meshes from 0.26.3.3; *never* light the chevron
// corners or change any emitter positions/draw batches.
export const SOURCE_NAMES_0264=Object.freeze({
 cyan:"SKYSHIFT 0.26.3.3 / cyan lower-edge inlays on straight track ONLY",
 amber:"SKYSHIFT 0.26.3.2 / one-piece amber arch-foot and floor bands"
});
const SOURCE_GAIN=Object.freeze({
 high:{cyan:{r:1.43,g:1.40,b:1.40},
       amber:{r:1.43,g:1.31,b:1.20}},
 mobile:{cyan:{r:1.12,g:1.11,b:1.11},
         amber:{r:1.10,g:1.08,b:1.04}}
});
export function finalCohesionBloom0264(original,{
 lowMemory=false,comparison=1
}={}){
 const t=clamp(comparison);
 const target=lowMemory?FINAL_COHESION_0264.bloom4GB:
  FINAL_COHESION_0264.bloomHigh;
 return {strength:lerp(original.strength,target.strength,t),
  radius:lerp(original.radius,target.radius,t),
  threshold:lerp(original.threshold,target.threshold,t)};
}
export function finalFixtureGain0264(role,{lowMemory=false,comparison=1}={}){
 if(!(role in SOURCE_NAMES_0264))throw Error("0.26.4 unknown light source");
 const g=(lowMemory?SOURCE_GAIN.mobile:SOURCE_GAIN.high)[role];
 const t=clamp(comparison);
 return {r:lerp(1,g.r,t),g:lerp(1,g.g,t),b:lerp(1,g.b,t)};
}
// Linear-HDR local finishing after bloom+SMAA+the previous P4 grade, before
// the EXISTING OutputPass. Avoids huge global bloom and broad neutral wash.
// Four very local taps only on high fidelity, no independent SSR/AO passes.
// Bright uncolored white-core areas are deliberately protected, and the
// lower center road/ship is protected; no colored wash is painted onto lanes.
export const FINAL_COHESION_SHADER_0264={
 uniforms:{
  tDiffuse:{value:null},uFinalCohesion0264:{value:0},
  uFinalPixel0264:{value:null}
 },
 vertexShader:[
  "varying vec2 vUv;",
  "void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}"
 ].join("\n"),
 fragmentShader:[
  "uniform sampler2D tDiffuse;",
  "uniform float uFinalCohesion0264;",
  "uniform vec2 uFinalPixel0264;",
  "varying vec2 vUv;",
  "float c264Luma(vec3 v){return dot(v,vec3(0.2126,0.7152,0.0722));}",
  "float c264Color(vec3 v){",
  " float lo=min(v.r,min(v.g,v.b)),hi=max(v.r,max(v.g,v.b));",
  " return smoothstep(0.12,0.42,(hi-lo)/(hi+0.07));",
  "}",
  "void main(){",
  " vec4 source=texture2D(tDiffuse,vUv);",
  " if(uFinalCohesion0264<0.001){gl_FragColor=source;return;}",
  " float lum=c264Luma(source.rgb);",
  " float chroma=c264Color(max(source.rgb,vec3(0.0)));",
  " // Don't touch neutral high-luminance white wave, HUD, or window spill.",
  " float highlightGuard=1.0-smoothstep(0.88,1.55,lum);",
  " float blackGuard=smoothstep(0.012,0.058,lum);",
  " float lateral=abs(vUv.x-0.5);",
  " float walls=smoothstep(0.13,0.36,lateral);",
  " float roof=smoothstep(0.48,0.79,vUv.y);",
  " float roadMask=smoothstep(0.48,0.77,vUv.y)*",
  "  (1.0-smoothstep(0.18,0.43,lateral));",
  " float shipMask=(1.0-smoothstep(0.06,0.22,lateral))*",
  "  smoothstep(0.60,0.78,vUv.y);",
  " float structure=max(walls,0.55*(1.0-roof));",
  " float safe=structure*(1.0-roadMask)*(1.0-shipMask)*",
  "   blackGuard*highlightGuard*uFinalCohesion0264;",
  " // Sculpt graphite shadows without lifting near-black panel seams.",
  " float face=1.0-smoothstep(0.22,0.72,lum);",
  " float graphite=.087*safe*face*(1.0-chroma*.65);",
  " vec3 metal=source.rgb*(1.0-graphite);",
  " // Narrow chromatic highlight response around existing *colored* cores.",
  " vec2 p=uFinalPixel0264*vec2(5.0);",
  " vec3 a=texture2D(tDiffuse,clamp(vUv+vec2(p.x,0.0),vec2(0.001),vec2(0.999))).rgb;",
  " vec3 b=texture2D(tDiffuse,clamp(vUv-vec2(p.x,0.0),vec2(0.001),vec2(0.999))).rgb;",
  " vec3 c=texture2D(tDiffuse,clamp(vUv+vec2(0.0,p.y),vec2(0.001),vec2(0.999))).rgb;",
  " vec3 d=texture2D(tDiffuse,clamp(vUv-vec2(0.0,p.y),vec2(0.001),vec2(0.999))).rgb;",
  " vec3 nearRGB=(a+b+c+d)*.25;",
  " float nearChroma=c264Color(max(nearRGB,vec3(0.0)));",
  " vec3 hue=nearRGB-vec3(c264Luma(nearRGB));",
  " vec3 wrapped=max(hue,vec3(0.0))*nearChroma*",
  "   (0.185*safe)*(1.0-smoothstep(0.42,1.2,lum));",
  " vec3 rich=metal+wrapped+",
  "   (source.rgb-vec3(lum))*(0.135*safe*chroma);",
  " // Pure gray/white never receives added energy, preserve original alpha.",
  " gl_FragColor=vec4(max(rich,vec3(0.0)),source.a);",
  "}"
 ].join("\n")
};
export function installFinalCohesion0264(THREE,pipeline,world,{
 enabled=true,lowMemory=false
}={}){
 const disabled=reason=>({
  active:false,available:false,setComparison(){},resize(){},dispose(){},
  stats:()=>({finalCohesion0264Active:false,finalCohesion0264Status:reason})
 });
 if(!enabled)return disabled("comparison");
 const composer=pipeline?.composer,output=pipeline?.output,bloom=pipeline?.bloom;
 if(!bloom||!world?.getObjectByName||!composer?.passes||!output)
  return disabled("existing-pipeline-or-fixtures-unavailable");
 const cyan=world.getObjectByName(SOURCE_NAMES_0264.cyan);
 const amber=world.getObjectByName(SOURCE_NAMES_0264.amber);
 if(!cyan?.material?.color||!amber?.material?.color)
  return disabled("published-0.26.3.3-lights-unavailable");
 const originals={
  bloom:{strength:bloom.strength,radius:bloom.radius,threshold:bloom.threshold},
  cyan:cyan.material.color.clone(),amber:amber.material.color.clone()
 };
 let pass=null,comparison=1;
 const canGrade=!lowMemory&&typeof pipeline.makeShaderPass==="function"&&
  typeof composer.insertPass==="function"&&
  typeof composer.removePass==="function";
 if(canGrade){
  try{
   pass=pipeline.makeShaderPass({
    ...FINAL_COHESION_SHADER_0264,
    uniforms:{tDiffuse:{value:null},uFinalCohesion0264:{value:1},
     uFinalPixel0264:{value:new THREE.Vector2(1/960,1/540)}}
   });
   const i=composer.passes.indexOf(output);
   if(i<1)throw Error("output pass not last after HDR composer");
   composer.insertPass(pass,i);
  }catch(e){
   console.warn("SKYSHIFT 0.26.4 retains existing HDR bloom only",e);
   if(pass)composer.removePass(pass);
   pass?.dispose?.();pass=null;
  }
 }
 const apply=()=>{
  const b=finalCohesionBloom0264(originals.bloom,{lowMemory,comparison});
  bloom.strength=b.strength;bloom.radius=b.radius;bloom.threshold=b.threshold;
  for(const [name,mesh] of [["cyan",cyan],["amber",amber]]){
   const gain=finalFixtureGain0264(name,{lowMemory,comparison});
   const old=originals[name];
   mesh.material.color.setRGB(old.r*gain.r,old.g*gain.g,old.b*gain.b);
  }
  if(pass){
   pass.uniforms.uFinalCohesion0264.value=.88*comparison;
   pass.enabled=comparison>0.001;
  }
 };
 apply();
 return {
  active:true,available:true,pass,setComparison(v){comparison=clamp(v);apply()},
  resize(w,h,pixelRatio=1){
   pass?.uniforms.uFinalPixel0264.value.set(
    1/Math.max(1,w*pixelRatio),1/Math.max(1,h*pixelRatio));
  },
  stats(){return {
   finalCohesion0264Active:true,finalCohesion0264Status:"active",
   finalCohesion0264Version:FINAL_COHESION_0264.version,
   finalCohesion0264Comparison:comparison,
   finalCohesion0264LowMemory:!!lowMemory,
   finalCohesion0264ExtraPasses:pass?1:0,
   finalCohesion0264PassIndex:pass?composer.passes.indexOf(pass):-1,
   finalCohesion0264OutputIndex:composer.passes.indexOf(output),
   finalCohesion0264Bloom:{strength:bloom.strength,radius:bloom.radius,
    threshold:bloom.threshold},
   finalCohesion0264OriginalBloom:{...originals.bloom},
   finalCohesion0264FixtureHDR:comparison>0.001,
   finalCohesion0264NewLights:0,finalCohesion0264NewColliders:0,
   finalCohesion0264OriginalStraightOnlyCyan:true,
   finalCohesion0264OriginalAmberBands:true,
   finalCohesion0264SolarSealed:true,finalCohesion0264PhysicsUnchanged:true,
   finalCohesion0264NativeWaveUnchanged:true,
   finalCohesion0264NoNeutralWhiteFill:true
  }},
  dispose(){
   if(pass){pass.enabled=false;composer.removePass(pass);pass.dispose?.();}
   bloom.strength=originals.bloom.strength;
   bloom.radius=originals.bloom.radius;
   bloom.threshold=originals.bloom.threshold;
   cyan.material.color.copy(originals.cyan);
   amber.material.color.copy(originals.amber);
  }
 };
}
