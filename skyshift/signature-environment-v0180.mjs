// SKYSHIFT 0.18.0 — CELESTIAL CONDUIT / Signature Track Architecture
// Art-only modular environment. All positions use the authoritative positionAt.
// No collider, track data, physics, camera control, timing, dynamic light or FX pass.
export const SIGNATURE_ENV_0180=Object.freeze({
 version:"signature-environments-0180",name:"CELESTIAL CONDUIT",
 track:"skyline",start:1185,end:1485,lengthMeters:300,
 portalStations:Object.freeze([1208,1258,1308,1358,1408,1458]),
 roadHalfWidth:11.6,nearestStructuralLateral:19.3,
 minimumCrossingHeight:20.4,
 tunnelSeparated:true,noNewColliders:true,
 physicsModule:"trial-v0165.mjs",tracksUnchanged:true,
 additionalDynamicLights:0,additionalPostprocessingPasses:0,
 targetDrawCallsHigh:4,targetDrawCallsLow:3,
 fallback:"?env=classic",distinctive:"arched canopy / floating fins / illuminated guidance"
});
const S=SIGNATURE_ENV_0180;
const farOutside=(l,h)=>Math.abs(l)>S.roadHalfWidth+2.4||h>S.minimumCrossingHeight;
// All segments are authored in real track arc-length, lateral offset and
// road-normal height. Road width is <=23.2m in this section. Crown beams always
// cross over the lane at >20m; footings are beyond the actual guardrails.
function beam(kind,s0,l0,h0,s1,l1,h1,w,d){
 return {kind,a:[s0,l0,h0],b:[s1,l1,h1],width:w,depth:d};
}
export function signatureArchitecturePlan({lowMemory=false,track="skyline"}={}){
 if(track!=="skyline")return {active:false,beams:[],stats:inactiveStats(track)};
 const beams=[],add=(...args)=>beams.push(beam(...args));
 const rings=S.portalStations;
 // Five-angle monumental rib profile. Upper vertices are well above the ship
 // and sightline. The ribs are spaced fifty metres apart, not repetitive poles.
 const section=[
  [-23.5,-1.5],[-23.3,11.2],[-19.3,20.6],[-13.8,27.7],
  [-6.0,31.9],[0,32.8],[6.0,31.9],[13.8,27.7],
  [19.3,20.6],[23.3,11.2],[23.5,-1.5]
 ];
 const glowPath=[
  [-18.9,21.1],[-13.5,27.9],[-5.8,31.8],[0,32.6],
  [5.8,31.8],[13.5,27.9],[18.9,21.1]
 ];
 for(let i=0;i<rings.length;i++){
  const s=rings[i],hero=i===3,scale=hero?1.11:1;
  const pts=section.map(([l,h])=>[l*scale,h*scale]);
  for(let j=0;j<pts.length-1;j++){
   const a=pts[j],b=pts[j+1];
   add("alloy",s,a[0],a[1],s,b[0],b[1],hero?1.43:1.06,hero?1.18:.92);
  }
  // Slanted external buttresses provide architectural mass outside rails.
  for(const side of [-1,1]){
   add("alloy",s,side*27.8*scale,-1.4,s,side*23.25*scale,11*scale,1.4,1.0);
   // Fin blades lead the eye through the S-bend, away from the cockpit.
   add("alloy",s-3,side*27.8*scale,3,s+9,side*30*scale,16.5*scale,1.8,1.4);
  }
  // A true illuminated inner lip on every second vault; the others remain
  // silhouetted to avoid a harsh endless flashing tunnel.
  if(i%2===0||hero){
   const inner=glowPath.map(([l,h])=>[l*scale,h*scale]);
   for(let j=0;j<inner.length-1;j++){
    const a=inner[j],b=inner[j+1];
    add("ice",s-0.8,a[0],a[1],s-0.8,b[0],b[1],.32,.36);
   }
  }
  // Hero arch: five isolated WHITE skylights, not a full-width blinding bar.
  if(hero&&!lowMemory){
   for(const l of [-9,-4.5,0,4.5,9])
    add("white",s-2.15,l,31.5*scale,s+2.15,l,31.5*scale,.32,.55);
  }
 }
 // Continuous magenta guide just OUTSIDE the real existing rail, so it cannot
 // be mistaken for a new drivable lane or an obstacle across the road.
 // Short shared-instanced segments follow the S curve instead of chord-cutting.
 const step=7.5;
 for(let s=S.start;s<S.end-0.001;s+=step){
  const to=Math.min(S.end,s+step);
  for(const side of [-1,1]){
   add("rose",s,side*14.2,3.25,to,side*14.2,3.25,.20,.23);
   if(!lowMemory&&(Math.round((s-S.start)/step)%4===0)){
    add("white",s,side*14.2,3.3,Math.min(to,s+1.20),side*14.2,3.3,.11,.20);
   }
  }
 }
 // Two far-field orbital spires break the horizon silhouette without
 // placing objects in the racing envelope or requiring extra draw calls.
 for(const side of [-1,1]){
  add("alloy",1328,side*59,-13,1344,side*53,78,5.4,3.1);
  add("alloy",1344,side*53,78,1362,side*67,92,3.4,2.6);
  add("ice",1337,side*55,48,1344,side*53,76,.65,.65);
 }
 const kinds=Object.fromEntries(["alloy","ice","rose","white"]
   .map(kind=>[kind,beams.filter(x=>x.kind===kind).length]));
 // Safety follows *every endpoint*, including the outside rail guidance.
 const unsafe=beams.filter(x=>!farOutside(x.a[1],x.a[2])||
   !farOutside(x.b[1],x.b[2]));
 if(unsafe.length)throw new Error("Signature environment entered pilot envelope");
 return {active:true,beams,stats:{
  version:S.version,track,section:[S.start,S.end],
  portals:rings.length,beams:beams.length,materials:kinds,
  minimumCrossingHeight:S.minimumCrossingHeight,
  addedColliders:0,dynamicLights:0,extraPasses:0,
  extraDrawCalls:lowMemory?S.targetDrawCallsLow:S.targetDrawCallsHigh,
  heroStation:rings[3],lowMemory}};
}
function inactiveStats(track){
 return {version:S.version,track,portals:0,beams:0,
  addedColliders:0,dynamicLights:0,extraPasses:0,extraDrawCalls:0};
}
const Y_AXIS=[0,1,0];
function installBatch(THREE,root,kind,beams,material,positionAt){
 if(!beams.length)return null;
 const mesh=new THREE.InstancedMesh(
  new THREE.BoxGeometry(1,1,1),material,beams.length);
 mesh.name="Signature 0.18.0 · "+kind;
 const axis=new THREE.Vector3(...Y_AXIS),pa=new THREE.Vector3(),
  pb=new THREE.Vector3(),diff=new THREE.Vector3(),
  center=new THREE.Vector3(),scale=new THREE.Vector3(),
  quaternion=new THREE.Quaternion(),matrix=new THREE.Matrix4();
 for(let i=0;i<beams.length;i++){
  const b=beams[i],a=positionAt(...b.a),z=positionAt(...b.b);
  pa.set(a.x,a.y,a.z);pb.set(z.x,z.y,z.z);
  diff.subVectors(pb,pa);
  const length=diff.length();
  if(!Number.isFinite(length)||length<.001)
   throw new Error("Invalid environment beam near s="+b.a[0]);
  center.addVectors(pa,pb).multiplyScalar(.5);
  quaternion.setFromUnitVectors(axis,diff.multiplyScalar(1/length));
  scale.set(b.width,length,b.depth);
  matrix.compose(center,quaternion,scale);
  mesh.setMatrixAt(i,matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;
 mesh.computeBoundingSphere();
 mesh.frustumCulled=true;
 mesh.castShadow=false;mesh.receiveShadow=false;
 root.add(mesh);
 return mesh;
}
export function installSignatureEnvironment(THREE,world,{
 track="skyline",lowMemory=false,positionAt
}={}){
 if(!THREE||!world||typeof positionAt!=="function")
  throw new Error("Signature environment requires world and real positionAt");
 const plan=signatureArchitecturePlan({lowMemory,track});
 if(!plan.active)return {
  ...plan.stats,active:false,
  stats(){return {...plan.stats,active:false}},
  dispose(){}
 };
 const root=new THREE.Group();
 root.name="Signature Environment · Celestial Conduit 0.18.0";
 const mats={
  alloy:new THREE.MeshStandardMaterial({
   color:0x101c32,roughness:.38,metalness:.72,side:THREE.DoubleSide
  }),
  ice:new THREE.MeshBasicMaterial({
   color:new THREE.Color(0x80dfff).multiplyScalar(1.76),
   toneMapped:false
  }),
  rose:new THREE.MeshBasicMaterial({
   color:new THREE.Color(0xff4eae).multiplyScalar(1.65),
   toneMapped:false
  }),
  white:new THREE.MeshBasicMaterial({
   color:new THREE.Color(0xedf8ff).multiplyScalar(1.86),
   toneMapped:false
  })
 };
 const instances=[];
 for(const kind of ["alloy","ice","rose","white"]){
  const mesh=installBatch(THREE,root,kind,
   plan.beams.filter(x=>x.kind===kind),mats[kind],positionAt);
  if(mesh)instances.push(mesh);
  else mats[kind].dispose();
 }
 world.add(root);
 let peakVisible=0,framesVisible=0;
 return {
  active:true,
  frame(camera){
   // No geometry animation or lights. Frustum culling is handled by Three.
   // Only the non-invasive QA counter tracks viewing opportunities.
   if(camera&&root.visible){framesVisible++;
    peakVisible=Math.max(peakVisible,framesVisible);}
  },
  stats(){return {...plan.stats,active:true,
   realDrawBatches:instances.length,
   rootChildren:root.children.length,
   parentedToWorld:root.parent===world,
   cameraFrames:framesVisible,
   maxVisibleFrames:peakVisible}},
  dispose(){
   root.removeFromParent();
   for(const m of instances)m.geometry.dispose();
   for(const m of Object.values(mats))
    if(!m.disposed)m.dispose();
  }
 };
}
