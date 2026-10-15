// Impact VFX 1.0: precision Kinetic Pixi accents on the real Babylon combat.
// No original Crystal Bolt, Sun Lance or Pulse Mend code is changed.
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
export const IMPACT_PIXI_IDS=new Set([
  "phase-rush","arc-strike","pulse-sever","gravity-hammer",
  "seismic-uppercut","kinetic-rampart"
]);
const C={white:0xfff2e7,peach:0xffc7b5,coral:0xf18499,
  magenta:0xd8588c,violet:0xa78cc1,steel:0x91a9c6};
const polar=(p,r,a,k=.82)=>({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*k});
function line(draw,pts,tone=C.coral,width=1,alpha=.75){
  if(pts.length>1&&alpha>0)draw(pts,tone,width,alpha);
}
function facet(draw,p,a,l,w,color,alpha){
  const d={x:Math.cos(a),y:Math.sin(a)},n={x:-d.y,y:d.x};
  line(draw,[
    {x:p.x-d.x*l*.42,y:p.y-d.y*l*.42},
    {x:p.x+n.x*w,y:p.y+n.y*w},
    {x:p.x+d.x*l*.58,y:p.y+d.y*l*.58},
    {x:p.x-n.x*w,y:p.y-n.y*w},
    {x:p.x-d.x*l*.42,y:p.y-d.y*l*.42}
  ],color,1.05,alpha);
}
function lattice(draw,p,t,s){
  const fade=Math.min(1,t*9,(1-t)*8);
  for(let i=0;i<11;i++){
    const a=i*TAU/11+t*(i%2?3.5:-3.5),r=(15+(i%3)*3)*s*(.85-.42*ease(t));
    const q=polar(p,r,a);
    facet(draw,q,a+.34,(6+i%3*2)*s,1.4*s,i%3?C.coral:C.white,fade*.78);
    line(draw,[q,polar(p,6*s,a+.18)],i%2?C.magenta:C.peach,.9*s,fade*.46);
  }
  for(let k=0;k<3;k++){
    const pts=[];
    for(let j=0;j<=16;j++){
      const a=j*TAU/16+t*(k%2?.7:-.7);
      pts.push(polar(p,(9+k*4)*s*(.88-.3*ease(t)),a));
    }
    line(draw,pts,k===0?C.white:k===1?C.coral:C.violet,1.1*s,fade*.52);
  }
}
function pressure(draw,p,t,s,large=false,ground=false){
  const fade=Math.min(1,t*13,(1-t)*5),r=(large?36:23)*s;
  for(let k=0;k<(large?3:2);k++){
    const pts=[];
    for(let i=0;i<=36;i++){
      const a=i*TAU/36+(k%2?t*.2:-t*.18),rr=r*(.38+k*.22+ease(t)*.32);
      pts.push(polar(p,rr,a,ground?.49:.74));
    }
    line(draw,pts,k===0?C.white:k===1?C.coral:C.violet,
      (k===0?1.7:1)*s,fade*(k===0?.73:.5));
  }
  for(let i=0;i<(large?14:8);i++){
    const a=i*TAU/(large?14:8)+.11;
    const from=polar(p,(large?13:8)*s,a,ground?.49:.75);
    const q=polar(p,(large?36:24)*s*(.67+.46*ease(t))+(i%3)*2*s,a,ground?.49:.75);
    line(draw,[from,q],i%3?C.coral:C.white,(i%3?1.1:1.45)*s,fade*.59);
    facet(draw,q,a+.26,(large?13:8)*s,1.5*s,
      i%2?C.peach:C.violet,fade*.74);
  }
}
function cut(draw,from,to,t,s,wide=false,second=false){
  if(!from||!to)return;
  const fade=Math.min(1,t*14,(1-t)*5);
  const dir=Math.atan2(to.y-from.y,to.x-from.x),arc=wide?2.75:2.1;
  for(let lane=0;lane<4;lane++){
    const pts=[],r=(wide?34:24)*s+(lane-2)*2.5*s;
    for(let i=0;i<=18;i++){
      const a=dir-arc*.5+i*arc/18+(1-ease(t))*.29;
      pts.push(polar(to,r,a,.83));
    }
    line(draw,pts,lane===0?C.white:lane===1?C.peach:lane===2?C.coral:C.magenta,
      (lane===0?1.9:lane===1?2.3:1.0)*s,fade*(lane===0?.87:.68));
  }
  for(let i=0;i<7;i++){
    const a=dir-arc*.5+i*arc/6;
    const q=polar(to,(wide?34:26)*s,a);
    facet(draw,q,a,(wide?14:9)*s,1.7*s,
      i%3?C.coral:C.white,fade*.73);
  }
  if(second)pressure(draw,to,t,s*.49,false);
}
function travel(draw,from,to,t,s,heavy=false){
  if(!from||!to)return;
  const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy)||1;
  const nx=-dy/len,ny=dx/len,lead=ease(t);
  const fade=Math.min(1,t*12,(1-t)*7);
  for(let lane=-2;lane<=2;lane++){
    const pts=[];
    for(let j=0;j<=12;j++){
      const trail=j/12,u=clamp(lead-trail*.30,0,1);
      const sway=Math.sin(trail*10+lane*.65+t*18)*1.4*s;
      const side=(lane*(heavy?3.2:2.4)+sway)*s;
      pts.push({x:from.x+dx*u+nx*side,y:from.y+dy*u+ny*side});
    }
    line(draw,pts,lane===0?C.white:lane%2?C.coral:C.peach,
      (lane===0?2.15:1.05)*s,fade*(lane===0?.86:.62));
  }
  const q={x:from.x+dx*lead,y:from.y+dy*lead};
  facet(draw,q,Math.atan2(dy,dx),(heavy?20:12)*s,
    (heavy?3.8:2.3)*s,C.white,fade);
}
function sever(draw,p,t,s){
  const fade=Math.min(1,t*13,(1-t)*7);
  for(let ring=0;ring<3;ring++){
    const pts=[];
    for(let i=0;i<=24;i++){
      const a=i*TAU/24+ring*.25+t*(ring%2?1:-1);
      pts.push(polar(p,(12+ring*8)*s*(.68+.4*ease(t)),a));
    }
    line(draw,pts,ring===0?C.white:ring===1?C.peach:C.magenta,
      (ring===0?1.9:1.2)*s,fade*.8);
  }
  for(let i=0;i<8;i++){
    const a=i*TAU/8+.2;
    facet(draw,polar(p,26*s*(.72+.45*ease(t)),a),
      a+.3,12*s,2*s,i%2?C.coral:C.white,fade*.83);
  }
}
function ground(draw,p,t,s,warning=false){
  const f=Math.min(1,t*7,(1-t)*5),r=(warning?48:38)*s;
  for(let ring=0;ring<3;ring++){
    const pts=[];
    for(let j=0;j<=28;j++){
      const a=j*TAU/28+t*(ring%2?.27:-.21);
      pts.push(polar(p,r*(.54+ring*.20)*(warning?1:.64+ease(t)*.51),a,.47));
    }
    line(draw,pts,ring===0?C.white:ring===1?C.coral:C.violet,
      (ring===0?1.7:1.15)*s,f*.79);
  }
  for(let i=0;i<10;i++){
    const a=i*TAU/10;
    const tip=polar(p,r*1.06*(warning?1:.64+ease(t)*.44),a,.47);
    const mid=polar(p,r*.77,a,.47);
    line(draw,[mid,tip],i%2?C.magenta:C.peach,1.5*s,f*.69);
    facet(draw,tip,a+.5,10*s,1.9*s,i%3?C.coral:C.white,f*.69);
  }
}
function wall(draw,p,t,s){
  const fade=Math.min(1,t*12,(1-t)*5);
  for(let lane=-3;lane<=3;lane++){
    const x=p.x+lane*7*s,z=p.y-22*s+Math.abs(lane)*3*s;
    const pts=[{x,y:z+15*s},{x:x-4*s,y:z},
      {x:x+3*s,y:z-8*s},{x:x+6*s,y:z+16*s}];
    line(draw,pts,lane%2?C.steel:C.peach,1.25*s,fade*.76);
    facet(draw,{x,y:z},-Math.PI/2,19*s,3.4*s,
      lane%2?C.coral:C.white,fade*.68);
  }
  ground(draw,p,t,s*.48,false);
}
export function drawImpactPixi(g,event,from,to,t,scale=1){
  if(!IMPACT_PIXI_IDS.has(event.spellId))return false;
  const s=clamp(scale,.6,2.8);
  const draw=(pts,color,width,alpha)=>{
    if(pts.length<2||alpha<=0)return;
    g.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.stroke({color,width,alpha,cap:"round",join:"round"});
  };
  const p=to||from;if(!p)return true;
  const {spellId:id,type}=event,kind=event.kind||"";
  if(type==="windup"||type==="charge-start"){
    lattice(draw,from||p,t,s);return true;
  }
  if(id==="phase-rush"){
    if(type==="charge-trail")pressure(draw,p,t,s*.4);
    else if(type==="charge-impact"||kind==="meteor-charge")
      pressure(draw,p,t,s,kind==="meteor-charge");
    else if(kind==="piercing-charge")travel(draw,from||p,p,t,s,true);
    else if(kind==="relentless-pursuit")lattice(draw,p,t,s);
    else pressure(draw,p,t,s*.68);
  }else if(id==="arc-strike"){
    if(type==="hit")cut(draw,from||p,p,t,s,false,event.second);
    else if(kind==="twin-arc")cut(draw,from||p,p,t,s,true,true);
    else if(kind==="overdrive"||kind==="overdrive-hit")
      cut(draw,from||p,p,t,s*.85,false,true);
    else if(kind==="kinetic-reprisal"||kind==="kinetic-reprisal-ready")
      sever(draw,p,t,s*.7);
    else pressure(draw,p,t,s*.7);
  }else if(id==="pulse-sever"){
    if(type==="interrupt"||kind==="echo-sever"||kind==="countershock"){
      sever(draw,p,t,s);
      if(kind==="countershock")pressure(draw,p,t,s,true);
    }else if(kind==="warpath")lattice(draw,p,t,s*.93);
    else cut(draw,from||p,p,t,s*.75);
  }else if(id==="gravity-hammer"){
    if(type==="ground-telegraph")ground(draw,p,t,s,true);
    else if(kind==="gravity-impact")ground(draw,p,t,s,false);
    else if(kind==="seismic-wave")pressure(draw,p,t,s,true,true);
    else if(kind==="gravity-well")ground(draw,p,t,s*.87,false);
  }else if(id==="seismic-uppercut"){
    if(kind==="uppercut-launch"){
      for(let i=0;i<5;i++){
        const a=i*TAU/5;
        const q=polar(p,(10+i%2*8)*s,a);
        line(draw,[polar(p,5*s,a),{x:q.x,y:q.y-(10+ease(t)*22)*s}],
          i%2?C.white:C.coral,1.9*s,Math.min(1,t*9,(1-t)*6));
      }
    }else if(kind==="uppercut-fracture"||kind==="uppercut-crash")
      ground(draw,p,t,s,false);
    else cut(draw,from||p,p,t,s,true);
  }else if(id==="kinetic-rampart"){
    if(kind==="rampart-start"||type==="ability")wall(draw,p,t,s);
    else if(kind==="rampart-volley"||type==="hit"){
      travel(draw,from||p,p,t,s,true);
      pressure(draw,p,t,s*.62);
    }else pressure(draw,p,t,s);
  }
  return true;
}
