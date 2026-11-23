// SKYSHIFT 0.13.4.1 — visual-only clearance for the ACTUAL Stingray V3 wings.
// Physical hover, contact, collision bounds, steering/GRIP, banking and
// the camera still read the original flight state, never the visual lift.
// Use actual imported wing UNDERSIDE vertices (not a guessed ship radius).
export const STINGRAY_CLEARANCE_01341=Object.freeze({
 version:"stingray-surface-integrity-01341",
 minVisibleGapMeters:.19,
 curvatureReserveMeters:.065,
 rollDeviationMaxRadians:.17,
 spanFractions:Object.freeze([.13,.25,.38,.53,.71,.91]),
 chordFractions:Object.freeze([.12,.50,.88]),
 deckInsetMeters:.14,
 releasePerSecond:3.3,
 maxDiagnosticProbeCount:36,
 noPhysicsChanges:true,
 noExtraDrawCalls:true,
 sampleSource:"deployed GLTF wing vertices"
});
export const clampVisualRoll=(renderRoll,physicalRoadBank,grounded)=>{
 if(!grounded||!Number.isFinite(renderRoll)||!Number.isFinite(physicalRoadBank))
  return renderRoll;
 const extra=renderRoll+physicalRoadBank;
 return -physicalRoadBank+
  Math.max(-STINGRAY_CLEARANCE_01341.rollDeviationMaxRadians,
   Math.min(STINGRAY_CLEARANCE_01341.rollDeviationMaxRadians,extra));
};
// Simple reusable plane test; works on flat road, banked 70° wallride
// and corkscrew normals. The normal can have negative world Y.
export function signedRoadClearance(point,road,normal){
 return (point.x-road.x)*normal.x+
  (point.y-road.y)*normal.y+
  (point.z-road.z)*normal.z;
}
// Pure result for tests and the production renderer. All inputs are
// WORLD-space wing underside samples. Lane direction is a real 3D tangent,
// derived from track.positionAt(), not the horizontal camera heading.
export function wingSurfaceLift(worldPoints,road,normal,lane,centerLateral,halfWidth,
 margin=STINGRAY_CLEARANCE_01341.minVisibleGapMeters+
  STINGRAY_CLEARANCE_01341.curvatureReserveMeters){
 let minDistance=Infinity,valid=0,left=0,right=0;
 for(const p of worldPoints){
  const dx=p.x-road.x,dy=p.y-road.y,dz=p.z-road.z;
  const lateral=centerLateral+dx*lane.x+dy*lane.y+dz*lane.z;
  if(Math.abs(lateral)>halfWidth-STINGRAY_CLEARANCE_01341.deckInsetMeters)
   continue; // wing actually OFF the deck: do not invent a floor
  const gap=dx*normal.x+dy*normal.y+dz*normal.z;
  if(!Number.isFinite(gap))continue;
  if(gap<minDistance)minDistance=gap;
  valid++;
  if(lateral<centerLateral)left++;else right++;
 }
 return {required:valid?Math.max(0,margin-minDistance):0,
  minDistance:valid?minDistance:null,valid,left,right,margin};
}
// Model-load-time extraction of actual wing vertices. The points are
// converted into ship-local space ONCE. The hot 60FPS path is just matrix
// multiplication of 36 cached vectors, with NO mesh traversals or scans.
export function extractWingUnderside(THREE,ship){
 if(!ship?.getObjectByName||!ship?.updateWorldMatrix)return [];
 ship.updateWorldMatrix(true,true);
 const shipInverse=new THREE.Matrix4().copy(ship.matrixWorld).invert();
 const points=[],tmp=new THREE.Vector3(),toShip=new THREE.Matrix4();
 for(const side of ["L","R"]){
  const mesh=ship.getObjectByName("Hero_Wing_"+side);
  const attr=mesh?.geometry?.attributes?.position;
  if(!mesh||!attr?.count)continue;
  mesh.updateWorldMatrix(true,false);
  toShip.multiplyMatrices(shipInverse,mesh.matrixWorld);
  const verts=[];
  for(let i=0;i<attr.count;i++){
   tmp.fromBufferAttribute(attr,i).applyMatrix4(toShip);
   if(!Number.isFinite(tmp.x)||!Number.isFinite(tmp.y)||
      !Number.isFinite(tmp.z))continue;
   verts.push([tmp.x,tmp.y,tmp.z]);
  }
  const maxSpan=verts.reduce((mx,v)=>Math.max(mx,Math.abs(v[0])),0);
  if(maxSpan<1)return [];
  for(const fraction of STINGRAY_CLEARANCE_01341.spanFractions){
   const target=maxSpan*fraction;
   let nearest=Infinity,realSpan=0;
   for(const v of verts){
    const difference=Math.abs(Math.abs(v[0])-target);
    if(difference<nearest){nearest=difference;realSpan=Math.abs(v[0]);}
   }
   const band=verts.filter(v=>Math.abs(Math.abs(v[0])-realSpan)<.035);
   if(!band.length)continue;
   const zmin=Math.min(...band.map(v=>v[2])),
     zmax=Math.max(...band.map(v=>v[2]));
   for(const chord of STINGRAY_CLEARANCE_01341.chordFractions){
    const targetZ=zmin+(zmax-zmin)*chord;
    let best=null,bestScore=Infinity;
    for(const v of band){
     // Prioritize a low surface point, but stay near the chosen chord
     // station to cover the entire wing leading/middle/trailing profile.
     const score=Math.abs(v[2]-targetZ)*3+v[1]*.04;
     if(score<bestScore){best=v;bestScore=score;}
    }
    if(best)points.push(new THREE.Vector3(...best));
   }
  }
 }
 return points;
}
export function createStingraySurfaceClearance(THREE,{
 positionAt,surfaceNormalAt,widthAt,onRoad,bankAt
}){
 const vectors=[],wingWorldPoints=[],worldPoint=new THREE.Vector3();
 const state={
  version:STINGRAY_CLEARANCE_01341.version,active:false,probes:0,
  minBefore:null,minAfter:null,liftMeters:0,peakLiftMeters:0,
  worstBefore:null,protectedFrames:0,frames:0,inspected:0,
  maxUnresolvedPenetration:0,worldLiftDistance:0,rollClamps:0,
  physicalFlightUnchanged:true,usesActualWingGeometry:true
 };
 function reset(){
  state.liftMeters=0;state.minBefore=null;state.minAfter=null;
  state.peakLiftMeters=0;state.worstBefore=null;
  state.protectedFrames=0;state.frames=0;state.inspected=0;
  state.maxUnresolvedPenetration=0;state.worldLiftDistance=0;
  state.rollClamps=0;
 }
 function bind(ship,heroApplied){
  vectors.length=0;wingWorldPoints.length=0;
  state.active=false;state.probes=0;reset();
  if(!heroApplied||!ship)return;
  const list=extractWingUnderside(THREE,ship);
  if(list.length<6)return;
  for(const p of list){vectors.push(p);wingWorldPoints.push(new THREE.Vector3());}
  state.active=true;state.probes=vectors.length;
 }
 function frame(ship,view,dt,{active=true}={}){
  state.frames++;
  if(!active||!state.active||!ship||!view?.grounded||
   !onRoad(view.s,view.lateral)){
   // Fly/leap/gap/trick/paused/hangar: NEVER treat empty space as a deck.
   state.minBefore=null;state.minAfter=null;
   state.liftMeters=0;
   return 0;
  }
  const road=positionAt(view.s,view.lateral,0),
    right=positionAt(view.s,view.lateral+1,0),
    normal=surfaceNormalAt(view.s),width=widthAt(view.s);
  const lane={x:right.x-road.x,y:right.y-road.y,z:right.z-road.z};
  const magnitude=Math.hypot(lane.x,lane.y,lane.z)||1;
  lane.x/=magnitude;lane.y/=magnitude;lane.z/=magnitude;
  const no=Math.hypot(normal.x,normal.y,normal.z)||1;
  const n={x:normal.x/no,y:normal.y/no,z:normal.z/no};
  ship.updateWorldMatrix(true,false);
  for(let i=0;i<vectors.length;i++){
   worldPoint.copy(vectors[i]).applyMatrix4(ship.matrixWorld);
   wingWorldPoints[i].copy(worldPoint);
  }
  const hit=wingSurfaceLift(wingWorldPoints,road,n,lane,
   view.lateral,width*.5);
  state.inspected+=hit.valid;
  state.minBefore=hit.minDistance;
  if(hit.minDistance!==null)
   state.worstBefore=state.worstBefore===null?hit.minDistance:
    Math.min(state.worstBefore,hit.minDistance);
  // Correction is APPLIED IMMEDIATELY on immersion, then released with
  // critically damped visual-only easing. Delayed ingress would clip.
  const wanted=hit.required;
  const prior=state.liftMeters;
  const falling=prior*Math.exp(-Math.min(Math.max(dt,0),.1)*
   STINGRAY_CLEARANCE_01341.releasePerSecond);
  state.liftMeters=Math.max(wanted,falling);
  state.minAfter=hit.minDistance===null?null:
   hit.minDistance+state.liftMeters;
  if(state.liftMeters>.004){
   ship.position.x+=n.x*state.liftMeters;
   ship.position.y+=n.y*state.liftMeters;
   ship.position.z+=n.z*state.liftMeters;
   state.protectedFrames++;
   state.peakLiftMeters=Math.max(state.peakLiftMeters,state.liftMeters);
   state.worldLiftDistance+=Math.abs(state.liftMeters-(prior||0));
  }
  if(state.minAfter!==null)
   state.maxUnresolvedPenetration=Math.max(
    state.maxUnresolvedPenetration,
    Math.max(0,hit.margin-state.minAfter));
  return state.liftMeters;
 }
 return {bind,reset,frame,isActive:()=>state.active,
  clampRoll:(fullRoll,physicalBank,grounded)=>{
   const out=clampVisualRoll(fullRoll,physicalBank,grounded);
   if(Math.abs(out-fullRoll)>1e-5)state.rollClamps++;
   return out;
  },stats:()=>({
    ...state,
    liftMeters:+state.liftMeters.toFixed(4),
    peakLiftMeters:+state.peakLiftMeters.toFixed(4),
    minBefore:state.minBefore===null?null:+state.minBefore.toFixed(4),
    minAfter:state.minAfter===null?null:+state.minAfter.toFixed(4),
    worstBefore:state.worstBefore===null?null:+state.worstBefore.toFixed(4)
  })};
}
