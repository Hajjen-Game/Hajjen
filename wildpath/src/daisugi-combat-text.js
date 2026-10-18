// Pure presentation rules for Daisugi's crowded automatic AoE combat.
// Does not touch damage, crit, scores, combos or Nature Rebirth state.
export const DAISUGI_TEXT_LIMITS=Object.freeze({
  damage:3,total:7,nearbyDistance:3.4,
  damageLifetime:.72,magicLifetime:.72,natureLifetime:1.03
});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function daisugiTextPlan(texts,pos,kind,value){
  if(kind==='score')return {action:'hide'};
  const damage=kind==='normal'||kind==='crit';
  if(damage){
    // Batch rapid water chain/bounce/AoE hits in the same physical cluster.
    const nearest=texts.filter(t=>t.damageGroup&&t.life>.20&&
      distance(t.pos,pos)<DAISUGI_TEXT_LIMITS.nearbyDistance)
      .sort((a,b)=>distance(a.pos,pos)-distance(b.pos,pos))[0];
    const points=Math.max(0,Math.round(Number(String(value).match(/\d+/)?.[0]||0)));
    if(nearest)return {action:'merge-damage',target:nearest,points,
      crit:kind==='crit'};
    if(texts.filter(t=>t.damageGroup).length>=DAISUGI_TEXT_LIMITS.damage)
      return {action:'hide'};
    if(texts.length>=DAISUGI_TEXT_LIMITS.total)return {action:'hide'};
    return {action:'new-damage',points,crit:kind==='crit',
      life:DAISUGI_TEXT_LIMITS.damageLifetime};
  }
  if(kind==='energy'){
    const existing=texts.find(t=>t.kind==='energy'&&t.life>.16);
    if(existing)return {action:'merge-energy',target:existing,
      points:Math.max(1,Math.round(Number(String(value).match(/\d+/)?.[0]||1)))};
    if(texts.length>=DAISUGI_TEXT_LIMITS.total)return {action:'hide'};
    return {action:'new-energy',life:DAISUGI_TEXT_LIMITS.magicLifetime};
  }
  if(kind==='nature'){
    // One readable label for the latest fusion / tree tier in each cluster.
    const close=texts.filter(t=>t.kind==='nature'&&distance(t.pos,pos)<5.1);
    if(close.length)return {action:'merge-nature',target:close[close.length-1]};
    if(texts.filter(t=>t.kind==='nature').length>=2)return {action:'hide'};
    if(texts.length>=DAISUGI_TEXT_LIMITS.total)return {action:'hide'};
    return {action:'new',life:DAISUGI_TEXT_LIMITS.natureLifetime};
  }
  // Incoming damage, guards and healing are always important to the player.
  if(kind==='hurt'||kind==='block'||kind==='heal'){
    const other=texts.find(t=>t.kind===kind&&t.life>.35);
    if(other)return {action:'merge-status',target:other};
    return {action:'new',life:.9};
  }
  if(texts.length>=DAISUGI_TEXT_LIMITS.total)return {action:'hide'};
  return {action:'new',life:.74};
}
export function daisugiDamageLabel(points,crits=0){
  return (crits>0?'✦ ':'')+Math.max(0,Math.round(points)).toLocaleString('en-US');
}
