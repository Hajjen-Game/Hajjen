// SKYSHIFT 0.10.3 — Premium Ship Readability. Four batched
// display-only overlays: bevel-like shoulder facets, recessed channels,
// slim luminous seam network, and dual engine halos. No textures, no
// extra lights, no physics. Uses original Manta/Stingray engine sockets.
export const SHIP_POLISH=Object.freeze({
 version:"premium-ship-readability-0103",
 visualOnly:true,addedLights:0,addedParticles:0,addedPasses:0,
 maxAdditionalDrawCalls:4,
 materials:["satin-armour","dark-recess","cool-seam","engine-bezel"]
});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const surface={armor:[],recess:[],seam:[],bezel:[]};
function quad(out,a,b,c,d){
 out.push(...a,...b,...c,...a,...c,...d);
}
function edgeStrip(out,a,b,width){
 const [ax,ay,az]=a,[bx,by,bz]=b;
 const dx=bx-ax,dz=bz-az,length=Math.hypot(dx,dz)||1;
 const px=-dz/length*width*.5,pz=dx/length*width*.5;
 quad(out,[ax+px,ay,az+pz],[ax-px,ay,az-pz],
  [bx-px,by,bz-pz],[bx+px,by,bz+pz]);
}
function mirrored(out,points){
 for(const sign of [-1,1])quad(out,
  ...points.map(([x,y,z])=>[x*sign,y,z]));
}
function ring(out,x,y,z,r1,r2,segments=12){
 for(let i=0;i<segments;i++){
  const a=2*Math.PI*i/segments,b=2*Math.PI*(i+1)/segments;
  quad(out,
   [x+Math.cos(a)*r1,y+Math.sin(a)*r1,z],
   [x+Math.cos(a)*r2,y+Math.sin(a)*r2,z],
   [x+Math.cos(b)*r2,y+Math.sin(b)*r2,z],
   [x+Math.cos(b)*r1,y+Math.sin(b)*r1,z]);
 }
}
function mesh(THREE,verts,mat,name){
 const geo=new THREE.BufferGeometry();
 geo.setAttribute("position",new THREE.Float32BufferAttribute(verts,3));
 geo.computeVertexNormals();
 geo.computeBoundingSphere();
 const item=new THREE.Mesh(geo,mat);
 item.name=name;
 item.frustumCulled=true;
 item.renderOrder=2;
 return item;
}
export function buildShipPolish(THREE,ship,{variant="stingray",engineSockets=[]}={}){
 if(!ship||!Array.isArray(engineSockets)||engineSockets.length!==2)
  throw Error("Ship polish requires a ship and two real engine sockets");
 const shapes={armor:[],recess:[],seam:[],bezel:[]};
 const stingray=variant==="stingray";
 // Faceted wing shoulders give readable lit planes even at gameplay zoom.
 mirrored(shapes.armor,[
  [.72,.324,-1.64],[1.13,.322,-1.59],
  [1.95,.302,-.69],[1.53,.320,-.88]
 ]);
 mirrored(shapes.armor,[
  [1.29,.303,-.42],[1.77,.285,-.18],
  [2.13,.266,.70],[1.74,.287,.64]
 ]);
 // Recessed darker aero channels shape the broad top surface.
 mirrored(shapes.recess,[
  [1.05,.346,-1.18],[1.26,.345,-1.06],
  [1.89,.335,-.22],[1.68,.337,-.37]
 ]);
 mirrored(shapes.recess,[
  [1.59,.332,.27],[1.76,.335,.29],
  [2.08,.302,1.12],[1.91,.305,.99]
 ]);
 // A fine, restrained highlight runs along the forward wing silhouette.
 for(const sign of [-1,1]){
  const s=sign;
  const trace=[
   [.65,.352,-1.92],[1.24,.347,-1.77],
   [1.92,.322,-1.31],[2.55,.283,-.83],[2.94,.267,-.33]
  ];
  for(let i=0;i<trace.length-1;i++)
   edgeStrip(shapes.seam,trace[i].map((v,j)=>j===0?v*s:v),
    trace[i+1].map((v,j)=>j===0?v*s:v),.023);
  // Paired short wing vents appear as real geometry rather than bloom noise.
  for(let i=0;i<3;i++)
   edgeStrip(shapes.seam,[s*(1.58+i*.19),.353-i*.009,.11+i*.095],
    [s*(1.73+i*.19),.350-i*.009,.16+i*.095],.036);
  // Cockpit shoulders read as two distinct metallic flanks.
  edgeStrip(shapes.seam,[s*.37,.632,-1.31],[s*.38,.634,-.61],.020);
 }
 for(const socket of engineSockets){
  // Thin metal nozzle ring plus a luminous lip. Both original thrusters
  // stay in exactly the same physical locations.
  ring(shapes.bezel,socket.x,socket.y,socket.z-.005,.248,.308,14);
  ring(shapes.seam,socket.x,socket.y,socket.z+.008,.237,.253,14);
 }
 // A shortened light path on the fuselage helps it read as a single hull.
 edgeStrip(shapes.seam,[0,.373,.56],[0,.319,1.16],.045);
 const armorMat=new THREE.MeshPhysicalMaterial({
  color:stingray?0x9caed0:0xa2d2dd,metalness:.55,roughness:.24,
  clearcoat:.72,clearcoatRoughness:.18,side:THREE.DoubleSide,
  flatShading:true
 });
 const recessMat=new THREE.MeshStandardMaterial({
  color:stingray?0x17233c:0x19334a,
  metalness:.48,roughness:.52,side:THREE.DoubleSide
 });
 const seamMat=new THREE.MeshBasicMaterial({
  color:stingray?0xa5d9ff:0xaff7f4,
  toneMapped:false,side:THREE.DoubleSide,depthWrite:false
 });
 const bezelMat=new THREE.MeshPhysicalMaterial({
  color:stingray?0x64718c:0x66899c,
  metalness:.82,roughness:.28,clearcoat:.62,
  side:THREE.DoubleSide
 });
 const surfaces=[
  mesh(THREE,shapes.armor,armorMat,"Premium bevelled shoulder armour"),
  mesh(THREE,shapes.recess,recessMat,"Premium twin recessed aero channels"),
  mesh(THREE,shapes.seam,seamMat,"Premium wing seams and two glowing thruster rings"),
  mesh(THREE,shapes.bezel,bezelMat,"Premium twin engine metal bezels")
 ];
 for(const part of surfaces)ship.add(part);
 const baseColor=seamMat.color.clone();
 let phase=0,peakGlow=0,updates=0;
 return {
  surfaces,materials:{armor:armorMat,recess:recessMat,
   seam:seamMat,bezel:bezelMat},
  frame(dt,view={}){
   if(dt<=0)return;
   phase+=Math.min(.075,dt);
   const grip=clamp(view.gripIntensity||0,0,1);
   const boost=clamp(((view.boostMultiplier||1)-1)/.4,0,1);
   const velocity=clamp(((view.speed||44)-44)/135,0,1);
   const shimmer=.93+.045*Math.sin(phase*2.9);
   const glow=shimmer+.13*boost+.06*grip+.04*velocity;
   seamMat.color.copy(baseColor).multiplyScalar(glow);
   peakGlow=Math.max(peakGlow,glow);
   updates++;
  },
  reset(){
   phase=0;peakGlow=0;updates=0;
   seamMat.color.copy(baseColor);
  },
  stats(){
   return {version:SHIP_POLISH.version,variant,
    extraDrawCalls:surfaces.length,additionalLights:0,
    peakGlow:+peakGlow.toFixed(3),updates,physicsChanged:false};
  }
 };
}
