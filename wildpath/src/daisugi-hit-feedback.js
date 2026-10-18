// Daisugi: clear backwards water-hit feedback on the original 2.x arena.
// Pure and deterministic: no effect on speed, arena, combat damage or VFX.
export function applyDaisugiHitPush(enemy,source,player,strength=1.45){
  if(!enemy?.alive)return false;
  // Always knock the victim AWAY FROM THE PLAYER, never away from the
  // projectile's last homing/chain/bounce location (which can be sideways).
  let dx=enemy.x-player.x,dz=enemy.z-player.z;
  let len=Math.hypot(dx,dz);
  if(len<.16){
    // For the rare case where both occupy one point, a previous source
    // can break the tie; otherwise use a stable backward world direction.
    dx=enemy.x-(source?.x??enemy.x);
    dz=enemy.z-(source?.z??enemy.z);
    len=Math.hypot(dx,dz);
  }
  if(len<.16){dx=0;dz=1;len=1;}
  const nx=dx/len,nz=dz/len;
  // Keep the previously approved impact strength and impulse cap.
  const power=Math.max(.35,Math.min(2.05,Number(strength)||1.45));
  let vx=(enemy.knockX||0)+nx*power,
      vz=(enemy.knockZ||0)+nz*power;
  const magnitude=Math.hypot(vx,vz);
  if(magnitude>2.65){vx=vx/magnitude*2.65;vz=vz/magnitude*2.65;}
  enemy.knockX=vx;enemy.knockZ=vz;
  enemy.recoil=Math.max(enemy.recoil||0,Math.min(.50,power*.25));
  // The enemy is facing the player (+local Z), so lean in its BACKWARD
  // direction via the local X axis rather than tilting off to the side.
  enemy.hitTilt=Math.max(-.24,Math.min(0,
    (enemy.hitTilt||0)-power*.11));
  return true;
}
