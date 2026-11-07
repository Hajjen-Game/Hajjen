/* CHROMA RUSH — Zone Transition Spectral Wave 1.0
 * A purely presentational, deterministic horizontal color-front system.
 * No terrain/Director/Flow/input references. No timers, assets or random calls.
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
  class SpectralWave {
    constructor(){this.reset()}
    reset(){
      this.active=false;this.elapsed=0;this.duration=.9;this.width=1280;
      this.from=null;this.to=null;this.playerCrossed=false;
    }
    start({from,to,width=1280,duration=.9,reducedMotion=false}={}){
      this.reset();
      this.from=from||to||null;this.to=to||from||null;
      this.width=Math.max(1,Number(width)||1280);
      this.duration=clamp(Number(duration)||.9,.45,1.4);
      this.active=Boolean(this.from&&this.to&&!reducedMotion);
      return this.active;
    }
    get progress(){return this.active?clamp(this.elapsed/this.duration,0,1):1}
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
      return blendHex(previous,next,t);
    }
    tick(dt,{playerX=300,playerY=500,height=720}={}){
      if(!this.active||!(dt>0))return false;
      const before=this.frontAt(playerY,height);
      this.elapsed=Math.min(this.duration,this.elapsed+dt);
      const after=this.frontAt(playerY,height);
      const crossed=!this.playerCrossed&&before>=playerX&&after<=playerX;
      if(crossed)this.playerCrossed=true;
      if(this.elapsed>=this.duration)this.active=false;
      return crossed;
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
    draw(ctx,{width,height,groundY=height*.715,quality={density:1,glow:1}}={}){
      if(!this.active||!(width>0)||!(height>0))return;
      const head=this.frontAt(height*.5,height);
      if(head<-64||head>width+64)return;
      const color=this.to?.primary||'#3feeff';
      const contrast=this.to?.secondary||color;
      const density=clamp(quality.density??1,.3,1);
      const glow=clamp(quality.glow??1,.15,1);
      ctx.save();
      // Translucent prismatic wake sits UNDER obstacles/player, never washes
      // out their silhouettes or alters collision hitboxes.
      const band=ctx.createLinearGradient(head-65,0,head+75,0);
      band.addColorStop(0,rgba(color,0));
      band.addColorStop(.33,rgba(color,.085*density));
      band.addColorStop(.51,rgba('#ffffff',.07*density));
      band.addColorStop(.69,rgba(contrast,.11*density));
      band.addColorStop(1,rgba(contrast,0));
      ctx.fillStyle=band;ctx.fillRect(clamp(head-67,0,width),0,
        Math.max(0,Math.min(width,head+77)-Math.max(0,head-67)),height);
      const trace=(offset,alpha,lineWidth,shadowBlur)=>{
        ctx.beginPath();
        for(let i=0;i<=16;i++){
          const y=height*i/16,x=this.frontAt(y,height)+offset;
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.globalAlpha=alpha;ctx.strokeStyle=offset<0?contrast:color;
        ctx.lineWidth=lineWidth;ctx.shadowColor=color;
        ctx.shadowBlur=shadowBlur*glow;ctx.stroke();
      };
      trace(-13,.18*density,3,14);
      trace(0,.62*density,2,15);
      trace(6,.25*density,1,8);
      // Horizontal refracted streaks emphasize forward travel in the 2D plane.
      const count=density<.5?4:density<.8?7:10;
      ctx.shadowBlur=7*glow;ctx.lineWidth=1.4;ctx.strokeStyle=contrast;
      for(let i=0;i<count;i++){
        const y=height*(i+.42)/count;
        const x=this.frontAt(y,height);
        const phase=Math.sin(this.elapsed*18+i*2.39);
        const length=(12+i%4*9)*(density<.5?.65:1);
        ctx.globalAlpha=(.18+.17*(phase+1)/2)*density;
        ctx.beginPath();ctx.moveTo(x+9+i%3*6,y);
        ctx.lineTo(x+15+i%3*6+length,y);
        ctx.stroke();
      }
      // Short ground-aligned pulse, not an ellipse/ring.
      ctx.globalAlpha=.45*density;ctx.strokeStyle=color;
      ctx.shadowBlur=15*glow;ctx.lineWidth=2.4;
      const floor=this.frontAt(groundY,height);
      ctx.beginPath();ctx.moveTo(floor-18,groundY+2);
      ctx.lineTo(floor+58,groundY+2);ctx.stroke();
      ctx.restore();
    }
  }
  return {SpectralWave,blendHex};
});
