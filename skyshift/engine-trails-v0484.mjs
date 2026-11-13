// SKYSHIFT 0.4.8.4 — Twin-thruster flight streaks, subdued at base speed.
// Geometry follows the two actual Manta Blade exhaust SOCKETS in ship-local
// space and therefore inherits ship bank, pitch and nose yaw automatically.
// Stronger staged effects can later be added at truly higher speeds.
import {NEON_TUNING} from "./neon-balance-v032.mjs";
import {ENGINE_SOCKETS} from "./manta-blade-v0484.mjs";
export const ENGINE_TRAIL_SPEC=Object.freeze({
 emitters:2,segmentsPerEmitter:2,
 baseLengthMeters:2.55,maxBoostLengthMeters:6.75,
 coreWidthMeters:.073,
 baseOpacity:.25,boostOpacity:.43,
 bloomMode:"restrained",newParticles:0,
 extraDynamicLights:0,attachedToShip:true
});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function trailMotionState(speed=44,boost=1,energy=0,bank=0,clock=0){
 const boosted=clamp((boost-1)/.30,0,1);
 const speedSignal=clamp((speed-44)/45,0,1);
 const effect=clamp((energy??0),0,1);
 const pulse=1+.023*Math.sin(clock*18);
 const length=clamp((ENGINE_TRAIL_SPEC.baseLengthMeters+
   speedSignal*1.1+boosted*3.35+effect*.30)*pulse,
   1.9,ENGINE_TRAIL_SPEC.maxBoostLengthMeters);
 const opacity=clamp(ENGINE_TRAIL_SPEC.baseOpacity+
   .15*boosted+.035*speedSignal,.20,ENGINE_TRAIL_SPEC.boostOpacity);
 const sideBias=clamp(bank,-.38,.38)*.08;
 return {length,opacity,boosted,speedSignal,sideBias,
  emitterCount:ENGINE_TRAIL_SPEC.emitters};
}
export function createTwinEngineFX(THREE,scene,ship,edgeMaterial=null){
 // Four graduated ribbon quads (two per exhaust), fixed buffers reused.
 const position=new Float32Array(ENGINE_TRAIL_SPEC.emitters*
  ENGINE_TRAIL_SPEC.segmentsPerEmitter*6*3);
 const rgb=new Float32Array(position.length);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.BufferAttribute(position,3)
   .setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute("color",new THREE.BufferAttribute(rgb,3)
   .setUsage(THREE.DynamicDrawUsage));
 // Ample static object-local bound so changing trail length won't cull.
 geometry.boundingSphere=new THREE.Sphere(
  new THREE.Vector3(0,0,5),12);
 const material=new THREE.MeshBasicMaterial({
  color:0x8ddff4,vertexColors:true,transparent:true,
  opacity:ENGINE_TRAIL_SPEC.baseOpacity,
  depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
  blending:THREE.AdditiveBlending
 });
 const ribbons=new THREE.Mesh(geometry,material);
 ribbons.name="Two graduated wing-engine velocity streaks";
 ribbons.frustumCulled=false;
 ship.add(ribbons);
 const impactPositions=[];
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4,dx=Math.cos(a),dz=Math.sin(a);
  impactPositions.push(dx*.20,.11,dz*.20,dx*1.75,.10,dz*1.75);
 }
 const impactGeo=new THREE.BufferGeometry();
 impactGeo.setAttribute("position",
  new THREE.Float32BufferAttribute(impactPositions,3));
 const impactMat=new THREE.LineBasicMaterial({
  color:new THREE.Color(0xf1fcff).multiplyScalar(NEON_TUNING.impactLuminance),
  transparent:true,opacity:0,depthWrite:false,toneMapped:false
 });
 const impact=new THREE.LineSegments(impactGeo,impactMat);
 impact.visible=false;impact.frustumCulled=false;
 scene.add(impact);
 const tint=new THREE.Color(0x43ddf0),impactBase=new THREE.Color(0xecfaff);
 let jumpAmount=0,landAmount=0,zoneAmount=0,elapsed=0;
 let peakTrailLength=0,peakTrailOpacity=0,lastState=trailMotionState();
 function paintRibbon(emitter,nearZ,midZ,endZ,sideBias){
  const {x,y}=emitter,base=ENGINE_SOCKETS.indexOf(emitter)*36;
  const sections=[
   {z0:nearZ,z1:midZ,w0:.070,w1:.048,c0:1,c1:.70},
   {z0:midZ,z1:endZ,w0:.048,w1:.009,c0:.70,c1:.06}
  ];
  for(let k=0;k<2;k++){
   const p=sections[k],i=base+k*18;
   const drift=sideBias*(k+1)*.15;
   const a=[x-p.w0,y-.055,p.z0],b=[x+p.w0,y-.055,p.z0];
   const c=[x+p.w1+drift,y-.055,p.z1];
   const d=[x-p.w1+drift,y-.055,p.z1];
   for(const [index,v,intensity] of [
    [0,a,p.c0],[1,b,p.c0],[2,c,p.c1],
    [3,a,p.c0],[4,c,p.c1],[5,d,p.c1]
   ]){
    let off=i+index*3;
    position[off]=v[0];position[off+1]=v[1];position[off+2]=v[2];
    rgb[off]=intensity*.68;rgb[off+1]=intensity*.92;
    rgb[off+2]=intensity;
   }
  }
 }
 return {
  onJump(){jumpAmount=1;},
  onLand({x,y,z,heading}){
   landAmount=1;
   impact.position.set(x,y+.07,z);
   impact.rotation.y=-heading;
   impact.scale.setScalar(.48);
   impact.visible=true;
  },
  onZone(){zoneAmount=1;},
  reset(){
   jumpAmount=0;landAmount=0;zoneAmount=0;elapsed=0;
   peakTrailLength=0;peakTrailOpacity=0;
   impact.visible=false;ribbons.visible=false;
   if(edgeMaterial)edgeMaterial.opacity=.63;
  },
  frame({dt,playing,flight,ship:currentShip,sectorColor,motionWeight}){
   elapsed+=Math.min(dt,.05);
   const speed=Number.isFinite(flight.forwardSpeed)?flight.forwardSpeed:44;
   const state=trailMotionState(speed,flight.boostMultiplier??1,
    motionWeight?.engineEnergy??0,
    currentShip?.rotation.z??0,elapsed);
   lastState=state;
   peakTrailLength=Math.max(peakTrailLength,state.length);
   peakTrailOpacity=Math.max(peakTrailOpacity,state.opacity);
   ribbons.visible=!!playing;
   // Both emitters originate exactly behind their visible exhaust lenses,
   // at +/-1.99m, not the previous +/-0.78m center-adjacent spacing.
   for(let i=0;i<ENGINE_SOCKETS.length;i++){
    const emitter=ENGINE_SOCKETS[i];
    const skew=(i===0?1:-1)*state.sideBias;
    const length=state.length*(1+skew);
    const from=emitter.z+.11;
    paintRibbon(emitter,from,from+length*.46,from+length,skew);
   }
   geometry.attributes.position.needsUpdate=true;
   geometry.attributes.color.needsUpdate=true;
   tint.setHex(sectorColor);
   material.color.copy(tint).multiplyScalar(
    Math.min(1.06,NEON_TUNING.engineTrailLuminance));
   material.opacity=playing?state.opacity:0;
   if(edgeMaterial){
    // Almost invisible at normal speed; makes the hard edge breathe during
    // banking / boost, leaving visual headroom for later high-speed zones.
    edgeMaterial.opacity=.60+state.boosted*.16+
      Math.min(.035,Math.abs(state.sideBias)*.3);
   }
   jumpAmount=Math.max(0,jumpAmount-dt*3.6);
   landAmount=Math.max(0,landAmount-dt*3.1);
   zoneAmount=Math.max(0,zoneAmount-dt);
   if(currentShip)currentShip.scale.set(
    1+landAmount*.05,1-landAmount*.17,1+jumpAmount*.035);
   impact.visible=landAmount>0;
   impactMat.color.copy(impactBase).lerp(tint,.22)
    .multiplyScalar(NEON_TUNING.impactLuminance);
   impactMat.opacity=landAmount*.53;
   impact.scale.setScalar(.5+1.0*(1-landAmount));
  },
  stats(){return {peakTrailLengthMeters:+peakTrailLength.toFixed(2),
   peakOpacity:+peakTrailOpacity.toFixed(3),
   actualEmitters:ENGINE_SOCKETS.length,
   lastLengthMeters:+lastState.length.toFixed(2)};},
  dispose(){
   ribbons.removeFromParent();impact.removeFromParent();
   geometry.dispose();material.dispose();
   impactGeo.dispose();impactMat.dispose();
  }
 };
}
