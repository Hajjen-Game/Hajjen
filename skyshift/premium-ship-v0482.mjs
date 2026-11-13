// SKYSHIFT 0.4.8.2 — Premium Ship Identity.
// A purpose-built compact racing hull, rather than box/cone body plus stickers.
// Existing pilot world physics, banking, hover, cockpit camera and engine light
// controller are untouched: this module only builds static presentation meshes.
export const CRAFT_IDENTITY=Object.freeze({
 name:"Astra Needle",
 visualLengthMeters:5.55,
 visualBeamMeters:5.85,
 bodyRings:8,
 wingSections:2,
 propulsionPods:2,
 extraDynamicLights:0,
 palette:"satin ice titanium, deep graphite, cyan engine cores",
 primaryMaterial:"satin titanium alloy",
 materialCount:6,
 geometryBudgetTriangles:600,
 physicsChanged:false
});
export const HULL_SECTIONS=Object.freeze([
 Object.freeze({z:-3.05,width:.035,height:.055,centerY:.035}),
 Object.freeze({z:-2.70,width:.28,height:.12,centerY:.04}),
 Object.freeze({z:-2.12,width:.56,height:.23,centerY:.055}),
 Object.freeze({z:-1.34,width:.73,height:.30,centerY:.07}),
 Object.freeze({z:-.35,width:.81,height:.32,centerY:.075}),
 Object.freeze({z:.67,width:.86,height:.31,centerY:.05}),
 Object.freeze({z:1.52,width:.74,height:.25,centerY:.025}),
 Object.freeze({z:2.36,width:.46,height:.17,centerY:0})
]);
const RING_POINTS=10;
function meshGeometry(THREE,positions,indices){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 geometry.computeBoundingSphere();
 return geometry;
}
export function buildStreamlinedHull(){
 const positions=[],indices=[];
 for(const section of HULL_SECTIONS){
  for(let i=0;i<RING_POINTS;i++){
   const angle=i/RING_POINTS*Math.PI*2;
   positions.push(
    Math.sin(angle)*section.width,
    section.centerY+Math.cos(angle)*section.height,
    section.z
   );
  }
 }
 for(let row=0;row<HULL_SECTIONS.length-1;row++){
  for(let j=0;j<RING_POINTS;j++){
   const next=(j+1)%RING_POINTS;
   const a=row*RING_POINTS+j,b=row*RING_POINTS+next;
   const c=(row+1)*RING_POINTS+next,d=(row+1)*RING_POINTS+j;
   indices.push(a,b,c,a,c,d);
  }
 }
 // Closed aerodynamic hull with narrow nose and clean rear closure.
 for(let j=1;j<RING_POINTS-1;j++){
  indices.push(0,j+1,j);
  const last=(HULL_SECTIONS.length-1)*RING_POINTS;
  indices.push(last,last+j,last+j+1);
 }
 return {positions,indices,vertices:positions.length/3,triangles:indices.length/3};
}
const WING_OUTLINE=Object.freeze([
 Object.freeze([.61,.18,-1.50]),
 Object.freeze([1.21,.12,-.95]),
 Object.freeze([2.93,.08,.67]),
 Object.freeze([2.64,.10,1.86]),
 Object.freeze([1.41,.14,1.33]),
 Object.freeze([.69,.18,.71])
]);
export function buildSweptWings(){
 const positions=[],indices=[],n=WING_OUTLINE.length;
 for(const side of [-1,1]){
  const base=positions.length/3;
  for(const underside of [false,true]){
   for(const [x,y,z] of WING_OUTLINE)
    positions.push(side*x,y-(underside?.17:0),z);
  }
  for(let k=1;k<n-1;k++){
   indices.push(base,base+k,base+k+1);
   indices.push(base+n,base+n+k+1,base+n+k);
  }
  for(let k=0;k<n;k++){
   const j=(k+1)%n;
   indices.push(base+k,base+j,base+n+j,
    base+k,base+n+j,base+n+k);
  }
 }
 return {positions,indices,vertices:positions.length/3,triangles:indices.length/3};
}
export const CANOPY_STATIONS=Object.freeze([
 Object.freeze({z:-1.76,width:.08,rise:.055}),
 Object.freeze({z:-1.40,width:.30,rise:.23}),
 Object.freeze({z:-.85,width:.44,rise:.39}),
 Object.freeze({z:-.14,width:.43,rise:.42}),
 Object.freeze({z:.43,width:.31,rise:.26}),
 Object.freeze({z:.78,width:.06,rise:.065})
]);
export function buildCanopyShell(){
 const positions=[],indices=[],across=9;
 for(const station of CANOPY_STATIONS){
  for(let k=0;k<across;k++){
   const u=k/(across-1);
   const x=(u*2-1)*station.width;
   // A faceted rising glass canopy shaped by the shell, not a glass box.
   const rise=station.rise*Math.pow(Math.sin(u*Math.PI),.70);
   positions.push(x,.32+rise,station.z);
  }
 }
 for(let row=0;row<CANOPY_STATIONS.length-1;row++){
  for(let k=0;k<across-1;k++){
   const a=row*across+k,b=a+1,c=b+across,d=a+across;
   indices.push(a,b,c,a,c,d);
  }
 }
 return {positions,indices,triangles:indices.length/3};
}
function quadGeometry(THREE,vertices){
 const coords=[];
 for(const vertex of vertices)coords.push(...vertex);
 return meshGeometry(THREE,coords,[0,1,2,0,2,3]);
}
function addReflectiveDeckDetail(THREE,group,material){
 // Slim recessed integrated shoulder accents, never long decorative spikes.
 for(const side of [-1,1]){
  const q=(x,y,z)=>[side*x,y,z];
  const insert=new THREE.Mesh(quadGeometry(THREE,[
   q(.92,.185,-.52),q(1.86,.125,.40),
   q(1.74,.153,.88),q(.96,.196,.18)
  ]),material);
  insert.name="Integrated graphite shoulder channel";
  group.add(insert);
 }
}
export function buildPremiumShip(THREE,shipGlow){
 const ship=new THREE.Group();
 ship.name="Astra Needle · premium flight shell";
 const titanium=new THREE.MeshPhysicalMaterial({
  color:0xb6cbd5,metalness:.76,roughness:.28,
  clearcoat:.74,clearcoatRoughness:.18,side:THREE.DoubleSide
 });
 const wingFinish=new THREE.MeshPhysicalMaterial({
  color:0x8caabb,metalness:.72,roughness:.34,
  clearcoat:.62,clearcoatRoughness:.2,side:THREE.DoubleSide
 });
 const graphite=new THREE.MeshPhysicalMaterial({
  color:0x14263c,metalness:.67,roughness:.35,
  clearcoat:.38,clearcoatRoughness:.21,side:THREE.DoubleSide
 });
 const canopy=new THREE.MeshPhysicalMaterial({
  color:0x0b344e,metalness:.30,roughness:.14,
  clearcoat:1,clearcoatRoughness:.07,
  emissive:0x092136,emissiveIntensity:.22,side:THREE.DoubleSide
 });
 const edgeGlint=new THREE.MeshBasicMaterial({color:0x86d7df,
  transparent:true,opacity:.7,toneMapped:true,side:THREE.DoubleSide});
 const coreDark=new THREE.MeshStandardMaterial({
  color:0x091a2d,metalness:.82,roughness:.29,side:THREE.DoubleSide
 });
 const hullData=buildStreamlinedHull();
 const body=new THREE.Mesh(meshGeometry(THREE,
  hullData.positions,hullData.indices),titanium);
 body.name="Contiguous aerodynamic center hull";ship.add(body);
 const wingData=buildSweptWings();
 const wing=new THREE.Mesh(meshGeometry(THREE,wingData.positions,wingData.indices),wingFinish);
 wing.name="Swept thick structural wings";ship.add(wing);
 const glassData=buildCanopyShell();
 const glass=new THREE.Mesh(meshGeometry(THREE,glassData.positions,glassData.indices),canopy);
 glass.name="Sculpted tinted canopy";ship.add(glass);
 addReflectiveDeckDetail(THREE,ship,graphite);
 // Mechanical nacelles are distinct housings, with small recessed exhausts,
 // rather than floating rectangular neon blocks.
 const enginePlumes=[];
 for(const side of [-1,1]){
  const body=new THREE.Mesh(new THREE.CylinderGeometry(.36,.31,1.04,10,1),
   coreDark);
  body.rotation.x=Math.PI/2;
  body.position.set(side*1.06,-.035,1.73);
  body.name="Tapered turbine nacelle";ship.add(body);
  const exhaust=new THREE.Mesh(new THREE.CylinderGeometry(.205,.205,.09,12),shipGlow);
  exhaust.rotation.x=Math.PI/2;
  exhaust.position.set(side*1.06,-.035,2.28);
  exhaust.name="Recessed engine core";ship.add(exhaust);
  enginePlumes.push(exhaust);
  const trim=new THREE.Mesh(quadGeometry(THREE,[
   [side*2.65,.113,.76],[side*2.77,.118,.83],
   [side*2.54,.135,1.56],[side*2.43,.135,1.52]
  ]),edgeGlint);
  trim.name="Short outer wing tip glint";ship.add(trim);
 }
 const engineCore=new THREE.Mesh(new THREE.CylinderGeometry(.275,.275,.12,12),
  shipGlow);
 engineCore.rotation.x=Math.PI/2;
 engineCore.position.set(0,-.075,2.35);
 engineCore.name="Central engine bridge";ship.add(engineCore);
 const badge=new THREE.Mesh(quadGeometry(THREE,[
  [-.115,.375,-2.05],[.115,.375,-2.05],
  [.16,.384,-1.74],[-.16,.384,-1.74]
 ]),graphite);
 badge.name="Recessed nose identity";ship.add(badge);
 return {ship,enginePlumes,engineCore,materials:{
  titanium,wingFinish,graphite,canopy,edgeGlint,coreDark
 },spec:CRAFT_IDENTITY};
}
