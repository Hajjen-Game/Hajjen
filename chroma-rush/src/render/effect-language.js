/* CHROMA RUSH — Effect Language 1.0.
 * Screen-space, purely cosmetic straight-line ground pulses and frame echoes.
 * A bounded render queue respects the current graphics quality preset.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaEffects=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const MAX_EFFECTS=24;
  class EffectLanguage {
    constructor(){this.reset();}
    reset(){this.active=[];}
    add(kind,x,y,color,size=24,strength=1){
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      if(this.active.length>=MAX_EFFECTS)this.active.shift();
      this.active.push({kind,x,y,color,size:clamp(size,8,85),strength:clamp(strength,.2,2),age:0,
        life:kind==='ground'?.27:.43});
    }
    ground(x,y,color,size=24,strength=1){this.add('ground',x,y,color,size,strength);}
    frame(x,y,color,size=30,strength=1){this.add('frame',x,y,color,size,strength);}
    tick(dt){
      if(!(dt>0))return;
      for(const e of this.active)e.age+=dt;
      this.active=this.active.filter(e=>e.age<e.life);
    }
    draw(ctx,{glow=1,density=1}={}){
      for(const e of this.active){
        const t=clamp(e.age/e.life,0,1),fade=(1-t)*(1-t);
        ctx.save();ctx.strokeStyle=e.color;ctx.lineCap='square';
        ctx.lineWidth=(e.kind==='ground'?2.8:2)*e.strength;
        ctx.globalAlpha=fade*(e.kind==='ground'?.85:.69);
        ctx.shadowColor=e.color;ctx.shadowBlur=(e.kind==='ground'?10:13)*glow;
        ctx.beginPath();
        if(e.kind==='ground'){
          // Two outward-moving segments lie ON the side-on ground plane.
          const start=6+t*e.size*.37,end=10+t*e.size*1.85;
          ctx.moveTo(e.x-start,e.y);ctx.lineTo(e.x-end,e.y);
          ctx.moveTo(e.x+start,e.y);ctx.lineTo(e.x+end,e.y);
          if(density>.55){
            ctx.moveTo(e.x-end*.6,e.y-3-t*3);ctx.lineTo(e.x-end*.77,e.y-3-t*3);
            ctx.moveTo(e.x+end*.6,e.y-3-t*3);ctx.lineTo(e.x+end*.77,e.y-3-t*3);
          }
        }else{
          // Four detached right-angle brackets, never an oval or radial ring.
          const w=e.size*(.75+t*.85),h=w*.78,b=Math.max(4,Math.min(12,w*.28));
          for(const sx of [-1,1])for(const sy of [-1,1]){
            const px=e.x+sx*w,py=e.y+sy*h;
            ctx.moveTo(px-sx*b,py);ctx.lineTo(px,py);ctx.lineTo(px,py-sy*b);
          }
        }
        ctx.stroke();ctx.restore();
      }
    }
  }
  return {EffectLanguage,MAX_EFFECTS};
});
