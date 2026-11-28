// SKYSHIFT 0.29.5 — sculpted graphite Manta, one real model for race/hangar.
// Keep physical envelope, engine sockets, engine animation and flap mounts.
import {MANTA_IDENTITY,MANTA_WING_OUTLINE,ENGINE_SOCKETS,buildMantaSpine,buildMantaCanopy,triangulateWing} from "./manta-blade-v0484.mjs";
export const MANTA_REBIRTH=Object.freeze({...MANTA_IDENTITY,version:"0.29.5",maxGeometryTriangles:1800,
 materials:"graphite ceramic-metal, titanium chamfers, smoked canopy, precision cyan inlays",
 sculptedWings:true,recessedChannels:true,engineHousings:2,addedLights:0,addedTextures:0,addedPasses:0,physicsChanged:false});
const quad=(out,a,b,c,d)=>out.push(...a,...b,...c,...a,...c,...d);
const tri=(out,a,b,c)=>out.push(...a,...b,...c);
function triangleData(data,shape=(x,y,z)=>[x,y,z]){
 const out=[];for(const i of data.indices){const j=i*3;out.push(...shape(data.positions[j],data.positions[j+1],data.positions[j+2]));}return out;
}
// An actual bevelled shell, not a flat top with extra plates. Three cross
// section rings: outer edge, inset shoulder, lower return. The inner top
// is triangulated, the aft flap mounting region stays below y=.276.
export function mantaWingSurfaces(){
 const result={top:[],bevel:[],underside:[],topFaces:[]};
 const contour=MANTA_WING_OUTLINE,n=contour.length;
 const {triangles,orientation}=triangulateWing(contour);
 const yTop=(x,z)=>z>.25?.232+.018*(1-Math.min(x/2.9,1)):.265+.075*(1-Math.min(x/2.9,1));
 const center=[1.58,.12];
 for(const sign of [-1,1]){
  const outer=contour.map(([x,z])=>[sign*x,.145,z]);
  const shoulder=contour.map(([x,z])=>{const a=center[0]+(x-center[0])*.88,b=center[1]+(z-center[1])*.88;return [sign*a,yTop(a,b),b];});
  const bottom=contour.map(([x,z])=>[sign*(center[0]+(x-center[0])*.97),-.082,center[1]+(z-center[1])*.97]);
  const topTri=(a,b,c)=>{const v=[a,b,c];if(sign*orientation>0)v.reverse();tri(result.top,...v);result.topFaces.push(v);};
  for(const [a,b,c] of triangles){
   topTri(shoulder[a],shoulder[b],shoulder[c]);
   const v=[bottom[a],bottom[b],bottom[c]];if(sign*orientation<0)v.reverse();tri(result.underside,...v);
  }
  for(let i=0;i<n;i++){
   const j=(i+1)%n;
   const face=[outer[i],outer[j],shoulder[j],shoulder[i]];
   if(sign*orientation>0)face.reverse();
   quad(result.bevel,...face);
   result.topFaces.push([face[0],face[1],face[2]],[face[0],face[2],face[3]]);
   const lower=[bottom[i],bottom[j],outer[j],outer[i]];
   if(sign*orientation>0)lower.reverse();quad(result.underside,...lower);
  }
 }
 return result;
}
function surfaceY(faces,x,z){
 for(const [a,b,c] of faces){
  const denominator=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);
  if(Math.abs(denominator)<1e-8)continue;
  const u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/denominator;
  const v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/denominator;
  const w=1-u-v;if(Math.min(u,v,w)>=-1e-6)return u*a[1]+v*b[1]+w*c[1];
 }return null;
}
function strip(out,faces,points,width,lift=.006){
 for(let j=1;j<points.length;j++){
  const a=points[j-1],b=points[j],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz);
  if(len<1e-6)continue;
  const px=-dz/len*width*.5,pz=dx/len*width*.5;
  // Conform to the actual facets, split long paths into small pieces.
  const steps=Math.ceil(len/.09);
  for(let i=0;i<steps;i++){
   const point=(t,sign)=>{const x=a[0]+dx*t+px*sign,z=a[1]+dz*t+pz*sign,y=surfaceY(faces,x,z);return y===null?null:[x,y+lift,z];};
   const v=[point(i/steps,1),point(i/steps,-1),point((i+1)/steps,-1),point((i+1)/steps,1)];
   if(v.every(Boolean))quad(out,...v);
  }
 }
}
function ring(out,socket,r0,z0,r1,z1,n=14){
 for(let i=0;i<n;i++){
  const at=(r,z,a)=>[socket.x+r*Math.cos(a),socket.y+r*Math.sin(a),z];
  const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n;
  quad(out,at(r0,z0,a),at(r0,z0,b),at(r1,z1,b),at(r1,z1,a));
 }
}
export function buildMantaRebirthData(){
 const wings=mantaWingSurfaces(),armor=[...wings.top],bevel=[...wings.bevel],dark=[...wings.underside],inlay=[],nozzle=[],glass=triangleData(buildMantaCanopy(),(x,y,z)=>[x*.98,y+.018,z]);
 armor.push(...triangleData(buildMantaSpine(),(x,y,z)=>[x*(z>-.5?1.06:1),y>0?y+.065*Math.max(0,1-Math.abs(z-.35)/1.7):y,z]));
 for(const side of [-1,1]){
  const path=p=>p.map(([x,z])=>[side*x,z]);
  // Dark channel bed then fine luminous line slightly inside the edge.
  const leading=path([[.79,-1.92],[1.35,-1.71],[2.01,-1.25],[2.58,-.80],[2.77,-.50]]);
  strip(dark,wings.topFaces,leading,.105,.004);
  strip(inlay,wings.topFaces,leading,.028,.009);
  const channel=path([[.94,-1.15],[1.42,-.75],[1.67,-.26],[1.90,.17]]);
  strip(dark,wings.topFaces,channel,.13,.004);
  // Three short restrained vents leave the mechanical elevon unobstructed.
  for(let i=0;i<3;i++)strip(dark,wings.topFaces,path([[1.25+i*.18,-.34+i*.12],[1.47+i*.18,-.26+i*.12]]),.055,.006);
  strip(inlay,wings.topFaces,path([[2.53,-.18],[2.46,.13],[2.36,.40]]),.032,.009);
  const s=ENGINE_SOCKETS.find(v=>Math.sign(v.x)===side);
  // A sculpted venturi with a real recessed bore, chamfer, ring and dark
  // inner wall. No extra light: the existing animated exhaust is inside.
  ring(dark,s,.29,s.z-.67,.38,s.z-.42);
  ring(armor,s,.38,s.z-.42,.36,s.z-.12);
  ring(bevel,s,.36,s.z-.12,.315,s.z+.035);
  ring(nozzle,s,.315,s.z+.035,.235,s.z+.035);
  ring(dark,s,.235,s.z+.035,.205,s.z-.18);
  ring(inlay,s,.255,s.z+.038,.272,s.z+.038);
 }
 // Faceted central rear spine with a narrow illuminated keel, not a third
 // thruster. Coordinates follow the raised original spine.
 quad(bevel,[-.17,.392,.39],[.17,.392,.39],[.105,.257,1.30],[-.105,.257,1.30]);
 quad(inlay,[-.020,.398,.42],[.020,.398,.42],[.016,.266,1.26],[-.016,.266,1.26]);
 return {armor,bevel,dark,inlay,nozzle,glass};
}
function mesh(THREE,ship,name,data,material){
 const geometry=new THREE.BufferGeometry();geometry.setAttribute("position",new THREE.Float32BufferAttribute(data,3));
 geometry.computeVertexNormals();geometry.computeBoundingSphere();
 const m=new THREE.Mesh(geometry,material);m.name=name;ship.add(m);return m;
}
export function buildMantaVisualRebirth(THREE,shipGlow){
 const ship=new THREE.Group();ship.name="Manta Blade · graphite visual rebirth";
 const phys=(color,metalness,roughness,clearcoat,emissive=0x000000,emissiveIntensity=0)=>new THREE.MeshPhysicalMaterial({
  color,metalness,roughness,clearcoat,clearcoatRoughness:.23,emissive,emissiveIntensity,flatShading:true,side:THREE.DoubleSide});
 const titanium=phys(0x465764,.79,.32,.38,0x263542,.055);
 const wings=titanium,graphite=phys(0x18232e,.68,.44,.18,0x14222a,.06);
 const chamfer=phys(0x8597a1,.82,.26,.45,0x34414b,.035);
 const glass=phys(0x092331,.36,.15,.82,0x0b3542,.12);
 const turbine=phys(0x64717e,.88,.25,.32);
 const cyan=new THREE.MeshBasicMaterial({color:0xb8f7ff,toneMapped:false,side:THREE.DoubleSide});
 const d=buildMantaRebirthData();
 const surfaces=[
  mesh(THREE,ship,"Two broad scalloped manta wings",d.armor,titanium),
  mesh(THREE,ship,"Sculpted titanium chamfers",d.bevel,chamfer),
  mesh(THREE,ship,"Graphite underside, aero channels and venturi recess",d.dark,graphite),
  mesh(THREE,ship,"Precision cyan inlays and twin nozzle rims",d.inlay,cyan),
  mesh(THREE,ship,"Twin machined exhaust bezels",d.nozzle,turbine),
  mesh(THREE,ship,"Smoked faceted teardrop canopy",d.glass,glass)
 ];
 const enginePlumes=[];
 for(const socket of ENGINE_SOCKETS){
  const aperture=new THREE.Mesh(new THREE.CylinderGeometry(.201,.201,.085,14,1),shipGlow);
  aperture.rotation.x=Math.PI/2;aperture.position.set(socket.x,socket.y,socket.z-.06);
  aperture.name="Recessed white-core wing thrust aperture";ship.add(aperture);enginePlumes.push(aperture);
 }
 const engineCore=new THREE.Mesh(new THREE.BoxGeometry(.06,.022,.18),shipGlow);
 engineCore.position.set(0,-.10,1.14);engineCore.name="Recessed central ion keel";ship.add(engineCore);
 const geometryTriangles=Object.values(d).reduce((n,a)=>n+a.length/9,0)+enginePlumes.reduce((n,m)=>n+m.geometry.index.count/3,0)+12;
 const base=cyan.color.clone();let updates=0,peakGlow=0;
 return {ship,enginePlumes,engineCore,engineSockets:ENGINE_SOCKETS,spec:MANTA_REBIRTH,
  materials:{titanium,wings,graphite,glass,cyan,turbine,chamfer},triangles:geometryTriangles,
  polishSurfaces:surfaces,
  framePolish(dt,view={}){if(dt<=0)return;const boost=Math.max(0,Math.min(1,((view.boostMultiplier||1)-1)/.4));
   const gain=1+.16*boost+.035*Math.max(0,Math.min(1,((view.speed||44)-44)/100));
   cyan.color.copy(base).multiplyScalar(gain);updates++;peakGlow=Math.max(peakGlow,gain);},
  resetPolish(){updates=peakGlow=0;cyan.color.copy(base);},
  polishStats(){return {version:MANTA_REBIRTH.version,variant:"manta",geometryTriangles,baseHullDrawCalls:9,
   sculptedWings:true,engineHousings:2,additionalLights:0,additionalTextures:0,peakGlow,updates,physicsChanged:false};}
 };
}
