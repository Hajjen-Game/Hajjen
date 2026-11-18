// SKYSHIFT 0.19.2 — Pass 2 / Orbital Hero Architecture & Selective Lighting
// Selectively REPLACES the crude first 0.19 station ring with one layered
// hard-surface observatory, not a blanket material brightening. The untouched
// 0.19.0 world stays available through ?architecture=classic.
// Art-only: no road mesh, pilot collider, steering, GRIP, camera or speed change.
import {worldArchitecturePlan} from "./world-rebuild-v0190.mjs";
export const ORBITAL_HERO_0192=Object.freeze({
 version:"orbital-hero-art-0192",name:"ASTERION / ORBITAL OBSERVATORY",
 stationS:278,stationL:-77,stationH:78,
 outerRadius:52,innerRadius:40,segmentsHigh:24,segmentsLow:16,
 structureStart:218,structureEnd:332,
 comparison:"?architecture=classic",
 materialPass1Reverted:true,
 addedColliders:0,addedPhysicsChanges:0,extraRenderPasses:0,
 staticKeyLightsHigh:1,staticKeyLightsLow:0,
 maxDrawMeshesHigh:5,maxDrawMeshesLow:5
});
const H=ORBITAL_HERO_0192;
const COLORS=Object.freeze({
 front:0x374e62,frontLit:0x486276,
 bevel:0x263a4c,edge:0x1b3042,back:0x152638,
 cavity:0x101f31,center:0x33465d,faceplate:0x314a60,
 light:0x8fcff0,lightWarm:0xffb28e
});
const rad=Math.PI/180;
const rgb=(hex)=>[hex>>16&255,hex>>8&255,hex&255];
const safe=x=>Math.abs(x[1])>=15.6||x[2]>=19.0;
const ring=(angle,r,s=H.stationS)=>[
 s,H.stationL+Math.cos(angle)*r,H.stationH+Math.sin(angle)*r];
