// Thin hand-authored screen-space Solar filaments. Only five Solar class
// spells are accepted; Sun Lance + Crystal Bolt remain in original Pixi code.
const TAU=Math.PI*2;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
export const SOLAR_PIXI_IDS=new Set([
  "flux-bolt","zenith-crash","cinder-familiar","solar-ascension","chain-tempest"
]);
const P={hot:0xfff9ce,ray:0xffd58c,amber:0xf3a257,shade:0xb45c47,
  electric:0xe6e3ff,plasma:0xffbd77};
function path(draw,points,tone=P.ray,width=1.1,alpha=.7){
  if(points.length>1&&alpha>0)draw(points,tone,width,alpha);
}
const polar=(c,r,a,k=.85)=>({x:c.x+Math.cos(a)*r,y:c.y+Math.sin(a)*r*k});
function diamond(draw,x,y,angle,len,width,tone,alpha){
  const a={x:Math.cos(angle),y:Math.sin(angle)};
  const n={x:-a.y,y:a.x};
  path(draw,[
    {x:x-a.x*len*.42,y:y-a.y*len*.42},
    {x:x+n.x*width,y:y+n.y*width},
    {x:x+a.x*len*.56,y:y+a.y*len*.56},
    {x:x-n.x*width,y:y-n.y*width},
    {x:x-a.x*len*.42,y:y-a.y*len*.42}
  ],tone,1.05,alpha);
}
function coronas(draw,point,t,size,shape="charge"){
  const fade=Math.min(1,t*10,(1-t)*10);
  const arms=shape==="zenith-crash"?10:shape==="chain-tempest"?9:7;
  const r=(shape==="zenith-crash"?21:shape==="chain-tempest"?18:16)*size;
  for(let i=0;i<arms;i++){
    const a=i*TAU/arms+(i%2?-1:1)*t*(shape==="chain-tempest"?6.8:4.5);
    const center=polar(point,r*(.83-.27*ease(t)),a);
    diamond(draw,center.x,center.y,a+.36,5.8*size,1.4*size,
      i%4===0?P.hot:i%2===0?P.ray:P.amber,fade*(i%4===0?.9:.59));
    const tail=polar(point,r*.47,a+.29);
    path(draw,[center,tail],i%2===0?P.ray:P.shade,.9*size,fade*.46);
  }
  for(let i=0;i<3;i++){
    const start=i*TAU/3+t*3;
    const pts=[];
    for(let j=0;j<=12;j++){
      const a=start+j*.12;
      pts.push(polar(point,(9+i*3)*size,a));
    }
    path(draw,pts,i===0?P.hot:P.amber,(i===0?1.3:.86)*size,fade*.52);
  }
}
function missile(draw,from,to,t,s,heavy=false){
  if(!from||!to)return;
  const d={x:to.x-from.x,y:to.y-from.y};
  const total=Math.max(1,Math.hypot(d.x,d.y)),nx=-d.y/total,ny=d.x/total;
  const lead=ease(t),fx=from.x+d.x*lead,fy=from.y+d.y*lead;
  const alpha=Math.min(1,t*10,(1-t)*8);
  for(let lane=-2;lane<=2;lane++){
    const wave=[];
    for(let i=0;i<=13;i++){
      const trail=i/13;
      const u=clamp(lead-trail*(heavy?.32:.24),0,1);
      const twist=Math.sin(trail*14+lane*2.3+t*21)*s*(1.15+Math.abs(lane)*.54);
      const side=lane*s*(heavy?3.9:2.3)+twist;
      wave.push({x:from.x+d.x*u+nx*side,y:from.y+d.y*u+ny*side});
    }
    path(draw,wave,lane===0?P.hot:lane%2?P.amber:P.ray,
      (lane===0?1.65:1.05)*s,alpha*(lane===0?.93:.58));
  }
  for(let i=0;i<(heavy?7:5);i++){
    const u=clamp(lead-(i+.5)*.038,0,1);
    const a=t*14+i*TAU/(heavy?7:5);
    diamond(draw,from.x+d.x*u+nx*Math.sin(a)*5*s,
      from.y+d.y*u+ny*Math.cos(a)*5*s,
      Math.atan2(d.y,d.x)+a*.16,
      (heavy?8:5.3)*s,1.45*s, i%2?P.ray:P.hot,alpha*.66);
  }
  diamond(draw,fx,fy,Math.atan2(d.y,d.x),(heavy?23:14)*s,
    (heavy?3.8:2.6)*s,P.hot,alpha);
}
function impact(draw,p,t,s,large=false){
  const fade=Math.min(1,t*13,(1-t)*4);
  const n=large?13:9;
  for(let i=0;i<n;i++){
    const a=i*TAU/n+.11;
    const q=polar(p,(large?23:15)*s*(.72+.40*ease(t))+(i%3)*1.9*s,a);
    diamond(draw,q.x,q.y,a+.42,(large?17:10)*s,
      (large?2.3:1.4)*s,i%4===0?P.hot:i%2===0?P.ray:P.amber,
      fade*(i%4===0?.89:.67));
    if(i%2===0)path(draw,[polar(p,4*s,a),q],
      P.amber,1.03*s,fade*.48);
  }
  const arc=[];
  for(let i=0;i<=15;i++){
    const a=.18+i*TAU*.64/15;
    arc.push(polar(p,(large?31:22)*s*(.6+.36*t),a,.77));
  }
  path(draw,arc,P.ray,1.3*s,fade*.56);
}
function skyRune(draw,p,t,s){
  const f=Math.min(1,t*8,(1-t)*4),radius=50*s;
  for(let ring=0;ring<2;ring++){
    const pts=[];
    for(let i=0;i<=26;i++){
      const a=i*TAU/26+t*(ring?.2:-.2);
      pts.push(polar(p,radius*(ring?.71:1),a,.48));
    }
    path(draw,pts,ring?P.ray:P.amber,1.45*s,f*(ring?.52:.75));
  }
  for(let i=0;i<8;i++){
    const a=i*TAU/8+t*.13;
    const mid=polar(p,radius*.85,a,.48);
    const tip=polar(p,radius*1.08,a,.48);
    path(draw,[mid,tip],i%2?P.ray:P.hot,1.8*s,f*.76);
  }
}
function lightning(draw,from,to,t,s,strong=false){
  if(!from||!to)return;
  const d={x:to.x-from.x,y:to.y-from.y};
  const len=Math.max(1,Math.hypot(d.x,d.y)),nx=-d.y/len,ny=d.x/len;
  const fade=Math.min(1,t*14,(1-t)*8);
  const lanes=strong?4:3;
  for(let lane=0;lane<lanes;lane++){
    const pts=[];
    const progress=ease(t);
    for(let i=0;i<=12;i++){
      const k=i/12;
      const u=progress*k;
      const bend=(i===0||i===12)?0:
        Math.sin(i*5.8+lane*2.6+t*9)*(3.1+lane*.91)*s;
      pts.push({x:from.x+d.x*u+nx*bend,
        y:from.y+d.y*u+ny*bend});
    }
    path(draw,pts,lane===0?P.hot:lane===1?P.electric:P.amber,
      (lane===0?2.0:1.10)*s,fade*(lane===0?.88:.53));
  }
  if(strong)impact(draw,{
    x:from.x+d.x*ease(t),y:from.y+d.y*ease(t)
  },t,s*.55,false);
}
function phoenix(draw,from,to,t,s){
  const p={x:from.x+(to.x-from.x)*ease(t),
    y:from.y+(to.y-from.y)*ease(t)};
  const fade=Math.min(1,t*9,(1-t)*7);
  for(const side of [-1,1]){
    const curve=[];
    for(let i=0;i<=9;i++){
      const u=i/9,a=t*10+u*2;
      curve.push({x:p.x+side*(10+u*27)*s,
        y:p.y-(16*Math.sin(u*Math.PI)+Math.sin(a)*3)*s});
    }
    path(draw,curve,side>0?P.hot:P.amber,1.75*s,fade*.86);
    for(let i=1;i<=3;i++){
      const q=curve[i*2];
      diamond(draw,q.x,q.y,-Math.PI/2+side*.65,
        (13-i*2)*s,1.6*s,P.ray,fade*.76);
    }
  }
  impact(draw,p,t,s*.46,false);
}
export function drawSolarPixi(g,event,from,to,t,scale=1){
  if(!SOLAR_PIXI_IDS.has(event.spellId))return false;
  const s=clamp(scale,.62,2.8);
  const draw=(points,hue,width,alpha)=>{
    if(points.length<2||alpha<=0)return;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.stroke({color:hue,width,alpha,cap:"round",join:"round"});
  };
  const type=event.type,id=event.spellId,kind=event.kind||"";
  const p=to||from;
  if(!p)return true;
  if(type==="windup"){
    coronas(draw,from,t,s,id);return true;
  }
  if(type==="ground-telegraph"&&id==="zenith-crash"){
    skyRune(draw,p,t,s);return true;
  }
  if(type==="hit"&&["flux-bolt","chain-tempest"].includes(id)){
    const travel=clamp(t*event.duration/(event.contactMs||370),0,1);
    if(travel<1)missile(draw,from,p,travel,s,id==="chain-tempest");
    else impact(draw,p,clamp((t*event.duration-event.contactMs)/230,0,1),
      s,id==="chain-tempest");
    return true;
  }
  if(id==="flux-bolt"){
    if(kind==="corona-volley")missile(draw,from,p,t,s*.9);
    else if(["thunderhead","helios-tick"].includes(kind))
      lightning(draw,from,p,t,s,kind==="helios-tick");
    else if(kind==="thunderhead-cloud")
      skyRune(draw,p,t,s*.65);
    else impact(draw,p,t,s,kind==="flux-third-hit");
  }else if(id==="zenith-crash"){
    if(["zenith-impact","solar-aftershock","prism-cross","prism-cross-ready"].includes(kind)){
      skyRune(draw,p,t,s);
      impact(draw,p,t,s,true);
    }else if(kind==="burning-ground")skyRune(draw,p,t,s*.66);
    else impact(draw,p,t,s,true);
  }else if(id==="cinder-familiar"){
    if(kind==="phoenix-dive")phoenix(draw,from,p,t,s);
    else if(["soulbrand-ray","soulbrand-discharge"].includes(kind))
      lightning(draw,from,p,t,s);
    else if(kind==="familiar-shot")missile(draw,from,p,t,s*.8);
    else impact(draw,p,t,s,kind==="dying-star");
  }else if(id==="solar-ascension"){
    if(kind==="ascension-start"||kind==="ascension-orbit")
      coronas(draw,p,t,s,id);
    else{
      skyRune(draw,p,t,s*.8);
      impact(draw,p,t,s,kind==="ascension-beam");
    }
  }else if(id==="chain-tempest"){
    if(["tempest-chain","tempest-focus"].includes(kind))
      lightning(draw,from,p,t,s,true);
    else impact(draw,p,t,s,true);
  }
  return true;
}
