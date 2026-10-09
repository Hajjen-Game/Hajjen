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
  // FIRST VERSION: 53px (ice) / 71px (solar), never a thick full-arena beam.
  const tail=Math.min(distance*.70,(ice?53:71)*k);
  const alpha=smooth(travel/.12);
  const pos=(back,side=0)=>({x:cx-tx*back+nx*side*k,
    y:cy-ty*back+ny*side*k});
  const stroke=(a,b,color,width,opacity)=>{
    if(opacity<=.003)return;
    g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({
      color,width:width*k,alpha:clamp(opacity*alpha,0,1),
      cap:"round",join:"round"});
  };

  // Original five-strand motion: darker outside, two colored filaments,
  // colored inner path, and ONE hairline of near-white energy.
  // Subtle out-of-phase oscillation makes separate layers move against
  // one another just like other Visual Combat Slice spell signatures.
  for(let lane=-2;lane<=2;lane++){
    const wav=Math.sin(travel*(ice?26:30)+lane*2+(e.seed||0)*.03)
      *(ice?4.2:2.6);
    const offset=lane*(ice?2.9:2.6)+wav;
    const start=pos(tail,offset);
    const end=pos(0,lane*1.35);
    const center=lane===0,outer=Math.abs(lane)===2;
    const color=center?style.core:outer?style.dim:style.c;
    const width=center?1.45:outer?1.6:1.8;
    const strength=center?.75:outer?.34:.68;
    stroke(start,end,color,width,strength*(1-travel*.16));
  }
  // Original separate head glow is very small: the actual 3D cone/ball
  // remains visible behind it and supplies the bulk of the projectile.
  const nose=pos(0);
  g.circle(nose.x,nose.y,(ice?3.6:4.7)*k)
    .fill({color:style.c,alpha:.42*alpha});
  g.circle(nose.x,nose.y,(ice?1.8:2.4)*k)
    .fill({color:style.core,alpha:.84*alpha});
  // Just two asynchronous satellites: motion depth without a particle cloud.
  for(let i=0;i<2;i++){
    const phase=travel*(ice?14:17)+i*Math.PI+(e.seed||0)*.021;
    const p=pos(7+i*7,Math.sin(phase)*(ice?5.5:6.5));
    g.circle(p.x,p.y,.78*k).fill({
      color:i?style.c:style.core,alpha:(i?.42:.58)*alpha});
  }
}
