// SKYSHIFT 0.3.2 – controlled flight effects, preserving ship silhouette.
// Geometry is allocated once and reused. No rings or obstacle-like particles.
import { NEON_TUNING } from "./neon-balance-v032.mjs";
export function createPremiumFlightFX(THREE,scene) {
  const trailPosition=new Float32Array(12);
  const trailGeometry=new THREE.BufferGeometry();
  trailGeometry.setAttribute("position",
    new THREE.BufferAttribute(trailPosition,3).setUsage(THREE.DynamicDrawUsage));
  const trailMaterial=new THREE.LineBasicMaterial({
    color:new THREE.Color(0x6deaff).multiplyScalar(NEON_TUNING.engineTrailLuminance),
    transparent:true,opacity:.28,depthWrite:false,toneMapped:false
  });
  const trails=new THREE.LineSegments(trailGeometry,trailMaterial);
  trails.frustumCulled=false;
  scene.add(trails);

  // Short diagonal shards when the hull touches down. No circular shockwave.
  const impactPoints=[];
  for(let i=0;i<8;i++){
    const a=(i/8)*2*Math.PI,dx=Math.cos(a),dz=Math.sin(a);
    impactPoints.push(dx*.20,.11,dz*.20,dx*1.75,.10,dz*1.75);
  }
  const impactGeo=new THREE.BufferGeometry();
  impactGeo.setAttribute("position",new THREE.Float32BufferAttribute(impactPoints,3));
  const impactMat=new THREE.LineBasicMaterial({
    color:new THREE.Color(0xf1fcff).multiplyScalar(NEON_TUNING.impactLuminance),
    transparent:true,opacity:0,depthWrite:false,toneMapped:false
  });
  const impact=new THREE.LineSegments(impactGeo,impactMat);
  impact.frustumCulled=false;impact.visible=false;
  scene.add(impact);

  let jumpAmount=0,landAmount=0,zoneAmount=0;
  const color=new THREE.Color(0x43ddf0);
  // HDR material colors are driven by the shared sector palette, never frame flicker.
  return {
    onJump() { jumpAmount=1; },
    onLand({x,y,z,heading}) {
      landAmount=1;
      impact.position.set(x,y+.07,z);
      impact.rotation.y=-heading;
      impact.scale.setScalar(.48);
      impact.visible=true;
    },
    onZone(){zoneAmount=1;},
    reset(){jumpAmount=0;landAmount=0;zoneAmount=0;impact.visible=false;},
    frame({dt,playing,flight,poseAt,positionAt,ship,shipGlow,sectorColor}) {
      color.setHex(sectorColor);
      const shipPose=poseAt(flight.s);
      const speed=21+flight.s*.0045;
      trails.visible=playing;
      // Vectors run rearward from both engines, following track tangent.
      const length=2.3+speed*.085+jumpAmount*.5;
      for(let i=0;i<2;i++){
        const sign=i===0?-1:1;
        const base=positionAt(flight.s,flight.lateral+sign*.78,0);
        const index=i*6;
        trailPosition[index]=base.x-shipPose.forwardX*2.0;
        trailPosition[index+1]=flight.y-.12;
        trailPosition[index+2]=base.z-shipPose.forwardZ*2.0;
        trailPosition[index+3]=base.x-shipPose.forwardX*(2+length);
        trailPosition[index+4]=flight.y-.08;
        trailPosition[index+5]=base.z-shipPose.forwardZ*(2+length);
      }
      trailGeometry.attributes.position.needsUpdate=true;
      // Dynamic bounds are intentionally conservative to avoid per-frame computeBoundingSphere.
      trailGeometry.boundingSphere=new THREE.Sphere(new THREE.Vector3(
        ship.position.x,ship.position.y,ship.position.z),60);
      trailMaterial.color.copy(color).multiplyScalar(NEON_TUNING.engineTrailLuminance);
      trailMaterial.opacity=(playing?.21:0)+jumpAmount*.085;

      jumpAmount=Math.max(0,jumpAmount-dt*3.6);
      landAmount=Math.max(0,landAmount-dt*3.1);
      zoneAmount=Math.max(0,zoneAmount-dt*1.0);
      if(ship){
        ship.scale.set(1+landAmount*.05,1-landAmount*.17,
          1+jumpAmount*.035);
      }
      impact.visible=landAmount>0;
      impactMat.color.copy(new THREE.Color(0xecfaff).lerp(color,.22))
        .multiplyScalar(NEON_TUNING.impactLuminance);
      impactMat.opacity=landAmount*.53;
      impact.scale.setScalar(.5+1.0*(1-landAmount));
      // shipGlow is owned by the shared NeonKit and retains its HDR intensity.
      // Do not overwrite it with a unit-range material color here.
    },
    dispose(){
      trails.removeFromParent();impact.removeFromParent();
      trailGeometry.dispose();trailMaterial.dispose();
      impactGeo.dispose();impactMat.dispose();
    }
  };
}
