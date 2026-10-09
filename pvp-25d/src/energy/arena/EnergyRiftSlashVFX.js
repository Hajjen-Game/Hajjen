// Rift Slash pass 20: a SIDE-ORIGIN DIMENSIONAL SWEEP, not an arrow projectile.
// Same purple/magenta/near-white color identity as the rest of Energy Arena.
// Damage timing remains external and the previously approved impact is kept.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const t=clamp(v,0,1);return t*t*(3-2*t);};
const TAU=Math.PI*2;
const C={shadow:0x34174f,body:0x9650d8,magenta:0xe95cda,edge:0xffe5ff};

function frame(from,to){
  const dx=to.x-from.x,dy=to.y-from.y;
  const d=Math.max(1,Math.hypot(dx,dy));
  return {tx:dx/d,ty:dy/d,nx:-dy/d,ny:dx/d};
}
function point(f,center,forward,side){
  return {x:center.x+f.tx*forward+f.nx*side,
    y:center.y+f.ty*forward+f.ny*side};
}
function stroke(g,pts,color,width,alpha){
  if(alpha<.004||pts.length<2)return;
  g.moveTo(pts[0].x,pts[0].y);
  for(let i=1;i<pts.length;i++)g.lineTo(pts[i].x,pts[i].y);
  g.stroke({color,width,alpha:clamp(alpha,0,1),cap:"round",join:"round"});
}
function crescent(g,f,center,r,width,spin,color,alpha){
  if(alpha<.003)return [];
  const outer=[],inner=[],edge=[];
  for(let i=0;i<=38;i++){
    const u=i/38,angle=(u-.5)*Math.PI*1.22+spin;
    const taper=Math.pow(Math.max(0,Math.sin(Math.PI*u)),.78);
    const x=Math.cos(angle)*.62,y=Math.sin(angle)*.94;
    outer.push(point(f,center,x*r,y*r));
    inner.push(point(f,center,x*(r-width*taper),y*(r-width*taper)));
    edge.push(point(f,center,x*(r-.6),y*(r-.6)));
  }
  g.moveTo(outer[0].x,outer[0].y);
  for(let i=1;i<outer.length;i++)g.lineTo(outer[i].x,outer[i].y);
  for(let i=inner.length-1;i>=0;i--)g.lineTo(inner[i].x,inner[i].y);
  g.closePath().fill({color,alpha:clamp(alpha,0,1)});
  return edge;
}

// Charge belongs INSIDE the glass orb just like other signature spells.
// The ghost side blade exists only in the last ~20% of the wind-up.
export function drawRiftSlashCharge(g,e,from,to,t,style){
  if(!from)return;
  const f=frame(from,to||{x:from.x+1,y:from.y});
  const phase=clamp(t,0,1),pressure=smooth(phase);
  const fade=smooth(phase/.14)*(1-smooth((phase-.94)/.06));
  // Three concentric twisting light filaments within ~14px of orb centre.
  for(let lane=0;lane<3;lane++){
    const pts=[],start=phase*TAU*(lane%2?-.8:1.02)+lane*2.10;
    for(let j=0;j<=20;j++){
      const u=j/20,a=start+u*(1.40+lane*.13);
      const rad=(5.8+lane*2.9)*(1-.14*pressure);
      pts.push({x:from.x+Math.cos(a)*rad,
        y:from.y+Math.sin(a)*rad*.78});
    }
    stroke(g,pts,lane===0?style.core:lane===1?style.c:style.dim,
      lane===0?1.6:1.05,fade*(.55+pressure*.28));
  }
  // Irregular rift current gathering at a compact central point.
  for(let i=0;i<3;i++){
    const a=phase*TAU*(i%2?-.75:1.1)+i*TAU/3;
    const rad=(7.5-i*.8)*(1-.31*pressure);
    const p={x:from.x+Math.cos(a)*rad,
      y:from.y+Math.sin(a)*rad*.83};
    g.circle(p.x,p.y,1.05+i*.14).fill({
      color:i===0?style.core:style.c,alpha:fade*(.43+pressure*.33)});
  }
  // A SMALL ghost blade foreshadows the lateral swing just before release.
  const sideOn=smooth((phase-.77)/.20)*fade;
  if(sideOn>.005){
    const centre=point(f,from,0,-14);
    const ghost=crescent(g,f,centre,13,3.2,-.36,style.dim,
      sideOn*.27);
    stroke(g,ghost.slice(5,34),style.c,1.15,sideOn*.47);
  }
}

