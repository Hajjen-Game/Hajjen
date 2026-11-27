// SKYSHIFT 0.19.0 — Cinematic World Rebuild
// Decorative authored environment only. Three distinct Skyline chapters.
// Existing 0.18.0 Celestial Conduit stays installed. Shared physics untouched.
export const WORLD_0190=Object.freeze({
 version:"cinematic-world-rebuild-0190",track:"skyline",
 chapters:Object.freeze([
  Object.freeze({id:"orbital",name:"ORBITAL EXPANSE",start:60,end:950}),
  Object.freeze({id:"conduit",name:"CELESTIAL CONDUIT 2.0",start:1030,end:1640}),
  Object.freeze({id:"cathedral",name:"VOID CATHEDRAL",start:1960,end:2890})
 ]),
 pilotHalfWidth:11.6,visualMargin:3.75,minOverpassHeight:13,
 addedColliders:0,addedDynamicLights:0,addedRenderPasses:0,
 activePhysics:"trial-v0165.mjs",highDrawBatches:4,lowDrawBatches:3,
 classicFlag:"?world=classic"
});
const CFG=WORLD_0190;
const T=Object.freeze({
 steel:0x18283f,plum:0x28213d,black:0x0b1326,
 steelBlue:0x345775,steelRose:0x483154,
 ice:0x8deaff,blue:0x65bfff,rose:0xff66bf,
 white:0xf5fbff,gold:0xffbb7c
});
const lerp=(a,b,t)=>a+(b-a)*t;
export function worldBeamClear(beam){
 // Sample the *entire* beam, not only endpoints: crossing a live race lane
 // is permitted only far above the ship. No object becomes a collider.
 for(let i=0;i<=12;i++){
  const t=i/12;
  const l=lerp(beam.a[1],beam.b[1],t);
  const h=lerp(beam.a[2],beam.b[2],t);
  if(!Number.isFinite(l)||!Number.isFinite(h)||
   (Math.abs(l)<CFG.pilotHalfWidth+CFG.visualMargin &&
    h<CFG.minOverpassHeight))return false;
 }
 return true;
}
export function worldArchitecturePlan({track="skyline",lowMemory=false}={}){
 if(track!=="skyline")return {active:false,beams:[],stats:{
  version:CFG.version,track,chapters:[],beams:0,drawBatches:0,
  colliders:0,dynamicLights:0,renderPasses:0
 }};
 const beams=[];
 function line(kind,tint,chapter,a,b,width=1.4,depth=1.7){
  const x={kind,tint,chapter,a,b,width,depth};
  if(!worldBeamClear(x))throw Error("0.19.0 unsafe visual beam: "+JSON.stringify(x));
  beams.push(x);
 }
 function ribs(s,points,{kind="steel",tint=T.steel,
  chapter,width=2.4,depth=3.0}={}){
  for(let i=1;i<points.length;i++)
   line(kind,tint,chapter,[s,...points[i-1]],[s,...points[i]],
    width,depth);
 }
 function stationRing(s,side,cy,r){
  const chapter="orbital",cl=side*104,n=lowMemory?18:30;
  for(let i=0;i<n;i++){
   const t=i*2*Math.PI/n,u=(i+1)*2*Math.PI/n;
   const v=(angle,radius,offset=0)=>[s+offset,cl+radius*Math.cos(angle),
    cy+radius*Math.sin(angle)];
   line("steel",T.steel,chapter,v(t,r),v(u,r),3.9,4.5);
   if(!lowMemory&&i%3!==2)
    line("glow",T.blue,chapter,v(t+.02,r-3,-.9),
     v(u-.02,r-3,-.9),.50,.7);
  }
  line("steel",T.black,chapter,[s-35,cl,7],[s+34,cl,cy+63],8.4,7.3);
  for(const side2 of [-1,1]){
   line("panel",T.steelBlue,chapter,[s-23,cl+side2*18,20],
    [s+19,cl+side2*9,cy+44],2.7,2.3);
   if(!lowMemory)
    line("core",T.white,chapter,[s+side2*5,cl-8,cy+23],
     [s+side2*5,cl-8,cy+37],.4,.5);
  }
 }
 // ACT I: two enormous side-orbit habitats plus three landmark sky-bridges.
 stationRing(278,-1,87,56);
 stationRing(787,1,97,64);
 for(const s of [118,420,730]){
  const c="orbital";
  ribs(s,[[-42,-4],[-42,19],[-32,35],[-19,45],[0,49],
   [19,45],[32,35],[42,19],[42,-4]],
   {chapter:c,width:3.1,depth:5.3});
  ribs(s-1.4,[[-28,37],[-18.5,44.6],[0,48.2],[18.5,44.6],[28,37]],
   {kind:"glow",tint:T.ice,chapter:c,width:.36,depth:.65});
  for(const side of [-1,1]){
   line("steel",T.plum,c,[s-22,side*42,4],
    [s+27,side*66,53],5.1,3.8);
   line("panel",T.steelBlue,c,[s-7,side*42,18],
    [s+20,side*51,41],1.25,1.4);
  }
 }
 // Broad floating dock decks, not yet another row of small posts.
 for(const s of [85,350,648,874]){
  for(const side of [-1,1]){
   line("steel",T.steel,"orbital",[s,side*63,-9],
    [s+72,side*63,-9],10,4);
   line("glow",T.blue,"orbital",[s+11,side*61,0],
    [s+61,side*61,0],.30,.6);
  }
 }
 // ACT II: sculpted, multi-layer station, enclosing the existing 0.18.0
 // vault sequence without repeating its 50m arch pattern.
 for(const s of [1055,1132,1514,1596]){
  const c="conduit";
  ribs(s,[[-38,-4],[-38,17],[-29,32],[-17,43],
   [0,49],[17,43],[29,32],[38,17],[38,-4]],
   {chapter:c,tint:T.plum,width:3.9,depth:5.8});
  ribs(s-1.5,[[-27,33],[-16,43.1],[0,48.3],[16,43.1],[27,33]],
   {kind:"glow",tint:T.rose,chapter:c,width:.46,depth:.7});
  for(const side of [-1,1]){
   line("steel",T.steel,c,[s-22,side*39,8],
    [s+32,side*46,53],6,4.5);
   line("panel",T.steelRose,c,[s-11,side*39,20],
    [s+22,side*44,43],1.5,1.8);
  }
 }
 // Huge side-wall silhouettes with open gaps so the course stays readable.
 for(let s=1090;s<1590;s+=100){
  for(const side of [-1,1]){
   const c="conduit";
   line("steel",T.black,c,[s,side*33,-10],
    [s+26,side*34,66],8.2,6.3);
   line("steel",T.plum,c,[s+26,side*34,66],
    [s+79,side*64,73],4.1,4.2);
   line("glow",T.rose,c,[s+2,side*28,13],
    [s+28,side*28,40],.47,.65);
   if(!lowMemory)
    line("panel",T.steelBlue,c,[s+18,side*36,49],
     [s+71,side*60,68],1.5,1.7);
  }
 }
 // Three suspended structural links around 50m above the drive line.
 for(const s of [1180,1355,1488]){
  line("steel",T.black,"conduit",
   [s-13,-44,57],[s+12,44,57],2.9,3.1);
  if(!lowMemory)
   line("core",T.white,"conduit",
    [s-14,-8,58.0],[s-14,8,58.0],.24,.3);
 }
 for(let s=1080;s<1580;s+=48)
  for(const side of [-1,1])
   line("glow",T.rose,"conduit",
    [s,side*16.5,5.7],[s+20,side*16.5,5.7],.30,.5);
 // ACT III: 2050–2810 is already a light-occluding SHADOW TUNNEL.
 // Exterior gothic-scale portals anchor its beginning and end.
 for(const s of [1990,2844]){
  const c="cathedral";
  ribs(s,[[-48,-3],[-48,24],[-34,46],[-17,60],
   [0,65],[17,60],[34,46],[48,24],[48,-3]],
   {chapter:c,tint:T.black,width:5.4,depth:7.5});
  ribs(s-1.7,[[-30,47],[-16.7,60.2],[0,64.3],
    [16.7,60.2],[30,47]],
   {kind:"glow",tint:T.gold,chapter:c,width:.40,depth:.68});
  for(const side of [-1,1]){
   line("steel",T.black,c,[s-15,side*56,-16],
    [s+24,side*55,100],8.6,7.4);
   line("panel",T.steelRose,c,[s+5,side*54,61],
    [s+14,side*54,88],1.6,1.9);
  }
 }
 // Internal cathedral rib geometry sits BELOW the exact old tunnel shell.
 // 13m minimum over-road clearance, 15.45m lateral outside live guardrails.
 // Avoid huge geometry outside the tunnel: it would be occluded by the shell.
 for(let i=0;i<7;i++){
  const s=2156+i*99,c="cathedral";
  const shape=[[-15.45,5],[-15.45,13.65],[-11.1,15.2],
   [-5.2,17.0],[0,17.72],[5.2,17.0],
   [11.1,15.2],[15.45,13.65],[15.45,5]];
  ribs(s,shape,{chapter:c,tint:T.black,width:1.42,depth:3.2});
  if(i%2===0){
   ribs(s-1.2,[[-15.45,13.65],[-11.1,15.10],[-5.2,16.93],
     [0,17.6],[5.2,16.93],[11.1,15.10],[15.45,13.65]],
    {chapter:c,kind:"glow",tint:T.gold,width:.28,depth:.40});
  }else{
   for(const side of [-1,1])
    line("glow",T.blue,c,[s-1.6,side*15.55,6.8],
     [s-1.6,side*15.55,13.2],.32,.5);
  }
  if(!lowMemory&&i===3)
   line("core",T.white,c,[s-2.1,-4.8,17.1],
    [s-2.1,4.8,17.1],.25,.35);
 }
 // Low memory drops detailed bright cores and ring illumination, but retains
 // every monumental silhouette, navigation-safe edges and tunnel chapter.
 const kinds=["steel","panel","glow","core"];
 const counts=Object.fromEntries(kinds.map(k=>[k,beams.filter(b=>b.kind===k).length]));
 return {active:true,beams,stats:{
  version:CFG.version,track,lowMemory,
  chapters:CFG.chapters.map(x=>({...x,beams:beams.filter(b=>b.chapter===x.id).length})),
  beams:beams.length,materials:counts,
  drawBatches:Object.values(counts).filter(x=>x>0).length,
  colliders:0,dynamicLights:0,renderPasses:0,
  physicsModule:CFG.activePhysics,classicFlag:CFG.classicFlag
 }};
}
function batch(THREE,root,kind,beams,material,positionAt){
 if(!beams.length)return null;
 const mesh=new THREE.InstancedMesh(
  new THREE.BoxGeometry(1,1,1),material,beams.length);
 mesh.name="Cinematic World 0.19 · "+kind;
 const v1=new THREE.Vector3(),v2=new THREE.Vector3(),
  dir=new THREE.Vector3(),center=new THREE.Vector3(),
  axis=new THREE.Vector3(0,1,0),q=new THREE.Quaternion(),
  scale=new THREE.Vector3(),mat4=new THREE.Matrix4(),
  color=new THREE.Color();
 for(let i=0;i<beams.length;i++){
  const beam=beams[i],a=positionAt(...beam.a),b=positionAt(...beam.b);
  v1.set(a.x,a.y,a.z);v2.set(b.x,b.y,b.z);
  dir.subVectors(v2,v1);
  const d=dir.length();
  if(!Number.isFinite(d)||d<0.005)throw Error("Degenerate world beam");
  center.addVectors(v1,v2).multiplyScalar(.5);
  q.setFromUnitVectors(axis,dir.multiplyScalar(1/d));
  scale.set(beam.width,d,beam.depth);
  mat4.compose(center,q,scale);
  mesh.setMatrixAt(i,mat4);
  color.setHex(beam.tint);
  if(kind==="glow")color.multiplyScalar(1.72);
  if(kind==="core")color.multiplyScalar(2.08);
  mesh.setColorAt(i,color);
 }
 mesh.instanceMatrix.needsUpdate=true;
 if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 mesh.computeBoundingSphere();
 mesh.frustumCulled=true;mesh.castShadow=false;mesh.receiveShadow=false;
 root.add(mesh);
 return mesh;
}
export function installCinematicWorld(THREE,world,{
 track="skyline",lowMemory=false,positionAt
}={}){
 if(!THREE||!world||typeof positionAt!=="function")
  throw Error("0.19.0 requires a scene group and original positionAt");
 const plan=worldArchitecturePlan({track,lowMemory});
 if(!plan.active)return {
  active:false,stats(){return {...plan.stats,active:false}},dispose(){}
 };
 const group=new THREE.Group();
 group.name="Cinematic World Rebuild 0.19.0";
 const materials={
  steel:new THREE.MeshStandardMaterial({
   color:0xffffff,metalness:.68,roughness:.41,side:THREE.DoubleSide
  }),
  panel:new THREE.MeshStandardMaterial({
   color:0xffffff,metalness:.47,roughness:.35,
   emissive:0x061422,emissiveIntensity:.28,side:THREE.DoubleSide
  }),
  glow:new THREE.MeshBasicMaterial({
   color:0xffffff,toneMapped:false,side:THREE.DoubleSide
  }),
  core:new THREE.MeshBasicMaterial({
   color:0xffffff,toneMapped:false,side:THREE.DoubleSide
  })
 };
 const meshes=[];
 for(const kind of ["steel","panel","glow","core"]){
  const m=batch(THREE,group,kind,
   plan.beams.filter(x=>x.kind===kind),materials[kind],positionAt);
  if(m)meshes.push(m);
 }
 world.add(group);
 return {
  active:true,
  stats(){return {...plan.stats,active:true,
   actualDrawBatches:meshes.length,parentedToWorld:group.parent===world,
   meshCounts:meshes.map(x=>({kind:x.name,instances:x.count}))}},
  dispose(){
   group.removeFromParent();
   for(const mesh of meshes)mesh.geometry.dispose();
   for(const m of Object.values(materials))m.dispose();
  }
 };
}
