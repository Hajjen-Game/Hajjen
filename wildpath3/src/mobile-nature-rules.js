// Pure, unit-testable Wildpath 3.0 nature positioning and combo ancestry.
// Babylon and the legacy renderer do not belong in this module.
import {ARENA_RADIUS} from './rules.js?v=3.0.2';
const TAU=Math.PI*2;
export function natureSpawnRadius(tier){
  return tier==='blossom'?2.7:tier==='tree'?2.35:tier==='bush'?1.22:.70;
}
export function mobilePlantSite(x,z,hero,tier,plants=[],ignoreId=null){
  const safe=ARENA_RADIUS-1.55;
  const dx=x-hero.x,dz=z-hero.z,d=Math.hypot(dx,dz);
  const minHero=natureSpawnRadius(tier);
  if(d<minHero){
    const theta=d>.06?Math.atan2(dz,dx):Math.atan2(z+2,x+1);
    x=hero.x+Math.cos(theta)*minHero;
    z=hero.z+Math.sin(theta)*minHero;
  }
  const clamp=()=>{
    const r=Math.hypot(x,z);
    if(r>safe){x=x/r*safe;z=z/r*safe;}
  };
  clamp();
  const spacing=tier==='blossom'?2.4:tier==='tree'?2.15:
    tier==='bush'?1.05:.62;
  for(let i=0;i<6;i++){
    if(plants.every(p=>p.id===ignoreId||
      Math.hypot(p.targetX-x,p.targetZ-z)>=spacing))break;
    const a=i*2.39996+(x+z)*.07,step=.55+i*.26;
    x+=Math.cos(a)*step;z+=Math.sin(a)*step;clamp();
  }
  return {x,z};
}
export function comboSeedling(event){
  if(event.kind!=='grow'||event.count<2)return null;
  const slot=event.count-1;
  const angle=(slot*2.39996323+event.id*.31)%TAU;
  const radius=.95+Math.sqrt(slot)*.57;
  return {...event,id:100000+event.id*100+slot,kind:'create',tier:'flower',
    x:event.x+Math.cos(angle)*radius,z:event.z+Math.sin(angle)*radius};
}
