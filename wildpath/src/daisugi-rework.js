// Daisugi Rework 1.1 — attack evolution on the ORIGINAL Wildpath 2.x.
// This file contains pure rules only. No arena, camera, speed or nature changes.
// Feature gated by ?daisugi=1; default Wildpath 2.x remains unchanged.
const upgrade=(id,name,icon,desc,requires=[])=>Object.freeze({
  id,classes:['caster'],onlyOpen:true,category:'damage',name,icon,desc,requires
});
export const DAISUGI_CORE_BOOSTS=Object.freeze([
  upgrade('aquavolley','Triple Current','✧',
    'Your single Water Dart becomes a fan of THREE homing water shots.'),
  upgrade('aquachain','Chain Current','ϟ',
    'Water hits leap like chain lightning through up to THREE nearby enemies.'),
  upgrade('aquabounce','Skipping Current','◎',
    'Water Dart ricochets between enemies, hitting up to THREE targets per shot.'),
  upgrade('aquawave','Tidal Wave','≈',
    'Replace Water Dart with a broad automatic forward wave that hits groups.')
]);
export const DAISUGI_CORE_IDS=Object.freeze(DAISUGI_CORE_BOOSTS.map(x=>x.id));
export const DAISUGI_BOOSTS=Object.freeze([
  ...DAISUGI_CORE_BOOSTS,
  upgrade('greatercurrent','Five Streams','✦',
    'Fire FIVE homing water shots in each volley.',['aquavolley']),
  upgrade('chainstorm','Storm Conductor','⚡',
    'Chain Current jumps to up to SIX foes with extended reach.',['aquachain']),
  upgrade('skippingstorm','Rapid Ricochet','↗',
    'Water projectiles can bounce through up to FIVE enemies.',['aquabounce']),
  upgrade('widewave','Cresting Wave','❋',
    'Your wave grows wider and reaches farther, slowing everything it hits.',['aquawave']),
  upgrade('frostsplash','Frost Splash','❄',
    'Impacts splash and slow additional foes, helping create nature combos.'),
  upgrade('flowstate','Rapid Current','»',
    'Automatic attacks fire 25% faster. Movement speed is unchanged.'),
  upgrade('deepcurrent','Deep Water','◈',
    'All automatic attacks deal more damage and hit with clearer impact.'),
  upgrade('watergarden','Rain Garden','☂',
    'A Rainfall burst automatically waters crowded enemies periodically.'),
  upgrade('tideguard','Living Ward','♡',
    'An automatic shield protects you when injured or surrounded.'),
  upgrade('tidalflower','Tidal Bloom','✿',
    'Every few seconds an automatic Tidal Bloom bursts through enemy groups.')
]);
export const hasDaisugiCore=upgrades=>DAISUGI_CORE_IDS.some(id=>upgrades.has(id));
export function daisugiCoreMode(upgrades){
  if(upgrades.has('aquawave'))return 'wave';
  if(upgrades.has('aquabounce'))return 'bounce';
  if(upgrades.has('aquachain'))return 'chain';
  if(upgrades.has('aquavolley'))return 'volley';
  return 'dart';
}
export function chooseDaisugiBoosts(upgrades,stage,rng=Math.random){
  const available=DAISUGI_BOOSTS.filter(b=>!upgrades.has(b.id)&&
    b.requires.every(id=>upgrades.has(id))&&
    (hasDaisugiCore(upgrades)||DAISUGI_CORE_IDS.includes(b.id)));
  if(stage===0&&!hasDaisugiCore(upgrades)){
    // Wave one's reward is ALWAYS attack-transforming, never bland +damage.
    const rotation=Math.min(3,Math.floor(Math.max(0,rng())*4));
    return [0,1,2].map(i=>DAISUGI_CORE_BOOSTS[(i+rotation)%4]);
  }
  const preferred=available.filter(b=>b.requires.length>0),regular=
    available.filter(b=>b.requires.length===0&&
      !DAISUGI_CORE_IDS.includes(b.id));
  const result=[];
  if(preferred.length)result.push(preferred[Math.floor(rng()*preferred.length)]);
  while(result.length<3&&regular.length){
    const index=Math.floor(rng()*regular.length);
    result.push(regular.splice(Math.min(index,regular.length-1),1)[0]);
  }
  // An attack core is a real identity choice, not an accidental replacement.
  // Never suggest an incompatible second core after the player chose one.
  return result;
}
export function daisugiVolleyCount(upgrades){
  return daisugiCoreMode(upgrades)==='volley'?
    upgrades.has('greatercurrent')?5:3:1;
}
export function daisugiVolleyTargets(enemies,player,range,count,primary){
  if(!primary?.alive)return [];
  const living=enemies.filter(e=>e.alive&&
    Math.hypot(e.x-player.x,e.z-player.z)<=range);
  if(!living.length)return [];
  living.sort((a,b)=>Math.hypot(a.x-primary.x,a.z-primary.z)-
    Math.hypot(b.x-primary.x,b.z-primary.z));
  return Array.from({length:Math.max(1,Math.min(5,count))},
    (_,i)=>living[i%living.length]);
}
export function daisugiSplash(upgrades){
  if(!upgrades.has('frostsplash'))return null;
  return {radius:3.0,damage:9,slow:2.5,targets:5};
}
export function daisugiAttackInterval(base,upgrades){
  const wave=daisugiCoreMode(upgrades)==='wave';
  return base*(wave?1.45:1)*(upgrades.has('flowstate')?.75:1);
}
export function daisugiAttackDamage(base,upgrades){
  return base*(upgrades.has('deepcurrent')?1.55:1);
}
export function daisugiChainPlan(upgrades){
  return {hops:upgrades.has('chainstorm')?6:3,
    radius:upgrades.has('chainstorm')?5.8:4.4,
    damageFactor:upgrades.has('chainstorm')?.77:.67,
    slow:upgrades.has('chainstorm')?2.5:1.7};
}
export function daisugiBounceCount(upgrades){
  return upgrades.has('skippingstorm')?4:2; // extra contacts AFTER primary
}
export function nextDaisugiHop(enemies,from,visited,radius){
  const inRange=enemies.filter(e=>e.alive&&!visited.has(e)&&
    Math.hypot(e.x-from.x,e.z-from.z)<=radius);
  inRange.sort((a,b)=>Math.hypot(a.x-from.x,a.z-from.z)-
    Math.hypot(b.x-from.x,b.z-from.z));
  return inRange[0]||null;
}
export function daisugiWaveTargets(enemies,player,target,upgrades){
  const dx=target.x-player.x,dz=target.z-player.z;
  const mag=Math.max(.0001,Math.hypot(dx,dz)),nx=dx/mag,nz=dz/mag;
  const far=upgrades.has('widewave')?10.5:8.2;
  const width=upgrades.has('widewave')?4.9:3.25;
  return enemies.filter(e=>{
    if(!e.alive)return false;
    const px=e.x-player.x,pz=e.z-player.z;
    const forward=px*nx+pz*nz,lateral=Math.abs(px*nz-pz*nx);
    return forward>=0&&forward<=far&&
      lateral<=width*(.50+.50*forward/far)+.35;
  });
}
// Optional bonus waves come only from explicit later boosts.
export function autoSpellChoice({enemies,player,upgrades,cooldowns,shield=0,hp=100,maxHp=100}){
  const nearby=r=>enemies.filter(e=>e.alive&&
    Math.hypot(e.x-player.x,e.z-player.z)<r);
  if(upgrades.has('tideguard')&&cooldowns[2]<=0&&
    (hp<maxHp*.6||(nearby(5.4).length>=3&&shield<18)))return 2;
  if(upgrades.has('watergarden')&&cooldowns[0]<=0&&nearby(15).length>=2)return 0;
  if(upgrades.has('tidalflower')&&cooldowns[1]<=0&&nearby(16).length>=2)return 1;
  return -1;
}
export function clusteredTarget(enemies,player,range,radius=4.6){
  const available=enemies.filter(e=>e.alive&&
    Math.hypot(e.x-player.x,e.z-player.z)<range);
  let best=null,bestScore=-Infinity;
  for(const candidate of available){
    const nearby=available.filter(e=>
      Math.hypot(e.x-candidate.x,e.z-candidate.z)<radius).length;
    const distance=Math.hypot(candidate.x-player.x,candidate.z-player.z);
    const score=nearby*10-distance*.45+(candidate.type==='guardian'?3:0);
    if(score>bestScore){best=candidate;bestScore=score;}
  }
  return best;
}
// Compatibility utilities for optional unlocked legacy spells.
export function daisugiPool(power,upgrades){return power;}
export function daisugiBloom(power,upgrades){return power;}
export function daisugiGuardHp(upgrades){return upgrades.has('tideguard')?57:42;}
