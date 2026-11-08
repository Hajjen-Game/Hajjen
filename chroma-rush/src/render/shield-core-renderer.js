/* CHROMA RUSH — Shield Core 1.0 code-drawn pickup visual.
 * Angular soft-edged energy crystal, no bitmap, no obstacle-like boxes/rings.
 * Canonical course transform handles ceiling; HUD transfer drawn outside it.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaShieldCoreRender=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
  function crystalPath(ctx,x,y,w,h){
    const hw=w*.5,hh=h*.5;
    ctx.beginPath();
    ctx.moveTo(x,y-hh);
    ctx.lineTo(x+hw*.83,y-hh*.48);
    ctx.lineTo(x+hw*.67,y+hh*.58);
    ctx.lineTo(x,y+hh);
    ctx.lineTo(x-hw*.67,y+hh*.58);
    ctx.lineTo(x-hw*.83,y-hh*.48);
    ctx.closePath();
  }
  function drawCore(ctx,core,{time=0,quality={},reducedMotion=false,ceiling=false}={}){
    if(!ctx||!core)return;
    const glow=clamp(quality.glow??1,.2,1);
    const density=clamp(quality.density??1,.3,1);
    const x=core.x,y=(core.displayY??core.y)+(reducedMotion?0:Math.sin(time*4.3+core.worldX*.01)*2.4);
    const breathing=reducedMotion?1:1+Math.sin(time*5.5+core.worldX*.006)*.055;
    const w=25*breathing,h=36*breathing;
    ctx.save();
    // A collectible is a WHITE-core gem with cyan edges, categorically
    // different from full-height grounded obstacle walls.
    ctx.globalAlpha=.96;ctx.shadowColor='#58efff';
    ctx.shadowBlur=glow*16;
    crystalPath(ctx,x,y,w,h);
    ctx.fillStyle='#106b99';ctx.fill();
    ctx.strokeStyle='#8af8ff';ctx.lineWidth=2.3;ctx.stroke();
    ctx.shadowBlur=glow*6;ctx.globalAlpha=1;
    crystalPath(ctx,x,y,w*.73,h*.78);
    ctx.fillStyle='#bcfaff';ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle='#ffffff';ctx.lineWidth=1.7;
    ctx.beginPath();ctx.moveTo(x-6,y);ctx.lineTo(x+6,y);
    ctx.moveTo(x,y-6);ctx.lineTo(x,y+6);ctx.stroke();
    if(density>.48&&!reducedMotion){
      const flicker=(.58+.42*Math.sin(time*9+core.worldX*.02)**2);
      ctx.globalAlpha=flicker*.7;
      ctx.fillStyle='#ffffff';
      ctx.fillRect(x-18,y-12,2.3,2.3);
      ctx.fillRect(x+16,y+8,2,2);
      if(density>.8)ctx.fillRect(x+19,y-16,1.6,1.6);
    }
    // Teaches the DOUBLE-JUMP requirement at a glance without large callouts.
    ctx.globalAlpha=.83;ctx.shadowBlur=0;ctx.font='800 11px system-ui';
    ctx.fillStyle='#c9fbff';ctx.textAlign='center';
    ctx.save();ctx.translate(x,y-25);
    if(ceiling)ctx.scale(1,-1); // readable text on the mirrored course
    ctx.fillText('×2',0,0);ctx.restore();
    ctx.restore();
  }
  function drawTransfer(ctx,flight,{width=1280,quality={},reducedMotion=false}={}){
    if(!ctx||!flight||reducedMotion)return;
    const elapsed=flight.total-flight.life;
    const t=clamp(elapsed/flight.total,0,1);
    const travel=smooth(t),glow=clamp(quality.glow??1,.2,1);
    const x=flight.x+(Math.min(84,width*.09)-flight.x)*travel;
    const y=flight.y+(33-flight.y)*travel-32*Math.sin(t*Math.PI);
    ctx.save();
    const alpha=(1-smooth(Math.max(0,t-.65)/.35));
    const pop=1+.38*Math.sin(Math.PI*Math.min(t/.27,1));
    ctx.globalAlpha=.9*alpha;
    ctx.shadowColor='#7dfaff';ctx.shadowBlur=12*glow;
    // Tiny diamond / diamond trail; never a circular ripple.
    crystalPath(ctx,x,y,10*pop,15*pop);
    ctx.fillStyle='#dbffff';ctx.fill();
    ctx.strokeStyle='#62e9ff';ctx.lineWidth=1.4;ctx.stroke();
    if((quality.density??1)>.5){
      ctx.globalAlpha=alpha*.45;ctx.shadowBlur=0;
      const lag=t<.1?4:12;
      ctx.fillStyle='#54d6ff';
      ctx.fillRect(x+lag,y+4,3.5,2);
      ctx.fillRect(x+lag*1.7,y-3,2,2);
    }
    ctx.restore();
  }
  return {drawCore,drawTransfer,crystalPath};
});
