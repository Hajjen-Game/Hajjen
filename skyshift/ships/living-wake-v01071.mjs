// SKYSHIFT 0.10.7.1 — White Aerodynamic Wake: additive-light compositing correction.
// World-space, physically sourced wingtip history. A wake is LEFT IN THE WORLD
// as the craft turns, fades and drifts; it is not a white line attached to the
// current hull. All changes are cosmetic. One bounded preallocated mesh.
import {speedPresenceAt} from "./velocity-presence-v0104.mjs";
import {wingtipEmitters} from "./wingtip-contrails-v0106.mjs";

export const LIVING_WAKE=Object.freeze({
 version:"white-living-aerodynamic-wake-01071",
 emitters:2,samplesPerTip:28,segmentsPerTip:27,layers:2,
 sampleIntervalSeconds:.026,maxLifetimeSeconds:.61,
 maxTrailMeters:38,maxJumpMeters:15,
 maxLightEnergy:.46,additiveLightOnly:true,addedDrawCalls:1,addedParticles:0,
 addedLights:0,addedPostPasses:0,physicsChanged:false
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const smoother=(a,b,x)=>{
 const p=clamp((x-a)/(b-a),0,1);return p*p*(3-2*p);
};
// Speed is a permission gate, not a permanently bright visual intensity.
// Turns, actual GRIP, jumping and boosting decide when air condenses.
export function wakeEnergy({speed=44,yawRate=0,steering=0,
 gripIntensity=0,boostMultiplier=1,grounded=true}={}){
 const speedZone=speedPresenceAt(speed);
 const gate=smoother(.35,.83,speedZone);
 const yaw=Math.abs(finite(yawRate));
 const steeringLoad=Math.abs(finite(steering));
 const turn=Math.max(smoother(.17,1.15,yaw),
  .48*smoother(.30,.95,steeringLoad));
 const grip=clamp(finite(gripIntensity),0,1);
 const boost=clamp((finite(boostMultiplier,1)-1)/.40,0,1);
 const air=grounded===false?1:0;
 const quiet=.012+.075*smoother(.81,1,speedZone);
 const load=clamp(quiet+.55*turn+.30*grip+
  .28*boost+.15*air+.14*turn*grip,0,1);
 return {speedZone,gate,turn,grip,boost,air,
  strength:clamp(gate*load,0,.92)};
}
function sampleRecord(){return {
 x:0,y:0,z:0,rx:1,ry:0,rz:0,ux:0,uy:1,uz:0,
 time:-1,strength:0,valid:false
};}
export function createWakeHistory(){
 const cap=LIVING_WAKE.samplesPerTip;
 return {time:0,accum:0,head:0,count:0,
  left:Array.from({length:cap},sampleRecord),
  right:Array.from({length:cap},sampleRecord),
  emits:0,discontinuities:0,peakEnergy:0,
  motionMeters:0,lastAnchor:null};
}
export function resetWakeHistory(h){
 h.time=0;h.accum=0;h.head=0;h.count=0;h.emits=0;
 h.discontinuities=0;h.peakEnergy=0;h.motionMeters=0;h.lastAnchor=null;
 for(const side of [h.left,h.right])for(const p of side){
  p.valid=false;p.strength=0;p.time=-1;
 }
 return h;
}
// Caller passes world coordinates read from the ACTUAL mesh matrix, never a
// guessed coordinate system. History is circular and stores positions only
// once; future ship transforms cannot mutate previous records.
export function recordWake(h,positionA,positionB,right,up,strength){
 const cap=LIVING_WAKE.samplesPerTip;
 const prevIndex=(h.head-1+cap)%cap;
 const previous=h.count?h.left[prevIndex]:null;
 const move=previous?Math.hypot(
  positionA.x-previous.x,positionA.y-previous.y,
  positionA.z-previous.z):0;
 if(move>LIVING_WAKE.maxJumpMeters){
  h.head=0;h.count=0;h.discontinuities++;
  for(const side of [h.left,h.right])for(const p of side)p.valid=false;
 }
 if(previous&&move<=LIVING_WAKE.maxJumpMeters)
  h.motionMeters+=move;
 for(const [record,point] of [[h.left[h.head],positionA],
  [h.right[h.head],positionB]]){
  record.x=finite(point.x);record.y=finite(point.y);record.z=finite(point.z);
  record.rx=finite(right.x,1);record.ry=finite(right.y);record.rz=finite(right.z);
  record.ux=finite(up.x);record.uy=finite(up.y,1);record.uz=finite(up.z);
  record.time=h.time;record.strength=clamp(finite(strength),0,1);
  record.valid=true;
 }
 h.head=(h.head+1)%cap;
 h.count=Math.min(h.count+1,cap);h.emits++;
 h.peakEnergy=Math.max(h.peakEnergy,strength);
}
export function historyPoint(h,side,ageIndex){
 if(ageIndex<0||ageIndex>=h.count)return null;
 const ix=(h.head-1-ageIndex+LIVING_WAKE.samplesPerTip)%
  LIVING_WAKE.samplesPerTip;
 return (side===0?h.left:h.right)[ix];
}
function putTrianglePair(pos,col,start,a,b,halfA,halfB,lightA,lightB,halo){
 // Camera-facing tangent units are supplied from 'a' and 'b' as nx,ny,nz.
 // RGBA vertex alpha drives ADDITIVE light, so no pixel beneath the wake
 // can ever be darkened (unlike NormalBlending over bright roadway).
 const colorOffset=start/3*4;
 for(let i=0;i<6;i++){
  const far=i===2||i===4||i===5;
  const sign=(i===1||i===2||i===4)?1:-1;
  const p=far?b:a,w=(far?halfB:halfA)*sign;
  const light=far?lightB:lightA;
  const k=start+i*3,c=colorOffset+i*4;
  pos[k]=p.x+p.nx*w;pos[k+1]=p.y+p.ny*w;pos[k+2]=p.z+p.nz*w;
  // Neutral-white vapor with TRUE per-vertex transparency and age decay.
  col[c]=halo?.965:1;
  col[c+1]=halo?.982:1;
  col[c+2]=1;
  col[c+3]=clamp(light,0,1);
 }
}
export function createLivingWakeFX(THREE,scene,ship,
 {variant="manta",lowMemory=false}={}){
 const cfg=LIVING_WAKE,tips=wingtipEmitters(variant);
 const history=createWakeHistory();
 const count=cfg.emitters*cfg.segmentsPerTip*cfg.layers*6;
 const xyz=new Float32Array(count*3),rgb=new Float32Array(count*4);
 const geometry=new THREE.BufferGeometry();
 const position=new THREE.BufferAttribute(xyz,3).setUsage(THREE.DynamicDrawUsage);
 const color=new THREE.BufferAttribute(rgb,4).setUsage(THREE.DynamicDrawUsage);
 geometry.setAttribute("position",position);geometry.setAttribute("color",color);
 const material=new THREE.MeshBasicMaterial({
  color:0xffffff,vertexColors:true,transparent:true,opacity:1,
  // A faint white pressure wake must ADD light instead of drawing a dark
  // translucent surface (NormalBlending was the cause of black trails).
  blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,
  fog:false,toneMapped:false,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geometry,material);
 mesh.name="World-space fading aerodynamic wake · two physical wingtips";
 mesh.renderOrder=4;mesh.frustumCulled=false;mesh.visible=false;
 scene.add(mesh);
 const left=new THREE.Vector3(),right=new THREE.Vector3();
 const localRight=new THREE.Vector3(1,0,0);
 const localUp=new THREE.Vector3(0,1,0);
 const tmpRight=new THREE.Vector3(),tmpUp=new THREE.Vector3();
 const driftA={x:0,y:0,z:0,nx:0,ny:0,nz:0};
 const driftB={x:0,y:0,z:0,nx:0,ny:0,nz:0};
 let peakSegments=0,peakRenderedEnergy=0,maxSpan=0;
 let currentEnergy=0,activeSegments=0,airbornePeak=0;
 let lastX=null;
 const low=Boolean(lowMemory);
 function transformed(){
  ship.updateMatrixWorld(true);
  left.set(tips[0].x,tips[0].y,tips[0].z).applyMatrix4(ship.matrixWorld);
  right.set(tips[1].x,tips[1].y,tips[1].z).applyMatrix4(ship.matrixWorld);
  tmpRight.copy(localRight).transformDirection(ship.matrixWorld);
  tmpUp.copy(localUp).transformDirection(ship.matrixWorld);
 }
 function draw(camera){
  xyz.fill(0);rgb.fill(0);
  activeSegments=0;currentEnergy=0;maxSpan=0;
  if(history.count<2){mesh.visible=false;return;}
  const now=history.time;
  // Older wake drifts away from its recorded tip and curls very slightly.
  // It never "snaps" to the craft's new heading or screen position.
  function deformed(p,out){
   const age=clamp(now-p.time,0,cfg.maxLifetimeSeconds);
   const drift=age*age*(.15+age*.32);
   const curl=Math.sin(now*3.1+p.time*9.3)*drift;
   out.x=p.x+p.rx*curl+p.ux*drift*.28;
   out.y=p.y+p.ry*curl+p.uy*drift*.28;
   out.z=p.z+p.rz*curl+p.uz*drift*.28;
   return out;
  }
  const limit=low?17:cfg.segmentsPerTip;
  for(let side=0;side<2;side++){
   let sumDist=0;
   for(let i=0;i<limit&&i<history.count-1;i++){
    const a=historyPoint(history,side,i);
    const b=historyPoint(history,side,i+1);
    if(!a.valid||!b.valid)break;
    const ageA=now-a.time,ageB=now-b.time;
    if(ageB>=cfg.maxLifetimeSeconds)break;
    const distance=Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
    if(distance>cfg.maxJumpMeters)break;
    sumDist+=distance;
    if(sumDist>cfg.maxTrailMeters)break;
    const v0=deformed(a,driftA),v1=deformed(b,driftB);
    const tx=v1.x-v0.x,ty=v1.y-v0.y,tz=v1.z-v0.z;
    // View-facing normal of the ribbon, so banked turns retain readability.
    const vx=camera.position.x-v0.x,vy=camera.position.y-v0.y,
     vz=camera.position.z-v0.z;
    let nx=ty*vz-tz*vy,ny=tz*vx-tx*vz,nz=tx*vy-ty*vx;
    const norm=Math.hypot(nx,ny,nz);
    if(norm<1e-5){nx=1;ny=0;nz=0}
    else{nx/=norm;ny/=norm;nz/=norm}
    driftA.nx=driftB.nx=nx;driftA.ny=driftB.ny=ny;
    driftA.nz=driftB.nz=nz;
    const fade=age=>Math.pow(1-clamp(age/cfg.maxLifetimeSeconds,0,1),1.7);
    const powerA=a.strength*fade(ageA);
    const powerB=b.strength*fade(ageB);
    currentEnergy=Math.max(currentEnergy,powerA,powerB);
    if(powerA+powerB<.006)continue;
    const swell=1+Math.min(ageA*1.1,.6);
    const quadIndex=(side*cfg.segmentsPerTip+i)*cfg.layers*18;
    const thickness=low?.065:.085;
    putTrianglePair(xyz,rgb,quadIndex,driftA,driftB,
     thickness*swell,thickness*(1+ageB*.9),
     powerA*.18,powerB*.18,true);
    putTrianglePair(xyz,rgb,quadIndex+18,driftA,driftB,
     .018*swell,.018*(1+ageB*.7),
     powerA*.40,powerB*.40,false);
    activeSegments++;
    maxSpan=Math.max(maxSpan,sumDist);
    peakRenderedEnergy=Math.max(peakRenderedEnergy,powerA*.40,powerB*.40);
   }
  }
  mesh.visible=activeSegments>0;
  if(mesh.visible){
   position.needsUpdate=true;color.needsUpdate=true;
   peakSegments=Math.max(peakSegments,activeSegments);
  }
 }
 return {
  mesh,history,
  frame(dt,{playing=false,speed=44,steering=0,yawRate=0,gripIntensity=0,
   boostMultiplier=1,grounded=true,camera:cameraIn=null}={}){
   if(!playing){resetWakeHistory(history);mesh.visible=false;return;}
   const h=clamp(finite(dt),0,.085);
   if(h<=0)return;
   history.time+=h;history.accum+=h;
   const output=wakeEnergy({speed,steering,yawRate,gripIntensity,
    boostMultiplier,grounded});
   if(output.air)airbornePeak=Math.max(airbornePeak,output.strength);
   transformed();
   if(history.accum>=cfg.sampleIntervalSeconds){
    // Emit at most once per render step. Crucially, history records actual
    // wingtip WORLD POSITIONS and remains immutable after the ship moves.
    history.accum%=cfg.sampleIntervalSeconds;
    recordWake(history,left,right,tmpRight,tmpUp,output.strength);
    if(lastX!==null&&Math.abs(left.x-lastX)>cfg.maxJumpMeters)
     lastX=null;
    lastX=left.x;
   }
   if(cameraIn)draw(cameraIn);
  },
  reset(){
   resetWakeHistory(history);mesh.visible=false;
   peakSegments=0;peakRenderedEnergy=0;maxSpan=0;
   currentEnergy=0;activeSegments=0;airbornePeak=0;lastX=null;
  },
  stats(){
   const newest=historyPoint(history,0,0);
   const oldest=historyPoint(history,0,Math.max(0,history.count-1));
   const gap=newest&&oldest?Math.hypot(
    newest.x-oldest.x,newest.y-oldest.y,newest.z-oldest.z):0;
   return {version:cfg.version,model:variant,lowMemory:low,
    worldAnchored:true,visible:mesh.visible,
    additiveLightOnly:material.blending===THREE.AdditiveBlending,
    materialFogDisabled:material.fog===false,
    colorRgbaItemSize:color.itemSize,
    activeSegments,peakSegments,
    currentEnergy:+currentEnergy.toFixed(3),
    peakLightEnergy:+peakRenderedEnergy.toFixed(3),
    sampleCount:history.count,totalSamples:history.emits,
    historicalSpanMeters:+gap.toFixed(2),
    peakRibbonSpanMeters:+maxSpan.toFixed(2),
    accumulatedMotionMeters:+history.motionMeters.toFixed(2),
    discontinuities:history.discontinuities,
    peakAirborneStrength:+airbornePeak.toFixed(3),
    maxLifetimeSeconds:cfg.maxLifetimeSeconds,
    tipXMeters:+tips[1].x.toFixed(2),
    extraDrawCalls:1,physicsUnchanged:true};
  },
  dispose(){mesh.removeFromParent();geometry.dispose();material.dispose();}
 };
}
