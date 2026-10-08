// Compact contact acknowledgement for Crystal Bolt and Sun Lance.
// The *travelling* attack is the hero; contact is a quick high-contrast snap.
// No impact sigil, polygon cloud, lingering 3D wheel or massive radial burst.
const PI=Math.PI;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
const frac=x=>x-Math.floor(x);
const random=(seed,index)=>frac(Math.sin(seed*17.19+index*73.71)*43758.5453);

export function drawProjectileImpact(g,e,from,to,t,style,scale=1){
  if(!from||!to||!["crystal-bolt","sun-lance"].includes(e.spellId))return;
  const ice=e.spellId==="crystal-bolt",seed=e.seed||1;
  const dx=to.x-from.x,dy=to.y-from.y;
  const len=Math.max(.001,Math.hypot(dx,dy));
  const tx=dx/len,ty=dy/len,nx=-ty,ny=tx;
  // Cap independently of the camera: a hit must not cover the entire orb.
  const k=clamp(scale,.65,1.55),u=clamp(t,0,1);
  const snap=1-smooth((u-.02)/.39);
  const trailing=smooth(u/.12)*(1-smooth((u-.40)/.59));
  const pos=(forward,side=0)=>({
    x:to.x+(tx*forward+nx*side)*k,
    y:to.y+(ty*forward+ny*side)*k,
  });
  const line=(a,b,color,width,alpha)=>{
    if(alpha<.003)return;
    g.moveTo(a.x,a.y).lineTo(b.x,b.y)
      .stroke({color,width:width*k,alpha:clamp(alpha,0,1),
        cap:"round",join:"round"});
  };
  const dot=(point,radius,color,alpha)=>{
    if(alpha<.003)return;
    g.circle(point.x,point.y,Math.max(.35,radius*k))
      .fill({color,alpha:clamp(alpha,0,1)});
  };

  // One hot, directionally oriented penetration: less than half an orb wide.
  line(pos(-8,0),pos(ice?12:14,0),style.c,
    ice?2.7:3.0,.48*snap);
  line(pos(-5,0),pos(ice?13:15,0),style.core,
    ice?1.45:1.7,.93*snap);
  dot(pos(1),ice?2.6:3.1,style.core,.82*snap);
  dot(pos(0),ice?5.5:6.3,style.c,.14*snap);

  if(ice){
    // Only four thin, angular ice needles. The icy material is communicated
    // by the projectile's crystal and helix, not another explosion.
    for(let i=0;i<4;i++){
      const q=random(seed,i+4),side=i%2?-1:1;
      const forward=(i%3-1)*3+q*6+trailing*5;
      const across=side*(3+(i%2)*2+trailing*5);
      const at=pos(forward,across);
      line(pos(forward-4-q*2,across-side*2),at,
        i===0?style.core:style.c,i===0?1.1:.85,
        trailing*(.62+.16*q));
      if(i===1||i===3)dot(at,.76,style.core,trailing*.57);
    }
  }else{
    // A few loose embers follow the lance's travel angle, not a solar icon.
    for(let i=0;i<5;i++){
      const q=random(seed,i+9),side=i%2?-1:1;
      const at=pos(-2+(i%3)*3+q*5+trailing*4,
        side*(2+q*5+trailing*4));
      dot(at,.75+(i%3)*.26,
        i===0?style.core:i%2?style.dim:style.c,
        trailing*(.48+q*.29));
      if(i===0||i===3){
        line(pos(-5+(i%3)*3,side*2),at,style.c,.9,
          trailing*.42);
      }
    }
  }
}
