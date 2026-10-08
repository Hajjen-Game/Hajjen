// The moving projectile pass reuses Pixi 3v3's authored Frostbolt/Pyroblast
// shape language (tapered ribbons, snow shards, molten tongues and orbit motes).
// Only Crystal Bolt / Sun Lance use this path. No hit logic or build-ups here.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};

export function drawEnergyProjectile(g,e,from,to,travel,style,scale=1){
  const ice=e.spellId==="crystal-bolt",seed=e.seed||1;
  const dx=to.x-from.x,dy=to.y-from.y,d=Math.max(1,Math.hypot(dx,dy));
  const tx=dx/d,ty=dy/d,nx=-ty,ny=tx;
  const u=smooth(travel),distance=d*u;
  if(distance<2)return;
  const k=clamp(scale*.85,.72,2.15);
  const tail=Math.min((ice?126:139)*k,distance*.74);
  const startDist=Math.min(Math.max(13*k,distance-tail),Math.max(0,distance-7*k));
  const ax=from.x+tx*startDist,ay=from.y+ty*startDist;
  const px=from.x+dx*u,py=from.y+dy*u;
  // Stay fully visible through the FINAL travelling frame. The previous
  // .89-.1 fade erased the head before the impact event even began.
  const opacity=smooth(travel/.10);
  const pt=(f,offset=0)=>({
    x:ax+(px-ax)*f+nx*offset,
    y:ay+(py-ay)*f+ny*offset
  });
  const line=(points,color,width,alpha)=>{
    if(points.length<2||alpha<=0)return;
    g.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)g.lineTo(points[i].x,points[i].y);
    g.stroke({color,width:width*k,alpha:alpha*opacity,cap:"round",join:"round"});
  };
  // Ported from taperedRibbon in arena3v3/PixiProofRenderer: two independent
  // sinusoids distort a progressively wider polygon, giving fluid edges.
  const ribbon=(offset,rate,begin,end,wobble,segments,color,alpha)=>{
    const left=[],right=[];
    for(let i=0;i<=segments;i++){
      const f=i/segments;
      const shake=(Math.sin((seed+offset)*.031+i*1.77+travel*rate*10.7)
        +Math.sin((seed+offset)*.013+i*.83-travel*rate*6.2)*.48)
        *wobble*k*Math.sin(f*Math.PI);
      const p=pt(f,shake);
      const width=(begin+(end-begin)*Math.pow(f,.78))*k
        +Math.sin(i*1.9+travel*8+seed*.02)*.8*k*Math.sin(f*Math.PI);
      left.push({x:p.x+nx*width,y:p.y+ny*width});
      right.push({x:p.x-nx*width,y:p.y-ny*width});
    }
    const vertices=[...left,...right.reverse()];
    g.moveTo(vertices[0].x,vertices[0].y);
    for(let i=1;i<vertices.length;i++)g.lineTo(vertices[i].x,vertices[i].y);
    g.closePath();
    g.fill({color,alpha:alpha*opacity});
  };
  const dot=(x,y,r,color,a)=>g.circle(x,y,Math.max(.35,r*k))
    .fill({color,alpha:a*opacity});

  if(ice){
    // Frostbolt: cool translucent envelope, razor-hot center, deliberate
    // low wobble and a thinner crystalline silhouette.
    // Keep the original palette, but redistribute it: shadowed icy facets
    // and saturated cyan do most of the work; white belongs at the nose.
    // Slim, flowing cyan wisps. Let the empty space BETWEEN layers create
    // depth instead of stacking five wide translucent polygon sheets.
    ribbon(5,.92,2.0,7.5,3.8,15,style.dim,.19);
    ribbon(13,1.13,1.3,6.0,2.8,15,style.c,.39);
    ribbon(29,1,.5,3.2,1.25,15,style.c,.34);
    ribbon(109,1.45,1.3,6.5,4.2,14,style.dim,.09);
    line([pt(0),pt(1)],style.c,2.5,.36);
    line([pt(0),pt(1)],style.core,.72,.38);
    // Every splinter is a small angular crystal, not a generic glowing dot.
    for(let i=0;i<9;i++){
      const f=(i+.45)/9;
      const drift=Math.sin(seed*.031+i*2.17+travel*14.5)
        *(5+(i%4)*2.2)*k;
      const p=pt(f,drift),r=(1.8+(i%4)*.55);
      dot(p.x,p.y,r*2.4,style.c,.10);
      const spin=travel*(6.8+(i%3)*.7)+i*.83;
      for(let arm=0;arm<2;arm++){
        const a=spin+arm*Math.PI/3;
        const ex=Math.cos(a)*r*k,ey=Math.sin(a)*r*k;
        line([{x:p.x-ex,y:p.y-ey},{x:p.x+ex,y:p.y+ey}],
          arm===0?style.core:arm===1?style.c:style.dim,
          arm===0?1:.8,.76);
      }
    }
    for(let i=0;i<7;i++){
      const f=(i+.30)/7,sign=i%2?1:-1;
      const drift=(sign*(7+(i%4)*3)+Math.sin(i*1.8+travel*10+seed*.04)*3)*k;
      const p=pt(f,drift),len=(5+(i%4)*2.3)*k;
      line([p,{x:p.x-tx*len+nx*sign*len*.34,
        y:p.y-ty*len+ny*sign*len*.34}],
      i%3===0?style.core:style.c,1.15,.63*(1-i/14));
    }
    // Twin helix filaments, reusing the actual Frostbolt spiral frequency.
    for(const sign of [-1,1]){
      const points=[];
      for(let i=0;i<=12;i++){
        const f=i/12;
        points.push(pt(f,sign*Math.sin(f*Math.PI*3+travel*11+seed*.012)
          *6.5*k*Math.sin(f*Math.PI)));
      }
      line(points,sign>0?style.core:style.dim,1.05,.43);
    }
    // Distinct faceted spearhead: dark silhouette -> saturated blue facet ->
    // tiny near-white cutting edge. Keep it separable from the luminous tail.
    const front=19*k,wing=7.1*k;
    const tip={x:px+tx*front,y:py+ty*front};
    g.moveTo(tip.x,tip.y)
      .lineTo(px-tx*12*k+nx*wing*1.28,py-ty*12*k+ny*wing*1.28)
      .lineTo(px-tx*6*k,py-ty*6*k)
      .lineTo(px-tx*12*k-nx*wing*1.28,py-ty*12*k-ny*wing*1.28)
      .closePath().fill({color:style.dim,alpha:.93*opacity});
    g.moveTo(tip.x,tip.y)
      .lineTo(px-tx*9*k+nx*wing,py-ty*9*k+ny*wing)
      .lineTo(px+tx*2*k,py+ty*2*k)
      .lineTo(px-tx*9*k-nx*wing,py-ty*9*k-ny*wing)
      .closePath().fill({color:style.c,alpha:.96*opacity});
    // The brightest area is a narrow, tapered facet at the leading tip,
    // not a white band extending all the way to the casting orb.
    g.moveTo(tip.x,tip.y)
      .lineTo(px+tx*2*k+nx*2.1*k,py+ty*2*k+ny*2.1*k)
      .lineTo(px-tx*3*k,py-ty*3*k)
      .lineTo(px+tx*2*k-nx*2.1*k,py+ty*2*k-ny*2.1*k)
      .closePath().fill({color:style.core,alpha:.92*opacity});
    line([{x:px-tx*3*k,y:py-ty*3*k},tip],style.core,1.15,.97);
  }else{
    // Pyroblast: four flame temperature layers, flowing ribbons and a molten
    // golden body. Sun Lance stays tighter and more directional than fire.
    // More dark amber + molten gold, less continuous cream-white fill.
    // Tapered flowing amber ribbons with deliberate gaps: fire that wraps a
    // defined solar tip, not a broad opaque strip between the two orbs.
    ribbon(3,1,3.0,11.5,7.5,18,style.dim,.22);
    ribbon(11,1.12,2.5,8.5,5.5,18,style.c,.36);
    ribbon(23,.94,1.1,4.4,3.2,18,0xffb035,.51);
    ribbon(37,1.25,.4,2.4,1.7,18,style.core,.32);
    ribbon(101,1.70,1.5,9.5,8.5,16,style.dim,.09);
    line([pt(0),pt(1)],0xffba3a,3.3,.35);
    line([pt(0),pt(1)],style.core,.83,.47);
    // A few independent embers give motion without obscuring the lance.
    for(let i=0;i<13;i++){
      const f=(i+.35)/13;
      const side=Math.sin(i*1.71+travel*20+seed*.025)
        *(6+(i%5)*2.4)*k;
      const p=pt(f,side);
      const lift=((1-f)*8+Math.sin(travel*12+i*1.3)*3
        -Math.pow(1-f,1.6)*7)*k;
      const radius=1.1+(i%4)*.43;
      dot(p.x,p.y+lift,radius*3.7,i%4===0?style.core:style.c,.14);
      dot(p.x,p.y+lift,radius,
        i%5===0?style.core:i%2?0xffc34a:style.dim,.83);
      if(i%3===0){
        line([{x:p.x,y:p.y+lift},{x:p.x-tx*10*k+nx*side*.15,
          y:p.y+lift-ty*10*k-3*k}],
        i%2?style.core:style.c,1.15,.54);
      }
    }
    // Three staggered flame tongues weave in/out of the hotter center.
    for(let lane=0;lane<3;lane++){
      const sign=lane%2?1:-1;
      const shift=travel*(13+lane*1.8)+seed*.017+lane*1.7;
      const pts=[];
      for(let i=0;i<=11;i++){
        const f=i/11;
        pts.push(pt(f,sign*Math.sin(f*Math.PI*3+shift)
          *(5+lane*2.2)*k*Math.sin(f*Math.PI)));
      }
      line(pts,lane===0?style.core:lane===1?0xffd04a:
        lane===2?style.c:style.dim,lane===0?2.1:1.35,lane===0?.66:.46);
    }
    // Pyroblast's rotating heating coils supply moving depth along the beam.
    for(let i=0;i<3;i++){
      const p=pt(.18+i*.13),spin=travel*12+i*.9+seed*.009;
      const along=(4+Math.sin(spin)*2)*k,across=(8+i%3*2.5)*k;
      const ring=[];
      for(let j=0;j<=10;j++){
        const a=j/10*TAU;
        ring.push({x:p.x+tx*Math.cos(a)*along+nx*Math.sin(a)*across,
          y:p.y+ty*Math.cos(a)*along+ny*Math.sin(a)*across});
      }
      line(ring,i%2?0xffbf4b:style.c,1.15,.34);
    }
    // Three-level solar spearhead; the small hot-white front sits INSIDE
    // a gold facet with a burnt-orange silhouette (like the build-up).
    const front=21*k,back=14*k;
    const tip={x:px+tx*front,y:py+ty*front};
    g.moveTo(tip.x,tip.y)
      .lineTo(px-tx*back+nx*8.2*k,py-ty*back+ny*8.2*k)
      .lineTo(px-tx*7*k,py-ty*7*k)
      .lineTo(px-tx*back-nx*8.2*k,py-ty*back-ny*8.2*k)
      .closePath().fill({color:style.dim,alpha:.92*opacity});
    g.moveTo(tip.x,tip.y)
      .lineTo(px-tx*10*k+nx*6.1*k,py-ty*10*k+ny*6.1*k)
      .lineTo(px-tx*3*k,py-ty*3*k)
      .lineTo(px-tx*10*k-nx*6.1*k,py-ty*10*k-ny*6.1*k)
      .closePath().fill({color:style.c,alpha:.97*opacity});
    g.moveTo(tip.x,tip.y)
      .lineTo(px+tx*1*k+nx*2.6*k,py+ty*1*k+ny*2.6*k)
      .lineTo(px-tx*5*k,py-ty*5*k)
      .lineTo(px+tx*1*k-nx*2.6*k,py+ty*1*k-ny*2.6*k)
      .closePath().fill({color:style.core,alpha:.91*opacity});
    line([{x:px-tx*4*k,y:py-ty*4*k},tip],style.core,1.35,.98);
    for(let i=0;i<4;i++){
      const sign=i%2?1:-1,p=pt(.88-i*.09,sign*(4+i*1.5)*k);
      line([{x:p.x-tx*4*k,y:p.y-ty*4*k},
        {x:p.x+tx*4*k+nx*sign*2*k,y:p.y+ty*4*k+ny*sign*2*k}],
      i===0?style.core:style.c,1.15,.67);
    }
  }
  // Satellites orbit the travelling head, not the stationary caster.
  const n=ice?3:4;
  for(let i=0;i<n;i++){
    const phase=travel*(ice?14:17)*(i%2?-1:1)+i*TAU/n+seed*.013;
    const side=Math.cos(phase)*(ice?16:19)*k;
    dot(px+nx*side-tx*i*2.2*k,
      py+ny*side-ty*i*2.2*k+Math.sin(phase)*2.5*k,
      ice?2:2.4,i%2?style.core:style.c,.73);
  }
}
