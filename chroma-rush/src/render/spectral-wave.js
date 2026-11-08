/* CHROMA RUSH — Chroma Tide 2.0
 * One full-height, spatially advancing color tide with a soft awakening,
 * prismatic leading edge and brief linear resonance. Absolutely no separate
 * scout/box, radial burst, screen-flash or gameplay interaction.
 * Recolor original scenery in SINGLE draw passes, never double paint.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaSpectralWave=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  const rgba=(hex,alpha)=>{
    const n=parseInt(hex.slice(1),16);
    return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha,0,1)+')';
  };
  const blendHex=(a,b,t)=>{
    if(t<=0)return a;
    if(t>=1)return b;
    const A=parseInt(a.slice(1),16),B=parseInt(b.slice(1),16);
    const channel=s=>Math.round(((A>>s)&255)*(1-t)+((B>>s)&255)*t);
    return '#'+[channel(16),channel(8),channel(0)].map(n=>n.toString(16).padStart(2,'0')).join('');
  };
  // Calculate perceptual colors ONLY on zone change, then use a tiny lookup
  // table at render time. Per-frame colorAt never does pow/cbrt/matrix work.
  const hexToLinear=h=>{
    const n=parseInt(h.slice(1),16);
    return [16,8,0].map(shift=>{
      const c=((n>>shift)&255)/255;
      return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4);
    });
  };
  const toOKLab=h=>{
    const [r,g,b]=hexToLinear(h);
    const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
    const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
    const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
    return [.2104542553*l+.793617785*m-.0040720468*s,
      1.9779984951*l-2.428592205*m+.4505937099*s,
      .0259040371*l+.7827717662*m-.808675766*s];
  };
  const fromOKLab=([L,A,B])=>{
    const l=(L+.3963377774*A+.2158037573*B)**3;
    const m=(L-.1055613458*A-.0638541728*B)**3;
    const s=(L-.0894841775*A-1.2914855480*B)**3;
    const rgb=[
      4.0767416621*l-3.3077115913*m+.2309699292*s,
      -1.2684380046*l+2.6097574011*m-.3413193965*s,
      -.0041960863*l-.7034186147*m+1.7076147010*s];
    return '#'+rgb.map(linear=>{
      const c=Math.max(0,Math.min(1,linear));
      return Math.round(255*(c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055))
        .toString(16).padStart(2,'0');
    }).join('');
  };
  const STEPS=64;
  const ramp=(from,to)=>{
    const a=toOKLab(from),b=toOKLab(to);
    const r=Array.from({length:STEPS+1},(_,i)=>{
      const t=i/STEPS;return fromOKLab(a.map((v,j)=>v+(b[j]-v)*t));
    });
    // Never allow an approximate conversion to perturb true endpoints.
    r[0]=from;r[STEPS]=to;
    return r;
  };
  class SpectralWave {
    constructor(){this.reset()}
    reset(){
      this.active=false;this.elapsed=0;this.duration=.9;this.chargeDuration=0;this.width=1280;
      this.from=null;this.to=null;this.playerCrossed=false;
      this.ramps=null;this.resonanceAge=Infinity;this.crossX=300;
    }
    start({from,to,width=1280,duration=.9,chargeDuration=0,reducedMotion=false}={}){
      this.reset();
      this.from=from||to||null;this.to=to||from||null;
      this.width=Math.max(1,Number(width)||1280);
      this.duration=clamp(Number(duration)||.9,.45,1.4);
      this.chargeDuration=clamp(Number(chargeDuration)||0,0,.35);
      this.active=Boolean(this.from&&this.to&&!reducedMotion);
      if(this.active){
        this.ramps=Object.fromEntries(['primary','secondary','shadow'].map(channel=>
          [channel,ramp(this.from[channel],this.to[channel])]));
      }
      return this.active;
    }
    get progress(){return this.active?clamp((this.elapsed-this.chargeDuration)/this.duration,0,1):1}
    get charging(){return this.active&&this.chargeDuration>0&&this.elapsed<this.chargeDuration}
    get chargeLevel(){return this.charging?smooth(this.elapsed/this.chargeDuration):0}
    get resonance(){return this.active&&this.resonanceAge<.27?
      1-smooth(this.resonanceAge/.27):0}
    // Begin outside the right edge, sweep past the left. Vertical displacement
    // gives the edge a slight living shimmer, never a circular/radial blast.
    frontAt(y,height=720){
      if(!this.active)return -140;
      const margin=clamp(this.width*.095,70,150);
      const x=this.width+margin-(this.width+2*margin)*this.progress;
      const shift=Math.sin(y*.019+this.elapsed*11)*6+
        Math.sin(y*.041-this.elapsed*15)*3;
      return x+shift;
    }
    colorAt(x,channel='primary',y=360,height=720){
      const next=this.to?.[channel]||this.from?.[channel]||'#ffffff';
      if(!this.active)return next;
      const previous=this.from?.[channel]||next;
      const t=smooth((x-this.frontAt(y,height)+26)/52);
      return t<=0?previous:t>=1?next:
        (this.ramps?.[channel]?.[Math.round(t*STEPS)]||blendHex(previous,next,t));
    }
    tick(dt,{playerX=300,playerY=500,height=720}={}){
      if(!this.active||!(dt>0))return false;
      const before=this.frontAt(playerY,height);
      const total=this.chargeDuration+this.duration;
      this.elapsed=Math.min(total,this.elapsed+dt);
      if(total-this.elapsed<1e-9)this.elapsed=total;
      const after=this.frontAt(playerY,height);
      const crossed=!this.playerCrossed&&before>=playerX&&after<=playerX;
      if(crossed){this.playerCrossed=true;this.resonanceAge=0;this.crossX=playerX;}
      else if(this.playerCrossed)this.resonanceAge+=dt;
      if(this.elapsed>=total)this.active=false;
      return crossed;
    }
    // Horizontal color field used by a SINGLE scene/terrain paint.
    // New zone colors are to the RIGHT of the wave; old to the left.
    // The charging phase changes ambience only, never paints a barrier.
    gradient(ctx,width,channel='primary',y=360,height=720){
      const to=this.to?.[channel]||'#ffffff';
      if(!this.active)return to;
      const from=this.from?.[channel]||to;
      if(this.charging)return from;
      const head=this.frontAt(y,height),span=35;
      if(head>width+span)return from;
      if(head<-span)return to;
      const left=clamp((head-span)/width,0,1);
      const right=clamp((head+span)/width,0,1);
      const g=ctx.createLinearGradient(0,0,width,0);
      g.addColorStop(0,from);g.addColorStop(left,from);
      g.addColorStop(right,to);g.addColorStop(1,to);
      return g;
    }
    clipSide(ctx,width,height,side){
      // At most 12 edge samples per pass: no masks or offscreen canvases.
      const count=12;
      const edge=y=>this.frontAt(y,height);
      ctx.beginPath();
      if(side==='old'){
        ctx.moveTo(0,0);ctx.lineTo(edge(0),0);
        for(let i=1;i<=count;i++){const y=height*i/count;ctx.lineTo(edge(y),y)}
        ctx.lineTo(0,height);
      }else{
        ctx.moveTo(edge(0),0);ctx.lineTo(width,0);ctx.lineTo(width,height);
        for(let i=count;i>=0;i--){const y=height*i/count;ctx.lineTo(edge(y),y)}
      }
      ctx.closePath();ctx.clip();
    }
    drawLayer(ctx,width,height,drawOld,drawNew){
      if(!this.active){drawNew();return}
      const head=this.frontAt(height*.5,height);
      // Skip the offscreen half to avoid double-rendering expensive parallax.
      if(head>width+18){drawOld();return}
      if(head<-18){drawNew();return}
      ctx.save();this.clipSide(ctx,width,height,'old');drawOld();ctx.restore();
      ctx.save();this.clipSide(ctx,width,height,'new');drawNew();ctx.restore();
    }
    // No separate pre-wave marker. The retired mark-aligned scout could
    // be mistaken for a JUMP obstacle. Keep anticipation in the soundtrack
    // and let the actual full-height chromatic front carry the color change.
    draw(ctx,{width,height,groundY=height*.715,quality={density:1,glow:1}}={}){
      if(!this.active||this.charging||!(width>0)||!(height>0))return;
      const head=this.frontAt(height*.50,height);
      const intensity=clamp(quality.density??1,.30,1);
      // Fixed inexpensive quality budget: even forced HIGH draws just one
      // backdrop, one terrain and up to THREE glow paths in the tide itself.
      const glow=Math.min(.70,clamp(quality.glow??1,.15,1));
      const primary=this.to?.primary||'#3feeff';
      const secondary=this.to?.secondary||primary;
      ctx.save();
      if(head>=-110&&head<=width+110){
        // Three overlapping wavelengths travel as one FULL-HEIGHT front.
        // A soft trailing veil creates depth without covering obstacle art.
        const veil=ctx.createLinearGradient(head-105,0,head+82,0);
        veil.addColorStop(0,rgba(secondary,0));
        veil.addColorStop(.24,rgba(secondary,.055*intensity));
        veil.addColorStop(.53,rgba(primary,.16*intensity));
        veil.addColorStop(.61,rgba('#ffffff',.095*intensity));
        veil.addColorStop(.83,rgba(secondary,.065*intensity));
        veil.addColorStop(1,rgba(primary,0));
        const left=Math.max(0,head-110),right=Math.min(width,head+88);
        if(right>left){ctx.fillStyle=veil;ctx.fillRect(left,0,right-left,height);}
        const trace=(offset,alpha,lineWidth,blur,color)=>{
          ctx.beginPath();
          const segments=intensity<.5?8:12;
          for(let i=0;i<=segments;i++){
            const y=height*i/segments,x=this.frontAt(y,height)+offset;
            if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          }
          ctx.globalAlpha=alpha*intensity;
          ctx.strokeStyle=color;ctx.lineWidth=lineWidth;
          ctx.shadowColor=color;ctx.shadowBlur=blur*glow;
          ctx.stroke();
        };
        trace(-16,.21,3.2,9,secondary);
        trace(0,.76,2.5,14,'#ffffff');
        if(intensity>=.55)trace(9,.28,2.0,9,primary);
        // Short refraction flecks belong to the moving FRONT only.
        // Never create a detached object travelling ahead of it.
        const count=intensity<.5?3:intensity<.8?5:8;
        ctx.shadowBlur=0;ctx.lineWidth=1.3;ctx.strokeStyle=secondary;
        for(let i=0;i<count;i++){
          const y=height*(i+.42)/count;
          const x=this.frontAt(y,height);
          const length=18+(i%3)*13;
          ctx.globalAlpha=(.14+.08*Math.sin(this.elapsed*16+i)) *intensity;
          ctx.beginPath();ctx.moveTo(x-13,y);
          ctx.lineTo(x-13-length,y);ctx.stroke();
        }
        // Track illumination is glued TO the real color front, never ahead.
        const floor=this.frontAt(groundY,height);
        ctx.globalAlpha=.35*intensity;ctx.strokeStyle=primary;
        ctx.lineWidth=2;ctx.beginPath();
        ctx.moveTo(floor-22,groundY+2);ctx.lineTo(floor+22,groundY+2);ctx.stroke();
      }
      // Residual brightness follows the player's crossing for .27 seconds,
      // registered only once; subtle linear rails, no white flash or rings.
      const resonance=this.resonance;
      if(resonance>0){
        ctx.shadowBlur=0;
        for(let i=0;i<2;i++){
          const y=i===0?height*.47:groundY+3;
          ctx.globalAlpha=resonance*(i===0?.13:.25)*intensity;
          ctx.strokeStyle=i===0?secondary:primary;
          ctx.lineWidth=i===0?1.4:2.3;
          ctx.beginPath();
          ctx.moveTo(Math.max(0,this.crossX-175),y);
          ctx.lineTo(Math.min(width,this.crossX+40),y);ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  return {SpectralWave,blendHex};
});
