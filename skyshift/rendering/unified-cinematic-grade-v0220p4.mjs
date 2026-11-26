// SKYSHIFT 0.22.0 — Cinematic Visual Rebirth / Pass 4
// Unified Cinematic Grade. Consolidates Pass 1 graphite, Pass 2 local neon
// and Pass 3 optional velocity without adding lights, world objects,
// white solar sources, camera roll, boost physics or new gameplay.
// A selective linear-HDR material/neon grade lives AFTER P3 and BEFORE
// the original OutputPass. Strong white-core neon, ship, road and HUD remain
// readable. No global exposure or bloom increase; 4GB stays unchanged.

export const UNIFIED_GRADE_0220_P4=Object.freeze({
 version:"0.22.0.4",pass:"4 — Unified Cinematic Grade",
 grade:"graphite contrast / spectral color separation / selective neon light wrap",
 source:"original HDR scene + native nine-zone palette already in pixels",
 pipeline:"Render → Bloom → SMAA → optional Velocity → Unified Grade → Output",
 localSamples:5,
 maxWrapPx:14,
 newLights:0,newMeshes:0,newTextures:0,newPhysics:0,
 changedRoadShader:false,changedShipShader:false,
 changedCamera:false,changedGrip:false,
 changedNativeWave:false,changedWhiteSolarSeal:false,
 globalExposureChange:0,globalBloomChange:0,
 activePasses:1,lowMemoryExtraPasses:0,
 compare:"?unifiedGrade=classic"
});
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(v)?v:a));
export function gradeAmount({
 playing=false,lowMemory=false,adaptiveLevel=0,
 speedMultiplier=1,boostMultiplier=1,comparison=1
}={}){
 if(!playing||lowMemory||adaptiveLevel>=3||comparison<=0)return 0;
 // Primary grade should be obvious already at base speed.
 const boost=clamp((boostMultiplier-1)/.4);
 const speed=clamp((speedMultiplier-1)/3.2);
 const quality=adaptiveLevel===2?.65:adaptiveLevel===1?.83:1;
 return clamp((.81+.11*speed+.08*boost)*quality*comparison,0,1);
}
export const UNIFIED_GRADE_SHADER_0220_P4={
 uniforms:{
  tDiffuse:{value:null},uUnifiedGrade:{value:0},
  uUnifiedPixel:{value:null},uUnifiedWrapPixels:{value:14}
 },
 vertexShader:[
  "varying vec2 vUv;",
  "void main(){",
  " vUv=uv;",
  " gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);",
  "}"
 ].join("\n"),
 fragmentShader:[
  "uniform sampler2D tDiffuse;",
  "uniform float uUnifiedGrade;",
  "uniform vec2 uUnifiedPixel;",
  "uniform float uUnifiedWrapPixels;",
  "varying vec2 vUv;",
  "float gradeLuma(vec3 x){return dot(x,vec3(0.2126,0.7152,0.0722));}",
  "void main(){",
  " vec4 source=texture2D(tDiffuse,vUv);",
  " if(uUnifiedGrade<0.012){gl_FragColor=source;return;}",
  " float lum=gradeLuma(source.rgb);",
  " // The brightest neutral solar/white-core pixels must stay unchanged.",
  " float highlightLock=1.0-smoothstep(0.93,1.78,lum);",
  " // 0 at the central ship/road and near 1 at walls and vault.",
  " float lateral=smoothstep(0.095,0.34,abs(vUv.x-0.5));",
  " float crown=smoothstep(0.52,0.86,vUv.y);",
  " float wallMask=clamp(0.77*lateral+0.23*crown,0.0,1.0);",
  " float road=1.0-smoothstep(0.13,0.32,abs(vUv.x-0.5));",
  " road*=1.0-smoothstep(0.38,0.71,vUv.y);",
  " float ship=1.0-smoothstep(0.12,0.24,abs(vUv.x-0.5));",
  " ship*=1.0-smoothstep(0.12,0.32,abs(vUv.y-0.23));",
  " float keep=1.0-0.91*road;",
  " keep*=1.0-0.97*ship;",
  " float weight=uUnifiedGrade*wallMask*keep*highlightLock;",
  " // Keep near-black insets dark, while increasing graphite face separation.",
  " float face=smoothstep(0.016,0.10,lum);",
  " float contrast=0.86+0.26*smoothstep(0.05,0.70,lum);",
  " vec3 neutral=vec3(lum);",
  " vec3 rich=mix(neutral,source.rgb,1.19);",
  " vec3 graphite=rich*contrast+vec3(0.011)*face*",
  "   (1.0-smoothstep(0.42,1.10,lum));",
  " // Existing colored neon provides its own hue. Remove neutral light",
  " // to avoid recreating the old white sun-spill on graphite surfaces.",
  " vec2 r=uUnifiedPixel*uUnifiedWrapPixels;",
  " vec3 a=texture2D(tDiffuse,clamp(vUv+vec2(r.x,0.0),vec2(0.001),vec2(0.999))).rgb;",
  " vec3 b=texture2D(tDiffuse,clamp(vUv-vec2(r.x,0.0),vec2(0.001),vec2(0.999))).rgb;",
  " vec3 c=texture2D(tDiffuse,clamp(vUv+vec2(0.0,r.y),vec2(0.001),vec2(0.999))).rgb;",
  " vec3 d=texture2D(tDiffuse,clamp(vUv-vec2(0.0,r.y),vec2(0.001),vec2(0.999))).rgb;",
  " vec3 nearby=(a+b+c+d)*0.25;",
  " vec3 colored=max(nearby-vec3(gradeLuma(nearby)),vec3(0.0));",
  " float sourceShadow=1.0-smoothstep(0.23,0.95,lum);",
  " vec3 wrap=colored*0.17*sourceShadow*weight;",
  " vec3 finished=max(source.rgb+weight*(graphite-source.rgb)+wrap,vec3(0.0));",
  " gl_FragColor=vec4(finished,source.a);",
  "}"
 ].join("\n")
};
export function installUnifiedCinematicGrade(THREE,pipeline,{
 lowMemory=false,enabled=true
}={}){
 const disabled=reason=>({
  active:false,available:false,
  update(){},setComparison(){},setQualityLevel(){},resize(){},
  stats(){return {version:UNIFIED_GRADE_0220_P4.version,
   active:false,enabled:false,intensity:0,renderPasses:0,
   disabledReason:reason};}
 });
 if(!enabled)return disabled("comparison");
 if(lowMemory)return disabled("low-memory");
 const composer=pipeline?.composer,output=pipeline?.output;
 if(!composer||!output||typeof pipeline.makeShaderPass!=="function"||
    typeof composer.insertPass!=="function"||
    typeof composer.removePass!=="function")return disabled("unsupported");
 const outputIndex=composer.passes.indexOf(output);
 if(outputIndex<1)return disabled("invalid-output");
 let pass;
 try{
  pass=pipeline.makeShaderPass({
   ...UNIFIED_GRADE_SHADER_0220_P4,
   uniforms:{
    tDiffuse:{value:null},uUnifiedGrade:{value:0},
    uUnifiedPixel:{value:new THREE.Vector2(1/960,1/540)},
    uUnifiedWrapPixels:{value:UNIFIED_GRADE_0220_P4.maxWrapPx}
   }
  });
  pass.enabled=false;
  composer.insertPass(pass,outputIndex);
 }catch(err){
  console.warn("SKYSHIFT P4 grade unavailable; retaining Pass 3",err);
  pass?.dispose?.();
  return disabled("creation-failed");
 }
 let frame={},level=0,comparison=1,strength=0;
 const apply=()=>{
  strength=gradeAmount({...frame,lowMemory,
   adaptiveLevel:level,comparison});
  pass.uniforms.uUnifiedGrade.value=strength;
  pass.enabled=strength>0.012;
 };
 return {
  active:true,available:true,pass,
  update(f){frame=f??{};apply()},
  setQualityLevel(n){level=clamp(n,0,4);apply()},
  setComparison(n){comparison=clamp(n);apply()},
  resize(width,height,pixelRatio=1){
   pass.uniforms.uUnifiedPixel.value.set(
    1/Math.max(1,width*pixelRatio),
    1/Math.max(1,height*pixelRatio));
  },
  stats(){return {
   version:UNIFIED_GRADE_0220_P4.version,
   active:true,enabled:pass.enabled,intensity:strength,
   comparison,qualityLevel:level,
   renderPasses:pass.enabled?1:0,
   passIndex:composer.passes.indexOf(pass),
   outputIndex:composer.passes.indexOf(output),
   noNeutralSunAdded:true,originalExposurePreserved:true,
   baseCameraUnchanged:true,physicsUnchanged:true,
   oldBloomPreserved:true
  }},
  dispose(){pass.enabled=false;composer.removePass(pass);pass.dispose?.()}
 };
}
