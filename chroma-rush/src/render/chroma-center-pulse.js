/* CHROMA RUSH — Chroma Clash Visual Cohesion 1.0
 * Center-out chromatic energy field: a single continuous palette boundary,
 * not a projectile, obstacle, or separate gameplay object. This module owns
 * only geometry/VFX. World scenes are prerendered by Clash 1.4.
 */
(function(root, factory) {
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaCenterPulse=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const TAU=Math.PI*2;
  const clamp=x=>Math.min(1,Math.max(0,Number.isFinite(x)?x:0));
  const ease=x=>{const t=clamp(x);return t*t*(3-2*t)};
  const center=rect=>({x:rect.x+rect.w*.5,y:rect.y+rect.h*.5});
  const maxRadius=rect=>Math.hypot(rect.w*.5,rect.h*.5);
  // A short charge near the arena center, then a confident outward sweep.
  // The center is new by 25%; screen corners remain old until near the end.
  function radiusAt(progress,rect){
    const t=clamp(progress);
    return maxRadius(rect)*Math.min(1.02,ease(t)*1.06);
  }
  function reached(x,y,rect,progress){
    const c=center(rect);
    return Math.hypot(x-c.x,y-c.y)<=radiusAt(progress,rect);
  }
  function clipNewColor(ctx,rect,progress){
    const c=center(rect),r=radiusAt(progress,rect);
    ctx.beginPath();
    ctx.arc(c.x,c.y,Math.max(.00001,r),0,TAU);
    ctx.clip();
    return r;
  }
  function drawFront(ctx,rect,progress,color,intensity=1){
    const t=clamp(progress);
    if(t<=.015||t>=.98||intensity<=0)return;
    const c=center(rect),r=radiusAt(t,rect);
    const fade=Math.min(1,t*9,(1-t)*11)*Math.min(1,intensity);
    // A soft light seam painted OVER the already cached world. No glowing
    // square, screen flash, costly filter, shadow or additive composite.
    ctx.save();
    ctx.strokeStyle=color;
    ctx.globalAlpha=.22*fade;
    ctx.lineWidth=11;
    ctx.beginPath();ctx.arc(c.x,c.y,r,0,TAU);ctx.stroke();
    ctx.globalAlpha=.48*fade;
    ctx.strokeStyle='#e5faff';
    ctx.lineWidth=1.7;
    ctx.beginPath();ctx.arc(c.x,c.y,r,0,TAU);ctx.stroke();
    ctx.restore();
  }
  return {ease,center,maxRadius,radiusAt,reached,clipNewColor,drawFront};
});
