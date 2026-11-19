// SKYSHIFT 0.22.0 — Cinematic Visual Rebirth / Pass 3.
// Velocity Cinematography: selective HDR wall/roof streaks BEFORE OutputPass
// and AFTER SMAA. Protect ship, road apex and central driving corridor.
// No new lights, meshes, camera movement, physics or white solar source.
// ShaderPass is created by the already-mounted neon pipeline (neon-v0111).
export const VELOCITY_CINEMA_0220_P3=Object.freeze({
 version:"0.22.0.3",pass:"3 — Velocity Cinematography",
 source:"actual speed ratio + physical boost multiplier",
 technique:"protected-center directional HDR streak convolution",
 position:"after SMAA, before OutputPass",
 samples:5,maxRadiusPx:7.5,
 deviceGate:"!lowMemory",adaptiveGate:true,
 activateAboveSpeedMultiplier:1.45,
 comparison:"?velocityCinema=classic",
 newMeshes:0,newLights:0,newPhysics:0,newCameraChanges:0,
 newDrawBatchesWhenActive:1,newDrawBatchesWhenIdle:0,
 gameplayUnchanged:true,zoneWaveUnchanged:true,
 shipReadabilityProtected:true,roadReadabilityProtected:true,
 exteriorSunSealRetained:true
});
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const smooth=(a,b,n)=>{
 const t=clamp((n-a)/(b-a));return t*t*(3-2*t);
};
export function velocityCinemaIntensity({
 speedMultiplier=1,boostMultiplier=1,playing=false,
 lowMemory=false,adaptiveLevel=0,comparison=1
}={}){
 if(!playing||lowMemory||comparison===0||adaptiveLevel>=3)return 0;
 const speed=smooth(1.45,3.65,speedMultiplier);
 const boost=smooth(1.03,1.40,boostMultiplier);
 const amount=0.59*speed+0.26*boost;
 const adaptive=adaptiveLevel===2?.54:adaptiveLevel===1?.78:1;
 return clamp(amount*adaptive,0,0.85);
}
export const VELOCITY_SHADER_0220_P3={
 uniforms:{
  tDiffuse:{value:null},
  uCinemaVelocity:{value:0},
  uCinemaPixelSize:{value:null},
  uCinemaMaxPixels:{value:VELOCITY_CINEMA_0220_P3.maxRadiusPx}
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
  "uniform float uCinemaVelocity;",
  "uniform vec2 uCinemaPixelSize;",
  "uniform float uCinemaMaxPixels;",
  "varying vec2 vUv;",
  "void main(){",
  " vec4 clean=texture2D(tDiffuse,vUv);",
  " if(uCinemaVelocity<0.012){gl_FragColor=clean;return;}",
  " vec2 origin=vec2(0.50,0.55);",
  " vec2 outward=vUv-origin;",
  " float dist=length(outward*vec2(1.10,0.73));",
  " float peripheral=smoothstep(0.22,0.48,dist);",
  " // Protect central racing lane and ship even during heavy boost.",
  " float lane=1.0-smoothstep(0.10,0.31,abs(vUv.x-0.5));",
  " lane*=1.0-smoothstep(0.36,0.76,vUv.y);",
  " float craft=1.0-smoothstep(0.13,0.27,abs(vUv.x-0.5));",
  " craft*=1.0-smoothstep(0.14,0.31,abs(vUv.y-0.24));",
  " float mask=peripheral*(1.0-0.94*lane)*(1.0-0.98*craft);",
  " float energy=uCinemaVelocity*mask;",
  " if(energy<0.012){gl_FragColor=clean;return;}",
  " vec2 direction=normalize(outward+vec2(0.00001));",
  " vec2 radius=direction*uCinemaPixelSize*uCinemaMaxPixels*energy;",
  " // Symmetric 5-tap HDR blur; no generated white/neutral sun pixel.",
  " vec3 response=clean.rgb*0.48;",
  " response+=texture2D(tDiffuse,clamp(vUv-radius,0.001,0.999)).rgb*0.13;",
  " response+=texture2D(tDiffuse,clamp(vUv+radius,0.001,0.999)).rgb*0.13;",
  " response+=texture2D(tDiffuse,clamp(vUv-radius*0.52,0.001,0.999)).rgb*0.13;",
  " response+=texture2D(tDiffuse,clamp(vUv+radius*0.52,0.001,0.999)).rgb*0.13;",
  " gl_FragColor=vec4(response,clean.a);",
  "}"
 ].join("\n")
};
export function installVelocityCinematography(THREE,pipeline,{
 lowMemory=false,enabled=true
}={}){
 const disabled=()=>({
  active:false,available:false,
  update(){},setComparison(){},setQualityLevel(){},resize(){},
  stats(){return {version:VELOCITY_CINEMA_0220_P3.version,
   enabled:false,active:false,intensity:0,renderPasses:0,
   disabledReason:lowMemory?"low-memory":!enabled?"comparison":"unsupported"};}
 });
 if(!enabled||lowMemory)return disabled();
 const composer=pipeline?.composer,output=pipeline?.output;
 if(!composer||!output||typeof pipeline.makeShaderPass!=="function"||
    typeof composer.insertPass!=="function"||
    typeof composer.removePass!=="function")return disabled();
 const index=composer.passes.indexOf(output);
 if(index<1)return disabled();
 let pass;
 try{
  const shader={
   ...VELOCITY_SHADER_0220_P3,
   uniforms:{
    tDiffuse:{value:null},uCinemaVelocity:{value:0},
    uCinemaPixelSize:{value:new THREE.Vector2(1/960,1/540)},
    uCinemaMaxPixels:{value:VELOCITY_CINEMA_0220_P3.maxRadiusPx}
   }
  };
  pass=pipeline.makeShaderPass(shader);
  pass.enabled=false;
  composer.insertPass(pass,index);
 }catch(error){
  console.warn("SKYSHIFT P3 postprocess unavailable; original renderer retained",error);
  pass?.dispose?.();
  return disabled();
 }
 let amount=0,comparison=1,quality=0,frame={};
 const set=()=>{
  amount=velocityCinemaIntensity({
   ...frame,lowMemory,adaptiveLevel:quality,comparison
  });
  pass.uniforms.uCinemaVelocity.value=amount;
  pass.enabled=amount>0.012;
 };
 return {
  active:true,available:true,pass,
  update(f){frame=f??{};set()},
  setComparison(value){comparison=clamp(value);set()},
  setQualityLevel(level){quality=clamp(level,0,4);set()},
  resize(w,h,ratio=1){
   pass.uniforms.uCinemaPixelSize.value.set(
    1/Math.max(1,w*ratio),1/Math.max(1,h*ratio));
  },
  stats(){return {version:VELOCITY_CINEMA_0220_P3.version,
   active:true,enabled:pass.enabled,intensity:amount,
   comparison,qualityLevel:quality,lowMemory,
   renderPasses:pass.enabled?1:0,
   passIndex:composer.passes.indexOf(pass),
   outputIndex:composer.passes.indexOf(output),
   protectedCenter:true,neutralSunLightingChanged:false,
   physicsUnchanged:true,cameraUnchanged:true};},
  dispose(){pass.enabled=false;composer.removePass(pass);pass.dispose?.();}
 };
}
