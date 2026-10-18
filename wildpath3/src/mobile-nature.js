// Wildpath 3.0 — mobile-specific Nature Rebirth integration.
// Reuse the proven renderer/fusion engine without changing Wildpath 2.x.
// Compact mobile placement, explicit combo seedlings and persistent ancestry.
import {NatureGrowth} from '../../wildpath/src/nature-growth.js?v=3.1.0';
import {ARENA_RADIUS} from './rules.js';
const TAU=Math.PI*2;

export function natureSpawnRadius(tier){
  return tier==='blossom'?2.7:tier==='tree'?2.35:tier==='bush'?1.22:.70;
}
export function mobilePlantSite(x,z,hero,tier,plants=[],ignoreId=null){
  // The 2.x renderer pushes TREE sites 6–7 units away from the player and
  // positions against a 43-unit world. Both are wrong for this arena.
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
  // Preserve spatial groupings for fusion: short predictable offsets rather
  // than 2.x's ten progressively larger teleports.
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
  // Every successful combo kill contributes real, visible plant biomass;
  // the ancestral cluster still advances to bush/tree/rare tiers as before.
  const slot=event.count-1;
  const angle=(slot*2.39996323+event.id*.31)%TAU;
  const radius=.95+Math.sqrt(slot)*.57;
  return {
    ...event,id:100000+event.id*100+slot,kind:'create',tier:'flower',
    x:event.x+Math.cos(angle)*radius,
    z:event.z+Math.sin(angle)*radius
  };
}
export class MobileNatureGrowth extends NatureGrowth{
  constructor(scene,callbacks={}){
    super(scene,callbacks);
    this.satelliteCount=0;
  }
  siteFor(x,z,hero,tier,ignoreId=null){
    return mobilePlantSite(x,z,hero,tier,this.order,ignoreId);
  }
  enforceBudget(hero,incoming){
    // A finite three-wave level has ~45 kills; don't silently recycle
    // plants as 2.x did. The renderer's spatial fusions stay in place.
    const cap=180;
    while(this.order.length>=cap){
      const small=this.order.find(p=>p.tier==='flower'||p.tier==='bush');
      if(!small)break; // Never erase a rare tree.
      this.remove(small);
    }
  }
  apply(event,hero){
    if(!event)return;
    if(event.kind==='grow'){
      const seedling=comboSeedling(event);
      if(seedling){
        super.apply(seedling,hero);
        this.satelliteCount++;
      }
      return;
    }
    super.apply(event,hero);
  }
  rebuildFusionDecor(region){
    super.rebuildFusionDecor(region);
    // When little seedlings merge they should visibly become something
    // MORE substantial, not disappear into a low ground decal. Preserve
    // their mixed flower colors and build one clear central focal point.
    const preferred=region.colors[Math.floor(region.colors.length/2)]||'mint';
    const m=this.paletteMeshes[preferred]||this.paletteMeshes.mint;
    const advanced=region.kind==='grove'||region.kind==='enchanted';
    const rich=region.kind==='thicket'||advanced;
    const factor=Math.min(1.55,1+Math.log1p(region.count)*.12);
    const add=(source,name,x,y,z,sx,sy,sz,rz=0)=>{
      const instance=source.createInstance('wildpath3 fused '+region.kind+' '+name);
      instance.parent=region.root;
      instance.position.set(x,y,z);
      instance.scaling.set(sx*factor,sy*factor,sz*factor);
      instance.rotation.z=rz;
      instance.isPickable=false;
      region.meshes.push(instance);
    };
    if(advanced){
      add(this.bark,'visible central stem',0,.67,0,.30,1.35,.30);
      add(this.bark,'forked branch',.40,1.24,.02,.18,.73,.19,-.58);
    }
    const height=advanced?1.83:rich?.83:.56;
    const width=advanced?1.25:rich?.92:.70;
    add(m.leaf,'substantial mixed foliage',0,height,0,width,.85,width);
    add(m.light,'contrasting visible crown',.38,height+.19,-.16,
      width*.65,.56,width*.65);
    const tones=[m.petal,m.accent,m.petal,m.center,m.accent,m.petal];
    for(let i=0;i<tones.length;i++){
      const angle=(i/tones.length)*Math.PI*2;
      const x=Math.cos(angle)*width*.68,z=Math.sin(angle)*width*.53;
      add(tones[i],'readable raised blossoms',x,height+.55,z,
        .30,.26,.30);
    }
    if(region.kind==='enchanted'){
      for(let i=0;i<3;i++){
        const angle=i*Math.PI*2/3;
        const alt=this.paletteMeshes[
          region.colors[(i*3)%region.colors.length]||'rose']||m;
        add(alt.petal,'rare mixed flower tips',Math.cos(angle)*1.26,2.40,
          Math.sin(angle)*1.00,.36,.30,.35);
      }
    }
  }
  clear(){
    super.clear();
    this.satelliteCount=0;
  }
  snapshot(){
    return {...super.snapshot(),satellites:this.satelliteCount};
  }
}
