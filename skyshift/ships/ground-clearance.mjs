// Visual-only road-normal clearance, owned by ship presentation.
// Mesh bounds and references are captured on craft mount, not traversed per
// frame. Animated transforms are evaluated after the existing visual owners.
// GPU-expanded exhaust is bounded by the actual shader length/bias/width.
import {ENGINE_SOCKETS} from "./manta-blade-v0484.mjs";
export const GROUND_CLEARANCE_MARGIN=.12;
const project=(m,x,y,z,road,n)=>
 (m[0]*x+m[4]*y+m[8]*z+m[12]-road.x)*n.x+
 (m[1]*x+m[5]*y+m[9]*z+m[13]-road.y)*n.y+
 (m[2]*x+m[6]*y+m[10]*z+m[14]-road.z)*n.z;
export function boxPlaneMinimum(box,m,road,n){
 // Support point of transformed AABB in the road-normal direction; avoids
 // allocating vectors/corners and conservatively encloses actual mesh verts.
 const x=m[0]*n.x+m[1]*n.y+m[2]*n.z;
 const y=m[4]*n.x+m[5]*n.y+m[6]*n.z;
 const z=m[8]*n.x+m[9]*n.y+m[10]*n.z;
 return project(m,x>=0?box.min.x:box.max.x,y>=0?box.min.y:box.max.y,z>=0?box.min.z:box.max.z,road,n);
}
export function plumePlaneMinimum(m,road,n,{length,width,bias}){
 // Same local centerline as the existing vertex shader. Billboard width
 // can point in any direction, so subtract its maximum projected radius.
 const radius=Math.max(0,width)*1.07*Math.hypot(m[0],m[1],m[2]);
 let min=Infinity;
 for(const socket of ENGINE_SOCKETS){
  const sign=Math.sign(socket.x),z=socket.z+.04;
  min=Math.min(min,project(m,socket.x,socket.y,z,road,n),
   project(m,socket.x-sign*bias*.7,socket.y,z+length*(1-sign*bias),road,n));
 }
 return min-radius;
}
function ribbonMinimum(mesh,road,n){
 const a=mesh.geometry.getAttribute("position"),m=mesh.matrixWorld.elements;
 let min=Infinity;
 // Legacy engine ribbon is the sole small dynamic vertex buffer (16 tris).
 for(let i=0;i<a.count;i++)min=Math.min(min,project(m,a.getX(i),a.getY(i),a.getZ(i),road,n));
 return min;
}
function shown(mesh,root){
 for(let node=mesh;node;node=node.parent){if(node.visible===false)return false;if(node===root)return true;}
 return false;
}
export function createGroundClearance({onRoad,positionAt,surfaceNormalAt}){
 let root=null,entries=[],lift=0,peak=0,frames=0;
 let last={active:false,beforeMeters:null,afterMeters:null,liftMeters:0,meshes:0,shaderPlumes:0};
 function reset(){lift=0;peak=0;frames=0;last={active:false,beforeMeters:null,afterMeters:null,liftMeters:0,meshes:0,shaderPlumes:0};}
 function bind(ship){
  root=ship;entries=[];reset();
  if(!root)return;
  root.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.geometry)return;
   const u=mesh.material?.uniforms;
   if(u?.uLength&&u?.uWidth&&u?.uBias){entries.push({mesh,kind:"plume",u});return;}
   if(mesh.name==="Two graduated chromatic + white-core wing-engine streaks"){entries.push({mesh,kind:"ribbon"});return;}
   if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();
   const box=mesh.geometry.boundingBox;
   if(box&&Number.isFinite(box.min.x)&&Number.isFinite(box.max.x))entries.push({mesh,kind:"box",box});
  });
 }
 function apply(ship,view,dt,active=true){
  // Air tricks, falls, hangar and off-deck poses never receive ground lift.
  if(!active||!ship||ship!==root||!view?.grounded||!onRoad(view.s,view.lateral)){
   lift=0;last={active:false,beforeMeters:null,afterMeters:null,liftMeters:0,meshes:0,shaderPlumes:0};return last;
  }
  const road=positionAt(view.s,view.lateral,0),n=surfaceNormalAt(view.s);
  ship.updateMatrixWorld(true);
  let min=Infinity,meshes=0,shaderPlumes=0;
  for(const entry of entries){
   const {mesh,kind}=entry;if(!shown(mesh,root))continue;
   meshes++;
   let d;
   if(kind==="plume"){
    shaderPlumes++;const {u}=entry;
    d=plumePlaneMinimum(mesh.matrixWorld.elements,road,n,{length:u.uLength.value,width:u.uWidth.value,bias:u.uBias.value});
   }else if(kind==="ribbon")d=ribbonMinimum(mesh,road,n);
   else d=boxPlaneMinimum(entry.box,mesh.matrixWorld.elements,road,n);
   min=Math.min(min,d);
  }
  if(!Number.isFinite(min)){lift=0;last={active:false,beforeMeters:null,afterMeters:null,liftMeters:0,meshes,shaderPlumes};return last;}
  const required=Math.max(0,GROUND_CLEARANCE_MARGIN-min);
  // Immediate increase prevents clipping. Only the excess compensation
  // decays, retaining the exact physical bank and avoiding a hard drop.
  lift=Math.max(required,lift*Math.exp(-10*Math.max(0,Math.min(.1,Number.isFinite(dt)?dt:0))));
  if(lift<.0005&&required===0)lift=0;
  ship.position.x+=n.x*lift;ship.position.y+=n.y*lift;ship.position.z+=n.z*lift;
  if(lift)ship.updateMatrixWorld(true);
  peak=Math.max(peak,lift);frames+=Number(lift>0);
  last={active:true,beforeMeters:min,afterMeters:min+lift,liftMeters:lift,meshes,shaderPlumes};
  return last;
 }
 return Object.freeze({bind,reset,apply,stats:()=>({version:"0.29.8.2",marginMeters:GROUND_CLEARANCE_MARGIN,peakLiftMeters:peak,correctedFrames:frames,...last})});
}
