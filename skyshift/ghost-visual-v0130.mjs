// SKYSHIFT 0.13.0 — translucent, world-space personal ghost.
// 2 draw calls, 0 lights, 0 colliders, < 80 triangles. No instancing or
// shadow casting; no FX trails, no scene-graph duplication of the real ship.
import {ghostPoseAt} from "./core/ghost-playback.mjs";
export const GHOST_VISUAL_0130=Object.freeze({
 version:"translucent-personal-ghost-0130",
 bodyTint:0x5bd9ff,edgeTint:0xeafcff,
 drawCalls:2,colliders:0,extraLights:0,renderPasses:0,
 estimatedTriangles:14,maxOpacity:.65,depthWrite:false,
 physicalFlightUnchanged:true,noRoadCenterlineApproximation:true
});
const vert=(x,y,z)=>[x,y,z];
function tri(out,a,b,c){out.push(...a,...b,...c)}
function quad(out,a,b,c,d){tri(out,a,b,c);tri(out,a,c,d)}
export function ghostGeometryData(){
 const body=[],edge=[];
 const nose=vert(0,.31,-2.52),crown=vert(0,.38,-.72),
  leftWing=vert(-2.68,.09,.48),rightWing=vert(2.68,.09,.48),
  leftBack=vert(-1.36,.14,1.31),rightBack=vert(1.36,.14,1.31),
  leftTail=vert(-.75,.25,2.24),rightTail=vert(.75,.25,2.24),
  innerLeft=vert(-.28,.24,1.24),innerRight=vert(.28,.24,1.24);
 // Distinct futuristic manta shape with an open V-shaped split tail;
 // the ghost is not a solid wall obstructing the actual track.
 tri(body,nose,leftWing,crown);
 tri(body,nose,crown,rightWing);
 tri(body,leftWing,leftBack,crown);
 tri(body,rightWing,crown,rightBack);
 tri(body,crown,leftBack,innerLeft);
 tri(body,crown,innerRight,rightBack);
 tri(body,leftBack,leftTail,innerLeft);
 tri(body,rightBack,innerRight,rightTail);
 // Paired white-core fine leading accents, rendered in a single batch.
 const thin=(a,b)=>[a[0]*.90+b[0]*.10,a[1]+.06,a[2]*.90+b[2]*.10];
 quad(edge,nose,leftWing,thin(leftWing,nose),thin(nose,leftWing));
 quad(edge,nose,thin(nose,rightWing),thin(rightWing,nose),rightWing);
 // Split-tail jet markers: read the ghost heading even from behind.
 const l1=vert(-.78,.29,1.76),l2=vert(-.55,.34,2.2),
  l3=vert(-.59,.38,1.78),r1=vert(.78,.29,1.76),
  r2=vert(.55,.34,2.2),r3=vert(.59,.38,1.78);
 tri(edge,l1,l2,l3);tri(edge,r1,r3,r2);
 return {body,edge,triangles:(body.length+edge.length)/9};
}
function geo(THREE,data){
 const g=new THREE.BufferGeometry();
 g.setAttribute("position",new THREE.Float32BufferAttribute(data,3));
 g.computeVertexNormals();
 g.computeBoundingSphere();
 return g;
}
export function createPersonalGhostVisual(THREE,scene){
 const data=ghostGeometryData();
 const group=new THREE.Group();
 group.name="Time Trial · personal best ghost, no physical collision";
 const hull=new THREE.Mesh(geo(THREE,data.body),
  new THREE.MeshBasicMaterial({color:GHOST_VISUAL_0130.bodyTint,
   transparent:true,opacity:.25,depthWrite:false,
   depthTest:true,blending:THREE.AdditiveBlending,
   side:THREE.DoubleSide,toneMapped:false}));
 hull.name="Ghost · transparent Stingray silhouette";
 hull.castShadow=false;hull.receiveShadow=false;
 const edges=new THREE.Mesh(geo(THREE,data.edge),
  new THREE.MeshBasicMaterial({color:GHOST_VISUAL_0130.edgeTint,
   transparent:true,opacity:.55,depthWrite:false,
   depthTest:true,blending:THREE.AdditiveBlending,
   side:THREE.DoubleSide,toneMapped:false}));
 edges.name="Ghost · white-core guide edges";
 group.add(hull,edges);
 group.visible=false;group.renderOrder=3;scene.add(group);
 const out={};
 let visibleFrames=0,frames=0;
 function frame({active=false,enabled=true,best=null,elapsed=0}={}){
  frames++;
  const pose=active&&enabled?ghostPoseAt(best,elapsed,out):null;
  group.visible=!!pose;
  if(!pose)return false;
  // These are the RECORDED original player's lateral deviations and heading,
  // not track-centerline reprojection or simulation of another player's AI.
  group.position.set(pose.worldX,pose.y+.20,pose.worldZ);
  group.rotation.set(pose.pitch,-pose.heading,pose.roll,"XYZ");
  // Keep extremely restrained readability; no flashing ghost or particles.
  edges.material.opacity=.52+.065*Math.sin(elapsed*4.2);
  visibleFrames++;
  return true;
 }
 return {frame,hide(){group.visible=false},
  stats(){return {...GHOST_VISUAL_0130,triangles:data.triangles,
    frames,visibleFrames,visible:group.visible,
    ghostSceneObjects:2};},
  dispose(){group.removeFromParent();
   hull.geometry.dispose();edges.geometry.dispose();
   hull.material.dispose();edges.material.dispose();}};
}
