/* CHROMA RUSH — Background Depth & Parallax 2.1: Layered Landscape Pass.
 * Gentle, continuous neon mountains replace all freestanding buildings.
 * Four distance-based parallax planes, eight landscape families, gap-safe sky.
 * Pure cosmetic Canvas 2D: no terrain/physics/Director access and no RNG.
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
  // Geometry moves in accumulated world distance, not the current speed.
  // The fifth parallax speed belongs to faint unobtrusive energy streaks.
  const PARALLAX=Object.freeze({stars:.014,distant:.044,middle:.165,near:.39,streaks:.67});
  const THEMES=Object.freeze({
    CYAN:Object.freeze({shape:'soft-hills',width:1.12,amplitude:.83,phase:.18}),
    VIOLET:Object.freeze({shape:'ridge-peaks',width:1.04,amplitude:1.02,phase:.93}),
    MAGENTA:Object.freeze({shape:'wave-dunes',width:.98,amplitude:.91,phase:1.65}),
    LIME:Object.freeze({shape:'broad-valleys',width:1.22,amplitude:.80,phase:2.11}),
    AMBER:Object.freeze({shape:'canyon-mesas',width:1.05,amplitude:.90,phase:2.87}),
    ELECTRIC:Object.freeze({shape:'electric-folds',width:.92,amplitude:.90,phase:3.46}),
    REDLINE:Object.freeze({shape:'red-ridges',width:.94,amplitude:1.05,phase:4.38}),
    WHITEOUT:Object.freeze({shape:'frost-peaks',width:1.14,amplitude:1.00,phase:5.15})
  });
  const LAYERS=Object.freeze({
    distant:Object.freeze({height:.455,amplitude:.075,wavelength:590,offset:.34}),
    middle:Object.freeze({height:.565,amplitude:.078,wavelength:390,offset:1.47}),
    near:Object.freeze({height:.665,amplitude:.052,wavelength:285,offset:2.21})
  });
  const hash=(i,salt=0)=>{
    let n=Math.imul((i+1)^(salt*971),0x45d9f3b)>>>0;
    n=Math.imul(n^(n>>>16),0x45d9f3b)>>>0;
    return ((n^(n>>>16))>>>0)/4294967296;
  };
  // Kept for compatibility with the existing world-distance projection tests.
  const projectX=(index,stride,travel,width,factor)=>{
    const count=Math.max(1,Math.ceil(width/stride)+3);
    return wrap(index*stride-travel*factor,count*stride)-stride;
  };
  function rect(ctx,x,y,w,h,color){
    if(w<=0||h<=0)return;
    ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
  }
  // Smooth, unbroken ridges, NEVER isolated pillars or collision-like boxes.
  // The functions are analytic: no seams when scrolling or changing viewport.
  function ridgeProfile(u,shape){
    const sin=Math.sin,cos=Math.cos;
    const peak=v=>Math.pow(Math.max(0,(1+sin(v))*.5),2.45);
    switch(shape){
      case 'ridge-peaks':
        return .25*sin(u*.71+.3)+.64*(1-2*peak(u*.82+.25))+.13*sin(u*1.54);
      case 'wave-dunes':
        return .62*sin(u*.83+sin(u*.32)*.35)+.21*sin(u*1.8+.7);
      case 'broad-valleys':
        return .68*sin(u*.62)+.13*sin(u*1.26+.42);
      case 'canyon-mesas':
        // Softly rounded plateaus and shallow escarpments, not square mesas.
        return .59*Math.tanh(1.9*sin(u*.66))/.96+.17*sin(u*1.31+.45);
      case 'electric-folds':
        return .55*sin(u*.87+.28*sin(u*.36))+.23*sin(u*1.86+.4);
      case 'red-ridges':
        return .46*sin(u*.77)+.35*(1-2*peak(u*1.12+.6))+.11*sin(u*2.05);
      case 'frost-peaks':
        return .34*sin(u*.73)+.47*(1-2*peak(u*.92+1.2))+.11*cos(u*1.89);
      default:
        return .67*sin(u*.70)+.15*sin(u*1.4+.7)+.09*sin(u*.33+1.5);
    }
  }
  function landscapeHeight(x,{height=720,travel=0,motif='CYAN',layer='middle'}={}){
    const theme=THEMES[motif]||THEMES.CYAN;
    const plane=LAYERS[layer]||LAYERS.middle;
    const u=(x+travel*PARALLAX[layer])/(plane.wavelength*theme.width)*
      Math.PI*2 +theme.phase+plane.offset;
    const ridge=ridgeProfile(u,theme.shape);
    return clamp(height*(plane.height+plane.amplitude*theme.amplitude*ridge),
      height*.31,height*.76);
  }
  function drawAtmosphere(ctx,W,H,primary,secondary,shadow,flowCharge){
    // The first four paints are fully viewport-sized, even behind open gaps.
    rect(ctx,0,0,W,H,'#070b17');
    const sky=ctx.createLinearGradient(0,0,0,H);
    sky.addColorStop(0,'#050916');
    sky.addColorStop(.32,rgba(shadow,.91));
    sky.addColorStop(.73,rgba(shadow,.81));
    sky.addColorStop(1,rgba(shadow,.57));
    ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(W*.65,H*.36,12,W*.62,H*.50,
      Math.max(W*.63,H*.75));
    glow.addColorStop(0,rgba(primary,.085+flowCharge*.055));
    glow.addColorStop(.46,rgba(secondary,.043));
    glow.addColorStop(1,rgba(primary,0));
    ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
    const under=ctx.createRadialGradient(W*.52,H*.76,5,W*.55,H*.76,
      Math.max(W*.65,H*.8));
    under.addColorStop(0,rgba(secondary,.070+flowCharge*.02));
    under.addColorStop(.60,rgba(primary,.026));
    under.addColorStop(1,rgba(secondary,0));
    ctx.fillStyle=under;ctx.fillRect(0,0,W,H);
  }
  function drawStars(ctx,W,H,travel,primary,secondary,density){
    const count=Math.max(16,Math.round(44*density));
    for(let i=0;i<count;i++){
      const x=wrap(hash(i,3)*W+W-travel*PARALLAX.stars,W);
      const y=H*(.045+hash(i,5)*.43);
      const radius=i%9===0?1.5:1;
      rect(ctx,x,y,radius,radius,rgba(i%3===0?secondary:'#d6eaff',
        (.085+.18*hash(i,7))*density));
    }
  }
  function drawLandscape(ctx,{width:W,height:H,travel,primary,secondary,shadow,
    motif='CYAN',quality={},layer='middle'}={}){
    const density=clamp(quality.density??1,.3,1);
    const deep=layer==='distant',near=layer==='near';
    // Fewer vertices on modest phones. All three planes remain visible.
    const step=density<.5?34:density<.8?23:14;
    const start=-step,end=W+step;
    const top=H*(deep?.33:near?.56:.43);
    const veil=ctx.createLinearGradient(0,top,0,H);
    const alpha=deep?.105:near?.15:.135;
    veil.addColorStop(0,rgba(secondary,alpha*.82));
    veil.addColorStop(.29,rgba(primary,alpha*.71));
    veil.addColorStop(.77,rgba(shadow,deep?.39:near?.68:.53));
    veil.addColorStop(1,rgba(shadow,deep?.51:near?.76:.64));
    ctx.beginPath();
    ctx.moveTo(start,landscapeHeight(start,{height:H,travel,motif,layer}));
    for(let x=start+step;x<=end+step;x+=step){
      ctx.lineTo(x,landscapeHeight(x,{height:H,travel,motif,layer}));
    }
    ctx.lineTo(end+step,H+3);
    ctx.lineTo(start,H+3);
    ctx.closePath();
    ctx.fillStyle=veil;ctx.fill();
    // A single faint continuous crest per layer, not bright obstacle outlines.
    if(density>=.5||!deep){
      ctx.beginPath();
      ctx.moveTo(start,landscapeHeight(start,{height:H,travel,motif,layer}));
      for(let x=start+step;x<=end+step;x+=step){
        ctx.lineTo(x,landscapeHeight(x,{height:H,travel,motif,layer}));
      }
      ctx.globalAlpha=(deep?.09:near?.095:.13)*density;
      ctx.lineWidth=deep?1:1.15;ctx.strokeStyle=near?primary:secondary;
      ctx.shadowBlur=0;ctx.stroke();
      ctx.globalAlpha=1;
    }
  }
  function drawHaze(ctx,W,H,color,near=false){
    const band=ctx.createLinearGradient(0,H*(near?.51:.38),0,H*(near?.91:.72));
    band.addColorStop(0,rgba(color,0));
    band.addColorStop(.52,rgba(color,near?.023:.026));
    band.addColorStop(1,rgba(color,0));
    ctx.fillStyle=band;
    ctx.fillRect(0,H*(near?.51:.38),W,H*.48);
  }
  function drawDepthEffects(ctx,{width:W,height:H,travel,speed,primary,secondary,
    density,glowLine,reducedMotion=false}){
    if(reducedMotion||typeof glowLine!=='function')return;
    // Light slivers are tiny, sparse and horizontal. Never a false platform.
    const count=Math.max(2,Math.round(8*density));
    for(let i=0;i<count;i++){
      const y=H*(.22+hash(i,27)*.36);
      const x=projectX(i,Math.max(140,W/count),travel,W,PARALLAX.streaks);
      const len=(19+(i%4)*13)*(1+clamp((speed-370)/2100,0,.60));
      glowLine(x,y,x+len,y,i%2?primary:secondary,
        1,3,.045+.055*density);
    }
  }
  function drawBackground({ctx,width:W,height:H,time:t=0,speed=370,
    scroll,primary:c1,secondary:c2,shadow:c3,motif='CYAN',
    flow=0,glowLine,quality={density:1},reducedMotion=false}={}){
    if(!ctx||!(W>0)||!(H>0))return;
    const density=clamp(quality.density??1,.3,1);
    const source=Number.isFinite(scroll)?scroll:t*speed;
    const travel=reducedMotion?0:source;
    const charge=clamp(flow,0,100)/100;
    drawAtmosphere(ctx,W,H,c1,c2,c3,charge);
    drawStars(ctx,W,H,travel,c1,c2,density);
    drawLandscape(ctx,{width:W,height:H,travel,primary:c1,secondary:c2,
      shadow:c3,motif,quality,layer:'distant'});
    drawHaze(ctx,W,H,c2);
    drawLandscape(ctx,{width:W,height:H,travel,primary:c1,secondary:c2,
      shadow:c3,motif,quality,layer:'middle'});
    drawHaze(ctx,W,H,c1,true);
    drawLandscape(ctx,{width:W,height:H,travel,primary:c1,secondary:c2,
      shadow:c3,motif,quality,layer:'near'});
    drawDepthEffects(ctx,{width:W,height:H,travel,speed,primary:c1,secondary:c2,
      density,glowLine,reducedMotion});
  }
  return {drawBackground,drawLandscape,drawAtmosphere,landscapeHeight,
    ridgeProfile,THEMES,LAYERS,PARALLAX,projectX};
});
