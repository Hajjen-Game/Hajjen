// SKYSHIFT 0.4.8.3 — MANTA BLADE, the signature antigravity racer.
// An original manta-shaped delta craft: wide uninterrupted wing blades,
// scalloped open trailing center, two inset wing-thrusters and no jet tail.
// Geometry is generated ONCE and only affects rendering, never the flight state.
export const MANTA_IDENTITY=Object.freeze({
 name:"Manta Blade",type:"low-profile delta manta",
 version:"0.4.8.3",visualBeamMeters:5.80,
 wingLobes:2,thrusters:2,openTrailingCenter:true,
 newDynamicLights:0,changesFlightPhysics:false,
 materials:"pearl titanium, storm graphite, deep teal canopy, ice-blue accents",
 maxGeometryTriangles:650
});
export const MANTA_SPINE=Object.freeze([
 {z:-2.95,width:.055,top:.055,bottom:-.09},
 {z:-2.53,width:.32,top:.17,bottom:-.16},
 {z:-1.96,width:.52,top:.28,bottom:-.20},
 {z:-1.30,width:.67,top:.34,bottom:-.22},
 {z:-.54,width:.72,top:.35,bottom:-.24},
 {z:.30,width:.64,top:.30,bottom:-.21},
 {z:.90,width:.48,top:.22,bottom:-.18},
 {z:1.36,width:.23,top:.105,bottom:-.12}
]);
export const MANTA_WING_OUTLINE=Object.freeze([
 [.41,-1.91],[1.02,-1.86],[1.78,-1.34],[2.48,-.78],
 [2.90,-.12],[2.82,.69],[2.52,1.72],[2.04,2.62],
 [1.70,2.40],[1.34,1.57],[.92,.93],[.45,.48]
]);
export const MANTA_CANOPY=Object.freeze([
 {z:-1.93,width:.075,rise:.055},
 {z:-1.59,width:.235,rise:.20},
 {z:-1.11,width:.32,rise:.32},
 {z:-.51,width:.30,rise:.34},
 {z:.05,width:.24,rise:.21},
 {z:.42,width:.07,rise:.06}
]);
const EPS=1e-9;
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-
 (b[1]-a[1])*(c[0]-a[0]);
const area2=points=>points.reduce((sum,p,i)=>{
 const q=points[(i+1)%points.length];
 return sum+p[0]*q[1]-q[0]*p[1];
},0);
const inTriangle=(p,a,b,c,orientation)=>{
 const u=orientation*cross(a,b,p),v=orientation*cross(b,c,p),
   w=orientation*cross(c,a,p);
 return u>=-EPS&&v>=-EPS&&w>=-EPS;
};
// Small deterministic ear clip for concave manta contours, no external deps.
export function triangulateWing(outline){
 const n=outline.length,orientation=Math.sign(area2(outline));
 if(n<3||!orientation)throw new Error("Invalid Manta wing outline");
 const remaining=Array.from({length:n},(_,i)=>i),triangles=[];
 let safety=0;
 while(remaining.length>3){
  let found=false;
  for(let k=0;k<remaining.length;k++){
   const a=remaining[(k-1+remaining.length)%remaining.length];
   const b=remaining[k],c=remaining[(k+1)%remaining.length];
   if(orientation*cross(outline[a],outline[b],outline[c])<=EPS)continue;
   if(remaining.some(j=>j!==a&&j!==b&&j!==c&&
     inTriangle(outline[j],outline[a],outline[b],outline[c],orientation)))
    continue;
   triangles.push([a,b,c]);remaining.splice(k,1);found=true;break;
  }
  if(!found||++safety>n*n)throw new Error("Non-simple Manta wing contour");
 }
 triangles.push(remaining);
 return {triangles,orientation};
}
const fresh=()=>({positions:[],indices:[],triangles:0});
function closeGeometry(g){
 g.triangles=g.indices.length/3;
 return g;
}
export function buildMantaSpine(){
 const result=fresh(),ring=10;
 for(const crossSection of MANTA_SPINE){
  const mid=(crossSection.top+crossSection.bottom)/2;
  const yRadius=(crossSection.top-crossSection.bottom)/2;
  for(let i=0;i<ring;i++){
   const angle=2*Math.PI*i/ring;
   result.positions.push(
    Math.sin(angle)*crossSection.width,
    mid+Math.cos(angle)*yRadius,crossSection.z);
  }
 }
 for(let r=0;r<MANTA_SPINE.length-1;r++)
  for(let j=0;j<ring;j++){
   const a=r*ring+j,b=r*ring+(j+1)%ring,c=b+ring,d=a+ring;
   result.indices.push(a,b,c,a,c,d);
  }
 for(let j=1;j<ring-1;j++){
  result.indices.push(0,j+1,j);
  const tail=(MANTA_SPINE.length-1)*ring;
  result.indices.push(tail,tail+j,tail+j+1);
 }
 return closeGeometry(result);
}
const wingTop=(x,z)=>.165+.11*(1-Math.min(Math.abs(x)/2.9,1))
  +.018*(1-Math.min(Math.abs(z)/2.7,1));
