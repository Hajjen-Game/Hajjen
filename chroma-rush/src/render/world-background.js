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
  function drawBackground({ctx,width:W,height:H,time:t=0,speed=370,primary:c1,secondary:c2,shadow:c3,flow=0,glowLine}){
    if(!ctx||!(W>0)||!(H>0))return;
    const flowCharge=clamp(flow,0,100)/100;
    // Base paints ALL pixels, including those behind holes and below slopes.
    ctx.fillStyle='#070b17';ctx.fillRect(0,0,W,H);
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#060b19');
    sky.addColorStop(.40,rgba(c3,.92));
    sky.addColorStop(.70,rgba(c3,.82));
    sky.addColorStop(1,rgba(c3,.60));
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // Both glows paint the ENTIRE viewport; no hard rectangle at floorY.
    const glow=ctx.createRadialGradient(W*.62,H*.49,20,W*.62,H*.56,Math.max(W*.62,H*.78));
    glow.addColorStop(0,rgba(c1,.13+flowCharge*.11));
    glow.addColorStop(.52,rgba(c2,.055));
    glow.addColorStop(1,rgba(c1,0));
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    const lower=ctx.createRadialGradient(W*.64,H*.84,16,W*.64,H*.84,Math.max(W*.72,H*.93));
    lower.addColorStop(0,rgba(c1,.16+flowCharge*.028));
    lower.addColorStop(.60,rgba(c2,.069));
    lower.addColorStop(1,rgba(c1,0));
    ctx.fillStyle=lower;ctx.fillRect(0,0,W,H);
    // Receding architectural silhouettes continue below the nominal track.
    // A shared vertical fade prevents them from ending on a straight cut-off.
    const facade=ctx.createLinearGradient(0,H*.36,0,H);
    facade.addColorStop(0,rgba(c1,.034));
    facade.addColorStop(.65,rgba(c1,.027));
    facade.addColorStop(1,rgba(c1,.003));
    const drift=t*speed*.13;
    for(let k=-2;k<Math.ceil(W/155)+3;k++){
      const x=wrap(k*155-drift*.35,W+310)-155;
      const h=72+wrap(k*17+201,7)*16;
      const top=H*.54-h*.67;
      ctx.fillStyle=facade;ctx.fillRect(x,top,30,H-top);
      glowLine(x,top,x+30,top,c2,1,4,.12);
      if(k%3===0){ctx.fillStyle=rgba(c2,.093);ctx.fillRect(x+11,top+10,2,23);}
    }
    // Scrolling light streaks and distant particles cover the *full* height.
    for(let i=0;i<24;i++){
      const y=46+wrap(i*43+17,Math.max(50,H-66));
      const x=wrap(i*147-t*speed*(.12+i%4*.08),W+300)-130;
      const len=(18+i%5*16)*(1+speed/1500);
      const fade=1-y/H*.42;
      glowLine(x,y,x+len,y,i%2?c1:c2,i%4===0?1.9:1,5,(.09+speed/2500*.13)*fade);
    }
    for(let i=0;i<58;i++){
      const x=wrap(i*269.8-t*(7+i%4*5),W);
      const y=24+wrap(i*112.7,Math.max(40,H-48));
      ctx.fillStyle=rgba(i%2?c1:'#d4eaff',(.09+i%5*.035)*(1-y/H*.28));
      ctx.fillRect(x,y,i%7===0?2:1,i%7===0?2:1);
    }
    // Distant horizon is a scene detail, NOT an end of the background layer.
    const horizon=H*.47;
    glowLine(0,horizon,W,horizon,c1,1,9,.15);
    for(let i=0;i<Math.ceil(W/135)+2;i++){
      const x=wrap(i*135-t*speed*.56,W+135);
      glowLine(x,horizon-3,x,horizon+14,i%2?c2:c1,2,7,.21);
    }
    glowLine(0,wrap(t*55,H),W,wrap(t*55,H),c1,.9,0,.065);
  }
  return {drawBackground};
});