function quad(out,positions,color,a,b,c,d){
 const verts=[a,b,c,a,c,d];
 for(const p of verts){
  if(!p.every(Number.isFinite)||!safe(p))
   throw Error("Orbital observatory infringes pilot flight corridor: "+p);
  positions.push(p);
  out.push(color);
 }
}
const face=(positions,colors,shade,a,b,c,d)=>quad(colors,positions,shade,a,b,c,d);
const triangle=(positions,colors,shade,a,b,c)=>{
 for(const p of [a,b,c]){
  if(!p.every(Number.isFinite)||!safe(p))
   throw Error("Orbital hero triangle is inside flight corridor: "+p);
  positions.push(p);colors.push(shade);
 }
};
export function heroArchitecturePlan({lowMemory=false}={}){
 const surfaces=[],surfaceTints=[],details=[],detailTints=[],emit=[],emitTints=[];
 const n=lowMemory?H.segmentsLow:H.segmentsHigh;
 const gapEvery=n/4;
 let armorSegments=0,recessedFaces=0,beacons=0;
 const frontS=H.stationS-8,rearS=H.stationS+7;
 for(let i=0;i<n;i++){
  if(i%gapEvery===gapEvery-1)continue;
  armorSegments++;
  const a=i*Math.PI*2/n+.010,b=(i+1)*Math.PI*2/n-.010;
  const midpoint=(a+b)/2;
  const color=Math.cos(midpoint-.7)>.22?COLORS.frontLit:COLORS.front;
  const innerFront=t=>ring(t,H.innerRadius,frontS);
  const outerFront=t=>ring(t,H.outerRadius,frontS);
  const innerBack=t=>ring(t,H.innerRadius,rearS);
  const outerBack=t=>ring(t,H.outerRadius,rearS);
  // Solid annular cassettes with visible depth and angular interruptions.
  face(surfaces,surfaceTints,color,
   innerFront(a),outerFront(a),outerFront(b),innerFront(b));
  face(surfaces,surfaceTints,COLORS.edge,
   outerFront(a),outerBack(a),outerBack(b),outerFront(b));
  face(surfaces,surfaceTints,COLORS.back,
   innerBack(a),innerBack(b),outerBack(b),outerBack(a));
  face(surfaces,surfaceTints,COLORS.bevel,
   innerBack(a),innerFront(a),innerFront(b),innerBack(b));
  // Endcaps make each segment a real volumetric sculpt, not a wire ring.
  face(surfaces,surfaceTints,COLORS.edge,
   innerFront(a),innerBack(a),outerBack(a),outerFront(a));
  face(surfaces,surfaceTints,COLORS.edge,
   outerFront(b),outerBack(b),innerBack(b),innerFront(b));
  // Dark sunken panel is a separate inset plane, recessed behind the lip.
  const da=a+.035,db=b-.035;
  if(db>da){
   recessedFaces++;
   face(details,detailTints,COLORS.cavity,
    ring(da,43,frontS+.32),ring(da,49,frontS+.32),
    ring(db,49,frontS+.32),ring(db,43,frontS+.32));
   face(details,detailTints,COLORS.faceplate,
    ring(da+.015,45,frontS+.18),ring(da+.015,47.4,frontS+.18),
    ring(db-.015,47.4,frontS+.18),ring(db-.015,45,frontS+.18));
  }
  // Only six to eight defined energy windows, NOT a bright full ring.
  if(i%4===0){
   beacons++;
   const la=a+.09,lb=b-.09;
   face(emit,emitTints,COLORS.light,
    ring(la,39.62,frontS-.26),ring(la,40.17,frontS-.26),
    ring(lb,40.17,frontS-.26),ring(lb,39.62,frontS-.26));
  }
 }
 // Recessed center with octagonal hub and angled load-bearing spokes.
 const arms=lowMemory?4:6;
 for(let i=0;i<arms;i++){
  const a=(i/arms)*Math.PI*2+0.12,half=.047;
  face(surfaces,surfaceTints,COLORS.bevel,
   ring(a-half,12.5,H.stationS+3),ring(a-half,38.7,H.stationS+3),
   ring(a+half,38.7,H.stationS+3),ring(a+half,12.5,H.stationS+3));
  // Contrasting inset plate: physical surface, not emissive pipework.
  face(details,detailTints,COLORS.center,
   ring(a-half*.45,17,H.stationS+2.7),
   ring(a-half*.45,35,H.stationS+2.7),
   ring(a+half*.45,35,H.stationS+2.7),
   ring(a+half*.45,17,H.stationS+2.7));
 }
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,b=(i+1)*Math.PI/4;
  face(surfaces,surfaceTints,COLORS.center,
   ring(a,3.7,H.stationS-6),ring(a,12.9,H.stationS-6),
   ring(b,12.9,H.stationS-6),ring(b,3.7,H.stationS-6));
  face(surfaces,surfaceTints,COLORS.edge,
   ring(a,12.9,H.stationS-6),ring(a,12.9,H.stationS+4),
   ring(b,12.9,H.stationS+4),ring(b,12.9,H.stationS-6));
 }
 // A broad, authored near-side forecourt with beveled ends. This is what
 // creates perceivable foreground architectural mass from a chase camera.
 // Everything is beyond the real guardrails. No central arches or light spam.
 const near=[
  [218,-24.5,5],[229,-27,19],[252,-31,25],
  [303,-31,25],[325,-25,10],[332,-24.5,4]
 ];
 for(let i=1;i<near.length-1;i++)
  triangle(surfaces,surfaceTints,COLORS.bevel,near[0],near[i],near[i+1]);
 // Faceted shoulder armor with genuine depth.
 for(let i=0;i<near.length-1;i++){
  const a=near[i],b=near[i+1];
  face(surfaces,surfaceTints,COLORS.edge,
   a,b,[b[0],b[1]-3.8,b[2]+2.4],
   [a[0],a[1]-3.8,a[2]+2.4]);
 }
 // Just two wide light recesses, controlled and lower than the main ring.
 face(emit,emitTints,COLORS.light,
  [226,-27.8,18],[238,-29.2,20.5],
  [248,-30.6,24],[238,-29.1,21.8]);
 if(!lowMemory){
  face(emit,emitTints,COLORS.lightWarm,
   [294,-31.1,24],[311,-29.1,20.2],
   [319,-26.0,11],[308,-29.7,17.0]);
 }
 const plan={station:H.stationS,stationL:H.stationL,lowMemory,
  armorSegments,recessedFaces,beacons,arms,
  surfaces,surfaceTints,details,detailTints,
  emissive:emit,emissiveTints:emitTints};
 const all=[...surfaces,...details,...emit];
 if(!all.every(v=>v.every(Number.isFinite)&&safe(v)))
  throw Error("Orbital hero must not collide with flight envelope");
 return {...plan,stats:{
  version:H.version,stationS:H.stationS,lowMemory,
  armorSegments,recessedFaces,beacons,arms,
  triangles:{shell:surfaces.length/3,inlays:details.length/3,
   energy:emit.length/3},vertexCount:all.length,
  colliders:0,physicsChanges:0,additionalRenderPasses:0
 }};
}
export function retiredPrimitiveStation(beam){
 // The original huge ring at 278m was assembled from disconnected boxes.
 // Suppress *only* that station, NOT other orbital landmarks, the rail or
 // the second orbital ring. Do not modify archived 0.19.0 data or modules.
 return beam.chapter==="orbital"&&
  beam.a[0]>=239&&beam.a[0]<=285&&beam.b[0]<=320&&
  (beam.a[1]<-40||beam.b[1]<-40);
}
function retireOriginalStation(THREE,world,lowMemory){
 const root=world.getObjectByName("Cinematic World Rebuild 0.19.0");
 if(!root)return 0;
 const plan=worldArchitecturePlan({lowMemory,track:"skyline"});
 const zero=new THREE.Matrix4().makeScale(0,0,0);
 let hidden=0;
 for(const kind of ["steel","panel","glow","core"]){
  const mesh=root.children.find(x=>x.name==="Cinematic World 0.19 · "+kind);
  if(!mesh)continue;
  const beams=plan.beams.filter(x=>x.kind===kind);
  if(beams.length!==mesh.count)throw Error("Orbital station plan no longer matches live world");
  let modified=false;
  for(let i=0;i<beams.length;i++){
   if(!retiredPrimitiveStation(beams[i]))continue;
   mesh.setMatrixAt(i,zero);modified=true;hidden++;
  }
  if(modified){
   mesh.instanceMatrix.needsUpdate=true;
   mesh.computeBoundingSphere();
  }
 }
 return hidden;
}
function toGeometry(THREE,coordinates,colors,positionAt){
 const points=new Float32Array(coordinates.length*3);
 const rgbList=new Float32Array(coordinates.length*3);
 const c=new THREE.Color();
 for(let i=0;i<coordinates.length;i++){
  const p=positionAt(...coordinates[i]);
  points.set([p.x,p.y,p.z],i*3);
  c.setHex(colors[i]);
  rgbList.set([c.r,c.g,c.b],i*3);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.BufferAttribute(points,3));
 geometry.setAttribute("color",new THREE.BufferAttribute(rgbList,3));
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 return geometry;
}
export function installOrbitalHero(THREE,world,{
 track="skyline",lowMemory=false,positionAt
}={}){
 if(!THREE||!world||typeof positionAt!=="function")
  throw Error("Orbital hero requires world and authoritative positionAt");
 if(track!=="skyline")return {
  active:false,stats(){return {active:false,track,maskedPrimitiveBeams:0,
   addedDrawMeshes:0,additionalLights:0}},dispose(){}
 };
 const plan=heroArchitecturePlan({lowMemory});
 const maskedPrimitiveBeams=retireOriginalStation(THREE,world,lowMemory);
 if(maskedPrimitiveBeams<10)
  throw Error("Hero requires the original orbital station to be present");
 const group=new THREE.Group();
 group.name="Orbital Hero 0.19.2 · Asterion";
 const meshes=[];
 // plan stores coordinates and tints separately, one material per entire
 // authored shell class — no draw call per segment or per arm.
 const definitions=[
  [plan.surfaces,plan.surfaceTints,
   new THREE.MeshBasicMaterial({vertexColors:true,
    toneMapped:true,side:THREE.DoubleSide})],
  [plan.details,plan.detailTints,
   new THREE.MeshBasicMaterial({vertexColors:true,
    toneMapped:true,side:THREE.DoubleSide})],
  [plan.emissive,plan.emissiveTints,
   new THREE.MeshBasicMaterial({vertexColors:true,
    toneMapped:false,side:THREE.DoubleSide})]
 ];
 for(let i=0;i<definitions.length;i++){
  const [coordinates,colors,material]=definitions[i];
  const mesh=new THREE.Mesh(toGeometry(THREE,coordinates,colors,positionAt),material);
  mesh.name=["Asterion solid faceted shell","Asterion recessed panels",
   "Asterion sparse luminous cores"][i];
  mesh.frustumCulled=true;
  mesh.castShadow=false;mesh.receiveShadow=false;
  meshes.push(mesh);group.add(mesh);
 }
 let light=null;
 if(!lowMemory){
  // A single local, non-shadow-casting key affects the original PBR hull and
  // ship as it passes, without new lighting along the whole circuit.
  light=new THREE.PointLight(0x8ac9e8,2.6,67,2);
  const p=positionAt(270,-26,18);
  light.position.set(p.x,p.y,p.z);
  light.castShadow=false;
  light.name="Asterion / localized cool key";
  group.add(light);
 }
 world.add(group);
 return {
  active:true,
  stats(){return {...plan.stats,active:true,
   maskedPrimitiveBeams,
   addedDrawMeshes:meshes.length,additionalLights:light?1:0,
   anchoredToWorld:group.parent===world,
   shellTriangles:plan.stats.triangles.shell,
   luminousTriangles:plan.stats.triangles.energy,
   meshNames:meshes.map(x=>x.name)}},
  dispose(){
   group.removeFromParent();
   meshes.forEach(m=>{m.geometry.dispose();m.material.dispose()});
   light?.dispose?.();
  }
 };
}
