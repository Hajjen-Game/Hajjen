/* CHROMA RUSH — Full Background Continuity 1.0.
 * Full-canvas atmospheric and parallax background. The foreground ground height
 * (and the terrain's holes) never determines what is painted here.
 * All positions are viewport-relative, not anchored to the terrain surface.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaWorldBackground=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const rgba=(hex,alpha)=>{
    const n=parseInt(hex.slice(1),16);
    return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha,0,1)+')';
  };
  const wrap=(value,length)=>(value%length+length)%length;
  function drawBackground({ctx,width:W,height:H,time:t=0,speed=370,primary:c1,secondary:c2,shadow:c3,flow=0,glowLine,quality={density:1},tide=null}){
    if(!ctx||!(W>0)||!(H>0))return;
    const flowCharge=clamp(flow,0,100)/100;
    // One original background draw per frame, even DURING zone transition.
    // Far scenery samples the spatial tide in place, not an old/new double
    // paint. No architecture or parallax layout changes.
    const colorAt=(x,channel,y)=>tide?.active?
      tide.colorAt(x,channel,y,H):({primary:c1,secondary:c2,shadow:c3})[channel];
    // Broad radial light / sky take the slowly blended atmosphere so they
    // cannot flash across the WHOLE screen at the instant of front crossing.
    // The small neon scenic details still use true spatial front colors.
    const midPrimary=tide?.active?tide.ambientColor('primary'):c1;
    const midSecondary=tide?.active?tide.ambientColor('secondary'):c2;
    const midShadow=tide?.active?tide.ambientColor('shadow'):c3;
    // Base paints ALL pixels, including those behind holes and below slopes.
    ctx.fillStyle='#070b17';ctx.fillRect(0,0,W,H);
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#060b19');
    sky.addColorStop(.40,rgba(midShadow,.92));
    sky.addColorStop(.70,rgba(midShadow,.82));
    sky.addColorStop(1,rgba(midShadow,.60));
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // Both glows paint the ENTIRE viewport; no hard rectangle at floorY.
    const glow=ctx.createRadialGradient(W*.62,H*.49,20,W*.62,H*.56,Math.max(W*.62,H*.78));
    glow.addColorStop(0,rgba(midPrimary,.13+flowCharge*.11));
    glow.addColorStop(.52,rgba(midSecondary,.055));
    glow.addColorStop(1,rgba(midPrimary,0));
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    const lower=ctx.createRadialGradient(W*.64,H*.84,16,W*.64,H*.84,Math.max(W*.72,H*.93));
    lower.addColorStop(0,rgba(midPrimary,.16+flowCharge*.028));
    lower.addColorStop(.60,rgba(midSecondary,.069));
    lower.addColorStop(1,rgba(midPrimary,0));
    ctx.fillStyle=lower;ctx.fillRect(0,0,W,H);
    // A single screen-wide chromatic tint smoothly distinguishes incoming
    // and outgoing worlds. Atmospheric charge gently previews the NEXT hue
    // without a rectangle, scout or obstacle-like shape.
    if(tide?.active){
      ctx.save();
      if(tide.charging){
        ctx.globalAlpha=.12*tide.chargeLevel*(quality.density??1);
        ctx.fillStyle=tide.to?.primary||c1;
      }else{
        ctx.globalAlpha=.32*(quality.density??1);
        ctx.fillStyle=tide.gradient(ctx,W,'primary',H*.48,H);
      }
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    }
    // Receding architectural silhouettes continue below the nominal track.
    // A shared vertical fade prevents them from ending on a straight cut-off.
    const facade=ctx.createLinearGradient(0,H*.36,0,H);
    facade.addColorStop(0,rgba(midPrimary,.034));
    facade.addColorStop(.65,rgba(midPrimary,.027));
    facade.addColorStop(1,rgba(midPrimary,.003));
    const drift=t*speed*.13;
    const facadeStride=quality.density>=.9?1:quality.density>=.55?2:3;
    for(let k=-2;k<Math.ceil(W/155)+3;k+=facadeStride){
      const x=wrap(k*155-drift*.35,W+310)-155;
      const h=72+wrap(k*17+201,7)*16;
      const top=H*.54-h*.67;
      ctx.fillStyle=facade;ctx.fillRect(x,top,30,H-top);
      glowLine(x,top,x+30,top,colorAt(x,'secondary',top),1,4,.12);
      if(k%3===0){ctx.fillStyle=rgba(colorAt(x,'secondary',top+10),.093);ctx.fillRect(x+11,top+10,2,23);}
    }
    // Scrolling light streaks and distant particles cover the *full* height.
    for(let i=0;i<Math.max(8,Math.round(24*quality.density));i++){
      const y=46+wrap(i*43+17,Math.max(50,H-66));
      const x=wrap(i*147-t*speed*(.12+i%4*.08),W+300)-130;
      const len=(18+i%5*16)*(1+speed/1500);
      const fade=1-y/H*.42;
      glowLine(x,y,x+len,y,colorAt(x,i%2?'primary':'secondary',y),i%4===0?1.9:1,5,(.09+speed/2500*.13)*fade);
    }
    for(let i=0;i<Math.max(15,Math.round(58*quality.density));i++){
      const x=wrap(i*269.8-t*(7+i%4*5),W);
      const y=24+wrap(i*112.7,Math.max(40,H-48));
      ctx.fillStyle=rgba(i%2?colorAt(x,'primary',y):'#d4eaff',(.09+i%5*.035)*(1-y/H*.28));
      ctx.fillRect(x,y,i%7===0?2:1,i%7===0?2:1);
    }
    // Distant horizon is a scene detail, NOT an end of the background layer.
    const horizon=H*.47;
    glowLine(0,horizon,W,horizon,midPrimary,1,9,.15);
    for(let i=0;i<Math.ceil(W/135)+2;i+=quality.density<.5?2:1){
      const x=wrap(i*135-t*speed*.56,W+135);
      glowLine(x,horizon-3,x,horizon+14,colorAt(x,i%2?'secondary':'primary',horizon),2,7,.21);
    }
    glowLine(0,wrap(t*55,H),W,wrap(t*55,H),midPrimary,.9,0,.065);
  }
  return {drawBackground};
});
