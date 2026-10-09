// Back-to-roots projectile accents from Visual Combat Slice 2ca1aac7b (first
// Pixi pass) and 2481bc37a (the original glass-orb/Babylon hero geometry).
//
// Babylon is the actual moving 3D spear/crystal; Pixi contributes only thin,
// separated screen-space filaments. Neither giant faceted 2D triangles nor
// a full-length blur/screen-wide neon trail belongs to this signature.
// Preserve the original class palette: dark -> class color -> small white tip.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};

export function drawOriginalLayeredProjectile(g,e,from,to,travel,style,scale=1){
  if(!from||!to||!(e.spellId==="crystal-bolt"||e.spellId==="sun-lance"))return;
  const ice=e.spellId==="crystal-bolt";
  const dx=to.x-from.x,dy=to.y-from.y;
  const len=Math.max(1,Math.hypot(dx,dy)),tx=dx/len,ty=dy/len,nx=-ty,ny=tx;
  const advance=smooth(travel),distance=len*advance;
  if(distance<2)return;
  const cx=from.x+dx*advance,cy=from.y+dy*advance;
  const k=clamp(scale*.85,.75,1.65);
  // Long, living wake like the FIRST screenshots (before the back-to-
  // roots pass shortened it to only 53/71px). The distant end is a faint
  // whisper, while the last third connects visibly into the 3D spearhead.
  // Each lane has a different reach so this never becomes one solid beam.
  const tail=Math.min(distance*.87,(ice?252:274)*k);
  const alpha=smooth(travel/.12);
  const pos=(back,side=0)=>({x:cx-tx*back+nx*side*k,
    y:cy-ty*back+ny*side*k});
  const stroke=(a,b,color,width,opacity)=>{
    if(opacity<=.003)return;
    g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({
      color,width:width*k,alpha:clamp(opacity*alpha,0,1),
      cap:"round",join:"round"});
  };

  // Same original five layers, now with a real flowing trajectory through
  // the wake. Previously each was just ONE straight segment between two
  // drifting endpoints: it looked like 3 naked lines behind a big head.
  // Keep the original base/dim/core palette and the existing 3D head.
  for(let lane=-2;lane<=2;lane++){
    const center=lane===0,outer=Math.abs(lane)===2;
    const length=tail*(outer?1:center?.79:.92);
    const width=center?1.30:outer?1.18:1.38;
    const strength=center?.69:outer?.38:.67;
    const color=center?style.core:outer?style.dim:style.c;
    const points=[];
    for(let j=0;j<=16;j++){
      const q=j/16;
      const wave=Math.sin(travel*(ice?19:21)+q*(ice?10.7:9.0)+
          lane*1.62+(e.seed||0)*.03);
      const counter=Math.cos(travel*12.3-q*6.8+lane*1.85);
      const swell=Math.sin(Math.PI*(.05+q*.90));
      const side=lane*(ice?2.8:2.6)*(1.14-.66*q)
        +wave*(ice?5.3:3.9)*swell
        +counter*(ice?1.7:1.2)*swell;
      points.push(pos(length*(1-q),side));
    }
    for(let j=1;j<points.length;j++){
      const q=(j-.5)/16;
      // Opacity and thickness taper toward the distant end, preserving
      // darker negative space between cyan/gold energy strands.
      const fade=.12+.88*smooth(q/.74);
      const thickness=width*(.43+.57*smooth(q/.82));
      // Soft color under-stroke: not a blur filter or a large opacity wash.
      // Only middle/near-nose segments receive a little luminous breadth.
      if(!outer&&q>.30)stroke(points[j-1],points[j],style.c,
        thickness+2.0,strength*.13*fade);
      stroke(points[j-1],points[j],color,thickness,
        strength*fade*(1-travel*.11));
    }
  }
  // Original separate head glow is very small: the actual 3D cone/ball
  // remains visible behind it and supplies the bulk of the projectile.
  const nose=pos(0);
  g.circle(nose.x,nose.y,(ice?3.6:4.7)*k)
    .fill({color:style.c,alpha:.42*alpha});
  g.circle(nose.x,nose.y,(ice?1.8:2.4)*k)
    .fill({color:style.core,alpha:.84*alpha});
  // Three tiny, staggered wake sparks follow the FULL travelling path,
  // not just the first few pixels behind the head. They stay delicate.
  for(let i=0;i<3;i++){
    const phase=travel*(ice?14:17)+i*Math.PI+(e.seed||0)*.021;
    const back=tail*(.16+i*.29);
    const p=pos(back,Math.sin(phase)*(ice?5.5:6.5));
    g.circle(p.x,p.y,(i===0?.88:.65)*k).fill({
      color:i===0?style.core:style.c,
      alpha:(i===0?.53:.34)*alpha*(1-i*.13)});
  }
}
