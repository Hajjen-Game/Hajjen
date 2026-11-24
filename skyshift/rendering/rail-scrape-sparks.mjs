// SKYSHIFT 0.10.9.1 — Spark Visibility Polish.
// Bright physical contact flashes + intermittent white-gold metallic flecks.
// Spawn ONLY on genuine guardrail collisions. World-space ballistic history,
// not ship-attached static ribbons. One allocated 3D draw batch, no lights,
// no sound, no control/collision/damage edits.
// Contact coordinates supplied by the bound track sampler.
import {speedPresenceAt} from "../velocity-presence-v0104.mjs";

export const RAIL_SPARKS=Object.freeze({
 version:"rail-scrape-sparks-visibility-01091",
 cap:104,lowMemoryCap:52,
 minLifeSeconds:.16,maxLifeSeconds:.47,
 particleLayers:2,verticesPerParticle:12,
 flashVertices:12,flashLifetimeSeconds:.135,
 minVisibleCoreWidthMeters:.044,contactFlare:true,
 maxAddedDrawCalls:1,addedLights:0,addedPostPasses:0,
 depthTest:true,worldSpace:true,physicsChanged:false,
 colliderChanged:false,shieldChanged:false
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const safe=(x,f=0)=>Number.isFinite(x)?x:f;
const ONE_OVER_MAX=1/RAIL_SPARKS.maxLifeSeconds;
const norm=(x,y,z)=>{
 const d=Math.hypot(x,y,z)||1;
 return {x:x/d,y:y/d,z:z/d};
};
// Use the actual raised, banked guardrail face, not a guessed point on the
// engine. Its front is width/2 - .56m; the contact is inside that face.
export function createRailContactSampler({positionAt,poseAt,widthAt,surfaceNormalAt}){
 return function railContactPoint(s,side){
 const direction=Math.sign(side);
 if(!direction) return null;
 const p=poseAt(s),normal=surfaceNormalAt(s);
 const source=positionAt(s,direction*(widthAt(s)*.5-.69),.68);
 return {
  x:source.x,y:source.y,z:source.z,side:direction,
  backwardX:-p.forwardX,backwardY:0,backwardZ:-p.forwardZ,
  inwardX:-direction*p.rightX,inwardY:0,inwardZ:-direction*p.rightZ,
  upX:normal.x,upY:normal.y,upZ:normal.z
 };
 };
}
export function sparkDemand({contacting=false,side=0,grounded=true,
 speed=44,scrubIntensity=0,started=false}={}){
 const valid=contacting&&Math.abs(side)===1&&grounded!==false;
 const speedPressure=speedPresenceAt(safe(speed,44));
 const scrape=clamp(safe(scrubIntensity),0,1);
 if(!valid)return {active:false,rate:0,burst:0,pressure:0};
 // A gentle graze is a few sparks; heavy fast scraping makes more energetic,
 // uneven bursts. Deliberately avoids continuous neon-light strips.
 const pressure=clamp(.19+.53*speedPressure+.28*scrape,0,1);
 return {
  active:true,pressure,
  rate:14+speedPressure*26+scrape*17,
  burst:started?Math.round(5+speedPressure*6+scrape*7):0
 };
}
function makeParticle(){
 return {active:false,x:0,y:0,z:0,
  px:0,py:0,pz:0,vx:0,vy:0,vz:0,
  age:0,life:.3,width:.025,tail:.22,
  energy:0,warmth:0};
}
export function createSparkState(lowMemory=false){
 const cap=lowMemory?RAIL_SPARKS.lowMemoryCap:RAIL_SPARKS.cap;
 return {
  particles:Array.from({length:cap},makeParticle),
  cap,head:0,time:0,accumulator:0,seed:135791357,
  contactWasActive:false,lastSide:0,lastSerial:-1,
  emitted:0,bursts:0,contactFrames:0,contactSeconds:0,
  peakVisible:0,peakPressure:0,live:0,
  recentSource:null,travelFrames:0,createdOnWall:0,
  flash:{active:false,x:0,y:0,z:0,age:0,life:RAIL_SPARKS.flashLifetimeSeconds,
   pressure:0},impactFlashes:0,peakFlashOpacity:0,peakParticleWidth:0
 };
}
export function resetSparkState(st){
 for(const p of st.particles)p.active=false;
 st.head=0;st.time=0;st.accumulator=0;st.seed=135791357;
 st.contactWasActive=false;st.lastSide=0;st.lastSerial=-1;
 st.emitted=0;st.bursts=0;st.contactFrames=0;st.contactSeconds=0;
 st.peakVisible=0;st.peakPressure=0;st.live=0;
 st.recentSource=null;st.travelFrames=0;st.createdOnWall=0;
 st.flash.active=false;st.flash.age=0;
 st.impactFlashes=0;st.peakFlashOpacity=0;st.peakParticleWidth=0;
 return st;
}
// Deterministic PRNG, zero per-particle heap allocations during gameplay.
function random(st){
 st.seed=(Math.imul(st.seed,1664525)+1013904223)>>>0;
 return st.seed/4294967296;
}
function emit(st,source,pressure,impact){
 const p=st.particles[st.head];
 st.head=(st.head+1)%st.cap;
 const v=random(st),j=random(st),k=random(st),l=random(st),m=random(st);
 const speed=7+pressure*12+j*7;
 p.active=true;p.age=0;
 p.life=clamp(.21+v*.19+pressure*.06,RAIL_SPARKS.minLifeSeconds,
  RAIL_SPARKS.maxLifeSeconds);
 p.x=source.x+(v-.5)*.18;p.y=source.y+(j-.5)*.14;
 p.z=source.z+(k-.5)*.19;
 p.px=p.x;p.py=p.y;p.pz=p.z;
 const backwards=speed*(.65+.5*k);
 const inward=(1.4+pressure*3.3)*(m*.95+.30);
 const loft=1.2+pressure*3.3+l*3.4;
 p.vx=source.backwardX*backwards+source.inwardX*inward+
  source.upX*loft+(v-.5)*2.3;
 p.vy=source.upY*loft+(j-.45)*2.0;
 p.vz=source.backwardZ*backwards+source.inwardZ*inward+
  source.upZ*loft+(l-.5)*2.5;
 // At chase-camera distance the 0.10.9 core was sub-pixel: 1.6–3.8 cm
 // total width with a 36% core. These are readable white micro-sparks now.
 p.width=.048+.042*m+(impact?.016:0);
 p.tail=.34+pressure*.43+.44*l+(impact?.19:0);
 p.energy=clamp(.58+.42*pressure+(impact?.08:0),0,1.05);
 st.peakParticleWidth=Math.max(st.peakParticleWidth,p.width);
 p.warmth=.12+.66*k;
 st.emitted++;st.createdOnWall++;
}
// Expire the old particles naturally, with drag and very gentle gravity;
// each retains its own world coordinates after the source ship moves away.
export function advanceSparkState(st,dt,input={},source=null){
 const h=clamp(safe(dt),0,.09);
 if(!h)return st;
 st.time+=h;
 const side=Math.sign(input.side||0);
 const active=Boolean(source)&&sparkDemand(input).active;
 const started=active&&(!st.contactWasActive||
  st.lastSide!==side||
  (Number.isInteger(input.contactSerial)&&input.contactSerial>st.lastSerial));
 const demand=sparkDemand({...input,started});
 if(active){
  st.contactFrames++;st.contactSeconds+=h;
  st.peakPressure=Math.max(st.peakPressure,demand.pressure);
  // Only the impact has a punch; a sustained rail scrape varies and never
  // becomes a metronomic white line.
  if(started){
   st.bursts++;st.accumulator=0;
   // True physical contact flash (not an added light or screen overlay).
   // Its white core and short amber halo travel with NEITHER ship nor rail.
   st.flash.active=true;st.flash.age=0;
   st.flash.x=source.x;st.flash.y=source.y;st.flash.z=source.z;
   st.flash.pressure=demand.pressure;
   st.impactFlashes++;
  }
  const chirp=.70+.30*Math.sin(st.time*29+st.seed*.0000003);
  st.accumulator+=h*demand.rate*chirp;
  const follow=Math.min(5,Math.floor(st.accumulator));
  st.accumulator-=follow;
  const burst=started?demand.burst:0;
  for(let n=0;n<Math.min(20,burst+follow);n++)
   emit(st,source,demand.pressure,started&&n<burst);
  st.recentSource={x:source.x,y:source.y,z:source.z,side};
 }else{
  st.accumulator=0;
 }
 if(st.flash.active){
  // Preserve at least one FULL-BRIGHT visible hit frame on slower phones.
  // A 90ms first frame should not consume almost all of a 135ms flash.
  st.flash.age+=started?Math.min(h,.016):h;
  if(st.flash.age>=st.flash.life)st.flash.active=false;
 }
 st.lastSide=active?side:0;
 st.contactWasActive=active;
 if(Number.isInteger(input.contactSerial))st.lastSerial=input.contactSerial;
 let live=0,moving=false;
 for(const p of st.particles){
  if(!p.active)continue;
  p.age+=h;
  if(p.age>=p.life){p.active=false;continue;}
  const decay=Math.exp(-h*2.2);
  p.vx*=decay;p.vy=p.vy*decay-6.5*h;p.vz*=decay;
  p.px=p.x;p.py=p.y;p.pz=p.z;
  p.x+=p.vx*h;p.y+=p.vy*h;p.z+=p.vz*h;
  if(Math.hypot(p.x-p.px,p.y-p.py,p.z-p.pz)>.012)moving=true;
  live++;
 }
 if(moving)st.travelFrames++;
 st.live=live;st.peakVisible=Math.max(st.peakVisible,live);
 return st;
}
function sparkQuad(position,color,offset,p,core,camera){
 const old=clamp(p.age/p.life,0,1);
 const decay=Math.pow(1-old,1.45);
 const vel=Math.hypot(p.vx,p.vy,p.vz)||1;
 const dx=p.vx/vel,dy=p.vy/vel,dz=p.vz/vel;
 const eyeX=camera.position.x-p.x,
  eyeY=camera.position.y-p.y,
  eyeZ=camera.position.z-p.z;
 let nx=dy*eyeZ-dz*eyeY,ny=dz*eyeX-dx*eyeZ,
  nz=dx*eyeY-dy*eyeX;
 const n=Math.hypot(nx,ny,nz)||1;nx/=n;ny/=n;nz/=n;
 const length=p.tail*(core?.85:1.15)*(1+.2*old);
 const width=p.width*(core?.75:1.50)*(1+.25*old);
 const light=decay*p.energy*(core?1.17:.40);
 const base=offset/3*4;
 for(let v=0;v<6;v++){
  const far=v===2||v===4||v===5;
  const right=v===1||v===2||v===4;
  const d=far?-length:0;
  const w=right?width:-width;
  const i=offset+3*v,c=base+v*4;
  position[i]=p.x+dx*d+nx*w;
  position[i+1]=p.y+dy*d+ny*w;
  position[i+2]=p.z+dz*d+nz*w;
  // First layer: faint warm metallic amber; core: white gold.
  color[c]=1;
  color[c+1]=core?.99:.67+.10*(1-p.warmth);
  color[c+2]=core?.94:.27+.10*(1-p.warmth);
  color[c+3]=clamp(light*(far?.68:1),0,.99);
 }
}
// Two camera-facing, softly fading quads form a short, readable wall-hit
// flash. Both live in the SAME draw batch as the flying flecks.
function impactFlashQuad(pos,col,offset,flash,camera,core){
 const eyeX=camera.position.x-flash.x,
  eyeY=camera.position.y-flash.y,eyeZ=camera.position.z-flash.z;
 const horizontal=Math.hypot(eyeX,eyeZ)||1;
 const rx=eyeZ/horizontal,ry=0,rz=-eyeX/horizontal;
 const distance=Math.hypot(eyeX,eyeY,eyeZ)||1;
 const vx=eyeX/distance,vy=eyeY/distance,vz=eyeZ/distance;
 const ux=vy*rz,uy=vz*rx-vx*rz,uz=-vy*rx;
 const age=clamp(flash.age/flash.life,0,1);
 const fade=Math.pow(1-age,1.35);
 const energy=fade*(core?.91:.30)*(.76+.24*flash.pressure);
 const w=core?.19+.055*flash.pressure:.38+.18*flash.pressure;
 const h=core?.088:.20;
 const colorOffset=offset/3*4;
 for(let i=0;i<6;i++){
  const right=i===1||i===2||i===4;
  const upper=i===2||i===4||i===5;
  const a=(right?1:-1)*w,b=(upper?1:-1)*h;
  const p=offset+i*3,c=colorOffset+i*4;
  pos[p]=flash.x+a*rx+b*ux;
  pos[p+1]=flash.y+a*ry+b*uy;
  pos[p+2]=flash.z+a*rz+b*uz;
  col[c]=1;col[c+1]=core?1:.81;
  col[c+2]=core?.97:.50;
  col[c+3]=energy;
 }
}
export function createRailScrapeSparks(THREE,scene,{lowMemory=false}={}){
 const st=createSparkState(lowMemory),layers=RAIL_SPARKS.particleLayers;
 const vertices=st.cap*RAIL_SPARKS.verticesPerParticle+
  RAIL_SPARKS.flashVertices;
 const xyz=new Float32Array(vertices*3),rgba=new Float32Array(vertices*4);
 const geo=new THREE.BufferGeometry();
 const position=new THREE.BufferAttribute(xyz,3).setUsage(THREE.DynamicDrawUsage);
 const color=new THREE.BufferAttribute(rgba,4).setUsage(THREE.DynamicDrawUsage);
 geo.setAttribute("position",position);geo.setAttribute("color",color);
 geo.setDrawRange(0,0);
 const material=new THREE.MeshBasicMaterial({
  color:0xffffff,vertexColors:true,transparent:true,opacity:1,
  blending:THREE.AdditiveBlending,depthTest:true,depthWrite:false,
  toneMapped:false,fog:false,side:THREE.DoubleSide
 });
 const mesh=new THREE.Mesh(geo,material);
 mesh.name="World-space rail scrape · white-gold contact sparks";
 mesh.renderOrder=5;mesh.frustumCulled=false;mesh.visible=false;
 scene.add(mesh);
 let lastRendered=0,peakWorldPath=0;
 function frame(dt,{playing=false,camera=null,railContact=null,
  ...input}={}){
  if(!playing){mesh.visible=false;resetSparkState(st);
   geo.setDrawRange(0,0);return;}
  advanceSparkState(st,dt,input,railContact);
  if(!camera||(!st.live&&!st.flash.active)){
   mesh.visible=false;geo.setDrawRange(0,0);return;
  }
  let write=0;
  for(const p of st.particles){
   if(!p.active)continue;
   sparkQuad(xyz,rgba,write,p,false,camera);
   sparkQuad(xyz,rgba,write+18,p,true,camera);
   write+=RAIL_SPARKS.verticesPerParticle*3;
   peakWorldPath=Math.max(peakWorldPath,
    Math.hypot(p.x-(st.recentSource?.x??p.x),
     p.y-(st.recentSource?.y??p.y),p.z-(st.recentSource?.z??p.z)));
  }
  if(st.flash.active){
   impactFlashQuad(xyz,rgba,write,st.flash,camera,false);
   impactFlashQuad(xyz,rgba,write+18,st.flash,camera,true);
   const t=st.flash.age/st.flash.life;
   st.peakFlashOpacity=Math.max(st.peakFlashOpacity,
    Math.pow(1-clamp(t,0,1),1.35)*(.76+.24*st.flash.pressure)*.91);
   write+=RAIL_SPARKS.flashVertices*3;
  }
  geo.setDrawRange(0,write/3);
  position.needsUpdate=true;color.needsUpdate=true;
  lastRendered=write/3;
  mesh.visible=lastRendered>0;
 }
 return {
  mesh,state:st,frame,
  reset(){resetSparkState(st);mesh.visible=false;lastRendered=0;
   peakWorldPath=0;geo.setDrawRange(0,0);},
  stats(){
   return {version:RAIL_SPARKS.version,worldSpace:true,
    lowMemory:Boolean(lowMemory),visible:mesh.visible,
    activeSparks:st.live,peakSparks:st.peakVisible,
    emitted:st.emitted,impactBursts:st.bursts,
    impactFlashes:st.impactFlashes,flashVisible:st.flash.active,
    peakFlashOpacity:+st.peakFlashOpacity.toFixed(3),
    peakParticleWidthMeters:+st.peakParticleWidth.toFixed(3),
    sparkCoreWhite:true,
    contactFrames:st.contactFrames,
    contactSeconds:+st.contactSeconds.toFixed(2),
    peakPressure:+st.peakPressure.toFixed(3),
    lastSide:st.recentSource?.side??0,
    lastContact:st.recentSource,
    lastDrawVertices:lastRendered,
    travelFrames:st.travelFrames,
    peakTravelFromContact:+peakWorldPath.toFixed(2),
    addedDrawCalls:1,rgbaColorAttribute:color.itemSize,
    additiveLightOnly:material.blending===THREE.AdditiveBlending,
    noExtraLights:true,physicsUnchanged:true};
  },
  dispose(){mesh.removeFromParent();geo.dispose();material.dispose();}
 };
}
