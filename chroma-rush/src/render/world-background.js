/* CHROMA RUSH — Background Depth & Parallax 2.0.
 * Four independent travel-speed layers, eight distinct zone architectures,
 * and uninterrupted atmosphere beneath gaps. Cosmetic Canvas 2D only.
 * Does not read collision geometry, terrain, Director or gameplay RNG.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaWorldBackground=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const wrap=(v,length)=>(v%length+length)%length;
  const rgba=(hex,alpha)=>{
    const n=parseInt(hex.slice(1),16);
    return 'rgba('+(n>>16)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha,0,1)+')';
  };
  // Distances are measured in player/world units, not frame-count or delta.
  // All layers remain coherent during an accelerated run and freeze on pause.
  const PARALLAX=Object.freeze({stars:.014,distant:.044,middle:.165,near:.39,streaks:.67});
  const THEMES=Object.freeze({
    CYAN:Object.freeze({shape:'skyline',accent:'clean',scale:1}),
    VIOLET:Object.freeze({shape:'spire',accent:'monolith',scale:1.14}),
    MAGENTA:Object.freeze({shape:'fin',accent:'angular',scale:1.08}),
    LIME:Object.freeze({shape:'terrace',accent:'garden',scale:.91}),
    AMBER:Object.freeze({shape:'industrial',accent:'foundry',scale:.95}),
    ELECTRIC:Object.freeze({shape:'arch',accent:'conduit',scale:1.07}),
    REDLINE:Object.freeze({shape:'pylon',accent:'slits',scale:1.06}),
    WHITEOUT:Object.freeze({shape:'crystal',accent:'faceted',scale:1.11})
  });
  const hash=(i,salt=0)=>{
    let n=Math.imul((i+1)^(salt*971),0x45d9f3b)>>>0;
    n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;
    return ((n^(n>>>16))>>>0)/4294967296;
  };
  const projectX=(index,stride,travel,width,factor)=>{
    const count=Math.max(1,Math.ceil(width/stride)+3);
    return wrap(index*stride-travel*factor,count*stride)-stride;
  };
  function rect(ctx,x,y,w,h,color){
    if(!(w>0&&h>0))return;
    ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
  }
  function stroke(ctx,x1,y1,x2,y2,color,alpha=1,width=1){
    ctx.globalAlpha=alpha;
    ctx.strokeStyle=color;ctx.lineWidth=width;ctx.shadowBlur=0;
    ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    ctx.globalAlpha=1;
  }
  function silhouette(ctx,x,top,w,bottom,shape,primary,secondary,detail,index){
    const h=bottom-top,roof=top+Math.min(27,h*.23);
    if(h<=0)return;
    ctx.fillStyle=rgba(primary,detail*.39);
    ctx.beginPath();
    if(shape==='skyline'){
      ctx.moveTo(x,bottom);ctx.lineTo(x,top+17);
      ctx.lineTo(x+w*.25,top+17);ctx.lineTo(x+w*.25,top+6);
      ctx.lineTo(x+w*.7,top+6);ctx.lineTo(x+w*.7,top+16);
      ctx.lineTo(x+w,top+16);
    }else if(shape==='spire'){
      ctx.moveTo(x,bottom);ctx.lineTo(x,roof);
      ctx.lineTo(x+w*.36,roof);ctx.lineTo(x+w*.51,top-17);
      ctx.lineTo(x+w*.66,roof);ctx.lineTo(x+w,roof);
    }else if(shape==='fin'){
      ctx.moveTo(x,bottom);ctx.lineTo(x+w*.16,top+20);
      ctx.lineTo(x+w*.88,top-8);ctx.lineTo(x+w,top+12);
    }else if(shape==='terrace'){
      ctx.moveTo(x,bottom);ctx.lineTo(x,top+24);
      ctx.lineTo(x+w*.23,top+24);ctx.lineTo(x+w*.23,top+11);
      ctx.lineTo(x+w*.53,top+11);ctx.lineTo(x+w*.53,top);
      ctx.lineTo(x+w*.8,top);ctx.lineTo(x+w*.8,top+19);
      ctx.lineTo(x+w,top+19);
    }else if(shape==='industrial'){
      ctx.moveTo(x,bottom);ctx.lineTo(x,top+24);ctx.lineTo(x+w*.17,top+24);
      ctx.lineTo(x+w*.17,top-9);ctx.lineTo(x+w*.32,top-9);
      ctx.lineTo(x+w*.32,top+20);ctx.lineTo(x+w*.77,top+20);
      ctx.lineTo(x+w*.77,top+5);ctx.lineTo(x+w*.92,top+5);
      ctx.lineTo(x+w*.92,top+20);ctx.lineTo(x+w,top+20);
    }else if(shape==='pylon'){
      ctx.moveTo(x,bottom);ctx.lineTo(x+w*.1,top+6);
      ctx.lineTo(x+w*.42,top-4);ctx.lineTo(x+w*.84,top+14);
      ctx.lineTo(x+w,bottom);
    }else if(shape==='crystal'){
      ctx.moveTo(x,bottom);ctx.lineTo(x+w*.04,top+33);
      ctx.lineTo(x+w*.38,top-9);ctx.lineTo(x+w*.5,top+16);
      ctx.lineTo(x+w*.72,top-21);ctx.lineTo(x+w,top+26);
    }else{
      // ELECTRIC: open bridge/gate silhouettes, distinct from boxed towers.
      ctx.moveTo(x,bottom);ctx.lineTo(x,top+22);
      ctx.lineTo(x+w*.19,top);ctx.lineTo(x+w*.81,top);
      ctx.lineTo(x+w,top+22);
    }
    ctx.lineTo(x+w,bottom);ctx.closePath();ctx.fill();

    // Deep face plane, showing the geometry without bright obstacle-like edges.
    const side=shape==='fin'?.24:.15;
    rect(ctx,x+w*(1-side),top+23,w*side,Math.max(0,h-23),rgba('#050b1b',detail*.62));

    if(shape==='arch'){
      // Negative space is the visual signature of ELECTRIC.
      rect(ctx,x+w*.24,top+30,w*.52,Math.max(0,h-30),rgba('#080e24',.89));
      stroke(ctx,x+w*.23,top+27,x+w*.77,top+27,secondary,detail*.43,1.3);
    }else if(shape==='pylon'){
      rect(ctx,x+w*.45,top+22,Math.max(2,w*.09),Math.max(0,h*.61),rgba('#05091a',.72));
    }else if(shape==='crystal'){
      stroke(ctx,x+w*.4,top+4,x+w*.48,bottom-20,secondary,detail*.27,1);
    }

    // A restrained architectural highlight: never saturate the collision lane.
    stroke(ctx,x+2,top+27,x+2,bottom-18,secondary,detail*.26,1);
    if(detail>.3){
      const bands=shape==='terrace'?4:shape==='industrial'?3:5;
      for(let j=0;j<bands;j++){
        const yy=top+40+j*19+(index%3)*2;
        if(yy>=bottom-10)break;
        if(shape==='industrial'){
          rect(ctx,x+w*.37,yy,w*.29,2,rgba(secondary,detail*.30));
        }else if(shape==='pylon'){
          rect(ctx,x+w*.27,yy,Math.max(3,w*.14),2.5,rgba(secondary,detail*.24));
        }else if(shape==='arch'){
          rect(ctx,x+w*.05,yy,Math.max(2,w*.10),3,rgba(secondary,detail*.28));
          rect(ctx,x+w*.83,yy,Math.max(2,w*.09),3,rgba(secondary,detail*.28));
        }else{
          rect(ctx,x+w*.18,yy,Math.max(3,w*.12),2,rgba(secondary,detail*.35));
          if(index%3===0)rect(ctx,x+w*.50,yy,Math.max(3,w*.11),2,rgba(primary,detail*.3));
        }
      }
    }
  }
  function drawAtmosphere(ctx,W,H,primary,secondary,shadow,flowCharge){
    // These four full-frame paints preserve background continuity through
    // every sloping track and open gap: no floor-based masks or dark seams.
    rect(ctx,0,0,W,H,'#070b17');
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#050916');
    sky.addColorStop(.33,rgba(shadow,.92));
    sky.addColorStop(.72,rgba(shadow,.8));
    sky.addColorStop(1,rgba(shadow,.55));
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(W*.65,H*.36,12,W*.62,H*.5,Math.max(W*.63,H*.75));
    glow.addColorStop(0,rgba(primary,.09+flowCharge*.055));
    glow.addColorStop(.44,rgba(secondary,.048));
    glow.addColorStop(1,rgba(primary,0));
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    const under=ctx.createRadialGradient(W*.52,H*.76,5,W*.55,H*.76,Math.max(W*.65,H*.8));
    under.addColorStop(0,rgba(secondary,.075+flowCharge*.025));
    under.addColorStop(.6,rgba(primary,.028));
    under.addColorStop(1,rgba(secondary,0));
    ctx.fillStyle=under;ctx.fillRect(0,0,W,H);
  }
  function drawStars(ctx,W,H,travel,primary,secondary,density){
    // Stars remain a low-contrast reference plane, even on Performance.
    const count=Math.max(16,Math.round(44*density));
    for(let i=0;i<count;i++){
      const x=wrap(hash(i,3)*W+W-travel*PARALLAX.stars,W);
      const y=H*(.045+hash(i,5)*.43);
      const radius=i%9===0?1.6:1;
      rect(ctx,x,y,radius,radius,rgba(i%3===0?secondary:'#d6eaff',
        (.11+.21*hash(i,7))*density));
    }
  }
  function drawArchitecture(ctx,{width:W,height:H,travel,primary,secondary,motif,
    quality={},layer}){
    const density=clamp(quality.density??1,.3,1);
    const theme=THEMES[motif]||THEMES.CYAN;
    const far=layer==='distant',near=layer==='near';
    const stride=far?176:near?232:202;
    const factor=PARALLAX[layer];
    const count=Math.ceil(W/stride)+3;
    const step=density<.5?(far?3:2):density<.8&&far?2:1;
    const bottom=H*(far?.79:near?1.15:1.03);
    const baseTop=H*(far?.48:near?.63:.53);
    const amp=H*(far?.17:near?.19:.24)*theme.scale;
    const shade=far?.17:near?.52:.36;
    for(let i=0;i<count;i+=step){
      const x=projectX(i,stride,travel,W,factor);
      if(x<-stride*1.5||x>W+stride)continue;
      const n=hash(i,11+Math.round(theme.scale*10));
      const width=stride*(far?.32+n*.24:near?.35+n*.35:.30+n*.38);
      const top=baseTop-amp*n;
      const shape=far?theme.shape:theme.shape;
      const detail=shade*(far?1:near?1.02:1.15);
      silhouette(ctx,x,top,width,bottom,shape,primary,secondary,detail,i);

      // Separate architectural accent planes with different motion speeds.
      if(!far&&i%3===0){
        stroke(ctx,x+width*.3,top+15,x+width*.3,bottom-20,
          primary,(near?.14:.115)*density,near?1.5:1);
      }
      if(near&&density>.55&&i%4===0){
        const beamY=H*.59+(i%3)*13;
        stroke(ctx,x+width*.1,beamY,x+width*.9,beamY,
          secondary,.22*density,1.2);
      }
    }
  }
  function drawDepthEffects(ctx,{width:W,height:H,travel,speed,primary,secondary,
    density,glowLine,reducedMotion=false}){
    // Low opacity perspective beams stay far behind the runner and terrain.
    // No animated near-layer detailing when the OS requests reduced motion.
    if(reducedMotion)return;
    const count=Math.max(3,Math.round(12*density));
    for(let i=0;i<count;i++){
      const y=H*(.22+hash(i,27)*.44);
      const x=projectX(i,Math.max(100,W/count),travel,W,PARALLAX.streaks);
      const len=(25+(i%5)*16)*(1+clamp((speed-370)/2100,0,.8));
      glowLine(x,y,x+len,y,i%2?primary:secondary,
        i%5===0?1.7:1,5,.08+.075*density);
    }
    const horizon=H*.535;
    glowLine(0,horizon,W,horizon,primary,1.0,11,.11*density);
    for(let i=0;i<Math.ceil(W/192)+2;i+=density<.5?2:1){
      const x=projectX(i,192,travel,W,PARALLAX.near);
      glowLine(x,horizon-2,x+12,horizon+10,secondary,1.2,5,.11*density);
    }
  }
  function drawBackground({ctx,width:W,height:H,time:t=0,speed=370,
    scroll,primary:c1,secondary:c2,shadow:c3,motif='CYAN',
    flow=0,glowLine,quality={density:1},reducedMotion=false}={}){
    if(!ctx||!(W>0)||!(H>0))return;
    const density=clamp(quality.density??1,.3,1);
    // In live gameplay 'scroll' is the authoritative accumulated distance.
    // The legacy time/speed fallback keeps independent renderer calls usable.
    const source=Number.isFinite(scroll)?scroll:t*speed;
    const travel=reducedMotion?0:source;
    const charge=clamp(flow,0,100)/100;
    drawAtmosphere(ctx,W,H,c1,c2,c3,charge);
    drawStars(ctx,W,H,travel,c1,c2,density);
    drawArchitecture(ctx,{width:W,height:H,travel,primary:c1,secondary:c2,
      motif,quality,layer:'distant'});
    drawArchitecture(ctx,{width:W,height:H,travel,primary:c1,secondary:c2,
      motif,quality,layer:'middle'});
    drawDepthEffects(ctx,{width:W,height:H,travel,speed,primary:c1,secondary:c2,
      density,glowLine,reducedMotion});
    drawArchitecture(ctx,{width:W,height:H,travel,primary:c1,secondary:c2,
      motif,quality,layer:'near'});
  }
  return {drawBackground,drawArchitecture,drawAtmosphere,THEMES,PARALLAX,projectX};
});
