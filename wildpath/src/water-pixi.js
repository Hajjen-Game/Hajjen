// Wildpath Water Magic: crisp Pixi water signatures for an orthographic
// portrait camera. Babylon remains authoritative for ALL gameplay/damage.
const TAU=Math.PI*2;
const clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,n));
const fade=(u)=>Math.pow(1-clamp(u,0,1),1.25);
function stroke(g,p,r,aspect,color,w,a){
  if(p&&a>0)g.ellipse(p.x,p.y,r,r*aspect)
    .stroke({color,width:w,alpha:clamp(a,0,1)});
}
function dot(g,x,y,r,color,alpha){
  if(alpha>0)g.circle(x,y,Math.max(.5,r)).fill({color,alpha:clamp(alpha,0,1)});
}
function line(g,x1,y1,x2,y2,color,w,a){
  g.moveTo(x1,y1).lineTo(x2,y2).stroke({color,width:w,alpha:clamp(a,0,1),cap:'round'});
}
export function drawWaterProjectile(g,from,head,scale,time,seed=0){
  if(!from||!head)return;
  const dx=head.x-from.x,dy=head.y-from.y;
  const dist=Math.max(.01,Math.hypot(dx,dy));
  const nx=-dy/dist,ny=dx/dist;
  const s=clamp(scale,.72,1.16);
  // Short, sharp twin streams with staggered spray — no bulbous shell/trail.
  const wobble=Math.sin(time*15+seed*.12)*1.8*s;
  const tail={x:head.x-dx/dist*19*s,y:head.y-dy/dist*19*s};
  line(g,tail.x+nx*wobble,tail.y+ny*wobble,
    head.x,head.y,0x2cacc3,3.1*s,.60);
  line(g,tail.x+nx*wobble*.6,tail.y+ny*wobble*.6,
    head.x,head.y,0xb7fffa,1.5*s,.93);
  for(let i=0;i<3;i++){
    const d=6+i*5,off=Math.sin(time*19+i*2.6+seed)*3.1;
    dot(g,head.x-dx/dist*d+nx*off,
      head.y-dy/dist*d+ny*off,(1.65-i*.23)*s,
      i%2?0x74e5e6:0xe2fffc,.80-i*.1);
  }
  dot(g,head.x,head.y,3.25*s,0x70e8ee,.8);
  dot(g,head.x-.55,head.y-.6,1.65*s,0xf5ffff,1);
}
export function drawWaterSpell(g,e,p,worldScale){
  if(!p)return false;
  const u=clamp(e.elapsed/e.life,0,1),a=fade(u);
  const k=clamp(e.intensity,.6,2.15);
  const base=clamp(worldScale,5,19);
  if(e.name==='Living Pond'){
    const r=(8+u*33)*k;
    stroke(g,p,r,.70,0xa2ffea,2.8,a*.88);
    stroke(g,p,r*.67,.74,0xf4fffa,1.3,a*.74);
    for(let i=0;i<7;i++){
      const ang=i*TAU/7+e.seed*.08;
      dot(g,p.x+Math.cos(ang)*r*.85,p.y+Math.sin(ang)*r*.64,
        1.9,i%3?0xb6fcdd:0xffffff,a*.75);
    }
    return true;
  }
  if(e.name==='Water Dart'){
    if(e.stage==='charge'||e.stage==='core'){
      stroke(g,p,5+u*10,.75,0xa1fffa,1.9,a*.9);
      for(let i=0;i<3;i++){
        const t=i*TAU/3+u*4;
        dot(g,p.x+Math.cos(t)*7,p.y+Math.sin(t)*4.6,2,0xc8fffa,a);
      }
    }else if(e.stage==='burst'||e.stage==='reaction'){
      const r=5+u*18*k;
      stroke(g,p,r,.77,0x68e7ea,2.5,a*.85);
      stroke(g,p,r*.73,.76,0xd6ffff,1.1,a);
      for(let i=0;i<5;i++){
        const t=i*TAU/5+e.seed*.1;
        dot(g,p.x+Math.cos(t)*r,p.y+Math.sin(t)*r*.77,1.8,0xe8ffff,a);
      }
    }
    return true;
  }
  if(e.name==='Rainfall'){
    if(e.stage==='charge'||e.stage==='core'){
      stroke(g,p,base*k,.67,0x82e9f1,2.0,a*.8);
      for(let i=0;i<7;i++){
        const x=p.x+Math.sin(i*1.7+e.seed)*base*.85;
        const y=p.y-10-(i%3)*5+u*16;
        line(g,x,y,x-1.8,y+5,0xd8ffff,1.4,a*.72);
      }
    }else if(e.stage==='burst'){
      const r=(14+u*55)*k;
      stroke(g,p,r,.70,0xa5fff1,2.9,a*.91);
      stroke(g,p,r*.65,.7,0x4bc4d7,1.4,a*.77);
      for(let i=0;i<14;i++){
        const ang=i*2.4+e.seed*.06;
        const dr=.2+(i%4)*.23;
        const x=p.x+Math.cos(ang)*r*dr,y=p.y+Math.sin(ang)*r*dr*.68;
        line(g,x,y-9,x-2,y+5,0xc8ffff,1.45,a*.83);
      }
    }else if(e.stage==='reaction'||e.stage==='aftermath'){
      stroke(g,p,9+u*15,.72,0x93f3f8,1.5,a*.65);
    }
    return true;
  }
  if(e.name==='Tidal Bloom'||e.name==='Tidal Cascade'||
     e.name==='Water Splash'){
    if(e.stage==='charge'||e.stage==='core'){
      stroke(g,p,10+u*base*k,.7,0x68e2ea,3,a*.76);
      stroke(g,p,6+u*base*.66,.72,0xf0ffff,1.6,a*.86);
    }else if(e.stage==='burst'||e.stage==='reaction'){
      const r=clamp((15+u*60)*k,6,155);
      stroke(g,p,r,.76,0x62cddf,3.8,a*.93);
      stroke(g,p,r*.82,.76,0xc2ffff,2.1,a*.96);
      stroke(g,p,r*.55,.76,0x4ca7d0,1.55,a*.60);
      const count=e.name==='Tidal Bloom'?13:7;
      for(let i=0;i<count;i++){
        const theta=i*TAU/count+e.seed*.032;
        const x=p.x+Math.cos(theta)*r*.94;
        const y=p.y+Math.sin(theta)*r*.74;
        const dx=Math.cos(theta),dy=Math.sin(theta);
        line(g,x-dx*8,y-dy*5,x+dx*7,y+dy*5,
          i%3?0x78dceb:0xffffff,2.4,a*.88);
        dot(g,x+dx*9,y+dy*8,2.2,0xeaffff,a*.8);
      }
    }else if(e.stage==='aftermath'){
      stroke(g,p,14+u*52*k,.78,0x80deea,1.5,a*.65);
    }
    return true;
  }
  if(e.name==='Tide Guard'){
    const r=(14+u*33)*k;
    stroke(g,p,r,.77,0x76f7db,2.9,a*.85);
    stroke(g,p,r*.70,.78,0xc5fff0,1.5,a*.94);
    for(let i=0;i<5;i++){
      const ang=i*TAU/5+u*2;
      dot(g,p.x+Math.cos(ang)*r*.85,p.y+Math.sin(ang)*r*.7,
        2.0,0xefffff,a*.85);
    }
    return true;
  }
  return false;
}
export function drawRainfallField(g,area,project,time){
  const center=project(area.x,.26,area.z);
  const edge=project(area.x+area.radius,.26,area.z);
  if(!center||!edge)return;
  const r=clamp(Math.hypot(edge.x-center.x,edge.y-center.y),13,148);
  // A light aerial rainfall effect, not the original opaque ice ring.
  stroke(g,center,r,.77,0x65d3e2,1.6,.62);
  const droplets=clamp(Math.round(area.radius*2.0),6,14);
  for(let i=0;i<droplets;i++){
    const a=i*2.39996+area.x*.07,rr=r*(.2+(i%4)*.16);
    const x=center.x+Math.cos(a)*rr,y=center.y+Math.sin(a)*rr*.75;
    const drop=(time*32+i*11)%20;
    line(g,x,y-8+drop,x-1.6,y-3+drop,0xc2faff,1.4,.58);
    if(i%3===0)stroke(g,{x,y:y+6},3+Math.sin(time*2+i)*1,.50,
      0xa5ffff,.8,.55);
  }
}
export function drawWaterSurfaces(g,spots,project,time){
  for(const s of spots.slice(0,14)){
    const p=project(s.x,-.047,s.z),outer=project(s.x+s.radius,-.047,s.z);
    if(!p||!outer)continue;
    const r=clamp(Math.hypot(outer.x-p.x,outer.y-p.y),8,78);
    const w=.68+Math.sin(time*1.4+s.id)*.15;
    // Two fine ripples, intentionally no solid screen-space overlays.
    stroke(g,p,r*w,.72,s.permanent?0xbeffee:0x7bdbe5,
      s.permanent?1.35:1.1,s.permanent?.32:.23);
    if(s.permanent){
      const a=time*.37+s.id;
      dot(g,p.x+Math.cos(a)*r*.53,p.y+Math.sin(a)*r*.38,
        1.45,0xeeffeb,.66);
    }
  }
}
