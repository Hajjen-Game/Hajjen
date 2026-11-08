/* CHROMA RUSH — Chroma Tide Spectacle 1.0
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
  const AFTERGLOW_SECONDS=.78,RESONANCE_SECONDS=.48;
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
      this.ramps=null;this.resonanceAge=Infinity;this.completionAge=Infinity;this.crossX=300;
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
    get resonance(){return this.resonanceAge<RESONANCE_SECONDS?
      1-smooth(this.resonanceAge/RESONANCE_SECONDS):0}
    get afterglow(){return this.completionAge<AFTERGLOW_SECONDS?
      1-smooth(this.completionAge/AFTERGLOW_SECONDS):0}
    // Global atmosphere evolves gradually across the entire tide duration.
    // Individual architecture/terrain lights still change locally at frontAt.
    // Prevents the base sky from snapping when the front hits screen center.
    ambientColor(channel='primary'){
      const next=this.to?.[channel]||'#ffffff';
      if(!this.active)return next;
      const previous=this.from?.[channel]||next;
      const t=this.charging?0:smooth(this.progress);
      return t<=0?previous:t>=1?next:
        (this.ramps?.[channel]?.[Math.round(t*STEPS)]||blendHex(previous,next,t));
    }
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
    // The first 180px BEHIND the real front are briefly energized.
    // Used by existing surface/grid geometry, never creates a new obstacle.
    accentAt(x,y=360,height=720){
      if(!this.active||this.charging)return 0;
      const behind=x-this.frontAt(y,height);
      return smooth((behind+50)/95)*(1-smooth((behind-18)/180));
    }
    tick(dt,{playerX=300,playerY=500,height=720}={}){
      if(!(dt>0))return false;
      if(!this.active){
        if(this.resonanceAge<RESONANCE_SECONDS)this.resonanceAge+=dt;
        if(this.completionAge<AFTERGLOW_SECONDS)this.completionAge+=dt;
        return false;
      }
      const before=this.frontAt(playerY,height);
      const total=this.chargeDuration+this.duration;
      this.elapsed=Math.min(total,this.elapsed+dt);
      if(total-this.elapsed<1e-9)this.elapsed=total;
      const after=this.frontAt(playerY,height);
      const crossed=!this.playerCrossed&&before>=playerX&&after<=playerX;
      if(crossed){this.playerCrossed=true;this.resonanceAge=0;this.crossX=playerX;}
      else if(this.playerCrossed)this.resonanceAge+=dt;
      if(this.elapsed>=total){this.active=false;this.completionAge=0;}
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
    // Spectacle is attached to the SAME full-height front as the spatial
    // palette. No scout object, no radial burst, no full-screen flash.
    // The two thin colored veils are the only new fills during the pass.
    draw(ctx,{width,height,groundY=height*.715,quality={density:1,glow:1}}={}){
      if(!(width>0)||!(height>0)||(!this.active&&this.afterglow<=0&&this.resonance<=0))return;
      const intensity=clamp(quality.density??1,.3,1);
      const glow=clamp(quality.glow??1,.15,1);
      const primary=this.to?.primary||'#3feeff';
      const secondary=this.to?.secondary||primary;
      ctx.save();
      if(this.active&&!this.charging){
        const head=this.frontAt(height*.5,height);
        if(head>=-210&&head<=width+150){
          // BROAD chromatic depth, then a narrow prismatic core: both taper
          // to transparency, never a rectangular barrier or a screen flash.
          const veil=ctx.createLinearGradient(head-130,0,head+195,0);
          veil.addColorStop(0,rgba(secondary,0));
          veil.addColorStop(.22,rgba(secondary,.075*intensity));
          veil.addColorStop(.44,rgba(primary,.24*intensity));
          veil.addColorStop(.53,rgba('#ffffff',.10*intensity));
          veil.addColorStop(.71,rgba(primary,.23*intensity));
          veil.addColorStop(1,rgba(secondary,0));
          const left=Math.max(0,head-135),right=Math.min(width,head+200);
          if(right>left){ctx.fillStyle=veil;ctx.fillRect(left,0,right-left,height);}
          const core=ctx.createLinearGradient(head-35,0,head+60,0);
          core.addColorStop(0,rgba(primary,0));
          core.addColorStop(.40,rgba(secondary,.11*intensity));
          core.addColorStop(.55,rgba('#ffffff',.16*intensity));
          core.addColorStop(.76,rgba(primary,.12*intensity));
          core.addColorStop(1,rgba(primary,0));
          const coreLeft=Math.max(0,head-36),coreRight=Math.min(width,head+62);
          if(coreRight>coreLeft){ctx.fillStyle=core;ctx.fillRect(coreLeft,0,coreRight-coreLeft,height);}
          // Layered travelling light filaments. Fixed density budget by tier,
          // drawn with the exact warped spatial boundary, never ahead of it.
          const trace=(offset,alpha,lineWidth,blur,color)=>{
            const segments=intensity<.5?8:12;
            ctx.beginPath();
            for(let i=0;i<=segments;i++){
              const y=height*i/segments,x=this.frontAt(y,height)+offset;
              if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
            }
            ctx.globalAlpha=alpha*intensity;
            ctx.strokeStyle=color;ctx.lineWidth=lineWidth;
            ctx.shadowColor=color;ctx.shadowBlur=blur*glow;
            ctx.stroke();
          };
          trace(-19,.38,4.4,15,secondary);
          trace(0,.91,3.6,18,'#ffffff');
          if(intensity>=.55)trace(12,.49,3.2,15,primary);
          // Horizontal refracted light trails lie BEHIND the front, to its
          // right as it sweeps left; no detached pre-wave boxes or arrows.
          const count=intensity<.5?3:intensity<.8?5:8;
          ctx.shadowBlur=4*glow;ctx.strokeStyle=secondary;
          for(let i=0;i<count;i++){
            const y=height*(i+.38)/count;
            const x=this.frontAt(y,height);
            const span=26+(i%4)*17;
            ctx.lineWidth=i%3===0?1.8:1.2;
            ctx.globalAlpha=(.19+.09*(.5+.5*Math.sin(this.elapsed*13+i)))*intensity;
            ctx.beginPath();ctx.moveTo(x+8,y);
            ctx.lineTo(x+span,y-1.5);ctx.stroke();
          }
          // Two short streak cuts give a tangible moment of acceleration
          // without flashing across the HUD or obscuring player/hazards.
          ctx.shadowBlur=8*glow;ctx.strokeStyle=primary;ctx.lineWidth=1.8;
          ctx.globalAlpha=.35*intensity;
          ctx.beginPath();ctx.moveTo(head+14,groundY-27);
          ctx.lineTo(head+100,groundY-27);ctx.stroke();
          if(intensity>.55){
            ctx.globalAlpha=.24*intensity;ctx.lineWidth=1.2;
            ctx.beginPath();ctx.moveTo(head+20,height*.33);
            ctx.lineTo(head+85,height*.33);ctx.stroke();
          }
        }
      }
      // Player-crossing resonance stays local and linear, including ceilings
      // (the caller mirrors this draw with the course). Never a camera flash.
      if(this.resonance>0){
        const strength=this.resonance*intensity;
        ctx.shadowBlur=8*glow;ctx.lineWidth=2.2;
        for(let i=0;i<3;i++){
          const y=i===0?height*.43:groundY+3+i*7;
          const length=155+i*45;
          ctx.globalAlpha=strength*(i===0?.26:.42);
          ctx.strokeStyle=i%2===0?primary:secondary;
          ctx.beginPath();ctx.moveTo(Math.max(0,this.crossX-length),y);
          ctx.lineTo(Math.min(width,this.crossX+45+i*17),y);ctx.stroke();
        }
      }
      // Unlike Tide 2.0, the zone leaves a brief visible AFTERGLOW after the
      // front clears the screen. Three soft light rails decay deterministically.
      if(!this.active&&this.afterglow>0){
        const fade=this.afterglow*intensity;
        ctx.shadowBlur=14*glow;
        for(let i=0;i<3;i++){
          const y=i===0?height*.46:groundY+5+(i-1)*13;
          const span=90+i*47;
          ctx.strokeStyle=i===1?primary:secondary;
          ctx.lineWidth=i===1?3.2:1.5;
          ctx.globalAlpha=fade*(i===1?.40:.23);
          ctx.beginPath();ctx.moveTo(Math.max(0,this.crossX-span),y);
          ctx.lineTo(Math.min(width,this.crossX+70+i*30),y);ctx.stroke();
        }
      }
      ctx.restore();
    }
  }
  return {SpectralWave,blendHex};
});
