// Wildpath 2.0: bounded, open woodland. Pure geometry for gameplay and tests.
export const WILD_RADIUS=43;
export const WILD_FLOOR_RADIUS=90;
export const WILD_CAMERA_WIDTH=29.5;
export function freeStep(x,z,dx,dz,radius=WILD_RADIUS){
  const nx=x+dx,nz=z+dz,d=Math.hypot(nx,nz);
  if(d<=radius)return {x:nx,z:nz};
  // Slide along the circular outer forest edge, not an invisible square.
  const k=radius/d;
  return {x:nx*k,z:nz*k};
}
export function insideWild(x,z,margin=0){
  return Math.hypot(x,z)<=WILD_RADIUS-margin;
}
export function openSpawnPoint(hero,rng=Math.random,near=11,far=17){
  for(let i=0;i<24;i++){
    const angle=rng()*Math.PI*2,r=near+rng()*(far-near);
    const x=hero.x+Math.cos(angle)*r,z=hero.z+Math.sin(angle)*r;
    if(insideWild(x,z,1))return {x,z};
  }
  // Close to the forest border: deliberately spawn inward from the player.
  const angle=Math.atan2(-hero.z,-hero.x)+(rng()-.5)*1.6;
  const x=hero.x+Math.cos(angle)*near,z=hero.z+Math.sin(angle)*near;
  return freeStep(0,0,x,z,WILD_RADIUS-1);
}
export function energyThreshold(stage){
  return [6,9,12,15,18,21,24,27][Math.min(Math.max(0,stage),7)];
}
export function energyProgress(energy,stage){
  return Math.max(0,Math.min(1,energy/energyThreshold(stage)));
}