// Most of the attack lives at the TARGET and sweeps laterally through it.
// There is NO interpolation of the crescent from caster to target.
export function drawRiftSlashTravel(g,e,from,to,travel,style,scale=1){
  if(!from||!to)return;
  const f=frame(from,to),t=clamp(travel,0,1),k=clamp(scale,.72,1.8);
  // In Pixi the hit lands at 269ms of the (269+120)ms swing timeline,
  // so the blade crosses the target exactly at contact (t~=0.69).
  const crossing=269/389;
  const phase=t<=crossing?.5*smooth(t/crossing):
    .5+.5*smooth((t-crossing)/(1-crossing));
  const on=smooth(t/.11)*(1-smooth((t-.82)/.18));
  const r=44*k;
  // The blade enters from the LEFT SIDE OF THE STRIKE AXIS and cuts across
  // the enemy's centre. It overshoots to the opposite side before dissolving.
  const lateral=(-1.30+2.60*phase)*r;
  const forward=(-.16+.18*phase)*r;
  const center=point(f,to,forward,lateral);
  // Rotation makes the action an actual SWING, not a translated letter C.
  const angle=-.67+1.13*phase;
  const shadow=crescent(g,f,center,r+5*k,18*k,angle,
    C.shadow,on*.76);
  const outer=crescent(g,f,center,r,15*k,angle,style.c,on*.83);
  crescent(g,f,center,r-4*k,8*k,angle+.022,C.magenta,on*.74);
  stroke(g,outer.slice(4,35),C.magenta,4.3*k,on*.28);
  stroke(g,outer.slice(5,34),style.core,2.05*k,on*.93);
  stroke(g,outer.slice(10,29),C.edge,.72*k,on*.90);
  stroke(g,shadow,style.dim,.8*k,on*.39);

  // Secondary blade follows the same sideways path at a DELAY, not from
  // the caster's launch position; it appears behind the cutting edge.
  const delayed=clamp((t-.16)/.84,0,1);
  const echoOn=smooth(delayed/.17)*(1-smooth((delayed-.67)/.33))*.48;
  if(echoOn>.006){
    const echoCentre=point(f,to,(-.14+.17*smooth(delayed))*r,
      (-1.30+2.60*smooth(delayed))*.84*r);
    const echoR=31*k,echoAngle=-.72+.94*smooth(delayed);
    const tail=crescent(g,f,echoCentre,echoR+3*k,9*k,
      echoAngle,C.shadow,echoOn*.66);
    const edge=crescent(g,f,echoCentre,echoR,5*k,
      echoAngle,style.c,echoOn*.65);
    stroke(g,edge.slice(6,33),C.magenta,1.6*k,echoOn*.84);
    stroke(g,tail,style.dim,.8*k,echoOn*.42);
  }
  // Small directional spark streaks hug the outer curve, never a radial hit.
  if(on>.01)for(let i=0;i<3;i++){
    const u=(i+1)/4,a=(u-.5)*Math.PI*1.22+angle;
    const p=point(f,center,Math.cos(a)*r*.62,Math.sin(a)*r*.94);
    const q=point(f,p,(i+3)*2*k,(i%2?1:-1)*4*k);
    stroke(g,[p,q],i===1?style.core:C.magenta,.85*k,on*.62);
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
    C.magenta,1.35,.75);
  for(let i=0;i<3;i++){
    const side=i-1;
    const p={x:to.x+tx*(i+3)*k+nx*side*8*k,
      y:to.y+ty*(i+3)*k+ny*side*8*k};
    g.circle(p.x,p.y,(i===1?1.6:.9)*k).fill({
      color:i===1?style.core:style.c,alpha:clamp((.72-i*.15)*fade,0,1)});
  }
}
