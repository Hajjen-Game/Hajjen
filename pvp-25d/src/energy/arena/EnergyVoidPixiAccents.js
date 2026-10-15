// Void VFX 1.0: thin hand-authored Pixi filaments for dark-matter effects.
// Base Rift Slash retains original accepted dual-blade Hero/Pixi treatment.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
export const VOID_PIXI_IDS=new Set([
  "rift-slash","entropy-mark","phase-slip","void-metamorphosis","abyssal-rift","dark-pact"
]);
export const VOID_SLASH_PROC_KINDS=new Set([
  "phantom-assault","umbral-cyclone","executioners-veil","marked-fracture"
]);
const C={heart:0xf7e4ff,light:0xd7b4ff,void:0xab7af2,
  amethyst:0x8656ce,deep:0x4e306f,magenta:0xd68cf0,smoke:0x77709f};
const polar=(p,r,a,ky=.83)=>({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*ky});
function stroke(draw,pts,color=C.void,width=1.2,alpha=.75){
  if(pts.length>1&&alpha>0)draw(pts,color,width,alpha);
}
function facet(draw,p,angle,len,width,color=C.void,alpha=.7){
  const d={x:Math.cos(angle),y:Math.sin(angle)},n={x:-d.y,y:d.x};
  stroke(draw,[
    {x:p.x-d.x*len*.46,y:p.y-d.y*len*.46},
    {x:p.x+n.x*width,y:p.y+n.y*width},
    {x:p.x+d.x*len*.54,y:p.y+d.y*len*.54},
    {x:p.x-n.x*width,y:p.y-n.y*width},
    {x:p.x-d.x*len*.46,y:p.y-d.y*len*.46}
  ],color,1.04,alpha);
}
function orbit(draw,p,t,s,kind="charge"){
  const fade=Math.min(1,t*10,(1-t)*8);
  const n=kind==="metamorphosis"?14:11,r=kind==="metamorphosis"?30*s:20*s;
  for(let k=0;k<n;k++){
    const a=k*TAU/n+(k%2?1:-1)*t*2.6,rr=r*(.84-.39*ease(t));
    const q=polar(p,rr,a);
    facet(draw,q,a+.27,(kind==="metamorphosis"?11:7.3)*s,1.5*s,
      k%3===0?C.heart:k%2?C.void:C.magenta,fade*.77);
    stroke(draw,[q,polar(p,rr*.41,a+.24)],
      k%3===0?C.light:C.deep,.94*s,fade*.42);
  }
  for(let ring=0;ring<3;ring++){
    const pts=[];
    for(let i=0;i<=28;i++){
      const a=i*TAU/28+t*(ring%2?-.7:.7);
      pts.push(polar(p,(9+ring*5.2)*s*(1-.18*ease(t)),a));
    }
    stroke(draw,pts,ring===0?C.heart:ring===1?C.void:C.magenta,
      (ring===0?1.3:.88)*s,fade*(ring===0?.71:.43));
  }
}
function slash(draw,from,to,t,s,kind){
  const fade=Math.min(1,t*11,(1-t)*5);
  const base=from&&to?Math.atan2(to.y-from.y,to.x-from.x):0;
  const cyclone=kind==="umbral-cyclone",execute=kind==="executioners-veil";
  const n=cyclone?3:execute?3:2,span=cyclone?Math.PI*1.7:1.95;
  const r=(cyclone?39:execute?32:27)*s;
  for(let lane=0;lane<n;lane++){
    const pts=[];
    const start=base-span*.5+lane*(cyclone?TAU/3:.18);
    for(let i=0;i<=25;i++){
      const a=start+i*span/25+t*(execute?.54:.17);
      pts.push(polar(to,r+(lane-(n-1)*.5)*3*s,a,.81));
    }
    stroke(draw,pts,lane===0?C.heart:lane===1?C.void:C.magenta,
      (lane===0?2.1:1.2)*s,fade*(lane===0?.83:.62));
    for(let i=2;i<=5;i++){
      const a=start+i*span/7+.15;
      facet(draw,polar(to,r*1.02,a),a+.35,
        (cyclone?14:9)*s,2.1*s,i%2?C.magenta:C.light,fade*.66);
    }
  }
}
function burst(draw,p,t,s,large=false,inward=false){
  const fade=Math.min(1,t*12,(1-t)*5),n=large?14:9;
  for(let i=0;i<n;i++){
    const a=i*TAU/n+.12;
    const u=inward?1-.72*ease(t):.59+.52*ease(t);
    const q=polar(p,(large?43:25)*s*u+(i%4)*1.7*s,a);
    facet(draw,q,a+.2,(large?18:11)*s,(large?2.5:1.8)*s,
      i%4===0?C.heart:i%2?C.void:C.magenta,fade*.82);
    if(i%2===0)stroke(draw,[polar(p,5*s,a),q],
      C.void,1.0*s,fade*.43);
  }
  const rim=[];
  for(let j=0;j<=28;j++){
    const a=j*TAU/28+.23,rad=(large?42:27)*s*(inward?1-.72*ease(t):.5+.43*ease(t));
    rim.push(polar(p,rad,a,.63));
  }
  stroke(draw,rim,C.light,1.32*s,fade*.56);
}
function projectile(draw,from,to,t,s,heavy=false){
  if(!from||!to)return;
  const dx=to.x-from.x,dy=to.y-from.y;
  const len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,lead=ease(t);
  const fade=Math.min(1,t*10,(1-t)*7);
  for(let lane=-2;lane<=2;lane++){
    const pts=[];
    for(let i=0;i<=14;i++){
      const k=i/14,u=clamp(lead-k*(heavy?.31:.25),0,1);
      const offset=(lane*(heavy?3.4:2.15)+Math.sin(k*12+lane*1.2+t*20)*.65)*s;
      pts.push({x:from.x+dx*u+nx*offset,y:from.y+dy*u+ny*offset});
    }
    stroke(draw,pts,lane===0?C.heart:lane%2?C.void:C.magenta,
      (lane===0?1.95:1.02)*s,fade*(lane===0?.9:.59));
  }
  const p={x:from.x+dx*lead,y:from.y+dy*lead};
  facet(draw,p,Math.atan2(dy,dx),(heavy?23:14)*s,
    (heavy?3.5:2.6)*s,C.heart,fade);
  for(let k=0;k<5;k++){
    const u=clamp(lead-(k+1)*.045,0,1);
    const a=t*11+k*TAU/5;
    facet(draw,{x:from.x+dx*u+nx*Math.sin(a)*4*s,
      y:from.y+dy*u+ny*Math.cos(a)*4*s},
      Math.atan2(dy,dx)+a*.12,(heavy?8:6)*s,1.3*s,
      k%2?C.magenta:C.light,fade*.58);
  }
}
function spatial(draw,from,to,t,s){
  if(!from||!to)return;
  const fade=Math.min(1,t*10,(1-t)*5);
  const dx=to.x-from.x,dy=to.y-from.y;
  const len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;
  for(let lane=-2;lane<=2;lane++){
    const pts=[];
    for(let k=0;k<=16;k++){
      const u=k/16;
      const bend=Math.sin(u*Math.PI*3+t*6+lane)*4*lane*s/2.5;
      pts.push({x:from.x+dx*u+nx*bend,y:from.y+dy*u+ny*bend});
    }
    stroke(draw,pts,lane===0?C.heart:lane%2?C.void:C.magenta,
      (lane===0?1.75:.9)*s,fade*(lane===0?.75:.4));
  }
  for(let i=0;i<6;i++){
    const k=(i+.5)/6,q={x:from.x+dx*k,y:from.y+dy*k};
    facet(draw,q,Math.atan2(dy,dx),8*s,1.4*s,
      i%2?C.light:C.void,fade*.64);
  }
}
function rift(draw,p,t,s,kind="open"){
  const fade=Math.min(1,t*8,(1-t)*5);
  const collapse=kind==="rift-implosion",radius=(collapse?47:53)*s;
  for(let ring=0;ring<4;ring++){
    const pts=[];
    const r=radius*(.27+ring*.21)*(collapse?1-.72*ease(t):1+.035*Math.sin(t*13));
    for(let i=0;i<=33;i++){
      const a=i*TAU/33+t*(ring%2?-.45:.55);
      pts.push(polar(p,r,a,.48));
    }
    stroke(draw,pts,ring===0?C.heart:ring%2?C.void:C.magenta,
      (ring===0?1.62:1.04)*s,fade*(ring===0?.73:.51));
  }
  for(let j=0;j<12;j++){
    const a=j*TAU/12+.08;
    const f=polar(p,radius*.85*(collapse?1-.55*ease(t):1),a,.48);
    const tip=polar(p,radius*1.03*(collapse?1-.55*ease(t):1),a,.48);
    stroke(draw,[f,tip],j%2?C.void:C.light,1.34*s,fade*.72);
    facet(draw,tip,a+.27,10*s,2*s,j%3?C.magenta:C.heart,fade*.7);
  }
}
function sky(draw,p,t,s,large=false){
  const fade=Math.min(1,t*10,(1-t)*6);
  const reach=(large?65:43)*s;
  for(let lane=-2;lane<=2;lane++){
    const x=p.x+lane*(large?4:2.6)*s;
    const y=p.y-reach*(1-ease(t));
    stroke(draw,[{x,y:y-reach*.46},{x:x+Math.sin(lane*2)*3*s,y:y+reach*.15},
      {x:p.x+lane*1.2*s,y:p.y}],
      lane===0?C.heart:lane%2?C.magenta:C.light,
      (lane===0?2.7:1.05)*s,fade*(lane===0?.82:.5));
  }
  burst(draw,p,t,s,large,false);
}
function portal(draw,from,to,t,s){
  const fade=Math.min(1,t*12,(1-t)*5);
  for(const p of [from,to].filter(Boolean)){
    for(let r=0;r<3;r++){
      const pts=[];
      for(let i=0;i<=20;i++){
        const a=i*TAU/20+t*(r%2?1.7:-1.3);
        pts.push(polar(p,(11+r*6)*s,a,.77));
      }
      stroke(draw,pts,r===0?C.heart:r===1?C.void:C.magenta,
        (r===0?1.55:1)*s,fade*.68);
    }
  }
  if(from&&to){
    const dx=to.x-from.x,dy=to.y-from.y;
    for(let j=1;j<=5;j++){
      const u=j/6,p={x:from.x+dx*u,y:from.y+dy*u};
      facet(draw,p,Math.atan2(dy,dx)+.4,8*s,1.9*s,
        j%2?C.light:C.amethyst,fade*.64);
    }
  }
}
export function drawVoidPixi(g,event,from,to,t,scale=1){
  if(!VOID_PIXI_IDS.has(event.spellId))return false;
  const {spellId:id,type,kind=""}=event;
  if(id==="rift-slash"&&!VOID_SLASH_PROC_KINDS.has(kind))return false;
  const s=clamp(scale,.62,2.8);
  const draw=(pts,color,width,alpha)=>{
    if(pts.length<2||alpha<=0)return;
    g.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.stroke({color,width,alpha,cap:"round",join:"round"});
  };
  const p=to||from;if(!p)return true;
  if(type==="windup"){orbit(draw,from||p,t,s);return true;}
  if(id==="rift-slash"){
    slash(draw,from||p,p,t,s,kind);
  }else if(id==="entropy-mark"){
    if(kind==="entropy-applied")projectile(draw,from||p,p,t,s);
    else if(kind==="contagion")burst(draw,p,t,s,true);
    else if(kind==="psychic-collapse")burst(draw,p,t,s,true,true);
    else if(kind==="devouring-pact")projectile(draw,from||p,p,t,s*.85);
    else burst(draw,p,t,s*.62,false,false);
  }else if(id==="phase-slip"){
    if(type==="dash")portal(draw,from||p,p,t,s);
    else if(kind==="shadow-ambush")slash(draw,from||p,p,t,s,"executioners-veil");
    else if(kind==="rift-echo-start")burst(draw,p,t,s*.7);
    else if(kind==="rift-echo")spatial(draw,from||p,p,t,s*.8);
    else if(kind==="veilwalk"||kind==="veilwalk-dodge")
      orbit(draw,p,t,s);
    else burst(draw,p,t,s*.7);
  }else if(id==="void-metamorphosis"){
    if(kind==="metamorphosis-start"||kind==="metamorphosis-end")
      orbit(draw,p,t,s,"metamorphosis");
    else if(kind==="dreadblade-arcs"||kind==="form-blades")
      slash(draw,from||p,p,t,s,kind==="dreadblade-arcs"?"umbral-cyclone":"form-blades");
    else if(kind==="mindstorm-spear")sky(draw,p,t,s,false);
    else if(kind==="soul-devourer"||kind==="soul-devourer-finale")
      burst(draw,p,t,s,kind==="soul-devourer-finale",true);
    else burst(draw,p,t,s*.65);
  }else if(id==="abyssal-rift"){
    if(kind==="rift-implosion")rift(draw,p,t,s,"rift-implosion");
    else if(kind==="rift-tendrils")rift(draw,p,t,s*.8,"tendrils");
    else if(kind==="rift-swallow")burst(draw,p,t,s*.7,true,true);
    else rift(draw,p,t,s);
  }else if(id==="dark-pact"){
    if(kind==="pact-sacrifice")orbit(draw,p,t,s);
    else if(kind==="dark-spear")sky(draw,p,t,s,true);
    else burst(draw,p,t,s*.7);
  }
  return true;
}
