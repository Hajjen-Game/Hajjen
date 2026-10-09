// Rift Slash / "dimensional cleave" — attack-first Pixi VFX.
// The broad leading crescent carries the spell, rather than the contact.
// Babylon supplies the optional 3D filaments when THREAD DEPTH is enabled.
// No physical damage, collision, target or animation clock is changed here.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const PALETTE={shadow:0x34174f,body:0x9650d8,magenta:0xe95cda,edge:0xffe5ff};

export function drawRiftSlashTravel(g,e,from,to,travel,style,scale=1){
  if(!from||!to)return;
  const dx=to.x-from.x,dy=to.y-from.y;
  const len=Math.max(1,Math.hypot(dx,dy));
  const tx=dx/len,ty=dy/len,nx=-ty,ny=tx;
  const k=clamp(scale,.72,1.8),t=clamp(travel,0,1);
  const progress=smooth(t);
  const on=smooth(t/.13)*(1-smooth((t-.75)/.25));
  const center=(p)=>({x:from.x+dx*smooth(p),y:from.y+dy*smooth(p)});
  const vec=(c,forward,side)=>({x:c.x+tx*forward+nx*side,y:c.y+ty*forward+ny*side});
  const stroke=(pts,color,width,alpha)=>{
    if(alpha<=.004||pts.length<2)return;
    g.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.stroke({color,width:Math.max(.4,width*k),alpha:clamp(alpha,0,1),
      cap:"round",join:"round"});
  };
  const band=(pts,color,alpha)=>{
    if(alpha<=.004||pts.length<3)return;
    g.moveTo(pts[0].x,pts[0].y);
    for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
    g.closePath().fill({color,alpha:clamp(alpha,0,1)});
  };
  // Filled, tapered CRESCENT mesh in 2D. The width peaks in the middle,
  // fades to sharp tips, and never resembles a circular impact wheel.
  const crescent=(centre,r,spin,width,colour,opacity)=>{
    const outer=[],inner=[],edge=[];
    for(let i=0;i<=40;i++){
      const u=i/40,angle=(u-.5)*Math.PI*1.22+spin;
      const weight=Math.pow(Math.max(0,Math.sin(Math.PI*u)),.74);
      const swell=width*weight;
      const axial=Math.cos(angle)*.63;
      const lateral=Math.sin(angle)*.90;
      const outerRadius=r;
      const innerRadius=r-swell;
      outer.push(vec(centre,axial*outerRadius,lateral*outerRadius));
      inner.push(vec(centre,axial*innerRadius,lateral*innerRadius));
      edge.push(vec(centre,axial*(r-.7*k),lateral*(r-.7*k)));
    }
    band([...outer,...inner.reverse()],colour,opacity);
    return edge;
  };

  // A very dark undercut separates the saturated pink-violet blade from
  // its neon rim, just like the user's slash reference images.
  const centre=center(progress*.92);
  const r=(43+7*smooth(t/.55))*k;
  const spin=(t-.43)*.29;
  const shadow=crescent(centre,r+5.5*k,spin,20*k,
    PALETTE.shadow,on*.80);
  const main=crescent(centre,r,spin,16*k,style.c,on*.85);
  crescent(centre,r-5*k,spin+.025,8*k,
    PALETTE.magenta,on*.74);

  // Stroke only the leading edge's central segment to preserve a thin hot
  // cutting line, not a giant opaque white arc.
  const bright=main.slice(5,36);
  stroke(main,PALETTE.magenta,5.4,on*.23);
  stroke(bright,style.core,2.25,on*.94);
  stroke(bright.slice(5,-5),PALETTE.edge,.82,on*.94);
  stroke(shadow,style.dim,1.0,on*.48);

  // A delayed, smaller crescent follows the blade and provides a readable
  // echo of movement; its own contour never masks the primary shape.
  const lag=clamp((t-.14)/.86,0,1);
  const echoOn=smooth(lag/.16)*(1-smooth((lag-.57)/.43))*.50;
  if(echoOn>.008){
    const echoCentre=center(lag*.79);
    const echoR=(30+4*smooth(lag))*k;
    const echo=crescent(echoCentre,echoR,spin-.22,8*k,
      PALETTE.shadow,echoOn*.72);
    const echoEdge=crescent(echoCentre,echoR-1.4*k,spin-.22,
      5*k,style.c,echoOn*.66);
    stroke(echoEdge.slice(5,35),PALETTE.magenta,1.35,echoOn*.77);
    stroke(echo,style.dim,.9,echoOn*.43);
  }

  // Only a handful of directional cuts and sparks. They move WITH the
  // crescent rather than becoming a second radial impact explosion.
  const sparkOn=on*(.80+.20*Math.sin(t*23));
  for(let i=0;i<4;i++){
    const u=(i+.7)/5,a=(u-.5)*Math.PI*1.22+spin;
    const p=vec(centre,Math.cos(a)*r*.63,Math.sin(a)*r*.90);
    const f=(3+i%2*2)*k;
    const q={x:p.x+tx*f,y:p.y+ty*f}; // spark follows attack direction
    stroke([p,{x:p.x+tx*f-nx*(i%2?4:-4)*k,
      y:p.y+ty*f-ny*(i%2?4:-4)*k}],
      i===0?PALETTE.edge:PALETTE.magenta,.80,sparkOn*(.39+i*.065));
    if(i===1||i===3)g.circle(q.x,q.y,1.05*k).fill({
      color:style.core,alpha:clamp(sparkOn*.54,0,1)});
  }
}

export function drawRiftSlashContact(g,e,from,to,phase,style,scale=1){
  if(!from||!to)return;
  const k=clamp(scale,.7,1.55),t=clamp(phase,0,1);
  const fade=1-smooth((t-.02)/.68);
  if(fade<=.002)return;
  const dx=to.x-from.x,dy=to.y-from.y;
  const d=Math.max(1,Math.hypot(dx,dy)),tx=dx/d,ty=dy/d,nx=-ty,ny=tx;
  const line=(a,b,color,w,alpha)=>{
    g.moveTo(a.x,a.y).lineTo(b.x,b.y)
      .stroke({color,width:w*k,alpha:clamp(alpha*fade,0,1),
        cap:"round",join:"round"});
  };
  // Short asymmetric contact glint: no sigil, wide ring or ground wheel.
  line({x:to.x-tx*9*k-nx*6*k,y:to.y-ty*9*k-ny*6*k},
    {x:to.x+tx*13*k+nx*7*k,y:to.y+ty*13*k+ny*7*k},
    style.core,1.9,.92);
  line({x:to.x-nx*10*k,y:to.y-ny*10*k},
    {x:to.x+nx*12*k+tx*3*k,y:to.y+ny*12*k+ty*3*k},
    PALETTE.magenta,1.35,.75);
  for(let i=0;i<3;i++){
    const side=i-1;
    const p={x:to.x+tx*(i+3)*k+nx*side*8*k,
      y:to.y+ty*(i+3)*k+ny*side*8*k};
    g.circle(p.x,p.y,(i===1?1.6:.9)*k).fill({
      color:i===1?style.core:style.c,alpha:clamp((.72-i*.15)*fade,0,1)});
  }
}
