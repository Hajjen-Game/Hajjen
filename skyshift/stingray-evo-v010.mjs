// SKYSHIFT 0.10.0 — STINGRAY EVO. Fully procedural Three.js manta-inspired
// craft, same collision/engine socket layout as Manta Blade, nine physical
// articulating-looking tail joints driven only by pilot-owned visual inputs.
// No textures, new lights, skin physics, network assets or physics changes.
import {buildMantaBlade,triangulateWing,ENGINE_SOCKETS}
 from "./manta-blade-v0484.mjs";
export const STINGRAY_EVO=Object.freeze({
 id:"stingray",name:"Stingray EVO",version:"stingray-evo-010",
 body:"wide tapered manta wings",articulatedTail:true,
 segmentCount:9,tailSegmentMeters:.61,tailLengthMeters:9*.61,
 twinEngines:2,engineSocketsUnchanged:true,physicsChanged:false,
 newDynamicLights:0,newParticles:0,
 additionalTailDrawCalls:18,
 gripMaxJointRadians:.053
});
export const STINGRAY_WING=Object.freeze([
 [.49,-2.24],[.82,-2.30],[1.21,-2.18],[1.75,-1.90],
 [2.31,-1.51],[2.79,-.99],[3.08,-.54],[3.13,-.18],
 [3.00,.14],[2.73,.48],[2.48,.94],[2.04,1.83],
 [1.67,2.59],[1.48,2.29],[1.20,1.31],
 [.88,.71],[.46,.38]
].map(p=>Object.freeze(p)));
function wingGeometry(THREE){
 const positions=[],indices=[],n=STINGRAY_WING.length;
 for(const sign of [-1,1]){
  const base=positions.length/3;
  const outline=STINGRAY_WING.map(([x,z])=>[sign*x,z]);
  const {triangles,orientation}=triangulateWing(outline);
  for(const lower of [false,true])
   for(const [x,z] of outline){
    const arch=.095*(1-Math.min(1,Math.abs(x)/3.2));
    positions.push(x,(lower?.085:.242)+arch,z);
   }
  for(const [a,b,c] of triangles){
   if(orientation>0)indices.push(base+a,base+c,base+b,
    base+n+a,base+n+b,base+n+c);
   else indices.push(base+a,base+b,base+c,
    base+n+a,base+n+c,base+n+b);
  }
  for(let j=0;j<n;j++){
   const k=(j+1)%n;
   indices.push(base+j,base+k,base+n+k,
    base+j,base+n+k,base+n+j);
  }
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();
 return g;
}
export function tailPoseStep(state,dt,view={}){
 const step=Math.max(0,Math.min(.075,Number.isFinite(dt)?dt:0));
 if(!step)return state;
 const safe=(n,zero=0)=>Number.isFinite(n)?n:zero;
 const steer=Math.max(-1,Math.min(1,safe(view.steering)));
 const yaw=Math.max(-1,Math.min(1,safe(view.yawRate)/1.24));
 const grip=Math.max(0,Math.min(1,safe(view.gripIntensity)));
 const boost=Math.max(0,Math.min(1,(safe(view.boostMultiplier,1)-1)/.40));
 const aerial=view.grounded===false;
 const drive=.77*steer+.23*yaw;
 state.time+=step;
 const straighten=1-boost*.57;
 for(let i=0;i<STINGRAY_EVO.segmentCount;i++){
  const progress=i/(STINGRAY_EVO.segmentCount-1);
  // The tail counter-steers (inertia), with the outer links responding
  // more slowly. Controlled stiffness prevents a chaotic whip at top speed.
  const bend=(-drive*(.012+.008*progress+grip*(.020+.013*progress)))
    *straighten;
  const airWobble=aerial?.013*Math.sin(state.time*7.6-i*.66):0;
  const target=Math.max(-STINGRAY_EVO.gripMaxJointRadians,
   Math.min(STINGRAY_EVO.gripMaxJointRadians,bend+airWobble));
  const response=(i<2?16:13)/(1+i*.14);
  state.yaw[i]+=(target-state.yaw[i])*(1-Math.exp(-response*step));
  const pitch=(aerial?.018*Math.sin(state.time*8-i*.9):
   -grip*Math.abs(steer)*.010)+boost*.009;
  state.pitch[i]+=(pitch-state.pitch[i])*
   (1-Math.exp(-(10/(1+i*.14))*step));
  state.peakJointDegrees=Math.max(state.peakJointDegrees,
   Math.abs(state.yaw[i])*180/Math.PI);
 }
 state.peakGrip=Math.max(state.peakGrip,grip);
 state.updates++;
 return state;
}
export function createTailState(){
 return {yaw:new Float64Array(STINGRAY_EVO.segmentCount),
  pitch:new Float64Array(STINGRAY_EVO.segmentCount),time:0,
  peakJointDegrees:0,peakGrip:0,updates:0};
}
export function buildStingrayEvo(THREE,shipGlow){
 const craft=buildMantaBlade(THREE,shipGlow);
 craft.ship.name="Stingray EVO · articulated manta interceptor";
 const wing=craft.ship.getObjectByName("Two broad scalloped manta wings");
 if(!wing)throw new Error("Stingray wing foundation missing");
 wing.geometry.dispose();wing.geometry=wingGeometry(THREE);
 wing.name="Stingray EVO · curved broad manta blades";
 craft.materials.titanium.color.setHex(0x7a8cae);
 craft.materials.wings.color.setHex(0x7388b7);
 craft.materials.graphite.color.setHex(0x101a37);
 craft.materials.glass.color.setHex(0x0c1935);
 craft.materials.turbine.color.setHex(0x101026);
 // Small blade-highlight accents give the craft a distinctive silhouette.
 const violet=new THREE.MeshBasicMaterial({
  color:new THREE.Color(0xdb72ff).multiplyScalar(1.72),
  side:THREE.DoubleSide,toneMapped:false
 });
 const armor=new THREE.MeshPhysicalMaterial({
  color:0x5a688b,metalness:.75,roughness:.32,
  flatShading:true,side:THREE.DoubleSide
 });
 const links=[],length=STINGRAY_EVO.tailSegmentMeters;
 let parent=craft.ship;
 for(let i=0;i<STINGRAY_EVO.segmentCount;i++){
  const progress=i/(STINGRAY_EVO.segmentCount-1);
  const near=.23-progress*.15,far=Math.max(.055,near-.027);
  const joint=new THREE.Group();
  joint.name="Stingray segmented tail joint "+(i+1);
  joint.position.set(0,i===0?.08:0,i===0?1.25:length+.035);
  parent.add(joint);
  const plate=new THREE.Mesh(
   new THREE.CylinderGeometry(far,near,length,6,1),armor);
  plate.rotation.x=Math.PI/2;
  plate.position.z=length*.5;
  plate.name="Articulated mechanical armor "+(i+1);
  joint.add(plate);
  const spine=new THREE.Mesh(
   new THREE.BoxGeometry(Math.max(.028,near*.28),.025,length*.73),violet);
  spine.position.set(0,near*.87,length*.50);
  spine.name="Tail neon spine segment "+(i+1);
  joint.add(spine);
  links.push(joint);parent=joint;
 }
 const tail=createTailState();
 function frame(dt,view){
  tailPoseStep(tail,dt,view);
  for(let i=0;i<links.length;i++){
   links[i].rotation.y=tail.yaw[i];
   links[i].rotation.x=tail.pitch[i];
  }
 }
 function reset(){
  tail.yaw.fill(0);tail.pitch.fill(0);
  tail.time=0;tail.peakJointDegrees=0;tail.peakGrip=0;tail.updates=0;
  for(const joint of links)joint.rotation.set(0,0,0);
 }
 return {...craft,spec:STINGRAY_EVO,tail,
  frameTail:frame,resetTail:reset,
  tailStats:()=>({version:STINGRAY_EVO.version,
   segmentCount:STINGRAY_EVO.segmentCount,
   peakJointDegrees:+tail.peakJointDegrees.toFixed(2),
   peakGrip:+tail.peakGrip.toFixed(3),
   updates:tail.updates,physicsUnchanged:true}),
  // Flight's original muzzle positions and FX ribbons are intentionally
  // shared by both aircraft; only hull + segmented tail differ.
  engineSockets:ENGINE_SOCKETS,
  materials:{...craft.materials,tailArmor:armor,tailNeon:violet}};
}
