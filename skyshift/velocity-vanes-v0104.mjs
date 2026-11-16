// SKYSHIFT 0.10.4 — two articulated, low-poly velocity vanes.
// Visual-only. The real wing/collision meshes, GRIP and track geometry remain
// unchanged. Shared geometry/material cost: 2 draw calls for both ships.
export const VELOCITY_VANES=Object.freeze({
 version:"velocity-vanes-0104",count:2,drawCalls:2,
 addedLights:0,particles:0,physicsChanged:false
});
export function installVelocityVanes(THREE,ship){
 const geometry=new THREE.BoxGeometry(.62,.050,.46);
 const material=new THREE.MeshStandardMaterial({
  color:0x778da9,metalness:.72,roughness:.30,
  emissive:0x173049,emissiveIntensity:.16
 });
 const vanes=[];
 for(const side of [-1,1]){
  const pivot=new THREE.Group();
  pivot.position.set(side*2.28,.286,.54);
  const vane=new THREE.Mesh(geometry,material);
  vane.position.set(side*.18,0,.10);
  vane.rotation.y=side*.11;
  vane.name=side<0?"Port articulated airflow vane":"Starboard articulated airflow vane";
  pivot.add(vane);ship.add(pivot);
  vanes.push({pivot,side});
 }
 let peak=0;
 return {
  frame(presence,view={}){
   const deflection=presence?.wingDeflection??0;
   const split=presence?.hullRoll??0;
   for(const {pivot,side} of vanes){
    pivot.rotation.x=deflection+side*split*.38;
    pivot.rotation.z=side*(.015*(presence?.speed??0));
    peak=Math.max(peak,Math.abs(pivot.rotation.x));
   }
   material.emissiveIntensity=.16+.14*(presence?.engineLoad??0);
  },
  reset(){
   peak=0;material.emissiveIntensity=.16;
   for(const {pivot} of vanes)pivot.rotation.set(0,0,0);
  },
  stats(){return {version:VELOCITY_VANES.version,
    drawCalls:VELOCITY_VANES.drawCalls,
    peakVaneDegrees:+(peak*180/Math.PI).toFixed(2),
    physicsUnchanged:true};}
 };
}
