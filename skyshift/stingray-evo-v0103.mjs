// SKYSHIFT 0.10.3 — Stingray EVO: Premium Craft & Living Tail.
// Procedural futuristic manta hull with a nine-link visible articulated tail.
// Independent second-order pose springs produce genuine travel-time and
// after-swing; only visual mesh rotations and emissive accents are changed.
// The pilot physics, collisions, camera input, engine sockets and scoring do
// not depend on these animation values.
import {buildMantaBlade,triangulateWing,ENGINE_SOCKETS}
 from "./ships/manta-blade-v0484.mjs";
import {buildShipPolish} from "./ships/ship-polish-v0103.mjs";
export const STINGRAY_EVO=Object.freeze({
 id:"stingray",name:"Stingray EVO",version:"stingray-premium-living-tail-0103",
 body:"futuristic manta with beveled shoulder wings",
 articulatedTail:true,segmentCount:9,tailSegmentMeters:.68,
 tailLengthMeters:9*.68,twinEngines:2,
 engineSocketsUnchanged:true,physicsChanged:false,
 newDynamicLights:0,newParticles:0,
 additionalTailDrawCalls:20,sharedSurfaceDrawCalls:4,
 neutralTailActive:true,unchangedFlightPhysics:true,
 maxYawJointRadians:.102,maxPitchJointRadians:.062,
 dampingRatio:.67
});
export const STINGRAY_WING=Object.freeze([
 [.49,-2.25],[.82,-2.36],[1.22,-2.17],[1.77,-1.92],
 [2.38,-1.52],[2.85,-.98],[3.13,-.52],[3.20,-.15],
 [3.04,.17],[2.76,.55],[2.47,.98],[2.05,1.83],
 [1.69,2.58],[1.49,2.32],[1.20,1.33],
 [.87,.71],[.48,.40]
].map(x=>Object.freeze(x)));
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const safe=(x,f=0)=>Number.isFinite(x)?x:f;
const abs=Math.abs;
function createWingGeometry(THREE){
 const vertices=[],indices=[],n=STINGRAY_WING.length;
 for(const sign of [-1,1]){
  const base=vertices.length/3;
  const path=STINGRAY_WING.map(([x,z])=>[sign*x,z]);
  const {triangles,orientation}=triangulateWing(path);
  for(const bottom of [false,true]){
   for(const [x,z] of path){
    const dome=.085*(1-clamp(abs(x)/3.2,0,1));
    vertices.push(x,(bottom?.080:.245)+dome,z);
   }
  }
  for(const [a,b,c] of triangles){
   if(orientation>0)indices.push(base+a,base+c,base+b,
    base+n+a,base+n+b,base+n+c);
   else indices.push(base+a,base+b,base+c,
    base+n+a,base+n+c,base+n+b);
  }
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   indices.push(base+i,base+j,base+n+j,
    base+i,base+n+j,base+n+i);
  }
 }
 const mesh=new THREE.BufferGeometry();
 mesh.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
 mesh.setIndex(indices);mesh.computeVertexNormals();mesh.computeBoundingSphere();
 return mesh;
}
// Analytic under-damped spring for a CONSTANT target over one timestep.
// This is frame-rate independent at 30/60/120Hz, unlike naive fixed lerp.
// Damping below 1 permits one short weighted settling motion after steering.
function spring(pos,vel,index,target,omega,dt,zeta=.67){
 const d=pos[index]-target,v=vel[index];
 const a=zeta*omega,wd=omega*Math.sqrt(1-zeta*zeta);
 const A=d,B=(v+a*d)/wd,e=Math.exp(-a*dt);
 const cosine=Math.cos(wd*dt),sine=Math.sin(wd*dt);
 const shape=A*cosine+B*sine;
 pos[index]=target+e*shape;
 vel[index]=e*((-a)*shape+
  (-A*wd*sine+B*wd*cosine));
}
export function createTailState(){
 const n=STINGRAY_EVO.segmentCount;
 return {yaw:new Float64Array(n),pitch:new Float64Array(n),
  yawVelocity:new Float64Array(n),pitchVelocity:new Float64Array(n),
  time:0,drive:0,previousGrounded:null,peakJointDegrees:0,
  peakTipDeflectionDegrees:0,peakGrip:0,peakVelocity:0,
  peakRibbonEnergy:0,launches:0,landings:0,updates:0,
  ribbonEnergy:0,peakIdleTipMeters:0,neutralSamples:0,tipX:0};
}
export function resetTailState(st){
 for(const field of ["yaw","pitch","yawVelocity","pitchVelocity"])
  st[field].fill(0);
 for(const key of ["time","drive","peakJointDegrees","peakTipDeflectionDegrees",
   "peakGrip","peakVelocity","peakRibbonEnergy","launches","landings",
   "updates","ribbonEnergy","peakIdleTipMeters","neutralSamples","tipX"])st[key]=0;
 st.previousGrounded=null;
 return st;
}
export function tailPoseStep(st,dt,view={}){
 const h=clamp(safe(dt),0,.075);
 if(!h)return st;
 const steer=clamp(safe(view.steering),-1,1);
 const yawRate=clamp(safe(view.yawRate)/1.24,-1,1);
 const grip=clamp(safe(view.gripIntensity),0,1);
 const boost=clamp((safe(view.boostMultiplier,1)-1)/.40,0,1);
 const speed=clamp((safe(view.speed,44)-44)/110,0,1);
 const ground=view.grounded!==false;
 const drive=clamp(steer*.66+yawRate*.34,-1,1);
 // Strong acceleration of the tail when the pilot changes direction.
 // Bend is still tied to real input rather than artificially steering ship.
 const steeringChange=clamp(drive-st.drive,-1.5,1.5);
 st.drive+=steeringChange*(1-Math.exp(-h*9.5));
 const sudden=clamp(drive-st.drive,-.9,.9);
 st.time+=h;
 if(st.previousGrounded!==null&&st.previousGrounded!==ground){
  const landed=ground;
  if(landed)st.landings++;else st.launches++;
  for(let i=0;i<STINGRAY_EVO.segmentCount;i++){
   const progress=i/(STINGRAY_EVO.segmentCount-1);
   st.pitchVelocity[i]+=(landed?.19:-.12)*
    (1-.6*progress);
  }
 }
 st.previousGrounded=ground;
 let sumYaw=0,energy=0;
 for(let i=0;i<STINGRAY_EVO.segmentCount;i++){
  const progress=i/(STINGRAY_EVO.segmentCount-1);
  // The local +Z tail must curve TOWARD the piloted turn (same input sign).
  // Spring inertia creates a brief trailing lag without sustained countersteer.
  const driveTarget=drive*(.020+.017*progress+
   grip*(.028+.026*progress))*(1-.52*boost);
  const transient=sudden*(.018+.018*progress);
  // Travel-wave motion remains alive at neutral input: delayed along the
  // link chain and speed-dependent, but deliberately smaller than GRIP.
  const idleAmplitude=(.0082+.0095*speed+
   (ground?0:.0024))*(.32+.68*progress)*(1-.42*boost);
  const airflow=idleAmplitude*
    Math.sin(st.time*(2.6+.82*speed)-progress*1.72)
   +(.0019+.0025*speed)*progress*(1-.42*boost)*
    Math.sin(st.time*(4.2+.60*speed)-progress*2.5);
  const yawTarget=clamp(driveTarget+transient+airflow,
   -STINGRAY_EVO.maxYawJointRadians,STINGRAY_EVO.maxYawJointRadians);
  // Outer sections keep a brief natural after-swing when input is released.
  const yawOmega=15.5-7.5*progress;
  spring(st.yaw,st.yawVelocity,i,yawTarget,yawOmega,h);
  // Launch/landing ripple and boost tension affect vertical tail attitude.
  const ripple=(ground?.0055+.0050*speed:.014)*
   Math.sin(st.time*(3.55+speed*.9)-progress*1.9);
  const pitchTarget=clamp(ripple+
    (ground?-.006*grip*abs(steer):.017)+boost*.010,
    -STINGRAY_EVO.maxPitchJointRadians,
    STINGRAY_EVO.maxPitchJointRadians);
  spring(st.pitch,st.pitchVelocity,i,pitchTarget,
    12.4-5.2*progress,h,.70);
  st.yaw[i]=clamp(st.yaw[i],-STINGRAY_EVO.maxYawJointRadians,
   STINGRAY_EVO.maxYawJointRadians);
  st.pitch[i]=clamp(st.pitch[i],-STINGRAY_EVO.maxPitchJointRadians,
   STINGRAY_EVO.maxPitchJointRadians);
  st.peakJointDegrees=Math.max(st.peakJointDegrees,abs(st.yaw[i])*180/Math.PI);
  st.peakVelocity=Math.max(st.peakVelocity,abs(st.yawVelocity[i]));
  sumYaw+=st.yaw[i];
  energy=Math.max(energy,abs(st.yawVelocity[i]));
 }
 // Track true displayed tip displacement across all nine local joints.
 // This is diagnostic only; vehicle simulation never consumes it.
 let heading=0,tipX=0;
 for(let i=0;i<STINGRAY_EVO.segmentCount;i++){
  heading+=st.yaw[i];
  tipX+=Math.sin(heading)*STINGRAY_EVO.tailSegmentMeters;
 }
 st.tipX=tipX;
 if(abs(steer)<.055&&abs(yawRate)<.055&&grip<.055){
  st.neutralSamples++;
  st.peakIdleTipMeters=Math.max(st.peakIdleTipMeters,abs(tipX));
 }
 st.peakTipDeflectionDegrees=Math.max(st.peakTipDeflectionDegrees,
  abs(sumYaw)*180/Math.PI);
 st.ribbonEnergy=clamp(.26+grip*.36+boost*.35+
  speed*.08+energy*.68,0,1);
 st.peakRibbonEnergy=Math.max(st.peakRibbonEnergy,st.ribbonEnergy);
 st.peakGrip=Math.max(st.peakGrip,grip);
 st.updates++;
 return st;
}
// Faceted prism: visibly separate metallic plates, not a round black cable.
function segmentGeometry(THREE,root,tip,length){
 const front=[
  [-root,0],[-root*.88,.17],[0,.24],[root*.88,.17],
  [root,0],[root*.78,-.09],[0,-.14],[-root*.78,-.09]
 ],back=front.map(([x,y])=>[x*tip/root,y*tip/root]);
 const vertices=[];
 for(const z of [0,length])
  for(const [x,y] of (z===0?front:back))vertices.push(x,y,z);
 const indices=[];
 for(let k=1;k<7;k++)indices.push(0,k,k+1,8,8+k+1,8+k);
 for(let k=0;k<8;k++){
  const n=(k+1)%8;
  indices.push(k,n,8+n,k,8+n,8+k);
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
 return g;
}
export function buildStingrayEvo(THREE,shipGlow){
 const craft=buildMantaBlade(THREE,shipGlow);
 craft.ship.name="Stingray EVO · articulated mechanical manta";
 const wings=craft.ship.getObjectByName("Two broad scalloped manta wings");
 if(!wings)throw Error("Stingray wing base missing");
 wings.geometry.dispose();wings.geometry=createWingGeometry(THREE);
 wings.name="Stingray EVO · wide manta wings";
 craft.materials.titanium.color.setHex(0x727b9d);
 craft.materials.wings.color.setHex(0x7c89b4);
 craft.materials.graphite.color.setHex(0x111729);
 craft.materials.glass.color.setHex(0x0d1732);
 craft.materials.turbine.color.setHex(0x101426);
 const neon=new THREE.MeshBasicMaterial({
  color:0xe08bff,transparent:true,opacity:.70,
  depthWrite:false,side:THREE.DoubleSide,toneMapped:false
 });
 const armor=new THREE.MeshPhysicalMaterial({
  color:0x667395,metalness:.70,roughness:.31,
  flatShading:true,side:THREE.DoubleSide
 });
 const finish=buildShipPolish(THREE,craft.ship,{
  variant:"stingray",engineSockets:ENGINE_SOCKETS
 });
 const joints=[],lights=[],length=STINGRAY_EVO.tailSegmentMeters;
 let parent=craft.ship;
 for(let i=0;i<STINGRAY_EVO.segmentCount;i++){
  const progress=i/(STINGRAY_EVO.segmentCount-1);
  const root=.32-progress*.205,tip=Math.max(.082,root-.023);
  const joint=new THREE.Group();
  joint.name="Stingray kinetic joint "+String(i+1).padStart(2,"0");
  joint.position.set(0,i===0?.10:0,i===0?1.18:length+.032);
  parent.add(joint);
  const plate=new THREE.Mesh(segmentGeometry(THREE,root,tip,length),armor);
  plate.name="Stingray faceted armor plate "+(i+1);
  joint.add(plate);
  // A slim split dorsal emitter gives the nine parts visible continuity
  // in the dark tunnel without new lights, bloom passes or textures.
  const strip=new THREE.Mesh(
   new THREE.BoxGeometry(Math.max(.036,root*.23),.025,length*.66),neon);
  strip.position.set(0,.20-progress*.09,length*.49);
  strip.name="Stingray segmented neon guide "+(i+1);
  joint.add(strip);
  joints.push(joint);lights.push(strip);
  parent=joint;
 }
 const state=createTailState();
 function frame(dt,view){
  tailPoseStep(state,dt,view);
  for(let i=0;i<joints.length;i++){
   joints[i].rotation.y=state.yaw[i];
   joints[i].rotation.x=state.pitch[i];
  }
  neon.opacity=.52+.39*state.ribbonEnergy;
 }
 function reset(){
  resetTailState(state);
  finish.reset();
  for(const joint of joints)joint.rotation.set(0,0,0);
  neon.opacity=.60;
 }
 return {...craft,spec:STINGRAY_EVO,tail:state,
  frameTail:frame,resetTail:reset,
  framePolish:finish.frame,resetPolish:finish.reset,
  polishStats:finish.stats,polishSurfaces:finish.surfaces,
  tailStats:()=>({
   version:STINGRAY_EVO.version,segmentCount:joints.length,
   peakJointDegrees:+state.peakJointDegrees.toFixed(2),
   peakTipDeflectionDegrees:+state.peakTipDeflectionDegrees.toFixed(2),
   peakGrip:+state.peakGrip.toFixed(3),
   peakRibbonEnergy:+state.peakRibbonEnergy.toFixed(3),
   peakIdleTipMeters:+state.peakIdleTipMeters.toFixed(3),
   liveTailTipXMeters:+state.tipX.toFixed(3),
   neutralSamples:state.neutralSamples,
   launches:state.launches,landings:state.landings,
   updates:state.updates,physicsUnchanged:true}),
  engineSockets:ENGINE_SOCKETS,
  materials:{...craft.materials,tailArmor:armor,tailNeon:neon}};
}
