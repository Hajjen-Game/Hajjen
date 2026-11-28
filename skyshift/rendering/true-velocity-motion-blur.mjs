// SKYSHIFT 0.29.4.2 — camera-motion reprojection using the existing beauty depth.
// Inspired by GPU Gems 3 ch.27; static-world camera motion, NOT object vectors.
// No color history, new scene render or fixed radial center. Linear HDR before bloom.
export const TRUE_VELOCITY=Object.freeze({
 version:"0.29.4.2",technique:"depth-reconstructed camera motion blur",
 modes:Object.freeze({off:[0,0],low:[.45,.025],medium:[.75,.045],high:[1.15,.065],ultra:[1.6,.09],extreme:[2,.12]}),
 referenceFrameSeconds:1/60,maxSamples:7
});
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function trueVelocityResponse({playing=false,mode="high",speedMultiplier=1,boostMultiplier=1,adaptiveLevel=0,comparison=1,dt=1/60}={}){
 const m=Object.hasOwn(TRUE_VELOCITY.modes,mode)?TRUE_VELOCITY.modes[mode]:TRUE_VELOCITY.modes.off;
 // Zero at the actual 44m/s launch speed, even when boost signal is present.
 // Actual speed already includes boost; only a modest extra shutter gain.
 const speed=smooth(1,3.15,speedMultiplier);
 const quality=adaptiveLevel>=2?.65:adaptiveLevel>=1?.82:1;
 const gain=playing?speed*m[0]*(1+.12*smooth(1.015,1.4,boostMultiplier))*quality*clamp(comparison):0;
 return {speedGate:speed,exposure:gain*clamp((1/60)/Math.max(.001,dt),.125,4),gain,
  maxSpan:m[1]*quality*clamp(comparison),samples:adaptiveLevel>=2?3:adaptiveLevel>=1?5:7};
}
export function cameraHistoryValid(previous,current,dt){
 if(!previous||!current||!Number.isFinite(dt)||dt<=0||dt>.12)return false;
 const a=previous.elements,b=current.elements;
 const distance=Math.hypot(a[12]-b[12],a[13]-b[13],a[14]-b[14]);
 const rotation=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[4]*b[4]+a[5]*b[5]+a[6]*b[6]+a[8]*b[8]+a[9]*b[9]+a[10]*b[10];
 return Number.isFinite(distance)&&distance<24&&rotation>2.65;
}
export function reconstructPreviousUv(THREE,uv,depth,invProjection,previousClipFromView){
 const p=new THREE.Vector4(uv[0]*2-1,uv[1]*2-1,depth*2-1,1).applyMatrix4(invProjection);
 p.multiplyScalar(1/p.w).applyMatrix4(previousClipFromView);
 return p.w>0?[p.x/p.w*.5+.5,p.y/p.w*.5+.5]:null;
}
export const TRUE_VELOCITY_SHADER={
 uniforms:{tDiffuse:{value:null},tDepth:{value:null},uInvProjection:{value:null},uPreviousClipFromView:{value:null},
  uExposure:{value:0},uMaxSpan:{value:0},uAspect:{value:1},uNear:{value:.1},uFar:{value:650},
  uCraft:{value:null},uCraftRadius:{value:.20},uSamples:{value:7}},
 vertexShader:`varying vec2 vUv;
 void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
 fragmentShader:`uniform sampler2D tDiffuse,tDepth;
 uniform mat4 uInvProjection,uPreviousClipFromView;
 uniform float uExposure,uMaxSpan,uAspect,uNear,uFar,uCraftRadius;
 uniform int uSamples;
 uniform vec2 uCraft;
 varying vec2 vUv;
 float linearDepth(float d){return uNear*uFar/(uFar-d*(uFar-uNear));}
 float protect(vec2 uv){
  // Conservative projected craft/engine neighborhood. Not an object ID mask.
  float r=length((uv-uCraft)*vec2(uAspect,1.0));
  return 1.0-smoothstep(uCraftRadius,uCraftRadius+0.065,r);
 }
 void main(){
  vec4 clean=texture2D(tDiffuse,vUv);
  float mask=1.0-protect(vUv);
  if(mask<0.0001||uExposure<0.00001){gl_FragColor=clean;return;}
  float depth=texture2D(tDepth,vUv).r;
  if(depth>=0.999999||depth<=0.0){gl_FragColor=clean;return;}
  vec4 view=uInvProjection*vec4(vUv*2.0-1.0,depth*2.0-1.0,1.0);
  view/=view.w;
  vec4 prev=uPreviousClipFromView*view;
  if(prev.w<=0.0001){gl_FragColor=clean;return;}
  vec2 velocity=(vUv-(prev.xy/prev.w*0.5+0.5))*uExposure;
  float span=length(velocity*vec2(uAspect,1.0));
  velocity*=min(1.0,uMaxSpan/max(span,0.000001))*mask;
  if(length(velocity*vec2(uAspect,1.0))<0.00025){gl_FragColor=clean;return;}
  float z=linearDepth(depth);
  vec3 sum=clean.rgb;float weights=1.0;
  // Symmetric shutter taps; reject samples on other depth layers and
  // protected craft pixels. No color/luminance selection or artificial glow.
  for(int i=1;i<=3;i++){
   if(i>(uSamples-1)/2)break;
   float t=float(i)/float((uSamples-1)/2)*0.5;
   for(int signIndex=0;signIndex<2;signIndex++){
    vec2 uv=vUv+velocity*t*(signIndex==0?-1.0:1.0);
    if(any(lessThan(uv,vec2(0.001)))||any(greaterThan(uv,vec2(0.999))))continue;
    float d=texture2D(tDepth,uv).r;
    if(d>=0.999999||d<=0.0)continue;
    float sampleZ=linearDepth(d);
    float relative=abs(sampleZ-z)/max(0.1,min(z,sampleZ));
    float w=(1.0-smoothstep(0.08,0.32,relative))*(1.0-protect(uv))*(1.0-0.8*t);
    if(w>0.0001){sum+=texture2D(tDiffuse,uv).rgb*w;weights+=w;}
   }
  }
  gl_FragColor=vec4(sum/weights,clean.a);
 }`
};
export function installTrueVelocityMotionBlur(THREE,pipeline,camera,{mode="high"}={}){
 const composer=pipeline?.composer;
 if(!composer||composer.passes.indexOf(pipeline.bloom)!==1||!composer.renderTarget1||!composer.renderTarget2)
  throw Error("True velocity requires beauty then bloom composer");
 // Both ping-pong buffers can become the current beauty buffer. Separate
 // attachments avoid read/write feedback; no additional scene/depth prepass.
 const targets=[composer.renderTarget1,composer.renderTarget2];
 for(const target of targets){
  if(target.depthTexture)throw Error("Unexpected existing beauty depth owner");
  target.depthBuffer=true;
  const depth=new THREE.DepthTexture(target.width,target.height,THREE.UnsignedIntType);
  depth.minFilter=depth.magFilter=THREE.NearestFilter;depth.generateMipmaps=false;
  target.depthTexture=depth;
  target.dispose(); // invalidate any already allocated FBO; lazy recreation
 }
 const uniforms={tDiffuse:{value:null},tDepth:{value:null},
  uInvProjection:{value:new THREE.Matrix4()},uPreviousClipFromView:{value:new THREE.Matrix4()},
  uExposure:{value:0},uMaxSpan:{value:0},uAspect:{value:camera.aspect},uNear:{value:camera.near},uFar:{value:camera.far},
  uCraft:{value:new THREE.Vector2(.5,.27)},uCraftRadius:{value:.20},uSamples:{value:7}};
 const pass=pipeline.makeShaderPass({...TRUE_VELOCITY_SHADER,uniforms});
 // ShaderPass clones uniforms; use its own uniform instances.
 const u=pass.uniforms;
 pass.enabled=false;composer.insertPass(pass,1);
 const originalRender=pass.render;
 let frame={},quality=0,comparison=1,amount=0,peak=0,activeFrames=0,boostFrames=0,historyResets=0,depthFrames=0;
 let hasHistory=false,historyValid=false,actualHistory=false,depthBound=false;
 const previousWorld=new THREE.Matrix4(),previousView=new THREE.Matrix4(),relative=new THREE.Matrix4();
 let response=trueVelocityResponse();
 function invalidate(){hasHistory=false;historyValid=false;actualHistory=false;amount=0;pass.enabled=false;u.uExposure.value=0;}
 function apply(snap=false){
  response=trueVelocityResponse({...frame,mode,adaptiveLevel:quality,comparison});
  if(!frame.playing||mode==="off"||!historyValid||response.gain<=0){amount=0;}
  else if(snap){amount=response.gain;}
  else{amount+=(response.gain-amount)*(1-Math.exp(-clamp(frame.dt??1/60,0,.12)*9));}
  u.uExposure.value=amount*clamp((1/60)/Math.max(.001,frame.dt??1/60),.125,4);
  u.uMaxSpan.value=response.maxSpan;u.uSamples.value=response.samples;
  pass.enabled=historyValid&&amount>.0001&&response.maxSpan>0;
 }
 function update(f){
  frame=f??{};
  camera.updateMatrixWorld(true);
  if(!frame.playing){invalidate();apply(true);return;}
  const dt=frame.dt??1/60;
  const prior=frame.probePreviousWorld??(hasHistory?previousWorld:null);
  historyValid=cameraHistoryValid(prior,camera.matrixWorld,dt);
  actualHistory=historyValid&&!frame.probePreviousWorld;
  if(historyValid){
   previousView.copy(prior).invert();
   relative.multiplyMatrices(previousView,camera.matrixWorld);
   // Use current projection at both ends: don't blur a pure FOV change.
   u.uPreviousClipFromView.value.multiplyMatrices(camera.projectionMatrix,relative);
   u.uInvProjection.value.copy(camera.projectionMatrixInverse);
  }else{historyResets++;amount=0;}
  previousWorld.copy(camera.matrixWorld);hasHistory=true;
  u.uAspect.value=camera.aspect;u.uNear.value=camera.near;u.uFar.value=camera.far;
  if(Number.isFinite(frame.craftX)&&Number.isFinite(frame.craftY)){
   u.uCraft.value.set(frame.craftX,frame.craftY);
   const d=clamp((frame.craftZ??0)*.5+.5);
   const z=camera.near*camera.far/(camera.far-d*(camera.far-camera.near));
   // 4.2m conservative world-space radius for 5.8m Manta plus roll.
   u.uCraftRadius.value=clamp(camera.projectionMatrix.elements[5]*4.2/(2*Math.max(1,z)),.12,.42);
  }
  apply(Boolean(frame.snap));
 }
 pass.render=function(renderer,writeBuffer,readBuffer,...rest){
  // The scene pass has just rendered into readBuffer. This pass writes only
  // the other target. Depth is never sampled from the destination FBO.
  const depth=readBuffer.depthTexture;
  if(!depth||depth===writeBuffer.depthTexture)throw Error("True velocity beauty depth not bound independently");
  u.tDepth.value=depth;depthBound=true;
  originalRender.call(this,renderer,writeBuffer,readBuffer,...rest);
  depthFrames++;activeFrames++;peak=Math.max(peak,amount);if(frame.boostMultiplier>1.015)boostFrames++;
 };
 return {active:true,available:true,pass,update,
  setMode(next){mode=Object.hasOwn(TRUE_VELOCITY.modes,next)?next:"off";apply(true);},
  setComparison(next){comparison=clamp(next);apply(true);},
  setQualityLevel(level){quality=clamp(level,0,4);apply(true);},
  resize(w,h){u.uAspect.value=w/Math.max(1,h);invalidate();},
  reset(){frame={};invalidate();peak=activeFrames=boostFrames=historyResets=depthFrames=0;depthBound=false;apply(true);},
  stats(){return {version:TRUE_VELOCITY.version,technique:TRUE_VELOCITY.technique,mode,active:true,enabled:pass.enabled,
   speedGate:response.speedGate,exposureGain:amount,peakExposureGain:peak,intensity:amount,
   maxSpanFractionOfHeight:response.maxSpan,activeFrames,boostFrames,comparison,qualityLevel:quality,
   aspect:u.uAspect.value,craft:{x:u.uCraft.value.x,y:u.uCraft.value.y,radius:u.uCraftRadius.value},
   renderPasses:pass.enabled?1:0,samples:response.samples,depthSamples:response.samples,
   passIndex:composer.passes.indexOf(pass),bloomIndex:composer.passes.indexOf(pipeline.bloom),outputIndex:composer.passes.indexOf(pipeline.output),
   historyValid,actualHistory,historyResets,depthBound,depthFrames,depthAttachments:2,
   protectedCraft:true,physicsUnchanged:true,newSceneRenders:0,objectMotionVectors:false};},
  dispose(){pass.enabled=false;composer.removePass(pass);pass.dispose?.();u.tDepth.value=null;
   // Composer owns the two depth attachments and disposes with its targets.
   invalidate();}
 };
}
