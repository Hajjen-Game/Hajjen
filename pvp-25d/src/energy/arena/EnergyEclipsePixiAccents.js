// Eclipse-only hand-authored Pixi filaments on top of EnergyEclipseVFX.
// No imports of the accepted Crystal Bolt/Sun Lance layers, no gameplay state.
const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x)};
const PALETTE={c:0x79d8ff,core:0xeaffff,shade:0x328cc5,dim:0x5969ae};
export const ECLIPSE_PIXI_IDS=new Set([
  "crystal-snare","fracture-spear","froststorm","crystal-mirror","avalanche"
]);
const PX=(cx,cy,r,a,flat=.84)=>({x:cx+Math.cos(a)*r,y:cy+Math.sin(a)*r*flat});
function poly(stroke,points,c,width,a){
  stroke(points,c,width,a);
}
function shard(stroke,x,y,angle,length,width,opacity,color){
  const f={x:Math.cos(angle),y:Math.sin(angle)};
  const n={x:-f.y,y:f.x};
  poly(stroke,[
    {x:x-f.x*length*.45,y:y-f.y*length*.45},
    {x:x+n.x*width,y:y+n.y*width},
    {x:x+f.x*length*.52,y:y+f.y*length*.52},
    {x:x-n.x*width,y:y-n.y*width},
    {x:x-f.x*length*.45,y:y-f.y*length*.45}
  ],color,1.05,opacity);
}
const lines=(stroke,from,to,t,scale)=>{
  if(!from||!to)return;
  const dx=to.x-from.x,dy=to.y-from.y;
  const len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
  const lead=smooth(t),cx=from.x+dx*lead,cy=from.y+dy*lead;
  const fade=Math.min(1,t*8,(1-t)*8);
  // Central white quartz seam + four independent sliding cryo filaments.
  for(let lane=-2;lane<=2;lane++){
    const p=[],width=Math.abs(lane)<1?1.48:.85;
    for(let j=0;j<=12;j++){
      const age=j/12;
      const pos=clamp(lead-age*.21,0,1);
      const sine=Math.sin(t*17-lane*2.1-age*8.3)*(.85+Math.abs(lane)*1.0)*scale;
      const side=lane*2.5*scale+sine;
      p.push({x:from.x+dx*pos+nx*side,
        y:from.y+dy*pos+ny*side});
    }
    stroke(p,lane===0?PALETTE.core:lane%2?PALETTE.shade:PALETTE.c,
      width*scale,fade*(lane===0?.88:.56));
  }
  for(let i=0;i<5;i++){
    const q=clamp(lead-(i+1)*.032,0,1),a=t*15+i*TAU/5;
    shard(stroke,from.x+dx*q+nx*Math.cos(a)*6*scale,
      from.y+dy*q+ny*Math.sin(a)*6*scale,a,.92*scale+4*scale,
      1.4*scale,fade*.60,i%2?PALETTE.c:PALETTE.core);
  }
  shard(stroke,cx,cy,Math.atan2(dy,dx),20*scale,3.3*scale,
    fade*.92,PALETTE.core);
};
function charge(stroke,centre,t,id,scale){
  const fade=Math.min(1,t*9,(1-t)*11);
  const n=id==="fracture-spear"?9:id==="avalanche"?8:6;
  const radius=(id==="fracture-spear"?18:15)*scale*(.90-.36*smooth(t));
  for(let i=0;i<n;i++){
    const a=i*TAU/n+t*(id==="fracture-spear"?8.4:6.2)*(i%2?1:-1);
    const pos=PX(centre.x,centre.y,radius,a);
    const next=PX(centre.x,centre.y,radius*.67,a+.55);
    shard(stroke,pos.x,pos.y,a+.78,6.2*scale,1.35*scale,
      fade*(i%3===0?.87:.57),i%3===0?PALETTE.core:PALETTE.c);
    stroke([pos,next],i%2?PALETTE.shade:PALETTE.c,
      1.0*scale,fade*.40);
  }
  // The crystal condenses INSIDE the glass orb as it charges.
  if(id==="fracture-spear"){
    stroke([{x:centre.x-14*scale*(.5+.5*t),y:centre.y},
      {x:centre.x+14*scale*(.5+.5*t),y:centre.y}],
    PALETTE.core,1.5*scale,fade*.94);
  }
}
function impact(stroke,centre,t,scale,heavy=false){
  const fade=Math.min(1,t*13,Math.pow(1-t,1.2)*2.2);
  const n=heavy?11:7,dist=(heavy?18:13)*scale;
  for(let i=0;i<n;i++){
    const a=i*TAU/n+.13;
    const p=PX(centre.x,centre.y,dist*(.8+.5*t)+(i%3)*2*scale,a);
    shard(stroke,p.x,p.y,a+.5*(i%2?1:-1),
      (heavy?15:10)*scale*(1+.52*t),(heavy?2.0:1.3)*scale,
      fade*(i%4===0?.96:.65),i%4===0?PALETTE.core:PALETTE.c);
  }
  const inner=[];
  for(let j=0;j<=14;j++){
    const a=.3+j*Math.PI*1.31/14;
    inner.push(PX(centre.x,centre.y,(heavy?21:15)*scale*(.7+.35*t),a));
  }
  stroke(inner,PALETTE.shade,1.06*scale,fade*.46);
}
function cage(stroke,centre,t,scale){
  const f=Math.min(1,t*12,(1-t)*8);
  const r=19*scale;
  for(let i=0;i<6;i++){
    const a=i*TAU/6;
    const p=PX(centre.x,centre.y,r*(.86+.14*smooth(t)),a);
    const up={x:p.x+Math.cos(a)*2*scale,y:p.y-17*scale};
    stroke([p,up,{x:up.x-3*scale,y:up.y+5*scale}],
      i%2?PALETTE.c:PALETTE.core,1.1*scale,f*.62);
    shard(stroke,up.x,up.y+3*scale,-Math.PI/2,
      9*scale,1.7*scale,f*.68,PALETTE.c);
  }
}
function field(stroke,centre,t,scale,kind){
  const f=Math.min(1,t*9,(1-t)*7);
  const n=kind==="froststorm" ? 12:7,r=(kind==="froststorm"?43:30)*scale;
  for(let i=0;i<n;i++){
    const a=i*TAU/n+t*(kind==="froststorm"?6.2:3.1)*(i%2?-1:1);
    const p=PX(centre.x,centre.y,r*(.62+(i%3)*.16),a,.55);
    const end=PX(centre.x,centre.y,r*(.74+(i%3)*.14),a+.29,.55);
    stroke([p,end],i%3===0?PALETTE.core:PALETTE.c,
      (i%3===0?1.6:.85)*scale,f*(i%3===0?.72:.38));
    if(i%2===0)shard(stroke,p.x,p.y,a,.7*8*scale,1.1*scale,f*.48,PALETTE.shade);
  }
}
export function drawEclipsePixi(g,e,from,to,t,scale=1){
  if(!ECLIPSE_PIXI_IDS.has(e.spellId))return false;
  const s=Math.min(2.8,Math.max(.55,scale));
  const stroke=(pts,c,width,alpha)=>{
    if(!pts||pts.length<2||alpha<=0)return;
    g.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.stroke({color:c,width,alpha,cap:"round",join:"round"});
  };
  const id=e.spellId;
  if(e.type==="windup"&&from){
    charge(stroke,from,t,id,s);return true;
  }
  const target=to||from;
  if(!target)return true;
  if(e.type==="hit"&&id==="fracture-spear"){
    const travel=clamp(t*e.duration/(e.contactMs||390),0,1);
    if(travel<1)lines(stroke,from,target,travel,s);
    else impact(stroke,target,clamp((t*e.duration-e.contactMs)/230,0,1),
      s,true);
    return true;
  }
  if(e.type==="hit"){
    impact(stroke,target,t,s,id==="avalanche");return true;
  }
  if(id==="crystal-snare"){
    if(e.type==="ability"||e.kind==="deep-freeze"||
      e.kind==="shatterfield")cage(stroke,target,t,s);
    else impact(stroke,target,t,s,false);
  }else if(id==="froststorm"){
    if(e.kind==="froststorm-start"||e.kind==="froststorm-tick"||
      e.kind==="glacial-barrage"||e.type==="ability")
      field(stroke,target,t,s,"froststorm");
    else impact(stroke,target,t,s,e.kind==="shattering-storm");
  }else if(id==="crystal-mirror"){
    if(e.kind==="mirror-armed"||e.type==="ability")
      cage(stroke,target,t,s);
    else impact(stroke,target,t,s,true);
  }else if(id==="avalanche"){
    field(stroke,target,t,s,"avalanche");
    if(e.kind==="avalanche-wave"||e.kind==="avalanche-launch")
      impact(stroke,target,t,s,true);
  }else{
    impact(stroke,target,t,s,
      ["crystal-rupture","riftbreaker"].includes(e.kind));
  }
  return true;
}
