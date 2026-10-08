// Impact Burst Pass 8: match the material and motion language of the
// Pixel 3v3-inspired Crystal Bolt / Sun Lance projectiles, without drawing
// generic radial sigils. Phases: piercing flash -> spatial burst -> embers/ice.
// Babylon owns actual 3D fragments; these are sharp moving highlights.
const PI=Math.PI,TAU=PI*2;
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
  const k=clamp(scale,.65,2.30),u=clamp(t,0,1);
  // At 560/480 ms these timings are a flash at 0-100ms, peak energy
  // at roughly 100-250ms, then a graceful splinter/ember falloff.
  const snap=(1-smooth((u-.06)/.16))*smooth((u+.018)/.08);
  const burst=smooth(u/.10)*(1-smooth((u-.37)/.22));
  const residual=smooth(u/.12)*(1-smooth((u-.55)/.43));
  const spread=smooth(u/.43);
  const pos=(ahead,side=0)=>({x:to.x+(tx*ahead+nx*side)*k,
    y:to.y+(ty*ahead+ny*side)*k});
  const line=(points,color,width,alpha)=>{
    if(points.length<2||alpha<=.002)return;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.stroke({color,width:Math.max(.35,width*k),
      alpha:clamp(alpha,0,1),cap:"round",join:"round"});
  };
  const dot=(at,radius,color,alpha)=>{
    if(alpha<=.002)return;
    g.circle(at.x,at.y,Math.max(.4,radius*k))
      .fill({color,alpha:clamp(alpha,0,1)});
  };
  const poly=(points,color,alpha)=>{
    if(points.length<3||alpha<=.002)return;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.closePath().fill({color,alpha:clamp(alpha,0,1)});
  };

  // Contrast comes from a layered, SHORT contact flare rather than a
  // single white line. The diffuse color surrounds a precise hot core.
  dot(pos(1.5),ice?13.5:17,style.c,.13*snap+.075*burst);
  dot(pos(1.5),ice?8.2:10.5,ice?0x8aeaff:0xffb847,
    .24*snap+.14*burst);
  dot(pos(2),ice?4.4:5.6,style.core,.70*snap+.23*burst);

  // Explicit continuing spear/lance axis, shrinking quickly after the hit.
  const tip=ice?24:29;
  line([pos(-21+u*14),pos(tip*(.88+u*.22))],
    style.c,ice?7:9,.19*snap+.11*burst);
  line([pos(-18+u*10),pos(tip*(.86+u*.25))],
    ice?style.core:0xffd473,ice?3.0:3.7,.90*snap+.43*burst);
  line([pos(-8),pos(tip*(.80+u*.24))],style.core,
    ice?1.3:1.8,.98*snap+.35*burst);

  if(ice){
    // Three controlled triangular fracture fans, biased in the direction
    // of travel. Wide enough to ESCAPE the glass orb, not a symmetric icon.
    for(let i=0;i<17;i++){
      const a=random(seed,i+4),b=random(seed,i+61);
      const side=i%2?-1:1,front=i%6===0?-.38:1;
      const ahead=-7+front*(10+a*29)*spread;
      const cross=side*(3.5+(i%6)*4.7+b*9.0)*spread;
      const at=pos(ahead,cross);
      const back=pos(ahead-(5.5+a*9)*(.32+.68*spread),
        cross-side*(3+b*5));
      const edge=pos(ahead+(3+a*5),cross+side*(1+b*3));
      const strength=burst*(.52+.32*a)+residual*.23;
      line([back,at,edge],i%5===0?style.core:i%4===0?style.dim:style.c,
        i%5===0?1.9:1.12,strength);
      // Bright crystal splinter spine with a smaller shadow edge.
      if(i%2===0)line([back,at],style.core,.72,burst*.63);
      if(i%3===0)dot(at,1.1,style.core,residual*.49);
    }

    // Little swirling snow-stars keep the Frostbolt texture once the
    // larger fracture fan disperses. Positions are deliberately irregular.
    for(let i=0;i<19;i++){
      const a=random(seed,i+77),b=random(seed,i+122);
      const side=i%2?-1:1;
      const ahead=-11+(i%7)*6+(a-.45)*18*spread;
      const cross=side*(7+b*32)*spread;
      const at=pos(ahead,cross);
      const radius=.72+(i%4)*.27;
      const rot=u*8.3+i*.87;
      for(let j=0;j<2;j++){
        const ang=rot+j*PI*.5,rx=Math.cos(ang)*radius*k,
          ry=Math.sin(ang)*radius*k;
        line([{x:at.x-rx,y:at.y-ry},{x:at.x+rx,y:at.y+ry}],
          i%4===0?style.core:style.c,.82,
          burst*.60+residual*.39);
      }
      if(i%6===0)dot(at,1.2,style.c,residual*.36);
    }

    // Two sharp, OPEN icy shear curves still express cold shock, but do
    // not draw a graphic ring around the target.
    for(const sign of [-1,1]){
      const points=[];
      for(let j=0;j<=12;j++){
        const f=j/12,wide=Math.sin(f*PI);
        points.push(pos(-10+f*(33+spread*18),
          sign*(2+wide*(12+spread*8))));
      }
      line(points,sign>0?style.c:style.dim,sign>0?1.4:1.0,
        burst*.63+residual*.12);
    }
  }else{
    // Solar core radiates into three flame fans, but still carries the
    // directional lance. Glow stays gold/orange, never a white solid disk.
    for(let lane=0;lane<5;lane++){
      const side=lane%2?-1:1,phase=seed*.017+lane*1.7;
      const fwd=lane%3===0?-.35:1;
      const ribbon=[];
      for(let j=0;j<=13;j++){
        const f=j/13;
        const ahead=-6+f*(25+lane*3)*spread*fwd;
        const wobble=Math.sin(f*PI*(2+lane*.21)+u*11+phase)
          *Math.sin(f*PI)*(6.2+lane*2.2);
        const cross=side*(2+f*(7+lane*3.3))*spread+wobble*spread;
        ribbon.push(pos(ahead,cross));
      }
      line(ribbon,lane===0?style.core:lane===1?0xffdc7f:
        lane===3?style.dim:style.c,lane===0?2.7:1.6,
        burst*(lane===0?.84:.54)+residual*.16);
    }
    // Separate flowing heat fragments, physically breaking away from the
    // former projectile tail rather than evenly spaced "sun rays".
    for(let i=0;i<29;i++){
      const q=random(seed,i+21),v=random(seed,i+73),side=i%2?-1:1;
      const ahead=-12+(i%8)*4.5+(q-.42)*25*spread;
      const cross=side*(4+(i%6)*3.5+v*12)*spread;
      const drift=Math.sin(u*15+i*1.31)*3.5*spread;
      const at=pos(ahead,cross+drift);
      const color=i%5===0?style.core:i%3===0?0xffc24c:
        i%2===0?style.c:style.dim;
      dot(at,3.8+(i%3)*.7,color,burst*.085);
      dot(at,1.0+(i%4)*.30,color,burst*(.56+.3*q)+residual*.30);
      if(i%3===0){
        line([pos(ahead-9-q*6,cross-side*(1+q*3)),at],
          color,1.15,burst*.60+residual*.12);
      }
    }
    // Two coiling temperature bands that OPEN forward and disperse. Never
    // a closed, concentric ring stamped around the enemy orb.
    for(const sign of [-1,1]){
      const pts=[];
      for(let j=0;j<=16;j++){
        const f=j/16,angle=f*PI*1.32+u*1.55+sign*.4;
        pts.push(pos(-6+f*29*spread+Math.cos(angle)*5,
          sign*(5+f*17)*spread+Math.sin(angle)*6*spread));
      }
      line(pts,sign>0?0xffe0a1:style.c,1.1,
        burst*.56+residual*.14);
    }
  }

  // Residual glow separates after contact; the energetic shape dissipates,
  // rather than remaining as an equally bright line through the victim.
  dot(pos(3),ice?5.6:7.0,style.c,residual*.10);
  dot(pos(1),ice?2.1:2.5,style.core,residual*.23);
}
