// Genesis VFX 1.0: finely layered Vital threads and translucent petal outlines.
// Base Pulse Mend deliberately remains on its original authored Pixi path.
// No edits to existing Crystal Bolt, Sun Lance or other accepted signatures.
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=x=>{const t=clamp(x,0,1);return t*t*(3-2*t)};
export const GENESIS_PIXI_IDS=new Set(["resonance-guard","vital-cascade",
  "stasis-seal","stasis-wave","vital-recall","soul-relay"]);
export const GENESIS_PULSE_EVOS=new Set(["vital-crescendo",
  "second-heart","second-heart-armed","vital-reversal"]);
const C={core:0xf0fff2,leaf:0x8bf0bc,mint:0x5fd9a8,
  aqua:0x89e2e9,dim:0x368d99,ivory:0xe8ffca};
const polar=(p,r,a,flat=.85)=>({x:p.x+Math.cos(a)*r,
  y:p.y+Math.sin(a)*r*flat});
function petal(stroke,c,a,size,alpha,tone=C.leaf){
  const f={x:Math.cos(a),y:Math.sin(a)},n={x:-f.y,y:f.x};
  const len=size;
  stroke([
    {x:c.x-f.x*len*.42,y:c.y-f.y*len*.42},
    {x:c.x+n.x*len*.25+f.x*len*.05,y:c.y+n.y*len*.25+f.y*len*.05},
    {x:c.x+f.x*len*.59,y:c.y+f.y*len*.59},
    {x:c.x-n.x*len*.25+f.x*len*.05,y:c.y-n.y*len*.25+f.y*len*.05},
    {x:c.x-f.x*len*.42,y:c.y-f.y*len*.42}
  ],tone,1.1,alpha);
}
function bloom(stroke,p,t,s,big=false){
  const a=Math.min(1,t*12,(1-t)*4),num=big?12:8;
  for(let i=0;i<num;i++){
    const angle=i*TAU/num+.15;
    const r=(big?24:16)*s*(.69+.64*ease(t));
    const q=polar(p,r+(i%4)*2*s,angle);
    petal(stroke,q,angle+.3,(big?15:10)*s,a*(i%4===0?.9:.65),
      i%4===0?C.core:i%2?C.leaf:C.aqua);
    if(i%3===0)
      stroke([polar(p,5*s,angle),q],C.mint,1.06*s,a*.56);
  }
  const arc=[];
  for(let k=0;k<=16;k++){
    const angle=.25+k*TAU*.62/16;
    arc.push(polar(p,(big?37:25)*s*(.64+.31*t),angle,.8));
  }
  stroke(arc,C.aqua,1.16*s,a*.52);
}
function threads(stroke,from,to,t,s,mode="heal"){
  if(!from||!to)return;
  const delta={x:to.x-from.x,y:to.y-from.y},
    len=Math.max(1,Math.hypot(delta.x,delta.y));
  const norm={x:-delta.y/len,y:delta.x/len};
  const lead=ease(t),a=Math.min(1,t*11,(1-t)*8);
  const lanes=mode==="relay"?5:3;
  for(let lane=0;lane<lanes;lane++){
    const pts=[];
    for(let j=0;j<=16;j++){
      const u=j/16;
      const travel=mode==="relay"?u:clamp(lead-u*.23,0,1);
      const k=lane-(lanes-1)/2;
      const sine=Math.sin(u*TAU*(mode==="relay"?1.6:2)+
        t*18+lane*1.3)*(1.2+Math.abs(k))*.73*s;
      pts.push({x:from.x+delta.x*travel+norm.x*(k*2.6*s+sine),
        y:from.y+delta.y*travel+norm.y*(k*2.6*s+sine)});
    }
    stroke(pts,lane===0?C.core:lane%2?C.leaf:C.aqua,
      (lane===0?1.55:.88)*s,a*(lane===0?.91:.54));
  }
  if(mode!=="relay"){
    for(let i=0;i<4;i++){
      const z=clamp(lead-(i+1)*.048,0,1);
      const q={x:from.x+delta.x*z,y:from.y+delta.y*z};
      petal(stroke,q,Math.atan2(delta.y,delta.x)+.28,
        (6.4-i*.5)*s,a*.66,i%2?C.core:C.leaf);
    }
  }
}
function shield(stroke,p,t,s){
  const a=Math.min(1,t*10,(1-t)*6),n=7,r=29*s;
  for(let i=0;i<n;i++){
    const angle=i*TAU/n+t*.42,point=polar(p,r*(.9+.10*t),angle);
    petal(stroke,point,angle+Math.PI*.5,14.5*s,a*(i%3===0?.76:.48),
      i%3===0?C.core:C.leaf);
    const ray=polar(p,r*.80,angle+.27);
    stroke([point,ray],C.aqua,1.03*s,a*.33);
  }
  for(let k=0;k<2;k++){
    const arc=[];
    for(let j=0;j<=18;j++){
      const a=k*.72+j*TAU*.46/18+t*(k===0?.34:-.25);
      arc.push(polar(p,(22+k*10)*s,a,.75));
    }
    stroke(arc,k===0?C.ivory:C.mint,1.28*s,a*.51);
  }
}
function stasis(stroke,p,t,s){
  const a=Math.min(1,t*10,(1-t)*8);
  const radius=25*s;
  for(let i=0;i<8;i++){
    const ang=i*TAU/8,base=polar(p,radius,ang,.8);
    const tip={x:base.x+Math.cos(ang)*2*s,y:base.y-19*s};
    stroke([base,tip],i%2===0?C.core:C.aqua,1.14*s,a*.67);
    petal(stroke,tip,-Math.PI/2,8*s,a*.73,
      i%3===0?C.ivory:C.leaf);
  }
  for(let i=0;i<2;i++){
    const ring=[];
    for(let j=0;j<=22;j++){
      const aa=j*TAU/22+t*(i===0?.33:-.28);
      ring.push(polar(p,(21+i*8)*s,aa,.43));
    }
    stroke(ring,i===0?C.core:C.mint,1.08*s,a*.45);
  }
}
function hourglass(stroke,p,t,s){
  const fade=Math.min(1,t*13,(1-t)*7);
  for(let side=-1;side<=1;side+=2){
    const y=side*12*s;
    for(let k=0;k<3;k++){
      const angle=k*TAU/3+t*5*side;
      const a={x:p.x+Math.cos(angle)*13*s,y:p.y+y+Math.sin(angle)*5*s};
      petal(stroke,a,angle+Math.PI/2,7.6*s,fade*.67,
        side===1?C.aqua:C.core);
    }
  }
  for(let i=0;i<3;i++){
    const radius=(8+i*4)*s;
    stroke([polar(p,radius,-1.23),p,polar(p,radius,1.23)],
      i===0?C.ivory:C.leaf,1.02*s,fade*.48);
  }
}
export function drawGenesisPixi(g,e,from,to,t,scale=1){
  const signature=e.spellId==="pulse-mend";
  const isEvo=signature&&e.kind&&GENESIS_PULSE_EVOS.has(e.kind);
  if(!GENESIS_PIXI_IDS.has(e.spellId)&&!isEvo)return false;
  const s=clamp(scale,.60,2.8),p=to||from;
  if(!p)return true;
  const stroke=(pts,c,w,a)=>{
    if(!pts||pts.length<2||a<=0)return;
    g.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.stroke({color:c,width:w,alpha:a,cap:"round",join:"round"});
  };
  if(e.type==="windup"){
    shield(stroke,from,t,s*.71);
    return true;
  }
  if(isEvo){
    if(e.kind==="vital-reversal")threads(stroke,from,p,t,s);
    else if(e.kind==="second-heart-armed")hourglass(stroke,p,t,s);
    else bloom(stroke,p,t,s,true);
    return true;
  }
  if(e.spellId==="resonance-guard"){
    if(e.kind==="retaliation")threads(stroke,from,p,t,s);
    else if(e.kind==="last-stand")bloom(stroke,p,t,s,true);
    else shield(stroke,p,t,s);
  }else if(e.spellId==="vital-cascade"){
    if(e.type==="heal"||e.kind==="double-cascade"||
       e.kind==="life-transfer")threads(stroke,from,p,t,s,
       e.kind==="life-transfer"?"relay":"heal");
    else bloom(stroke,p,t,s,e.kind==="team-cascade");
  }else if(e.spellId==="stasis-seal"||e.spellId==="stasis-wave"){
    if(e.type==="control"||e.kind==="tranquility-wave")
      stasis(stroke,p,t,s);
    else if(e.kind==="essence-siphon")threads(stroke,p,from,t,s,"heal");
    else bloom(stroke,p,t,s,e.kind==="mercy-bloom");
  }else if(e.spellId==="vital-recall"){
    if(e.kind==="recall-anchor")hourglass(stroke,p,t,s);
    else bloom(stroke,p,t,s,e.kind==="recall-release");
  }else if(e.spellId==="soul-relay"){
    if(e.kind==="relay-linked"||e.type==="link")
      threads(stroke,from,p,t,s,"relay");
    else bloom(stroke,p,t,s,false);
  }
  return true;
}
