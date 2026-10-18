// Wildpath 3.0 / Pass 1: pure mobile-first combat and arena rules.
// Keep tuning independent of meshes, controls, rendering and DOM.
export const ARENA_RADIUS=13;
export const PLAYER_RADIUS=.60;
export const CAMERA_WIDTH=16.5;
export const WAVE_BUDGETS=Object.freeze([11,15,19]);
export const ENEMY_TYPES=Object.freeze({
  mossling:Object.freeze({hp:39,speed:2.35,damage:8,radius:.58,score:100,color:'#7bdb3f'}),
  bramble:Object.freeze({hp:65,speed:1.95,damage:12,radius:.72,score:150,color:'#f26d77'}),
  ember:Object.freeze({hp:34,speed:2.65,damage:7,radius:.53,score:125,color:'#ffab3a'}),
  guardian:Object.freeze({hp:180,speed:1.45,damage:18,radius:1,score:500,color:'#ab72f6'})
});
export const BOOSTS=Object.freeze([
  Object.freeze({id:'tempo',icon:'⚡',name:'Quick Current',description:'Auto attacks 25% faster.'}),
  Object.freeze({id:'damage',icon:'✦',name:'Brighter Bolts',description:'Auto attacks deal 30% more damage.'}),
  Object.freeze({id:'splash',icon:'❋',name:'Wild Splash',description:'Tidal pulse grows 35% wider.'}),
  Object.freeze({id:'range',icon:'◉',name:'Far Sight',description:'Auto-target range grows by 25%.'}),
  Object.freeze({id:'stride',icon:'➜',name:'Swift Roots',description:'Move 18% faster.'}),
  Object.freeze({id:'mend',icon:'♥',name:'Spring Heart',description:'Restore 35 HP and gain 20 max HP.'})
]);
export const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function moveInsideArena(x,z,dx,dz,radius=ARENA_RADIUS-PLAYER_RADIUS){
  const nextX=x+dx,nextZ=z+dz,r=Math.hypot(nextX,nextZ);
  return r>radius?{x:nextX/r*radius,z:nextZ/r*radius}:{x:nextX,z:nextZ};
}
export function normalizedInput(x,z){
  const magnitude=Math.hypot(x,z);
  return magnitude>1?{x:x/magnitude,z:z/magnitude}:{x,z};
}
export function selectAutoTarget(hero,enemies,range){
  let best=null,bestDistance=range;
  for(const e of enemies){
    if(!e.alive)continue;
    const dist=Math.hypot(hero.x-e.x,hero.z-e.z);
    if(dist<bestDistance){best=e;bestDistance=dist;}
  }
  return best;
}
export function spawnAtAngle(angle,radius=ARENA_RADIUS-1.8){
  return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius};
}
export function waveEnemyType(wave,index){
  if(wave===2&&index===WAVE_BUDGETS[wave]-1)return 'guardian';
  if(wave>=1&&index%5===4)return 'ember';
  if(wave>=1&&index%3===2)return 'bramble';
  return 'mossling';
}
export function scoreFromKills(kills,damageTaken){
  return Math.max(0,kills*120-Math.round(damageTaken*6));
}