export function buildMantaWings(){
 const g=fresh(),n=MANTA_WING_OUTLINE.length;
 for(const sign of [-1,1]){
  const base=g.positions.length/3;
  const outline=MANTA_WING_OUTLINE.map(([x,z])=>[sign*x,z]);
  const {triangles,orientation}=triangulateWing(outline);
  for(const lower of [false,true])
   for(const [x,z] of outline)g.positions.push(x,wingTop(x,z)-(lower?.18:0),z);
  // Top faces toward the camera (+Y); lower faces point downward.
  for(const [a,b,c] of triangles){
   if(orientation>0){
    g.indices.push(base+a,base+c,base+b);
    g.indices.push(base+n+a,base+n+b,base+n+c);
   }else{
    g.indices.push(base+a,base+b,base+c);
    g.indices.push(base+n+a,base+n+c,base+n+b);
   }
  }
  for(let j=0;j<n;j++){
   const k=(j+1)%n;
   g.indices.push(base+j,base+k,base+n+k,
    base+j,base+n+k,base+n+j);
  }
 }
 return closeGeometry(g);
}
export function buildMantaCanopy(){
 const g=fresh(),columns=9;
 for(const station of MANTA_CANOPY)
  for(let j=0;j<columns;j++){
   const t=j/(columns-1),x=station.width*(t*2-1);
   const dome=Math.pow(Math.sin(t*Math.PI),.72)*station.rise;
   g.positions.push(x,.275+dome,station.z);
  }
 for(let r=0;r<MANTA_CANOPY.length-1;r++)
  for(let j=0;j<columns-1;j++){
   const a=r*columns+j,b=a+1,c=b+columns,d=a+columns;
   g.indices.push(a,b,c,a,c,d);
  }
 return closeGeometry(g);
}
function geometry(THREE,data){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(data.positions,3));
 g.setIndex(data.indices);g.computeVertexNormals();g.computeBoundingSphere();
 return g;
}
const panel=(THREE,p)=>geometry(THREE,{
 positions:p.flat(),indices:[0,1,2,0,2,3]
});
function mirroredQuad(THREE,group,material,name,coords){
 for(const side of [-1,1]){
  const mesh=new THREE.Mesh(panel(THREE,
   coords.map(([x,y,z])=>[side*x,y,z])),material);
  mesh.name=name;group.add(mesh);
 }
}
export function buildMantaBlade(THREE,existingShipGlow){
 const ship=new THREE.Group();
 ship.name="Manta Blade · split-scallop antigravity shell";
 const titanium=new THREE.MeshPhysicalMaterial({
  color:0xaac8d3,metalness:.72,roughness:.32,
  clearcoat:.65,clearcoatRoughness:.19,side:THREE.DoubleSide
 });
 const wings=new THREE.MeshPhysicalMaterial({
  color:0x799eac,metalness:.73,roughness:.33,
  clearcoat:.58,clearcoatRoughness:.23,side:THREE.DoubleSide
 });
 const graphite=new THREE.MeshPhysicalMaterial({
  color:0x14273a,metalness:.62,roughness:.38,
  clearcoat:.27,clearcoatRoughness:.25,side:THREE.DoubleSide
 });
 const glass=new THREE.MeshPhysicalMaterial({
  color:0x06334a,metalness:.22,roughness:.17,
  clearcoat:.95,clearcoatRoughness:.08,
  emissive:0x072436,emissiveIntensity:.19,side:THREE.DoubleSide
 });
 const cyan=new THREE.MeshBasicMaterial({
  color:0x82ced7,transparent:true,opacity:.63,
  toneMapped:true,side:THREE.DoubleSide
 });
 const turbine=new THREE.MeshStandardMaterial({
  color:0x0b1725,metalness:.81,roughness:.31,side:THREE.DoubleSide
 });
 const spineData=buildMantaSpine(),wingData=buildMantaWings(),
  canopyData=buildMantaCanopy();
 const center=new THREE.Mesh(geometry(THREE,spineData),titanium);
 center.name="Compact central manta spine";ship.add(center);
 const delta=new THREE.Mesh(geometry(THREE,wingData),wings);
 delta.name="Two broad scalloped manta wings";ship.add(delta);
 const cockpit=new THREE.Mesh(geometry(THREE,canopyData),glass);
 cockpit.name="Low integrated teardrop canopy";ship.add(cockpit);
 // Two broad recessed graphite sweeps reinforce the silhouette.
 mirroredQuad(THREE,ship,graphite,"Inset swept dorsal wing channels",[
  [.89,.286,-.94],[1.42,.263,-.56],
  [1.86,.247,.73],[1.36,.261,.50]
 ]);
 // Short near-tip glints—not dangling neon spikes.
 mirroredQuad(THREE,ship,cyan,"Manta blade tip luminescence",[
  [2.56,.222,.11],[2.67,.219,.19],
  [2.43,.221,.97],[2.33,.222,.88]
 ]);
 const enginePlumes=[];
 for(const side of [-1,1]){
  // Lens housings sit INSIDE the two extended aft wing lobes.
  const nacelle=new THREE.Mesh(
   new THREE.CylinderGeometry(.245,.27,.60,10,1),turbine);
  nacelle.rotation.x=Math.PI/2;
  nacelle.position.set(side*1.99,.035,2.12);
  nacelle.name="Wing-integrated venturi thruster";
  ship.add(nacelle);
  const aperture=new THREE.Mesh(
   new THREE.CylinderGeometry(.170,.170,.085,12,1),existingShipGlow);
  aperture.rotation.x=Math.PI/2;
  aperture.position.set(side*1.99,.035,2.46);
  aperture.name="Inset wing thrust aperture";
  ship.add(aperture);enginePlumes.push(aperture);
 }
 // A narrow luminous keel, not a THIRD oversized circular rear engine.
 const engineCore=new THREE.Mesh(
  new THREE.BoxGeometry(.11,.07,.43),existingShipGlow);
 engineCore.position.set(0,-.08,1.15);
 engineCore.name="Recessed central ion keel";ship.add(engineCore);
 return {ship,enginePlumes,engineCore,spec:MANTA_IDENTITY,
  materials:{titanium,wings,graphite,glass,cyan,turbine},
  triangles:spineData.triangles+wingData.triangles+canopyData.triangles};
}
