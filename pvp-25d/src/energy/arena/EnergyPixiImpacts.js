// The hit is the FINAL frame of the projectile, not a separate spell symbol.
// Adapted from the Pixi 3v3 Frostbolt/Pyroblast projectile vocabulary:
// icy needles + snow sparks, or layered solar heat + loose embers.
// Keep the travel axis at the point of contact: pierce -> fracture/bloom -> decay.
// No full-screen radial wheels, large polygon plates or permanent target circles.
const PI=Math.PI;
const TAU=PI*2;
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
  // A tight impact, projected with the orb rather than fixed screen pixels.
  const k=clamp(scale,.65,2.45);
  const u=clamp(t,0,1);
  const snap=1-smooth((u-.045)/.24);
  const bloom=smooth(u/.065)*(1-smooth((u-.35)/.43));
  const residue=(1-smooth((u-.52)/.38))*.58;
  const p=(along,side)=>({x:to.x+tx*along*k+nx*side*k,
    y:to.y+ty*along*k+ny*side*k});
  const line=(points,color,width,alpha)=>{
    if(points.length<2||alpha<=.001)return;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.stroke({color,width:width*k,alpha:clamp(alpha,0,1),cap:"round",join:"round"});
  };
  const dot=(point,radius,color,alpha)=>{
    if(alpha<=.001)return;
    g.circle(point.x,point.y,Math.max(.3,radius*k))
      .fill({color,alpha:clamp(alpha,0,1)});
  };

  // A short axial afterimage literally continues the incoming spell through
  // the orb. Never project a full-width star over the target.
  const through=ice?20:27;
  line([p(-23+u*16,0),p(through*(.72+u*.48),0)],
    style.c,ice?6.0:8.5,.13*snap+.11*bloom);
  line([p(-19+u*13,0),p(through*(.80+u*.45),0)],
    ice?style.core:0xffd669,ice?2.8:3.6,.83*snap+.40*bloom);
  line([p(-9,0),p(through*(.80+u*.42),0)],
    style.core,ice?1.15:1.6,.96*snap+.42*bloom);

  if(ice){
    // Initial fracture is still a spear: shards escape along the travel
    // vector with smaller transverse variations; no circular snow sigil.
    for(let i=0;i<11;i++){
      const side=(i%2?-1:1),q=random(seed,i+2);
      const drift=side*(3+(i%4)*2.1)*u;
      const along=(-5+(i%5)*4.0)+u*(11+q*15)*(i%4===0?-.52:1);
      const a=p(along,drift);
      const direction=p(along+(-2.8+q*7),drift+side*(3+(i%3)*1.5));
      const back=p(along-7-q*4,drift-side*(1.0+q*2));
      line([back,a,direction],i%4===0?style.core:i%3===0?style.dim:style.c,
        i%4===0?1.45:.95,bloom*(.57+q*.29));
    }
    // Distinct snow-star fragments from Frostbolt: smaller than the shards,
    // tumbling into the wake and fading without a new circular outline.
    for(let i=0;i<13;i++){
      const q=random(seed,i+17),side=i%2?1:-1;
      const ahead=(-13+(i%5)*8)+(i%3-1)*11*u;
      const offset=side*(3+q*14)*(0.36+u*.93);
      const at=p(ahead,offset),r=.7+(i%3)*.25;
      const angle=u*6.8+i*.83;
      for(let arm=0;arm<2;arm++){
        const a=angle+arm*PI*.5;
        const x=Math.cos(a)*r,y=Math.sin(a)*r;
        line([{x:at.x-x*k,y:at.y-y*k},{x:at.x+x*k,y:at.y+y*k}],
          i%4===0?style.core:style.c,.78,bloom*.66+residue*.18);
      }
      if(i%4===0)dot(at,1.05,style.core,residue*.60);
    }
    // Two broken directional frost shears, not closed rings.
    for(const sign of [-1,1]){
      const arc=[];
      for(let i=0;i<=12;i++){
        const f=i/12;
        arc.push(p(-10+f*30+(u*7),sign*(3+Math.sin(f*PI)*11)*(1+u*.45)));
      }
      line(arc,sign===1?style.c:style.dim,sign===1?1.05:.78,bloom*.37);
    }
  }else{
    // Solar impact borrows the flowing fire stream: scattered embers and
    // coiling heat strips peel off the axis instead of a five-point sun icon.
    for(let i=0;i<23;i++){
      const q=random(seed,i+9),side=i%2?-1:1;
      const ahead=-12+(i%7)*5.2+(q-.4)*11*u;
      const offset=side*(2+(i%5)*1.5+q*3)*(0.33+u*1.9);
      const at=p(ahead,offset);
      const glow=q>.66?style.core:i%3===0?0xffd269:style.c;
      dot(at,2.6+(i%3)*.45,glow,.08*bloom);
      dot(at,.74+(i%4)*.30,glow,bloom*(.55+q*.30)+residue*.32);
      if(i%3===0){
        line([p(ahead-8-q*4,offset-side*1.4),at],
          i%2?style.c:0xffc04e,1.05,bloom*.61);
      }
    }
    // Three thin rolling heat tongues (no symmetric corona ring).
    for(let lane=0;lane<3;lane++){
      const path=[],side=lane%2?-1:1;
      for(let j=0;j<=13;j++){
        const f=j/13;
        const phase=f*PI*(2.1+lane*.32)+u*(8+lane*2)+seed*.13+lane;
        const across=side*(3+lane*2.3)*Math.sin(f*PI)*Math.sin(phase);
        path.push(p(-11+f*(31+lane*5)+u*5,across));
      }
      line(path,lane===0?style.core:lane===1?0xffc451:style.c,
        lane===0?1.40:1.02,bloom*(lane===0?.53:.39));
    }
    // Brief off-axis rolls like Pyroblast's small coiled energy, never a
    // fully closed 360-degree target emblem.
    for(let i=0;i<2;i++){
      const side=i===0?1:-1,pts=[];
      for(let j=0;j<=11;j++){
        const f=j/11,angle=.27+f*PI*.84+u*1.2;
        pts.push(p(6+Math.cos(angle)*(8+u*4),
          side*Math.sin(angle)*(6+u*3)));
      }
      line(pts,i?style.c:0xffdc81,.85,bloom*.48);
    }
  }
  // Tiny core flash only at the instant of contact. The continuing hot
  // projectile axis (above) is the dominant silhouette, not a disk.
  dot(p(0,0),ice?2.5:3.3,style.c,.24*snap);
  dot(p(0,0),ice?1.45:2.0,style.core,.85*snap);
}
