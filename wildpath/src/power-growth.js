export function casterVolley(u,open=true){return !open?(u.has('triple')?3:u.has('double')?2:1):u.has('glintstorm')?5:u.has('triple')?4:u.has('double')?2:1;}
export function casterGlintDamage(u,base=11,open=true){return !open?base*(u.has('triple')?1.14:1):Math.round(base*(u.has('triple')?1.22:1)*(u.has('glintstorm')?1.28:1));}
export function casterBloom(u,open=true){const mid=u.has('bloom'),big=open&&u.has('nova');return {radius:big?7.3:mid?5.4:3.4,damage:big?78:mid?51:29,intensity:big?2.1:mid?1.55:1.25,splinters:big?4:0,splinterRadius:big?2.6:0,splinterDamage:big?23:0};}
export function casterPool(u,open=true){const mid=u.has('snowfield'),big=open&&u.has('hailstorm');return {radius:big?6.7:mid?5.2:3.2,life:big?9:mid?8:5.5,tick:big?.38:mid?.48:.65,damage:big?26:mid?17:6,entryDamage:big?42:mid?24:0,slow:big?3.3:mid?3:2.5};}
export function glintSplash(u,open=true){return open&&u.has('glintstorm')?{radius:3,damage:26,targets:5}:open&&u.has('chain')?{radius:3,damage:19,targets:2}:null;}
export function cascadePower(u,open=true){return !open||!u.has('cascade')?null:{radius:4.7,damage:36,targets:6,maxDepth:u.has('cascadebloom')?2:1};}
export function choosePowerBoosts(pool,upgrades,stage,rng=Math.random){
  const available=pool.filter(b=>!upgrades.has(b.id)&&(!b.requires||b.requires.every(id=>upgrades.has(id))));
  const offensive=available.filter(b=>b.category==='damage'),result=[];
  if(stage<=1){
    for(const id of stage===0?['double','bloom','snowfield']:['triple','nova','hailstorm']){
      const b=offensive.find(item=>item.id===id);
      if(b&&result.length<3)result.push(b);
    }
  }
  // Once an evolution becomes available, always offer at least one in the
  // next Power Surge. A larger spell should not hide behind random card rolls.
  if(stage>=1&&result.length<3){
    const evolutions=offensive.filter(b=>b.requires?.length&&!result.includes(b));
    if(evolutions.length)result.push(evolutions[Math.floor(rng()*evolutions.length)]);
  }
  while(result.length<Math.min(2,offensive.length)){
    const left=offensive.filter(b=>!result.includes(b));
    if(!left.length)break;
    result.push(left[Math.floor(rng()*left.length)]);
  }
  while(result.length<Math.min(3,available.length)){
    const left=available.filter(b=>!result.includes(b));
    if(!left.length)break;
    result.push(left[Math.floor(rng()*left.length)]);
  }
  return result;
}
