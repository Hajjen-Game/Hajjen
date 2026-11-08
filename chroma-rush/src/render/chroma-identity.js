/* CHROMA RUSH — Chroma Identity & Visual Polish 1.0.
 * One small, renderer-only inset cut grammar shared by runner and hazards.
 * No gameplay, collision geometry, RNG, detached sprites, rings or labels.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaIdentity=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function visualBudget(quality={}){
    const density=clamp(quality.density??1,.3,1);
    return {density,detail:density>=.7?2:1,glow:density>=.7?clamp(quality.glow??1,.15,1):0};
  }
  function drawPlayerMark(ctx,{x,y,w,h,offset=0,primary='#4bf0ff',
    secondary='#fa49b2',duck=false,dash=0,quality={}}={}){
    if(!(w>=18&&h>=12))return;
    const budget=visualBudget(quality);
    const ox=clamp(offset,-w*.28,w*.28)*.42;
    const cy=y+h*.52;
    const span=Math.min(w*.35,h*.43,16);
    const depth=duck?Math.min(4,h*.19):Math.min(9,h*.24);
    ctx.save();ctx.lineCap='square';ctx.lineJoin='bevel';
    ctx.shadowBlur=0;ctx.globalAlpha=.74;ctx.strokeStyle='#122a40';
    ctx.lineWidth=Math.min(3.2,Math.max(1.8,w*.065));
    ctx.beginPath();
    ctx.moveTo(x+w*.34+ox,cy-depth);
    ctx.lineTo(x+w*.34-span*.28+ox,cy+depth);
    ctx.moveTo(x+w*.61+ox,cy-depth);
    ctx.lineTo(x+w*.61-span*.28+ox,cy+depth);
    ctx.stroke();
    if(budget.detail>1){
      ctx.lineWidth=1.35;
      ctx.strokeStyle=dash>.25?secondary:primary;
      ctx.globalAlpha=.72;ctx.shadowColor=ctx.strokeStyle;
      ctx.shadowBlur=3*budget.glow;
      ctx.beginPath();const lx=x+w*.77+ox;
      ctx.moveTo(lx,cy-depth*.65);ctx.lineTo(lx,cy+depth*.65);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawHazardMark(ctx,{x,y,w,h,type='jump',charged=false,quality={}}={}){
    if(!(w>=14&&h>=15))return;
    const budget=visualBudget(quality);
    const echo=type==='echo',dash=type==='dash-jump'||type==='dash-duck';
    const overhead=type==='duck'||type==='dash-duck';
    ctx.save();ctx.lineCap='square';ctx.lineJoin='bevel';
    ctx.shadowBlur=0;ctx.globalAlpha=.59;
    ctx.strokeStyle=charged?'#a5ffe0':'#f6fdff';
    ctx.lineWidth=budget.detail>1?1.65:1.3;
    ctx.beginPath();
    if(overhead){
      const cy=y+h*.54;
      ctx.moveTo(x+w*.24,cy);ctx.lineTo(x+w*.76,cy);
      if(budget.detail>1){
        ctx.moveTo(x+w*.36,cy+5);ctx.lineTo(x+w*.66,cy+5);
      }
    }else{
      for(let i=0;i<(echo?2:1);i++){
        const cy=y+h*(echo?.28+i*.40:.48);
        const span=Math.min(w*.32,12);
        ctx.moveTo(x+w*.5-span*.5,cy-span*.28);
        ctx.lineTo(x+w*.5,cy+span*.28);
        ctx.lineTo(x+w*.5+span*.5,cy-span*.28);
      }
    }
    ctx.stroke();
    if(dash&&charged&&budget.detail>1){
      ctx.globalAlpha=.64;ctx.strokeStyle='#87ffcf';ctx.lineWidth=1.5;
      ctx.beginPath();const cy=y+h*.73;
      ctx.moveTo(x+w*.24,cy);ctx.lineTo(x+w*.76,cy);ctx.stroke();
    }
    ctx.restore();
  }
  return {visualBudget,drawPlayerMark,drawHazardMark};
});
