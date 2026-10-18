// Daisugi: readable physical water-hit feedback instead of a white explosion.
// Pure simulation helper, independent of Babylon/Pixi and legacy combat.
// Values are gentle enough to keep enemies in the original arena and close
// to their group, while remaining visible at the mobile camera distance.
export function applyDaisugiHitPush(enemy,source,player,strength=1.45){
  if(!enemy?.alive)return false;
  let dx=enemy.x-(source?.x??player.x),dz=enemy.z-(source?.z??player.z);
  let len=Math.hypot(dx,dz);
  if(len<.16){
    dx=enemy.x-player.x;dz=enemy.z-player.z;
    len=Math.hypot(dx,dz);
  }
  if(len<.16){dx=0;dz=1;len=1;}
  const nx=dx/len,nz=dz/len;
  const power=Math.max(.35,Math.min(2.05,Number(strength)||1.45));
  const currentX=enemy.knockX||0,currentZ=enemy.knockZ||0;
  let vx=currentX+nx*power,vz=currentZ+nz*power;
  const magnitude=Math.hypot(vx,vz);
  if(magnitude>2.65){vx=vx/magnitude*2.65;vz=vz/magnitude*2.65;}
  enemy.knockX=vx;enemy.knockZ=vz;
  enemy.recoil=Math.max(enemy.recoil||0,Math.min(.50,power*.25));
  // A small visible tilt and squash follow the hit. No white flash is used.
  enemy.hitTilt=Math.max(-.24,Math.min(.24,
    (enemy.hitTilt||0)+(nx>=0?-1:1)*power*.11));
  return true;
}
