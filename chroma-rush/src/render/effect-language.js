/* CHROMA RUSH — Arcade Animation Language 2.0.
 * Prioritized, bounded, deterministic Canvas 2D motion accents: one visual
 * grammar for jump, landing, duck, precision clear and speed milestones.
 * Straight strokes only: no rings, flashes, RNG, timers or gameplay changes.
 */
(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.ChromaEffects=api;
})(typeof window!=='undefined'?window:null,function(){
  'use strict';
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const MAX_EFFECTS=24;
  const CUES=Object.freeze({
    jump:Object.freeze({life:.28,cooldown:.08,priority:2}),
    echo:Object.freeze({life:.42,cooldown:.09,priority:3}),
    land:Object.freeze({life:.31,cooldown:.10,priority:2}),
    duck:Object.freeze({life:.23,cooldown:.10,priority:2}),
    release:Object.freeze({life:.24,cooldown:.10,priority:1}),
    precision:Object.freeze({life:.40,cooldown:.20,priority:3}),
    speed:Object.freeze({life:.65,cooldown:.80,priority:2}),
    perfect:Object.freeze({life:.72,cooldown:.80,priority:3})
  });
  class EffectLanguage {
    constructor(){this.reset();}
    reset(){this.active=[];this.cooldowns={};}
    add(kind,x,y,color,size=24,strength=1){
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      if(this.active.length>=MAX_EFFECTS)this.active.shift();
      this.active.push({kind,x,y,color,size:clamp(size,8,85),strength:clamp(strength,.2,2),age:0,
        life:kind==='ground'?.27:.43,priority:1});
    }
    ground(x,y,color,size=24,strength=1){this.add('ground',x,y,color,size,strength);}
    frame(x,y,color,size=30,strength=1){this.add('frame',x,y,color,size,strength);}
    cue(kind,x,y,color,accent=color,{strength=1,speed=370,reducedMotion=false}={}){
      const def=CUES[kind];
      if(!def||reducedMotion||!Number.isFinite(x)||!Number.isFinite(y))return false;
      if((this.cooldowns[kind]??0)>0)return false;
      this.cooldowns[kind]=def.cooldown;
      // Never displace a precision or perfect celebration with repeated dust.
      if(this.active.length>=MAX_EFFECTS){
        const idx=this.active.findIndex(e=>(e.priority||1)<=def.priority);
        if(idx===-1)return false;
        this.active.splice(idx,1);
      }
      this.active.push({kind:'cue-'+kind,x,y,color,accent,
        strength:clamp(strength,.45,1.5),speed:clamp(speed,370,2800),
        age:0,life:def.life,priority:def.priority});
      return true;
    }
    tick(dt){
      if(!(dt>0))return;
      for(const e of this.active)e.age+=dt;
      this.active=this.active.filter(e=>e.age<e.life);
      for(const key of Object.keys(this.cooldowns))
        this.cooldowns[key]=Math.max(0,this.cooldowns[key]-dt);
    }
    draw(ctx,{glow=1,density=1,reducedMotion=false}={}){
      for(const e of this.active){
        if(e.kind.startsWith('cue-')){
          if(!reducedMotion)this.drawCue(ctx,e,{glow,density});
          continue;
        }
        const t=clamp(e.age/e.life,0,1),fade=(1-t)*(1-t);
        ctx.save();ctx.strokeStyle=e.color;ctx.lineCap='square';
        ctx.lineWidth=(e.kind==='ground'?2.8:2)*e.strength;
        ctx.globalAlpha=fade*(e.kind==='ground'?.85:.69);
        ctx.shadowColor=e.color;ctx.shadowBlur=(e.kind==='ground'?10:13)*glow;
        ctx.beginPath();
        if(e.kind==='ground'){
          const start=6+t*e.size*.37,end=10+t*e.size*1.85;
          ctx.moveTo(e.x-start,e.y);ctx.lineTo(e.x-end,e.y);
          ctx.moveTo(e.x+start,e.y);ctx.lineTo(e.x+end,e.y);
          if(density>.55){
            ctx.moveTo(e.x-end*.6,e.y-3-t*3);ctx.lineTo(e.x-end*.77,e.y-3-t*3);
            ctx.moveTo(e.x+end*.6,e.y-3-t*3);ctx.lineTo(e.x+end*.77,e.y-3-t*3);
          }
        }else{
          // Retain existing detached frame brackets; no out-of-plane rings.
          const w=e.size*(.75+t*.85),h=w*.78,b=Math.max(4,Math.min(12,w*.28));
          for(const sx of [-1,1])for(const sy of [-1,1]){
            const px=e.x+sx*w,py=e.y+sy*h;
            ctx.moveTo(px-sx*b,py);ctx.lineTo(px,py);ctx.lineTo(px,py-sy*b);
          }
        }
        ctx.stroke();ctx.restore();
      }
    }
    drawCue(ctx,e,{glow=1,density=1}={}){
      const kind=e.kind.slice(4),t=clamp(e.age/e.life,0,1);
      const fade=Math.pow(1-t,1.2),energy=e.strength;
      const d=clamp(density,.3,1),g=clamp(glow,.15,1);
      const reach=clamp(e.speed/620,.65,3.25);
      const x=e.x,y=e.y;
      ctx.save();ctx.lineCap='square';
      const line=(xa,ya,xb,yb,color,alpha=.5,width=1.5,blur=8)=>{
        ctx.beginPath();ctx.moveTo(xa,ya);ctx.lineTo(xb,yb);
        ctx.strokeStyle=color;ctx.lineWidth=width*energy;
        ctx.globalAlpha=clamp(alpha*fade*d,0,1);
        ctx.shadowColor=color;ctx.shadowBlur=blur*g;
        ctx.stroke();
      };
      const detail=d>.52?3:2;
      if(kind==='jump'){
        // Launch energy is pulled BACK and UPWARD, following the jump arc.
        const back=(34+65*t)*reach;
        for(let i=0;i<detail;i++){
          const h=7+i*7+t*21;
          line(x-12-i*6,y-4-i*2,x-back-i*14,y+h-7,
            i%2?e.accent:e.color,.73-i*.09,2.25-i*.24,10);
        }
        line(x-12,y-7,x-27-t*36,y-18-t*28,e.accent,.34,1.3,5);
      }else if(kind==='echo'){
        // A distinct second-beat release: split prongs, diagonal cuts and
        // short afterimages, never circular rings or a full-screen flash.
        // All positions are gravity-relative; Gravity Shift mirrors the pass.
        const spread=13+74*t,back=(20+100*t)*reach;
        for(let i=0;i<detail;i++){
          const lift=11+i*9+25*t;
          line(x-9-i*5,y+8,x-back-i*11,y+lift,
            i%2?e.color:e.accent,.85-i*.13,2.5-i*.3,12);
          line(x+11+i*2,y+5,x+spread*.42+i*4,y-lift*.8,
            e.accent,.48-i*.12,1.45,6);
        }
        line(x-5,y+14,x-5,y-33-28*t,e.color,.68,2,10);
        if(d>.52){
          line(x-18,y-19,x-44-27*t,y-19,e.accent,.40,1.2,4);
          line(x+7,y-24,x+24+20*t,y-24,e.color,.30,1.1,3);
        }
      }else if(kind==='land'){
        // Compression discharges parallel to the real platform; no ellipse.
        const spread=15+t*(68+e.strength*26);
        for(const side of [-1,1]){
          line(x+side*8,y,x+side*spread,y,side<0?e.color:e.accent,.83,2.6,10);
          if(d>.52)line(x+side*12,y-5-t*2,x+side*(spread*.66),y-5-t*2,
            e.accent,.35,1.15,3);
        }
      }else if(kind==='duck'){
        // A low, horizontal compression travelling strictly behind the runner.
        const rear=x-24-t*(65+e.speed*.023);
        line(x-18,y-6,rear,y-6,e.accent,.89,2.75,11);
        line(x-25,y-13,rear-19,y-13,e.color,.56,1.3,5);
        if(d>.52)line(x-32,y-2,rear-32,y-2,e.accent,.26,1,3);
      }else if(kind==='release'){
        const lift=12+25*t;
        line(x-24,y-2,x-31-t*33,y-2,e.color,.52,1.3,6);
        for(let i=0;i<detail;i++){
          const sx=x-18-i*9;
          line(sx,y-4,sx-7,y-lift-i*5,e.accent,.62-i*.10,1.4,5);
        }
      }else if(kind==='precision'){
        // Precision is the visual hero: three intersecting straight cuts
        // BEHIND the player, rather than a screen-covering bloom or ring.
        const anchor=x-38-t*(28+22*reach),cy=y-13;
        line(anchor-14,cy,anchor+18,cy,e.accent,.88,2.6,14);
        line(anchor+1,cy-16,anchor+1,cy+15,e.color,.72,1.7,9);
        line(anchor-22,cy+10,anchor-8,cy+1,e.accent,.43,1.1,3);
        if(d>.52)line(anchor-33,cy-11,anchor-13,cy-11,e.color,.40,1.1,4);
      }else if(kind==='speed'){
        // Forward velocity represented by short, staggered leftward rails.
        const length=(52+115*t)*reach;
        for(let i=0;i<detail+1;i++){
          const yy=y-22+i*11,anchor=x-23-i*9;
          line(anchor,yy,anchor-length*(.66+i*.11),yy,
            i%2?e.accent:e.color,.68-i*.07,1.9,11);
        }
      }else if(kind==='perfect'){
        // Celebratory split ribbons stay local; the gameplay area remains clear.
        for(let i=0;i<detail+1;i++){
          const yy=y-14-i*8,span=40+65*t+i*14;
          line(x-15,yy,x-span,yy,i%2?e.accent:e.color,.60-i*.05,2,9);
        }
        line(x-24,y+3,x-75-t*42,y+3,e.accent,.37,1.4,4);
      }
      ctx.restore();
    }
  }
  return {EffectLanguage,MAX_EFFECTS,CUES};
});
