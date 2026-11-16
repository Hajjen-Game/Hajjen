// SKYSHIFT 0.10.8 — Reactive Wing Flaps.
// A restrained pair of mechanically articulated, flush-mounted wing plates,
// each with a fine emissive aft-edge. One side rises more in its steering
// direction; BOTH react, and GRIP increases real visual travel. All cosmetic.
export const REACTIVE_FLAPS=Object.freeze({
 version:"reactive-wing-flaps-0108",perWing:1,wingCount:2,
 maxAngleDegrees:34,maxAddedDrawCalls:6,
 liftSide:"same-sign-as-steering",bothRise:true,
 metalSurface:true,glowingAftEdges:true,mechanicalHinge:true,
 physicsChanged:false,addedLights:0,addedParticles:0
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const finite=(v,f=0)=>Number.isFinite(v)?v:f;
const DEG=Math.PI/180;
const DAMPING=.73,OMEGA=17;
// Exact underdamped 2nd-order spring response at 30, 60, 120 Hz.
// Keeps a few frames of physical after-swing without a perpetual oscillation.
function spring(x,v,target,dt){
 const a=DAMPING*OMEGA,w=OMEGA*Math.sqrt(1-DAMPING*DAMPING);
 const delta=x-target,A=delta,B=(v+a*delta)/w;
 const e=Math.exp(-a*dt),c=Math.cos(w*dt),s=Math.sin(w*dt);
 const p=A*c+B*s;
 return [target+e*p,e*(-a*p+w*(-A*s+B*c))];
}
export function createFlapState(){
 return {port:0,starboard:0,portVelocity:0,starboardVelocity:0,
  peakDegrees:0,peakDifferentialDegrees:0,steeringFrames:0,
  gripFrames:0,updates:0};
}
export function flapTargets({steering=0,gripIntensity=0,yawRate=0}={}){
 const steer=clamp(finite(steering),-1,1);
 const grip=clamp(finite(gripIntensity),0,1);
 const yaw=clamp(Math.abs(finite(yawRate))/1.24,0,1);
 // No forced animation when driving straight. Ordinary steering is readable,
 // GRIP makes the working-side plate rise more, not a permanent glowing wing.
 const demand=clamp(.88*Math.abs(steer)+.12*yaw,0,1);
 const base=(.065+.085*grip)*demand;
 const high=(.22+.22*grip)*demand;
 const low=(.045+.045*grip)*demand;
 const preferred=Math.sign(steer||(Math.sign(finite(yawRate))));
 const port=base+(preferred<0?high:preferred>0?low:0);
 const starboard=base+(preferred>0?high:preferred<0?low:0);
 return {port:clamp(port,0,REACTIVE_FLAPS.maxAngleDegrees*DEG),
  starboard:clamp(starboard,0,REACTIVE_FLAPS.maxAngleDegrees*DEG),
  demand,grip,preferred};
}
export function stepFlapState(st,dt,inputs={}){
 const h=clamp(finite(dt),0,.08);
 if(!h)return st;
 const target=flapTargets(inputs);
 const p=spring(st.port,st.portVelocity,target.port,h);
 const s=spring(st.starboard,st.starboardVelocity,target.starboard,h);
 st.port=clamp(p[0],-.015,REACTIVE_FLAPS.maxAngleDegrees*DEG+.028);
 st.starboard=clamp(s[0],-.015,REACTIVE_FLAPS.maxAngleDegrees*DEG+.028);
 st.portVelocity=p[1];st.starboardVelocity=s[1];
 st.peakDegrees=Math.max(st.peakDegrees,Math.abs(st.port)/DEG,
  Math.abs(st.starboard)/DEG);
 st.peakDifferentialDegrees=Math.max(st.peakDifferentialDegrees,
  Math.abs(st.port-st.starboard)/DEG);
 if(target.demand>.05)st.steeringFrames++;
 if(target.grip>.5&&target.demand>.05)st.gripFrames++;
 st.updates++;
 return st;
}
export function resetFlapState(st){
 Object.assign(st,createFlapState());return st;
}
// One modest faceted plate and a dark recessed seat beneath it per wing.
// Actual polygon is inside both Manta and Stingray outlines at this position.
const POLYGON=Object.freeze([
 [ .00,.015],[ .66,.018],[ .73,.61],
 [ .52,.82],[ .10,.80],[-.015,.58]
]);
export function flapMount(variant="manta",side=1){
 const stingray=variant==="stingray";
 return {x:side*(stingray?1.66:1.63),
  y:stingray?.296:.276,z:stingray?.48:.48};
}
function polygonGeometry(THREE,outline,height,sidewalls){
 const xyz=[],rgb=[];
 const add=(x,y,z,c)=>{
  xyz.push(x,y,z);rgb.push(c[0],c[1],c[2]);
 };
 const face=([x,z],y,c)=>add(x,y,z,c);
 const top=[.48,.61,.69],edge=[.22,.32,.39],bottom=[.10,.15,.19];
 for(let i=1;i<outline.length-1;i++)
  for(const index of [0,i,i+1])face(outline[index],height,top);
 if(sidewalls){
  for(let i=0;i<outline.length;i++){
   const j=(i+1)%outline.length,a=outline[i],b=outline[j];
   face(a,height,edge);face(b,height,edge);face(b,-.025,bottom);
   face(a,height,edge);face(b,-.025,bottom);face(a,-.025,bottom);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(xyz,3));
 geometry.setAttribute("color",new THREE.Float32BufferAttribute(rgb,3));
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}
function trailingGlowGeometry(THREE){
 // Thin seamless white-blue luminous line on the aft edge of the plate.
 const verts=[];
 const line=(a,b,w)=>{
  const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);
  const ox=-dz/l*w*.5,oz=dx/l*w*.5;
  const ay=.054;
  verts.push(
   a[0]+ox,ay,a[1]+oz,a[0]-ox,ay,a[1]-oz,
   b[0]-ox,ay,b[1]-oz,a[0]+ox,ay,a[1]+oz,
   b[0]-ox,ay,b[1]-oz,b[0]+ox,ay,b[1]+oz
  );
 };
 // Only the *trailing* outline, never a fully illuminated neon rectangle.
 line(POLYGON[2],POLYGON[3],.029);
 line(POLYGON[3],POLYGON[4],.033);
 line(POLYGON[4],POLYGON[5],.022);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
 geometry.computeBoundingSphere();
 return geometry;
}
export function installReactiveWingFlaps(THREE,ship,{variant="manta"}={}){
 const plateGeo=polygonGeometry(THREE,POLYGON,.047,true);
 // Inset dark seats remain when the plates raise, selling the hinge motion.
 const seatPolygon=POLYGON.map(([x,z])=>[x*1.065-.008,z*1.045-.006]);
 const seatGeo=polygonGeometry(THREE,seatPolygon,.001,false);
 const glowGeo=trailingGlowGeometry(THREE);
 const armorMaterial=new THREE.MeshStandardMaterial({
  color:0xffffff,vertexColors:true,side:THREE.DoubleSide,
  metalness:.76,roughness:.31,
  emissive:0x0c1c29,emissiveIntensity:.12,flatShading:true
 });
 const recessMaterial=new THREE.MeshStandardMaterial({
  color:0x102233,vertexColors:true,side:THREE.DoubleSide,
  metalness:.51,roughness:.42,depthWrite:true
 });
 const wing=[];
 for(const side of [-1,1]){
  const mount=flapMount(variant,side);
  const origin=new THREE.Group();
  origin.name=side<0?"Port reactive flap hinge":"Starboard reactive flap hinge";
  origin.position.set(mount.x,mount.y,mount.z);
  origin.scale.x=side; // mirror geometry without changing lift convention
  ship.add(origin);
  const seat=new THREE.Mesh(seatGeo,recessMaterial);
  seat.name=side<0?"Port recessed flap bed":"Starboard recessed flap bed";
  seat.position.y=-.016;origin.add(seat);
  const hinge=new THREE.Group();
  hinge.name=side<0?"Port deployable elevon":"Starboard deployable elevon";
  origin.add(hinge);
  const plate=new THREE.Mesh(plateGeo,armorMaterial);
  plate.name="Faceted titanium aero plate";
  hinge.add(plate);
  const glowMaterial=new THREE.MeshBasicMaterial({
   color:0xd3f8ff,transparent:true,opacity:.055,
   blending:THREE.AdditiveBlending,depthWrite:false,
   toneMapped:false,side:THREE.DoubleSide,fog:false
  });
  const glow=new THREE.Mesh(glowGeo,glowMaterial);
  glow.name="Fine reactive hinge-aft edge illumination";
  glow.renderOrder=3;hinge.add(glow);
  wing.push({side,origin,hinge,glow,glowMaterial});
 }
 const state=createFlapState();
 let peakGlow=0;
 const maxAngle=REACTIVE_FLAPS.maxAngleDegrees*DEG;
 function apply(){
  for(const w of wing){
   const amount=w.side<0?state.port:state.starboard;
   // -X rotation lifts the +Z trailing lip UP into the air.
   w.hinge.rotation.x=-amount;
   const normalized=clamp(Math.abs(amount)/maxAngle,0,1);
   w.glowMaterial.opacity=.055+normalized*.49;
   peakGlow=Math.max(peakGlow,w.glowMaterial.opacity);
  }
 }
 function frame(dt,inputs={}){
  stepFlapState(state,dt,inputs);apply();
 }
 function reset(){
  resetFlapState(state);peakGlow=0;apply();
 }
 apply();
 return {
  frame,reset,state,
  stats:()=>({
   version:REACTIVE_FLAPS.version,model:variant,
   wingCount:wing.length,
   portDegrees:+(state.port/DEG).toFixed(2),
   starboardDegrees:+(state.starboard/DEG).toFixed(2),
   peakDegrees:+state.peakDegrees.toFixed(2),
   peakDifferentialDegrees:+state.peakDifferentialDegrees.toFixed(2),
   peakGlowOpacity:+peakGlow.toFixed(3),
   steeringFrames:state.steeringFrames,
   gripFrames:state.gripFrames,updates:state.updates,
   maxDrawCalls:REACTIVE_FLAPS.maxAddedDrawCalls,
   physicsUnchanged:true
  }),
  dispose(){
   for(const w of wing){
    w.origin.removeFromParent();
    w.glowMaterial.dispose();
   }
   plateGeo.dispose();seatGeo.dispose();glowGeo.dispose();
   armorMaterial.dispose();recessMaterial.dispose();
  }
 };
}
