// SKYSHIFT 0.6.1 – two layered side-nozzle flames, activated only by
// real grip + steering physics. No extra lights, particles, RAF or canvases.
export const SIDE_THRUSTER_SPEC=Object.freeze({
 version:"directional-side-thrusters-061",
 sides:2,layersPerSide:2,activeDrawCalls:2,
 idleDrawCalls:0,newLights:0,newParticles:0,
 colorVeil:0x42d6ef,whiteCore:0xf5ffff,
 socketsX:2.6,flameReachMeters:1.2
});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
function flameGeometry(THREE,side,core=false){
 // Triangles sit on top of the outer wing. Right-facing thruster pushes
 // toward the left and vice versa. Use no texture, images, or shaders.
 const start=core?2.64:2.54,end=core?3.36:3.73;
 const z=.47,y=core?.27:.24,w=core?.105:.27;
 const x0=side*start,x1=side*end;
 const p=new Float32Array([
  x0,y,z-w,x0,y,z+w,x1,y,z,
  x0,y,z-w*.58,x0,y,z+w*.58,side*(end-.23),y+.018,z
 ]);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.BufferAttribute(p,3));
 geometry.computeVertexNormals();
 return geometry;
}
export function createSideThrusters(THREE,ship){
 const sides=[];
 for(const sign of [-1,1]){
  const veil=new THREE.Mesh(flameGeometry(THREE,sign),
    new THREE.MeshBasicMaterial({
     color:SIDE_THRUSTER_SPEC.colorVeil,transparent:true,opacity:0,
     blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
     depthWrite:false,toneMapped:false}));
  const core=new THREE.Mesh(flameGeometry(THREE,sign,true),
    new THREE.MeshBasicMaterial({
     color:SIDE_THRUSTER_SPEC.whiteCore,transparent:true,opacity:0,
     blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
     depthWrite:false,toneMapped:false}));
  veil.name=sign<0?"Grip port chromatic jet":"Grip starboard chromatic jet";
  core.name=sign<0?"Grip port white core":"Grip starboard white core";
  veil.visible=false;core.visible=false;
  ship.add(veil,core);
  sides.push({sign,veil,core});
 }
 let peak=0,rendered=0,activations=0,wasActive=false;
 function frame(intensity=0,direction=0,time=0){
  const power=clamp(intensity,0,1),activeSide=-Math.sign(direction);
  const enabled=power>.015&&activeSide!==0;
  for(const item of sides){
   const isActive=enabled&&item.sign===activeSide;
   item.veil.visible=isActive;item.core.visible=isActive;
   if(isActive){
    const pulse=1+.065*Math.sin(time*31);
    item.veil.material.opacity=clamp(.53*power*pulse,0,.8);
    item.core.material.opacity=clamp(.90*power*pulse,0,1);
    item.veil.scale.x=1+power*.24;
    item.core.scale.x=1+power*.18;
    rendered++;
   }
  }
  if(enabled&&!wasActive)activations++;
  wasActive=enabled;
  peak=Math.max(peak,power);
 }
 function reset(){frame(0,0,0);peak=0;rendered=0;activations=0;}
 function dispose(){for(const x of sides){
  ship.remove(x.veil,x.core);x.veil.geometry.dispose();x.core.geometry.dispose();
  x.veil.material.dispose();x.core.material.dispose();
 }}
 return {frame,reset,dispose,stats:()=>({
  version:SIDE_THRUSTER_SPEC.version,peakIntensity:+peak.toFixed(3),
  activeFrames:rendered,activations,
  additionalLights:0,particles:0,maximumExtraDrawCalls:2
 })};
}
