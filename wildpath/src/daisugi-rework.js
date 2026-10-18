// Daisugi Rework 1.0: opt-in automatic magic on the *original* Wildpath 2.x.
// Pure combat rules: no world geometry, movement values, camera or DOM changes.
// This module is deliberately inactive unless ?daisugi=1 is in the URL.
export const DAISUGI_BOOSTS=Object.freeze([
  {id:'crosscurrent',classes:['caster'],onlyOpen:true,category:'damage',icon:'❋',
    name:'Crosscurrent',desc:'Fire two additional homing Water Darts in every automatic volley.'},
  {id:'frostwave',classes:['caster'],onlyOpen:true,category:'damage',icon:'❄',
    name:'Frostwave',desc:'Every Water Dart splashes farther and slows up to seven nearby enemies.'},
  {id:'downpour',classes:['caster'],onlyOpen:true,category:'damage',icon:'☂',
    name:'Deep Downpour',desc:'Automatic Rainfall covers a wider area, slows longer and ticks harder.'},
  {id:'tidalecho',classes:['caster'],onlyOpen:true,category:'damage',icon:'✿',
    name:'Tidal Echo',desc:'Tidal Bloom spreads farther and releases two secondary splash bursts.'},
  {id:'flowstate',classes:['caster'],onlyOpen:true,category:'damage',icon:'〰',
    name:'Flow State',desc:'Water Darts fire 25% faster. Movement speed remains unchanged.'},
  {id:'guardianpulse',classes:['caster'],onlyOpen:true,category:'defense',icon:'❖',
    name:'Living Ward',desc:'Automatic Tide Guard slows surrounding enemies and grants extra shielding.'}
]);
export function daisugiVolleyCount(upgrades){
  const base=upgrades.has('glintstorm')?7:
    upgrades.has('triple')?5:upgrades.has('double')?4:3;
  return Math.min(9,base+(upgrades.has('crosscurrent')?2:0));
}
export function daisugiVolleyTargets(enemies,player,range,count,primary){
  if(!primary?.alive)return [];
  const living=enemies.filter(e=>e.alive &&
    Math.hypot(e.x-player.x,e.z-player.z)<=range);
  if(!living.length)return [];
  living.sort((a,b)=>{
    const da=Math.hypot(a.x-primary.x,a.z-primary.z);
    const db=Math.hypot(b.x-primary.x,b.z-primary.z);
    return da-db || Math.hypot(a.x-player.x,a.z-player.z)-
      Math.hypot(b.x-player.x,b.z-player.z);
  });
  return Array.from({length:Math.min(9,Math.max(1,count))},(_,i)=>living[i%living.length]);
}
export function daisugiSplash(upgrades){
  const heavy=upgrades.has('glintstorm');
  const chained=upgrades.has('chain');
  const frozen=upgrades.has('frostwave');
  return {
    radius:frozen?3.9:heavy?3.35:chained?3.0:2.45,
    damage:frozen?heavy?29:21:heavy?26:chained?19:10,
    slow:frozen?3.1:heavy?2.1:1.4,
    targets:frozen?7:heavy?6:chained?5:4
  };
}
export function daisugiAttackInterval(base,upgrades){
  return base*.70*(upgrades.has('tempo')?.68:1)*
    (upgrades.has('flowstate')?.75:1);
}
export function daisugiPool(power,upgrades){
  if(!upgrades.has('downpour'))return power;
  return {...power,radius:power.radius+1.35,damage:power.damage+8,
    entryDamage:power.entryDamage+18,tick:Math.max(.27,power.tick*.78),
    slow:power.slow+1.15};
}
export function daisugiBloom(power,upgrades){
  if(!upgrades.has('tidalecho'))return power;
  return {...power,radius:power.radius+1.25,damage:power.damage+10,
    echoBursts:2,echoDamage:Math.round(power.damage*.43),
    echoRadius:2.6};
}
export function daisugiGuardHp(upgrades){
  return upgrades.has('guardianpulse')?90:
    upgrades.has('shield')?70:49;
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
export function autoSpellChoice({enemies,player,upgrades,cooldowns,shield=0,hp=100,maxHp=100}){
  const nearby=(distance)=>enemies.filter(e=>e.alive&&
    Math.hypot(e.x-player.x,e.z-player.z)<distance);
  const close=nearby(6.3);
  if(cooldowns[2]<=0 && (hp<maxHp*.70 ||
      (close.length>=3&&shield<16)))return 2;
  if(cooldowns[0]<=0&&nearby(17).length>=2)return 0;
  if(cooldowns[1]<=0&&nearby(16).length>0)return 1;
  if(cooldowns[0]<=0&&nearby(14).length>0)return 0;
  return -1;
}
