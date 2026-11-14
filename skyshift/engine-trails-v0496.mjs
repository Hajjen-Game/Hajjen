// SKYSHIFT 0.4.9.6 — layered Manta Blade twin-engine velocity language.
// Reuse ONE ship-attached ribbon draw call: two real exhaust sockets,
// each with a broad chromatic veil plus a thin white-hot interior.
import {NEON_TUNING} from "./neon-balance-v032.mjs";
import {ENGINE_SOCKETS} from "./manta-blade-v0484.mjs";
export const ENGINE_TRAIL_SPEC=Object.freeze({
 emitters:2,segmentsPerEmitter:4,layersPerEmitter:2,
 baseLengthMeters:2.55,maxBoostLengthMeters:10.4,
 coreWidthMeters:.052,baseOpacity:.24,boostOpacity:.64,
 boostMultiplier:1.40,bloomMode:"chromatic-veil-and-neutral-white-core",
 newParticles:0,extraDynamicLights:0,attachedToShip:true,
 extraDrawCalls:0
});
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
export function trailMotionState(speed=44,boost=1,energy=0,bank=0,clock=0,velocity=null){
 const boosted=clamp((boost-1)/(ENGINE_TRAIL_SPEC.boostMultiplier-1),0,1);
 const speedSignal=clamp((speed-44)/45,0,1);
 const effect=clamp((energy??0),0,1);
 const flow=clamp(velocity?.engineFlow??boosted,0,1);
 const ignition=clamp(velocity?.ignition??0,0,1);
 const pulse=1+.028*Math.sin(clock*(19+flow*9))+
  ignition*.055*Math.exp(-clock*.02);
 const length=clamp((ENGINE_TRAIL_SPEC.baseLengthMeters+
  speedSignal*.65+boosted*5.25+flow*1.35+ignition*.45+effect*.18)*pulse,
  1.9,ENGINE_TRAIL_SPEC.maxBoostLengthMeters);
 const opacity=clamp(ENGINE_TRAIL_SPEC.baseOpacity+flow*.30+
  ignition*.095+speedSignal*.035,.18,ENGINE_TRAIL_SPEC.boostOpacity);
 const sideBias=clamp(bank,-.38,.38)*.08;
 return {length,opacity,boosted,speedSignal,flow,ignition,sideBias,
  emitterCount:ENGINE_TRAIL_SPEC.emitters};
}
export function createTwinEngineFX(THREE,scene,ship,edgeMaterial=null){
 // 4 graduated quads per emitter, packed into a single reused BufferGeometry.
 const position=new Float32Array(ENGINE_TRAIL_SPEC.emitters*
  ENGINE_TRAIL_SPEC.segmentsPerEmitter*6*3);
 const rgb=new Float32Array(position.length);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute("position",new THREE.BufferAttribute(position,3)
  .setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute("color",new THREE.BufferAttribute(rgb,3)
  .setUsage(THREE.DynamicDrawUsage));
 geometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,0,6),18);
 const material=new THREE.MeshBasicMaterial({
  color:0xffffff,vertexColors:true,transparent:true,
  opacity:ENGINE_TRAIL_SPEC.baseOpacity,
  depthWrite:false,side:THREE.DoubleSide,toneMapped:false,
  blending:THREE.AdditiveBlending
 });
 const ribbons=new THREE.Mesh(geometry,material);
 ribbons.name="Two graduated chromatic + white-core wing-engine streaks";
 ribbons.frustumCulled=false;ship.add(ribbons);
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
 impact.visible=false;impact.frustumCulled=false;scene.add(impact);
 const tint=new THREE.Color(0x43ddf0),impactBase=new THREE.Color(0xecfaff);
 let jumpAmount=0,landAmount=0,zoneAmount=0,elapsed=0;
 let peakTrailLength=0,peakTrailOpacity=0,peakFlow=0;
 let lastState=trailMotionState();
 function paintRibbon(emitter,nearZ,midZ,endZ,sideBias,flow,ignition){
  const {x,y}=emitter,base=ENGINE_SOCKETS.indexOf(emitter)*72;
  const core=clamp(.15+flow*.80+ignition*.18,0,1.13);
  const coreSplit=midZ+(endZ-midZ)*.20;
  const sections=[
   {z0:nearZ,z1:midZ,w0:.146,w1:.095,c0:.72,c1:.54,inner:false},
   {z0:midZ,z1:endZ,w0:.095,w1:.008,c0:.54,c1:.015,inner:false},
   {z0:nearZ-.01,z1:coreSplit,w0:.052,w1:.035,c0:1.18,c1:.95,inner:true},
   {z0:coreSplit,z1:nearZ+(endZ-nearZ)*.81,
    w0:.035,w1:.004,c0:.95,c1:.025,inner:true}
  ];
  for(let k=0;k<4;k++){
   const p=sections[k],i=base+k*18;
   const drift=sideBias*(1+k*.4)*.15;
   const a=[x-p.w0,y-.052-(p.inner?.002:0),p.z0];
   const b=[x+p.w0,y-.052-(p.inner?.002:0),p.z0];
   const c=[x+p.w1+drift,y-.052-(p.inner?.002:0),p.z1];
   const d=[x-p.w1+drift,y-.052-(p.inner?.002:0),p.z1];
   for(const [index,v,intensity] of [
    [0,a,p.c0],[1,b,p.c0],[2,c,p.c1],
    [3,a,p.c0],[4,c,p.c1],[5,d,p.c1]
   ]){
    const off=i+index*3;
    position[off]=v[0];position[off+1]=v[1];position[off+2]=v[2];
    const aColor=intensity*(p.inner?core:1);
    rgb[off]=aColor*(p.inner?.87+.13*tint.r:tint.r*.90+.10);
    rgb[off+1]=aColor*(p.inner?.93+.07*tint.g:tint.g*.92+.08);
    rgb[off+2]=aColor*(p.inner?.99+.01*tint.b:tint.b*.96+.04);
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
   peakTrailLength=0;peakTrailOpacity=0;peakFlow=0;
   lastState=trailMotionState();
   impact.visible=false;ribbons.visible=false;
   if(edgeMaterial)edgeMaterial.opacity=.63;
  },
  frame({dt,playing,flight,ship:currentShip,sectorColor,motionWeight,velocity}){
   elapsed+=Math.min(dt,.05);
   const speed=Number.isFinite(flight.forwardSpeed)?flight.forwardSpeed:44;
   const state=trailMotionState(speed,flight.boostMultiplier??1,
    motionWeight?.engineEnergy??0,currentShip?.rotation.z??0,elapsed,velocity);
   lastState=state;
   peakTrailLength=Math.max(peakTrailLength,state.length);
   peakTrailOpacity=Math.max(peakTrailOpacity,state.opacity);
   peakFlow=Math.max(peakFlow,state.flow);
   ribbons.visible=!!playing;
   tint.setHex(sectorColor);
   for(let i=0;i<ENGINE_SOCKETS.length;i++){
    const emitter=ENGINE_SOCKETS[i];
    const skew=(i===0?1:-1)*state.sideBias;
    const length=state.length*(1+skew),from=emitter.z+.11;
    paintRibbon(emitter,from,from+length*.46,from+length,skew,
      state.flow,state.ignition);
   }
   geometry.attributes.position.needsUpdate=true;
   geometry.attributes.color.needsUpdate=true;
   material.opacity=playing?state.opacity:0;
   if(edgeMaterial)edgeMaterial.opacity=.60+state.flow*.19+
    Math.min(.035,Math.abs(state.sideBias)*.3);
   jumpAmount=Math.max(0,jumpAmount-dt*3.6);
   landAmount=Math.max(0,landAmount-dt*3.1);
   zoneAmount=Math.max(0,zoneAmount-dt);
   if(currentShip)currentShip.scale.set(
    1+landAmount*.05-state.flow*.013,
    1-landAmount*.17-state.flow*.006,
    1+jumpAmount*.035+state.flow*.036+state.ignition*.012);
   impact.visible=landAmount>0;
   impactMat.color.copy(impactBase).lerp(tint,.22)
    .multiplyScalar(NEON_TUNING.impactLuminance);
   impactMat.opacity=landAmount*.53;
   impact.scale.setScalar(.5+1.0*(1-landAmount));
  },
  stats(){return {peakTrailLengthMeters:+peakTrailLength.toFixed(2),
   peakOpacity:+peakTrailOpacity.toFixed(3),
   peakEngineFlow:+peakFlow.toFixed(3),
   layersPerEmitter:ENGINE_TRAIL_SPEC.layersPerEmitter,
   actualEmitters:ENGINE_SOCKETS.length,
   lastLengthMeters:+lastState.length.toFixed(2)};},
  dispose(){
   ribbons.removeFromParent();impact.removeFromParent();
   geometry.dispose();material.dispose();
   impactGeo.dispose();impactMat.dispose();
  }
 };
}
