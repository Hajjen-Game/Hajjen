// 0.29.4 — one optional HDR spatial radial motion-blur pass.
// This is a speed-driven approximation, NOT a per-object motion-vector
// buffer or temporal accumulation. No extra scene render, history texture,
// geometry, lights or changes to the physical flight solver.
export const ADAPTIVE_VELOCITY_BLUR=Object.freeze({
 version:"0.29.4",technique:"protected peripheral speed-driven radial HDR blur",
 samples:5,referenceAspect:780/360,maxRadiusFractionOfHeight:.085,
 modes:Object.freeze({off:0,low:.024,medium:.046,high:.070}),
 newSceneRenders:0,physicsChanged:false
});
export const EXTREME_VELOCITY_BLUR=Object.freeze({version:"0.29.4.1",modes:Object.freeze({ultra:Object.freeze({radius:.095,cap:.13,peripheral:.65}),extreme:Object.freeze({radius:.132,cap:.18,peripheral:1})}),samples:5});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function velocityBlurTarget({playing=false,speedMultiplier=1,boostMultiplier=1,
 mode="high",adaptiveLevel=0,comparison=1,extremeEnabled=false}={}){
 if(!playing||comparison<=0||mode==="off")return 0;
 const stronger=extremeEnabled&&Object.hasOwn(EXTREME_VELOCITY_BLUR.modes,mode)?EXTREME_VELOCITY_BLUR.modes[mode]:null;
 if(stronger){
  // Stronger from lap one, with earlier ramp and smooth boost response.
  // Quality scales the already bounded radius, including during boost.
  const speed=smooth(.85,2.45,speedMultiplier),boost=smooth(1.015,1.4,boostMultiplier);
  const quality=adaptiveLevel>=2?.65:adaptiveLevel===1?.82:1;
  return Math.min(stronger.cap,stronger.radius*(.40+.60*speed+.37*boost))*quality*clamp(comparison);
 }
 const radius=ADAPTIVE_VELOCITY_BLUR.modes[mode]??0;
 const speed=smooth(.85,2.95,speedMultiplier);
 const boost=smooth(1.015,1.4,boostMultiplier);
 const quality=adaptiveLevel>=2?.65:adaptiveLevel===1?.82:1;
 return Math.min(.085,radius*(.20+.80*speed+.37*boost)*quality*clamp(comparison));
}
export const ADAPTIVE_VELOCITY_SHADER={
 uniforms:{tDiffuse:{value:null},uRadius:{value:0},uAspect:{value:1.7778},uPeripheral:{value:0},uCraft:{value:null}},
 vertexShader:`varying vec2 vUv;
 void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform sampler2D tDiffuse;
 uniform float uRadius,uAspect,uPeripheral;
 uniform vec2 uCraft;
 varying vec2 vUv;
 float protection(vec2 uv){
  // Central road/apex stays sharp. Follow the actual projected ship rather
  // than assuming its screen location is fixed during turns or jumps.
  vec2 p=(uv-uCraft)*vec2(uAspect,1.0);
  float craft=1.0-smoothstep(0.20,0.34,length(p*vec2(0.82,1.45)));
  float lane=1.0-smoothstep(0.12,0.28,abs(uv.x-0.5));
  lane*=1.0-smoothstep(0.64,0.88,uv.y);
  return max(craft,lane);
 }
 void main(){
  vec4 clean=texture2D(tDiffuse,vUv);
  vec2 d=(vUv-vec2(0.5,0.55))*vec2(uAspect,1.0);
  float dist=length(d);
  // Original High/Medium/Low retain the exact mask. New modes extend
  // the peripheral coverage without changing the craft/lane protection.
  float outerMask=uPeripheral>0.0?smoothstep(mix(0.24,0.16,uPeripheral),mix(0.66,0.52,uPeripheral),dist):smoothstep(0.24,0.66,dist);
  float mask=outerMask*(1.0-protection(vUv));
  float radius=uRadius*mask;
  if(radius<0.00015){gl_FragColor=clean;return;}
  vec2 direction=d/max(dist,0.00001)/vec2(uAspect,1.0);
  vec2 stepUv=direction*radius;
  vec3 sum=clean.rgb*0.36;
  float weight=0.36;
  // Bounded directional samples, normalized weights, no white overlay.
  // Never pull a protected craft/road pixel into the peripheral streak.
  for(int i=1;i<=4;i++){
   float offset=float(i)*0.25;
   vec2 uv=clamp(vUv-stepUv*offset,vec2(0.001),vec2(0.999));
   float w=0.16*(1.0-protection(uv));
   sum+=texture2D(tDiffuse,uv).rgb*w;weight+=w;
  }
  gl_FragColor=vec4(sum/max(weight,0.0001),clean.a);
 }`
};
export function installAdaptiveVelocityBlur(THREE,pipeline,{mode="high",extremeEnabled=false}={}){
 const composer=pipeline?.composer,output=pipeline?.output;
 if(!composer||!output||typeof pipeline.makeShaderPass!=="function")throw Error("Velocity blur requires HDR composer");
 const index=composer.passes.indexOf(output);
 if(index<1)throw Error("Velocity blur output pass unavailable");
 const pass=pipeline.makeShaderPass({...ADAPTIVE_VELOCITY_SHADER,uniforms:{
  tDiffuse:{value:null},uRadius:{value:0},uAspect:{value:1.7778},uPeripheral:{value:0},uCraft:{value:new THREE.Vector2(.5,.27)}
 }});
 pass.enabled=false;composer.insertPass(pass,index);
 const supported=next=>Object.hasOwn(ADAPTIVE_VELOCITY_BLUR.modes,next)||(extremeEnabled&&Object.hasOwn(EXTREME_VELOCITY_BLUR.modes,next));
 if(!supported(mode))mode="high";
 let frame={},amount=0,quality=0,comparison=1,peak=0,activeFrames=0,boostFrames=0;
 function apply(snap=false){
  const target=velocityBlurTarget({...frame,mode,adaptiveLevel:quality,comparison,extremeEnabled});
  pass.uniforms.uPeripheral.value=extremeEnabled&&Object.hasOwn(EXTREME_VELOCITY_BLUR.modes,mode)?EXTREME_VELOCITY_BLUR.modes[mode].peripheral:0;
  if(!frame.playing||mode==="off"||comparison===0){amount=0;}
  else if(snap){amount=target;}
  else{const dt=clamp(frame.dt??1/60,0,.1);amount+=(target-amount)*(1-Math.exp(-dt*(target>amount?11:7)));}
  pass.uniforms.uRadius.value=amount;
  pass.enabled=amount>.00015;
  if(Number.isFinite(frame.craftX)&&Number.isFinite(frame.craftY))
   pass.uniforms.uCraft.value.set(clamp(frame.craftX),clamp(frame.craftY));
 }
 return {active:true,available:true,pass,
  update(f){frame=f??{};apply(Boolean(frame.snap));if(pass.enabled){activeFrames++;peak=Math.max(peak,amount);if(frame.boostMultiplier>1.015)boostFrames++;}},
  setMode(next){mode=supported(next)?next:"off";apply(true);},
  setComparison(next){comparison=clamp(next);apply(true);},
  setQualityLevel(level){quality=clamp(level,0,4);apply(true);},
  resize(w,h){pass.uniforms.uAspect.value=Math.max(.25,w/Math.max(1,h));},
  reset(){frame={};amount=peak=activeFrames=boostFrames=0;apply(true);},
  stats(){return {version:extremeEnabled?EXTREME_VELOCITY_BLUR.version:ADAPTIVE_VELOCITY_BLUR.version,mode,active:true,enabled:pass.enabled,
   peripheralExpansion:pass.uniforms.uPeripheral.value,
   intensity:amount,radiusFractionOfHeight:amount,peakRadiusFractionOfHeight:peak,activeFrames,boostFrames,
   comparison,qualityLevel:quality,aspect:pass.uniforms.uAspect.value,
   craft:{x:pass.uniforms.uCraft.value.x,y:pass.uniforms.uCraft.value.y},
   renderPasses:pass.enabled?1:0,samples:5,passIndex:composer.passes.indexOf(pass),
   outputIndex:composer.passes.indexOf(output),protectedCenter:true,physicsUnchanged:true,
   newSceneRenders:0,technique:ADAPTIVE_VELOCITY_BLUR.technique};},
  dispose(){pass.enabled=false;composer.removePass(pass);pass.dispose?.();}
 };
}
